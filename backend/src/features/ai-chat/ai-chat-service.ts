import { Document } from '@langchain/core/documents';
import prisma from '../../libs/db';
import { logger } from '../../libs/logger';
import { ApiError, BadRequestError } from '../../shared/errors';
import { PetMatch, detectAllPetsInQuery } from './ai-chat-name-matcher';
import { loadAIChatRuntimeConfig } from './ai-chat-config-loader';
import { getOrCreateSession, touchSession, SessionEntry } from './ai-chat-session-manager';
import { initializeVectorStore, getRelevantDocs as getDocs } from './ai-chat-rag';
import {
  AIRequestMetrics,
  ChatWithAIInput,
  ChatWithAIResult,
  SeverityContextStatus,
  SeverityRequestData,
  ClarificationRequestData,
  PetClarificationRequestData,
} from './ai-chat-types';
import {
  createTraceId,
  extractNativeGeminiUsage,
  addUsageToMetrics,
  formatTokenLogValue,
  buildRequestUsageSummary,
} from './ai-chat-utils';
import {
  buildSystemInstruction,
  parseLegacySeverityQuery,
  extractSymptomTopics,
  classifyQueryIntent,
  deriveContextState,
} from './ai-chat-severity';
import {
  extractPetWithLLM,
  disambiguatePetWithLLM,
  buildPetContext,
  derivePetContextState,
} from './ai-chat-pet-context';

// Re-export for backward compatibility
export { getRelevantDocs } from './ai-chat-rag';

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
      effectiveContextId: petContextId,
      petContextStatus,
      petContextChanged,
      resolvedPet,
      ambiguousPets,
      petClarificationRequest,
    } = await derivePetContextState(
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

        // If the original query was a symptom turn, defer the severity request
        // until after the user resolves the pet ambiguity.
        if (contextStatus === 'pending_severity') {
          session.pendingSymptomSeverity = {
            contextId: effectiveContextId,
            contextChanged,
            symptomTopics: currentSymptomTopics,
          };
        }

        logger.info(
          `[AI Chat][${traceId}] Ambiguous pet detected. Returning clarification prompt.`
        );
        logger.info(
          buildRequestUsageSummary({
            traceId,
            clientChatSessionId,
            sessionTurnCount: session.turnCount,
            contextId: effectiveContextId,
            contextStatus: 'not_required',
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
          contextStatus: 'not_required',
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

    // When user just resolved pet ambiguity by selecting a pet, the query from the
    // frontend is a UI label like "เลือกสัตว์เลี้ยง: ชบาแก้ว" — not a real question.
    // Replace it with a neutral internal signal so the model greets naturally
    // without assuming any health concern.
    const effectiveModelQuery = petClarificationSubmission
      ? `[PET_SELECTED] ผู้ใช้เพิ่งยืนยันว่าหมายถึง "${finalResolvedPet?.pet_name ?? normalizedQuery}" (${finalResolvedPetRole === 'CAREGIVER' ? 'สัตว์เลี้ยงที่ดูแลอยู่' : 'สัตว์เลี้ยงของตัวเอง'}) ทักทายและถามว่าต้องการความช่วยเหลือเรื่องอะไร ห้ามสมมติว่ามีปัญหาสุขภาพ`
      : modelQuery;

    userPromptParts.push(`User Question: ${effectiveModelQuery}`);

    const prompt = userPromptParts.join('\n\n');

    logger.info(`AI Chat Request - Question: "${effectiveModelQuery}"`);
    logger.info(`Full AI Prompt: 
${prompt} `);

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
    // 7a. Resolve deferred severity when pet ambiguity was just cleared
    //     (pet clarification submission on this turn + severity was deferred)
    // -----------------------------------------------------------------------
    let finalContextStatus: SeverityContextStatus = contextStatus;
    let finalSeverityRequest = severityRequest;
    let finalEffectiveContextId = effectiveContextId;
    let finalContextChanged = contextChanged;

    if (
      petClarificationSubmission &&
      finalPetContextStatus === 'resolved' &&
      session.pendingSymptomSeverity
    ) {
      const deferred = session.pendingSymptomSeverity;
      finalContextStatus = 'pending_severity';
      finalEffectiveContextId = deferred.contextId;
      finalContextChanged = deferred.contextChanged;
      finalSeverityRequest = {
        contextId: deferred.contextId,
        prompt: 'กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น (1-5)',
        reason: deferred.contextChanged
          ? 'new_symptom_context'
          : 'symptom_needs_assessment',
      };
      session.lastSymptomTopics = new Set(deferred.symptomTopics);
      session.pendingSymptomSeverity = undefined;
      logger.info(
        `[AI Chat][${traceId}] Deferred severity activated after pet resolution. contextId=${deferred.contextId}`
      );
    }

    // -----------------------------------------------------------------------
    // 7b. Update session metadata for this completed turn
    // -----------------------------------------------------------------------
    session.resolvedPetId = finalResolvedPetId ?? session.resolvedPetId;
    session.resolvedPetRole = finalResolvedPetRole ?? session.resolvedPetRole;
    session.activeContextId = finalEffectiveContextId;
    session.contextStatus = finalContextStatus;
    if (finalContextStatus === 'resolved' && submittedSeverityLevel !== undefined) {
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
    logger.info(`AI Answer: 
${answer} `);
    logger.info(
      buildRequestUsageSummary({
        traceId,
        clientChatSessionId,
        sessionTurnCount: session.turnCount + 1, // +1 because touch hasn't run yet at this log point
        contextId: finalEffectiveContextId,
        contextStatus: finalContextStatus,
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
      severityFlag: (finalSeverityRequest !== undefined) || undefined,
      contextId: finalEffectiveContextId,
      contextChanged: finalContextChanged || undefined,
      contextStatus: finalContextStatus,
      petContextStatus: finalPetContextStatus,
      petContextChanged: finalPetContextChanged || undefined,
      severityRequest: finalSeverityRequest,
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
