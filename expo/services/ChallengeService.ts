import {
  Challenge,
  ChallengeType,
  ChallengeStatus,
  ChallengeParticipant,
  ChallengeProgress,
  Leaderboard,
  LeaderboardType,
  LeaderboardPeriod,
  LeaderboardEntry,
  AchievementShare,
  Congratulation,
  CHALLENGE_CONFIG,
  LEADERBOARD_CONFIG,
} from '@/types/challenges';

const MOCK_AVATARS = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
];

const MOCK_NAMES = [
  'WealthBuilder_Sam', 'FinanceGuru_Mike', 'MoneyMindset_Alex', 'DebtFree_Dan',
  'CreditCoach_Lisa', 'CreditMaster_Jane', 'FinanceFunny', 'BudgetQueen',
  'InvestorPro', 'SavingsKing', 'PropertyMogul', 'HomeDesigner',
];

const MOCK_HOME_NAMES = [
  'Hamptons Summer Estate', 'Beverly Hills Mansion', 'Malibu Beach House',
  'Downtown Penthouse', 'Modern Family Home', 'Cozy Studio Apartment',
  'Luxury Villa', 'Mountain Retreat', 'Urban Loft', 'Coastal Paradise',
];

function generateMockLeaderboardEntries(
  type: LeaderboardType,
  count: number,
  currentUserId?: string
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  
  for (let i = 0; i < count; i++) {
    const isUser = currentUserId ? i === Math.floor(Math.random() * Math.min(count, 20)) : false;
    const baseScore = type === 'highest_rated' ? 5 - (i * 0.05) : 100000 - (i * 2500);
    
    entries.push({
      rank: i + 1,
      id: isUser && currentUserId ? currentUserId : `player_${i}`,
      playerId: isUser && currentUserId ? currentUserId : `player_${i}`,
      name: isUser ? 'You' : MOCK_NAMES[i % MOCK_NAMES.length],
      avatar: MOCK_AVATARS[i % MOCK_AVATARS.length],
      score: Math.max(type === 'highest_rated' ? baseScore : Math.floor(baseScore * (1 - i * 0.08)), type === 'highest_rated' ? 3 : 100),
      change: Math.floor(Math.random() * 10) - 3,
      isCurrentUser: isUser,
      metadata: {
        homeId: `home_${i}`,
        homeName: MOCK_HOME_NAMES[i % MOCK_HOME_NAMES.length],
        homeValue: Math.floor(500000 + Math.random() * 2000000),
        itemCount: Math.floor(20 + Math.random() * 100),
        rating: 3 + Math.random() * 2,
      },
    });
  }
  
  return entries;
}

