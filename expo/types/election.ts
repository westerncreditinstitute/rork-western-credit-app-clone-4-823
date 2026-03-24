import { PlayerAvatar } from './game';

export interface MayorCandidate {
  id: string;
  playerId: string;
  playerName: string;
  avatar: PlayerAvatar;
  profilePhotoUrl?: string;
  useCustomPhoto?: boolean;
  cityId: string;
  creditScore: number;
  netWorth: number;
  leaderboardRank: number;
  applicationDate: number;
  campaignPlatform: string;
  voteCount: number;
}

export interface Election {
  id: string;
  cityId: string;
  cityName: string;
  status: 'accepting_applications' | 'voting' | 'completed';
  applicationStartDate: number;
  applicationEndDate: number;
  votingStartDate: number;
  votingEndDate: number;
  candidates: MayorCandidate[];
  selectedCandidates: MayorCandidate[];
  winnerId?: string;
  winnerName?: string;
  totalVotes: number;
}

export interface Mayor {
  playerId: string;
  playerName: string;
  avatar: PlayerAvatar;
  profilePhotoUrl?: string;
  useCustomPhoto?: boolean;
  cityId: string;
  cityName: string;
  electedDate: number;
  termEndDate: number;
  annualSalary: number;
  approvalRating: number;
}

export interface MayorApplication {
  playerId: string;
  cityId: string;
  applicationFee: number;
  campaignPlatform: string;
  appliedAt: number;
}

export interface ElectionVote {
  oderId: string;
  electionId: string;
  candidateId: string;
  votedAt: number;
  voterCityId: string;
  electionCycleId: string;
}

export interface VotingEligibility {
  canVote: boolean;
  reason?: string;
  isSharedResidence: boolean;
  isHomeResidence: boolean;
  homeResidenceCityId?: string;
  hasVotedThisCycle: boolean;
}

export const ELECTION_CONFIG = {
  APPLICATION_FEE: 75000,
  ANNUAL_SALARY: 250000,
  MONTHLY_SALARY: Math.round(250000 / 12),
  MAX_CANDIDATES: 5,
  TERM_LENGTH_DAYS: 180, // Mayor term is 6 months
  APPLICATION_PERIOD_DAYS: 15, // 15 days for applications
  VOTING_PERIOD_DAYS: 15, // 15 days for voting (total 30 day election)
  ELECTION_CYCLE_DAYS: 30, // One vote per city per cycle
  ELECTION_FREQUENCY_DAYS: 180, // Elections run every 6 months
  ELECTION_DURATION_DAYS: 30, // Total election period (application + voting)
} as const;

export interface ElectionCycle {
  id: string;
  startDate: number;
  endDate: number;
  cityVotes: Record<string, string>; // cityId -> candidateId voted for
}
