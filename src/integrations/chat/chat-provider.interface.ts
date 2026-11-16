/**
 * Realtime chat backend (lead-specified Firebase adapter). Replaces legacy
 * AJAX polling (chat.php + ajax/chat-script_page.php). Modules depend on this
 * contract, not on the Firebase SDK.
 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: number;
  body: string;
  /** ISO-8601 timestamp. */
  sentAt: string;
}

export interface ChatProvider {
  publish(message: ChatMessage): Promise<void>;
  /** Subscribe to new messages in a conversation; returns an unsubscribe function. */
  subscribe(conversationId: string, onMessage: (message: ChatMessage) => void): () => void;
  markRead(conversationId: string, userId: number, messageId: string): Promise<void>;
}
