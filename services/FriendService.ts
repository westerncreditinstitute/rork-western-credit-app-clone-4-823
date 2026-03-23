import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Friend,
  FriendRequest,
  FriendUser,
  FriendMessage,
  FriendConversation,
  SendFriendRequestInput,
  RespondToRequestInput,
  FriendshipStats,
  FriendRequestStatus,
} from '@/types/friend';

const FRIENDS_STORAGE_KEY = 'wci_friends';
const FRIEND_REQUESTS_STORAGE_KEY = 'wci_friend_requests';
const FRIEND_MESSAGES_STORAGE_KEY = 'wci_friend_messages';

class FriendService {
  private currentUserId: string | null = null;

  setCurrentUser(userId: string): void {
    this.currentUserId = userId;
    console.log('[FriendService] Current user set:', userId);
  }

  async getFriends(): Promise<Friend[]> {
    if (!this.currentUserId) {
      console.warn('[FriendService] No current user set');
      return [];
    }

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('friendships')
          .select(`
            id,
            user1_id,
            user2_id,
            created_at,
            user1:users!friendships_user1_id_fkey(id, email, name, avatar_url),
            user2:users!friendships_user2_id_fkey(id, email, name, avatar_url)
          `)
          .or(`user1_id.eq.${this.currentUserId},user2_id.eq.${this.currentUserId}`);

        if (error) {
          const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
          console.log('[FriendService] Friendships table may not exist, using local storage:', errorMessage);
          return this.getLocalFriends();
        }

        if (data) {
          const friends: Friend[] = data.map((friendship: any) => {
            const isUser1 = friendship.user1_id === this.currentUserId;
            const friendData = isUser1 ? friendship.user2 : friendship.user1;
            return {
              id: friendData?.id || '',
              friendshipId: friendship.id,
              user: {
                id: friendData?.id || '',
                username: friendData?.name || friendData?.email?.split('@')[0] || 'Unknown',
                email: friendData?.email,
                avatarUrl: friendData?.avatar_url,
                isOnline: false,
                lastSeen: undefined,
              },
              friendsSince: friendship.created_at,
              isOnline: false,
              lastSeen: undefined,
            };
          });
          
          await this.saveLocalFriends(friends);
          return friends;
        }
      }

