export interface ChatMessage {
  role: string
  content: string
  refusal: string | null
  reasoning: string | null
}

export interface ChatChoice {
  finishReason: string
  index: number
  message: ChatMessage
  logprobs: unknown | null
}
