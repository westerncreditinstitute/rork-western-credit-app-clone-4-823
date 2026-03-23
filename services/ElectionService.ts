import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Election, 
  MayorCandidate, 
  Mayor, 
  MayorApplication, 
  ElectionVote,
  VotingEligibility,
  ElectionCycle,
  ELECTION_CONFIG 
} from '@/types/election';
import { CITIES } from '@/mocks/cityData';

const ELECTIONS_STORAGE_KEY = 'credit_life_elections';
const MAYORS_STORAGE_KEY = 'credit_life_mayors';
const VOTES_STORAGE_KEY = 'credit_life_election_votes';
const ELECTION_CYCLES_STORAGE_KEY = 'credit_life_election_cycles';
const ELECTION_SCHEDULE_STORAGE_KEY = 'credit_life_election_schedule';

interface ElectionSchedule {
  cityId: string;
  lastElectionEndDate: number;
  nextElectionStartDate: number;
}

class ElectionServiceClass {
  private elections: Election[] = [];
  private mayors: Mayor[] = [];
  private votes: ElectionVote[] = [];
  private electionCycles: Map<string, ElectionCycle> = new Map(); // playerId -> cycle
  private electionSchedules: Map<string, ElectionSchedule> = new Map(); // cityId -> schedule
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const [electionsData, mayorsData, votesData, cyclesData, schedulesData] = await Promise.all([
        AsyncStorage.getItem(ELECTIONS_STORAGE_KEY),
        AsyncStorage.getItem(MAYORS_STORAGE_KEY),
        AsyncStorage.getItem(VOTES_STORAGE_KEY),
        AsyncStorage.getItem(ELECTION_CYCLES_STORAGE_KEY),
        AsyncStorage.getItem(ELECTION_SCHEDULE_STORAGE_KEY),
      ]);

      this.elections = electionsData ? JSON.parse(electionsData) : [];
      this.mayors = mayorsData ? JSON.parse(mayorsData) : [];
      this.votes = votesData ? JSON.parse(votesData) : [];
      
      if (cyclesData) {
        const cyclesObj = JSON.parse(cyclesData);
        this.electionCycles = new Map(Object.entries(cyclesObj));
      }
      
      if (schedulesData) {
        const schedulesObj = JSON.parse(schedulesData);
        this.electionSchedules = new Map(Object.entries(schedulesObj));
      }
      
