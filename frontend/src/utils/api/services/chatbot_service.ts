import { ChatRequest, ChatResponse } from '@/src/domain/chatbot.domain'
import { apiClient } from '../api_client'

export const chatbotService = {
  sendMessage: async (query: string, resolvedPetId?: string) => {
    const requestBody: ChatRequest = {
      query,
      resolvedPetId
    }

    return apiClient.post<{ data: ChatResponse }>('/v1/ai-chat', requestBody)
  }
}
