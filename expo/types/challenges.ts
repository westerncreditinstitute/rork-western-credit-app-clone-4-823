export type LeaderboardType = 
  | 'most_visited' 
  | 'highest_rated' 
  | 'most_expensive' 
  | 'most_items' 
  | 'wealthiest'
  | 'top_hosts'
  | 'most_liked'
  | 'rising_stars';

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';

export type ChallengeType = 
  | 'most_visits_7d'
  | 'highest_rating'
  | 'most_valuable_home'
  | 'most_items_collected'
  | 'best_decorated';

export type ChallengeStatus = 'upcoming' | 'active' | 'voting' | 'completed';

export type PrizeType = 'coins' | 'gems' | 'badge' | 'item' | 'title';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  playerId: string;
  name: string;
  avatar: string;
  score: number;
  change: number;
  isCurrentUser?: boolean;
  metadata?: {
    homeId?: string;
    homeName?: string;
    homeValue?: number;
    itemCount?: number;
    rating?: number;
  };
}

export interface Leaderboard {
  id: string;
  type: LeaderboardType;
  title: string;
  description: string;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  totalParticipants: number;
  lastUpdated: number;
  nextUpdate: number;
  userRank?: number;
  userScore?: number;
}

export interface ChallengePrize {
  id: string;
  rank: number;
  type: PrizeType;
  amount?: number;
  itemId?: string;
  itemName?: string;
  badgeId?: string;
  badgeName?: string;
  title?: string;
  icon: string;
  description: string;
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  score: number;
  rank: number;
  joinedAt: number;
  lastUpdated: number;
  isCurrentUser?: boolean;
  progress?: number;
  progressMax?: number;
}

export interface ChallengeVote {
  id: string;
  challengeId: string;
  participantId: string;
  voterId: string;
  score: number;
  comment?: string;
  createdAt: number;
}

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  rules: string[];
  status: ChallengeStatus;
  startDate: number;
  endDate: number;
  votingEndDate?: number;
  prizes: ChallengePrize[];
  participants: ChallengeParticipant[];
  totalParticipants: number;
  maxParticipants?: number;
  minParticipants?: number;
  entryFee?: number;
  entryCurrency?: 'coins' | 'gems';
  isJoined: boolean;
  userRank?: number;
  userScore?: number;
  coverImage: string;
  icon: string;
  sponsor?: {
    name: string;
    logo: string;
  };
  requirements?: {
    minLevel?: number;
    minCreditScore?: number;
    hasHome?: boolean;
  };
}

export interface ChallengeProgress {
  challengeId: string;
  playerId: string;
  currentScore: number;
  targetScore: number;
  progressPercent: number;
  rank: number;
  milestones: ChallengeMilestone[];
  lastUpdated: number;
}

export interface ChallengeMilestone {
  id: string;
  title: string;
  description: string;
  targetScore: number;
  isCompleted: boolean;
  completedAt?: number;
  reward?: {
    type: PrizeType;
    amount: number;
  };
}

export interface AchievementShare {
  id: string;
  achievementId: string;
  achievementName: string;
  achievementIcon: string;
  achievementRarity: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  sharedAt: number;
  likes: number;
  congratulations: Congratulation[];
  isLiked: boolean;
}

export interface Congratulation {
  id: string;
  shareId: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  message: string;
  emoji?: string;
  createdAt: number;
}

export interface LeaderboardFilter {
  type: LeaderboardType;
  period: LeaderboardPeriod;
  limit?: number;
  offset?: number;
}

export interface ChallengeFilter {
  status?: ChallengeStatus;
  type?: ChallengeType;
  joinedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export const LEADERBOARD_CONFIG: Record<LeaderboardType, { title: string; description: string; icon: string; scoreLabel: string }> = {
  most_visited: {
    title: 'Most Visited Homes',
    description: 'Homes with the highest visitor counts',
    icon: '👁️',
    scoreLabel: 'visits',
  },
  highest_rated: {
    title: 'Highest Rated Homes',
    description: 'Top-rated homes by visitor reviews',
    icon: '⭐',
    scoreLabel: 'rating',
  },
  most_expensive: {
    title: 'Most Valuable Homes',
    description: 'Homes with the highest total value',
    icon: '💎',
    scoreLabel: 'value',
  },
  most_items: {
    title: 'Most Decorated',
    description: 'Homes with the most items placed',
    icon: '🛋️',
    scoreLabel: 'items',
  },
  wealthiest: {
    title: 'Wealthiest Players',
    description: 'Players with the highest net worth',
    icon: '💰',
    scoreLabel: 'coins',
  },
  top_hosts: {
    title: 'Top Hosts',
    description: 'Most active tour hosts',
    icon: '🎙️',
    scoreLabel: 'tours',
  },
  most_liked: {
    title: 'Most Liked',
    description: 'Homes with the most likes',
    icon: '❤️',
    scoreLabel: 'likes',
  },
  rising_stars: {
    title: 'Rising Stars',
    description: 'Fastest growing homes this period',
    icon: '🚀',
    scoreLabel: 'growth',
  },
};

export const CHALLENGE_CONFIG: Record<ChallengeType, { title: string; description: string; icon: string }> = {
  most_visits_7d: {
    title: 'Visit Champion',
    description: 'Get the most home visits in 7 days',
    icon: '👁️',
  },
  highest_rating: {
    title: 'Rating Master',
    description: 'Achieve the highest home rating',
    icon: '⭐',
  },
  most_valuable_home: {
    title: 'Luxury Living',
    description: 'Build the most valuable home',
    icon: '💎',
  },
  most_items_collected: {
    title: 'Collector Supreme',
    description: 'Collect the most items',
    icon: '🏆',
  },
  best_decorated: {
    title: 'Design Master',
    description: 'Win the community vote for best decorated home',
    icon: '🎨',
  },
};

export function formatLeaderboardScore(type: LeaderboardType, score: number): string {
  switch (type) {
    case 'most_expensive':
    case 'wealthiest':
      if (score >= 1000000) return `$${(score / 1000000).toFixed(1)}M`;
      if (score >= 1000) return `$${(score / 1000).toFixed(0)}K`;
      return `$${score}`;
    case 'highest_rated':
      return `${score.toFixed(1)}★`;
    default:
      if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
      if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
      return score.toString();
  }
}

export function getChallengeTimeRemaining(endDate: number): string {
  const now = Date.now();
  const diff = endDate - now;
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getChallengeStatusColor(status: ChallengeStatus): string {
  switch (status) {
    case 'upcoming': return '#3B82F6';
    case 'active': return '#22C55E';
    case 'voting': return '#F59E0B';
    case 'completed': return '#6B7280';
    default: return '#6B7280';
  }
}

export function getPrizeIcon(type: PrizeType): string {
  switch (type) {
    case 'coins': return '🪙';
    case 'gems': return '💎';
    case 'badge': return '🏅';
    case 'item': return '🎁';
    case 'title': return '👑';
    default: return '🎁';
  }
}
