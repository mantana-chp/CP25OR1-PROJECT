# AI Chat Gemini Chat Session Refactor Plan

Last updated: 2026-04-11
Status: Planning
Owner: Backend + Frontend AI Chat

## Product Decisions (Confirmed)
1. Mobile app has no logout/user-switch flow (1 device = 1 user experience).
2. Chat session should be active only while app process is alive.
3. When app is closed and reopened, chat must start as a new session.
4. No durable chat transcript persistence is required.
5. RAG behavior must remain active:
- pet profile context in prompt
- Pinecone retrieval context

## Why Refactor
Current implementation is stateless per request and requires frontend-provided history. This works, but we want to migrate to Gemini chat session mode while preserving the same product behavior and keeping RAG quality.

## Scope
1. Add Gemini chat-session orchestration in backend.
2. Add ephemeral session identity from frontend (per app run).
3. Keep token usage logging per request.
4. Keep pet profile + Pinecone RAG path unchanged functionally.

## Non-Goals
1. No persistent chat history database.
2. No cross-device session sync.
3. No long-term memory across app relaunch.

## Target Behavior
1. Same app run:
- frontend sends a stable clientChatSessionId
- backend reuses Gemini chat session memory for that id
2. App closed then reopened:
- frontend generates a new clientChatSessionId
- backend starts a fresh Gemini chat session
3. Backend container restart:
- in-memory sessions are lost (accepted)
- next request auto-creates a new session

## Proposed Architecture

### Frontend
1. Generate clientChatSessionId once when chatbot page/session starts.
2. Do not persist clientChatSessionId to storage.
3. Include clientChatSessionId in every /v1/ai-chat request.
4. Stop relying on large history replay once chat-session mode is enabled.

### Backend
1. Add in-memory GeminiSessionManager:
- key: installationId + clientChatSessionId
- value: Gemini chat object + metadata
2. Session metadata:
- createdAt
- lastActivityAt
- turnCount
- optional resolvedPetId mirror
3. Session timeout cleanup (inactivity TTL, for example 30 minutes).
4. On each request:
- resolve/create session
- run pet detection (L1/L2/L3)
- build pet profile block if pet resolved
- retrieve Pinecone relevant docs
- build turn context block and send through chat session
5. Keep fallback path to current stateless invocation behind feature flag until stable.

## RAG Preservation Requirements
1. Pet profile context:
- buildPetContext must remain in use whenever finalResolvedPetId exists.
2. Pinecone retrieval:
- similaritySearchWithScore must continue running per user turn.
- relevant docs must still be threshold-filtered and appended as reference context.
3. Prompt discipline:
- keep query at end
- keep RAG sections explicit and concise

## Token and Session Logging Requirements
1. Per request, log:
- traceId
- clientChatSessionId
- backend session key (masked)
- contextId/contextStatus
- geminiTextCalls, geminiEmbeddingCalls, pineconeSearchCalls
- prompt/completion/total tokens
- finalState (completed, clarification_returned, failed)
2. Keep existing session usage summary log format and extend with chat-session identifiers.

## API Contract Changes (Planned)
1. Request payload/header:
- add clientChatSessionId (required after frontend rollout)
2. Keep backwards compatibility during rollout:
- if missing clientChatSessionId, use current stateless path
3. history field:
- optional in migration period
- eventually removed from primary flow

## File Impact Plan
1. backend/src/features/ai-chat/ai-chat-schema.ts
- add clientChatSessionId validation
2. backend/src/features/ai-chat/ai-chat-controller.ts
- pass clientChatSessionId and installationId to service
3. backend/src/features/ai-chat/ai-chat-service.ts
- integrate session manager and chat-session invoke path
4. backend/src/features/ai-chat/ai-chat-session-manager.ts (new)
- in-memory session lifecycle + cleanup
5. frontend/src/domain/chatbot.domain.ts
- request type includes clientChatSessionId
6. frontend/src/utils/api/services/chatbot_service.ts
- send clientChatSessionId every request
7. frontend/src/presentation/chatbot/pages/chatbot_page.tsx
- generate/reset ephemeral clientChatSessionId per app/chat start

## Rollout Plan
1. Phase 1: Create session manager behind feature flag.
2. Phase 2: Frontend sends clientChatSessionId.
3. Phase 3: Enable Gemini chat-session mode for internal testing.
4. Phase 4: Validate RAG parity and token logs.
5. Phase 5: Remove dependency on replayed history in normal path.

## Validation Plan
1. Functional
- same app run keeps conversational continuity
- app relaunch starts new session
- backend restart recovers gracefully with new session
2. RAG
- pet profile still appears when pet resolved
- Pinecone docs still injected when relevant
3. Observability
- per-request token/session summary logs present
- no missing logs on success, clarification, and error paths
4. Performance
- compare latency/cost with and without history replay

## Risks and Mitigations
1. Risk: Session leak in memory.
- Mitigation: inactivity TTL + periodic cleanup.
2. Risk: Missing clientChatSessionId from old frontend.
- Mitigation: compatibility fallback to stateless path.
3. Risk: RAG drift after refactor.
- Mitigation: explicit RAG parity tests and log assertions.

## Implementation State
- [x] Planning document created.
- [ ] Backend session manager implemented.
- [ ] Schema/controller contract updated for clientChatSessionId.
- [ ] Frontend sends ephemeral clientChatSessionId.
- [ ] Gemini chat-session path enabled behind flag.
- [ ] RAG parity verified (pet profile + Pinecone).
- [ ] Token/session logs verified in all request outcomes.
- [ ] Build/tests completed.

## Implementation Log
- 2026-04-11: Created initial Gemini chat-session refactor plan from discussion decisions and current codebase behavior.
