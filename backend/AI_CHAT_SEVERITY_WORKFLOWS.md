# AI Chatbot Severity Workflows Documentation

> **Purpose**: Comprehensive guide for frontend developers covering all AI chatbot workflows, severity handling, pet context, and session management.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Key Fields Reference](#key-fields-reference)
3. [Scenario 1: Normal Symptom Question (First Turn)](#scenario-1-normal-symptom-question-first-turn)
4. [Scenario 2: Severity Submission](#scenario-2-severity-submission)
5. [Scenario 3: Follow-up in Same Context](#scenario-3-follow-up-in-same-context)
6. [Scenario 4: Context Switch (New Symptom)](#scenario-4-context-switch-new-symptom)
7. [Scenario 5: Non-Symptom Query (General)](#scenario-5-non-symptom-query-general)
8. [Scenario 6: Pet Clarification Required](#scenario-6-pet-clarification-required)
9. [Scenario 7: Pet Clarification Submission](#scenario-7-pet-clarification-submission)
10. [Scenario 8: Duplicate Pet Names with LLM Disambiguation](#scenario-8-duplicate-pet-names-with-llm-disambiguation)
11. [Scenario 9: Session Continuity with Pet Context](#scenario-9-session-continuity-with-pet-context)
12. [Scenario 10: Severity Context with Pet Switch](#scenario-10-severity-context-with-pet-switch)
13. [Scenario 11: Symptom Query with Ambiguous Pet Name (Deferred Severity)](#scenario-11-symptom-query-with-ambiguous-pet-name-deferred-severity)
14. [Error Scenarios](#error-scenarios)
15. [Field Explanations](#field-explanations)
16. [Context State Machine](#context-state-machine)
17. [Pet Context State Machine](#pet-context-state-machine)

---

## Core Concepts

### Session Management
- **`clientChatSessionId`** (frontend-generated): Unique identifier for the chat session. Send the same ID to maintain conversation continuity.
- **`installationId`** (from header): Device/installation identifier extracted from `X-Installation-Id` header (validated by authGuard against JWT token).
- **Server-side history**: Conversation history is stored server-side via Gemini chat sessions.

### Context Management
- **`contextId`** (server-generated): Unique identifier for a symptom context. Changes when user switches to a different symptom topic.
- **`contextStatus`**: Current state of the context - `not_required`, `pending_severity`, `pending_clarification`, or `resolved`.
- **`contextChanged`**: Boolean flag indicating if this is a new context (different from previous turn).

### Pet Context Management
- **`resolvedPetId`**: ID of the pet currently being discussed.
- **`resolvedPetRole`**: Either `OWNER` (user's own pet) or `CAREGIVER` (shared pet).
- **`petContextStatus`**: State of pet detection - `not_required`, `resolved`, `pending_clarification`.
- **`petContextChanged`**: Boolean flag indicating if pet changed from previous turn.

### Severity Flow
- **`severityFlag`**: When `true`, frontend should show severity selection UI (1-5 scale).
- **`severityRequest`**: Contains prompt text and context ID for severity submission.
- **`severitySubmission`** (request field): Object containing selected level and contextId.

---

## Key Fields Reference

### Request Fields (Frontend → Backend)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | User's message in Thai |
| `userId` | string | Yes | Authenticated user ID (from JWT token) |
| `clientChatSessionId` | string | Yes | Session ID (generate once, reuse) |
| `resolvedPetId` | string | No | Override pet detection with specific pet |
| `contextId` | string | No | Context from previous response (for continuity) |
| `severitySubmission` | object | No | Severity selection response |
| `severitySubmission.level` | number (1-5) | Yes* | Selected severity level |
| `severitySubmission.contextId` | string | Yes* | Must match response contextId |
| `petClarificationSubmission` | object | No | Pet selection response |
| `petClarificationSubmission.selectedPetId` | string | Yes* | Selected pet ID |
| `petClarificationSubmission.contextId` | string | Yes* | Must match response contextId |

**Headers Required:**
- `Authorization: Bearer <token>` - JWT access token
- `X-Installation-Id: <installationId>` - Device/installation ID (validated against JWT)

*Required when `severitySubmission` or `petClarificationSubmission` is provided.

### Response Fields (Backend → Frontend)

| Field | Type | Always Present | Description |
|-------|------|----------------|-------------|
| `status.code` | string | Yes | `"000"` for success |
| `status.description` | string | Yes | `"Success"` for success |
| `data.answer` | string | Yes | AI response text (Thai) |
| `data.resolvedPetId` | string | No | Detected/resolved pet ID |
| `data.resolvedPetRole` | string | No | `"OWNER"` or `"CAREGIVER"` |
| `data.severityFlag` | boolean | No | `true` = show severity selector |
| `data.contextId` | string | Yes | Context identifier for this turn |
| `data.contextChanged` | boolean | No | `true` if new context started |
| `data.contextStatus` | string | Yes | `not_required`, `pending_severity`, `pending_clarification`, `resolved` |
| `data.petContextStatus` | string | Yes | `not_required`, `resolved`, `pending_clarification` |
| `data.petContextChanged` | boolean | No | `true` if pet changed |
| `data.severityRequest` | object | No | Prompt for severity selection |
| `data.severityRequest.contextId` | string | Yes* | Context ID for severity submission |
| `data.severityRequest.prompt` | string | Yes* | Thai prompt to show user |
| `data.severityRequest.reason` | string | Yes* | `"new_symptom_context"` or `"symptom_needs_assessment"` |
| `data.clarificationRequest` | object | No | Prompt for ambiguous query |
| `data.clarificationRequest.contextId` | string | Yes* | Context ID |
| `data.clarificationRequest.prompt` | string | Yes* | Thai clarification prompt |
| `data.petClarificationRequest` | object | No | Prompt for ambiguous pet selection |
| `data.petClarificationRequest.contextId` | string | Yes* | Context ID |
| `data.petClarificationRequest.prompt` | string | Yes* | Thai pet selection prompt |
| `data.petClarificationRequest.options` | array | Yes* | List of pets with same name |
| `data.severityLevel` | number | No | Submitted severity level (if applicable) |

*Present when parent object exists.

---

## Scenario 1: Normal Symptom Question (First Turn)

**Description**: User starts a new conversation with a symptom-related question. Backend detects this is a symptom query and requests severity assessment.

### Request Body
```json
{
    "query": "แมวที่เลี้ยงไว้ไม่ยอมกินข้าวเลย",
    "clientChatSessionId": "session_uuid_v4"
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
X-Installation-Id: install_abc123
```

### Response
```json
{
    "status": {
        "code": "000",
        "description": "Success"
    },
    "data": {
        "answer": "อาการเบื่ออาหารในแมวเป็นเรื่องที่ต้องสังเกตอย่างใกล้ชิดนะคะ อาจเกิดจากหลายสาเหตุ เช่น โรคทางเดินอาหาร ความเครียด หรือการเปลี่ยนอาหาร\n\nเพื่อให้คำแนะนำได้แม่นยำขึ้น รบกวนประเมินความรุนแรงของอาการน้องให้หน่อยได้ไหมครับ?",
        "severityFlag": true,
        "contextId": "ctx_uuid_v4_abc123",
        "contextStatus": "pending_severity",
        "contextChanged": true,
        "petContextStatus": "resolved",
        "resolvedPetId": "pet_789",
        "resolvedPetRole": "OWNER",
        "severityRequest": {
            "contextId": "ctx_uuid_v4_abc123",
            "prompt": "กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น (1-5)",
            "reason": "new_symptom_context"
        }
    }
}
```

### Explanation

**What Happened:**
1. **Pet Detection**: System detected a pet in the query ("แมว") and matched to user's owned pet `pet_789`
2. **Intent Classification**: Query classified as `symptom` (symptom-related)
3. **Context Creation**: New context created with ID `ctx_uuid_v4_abc123`
4. **Severity Request**: Since it's a new symptom context, backend requests severity assessment (`severityFlag: true`)

**Key Fields:**
- **`severityFlag: true`** → Frontend MUST show severity selector UI (1-5 scale)
- **`contextId`** → Save this! Must send back with severity submission
- **`contextStatus: pending_severity`** → Waiting for user to select severity
- **`contextChanged: true`** → New context (first symptom mention)
- **`severityRequest`** → Contains prompt text to display to user
- **`resolvedPetId`** → Pet detected and resolved
- **`resolvedPetRole: "OWNER"`** → User owns this pet

**Frontend Actions:**
1. Display the AI answer text
2. Show severity selector (1-5 scale) below the message
3. Store `contextId` for the severity submission
4. When user selects severity, send Scenario 2 request

---

## Scenario 2: Severity Submission

**Description**: User submits severity level (1-5) in response to a severity request. Backend incorporates severity and provides detailed advice.

### Request Body
```json
{
    "query": "เลือกระดับ 4",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_uuid_v4_abc123",
    "severitySubmission": {
        "level": 4,
        "contextId": "ctx_uuid_v4_abc123"
    }
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
X-Installation-Id: install_abc123
```

### Response
```json
{
    "status": {
        "code": "000",
        "description": "Success"
    },
    "data": {
        "answer": "ระดับ 4/5 ถือว่าอาการรุนแรงมาก แมวไม่กินอาหารเป็นเวลานานอาจเกิดภาวะไขมันที่ตับ (Hepatic Lipidosis) ซึ่งอันตรายถึงชีวิต\n\n**คำแนะนำด่วน:**\n1. พาน้องไปพบสัตวแพทย์ภายใน 24 ชั่วโมง\n2. พยายามให้น้องดื่มน้ำเพื่อป้องกันการขาดน้ำ\n3. หากมีอาการซึม อ่อนเพลีย หรือซีด ให้ไปพบสัตวแพทย์ทันที\n\nกรุณาติดตามอาการอย่างใกล้ชิดนะคะ",
        "contextId": "ctx_uuid_v4_abc123",
        "contextStatus": "resolved",
        "contextChanged": false,
        "petContextStatus": "resolved",
        "resolvedPetId": "pet_789",
        "resolvedPetRole": "OWNER",
        "severityLevel": 4
    }
}
```

### Explanation

**What Happened:**
1. **Context Validation**: `contextId` matches previous response
2. **Severity Integration**: Level 4/5 incorporated into prompt
3. **Context Status**: Changed from `pending_severity` to `resolved`
4. **Severity-Aware Response**: AI provides urgent advice appropriate for severity 4

**Key Fields:**
- **`contextId`** → Same context ID (continuity)
- **`contextStatus: resolved`** → Context now has severity, ready for conversation
- **`contextChanged: false`** → Same context continuing
- **`severityFlag: undefined`** → No severity selector shown
- **`severityLevel: 4`** → Confirms the submitted level

**Important Validation Rule:**
- `severitySubmission.contextId` MUST match the `contextId` in request
- If mismatch → `400 Bad Request` error

**Frontend Actions:**
1. Display the severity-aware AI response
2. Hide severity selector (severity resolved)
3. Continue normal chat flow
4. User can now ask follow-up questions (Scenario 3)

---

## Scenario 3: Follow-up in Same Context

**Description**: User asks follow-up question about the same symptom within the same context. No new severity request.

### Request Body
```json
{
    "query": "ถ้าให้น้ำผสมไข่ขาวจะช่วยได้ไหม",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_uuid_v4_abc123"
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
X-Installation-Id: install_abc123
```

### Response
```json
{
    "status": {
        "code": "000",
        "description": "Success"
    },
    "data": {
        "answer": "ไข่ขาวสดอาจมีความเสี่ยงของแบคทีเรียซัลโมเนลลา ซึ่งอันตรายต่อแมว โดยเฉพาะเมื่อน้องมีภูมิคุ้มกันต่ำจากการไม่กินอาหาร\n\n**วิธีการที่ปลอดภัยกว่า:**\n1. ลองอาหารเปียกหรือน้ำซุปไก่ไม่ใส่เกลือ\n2. อุ่นอาหารเล็กน้อยเพื่อกระตุ้นความหิว\n3. ใช้ช้อนป้อนอาหารโดยตรง\n\nแต่เนื่องจากน้องอยู่ในระดับความรุนแรง 4/5 ควรพบสัตวแพทย์โดยเร็วที่สุดนะคะ",
        "contextId": "ctx_uuid_v4_abc123",
        "contextStatus": "resolved",
        "contextChanged": false,
        "petContextStatus": "resolved",
        "resolvedPetId": "pet_789",
        "resolvedPetRole": "OWNER"
    }
}
```

### Explanation

**What Happened:**
1. **Context Continuity**: Same `contextId` = same symptom topic
2. **Intent Detection**: Still `symptom` intent, but not `new_symptom_context`
3. **No Severity Request**: Context already has severity (level 4)
4. **Severity Memory**: AI remembers the severity 4 context in its advice

**Key Fields:**
- **`contextStatus: resolved`** → Context has severity, ready for conversation
- **`severityFlag: undefined`** → No severity selector (already have it)
- **`contextChanged: false`** → Same context continuing

**Frontend Actions:**
1. Display AI response normally
2. No special UI states needed
3. Continue conversation naturally

---

## Scenario 4: Context Switch (New Symptom)

**Description**: User switches to a completely different symptom topic. New context created, severity requested again.

### Request Body
```json
{
    "query": "น้องมีอาการท้องเสียด้วย ถ่ายเป็นน้ำเลย",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_uuid_v4_abc123"
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
X-Installation-Id: install_abc123
```

### Response
```json
{
    "status": {
        "code": "000",
        "description": "Success"
    },
    "data": {
        "answer": "การเปลี่ยนอาการจากเบื่ออาหารมาเป็นท้องเสียรุนแรง อาจบ่งชี้ถึงปัญหาทางเดินอาหารที่รุนแรงขึ้น เช่น การติดเชื้อไวรัส แบคทีเรีย หรือพยาธิ\n\nเนื่องจากเป็นอาการใหม่ที่แตกต่างจากเดิม รบกวนประเมินความรุนแรงของอาการท้องเสียด้วยค่ะ",
        "severityFlag": true,
        "contextId": "ctx_uuid_v4_xyz789",
        "contextStatus": "pending_severity",
        "contextChanged": true,
        "petContextStatus": "resolved",
        "resolvedPetId": "pet_789",
        "resolvedPetRole": "OWNER",
        "severityRequest": {
            "contextId": "ctx_uuid_v4_xyz789",
            "prompt": "กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น (1-5)",
            "reason": "new_symptom_context"
        }
    }
}
```

### Explanation

**What Happened:**
1. **Topic Detection**: System detected new symptom topic (ท้องเสีย vs เบื่ออาหาร)
2. **Context Rotation**: New context ID generated (`ctx_uuid_v4_xyz789`)
3. **Fresh Severity Request**: New symptom = new severity assessment needed
4. **Context Changed Flag**: `true` indicates this is a new topic

**Key Fields:**
- **`contextChanged: true`** → New symptom topic detected
- **`contextId` changed** → New context ID (different from previous)
- **`severityFlag: true`** → Request new severity for this new topic
- **`contextStatus: pending_severity`** → Waiting for severity submission

**How Context Rotation Works:**
- Backend tracks "symptom topics" from queries
- If new query has different symptom topics → new context
- Example: "เบื่ออาหาร" (loss of appetite) → "ท้องเสีย" (diarrhea) = different topics

**Frontend Actions:**
1. Display AI response
2. Show severity selector for the NEW context
3. Store the NEW `contextId`
4. Submit severity with the new `contextId` (Scenario 2 pattern)

---

## Scenario 5: Non-Symptom Query (General)

**Description**: User asks general question not related to symptoms. No severity workflow triggered.

### Request Body
```json
{
    "query": "อาหารแมวยี่ห้อไหนดีที่สุด",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_uuid_v4_abc123"
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
X-Installation-Id: install_abc123
```

### Response
```json
{
    "status": {
        "code": "000",
        "description": "Success"
    },
    "data": {
        "answer": "การเลือกอาหารแมวที่ดีควรพิจารณาจาก:\n\n1. **อายุและสภาพสุขภาพ**\n   - ลูกแมว: อาหารสูตรสำหรับลูกแมว (Kitten)\n   - แมวโต: อาหารสูตรผู้ใหญ่ (Adult)\n   - แมวสูงอายุ: อาหารสูตร senior\n\n2. **ส่วนผสมที่สำคัญ**\n   - โปรตีนจากเนื้อสัตว์เป็นอันดับแรก\n   - ไม่มีสารปรุงแต่งเทียม\n   - Taurine ที่เพียงพอ\n\n3. **ยี่ห้อที่ได้รับความนิยม**\n   - Royal Canin, Hill's Science Diet, Purina Pro Plan\n   - หรืออาหารสดที่ปรุงโดยสัตวแพทย์\n\nควรปรึกษาสัตวแพทย์เพื่อเลือกอาหารที่เหมาะกับสุขภาพเฉพาะของน้องนะคะ",
        "contextId": "ctx_uuid_v4_abc123",
        "contextStatus": "not_required",
        "contextChanged": false,
        "petContextStatus": "not_required",
        "severityFlag": false
    }
}
```

### Explanation

**What Happened:**
1. **Intent Classification**: Query classified as `general` (not symptom)
2. **No Severity Trigger**: General questions don't trigger severity workflow
3. **Clean Context**: `contextStatus: not_required` = no severity context active
4. **No Pet Detected**: Question doesn't mention a specific pet

**Key Fields:**
- **`contextStatus: not_required`** → Not a symptom context
- **`severityFlag: false`** → No severity selector needed
- **`petContextStatus: not_required`** → No pet mentioned or detected
- **No `severityRequest`** → No severity prompt

**Intent Classification Rules:**
- `symptom`: Keywords like "อาการ", "ป่วย", "ท้องเสีย", "อาเจียน", etc.
- `normal`: General pet care questions

**Frontend Actions:**
1. Display AI response normally
2. No severity UI shown
3. Continue chat normally

---

## Scenario 6: Pet Clarification Required

**Description**: User has multiple pets with the same name (e.g., two "มะลิ" - one owned, one shared). System needs clarification.

### Setup
User has:
- Owned pet: "มะลิ" (ID: `pet_owned_001`)
- Shared pet (caregiver): "มะลิ" from friend "แนน" (ID: `pet_shared_002`)

### Request Body
```json
{
    "query": "มะลิไม่ยอมกินอาหาร",
    "clientChatSessionId": "session_uuid_v4"
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
X-Installation-Id: install_abc123
```

### Response
```json
{
    "status": {
        "code": "000",
        "description": "Success"
    },
    "data": {
        "answer": "พบสัตว์เลี้ยงชื่อ \"มะลิ\" หลายตัวในระบบ กรุณาเลือกว่าต้องการสอบถามเกี่ยวกับน้องตัวไหน:",
        "contextId": "ctx_uuid_v4_pet_ambig",
        "contextStatus": "not_required",
        "petContextStatus": "pending_clarification",
        "petContextChanged": true,
        "petClarificationRequest": {
            "contextId": "ctx_uuid_v4_pet_ambig",
            "prompt": "พบสัตว์เลี้ยงชื่อ \"มะลิ\" หลายตัวในระบบ กรุณาเลือกว่าต้องการสอบถามเกี่ยวกับน้องตัวไหน:",
            "reason": "ambiguous_pet_name",
            "options": [
                {
                    "petId": "pet_owned_001",
                    "petName": "มะลิ",
                    "role": "OWNER"
                },
                {
                    "petId": "pet_shared_002",
                    "petName": "มะลิ",
                    "role": "CAREGIVER"
                }
            ]
        }
    }
}
```

### Explanation

**What Happened:**
1. **Duplicate Detection**: System found 2 pets with name "มะลิ"
2. **Ambiguity Resolution**: Cannot determine which pet without user input
3. **Clarification Prompt**: Frontend must show pet selection UI
4. **Context Paused**: No AI analysis until pet is clarified

**Key Fields:**
- **`petContextStatus: pending_clarification`** → Need user to select pet
- **`petClarificationRequest`** → Contains list of ambiguous pets
- **`options`** → Array of pets with same name, different roles; each item has `petId`, `petName`, `role`, and optional `petProfileUrl`
- **`role`**: `"OWNER"` or `"CAREGIVER"`

**Frontend UI Requirement:**
```
พบสัตว์เลี้ยงชื่อ "มะลิ" หลายตัวในระบบ กรุณาเลือกว่าต้องการสอบถามเกี่ยวกับน้องตัวไหน:

[ ] มะลิ (สัตว์เลี้ยงของคุณ)      ← petId: pet_owned_001
[ ] มะลิ (สัตว์เลี้ยงของ แนน)    ← petId: pet_shared_002

[ยืนยัน]
```

**Note on LLM Disambiguation:**
- Backend FIRST tries LLM disambiguation (analyzes query + context)
- If LLM can determine which pet → skips clarification (Scenario 8)
- Only shows this if LLM disambiguation fails or ambiguous

**Frontend Actions:**
1. Display clarification prompt
2. Show selection UI with all `ambiguousPets`
3. User selects one pet
4. Send Scenario 7 request with selected pet ID

---

## Scenario 7: Pet Clarification Submission

**Description**: User selects which pet they're asking about from the clarification options.

### Request Body
```json
{
    "query": "มะลิไม่ยอมกินอาหาร",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_uuid_v4_pet_ambig",
    "petClarificationSubmission": {
        "selectedPetId": "pet_shared_002",
        "contextId": "ctx_uuid_v4_pet_ambig"
    }
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
X-Installation-Id: install_abc123
```

### Response
```json
{
    "status": {
        "code": "000",
        "description": "Success"
    },
    "data": {
        "answer": "เข้าใจแล้วค่ะ หมายถึงมะลิของคุณแนนที่คุณดูแลให้ใช่ไหมคะ\n\nอาการเบื่ออาหารในแมวเป็นเรื่องที่ต้องสังเกตอย่างใกล้ชิด เนื่องจากแมวที่ไม่กินอาหารเป็นเวลานานอาจเกิดภาวะไขมันที่ตับซึ่งอันตรายถึงชีวิต\n\nเพื่อให้คำแนะนำได้แม่นยำขึ้น รบกวนประเมินความรุนแรงของอาการน้องให้หน่อยได้ไหมครับ?",
        "severityFlag": true,
        "contextId": "ctx_uuid_v4_pet_ambig",
        "contextStatus": "pending_severity",
        "petContextStatus": "resolved",
        "petContextChanged": true,
        "resolvedPetId": "pet_shared_002",
        "resolvedPetRole": "CAREGIVER",
        "severityRequest": {
            "contextId": "ctx_uuid_v4_pet_ambig",
            "prompt": "กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น (1-5)",
            "reason": "new_symptom_context"
        }
    }
}
```

### Explanation

**What Happened:**
1. **Pet Resolution**: User selected `pet_shared_002` (caregiver pet of "แนน")
2. **Context Continues**: Symptom context now active with resolved pet
3. **Severity Request**: Since it's a new symptom context, severity requested
4. **Role Recognition**: AI acknowledges this is a caregiver pet

**Key Fields:**
- **`resolvedPetId`** → Selected pet ID
- **`resolvedPetRole: "CAREGIVER"`** → User is caregiver, not owner
- **`petContextStatus: resolved`** → Pet now resolved
- **`petContextChanged: true`** → Pet was just clarified
- **`contextId` is the SAME as Turn 1** → The severity contextId is the deferred UUID from the original query

**Important Validation:**
- `petClarificationSubmission.contextId` MUST match response `contextId`
- `petClarificationSubmission.selectedPetId` MUST be one of the `options[].petId` values from the clarification request

**Caregiver vs Owner Differences:**
- Owner pets: Full profile access, all health records
- Caregiver pets: Limited access based on sharing permissions
- AI tone may differ (acknowledging they're helping a friend's pet)

**Frontend Actions:**
1. Confirm pet selection
2. Display AI response acknowledging which pet
3. Show severity selector (since `severityFlag: true`)
4. Proceed with severity workflow

---

## Scenario 8: Duplicate Pet Names with LLM Disambiguation

**Description**: User has multiple pets with same name, but the query contains enough context for LLM to disambiguate automatically. No clarification UI shown.

### Setup
User has:
- Owned pet: "มะลิ" (domestic shorthair, female, 2 years)
- Shared pet (caregiver): "มะลิ" (persian, male, 5 years) from friend "แนน"

### Request Body
```json
{
    "query": "มะลิของแนนไม่ยอมกินอาหารเลย",
    "clientChatSessionId": "session_uuid_v4"
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
X-Installation-Id: install_abc123
```

### Response
```json
{
    "status": {
        "code": "000",
        "description": "Success"
    },
    "data": {
        "answer": "เข้าใจแล้วค่ะ หมายถึงมะลิพันธุ์เปอร์เซียของคุณแนนที่คุณดูแลให้ใช่ไหมคะ\n\nอาการเบื่ออาหารในแมวพันธุ์เปอร์เซียเป็นเรื่องที่ต้องสังเกตอย่างใกล้ชิด เนื่องจากแมวพันธุ์นี้มีความเสี่ยงต่อปัญหาทางเดินอาหาร\n\nเพื่อให้คำแนะนำได้แม่นยำขึ้น รบกวนประเมินความรุนแรงของอาการน้องให้หน่อยได้ไหมครับ?",
        "severityFlag": true,
        "contextId": "ctx_uuid_v4_auto_resolved",
        "contextStatus": "pending_severity",
        "contextChanged": true,
        "petContextStatus": "resolved",
        "petContextChanged": true,
        "resolvedPetId": "pet_shared_002",
        "resolvedPetRole": "CAREGIVER",
        "resolvedOwnerAlias": "แนน",
        "severityRequest": {
            "contextId": "ctx_uuid_v4_auto_resolved",
            "prompt": "กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น (1-5)",
            "reason": "new_symptom_context"
        }
    }
}
```

### Explanation

**What Happened:**
1. **Duplicate Detection**: System detected 2 pets named "มะลิ"
2. **LLM Disambiguation**: Query "มะลิ**ของแนน**" contains disambiguating context
3. **Automatic Resolution**: LLM identified the caregiver pet without user clarification
4. **Rare Call**: LLM disambiguation only fires for ambiguous duplicates with context

**Key Fields:**
- No `petClarificationRequest` → LLM resolved it automatically
- `petContextStatus: resolved` → Pet resolved via LLM
- `petContextChanged: true` → Pet context established
- `resolvedPetRole: "CAREGIVER"`** → Correctly identified as shared pet

**When LLM Disambiguation Fires:**
- ✅ Multiple pets with same name detected
- ✅ Query contains owner alias (e.g., "ของแนน", "ที่บ้านแนน")
- ✅ Query contains breed hints (e.g., "เปอร์เซีย")
- ✅ Session has conversation context

**When Clarification UI Shows (LLM fails):**
- ❌ Query just says "มะลิ" with no distinguishing info
- ❌ LLM cannot determine from context
- ❌ First message in session (no conversation history)

**Frontend Actions:**
1. Display normal AI response (no clarification UI needed)
2. Show severity selector as usual
3. User experience is seamless - no extra step

---

## Scenario 9: Session Continuity with Pet Context

**Description**: Multiple turns in same session showing how pet context persists and changes.

### Turn 1: Initial Pet Detection
**Request Body:**
```json
{
    "query": "มะลิไม่กินข้าว",
    "clientChatSessionId": "session_uuid_v4"
}
```

**Headers:** `Authorization: Bearer <token>`, `X-Installation-Id: install_abc123`

**Response:**
```json
{
    "data": {
        "answer": "...",
        "resolvedPetId": "pet_001",
        "resolvedPetRole": "OWNER",
        "petContextStatus": "resolved",
        "petContextChanged": true,
        "contextId": "ctx_1",
        "contextStatus": "resolved"
    }
}
```

### Turn 2: Same Pet (No Re-injection)
**Request Body:**
```json
{
    "query": "แล้วถ้าให้นมล่ะ",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_1"
}
```

**Headers:** `Authorization: Bearer <token>`, `X-Installation-Id: install_abc123`

**Response:**
```json
{
    "data": {
        "answer": "...",
        "resolvedPetId": "pet_001",
        "resolvedPetRole": "OWNER",
        "petContextStatus": "resolved",
        "petContextChanged": false,
        "contextId": "ctx_1",
        "contextStatus": "resolved"
    }
}
```

**What Happened:**
- `petContextChanged: false` → Same pet, no re-injection needed
- AI remembers pet profile from previous turn
- Server-side session history maintains context

### Turn 3: Pet Switch (Different Pet)
**Request Body:**
```json
{
    "query": "ส่วนโปโลมีอาการท้องเสีย",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_1"
}
```

**Headers:** `Authorization: Bearer <token>`, `X-Installation-Id: install_abc123`

**Response:**
```json
{
    "data": {
        "answer": "...",
        "resolvedPetId": "pet_002",
        "resolvedPetRole": "OWNER",
        "petContextStatus": "resolved",
        "petContextChanged": true,
        "contextId": "ctx_2",
        "contextStatus": "pending_severity",
        "contextChanged": true,
        "severityFlag": true
    }
}
```

**What Happened:**
- `petContextChanged: true` → New pet detected (โปโล vs มะลิ)
- New pet profile injected into session
- New context (`ctx_2`) because different pet + different symptom
- Severity requested for new context

### Turn 4: Back to First Pet
**Request Body:**
```json
{
    "query": "กลับมาที่มะลิ ตอนนี้กินได้แล้ว",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_2"
}
```

**Headers:** `Authorization: Bearer <token>`, `X-Installation-Id: install_abc123`

**Response:**
```json
{
    "data": {
        "answer": "...",
        "resolvedPetId": "pet_001",
        "resolvedPetRole": "OWNER",
        "petContextStatus": "resolved",
        "petContextChanged": true,
        "contextId": "ctx_3",
        "contextStatus": "resolved"
    }
}
```

**What Happened:**
- `petContextChanged: true` → Switched back to pet_001
- Pet profile re-injected (was previously skipped in Turn 2-3)
- New context (`ctx_3`) because returning to previous symptom topic

**Summary of Pet Context Behavior:**
| Turn | Pet | `petContextChanged` | Profile Injected? |
|------|-----|-------------------|-------------------|
| 1 | มะลิ | `true` | ✅ Yes |
| 2 | มะลิ | `false` | ❌ Skipped |
| 3 | โปโล | `true` | ✅ Yes |
| 4 | มะลิ | `true` | ✅ Yes (re-injected) |

---

## Scenario 10: Severity Context with Pet Switch

**Description**: User switches pets while in the middle of a severity workflow. Shows how pet context and severity context interact.

### Turn 1: Start with Pet A (Severity Requested)
**Request Body:**
```json
{
    "query": "มะลิไม่กินข้าว",
    "clientChatSessionId": "session_uuid_v4"
}
```

**Headers:** `Authorization: Bearer <token>`, `X-Installation-Id: install_abc123`

**Response:**
```json
{
    "data": {
        "answer": "...รบกวนประเมินความรุนแรง...",
        "severityFlag": true,
        "resolvedPetId": "pet_001",
        "resolvedPetRole": "OWNER",
        "contextId": "ctx_mali",
        "contextStatus": "pending_severity"
    }
}
```

### Turn 2: User Switches to Pet B (Without Submitting Severity)
**Request Body:**
```json
{
    "query": "ส่วนโปโลท้องเสียหนักมาก",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_mali"
}
```

**Headers:** `Authorization: Bearer <token>`, `X-Installation-Id: install_abc123`

**Response:**
```json
{
    "data": {
        "answer": "...รบกวนประเมินความรุนแรงของอาการท้องเสีย...",
        "severityFlag": true,
        "resolvedPetId": "pet_002",
        "resolvedPetRole": "OWNER",
        "petContextStatus": "resolved",
        "petContextChanged": true,
        "contextId": "ctx_polo",
        "contextStatus": "pending_severity",
        "contextChanged": true
    }
}
```

**What Happened:**
1. Previous context (`ctx_mali`) was `pending_severity` but user didn't submit
2. New pet detected (โปโล) → new pet context
3. New symptom (ท้องเสีย vs ไม่กินข้าว) → new severity context
4. Old severity submission abandoned, new one requested

**Frontend Note:**
- If user switches topics/pets without submitting severity, the old severity request is effectively abandoned
- Backend creates new context for new pet/symptom
- No error or warning needed - just natural flow

---

## Scenario 11: Symptom Query with Ambiguous Pet Name (Deferred Severity)

**Description**: User's symptom query mentions a pet whose name is shared between their own pet and a caregiver pet. The backend **defers** severity assessment until after pet ambiguity is resolved — preventing two modals from appearing simultaneously.

### Setup
User has:
- Owned pet: "จุ๊มเหม่ง" (ID: `pet_owned_001`)
- Shared pet (caregiver): "จุ๊มเหม่ง" from friend "บอม" (ID: `pet_shared_002`)

---

### Turn 1: Symptom Query — Pet Clarification Only (Severity Deferred)

**Request Body:**
```json
{
    "query": "จุ๊มเหม่งไม่ค่อยกินข้าวเลย ซึมด้วยทำไงดี",
    "clientChatSessionId": "session_uuid_v4"
}
```

**Headers:** `Authorization: Bearer <token>`, `X-Installation-Id: install_abc123`

**Response:**
```json
{
    "status": { "code": "000", "description": "Success" },
    "data": {
        "answer": "คุณหมายถึง จุ๊มเหม่ง ที่เป็นสัตว์เลี้ยงของคุณ หรือ จุ๊มเหม่ง ที่คุณเป็นผู้ดูแล?",
        "contextId": "ctx_uuid_shared_001",
        "contextStatus": "not_required",
        "petContextStatus": "pending_clarification",
        "petContextChanged": true,
        "petClarificationRequest": {
            "contextId": "ctx_uuid_shared_001",
            "prompt": "คุณหมายถึง จุ๊มเหม่ง ที่เป็นสัตว์เลี้ยงของคุณ หรือ จุ๊มเหม่ง ที่คุณเป็นผู้ดูแล?",
            "reason": "ambiguous_pet_name",
            "options": [
                {
                    "petId": "pet_owned_001",
                    "petName": "จุ๊มเหม่ง",
                    "role": "OWNER"
                },
                {
                    "petId": "pet_shared_002",
                    "petName": "จุ๊มเหม่ง",
                    "role": "CAREGIVER",
                    "petProfileUrl": "https://..."
                }
            ]
        }
    }
}
```

**What Happened:**
1. **Symptom Detected**: Query classified as `symptom` (not eating + lethargic)
2. **Duplicate Pet Name**: Two pets named "จุ๊มเหม่ง" found; LLM disambiguation cannot resolve from query alone
3. **Severity Deferred**: Backend stores severity internally (`session.pendingSymptomSeverity`) — does NOT surface it yet
4. **Pet Clarification Returned**: `contextStatus: "not_required"` — only one modal shown

⚠️ **Key Behavior**: `contextStatus` is `"not_required"` even though the query is a symptom query. This is intentional — severity is held back until the pet is identified.

**Frontend Actions:**
1. Show pet selection UI only (no severity modal)
2. Store `contextId` (`"ctx_uuid_shared_001"`) — this same UUID will be used for severity later
3. Wait for user to pick a pet

---

### Turn 2: Pet Selected — Severity Activated

**Request Body:**
```json
{
    "query": "เลือกสัตว์เลี้ยง: จุ๊มเหม่ง",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_uuid_shared_001",
    "petClarificationSubmission": {
        "contextId": "ctx_uuid_shared_001",
        "selectedPetId": "pet_owned_001"
    }
}
```

**Headers:** `Authorization: Bearer <token>`, `X-Installation-Id: install_abc123`

**Response:**
```json
{
    "status": { "code": "000", "description": "Success" },
    "data": {
        "answer": "เข้าใจแล้วค่ะ จุ๊มเหม่งของคุณเองใช่ไหม มีอะไรให้ช่วยดูแลน้องได้บ้างคะ?",
        "contextId": "ctx_uuid_shared_001",
        "contextStatus": "pending_severity",
        "petContextStatus": "resolved",
        "petContextChanged": true,
        "resolvedPetId": "pet_owned_001",
        "resolvedPetRole": "OWNER",
        "severityFlag": true,
        "severityRequest": {
            "contextId": "ctx_uuid_shared_001",
            "prompt": "กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น (1-5)",
            "reason": "symptom_needs_assessment"
        }
    }
}
```

**What Happened:**
1. **Pet Resolved**: User selected the owned "จุ๊มเหม่ง"
2. **Deferred Severity Activated**: Backend detects `session.pendingSymptomSeverity` and activates it
3. **Same `contextId`**: The severity `contextId` is the **same UUID** from Turn 1 — no new context created
4. **AI Greets Naturally**: Model responds via `[PET_SELECTED]` directive without assuming a health issue; severity UI appears alongside

⚠️ **Key Point**: `contextId` in this response is **identical** to Turn 1. Send it unchanged in Turn 3.

**Frontend Actions:**
1. Close pet selection UI
2. Display AI greeting
3. Show severity selector (1–5 scale)
4. Store `severityRequest.contextId` = `"ctx_uuid_shared_001"` for submission

---

### Turn 3: Severity Submitted — Context Resolved

**Request Body:**
```json
{
    "query": "จุ๊มเหม่งไม่ค่อยกินข้าวเลย ซึมด้วย",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_uuid_shared_001",
    "severitySubmission": {
        "contextId": "ctx_uuid_shared_001",
        "level": 3,
        "label": "ปานกลาง"
    }
}
```

**Headers:** `Authorization: Bearer <token>`, `X-Installation-Id: install_abc123`

**Response:**
```json
{
    "status": { "code": "000", "description": "Success" },
    "data": {
        "answer": "ระดับ 3/5 หมายถึงอาการปานกลาง ควรเฝ้าสังเกตน้องอย่างใกล้ชิดในช่วง 24 ชั่วโมงนี้...",
        "contextId": "ctx_uuid_shared_001",
        "contextStatus": "resolved",
        "petContextStatus": "resolved",
        "resolvedPetId": "pet_owned_001",
        "resolvedPetRole": "OWNER",
        "severityLevel": 3
    }
}
```

**What Happened:**
1. **Severity Submitted**: Level 3 incorporated into the AI response
2. **Context Resolved**: Ready for follow-up questions
3. **Consistent Pet**: Same `resolvedPetId` across all 3 turns

**Frontend Actions:**
1. Hide severity selector
2. Display severity-aware AI response
3. Continue normal chat flow

---

### Turn Summary

| Turn | User Action | `contextStatus` | `petContextStatus` | Modals Shown |
|------|-------------|-----------------|-------------------|--------------|
| 1 | Symptom query (ambiguous pet) | `not_required` | `pending_clarification` | Pet selection only |
| 2 | Select pet | `pending_severity` | `resolved` | Severity selector only |
| 3 | Submit severity | `resolved` | `resolved` | None |

**`contextId` = `"ctx_uuid_shared_001"` across all 3 turns.**

---

## Error Scenarios

### Error 1: Context ID Mismatch (Severity Submission)

**Request Body:**
```json
{
    "query": "เลือกระดับ 3",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_abc",
    "severitySubmission": {
        "level": 3,
        "contextId": "ctx_xyz"
    }
}
```

**Headers:** `Authorization: Bearer <token>`, `X-Installation-Id: install_abc123`

**Response:**
```json
{
    "status": {
        "code": "400",
        "description": "Bad Request"
    },
    "error": {
        "message": "severitySubmission.contextId must match contextId",
        "code": "VALIDATION_ERROR"
    }
}
```

**Fix:** Ensure `severitySubmission.contextId` matches top-level `contextId`.

### Error 2: Context ID Mismatch (Pet Clarification)

**Request Body:**
```json
{
    "query": "เลือกตัวแรก",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_abc",
    "petClarificationSubmission": {
        "selectedPetId": "pet_001",
        "contextId": "ctx_xyz"
    }
}
```

**Headers:** `Authorization: Bearer <token>`, `X-Installation-Id: install_abc123`

**Response:**
```json
{
    "status": {
        "code": "400",
        "description": "Bad Request"
    },
    "error": {
        "message": "petClarificationSubmission.contextId must match contextId",
        "code": "VALIDATION_ERROR"
    }
}
```

### Error 3: Invalid Pet ID in Clarification

**Request Body:**
```json
{
    "query": "เลือกตัวแรก",
    "clientChatSessionId": "session_uuid_v4",
    "contextId": "ctx_ambig",
    "petClarificationSubmission": {
        "selectedPetId": "pet_invalid_id",
        "contextId": "ctx_ambig"
    }
}
```

**Headers:** `Authorization: Bearer <token>`, `X-Installation-Id: install_abc123`

**Response:**
```json
{
    "status": {
        "code": "400",
        "description": "Bad Request"
    },
    "error": {
        "message": "Invalid petId in clarification submission",
        "code": "VALIDATION_ERROR"
    }
}
```

**Fix:** `selectedPetId` must be one of the `petId` values from `options` array in the previous `petClarificationRequest`.

### Error 4: Server Error (Retryable)

**Response:**
```json
{
    "status": {
        "code": "500",
        "description": "Internal Server Error"
    },
    "error": {
        "message": "We experienced an unexpected issue. Our AI assistant should be available soon. Please try again in a moment.",
        "code": "INTERNAL_ERROR"
    }
}
```

**Frontend Action:** Show retry button to user.

---

## Field Explanations

### `clientChatSessionId`

**Purpose:** Maintain conversation continuity across multiple requests.

**Rules:**
- Generate once (UUID v4) when user opens chat
- Send same ID for all messages in that conversation
- Server uses this to retrieve the Gemini chat session
- If omitted or new ID sent → new conversation (history lost)

**Example:**
```typescript
const sessionId = useMemo(() => uuidv4(), []); // Generate once
// Send sessionId with every request
```

---

### `contextId`

**Purpose:** Track symptom context across turns.

**Rules:**
- Server generates new `contextId` when new symptom topic detected
- Frontend must send back the `contextId` from previous response
- Used to validate `severitySubmission` and `petClarificationSubmission`
- Different contexts can have different severity levels

**Context Change Triggers:**
- New symptom topic (e.g., ท้องเสีย after discussing อาเจียน)
- Pet switch (new pet = new context)
- Session timeout / new session

**Example Flow:**
```
Turn 1: No contextId sent → Server returns ctx_001
Turn 2: Send ctx_001 → Server returns ctx_001 (same context)
Turn 3: Send ctx_001 but new symptom → Server returns ctx_002 (new context)
```

---

### `contextStatus`

**Purpose:** Indicate current state of the severity context.

**Values:**

| Value | Meaning | Frontend Action |
|-------|---------|-----------------||
| `not_required` | No active symptom context | Normal chat |
| `pending_severity` | Symptom detected, need severity | Show severity selector |
| `pending_clarification` | Ambiguous health query | Show clarification options |
| `resolved` | Context has severity, ready for chat | Normal chat |

**Transitions:**
```
not_required → pending_severity (symptom detected)
pending_severity → resolved (severity submitted)
resolved → not_required (non-symptom query)
resolved → pending_severity (new symptom context)
```

---

### `contextChanged`

**Purpose:** Flag to indicate if this is a new context.

**Rules:**
- `true` = new context started this turn
- `undefined` or `false` = continuing same context
- Use to show context transition UI if needed
- When `true` + `severityFlag: true` → new severity assessment needed

**Example Use:**
```typescript
if (response.data.contextChanged && response.data.severityFlag) {
  // Reset any UI state from previous context
  resetSeveritySelection();
}
```

---

### `severityFlag`

**Purpose:** Control visibility of severity selector UI.

**Rules:**
- `true` → Show severity selector (1-5 scale)
- `undefined` or `false` → Hide severity selector
- Only `true` when `contextStatus` is `pending_severity`

**Severity Levels:**
- 1 = Very mild (เบามาก)
- 2 = Mild (เบา)
- 3 = Moderate (ปานกลาง)
- 4 = Severe (รุนแรง)
- 5 = Critical (วิกฤติ)

**Example UI:**
```
กรุณาเลือกระดับความรุนแรง:
[1] [2] [3] [4] [5]
เบามาก        วิกฤติ

[ยืนยัน]
```

---

### `severityRequest`

**Purpose:** Provide details for severity selection prompt.

**Fields:**
- `contextId`: Must send this back with severity submission
- `prompt`: Thai text to display to user
- `reason`: Why severity is requested (`new_symptom_context` or `symptom_needs_assessment`)

**Example:**
```json
{
    "severityRequest": {
        "contextId": "ctx_abc123",
        "prompt": "กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น (1-5)",
        "reason": "new_symptom_context"
    }
}
```

---

### `petContextStatus`

**Purpose:** Track state of pet detection.

**Values:**

| Value | Meaning | Frontend Action |
|-------|---------|-----------------||
| `not_required` | No pet mentioned or detected | Normal chat |
| `resolved` | Pet identified (by detection or user) | Show pet info if needed |
| `pending_clarification` | Multiple pets with same name | Show pet selection UI |

**Note:** Can be different from `contextStatus`. Example: Pet resolved but waiting for severity (`petContextStatus: resolved`, `contextStatus: pending_severity`).

---

### `petContextChanged`

**Purpose:** Flag to indicate if pet changed this turn.

**Rules:**
- `true` = different pet from previous turn
- `undefined` or `false` = same pet continuing
- When `true`, pet profile was injected into AI context
- When `false`, AI remembers pet from previous turns

**Example Use:**
```typescript
if (response.data.petContextChanged) {
  // Show pet indicator or transition animation
  showPetTransition(response.data.resolvedPetId);
}
```

---

### `resolvedPetId` and `resolvedPetRole`

**Purpose:** Identify which pet is being discussed.

**Rules:**
- Only present when `petContextStatus` is `resolved`
- `resolvedPetId`: Database ID of the pet
- `resolvedPetRole`: `"OWNER"` (user's pet) or `"CAREGIVER"` (shared pet)

**UI Indicators:**
```
[Owner] มะลิ (เมื่อ resolvedPetRole === "OWNER")
[ดูแลให้แนน] มะลิ (เมื่อ resolvedPetRole === "CAREGIVER" และ ownerAlias === "แนน")
```

---

### `petClarificationRequest`

**Purpose:** Provide data for pet selection UI when duplicate names exist.

**Fields:**
- `contextId`: Context for this clarification
- `prompt`: Thai text to display
- `reason`: Always `"ambiguous_pet_name"`
- `options`: Array of pets with same name

**options Item:**
```json
{
    "petId": "pet_id",
    "petName": "มะลิ",
    "role": "OWNER" | "CAREGIVER",
    "petProfileUrl": "https://..." // optional, presigned URL if pet has profile image
}
```

**Example UI:**
```
พบสัตว์เลี้ยงชื่อ "มะลิ" หลายตัว:

◎ มะลิ (สัตว์เลี้ยงของคุณ)     ← petId: pet_owned_001
◎ มะลิ (ดูแลให้ แนน)            ← petId: pet_shared_002

[ยืนยันการเลือก]
```

---

## Context State Machine

```
                    ┌─────────────────┐
                    │      clean      │
                    │  (no symptom)   │
                    └────────┬────────┘
                             │
              symptom query  │
                             ▼
                    ┌─────────────────┐
              ┌────│ pending_severity│◄────┐
              │    │ (need severity) │     │
              │    └────────┬────────┘     │
              │             │               │
              │    severity  │ submitted     │
              │    submitted  │               │
              │             ▼               │
              │    ┌─────────────────┐    │
              └────┤    resolved     ├────┘
                   │  (has severity) │
                   │   chat ready    │
                   └────────┬────────┘
                            │
              non-symptom    │
              query          │
                            ▼
                   ┌─────────────────┐
                   │      clean      │
                   │  (context end)  │
                   └─────────────────┘
```

---

## Pet Context State Machine

```
                    ┌─────────────────┐
                    │     no_pet      │
                    │  (no pet in     │
                    │    query)       │
                    └────────┬────────┘
                             │
              pet mentioned   │
              in query        │
                             ▼
                    ┌─────────────────┐
         ┌─────────│  check for      │──────────┐
         │         │ duplicate names │          │
         │         └────────┬────────┘          │
         │                  │                  │
    unique name      duplicate names      no match
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    resolved     │ │pending_clarifica│ │     no_pet      │
│   (pet found)   │ │     tion        │ │ (try LLM later) │
└────────┬────────┘ │  (user picks)   │ └─────────────────┘
         │          └────────┬────────┘
         │                   │
         │         user      │ selects
         │         selects   │
         │                   ▼
         │          ┌─────────────────┐
         │          │    resolved     │
         │          │  (pet resolved) │
         │          └────────┬────────┘
         │                   │
         └───────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
   new query   same pet   different
   no pet      continues  pet name
        │          │          │
        ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  no_pet  │ │resolved  │ │resolved  │
│(session │ │(no       │ │(new pet, │
│  pet)   │ │ change)  │ │ changed) │
└──────────┘ └──────────┘ └──────────┘
```

---

## Summary for Frontend Developers

### Required State Management

```typescript
interface ChatState {
    // Session (persistent across conversation)
    clientChatSessionId: string;  // Generate once, reuse
    
    // Context (from last response)
    contextId?: string;           // Send back with each request
    contextStatus?: string;       // Track context state
    
    // Pet Context (from last response)
    resolvedPetId?: string;       // Current pet being discussed
    resolvedPetRole?: 'OWNER' | 'CAREGIVER';
    
    // UI States
    showSeveritySelector: boolean;  // When severityFlag = true
    showPetClarification: boolean;  // When petContextStatus = pending_clarification
    pendingSeverityContextId?: string;  // Store for submission
    pendingPetContextId?: string;       // Store for pet clarification
}
```

**Note:** `userId` and `installationId` are extracted server-side from the JWT token and `X-Installation-Id` header. Frontend does NOT include them in the request body.

### Required UI Components

1. **Chat Interface**: Message bubbles, input field
2. **Severity Selector**: 1-5 scale with Thai labels
3. **Pet Clarification**: List of ambiguous pets with radio buttons
4. **Context Indicator**: (Optional) Show current pet name and role
5. **Loading State**: While waiting for AI response
6. **Error State**: Retry button for 500 errors

### Request Building Logic

```typescript
function buildChatRequest(
    message: string,
    state: ChatState
): ChatRequest {
    const body = {
        query: message,
        clientChatSessionId: state.clientChatSessionId,
    } as ChatRequest;
    
    // Always send contextId if we have one
    if (state.contextId) {
        body.contextId = state.contextId;
    }
    
    // Severity submission (when user selects severity)
    if (isSeveritySubmission(message, state)) {
        body.severitySubmission = {
            level: extractSeverityLevel(message),
            contextId: state.pendingSeverityContextId || state.contextId
        };
    }
    
    // Pet clarification submission
    if (state.selectedPetForClarification) {
        body.petClarificationSubmission = {
            selectedPetId: state.selectedPetForClarification,
            contextId: state.pendingPetContextId || state.contextId
        };
    }
    
    return body;
    // Note: userId and installationId come from JWT token and X-Installation-Id header
}
```

### Response Handling Logic

```typescript
function handleChatResponse(response: ChatResponse, state: ChatState): void {
    // Update context state
    state.contextId = response.data.contextId;
    state.contextStatus = response.data.contextStatus;
    
    // Update pet state
    state.resolvedPetId = response.data.resolvedPetId;
    state.resolvedPetRole = response.data.resolvedPetRole;
    
    // Handle severity workflow
    if (response.data.severityFlag) {
        state.showSeveritySelector = true;
        state.pendingSeverityContextId = response.data.severityRequest?.contextId;
    } else {
        state.showSeveritySelector = false;
        state.pendingSeverityContextId = undefined;
    }
    
    // Handle pet clarification
    if (response.data.petContextStatus === 'pending_clarification') {
        state.showPetClarification = true;
        state.petOptions = response.data.petClarificationRequest?.options;
        state.pendingPetContextId = response.data.petClarificationRequest?.contextId;
    } else {
        state.showPetClarification = false;
        state.ambiguousPets = undefined;
        state.pendingPetContextId = undefined;
    }
    
    // Display the answer
    displayMessage(response.data.answer, 'ai');
}
```

---

## Document Information

- **Last Updated**: April 24, 2026
- **Purpose**: Frontend developer reference for AI Chatbot Severity Workflows
- **Backend Files Referenced**:
  - `ai-chat-service.ts` - Main orchestration
  - `ai-chat-types.ts` - Type definitions
  - `ai-chat-severity.ts` - Severity logic
  - `ai-chat-pet-context.ts` - Pet detection and context
  - `ai-chat-schema.ts` - Request/response validation
- **Related Documents**:
  - `AI_CHAT_FRONTEND_REFACTOR_PLAN.md` - Implementation plan
  - `AI_CHAT_CAREGIVER_PET_DETECTION_IMPLEMENTATION.md` - Pet detection details
  - `AI_CHAT_MULTI_SEVERITY_SESSION_EXAMPLE.md` - Multi-turn examples

---

**End of Document**
