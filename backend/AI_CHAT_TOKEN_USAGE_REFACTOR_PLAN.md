# AI Chat Token Usage Logging Refactor Plan

Last updated: 2026-04-11
Owner: Backend AI Chat
Scope: backend/src/features/ai-chat/ai-chat-service.ts

## Objective
1. Ensure every AI chat request logs total token usage for that request/session context.
2. Keep existing RAG behavior intact:
- Pet profile context injection in prompt remains active when a pet is resolved.
- Pinecone retrieval remains active for knowledge-base grounding.
3. Keep one implementation log in this file for progress tracking.

## Background
- Old implementation reference reviewed: AI_CHAT_IMPLEMENTATION.md.
- Current service already logs token usage per Gemini text call and request totals.
- This refactor makes the request/session summary explicit and consistent across all request exit paths.

## Refactor Plan
1. Add unified request usage summary logger in ai-chat-service.
2. Emit summary log in all exit paths:
- clarification early-return
- success return
- error catch
3. Add explicit RAG context summary log:
- whether pet profile context was included
- number of Pinecone documents included in final prompt
4. Validate TypeScript diagnostics.
5. Validate backend build.
6. Capture results and final state in this file.

## Implementation State
- [x] Step 1: Added unified request usage summary builder.
- [x] Step 2: Added summary logs for clarification/success/failure paths.
- [x] Step 3: Added explicit RAG context summary log.
- [x] Step 4: Diagnostics validation completed.
- [ ] Step 5: Backend build validation completed (skipped in this run; execute manually).
- [x] Step 6: Final verification notes documented.

## Expected Log Output (Examples)
1. Session usage summary:
- [AI Chat][<traceId>] Session usage summary: contextId=<uuid>, contextStatus=<status>, finalState=<state>, durationMs=<ms>, calls{...}, tokens{prompt=<n>, completion=<n>, total=<n>}, rag{petProfileIncluded=<true|false>, pineconeRelevantDocs=<n>}

2. RAG context summary:
- [AI Chat][<traceId>] RAG context summary. contextId=<uuid>, petProfileIncluded=<true|false>, pineconeRelevantDocs=<n>

## Verification Checklist (RAG Safety)
1. Pet profile prompt context is still built through buildPetContext when finalResolvedPetId exists.
2. Pinecone search still runs through similaritySearchWithScore(modelQuery, 3).
3. Relevant docs are still filtered by threshold and appended to the prompt.

## Implementation Log
- 2026-04-11: Reviewed old AI_CHAT_IMPLEMENTATION.md for historical behavior and constraints.
- 2026-04-11: Refactored ai-chat-service to add a unified request/session token usage summary log for all exit paths.
- 2026-04-11: Added RAG context summary instrumentation without changing retrieval logic.
- 2026-04-11: TypeScript diagnostics for ai-chat-service passed (no errors).
- 2026-04-11: Build run was skipped by user/tool flow; needs one manual npm run build confirmation.

## Final Verification Notes (Current)
1. Per-request token/session summary logging:
- Verified in code via buildRequestUsageSummary usage on clarification return, success path, and catch path.

2. Pet profile prompt context RAG path:
- buildPetContext(finalResolvedPetId) is unchanged and still appended to prompt when available.

3. Pinecone RAG path:
- similaritySearchWithScore(modelQuery, 3) remains active.
- relevantDocs threshold filtering and prompt insertion remain active.
