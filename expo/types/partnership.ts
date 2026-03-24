export type PartnershipStatus = 
  | 'pending'
  | 'negotiating'
  | 'accepted'
  | 'active'
  | 'rejected'
  | 'terminated'
  | 'expired';

export type PartnershipType = 
  | 'equity'
  | 'revenue_share'
  | 'joint_venture'
  | 'strategic'
  | 'silent';

export type ProposalDirection = 'sent' | 'received';

export interface PartnershipTerms {
  equityPercentage: number;
  revenueSharePercentage: number;
  initialInvestment: number;
  minimumCommitmentMonths: number;
  profitDistributionSchedule: 'monthly' | 'quarterly' | 'yearly';
  decisionMakingRights: 'equal' | 'majority' | 'limited';
  exitClause: string;
  nonCompeteMonths: number;
  responsibilities: string[];
}

export interface PartnershipProposal {
  id: string;
  businessId: string;
  businessName: string;
  proposerId: string;
  proposerName: string;
  proposerAvatar?: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  partnershipType: PartnershipType;
  proposedTerms: PartnershipTerms;
  counterTerms?: PartnershipTerms;
  message: string;
  status: PartnershipStatus;
  direction: ProposalDirection;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  negotiationHistory: NegotiationMessage[];
}

export interface NegotiationMessage {
  id: string;
  proposalId: string;
  senderId: string;
  senderName: string;
  message: string;
  termsUpdate?: Partial<PartnershipTerms>;
  createdAt: string;
}

export interface Partnership {
  id: string;
  businessId: string;
  businessName: string;
  partnerAId: string;
  partnerAName: string;
  partnerAAvatar?: string;
  partnerAEquity: number;
  partnerBId: string;
  partnerBName: string;
  partnerBAvatar?: string;
  partnerBEquity: number;
  partnershipType: PartnershipType;
  terms: PartnershipTerms;
  status: PartnershipStatus;
  totalInvested: number;
  totalProfitDistributed: number;
  partnerAProfitReceived: number;
  partnerBProfitReceived: number;
  performanceMetrics: PartnershipPerformance;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnershipPerformance {
  monthsActive: number;
  totalRevenue: number;
  totalProfit: number;
  averageMonthlyProfit: number;
  roiPercentage: number;
  profitTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface PartnershipNotification {
  id: string;
  userId: string;
  partnershipId?: string;
  proposalId?: string;
  type: PartnershipNotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type PartnershipNotificationType =
  | 'proposal_received'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'proposal_expired'
  | 'counter_offer'
  | 'profit_distribution'
  | 'partnership_terminated'
  | 'partnership_milestone';

export interface PoolMessage {
  id: string;
  poolId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  message: string;
  messageType: 'text' | 'system' | 'vote' | 'profit_update';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PoolVote {
  id: string;
  poolId: string;
  creatorId: string;
  title: string;
  description: string;
  options: VoteOption[];
  votingDeadline: string;
  status: 'active' | 'closed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface VoteOption {
  id: string;
  label: string;
  votes: string[];
  percentage: number;
}

export interface PoolContributor {
  id: string;
  poolId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  contributionAmount: number;
  ownershipPercentage: number;
  joinedAt: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface PoolUpdate {
  id: string;
  poolId: string;
  updateType: 'contribution' | 'profit' | 'milestone' | 'announcement';
  title: string;
  description: string;
  amount?: number;
  createdAt: string;
}

export interface PartnershipOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: PartnershipErrorCode;
}

export type PartnershipErrorCode =
  | 'PROPOSAL_NOT_FOUND'
  | 'PARTNERSHIP_NOT_FOUND'
  | 'BUSINESS_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'ALREADY_PARTNERS'
  | 'PROPOSAL_EXPIRED'
  | 'INVALID_TERMS'
  | 'INSUFFICIENT_EQUITY'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR';

export function formatPartnershipType(type: PartnershipType): string {
  switch (type) {
    case 'equity': return 'Equity Partnership';
    case 'revenue_share': return 'Revenue Share';
    case 'joint_venture': return 'Joint Venture';
    case 'strategic': return 'Strategic Alliance';
    case 'silent': return 'Silent Partnership';
    default: return 'Partnership';
  }
}

export function formatPartnershipStatus(status: PartnershipStatus): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'negotiating': return 'Negotiating';
    case 'accepted': return 'Accepted';
    case 'active': return 'Active';
    case 'rejected': return 'Rejected';
    case 'terminated': return 'Terminated';
    case 'expired': return 'Expired';
    default: return 'Unknown';
  }
}

export function getPartnershipStatusColor(status: PartnershipStatus): string {
  switch (status) {
    case 'pending': return '#F59E0B';
    case 'negotiating': return '#3B82F6';
    case 'accepted': return '#10B981';
    case 'active': return '#22C55E';
    case 'rejected': return '#EF4444';
    case 'terminated': return '#6B7280';
    case 'expired': return '#9CA3AF';
    default: return '#6B7280';
  }
}

export function getPartnershipTypeColor(type: PartnershipType): string {
  switch (type) {
    case 'equity': return '#8B5CF6';
    case 'revenue_share': return '#10B981';
    case 'joint_venture': return '#3B82F6';
    case 'strategic': return '#F59E0B';
    case 'silent': return '#6B7280';
    default: return '#6B7280';
  }
}

export function createDefaultTerms(): PartnershipTerms {
  return {
    equityPercentage: 25,
    revenueSharePercentage: 0,
    initialInvestment: 0,
    minimumCommitmentMonths: 12,
    profitDistributionSchedule: 'monthly',
    decisionMakingRights: 'limited',
    exitClause: 'Partner may exit with 30-day notice after minimum commitment period',
    nonCompeteMonths: 6,
    responsibilities: [],
  };
}

export function calculatePartnerProfit(
  totalProfit: number,
  equityPercentage: number,
  revenueSharePercentage: number,
  totalRevenue: number
): number {
  const equityProfit = totalProfit * (equityPercentage / 100);
  const revenueShare = totalRevenue * (revenueSharePercentage / 100);
  return equityProfit + revenueShare;
}
