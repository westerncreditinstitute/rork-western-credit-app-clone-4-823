export type ChatMessageType = 'text' | 'emoji' | 'system' | 'private';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface HomeChatMessage {
  id: string;
  homeId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: ChatMessageType;
  status: MessageStatus;
  recipientId?: string;
  recipientName?: string;
  timestamp: number;
  createdAt: string;
  isEdited?: boolean;
  replyToId?: string;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  isOnline: boolean;
  lastSeen?: number;
  isMuted?: boolean;
  isTyping?: boolean;
}

export interface HomeChatState {
  messages: HomeChatMessage[];
  participants: ChatParticipant[];
  isConnected: boolean;
  isLoading: boolean;
  hasMore: boolean;
  unreadCount: number;
  typingUsers: string[];
}

export interface SendMessageInput {
  homeId: string;
  content: string;
  type?: ChatMessageType;
  recipientId?: string;
  replyToId?: string;
}

export interface ChatNotification {
  id: string;
  type: 'new_message' | 'user_joined' | 'user_left' | 'user_typing';
  message?: HomeChatMessage;
  userId?: string;
  userName?: string;
  timestamp: number;
}

export const EMOJI_CATEGORIES = {
  reactions: ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉'],
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😊', '😇', '🙂', '😉', '😌'],
  gestures: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘'],
  home: ['🏠', '🏡', '🏢', '🏰', '🛋️', '🛏️', '🚪', '🪑', '🖼️', '🏖️', '🌅', '✨'],
};

export const QUICK_REACTIONS = EMOJI_CATEGORIES.reactions;

export function formatMessageTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getMessageStatusIcon(status: MessageStatus): string {
  switch (status) {
    case 'sending': return '○';
    case 'sent': return '✓';
    case 'delivered': return '✓✓';
    case 'read': return '✓✓';
    case 'failed': return '!';
    default: return '';
  }
}
