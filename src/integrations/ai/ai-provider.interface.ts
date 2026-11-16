/**
 * AI capability provider (lead-specified OpenAI adapter). New capability —
 * nothing in the legacy app used AI. Calls must be asynchronous and never
 * block core flows; no member data goes to a provider without a privacy
 * review (see src/ai/README.md).
 */
export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiProvider {
  complete(messages: AiChatMessage[], options?: { maxTokens?: number }): Promise<string>;
}
