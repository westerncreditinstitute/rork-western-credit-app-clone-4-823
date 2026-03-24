import { supabase } from '@/lib/supabase';
import {
  PoolMessage,
  PoolVote,
  VoteOption,
  PoolContributor,
  PoolUpdate,
} from '@/types/partnership';
import { RealtimeChannel } from '@supabase/supabase-js';

export class InvestmentPoolChatService {
  private static channels: Map<string, RealtimeChannel> = new Map();

  static async getPoolMessages(poolId: string, limit: number = 50): Promise<PoolMessage[]> {
    try {
      const { data, error } = await supabase
        .from('pool_messages')
        .select('*')
        .eq('pool_id', poolId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[PoolChatService] Error fetching messages:', error);
        return [];
      }

      return (data || []).reverse().map(this.mapMessageFromDb);
    } catch (error) {
      console.error('[PoolChatService] Exception in getPoolMessages:', error);
      return [];
    }
  }

  static async sendMessage(
    poolId: string,
    senderId: string,
    senderName: string,
    message: string,
    messageType: 'text' | 'system' | 'vote' | 'profit_update' = 'text',
    metadata?: Record<string, unknown>
  ): Promise<PoolMessage | null> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('pool_messages')
        .insert({
          pool_id: poolId,
          sender_id: senderId,
          sender_name: senderName,
          message,
          message_type: messageType,
          metadata: metadata ? JSON.stringify(metadata) : null,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[PoolChatService] Error sending message:', error);
        return null;
      }

      console.log('[PoolChatService] Message sent:', data.id);
      return this.mapMessageFromDb(data);
    } catch (error) {
      console.error('[PoolChatService] Exception in sendMessage:', error);
      return null;
    }
  }

  static async getPoolContributors(poolId: string): Promise<PoolContributor[]> {
    try {
      const { data, error } = await supabase
        .from('pool_contributions')
        .select(`
          id,
          pool_id,
          investor_user_id,
          contribution_amount,
          ownership_percentage,
          created_at,
          users:investor_user_id (
            name,
            avatar_url
          )
        `)
        .eq('pool_id', poolId)
        .eq('status', 'active');

      if (error) {
        console.error('[PoolChatService] Error fetching contributors:', error);
        return [];
      }

      return (data || []).map((c: any) => ({
        id: c.id,
        poolId: c.pool_id,
        userId: c.investor_user_id,
        userName: c.users?.name || 'Investor',
        userAvatar: c.users?.avatar_url,
        contributionAmount: c.contribution_amount,
        ownershipPercentage: c.ownership_percentage,
        joinedAt: c.created_at,
        isOnline: false,
        lastSeen: undefined,
      }));
    } catch (error) {
      console.error('[PoolChatService] Exception in getPoolContributors:', error);
      return [];
    }
  }

  static async createVote(
    poolId: string,
    creatorId: string,
    title: string,
    description: string,
    options: string[],
    daysToVote: number = 3
  ): Promise<PoolVote | null> {
    try {
      const now = new Date().toISOString();
      const deadline = new Date(Date.now() + daysToVote * 24 * 60 * 60 * 1000).toISOString();

      const voteOptions: VoteOption[] = options.map((label, index) => ({
        id: `option_${index}`,
        label,
        votes: [],
        percentage: 0,
      }));

      const { data, error } = await supabase
        .from('pool_votes')
        .insert({
          pool_id: poolId,
          creator_id: creatorId,
          title,
          description,
          options: JSON.stringify(voteOptions),
          voting_deadline: deadline,
          status: 'active',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[PoolChatService] Error creating vote:', error);
        return null;
      }

      await this.sendMessage(
        poolId,
        creatorId,
        'System',
        `New vote created: "${title}"`,
        'vote',
        { voteId: data.id }
      );

      console.log('[PoolChatService] Vote created:', data.id);
      return this.mapVoteFromDb(data);
    } catch (error) {
      console.error('[PoolChatService] Exception in createVote:', error);
      return null;
    }
  }

  static async castVote(
    voteId: string,
    optionId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { data: vote, error: fetchError } = await supabase
        .from('pool_votes')
        .select('*')
        .eq('id', voteId)
        .single();

      if (fetchError || !vote) {
        console.error('[PoolChatService] Vote not found');
        return false;
      }

      if (vote.status !== 'active') {
        console.error('[PoolChatService] Vote is not active');
        return false;
      }

      const options: VoteOption[] = JSON.parse(vote.options);
      
      const hasVoted = options.some(opt => opt.votes.includes(userId));
      if (hasVoted) {
        console.error('[PoolChatService] User already voted');
        return false;
      }

      const updatedOptions = options.map(opt => {
        if (opt.id === optionId) {
          return { ...opt, votes: [...opt.votes, userId] };
        }
        return opt;
      });

      const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.votes.length, 0);
      const finalOptions = updatedOptions.map(opt => ({
        ...opt,
        percentage: totalVotes > 0 ? (opt.votes.length / totalVotes) * 100 : 0,
      }));

      const { error } = await supabase
        .from('pool_votes')
        .update({
          options: JSON.stringify(finalOptions),
          updated_at: new Date().toISOString(),
        })
        .eq('id', voteId);

      if (error) {
        console.error('[PoolChatService] Error casting vote:', error);
        return false;
      }

      console.log('[PoolChatService] Vote cast successfully');
      return true;
    } catch (error) {
      console.error('[PoolChatService] Exception in castVote:', error);
      return false;
    }
  }

  static async getActiveVotes(poolId: string): Promise<PoolVote[]> {
    try {
      const { data, error } = await supabase
        .from('pool_votes')
        .select('*')
        .eq('pool_id', poolId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[PoolChatService] Error fetching votes:', error);
        return [];
      }

      return (data || []).map(this.mapVoteFromDb);
    } catch (error) {
      console.error('[PoolChatService] Exception in getActiveVotes:', error);
      return [];
    }
  }

  static async getPoolUpdates(poolId: string, limit: number = 20): Promise<PoolUpdate[]> {
    try {
      const { data, error } = await supabase
        .from('pool_updates')
        .select('*')
        .eq('pool_id', poolId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[PoolChatService] Error fetching updates:', error);
        return [];
      }

      return (data || []).map((u: any) => ({
        id: u.id,
        poolId: u.pool_id,
        updateType: u.update_type,
        title: u.title,
        description: u.description,
        amount: u.amount,
        createdAt: u.created_at,
      }));
    } catch (error) {
      console.error('[PoolChatService] Exception in getPoolUpdates:', error);
      return [];
    }
  }

  static async createPoolUpdate(
    poolId: string,
    updateType: 'contribution' | 'profit' | 'milestone' | 'announcement',
    title: string,
    description: string,
    amount?: number
  ): Promise<PoolUpdate | null> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('pool_updates')
        .insert({
          pool_id: poolId,
          update_type: updateType,
          title,
          description,
          amount,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[PoolChatService] Error creating update:', error);
        return null;
      }

      return {
        id: data.id,
        poolId: data.pool_id,
        updateType: data.update_type,
        title: data.title,
        description: data.description,
        amount: data.amount,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('[PoolChatService] Exception in createPoolUpdate:', error);
      return null;
    }
  }

  static subscribeToPool(
    poolId: string,
    userId: string,
    userName: string,
    callbacks: {
      onMessage?: (message: PoolMessage) => void;
      onPresenceSync?: (contributors: { id: string; name: string; isOnline: boolean }[]) => void;
      onContributorJoin?: (contributor: { id: string; name: string }) => void;
      onContributorLeave?: (contributorId: string) => void;
    }
  ): () => void {
    const channelName = `pool-${poolId}`;
    
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.entries(state).map(([key, value]: [string, any]) => ({
          id: key,
          name: value[0]?.name || 'Unknown',
          isOnline: true,
        }));
        callbacks.onPresenceSync?.(onlineUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (newPresences && newPresences[0]) {
          callbacks.onContributorJoin?.({
            id: key,
            name: newPresences[0].name || 'Unknown',
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        callbacks.onContributorLeave?.(key);
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pool_messages',
          filter: `pool_id=eq.${poolId}`,
        },
        (payload) => {
          if (payload.new) {
            callbacks.onMessage?.(this.mapMessageFromDb(payload.new));
          }
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            name: userName,
            online_at: new Date().toISOString(),
          });
          console.log('[PoolChatService] Subscribed to pool:', poolId);
        }
      });

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
      console.log('[PoolChatService] Unsubscribed from pool:', poolId);
    };
  }

  static unsubscribeFromPool(poolId: string): void {
    const channelName = `pool-${poolId}`;
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
    }
  }

  private static mapMessageFromDb(data: any): PoolMessage {
    return {
      id: data.id,
      poolId: data.pool_id,
      senderId: data.sender_id,
      senderName: data.sender_name,
      senderAvatar: data.sender_avatar,
      message: data.message,
      messageType: data.message_type,
      metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
      createdAt: data.created_at,
    };
  }

  private static mapVoteFromDb(data: any): PoolVote {
    return {
      id: data.id,
      poolId: data.pool_id,
      creatorId: data.creator_id,
      title: data.title,
      description: data.description,
      options: JSON.parse(data.options || '[]'),
      votingDeadline: data.voting_deadline,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
