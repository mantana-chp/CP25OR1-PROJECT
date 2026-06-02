import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { z } from 'zod'
import { config } from '../../config'
import { logger } from '../../libs/logger'
import {
  DetectedPattern,
  AIInsightGenerationInput,
  AIGeneratedInsight,
  BatchInsightGenerationInput,
  BatchGeneratedInsight,
  RecurringSymptomPattern,
  AbnormalSymptomPattern,
  WeightAnomalyPattern,
  RecurringBehaviorPattern,
  NoRecentLogsPattern,
  FollowUpReminderPattern,
} from './health-insight-types'

// Initialize the LLM
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: config.google.apiKey,
  temperature: 0.7, // Balanced temperature for medical content
})

// Zod schema for AI response validation
const InsightResponseSchema = z.object({
  title: z.string(),
  description: z.string(),
})

/**
 * Builds context description for AI prompt based on pattern type.
 */
const buildPatternContextForPrompt = (pattern: DetectedPattern): string => {
  switch (pattern.type) {
    case 'RECURRING_SYMPTOM':
      return `สัตว์เลี้ยงมีอาการ "${pattern.symptom}" ซ้ำ ๆ ${pattern.count} ครั้ง ในช่วง 7 วันที่ผ่านมา (ครั้งแรก: ${pattern.firstOccurrence.toLocaleDateString('th-TH')}, ครั้งล่าสุด: ${pattern.lastOccurrence.toLocaleDateString('th-TH')})`

    case 'ABNORMAL_SYMPTOM':
      return `สัตว์เลี้ยงมีอาการรุนแรง: "${pattern.symptom}" (คำสำคัญ: ${pattern.keyword}) เมื่อ ${pattern.loggedAt.toLocaleDateString('th-TH')}`

    case 'RAPID_WEIGHT_LOSS':
      return `สัตว์เลี้ยงมีน้ำหนักลดลงอย่างรวดเร็ว ${pattern.changePercent.toFixed(1)}% ใน ${pattern.timeSpanDays} วัน (จาก ${pattern.previousWeight} kg → ${pattern.currentWeight} kg, ลด ${pattern.changeAmount.toFixed(1)} kg)`

    case 'RAPID_WEIGHT_GAIN':
      return `สัตว์เลี้ยงมีน้ำหนักเพิ่มขึ้นอย่างรวดเร็ว ${pattern.changePercent.toFixed(1)}% ใน ${pattern.timeSpanDays} วัน (จาก ${pattern.previousWeight} kg → ${pattern.currentWeight} kg, เพิ่ม ${pattern.changeAmount.toFixed(1)} kg)`

    case 'RECURRING_BEHAVIOR':
      return `สัตว์เลี้ยงมีพฤติกรรม "${pattern.behavior}" ซ้ำ ๆ ${pattern.count} ครั้ง ในช่วง 7 วันที่ผ่านมา`

    case 'NO_RECENT_LOGS':
      if (!pattern.lastLogDate) {
        return `สัตว์เลี้ยงยังไม่เคยมีการบันทึกข้อมูลสุขภาพเลย`
      }
      return `เจ้าของไม่ได้บันทึกข้อมูลสุขภาพมาเป็นเวลา ${pattern.daysSinceLastLog} วัน (บันทึกครั้งล่าสุด: ${pattern.lastLogDate.toLocaleDateString('th-TH')})`

    case 'FOLLOW_UP_REMINDER':
      return `สัตว์เลี้ยงมีอาการ "${pattern.symptom}" เมื่อ ${pattern.daysSinceSymptom} วันที่แล้ว และยังไม่ได้รับการติดตามอาการ`

    default:
      return 'มีข้อมูลสุขภาพที่ควรติดตาม'
  }
}

/**
 * Generates Thai insight message using Gemini AI.
 */
