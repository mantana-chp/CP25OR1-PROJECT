import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../../config';
import { logger } from '../../libs/logger';
import { Document } from '@langchain/core/documents';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import prisma from '../../libs/db';
import { formatBirthDateToYearsMonths } from '../../shared/utils';
import { ApiError } from '../../shared/errors';
import { detectPetInQuery, PetCandidate } from './ai-chat-name-matcher';
import { HistoryItem } from './ai-chat-schema';

// Private module-level state for Singleton-like behavior
let vectorStore: PineconeStore | null = null;

const SYSTEM_INSTRUCTION = `
You are a knowledgeable, calm veterinary assistant. Give pet owners practical, proportionate advice.

Rules:
- If a KNOWLEDGE BASE section is provided and relevant to the question, use it. If irrelevant, ignore it and answer from your own veterinary knowledge.
- Never apologize for missing data.
- Never use gendered terms to address the owner like "คุณแม่" or "คุณพ่อ". Try to use neutral terms like "คุณ" instead.
- Never make a definitive diagnosis. Frame causes as possibilities.
- Do NOT start your response with a greeting like "สวัสดี" or "สวัสดีค่ะ". Open with a natural, varied acknowledgment of the owner's concern — do NOT use the same phrase every time. Rotate between different openers, for example: briefly acknowledging the symptom ("การอาเจียน 2 ครั้งในเช้าวันเดียวกัน..."), empathising, or going straight into context ("อาการแบบนี้มักเกิดจาก...").

Triage — scale your response to symptom severity:
- Mild/routine (e.g. eating slightly less 1 day, single loose stool): reassure, give home-care tips, advise watching 2–3 days before considering a vet. Do NOT recommend an immediate vet visit.
- Moderate/persistent (e.g. not eating 2+ days, repeated vomiting, visible weight loss): give home-care steps, list warning signs, set a clear timeframe ("if no improvement in 24–48 h, see a vet").
- Urgent/red flag (e.g. breathing difficulty, seizure, uncontrolled bleeding, suspected poisoning, collapse): recommend seeing a vet or emergency clinic immediately and briefly explain why. This is the ONLY case where an immediate vet visit is warranted.

Severity flag:
- Append exactly "[NEEDS_SEVERITY]" on a new line at the very end of your response ONLY when ALL of the following are true:
  1. The current message is the FIRST time the user is reporting or describing a pet's symptom or health concern (e.g. vomiting, not eating, lethargy, injury).
  2. No "[SEVERITY: X/5]" appears anywhere in the conversation history.
  3. The conversation history does not already contain a prior user message describing symptoms (i.e. this is the symptom-reporting turn, not a follow-up question about it).
- Do NOT append it for follow-up questions about already-discussed symptoms (e.g. "should I see a vet?", "how long should I wait?", "what if it gets worse?").
- Do NOT append it for general questions, vaccine schedules, feeding advice, or any non-symptom topic.
- Do NOT append it if the conversation already contains a "[SEVERITY: X/5]" message.
- When you DO append "[NEEDS_SEVERITY]", end your answer with a natural closing question on the line before it, asking the owner to rate severity (e.g. "เพื่อให้คำแนะนำได้แม่นยำขึ้น รบกวนประเมินความรุนแรงของอาการน้องให้หน่อยได้ไหมครับ?"). This makes the severity widget feel like a natural next step.

Severity response:
- If the current message starts with "[SEVERITY: X/5]", the user is giving you a severity rating for the symptoms already discussed in the conversation history.
- Do NOT re-acknowledge the symptoms. Do NOT repeat prior advice. Do NOT start over.
- Start directly with a short line acknowledging the rating (e.g. "ระดับความรุนแรง 3/5 —"), then immediately give refined, updated guidance based on that specific level.
- Adjust your triage recommendation accordingly: low severity (1–2) → reassure + home care; medium (3) → watchful home care + clear timeframe; high (4–5) → recommend vet urgently.
`.trim();

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: config.google.apiKey,
  temperature: 0.7,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'gemini-embedding-001',
  apiKey: config.google.apiKey,
});

const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey,
});

/**
 * Initializes the Vector Store if it hasn't been initialized yet.
 */
const initializeVectorStore = async () => {
  if (vectorStore) return vectorStore;

  try {
    const pineconeIndex = pinecone.Index(config.pinecone.indexName);
    vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
    return vectorStore;
  } catch (error) {
    logger.error('Failed to initialize VectorStore:', error as Error);
    throw error;
  }
};