      return this.getLocalFriends();
    } catch (error) {
      console.error('[FriendService] Error getting friends:', error);
      return this.getLocalFriends();
    }
  }

  async getFriendRequests(): Promise<{ received: FriendRequest[]; sent: FriendRequest[] }> {
    if (!this.currentUserId) {
      console.warn('[FriendService] No current user set');
      return { received: [], sent: [] };
    }

    try {
      if (isSupabaseConfigured) {
        const { data: receivedData, error: receivedError } = await supabase
          .from('friend_requests')
          .select(`
            id,
            sender_id,
            receiver_id,
            status,
            message,
            created_at,
            updated_at,
            sender:users!friend_requests_sender_id_fkey(id, email, name, avatar_url)
          `)
          .eq('receiver_id', this.currentUserId)
          .eq('status', 'pending');

        const { data: sentData, error: sentError } = await supabase
          .from('friend_requests')
          .select(`
            id,
            sender_id,
            receiver_id,
            status,
            message,
            created_at,
            updated_at,
            receiver:users!friend_requests_receiver_id_fkey(id, email, name, avatar_url)
          `)
          .eq('sender_id', this.currentUserId)
          .eq('status', 'pending');

        if (receivedError || sentError) {
          const err = receivedError || sentError;
          const errorMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
          console.log('[FriendService] Friend requests table may not exist, using local storage:', errorMessage);
          return this.getLocalFriendRequests();
        }

        const received: FriendRequest[] = (receivedData || []).map((req: any) => ({
          id: req.id,
          senderId: req.sender_id,
          receiverId: req.receiver_id,
          status: req.status as FriendRequestStatus,
          message: req.message,
          createdAt: req.created_at,
          updatedAt: req.updated_at,
          sender: req.sender ? {
            id: req.sender.id,
            username: req.sender.name || req.sender.email?.split('@')[0] || 'Unknown',
            email: req.sender.email,
            avatarUrl: req.sender.avatar_url,
          } : undefined,
        }));

        const sent: FriendRequest[] = (sentData || []).map((req: any) => ({
          id: req.id,
          senderId: req.sender_id,
          receiverId: req.receiver_id,
          status: req.status as FriendRequestStatus,
          message: req.message,
          createdAt: req.created_at,
          updatedAt: req.updated_at,
          receiver: req.receiver ? {
            id: req.receiver.id,
            username: req.receiver.name || req.receiver.email?.split('@')[0] || 'Unknown',
            email: req.receiver.email,
            avatarUrl: req.receiver.avatar_url,
          } : undefined,
        }));

        await this.saveLocalFriendRequests({ received, sent });
        return { received, sent };
      }

      return this.getLocalFriendRequests();
    } catch (error) {
      console.error('[FriendService] Error getting friend requests:', error);
      return this.getLocalFriendRequests();
    }
  }

  async sendFriendRequest(input: SendFriendRequestInput): Promise<{ success: boolean; error?: string; request?: FriendRequest }> {
    if (!this.currentUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    if (input.receiverId === this.currentUserId) {
      return { success: false, error: 'Cannot send friend request to yourself' };
    }

    try {
      console.log('[FriendService] Sending friend request to:', input.receiverId);

      if (isSupabaseConfigured) {
        const { data: existingFriendship } = await supabase
          .from('friendships')
          .select('id')
          .or(`and(user1_id.eq.${this.currentUserId},user2_id.eq.${input.receiverId}),and(user1_id.eq.${input.receiverId},user2_id.eq.${this.currentUserId})`)
          .single();

        if (existingFriendship) {
          return { success: false, error: 'Already friends with this user' };
        }

        const { data: existingRequest } = await supabase
          .from('friend_requests')
          .select('id, status')
          .or(`and(sender_id.eq.${this.currentUserId},receiver_id.eq.${input.receiverId}),and(sender_id.eq.${input.receiverId},receiver_id.eq.${this.currentUserId})`)
          .eq('status', 'pending')
          .single();

        if (existingRequest) {
          return { success: false, error: 'A pending request already exists' };
        }

        const { data, error } = await supabase
          .from('friend_requests')
          .insert({
            sender_id: this.currentUserId,
            receiver_id: input.receiverId,
            status: 'pending',
            message: input.message,
          })
          .select()
          .single();

        if (error) {
          console.error('[FriendService] Error sending request:', error);
          return { success: false, error: error.message };
        }

        const request: FriendRequest = {
          id: data.id,
          senderId: data.sender_id,
          receiverId: data.receiver_id,
          status: data.status,
          message: data.message,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        return { success: true, request };
      }

      const request: FriendRequest = {
        id: `req_${Date.now()}`,
        senderId: this.currentUserId,
        receiverId: input.receiverId,
        status: 'pending',
        message: input.message,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { sent } = await this.getLocalFriendRequests();
      sent.push(request);
      await this.saveLocalFriendRequests({ received: [], sent });

      return { success: true, request };
    } catch (error) {
      console.error('[FriendService] Error sending friend request:', error);
      return { success: false, error: 'Failed to send friend request' };
    }
  }

  async respondToRequest(input: RespondToRequestInput): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      console.log('[FriendService] Responding to request:', input.requestId, input.accept ? 'accept' : 'reject');

      if (isSupabaseConfigured) {
        const { data: request, error: fetchError } = await supabase
          .from('friend_requests')
          .select('*')
          .eq('id', input.requestId)
          .eq('receiver_id', this.currentUserId)
          .single();

        if (fetchError || !request) {
          return { success: false, error: 'Request not found' };
        }

        const { error: updateError } = await supabase
          .from('friend_requests')
          .update({
            status: input.accept ? 'accepted' : 'rejected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.requestId);

        if (updateError) {
          console.error('[FriendService] Error updating request:', updateError);
          return { success: false, error: updateError.message };
        }

        if (input.accept) {
          const { error: friendshipError } = await supabase
            .from('friendships')
            .insert({
              user1_id: request.sender_id,
              user2_id: request.receiver_id,
            });

          if (friendshipError) {
            console.error('[FriendService] Error creating friendship:', friendshipError);
          }
        }

        return { success: true };
      }

      const { received } = await this.getLocalFriendRequests();
      const requestIndex = received.findIndex(r => r.id === input.requestId);
      if (requestIndex === -1) {
        return { success: false, error: 'Request not found' };
      }

      received.splice(requestIndex, 1);
      await this.saveLocalFriendRequests({ received, sent: [] });

      if (input.accept) {
        const friends = await this.getLocalFriends();
        const newFriend: Friend = {
          id: received[requestIndex]?.senderId || `friend_${Date.now()}`,
          friendshipId: `friendship_${Date.now()}`,
          user: {
            id: received[requestIndex]?.senderId || `user_${Date.now()}`,
            username: received[requestIndex]?.sender?.username || 'New Friend',
            avatarUrl: received[requestIndex]?.sender?.avatarUrl,
          },
          friendsSince: new Date().toISOString(),
          isOnline: false,
        };
        friends.push(newFriend);
        await this.saveLocalFriends(friends);
      }

      return { success: true };
    } catch (error) {
      console.error('[FriendService] Error responding to request:', error);
      return { success: false, error: 'Failed to respond to request' };
    }
  }

  async removeFriend(friendshipId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      console.log('[FriendService] Removing friend:', friendshipId);

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('id', friendshipId);

        if (error) {
          console.error('[FriendService] Error removing friend:', error);
          return { success: false, error: error.message };
        }

        return { success: true };
      }

      const friends = await this.getLocalFriends();
      const index = friends.findIndex(f => f.friendshipId === friendshipId);
      if (index !== -1) {
        friends.splice(index, 1);
        await this.saveLocalFriends(friends);
      }

      return { success: true };
    } catch (error) {
      console.error('[FriendService] Error removing friend:', error);
      return { success: false, error: 'Failed to remove friend' };
    }
  }

  async searchUsers(query: string): Promise<FriendUser[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      console.log('[FriendService] Searching users:', query);

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, name, avatar_url')
          .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
          .neq('id', this.currentUserId)
          .limit(20);

        if (error) {
          console.error('[FriendService] Error searching users:', error);
          return [];
        }

        return (data || []).map((user: any) => ({
          id: user.id,
          username: user.name || user.email?.split('@')[0] || 'Unknown',
          email: user.email,
          avatarUrl: user.avatar_url,
        }));
      }

      return this.getDemoSearchResults(query);
    } catch (error) {
      console.error('[FriendService] Error searching users:', error);
      return [];
    }
  }

  async sendMessage(friendId: string, content: string): Promise<{ success: boolean; error?: string; message?: FriendMessage }> {
    if (!this.currentUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      console.log('[FriendService] Sending message to:', friendId);

      const message: FriendMessage = {
        id: `msg_${Date.now()}`,
        senderId: this.currentUserId,
        receiverId: friendId,
        content,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('friend_messages')
          .insert({
            sender_id: this.currentUserId,
            receiver_id: friendId,
            content,
            is_read: false,
          })
          .select()
          .single();

        if (error) {
          console.error('[FriendService] Error sending message:', error);
          return { success: false, error: error.message };
        }

        return {
          success: true,
          message: {
            id: data.id,
            senderId: data.sender_id,
            receiverId: data.receiver_id,
            content: data.content,
            isRead: data.is_read,
            createdAt: data.created_at,
          },
        };
      }

      const messages = await this.getLocalMessages(friendId);
      messages.push(message);
      await this.saveLocalMessages(friendId, messages);

      return { success: true, message };
    } catch (error) {
      console.error('[FriendService] Error sending message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  async getMessages(friendId: string, limit: number = 50): Promise<FriendMessage[]> {
    if (!this.currentUserId) {
      return [];
    }

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('friend_messages')
          .select('*')
          .or(`and(sender_id.eq.${this.currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${this.currentUserId})`)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          console.error('[FriendService] Error fetching messages:', error);
          return this.getLocalMessages(friendId);
        }

        return (data || []).map((msg: any) => ({
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          content: msg.content,
          isRead: msg.is_read,
          createdAt: msg.created_at,
        })).reverse();
      }

      return this.getLocalMessages(friendId);
    } catch (error) {
      console.error('[FriendService] Error getting messages:', error);
      return [];
    }
  }

  async getConversations(): Promise<FriendConversation[]> {
    const friends = await this.getFriends();
    const conversations: FriendConversation[] = [];

    for (const friend of friends) {
      const messages = await this.getMessages(friend.id, 1);
      const unreadCount = messages.filter(m => m.receiverId === this.currentUserId && !m.isRead).length;

      conversations.push({
        friendId: friend.id,
        friend: friend.user,
        lastMessage: messages[messages.length - 1],
        unreadCount,
      });
    }

    return conversations.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });
  }

  async getStats(): Promise<FriendshipStats> {
    const friends = await this.getFriends();
    const { received, sent } = await this.getFriendRequests();

    return {
      totalFriends: friends.length,
      onlineFriends: friends.filter(f => f.isOnline).length,
      pendingRequests: received.length,
      sentRequests: sent.length,
    };
  }

  updateFriendOnlineStatus(friendId: string, isOnline: boolean, lastSeen?: string, activity?: string): void {
    console.log('[FriendService] Updating friend status:', friendId, isOnline);
  }

  private async getLocalFriends(): Promise<Friend[]> {
    try {
      const stored = await AsyncStorage.getItem(`${FRIENDS_STORAGE_KEY}_${this.currentUserId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async saveLocalFriends(friends: Friend[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${FRIENDS_STORAGE_KEY}_${this.currentUserId}`, JSON.stringify(friends));
    } catch (error) {
      console.error('[FriendService] Error saving local friends:', error);
    }
  }

  private async getLocalFriendRequests(): Promise<{ received: FriendRequest[]; sent: FriendRequest[] }> {
    try {
      const stored = await AsyncStorage.getItem(`${FRIEND_REQUESTS_STORAGE_KEY}_${this.currentUserId}`);
      return stored ? JSON.parse(stored) : { received: [], sent: [] };
    } catch {
      return { received: [], sent: [] };
    }
  }

  private async saveLocalFriendRequests(requests: { received: FriendRequest[]; sent: FriendRequest[] }): Promise<void> {
    try {
      await AsyncStorage.setItem(`${FRIEND_REQUESTS_STORAGE_KEY}_${this.currentUserId}`, JSON.stringify(requests));
    } catch (error) {
      console.error('[FriendService] Error saving local requests:', error);
    }
  }

  private async getLocalMessages(friendId: string): Promise<FriendMessage[]> {
    try {
      const stored = await AsyncStorage.getItem(`${FRIEND_MESSAGES_STORAGE_KEY}_${this.currentUserId}_${friendId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async saveLocalMessages(friendId: string, messages: FriendMessage[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${FRIEND_MESSAGES_STORAGE_KEY}_${this.currentUserId}_${friendId}`, JSON.stringify(messages));
    } catch (error) {
      console.error('[FriendService] Error saving local messages:', error);
    }
  }

  private getDemoSearchResults(query: string): FriendUser[] {
    const demoUsers: FriendUser[] = [
      { id: 'demo1', username: 'CreditMaster', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop' },
      { id: 'demo2', username: 'FinanceGuru', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop' },
      { id: 'demo3', username: 'MoneyWise', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop' },
      { id: 'demo4', username: 'WealthBuilder', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop' },
      { id: 'demo5', username: 'BudgetPro', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop' },
    ];

    return demoUsers.filter(u => u.username.toLowerCase().includes(query.toLowerCase()));
  }
}

export const friendService = new FriendService();
export default friendService;
