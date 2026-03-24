import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';

export interface PresenceUser {
  visitorId: string;
  visitorName: string;
  avatarUrl?: string;
  currentRoom: string;
  onlineAt: string;
  isHost: boolean;
}

export interface HomePresenceState {
  visitors: PresenceUser[];
  isConnected: boolean;
  isHost: boolean;
  error: string | null;
}

interface UseHomePresenceOptions {
  homeId: string | null;
  userId: string | null;
  userName: string;
  avatarUrl?: string;
  isHost?: boolean;
  onVisitorJoin?: (visitor: PresenceUser) => void;
  onVisitorLeave?: (visitorId: string) => void;
}

export function useHomePresence({
  homeId,
  userId,
  userName,
  avatarUrl,
  isHost = false,
  onVisitorJoin,
  onVisitorLeave,
}: UseHomePresenceOptions) {
  const [state, setState] = useState<HomePresenceState>({
    visitors: [],
    isConnected: false,
    isHost,
    error: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentRoomRef = useRef<string>('Living Room');

  const updateVisitorsFromPresence = useCallback((presenceState: RealtimePresenceState<PresenceUser>) => {
    const visitors: PresenceUser[] = [];
    
    Object.values(presenceState).forEach((presences) => {
      presences.forEach((presence: any) => {
        if (presence.visitorId !== userId) {
          visitors.push({
            visitorId: presence.visitorId,
            visitorName: presence.visitorName,
            avatarUrl: presence.avatarUrl,
            currentRoom: presence.currentRoom,
            onlineAt: presence.onlineAt,
            isHost: presence.isHost,
          });
        }
      });
    });

    setState(prev => ({ ...prev, visitors }));
    console.log('[HomePresence] Visitors updated:', visitors.length);
  }, [userId]);

  const joinHome = useCallback(async () => {
    if (!homeId || !userId || !isSupabaseConfigured) {
      console.log('[HomePresence] Cannot join - missing homeId, userId, or Supabase not configured');
      return false;
    }

    try {
      if (channelRef.current) {
        await channelRef.current.unsubscribe();
      }

      const channel = supabase.channel(`home-presence-${homeId}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState<PresenceUser>();
          updateVisitorsFromPresence(presenceState);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('[HomePresence] Visitor joined:', newPresences);
          newPresences.forEach((presence: any) => {
            if (presence.visitorId !== userId && onVisitorJoin) {
              onVisitorJoin({
                visitorId: presence.visitorId,
                visitorName: presence.visitorName,
                avatarUrl: presence.avatarUrl,
                currentRoom: presence.currentRoom,
                onlineAt: presence.onlineAt,
                isHost: presence.isHost,
              });
            }
          });
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('[HomePresence] Visitor left:', leftPresences);
          leftPresences.forEach((presence: any) => {
            if (presence.visitorId !== userId && onVisitorLeave) {
              onVisitorLeave(presence.visitorId);
            }
          });
        });

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[HomePresence] Subscribed to channel, tracking presence');
          
          await channel.track({
            visitorId: userId,
            visitorName: userName,
            avatarUrl: avatarUrl || '',
            currentRoom: currentRoomRef.current,
            onlineAt: new Date().toISOString(),
            isHost,
          });

          setState(prev => ({ ...prev, isConnected: true, error: null }));
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[HomePresence] Channel error');
          setState(prev => ({ ...prev, isConnected: false, error: 'Failed to connect to presence channel' }));
        }
      });

      channelRef.current = channel;
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join home presence';
      console.error('[HomePresence] Error joining:', errorMessage);
      setState(prev => ({ ...prev, error: errorMessage, isConnected: false }));
      return false;
    }
  }, [homeId, userId, userName, avatarUrl, isHost, updateVisitorsFromPresence, onVisitorJoin, onVisitorLeave]);

  const leaveHome = useCallback(async () => {
    if (channelRef.current) {
      try {
        await channelRef.current.untrack();
        await channelRef.current.unsubscribe();
        channelRef.current = null;
        
        setState({
          visitors: [],
          isConnected: false,
          isHost: false,
          error: null,
        });
        
        console.log('[HomePresence] Left home presence');
      } catch (error) {
        console.error('[HomePresence] Error leaving:', error);
      }
    }
  }, []);

  const updateRoom = useCallback(async (roomName: string) => {
    currentRoomRef.current = roomName;
    
    if (channelRef.current && userId) {
      try {
        await channelRef.current.track({
          visitorId: userId,
          visitorName: userName,
          avatarUrl: avatarUrl || '',
          currentRoom: roomName,
          onlineAt: new Date().toISOString(),
          isHost,
        });
        console.log('[HomePresence] Updated room to:', roomName);
      } catch (error) {
        console.error('[HomePresence] Error updating room:', error);
      }
    }
  }, [userId, userName, avatarUrl, isHost]);

  const getVisitorsInRoom = useCallback((roomName: string): PresenceUser[] => {
    return state.visitors.filter(v => v.currentRoom === roomName);
  }, [state.visitors]);

  const getVisitorCount = useCallback((): number => {
    return state.visitors.length;
  }, [state.visitors]);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    joinHome,
    leaveHome,
    updateRoom,
    getVisitorsInRoom,
    getVisitorCount,
  };
}