function generateMockChallenges(currentUserId?: string): Challenge[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  
  return [
    {
      id: 'challenge_1',
      type: 'most_visits_7d',
      title: 'Visit Champion - Week 4',
      description: 'Get the most home visits in the next 7 days. Show off your home and attract visitors!',
      rules: [
        'Only visits from unique users count',
        'Self-visits do not count',
        'Minimum visit duration: 30 seconds',
        'Challenge runs for exactly 7 days',
      ],
      status: 'active',
      startDate: now - 3 * day,
      endDate: now + 4 * day,
      prizes: [
        { id: 'p1', rank: 1, type: 'coins', amount: 10000, icon: '🥇', description: '10,000 Coins + Exclusive Badge' },
        { id: 'p2', rank: 2, type: 'coins', amount: 5000, icon: '🥈', description: '5,000 Coins' },
        { id: 'p3', rank: 3, type: 'coins', amount: 2500, icon: '🥉', description: '2,500 Coins' },
      ],
      participants: [],
      totalParticipants: 234,
      isJoined: true,
      userRank: 15,
      userScore: 47,
      coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      icon: '👁️',
    },
    {
      id: 'challenge_2',
      type: 'best_decorated',
      title: 'Design Master - January Edition',
      description: 'Create the most beautiful home design and win community votes!',
      rules: [
        'Submit your home for voting',
        'Community votes during voting period',
        'Each user can vote once per entry',
        'Minimum 50 items placed to qualify',
      ],
      status: 'voting',
      startDate: now - 10 * day,
      endDate: now - 3 * day,
      votingEndDate: now + 2 * day,
      prizes: [
        { id: 'p4', rank: 1, type: 'gems', amount: 100, icon: '💎', description: '100 Gems + Design Master Title' },
        { id: 'p5', rank: 2, type: 'gems', amount: 50, icon: '💎', description: '50 Gems' },
        { id: 'p6', rank: 3, type: 'coins', amount: 5000, icon: '🪙', description: '5,000 Coins' },
      ],
      participants: [],
      totalParticipants: 156,
      isJoined: false,
      coverImage: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      icon: '🎨',
    },
    {
      id: 'challenge_3',
      type: 'most_valuable_home',
      title: 'Luxury Living Challenge',
      description: 'Build the most valuable home by the end of the month!',
      rules: [
        'Home value calculated from items + tier',
        'Must have at least Tier 2 home',
        'All item values count towards total',
        'Bonus points for rare items',
      ],
      status: 'upcoming',
      startDate: now + 5 * day,
      endDate: now + 35 * day,
      prizes: [
        { id: 'p7', rank: 1, type: 'item', itemId: 'throne_gold', itemName: 'Golden Throne', icon: '👑', description: 'Legendary Golden Throne + 20,000 Coins' },
        { id: 'p8', rank: 2, type: 'coins', amount: 15000, icon: '🪙', description: '15,000 Coins' },
        { id: 'p9', rank: 3, type: 'coins', amount: 7500, icon: '🪙', description: '7,500 Coins' },
      ],
      participants: [],
      totalParticipants: 0,
      maxParticipants: 500,
      entryFee: 100,
      entryCurrency: 'coins',
      isJoined: false,
      coverImage: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800',
      icon: '💎',
      requirements: {
        minLevel: 5,
        hasHome: true,
      },
    },
    {
      id: 'challenge_4',
      type: 'highest_rating',
      title: 'Rating Master - Completed',
      description: 'Achieved the highest average home rating!',
      rules: [
        'Minimum 20 ratings required',
        'Average rating determines ranking',
        'Challenge lasted 14 days',
      ],
      status: 'completed',
      startDate: now - 30 * day,
      endDate: now - 16 * day,
      prizes: [
        { id: 'p10', rank: 1, type: 'badge', badgeId: 'rating_master', badgeName: 'Rating Master', icon: '⭐', description: 'Rating Master Badge + 8,000 Coins' },
        { id: 'p11', rank: 2, type: 'coins', amount: 4000, icon: '🪙', description: '4,000 Coins' },
        { id: 'p12', rank: 3, type: 'coins', amount: 2000, icon: '🪙', description: '2,000 Coins' },
      ],
      participants: [],
      totalParticipants: 312,
      isJoined: true,
      userRank: 8,
      userScore: 4.7,
      coverImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      icon: '⭐',
    },
  ];
}