/**
 * Layer 3 — LLM-based entity extraction.
 * Only called when Layers 1 & 2 both miss AND no resolvedPetId exists in the session.
 * Uses a minimal, fast prompt to avoid latency impact on the main response.
 */
const extractPetWithLLM = async (
  query: string,
  pets: PetCandidate[]
): Promise<PetCandidate | null> => {
  if (pets.length === 0) return null;

  const petListStr = pets.map((p) => p.pet_name).join(', ');

  const extractionPrompt = `You are a name recognition assistant.
You will be given a list of pet names and a user message.
Identify if the user message references or mentions any of the pet names, including cross-language variants (e.g. English "Blue" for Thai "บลู"), nicknames, or indirect references.

Pet names: ${petListStr}

User message: "${query}"

Reply with ONLY one of the following:
- The exact pet name from the list if one is referenced
- The word null if no pet is referenced

Do not explain. Do not add punctuation. Reply in one word only.`;

  try {
    const response = await llm.invoke(extractionPrompt);
    const raw = (response.content as string).trim();

    if (!raw || raw.toLowerCase() === 'null') return null;

    // Match the LLM's reply back to a known pet (case-insensitive)
    const matched = pets.find(
      (p) => p.pet_name.toLowerCase() === raw.toLowerCase()
    );

    logger.info(`[AI Chat] Layer 3 LLM extraction result: "${raw}" → ${matched ? matched.pet_name : 'no match'}`);
    return matched ?? null;
  } catch (error) {
    logger.error('[AI Chat] Layer 3 LLM extraction failed:', error as Error);
    return null;
  }
};

/**
 * Fetches the full pet profile and formats it as a context string for the prompt.
 */
const buildPetContext = async (petId: string): Promise<string> => {
  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    include: {
      species: true,
      breeds: true,
      reminders: {
        where: { reminder_status: 'done', is_health: true },
        orderBy: { status_done_at: 'desc' },
        take: 10,
      },
    },
  });

  if (!pet) return '';

  const formattedAge = formatBirthDateToYearsMonths(pet.birth_date);
  const healthHistory = pet.reminders
    .map((r) => `- ${r.reminder_name} (Date: ${r.status_done_at?.toISOString().split('T')[0]})`)
    .join('\n');

  return (
    `
--- CURRENT PET PROFILE ---
Name: ${pet.pet_name}
Species: ${pet.species.name}
Breed: ${pet.breeds?.name || 'Unknown'}
Gender: ${pet.gender}
Age: ${formattedAge}
Weight: ${pet.weight || 'Unknown'} kg

Recent Health History (Vaccines/Checkups):
${healthHistory || 'No recent health records.'}
---------------------------
    `.trim()
  );
};

/**
 * Main chat function using RAG with 3-layer pet name detection.
 *
 * Layer 1 & 2 (exact + fuzzy) always run — free, catches name switching mid-session.
 * Layer 3 (LLM extraction) only fires on the very first message when no pet is
 * identified at all, then the resolvedPetId is echoed back to the frontend to
 * cache for the rest of the session.
 */
