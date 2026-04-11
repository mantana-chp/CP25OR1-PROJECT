# AI Chat Gemini Chat Session Refactor Plan — Backend

Last updated: 2026-04-11
Status: Ready for implementation
Owner: Backend AI Chat
Scope: Migrate AI chat from stateless request-based Gemini calls to Gemini chat session mode

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

Current implementation is stateless per request. Frontend replays up to 8 history items every request, re-sending all context tokens. Migrating to Gemini chat session mode lets the model manage conversation history server-side, reducing payload size and improving conversational continuity.

---

## Scope

1. Add Gemini chat-session orchestration in backend using `@google/genai` SDK.
2. Add ephemeral session identity from frontend (clientChatSessionId, per app run).
3. Keep token usage logging per request.
4. Keep pet profile + Pinecone RAG path functionally unchanged.
5. Keep pet name detection Layer 3 as a standalone request-based LLM call.

## Non-Goals

1. No persistent chat history database.
2. No cross-device session sync.
3. No long-term memory across app relaunch.
4. No frontend implementation changes in this plan (see separate frontend plan).

---

## Target Behavior

1. **Same app run:**
   - Frontend sends a stable `clientChatSessionId`.
   - Backend reuses Gemini chat session memory for that ID.
   - History is managed by the Gemini chat session — frontend does NOT replay history.

2. **App closed then reopened:**
   - Frontend generates a new `clientChatSessionId`.
   - Backend starts a fresh Gemini chat session.

3. **Backend container restart:**
   - In-memory sessions are lost (accepted).
   - Next request auto-creates a new session.

4. **Multiple concurrent users:**
   - Each user gets their own session, keyed by `installationId:clientChatSessionId`.
   - Sessions are independent; no cross-user interference.

---

## SDK Strategy

| Component | SDK | Reason |
|-----------|-----|--------|
| **Main chat session** | `@google/genai` (new unified SDK) | Provides `ai.chats.create()` with built-in session history and `systemInstruction` support. Replaces deprecated `@google/generative-ai`. |
| **Layer 3 pet extraction** | `@langchain/google-genai` (LangChain) | Stays request-based. Isolated single-shot call. No session context needed. |
| **Embeddings** | `@langchain/google-genai` (LangChain) | Used by Pinecone vector store. No change. |
| **Pinecone retrieval** | `@langchain/pinecone` | No change. |

**Required package change:**
```bash
npm install @google/genai
# @google/generative-ai can be removed after migration is verified
```

---

## Architecture

### Session Manager Design

**File:** `src/features/ai-chat/ai-chat-session-manager.ts` (NEW)

In-memory `Map<string, SessionEntry>` manages all active sessions.

```typescript
type SessionEntry = {
  chatSession: Chat;                  // from @google/genai (ai.chats.create())
  createdAt: number;
  lastActivityAt: number;
  turnCount: number;
  resolvedPetId?: string;             // carried across turns in server memory
  lastInjectedPetId?: string;         // tracks which pet profile was last sent to the model
  activeContextId: string;            // current severity context UUID
  contextStatus: SeverityContextStatus;
  severityLevel?: number;             // set when current context is resolved
  lastSymptomTopics: Set<string>;     // for context rotation detection
};

// Session key format
type SessionKey = `${installationId}:${clientChatSessionId}`;
```

**Key methods:**

| Method | Purpose |
|--------|---------|
| `getOrCreateSession(installationId, clientChatSessionId, systemInstruction)` | Looks up existing session or creates new `ai.chats.create()` with system instruction. Returns `SessionEntry`. |
| `destroySession(key)` | Removes session from map. |
| `startCleanupTimer()` | `setInterval` every 5 min, evicts sessions with >30 min inactivity. Logs session count at each sweep. |

**Multi-user safety:** Each user has a unique `installationId` (from JWT/device login), and each chat page visit generates a unique `clientChatSessionId`. The composite key `installationId:clientChatSessionId` guarantees session isolation. No external storage is needed — the in-memory Map handles everything for a single-container deployment.

