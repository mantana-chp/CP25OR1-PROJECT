# AI Symptom Severity Context Request Feature

## Overview
This feature allows the AI chatbot to request additional context from users about symptom severity when discussing pet health issues. Instead of the AI asking text-based questions, an interactive UI component appears inline in the chat, making it easier for users to provide structured severity information.

## Implementation Status
✅ **Frontend Implementation Complete**

## How It Works

### 1. User Flow
1. User asks about pet illness symptoms (e.g., "น้องหมาอาเจียน")
2. AI analyzes the query and determines it needs severity information
3. AI responds with a JSON payload containing special flags
4. Frontend detects the flags and displays a **Severity Scale Widget** inline
5. User selects severity level (1-5, with emoji faces)
6. Frontend sends severity context back to AI automatically
7. AI analyzes with the severity context and provides personalized advice

### 2. Frontend Components

#### Updated Files:
- **`frontend/src/domain/chatbot.domain.ts`**
  - Extended `ChatResponse` interface with optional fields:
    - `requires_user_input?: boolean`
    - `input_type?: 'severity_scale'`
    - `metadata?: { prompt?: string, context?: string }`
  - Added `SeverityLevel` type (1-5)
  - Added `SeverityContext` interface

- **`frontend/src/presentation/chatbot/pages/chatbot_page.tsx`**
  - Extended `Message` interface with:
    - `requiresSeverityInput?: boolean`
    - `severityPrompt?: string`
    - `awaitingSeverity?: boolean`
  - Added `handleSeveritySelect()` function to process user's severity selection
  - Updated message rendering to show SeverityScaleWidget conditionally
  - Automatically sends severity context back to AI as a formatted message

- **`frontend/src/presentation/chatbot/components/severity_scale_widget.tsx`** (NEW)
  - Interactive UI component with 5 severity levels
  - Each level has emoji face, label, description, and color coding:
    - Level 1 (😊): เล็กน้อย - Green
    - Level 2 (🙂): ปานกลาง - Lime
    - Level 3 (😐): ค่อนข้างรุนแรง - Amber
    - Level 4 (😟): รุนแรง - Orange  
    - Level 5 (😰): รุนแรงมาก - Red
  - Visual feedback on selection
  - Disabled state during AI processing
  - Customizable prompt text

### 3. Data Flow

```
User Query → Backend API
              ↓
         AI Analysis
              ↓
    Response with Flags
              ↓
  Frontend Detects Flags
              ↓
 Shows Severity Widget
              ↓
   User Selects Level
              ↓
Frontend Sends Context → Backend API
              ↓
         AI Analysis
              ↓
    Personalized Response
```

### 4. Backend Requirements (To Be Implemented)

#### API Response Format
When the AI determines it needs severity information, the backend should return:

```typescript
{
  "data": {
    "answer": "ขอทราบความรุนแรงของอาการเพื่อให้คำแนะนำได้แม่นยำค่ะ",
    "requires_user_input": true,
    "input_type": "severity_scale",
    "metadata": {
      "prompt": "กรุณาเลือกระดับความรุนแรงของอาการอาเจียน",
      "context": "vomiting_severity"
    }
  }
}
```

#### Severity Context Format
When user selects severity, frontend sends back:
```
"[ระดับความรุนแรงของอาการ: 3/5 - ค่อนข้างรุนแรง]"
```

#### AI Prompt Design (Backend)
The backend needs to configure the AI (Gemini Function Calling or custom logic) to:

1. **Detect symptom queries** that require severity assessment:
   - วัดไข้, อาเจียน, ท้องเสีย, บาดเจ็บ, ไอ, etc.

2. **Return structured response**:
   ```javascript
   if (query.includes('symptom keywords')) {
     return {
       answer: "ขอทราบความรุนแรงของอาการเพื่อให้คำแนะนำได้แม่นยำค่ะ",
       requires_user_input: true,
       input_type: "severity_scale",
       metadata: {
         prompt: "กรุณาเลือกระดับความรุนแรงของอาการ",
         context: "symptom_type"
       }
     }
   }
   ```

