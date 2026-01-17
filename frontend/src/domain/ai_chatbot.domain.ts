export interface ChatMessage {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: Date
  isLoading?: boolean
}

export interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
}

export interface AIChatResponse {
  message: string
  conversationId?: string
}
