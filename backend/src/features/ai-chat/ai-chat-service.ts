import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { logger } from '../../libs/logger';
import { Document } from '@langchain/core/documents';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import prisma from '../../libs/db';
import { formatBirthDateToYearsMonths } from '../../shared/utils';
import { ApiError, BadRequestError } from '../../shared/errors';
import { detectPetInQuery, PetCandidate } from './ai-chat-name-matcher';
import { HistoryItem, SeveritySubmissionInput } from './ai-chat-schema';
import {
  AIChatRuntimeConfig,
  loadAIChatRuntimeConfig,
} from './ai-chat-config-loader';

// Private module-level state for Singleton-like behavior
let vectorStore: PineconeStore | null = null;

type AIRequestMetrics = {
  geminiTextCalls: number;
  geminiEmbeddingCalls: number;
  pineconeSearchCalls: number;
  geminiPromptTokens: number;
  geminiCompletionTokens: number;
  geminiTotalTokens: number;
};

type GeminiUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

type SeverityContextStatus =
  | 'not_required'
  | 'pending_clarification'
  | 'pending_severity'
  | 'resolved';

type SeverityRequestData = {
  contextId: string;
  prompt: string;
  reason: 'symptom_needs_assessment' | 'new_symptom_context';
};

type ClarificationRequestData = {
  contextId: string;
  prompt: string;
  reason: 'ambiguous_health_query';
  options: string[];
};

type QueryIntent = 'symptom' | 'normal' | 'ambiguous_health';

type RequestFinalState = 'completed' | 'clarification_returned' | 'failed';

type ChatWithAIInput = {
  query: string;
  userId: string;
  resolvedPetId?: string;
  history?: HistoryItem[];
  contextId?: string;
  severitySubmission?: SeveritySubmissionInput;
};

type ChatWithAIResult = {
  answer: string;
  resolvedPetId?: string;
  severityFlag?: boolean;
  contextId: string;
  contextChanged?: boolean;
  contextStatus: SeverityContextStatus;
  severityRequest?: SeverityRequestData;
  clarificationRequest?: ClarificationRequestData;
  severityLevel?: number;
};

