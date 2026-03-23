export interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  creditScore: number;
  netWorth: number;
  level: number;
  xp: number;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: number;
  joinedAt: number;
  guildId?: string;
  mentorId?: string;
  menteeIds?: string[];
  badges: Badge[];
  stats: PlayerStats;
}

export interface PlayerStats {
  totalGamesPlayed: number;
  tournamentsWon: number;
  tournamentsPlayed: number;
  challengesCompleted: number;
  challengesWon: number;
  friendsHelped: number;
  mentorshipScore: number;
  weeklyRank: number;
  monthlyRank: number;
  allTimeRank: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Friend {
  id: string;
  playerId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: number;
  acceptedAt?: number;
  player: Player;
}

export interface FriendRequest {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: number;
  fromPlayer: Player;
}

export interface Guild {
  id: string;
  name: string;
  description: string;
  tag: string;
  logoUrl?: string;
  bannerColor: string;
  leaderId: string;
  officerIds: string[];
  memberIds: string[];
  maxMembers: number;
  level: number;
  xp: number;
  createdAt: number;
  stats: GuildStats;
  requirements: GuildRequirements;
  perks: GuildPerk[];
  isOpen: boolean;
  weeklyChallenge?: WeeklyChallenge;
}

export interface GuildStats {
  totalMembers: number;
  avgCreditScore: number;
  avgNetWorth: number;
  tournamentsWon: number;
  challengesCompleted: number;
  weeklyContributions: number;
  rank: number;
}

export interface GuildRequirements {
  minCreditScore?: number;
  minNetWorth?: number;
  minLevel?: number;
  applicationRequired: boolean;
}

export interface GuildPerk {
  id: string;
  name: string;
  description: string;
  icon: string;
  effect: 'xp_boost' | 'credit_boost' | 'income_boost' | 'challenge_reward';
  value: number;
  unlockedAtLevel: number;
}

export interface GuildApplication {
  id: string;
  guildId: string;
  playerId: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  player: Player;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  type: 'solo' | 'team' | 'guild';
  category: 'credit_improvement' | 'net_worth' | 'savings' | 'debt_reduction' | 'mixed';
  status: 'upcoming' | 'active' | 'completed';
  startDate: number;
  endDate: number;
  entryFee: number;
  prizePool: number;
  prizes: TournamentPrize[];
  participants: TournamentParticipant[];
  maxParticipants: number;
  rules: string[];
  requirements: TournamentRequirements;
  leaderboard: TournamentLeaderboardEntry[];
}

export interface TournamentPrize {
  rank: number;
  reward: 'tokens' | 'badge' | 'xp' | 'title';
  amount: number;
  description: string;
}

export interface TournamentParticipant {
  playerId: string;
  player: Player;
  guildId?: string;
  teamId?: string;
  score: number;
  rank: number;
  joinedAt: number;
  progress: TournamentProgress;
}

export interface TournamentProgress {
  startingScore: number;
  currentScore: number;
  improvement: number;
  milestones: TournamentMilestone[];
}

export interface TournamentMilestone {
  id: string;
  name: string;
  completed: boolean;
  completedAt?: number;
  points: number;
}

export interface TournamentLeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  avatarUrl?: string;
  score: number;
  improvement: number;
  guildName?: string;
}

export interface TournamentRequirements {
  minLevel?: number;
  minCreditScore?: number;
  maxCreditScore?: number;
  guildRequired?: boolean;
}

export interface CommunityEvent {
  id: string;
  name: string;
  description: string;
  type: 'challenge' | 'celebration' | 'competition' | 'learning' | 'charity';
  status: 'upcoming' | 'active' | 'completed';
  startDate: number;
  endDate: number;
  imageUrl?: string;
  rewards: EventReward[];
  goals: EventGoal[];
  participants: number;
  progress: number;
  requirements?: EventRequirements;
}

export interface EventReward {
  id: string;
  type: 'tokens' | 'badge' | 'xp' | 'title' | 'item';
  amount: number;
  description: string;
  tier: 'participation' | 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface EventGoal {
  id: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
}

export interface EventRequirements {
  minLevel?: number;
  guildRequired?: boolean;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  category: 'credit' | 'savings' | 'spending' | 'earning' | 'learning';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  status: 'available' | 'active' | 'completed' | 'expired';
  startDate: number;
  endDate: number;
  goal: ChallengeGoal;
  reward: ChallengeReward;
  participants: number;
  completions: number;
}

export interface ChallengeGoal {
  type: 'credit_score' | 'savings' | 'reduce_debt' | 'earn_income' | 'on_time_payments';
  target: number;
  current: number;
  unit: string;
}

export interface ChallengeReward {
  tokens: number;
  xp: number;
  badge?: Badge;
}

export interface WeeklyChallenge {
  id: string;
  name: string;
  description: string;
  goal: ChallengeGoal;
  reward: ChallengeReward;
  startDate: number;
  endDate: number;
  guildProgress: number;
  completed: boolean;
}

export interface Mentorship {
  id: string;
  mentorId: string;
  menteeId: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startDate: number;
  endDate?: number;
  goals: MentorshipGoal[];
  sessions: MentorshipSession[];
  rating?: number;
  feedback?: string;
  mentor: Player;
  mentee: Player;
}

export interface MentorshipGoal {
  id: string;
  description: string;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  completedAt?: number;
}

export interface MentorshipSession {
  id: string;
  date: number;
  duration: number;
  topic: string;
  notes?: string;
  completed: boolean;
}

export interface MentorProfile {
  playerId: string;
  player: Player;
  isAvailable: boolean;
  specialties: string[];
  experience: number;
  rating: number;
  reviewCount: number;
  menteesHelped: number;
  maxMentees: number;
  currentMentees: number;
  bio: string;
}

export interface ChatRoom {
  id: string;
  type: 'global' | 'guild' | 'private' | 'tournament' | 'event';
  name: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  type: 'text' | 'system' | 'achievement' | 'challenge' | 'invite';
  timestamp: number;
  reactions: MessageReaction[];
  isRead: boolean;
  metadata?: MessageMetadata;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface MessageMetadata {
  achievementId?: string;
  challengeId?: string;
  inviteType?: 'guild' | 'tournament' | 'friend' | 'mentorship';
  inviteId?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: number;
  data?: NotificationData;
}

export type NotificationType = 
  | 'friend_request'
  | 'friend_accepted'
  | 'guild_invite'
  | 'guild_application'
  | 'tournament_start'
  | 'tournament_end'
  | 'challenge_complete'
  | 'event_start'
  | 'mentorship_request'
  | 'chat_message'
  | 'achievement'
  | 'leaderboard_change';

export interface NotificationData {
  playerId?: string;
  playerName?: string;
  guildId?: string;
  guildName?: string;
  tournamentId?: string;
  challengeId?: string;
  eventId?: string;
  mentorshipId?: string;
  chatRoomId?: string;
  achievementId?: string;
  rank?: number;
}

export interface SocialShare {
  type: 'achievement' | 'milestone' | 'tournament_win' | 'credit_score' | 'net_worth';
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
}

export interface MultiplayerState {
  currentPlayer: Player | null;
  friends: Friend[];
  friendRequests: FriendRequest[];
  guild: Guild | null;
  guildApplications: GuildApplication[];
  activeTournaments: Tournament[];
  communityEvents: CommunityEvent[];
  activeChallenges: Challenge[];
  mentorship: Mentorship | null;
  mentorProfiles: MentorProfile[];
  chatRooms: ChatRoom[];
  notifications: Notification[];
  isConnected: boolean;
  unreadNotifications: number;
}
