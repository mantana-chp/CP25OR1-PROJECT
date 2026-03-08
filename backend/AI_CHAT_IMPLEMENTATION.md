# AI Chat Feature — Pet Name Detection Implementation

**Last Updated:** March 5, 2026  
**Status:** Completed

---

## 📖 อธิบายการทำงาน (Thai Explanation)

### ภาพรวม

ฟีเจอร์ AI Chat ใช้ระบบ RAG (Retrieval-Augmented Generation) โดยมีการเพิ่มระบบตรวจจับชื่อสัตว์เลี้ยงแบบอัจฉริยะเข้าไป เพื่อให้ AI สามารถเข้าใจได้ว่าผู้ใช้กำลังถามเรื่องสัตว์เลี้ยงตัวไหน โดยไม่ต้องให้ผู้ใช้เลือกหรือระบุ Pet ID เองทุกครั้ง

### ปัญหาเดิม

เดิมทีระบบกำหนดให้ Frontend ส่ง `petId` มาใน Request body ทุกครั้ง ซึ่งหมายความว่าผู้ใช้ต้องเลือกสัตว์เลี้ยงล่วงหน้าก่อนเริ่มคุย ไม่เป็นธรรมชาติและ UX ไม่ดี

### วิธีแก้ปัญหา — ระบบตรวจจับชื่อ 3 ชั้น

ระบบจะวิเคราะห์ข้อความที่ผู้ใช้พิมพ์มาเพื่อหาว่ากำลังพูดถึงสัตว์เลี้ยงตัวไหน โดยทำงาน 3 ขั้นตอนเรียงลำดับต้นทุน:

---

#### ชั้นที่ 1 — Exact Match (จับคู่ตรง ๆ)

เปรียบเทียบข้อความโดยตรงว่ามีชื่อสัตว์เลี้ยงอยู่ในประโยคหรือไม่ (case-insensitive)

```
ผู้ใช้พิมพ์: "บลูป่วยไหม"
ชื่อสัตว์เลี้ยงในระบบ: ["บลู", "เหมียว"]
ผล: พบ "บลู" → ✅ จับคู่สำเร็จ
```

- **ต้นทุน:** แทบไม่มี (O(n) string scan)
- **ทำงานทุก request** ไม่มีการ skip

---

#### ชั้นที่ 2 — Fuzzy Match (จับคู่แบบยืดหยุ่น ด้วย Levenshtein)

ใช้ **Levenshtein Distance** — อัลกอริทึมที่นับว่าต้องแก้ไขกี่ตัวอักษรถึงจะเปลี่ยนคำหนึ่งเป็นอีกคำ
ใช้ Sliding Window เลื่อนไปทั่วข้อความเพื่อหาส่วนที่ใกล้เคียงกับชื่อสัตว์เลี้ยง

```
ผู้ใช้พิมพ์: "บลุป่วยไหม"  (พิมพ์ผิด ไม่มีไม้โท)
ชื่อสัตว์เลี้ยง: "บลู" (ยาว 3 ตัวอักษร → threshold = 1)
Window "บลุ" → distance("บลุ", "บลู") = 1 ≤ 1 → ✅ จับคู่สำเร็จ
```

**Threshold แบบ Dynamic:**
- ชื่อยาว ≤ 3 ตัวอักษร → ยอมรับความผิดพลาดได้ **1 ตัว** (เช่น "บลุ" → "บลู")
- ชื่อยาว > 3 ตัวอักษร → ยอมรับความผิดพลาดได้ **2 ตัว** (เช่น "อู้ดด" → "อู๊ด")

- **ต้นทุน:** แทบไม่มี (ไม่มี API call)
- **ทำงานทุก request** ไม่มีการ skip

---

#### ชั้นที่ 3 — LLM Entity Extraction (ให้ AI ช่วยจับ)

หาก Layer 1 และ 2 หาไม่พบ และยังไม่มี `resolvedPetId` ในเซสชัน (ข้อความแรกสุด) ระบบจะส่ง **prompt เล็ก ๆ** ไปถาม Gemini เป็นการเฉพาะเพื่อให้ช่วยระบุว่าผู้ใช้กำลังพูดถึงสัตว์เลี้ยงตัวไหน

```
ระบบส่ง prompt ว่า:
"Pet names: บลู, เหมียว, เจ๋ง
 User message: "Blue ป่วยไหม"
 Reply with ONLY the pet name or null."

Gemini ตอบ: "บลู"
ระบบจับคู่กลับ → ✅ พบสัตว์เลี้ยง
```

ฟีเจอร์นี้รองรับกรณีที่ Layer 1 และ 2 ไม่สามารถจัดการได้ เช่น:
- ชื่อภาษาไทย แต่ผู้ใช้พิมพ์เป็นอังกฤษ (`"Blue"` → `"บลู"`)
- ผู้ใช้เรียกสัตว์เลี้ยงด้วย nickname ที่ไม่ตรงกับชื่อในระบบ
- การอ้างอิงทางอ้อม (เช่น `"หมาของฉัน"` เมื่อผู้ใช้มีสุนัขตัวเดียว)

