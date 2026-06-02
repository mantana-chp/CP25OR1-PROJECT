# Backend Implementation Guide - Severity Scale Feature

## Quick Start

### 1. Update ChatResponse Interface

In `backend/src/features/ai-chat/ai-chat-schema.ts`:

```typescript
import { z } from 'zod';

export const chatResponseSchema = z.object({
  answer: z.string(),
  requires_user_input: z.boolean().optional(),
  input_type: z.enum(['severity_scale']).optional(),
  metadata: z.object({
    prompt: z.string().optional(),
    context: z.string().optional()
  }).optional()
});

export type ChatResponseData = z.infer<typeof chatResponseSchema>;
```

### 2. Update AI Service Logic

In `backend/src/features/ai-chat/ai-chat-service.ts`:

```typescript
// Add symptom detection
const SYMPTOM_KEYWORDS = [
  'อาเจียน', 'vomit', 'ท้องเสีย', 'diarrhea',
  'ไข้', 'fever', 'ไอ', 'cough',
  'จาม', 'sneeze', 'เป็นแผล', 'wound',
  'บาดเจ็บ', 'injury', 'เลือดออก', 'bleeding',
  'ชัก', 'seizure', 'หายใจลำบาก', 'breathing difficulty'
];

// Detect if query needs severity assessment
const needsSeverityAssessment = (query: string): boolean => {
  const lowerQuery = query.toLowerCase();
  return SYMPTOM_KEYWORDS.some(keyword => 
    lowerQuery.includes(keyword.toLowerCase())
  );
};

// Check if query already has severity context
const hasSeverityContext = (query: string): boolean => {
  return query.includes('[ระดับความรุนแรงของอาการ:');
};

// Extract severity level from context
const extractSeverityLevel = (query: string): number | null => {
  const match = query.match(/\[ระดับความรุนแรงของอาการ: (\d)\/5/);
  return match ? parseInt(match[1]) : null;
};

// Main chat handler
export const handleChatQuery = async (
  query: string,
  petId?: string
): Promise<ChatResponseData> => {
  
  // Step 1: Check if we need to request severity
  if (needsSeverityAssessment(query) && !hasSeverityContext(query)) {
    return {
      answer: "ขอทราบความรุนแรงของอาการเพื่อให้คำแนะนำได้แม่นยำยิ่งขึ้นค่ะ 🩺",
      requires_user_input: true,
      input_type: "severity_scale",
      metadata: {
        prompt: "กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น",
        context: "symptom_severity_assessment"
      }
    };
  }

  // Step 2: Extract severity if present
  const severityLevel = extractSeverityLevel(query);
  
  // Step 3: Build context for AI
  let enhancedPrompt = query;
  let systemContext = "";
  
  if (severityLevel) {
    // Remove severity marker from query for cleaner AI input
    enhancedPrompt = query.replace(/\[ระดับความรุนแรงของอาการ:.*?\]\s*/g, '');
    
    // Add severity context to system prompt
    systemContext = `
      Severity Level: ${severityLevel}/5
      Urgency: ${getUrgencyLevel(severityLevel)}
      Context: User has indicated symptom severity as level ${severityLevel} out of 5.
      
      Based on this severity level:
      - Level 1-2: Provide general advice and home care tips
      - Level 3: Recommend monitoring and consider vet consultation
      - Level 4-5: Strongly recommend immediate veterinary attention
    `;
  }

  // Step 4: Call Gemini API with enhanced context
  const aiResponse = await callGeminiWithContext(
    enhancedPrompt,
    systemContext,
    petId
  );

  return {
    answer: aiResponse,
    requires_user_input: false
  };
};

// Helper: Get urgency description
const getUrgencyLevel = (severity: number): string => {
  if (severity <= 2) return "Low - Monitor at home";
  if (severity === 3) return "Moderate - Consider vet consultation";
  if (severity === 4) return "High - Recommend vet visit";
  return "Critical - Urgent vet attention needed";
};

// Gemini API call with severity context
const callGeminiWithContext = async (
  query: string,
  severityContext: string,
  petId?: string
): Promise<string> => {
  // Get pet info if available
  let petInfo = "";
  if (petId) {
    const pet = await getPetById(petId);
    if (pet) {
      petInfo = `
        Pet Information:
        - Name: ${pet.pet_name}
        - Species: ${pet.species}
        - Breed: ${pet.breed || 'Unknown'}
        - Age: ${calculateAge(pet.date_of_birth)}
        - Gender: ${pet.gender}
      `;
    }
  }

  const systemPrompt = `
    You are a knowledgeable pet health AI assistant.
    ${petInfo}
    ${severityContext}
    
    Provide helpful, accurate advice in Thai language.
    Always remind users that you're an AI and serious cases should see a vet.
  `;

  // Call Gemini API (existing implementation)
  const response = await geminiClient.generateContent({
    contents: [
      { role: 'system', parts: [{ text: systemPrompt }] },
      { role: 'user', parts: [{ text: query }] }
    ]
  });

  return response.text;
};
```

