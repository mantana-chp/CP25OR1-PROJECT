# AI Chat Gemini Chat Session Refactor Plan — Backend

Last updated: 2026-04-11
Status: Implemented ✅
Owner: Backend AI Chat
Scope: Migrated AI chat from stateless request-based Gemini calls to Gemini chat session mode

---

## Product Decisions (Confirmed)

1. Mobile app has no logout/user-switch flow (1 device = 1 user experience).
2. Chat session should be active only while app process is alive.
3. When app is closed and reopened, chat must start as a new session.
4. No durable chat transcript persistence is required.
5. RAG behavior must remain active:
   - Pet profile context in prompt
   - Pinecone retrieval context
6. Backend runs on a single container.
7. 1 device = 1 user. Each user has their own independent session.
8. Backend crash loses all sessions — acceptable; next request auto-creates a fresh session.

---

## Why Refactor

The previous implementation was stateless per request. Frontend replayed up to 8 history items on every request, re-sending all context tokens each time. Migrating to Gemini chat session mode lets the model manage conversation history server-side, reducing payload size and improving conversational continuity without history replay.

---

## SDK Strategy (Implemented)

| Component | SDK | Notes |
|-----------|-----|-------|
| **Main chat session** | `@google/genai` (new unified SDK) | `ai.chats.create()` with `systemInstruction` + per-turn `chat.sendMessage()`. History managed server-side. |
| **Layer 3 pet extraction** | `@langchain/google-genai` (LangChain) | Stays request-based. Isolated single-shot `llm.invoke()`. No session context. |
| **Embeddings** | `@langchain/google-genai` (LangChain) | Used by Pinecone vector store. Unchanged. |
| **Pinecone retrieval** | `@langchain/pinecone` | Unchanged. |

**Package installed:**
```bash
npm install @google/genai
```

---

## Implemented Architecture

### Session Manager (`ai-chat-session-manager.ts`)

In-memory `Map<string, SessionEntry>` manages all active sessions.

**Session key format:** `${installationId}:${clientChatSessionId}`

```typescript
type SessionEntry = {
  chatSession: Chat;               // @google/genai Chat object — manages history internally
  createdAt: number;
  lastActivityAt: number;
  turnCount: number;
  resolvedPetId?: string;          // pet currently resolved for this session
  lastInjectedPetId?: string;      // for pet profile skip optimization
  activeContextId: string;         // current severity context UUID
  contextStatus: SeverityContextStatus;
  severityLevel?: number;
  lastSymptomTopics: Set<string>;  // for context rotation detection
};
```

**Exported functions:**

| Function | Purpose |
|----------|---------|
| `getOrCreateSession(installationId, clientChatSessionId, systemInstruction)` | Returns existing session or creates new `ai.chats.create()` session with system instruction. |
| `touchSession(installationId, clientChatSessionId)` | Bumps `lastActivityAt` + increments `turnCount`. Called after successful turn. |
| `destroySession(installationId, clientChatSessionId)` | Removes session from map. |
| `startCleanupTimer()` | Starts `setInterval` every 5 min to evict sessions idle >30 min. Called once at startup. |
| `getSessionCount()` | Returns current live session count for observability. |

**Multi-user safety:** Each user has a unique `installationId` (from JWT device login). Each chat page visit generates a unique `clientChatSessionId`. Composite key guarantees session isolation. No external storage needed.

---

### Per-Turn RAG Injection (Implemented)

`systemInstruction` (static vet assistant rules from `ai-chat-runtime-config.json`) is set once at `ai.chats.create()`.

Dynamic content is injected per-turn as the user message:

```
chat.sendMessage({ message: `
  ${petContext}            ← only when pet changes or first resolution
  ${knowledgeBaseContext}  ← fresh Pinecone results each turn
  ${severityContextBlock}  ← derived from session state
  User Question: ${modelQuery}
` })
```