- **ต้นทุน:** เรียก Gemini 1 ครั้ง (~300–600ms)
- **ทำงานเฉพาะ** เมื่อ L1 + L2 พลาดทั้งคู่ **และ** ยังไม่มี `resolvedPetId` ในเซสชัน

---

### Session Management — resolvedPetId

ระบบใช้ `resolvedPetId` เป็นตัวจำสถานะเซสชันฝั่ง Frontend:

**หลักการทำงาน:**
1. Frontend เก็บ `resolvedPetId` ใน React `useState` (ชีวิตของ state = ชีวิตของหน้าจอ Chat)
2. ทุก request ส่ง `resolvedPetId` ล่าสุดมาด้วย (หรือ `undefined` ถ้ายังไม่มี)
3. Server ตอบกลับพร้อม `resolvedPetId` เสมอ (ตัวที่ตรวจพบ หรือตัวเดิมถ้าไม่เปลี่ยน)
4. Frontend อัปเดต state ด้วยค่าใหม่จาก response ทุกครั้ง

**การเปลี่ยนสัตว์เลี้ยงกลางคุย:**
Layer 1 และ 2 ทำงาน **ทุก request เสมอ** โดยไม่ skip แม้ว่าจะมี `resolvedPetId` แล้ว ดังนั้นหากผู้ใช้พูดถึงสัตว์เลี้ยงตัวอื่น ระบบจะตรวจพบและอัปเดต `resolvedPetId` ใหม่ทันที โดยไม่ต้องเรียก Layer 3 เลย

```
ข้อความ 1: "บลูเป็นยังไงบ้าง"
  → L1 พบ "บลู" → resolvedPetId = uuid-blue (ส่งกลับ Frontend)

ข้อความ 2: "เขากินอะไรได้บ้าง"
  → L1+L2 ไม่พบชื่อสัตว์เลี้ยงใหม่
  → มี resolvedPetId=uuid-blue → ข้าม L3
  → ตอบโดยใช้ข้อมูลบลูต่อไป

ข้อความ 3: "แล้วเจ๋งล่ะ"
  → L1 พบ "เจ๋ง" → resolvedPetId เปลี่ยนเป็น uuid-jeng (ส่งกลับ Frontend)

ข้อความ 4: "เขาควรกินอะไร"
  → L1+L2 ไม่พบชื่อใหม่ → ใช้ uuid-jeng ต่อ
```

---

### สรุปการไหลของข้อมูล

```
POST /v1/ai-chat  { query, resolvedPetId? }
         │
         ▼ authGuard → ดึง userId จาก JWT
         │
         ▼ ดึง pets ทั้งหมดของ user จาก DB (status = ACTIVE)
         │
         ├─ [ทุก request] Layer 1: Exact match
         ├─ [ทุก request] Layer 2: Levenshtein fuzzy match
         │         │
         │    พบสัตว์เลี้ยงใหม่ → ใช้ตัวนั้น (อาจเปลี่ยนจากเดิม)
         │         │
         │    ไม่พบ + มี resolvedPetId → ใช้ตัวเดิม ข้าม L3
         │         │
         │    ไม่พบ + ไม่มี resolvedPetId → Layer 3: LLM Extraction
         │
         ▼ buildPetContext() → ดึงข้อมูล pet profile จาก DB
         │
         ▼ RAG retrieval จาก Pinecone
         │
         ▼ สร้าง Prompt + เรียก Gemini
         │
         ▼ Response: { answer, resolvedPetId? }
```

---

## 📁 Files Changed

| File | การเปลี่ยนแปลง |
|------|---------------|
| `ai-chat-name-matcher.ts` *(ใหม่)* | ฟังก์ชัน Levenshtein, exactMatch, fuzzyMatch, detectPetInQuery |
| `ai-chat-schema.ts` | เปลี่ยน `petId` → `resolvedPetId?: string (uuid)` |
| `ai-chat-controller.ts` | อ่าน `userId` จาก `req.user!` แทน body, ส่ง `resolvedPetId` ผ่านไปยัง service |
| `ai-chat-service.ts` | Signature ใหม่, แยก `buildPetContext()`, เพิ่ม `extractPetWithLLM()`, return `{ answer, resolvedPetId }` |

---

## 🖥️ Frontend Implementation

### API Contract

**Request:**
```typescript
POST /v1/ai-chat
Authorization: Bearer <token>
X-Installation-Id: <installationId>

{
  "query": string,           // required — ข้อความที่ผู้ใช้พิมพ์
  "resolvedPetId"?: string   // optional — uuid จากเซสชันก่อนหน้า
}
```

**Response:**
```typescript
{
  "data": {
    "answer": string,           // คำตอบจาก AI
    "resolvedPetId"?: string    // uuid ของสัตว์เลี้ยงที่ตรวจพบ (undefined ถ้าไม่พบ)
  }
}
```