      await this.initializeElectionsForAllCities();
      this.initialized = true;
      console.log('[ElectionService] Initialized with', this.elections.length, 'elections');
      console.log('[ElectionService] Election cycle: every', ELECTION_CONFIG.ELECTION_FREQUENCY_DAYS, 'days, duration:', ELECTION_CONFIG.ELECTION_DURATION_DAYS, 'days');
    } catch (error) {
      console.error('[ElectionService] Error initializing:', error);
      this.elections = [];
      this.mayors = [];
      this.votes = [];
    }
  }

  private async initializeElectionsForAllCities(): Promise<void> {
    let hasNewElections = false;
    const now = Date.now();

    for (const city of CITIES) {
      const existingElection = this.elections.find(
        e => e.cityId === city.id && e.status !== 'completed'
      );

      if (!existingElection) {
        // Check if we should start a new election based on schedule
        const schedule = this.electionSchedules.get(city.id);
        
        if (!schedule) {
          // First election for this city - start immediately
          const newElection = this.createNewElection(city.id, city.name, now);
          this.elections.push(newElection);
          hasNewElections = true;
          console.log('[ElectionService] Created initial election for', city.name);
        } else if (now >= schedule.nextElectionStartDate) {
          // Time for scheduled election
          const newElection = this.createNewElection(city.id, city.name, schedule.nextElectionStartDate);
          this.elections.push(newElection);
          hasNewElections = true;
          console.log('[ElectionService] Created scheduled election for', city.name);
        } else {
          // Waiting for next election cycle
          const daysUntilNext = Math.ceil((schedule.nextElectionStartDate - now) / (24 * 60 * 60 * 1000));
          console.log('[ElectionService]', city.name, 'next election in', daysUntilNext, 'days');
        }
      }
    }

    if (hasNewElections) {
      await Promise.all([this.saveElections(), this.saveElectionSchedules()]);
    }
  }

  private createNewElection(cityId: string, cityName: string, startDate?: number): Election {
    const electionStart = startDate || Date.now();
    // Application period: 15 days (first half of 30-day election)
    const applicationEndDate = electionStart + (ELECTION_CONFIG.APPLICATION_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    // Voting period: 15 days (second half of 30-day election)
    const votingStartDate = applicationEndDate;
    const votingEndDate = votingStartDate + (ELECTION_CONFIG.VOTING_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    console.log('[ElectionService] Creating election for', cityName);
    console.log('[ElectionService] Application period:', new Date(electionStart).toLocaleDateString(), 'to', new Date(applicationEndDate).toLocaleDateString());
    console.log('[ElectionService] Voting period:', new Date(votingStartDate).toLocaleDateString(), 'to', new Date(votingEndDate).toLocaleDateString());

    return {
      id: `election_${cityId}_${electionStart}`,
      cityId,
      cityName,
      status: 'accepting_applications',
      applicationStartDate: electionStart,
      applicationEndDate,
      votingStartDate,
      votingEndDate,
      candidates: [],
      selectedCandidates: [],
      totalVotes: 0,
    };
  }

  private async saveElections(): Promise<void> {
    try {
      await AsyncStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(this.elections));
    } catch (error) {
      console.error('[ElectionService] Error saving elections:', error);
    }
  }

  private async saveMayors(): Promise<void> {
    try {
      await AsyncStorage.setItem(MAYORS_STORAGE_KEY, JSON.stringify(this.mayors));
    } catch (error) {
      console.error('[ElectionService] Error saving mayors:', error);
    }
  }

  private async saveVotes(): Promise<void> {
    try {
      await AsyncStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(this.votes));
    } catch (error) {
      console.error('[ElectionService] Error saving votes:', error);
    }
  }

  private async saveElectionCycles(): Promise<void> {
    try {
      const cyclesObj = Object.fromEntries(this.electionCycles);
      await AsyncStorage.setItem(ELECTION_CYCLES_STORAGE_KEY, JSON.stringify(cyclesObj));
    } catch (error) {
      console.error('[ElectionService] Error saving election cycles:', error);
    }
  }

  private async saveElectionSchedules(): Promise<void> {
    try {
      const schedulesObj = Object.fromEntries(this.electionSchedules);
      await AsyncStorage.setItem(ELECTION_SCHEDULE_STORAGE_KEY, JSON.stringify(schedulesObj));
    } catch (error) {
      console.error('[ElectionService] Error saving election schedules:', error);
    }
  }

  private scheduleNextElection(cityId: string, currentElectionEndDate: number): void {
    // Next election starts 6 months (180 days) after current election ends
    const nextElectionStartDate = currentElectionEndDate + (ELECTION_CONFIG.ELECTION_FREQUENCY_DAYS * 24 * 60 * 60 * 1000);
    
    const schedule: ElectionSchedule = {
      cityId,
      lastElectionEndDate: currentElectionEndDate,
      nextElectionStartDate,
    };
    
    this.electionSchedules.set(cityId, schedule);
    
    const nextDate = new Date(nextElectionStartDate);
    console.log('[ElectionService] Next election for city', cityId, 'scheduled for', nextDate.toLocaleDateString());
  }

  private getCurrentElectionCycle(playerId: string): ElectionCycle {
    const now = Date.now();
    const existingCycle = this.electionCycles.get(playerId);
    
    if (existingCycle && existingCycle.endDate > now) {
      return existingCycle;
    }
    
    const cycleStart = now;
    const cycleEnd = now + (ELECTION_CONFIG.ELECTION_CYCLE_DAYS * 24 * 60 * 60 * 1000);
    
    const newCycle: ElectionCycle = {
      id: `cycle_${playerId}_${now}`,
      startDate: cycleStart,
      endDate: cycleEnd,
      cityVotes: {},
    };
    
    this.electionCycles.set(playerId, newCycle);
    this.saveElectionCycles();
    
    return newCycle;
  }

  hasVotedInCityThisCycle(playerId: string, cityId: string): boolean {
    const cycle = this.getCurrentElectionCycle(playerId);
    return !!cycle.cityVotes[cityId];
  }

  checkVotingEligibility(
    playerId: string,
    electionCityId: string,
    housingType: string,
    homeResidenceCityId?: string,
    hasMultipleProperties: boolean = false
  ): VotingEligibility {
    const isSharedResidence = housingType === 'shared_rental';
    const hasHomeResidence = !!homeResidenceCityId;
    const isHomeResidenceCity = homeResidenceCityId === electionCityId;
    const hasVotedThisCycle = this.hasVotedInCityThisCycle(playerId, electionCityId);
    
    if (isSharedResidence) {
      return {
        canVote: false,
        reason: 'Shared residence holders cannot vote in elections. You must own or rent your own property to vote.',
        isSharedResidence: true,
        isHomeResidence: false,
        homeResidenceCityId,
        hasVotedThisCycle,
      };
    }
    
    if (hasMultipleProperties && !hasHomeResidence) {
      return {
        canVote: false,
        reason: 'You have multiple properties. Please select a Home Residence to determine your voting city.',
        isSharedResidence: false,
        isHomeResidence: false,
        homeResidenceCityId: undefined,
        hasVotedThisCycle,
      };
    }
    
    if (hasHomeResidence && !isHomeResidenceCity) {
      return {
        canVote: false,
        reason: `You can only vote in your Home Residence city (${homeResidenceCityId ? 'your designated city' : 'not set'}).`,
        isSharedResidence: false,
        isHomeResidence: false,
        homeResidenceCityId,
        hasVotedThisCycle,
      };
    }
    
    if (hasVotedThisCycle) {
      return {
        canVote: false,
        reason: 'You have already voted in this city during the current election cycle.',
        isSharedResidence: false,
        isHomeResidence: true,
        homeResidenceCityId,
        hasVotedThisCycle: true,
      };
    }
    
    return {
      canVote: true,
      isSharedResidence: false,
      isHomeResidence: true,
      homeResidenceCityId,
      hasVotedThisCycle: false,
    };
  }

  getElectionForCity(cityId: string): Election | undefined {
    return this.elections.find(e => e.cityId === cityId && e.status !== 'completed');
  }

  getAllActiveElections(): Election[] {
    return this.elections.filter(e => e.status !== 'completed');
  }

  getMayorForCity(cityId: string): Mayor | undefined {
    const now = Date.now();
    return this.mayors.find(m => m.cityId === cityId && m.termEndDate > now);
  }

  getAllMayors(): Mayor[] {
    const now = Date.now();
    return this.mayors.filter(m => m.termEndDate > now);
  }

  canApplyForMayor(playerId: string, cityId: string, bankBalance: number): { 
    canApply: boolean; 
    reason?: string;
  } {
    const election = this.getElectionForCity(cityId);
    
    if (!election) {
      return { canApply: false, reason: 'No active election for this city' };
    }

    if (election.status !== 'accepting_applications') {
      return { canApply: false, reason: 'Applications are closed for this election' };
    }

    const alreadyApplied = election.candidates.some(c => c.playerId === playerId);
    if (alreadyApplied) {
      return { canApply: false, reason: 'You have already applied for this election' };
    }

    if (bankBalance < ELECTION_CONFIG.APPLICATION_FEE) {
      return { 
        canApply: false, 
        reason: `Insufficient funds. Application fee is $${ELECTION_CONFIG.APPLICATION_FEE.toLocaleString()}` 
      };
    }

    const currentMayor = this.getMayorForCity(cityId);
    if (currentMayor && currentMayor.playerId === playerId) {
      return { canApply: false, reason: 'You are already the mayor of this city' };
    }

    return { canApply: true };
  }

  async applyForMayor(
    application: MayorApplication,
    playerData: {
      playerName: string;
      avatar: any;
      profilePhotoUrl?: string;
      useCustomPhoto?: boolean;
      creditScore: number;
      netWorth: number;
    },
    leaderboardRank: number
  ): Promise<{ success: boolean; error?: string }> {
    await this.initialize();

    const { canApply, reason } = this.canApplyForMayor(
      application.playerId, 
      application.cityId, 
      application.applicationFee + 1
    );

    if (!canApply) {
      return { success: false, error: reason };
    }

    const election = this.getElectionForCity(application.cityId);
    if (!election) {
      return { success: false, error: 'No active election found' };
    }

    const candidate: MayorCandidate = {
      id: `candidate_${application.playerId}_${Date.now()}`,
      playerId: application.playerId,
      playerName: playerData.playerName,
      avatar: playerData.avatar,
      profilePhotoUrl: playerData.profilePhotoUrl,
      useCustomPhoto: playerData.useCustomPhoto,
      cityId: application.cityId,
      creditScore: playerData.creditScore,
      netWorth: playerData.netWorth,
      leaderboardRank,
      applicationDate: application.appliedAt,
      campaignPlatform: application.campaignPlatform,
      voteCount: 0,
    };

    election.candidates.push(candidate);
    await this.saveElections();

    console.log('[ElectionService] Player', playerData.playerName, 'applied for mayor of', election.cityName);
    return { success: true };
  }

  async transitionToVoting(electionId: string): Promise<void> {
    await this.initialize();

    const election = this.elections.find(e => e.id === electionId);
    if (!election || election.status !== 'accepting_applications') return;

    const sortedCandidates = [...election.candidates].sort(
      (a, b) => a.leaderboardRank - b.leaderboardRank
    );

    election.selectedCandidates = sortedCandidates.slice(0, ELECTION_CONFIG.MAX_CANDIDATES);
    election.status = 'voting';
    election.votingStartDate = Date.now();
    election.votingEndDate = Date.now() + (ELECTION_CONFIG.VOTING_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    await this.saveElections();
    console.log('[ElectionService] Election', electionId, 'transitioned to voting with', 
      election.selectedCandidates.length, 'candidates');
  }

  canVote(
    playerId: string, 
    electionId: string, 
    voterCityId: string,
    housingType?: string,
    homeResidenceCityId?: string,
    hasMultipleProperties?: boolean
  ): {
    canVote: boolean;
    reason?: string;
  } {
    const election = this.elections.find(e => e.id === electionId);
    
    if (!election) {
      return { canVote: false, reason: 'Election not found' };
    }

    if (election.status !== 'voting') {
      return { canVote: false, reason: 'Voting is not open for this election' };
    }

    if (housingType) {
      const eligibility = this.checkVotingEligibility(
        playerId,
        election.cityId,
        housingType,
        homeResidenceCityId,
        hasMultipleProperties
      );
      
      if (!eligibility.canVote) {
        return { canVote: false, reason: eligibility.reason };
      }
    } else {
      if (election.cityId !== voterCityId) {
        return { canVote: false, reason: 'You can only vote in your city\'s election' };
      }
    }

    const alreadyVoted = this.votes.some(
      v => v.electionId === electionId && v.oderId === playerId
    );
    if (alreadyVoted) {
      return { canVote: false, reason: 'You have already voted in this election' };
    }

    return { canVote: true };
  }

  async castVote(
    playerId: string, 
    electionId: string, 
    candidateId: string
  ): Promise<{ success: boolean; error?: string }> {
    await this.initialize();

    const election = this.elections.find(e => e.id === electionId);
    if (!election) {
      return { success: false, error: 'Election not found' };
    }

    const candidateToVoteFor = election.selectedCandidates.find(c => c.id === candidateId);
    if (!candidateToVoteFor) {
      return { success: false, error: 'Candidate not found' };
    }
    
    const cycle = this.getCurrentElectionCycle(playerId);
    
    const vote: ElectionVote = {
      oderId: playerId,
      electionId,
      candidateId,
      votedAt: Date.now(),
      voterCityId: election.cityId,
      electionCycleId: cycle.id,
    };
    
    cycle.cityVotes[election.cityId] = candidateId;
    await this.saveElectionCycles();

    this.votes.push(vote);
    candidateToVoteFor.voteCount += 1;
    election.totalVotes += 1;

    await Promise.all([this.saveVotes(), this.saveElections()]);

    console.log('[ElectionService] Vote cast for', candidateToVoteFor.playerName, 'in', election.cityName);
    return { success: true };
  }

  async completeElection(electionId: string): Promise<Mayor | null> {
    await this.initialize();

    const election = this.elections.find(e => e.id === electionId);
    if (!election || election.status !== 'voting') return null;

    const winner = [...election.selectedCandidates].sort(
      (a, b) => b.voteCount - a.voteCount
    )[0];

    if (!winner) return null;

    election.status = 'completed';
    election.winnerId = winner.playerId;
    election.winnerName = winner.playerName;

    const now = Date.now();
    // Mayor term is 6 months (180 days) - same as election frequency
    const newMayor: Mayor = {
      playerId: winner.playerId,
      playerName: winner.playerName,
      avatar: winner.avatar,
      profilePhotoUrl: winner.profilePhotoUrl,
      useCustomPhoto: winner.useCustomPhoto,
      cityId: election.cityId,
      cityName: election.cityName,
      electedDate: now,
      termEndDate: now + (ELECTION_CONFIG.TERM_LENGTH_DAYS * 24 * 60 * 60 * 1000),
      annualSalary: ELECTION_CONFIG.ANNUAL_SALARY,
      approvalRating: 75,
    };

    this.mayors = this.mayors.filter(m => m.cityId !== election.cityId);
    this.mayors.push(newMayor);

    // Schedule next election for 6 months from now (don't create immediately)
    this.scheduleNextElection(election.cityId, election.votingEndDate);

    await Promise.all([this.saveElections(), this.saveMayors(), this.saveElectionSchedules()]);

    console.log('[ElectionService]', winner.playerName, 'elected mayor of', election.cityName);
    console.log('[ElectionService] Mayor term ends:', new Date(newMayor.termEndDate).toLocaleDateString());
    return newMayor;
  }

  async checkAndUpdateElections(): Promise<void> {
    await this.initialize();
    const now = Date.now();

    for (const election of this.elections) {
      if (election.status === 'accepting_applications' && now >= election.applicationEndDate) {
        if (election.candidates.length >= 1) {
          await this.transitionToVoting(election.id);
        } else {
          election.applicationEndDate = now + (ELECTION_CONFIG.APPLICATION_PERIOD_DAYS * 24 * 60 * 60 * 1000);
          await this.saveElections();
        }
      } else if (election.status === 'voting' && now >= election.votingEndDate) {
        await this.completeElection(election.id);
      }
    }
  }

  isPlayerMayor(playerId: string): Mayor | undefined {
    const now = Date.now();
    return this.mayors.find(m => m.playerId === playerId && m.termEndDate > now);
  }

  getPlayerApplications(playerId: string): MayorCandidate[] {
    const applications: MayorCandidate[] = [];
    for (const election of this.elections) {
      const candidate = election.candidates.find(c => c.playerId === playerId);
      if (candidate) {
        applications.push(candidate);
      }
    }
    return applications;
  }

  hasPlayerVotedInElection(playerId: string, electionId: string): boolean {
    return this.votes.some(v => v.electionId === electionId && v.oderId === playerId);
  }

  getElectionById(electionId: string): Election | undefined {
    return this.elections.find(e => e.id === electionId);
  }

  getNextElectionDate(cityId: string): Date | null {
    const schedule = this.electionSchedules.get(cityId);
    if (schedule) {
      return new Date(schedule.nextElectionStartDate);
    }
    return null;
  }

  getElectionScheduleInfo(cityId: string): {
    hasActiveElection: boolean;
    nextElectionDate: Date | null;
    daysUntilNextElection: number | null;
    currentElectionDaysRemaining: number | null;
  } {
    const now = Date.now();
    const activeElection = this.getElectionForCity(cityId);
    const schedule = this.electionSchedules.get(cityId);
    
    let currentElectionDaysRemaining: number | null = null;
    if (activeElection) {
      const endDate = activeElection.status === 'voting' 
        ? activeElection.votingEndDate 
        : activeElection.applicationEndDate;
      currentElectionDaysRemaining = Math.max(0, Math.ceil((endDate - now) / (24 * 60 * 60 * 1000)));
    }
    
    return {
      hasActiveElection: !!activeElection,
      nextElectionDate: schedule ? new Date(schedule.nextElectionStartDate) : null,
      daysUntilNextElection: schedule 
        ? Math.max(0, Math.ceil((schedule.nextElectionStartDate - now) / (24 * 60 * 60 * 1000)))
        : null,
      currentElectionDaysRemaining,
    };
  }

  getElectionCycleInfo(): {
    frequencyDays: number;
    durationDays: number;
    applicationDays: number;
    votingDays: number;
  } {
    return {
      frequencyDays: ELECTION_CONFIG.ELECTION_FREQUENCY_DAYS,
      durationDays: ELECTION_CONFIG.ELECTION_DURATION_DAYS,
      applicationDays: ELECTION_CONFIG.APPLICATION_PERIOD_DAYS,
      votingDays: ELECTION_CONFIG.VOTING_PERIOD_DAYS,
    };
  }
}

export const ElectionService = new ElectionServiceClass();