function generateMockAchievementShares(currentUserId?: string): AchievementShare[] {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  
  return [
    {
      id: 'share_1',
      achievementId: 'explorer_100',
      achievementName: 'City Wanderer',
      achievementIcon: '🌆',
      achievementRarity: 'epic',
      playerId: 'player_1',
      playerName: 'WealthBuilder_Sam',
      playerAvatar: MOCK_AVATARS[0],
      sharedAt: now - 2 * hour,
      likes: 45,
      congratulations: [
        {
          id: 'congrat_1',
          shareId: 'share_1',
          playerId: 'player_2',
          playerName: 'FinanceGuru_Mike',
          playerAvatar: MOCK_AVATARS[1],
          message: 'Amazing achievement! 🎉',
          emoji: '🎉',
          createdAt: now - hour,
        },
      ],
      isLiked: false,
    },
    {
      id: 'share_2',
      achievementId: 'host_50',
      achievementName: 'Tour Master',
      achievementIcon: '👑',
      achievementRarity: 'epic',
      playerId: 'player_3',
      playerName: 'MoneyMindset_Alex',
      playerAvatar: MOCK_AVATARS[2],
      sharedAt: now - 5 * hour,
      likes: 78,
      congratulations: [],
      isLiked: true,
    },
  ];
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class ChallengeService {
  private static instance: ChallengeService;
  private leaderboardCache: Map<string, CacheEntry<Leaderboard>> = new Map();
  private challengesCache: Map<string, CacheEntry<Challenge[]>> = new Map();
  private achievementFeedCache: Map<string, CacheEntry<AchievementShare[]>> = new Map();
  
  public static getInstance(): ChallengeService {
    if (!ChallengeService.instance) {
      ChallengeService.instance = new ChallengeService();
    }
    return ChallengeService.instance;
  }

  private getCacheKey(type: string, ...params: (string | number | undefined)[]): string {
    return `${type}-${params.filter(Boolean).join('-')}`;
  }

  private isCacheValid<T>(cached: CacheEntry<T> | undefined): cached is CacheEntry<T> {
    return !!cached && Date.now() - cached.timestamp < CACHE_TTL;
  }

  clearCache(): void {
    console.log('[ChallengeService] Clearing all caches');
    this.leaderboardCache.clear();
    this.challengesCache.clear();
    this.achievementFeedCache.clear();
  }

  clearLeaderboardCache(): void {
    console.log('[ChallengeService] Clearing leaderboard cache');
    this.leaderboardCache.clear();
  }

  async getLeaderboard(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    limit: number = 50,
    currentUserId?: string
  ): Promise<Leaderboard> {
    const cacheKey = this.getCacheKey('leaderboard', type, period, String(limit));
    const cached = this.leaderboardCache.get(cacheKey);
    
    if (this.isCacheValid(cached)) {
      console.log('[ChallengeService] Returning cached leaderboard:', { type, period, cacheAge: Date.now() - cached.timestamp });
      return cached.data;
    }
    
    console.log('[ChallengeService] Calculating fresh leaderboard:', { type, period, limit });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const config = LEADERBOARD_CONFIG[type];
    const entries = generateMockLeaderboardEntries(type, limit, currentUserId);
    const userEntry = entries.find(e => e.isCurrentUser);
    
    const leaderboard: Leaderboard = {
      id: `lb_${type}_${period}`,
      type,
      title: config.title,
      description: config.description,
      period,
      entries,
      totalParticipants: Math.floor(1000 + Math.random() * 5000),
      lastUpdated: Date.now(),
      nextUpdate: Date.now() + CACHE_TTL,
      userRank: userEntry?.rank,
      userScore: userEntry?.score,
    };
    
    this.leaderboardCache.set(cacheKey, { data: leaderboard, timestamp: Date.now() });
    console.log('[ChallengeService] Cached leaderboard:', { cacheKey });
    
    return leaderboard;
  }

  async getChallenges(
    status?: ChallengeStatus,
    currentUserId?: string
  ): Promise<Challenge[]> {
    const cacheKey = this.getCacheKey('challenges', status, currentUserId);
    const cached = this.challengesCache.get(cacheKey);
    
    if (this.isCacheValid(cached)) {
      console.log('[ChallengeService] Returning cached challenges:', { status, cacheAge: Date.now() - cached.timestamp });
      return cached.data;
    }
    
    console.log('[ChallengeService] Fetching fresh challenges:', { status });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let challenges = generateMockChallenges(currentUserId);
    
    if (status) {
      challenges = challenges.filter(c => c.status === status);
    }
    
    this.challengesCache.set(cacheKey, { data: challenges, timestamp: Date.now() });
    
    return challenges;
  }

  async getChallengeById(
    challengeId: string,
    currentUserId?: string
  ): Promise<Challenge | null> {
    console.log('[ChallengeService] Getting challenge by ID:', challengeId);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const challenges = generateMockChallenges(currentUserId);
    const challenge = challenges.find(c => c.id === challengeId);
    
    if (challenge) {
      challenge.participants = generateMockLeaderboardEntries('most_visited', 20, currentUserId).map((entry, index) => ({
        id: `participant_${index}`,
        challengeId,
        playerId: entry.playerId,
        playerName: entry.name,
        playerAvatar: entry.avatar,
        score: entry.score,
        rank: entry.rank,
        joinedAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
        lastUpdated: Date.now() - Math.floor(Math.random() * 3600000),
        isCurrentUser: entry.isCurrentUser,
      }));
    }
    
    return challenge || null;
  }

  async joinChallenge(
    challengeId: string,
    playerId: string
  ): Promise<{ success: boolean; message: string }> {
    console.log('[ChallengeService] Joining challenge:', { challengeId, playerId });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      message: 'Successfully joined the challenge!',
    };
  }

  async leaveChallenge(
    challengeId: string,
    playerId: string
  ): Promise<{ success: boolean; message: string }> {
    console.log('[ChallengeService] Leaving challenge:', { challengeId, playerId });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      message: 'Left the challenge',
    };
  }

  async getChallengeProgress(
    challengeId: string,
    playerId: string
  ): Promise<ChallengeProgress | null> {
    console.log('[ChallengeService] Getting challenge progress:', { challengeId, playerId });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      challengeId,
      playerId,
      currentScore: 47,
      targetScore: 100,
      progressPercent: 47,
      rank: 15,
      milestones: [
        { id: 'm1', title: 'First 10 Visits', description: 'Receive 10 visits', targetScore: 10, isCompleted: true, completedAt: Date.now() - 86400000, reward: { type: 'coins', amount: 100 } },
        { id: 'm2', title: '25 Visits', description: 'Receive 25 visits', targetScore: 25, isCompleted: true, completedAt: Date.now() - 43200000, reward: { type: 'coins', amount: 250 } },
        { id: 'm3', title: '50 Visits', description: 'Receive 50 visits', targetScore: 50, isCompleted: false, reward: { type: 'coins', amount: 500 } },
        { id: 'm4', title: '100 Visits', description: 'Receive 100 visits', targetScore: 100, isCompleted: false, reward: { type: 'gems', amount: 10 } },
      ],
      lastUpdated: Date.now(),
    };
  }

  async voteForParticipant(
    challengeId: string,
    participantId: string,
    voterId: string,
    score: number,
    comment?: string
  ): Promise<{ success: boolean; message: string }> {
    console.log('[ChallengeService] Voting:', { challengeId, participantId, voterId, score });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      message: 'Vote submitted successfully!',
    };
  }

  async shareAchievement(
    achievementId: string,
    achievementName: string,
    achievementIcon: string,
    achievementRarity: string,
    playerId: string,
    playerName: string,
    playerAvatar: string
  ): Promise<AchievementShare> {
    console.log('[ChallengeService] Sharing achievement:', { achievementId, playerId });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      id: `share_${Date.now()}`,
      achievementId,
      achievementName,
      achievementIcon,
      achievementRarity,
      playerId,
      playerName,
      playerAvatar,
      sharedAt: Date.now(),
      likes: 0,
      congratulations: [],
      isLiked: false,
    };
  }

  async getAchievementFeed(
    limit: number = 20,
    currentUserId?: string
  ): Promise<AchievementShare[]> {
    const cacheKey = this.getCacheKey('achievementFeed', String(limit), currentUserId);
    const cached = this.achievementFeedCache.get(cacheKey);
    
    if (this.isCacheValid(cached)) {
      console.log('[ChallengeService] Returning cached achievement feed:', { cacheAge: Date.now() - cached.timestamp });
      return cached.data;
    }
    
    console.log('[ChallengeService] Fetching fresh achievement feed');
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const feed = generateMockAchievementShares(currentUserId);
    this.achievementFeedCache.set(cacheKey, { data: feed, timestamp: Date.now() });
    
    return feed;
  }

  async congratulateAchievement(
    shareId: string,
    playerId: string,
    playerName: string,
    playerAvatar: string,
    message: string,
    emoji?: string
  ): Promise<Congratulation> {
    console.log('[ChallengeService] Congratulating:', { shareId, playerId });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      id: `congrat_${Date.now()}`,
      shareId,
      playerId,
      playerName,
      playerAvatar,
      message,
      emoji,
      createdAt: Date.now(),
    };
  }

  async likeAchievementShare(
    shareId: string,
    playerId: string
  ): Promise<{ success: boolean; newLikeCount: number }> {
    console.log('[ChallengeService] Liking share:', { shareId, playerId });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      newLikeCount: Math.floor(Math.random() * 100) + 1,
    };
  }
}

export const challengeService = ChallengeService.getInstance();
export default challengeService;