---

### Per-Turn RAG Injection Strategy

The `systemInstruction` (veterinary assistant rules from `ai-chat-runtime-config.json`) is set once at `ai.chats.create()` and is static for the entire session.

Dynamic content (pet profile, Pinecone results, severity block) is injected **per turn** as part of the user message:

```
chat.sendMessage({
  message: `
    ${petContext}           ← only when pet changes or first time
    ${pineconeKnowledgeBase} ← retrieved fresh each turn
    ${severityContextBlock}  ← derived from session state
    User Question: ${modelQuery}
  `
})
```

**Pet profile optimization:**
- **First turn with a resolved pet:** Full pet profile is injected.
- **Subsequent turns with the same pet:** Skip re-injection — the model already has it in conversation history.
- **Pet switches mid-session (L1/L2 detects a new pet):** New pet's full profile is injected.
- Tracked via `lastInjectedPetId` in session metadata.

**Pinecone results:** Always retrieved fresh each turn because the user's query changes, so relevant documents may differ.

---

### Pet Name Detection — Unchanged

| Layer | Behavior | Change |
|-------|----------|--------|
| L1 (Exact match) | Runs every request. Pure function. | **No change** |
| L2 (Fuzzy/Levenshtein) | Runs every request. Pure function. | **No change** |
| L3 (LLM extraction) | Runs only when L1+L2 miss AND no resolvedPetId in session. Uses LangChain `llm.invoke()`. | **No change** — stays request-based as a standalone call. |

After refactor, `resolvedPetId` is stored in session metadata instead of being echoed from frontend. L1/L2 still run every turn to detect pet switching. If they detect a new pet, session metadata updates.

---

### Severity State — Server-Side Context Machine

Currently, severity state is re-derived from the `history` array each request using `hasSeverityAfterLatestSymptom()` and `getLatestSymptomTopicsFromHistory()`. After refactor, these functions are replaced with session-metadata-based logic.

**Session metadata fields:**
```typescript
{
  activeContextId: string;           // current severity context UUID
  contextStatus: SeverityContextStatus; // not_required | pending_clarification | pending_severity | resolved
  severityLevel?: number;            // set when resolved
  lastSymptomTopics: Set<string>;    // for context rotation detection
}
```

**State transitions:**

```
                  ┌─────────────────────────┐
                  │                         │
                  ▼                         │
    ┌──────── not_required ──────┐          │
    │              │             │          │
    │    symptom query    ambiguous query   │
    │              │             │          │
    │              ▼             ▼          │
    │     pending_severity  pending_clarification
    │              │             │          │
    │    severity  │    clarifies │          │
    │   submitted  │    (symptom) │          │
    │              ▼             │          │
    │          resolved ─────────┘          │
    │              │                        │
    │    new symptom context detected       │
    │              │                        │
    └──────────────┘────────────────────────┘
              (rotation → new contextId)
```

**Per-turn logic (replaces history-scanning functions):**

1. Classify query intent (unchanged: `classifyQueryIntent()`)
2. If symptom + session has previous topics → check overlap:
   - No overlap → rotate context (`activeContextId = new UUID`, `contextChanged = true`, reset severity)
   - Has overlap → same context, keep state
3. Update `contextStatus` based on:
   - `severitySubmission` received → `resolved`
   - Symptom turn + context not resolved → `pending_severity`
   - Ambiguous → `pending_clarification`
   - Normal → `not_required`
4. Store updated state back in session metadata

**Functions to remove:**
- `hasSeverityAfterLatestSymptom()` — replaced by `session.contextStatus`
- `getLatestSymptomTopicsFromHistory()` — replaced by `session.lastSymptomTopics`