export const generateInsightWithAI = async (input: AIInsightGenerationInput): Promise<AIGeneratedInsight> => {
  const { petName, species, breed, pattern } = input
  const contextDescription = buildPatternContextForPrompt(pattern)

  const prompt = `
You are an expert veterinarian providing friendly health advice for pet owners. Analyze the situation and provide recommendations.

**Pet Information:**
- Name: ${petName}
- Species: ${species}${breed ? ` - ${breed}` : ''}

**Health Situation:**
${contextDescription}

**Your Task:**
1. Create a short alert message (Title) - **in Thai**, friendly, clear, include pet's name, max 100 characters (no emoji)
2. Create description and advice (Description) - **in Thai**, concise, max 3 sentences, actionable advice

**Important Rules:**
- **MUST output in Thai language (ภาษาไทย) for both title and description**
- Use friendly, conversational tone (not overly formal)
- Include pet's name in title
- For serious symptoms: emphasize seeing a vet urgently
- For mild symptoms: advise monitoring and observation
- Don't create excessive alarm, but be clear about risks
- Do NOT include emoji in title (system adds it automatically)

**Example Output Format:**
- Title: "บลูมีอาการซึมเซาต่อเนื่อง 3 วัน"
- Description: "Golden Retriever อย่างบลูควรกระตือรือร้นและร่าเริง หากซึมเซาต่อเนื่อง อาจเป็นสัญญาณของไข้ ปัญหาทางเดินอาหาร หรือความเจ็บปวด แนะนำให้สังเกตความกระหายน้ำ อาเจียน ถ่ายเหลว และพาพบสัตวแพทย์หากอาการไม่ดีขึ้น"

Respond ONLY with JSON (no other text):
{
  "title": "...",
  "description": "..."
}
`.trim()

  try {
    logger.info(`[InsightGeneration] Generating AI insight for pet ${petName} (pattern: ${pattern.type})`)
    logger.debug(`[InsightGeneration] Full AI prompt:\n${prompt}`)

    const llmWithJsonOutput = llm.withStructuredOutput(InsightResponseSchema)
    const response = await llmWithJsonOutput.invoke(prompt)

    logger.info(`[InsightGeneration] AI insight generated successfully for ${petName}`)
    logger.debug(`[InsightGeneration] AI response: ${JSON.stringify(response)}`)

    return {
      title: response.title,
      description: response.description,
    }
  } catch (error) {
    logger.error('[InsightGeneration] Error generating AI insight:', error as Error)

    // Fallback: Generate basic insight without AI
    return generateFallbackInsight(petName, pattern)
  }
}

/**
 * Generates a basic insight without AI (fallback when API fails).
 */
const generateFallbackInsight = (petName: string, pattern: DetectedPattern): AIGeneratedInsight => {
  switch (pattern.type) {
    case 'RECURRING_SYMPTOM':
      return {
        title: `⚠️ ${petName} มีอาการซ้ำ ๆ ${(pattern as RecurringSymptomPattern).count} ครั้ง`,
        description: `${petName} มีอาการ "${(pattern as RecurringSymptomPattern).symptom}" ซ้ำ ๆ ในช่วง 7 วันที่ผ่านมา แนะนำให้ติดตามอาการและปรึกษาสัตวแพทย์หากอาการไม่ดีขึ้น`,
      }

    case 'ABNORMAL_SYMPTOM':
      return {
        title: `🚨 ${petName} มีอาการรุนแรง ควรพบสัตวแพทย์`,
        description: `${petName} มีอาการ "${(pattern as AbnormalSymptomPattern).symptom}" ซึ่งอาจเป็นสัญญาณอันตราย แนะนำให้พาพบสัตวแพทย์โดยด่วน`,
      }

    case 'RAPID_WEIGHT_LOSS':
      return {
        title: `⚠️ ${petName} มีน้ำหนักลดลงเร็ว`,
        description: `${petName} มีน้ำหนักลด ${(pattern as WeightAnomalyPattern).changeAmount.toFixed(1)} kg ใน ${(pattern as WeightAnomalyPattern).timeSpanDays} วัน ควรตรวจสอบสุขภาพกับสัตวแพทย์`,
      }

    case 'RAPID_WEIGHT_GAIN':
      return {
        title: `⚠️ ${petName} มีน้ำหนักเพิ่มขึ้นเร็ว`,
        description: `${petName} มีน้ำหนักเพิ่ม ${(pattern as WeightAnomalyPattern).changeAmount.toFixed(1)} kg ใน ${(pattern as WeightAnomalyPattern).timeSpanDays} วัน ควรปรับอาหารและตรวจสุขภาพ`,
      }

    case 'RECURRING_BEHAVIOR':
      return {
        title: `💡 ${petName} มีพฤติกรรมผิดปกติซ้ำ ๆ`,
        description: `${petName} มีพฤติกรรม "${(pattern as RecurringBehaviorPattern).behavior}" ซ้ำ ๆ ${(pattern as RecurringBehaviorPattern).count} ครั้ง อาจมีปัญหาที่ต้องติดตาม`,
      }

    case 'NO_RECENT_LOGS':
      const noLogPattern = pattern as NoRecentLogsPattern
      if (!noLogPattern.lastLogDate) {
        return {
          title: `📝 มาเริ่มบันทึกสุขภาพของ ${petName} กันเถอะ`,
          description: `${petName} ยังไม่เคยมีการบันทึกข้อมูลสุขภาพเลย การบันทึกสุขภาพอย่างสม่ำเสมอจะช่วยให้คุณเข้าใจสุขภาพของน้อง ๆ ได้ดีขึ้นและสามารถดูแลได้อย่างเหมาะสม`,
        }
      }
      return {
        title: `📝 อย่าลืมอัปเดตอาการของ ${petName} วันนี้`,
        description: `ไม่ได้บันทึกข้อมูลสุขภาพของ ${petName} มา ${noLogPattern.daysSinceLastLog} วันแล้ว การบันทึกสม่ำเสมอช่วยติดตามสุขภาพได้ดีขึ้น`,
      }

    case 'FOLLOW_UP_REMINDER':
      return {
        title: `📋 ${petName} มีอาการเมื่อ ${(pattern as FollowUpReminderPattern).daysSinceSymptom} วันที่แล้ว อาการดีขึ้นหรือยัง?`,
        description: `${petName} มีอาการ "${(pattern as FollowUpReminderPattern).symptom}" เมื่อหลายวันที่แล้ว ช่วยบันทึกอาการปัจจุบันเพื่อติดตามว่าดีขึ้นหรือต้องพบสัตวแพทย์`,
      }

    default:
      return {
        title: `📌 ข้อมูลสุขภาพของ ${petName}`,
        description: `มีข้อมูลสุขภาพที่ควรติดตามสำหรับ ${petName}`,
      }
  }
}

