import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import {
  Player,
  Friend,
  FriendRequest,
  Guild,
  GuildApplication,
  Tournament,
  CommunityEvent,
  Challenge,
  Mentorship,
  MentorProfile,
  ChatRoom,
  ChatMessage,
  Notification,
  MultiplayerState,
} from '@/types/multiplayer';
import {
  MOCK_PLAYERS,
  MOCK_FRIENDS,
  MOCK_FRIEND_REQUESTS,
  MOCK_GUILDS,
  MOCK_TOURNAMENTS,
  MOCK_EVENTS,
  MOCK_CHALLENGES,
  MOCK_MENTOR_PROFILES,
  MOCK_CHAT_ROOMS,
  MOCK_CHAT_MESSAGES,
  BADGES,
} from '@/mocks/multiplayerData';

const MULTIPLAYER_STORAGE_KEY = 'credit_life_multiplayer_state';

const createCurrentPlayer = (gameState: any): Player => ({
  id: gameState.playerId,
  name: gameState.playerName,
  avatarUrl: gameState.profilePhotoUrl,
  creditScore: gameState.creditScores.composite,
  netWorth: gameState.totalNetWorth,
  level: Math.floor(gameState.monthsPlayed / 3) + 1,
  xp: gameState.monthsPlayed * 500 + gameState.unlockedAchievements.length * 100,
  status: 'online',
  lastSeen: Date.now(),
  joinedAt: gameState.gameStartDate,
  badges: [],
  stats: {
    totalGamesPlayed: gameState.monthsPlayed,
    tournamentsWon: 0,
    tournamentsPlayed: 0,
    challengesCompleted: gameState.unlockedAchievements.length,
    challengesWon: 0,
    friendsHelped: 0,
    mentorshipScore: 0,
    weeklyRank: 0,
    monthlyRank: 0,
    allTimeRank: 0,
  },
});