---

### State Management

ใช้ `useState` เก็บ `resolvedPetId` ในหน้าจอ Chat เพียงตัวเดียว State นี้จะหายไปเมื่อผู้ใช้ปิดแอปหรือออกจากหน้า Chat ซึ่งเป็นพฤติกรรมที่ต้องการ (เซสชันหมดอายุเมื่อปิดแอป)

```typescript
const [resolvedPetId, setResolvedPetId] = useState<string | undefined>(undefined);
```

---

### Service Function

```typescript
// src/utils/api/services/ai_chat_service.ts

import { apiClient } from '../api_client';

export type AIChatRequest = {
  query: string;
  resolvedPetId?: string;
};

export type AIChatResponse = {
  answer: string;
  resolvedPetId?: string;
};

export const aiChatService = {
  sendMessage: async (payload: AIChatRequest): Promise<AIChatResponse> => {
    const response = await apiClient.post<{ data: AIChatResponse }>(
      '/v1/ai-chat',
      payload
    );
    return response.data.data;
  },
};
```

---

### Hook

```typescript
// src/hooks/useAIChat.ts

import { useState, useCallback } from 'react';
import { aiChatService } from '../utils/api/services/ai_chat_service';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export const useAIChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resolvedPetId, setResolvedPetId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (query: string) => {
    if (!query.trim()) return;

    // Append user message immediately
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = await aiChatService.sendMessage({
        query,
        resolvedPetId, // send current session pet (undefined on first message)
      });

      // Always overwrite resolvedPetId with whatever server returns.
      // - New pet detected → server returns new uuid → state updates
      // - Same pet continuing → server echoes same uuid → no change
      // - No pet in query → server returns undefined → state resets to undefined
      setResolvedPetId(result.resolvedPetId);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedPetId]);

  return { messages, sendMessage, isLoading, resolvedPetId };
};
```

---

### Screen Component (Example)

```typescript
// src/app/ai-chat/index.tsx

import React, { useState } from 'react';
import { View, TextInput, FlatList, Pressable, Text } from 'react-native';
import { useAIChat } from '../../hooks/useAIChat';

export default function AIChatScreen() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, isLoading, resolvedPetId } = useAIChat();

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    await sendMessage(trimmed);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Optional debug indicator — remove in production */}
      {resolvedPetId && (
        <Text style={{ fontSize: 12, color: 'gray', padding: 8 }}>
          🐾 กำลังคุยเรื่องสัตว์เลี้ยง: {resolvedPetId.slice(0, 8)}...
        </Text>
      )}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{
            alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: item.role === 'user' ? '#DCF8C6' : '#F0F0F0',
            margin: 8,
            padding: 12,
            borderRadius: 12,
            maxWidth: '80%',
          }}>
            <Text>{item.content}</Text>
          </View>
        )}
      />

      <View style={{ flexDirection: 'row', padding: 8 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="ถามเรื่องสุขภาพสัตว์เลี้ยง..."
          style={{ flex: 1, borderWidth: 1, borderRadius: 20, padding: 8 }}
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          disabled={isLoading}
          style={{ marginLeft: 8, justifyContent: 'center' }}
        >
          <Text style={{ color: isLoading ? 'gray' : '#007AFF' }}>
            {isLoading ? '...' : 'ส่ง'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
```

---

### Session Lifecycle

```
ผู้ใช้เปิดหน้า Chat
     │
     ▼ resolvedPetId = undefined  (useState init)

ข้อความที่ 1: "บลุป่วยไหม"
  Request:  { query: "บลุป่วยไหม", resolvedPetId: undefined }
  Response: { answer: "...", resolvedPetId: "uuid-blue" }
  → setResolvedPetId("uuid-blue")

ข้อความที่ 2: "เขากินอะไรได้"
  Request:  { query: "เขากินอะไรได้", resolvedPetId: "uuid-blue" }
  Response: { answer: "...", resolvedPetId: "uuid-blue" }
  → setResolvedPetId("uuid-blue")  ← เหมือนเดิม

ข้อความที่ 3: "แล้วเจ๋งล่ะ"
  Request:  { query: "แล้วเจ๋งล่ะ", resolvedPetId: "uuid-blue" }
  Response: { answer: "...", resolvedPetId: "uuid-jeng" }
  → setResolvedPetId("uuid-jeng")  ← เปลี่ยนเป็นเจ๋ง

ผู้ใช้ปิดแอป → React state ถูกทำลาย → resolvedPetId = undefined ในครั้งหน้า
```

---

### Things NOT Needed on Frontend

- ❌ ไม่ต้องเลือก Pet ก่อนเริ่มคุย
- ❌ ไม่ต้องจัดการ session timeout
- ❌ ไม่ต้องเก็บข้อมูลลง AsyncStorage
- ❌ ไม่ต้องส่ง `petId` ใน payload อีกต่อไป