**Functions unchanged:**
- `classifyQueryIntent()` — still keyword-based, no history dependency
- `shouldRotateContextForNewSymptom()` — adapted to compare current query topics vs `session.lastSymptomTopics` instead of scanning history
- `extractSymptomTopics()` — pure function, unchanged
- `parseLegacySeverityQuery()` — still needed for legacy severity format support

---

### Token Usage Logging

Per-request logging stays the same. Additional fields to log:

```
[AI Chat][<traceId>] Session usage summary:
  clientChatSessionId=<id>,
  sessionKey=<masked>,
  sessionTurnCount=<n>,
  contextId=<uuid>,
  contextStatus=<status>,
  finalState=<state>,
  durationMs=<ms>,
  calls{geminiText=<n>, geminiEmbedding=<n>, pineconeSearch=<n>},
  tokens{prompt=<n>, completion=<n>, total=<n>},
  rag{petProfileIncluded=<bool>, petProfileSkipped=<bool>, pineconeRelevantDocs=<n>}
```

**Token extraction for `@google/genai`:**
```typescript
// response from chat.sendMessage()
const usage = response.usageMetadata;
// usage.promptTokenCount, usage.candidatesTokenCount, usage.totalTokenCount
```

This differs from the LangChain extraction format. A new helper `extractNativeGeminiUsage()` will be added alongside the existing `extractGeminiUsage()` (which remains for Layer 3 calls).

---

## API Contract Changes

### Request

