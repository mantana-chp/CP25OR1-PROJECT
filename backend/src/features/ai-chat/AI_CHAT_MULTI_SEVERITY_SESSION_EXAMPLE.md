# AI Chat — Session Scenario Examples

Last updated: 2026-04-11
Reflects: Gemini chat session mode (clientChatSessionId required)

This document shows every distinct backend behavior for `POST /v1/ai-chat`. All requests in the same scenario share the same `clientChatSessionId` to simulate one continuous chat session.

---

## Key Request Fields

```jsonc
{
  "clientChatSessionId": "string (UUID)",  // required — generated once per session by frontend
  "query": "string",                        // required
  "resolvedPetId": "string (UUID)",         // optional — pet hint for L1/L2 detection
  "contextId": "string (UUID)",             // optional — severity context reference
  "severitySubmission": {                   // optional — structured severity input
    "contextId": "string (UUID)",
    "level": 1-5,
    "label": "string (optional)"
  }
}
```

---

## Scenario 1: Normal Care Query (No Severity)

**Intent:** User asks a routine care question. No symptom detected — no severity flow.

```jsonc
// Request
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000001",
  "query": "ควรให้อาหารแมววันละกี่มื้อ"
}
```

```jsonc
// Response
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "answer": "โดยทั่วไปควรให้อาหารแมว 2-3 มื้อต่อวัน...",
    "contextId": "11111111-1111-1111-1111-111111111111",
    "contextStatus": "not_required"
  }
}
```

**What to verify:**
- `contextStatus` = `not_required`
- No `severityRequest` in response
- No `clarificationRequest` in response

---

## Scenario 2: Ambiguous Health Query — Triggers Clarification

**Intent:** User describes something vague ("ไม่ปกติ", "ดูแปลกๆ") with no specific symptom keyword. Backend asks for clarification before proceeding.

**Note:** This only triggers on a **fresh session** or when `contextStatus` is currently `not_required` or `pending_clarification`. If the session already has an active symptom context (resolved/pending_severity), vague follow-ups will NOT trigger clarification (see Scenario 5).

```jsonc
// Request — fresh session, vague symptom
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000002",
  "query": "น้องดูไม่ปกติ ไม่ค่อยสบาย"
}
```

```jsonc
// Response
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "answer": "เพื่อให้ช่วยได้ตรงจุดมากขึ้น ช่วยระบุอาการหลักของน้องเพิ่มอีกนิดได้ไหมครับ เช่น อาเจียน / ท้องเสีย / ไอหรือหายใจลำบาก / เบื่ออาหาร / ซึม / บาดเจ็บ",
    "contextId": "22222222-2222-2222-2222-222222222222",
    "contextStatus": "pending_clarification",
    "clarificationRequest": {
      "contextId": "22222222-2222-2222-2222-222222222222",
      "prompt": "เพื่อให้ช่วยได้ตรงจุดมากขึ้น ช่วยระบุอาการหลักของน้องเพิ่มอีกนิดได้ไหมครับ...",
      "reason": "ambiguous_health_query",
      "options": ["อาเจียน", "ท้องเสีย", "ไอหรือหายใจลำบาก", "เบื่ออาหาร", "ซึม", "บาดเจ็บ", "อื่นๆ"]
    }
  }
}
```

**What to verify:**
- `contextStatus` = `pending_clarification`
- `clarificationRequest` present with options list
- No `severityRequest`
- No main Gemini chat session call made (early return — fast response)

---

## Scenario 3: Single Symptom Context — Full Severity Flow

### Step 3.1 — Start Symptom (Severity Requested)

**Intent:** User reports a clear symptom. Backend detects symptom topic, creates a new context, asks for severity rating.

```jsonc
// Request
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000003",
  "query": "น้องหมาอาเจียนตั้งแต่เช้า ไม่ค่อยกินอาหาร"
}
```

```jsonc
// Response
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "answer": "การอาเจียนตั้งแต่เช้า... [แนะนำดูแลเบื้องต้น] ...อาการอยู่ในระดับความรุนแรงเท่าไรคะ",
    "contextId": "33333333-3333-3333-3333-333333333333",
    "contextStatus": "pending_severity",
    "severityFlag": true,
    "severityRequest": {
      "contextId": "33333333-3333-3333-3333-333333333333",
      "prompt": "กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น (1-5)",
      "reason": "symptom_needs_assessment"
    }
  }
}
```