const createTraceId = (): string =>
  `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toSafeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
};

const extractGeminiUsage = (message: unknown): GeminiUsage => {
  const msg = message as {
    usage_metadata?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
    response_metadata?: {
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
      usage_metadata?: {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
      };
      tokenUsage?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };
  };

  if (msg.usage_metadata) {
    return {
      promptTokens: toSafeNumber(msg.usage_metadata.input_tokens),
      completionTokens: toSafeNumber(msg.usage_metadata.output_tokens),
      totalTokens: toSafeNumber(msg.usage_metadata.total_tokens),
    };
  }

  const usageMeta = (
    msg.response_metadata?.usageMetadata ??
    msg.response_metadata?.usage_metadata ??
    msg.response_metadata?.tokenUsage
  ) as Record<string, unknown> | undefined;

  return {
    promptTokens: toSafeNumber(
      usageMeta?.promptTokenCount ?? usageMeta?.input_tokens
    ),
    completionTokens: toSafeNumber(
      usageMeta?.candidatesTokenCount ?? usageMeta?.output_tokens
    ),
    totalTokens: toSafeNumber(
      usageMeta?.totalTokenCount ?? usageMeta?.total_tokens
    ),
  };
};

const addUsageToMetrics = (
  metrics: AIRequestMetrics,
  usage: GeminiUsage
): void => {
  if (usage.promptTokens !== undefined) {
    metrics.geminiPromptTokens += usage.promptTokens;
  }
  if (usage.completionTokens !== undefined) {
    metrics.geminiCompletionTokens += usage.completionTokens;
  }
  if (usage.totalTokens !== undefined) {
    metrics.geminiTotalTokens += usage.totalTokens;
  }
};

const formatTokenLogValue = (value?: number): string =>
  value === undefined ? 'n/a' : String(value);

const buildRequestUsageSummary = ({
  traceId,
  contextId,
  contextStatus,
  startedAt,
  metrics,
  finalState,
  hasPetProfileContext,
  pineconeRelevantDocs,
}: {
  traceId: string;
  contextId: string;
  contextStatus: SeverityContextStatus;
  startedAt: number;
  metrics: AIRequestMetrics;
  finalState: RequestFinalState;
  hasPetProfileContext: boolean;
  pineconeRelevantDocs: number;
}): string =>
  `[AI Chat][${traceId}] Session usage summary: contextId=${contextId}, contextStatus=${contextStatus}, finalState=${finalState}, durationMs=${Date.now() - startedAt}, calls{geminiText=${metrics.geminiTextCalls}, geminiEmbedding=${metrics.geminiEmbeddingCalls}, pineconeSearch=${metrics.pineconeSearchCalls}}, tokens{prompt=${metrics.geminiPromptTokens}, completion=${metrics.geminiCompletionTokens}, total=${metrics.geminiTotalTokens}}, rag{petProfileIncluded=${hasPetProfileContext}, pineconeRelevantDocs=${pineconeRelevantDocs}}`;

const LEGACY_SEVERITY_PREFIX = /^\s*\[SEVERITY:\s*([1-5])\/5\]\s*/i;

const normalizeText = (value: string): string => value.toLowerCase().trim();

const containsAnyKeyword = (input: string, keywords: string[]): boolean => {
  const normalized = normalizeText(input);
  if (!normalized) return false;
  return keywords.some((keyword) => normalized.includes(keyword));
};

const buildSystemInstruction = (
  runtimeConfig: AIChatRuntimeConfig
): string => runtimeConfig.system_instruction_lines.join('\n').trim();

const parseLegacySeverityQuery = (
  input: string
): { level?: number; cleanQuery: string } => {
  const match = input.match(LEGACY_SEVERITY_PREFIX);
  if (!match) {
    return { cleanQuery: input };
  }

  const level = Number(match[1]);
  const cleanQuery = input.replace(LEGACY_SEVERITY_PREFIX, '').trim();
  return {
    level: Number.isInteger(level) ? level : undefined,
    cleanQuery,
  };
};

const extractSymptomTopics = (
  input: string,
  symptomTopicGroups: AIChatRuntimeConfig['symptom_topic_groups']
): Set<string> => {
  const normalized = normalizeText(input);
  const topics = new Set<string>();

  if (!normalized) return topics;

  for (const group of symptomTopicGroups) {
    if (group.keywords.some((keyword) => normalized.includes(keyword))) {
      topics.add(group.topic);
    }
  }

  return topics;
};

const hasSymptomTopics = (
  input: string,
  symptomTopicGroups: AIChatRuntimeConfig['symptom_topic_groups']
): boolean => extractSymptomTopics(input, symptomTopicGroups).size > 0;

const classifyQueryIntent = (
  input: string,
  runtimeConfig: AIChatRuntimeConfig
): QueryIntent => {
  if (hasSymptomTopics(input, runtimeConfig.symptom_topic_groups)) {
    return 'symptom';
  }

  if (containsAnyKeyword(input, runtimeConfig.health_ambiguous_hint_keywords)) {
    return 'ambiguous_health';
  }

  if (containsAnyKeyword(input, runtimeConfig.normal_care_keywords)) {
    return 'normal';
  }

  // Default to normal mode to avoid over-triggering severity for general chat.
  return 'normal';
};

const getLatestSymptomTopicsFromHistory = (
  history: HistoryItem[] | undefined,
  symptomTopicGroups: AIChatRuntimeConfig['symptom_topic_groups']
): Set<string> | null => {
  if (!history || history.length === 0) return null;

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (entry.role !== 'user') continue;

    const cleanText = parseLegacySeverityQuery(entry.content).cleanQuery;
    const topics = extractSymptomTopics(cleanText, symptomTopicGroups);
    if (topics.size > 0) {
      return topics;
    }
  }

  return null;
};

const hasSeverityAfterLatestSymptom = (
  history: HistoryItem[] | undefined,
  symptomTopicGroups: AIChatRuntimeConfig['symptom_topic_groups']
): boolean => {
  if (!history || history.length === 0) return false;

  let latestSymptomIndex = -1;
  let latestSeverityIndex = -1;

  history.forEach((entry, index) => {
    if (entry.role !== 'user') return;

    const parsed = parseLegacySeverityQuery(entry.content);
    if (parsed.level !== undefined) {
      latestSeverityIndex = index;
    }

    if (hasSymptomTopics(parsed.cleanQuery, symptomTopicGroups)) {
      latestSymptomIndex = index;
    }
  });

  if (latestSymptomIndex < 0) return false;
  return latestSeverityIndex > latestSymptomIndex;
};

const shouldRotateContextForNewSymptom = (
  query: string,
  history: HistoryItem[] | undefined,
  symptomTopicGroups: AIChatRuntimeConfig['symptom_topic_groups']
): boolean => {
  const currentTopics = extractSymptomTopics(query, symptomTopicGroups);
  if (currentTopics.size === 0) return false;

  const previousTopics = getLatestSymptomTopicsFromHistory(
    history,
    symptomTopicGroups
  );
  if (!previousTopics || previousTopics.size === 0) return false;

  for (const topic of currentTopics) {
    if (previousTopics.has(topic)) {
      return false;
    }
  }

  return true;
};

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
  pets: PetCandidate[],
  traceId: string,
  metrics: AIRequestMetrics
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
    metrics.geminiTextCalls += 1;
    logger.info(`[AI Chat][${traceId}] Gemini text call #${metrics.geminiTextCalls} (Layer 3 pet extraction) started.`);

    const response = await llm.invoke(extractionPrompt);
    const usage = extractGeminiUsage(response);
    addUsageToMetrics(metrics, usage);
    logger.info(
      `[AI Chat][${traceId}] Gemini text call #${metrics.geminiTextCalls} token usage: prompt=${formatTokenLogValue(usage.promptTokens)}, completion=${formatTokenLogValue(usage.completionTokens)}, total=${formatTokenLogValue(usage.totalTokens)}.`
    );

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
  input: ChatWithAIInput
): Promise<ChatWithAIResult> => {
  const {
    query,
    userId,
    resolvedPetId,
    history,
    contextId,
    severitySubmission,
  } = input;

  const traceId = createTraceId();
  const startedAt = Date.now();
  const metrics: AIRequestMetrics = {
    geminiTextCalls: 0,
    geminiEmbeddingCalls: 0,
    pineconeSearchCalls: 0,
    geminiPromptTokens: 0,
    geminiCompletionTokens: 0,
    geminiTotalTokens: 0,
  };

  const parsedLegacySeverity = parseLegacySeverityQuery(query);
  const normalizedQuery =
    parsedLegacySeverity.cleanQuery.trim().length > 0
      ? parsedLegacySeverity.cleanQuery.trim()
      : query.trim();
  const submittedSeverityLevel =
    severitySubmission?.level ?? parsedLegacySeverity.level;
  const isSeveritySubmissionTurn = submittedSeverityLevel !== undefined;
  const runtimeConfig = loadAIChatRuntimeConfig();
  const systemInstruction = buildSystemInstruction(runtimeConfig);
  const queryIntent = classifyQueryIntent(normalizedQuery, runtimeConfig);

  if (
    severitySubmission &&
    contextId &&
    severitySubmission.contextId !== contextId
  ) {
    throw new BadRequestError(
      'severitySubmission.contextId must match contextId'
    );
  }

  const incomingContextId = severitySubmission?.contextId ?? contextId;
  let effectiveContextId = incomingContextId ?? uuidv4();
  let contextChanged = false;

  const isSymptomTurn = queryIntent === 'symptom';

  if (
    incomingContextId &&
    !isSeveritySubmissionTurn &&
    isSymptomTurn &&
    shouldRotateContextForNewSymptom(
      normalizedQuery,
      history,
      runtimeConfig.symptom_topic_groups
    )
  ) {
    effectiveContextId = uuidv4();
    contextChanged = true;
  }

  const latestHistorySeverityResolved = hasSeverityAfterLatestSymptom(
    history,
    runtimeConfig.symptom_topic_groups
  );

  let contextStatus: SeverityContextStatus = 'not_required';
  if (isSeveritySubmissionTurn) {
    contextStatus = 'resolved';
  } else if (queryIntent === 'symptom') {
    contextStatus =
      !contextChanged && latestHistorySeverityResolved
        ? 'resolved'
        : 'pending_severity';
  } else if (queryIntent === 'ambiguous_health') {
    contextStatus = 'pending_clarification';
  }

  const shouldAskClarification = contextStatus === 'pending_clarification';
  const shouldRequestSeverity = contextStatus === 'pending_severity';

  const severityRequest: SeverityRequestData | undefined = shouldRequestSeverity
    ? {
      contextId: effectiveContextId,
      prompt: 'กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น (1-5)',
      reason: contextChanged
        ? 'new_symptom_context'
        : 'symptom_needs_assessment',
    }
    : undefined;

  const clarificationRequest: ClarificationRequestData | undefined =
    shouldAskClarification
      ? {
        contextId: effectiveContextId,
        prompt: runtimeConfig.clarification_prompt,
        reason: 'ambiguous_health_query',
        options: runtimeConfig.clarification_options,
      }
      : undefined;

  const modelQuery = isSeveritySubmissionTurn
    ? `[SEVERITY: ${submittedSeverityLevel}/5] ${normalizedQuery}`.trim()
    : normalizedQuery;

  logger.info(
    `[AI Chat][${traceId}] Request started. userId=${userId}, queryIntent=${queryIntent}, contextId=${effectiveContextId}, contextChanged=${contextChanged}, contextStatus=${contextStatus}, hasResolvedPetId=${Boolean(resolvedPetId)}, historyItems=${history?.length ?? 0}, query="${normalizedQuery.slice(0, 120)}${normalizedQuery.length > 120 ? '...' : ''}"`
  );

  const store = await initializeVectorStore();
  let petContext = '';
  let hasPetProfileContext = false;
  let pineconeRelevantDocs = 0;

  try {
    // 1. Fetch all active pets for this user (needed for name detection)
    const userPets = await prisma.pets.findMany({
      where: { user_id: userId, status: 'ACTIVE' },
      select: { id: true, pet_name: true },
    });

    // 2. Pet name detection — Layers 1 & 2 always run on every message.
    //    This allows mid-session pet switching without any extra cost.
    const detectedPet = detectPetInQuery(normalizedQuery, userPets);
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
      const llmPet = await extractPetWithLLM(
        normalizedQuery,
        userPets,
        traceId,
        metrics
      );
      if (llmPet) {
        finalResolvedPetId = llmPet.id;
        logger.info(`[AI Chat] Pet detected via Layer 3: "${llmPet.pet_name}"`);
      }
    }

    if (shouldAskClarification) {
      logger.info(
        `[AI Chat][${traceId}] Ambiguous health query detected. Returning clarification prompt without severity request.`
      );

      logger.info(
        buildRequestUsageSummary({
          traceId,
          contextId: effectiveContextId,
          contextStatus,
          startedAt,
          metrics,
          finalState: 'clarification_returned',
          hasPetProfileContext,
          pineconeRelevantDocs,
        })
      );

      return {
        answer: runtimeConfig.clarification_prompt,
        resolvedPetId: finalResolvedPetId,
        contextId: effectiveContextId,
        contextChanged: contextChanged || undefined,
        contextStatus,
        clarificationRequest,
      };
    }

    // 3. Build pet context string if a pet was resolved
    if (finalResolvedPetId) {
      petContext = await buildPetContext(finalResolvedPetId);
      hasPetProfileContext = petContext.length > 0;
    }

    // 4. Retrieve relevant documents (Knowledge Base)
    // Use similaritySearchWithScore to filter out irrelevant results
    metrics.pineconeSearchCalls += 1;
    metrics.geminiEmbeddingCalls += 1;
    logger.info(
      `[AI Chat][${traceId}] Pinecone search #${metrics.pineconeSearchCalls} started (includes Gemini embedding call #${metrics.geminiEmbeddingCalls}).`
    );

    const resultsWithScore = await store.similaritySearchWithScore(
      modelQuery,
      3
    );

    // DEBUG: Log retrieval scores to help tune the threshold
    resultsWithScore.forEach(([doc, score]) => {
      logger.debug(`Retrieval Score: ${score.toFixed(4)} | Content: ${(doc.metadata.text as string)?.substring(0, 50)}...`);
    });

    const threshold = 0.5; // Raised to 0.5 for stricter filtering

    const relevantDocs = resultsWithScore
      .filter(([_, score]) => score >= threshold)
      .map(([doc]) => doc);
    pineconeRelevantDocs = relevantDocs.length;

    logger.info(
      `[AI Chat][${traceId}] RAG context summary. contextId=${effectiveContextId}, petProfileIncluded=${hasPetProfileContext}, pineconeRelevantDocs=${pineconeRelevantDocs}.`
    );

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

    userPromptParts.push(
      `--- SEVERITY CONTEXT ---
ContextId: ${effectiveContextId}
ContextChanged: ${contextChanged ? 'yes' : 'no'}
IsSymptomTurn: ${isSymptomTurn ? 'yes' : 'no'}
SeveritySubmissionThisTurn: ${isSeveritySubmissionTurn ? `yes (${submittedSeverityLevel}/5)` : 'no'}
LatestHistorySeverityResolved: ${latestHistorySeverityResolved ? 'yes' : 'no'}
ContextStatus: ${contextStatus}
NeedsSeverityNow: ${shouldRequestSeverity ? 'yes' : 'no'}
If NeedsSeverityNow=yes: Ask user for 1-5 severity in Thai and append [NEEDS_SEVERITY] on a new final line.
If NeedsSeverityNow=no: Never append [NEEDS_SEVERITY].
--- END SEVERITY CONTEXT ---`
    );

    userPromptParts.push(`User Question: ${modelQuery}`);

    const prompt = userPromptParts.join('\n\n');

    logger.info(`AI Chat Request - Question: "${modelQuery}"`);
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

    metrics.geminiTextCalls += 1;
    logger.info(`[AI Chat][${traceId}] Gemini text call #${metrics.geminiTextCalls} (main answer generation) started.`);

    const response = await llm.invoke([
      new SystemMessage(systemInstruction),
      ...historyMessages,
      new HumanMessage(prompt),
    ]);
    const usage = extractGeminiUsage(response);
    addUsageToMetrics(metrics, usage);
    logger.info(
      `[AI Chat][${traceId}] Gemini text call #${metrics.geminiTextCalls} token usage: prompt=${formatTokenLogValue(usage.promptTokens)}, completion=${formatTokenLogValue(usage.completionTokens)}, total=${formatTokenLogValue(usage.totalTokens)}.`
    );

    const rawAnswer = response.content as string;

    // Parse severity flag marker — AI appends [NEEDS_SEVERITY] when symptom context
    // is detected and no severity rating exists in history yet.
    const llmSeverityFlag = rawAnswer.includes('[NEEDS_SEVERITY]');
    const severityFlag = shouldRequestSeverity;

    if (llmSeverityFlag && !shouldRequestSeverity) {
      logger.warn(
        `[AI Chat][${traceId}] Model emitted [NEEDS_SEVERITY] while backend state is ${contextStatus}. Marker was ignored.`
      );
    }

    const answer = rawAnswer.replace(/\[NEEDS_SEVERITY\]/g, '').trimEnd();

    logger.info(`AI Chat Response received successfully. severityFlag=${severityFlag}`);
    logger.info(`AI Answer:\n${answer}`);
    logger.info(
      buildRequestUsageSummary({
        traceId,
        contextId: effectiveContextId,
        contextStatus,
        startedAt,
        metrics,
        finalState: 'completed',
        hasPetProfileContext,
        pineconeRelevantDocs,
      })
    );

    return {
      answer,
      resolvedPetId: finalResolvedPetId,
      severityFlag: severityFlag || undefined,
      contextId: effectiveContextId,
      contextChanged: contextChanged || undefined,
      contextStatus,
      severityRequest,
      clarificationRequest,
      severityLevel: submittedSeverityLevel,
    };

  } catch (error) {
    logger.error(
      buildRequestUsageSummary({
        traceId,
        contextId: effectiveContextId,
        contextStatus,
        startedAt,
        metrics,
        finalState: 'failed',
        hasPetProfileContext,
        pineconeRelevantDocs,
      }),
      error as Error
    );
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