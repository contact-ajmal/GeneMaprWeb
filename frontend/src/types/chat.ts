export interface ChatSource {
  variant_id: string
  gene: string | null
  relevance: string | null
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  timestamp: number
  error?: boolean
}

export interface ChatRequest {
  message: string
  session_id: string
  variant_context: boolean
}

export interface ChatResponse {
  reply: string
  sources: ChatSource[]
  session_id: string
}

export interface SuggestionItem {
  text: string
  category: string
}

export interface SuggestionsResponse {
  suggestions: SuggestionItem[]
}
