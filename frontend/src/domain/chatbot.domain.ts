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

export type SeverityLevel = 1 | 2 | 3 | 4 | 5

export interface SeverityContext {
  level: SeverityLevel
  label: string
}
