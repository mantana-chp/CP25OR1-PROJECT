import { ChatRequest, ChatResponse } from '@/src/domain/chatbot.domain'
import { apiClient } from '../api_client'

export const chatbotService = {
  sendMessage: async (query: string, petId?: string) => {
    const requestBody: ChatRequest = {
      query
    }

    if (petId) {
      requestBody.petId = petId
    }

    return apiClient.post<{ data: ChatResponse }>('/v1/ai-chat', requestBody)
  }
}
