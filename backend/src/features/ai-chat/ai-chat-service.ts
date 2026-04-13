import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { logger } from '../../libs/logger';
import { Document } from '@langchain/core/documents';
import prisma from '../../libs/db';
import { formatBirthDateToYearsMonths } from '../../shared/utils';
import { ApiError, BadRequestError } from '../../shared/errors';
import { detectPetInQuery, PetCandidate, PetMatch, detectAllPetsInQuery } from './ai-chat-name-matcher';
import { SeveritySubmissionInput, PetClarificationSubmissionInput } from './ai-chat-schema';
import {
  AIChatRuntimeConfig,
  loadAIChatRuntimeConfig,
} from './ai-chat-config-loader';
import {
  getOrCreateSession,
  touchSession,
  SessionEntry,
} from './ai-chat-session-manager';

// ---------------------------------------------------------------------------
// Private module-level state
// ---------------------------------------------------------------------------

let vectorStore: PineconeStore | null = null;

// LangChain LLM — used exclusively for Layer 3 pet name extraction (request-based)
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

// ---------------------------------------------------------------------------
// Metric & usage types
// ---------------------------------------------------------------------------

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

type PetContextStatus =
  | 'not_required'
  | 'pending_clarification'
  | 'resolved';

type PetClarificationRequestData = {
  contextId: string;
  prompt: string;
  reason: 'ambiguous_pet_name';
  options: Array<{
    petId: string;
    petName: string;
    role: 'OWNER' | 'CAREGIVER';
  }>;
};

type QueryIntent = 'symptom' | 'normal' | 'ambiguous_health';

type RequestFinalState = 'completed' | 'clarification_returned' | 'failed';

// ---------------------------------------------------------------------------
// Service input/output types
// ---------------------------------------------------------------------------

type ChatWithAIInput = {
  query: string;
  userId: string;
  installationId: string;
  clientChatSessionId: string;
  resolvedPetId?: string;
  contextId?: string;
  severitySubmission?: SeveritySubmissionInput;
  petClarificationSubmission?: PetClarificationSubmissionInput;
};