export const [MultiplayerProvider, useMultiplayer] = createContextHook(() => {
  const auth = useAuth();
  const game = useGame();
  const userId = auth?.user?.id;

  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(MOCK_FRIEND_REQUESTS);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [guildApplications, setGuildApplications] = useState<GuildApplication[]>([]);
  const [availableGuilds, setAvailableGuilds] = useState<Guild[]>(MOCK_GUILDS);
  const [tournaments, setTournaments] = useState<Tournament[]>(MOCK_TOURNAMENTS);
  const [communityEvents, setCommunityEvents] = useState<CommunityEvent[]>(MOCK_EVENTS);
  const [challenges, setChallenges] = useState<Challenge[]>(MOCK_CHALLENGES);
  const [mentorship, setMentorship] = useState<Mentorship | null>(null);
  const [mentorProfiles, setMentorProfiles] = useState<MentorProfile[]>(MOCK_MENTOR_PROFILES);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(MOCK_CHAT_ROOMS);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({
    room_global: MOCK_CHAT_MESSAGES.filter(m => m.roomId === 'room_global'),
    room_guild_cc: MOCK_CHAT_MESSAGES.filter(m => m.roomId === 'room_guild_cc'),
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (game?.gameState) {
      const player = createCurrentPlayer(game.gameState);
      setCurrentPlayer(player);
    }
  }, [game?.gameState]);

  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await AsyncStorage.getItem(MULTIPLAYER_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.guild) setGuild(parsed.guild);
          if (parsed.notifications) setNotifications(parsed.notifications);
        }
      } catch (error) {
        console.log('[MultiplayerContext] Error loading state:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, []);

  const saveState = useCallback(async () => {
    try {
      const state = {
        guild,
        notifications,
      };
      await AsyncStorage.setItem(MULTIPLAYER_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.log('[MultiplayerContext] Error saving state:', error);
    }
  }, [guild, notifications]);

  useEffect(() => {
    if (!isLoading) {
      saveState();
    }
  }, [guild, notifications, isLoading, saveState]);

  const sendFriendRequest = useCallback((playerId: string, message?: string) => {
    if (!currentPlayer) return;
    
    const targetPlayer = MOCK_PLAYERS.find(p => p.id === playerId);
    if (!targetPlayer) return;

    const newRequest: FriendRequest = {
      id: `request_${Date.now()}`,
      fromPlayerId: currentPlayer.id,
      toPlayerId: playerId,
      status: 'pending',
      message,
      createdAt: Date.now(),
      fromPlayer: currentPlayer,
    };

    console.log('[MultiplayerContext] Friend request sent:', newRequest);
    
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      type: 'friend_request',
      title: 'Friend Request Sent',
      message: `You sent a friend request to ${targetPlayer.name}`,
      isRead: false,
      createdAt: Date.now(),
      data: { playerId, playerName: targetPlayer.name },
    };
    setNotifications(prev => [notification, ...prev]);
  }, [currentPlayer]);

  const acceptFriendRequest = useCallback((requestId: string) => {
    setFriendRequests(prev => {
      const request = prev.find(r => r.id === requestId);
      if (!request || !currentPlayer) return prev;

      const newFriend: Friend = {
        id: `friend_${Date.now()}`,
        playerId: currentPlayer.id,
        friendId: request.fromPlayerId,
        status: 'accepted',
        createdAt: request.createdAt,
        acceptedAt: Date.now(),
        player: request.fromPlayer,
      };

      setFriends(f => [...f, newFriend]);

      const notification: Notification = {
        id: `notif_${Date.now()}`,
        type: 'friend_accepted',
        title: 'Friend Added',
        message: `You are now friends with ${request.fromPlayer.name}`,
        isRead: false,
        createdAt: Date.now(),
        data: { playerId: request.fromPlayerId, playerName: request.fromPlayer.name },
      };
      setNotifications(n => [notification, ...n]);

      return prev.filter(r => r.id !== requestId);
    });
  }, [currentPlayer]);

  const rejectFriendRequest = useCallback((requestId: string) => {
    setFriendRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const removeFriend = useCallback((friendId: string) => {
    setFriends(prev => prev.filter(f => f.friendId !== friendId));
  }, []);

  const joinGuild = useCallback((guildId: string, message?: string) => {
    const targetGuild = availableGuilds.find(g => g.id === guildId);
    if (!targetGuild || !currentPlayer) return;

    if (targetGuild.isOpen) {
      setGuild(targetGuild);
      const notification: Notification = {
        id: `notif_${Date.now()}`,
        type: 'guild_invite',
        title: 'Joined Guild',
        message: `You joined ${targetGuild.name}!`,
        isRead: false,
        createdAt: Date.now(),
        data: { guildId, guildName: targetGuild.name },
      };
      setNotifications(prev => [notification, ...prev]);
    } else {
      const application: GuildApplication = {
        id: `app_${Date.now()}`,
        guildId,
        playerId: currentPlayer.id,
        message: message || 'I would like to join your guild!',
        status: 'pending',
        createdAt: Date.now(),
        player: currentPlayer,
      };
      setGuildApplications(prev => [...prev, application]);
      
      const notification: Notification = {
        id: `notif_${Date.now()}`,
        type: 'guild_application',
        title: 'Application Sent',
        message: `Your application to ${targetGuild.name} has been submitted`,
        isRead: false,
        createdAt: Date.now(),
        data: { guildId, guildName: targetGuild.name },
      };
      setNotifications(prev => [notification, ...prev]);
    }
  }, [availableGuilds, currentPlayer]);

  const leaveGuild = useCallback(() => {
    if (guild) {
      const notification: Notification = {
        id: `notif_${Date.now()}`,
        type: 'guild_invite',
        title: 'Left Guild',
        message: `You left ${guild.name}`,
        isRead: false,
        createdAt: Date.now(),
      };
      setNotifications(prev => [notification, ...prev]);
    }
    setGuild(null);
  }, [guild]);

  const joinTournament = useCallback((tournamentId: string) => {
    if (!currentPlayer) return;

    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const participant = {
          playerId: currentPlayer.id,
          player: currentPlayer,
          score: 0,
          rank: t.participants.length + 1,
          joinedAt: Date.now(),
          progress: {
            startingScore: currentPlayer.creditScore,
            currentScore: currentPlayer.creditScore,
            improvement: 0,
            milestones: [],
          },
        };
        return {
          ...t,
          participants: [...t.participants, participant],
        };
      }
      return t;
    }));

    const tournament = tournaments.find(t => t.id === tournamentId);
    if (tournament) {
      const notification: Notification = {
        id: `notif_${Date.now()}`,
        type: 'tournament_start',
        title: 'Tournament Joined',
        message: `You joined ${tournament.name}!`,
        isRead: false,
        createdAt: Date.now(),
        data: { tournamentId },
      };
      setNotifications(prev => [notification, ...prev]);
    }
  }, [currentPlayer, tournaments]);

  const joinEvent = useCallback((eventId: string) => {
    setCommunityEvents(prev => prev.map(e => {
      if (e.id === eventId) {
        return { ...e, participants: e.participants + 1 };
      }
      return e;
    }));

    const event = communityEvents.find(e => e.id === eventId);
    if (event) {
      const notification: Notification = {
        id: `notif_${Date.now()}`,
        type: 'event_start',
        title: 'Event Joined',
        message: `You joined ${event.name}!`,
        isRead: false,
        createdAt: Date.now(),
        data: { eventId },
      };
      setNotifications(prev => [notification, ...prev]);
    }
  }, [communityEvents]);

  const startChallenge = useCallback((challengeId: string) => {
    setChallenges(prev => prev.map(c => {
      if (c.id === challengeId) {
        return { ...c, status: 'active', participants: c.participants + 1 };
      }
      return c;
    }));
  }, []);

  const completeChallenge = useCallback((challengeId: string) => {
    setChallenges(prev => prev.map(c => {
      if (c.id === challengeId) {
        const notification: Notification = {
          id: `notif_${Date.now()}`,
          type: 'challenge_complete',
          title: 'Challenge Complete!',
          message: `You completed ${c.name} and earned ${c.reward.tokens} tokens!`,
          isRead: false,
          createdAt: Date.now(),
          data: { challengeId },
        };
        setNotifications(n => [notification, ...n]);
        
        return { ...c, status: 'completed', completions: c.completions + 1 };
      }
      return c;
    }));
  }, []);

  const requestMentorship = useCallback((mentorId: string) => {
    if (!currentPlayer) return;

    const mentor = mentorProfiles.find(m => m.playerId === mentorId);
    if (!mentor) return;

    const newMentorship: Mentorship = {
      id: `mentorship_${Date.now()}`,
      mentorId,
      menteeId: currentPlayer.id,
      status: 'pending',
      startDate: Date.now(),
      goals: [],
      sessions: [],
      mentor: mentor.player,
      mentee: currentPlayer,
    };

    setMentorship(newMentorship);

    const notification: Notification = {
      id: `notif_${Date.now()}`,
      type: 'mentorship_request',
      title: 'Mentorship Requested',
      message: `You requested mentorship from ${mentor.player.name}`,
      isRead: false,
      createdAt: Date.now(),
      data: { playerId: mentorId, playerName: mentor.player.name },
    };
    setNotifications(prev => [notification, ...prev]);
  }, [currentPlayer, mentorProfiles]);

  const sendChatMessage = useCallback((roomId: string, content: string) => {
    if (!currentPlayer) return;

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      roomId,
      senderId: currentPlayer.id,
      senderName: currentPlayer.name,
      senderAvatarUrl: currentPlayer.avatarUrl,
      content,
      type: 'text',
      timestamp: Date.now(),
      reactions: [],
      isRead: true,
    };

    setChatMessages(prev => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), newMessage],
    }));

    setChatRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        return { ...room, lastMessage: newMessage, updatedAt: Date.now() };
      }
      return room;
    }));
  }, [currentPlayer]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === notificationId) {
        return { ...n, isRead: true };
      }
      return n;
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const unreadNotifications = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const onlineFriends = useMemo(() => {
    return friends.filter(f => f.player.status === 'online');
  }, [friends]);

  const activeTournaments = useMemo(() => {
    return tournaments.filter(t => t.status === 'active');
  }, [tournaments]);

  const upcomingTournaments = useMemo(() => {
    return tournaments.filter(t => t.status === 'upcoming');
  }, [tournaments]);

  const activeEvents = useMemo(() => {
    return communityEvents.filter(e => e.status === 'active');
  }, [communityEvents]);

  const dailyChallenges = useMemo(() => {
    return challenges.filter(c => c.type === 'daily' && c.status !== 'completed');
  }, [challenges]);

  const weeklyChallenges = useMemo(() => {
    return challenges.filter(c => c.type === 'weekly' && c.status !== 'completed');
  }, [challenges]);

  return {
    currentPlayer,
    friends,
    friendRequests,
    onlineFriends,
    guild,
    guildApplications,
    availableGuilds,
    tournaments,
    activeTournaments,
    upcomingTournaments,
    communityEvents,
    activeEvents,
    challenges,
    dailyChallenges,
    weeklyChallenges,
    mentorship,
    mentorProfiles,
    chatRooms,
    chatMessages,
    notifications,
    unreadNotifications,
    isConnected,
    isLoading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    joinGuild,
    leaveGuild,
    joinTournament,
    joinEvent,
    startChallenge,
    completeChallenge,
    requestMentorship,
    sendChatMessage,
    markNotificationRead,
    markAllNotificationsRead,
  };
});