**What to verify:**
- `contextStatus` = `pending_severity`
- `severityFlag` = `true`
- `severityRequest` present with `reason: "symptom_needs_assessment"`
- `contextId` returned — save this to send in next request

---

### Step 3.2 — Submit Severity → Context Resolved

**Intent:** User submits severity rating 4/5 for the vomiting context.

```jsonc
// Request — use contextId from previous response
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000003",
  "query": "น้องหมาอาเจียนตั้งแต่เช้า ไม่ค่อยกินอาหาร",
  "contextId": "33333333-3333-3333-3333-333333333333",
  "severitySubmission": {
    "contextId": "33333333-3333-3333-3333-333333333333",
    "level": 4,
    "label": "รุนแรง"
  }
}
```

```jsonc
// Response
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "answer": "ระดับความรุนแรง 4/5 — แนะนำให้พาไปพบสัตวแพทย์โดยเร็ว...",
    "contextId": "33333333-3333-3333-3333-333333333333",
    "contextStatus": "resolved",
    "severityLevel": 4
  }
}
```

**What to verify:**
- `contextStatus` = `resolved`
- `severityLevel` = `4`
- No `severityRequest` in response
- Answer is a severity-specific response (starts with "ระดับความรุนแรง X/5 —")

---

### Step 3.3 — Follow-up After Severity Resolved (Should NOT Re-trigger Severity or Clarification)

**Intent:** User asks a natural follow-up. The query contains "อาการ" which is an ambiguous health keyword — but the session context is already `resolved`, so it is treated as a normal follow-up, not a new ambiguous query.

```jsonc
// Request
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000003",
  "query": "ต้องเฝ้าดูอาการอีกกี่ชั่วโมงดี"
}
```

```jsonc
// Response
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "answer": "หากไม่ดีขึ้นใน 24 ชั่วโมงควรพาไปพบสัตวแพทย์ค่ะ...",
    "contextId": "33333333-3333-3333-3333-333333333333",
    "contextStatus": "resolved"
  }
}
```

**What to verify:**
- `contextStatus` = `resolved` (unchanged — not reset to clarification)
- No `clarificationRequest` in response
- No `severityRequest` in response
- Answer is a contextual follow-up (model remembers prior vomiting conversation via Gemini session)

---

## Scenario 4: Multi-Symptom Session — Context Rotation

**Same session as Scenario 3**, continuing after vomiting context was resolved. User now reports a completely different symptom (respiratory). Backend detects the topic shift and rotates to a new context.

### Step 4.1 — New Symptom → Context Rotation

```jsonc
// Request — same clientChatSessionId, different symptom topic
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000003",
  "query": "ตอนนี้น้องเริ่มไอและหายใจเร็ว",
  "contextId": "33333333-3333-3333-3333-333333333333"
}
```

```jsonc
// Response
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "answer": "อาการไอและหายใจเร็วเป็นสัญญาณที่น่าเป็นห่วง... ช่วยประเมินความรุนแรงได้ไหมครับ",
    "contextId": "44444444-4444-4444-4444-444444444444",
    "contextChanged": true,
    "contextStatus": "pending_severity",
    "severityFlag": true,
    "severityRequest": {
      "contextId": "44444444-4444-4444-4444-444444444444",
      "prompt": "กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น (1-5)",
      "reason": "new_symptom_context"
    }
  }
}
```

**What to verify:**
- `contextChanged` = `true`
- `contextId` is a NEW UUID (different from the vomiting context)
- `contextStatus` = `pending_severity`
- `severityRequest.reason` = `"new_symptom_context"` (distinguishes from first-time assessment)

---

### Step 4.2 — Submit Severity for Context B

```jsonc
// Request
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000003",
  "query": "ตอนนี้น้องเริ่มไอและหายใจเร็ว",
  "contextId": "44444444-4444-4444-4444-444444444444",
  "severitySubmission": {
    "contextId": "44444444-4444-4444-4444-444444444444",
    "level": 5,
    "label": "รุนแรงมาก"
  }
}
```

```jsonc
// Response
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "answer": "ระดับความรุนแรง 5/5 — แนะนำให้ไปคลินิกฉุกเฉินทันที...",
    "contextId": "44444444-4444-4444-4444-444444444444",
    "contextStatus": "resolved",
    "severityLevel": 5
  }
}
```

**What to verify:**
- `contextId` = Context B UUID (same as B, not Context A)
- `contextStatus` = `resolved`
- `severityLevel` = `5`

