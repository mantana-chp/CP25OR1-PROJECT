export interface ChatRequest {
  resolvedPetId?: string
  query: string
}

export interface ChatResponse {
  answer: string
  resolvedPetId?: string
  requires_user_input?: boolean
  input_type?: 'severity_scale'
  metadata?: {
    prompt?: string
    context?: string
  }
}

export type SeverityLevel = 1 | 2 | 3 | 4 | 5

export interface SeverityContext {
  level: SeverityLevel
  label: string
}