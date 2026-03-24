import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface RealtimeEvent {
  type: 'home_update' | 'room_update' | 'item_update' | 'visitor_update';
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: unknown;
  timestamp: number;
}

export interface RealtimeSubscriptionState {
  isConnected: boolean;
  isSubscribing: boolean;
  lastEvent: RealtimeEvent | null;
  error: string | null;
  reconnectAttempts: number;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

export function useHomeRealtimeSubscriptions(
  homeId: string | undefined,
  options?: {
    onHomeUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
    onRoomUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
    onItemUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
    onVisitorUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
    onError?: (error: string) => void;
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [state, setState] = useState<RealtimeSubscriptionState>({
    isConnected: false,
    isSubscribing: false,
    lastEvent: null,
    error: null,
    reconnectAttempts: 0,
  });

  const enabled = options?.enabled !== false && isSupabaseConfigured && !!homeId;

  const handleHomeChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log('[HomeRealtime] Home change received:', payload.eventType);
    
    setState(prev => ({
      ...prev,
      lastEvent: {
        type: 'home_update',
        action: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        data: payload.new || payload.old,
        timestamp: Date.now(),
      },
    }));

    queryClient.invalidateQueries({ queryKey: ['playerHome'] });
    queryClient.invalidateQueries({ queryKey: ['publicHomes'] });

    options?.onHomeUpdate?.(payload);
  }, [queryClient, options]);

  const handleRoomChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log('[HomeRealtime] Room change received:', payload.eventType);
    
    setState(prev => ({
      ...prev,
      lastEvent: {
        type: 'room_update',
        action: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        data: payload.new || payload.old,
        timestamp: Date.now(),
      },
    }));

    queryClient.invalidateQueries({ queryKey: ['homeRooms', homeId] });

