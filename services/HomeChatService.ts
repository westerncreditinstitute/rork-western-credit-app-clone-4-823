import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  HomeChatMessage,
  SendMessageInput,
  ChatParticipant,
} from '@/types/homeChat';
import type { ChatMessageType } from '@/types/homeChat';

type MessageCallback = (message: HomeChatMessage) => void;
type TypingCallback = (userId: string, isTyping: boolean) => void;
type ParticipantCallback = (participant: ChatParticipant, action: 'join' | 'leave') => void;

class HomeChatService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private messageCallbacks: Map<string, MessageCallback[]> = new Map();
  private typingCallbacks: Map<string, TypingCallback[]> = new Map();
  private participantCallbacks: Map<string, ParticipantCallback[]> = new Map();
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;
  private currentUserAvatar: string | null = null;
  private typingTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private messageHistory: Map<string, HomeChatMessage[]> = new Map();

  setCurrentUser(userId: string, userName: string, avatarUrl?: string): void {
    this.currentUserId = userId;
    this.currentUserName = userName;
    this.currentUserAvatar = avatarUrl || null;
    console.log('[HomeChatService] Current user set:', { userId, userName });
  }

  async joinHomeChat(homeId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      console.warn('[HomeChatService] Supabase not configured, using demo mode');
      this.initializeDemoHistory(homeId);
      return { success: true };
    }

    if (!this.currentUserId) {
      console.error('[HomeChatService] No current user set');
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('[HomeChatService] Joining home chat:', homeId);

      if (this.channels.has(homeId)) {
        console.log('[HomeChatService] Already connected to home chat:', homeId);
        return { success: true };
      }

      const channel = supabase.channel(`home-chat-${homeId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: this.currentUserId },
        },
      });

      channel
        .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
          console.log('[HomeChatService] Received message:', payload);
          const message = payload as HomeChatMessage;
          this.addToHistory(homeId, message);
          this.notifyMessageCallbacks(homeId, message);
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          const { userId, isTyping } = payload;
          if (userId !== this.currentUserId) {
            this.notifyTypingCallbacks(homeId, userId, isTyping);
          }
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[HomeChatService] User joined chat:', key);
          if (newPresences && newPresences.length > 0) {
            const presence = newPresences[0] as any;
            const participant: ChatParticipant = {
              id: presence.user_id || key,
              name: presence.username || 'Anonymous',
              avatar: presence.avatar_url,
              isHost: presence.is_host || false,
              isOnline: true,
            };
            this.notifyParticipantCallbacks(homeId, participant, 'join');
            
            this.sendSystemMessage(homeId, `${participant.name} joined the chat`);
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('[HomeChatService] User left chat:', key);
          if (leftPresences && leftPresences.length > 0) {
            const presence = leftPresences[0] as any;
            const participant: ChatParticipant = {
              id: presence.user_id || key,
              name: presence.username || 'Anonymous',
              avatar: presence.avatar_url,
              isHost: presence.is_host || false,
              isOnline: false,
            };
            this.notifyParticipantCallbacks(homeId, participant, 'leave');
            
            this.sendSystemMessage(homeId, `${participant.name} left the chat`);
          }
        });

      await channel.subscribe(async (status) => {
        console.log('[HomeChatService] Chat subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: this.currentUserId,
            username: this.currentUserName,
            avatar_url: this.currentUserAvatar,
            joined_at: new Date().toISOString(),
          });
        }
      });

      this.channels.set(homeId, channel);
      this.initializeDemoHistory(homeId);

      return { success: true };
    } catch (error) {
      console.error('[HomeChatService] Error joining home chat:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join chat',
      };
    }
  }

  async leaveHomeChat(homeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[HomeChatService] Leaving home chat:', homeId);

      const channel = this.channels.get(homeId);
      if (channel) {
        await channel.untrack();
        await supabase.removeChannel(channel);
        this.channels.delete(homeId);
      }

      this.messageCallbacks.delete(homeId);
      this.typingCallbacks.delete(homeId);
      this.participantCallbacks.delete(homeId);
      this.messageHistory.delete(homeId);

      const timeoutKey = `${homeId}-${this.currentUserId}`;
      const timeout = this.typingTimeouts.get(timeoutKey);
      if (timeout) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(timeoutKey);
      }

      console.log('[HomeChatService] Left home chat successfully');
      return { success: true };
    } catch (error) {
      console.error('[HomeChatService] Error leaving home chat:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave chat',
      };
    }
  }

  async sendMessage(input: SendMessageInput): Promise<{ success: boolean; message?: HomeChatMessage; error?: string }> {
    const { homeId, content, type = 'text', recipientId, replyToId } = input;

    if (!content.trim()) {
      return { success: false, error: 'Message cannot be empty' };
    }

    const message: HomeChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      homeId,
      senderId: this.currentUserId || 'current_user',
      senderName: this.currentUserName || 'You',
      senderAvatar: this.currentUserAvatar || undefined,
      content: content.trim(),
      type,
      status: 'sending',
      recipientId,
      recipientName: recipientId ? this.getRecipientName(homeId, recipientId) : undefined,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      replyToId,
    };

    try {
      const channel = this.channels.get(homeId);
      
      if (channel && isSupabaseConfigured) {
        await channel.send({
          type: 'broadcast',
          event: 'chat_message',
          payload: { ...message, status: 'sent' },
        });
        
        message.status = 'sent';
        await this.persistMessage(message);
      } else {
        message.status = 'sent';
        this.addToHistory(homeId, message);
        this.notifyMessageCallbacks(homeId, message);
      }

      console.log('[HomeChatService] Message sent:', message.id);
      return { success: true, message };
    } catch (error) {
      console.error('[HomeChatService] Error sending message:', error);
      message.status = 'failed';
      return {
        success: false,
        message,
        error: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }

  async sendPrivateMessage(homeId: string, recipientId: string, content: string): Promise<{ success: boolean; message?: HomeChatMessage; error?: string }> {
    return this.sendMessage({
      homeId,
      content,
      type: 'private',
      recipientId,
    });
  }

  private async sendSystemMessage(homeId: string, content: string): Promise<void> {
    const message: HomeChatMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      homeId,
      senderId: 'system',
      senderName: 'System',
      content,
      type: 'system',
      status: 'sent',
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
    };

    const channel = this.channels.get(homeId);
    if (channel && isSupabaseConfigured) {
      await channel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: message,
      });
    } else {
      this.addToHistory(homeId, message);
      this.notifyMessageCallbacks(homeId, message);
    }
  }

  async sendTypingIndicator(homeId: string, isTyping: boolean): Promise<void> {
    const channel = this.channels.get(homeId);
    if (!channel) return;

    try {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: this.currentUserId,
          userName: this.currentUserName,
          isTyping,
        },
      });

      const timeoutKey = `${homeId}-${this.currentUserId}`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      if (isTyping) {
        const timeout = setTimeout(() => {
          this.sendTypingIndicator(homeId, false);
        }, 3000);
        this.typingTimeouts.set(timeoutKey, timeout);
      }
    } catch (error) {
      console.warn('[HomeChatService] Error sending typing indicator:', error);
    }
  }

  async getMessageHistory(homeId: string, limit: number = 50, beforeTimestamp?: number): Promise<HomeChatMessage[]> {
    const history = this.messageHistory.get(homeId) || [];
    
    let filtered = history;
    if (beforeTimestamp) {
      filtered = history.filter(m => m.timestamp < beforeTimestamp);
    }

    return filtered.slice(-limit);
  }

  private async persistMessage(message: HomeChatMessage): Promise<void> {
    if (!isSupabaseConfigured) return;

    try {
      await supabase.from('home_chat_messages').insert({
        id: message.id,
        home_id: message.homeId,
        sender_id: message.senderId,
        sender_name: message.senderName,
        sender_avatar: message.senderAvatar,
        content: message.content,
        message_type: message.type,
        recipient_id: message.recipientId,
        reply_to_id: message.replyToId,
        created_at: message.createdAt,
      });
    } catch (error) {
      console.warn('[HomeChatService] Could not persist message:', error);
    }
  }

  onMessage(homeId: string, callback: MessageCallback): () => void {
    if (!this.messageCallbacks.has(homeId)) {
      this.messageCallbacks.set(homeId, []);
    }
    this.messageCallbacks.get(homeId)!.push(callback);

    return () => {
      const callbacks = this.messageCallbacks.get(homeId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  onTyping(homeId: string, callback: TypingCallback): () => void {
    if (!this.typingCallbacks.has(homeId)) {
      this.typingCallbacks.set(homeId, []);
    }
    this.typingCallbacks.get(homeId)!.push(callback);

    return () => {
      const callbacks = this.typingCallbacks.get(homeId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  onParticipantChange(homeId: string, callback: ParticipantCallback): () => void {
    if (!this.participantCallbacks.has(homeId)) {
      this.participantCallbacks.set(homeId, []);
    }
    this.participantCallbacks.get(homeId)!.push(callback);

    return () => {
      const callbacks = this.participantCallbacks.get(homeId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  isConnected(homeId: string): boolean {
    return this.channels.has(homeId);
  }

  private addToHistory(homeId: string, message: HomeChatMessage): void {
    if (!this.messageHistory.has(homeId)) {
      this.messageHistory.set(homeId, []);
    }
    const history = this.messageHistory.get(homeId)!;
    
    if (!history.find(m => m.id === message.id)) {
      history.push(message);
      if (history.length > 200) {
        history.shift();
      }
    }
  }

  private initializeDemoHistory(homeId: string): void {
    if (this.messageHistory.has(homeId) && this.messageHistory.get(homeId)!.length > 0) {
      return;
    }

    const demoMessages: HomeChatMessage[] = [
      {
        id: 'demo_1',
        homeId,
        senderId: 'system',
        senderName: 'System',
        content: 'Welcome to the home chat! Say hi to other visitors.',
        type: 'system',
        status: 'sent',
        timestamp: Date.now() - 300000,
        createdAt: new Date(Date.now() - 300000).toISOString(),
      },
    ];

    this.messageHistory.set(homeId, demoMessages);
  }

  private getRecipientName(homeId: string, recipientId: string): string | undefined {
    return undefined;
  }

  private notifyMessageCallbacks(homeId: string, message: HomeChatMessage): void {
    const callbacks = this.messageCallbacks.get(homeId);
    if (callbacks) {
      callbacks.forEach(callback => callback(message));
    }
  }

  private notifyTypingCallbacks(homeId: string, userId: string, isTyping: boolean): void {
    const callbacks = this.typingCallbacks.get(homeId);
    if (callbacks) {
      callbacks.forEach(callback => callback(userId, isTyping));
    }
  }

  private notifyParticipantCallbacks(homeId: string, participant: ChatParticipant, action: 'join' | 'leave'): void {
    const callbacks = this.participantCallbacks.get(homeId);
    if (callbacks) {
      callbacks.forEach(callback => callback(participant, action));
    }
  }

  async disconnectAll(): Promise<void> {
    console.log('[HomeChatService] Disconnecting from all home chats');
    
    const homeIds = Array.from(this.channels.keys());
    for (const homeId of homeIds) {
      await this.leaveHomeChat(homeId);
    }
  }
}

export const homeChatService = new HomeChatService();
export default homeChatService;
