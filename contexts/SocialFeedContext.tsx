/**
 * OASIS × Credit Life Simulator — Social Feed Context
 * API-backed social feed with real-time WebSocket updates.
 * Replaces mock data with live AI agent interactions from OASIS backend.
 * Falls back to local mock data when server is unavailable.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import {
  Friend,
  FriendRequest,
  SocialPost,
  PostMedia,
  PostComment,
  PostType,
  oasisPostToSocialPost,
  oasisCommentToPostComment,
  oasisUserToFriend,
  SocialNotification,
  oasisNotificationToSocialNotification,
  FeedFilters,
} from '@/types/socialFeed';
import {
  OasisAPI,
  setOasisBaseUrl,
} from '@/services/OasisAPIService';
import { oasisWebSocket } from '@/services/OasisWebSocketService';
import {
  MOCK_FRIENDS,
  MOCK_FRIEND_SUGGESTIONS,
  MOCK_FRIEND_REQUESTS,
  MOCK_POSTS,
} from '@/mocks/socialFeedData';

// Storage keys
const STORAGE_KEY = 'social_feed_state';
const OASIS_USER_KEY = 'oasis_user_id';
const OASIS_URL_KEY = 'oasis_server_url';

// Default server URL (configure for your deployment)
const DEFAULT_OASIS_URL = 'https://your-oasis-server.com';

interface SocialFeedState {
  friends: Friend[];
  friendRequests: FriendRequest[];
  friendSuggestions: Friend[];
  posts: SocialPost[];
  myPosts: SocialPost[];
}

export const [SocialFeedProvider, useSocialFeed] = createContextHook(() => { // eslint-disable-line rork/general-context-optimization
  // Core state
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(MOCK_FRIEND_REQUESTS);
  const [friendSuggestions, setFriendSuggestions] = useState<Friend[]>(MOCK_FRIEND_SUGGESTIONS);
  const [posts, setPosts] = useState<SocialPost[]>(MOCK_POSTS);
  const [myPosts, setMyPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // OASIS connection state
  const [isConnected, setIsConnected] = useState(false);
  const [oasisUserId, setOasisUserId] = useState<number | null>(null);
  const [serverUrl, setServerUrl] = useState<string>(DEFAULT_OASIS_URL);
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  
  // Feed pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [feedType, setFeedType] = useState<FeedFilters['feedType']>('personalized');
  
  // Refs for WebSocket cleanup
  const wsCleanupRef = useRef<(() => void)[]>([]);

  // ==================== Initialization ====================

  useEffect(() => {
    void initializeOasis();
    return () => {
      wsCleanupRef.current.forEach(cleanup => cleanup());
      oasisWebSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeOasis = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedUrl = await AsyncStorage.getItem(OASIS_URL_KEY);
      if (savedUrl) {
        setServerUrl(savedUrl);
        setOasisBaseUrl(savedUrl);
        oasisWebSocket.setBaseUrl(savedUrl);
      }
      const savedUserId = await AsyncStorage.getItem(OASIS_USER_KEY);
      if (savedUserId) {
        const userId = parseInt(savedUserId, 10);
        setOasisUserId(userId);
        await connectToServer(userId);
      } else {
        await loadLocalState();
      }
    } catch (error) {
      console.log('[SocialFeed] OASIS init failed, using local data:', error);
      await loadLocalState();
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectToServer = useCallback(async (userId: number) => {
    try {
      const health = await OasisAPI.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error('Server unhealthy');
      }
      
      setIsConnected(true);
      console.log('[SocialFeed] Connected to OASIS server');
      
      // Load initial feed data
      await Promise.all([
        loadFeed(userId, 1),
        loadFriendSuggestions(userId),
        loadFriendRequests(userId),
        loadNotifications(userId),
      ]);
      
      // Connect WebSocket for real-time updates
      setupWebSocket(userId);
      
    } catch (error) {
      console.log('[SocialFeed] Server connection failed:', error);
      setIsConnected(false);
      await loadLocalState();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== Server Registration ====================

  const registerWithOasis = useCallback(async (
    username: string,
    displayName: string,
    avatarUrl: string = '',
    city: string = 'Los Angeles',
    creditScore: number = 580,
    customServerUrl?: string,
  ) => {
    try {
      if (customServerUrl) {
        setServerUrl(customServerUrl);
        setOasisBaseUrl(customServerUrl);
        oasisWebSocket.setBaseUrl(customServerUrl);
        await AsyncStorage.setItem(OASIS_URL_KEY, customServerUrl);
      }
      
      const result = await OasisAPI.registerPlayer({
        username,
        display_name: displayName,
        avatar_url: avatarUrl,
        city,
        credit_score: creditScore,
      });
      
      setOasisUserId(result.user_id);
      await AsyncStorage.setItem(OASIS_USER_KEY, String(result.user_id));
      
      // Connect and load data
      await connectToServer(result.user_id);
      
      console.log('[SocialFeed] Registered with OASIS:', result);
      return result;
    } catch (error) {
      console.error('[SocialFeed] Registration failed:', error);
      throw error;
    }
  }, [connectToServer]);

  // ==================== WebSocket Setup ====================

  const setupWebSocket = useCallback((userId: number) => {
    // Cleanup previous handlers
    wsCleanupRef.current.forEach(cleanup => cleanup());
    wsCleanupRef.current = [];
    
    oasisWebSocket.connect(userId).catch(err => {
      console.warn('[SocialFeed] WebSocket connection failed:', err);
    });
    
    // New post handler — prepend to feed
    const unsubNewPost = oasisWebSocket.on('new_post', (data: any) => {
      const newPost = oasisPostToSocialPost(data);
      setPosts(prev => [newPost, ...prev]);
    });
    
    // New comment handler — update post comment count
    const unsubNewComment = oasisWebSocket.on('new_comment', (data: any) => {
      setPosts(prev => prev.map(p => {
        if (p.oasisPostId === data.post_id) {
          const newComment = oasisCommentToPostComment(data);
          return {
            ...p,
            comments: [...p.comments, newComment],
            numComments: (p.numComments || 0) + 1,
          };
        }
        return p;
      }));
    });
    
    // Like update handler — update like count in real-time
    const unsubLike = oasisWebSocket.on('post_liked', (data: any) => {
      setPosts(prev => prev.map(p => {
        if (p.oasisPostId === data.post_id) {
          return { ...p, likes: p.likes + 1 };
        }
        return p;
      }));
    });
    
    // Notification handler
    const unsubNotif = oasisWebSocket.on('notification', (data: any) => {
      const notif = oasisNotificationToSocialNotification(data);
      setNotifications(prev => [notif, ...prev]);
      setUnreadNotifCount(prev => prev + 1);
    });
    
    // Connection status handler
    const unsubStatus = oasisWebSocket.on('connection_status', (data: any) => {
      setIsConnected(data.connected);
    });
    
    wsCleanupRef.current = [
      unsubNewPost, unsubNewComment, unsubLike, unsubNotif, unsubStatus,
    ];
  }, []);

  // ==================== Feed Loading ====================

  const loadFeed = useCallback(async (userId: number, page: number = 1) => {
    try {
      const response = await OasisAPI.getFeed({
        user_id: userId,
        page,
        page_size: 20,
        feed_type: feedType,
      });
      
      const socialPosts = response.posts.map(oasisPostToSocialPost);
      
      if (page === 1) {
        setPosts(socialPosts);
      } else {
        setPosts(prev => [...prev, ...socialPosts]);
      }
      
      setCurrentPage(page);
      setHasMore(response.has_more);
    } catch (error) {
      console.warn('[SocialFeed] Feed load failed:', error);
    }
  }, [feedType]);

  const refreshFeed = useCallback(async () => {
    if (!oasisUserId) return;
    setIsRefreshing(true);
    try {
      await loadFeed(oasisUserId, 1);
    } finally {
      setIsRefreshing(false);
    }
  }, [oasisUserId, loadFeed]);

  const loadMorePosts = useCallback(async () => {
    if (!oasisUserId || !hasMore || isLoading) return;
    await loadFeed(oasisUserId, currentPage + 1);
  }, [oasisUserId, hasMore, isLoading, currentPage, loadFeed]);

  const changeFeedType = useCallback(async (type: FeedFilters['feedType']) => {
    setFeedType(type);
    if (oasisUserId) {
      setIsLoading(true);
      try {
        const response = await OasisAPI.getFeed({
          user_id: oasisUserId,
          page: 1,
          page_size: 20,
          feed_type: type,
        });
        setPosts(response.posts.map(oasisPostToSocialPost));
        setCurrentPage(1);
        setHasMore(response.has_more);
      } finally {
        setIsLoading(false);
      }
    }
  }, [oasisUserId]);

  // ==================== Friend Suggestions & Requests ====================

  const loadFriendSuggestions = useCallback(async (userId: number) => {
    try {
      const response = await OasisAPI.getSuggestions(userId, 10);
      setFriendSuggestions(response.suggestions.map(oasisUserToFriend));
    } catch (error) {
      console.warn('[SocialFeed] Suggestions load failed:', error);
    }
  }, []);

  const loadFriendRequests = useCallback(async (userId: number) => {
    try {
      const response = await OasisAPI.getFriendRequests(userId, 'received');
      const requests: FriendRequest[] = response.requests.map((r: any) => ({
        id: `oasis_req_${r.request_id}`,
        from: {
          id: `oasis_user_${r.sender_id}`,
          name: r.display_name || r.user_name || 'Unknown',
          avatar: r.avatar_url || '',
          creditScore: r.credit_score || 0,
          level: r.level || 0,
          isOnline: false,
          addedAt: 0,
          city: r.city,
          isAIAgent: r.is_ai_agent ?? true,
          oasisUserId: r.sender_id,
        },
        sentAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        status: 'pending' as const,
        message: r.message,
      }));
      setFriendRequests(requests);
    } catch (error) {
      console.warn('[SocialFeed] Friend requests load failed:', error);
    }
  }, []);

  // ==================== Notifications ====================

  const loadNotifications = useCallback(async (userId: number) => {
    try {
      const response = await OasisAPI.getNotifications(userId, false, 50);
      setNotifications(
        response.notifications.map(oasisNotificationToSocialNotification)
      );
      setUnreadNotifCount(
        response.notifications.filter((n: any) => !n.is_read).length
      );
    } catch (error) {
      console.warn('[SocialFeed] Notifications load failed:', error);
    }
  }, []);

  const markNotificationsRead = useCallback(async () => {
    if (!oasisUserId) return;
    try {
      await OasisAPI.markNotificationsRead(oasisUserId);
      setUnreadNotifCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.warn('[SocialFeed] Mark read failed:', error);
    }
  }, [oasisUserId]);

  // ==================== Social Actions ====================

  const addFriend = useCallback(async (friend: Friend) => {
    if (isConnected && oasisUserId && friend.oasisUserId) {
      try {
        await OasisAPI.followUser(oasisUserId, friend.oasisUserId);
        await OasisAPI.sendFriendRequest(oasisUserId, friend.oasisUserId);
      } catch (error) {
        console.warn('[SocialFeed] Add friend API failed:', error);
      }
    }
    
    const updated = [...friends, { ...friend, addedAt: Date.now() }];
    const updatedSuggestions = friendSuggestions.filter(s => s.id !== friend.id);
    setFriends(updated);
    setFriendSuggestions(updatedSuggestions);
    void saveLocalState({ friends: updated, friendRequests, friendSuggestions: updatedSuggestions, posts, myPosts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends, friendSuggestions, friendRequests, posts, myPosts, isConnected, oasisUserId]);

  const removeFriend = useCallback(async (friendId: string) => {
    // Extract OASIS user ID if available
    const friend = friends.find(f => f.id === friendId);
    if (isConnected && oasisUserId && friend?.oasisUserId) {
      try {
        await OasisAPI.unfollowUser(oasisUserId, friend.oasisUserId);
      } catch (error) {
        console.warn('[SocialFeed] Remove friend API failed:', error);
      }
    }
    
    const updated = friends.filter(f => f.id !== friendId);
    setFriends(updated);
    void saveLocalState({ friends: updated, friendRequests, friendSuggestions, posts, myPosts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends, friendRequests, friendSuggestions, posts, myPosts, isConnected, oasisUserId]);

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    const request = friendRequests.find(r => r.id === requestId);
    if (!request) return;
    
    // Send to OASIS server if connected
    if (isConnected && requestId.startsWith('oasis_req_')) {
      try {
        const oasisReqId = parseInt(requestId.replace('oasis_req_', ''), 10);
        await OasisAPI.respondToFriendRequest(oasisReqId, 'accepted');
      } catch (error) {
        console.warn('[SocialFeed] Accept request API failed:', error);
      }
    }
    
    const updatedRequests = friendRequests.map(r =>
      r.id === requestId ? { ...r, status: 'accepted' as const } : r
    );
    const newFriend: Friend = { ...request.from, addedAt: Date.now() };
    const updatedFriends = [...friends, newFriend];
    setFriendRequests(updatedRequests);
    setFriends(updatedFriends);
    void saveLocalState({ friends: updatedFriends, friendRequests: updatedRequests, friendSuggestions, posts, myPosts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendRequests, friends, friendSuggestions, posts, myPosts, isConnected]);

  const declineFriendRequest = useCallback(async (requestId: string) => {
    if (isConnected && requestId.startsWith('oasis_req_')) {
      try {
        const oasisReqId = parseInt(requestId.replace('oasis_req_', ''), 10);
        await OasisAPI.respondToFriendRequest(oasisReqId, 'declined');
      } catch (error) {
        console.warn('[SocialFeed] Decline request API failed:', error);
      }
    }
    
    const updated = friendRequests.map(r =>
      r.id === requestId ? { ...r, status: 'declined' as const } : r
    );
    setFriendRequests(updated);
    void saveLocalState({ friends, friendRequests: updated, friendSuggestions, posts, myPosts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendRequests, friends, friendSuggestions, posts, myPosts, isConnected]);

  const sendFriendRequest = useCallback(async (userId: string) => {
    const suggestion = friendSuggestions.find(s => s.id === userId);
    if (!suggestion) return;
    
    if (isConnected && oasisUserId && suggestion.oasisUserId) {
      try {
        await OasisAPI.sendFriendRequest(oasisUserId, suggestion.oasisUserId, 'Hey! Let\'s connect! 👋');
        await OasisAPI.followUser(oasisUserId, suggestion.oasisUserId);
      } catch (error) {
        console.warn('[SocialFeed] Send request API failed:', error);
      }
    }
    
    const updatedSuggestions = friendSuggestions.filter(s => s.id !== userId);
    setFriendSuggestions(updatedSuggestions);
    const updatedFriends = [...friends, { ...suggestion, addedAt: Date.now() }];
    setFriends(updatedFriends);
    void saveLocalState({ friends: updatedFriends, friendRequests, friendSuggestions: updatedSuggestions, posts, myPosts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendSuggestions, friends, friendRequests, posts, myPosts, isConnected, oasisUserId]);

  const createPost = useCallback(async (
    text: string,
    media: PostMedia[],
    playerName: string,
    playerAvatar: string,
    type: PostType = 'status'
  ) => {
    let newPost: SocialPost;
    
    if (isConnected && oasisUserId) {
      try {
        const oasisPost = await OasisAPI.createPost(oasisUserId, {
          content: text,
          post_type: type,
          media: media.map(m => ({
            id: m.id,
            type: m.type,
            uri: m.uri,
          })),
        });
        newPost = oasisPostToSocialPost(oasisPost);
      } catch (error) {
        console.warn('[SocialFeed] Create post API failed, creating locally:', error);
        newPost = createLocalPost(text, media, playerName, playerAvatar, type);
      }
    } else {
      newPost = createLocalPost(text, media, playerName, playerAvatar, type);
    }
    
    const updatedPosts = [newPost, ...posts];
    const updatedMyPosts = [newPost, ...myPosts];
    setPosts(updatedPosts);
    setMyPosts(updatedMyPosts);
    void saveLocalState({ friends, friendRequests, friendSuggestions, posts: updatedPosts, myPosts: updatedMyPosts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, myPosts, friends, friendRequests, friendSuggestions, isConnected, oasisUserId]);

  const toggleLikePost = useCallback(async (postId: string) => {
    // Optimistic update
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: !p.isLiked,
          likes: p.isLiked ? p.likes - 1 : p.likes + 1,
        };
      }
      return p;
    });
    setPosts(updatedPosts);
    
    // Sync with server
    const post = posts.find(p => p.id === postId);
    if (isConnected && oasisUserId && post?.oasisPostId) {
      try {
        const result = await OasisAPI.toggleLike(post.oasisPostId, oasisUserId);
        // Update with server-confirmed values
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, isLiked: result.is_liked, likes: result.total_likes };
          }
          return p;
        }));
      } catch (error) {
        console.warn('[SocialFeed] Toggle like API failed:', error);
      }
    }
    
    const updatedMyPosts = myPosts.map(p => {
      if (p.id === postId) {
        return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 };
      }
      return p;
    });
    setMyPosts(updatedMyPosts);
    void saveLocalState({ friends, friendRequests, friendSuggestions, posts: updatedPosts, myPosts: updatedMyPosts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, myPosts, friends, friendRequests, friendSuggestions, isConnected, oasisUserId]);

  const addComment = useCallback(async (
    postId: string,
    text: string,
    authorName: string,
    authorAvatar: string
  ) => {
    const comment: PostComment = {
      id: `comment_${Date.now()}`,
      authorId: 'player',
      authorName,
      authorAvatar,
      text,
      createdAt: Date.now(),
      likes: 0,
      isAIAgent: false,
    };
    
    // Send to server
    const post = posts.find(p => p.id === postId);
    if (isConnected && oasisUserId && post?.oasisPostId) {
      try {
        const result = await OasisAPI.createComment(post.oasisPostId, oasisUserId, { content: text });
        comment.id = `oasis_comment_${result.comment_id}`;
      } catch (error) {
        console.warn('[SocialFeed] Create comment API failed:', error);
      }
    }
    
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        return { 
          ...p, 
          comments: [...p.comments, comment],
          numComments: (p.numComments || p.comments.length) + 1,
        };
      }
      return p;
    });
    setPosts(updatedPosts);
    void saveLocalState({ friends, friendRequests, friendSuggestions, posts: updatedPosts, myPosts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, myPosts, friends, friendRequests, friendSuggestions, isConnected, oasisUserId]);

  // ==================== Post Comments Loading ====================

  const loadPostComments = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!isConnected || !post?.oasisPostId) return;
    
    try {
      const response = await OasisAPI.getPostComments(post.oasisPostId, 50);
      const comments = response.comments.map(oasisCommentToPostComment);
      
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, comments };
        }
        return p;
      }));
    } catch (error) {
      console.warn('[SocialFeed] Load comments failed:', error);
    }
  }, [posts, isConnected]);

  // ==================== Search ====================

  const searchUsers = useCallback(async (query: string) => {
    if (!isConnected) return [];
    try {
      const response = await OasisAPI.searchUsers(query, 20);
      return response.users.map(oasisUserToFriend);
    } catch (error) {
      console.warn('[SocialFeed] Search failed:', error);
      return [];
    }
  }, [isConnected]);

  // ==================== Local State Management ====================

  const loadLocalState = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: SocialFeedState = JSON.parse(stored);
        setFriends(parsed.friends ?? MOCK_FRIENDS);
        setFriendRequests(parsed.friendRequests ?? MOCK_FRIEND_REQUESTS);
        setFriendSuggestions(parsed.friendSuggestions ?? MOCK_FRIEND_SUGGESTIONS);
        setPosts(parsed.posts ?? MOCK_POSTS);
        setMyPosts(parsed.myPosts ?? []);
      }
    } catch (e) {
      console.log('[SocialFeed] Error loading local state:', e);
    }
  }, []);

  const saveLocalState = useCallback(async (state: SocialFeedState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.log('[SocialFeed] Error saving state:', e);
    }
  }, []);

  // ==================== Helper Functions ====================

  const createLocalPost = (
    text: string,
    media: PostMedia[],
    playerName: string,
    playerAvatar: string,
    type: PostType
  ): SocialPost => ({
    id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    authorId: 'player',
    authorName: playerName,
    authorAvatar: playerAvatar,
    authorLevel: 0,
    text,
    media,
    likes: 0,
    isLiked: false,
    comments: [],
    createdAt: Date.now(),
    type,
    isAIAgent: false,
  });

  // ==================== Computed Values ====================

  const friendIds = useMemo(() => friends.map(f => f.id), [friends]);
  const pendingRequests = useMemo(
    () => friendRequests.filter(r => r.status === 'pending'),
    [friendRequests]
  );
  const onlineFriends = useMemo(
    () => friends.filter(f => f.isOnline),
    [friends]
  );
  const aiAgentCount = useMemo(
    () => friends.filter(f => f.isAIAgent).length,
    [friends]
  );

  return {
    // State
    friends,
    friendRequests,
    friendSuggestions,
    pendingRequests,
    friendIds,
    posts,
    myPosts,
    isLoading,
    isRefreshing,
    notifications,
    unreadNotifCount,
    
    // OASIS state
    isConnected,
    oasisUserId,
    serverUrl,
    onlineFriends,
    aiAgentCount,
    feedType,
    hasMore,
    
    // Actions
    addFriend,
    removeFriend,
    acceptFriendRequest,
    declineFriendRequest,
    sendFriendRequest,
    createPost,
    toggleLikePost,
    addComment,
    
    // OASIS actions
    registerWithOasis,
    refreshFeed,
    loadMorePosts,
    changeFeedType,
    loadPostComments,
    searchUsers,
    markNotificationsRead,
  };
});