```typescript
POST /v1/ai-chat
Authorization: Bearer <token>
X-Installation-Id: <installationId>

{
  "query": string,                     // required
  "clientChatSessionId": string,       // required (UUID, generated by frontend per session)
  "resolvedPetId"?: string,            // optional — still accepted to help L1/L2 pet resolution
  "contextId"?: string,                // optional — explicit severity context reference
  "severitySubmission"?: {             // optional — structured severity input
    "contextId": string,
    "level": 1-5,
    "label"?: string
  }
  // "history" — removed from request (kept optionally in schema during migration but NOT used)
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

## File Impact Plan

### New Files

| File | Purpose |
|------|---------|
| `src/features/ai-chat/ai-chat-session-manager.ts` | In-memory session lifecycle, cleanup timer, Gemini `ai.chats.create()` wrapper. |

### Modified Files

| File | Changes |
|------|---------|
| `src/features/ai-chat/ai-chat-schema.ts` | Add `clientChatSessionId` (required UUID). Keep `history` optional but mark as deprecated/ignored. |
| `src/features/ai-chat/ai-chat-controller.ts` | Extract `installationId` from `req.headers['x-installation-id']`. Extract `clientChatSessionId` from body. Pass both to service. |
| `src/features/ai-chat/ai-chat-service.ts` | Major refactor: integrate session manager, replace `llm.invoke()` main path with `chat.sendMessage()`, replace history-based severity logic with session-metadata logic, add `@google/genai` imports, add `extractNativeGeminiUsage()`, update pet profile injection to skip when same pet. Keep `extractPetWithLLM()` unchanged. Keep all RAG/Pinecone/embedding logic unchanged. |

### Unchanged Files

| File | Reason |
|------|--------|
| `src/features/ai-chat/ai-chat-name-matcher.ts` | Pure L1/L2 functions, no dependencies on history or session. |
| `src/features/ai-chat/ai-chat-config-loader.ts` | Loads static config from JSON file. |
| `src/features/ai-chat/ai-chat-routes.ts` | Same `POST /` route with `authGuard`. |
| `config/ai-chat-runtime-config.json` | Static config content unchanged. |

---

## Implementation Order

### Phase 1: Infrastructure (session manager + SDK setup)
1. Install `@google/genai` package.
2. Create `ai-chat-session-manager.ts` with full lifecycle (`getOrCreateSession`, `destroySession`, `startCleanupTimer`).
3. Add `@google/genai` model setup in service (alongside existing LangChain setup for L3).

### Phase 2: Schema + Controller
4. Update `ai-chat-schema.ts`: add `clientChatSessionId`, mark `history` as optional/ignored.
5. Update `ai-chat-controller.ts`: forward `installationId` and `clientChatSessionId`.

### Phase 3: Service Refactor
6. Update `ChatWithAIInput` type: add `clientChatSessionId` and `installationId`.
7. Integrate session manager into `chatWithAI()`:
   - `getOrCreateSession()` at start
   - Update session metadata after pet detection
   - Update session severity state
8. Replace main LLM call:
   - Remove: `llm.invoke([SystemMessage, ...historyMessages, HumanMessage])`
   - Add: `session.chatSession.sendMessage({ message: prompt })`
9. Replace history-based severity logic:
   - Remove: `hasSeverityAfterLatestSymptom(history, ...)`
   - Remove: `getLatestSymptomTopicsFromHistory(history, ...)`
   - Replace with session metadata reads
10. Add `extractNativeGeminiUsage()` for `@google/genai` response format.
11. Add pet profile skip logic (skip re-injection when `lastInjectedPetId === finalResolvedPetId`).
12. Update request usage summary to include session identifiers.

### Phase 4: Cleanup
13. Remove history message building code (lines 724-731 in current service).
14. Remove `history` parameter from the main flow (still parsed by schema but ignored).

---

## Verification Plan

### Functional
- Same app run keeps conversational continuity (send 3+ messages, model remembers context).
- Different `clientChatSessionId` starts fresh session.
- Backend restart recovers gracefully — next request creates new session.

### Pet Detection
- L1 exact match still works.
- L2 fuzzy match still works.
- L3 LLM extraction fires when L1+L2 miss and no resolvedPetId in session.
- Pet switching mid-session (say pet A name, then pet B name) updates session correctly.

### RAG
- Pet profile injected when pet is first resolved.
- Pet profile NOT re-injected when same pet continues.
- Pet profile re-injected when pet switches.
- Pinecone docs retrieved fresh each turn.
- Pinecone threshold filtering still active.

### Severity
- Symptom query → `contextStatus=pending_severity` + `severityRequest` present.
- Severity submission → `contextStatus=resolved`.
- New symptom (different topic) → context rotation → new `contextId` + `contextChanged=true`.
- Normal query → `contextStatus=not_required`.
- Ambiguous query → `contextStatus=pending_clarification`.

### Observability
- Per-request token/session summary logs present.
- Session identifiers (`clientChatSessionId`, session key masked) in logs.
- No missing logs on success, clarification, and error paths.

### Build
- `npx tsc --noEmit` passes.
- `npm run build` passes.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Session memory leak | 30-min inactivity TTL + periodic sweep every 5 min. Log session count at each sweep. |
| Backend crash loses sessions | Accepted per product decision. Fresh session on next request. |
| Native SDK token format differs from LangChain | Separate `extractNativeGeminiUsage()` helper for `@google/genai` responses. Existing `extractGeminiUsage()` stays for Layer 3. |
| Context rotation without history scanning | Track `lastSymptomTopics` in session metadata. Compare current query topics against session topics. |
| `@google/generative-ai` (old) left in dependencies | Remove after migration verified. Not urgent — does not conflict. |

---

## Implementation State

- [x] Planning document created and reviewed.
- [ ] `@google/genai` package installed.
- [ ] Backend session manager implemented.
- [ ] Schema/controller updated for `clientChatSessionId` + `installationId`.
- [ ] Service refactored to use chat session.
- [ ] Severity state moved to session metadata.
- [ ] Token extraction adapted for `@google/genai`.
- [ ] Pet profile skip optimization implemented.
- [ ] RAG parity verified (pet profile + Pinecone).
- [ ] Token/session logs verified in all request outcomes.
- [ ] TypeScript diagnostics pass.
- [ ] Backend build passes.

## Implementation Log

- 2026-04-11: Created initial planning document.
- 2026-04-11: Analyzed current codebase, identified gaps, revised plan with SDK decision, RAG injection strategy, severity state machine, and concrete file changes.
