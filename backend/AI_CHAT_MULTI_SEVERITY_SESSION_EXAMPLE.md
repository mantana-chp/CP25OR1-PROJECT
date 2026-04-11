# AI Chat Current Behavior - Ongoing Session with Multiple Severity Contexts

Last updated: 2026-04-10

This document shows the current implemented behavior of `POST /v1/ai-chat` when one session has more than one symptom context, and each context can request severity.

## Scenario Overview
- Same user and same chat session
- Symptom Context A: vomiting
- Later in the same session, Symptom Context B: coughing + fast breathing
- Backend rotates `contextId` when it detects a new symptom context
- Severity is requested again for the new context

---

## Step 1: Start Symptom Context A (No severity yet)

Description:
- User reports first symptom.
- No `contextId` is sent yet.
- Backend creates a new `contextId` and asks for severity.

```jsonc
// body request
{
  // "resolvedPetId": "4d3cf7b2-4988-476b-982c-2ef3c20f8e8b", // optional
  "query": "น้องหมาอาเจียนตั้งแต่เช้า",
  "history": []
}
```

```jsonc
// body response
{
  "status": {
    "code": "000",
    "description": "Success"
  },
  "data": {
    "answer": "...เพื่อให้คำแนะนำได้แม่นยำขึ้น รบกวนประเมินความรุนแรงของอาการน้องให้หน่อยได้ไหมครับ",
    "resolvedPetId": "4d3cf7b2-4988-476b-982c-2ef3c20f8e8b", // optional
    "severityFlag": true,
    "contextId": "11111111-1111-1111-1111-111111111111",
    "contextStatus": "pending_severity",
    "severityRequest": {
      "contextId": "11111111-1111-1111-1111-111111111111",
      "prompt": "กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น (1-5)",
      "reason": "symptom_needs_assessment"
    }
  }
}
```

---

## Step 2: Submit Severity for Context A

Description:
- User submits severity using structured `severitySubmission`.
- `severitySubmission.contextId` must match `contextId`.
- Backend marks this context as resolved.

```jsonc
// body request
{
  "query": "น้องหมาอาเจียนตั้งแต่เช้า",
  "resolvedPetId": "4d3cf7b2-4988-476b-982c-2ef3c20f8e8b", // optional
  "contextId": "11111111-1111-1111-1111-111111111111",
  "severitySubmission": {
    "contextId": "11111111-1111-1111-1111-111111111111",
    "level": 4,
    "label": "รุนแรง"
  },
  "history": [
    {
      "role": "user",
      "content": "น้องหมาอาเจียนตั้งแต่เช้า"
    },
    {
      "role": "assistant",
      "content": "..."
    }
  ]
}
```

```jsonc
// body response
{
  "status": {
    "code": "000",
    "description": "Success"
  },
  "data": {
    "answer": "ระดับความรุนแรง 4/5 — แนะนำให้พาไปพบสัตวแพทย์โดยเร็ว...",
    "resolvedPetId": "4d3cf7b2-4988-476b-982c-2ef3c20f8e8b", // optional
    "contextId": "11111111-1111-1111-1111-111111111111",
    "contextStatus": "resolved",
    "severityLevel": 4
  }
}
```

---

## Step 3: Follow-up in Same Context A (No new severity request)

Description:
- User asks follow-up for the same symptom context.
- Since context A is already resolved, backend does not ask severity again.

```jsonc
// body request
{
  "query": "ต้องเฝ้าดูอาการอีกกี่ชั่วโมงดี",
  "resolvedPetId": "4d3cf7b2-4988-476b-982c-2ef3c20f8e8b", // optional
  "contextId": "11111111-1111-1111-1111-111111111111",
  "history": [
    {
      "role": "user",
      "content": "น้องหมาอาเจียนตั้งแต่เช้า"
    },
    {
      "role": "assistant",
      "content": "..."
    },
    {
      "role": "user",
      "content": "[SEVERITY: 4/5] น้องหมาอาเจียนตั้งแต่เช้า"
    },
    {
      "role": "assistant",
      "content": "..."
    }
  ]
}
```