**Pet profile optimization:**
- First resolution or pet switch → full profile injected, `lastInjectedPetId` updated.
- Same pet as last turn → profile skipped (model already has it in session history), logged as `petProfileSkipped=true`.

---

### Pet Name Detection (Unchanged)

| Layer | Behavior |
|-------|----------|
| L1 (Exact match) | Runs every request. Pure function in `ai-chat-name-matcher.ts`. |
| L2 (Fuzzy/Levenshtein) | Runs every request. Pure function in `ai-chat-name-matcher.ts`. |
| L3 (LLM extraction) | Fires only when L1+L2 miss AND no session pet. Uses LangChain `llm.invoke()` — request-based, not part of chat session. |

After refactor, `resolvedPetId` is stored in `session.resolvedPetId` instead of being echoed from frontend every request. Session pet persists across turns automatically.

**Resolution priority:**
1. L1/L2 detection of name in current query (overrides session pet — enables pet switching)
2. Session's `resolvedPetId` (persisted from previous turns)
3. `incomingResolvedPetId` from frontend (hint/override accepted)
4. Layer 3 LLM extraction (last resort, first message only)

---

### Severity State — Session-Based Context Machine (Implemented)

History-scanning functions removed. Severity state is now tracked in session metadata.

**Replaced functions (removed):**
- `hasSeverityAfterLatestSymptom(history, ...)` → replaced by `session.contextStatus`
- `getLatestSymptomTopicsFromHistory(history, ...)` → replaced by `session.lastSymptomTopics`

**New function:**
- `shouldRotateContextViaSession(currentTopics, session.lastSymptomTopics)` — compares current query symptom topics against session's stored last symptom topics. No overlap → context rotation.

**State transitions per turn:**

```
isSeveritySubmissionTurn → resolved
queryIntent = normal → not_required
queryIntent = ambiguous_health:
  - session.contextStatus is resolved or pending_severity
    → follow-up detected, keep current contextStatus (not a new ambiguous query)
  - session.contextStatus is not_required or pending_clarification
    → pending_clarification (genuine new ambiguous query)
queryIntent = symptom:
  - topics overlap session.lastSymptomTopics → keep context
    - session.contextStatus already resolved → resolved
    - otherwise → pending_severity
  - topics do NOT overlap → context rotation:
    - new contextId (uuidv4)
    - contextChanged = true
    - pending_severity
```

> **Why this matters:** Queries like "ต้องเฝ้าดูอาการอีกกี่ชั่วโมงดี" contain ambiguous health keywords ("อาการ") but are clearly follow-ups after a resolved symptom severity. Without this guard, they would incorrectly trigger the clarification prompt. The guard only bypasses clarification when there is already an active symptom context in the session.

**Session metadata updates per turn:**
- `session.resolvedPetId` updated with `finalResolvedPetId`
- `session.activeContextId` updated with `effectiveContextId`
- `session.contextStatus` updated with new status
- `session.severityLevel` updated when resolved
- `session.lastInjectedPetId` updated when pet profile injected
- `session.lastSymptomTopics` — replaced on context rotation, merged on same context

---

### Token Usage Logging (Extended)

Per-request summary now includes session identifiers:

```
[AI Chat][<traceId>] Session usage summary:
  clientChatSessionId=<first8>…,
  sessionTurn=<n>,
  contextId=<uuid>,
  contextStatus=<status>,
  finalState=<state>,
  durationMs=<ms>,
  calls{geminiText=<n>, geminiEmbedding=<n>, pineconeSearch=<n>},
  tokens{prompt=<n>, completion=<n>, total=<n>},
  rag{petProfileIncluded=<bool>, petProfileSkipped=<bool>, pineconeRelevantDocs=<n>}
```

**Token extraction:** New `extractNativeGeminiUsage()` reads from `response.usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`) for `@google/genai` responses. Old `extractGeminiUsage()` is kept for Layer 3 LangChain calls.

---

## API Contract

### Request