export const chatWithAI = async (
  query: string,
  userId: string,
  resolvedPetId?: string,
  history?: HistoryItem[]
): Promise<{ answer: string; resolvedPetId?: string; severityFlag?: boolean }> => {
  const store = await initializeVectorStore();
  let petContext = '';

  try {
    // 1. Fetch all active pets for this user (needed for name detection)
    const userPets = await prisma.pets.findMany({
      where: { user_id: userId, status: 'ACTIVE' },
      select: { id: true, pet_name: true },
    });

    // 2. Pet name detection — Layers 1 & 2 always run on every message.
    //    This allows mid-session pet switching without any extra cost.
    const detectedPet = detectPetInQuery(query, userPets);
    let finalResolvedPetId: string | undefined;

    if (detectedPet) {
      // L1 or L2 found a (possibly new) pet — always trust it
      finalResolvedPetId = detectedPet.id;
      logger.info(`[AI Chat] Pet detected via L1/L2: "${detectedPet.pet_name}"`);
    } else if (resolvedPetId) {
      // L1 & L2 missed, but we have a session pet → skip L3, keep current pet
      finalResolvedPetId = resolvedPetId;
      logger.info(`[AI Chat] No new pet in query, continuing session with resolvedPetId: ${resolvedPetId}`);
    } else {
      // L1 & L2 missed, no session pet → fire Layer 3 (LLM extraction)
      logger.info('[AI Chat] No pet detected via L1/L2, falling back to Layer 3 LLM extraction.');
      const llmPet = await extractPetWithLLM(query, userPets);
      if (llmPet) {
        finalResolvedPetId = llmPet.id;
        logger.info(`[AI Chat] Pet detected via Layer 3: "${llmPet.pet_name}"`);
      }
    }

    // 3. Build pet context string if a pet was resolved
    if (finalResolvedPetId) {
      petContext = await buildPetContext(finalResolvedPetId);
    }

    // 4. Retrieve relevant documents (Knowledge Base)
    // Use similaritySearchWithScore to filter out irrelevant results
    const resultsWithScore = await store.similaritySearchWithScore(query, 3);

    // DEBUG: Log retrieval scores to help tune the threshold
    resultsWithScore.forEach(([doc, score]) => {
      logger.debug(`Retrieval Score: ${score.toFixed(4)} | Content: ${(doc.metadata.text as string)?.substring(0, 50)}...`);
    });

    const threshold = 0.5; // Raised to 0.5 for stricter filtering

    const relevantDocs = resultsWithScore
      .filter(([_, score]) => score >= threshold)
      .map(([doc]) => doc);

    const context = relevantDocs
      .map((doc: Document) => doc.pageContent || doc.metadata.text)
      .join('\n\n');

    // 5. Construct per-request prompt — dynamic content only.
    //    Static instructions live in SYSTEM_INSTRUCTION (sent via systemInstruction
    //    field at model level), so they are NOT repeated here each request.
    const userPromptParts: string[] = [];

    if (petContext) {
      userPromptParts.push(petContext);
    }

    if (context) {
      userPromptParts.push(
        `--- KNOWLEDGE BASE (Reference Only - Ignore if irrelevant to question) ---
${context}
----------------------------------------------------------------------------`
      );
    }

    userPromptParts.push(`User Question: ${query}`);

    const prompt = userPromptParts.join('\n\n');

    logger.info(`AI Chat Request - Question: "${query}"`);
    logger.info(`Full AI Prompt:\n${prompt}`);

    // 6. Generate Answer — build message array:
    //    [SystemMessage] + [history turns] + [current HumanMessage]
    //    History (max 8 entries = 4 turns) gives the AI conversational context
    //    while keeping the backend fully stateless.
    //    Assistant replies are truncated to 300 chars — enough for context, avoids
    //    re-sending full advice paragraphs on every subsequent request.
    const ASSISTANT_HISTORY_LIMIT = 300;
    const historyMessages = (history ?? []).map((m) => {
      const content =
        m.role === 'assistant' && m.content.length > ASSISTANT_HISTORY_LIMIT
          ? m.content.slice(0, ASSISTANT_HISTORY_LIMIT) + '…'
          : m.content;
      return m.role === 'user' ? new HumanMessage(content) : new AIMessage(content);
    });

    const response = await llm.invoke([
      new SystemMessage(SYSTEM_INSTRUCTION),
      ...historyMessages,
      new HumanMessage(prompt),
    ]);
    const rawAnswer = response.content as string;

    // Parse severity flag marker — AI appends [NEEDS_SEVERITY] when symptom context
    // is detected and no severity rating exists in history yet.
    const severityFlag = rawAnswer.includes('[NEEDS_SEVERITY]');
    const answer = rawAnswer.replace(/\[NEEDS_SEVERITY\]/g, '').trimEnd();

    logger.info(`AI Chat Response received successfully. severityFlag=${severityFlag}`);
    logger.info(`AI Answer:\n${answer}`);

    return { answer, resolvedPetId: finalResolvedPetId, severityFlag: severityFlag || undefined };

  } catch (error) {
    logger.error('Error in AI Chat service:', error as Error);
    throw new ApiError(
      'We experienced an unexpected issue. Our AI assistant should be available soon. Please try again in a moment.',
      500
    );
  }
};

/**
 * Helper to test retrieval logic
 */
export const getRelevantDocs = async (query: string, k: number = 3) => {
  const store = await initializeVectorStore();
  return await store.similaritySearch(query, k);
};