3. **Process severity context** in follow-up query:
   - Extract severity level from the formatted message
   - Use it to determine urgency and recommendations
   - Example logic:
     - Level 1-2: General advice, monitor at home
     - Level 3-4: Suggest vet consultation
     - Level 5: Urgent vet visit recommendation

#### Example Backend Implementation (Express + Gemini)

```typescript
// In ai-chat-controller.ts or ai-chat-service.ts

const analyzeQuery = async (query: string, petId?: string) => {
  // Check if query is about symptoms
  const symptomKeywords = ['อาเจียน', 'ท้องเสีย', 'ไข้', 'บาดเจ็บ', 'ไอ', 'จาม']
  const needsSeverity = symptomKeywords.some(keyword => 
    query.toLowerCase().includes(keyword)
  )
  
  // Check if query already contains severity context
  const hasSeverity = query.includes('[ระดับความรุนแรงของอาการ:')
  
  if (needsSeverity && !hasSeverity) {
    // Request severity input
    return {
      answer: "ขอทราบความรุนแรงของอาการเพื่อให้คำแนะนำได้แม่นยำค่ะ",
      requires_user_input: true,
      input_type: "severity_scale",
      metadata: {
        prompt: "กรุณาเลือกระดับความรุนแรงของอาการ",
        context: "symptom_severity"
      }
    }
  }
  
  // Extract severity if present
  let severityLevel = null
  if (hasSeverity) {
    const match = query.match(/\[ระดับความรุนแรงของอาการ: (\d)\/5/)
    if (match) {
      severityLevel = parseInt(match[1])
    }
  }
  
  // Generate AI response with severity context
  const prompt = severityLevel 
    ? `User query: ${query}\nSeverity Level: ${severityLevel}/5\nProvide advice based on severity.`
    : query
    
  const aiResponse = await callGeminiAPI(prompt, petId)
  
  return {
    answer: aiResponse,
    requires_user_input: false
  }
}
```

### 5. Testing the Feature

#### Test Scenario 1: Symptom Query Triggers Widget
1. Open chatbot
2. Type: "น้องหมาอาเจียน"
3. **Expected**: AI asks for severity, widget appears
4. Select severity level
5. **Expected**: Widget disappears, AI provides advice based on severity

#### Test Scenario 2: Regular Query (No Widget)
1. Type: "อาหารสุนัขแบบไหนดี"
2. **Expected**: Normal text response, no widget

#### Test Scenario 3: Multiple Selections
1. Ask about vomiting → select severity → get advice
2. Ask about different symptom → select different severity
3. **Expected**: Each widget functions independently

## UI/UX Consideration

### Visual Design
- Widget has distinct styling to stand out from chat bubbles
- Color-coded severity levels for quick recognition
- Emoji faces for intuitive understanding
- Smooth transitions and visual feedback

### User Experience
- Widget appears only when needed
- Cannot send new messages while widget is active (waiting for selection)
- Selection automatically triggers AI response
- Clear indication that info helps AI provide better advice

### Accessibility
- Large touch targets (48px height per button)
- High contrast colors
- Clear labels in Thai language
- Visual feedback on selection

## Future Enhancements
1. Add more input types:
   - Duration scale (เกิดขึ้นมานานเท่าไหร่)
   - Frequency scale (บ่อยแค่ไหน)
   - Yes/No quick responses
2. Add animation for widget appearance
3. Save severity selections in conversation history
4. Allow editing severity selection
5. Multi-language support

## Technical Notes
- Widget state is managed per message (using message.id)
- Once user selects, widget is hidden (awaitingSeverity: false)
- Severity context is sent as formatted string, backend parses it
- No additional database schema changes needed
- Works with existing chat API structure

## Dependencies
No new packages required. Uses existing:
- React Native core components
- Lucide React Native (already installed)
- TypeScript interfaces

---

**Implementation Date**: March 3, 2026  
**Status**: Frontend Complete, Backend Pending  
**Next Steps**: Implement backend AI logic to return structured responses
