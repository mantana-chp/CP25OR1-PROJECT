# AI Chat Gemini Chat Session Refactor — Frontend Implementation Plan

Last updated: 2026-04-11
Status: Planning (pending backend completion)
Owner: Frontend AI Chat
Depends on: Backend AI_CHAT_GEMINI_CHAT_SESSION_REFACTOR_PLAN.md

---

## Overview

This document describes the frontend changes required to support the backend migration from stateless request-based Gemini calls to Gemini chat session mode. The backend will manage conversation history server-side, so the frontend no longer needs to accumulate and replay a `history` array.

---

## What Changes for Frontend

| Area | Before (Current) | After (Refactored) |
|------|------------------|---------------------|
| **History management** | Frontend accumulates `chatHistory: HistoryItem[]` in state. Sends up to 8 items every request. | Frontend does NOT manage history. Backend's Gemini chat session handles it. |
| **Session identity** | No session ID concept. Each request is independent. | Frontend generates a `clientChatSessionId` (UUID) once per chat page visit and sends it in every request. |
| **resolvedPetId** | Frontend stores and sends `resolvedPetId` from previous response. | Still returned by backend for display, but backend tracks it server-side. Frontend can optionally keep sending it for L1/L2 override, or stop. |
| **Domain types** | `ChatRequest` has `history` field. `ChatResponse` only has `answer`, `resolvedPetId`, `severityFlag`. | `ChatRequest` adds `clientChatSessionId`, removes `history`. `ChatResponse` adds context-aware severity fields. |

---

## File Changes

### 1. `frontend/src/domain/chatbot.domain.ts`

**Current:**
```typescript
export interface ChatRequest {
  resolvedPetId?: string
  query: string
  history?: HistoryItem[]
}

export interface ChatResponse {
  answer: string
  resolvedPetId?: string
  severityFlag?: boolean
}
```

**After:**
```typescript
export interface ChatRequest {
  query: string
  clientChatSessionId: string        // NEW — required UUID per session
  resolvedPetId?: string             // optional — still accepted for L1/L2 pet resolution
  contextId?: string                 // optional — explicit severity context reference
  severitySubmission?: {             // optional — structured severity input
    contextId: string
    level: SeverityLevel
    label?: string
  }
  // history — REMOVED
}

export interface SeverityRequestData {
  contextId: string
  prompt: string
  reason: 'symptom_needs_assessment' | 'new_symptom_context'
}

export interface ClarificationRequestData {
  contextId: string
  prompt: string
  reason: 'ambiguous_health_query'
  options: string[]
}

export type ContextStatus =
  | 'not_required'
  | 'pending_clarification'
  | 'pending_severity'
  | 'resolved'

export interface ChatResponse {
  answer: string
  resolvedPetId?: string
  severityFlag?: boolean              // kept for backward compat
  contextId: string                   // NEW
  contextChanged?: boolean            // NEW
  contextStatus: ContextStatus        // NEW
  severityRequest?: SeverityRequestData      // NEW
  clarificationRequest?: ClarificationRequestData // NEW
  severityLevel?: number              // NEW
}
```

**HistoryItem interface can be removed** (or kept as dead code to be cleaned up later).

---

### 2. `frontend/src/utils/api/services/chatbot_service.ts`

**Current:**
```typescript
export const chatbotService = {
  sendMessage: async (
    query: string,
    resolvedPetId?: string,
    history?: HistoryItem[]
  ) => {
    const requestBody: ChatRequest = { query, resolvedPetId, history }
    return apiClient.post<{ data: ChatResponse }>('/v1/ai-chat', requestBody)
  }
}
```

**After:**
```typescript
export const chatbotService = {
  sendMessage: async (
    query: string,
    clientChatSessionId: string,
    resolvedPetId?: string,
    contextId?: string,
    severitySubmission?: ChatRequest['severitySubmission']
  ) => {
    const requestBody: ChatRequest = {
      query,
      clientChatSessionId,
      resolvedPetId,
      contextId,
      severitySubmission
    }
    return apiClient.post<{ data: ChatResponse }>('/v1/ai-chat', requestBody)
  }
}
```

**Changes:**
- Add `clientChatSessionId` parameter (required).
- Add `contextId` and `severitySubmission` parameters (optional).
- Remove `history` parameter.

---

### 3. `frontend/src/presentation/chatbot/pages/chatbot_page.tsx`

**Changes summary:**

#### A. Generate `clientChatSessionId` once on mount

```typescript
import { v4 as uuidv4 } from 'uuid'

// Generate once when chat page mounts. Not persisted to storage.
// New UUID = new session when user re-opens chat page.
const clientChatSessionId = useRef(uuidv4()).current
```

#### B. Remove `chatHistory` state

```diff
- const [chatHistory, setChatHistory] = useState<HistoryItem[]>([])
```

All `setChatHistory(...)` calls are removed.

#### C. Update `handleSendMessage`

```diff
  const response = await chatbotService.sendMessage(
    text,
+   clientChatSessionId,
    resolvedPetId,
-   chatHistory
  )

  // Still update resolvedPetId from response for display
  setResolvedPetId(response.data.resolvedPetId)

- // Remove history accumulation
- setChatHistory((prev) => [
-   ...prev,
-   { role: 'user', content: text },
-   { role: 'assistant', content: response.data.answer }
- ])

  // Severity handling — use new context-aware fields
  const requiresSeverity = response.data.contextStatus === 'pending_severity'
  // Or for backward compat: response.data.severityFlag === true
```

#### D. Update `handleSeveritySelect`