```jsonc
// body response
{
  "status": {
    "code": "000",
    "description": "Success"
  },
  "data": {
    "answer": "...หากไม่ดีขึ้นใน 24 ชั่วโมงควรพาไปพบสัตวแพทย์",
    "resolvedPetId": "4d3cf7b2-4988-476b-982c-2ef3c20f8e8b", // optional
    "contextId": "11111111-1111-1111-1111-111111111111",
    "contextStatus": "resolved"
  }
}
```

---

## Step 4: New Symptom Context B in Same Ongoing Session

Description:
- User now reports a different symptom topic (respiratory).
- Backend detects context shift, rotates to a new `contextId`.
- Severity is requested again for the new context.

```jsonc
// body request
{
  "query": "ตอนนี้น้องเริ่มไอและหายใจเร็ว",
  "resolvedPetId": "4d3cf7b2-4988-476b-982c-2ef3c20f8e8b", // optional
  "contextId": "11111111-1111-1111-1111-111111111111",
  "history": [
    {
      "role": "user",
      "content": "น้องหมาอาเจียนตั้งแต่เช้า"
    },
    {
      "role": "assistant",
      "content": "..."
    },
    {
      "role": "user",
      "content": "[SEVERITY: 4/5] น้องหมาอาเจียนตั้งแต่เช้า"
    },
    {
      "role": "assistant",
      "content": "..."
    }
  ]
}
```

```jsonc
// body response
{
  "status": {
    "code": "000",
    "description": "Success"
  },
  "data": {
    "answer": "...ช่วยประเมินระดับความรุนแรงของอาการไอและการหายใจให้หน่อยได้ไหมครับ",
    "resolvedPetId": "4d3cf7b2-4988-476b-982c-2ef3c20f8e8b", // optional
    "severityFlag": true,
    "contextId": "22222222-2222-2222-2222-222222222222",
    "contextChanged": true,
    "contextStatus": "pending_severity",
    "severityRequest": {
      "contextId": "22222222-2222-2222-2222-222222222222",
      "prompt": "กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น (1-5)",
      "reason": "new_symptom_context"
    }
  }
}
```

---

## Step 5: Submit Severity for Context B

Description:
- User submits severity for the new context B.
- Backend resolves context B independently from context A.

```jsonc
// body request
{
  "query": "ตอนนี้น้องเริ่มไอและหายใจเร็ว",
  "resolvedPetId": "4d3cf7b2-4988-476b-982c-2ef3c20f8e8b", // optional
  "contextId": "22222222-2222-2222-2222-222222222222",
  "severitySubmission": {
    "contextId": "22222222-2222-2222-2222-222222222222",
    "level": 5,
    "label": "รุนแรงมาก"
  },
  "history": [
    {
      "role": "user",
      "content": "ตอนนี้น้องเริ่มไอและหายใจเร็ว"
    },
    {
      "role": "assistant",
      "content": "..."
    }
  ]
}
```

```jsonc
// body response
{
  "status": {
    "code": "000",
    "description": "Success"
  },
  "data": {
    "answer": "ระดับความรุนแรง 5/5 — แนะนำให้ไปคลินิกฉุกเฉินทันที...",
    "resolvedPetId": "4d3cf7b2-4988-476b-982c-2ef3c20f8e8b", // optional
    "contextId": "22222222-2222-2222-2222-222222222222",
    "contextStatus": "resolved",
    "severityLevel": 5
  }
}
```

---

## Notes
- `resolvedPetId` is optional in request and response.
- `severityFlag` is backward compatibility output; new UI should use `contextStatus` + `severityRequest`.
- `history` must alternate roles starting with user and max 8 items.
- If both `contextId` and `severitySubmission.contextId` are sent, they must match.
