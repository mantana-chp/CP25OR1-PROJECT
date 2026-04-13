# AI Chat Gemini Chat Session Refactor — Frontend Implementation Plan

Last updated: 2026-04-11
Status: Planning (backend implemented, pending frontend work)
Owner: Frontend AI Chat
Depends on: AI_CHAT_GEMINI_CHAT_SESSION_REFACTOR_PLAN.md (backend — implemented ✅)

---

## Overview

The backend has been migrated to Gemini chat session mode. The backend now manages conversation history server-side via the Gemini chat session. The frontend changes below are required to align with the new backend contract.

---

## What Changes for Frontend

| Area | Current Behavior | Required After Refactor |
|------|-----------------|------------------------|
| **History management** | `chatHistory: HistoryItem[]` accumulated in state. Up to 8 items sent every request. | **Remove entirely.** Backend's Gemini chat session manages history. `history` field is also removed from the backend schema. |
| **Session identity** | No session ID. Each request is independent. | Generate `clientChatSessionId` (UUID) once on chat page mount. Send in every request. |
| **resolvedPetId in request** | Frontend echoes the `resolvedPetId` received from last response. | Still accepted by backend as a pet hint — can keep sending, but backend now tracks it in session state. |
| **Severity submission** | Sends `[SEVERITY: X/5] <query>` text prefix via `sendMessage()`. | Use structured `severitySubmission` field (cleaner, correct). Legacy text prefix still parsed by backend as a fallback. |

---

## File Changes Required

### 1. `frontend/src/domain/chatbot.domain.ts`

**Current:**
```typescript
export interface HistoryItem {
  role: 'user' | 'assistant'
  content: string
}

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

**Required:**
```typescript
// HistoryItem — REMOVED. No longer needed; backend schema no longer accepts history.