```typescript
POST /v1/ai-chat
Authorization: Bearer <token>
X-Installation-Id: <installationId>

{
  "query": string,                     // required
  "clientChatSessionId": string,       // required — UUID generated by frontend per session
  "resolvedPetId"?: string,            // optional — accepted as pet hint for L1/L2
  "contextId"?: string,                // optional — explicit severity context reference
  "severitySubmission"?: {             // optional — structured severity input
    "contextId": string,
    "level": 1–5,
    "label"?: string
  }
  // "history" — REMOVED from schema entirely (was deprecated/ignored)
}
```

### Response (unchanged structure)

```typescript
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "answer": string,
    "resolvedPetId"?: string,
    "severityFlag"?: boolean,
    "contextId": string,
    "contextChanged"?: boolean,
    "contextStatus": "not_required" | "pending_clarification" | "pending_severity" | "resolved",
    "severityRequest"?: { contextId, prompt, reason },
    "clarificationRequest"?: { contextId, prompt, reason, options },
    "severityLevel"?: number
  }
}
```

---

## File Summary

### New Files

| File | Purpose |
|------|---------|
| `src/features/ai-chat/ai-chat-session-manager.ts` | In-memory session lifecycle, `@google/genai` `ai.chats.create()` wrapper, 30-min TTL cleanup. |

### Modified Files

| File | Changes |
|------|---------|
| `src/features/ai-chat/ai-chat-schema.ts` | Added `clientChatSessionId` (required UUID). `history` kept as optional/deprecated (accepted but ignored). Removed alternating-role refinement. |
| `src/features/ai-chat/ai-chat-controller.ts` | Extracts `installationId` from `req.headers['x-installation-id']`. Extracts `clientChatSessionId` from body. Passes both to service. |
| `src/features/ai-chat/ai-chat-service.ts` | Full refactor: `@google/genai` chat session for main calls, session manager integration, session-metadata severity state, pet profile skip optimization, `extractNativeGeminiUsage()`, updated usage logs. |
| `src/index.ts` | Adds `startAIChatSessionCleanup()` call at server startup, alongside existing schedulers. |

### Unchanged Files

| File | Reason |
|------|--------|
| `src/features/ai-chat/ai-chat-name-matcher.ts` | Pure L1/L2 functions, no history or session dependency. |
| `src/features/ai-chat/ai-chat-config-loader.ts` | Loads static config from JSON. |
| `src/features/ai-chat/ai-chat-routes.ts` | Same `POST /` with `authGuard`. |
| `config/ai-chat-runtime-config.json` | Static config content. |

---

## Startup Wiring

```typescript
// src/index.ts
app.listen(PORT, () => {
  startReminderScheduler();
  startNotificationScheduler();
  startPetCleanupScheduler();
  startAIChatSessionCleanup();  // ← NEW: starts 5-min sweep for 30-min TTL sessions
});
```

---

## Implementation State

- [x] Planning document created and reviewed.
- [x] `@google/genai` package installed.
- [x] Backend session manager implemented (`ai-chat-session-manager.ts`).
- [x] Schema updated — `clientChatSessionId` required, `history` removed entirely.
- [x] Controller updated — `installationId` + `clientChatSessionId` forwarded.
- [x] Service refactored — chat session, session-metadata severity, pet profile skip.
- [x] `extractNativeGeminiUsage()` added for `@google/genai` response format.
- [x] Token/session logs extended with session identifiers.
- [x] Session cleanup timer wired at app startup.
- [x] Build verified ✅.
- [x] Bug fix: `ambiguous_health` follow-up queries no longer trigger clarification when session has active symptom context.
- [x] Schema cleanup: `history` field and `HistoryItem` type fully removed.

## Implementation Log

- 2026-04-11: Created initial planning document.
- 2026-04-11: Analyzed current codebase, identified gaps, revised plan.
- 2026-04-11: Implemented all backend changes (session manager, schema, controller, service, startup wiring). Build passed.
- 2026-04-11: Post-testing fixes — ambiguous_health follow-up guard added to `deriveContextState()`; `history` field removed from schema.