### 3. Example: Gemini Function Calling Setup

If using Gemini's function calling feature:

```typescript
const tools = [
  {
    name: "request_symptom_severity",
    description: "Request severity level from user when discussing health symptoms",
    parameters: {
      type: "object",
      properties: {
        symptom_type: {
          type: "string",
          description: "Type of symptom (vomiting, fever, injury, etc.)"
        },
        prompt_message: {
          type: "string",
          description: "Custom prompt for user in Thai"
        }
      },
      required: ["symptom_type"]
    }
  }
];

// In Gemini request
const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: query }] }],
  tools: tools
});

// Check for function call
if (result.functionCall?.name === "request_symptom_severity") {
  return {
    answer: result.functionCall.args.prompt_message || 
            "ขอทราบความรุนแรงของอาการค่ะ",
    requires_user_input: true,
    input_type: "severity_scale",
    metadata: {
      prompt: result.functionCall.args.prompt_message,
      context: result.functionCall.args.symptom_type
    }
  };
}
```

### 4. Test Cases

#### Test Case 1: Symptom Query Without Severity
**Request:**
```json
{
  "query": "น้องหมาอาเจียน",
  "petId": "uuid-here"
}
```

**Expected Response:**
```json
{
  "data": {
    "answer": "ขอทราบความรุนแรงของอาการเพื่อให้คำแนะนำได้แม่นยำยิ่งขึ้นค่ะ 🩺",
    "requires_user_input": true,
    "input_type": "severity_scale",
    "metadata": {
      "prompt": "กรุณาเลือกระดับความรุนแรงของอาการที่สังเกตเห็น",
      "context": "symptom_severity_assessment"
    }
  }
}
```

#### Test Case 2: Severity Context Provided
**Request:**
```json
{
  "query": "[ระดับความรุนแรงของอาการ: 4/5 - รุนแรง]",
  "petId": "uuid-here"
}
```

**Expected Response:**
```json
{
  "data": {
    "answer": "จากระดับความรุนแรง 4/5 ที่คุณระบุ แนะนำให้พาน้องหมาไปพบสัตวแพทย์โดยเร็วค่ะ อาการอาเจียนที่รุนแรงอาจเป็นสัญญาณของปัญหาสุขภาพที่ต้องได้รับการรักษา...",
    "requires_user_input": false
  }
}
```

#### Test Case 3: Regular Query (No Severity Needed)
**Request:**
```json
{
  "query": "อาหารสุนัขแบบไหนดี",
  "petId": "uuid-here"
}
```

**Expected Response:**
```json
{
  "data": {
    "answer": "อาหารสุนัขที่ดีควรมีโปรตีนคุณภาพสูง...",
    "requires_user_input": false
  }
}
```

### 5. Environment Variables

Add to `.env`:
```env
# AI Feature Flags
ENABLE_SEVERITY_ASSESSMENT=true
SEVERITY_KEYWORDS=อาเจียน,ท้องเสีย,ไข้,ไอ,จาม,เป็นแผล,บาดเจ็บ
```

### 6. Logging

Add logging for debugging:

```typescript
console.log('[AI Chat] Query:', query);
console.log('[AI Chat] Needs severity?', needsSeverityAssessment(query));
console.log('[AI Chat] Has severity?', hasSeverityContext(query));
if (severityLevel) {
  console.log('[AI Chat] Severity level:', severityLevel);
  console.log('[AI Chat] Urgency:', getUrgencyLevel(severityLevel));
}
```

### 7. Error Handling

```typescript
try {
  const response = await handleChatQuery(query, petId);
  return res.json({ data: response });
} catch (error) {
  console.error('[AI Chat] Error:', error);
  
  // Fallback response
  return res.json({
    data: {
      answer: "ขออภัยค่ะ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง",
      requires_user_input: false
    }
  });
}
```

## Testing Checklist

- [ ] Symptom query triggers severity request
- [ ] Non-symptom query works normally
- [ ] Severity context is parsed correctly
- [ ] AI provides appropriate advice based on severity
- [ ] Error cases handled gracefully
- [ ] Pet context is included when available
- [ ] Thai language responses are natural
- [ ] Logging works for debugging

## Deployment Notes

1. Deploy backend changes first
2. Test with Postman/API client
3. Frontend already supports the feature
4. Monitor logs for any issues
5. Adjust keyword list based on user queries

---

**Last Updated**: March 3, 2026  
**Version**: 1.0  
**Status**: Ready for implementation