---

## Scenario 5: Session Continuity — Pet Profile Injection

**Intent:** Verify that the pet profile is injected on first resolution and skipped on subsequent turns with the same pet.

**Requires:** A `resolvedPetId` that matches an active pet in the database.

### Step 5.1 — First Turn (Pet Profile Injected)

```jsonc
// Request — first message that mentions a pet name
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000005",
  "query": "บลูกินอาหารได้วันละกี่มื้อ",
  "resolvedPetId": "your-pet-uuid-here"
}
```

```jsonc
// Response
{
  "data": {
    "answer": "สำหรับบลู... [answer uses pet profile info]",
    "resolvedPetId": "your-pet-uuid-here",
    "contextId": "55555555-5555-5555-5555-555555555555",
    "contextStatus": "not_required"
  }
}
```

**What to verify in logs:**
```
rag{petProfileIncluded=true, petProfileSkipped=false, ...}
```

### Step 5.2 — Second Turn with Same Pet (Pet Profile Skipped)

```jsonc
// Request — same session, same pet
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000005",
  "query": "แล้วเขาควรกินอาหารประเภทไหน",
  "resolvedPetId": "your-pet-uuid-here"
}
```

**What to verify in logs:**
```
rag{petProfileIncluded=false, petProfileSkipped=true, ...}
```
The model still knows the pet info from session history — profile re-injection is skipped to save tokens.

---

## Scenario 6: New Session After App Relaunch

**Intent:** Verify that a new `clientChatSessionId` starts a completely fresh Gemini session with no memory of prior turns.

```jsonc
// Request — NEW clientChatSessionId (simulates app relaunch)
{
  "clientChatSessionId": "bbbbbbbb-0000-0000-0000-000000000006",
  "query": "เขาควรกินอาหารประเภทไหน"
}
```

**What to verify:**
- Log shows: `[SessionManager] Creating new session.`
- Session turn count starts at 0
- Model has no memory of previous conversations

---

## Scenario 7: Legacy Severity Format (Backward Compat)

**Intent:** Verify that the old `[SEVERITY: X/5] <query>` text prefix format still works as a fallback.

```jsonc
// Request — uses legacy text prefix instead of severitySubmission
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000007",
  "query": "[SEVERITY: 3/5] น้องหมาอาเจียนตั้งแต่เช้า"
}
```

```jsonc
// Response
{
  "data": {
    "answer": "ระดับความรุนแรง 3/5 —...",
    "contextStatus": "resolved",
    "severityLevel": 3
  }
}
```

**What to verify:**
- `contextStatus` = `resolved`
- `severityLevel` = `3`
- Response is severity-specific

---

## Scenario 8: Pet Name Ambiguity — Duplicate Pet Names (Owner + Caregiver)

**Intent:** User has multiple pets with the same name (e.g., owns a pet named "จิ๊กโก๋" and is also a caregiver for another "จิ๊กโก๋"). When user asks about the pet by name, backend detects ambiguity and asks for clarification.

**Prerequisites:**
- User owns a pet named "จิ๊กโก๋" (petId: `pet-owned-uuid`)
- User is a caregiver for another pet named "จิ๊กโก๋" (petId: `pet-caregiver-uuid`)

### Step 8.1 — First Mention of Ambiguous Pet Name

```jsonc
// Request — user asks about pet by name
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000008",
  "query": "จิ๊กโก๋กินอาหารได้ปกติไหม"
}
```

```jsonc
// Response — backend detects duplicate names, asks for clarification
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "answer": "คุณหมายถึง จิ๊กโก๋ ที่เป็นสัตว์เลี้ยงของคุณ หรือ จิ๊กโก๋ ที่คุณเป็นผู้ดูแล?",
    "contextId": "88888888-8888-8888-8888-888888888888",
    "contextStatus": "not_required",
    "petContextStatus": "pending_clarification",
    "petContextChanged": true,
    "petClarificationRequest": {
      "contextId": "88888888-8888-8888-8888-888888888888",
      "prompt": "คุณหมายถึง จิ๊กโก๋ ที่เป็นสัตว์เลี้ยงของคุณ หรือ จิ๊กโก๋ ที่คุณเป็นผู้ดูแล?",
      "reason": "ambiguous_pet_name",
      "options": [
        {
          "petId": "pet-owned-uuid",
          "petName": "จิ๊กโก๋",
          "role": "OWNER"
        },
        {
          "petId": "pet-caregiver-uuid",
          "petName": "จิ๊กโก๋",
          "role": "CAREGIVER"
        }
      ]
    }
  }
}
```