    options?.onRoomUpdate?.(payload);
  }, [queryClient, homeId, options]);

  const handleItemChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log('[HomeRealtime] Item change received:', payload.eventType);
    
    setState(prev => ({
      ...prev,
      lastEvent: {
        type: 'item_update',
        action: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        data: payload.new || payload.old,
        timestamp: Date.now(),
      },
    }));

    queryClient.invalidateQueries({ queryKey: ['homeItems', homeId] });

    options?.onItemUpdate?.(payload);
  }, [queryClient, homeId, options]);

  const handleVisitorChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log('[HomeRealtime] Visitor change received:', payload.eventType);
    
    setState(prev => ({
      ...prev,
      lastEvent: {
        type: 'visitor_update',
        action: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        data: payload.new || payload.old,
        timestamp: Date.now(),
      },
    }));

    queryClient.invalidateQueries({ queryKey: ['activeVisitors', homeId] });

    options?.onVisitorUpdate?.(payload);
  }, [queryClient, homeId, options]);

  const subscribe = useCallback(async () => {
    if (!enabled || !homeId) {
      console.log('[HomeRealtime] Subscription skipped - not enabled or no homeId');
      return;
    }

    if (channelRef.current) {
      console.log('[HomeRealtime] Unsubscribing from existing channel');
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setState(prev => ({ ...prev, isSubscribing: true, error: null }));
    console.log('[HomeRealtime] Setting up subscriptions for home:', homeId);

    try {
      const channel = supabase
        .channel(`home-${homeId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'player_homes',
            filter: `id=eq.${homeId}`,
          },
          handleHomeChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_layouts',
            filter: `home_id=eq.${homeId}`,
          },
          handleRoomChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'placed_items',
            filter: `home_id=eq.${homeId}`,
          },
          handleItemChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'home_visitors',
            filter: `home_id=eq.${homeId}`,
          },
          handleVisitorChange
        );

      channel.subscribe((status) => {
        console.log('[HomeRealtime] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setState(prev => ({
            ...prev,
            isConnected: true,
            isSubscribing: false,
            error: null,
            reconnectAttempts: 0,
          }));
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setState(prev => ({
            ...prev,
            isConnected: false,
            isSubscribing: false,
            error: `Subscription ${status.toLowerCase()}`,
          }));
          
          if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log('[HomeRealtime] Scheduling reconnect attempt:', state.reconnectAttempts + 1);
            reconnectTimeoutRef.current = setTimeout(() => {
              setState(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }));
              subscribe();
            }, RECONNECT_DELAY);
          } else {
            const errorMsg = 'Max reconnection attempts reached';
            console.error('[HomeRealtime]', errorMsg);
            options?.onError?.(errorMsg);
          }
        }
      });

      channelRef.current = channel;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to subscribe';
      console.error('[HomeRealtime] Subscription error:', error);
      setState(prev => ({
        ...prev,
        isSubscribing: false,
        error: errorMsg,
      }));
      options?.onError?.(errorMsg);
    }
  }, [enabled, homeId, handleHomeChange, handleRoomChange, handleItemChange, handleVisitorChange, state.reconnectAttempts, options]);

  const unsubscribe = useCallback(async () => {
    console.log('[HomeRealtime] Unsubscribing from all channels');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setState({
      isConnected: false,
      isSubscribing: false,
      lastEvent: null,
      error: null,
      reconnectAttempts: 0,
    });
  }, []);

  const reconnect = useCallback(async () => {
    console.log('[HomeRealtime] Manual reconnect triggered');
    setState(prev => ({ ...prev, reconnectAttempts: 0 }));
    await unsubscribe();
    await subscribe();
  }, [subscribe, unsubscribe]);

  useEffect(() => {
    if (enabled) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, homeId]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    reconnect,
  };
}

export function usePublicHomesRealtimeSubscriptions(
  options?: {
    onPublicHomeUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  const [state, setState] = useState<Omit<RealtimeSubscriptionState, 'reconnectAttempts'>>({
    isConnected: false,
    isSubscribing: false,
    lastEvent: null,
    error: null,
  });

  const enabled = options?.enabled !== false && isSupabaseConfigured;

  const handlePublicHomeChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    const record = payload.new || payload.old;
    if (record && record.is_public) {
      console.log('[HomeRealtime] Public home change received:', payload.eventType);
      
      setState(prev => ({
        ...prev,
        lastEvent: {
          type: 'home_update',
          action: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          data: record,
          timestamp: Date.now(),
        },
      }));

      queryClient.invalidateQueries({ queryKey: ['publicHomes'] });
      options?.onPublicHomeUpdate?.(payload);
    }
  }, [queryClient, options]);

  useEffect(() => {
    if (!enabled) {
      console.log('[HomeRealtime] Public homes subscription skipped - not enabled');
      return;
    }

    const subscribeToPublicHomes = async () => {
      setState(prev => ({ ...prev, isSubscribing: true }));
      console.log('[HomeRealtime] Setting up public homes subscription');

      try {
        const channel = supabase
          .channel('public-homes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'player_homes',
              filter: 'is_public=eq.true',
            },
            handlePublicHomeChange
          );

        channel.subscribe((status) => {
          console.log('[HomeRealtime] Public homes subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            setState(prev => ({
              ...prev,
              isConnected: true,
              isSubscribing: false,
              error: null,
            }));
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setState(prev => ({
              ...prev,
              isConnected: false,
              isSubscribing: false,
              error: `Subscription ${status.toLowerCase()}`,
            }));
          }
        });

        channelRef.current = channel;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to subscribe';
        console.error('[HomeRealtime] Public homes subscription error:', error);
        setState(prev => ({
          ...prev,
          isSubscribing: false,
          error: errorMsg,
        }));
      }
    };

    subscribeToPublicHomes();

    return () => {
      if (channelRef.current) {
        console.log('[HomeRealtime] Unsubscribing from public homes channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, handlePublicHomeChange]);

  return state;
}

export function useVisitorPresenceChannel(
  homeId: string | undefined,
  userId: string | undefined,
  userName: string | undefined,
  options?: {
    onPresenceSync?: (visitors: { visitorId: string; visitorName: string; joinedAt: string }[]) => void;
    onVisitorJoin?: (visitor: { visitorId: string; visitorName: string }) => void;
    onVisitorLeave?: (visitor: { visitorId: string; visitorName: string }) => void;
    enabled?: boolean;
  }
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [visitors, setVisitors] = useState<{ visitorId: string; visitorName: string; joinedAt: string }[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const enabled = options?.enabled !== false && isSupabaseConfigured && !!homeId && !!userId;

  useEffect(() => {
    if (!enabled) return;

    console.log('[HomeRealtime] Setting up presence channel for home:', homeId);

    const channel = supabase.channel(`presence-home-${homeId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const currentVisitors = Object.entries(presenceState).map(([key, value]) => {
          const presence = (value as any[])[0];
          return {
            visitorId: key,
            visitorName: presence?.visitorName || 'Anonymous',
            joinedAt: presence?.joinedAt || new Date().toISOString(),
          };
        });
        
        console.log('[HomeRealtime] Presence sync:', currentVisitors.length, 'visitors');
        setVisitors(currentVisitors);
        options?.onPresenceSync?.(currentVisitors);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const presence = newPresences[0];
        console.log('[HomeRealtime] Visitor joined:', key);
        options?.onVisitorJoin?.({
          visitorId: key,
          visitorName: presence?.visitorName || 'Anonymous',
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const presence = leftPresences[0];
        console.log('[HomeRealtime] Visitor left:', key);
        options?.onVisitorLeave?.({
          visitorId: key,
          visitorName: presence?.visitorName || 'Anonymous',
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({
            visitorId: userId,
            visitorName: userName || 'Anonymous',
            joinedAt: new Date().toISOString(),
          });
        } else {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[HomeRealtime] Cleaning up presence channel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setVisitors([]);
      setIsConnected(false);
    };
  }, [enabled, homeId, userId, userName, options]);

  const updatePresence = useCallback(async (data: Record<string, unknown>) => {
    if (channelRef.current && isConnected) {
      await channelRef.current.track({
        visitorId: userId,
        visitorName: userName || 'Anonymous',
        ...data,
      });
    }
  }, [isConnected, userId, userName]);

  return {
    visitors,
    isConnected,
    updatePresence,
  };
}
