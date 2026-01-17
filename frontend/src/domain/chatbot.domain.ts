export interface ChatRequest {
  petId?: string
  query: string
}

export interface ChatResponse {
  answer: string
}