**What to verify:**
- `petContextStatus` = `pending_clarification`
- `petClarificationRequest` present with `reason: "ambiguous_pet_name"`
- `options` array has 2 items with distinct `petId` and `role` values
- No Gemini chat session call made (early return — fast response)

---

### Step 8.2 — User Selects Which Pet (Owner's Pet)

```jsonc
// Request — user selects the owned pet
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000008",
  "query": "จิ๊กโก๋ที่เป็นสัตว์เลี้ยงของฉัน",
  "contextId": "88888888-8888-8888-8888-888888888888",
  "resolvedPetId": "pet-owned-uuid"
}
```

```jsonc
// Response — pet resolved, normal AI response with OWNER context
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "answer": "จากประวัติของจิ๊กโก๋ น้องกินอาหารได้ปกติดี...",
    "resolvedPetId": "pet-owned-uuid",
    "resolvedPetRole": "OWNER",
    "contextId": "88888888-8888-8888-8888-888888888888",
    "contextStatus": "not_required",
    "petContextStatus": "resolved",
    "petContextChanged": true
  }
}
```

**What to verify:**
- `petContextStatus` = `resolved`
- `resolvedPetRole` = `"OWNER"`
- `resolvedPetId` matches the selected pet
- Session now remembers this pet for subsequent questions

---

### Step 8.3 — Follow-up Question (Same Pet, No Re-clarification)

```jsonc
// Request — follow-up about same pet
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000008",
  "query": "แล้วควรให้กินอาหารอะไรเพิ่มไหม"
}
```

```jsonc
// Response — session remembers the resolved pet
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "answer": "สำหรับจิ๊กโก๋ คุณอาจเพิ่มอาหารเสริม...",
    "resolvedPetId": "pet-owned-uuid",
    "resolvedPetRole": "OWNER",
    "contextId": "88888888-8888-8888-8888-888888888888",
    "contextStatus": "not_required",
    "petContextStatus": "resolved"
  }
}
```

**What to verify:**
- No `petClarificationRequest` (no re-clarification needed)
- `resolvedPetId` and `resolvedPetRole` persist from session
- AI response acknowledges this is the user's own pet

---

### Step 8.4 — Topic Switch to Caregiver Pet (LLM Disambiguation)

```jsonc
// Request — user explicitly mentions "ที่ฉันดูแล" (caregiver role)
{
  "clientChatSessionId": "aaaaaaaa-0000-0000-0000-000000000008",
  "query": "แล้วจิ๊กโก๋ที่ฉันดูแลล่ะ กินอาหารเหมือนกันไหม"
}
```

```jsonc
// Response — LLM disambiguation detected "ที่ฉันดูแล" → CAREGIVER role
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "answer": "สำหรับจิ๊กโก๋ที่คุณดูแล อาจแนะนำเจ้าของเรื่องอาหารเสริม...",
    "resolvedPetId": "pet-caregiver-uuid",
    "resolvedPetRole": "CAREGIVER",
    "contextId": "88888888-8888-8888-8888-888888888888",
    "contextStatus": "not_required",
    "petContextStatus": "resolved",
    "petContextChanged": true
  }
}
```

**What to verify:**
- No `petClarificationRequest` — LLM resolved ambiguity automatically via "ที่ฉันดูแล" hint
- `resolvedPetId` changed to caregiver pet
- `resolvedPetRole` = `"CAREGIVER"`
- `petContextChanged` = `true` (pet context rotated)
- AI response acknowledges caregiver role appropriately

**Backend behavior:** L1+L2 detected both pets → LLM disambiguation analyzed "ที่ฉันดูแล" → resolved to CAREGIVER pet directly (no clarification prompt shown)

---

## Notes

- `resolvedPetId` in responses is optional. It is only returned if a pet was detected for that turn.
- `resolvedPetRole` (`"OWNER"` | `"CAREGIVER"`) is returned when a pet is resolved.
- `contextId` is always returned in every response.
- `severityFlag` is kept for backward compatibility. New code should use `contextStatus === 'pending_severity'` instead.
- `history` field is **no longer accepted** in the request schema. The Gemini chat session manages conversation context server-side.
- Sessions expire after **30 minutes of inactivity**. The next request will auto-create a fresh session (same behavior as Scenario 6).
