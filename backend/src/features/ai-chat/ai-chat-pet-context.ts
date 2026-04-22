import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { logger } from '../../libs/logger';
import prisma from '../../libs/db';
import { formatBirthDateToYearsMonths } from '../../shared/utils';
import { generateDownloadUrl } from '../file-uploads/upload-service';
import { PetCandidate, PetMatch } from './ai-chat-name-matcher';
import { PetClarificationSubmissionInput } from './ai-chat-schema';
import { SessionEntry } from './ai-chat-session-manager';
import {
  AIRequestMetrics,
  PetContextStatus,
  PetClarificationRequestData,
} from './ai-chat-types';
import {
  extractGeminiUsage,
  addUsageToMetrics,
  formatTokenLogValue,
} from './ai-chat-utils';

// ---------------------------------------------------------------------------
// LangChain LLM for pet extraction and disambiguation
// ---------------------------------------------------------------------------

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: config.google.apiKey,
  temperature: 0.7,
});

// ---------------------------------------------------------------------------
// Layer 3 — LLM pet entity extraction (stays request-based, uses LangChain)
// ---------------------------------------------------------------------------

/**
 * Only called when Layers 1 & 2 both miss AND no resolvedPetId in session.
 * Uses a minimal, fast prompt via LangChain llm.invoke() — NOT a chat session.
 */
export const extractPetWithLLM = async (
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

// ---------------------------------------------------------------------------
// LLM Disambiguation for duplicate pet names
// ---------------------------------------------------------------------------

/**
 * Disambiguates between multiple pets with the same name using LLM.
 * Called when L1+L2 detect multiple pets (e.g., owned "Jiggo" and caregiver "Jiggo").
 * Uses query context and conversation history to determine which pet the user means.
 */
export const disambiguatePetWithLLM = async (
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

export const buildPetContext = async (
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
// Pet context state deriver (handles disambiguation for duplicate pet names)
// ---------------------------------------------------------------------------

/**
 * Derives the pet context status based on detected pets and session state.
 * Handles duplicate pet name disambiguation when a user has multiple pets
 * with the same name (e.g., owned "Snow" and caregiver "Snow").
 */
export const derivePetContextState = async (
  session: SessionEntry,
  detectedPets: PetMatch[],
  incomingResolvedPetId: string | undefined,
  petClarificationSubmission: PetClarificationSubmissionInput | undefined,
  incomingContextId: string | undefined,
  userPets: PetMatch[]
): Promise<{
  effectiveContextId: string;
  petContextStatus: PetContextStatus;
  petContextChanged: boolean;
  resolvedPet: PetMatch | undefined;
  ambiguousPets: PetMatch[];
  petClarificationRequest?: PetClarificationRequestData;
}> => {
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

  // Fetch profile image keys for the ambiguous pets in one DB call,
  // then generate presigned download URLs (same pattern as pet-service.ts).
  const petIds = detectedPets.map((p) => p.id);
  const petProfiles = await prisma.pets.findMany({
    where: { id: { in: petIds } },
    select: { id: true, profile_image_key: true },
  });

  const profileUrlById = new Map<string, string | undefined>();
  await Promise.all(
    petProfiles.map(async (p) => {
      if (p.profile_image_key) {
        try {
          const url = await generateDownloadUrl(p.profile_image_key, 3600);
          profileUrlById.set(p.id, url);
        } catch {
          // Non-fatal: if URL generation fails, just omit the field
          profileUrlById.set(p.id, undefined);
        }
      }
    })
  );

  // Build options for the frontend to display
  const options = detectedPets.map((p) => ({
    petId: p.id,
    petName: p.pet_name,
    role: p.role,
    ...(profileUrlById.get(p.id)
      ? { petProfileUrl: profileUrlById.get(p.id) }
      : {}),
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
