import {
  ChatRequest,
  ChatResponse,
  HistoryItem
} from '@/src/domain/chatbot.domain'
import { apiClient } from '../api_client'

export const chatbotService = {
  sendMessage: async (
    query: string,
    resolvedPetId?: string,
    history?: HistoryItem[]
  ) => {
    const requestBody: ChatRequest = {
      query,
      resolvedPetId,
      history
    }

    return apiClient.post<{ data: ChatResponse }>('/v1/ai-chat', requestBody)
  }
}
