export type JointVentureStatus = 
  | 'proposed'
  | 'negotiating'
  | 'active'
  | 'dissolved'
  | 'rejected';

export type PartnerRole = 
  | 'founder'
  | 'co_founder'
  | 'investor'
  | 'silent_partner'
  | 'managing_partner';

export type VoteType = 
  | 'approve'
  | 'reject'
  | 'abstain';

export type DecisionType =
  | 'expansion'
  | 'hiring'
  | 'investment'
  | 'pricing'
  | 'marketing'
  | 'operations'
  | 'dissolution';

export type CompetitionType =
  | 'sales'
  | 'profit'
  | 'revenue_growth'
  | 'customer_acquisition'
  | 'market_share'
  | 'innovation'
  | 'efficiency';

export type CompetitionStatus =
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'cancelled';

export type CompetitionPrizeType =
  | 'cash'
  | 'boost'
  | 'badge'
  | 'title'
  | 'unlock';

export interface JointVenturePartner {
  id: string;
  ventureId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  ownershipPercentage: number;
  investmentAmount: number;
  role: PartnerRole;
  votingPower: number;
  profitShare: number;
  joinedAt: string;
  isActive: boolean;
}

export interface JointVentureProposal {
  id: string;
  proposerId: string;
  proposerName: string;
  targetUserId: string;
  targetUserName: string;
  businessId?: string;
  businessName?: string;
  proposedName: string;
  proposedCategory: string;
  proposedOwnershipSplit: number;
  proposedInvestment: number;
  proposedTerms: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface JointVentureDecision {
  id: string;
  ventureId: string;
  decisionType: DecisionType;
  title: string;
  description: string;
  proposedBy: string;
  proposedByName: string;
  requiredApprovalPercentage: number;
  currentApprovalPercentage: number;
  votes: JointVentureVote[];
  estimatedImpact: {
    revenue?: number;
    expenses?: number;
    employees?: number;
    reputation?: number;
  };
  deadline: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  executedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JointVentureVote {
  id: string;
  decisionId: string;
  partnerId: string;
  partnerName: string;
  vote: VoteType;
  votingPower: number;
  comment?: string;
  votedAt: string;
}

export interface JointVentureData {
  id: string;
  name: string;
  businessId: string;
  businessName: string;
  categoryId: string;
  categoryName: string;
  totalInvestment: number;
  currentValuation: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  totalProfitDistributed: number;
  partners: JointVenturePartner[];
  pendingDecisions: JointVentureDecision[];
  status: JointVentureStatus;
  foundedAt: string;
  lastProfitDistribution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfitDistribution {
  id: string;
  ventureId: string;
  totalAmount: number;
  distributionDate: string;
  distributions: {
    partnerId: string;
    partnerName: string;
    amount: number;
    percentage: number;
  }[];
  createdAt: string;
}

export interface BusinessCompetition {
  id: string;
  name: string;
  description: string;
  type: CompetitionType;
  categoryId?: string;
  categoryName?: string;
  status: CompetitionStatus;
  startDate: string;
  endDate: string;
  minParticipants: number;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  prizePool: number;
  prizes: CompetitionPrize[];
  rules: string[];
  eligibilityRequirements: {
    minBusinessAge?: number;
    minRevenue?: number;
    maxRevenue?: number;
    categoryRestriction?: string[];
  };
  leaderboard: CompetitionLeaderboardEntry[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionPrize {
  rank: number;
  prizeType: CompetitionPrizeType;
  amount?: number;
  description: string;
  badgeId?: string;
  titleId?: string;
  boostType?: string;
  boostDuration?: number;
}

export interface CompetitionParticipant {
  id: string;
  competitionId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  businessId: string;
  businessName: string;
  startingMetric: number;
  currentMetric: number;
  change: number;
  changePercentage: number;
  rank: number;
  previousRank?: number;
  joinedAt: string;
  updatedAt: string;
}

export interface CompetitionLeaderboardEntry {
  rank: number;
  previousRank?: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  businessId: string;
  businessName: string;
  score: number;
  change: number;
  changePercentage: number;
  isCurrentUser?: boolean;
}

export interface CompetitionResult {
  id: string;
  competitionId: string;
  competitionName: string;
  type: CompetitionType;
  finalLeaderboard: CompetitionLeaderboardEntry[];
  winners: {
    rank: number;
    userId: string;
    userName: string;
    businessName: string;
    score: number;
    prize: CompetitionPrize;
  }[];
  totalParticipants: number;
  totalPrizeDistributed: number;
  completedAt: string;
}

export interface CreateJointVentureRequest {
  name: string;
  businessId?: string;
  categoryId: string;
  initialInvestment: number;
  partnerIds: string[];
  ownershipSplits: Record<string, number>;
  terms?: string;
}

export interface JoinCompetitionRequest {
  competitionId: string;
  businessId: string;
}

export interface ProposeDecisionRequest {
  ventureId: string;
  decisionType: DecisionType;
  title: string;
  description: string;
  estimatedImpact?: {
    revenue?: number;
    expenses?: number;
    employees?: number;
    reputation?: number;
  };
  deadlineDays?: number;
}

export interface VoteOnDecisionRequest {
  decisionId: string;
  vote: VoteType;
  comment?: string;
}

export function formatCompetitionType(type: CompetitionType): string {
  switch (type) {
    case 'sales':
      return 'Sales Competition';
    case 'profit':
      return 'Profit Challenge';
    case 'revenue_growth':
      return 'Revenue Growth';
    case 'customer_acquisition':
      return 'Customer Acquisition';
    case 'market_share':
      return 'Market Share Battle';
    case 'innovation':
      return 'Innovation Challenge';
    case 'efficiency':
      return 'Efficiency Race';
    default:
      return 'Competition';
  }
}

export function formatDecisionType(type: DecisionType): string {
  switch (type) {
    case 'expansion':
      return 'Business Expansion';
    case 'hiring':
      return 'Hiring Decision';
    case 'investment':
      return 'Investment';
    case 'pricing':
      return 'Pricing Strategy';
    case 'marketing':
      return 'Marketing Campaign';
    case 'operations':
      return 'Operations Change';
    case 'dissolution':
      return 'Dissolution';
    default:
      return 'Decision';
  }
}

export function formatPartnerRole(role: PartnerRole): string {
  switch (role) {
    case 'founder':
      return 'Founder';
    case 'co_founder':
      return 'Co-Founder';
    case 'investor':
      return 'Investor';
    case 'silent_partner':
      return 'Silent Partner';
    case 'managing_partner':
      return 'Managing Partner';
    default:
      return 'Partner';
  }
}

export function getCompetitionTypeColor(type: CompetitionType): string {
  switch (type) {
    case 'sales':
      return '#3B82F6';
    case 'profit':
      return '#10B981';
    case 'revenue_growth':
      return '#8B5CF6';
    case 'customer_acquisition':
      return '#F59E0B';
    case 'market_share':
      return '#EF4444';
    case 'innovation':
      return '#06B6D4';
    case 'efficiency':
      return '#EC4899';
    default:
      return '#6B7280';
  }
}

export function getCompetitionStatusColor(status: CompetitionStatus): string {
  switch (status) {
    case 'upcoming':
      return '#F59E0B';
    case 'active':
      return '#10B981';
    case 'completed':
      return '#6B7280';
    case 'cancelled':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

export function getVentureStatusColor(status: JointVentureStatus): string {
  switch (status) {
    case 'proposed':
      return '#F59E0B';
    case 'negotiating':
      return '#3B82F6';
    case 'active':
      return '#10B981';
    case 'dissolved':
      return '#6B7280';
    case 'rejected':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

export function calculateVotingProgress(decision: JointVentureDecision): {
  approvedPercentage: number;
  rejectedPercentage: number;
  pendingPercentage: number;
  totalVoted: number;
  totalVoters: number;
} {
  const totalVotingPower = decision.votes.reduce((sum, v) => sum + v.votingPower, 0) || 100;
  const approvedPower = decision.votes
    .filter(v => v.vote === 'approve')
    .reduce((sum, v) => sum + v.votingPower, 0);
  const rejectedPower = decision.votes
    .filter(v => v.vote === 'reject')
    .reduce((sum, v) => sum + v.votingPower, 0);
  
  return {
    approvedPercentage: (approvedPower / totalVotingPower) * 100,
    rejectedPercentage: (rejectedPower / totalVotingPower) * 100,
    pendingPercentage: 100 - ((approvedPower + rejectedPower) / totalVotingPower) * 100,
    totalVoted: decision.votes.filter(v => v.vote !== 'abstain').length,
    totalVoters: decision.votes.length,
  };
}

export function getTimeRemaining(deadline: string): {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
  formatted: string;
} {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true, formatted: 'Expired' };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  let formatted = '';
  if (days > 0) formatted = `${days}d ${hours}h`;
  else if (hours > 0) formatted = `${hours}h ${minutes}m`;
  else formatted = `${minutes}m`;
  
  return { days, hours, minutes, isExpired: false, formatted };
}