export interface ChatRequest {
  query: string
  clientChatSessionId: string        // NEW — required, UUID per session
  resolvedPetId?: string             // optional — still accepted as pet hint
  contextId?: string                 // optional — severity context reference
  severitySubmission?: {             // optional — structured severity (preferred over text prefix)
    contextId: string
    level: SeverityLevel
    label?: string
  }
  petClarificationSubmission?: {      // NEW — for pet name disambiguation
    contextId: string
    selectedPetId: string
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

export interface PetClarificationRequestData {
  contextId: string
  prompt: string
  reason: 'ambiguous_pet_name'
  options: Array<{
    petId: string
    petName: string
    role: 'OWNER' | 'CAREGIVER'
  }>
}

export type ContextStatus =
  | 'not_required'
  | 'pending_clarification'
  | 'pending_severity'
  | 'resolved'

export type PetContextStatus =
  | 'not_required'
  | 'pending_clarification'
  | 'resolved'

export interface ChatResponse {
  answer: string
  resolvedPetId?: string
  resolvedPetRole?: 'OWNER' | 'CAREGIVER'  // NEW
  severityFlag?: boolean              // kept — backend still returns this
  contextId: string                   // NEW — always returned
  contextChanged?: boolean            // NEW
  contextStatus: ContextStatus        // NEW
  petContextStatus?: PetContextStatus // NEW
  petContextChanged?: boolean         // NEW
  severityRequest?: SeverityRequestData      // NEW
  clarificationRequest?: ClarificationRequestData // NEW
  petClarificationRequest?: PetClarificationRequestData // NEW
  severityLevel?: number              // NEW
}
```

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

**Required:**
```typescript
export const chatbotService = {
  sendMessage: async (
    query: string,
    clientChatSessionId: string,
    options?: {
      resolvedPetId?: string
      contextId?: string
      severitySubmission?: ChatRequest['severitySubmission']
    }
  ) => {
    const requestBody: ChatRequest = {
      query,
      clientChatSessionId,
      ...options,
    }
    return apiClient.post<{ data: ChatResponse }>('/v1/ai-chat', requestBody)
  }
}
```

---

### 3. `frontend/src/presentation/chatbot/pages/chatbot_page.tsx`

#### A. Generate `clientChatSessionId` once on mount

```typescript
import 'react-native-get-random-values'   // required for uuid on React Native
import { v4 as uuidv4 } from 'uuid'

// Inside ChatbotPage component:
// useRef so it does NOT change on re-render, and is NOT stored — lost on unmount = new session
const clientChatSessionId = useRef(uuidv4()).current
```

> **Note:** Check if the project already uses `uuid` elsewhere. If not, install it:
> ```bash
> npm install uuid
> npm install --save-dev @types/uuid
> # For React Native also install:
> npm install react-native-get-random-values
> ```

#### B. Remove `chatHistory` state

```diff
- const [chatHistory, setChatHistory] = useState<HistoryItem[]>([])
```

Remove all `setChatHistory(...)` calls.

#### C. Track `activeContextId` for severity submission

```typescript
// NEW state — needed to pass contextId in severitySubmission
const [activeContextId, setActiveContextId] = useState<string | undefined>()
```

Update it from each response:
```typescript
setActiveContextId(response.data.contextId)
```

#### D. Update `handleSendMessage`

```diff
  const response = await chatbotService.sendMessage(
    text,
+   clientChatSessionId,
-   resolvedPetId,
-   chatHistory
+   { resolvedPetId }
  )

  setResolvedPetId(response.data.resolvedPetId)
+ setActiveContextId(response.data.contextId)

- setChatHistory((prev) => [
-   ...prev,
-   { role: 'user', content: text },
-   { role: 'assistant', content: response.data.answer }
- ])

  // Severity flag — use contextStatus for accuracy:
- const requiresSeverity = response.data.severityFlag === true
+ const requiresSeverity = response.data.contextStatus === 'pending_severity'
  // OR keep using severityFlag — still returned by backend for backward compat
```

#### E. Update `handleSeveritySelect`

Replace the legacy text-prefix approach with structured `severitySubmission`:

```diff
  const handleSeveritySelect = async (messageId, level, label) => {
    const targetMessage = messages.find(msg => msg.id === messageId)
    const originalQuery = targetMessage?.originalQuery || ''

    setMessages(prev =>
      prev.map(msg => msg.id === messageId ? { ...msg, awaitingSeverity: false } : msg)
    )

-   // Old: build text prefix
-   const severityQuery = `[SEVERITY: ${level}/5] ${originalQuery}`

    const userSeverityMessage: Message = {
      id: Date.now().toString(),
      text: `เลือกระดับความรุนแรง: ${label} (${level}/5)`,
      isUser: true
    }
    setMessages(prev => [...prev, userSeverityMessage])
    setIsTyping(true)

    try {
-     const response = await chatbotService.sendMessage(
-       severityQuery, resolvedPetId, chatHistory
-     )
+     const response = await chatbotService.sendMessage(
+       originalQuery,
+       clientChatSessionId,
+       {
+         resolvedPetId,
+         contextId: activeContextId,
+         severitySubmission: { contextId: activeContextId!, level, label }
+       }
+     )

      setResolvedPetId(response.data.resolvedPetId)
+     setActiveContextId(response.data.contextId)

-     setChatHistory(prev => [
-       ...prev,
-       { role: 'user', content: severityQuery },
-       { role: 'assistant', content: response.data.answer }
-     ])
    }
  }
```

---

### 4. `frontend/src/presentation/chatbot/pages/chatbot_page.tsx` — Pet Clarification Handling (NEW)

When the user has multiple pets with the same name (e.g., owns "จิ๊กโก๋" and caregiver for another "จิ๊กโก๋"), the backend returns `petContextStatus: 'pending_clarification'` with a `petClarificationRequest`.

#### A. Add state for pet clarification

```typescript
// NEW state — track if we need pet clarification
const [petClarificationRequest, setPetClarificationRequest] = useState<PetClarificationRequestData | undefined>()
const [activePetContextId, setActivePetContextId] = useState<string | undefined>()
```

#### B. Handle pet clarification in response

```typescript
const handleSendMessage = async (text: string) => {
  // ... existing code ...

  const response = await chatbotService.sendMessage(
    text,
    clientChatSessionId,
    { resolvedPetId, contextId: activeContextId }
  )

  // Check for pet clarification request
  if (response.data.petContextStatus === 'pending_clarification' && response.data.petClarificationRequest) {
    setPetClarificationRequest(response.data.petClarificationRequest)
    setActivePetContextId(response.data.contextId)

    // Show clarification UI instead of normal AI response
    // (Display options: "จิ๊กโก๋ (ของฉัน)" vs "จิ๊กโก๋ (ที่ฉันดูแล)")
    return
  }

  // Normal flow continues...
  setResolvedPetId(response.data.resolvedPetId)
  setActiveContextId(response.data.contextId)
}
```

#### C. Handle pet selection

```typescript
const handlePetClarificationSelect = async (selectedPetId: string) => {
  setPetClarificationRequest(undefined) // Hide clarification UI
  setIsTyping(true)

  try {
    const response = await chatbotService.sendMessage(
      '', // or repeat original query if needed
      clientChatSessionId,
      {
        resolvedPetId: selectedPetId,
        contextId: activePetContextId,
        petClarificationSubmission: {
          contextId: activePetContextId!,
          selectedPetId
        }
      }
    )

    setResolvedPetId(response.data.resolvedPetId)
    setActiveContextId(response.data.contextId)

    // Display AI response
    addMessage({
      id: Date.now().toString(),
      text: response.data.answer,
      isUser: false
    })
  } catch (error) {
    // Handle error
  } finally {
    setIsTyping(false)
  }
}
```

#### D. UI Component for Pet Clarification

```tsx
{petClarificationRequest && (
  <View style={styles.clarificationContainer}>
    <Text style={styles.clarificationPrompt}>
      {petClarificationRequest.prompt}
    </Text>
    {petClarificationRequest.options.map((option) => (
      <TouchableOpacity
        key={option.petId}
        style={styles.clarificationOption}
        onPress={() => handlePetClarificationSelect(option.petId)}
      >
        <Text style={styles.optionText}>
          {option.petName} ({option.role === 'OWNER' ? 'ของฉัน' : 'ที่ฉันดูแล'})
        </Text>
      </TouchableOpacity>
    ))}
  </View>
)}
```

---

## Session Lifecycle (After Refactor)

```
User opens chatbot page
     │
     ▼ clientChatSessionId = uuidv4()  (useRef, generated once, never stored)
     │
Message 1: "บลูเป็นยังไงบ้าง"
  Request:  { query: "...", clientChatSessionId: "abc-123", resolvedPetId: undefined }
  Response: { answer: "...", resolvedPetId: "uuid-blue", contextId: "ctx-1", contextStatus: "not_required" }
  → setResolvedPetId("uuid-blue"), setActiveContextId("ctx-1")

Message 2: "เขากินอะไรได้"
  Request:  { query: "...", clientChatSessionId: "abc-123", resolvedPetId: "uuid-blue" }
  Response: { answer: "...", contextStatus: "not_required" }
  (Backend session remembers "บลู" context — no history replay needed)

Message 3: "น้องหมาอาเจียนตั้งแต่เช้า"
  Request:  { query: "...", clientChatSessionId: "abc-123", resolvedPetId: "uuid-blue" }
  Response: { ..., contextId: "ctx-2", contextStatus: "pending_severity", severityRequest: {...} }
  → setActiveContextId("ctx-2"), show severity widget

Severity selected: level=4, label="รุนแรง"
  Request:  {
    query: "น้องหมาอาเจียนตั้งแต่เช้า",
    clientChatSessionId: "abc-123",
    resolvedPetId: "uuid-blue",
    contextId: "ctx-2",
    severitySubmission: { contextId: "ctx-2", level: 4, label: "รุนแรง" }
  }
  Response: { ..., contextId: "ctx-2", contextStatus: "resolved", severityLevel: 4 }

User closes app → React state destroyed → clientChatSessionId (useRef) lost
     │
User reopens app
     ▼ clientChatSessionId = uuidv4()  ← NEW UUID → backend creates fresh session
```

---

## Things Removed from Frontend

- ❌ `chatHistory: HistoryItem[]` state
- ❌ `setChatHistory()` calls
- ❌ `history` field in API requests
- ❌ `HistoryItem` type in service calls
- ❌ `[SEVERITY: X/5]` text prefix construction (replaced by `severitySubmission`)

## Things Kept

- ✅ `resolvedPetId` state — still returned by backend, still sent for pet hint
- ✅ `resolvedPetRole` — **NEW** returned by backend when pet is resolved (OWNER or CAREGIVER)
- ✅ `Message[]` display state
- ✅ `isTyping` state
- ✅ `disclaimerAccepted` state and disclaimer modal
- ✅ `SeverityScaleWidget` — still triggered by `contextStatus === 'pending_severity'`
- ✅ `severityFlag` — still returned by backend for backward compat
- ✅ **NEW:** Pet clarification widget — triggered by `petContextStatus === 'pending_clarification'`

---

## Implementation State

- [ ] `uuid` package installed (if not already present).
- [ ] Domain types updated (`chatbot.domain.ts`) — includes `PetClarificationRequestData`, `PetContextStatus`, `resolvedPetRole`.
- [ ] Chatbot service updated (`chatbot_service.ts`).
- [ ] Chatbot page refactored (`chatbot_page.tsx`):
  - [ ] `clientChatSessionId` generated with `useRef(uuidv4()).current`.
  - [ ] `chatHistory` state removed.
  - [ ] `activeContextId` state added.
  - [ ] `handleSendMessage` updated (no history, pass sessionId, handle `petClarificationRequest`).
  - [ ] `handleSeveritySelect` updated (structured `severitySubmission`).
  - [ ] **NEW:** Pet clarification UI added (`petClarificationRequest` state, selection handler).
- [ ] End-to-end test with backend.
