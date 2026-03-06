import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../../config';
import { logger } from '../../libs/logger';
import { Document } from '@langchain/core/documents';
import prisma from '../../libs/db';
import { formatBirthDateToYearsMonths } from '../../shared/utils';
import { ApiError } from '../../shared/errors';
import { detectPetInQuery, PetCandidate } from './ai-chat-name-matcher';

// Private module-level state for Singleton-like behavior
let vectorStore: PineconeStore | null = null;

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
  resolvedPetId?: string
): Promise<{ answer: string; resolvedPetId?: string }> => {
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

    // 5. Construct Prompt
    const prompt = `
You are a helpful veterinary assistant AI.

INSTRUCTIONS:
1. Analyze the User Question.
2. Check the "KNOWLEDGE BASE" below.
   - IF the knowledge base contains information specifically relevant to the user's question (e.g., vaccine schedules for dogs/cats), USE IT to answer.
   - IF the knowledge base contains information (like dog vaccines) but the user asks about a different topic (like "How to feed a parrot" or "Tiger behavior"), IGNORE the knowledge base completely.
3. If ignoring the knowledge base, answer the question using your own general veterinary knowledge.
4. Do NOT apologize for missing data. Just answer helpfuly.
5. IMPORTANT: Do NOT provide medical diagnoses. If the user describes serious symptoms (e.g., vomiting, lethargy, difficulty breathing, bleeding, seizures, injury), ALWAYS recommend consulting a licensed veterinarian immediately. You can provide general information, but emphasize the importance of professional veterinary care for health concerns.

${petContext ? petContext : ''}

${context ? `--- KNOWLEDGE BASE (Reference Only - Ignore if irrelevant to question) ---
${context}
----------------------------------------------------------------------------` : ''}

User Question: ${query}

Answer:
    `.trim();

    logger.info(`AI Chat Request - Question: "${query}"`);
    logger.info(`Full AI Prompt:\n${prompt}`);

    // 6. Generate Answer
    const response = await llm.invoke(prompt);
    const answer = response.content as string;

    logger.info(`AI Chat Response received successfully.`);
    logger.info(`AI Answer:\n${answer}`);

    return { answer, resolvedPetId: finalResolvedPetId };

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