import { ChatRequest, ChatResponse } from '@/src/domain/chatbot.domain'
import { apiClient } from '../api_client'

export const chatbotService = {
  sendMessage: async (
    query: string,
    clientChatSessionId: string,
    options?: {
      resolvedPetId?: string
      contextId?: string
      severitySubmission?: ChatRequest['severitySubmission']
      petClarificationSubmission?: ChatRequest['petClarificationSubmission']
    }
  ) => {
    const requestBody: ChatRequest = {
      query,
      clientChatSessionId,
      ...options
    }

    return apiClient.post<{ data: ChatResponse }>('/v1/ai-chat', requestBody)
  }
}