```diff
  const handleSeveritySelect = async (
    messageId: string,
    level: SeverityLevel,
    label: string
  ) => {
    const targetMessage = messages.find((msg) => msg.id === messageId)
    const originalQuery = targetMessage?.originalQuery || ''

    // Mark message as no longer awaiting severity
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, awaitingSeverity: false } : msg
      )
    )

-   // Build severity query with prefix
-   const severityQuery = `[SEVERITY: ${level}/5] ${originalQuery}`
-
-   // Show as user message
-   const userSeverityMessage = { ... }
-   setMessages((prev) => [...prev, userSeverityMessage])
-
-   // Send with history
-   const response = await chatbotService.sendMessage(
-     severityQuery,
-     resolvedPetId,
-     chatHistory
-   )

+   // Show the severity selection as user message
+   const userSeverityMessage: Message = {
+     id: Date.now().toString(),
+     text: `เลือกระดับความรุนแรง: ${label} (${level}/5)`,
+     isUser: true
+   }
+   setMessages((prev) => [...prev, userSeverityMessage])
+
+   // Send structured severitySubmission (no history needed)
+   const response = await chatbotService.sendMessage(
+     originalQuery,
+     clientChatSessionId,
+     resolvedPetId,
+     /* contextId */ undefined, // backend tracks active context
+     { contextId: '...', level, label }  // structured severity
+   )

    // Update resolvedPetId
    setResolvedPetId(response.data.resolvedPetId)

-   // Remove history accumulation
-   setChatHistory(...)
  }
```

> **Note:** For the `severitySubmission.contextId`, the frontend needs to track the `contextId` returned by the backend in the previous response that triggered severity. Store it in Message metadata or a dedicated state variable.

#### E. Track contextId for severity flow

```typescript
// Store the contextId from the response that triggered severity
const [activeContextId, setActiveContextId] = useState<string | undefined>()

// In handleSendMessage, after receiving response:
if (response.data.contextStatus === 'pending_severity') {
  setActiveContextId(response.data.contextId)
}
```

#### F. Handle clarification responses (optional enhancement)

If `response.data.contextStatus === 'pending_clarification'`, show the clarification options as quick-reply buttons instead of the severity widget.

```typescript
if (response.data.clarificationRequest) {
  // Show clarification options as tappable buttons
  // When user taps an option, send it as a normal message
}
```

---

## Session Lifecycle

```
User opens chatbot page
     │
     ▼ clientChatSessionId = uuidv4()  (useRef, generated once)
     │
Message 1: "บลูเป็นยังไงบ้าง"
  Request:  { query: "...", clientChatSessionId: "abc-123" }
  Response: { answer: "...", resolvedPetId: "uuid-blue", contextStatus: "not_required" }
     |
Message 2: "เขากินอะไรได้"
  Request:  { query: "...", clientChatSessionId: "abc-123" }
  Response: { answer: "...", resolvedPetId: "uuid-blue", ... }
  (Backend remembers conversation context — no history replay needed)
     |
Message 3: "น้องหมาอาเจียนตั้งแต่เช้า"
  Request:  { query: "...", clientChatSessionId: "abc-123" }
  Response: { answer: "...", contextStatus: "pending_severity", severityRequest: {...} }
     |
  → Show severity widget
     |
Severity selected: level=4
  Request:  { query: "น้องหมาอาเจียน...", clientChatSessionId: "abc-123",
              severitySubmission: { contextId: "ctx-1", level: 4, label: "รุนแรง" } }
  Response: { answer: "ระดับ 4/5...", contextStatus: "resolved", severityLevel: 4 }
     |
User closes app → React state destroyed → clientChatSessionId lost
     |
User reopens app
     │
     ▼ clientChatSessionId = uuidv4()  (NEW UUID)
     │
     ▼ Backend creates fresh session for new ID
```

---

## Things NOT Needed on Frontend (After Refactor)

- ❌ No `chatHistory` state accumulation
- ❌ No `setChatHistory` calls
- ❌ No `history` field in request payload
- ❌ No `HistoryItem[]` type usage in service calls
- ❌ No history replay logic
- ❌ No `SEVERITY: X/5` text prefix building (use structured `severitySubmission` instead)
- ❌ No `petId` selection before starting chat

## Things KEPT on Frontend

- ✅ `resolvedPetId` state — still returned by backend for display purposes
- ✅ `Message[]` state — still needed for rendering chat bubbles
- ✅ `isTyping` state — still needed for loading indicator
- ✅ `disclaimerAccepted` state — still needed for disclaimer modal
- ✅ Severity widget — triggered by `contextStatus === 'pending_severity'`

---

## Package Dependencies

```bash
# Frontend needs uuid for generating clientChatSessionId
# Check if already installed:
npm list uuid
# If not:
npm install uuid @types/uuid
```

> Note: If the project uses Expo, `expo-crypto` randomUUID may be preferred over the `uuid` package. Check existing project patterns.

---

## Implementation Order

1. Update `chatbot.domain.ts` — new types for request/response.
2. Update `chatbot_service.ts` — new parameters, remove history.
3. Update `chatbot_page.tsx` — generate sessionId, remove history state, update send/severity handlers.
4. Test end-to-end with updated backend.

---

## Implementation State

- [ ] Domain types updated (`chatbot.domain.ts`).
- [ ] Service updated (`chatbot_service.ts`).
- [ ] Chatbot page refactored (`chatbot_page.tsx`).
- [ ] Severity flow uses structured `severitySubmission`.
- [ ] `clientChatSessionId` generated on mount.
- [ ] History replay removed.
- [ ] End-to-end test with backend.
