import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { z } from 'zod'
import { config } from '../../config'
import { logger } from '../../libs/logger'
import {
  DetectedPattern,
  AIInsightGenerationInput,
  AIGeneratedInsight,
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
      return `เจ้าของไม่ได้บันทึกข้อมูลสุขภาพมาเป็นเวลา ${pattern.daysSinceLastLog} วัน (บันทึกครั้งล่าสุด: ${pattern.lastLogDate ? pattern.lastLogDate.toLocaleDateString('th-TH') : 'ไม่มีข้อมูล'})`

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
คุณเป็นสัตวแพทย์ผู้เชี่ยวชาญที่ให้คำแนะนำอย่างเป็นกันเอง กรุณาวิเคราะห์สถานการณ์และให้คำแนะนำแบบเป็นกันเอง

**ข้อมูลสัตว์เลี้ยง:**
- ชื่อ: ${petName}
- สายพันธุ์: ${species}${breed ? ` - ${breed}` : ''}

**สถานการณ์:**
${contextDescription}

**งานของคุณ:**
1. สร้างข้อความแจ้งเตือนสั้น ๆ (Title) - ภาษาไทย, เป็นกันเอง, ชัดเจน, รวมชื่อสัตว์เลี้ยง, ไม่เกิน 100 ตัวอักษร
2. สร้างคำอธิบายและคำแนะนำ (Description) - ชัดเจน กระชับ ไม่เกิน 3 ประโยค, ให้คำแนะนำที่ปฏิบัติได้จริง

**กฎสำคัญ:**
- ต้องเป็นภาษาไทยทั้งหมด
- ใช้คำพูดที่เป็นกันเอง ไม่เป็นทางการจนเกินไป
- ระบุชื่อสัตว์เลี้ยงใน Title
- สำหรับอาการรุนแรง: เน้นย้ำให้พบสัตวแพทย์โดยเร็ว
- สำหรับอาการเบา: ให้คำแนะนำติดตามและเฝ้าระวัง
- ห้ามมีข้อความที่ทำให้ตื่นตระหนักเกินไป แต่ต้องชัดเจนเกี่ยวกับความเสี่ยง

**ตัวอย่าง Output ที่ดี:**
- Title: "⚠️ บลูมีอาการซึมเซาต่อเนื่อง 3 วัน"
- Description: "Golden Retriever อย่างบลูควรกระตือรือร้นและร่าเริง หากซึมเซาต่อเนื่อง อาจเป็นสัญญาณของไข้ ปัญหาทางเดินอาหาร หรือความเจ็บปวด แนะนำให้สังเกตความกระหายน้ำ อาเจียน ถ่ายเหลว และพาพบสัตวแพทย์หากอาการไม่ดีขึ้น"

ตอบเป็น JSON เท่านั้น:
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
      return {
        title: `📝 อย่าลืมอัปเดตอาการของ ${petName} วันนี้`,
        description: `ไม่ได้บันทึกข้อมูลสุขภาพของ ${petName} มา ${(pattern as NoRecentLogsPattern).daysSinceLastLog} วันแล้ว การบันทึกสม่ำเสมอช่วยติดตามสุขภาพได้ดีขึ้น`,
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
