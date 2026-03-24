import { useEffect, useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/contexts/AuthContext';
import { friendService } from '@/services/FriendService';
import { presenceService, FriendPresence } from '@/services/PresenceService';
import {
  Friend,
  FriendUser,
  FriendMessage,
  SendFriendRequestInput,
} from '@/types/friend';

export const [FriendProvider, useFriends] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [onlineFriends, setOnlineFriends] = useState<Map<string, FriendPresence>>(new Map());

  useEffect(() => {
    if (user?.id) {
      friendService.setCurrentUser(user.id);
    }
  }, [user?.id]);

  const friendsQuery = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: () => friendService.getFriends(),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const requestsQuery = useQuery({
    queryKey: ['friend-requests', user?.id],
    queryFn: () => friendService.getFriendRequests(),
    enabled: !!user?.id,
    staleTime: 10000,
  });

  const statsQuery = useQuery({
    queryKey: ['friend-stats', user?.id],
    queryFn: () => friendService.getStats(),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  useEffect(() => {
    if (friendsQuery.data && friendsQuery.data.length > 0) {
      const friendIds = friendsQuery.data.map(f => f.id);
      presenceService.setFriendIds(friendIds);

      const unsubscribe = presenceService.onFriendsChange((friends) => {
        const newMap = new Map<string, FriendPresence>();
        friends.forEach(f => newMap.set(f.userId, f));
        setOnlineFriends(newMap);
      });

      return unsubscribe;
    }
  }, [friendsQuery.data]);

  const friends = useMemo(() => {
    if (!friendsQuery.data) return [];
    
    return friendsQuery.data.map(friend => {
      const presence = onlineFriends.get(friend.id);
      return {
        ...friend,
        isOnline: presence?.status === 'online' || presence?.status === 'away',
        lastSeen: presence?.lastSeen || friend.lastSeen,
        currentActivity: presence?.currentActivity,
        currentHomeId: presence?.currentHomeId,
      };
    });
  }, [friendsQuery.data, onlineFriends]);

  const sendRequestMutation = useMutation({
    mutationFn: (input: SendFriendRequestInput) => friendService.sendFriendRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friend-stats'] });
    },
  });

  const respondToRequestMutation = useMutation({
    mutationFn: (input: { requestId: string; accept: boolean }) => 
      friendService.respondToRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friend-stats'] });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendshipId: string) => friendService.removeFriend(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-stats'] });
    },
  });

  const searchUsersMutation = useMutation({
    mutationFn: (query: string) => friendService.searchUsers(query),
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ friendId, content }: { friendId: string; content: string }) =>
      friendService.sendMessage(friendId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['friend-messages', variables.friendId] });
    },
  });

  const { mutateAsync: sendRequestAsync } = sendRequestMutation;
  const { mutateAsync: respondAsync } = respondToRequestMutation;
  const { mutateAsync: removeAsync } = removeFriendMutation;
  const { mutateAsync: searchAsync } = searchUsersMutation;
  const { mutateAsync: messageAsync } = sendMessageMutation;

  const sendFriendRequest = useCallback(async (receiverId: string, message?: string) => {
    const result = await sendRequestAsync({ receiverId, message });
    return result;
  }, [sendRequestAsync]);

  const acceptRequest = useCallback(async (requestId: string) => {
    const result = await respondAsync({ requestId, accept: true });
    return result;
  }, [respondAsync]);

  const rejectRequest = useCallback(async (requestId: string) => {
    const result = await respondAsync({ requestId, accept: false });
    return result;
  }, [respondAsync]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    const result = await removeAsync(friendshipId);
    return result;
  }, [removeAsync]);

  const searchUsers = useCallback(async (query: string): Promise<FriendUser[]> => {
    const result = await searchAsync(query);
    return result;
  }, [searchAsync]);

  const sendMessage = useCallback(async (friendId: string, content: string) => {
    const result = await messageAsync({ friendId, content });
    return result;
  }, [messageAsync]);

  const getMessages = useCallback(async (friendId: string): Promise<FriendMessage[]> => {
    return friendService.getMessages(friendId);
  }, []);

  const refreshFriends = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['friends'] });
    queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    queryClient.invalidateQueries({ queryKey: ['friend-stats'] });
  }, [queryClient]);

  const getFriendById = useCallback((friendId: string): Friend | undefined => {
    return friends.find(f => f.id === friendId);
  }, [friends]);

  const getOnlineFriendsCount = useCallback((): number => {
    return friends.filter(f => f.isOnline).length;
  }, [friends]);

  return {
    friends,
    receivedRequests: requestsQuery.data?.received || [],
    sentRequests: requestsQuery.data?.sent || [],
    stats: statsQuery.data || {
      totalFriends: friends.length,
      onlineFriends: getOnlineFriendsCount(),
      pendingRequests: requestsQuery.data?.received?.length || 0,
      sentRequests: requestsQuery.data?.sent?.length || 0,
    },
    isLoading: friendsQuery.isLoading || requestsQuery.isLoading,
    isRefreshing: friendsQuery.isFetching,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    searchUsers,
    sendMessage,
    getMessages,
    refreshFriends,
    getFriendById,
    getOnlineFriendsCount,
    isSendingRequest: sendRequestMutation.isPending,
    isSearching: searchUsersMutation.isPending,
    searchResults: searchUsersMutation.data || [],
  };
});

export function useMessages(friendId: string) {
  const { user } = useAuth();

  const messagesQuery = useQuery({
    queryKey: ['friend-messages', friendId],
    queryFn: () => friendService.getMessages(friendId),
    enabled: !!user?.id && !!friendId,
    staleTime: 5000,
    refetchInterval: 10000,
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    refetch: messagesQuery.refetch,
  };
}
