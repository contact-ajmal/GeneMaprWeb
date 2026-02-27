import apiClient from './client'
import type { ChatRequest, ChatResponse, SuggestionsResponse } from '../types/chat'

export const sendChatMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  const response = await apiClient.post<ChatResponse>('/chat', request)
  return response.data
}

export const getChatSuggestions = async (): Promise<SuggestionsResponse> => {
  const response = await apiClient.get<SuggestionsResponse>('/chat/suggestions')
  return response.data
}

export const clearChatSession = async (sessionId: string): Promise<void> => {
  await apiClient.delete(`/chat/session/${sessionId}`)
}