type ChatWithAIResult = {
  answer: string;
  resolvedPetId?: string;
  resolvedPetRole?: 'OWNER' | 'CAREGIVER';
  severityFlag?: boolean;
  contextId: string;
  contextChanged?: boolean;
  contextStatus: SeverityContextStatus;
  petContextStatus?: PetContextStatus;
  petContextChanged?: boolean;
  severityRequest?: SeverityRequestData;
  clarificationRequest?: ClarificationRequestData;
  petClarificationRequest?: PetClarificationRequestData;
  severityLevel?: number;
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const createTraceId = (): string =>
  `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toSafeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
};

const formatTokenLogValue = (value?: number): string =>
  value === undefined ? 'n/a' : String(value);

// ---------------------------------------------------------------------------
// Token usage extraction
// ---------------------------------------------------------------------------

/**
 * Extracts token usage from a LangChain LLM response (used for Layer 3 calls).
 */
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

/**
 * Extracts token usage from a native @google/genai chat.sendMessage() response.
 * Response shape: { usageMetadata: { promptTokenCount, candidatesTokenCount, totalTokenCount } }
 */
const extractNativeGeminiUsage = (response: unknown): GeminiUsage => {
  const res = response as {
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };

  const meta = res.usageMetadata;
  if (!meta) return {};

  return {
    promptTokens: toSafeNumber(meta.promptTokenCount),
    completionTokens: toSafeNumber(meta.candidatesTokenCount),
    totalTokens: toSafeNumber(meta.totalTokenCount),
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

// ---------------------------------------------------------------------------
// Usage summary logger
// ---------------------------------------------------------------------------

const buildRequestUsageSummary = ({
  traceId,
  clientChatSessionId,
  sessionTurnCount,
  contextId,
  contextStatus,
  startedAt,
  metrics,
  finalState,
  hasPetProfileContext,
  petProfileSkipped,
  pineconeRelevantDocs,
}: {
  traceId: string;
  clientChatSessionId: string;
  sessionTurnCount: number;
  contextId: string;
  contextStatus: SeverityContextStatus;
  startedAt: number;
  metrics: AIRequestMetrics;
  finalState: RequestFinalState;
  hasPetProfileContext: boolean;
  petProfileSkipped: boolean;
  pineconeRelevantDocs: number;
}): string =>
  `[AI Chat][${traceId}] Session usage summary: clientChatSessionId=${clientChatSessionId.slice(0, 8)}…, sessionTurn=${sessionTurnCount}, contextId=${contextId}, contextStatus=${contextStatus}, finalState=${finalState}, durationMs=${Date.now() - startedAt}, calls{geminiText=${metrics.geminiTextCalls}, geminiEmbedding=${metrics.geminiEmbeddingCalls}, pineconeSearch=${metrics.pineconeSearchCalls}}, tokens{prompt=${formatTokenLogValue(metrics.geminiPromptTokens)}, completion=${formatTokenLogValue(metrics.geminiCompletionTokens)}, total=${formatTokenLogValue(metrics.geminiTotalTokens)}}, rag{petProfileIncluded=${hasPetProfileContext}, petProfileSkipped=${petProfileSkipped}, pineconeRelevantDocs=${pineconeRelevantDocs}}`;

// ---------------------------------------------------------------------------
// Text processing helpers
// ---------------------------------------------------------------------------

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

  return 'normal';
};

/**
 * Determines if the current symptom query represents a NEW symptom context
 * compared to what is stored in session metadata.
 * Replaces the old `shouldRotateContextForNewSymptom()` that scanned history.
 */
const shouldRotateContextViaSession = (
  currentTopics: Set<string>,
  sessionLastTopics: Set<string>
): boolean => {
  if (currentTopics.size === 0) return false;
  if (sessionLastTopics.size === 0) return false;

  for (const topic of currentTopics) {
    if (sessionLastTopics.has(topic)) {
      return false; // overlap found — same context
    }
  }

  return true; // no overlap — context shifted
};

// ---------------------------------------------------------------------------
// Vector store
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Layer 3 — LLM pet entity extraction (stays request-based, uses LangChain)
// ---------------------------------------------------------------------------

/**
 * Only called when Layers 1 & 2 both miss AND no resolvedPetId in session.
 * Uses a minimal, fast prompt via LangChain llm.invoke() — NOT a chat session.
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
 * Disambiguates between multiple pets with the same name using LLM.
 * Called when L1+L2 detect multiple pets (e.g., owned "Jiggo" and caregiver "Jiggo").
 * Uses query context and conversation history to determine which pet the user means.
 */
const disambiguatePetWithLLM = async (
  query: string,
  ambiguousPets: PetMatch[],
  sessionHistory: string,
  traceId: string,
  metrics: AIRequestMetrics
): Promise<PetMatch | null> => {
  if (ambiguousPets.length < 2) return ambiguousPets[0] ?? null;

  const petListStr = ambiguousPets
    .map((p) => `- "${p.pet_name}" (${p.role}${p.ownerAlias ? `, owner: ${p.ownerAlias}` : ''})`)
    .join('\n');

  const disambiguationPrompt = `You are analyzing a user message to determine which pet they are referring to.

There are ${ambiguousPets.length} pets with the same name "${ambiguousPets[0].pet_name}":
${petListStr}

User message: "${query}"

Recent conversation context:
${sessionHistory || '(No previous context)'}

Analyze the user's message carefully. Look for:
1. Explicit role mentions (e.g., "ที่ฉันดูแล", "ของฉัน", "ผู้ดูแล", "เจ้าของ")
2. Implicit context from conversation history
3. Ownership indicators or caregiving references

Which pet is the user referring to? Reply with ONLY the role (OWNER or CAREGIVER) that best matches the user's intent.

If you cannot determine or it's ambiguous, reply with "UNKNOWN".

Reply with exactly one word: OWNER, CAREGIVER, or UNKNOWN.`;

  try {
    metrics.geminiTextCalls += 1;
    logger.info(`[AI Chat][${traceId}] Gemini text call #${metrics.geminiTextCalls} (pet disambiguation) started.`);

    const response = await llm.invoke(disambiguationPrompt);
    const usage = extractGeminiUsage(response);
    addUsageToMetrics(metrics, usage);
    logger.info(
      `[AI Chat][${traceId}] Gemini text call #${metrics.geminiTextCalls} token usage: prompt=${formatTokenLogValue(usage.promptTokens)}, completion=${formatTokenLogValue(usage.completionTokens)}, total=${formatTokenLogValue(usage.totalTokens)}.`
    );

    const raw = (response.content as string).trim().toUpperCase();

    if (raw === 'UNKNOWN' || !raw) {
      logger.info(`[AI Chat][${traceId}] LLM disambiguation: ambiguous, returning null`);
      return null;
    }

    const matchedPet = ambiguousPets.find((p) => p.role === raw);

    if (matchedPet) {
      logger.info(`[AI Chat][${traceId}] LLM disambiguation: resolved to ${raw} pet "${matchedPet.pet_name}"`);
      return matchedPet;
    }

    logger.info(`[AI Chat][${traceId}] LLM disambiguation: no match for role "${raw}", returning null`);
    return null;
  } catch (error) {
    logger.error(`[AI Chat][${traceId}] LLM disambiguation failed:`, error as Error);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Pet context builder
// ---------------------------------------------------------------------------

const buildPetContext = async (
  petId: string,
  role?: 'OWNER' | 'CAREGIVER',
  ownerAlias?: string
): Promise<string> => {
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

  // Build role context string
  let roleContext = '';
  if (role === 'OWNER') {
    roleContext = 'Role: OWNER (คุณเป็นเจ้าของสัตว์เลี้ยงตัวนี้)';
  } else if (role === 'CAREGIVER') {
    roleContext = `Role: CAREGIVER (คุณเป็นผู้ดูแลสัตว์เลี้ยงตัวนี้ให้กับ ${ownerAlias || 'เจ้าของ'})`;
  }

  return (
    `
--- CURRENT PET PROFILE ---
Name: ${pet.pet_name}${roleContext ? `\n${roleContext}` : ''}
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

// ---------------------------------------------------------------------------
// Session-based severity state deriver
// ---------------------------------------------------------------------------

/**
 * Derives the new contextStatus and whether to rotate context,
 * based on session metadata instead of the old history array scanning.
 */
const deriveContextState = (
  session: SessionEntry,
  queryIntent: QueryIntent,
  isSeveritySubmissionTurn: boolean,
  currentSymptomTopics: Set<string>,
  incomingContextId: string | undefined,
  runtimeConfig: AIChatRuntimeConfig
): {
  effectiveContextId: string;
  contextChanged: boolean;
  contextStatus: SeverityContextStatus;
} => {
  // If submitting severity for an existing context
  if (isSeveritySubmissionTurn) {
    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      contextChanged: false,
      contextStatus: 'resolved',
    };
  }

  if (queryIntent === 'ambiguous_health') {
    // If the session already has an active symptom context (resolved or pending),
    // this is a follow-up question, not a new ambiguous query.
    // e.g. "ต้องเฝ้าดูอาการอีกกี่ชั่วโมงดี" after a vomiting severity was resolved
    // → contains "อาการ" (health keyword) but is clearly a follow-up.
    const hasActiveSymptomContext =
      session.contextStatus === 'resolved' ||
      session.contextStatus === 'pending_severity';

    if (hasActiveSymptomContext) {
      return {
        effectiveContextId: incomingContextId ?? session.activeContextId,
        contextChanged: false,
        contextStatus: session.contextStatus, // keep current state
      };
    }

    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      contextChanged: false,
      contextStatus: 'pending_clarification',
    };
  }

  if (queryIntent === 'normal') {
    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      contextChanged: false,
      contextStatus: 'not_required',
    };
  }

  // queryIntent === 'symptom'
  const shouldRotate = shouldRotateContextViaSession(
    currentSymptomTopics,
    session.lastSymptomTopics
  );

  if (shouldRotate) {
    return {
      effectiveContextId: uuidv4(),
      contextChanged: true,
      contextStatus: 'pending_severity',
    };
  }

  // Same symptom context — check if severity is already resolved in this session
  const alreadyResolved =
    session.contextStatus === 'resolved' &&
    session.activeContextId === (incomingContextId ?? session.activeContextId);

  return {
    effectiveContextId: incomingContextId ?? session.activeContextId,
    contextChanged: false,
    contextStatus: alreadyResolved ? 'resolved' : 'pending_severity',
  };
};

// ---------------------------------------------------------------------------
// Pet context state deriver (handles disambiguation for duplicate pet names)
// ---------------------------------------------------------------------------

/**
 * Derives the pet context status based on detected pets and session state.
 * Handles duplicate pet name disambiguation when a user has multiple pets
 * with the same name (e.g., owned "Snow" and caregiver "Snow").
 */
const derivePetContextState = (
  session: SessionEntry,
  detectedPets: PetMatch[],
  incomingResolvedPetId: string | undefined,
  petClarificationSubmission: PetClarificationSubmissionInput | undefined,
  incomingContextId: string | undefined,
  userPets: PetMatch[]
): {
  effectiveContextId: string;
  petContextStatus: PetContextStatus;
  petContextChanged: boolean;
  resolvedPet: PetMatch | undefined;
  ambiguousPets: PetMatch[];
  petClarificationRequest?: PetClarificationRequestData;
} => {
  // If user is submitting a pet clarification selection
  if (petClarificationSubmission) {
    const selectedPet = userPets.find((p) => p.id === petClarificationSubmission.selectedPetId);
    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      petContextStatus: 'resolved',
      petContextChanged: false,
      resolvedPet: selectedPet,
      ambiguousPets: [],
    };
  }

  // If no pets detected at all
  if (detectedPets.length === 0) {
    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      petContextStatus: 'not_required',
      petContextChanged: false,
      resolvedPet: undefined,
      ambiguousPets: [],
    };
  }

  // If only one pet detected (or user provided resolvedPetId hint)
  if (detectedPets.length === 1) {
    const singlePet = detectedPets[0];

    // Check if this is a new pet vs continuing with same pet
    const isSamePet = session.resolvedPetId === singlePet.id;

    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      petContextStatus: 'resolved',
      petContextChanged: !isSamePet,
      resolvedPet: singlePet,
      ambiguousPets: [],
    };
  }

  // Multiple pets detected (DUPLICATE NAME SCENARIO)
  // Check if session already resolved one of these ambiguous pets
  const sessionPetStillValid = detectedPets.find((p) => p.id === session.resolvedPetId);

  if (sessionPetStillValid) {
    // User is continuing to talk about the same ambiguous pet - no need to re-clarify
    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      petContextStatus: 'resolved',
      petContextChanged: false,
      resolvedPet: sessionPetStillValid,
      ambiguousPets: detectedPets,
    };
  }

  // NEW ambiguous scenario - need clarification
  const newContextId = uuidv4();
  const petName = detectedPets[0].pet_name; // All have same name

  // Build options for the frontend to display
  const options = detectedPets.map((p) => ({
    petId: p.id,
    petName: p.pet_name,
    role: p.role,
  }));

  // Find owned and caregiver options for the prompt
  const ownedOption = options.find((o) => o.role === 'OWNER');
  const caregiverOptions = options.filter((o) => o.role === 'CAREGIVER');

  // Build the disambiguation prompt
  let prompt: string;
  if (ownedOption && caregiverOptions.length === 1) {
    prompt = `คุณหมายถึง ${petName} ที่เป็นสัตว์เลี้ยงของคุณ หรือ ${petName} ที่คุณเป็นผู้ดูแล?`;
  } else {
    prompt = `คุณหมายถึง ${petName} ตัวไหนครับ?`;
  }

  const clarificationRequest: PetClarificationRequestData = {
    contextId: newContextId,
    prompt,
    reason: 'ambiguous_pet_name',
    options,
  };

  return {
    effectiveContextId: newContextId,
    petContextStatus: 'pending_clarification',
    petContextChanged: true,
    resolvedPet: undefined,
    ambiguousPets: detectedPets,
    petClarificationRequest: clarificationRequest,
  };
};

// ---------------------------------------------------------------------------
// Main chat function
// ---------------------------------------------------------------------------

/**
 * Main chat function using Gemini chat session with RAG and 3-layer pet detection.
 *
 * - Gemini chat session: manages conversation history server-side.
 * - Layers 1 & 2 (exact + fuzzy): run every message to detect pet switching.
 * - Layer 3 (LLM extraction): fires only when L1+L2 miss AND no session pet.
 * - RAG: pet profile injected on first resolution or pet switch; Pinecone retrieved fresh each turn.
 * - Severity state: tracked in session metadata, not from history array.
 */
export const chatWithAI = async (
  input: ChatWithAIInput
): Promise<ChatWithAIResult> => {
  const {
    query,
    userId,
    installationId,
    clientChatSessionId,
    resolvedPetId: incomingResolvedPetId,
    contextId,
    severitySubmission,
    petClarificationSubmission,
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

  // Validate context IDs match if both provided
  if (
    severitySubmission &&
    contextId &&
    severitySubmission.contextId !== contextId
  ) {
    throw new BadRequestError(
      'severitySubmission.contextId must match contextId'
    );
  }

  if (
    petClarificationSubmission &&
    contextId &&
    petClarificationSubmission.contextId !== contextId
  ) {
    throw new BadRequestError(
      'petClarificationSubmission.contextId must match contextId'
    );
  }

  // Parse legacy severity format (e.g. "[SEVERITY: 4/5] query text")
  const parsedLegacySeverity = parseLegacySeverityQuery(query);
  const normalizedQuery =
    parsedLegacySeverity.cleanQuery.trim().length > 0
      ? parsedLegacySeverity.cleanQuery.trim()
      : query.trim();
  const submittedSeverityLevel =
    severitySubmission?.level ?? parsedLegacySeverity.level;
  const isSeveritySubmissionTurn = submittedSeverityLevel !== undefined;

  // Load runtime config (cached 24h)
  const runtimeConfig = loadAIChatRuntimeConfig();
  const systemInstruction = buildSystemInstruction(runtimeConfig);
  const queryIntent = classifyQueryIntent(normalizedQuery, runtimeConfig);
  const currentSymptomTopics = extractSymptomTopics(
    normalizedQuery,
    runtimeConfig.symptom_topic_groups
  );

  // The query sent to the model includes severity level prefix when applicable
  const modelQuery = isSeveritySubmissionTurn
    ? `[SEVERITY: ${submittedSeverityLevel}/5] ${normalizedQuery}`.trim()
    : normalizedQuery;

  // Resolve or create the Gemini chat session for this user
  const session = getOrCreateSession(
    installationId,
    clientChatSessionId,
    systemInstruction
  );

  const incomingContextId = severitySubmission?.contextId ?? contextId;

  // Derive severity state from session metadata (replaces history scanning)
  const { effectiveContextId, contextChanged, contextStatus } = deriveContextState(
    session,
    queryIntent,
    isSeveritySubmissionTurn,
    currentSymptomTopics,
    incomingContextId,
    runtimeConfig
  );

  const isSymptomTurn = queryIntent === 'symptom';
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

  logger.info(
    `[AI Chat][${traceId}] Request started. userId=${userId}, sessionTurn=${session.turnCount}, queryIntent=${queryIntent}, contextId=${effectiveContextId}, contextChanged=${contextChanged}, contextStatus=${contextStatus}, hasSessionPet=${Boolean(session.resolvedPetId)}, query="${normalizedQuery.slice(0, 120)}${normalizedQuery.length > 120 ? '...' : ''}"`
  );

  const store = await initializeVectorStore();
  let petContext = '';
  let hasPetProfileContext = false;
  let petProfileSkipped = false;
  let pineconeRelevantDocs = 0;

  try {
    // -----------------------------------------------------------------------
    // 1. Fetch all active pets for this user (owned + shared/caregiver)
    // -----------------------------------------------------------------------
    const [ownedPets, sharedAccesses] = await Promise.all([
      prisma.pets.findMany({
        where: { user_id: userId, status: 'ACTIVE' },
        select: { id: true, pet_name: true },
      }),
      prisma.pet_user_access.findMany({
        where: {
          user_id: userId,
          revoked_at: null,
          pet: { status: 'ACTIVE' },
        },
        include: {
          pet: { select: { id: true, pet_name: true } },
          contact: { select: { alias: true } },
        },
      }),
    ]);

    // Combine into PetMatch array with role info
    const userPets: PetMatch[] = [
      ...ownedPets.map((p) => ({
        id: p.id,
        pet_name: p.pet_name,
        role: 'OWNER' as const,
      })),
      ...sharedAccesses.map((access) => ({
        id: access.pet.id,
        pet_name: access.pet.pet_name,
        role: 'CAREGIVER' as const,
        ownerAlias: access.contact.alias,
      })),
    ];

    logger.info(
      `[AI Chat][${traceId}] Loaded ${ownedPets.length} owned + ${sharedAccesses.length} shared pets for user ${userId.slice(0, 8)}…`
    );

    // -----------------------------------------------------------------------
    // 2. Pet name detection — detect ALL matching pets (for duplicate handling)
    // -----------------------------------------------------------------------
    const detectedPets = detectAllPetsInQuery(normalizedQuery, userPets);

    logger.info(`[AI Chat][${traceId}] Pet detection: ${detectedPets.length} matches found`);
    detectedPets.forEach((p) => {
      logger.info(`[AI Chat][${traceId}]   - "${p.pet_name}" (${p.role}${p.ownerAlias ? ` for ${p.ownerAlias}` : ''})`);
    });

    // -----------------------------------------------------------------------
    // 3. Derive pet context state (handles duplicate name disambiguation)
    // -----------------------------------------------------------------------
    const {
      effectiveContextId,
      petContextStatus,
      petContextChanged,
      resolvedPet,
      ambiguousPets,
      petClarificationRequest,
    } = derivePetContextState(
      session,
      detectedPets,
      incomingResolvedPetId,
      petClarificationSubmission,
      incomingContextId,
      userPets
    );

    // If we need pet clarification, try LLM disambiguation first
    let finalResolvedPet = resolvedPet;
    let finalPetContextStatus = petContextStatus;
    let finalPetContextChanged = petContextChanged;

    if (petContextStatus === 'pending_clarification' && ambiguousPets.length >= 2) {
      logger.info(
        `[AI Chat][${traceId}] Attempting LLM disambiguation for ${ambiguousPets.length} pets with same name.`
      );

      const disambiguatedPet = await disambiguatePetWithLLM(
        normalizedQuery,
        ambiguousPets,
        session.turnCount > 0 ? 'Session has previous conversation context' : '',
        traceId,
        metrics
      );

      if (disambiguatedPet) {
        // LLM successfully resolved which pet - override the state
        logger.info(
          `[AI Chat][${traceId}] LLM disambiguation successful, resolving to ${disambiguatedPet.role} pet "${disambiguatedPet.pet_name}"`
        );
        finalResolvedPet = disambiguatedPet;
        finalPetContextStatus = 'resolved';
        finalPetContextChanged = session.resolvedPetId !== disambiguatedPet.id;
      } else {
        // LLM couldn't disambiguate - return clarification prompt
        session.pendingPetClarification = {
          contextId: effectiveContextId,
          ambiguousPetIds: ambiguousPets.map((p) => p.id),
        };
        session.activeContextId = effectiveContextId;

        logger.info(
          `[AI Chat][${traceId}] Ambiguous pet detected. Returning clarification prompt.`
        );
        logger.info(
          buildRequestUsageSummary({
            traceId,
            clientChatSessionId,
            sessionTurnCount: session.turnCount,
            contextId: effectiveContextId,
            contextStatus,
            startedAt,
            metrics,
            finalState: 'clarification_returned',
            hasPetProfileContext,
            petProfileSkipped,
            pineconeRelevantDocs,
          })
        );

        return {
          answer: petClarificationRequest!.prompt,
          contextId: effectiveContextId,
          contextStatus,
          petContextStatus,
          petContextChanged: true,
          petClarificationRequest,
        };
      }
    }

    // Determine final resolved pet
    let finalResolvedPetId: string | undefined;
    let finalResolvedPetRole: 'OWNER' | 'CAREGIVER' | undefined;
    let finalOwnerAlias: string | undefined;

    if (finalResolvedPet) {
      finalResolvedPetId = finalResolvedPet.id;
      finalResolvedPetRole = finalResolvedPet.role;
      finalOwnerAlias = finalResolvedPet.ownerAlias;
    } else if (session.resolvedPetId) {
      // Session already has a pet — keep it (no L3 needed)
      finalResolvedPetId = session.resolvedPetId;
      finalResolvedPetRole = session.resolvedPetRole;
      logger.info(`[AI Chat][${traceId}] No new pet in query, continuing session pet: ${session.resolvedPetId}`);
    } else if (incomingResolvedPetId) {
      // Frontend sent a resolvedPetId (L1/L2 override or first-turn hint)
      finalResolvedPetId = incomingResolvedPetId;
      // Find role from userPets
      const petMatch = userPets.find((p) => p.id === incomingResolvedPetId);
      finalResolvedPetRole = petMatch?.role;
      finalOwnerAlias = petMatch?.ownerAlias;
      logger.info(`[AI Chat][${traceId}] Using incoming resolvedPetId hint: ${incomingResolvedPetId}`);
    } else if (detectedPets.length === 0 && userPets.length > 0) {
      // L1+L2 missed, no session pet, no hint → fire Layer 3
      logger.info('[AI Chat] No pet detected via L1/L2, falling back to Layer 3 LLM extraction.');
      const llmPet = await extractPetWithLLM(
        normalizedQuery,
        userPets,
        traceId,
        metrics
      );
      if (llmPet) {
        finalResolvedPetId = llmPet.id;
        const petMatch = userPets.find((p) => p.id === llmPet.id);
        finalResolvedPetRole = petMatch?.role;
        finalOwnerAlias = petMatch?.ownerAlias;
        logger.info(`[AI Chat] Pet detected via Layer 3: "${llmPet.pet_name}"`);
      }
    }

    // -----------------------------------------------------------------------
    // Early return for health clarification — no Gemini chat session call needed
    // -----------------------------------------------------------------------
    if (shouldAskClarification) {
      // Update session state even on clarification returns
      session.resolvedPetId = finalResolvedPetId ?? session.resolvedPetId;
      session.activeContextId = effectiveContextId;
      session.contextStatus = contextStatus;

      logger.info(
        `[AI Chat][${traceId}] Ambiguous health query detected. Returning clarification prompt.`
      );
      logger.info(
        buildRequestUsageSummary({
          traceId,
          clientChatSessionId,
          sessionTurnCount: session.turnCount,
          contextId: effectiveContextId,
          contextStatus,
          startedAt,
          metrics,
          finalState: 'clarification_returned',
          hasPetProfileContext,
          petProfileSkipped,
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

    // -----------------------------------------------------------------------
    // 3. Build pet context — only inject when pet changes or first time
    // -----------------------------------------------------------------------
    if (finalResolvedPetId) {
      // Check if pet changed OR role changed (need re-injection if user switched from owner to caregiver view of same pet)
      const isNewPet = finalResolvedPetId !== session.lastInjectedPetId;
      const isRoleChange = finalResolvedPetRole !== session.lastInjectedPetRole;

      if (isNewPet || isRoleChange) {
        // New pet, first time, or role changed — fetch and inject full profile with role
        petContext = await buildPetContext(finalResolvedPetId, finalResolvedPetRole, finalOwnerAlias);
        hasPetProfileContext = petContext.length > 0;
        logger.info(
          `[AI Chat][${traceId}] Pet profile injected for petId=${finalResolvedPetId.slice(0, 8)}… (${finalResolvedPetRole}) (was: ${session.lastInjectedPetId ? session.lastInjectedPetId.slice(0, 8) + '…' : 'none'})`
        );
      } else {
        // Same pet and role as last turn — model already has profile in session history
        petProfileSkipped = true;
        logger.info(
          `[AI Chat][${traceId}] Pet profile skip — same pet already in session(petId = ${finalResolvedPetId.slice(0, 8)}…)`
        );
      }
    }

    // -----------------------------------------------------------------------
    // 4. Retrieve relevant documents from Pinecone (fresh every turn)
    // -----------------------------------------------------------------------
    metrics.pineconeSearchCalls += 1;
    metrics.geminiEmbeddingCalls += 1;
    logger.info(
      `[AI Chat][${traceId}] Pinecone search #${metrics.pineconeSearchCalls} started(includes Gemini embedding call #${metrics.geminiEmbeddingCalls}).`
    );

    const resultsWithScore = await store.similaritySearchWithScore(modelQuery, 3);

    resultsWithScore.forEach(([doc, score]) => {
      logger.debug(`Retrieval Score: ${score.toFixed(4)} | Content: ${(doc.metadata.text as string)?.substring(0, 50)}...`);
    });

    const threshold = 0.5;
    const relevantDocs = resultsWithScore
      .filter(([_, score]) => score >= threshold)
      .map(([doc]) => doc);
    pineconeRelevantDocs = relevantDocs.length;

    logger.info(
      `[AI Chat][${traceId}] RAG context summary.contextId = ${effectiveContextId}, petProfileIncluded = ${hasPetProfileContext}, petProfileSkipped = ${petProfileSkipped}, pineconeRelevantDocs = ${pineconeRelevantDocs}.`
    );

    const knowledgeBaseContext = relevantDocs
      .map((doc: Document) => doc.pageContent || doc.metadata.text)
      .join('\n\n');

    // -----------------------------------------------------------------------
    // 5. Build per-turn dynamic prompt (injected as user message)
    //    System instruction lives in the chat session — not repeated here.
    // -----------------------------------------------------------------------
    const userPromptParts: string[] = [];

    if (petContext) {
      userPromptParts.push(petContext);
    }

    if (knowledgeBaseContext) {
      userPromptParts.push(
        `-- - KNOWLEDGE BASE(Reference Only - Ignore if irrelevant to question)---
        ${knowledgeBaseContext}
      ----------------------------------------------------------------------------`
      );
    }

    userPromptParts.push(
      `--- SEVERITY CONTEXT-- -
        ContextId: ${effectiveContextId}
      ContextChanged: ${contextChanged ? 'yes' : 'no'}
      IsSymptomTurn: ${isSymptomTurn ? 'yes' : 'no'}
      SeveritySubmissionThisTurn: ${isSeveritySubmissionTurn ? `yes (${submittedSeverityLevel}/5)` : 'no'}
      ContextStatus: ${contextStatus}
      NeedsSeverityNow: ${shouldRequestSeverity ? 'yes' : 'no'}
If NeedsSeverityNow = yes: Ask user for 1 - 5 severity in Thai and append[NEEDS_SEVERITY] on a new final line.
If NeedsSeverityNow = no: Never append[NEEDS_SEVERITY].
--- END SEVERITY CONTEXT-- - `
    );

    userPromptParts.push(`User Question: ${modelQuery} `);

    const prompt = userPromptParts.join('\n\n');

    logger.info(`AI Chat Request - Question: "${modelQuery}"`);
    logger.info(`Full AI Prompt: \n${prompt} `);

    // -----------------------------------------------------------------------
    // 6. Send through Gemini chat session
    //    History is managed server-side by the ChatSession object.
    // -----------------------------------------------------------------------
    metrics.geminiTextCalls += 1;
    logger.info(`[AI Chat][${traceId}] Gemini chat session sendMessage #${metrics.geminiTextCalls} started.`);

    const chatResponse = await session.chatSession.sendMessage({ message: prompt });
    const usage = extractNativeGeminiUsage(chatResponse);
    addUsageToMetrics(metrics, usage);
    logger.info(
      `[AI Chat][${traceId}] Gemini chat session call #${metrics.geminiTextCalls} token usage: prompt = ${formatTokenLogValue(usage.promptTokens)}, completion = ${formatTokenLogValue(usage.completionTokens)}, total = ${formatTokenLogValue(usage.totalTokens)}.`
    );

    const rawAnswer = chatResponse.text;

    if (!rawAnswer) {
      throw new ApiError('Gemini returned an empty response.', 500);
    }

    // Parse severity marker
    const llmSeverityFlag = rawAnswer.includes('[NEEDS_SEVERITY]');
    const severityFlag = shouldRequestSeverity;

    if (llmSeverityFlag && !shouldRequestSeverity) {
      logger.warn(
        `[AI Chat][${traceId}] Model emitted[NEEDS_SEVERITY] while backend state is ${contextStatus}. Marker was ignored.`
      );
    }

    const answer = rawAnswer.replace(/\[NEEDS_SEVERITY\]/g, '').trimEnd();

    // -----------------------------------------------------------------------
    // 7. Update session metadata for this completed turn
    // -----------------------------------------------------------------------
    session.resolvedPetId = finalResolvedPetId ?? session.resolvedPetId;
    session.resolvedPetRole = finalResolvedPetRole ?? session.resolvedPetRole;
    session.activeContextId = effectiveContextId;
    session.contextStatus = contextStatus;
    if (contextStatus === 'resolved' && submittedSeverityLevel !== undefined) {
      session.severityLevel = submittedSeverityLevel;
    }
    if (finalResolvedPetId && hasPetProfileContext) {
      session.lastInjectedPetId = finalResolvedPetId;
      session.lastInjectedPetRole = finalResolvedPetRole;
    }
    // Clear pending pet clarification if we have a resolved pet
    if (petContextStatus === 'resolved' && finalResolvedPetId) {
      session.pendingPetClarification = undefined;
    }
    if (currentSymptomTopics.size > 0) {
      // Update last known symptom topics for future context rotation detection
      if (contextChanged) {
        // New context — replace topics
        session.lastSymptomTopics = new Set(currentSymptomTopics);
      } else {
        // Same context — merge topics
        for (const t of currentSymptomTopics) session.lastSymptomTopics.add(t);
      }
    }

    // Touch session (updates lastActivityAt + turnCount)
    touchSession(installationId, clientChatSessionId);

    logger.info(`AI Chat Response received successfully.severityFlag = ${severityFlag} `);
    logger.info(`AI Answer: \n${answer} `);
    logger.info(
      buildRequestUsageSummary({
        traceId,
        clientChatSessionId,
        sessionTurnCount: session.turnCount + 1, // +1 because touch hasn't run yet at this log point
        contextId: effectiveContextId,
        contextStatus,
        startedAt,
        metrics,
        finalState: 'completed',
        hasPetProfileContext,
        petProfileSkipped,
        pineconeRelevantDocs,
      })
    );

    return {
      answer,
      resolvedPetId: finalResolvedPetId,
      resolvedPetRole: finalResolvedPetRole,
      severityFlag: severityFlag || undefined,
      contextId: effectiveContextId,
      contextChanged: contextChanged || undefined,
      contextStatus,
      petContextStatus: finalPetContextStatus,
      petContextChanged: finalPetContextChanged || undefined,
      severityRequest,
      clarificationRequest,
      severityLevel: submittedSeverityLevel,
    };

  } catch (error) {
    logger.error(
      buildRequestUsageSummary({
        traceId,
        clientChatSessionId,
        sessionTurnCount: session.turnCount,
        contextId: effectiveContextId,
        contextStatus,
        startedAt,
        metrics,
        finalState: 'failed',
        hasPetProfileContext,
        petProfileSkipped,
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

// ---------------------------------------------------------------------------
// Helper for retrieval testing
// ---------------------------------------------------------------------------

export const getRelevantDocs = async (query: string, k: number = 3) => {
  const store = await initializeVectorStore();
  return await store.similaritySearch(query, k);
};