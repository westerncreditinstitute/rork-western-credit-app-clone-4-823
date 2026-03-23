import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import {
  CommunityHome,
  HomeComment,
  HomeFeedFilter,
  HomeFeedSortOption,
  MultiplayerVisitSession,
  VisitChatMessage,
  HomeNotification,
  GuestBookEntry,
  HomeOwnerProfile,
  VisitorInfo,
  Vector3,
  RealEstateApplication,
  ApplicantProfile,
  ApplicationTransaction,
  ApplicationType,
  RentalTermsAccepted,
  PurchaseTermsAccepted,
} from '@/types/communityHomes';
import {
  COMMUNITY_HOMES,
  MOCK_HOME_COMMENTS,
  MOCK_GUEST_BOOK_ENTRIES,
  MOCK_HOME_OWNERS,
} from '@/mocks/communityHomesData';

const STORAGE_KEY = 'community_homes_state';

export const [CommunityHomesProvider, useCommunityHomes] = createContextHook(() => {
  const [homes, setHomes] = useState<CommunityHome[]>(COMMUNITY_HOMES);
  const [comments, setComments] = useState<Record<string, HomeComment[]>>(MOCK_HOME_COMMENTS);
  const [guestBookEntries, setGuestBookEntries] = useState<GuestBookEntry[]>(MOCK_GUEST_BOOK_ENTRIES);
  const [notifications, setNotifications] = useState<HomeNotification[]>([]);
  const [currentVisitSession, setCurrentVisitSession] = useState<MultiplayerVisitSession | null>(null);
  const [activeSessions, setActiveSessions] = useState<MultiplayerVisitSession[]>([]);
  const [isHosting, setIsHosting] = useState(false);
  const [isGuiding, setIsGuiding] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<string[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; visitorId: string; timestamp: number }[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<HomeFeedFilter>({});
  const [sortBy, setSortBy] = useState<HomeFeedSortOption>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [likedHomeIds, setLikedHomeIds] = useState<string[]>([]);
  const [savedHomeIds, setSavedHomeIds] = useState<string[]>([]);
  const [visitedHomeIds, setVisitedHomeIds] = useState<string[]>([]);
  const [realEstateListings, setRealEstateListings] = useState<CommunityHome[]>([]);
  const [applications, setApplications] = useState<RealEstateApplication[]>([]);
  const [applicationTransactions, setApplicationTransactions] = useState<ApplicationTransaction[]>([]);


  useEffect(() => {
    loadSavedState();
  }, []);

  const loadSavedState = async () => {
    try {
      setIsLoading(true);
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.followingIds) setFollowingIds(parsed.followingIds);
        if (parsed.likedHomeIds) setLikedHomeIds(parsed.likedHomeIds);
        if (parsed.savedHomeIds) setSavedHomeIds(parsed.savedHomeIds);
        if (parsed.visitedHomeIds) setVisitedHomeIds(parsed.visitedHomeIds);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.realEstateListings) setRealEstateListings(parsed.realEstateListings);
        if (parsed.applications) setApplications(parsed.applications);
        if (parsed.applicationTransactions) setApplicationTransactions(parsed.applicationTransactions);
      }
      console.log('[CommunityHomes] State loaded');
    } catch (error) {
      console.log('[CommunityHomes] Error loading state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveState = useCallback(async () => {
    try {
      const state = {
        followingIds,
        likedHomeIds,
        savedHomeIds,
        visitedHomeIds,
        notifications,
        realEstateListings,
        applications,
        applicationTransactions,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.log('[CommunityHomes] Error saving state:', error);
    }
  }, [followingIds, likedHomeIds, savedHomeIds, visitedHomeIds, notifications, realEstateListings]);

  useEffect(() => {
    if (!isLoading) {
      saveState();
    }
  }, [followingIds, likedHomeIds, savedHomeIds, visitedHomeIds, notifications, realEstateListings, applications, applicationTransactions, isLoading, saveState]);

  const filteredHomes = useMemo(() => {
    let result = [...homes];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(h =>
        h.propertyName.toLowerCase().includes(query) ||
        h.owner.name.toLowerCase().includes(query) ||
        h.city.toLowerCase().includes(query) ||
        h.neighborhood.toLowerCase().includes(query)
      );
    }

    if (filter.propertyTypes?.length) {
      result = result.filter(h => filter.propertyTypes!.includes(h.propertyType));
    }

    if (filter.styles?.length) {
      result = result.filter(h => filter.styles!.includes(h.style));
    }

    if (filter.cities?.length) {
      result = result.filter(h => filter.cities!.includes(h.city));
    }

    if (filter.minPrice !== undefined) {
      result = result.filter(h => h.financials.currentValue >= filter.minPrice!);
    }

    if (filter.maxPrice !== undefined) {
      result = result.filter(h => h.financials.currentValue <= filter.maxPrice!);
    }

    if (filter.minBedrooms !== undefined) {
      result = result.filter(h => h.details.bedrooms >= filter.minBedrooms!);
    }

    if (filter.minCreditScore !== undefined) {
      result = result.filter(h => h.owner.creditScore >= filter.minCreditScore!);
    }

    if (filter.openForVisits) {
      result = result.filter(h => h.settings.isOpenForVisits);
    }

    if (filter.virtualTourAvailable) {
      result = result.filter(h => h.settings.virtualTourAvailable);
    }

    if (filter.followingOnly) {
      result = result.filter(h => followingIds.includes(h.owner.id));
    }

    if (filter.trendingOnly) {
      result = result.filter(h => h.stats.trending);
    }

    switch (sortBy) {
      case 'trending':
        result.sort((a, b) => {
          if (a.stats.trending && !b.stats.trending) return -1;
          if (!a.stats.trending && b.stats.trending) return 1;
          return (a.stats.trendingRank || 999) - (b.stats.trendingRank || 999);
        });
        break;
      case 'newest':
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'most_visited':
        result.sort((a, b) => b.stats.visits - a.stats.visits);
        break;
      case 'most_liked':
        result.sort((a, b) => b.stats.likes - a.stats.likes);
        break;
      case 'highest_value':
        result.sort((a, b) => b.financials.currentValue - a.financials.currentValue);
        break;
      case 'following':
        result.sort((a, b) => {
          const aFollowing = followingIds.includes(a.owner.id) ? 0 : 1;
          const bFollowing = followingIds.includes(b.owner.id) ? 0 : 1;
          return aFollowing - bFollowing;
        });
        break;
    }

    return result.map(home => ({
      ...home,
      social: {
        ...home.social,
        isLiked: likedHomeIds.includes(home.id),
        isSaved: savedHomeIds.includes(home.id),
        isFollowingOwner: followingIds.includes(home.owner.id),
        hasVisited: visitedHomeIds.includes(home.id),
      },
    }));
  }, [homes, filter, sortBy, searchQuery, followingIds, likedHomeIds, savedHomeIds, visitedHomeIds]);

  const trendingHomes = useMemo(() => {
    return filteredHomes.filter(h => h.stats.trending).slice(0, 10);
  }, [filteredHomes]);

  const liveTourHomes = useMemo(() => {
    return homes.filter(h => h.virtualTour?.isLive);
  }, [homes]);

  const featuredOwners = useMemo(() => {
    return MOCK_HOME_OWNERS.filter(o => o.isVerified).slice(0, 6);
  }, []);

  const toggleLike = useCallback((homeId: string) => {
    setLikedHomeIds(prev => {
      const isLiked = prev.includes(homeId);
      const updated = isLiked ? prev.filter(id => id !== homeId) : [...prev, homeId];
      
      setHomes(h => h.map(home => {
        if (home.id === homeId) {
          return {
            ...home,
            stats: {
              ...home.stats,
              likes: home.stats.likes + (isLiked ? -1 : 1),
            },
          };
        }
        return home;
      }));

      console.log('[CommunityHomes] Toggled like for home:', homeId, !isLiked);
      return updated;
    });
  }, []);

  const toggleSave = useCallback((homeId: string) => {
    setSavedHomeIds(prev => {
      const isSaved = prev.includes(homeId);
      const updated = isSaved ? prev.filter(id => id !== homeId) : [...prev, homeId];
      
      setHomes(h => h.map(home => {
        if (home.id === homeId) {
          return {
            ...home,
            stats: {
              ...home.stats,
              saves: home.stats.saves + (isSaved ? -1 : 1),
            },
          };
        }
        return home;
      }));

      console.log('[CommunityHomes] Toggled save for home:', homeId, !isSaved);
      return updated;
    });
  }, []);

  const toggleFollow = useCallback((ownerId: string) => {
    setFollowingIds(prev => {
      const isFollowing = prev.includes(ownerId);
      const updated = isFollowing ? prev.filter(id => id !== ownerId) : [...prev, ownerId];
      console.log('[CommunityHomes] Toggled follow for owner:', ownerId, !isFollowing);
      return updated;
    });
  }, []);

  const addComment = useCallback((homeId: string, content: string, parentId?: string) => {
    const newComment: HomeComment = {
      id: `comment_${Date.now()}`,
      homeId,
      userId: 'current_user',
      userName: 'You',
      userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      userLevel: 25,
      content,
      likes: 0,
      isLiked: false,
      createdAt: Date.now(),
      parentId,
    };

    setComments(prev => {
      const homeComments = prev[homeId] || [];
      if (parentId) {
        return {
          ...prev,
          [homeId]: homeComments.map(c => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newComment],
              };
            }
            return c;
          }),
        };
      }
      return {
        ...prev,
        [homeId]: [newComment, ...homeComments],
      };
    });

    setHomes(h => h.map(home => {
      if (home.id === homeId) {
        return {
          ...home,
          stats: {
            ...home.stats,
            comments: home.stats.comments + 1,
          },
        };
      }
      return home;
    }));

    console.log('[CommunityHomes] Added comment to home:', homeId);
  }, []);

  const likeComment = useCallback((homeId: string, commentId: string) => {
    setComments(prev => {
      const homeComments = prev[homeId] || [];
      return {
        ...prev,
        [homeId]: homeComments.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              likes: c.isLiked ? c.likes - 1 : c.likes + 1,
              isLiked: !c.isLiked,
            };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(r => {
                if (r.id === commentId) {
                  return {
                    ...r,
                    likes: r.isLiked ? r.likes - 1 : r.likes + 1,
                    isLiked: !r.isLiked,
                  };
                }
                return r;
              }),
            };
          }
          return c;
        }),
      };
    });
  }, []);

  const recordVisit = useCallback((homeId: string) => {
    if (!visitedHomeIds.includes(homeId)) {
      setVisitedHomeIds(prev => [...prev, homeId]);
      setHomes(h => h.map(home => {
        if (home.id === homeId) {
          return {
            ...home,
            stats: {
              ...home.stats,
              visits: home.stats.visits + 1,
              weeklyVisitors: home.stats.weeklyVisitors + 1,
            },
          };
        }
        return home;
      }));
      console.log('[CommunityHomes] Recorded visit for home:', homeId);
    }
  }, [visitedHomeIds]);

  const startVisitSession = useCallback((homeId: string): MultiplayerVisitSession => {
    const home = homes.find(h => h.id === homeId);
    if (!home) {
      throw new Error('Home not found');
    }

    const session: MultiplayerVisitSession = {
      id: `session_${Date.now()}`,
      homeId,
      hostId: home.owner.id,
      status: 'touring',
      visitors: [
        {
          id: 'current_user',
          name: 'You',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          position: { x: 0, y: 0, z: 0 },
          rotation: 0,
          isHost: false,
          joinedAt: Date.now(),
          avatarColor: '#3B82F6',
          status: 'active',
        },
      ],
      maxVisitors: 20,
      startTime: Date.now(),
      chatMessages: [],
      isPrivate: false,
    };

    setCurrentVisitSession(session);
    recordVisit(homeId);
    console.log('[CommunityHomes] Started visit session for home:', homeId);
    return session;
  }, [homes, recordVisit]);

  const endVisitSession = useCallback(() => {
    if (currentVisitSession) {
      console.log('[CommunityHomes] Ended visit session:', currentVisitSession.id);
      setCurrentVisitSession(null);
      setIsHosting(false);
      setIsGuiding(false);
    }
  }, [currentVisitSession]);

  const startHostSession = useCallback((homeId: string, isPrivate: boolean = false): MultiplayerVisitSession => {
    const home = homes.find(h => h.id === homeId);
    if (!home) {
      throw new Error('Home not found');
    }

    const inviteCode = `TOUR-${homeId.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const session: MultiplayerVisitSession = {
      id: `session_${Date.now()}`,
      homeId,
      hostId: 'current_user',
      status: 'waiting',
      visitors: [
        {
          id: 'current_user',
          name: 'You',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          position: { x: 0, y: 0, z: 0 },
          rotation: 0,
          isHost: true,
          joinedAt: Date.now(),
          avatarColor: '#8B5CF6',
          status: 'active',
        },
      ],
      maxVisitors: 20,
      startTime: Date.now(),
      chatMessages: [],
      isPrivate,
      inviteCode,
    };

    setCurrentVisitSession(session);
    setIsHosting(true);
    setActiveSessions(prev => [...prev, session]);
    console.log('[CommunityHomes] Started host session for home:', homeId, 'Code:', inviteCode);
    return session;
  }, [homes]);

  const joinSessionByCode = useCallback((inviteCode: string): MultiplayerVisitSession | null => {
    const session = activeSessions.find(s => s.inviteCode === inviteCode);
    if (!session) {
      console.log('[CommunityHomes] Session not found for code:', inviteCode);
      return null;
    }

    if (session.visitors.length >= session.maxVisitors) {
      console.log('[CommunityHomes] Session is full');
      return null;
    }

    const newVisitor: VisitorInfo = {
      id: 'current_user',
      name: 'You',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      isHost: false,
      joinedAt: Date.now(),
      avatarColor: '#3B82F6',
      status: 'active',
    };

    const updatedSession = {
      ...session,
      visitors: [...session.visitors, newVisitor],
    };

    setActiveSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s));
    setCurrentVisitSession(updatedSession);
    recordVisit(session.homeId);
    console.log('[CommunityHomes] Joined session:', session.id);
    return updatedSession;
  }, [activeSessions, recordVisit]);

  const inviteFriendToSession = useCallback((friendId: string) => {
    if (!currentVisitSession) return;
    
    setPendingInvites(prev => [...prev, friendId]);
    
    const notification: HomeNotification = {
      id: `notif_${Date.now()}`,
      type: 'visit_request',
      userId: friendId,
      message: `You've been invited to join a home tour!`,
      isRead: false,
      createdAt: Date.now(),
      data: { sessionId: currentVisitSession.id, inviteCode: currentVisitSession.inviteCode },
    };
    setNotifications(prev => [notification, ...prev]);
    console.log('[CommunityHomes] Invited friend to session:', friendId);
  }, [currentVisitSession]);

  const addVisitorToSession = useCallback((visitor: VisitorInfo) => {
    if (!currentVisitSession) return;
    
    setCurrentVisitSession(prev => {
      if (!prev) return null;
      if (prev.visitors.find(v => v.id === visitor.id)) return prev;
      return {
        ...prev,
        visitors: [...prev.visitors, visitor],
      };
    });
    console.log('[CommunityHomes] Added visitor to session:', visitor.name);
  }, [currentVisitSession]);

  const removeVisitorFromSession = useCallback((visitorId: string) => {
    if (!currentVisitSession) return;
    
    setCurrentVisitSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        visitors: prev.visitors.filter(v => v.id !== visitorId),
      };
    });
    console.log('[CommunityHomes] Removed visitor from session:', visitorId);
  }, [currentVisitSession]);

  const updateVisitorPosition = useCallback((visitorId: string, position: Vector3, rotation: number) => {
    if (!currentVisitSession) return;
    
    setCurrentVisitSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        visitors: prev.visitors.map(v => {
          if (v.id === visitorId) {
            return { ...v, position, rotation };
          }
          return v;
        }),
      };
    });
  }, [currentVisitSession]);

  const updateVisitorStatus = useCallback((visitorId: string, status: 'active' | 'idle' | 'exploring') => {
    if (!currentVisitSession) return;
    
    setCurrentVisitSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        visitors: prev.visitors.map(v => {
          if (v.id === visitorId) {
            return { ...v, status };
          }
          return v;
        }),
      };
    });
  }, [currentVisitSession]);

  const sendReaction = useCallback((emoji: string) => {
    if (!currentVisitSession) return;
    
    const reaction = {
      id: `reaction_${Date.now()}`,
      emoji,
      visitorId: 'current_user',
      timestamp: Date.now(),
    };
    
    setFloatingReactions(prev => [...prev, reaction]);
    
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 3000);
    
    const message: VisitChatMessage = {
      id: `msg_${Date.now()}`,
      visitorId: 'current_user',
      visitorName: 'You',
      visitorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      content: emoji,
      timestamp: Date.now(),
      type: 'emoji',
    };
    
    setCurrentVisitSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        chatMessages: [...prev.chatMessages, message],
      };
    });
    
    console.log('[CommunityHomes] Sent reaction:', emoji);
  }, [currentVisitSession]);

  const startGuidedTour = useCallback(() => {
    if (!currentVisitSession || !isHosting) return;
    
    setIsGuiding(true);
    setCurrentVisitSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        status: 'touring',
      };
    });
    
    const message: VisitChatMessage = {
      id: `msg_${Date.now()}`,
      visitorId: 'system',
      visitorName: 'System',
      visitorAvatar: '',
      content: '🎯 Guided tour has started! Follow the host.',
      timestamp: Date.now(),
      type: 'system',
    };
    
    setCurrentVisitSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        chatMessages: [...prev.chatMessages, message],
      };
    });
    
    console.log('[CommunityHomes] Started guided tour');
  }, [currentVisitSession, isHosting]);

  const stopGuidedTour = useCallback(() => {
    if (!currentVisitSession) return;
    
    setIsGuiding(false);
    
    const message: VisitChatMessage = {
      id: `msg_${Date.now()}`,
      visitorId: 'system',
      visitorName: 'System',
      visitorAvatar: '',
      content: '🔓 Free exploration mode! Explore at your own pace.',
      timestamp: Date.now(),
      type: 'system',
    };
    
    setCurrentVisitSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        chatMessages: [...prev.chatMessages, message],
      };
    });
    
    console.log('[CommunityHomes] Stopped guided tour');
  }, [currentVisitSession]);

  const setSessionPrivacy = useCallback((isPrivate: boolean) => {
    if (!currentVisitSession || !isHosting) return;
    
    setCurrentVisitSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        isPrivate,
      };
    });
    
    console.log('[CommunityHomes] Set session privacy:', isPrivate);
  }, [currentVisitSession, isHosting]);

  const setCurrentRoom = useCallback((roomId: string) => {
    if (!currentVisitSession) return;
    
    setCurrentVisitSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentRoom: roomId,
      };
    });
    
    if (isGuiding) {
      const message: VisitChatMessage = {
        id: `msg_${Date.now()}`,
        visitorId: 'system',
        visitorName: 'System',
        visitorAvatar: '',
        content: `📍 Host moved to a new room`,
        timestamp: Date.now(),
        type: 'system',
      };
      
      setCurrentVisitSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          chatMessages: [...prev.chatMessages, message],
        };
      });
    }
    
    console.log('[CommunityHomes] Changed current room:', roomId);
  }, [currentVisitSession, isGuiding]);

  const getActiveSessionsForHome = useCallback((homeId: string): MultiplayerVisitSession[] => {
    return activeSessions.filter(s => s.homeId === homeId && s.status !== 'ended');
  }, [activeSessions]);

  const sendVisitChatMessage = useCallback((content: string) => {
    if (!currentVisitSession) return;

    const message: VisitChatMessage = {
      id: `msg_${Date.now()}`,
      visitorId: 'current_user',
      visitorName: 'You',
      visitorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      content,
      timestamp: Date.now(),
      type: 'text',
    };

    setCurrentVisitSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        chatMessages: [...prev.chatMessages, message],
      };
    });
  }, [currentVisitSession]);

  const addGuestBookEntry = useCallback((homeId: string, message: string, rating: number) => {
    const entry: GuestBookEntry = {
      id: `gb_${Date.now()}`,
      homeId,
      visitorId: 'current_user',
      visitorName: 'You',
      visitorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      message,
      rating,
      visitDate: Date.now(),
      isPublic: true,
    };

    setGuestBookEntries(prev => [entry, ...prev]);
    console.log('[CommunityHomes] Added guest book entry for home:', homeId);
  }, []);

  const getHomeById = useCallback((homeId: string): CommunityHome | undefined => {
    return filteredHomes.find(h => h.id === homeId);
  }, [filteredHomes]);

  const getCommentsForHome = useCallback((homeId: string): HomeComment[] => {
    return comments[homeId] || [];
  }, [comments]);

  const getGuestBookForHome = useCallback((homeId: string): GuestBookEntry[] => {
    return guestBookEntries.filter(e => e.homeId === homeId);
  }, [guestBookEntries]);

  const getOwnerById = useCallback((ownerId: string): HomeOwnerProfile | undefined => {
    return MOCK_HOME_OWNERS.find(o => o.id === ownerId);
  }, []);

  const getHomesByOwner = useCallback((ownerId: string): CommunityHome[] => {
    return filteredHomes.filter(h => h.owner.id === ownerId);
  }, [filteredHomes]);

  const updateListingStatus = useCallback((homeId: string, isForSale: boolean, isForRent: boolean, askingPrice?: number, monthlyRentPrice?: number) => {
    setHomes(prev => prev.map(home => {
      if (home.id === homeId) {
        const updatedHome = {
          ...home,
          financials: {
            ...home.financials,
            isForSale,
            isForRent,
            askingPrice: isForSale ? askingPrice : undefined,
            monthlyRentPrice: isForRent ? monthlyRentPrice : undefined,
          },
          lastUpdated: Date.now(),
        };
        
        if (isForSale || isForRent) {
          setRealEstateListings(listings => {
            const existing = listings.find(l => l.id === homeId);
            if (existing) {
              return listings.map(l => l.id === homeId ? updatedHome : l);
            }
            return [...listings, updatedHome];
          });
          console.log('[CommunityHomes] Property listed in Real Estate:', homeId, { isForSale, isForRent });
        } else {
          setRealEstateListings(listings => listings.filter(l => l.id !== homeId));
          console.log('[CommunityHomes] Property removed from Real Estate listings:', homeId);
        }
        
        return updatedHome;
      }
      return home;
    }));
  }, []);

  const postToCommunity = useCallback((home: CommunityHome) => {
    if (home.financials.isForSale || home.financials.isForRent) {
      setRealEstateListings(listings => {
        const exists = listings.find(l => l.id === home.id);
        if (exists) {
          return listings.map(l => l.id === home.id ? home : l);
        }
        return [...listings, home];
      });
      console.log('[CommunityHomes] Property auto-listed in Real Estate:', home.id);
    }

    const notification: HomeNotification = {
      id: `notif_${Date.now()}`,
      type: 'new_visit',
      homeId: home.id,
      homeName: home.propertyName,
      message: `${home.propertyName} has been posted to the community!`,
      isRead: false,
      createdAt: Date.now(),
    };
    setNotifications(prev => [notification, ...prev]);
    console.log('[CommunityHomes] Property posted to community:', home.propertyName);
  }, []);

  const getHomesForSale = useCallback((): CommunityHome[] => {
    return homes.filter(h => h.financials.isForSale);
  }, [homes]);

  const getHomesForRent = useCallback((): CommunityHome[] => {
    return homes.filter(h => h.financials.isForRent);
  }, [homes]);

  const getRealEstateListings = useCallback((): CommunityHome[] => {
    return homes.filter(h => h.financials.isForSale || h.financials.isForRent);
  }, [homes]);

  const submitApplication = useCallback((
    home: CommunityHome,
    applicant: ApplicantProfile,
    applicationType: ApplicationType,
    termsAccepted: RentalTermsAccepted | PurchaseTermsAccepted
  ): RealEstateApplication => {
    const now = Date.now();
    const isRental = applicationType === 'rental';
    
    const application: RealEstateApplication = {
      id: `app_${now}_${Math.random().toString(36).substr(2, 9)}`,
      homeId: home.id,
      homeName: home.propertyName,
      homeAddress: `${home.neighborhood}, ${home.city}`,
      ownerId: home.owner.id,
      ownerName: home.owner.name,
      applicationType,
      applicant,
      requestedAmount: isRental 
        ? (home.financials.monthlyRentPrice || 0) 
        : (home.financials.askingPrice || home.financials.currentValue),
      monthlyAmount: isRental 
        ? (home.financials.monthlyRentPrice || 0) 
        : Math.round((home.financials.askingPrice || home.financials.currentValue) * 0.006),
      securityDeposit: isRental ? (home.financials.monthlyRentPrice || 0) : undefined,
      downPayment: !isRental ? Math.round((home.financials.askingPrice || home.financials.currentValue) * 0.20) : undefined,
      status: 'pending',
      termsAccepted,
      submittedAt: now,
    };

    setApplications(prev => [application, ...prev]);

    const notification: HomeNotification = {
      id: `notif_${now}`,
      type: 'visit_request',
      homeId: home.id,
      homeName: home.propertyName,
      userId: applicant.playerId,
      userName: applicant.playerName,
      message: `New ${applicationType} application for ${home.propertyName} from ${applicant.playerName}`,
      isRead: false,
      createdAt: now,
      data: { applicationId: application.id, applicationType },
    };
    setNotifications(prev => [notification, ...prev]);

    console.log('[CommunityHomes] Application submitted:', application.id, applicationType);
    return application;
  }, []);

  const recordApplicationTransaction = useCallback((
    applicationId: string,
    type: ApplicationTransaction['type'],
    amount: number,
    fromPlayerId: string,
    toPlayerId: string,
    description: string
  ): ApplicationTransaction => {
    const now = Date.now();
    const transaction: ApplicationTransaction = {
      id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
      applicationId,
      type,
      amount,
      fromPlayerId,
      toPlayerId,
      status: 'completed',
      timestamp: now,
      description,
    };

    setApplicationTransactions(prev => [transaction, ...prev]);
    console.log('[CommunityHomes] Application transaction recorded:', transaction.id, type, amount);
    return transaction;
  }, []);

  const getApplicationsByApplicant = useCallback((playerId: string): RealEstateApplication[] => {
    return applications.filter(a => a.applicant.playerId === playerId);
  }, [applications]);

  const getApplicationsByOwner = useCallback((ownerId: string): RealEstateApplication[] => {
    return applications.filter(a => a.ownerId === ownerId);
  }, [applications]);

  const getApplicationsForHome = useCallback((homeId: string): RealEstateApplication[] => {
    return applications.filter(a => a.homeId === homeId);
  }, [applications]);

  const updateApplicationStatus = useCallback((applicationId: string, status: RealEstateApplication['status'], reviewNotes?: string) => {
    setApplications(prev => prev.map(app => {
      if (app.id === applicationId) {
        return {
          ...app,
          status,
          reviewedAt: Date.now(),
          reviewNotes,
        };
      }
      return app;
    }));
    console.log('[CommunityHomes] Application status updated:', applicationId, status);
  }, []);

  const getTransactionsForApplication = useCallback((applicationId: string): ApplicationTransaction[] => {
    return applicationTransactions.filter(t => t.applicationId === applicationId);
  }, [applicationTransactions]);

  const getTransactionsByPlayer = useCallback((playerId: string): ApplicationTransaction[] => {
    return applicationTransactions.filter(t => t.fromPlayerId === playerId || t.toPlayerId === playerId);
  }, [applicationTransactions]);

  const refreshFeed = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    console.log('[CommunityHomes] Feed refreshed');
  }, []);

  const clearFilters = useCallback(() => {
    setFilter({});
    setSortBy('trending');
    setSearchQuery('');
    console.log('[CommunityHomes] Filters cleared');
  }, []);

  const unreadNotifications = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === notificationId) {
        return { ...n, isRead: true };
      }
      return n;
    }));
  }, []);

  return {
    homes: filteredHomes,
    trendingHomes,
    liveTourHomes,
    featuredOwners,
    isLoading,
    isRefreshing,
    filter,
    sortBy,
    searchQuery,
    currentPage,
    followingIds,
    likedHomeIds,
    savedHomeIds,
    visitedHomeIds,
    currentVisitSession,
    notifications,
    unreadNotifications,
    activeSessions,
    isHosting,
    isGuiding,
    pendingInvites,
    floatingReactions,

    setFilter,
    setSortBy,
    setSearchQuery,
    setCurrentPage,
    
    toggleLike,
    toggleSave,
    toggleFollow,
    addComment,
    likeComment,
    recordVisit,
    startVisitSession,
    endVisitSession,
    sendVisitChatMessage,
    addGuestBookEntry,
    
    startHostSession,
    joinSessionByCode,
    inviteFriendToSession,
    addVisitorToSession,
    removeVisitorFromSession,
    updateVisitorPosition,
    updateVisitorStatus,
    sendReaction,
    startGuidedTour,
    stopGuidedTour,
    setSessionPrivacy,
    setCurrentRoom,
    getActiveSessionsForHome,
    
    getHomeById,
    getCommentsForHome,
    getGuestBookForHome,
    getOwnerById,
    getHomesByOwner,
    
    updateListingStatus,
    postToCommunity,
    getHomesForSale,
    getHomesForRent,
    getRealEstateListings,
    realEstateListings,
    
    submitApplication,
    recordApplicationTransaction,
    getApplicationsByApplicant,
    getApplicationsByOwner,
    getApplicationsForHome,
    updateApplicationStatus,
    getTransactionsForApplication,
    getTransactionsByPlayer,
    applications,
    applicationTransactions,
    
    refreshFeed,
    clearFilters,
    markNotificationRead,
  };
});