// ─── Batch Generation (Like AI Tips) ────────────────────────────────────────

const BatchInsightSchema = z.object({
  userId: z.string(),
  petId: z.string(),
  title: z.string(),
  description: z.string(),
})

const BatchInsightsSchema = z.array(BatchInsightSchema)

/**
 * Generates health insights for multiple pets in a single AI batch request.
 * Similar to AI tips batch processing for cost efficiency.
 */
export const generateInsightsBatch = async (
  batch: BatchInsightGenerationInput[]
): Promise<BatchGeneratedInsight[]> => {
  if (batch.length === 0) {
    return []
  }

  const petsDataForPrompt = batch.map(item => ({
    userId: item.userId,
    petId: item.petId,
    petName: item.petName,
    species: item.species,
    breed: item.breed || 'mixed breed',
    patternType: item.pattern.type,
    patternContext: buildPatternContextForPrompt(item.pattern),
  }))

  const prompt = `
You are an expert veterinarian providing friendly health advice. Analyze each pet's health situation and give recommendations.

**Pet Data (${batch.length} pets):**
${JSON.stringify(petsDataForPrompt, null, 2)}

**Your Task:**
For each pet, generate:
1. **Title** - Short alert message **in Thai**, friendly, clear, include pet's name, max 100 characters (no emoji)
2. **Description** - Explanation and advice **in Thai**, concise, max 3 sentences, actionable recommendations

**Important Rules:**
- **MUST output in Thai language (ภาษาไทย) for both title and description**
- Use friendly, conversational tone (not overly formal)
- Include pet's name in title
- For serious symptoms: emphasize seeing a vet urgently
- For mild symptoms: advise monitoring and observation
- Don't create excessive alarm, but be clear about risks
- Do NOT include emoji in title (system adds it automatically)

**Respond with JSON Array ONLY (no other text):**
[
  {
    "userId": "user-id-from-input",
    "petId": "pet-id-from-input",
    "title": "Thai title without emoji",
    "description": "Thai description with advice"
  }
]
`.trim()

  try {
    logger.info(`[HealthInsightsBatch] Sending batch request to AI for ${batch.length} pets.`)
    logger.debug(`[HealthInsightsBatch] Full AI batch prompt:\n${prompt}`)

    const llmWithJsonOutput = llm.withStructuredOutput(BatchInsightsSchema)
    const response = await llmWithJsonOutput.invoke(prompt)

    logger.info(`[HealthInsightsBatch] AI batch response received. Generated ${response.length} insights.`)
    logger.debug(`[HealthInsightsBatch] AI batch raw response:\n${JSON.stringify(response, null, 2)}`)

    return response
  } catch (error) {
    logger.error('[HealthInsightsBatch] Error processing AI batch request:', error as Error)
    // Fallback: generate individually using fallback messages
    return batch.map(item => ({
      userId: item.userId,
      petId: item.petId,
      ...generateFallbackInsight(item.petName, item.pattern),
    }))
  }
}
