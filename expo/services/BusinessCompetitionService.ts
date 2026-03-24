import { supabase } from '@/lib/supabase';
import {
  BusinessCompetition,
  CompetitionParticipant,
  CompetitionLeaderboardEntry,
  CompetitionResult,
  CompetitionType,
  JoinCompetitionRequest,
  CompetitionPrize,
} from '@/types/multiplayer-business';
import { BusinessOperationResult } from '@/types/business';

export class BusinessCompetitionService {
  static async getActiveCompetitions(): Promise<BusinessCompetition[]> {
    try {
      const { data, error } = await supabase
        .from('business_competitions')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('start_date', { ascending: true });

      if (error) {
        console.error('[BusinessCompetitionService] Error fetching competitions:', error);
        return [];
      }

      return (data || []).map(this.mapCompetitionFromDb);
    } catch (error) {
      console.error('[BusinessCompetitionService] Exception in getActiveCompetitions:', error);
      return [];
    }
  }

  static async getCompetitionById(competitionId: string): Promise<BusinessCompetition | null> {
    try {
      const { data, error } = await supabase
        .from('business_competitions')
        .select(`
          *,
          competition_participants (*)
        `)
        .eq('id', competitionId)
        .single();

      if (error) {
        console.error('[BusinessCompetitionService] Error fetching competition:', error);
        return null;
      }

      const competition = this.mapCompetitionFromDb(data);
      competition.leaderboard = await this.getLeaderboard(competitionId);
      return competition;
    } catch (error) {
      console.error('[BusinessCompetitionService] Exception in getCompetitionById:', error);
      return null;
    }
  }

  static async getUserCompetitions(userId: string): Promise<BusinessCompetition[]> {
    try {
      const { data: participations, error: partError } = await supabase
        .from('competition_participants')
        .select('competition_id')
        .eq('user_id', userId);

      if (partError || !participations?.length) {
        return [];
      }

      const competitionIds = participations.map(p => p.competition_id);

      const { data, error } = await supabase
        .from('business_competitions')
        .select('*')
        .in('id', competitionIds)
        .order('end_date', { ascending: false });

      if (error) {
        console.error('[BusinessCompetitionService] Error fetching user competitions:', error);
        return [];
      }

      return (data || []).map(this.mapCompetitionFromDb);
    } catch (error) {
      console.error('[BusinessCompetitionService] Exception in getUserCompetitions:', error);
      return [];
    }
  }

  static async joinCompetition(
    request: JoinCompetitionRequest,
    userId: string,
    userName: string,
    userAvatar?: string
  ): Promise<BusinessOperationResult<CompetitionParticipant>> {
    try {
      const { data: competition, error: compError } = await supabase
        .from('business_competitions')
        .select('*')
        .eq('id', request.competitionId)
        .single();

      if (compError || !competition) {
        return { success: false, error: 'Competition not found', errorCode: 'POOL_NOT_FOUND' };
      }

      if (competition.status !== 'upcoming' && competition.status !== 'active') {
        return { success: false, error: 'Competition is not accepting participants', errorCode: 'POOL_NOT_OPEN' };
      }

      if (competition.current_participants >= competition.max_participants) {
        return { success: false, error: 'Competition is full', errorCode: 'POOL_FULL' };
      }

      const { data: existing } = await supabase
        .from('competition_participants')
        .select('id')
        .eq('competition_id', request.competitionId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        return { success: false, error: 'Already participating', errorCode: 'ALREADY_INVESTED' };
      }

      const { data: business, error: bizError } = await supabase
        .from('user_businesses')
        .select('*')
        .eq('id', request.businessId)
        .single();

      if (bizError || !business) {
        return { success: false, error: 'Business not found', errorCode: 'BUSINESS_NOT_FOUND' };
      }

      const startingMetric = this.getMetricValue(competition.type, business);
      const now = new Date().toISOString();

      const participant: CompetitionParticipant = {
        id: `participant_${Date.now()}`,
        competitionId: request.competitionId,
        userId,
        userName,
        userAvatar,
        businessId: request.businessId,
        businessName: business.business_name,
        startingMetric,
        currentMetric: startingMetric,
        change: 0,
        changePercentage: 0,
        rank: competition.current_participants + 1,
        joinedAt: now,
        updatedAt: now,
      };

      const { error: insertError } = await supabase
        .from('competition_participants')
        .insert({
          id: participant.id,
          competition_id: participant.competitionId,
          user_id: userId,
          user_name: userName,
          user_avatar: userAvatar || null,
          business_id: request.businessId,
          business_name: business.business_name,
          starting_metric: startingMetric,
          current_metric: startingMetric,
          change: 0,
          change_percentage: 0,
          rank: participant.rank,
          joined_at: now,
          updated_at: now,
        });

      if (insertError) {
        console.error('[BusinessCompetitionService] Error joining competition:', insertError);
        return { success: false, error: 'Failed to join competition', errorCode: 'DATABASE_ERROR' };
      }

      await supabase
        .from('business_competitions')
        .update({
          current_participants: competition.current_participants + 1,
          updated_at: now,
        })
        .eq('id', request.competitionId);

      console.log('[BusinessCompetitionService] Joined competition:', request.competitionId);
      return { success: true, data: participant };
    } catch (error) {
      console.error('[BusinessCompetitionService] Exception in joinCompetition:', error);
      return { success: false, error: 'Failed to join competition', errorCode: 'EXCEPTION' };
    }
  }

  static async getLeaderboard(competitionId: string): Promise<CompetitionLeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('competition_id', competitionId)
        .order('current_metric', { ascending: false });

      if (error) {
        console.error('[BusinessCompetitionService] Error fetching leaderboard:', error);
        return [];
      }

      return (data || []).map((p: any, index: number) => ({
        rank: index + 1,
        previousRank: p.previous_rank || index + 1,
        userId: p.user_id,
        userName: p.user_name,
        userAvatar: p.user_avatar,
        businessId: p.business_id,
        businessName: p.business_name,
        score: p.current_metric,
        change: p.change,
        changePercentage: p.change_percentage,
      }));
    } catch (error) {
      console.error('[BusinessCompetitionService] Exception in getLeaderboard:', error);
      return [];
    }
  }

  static async updateParticipantMetrics(competitionId: string): Promise<void> {
    try {
      const { data: competition } = await supabase
        .from('business_competitions')
        .select('type')
        .eq('id', competitionId)
        .single();

      if (!competition) return;

      const { data: participants } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('competition_id', competitionId);

      if (!participants?.length) return;

      for (const participant of participants) {
        const { data: business } = await supabase
          .from('user_businesses')
          .select('*')
          .eq('id', participant.business_id)
          .single();

        if (!business) continue;

        const currentMetric = this.getMetricValue(competition.type, business);
        const change = currentMetric - participant.starting_metric;
        const changePercentage = participant.starting_metric > 0
          ? (change / participant.starting_metric) * 100
          : 0;

        await supabase
          .from('competition_participants')
          .update({
            previous_rank: participant.rank,
            current_metric: currentMetric,
            change,
            change_percentage: changePercentage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', participant.id);
      }

      const { data: updatedParticipants } = await supabase
        .from('competition_participants')
        .select('id, current_metric')
        .eq('competition_id', competitionId)
        .order('current_metric', { ascending: false });

      if (updatedParticipants) {
        for (let i = 0; i < updatedParticipants.length; i++) {
          await supabase
            .from('competition_participants')
            .update({ rank: i + 1 })
            .eq('id', updatedParticipants[i].id);
        }
      }

      console.log('[BusinessCompetitionService] Updated metrics for competition:', competitionId);
    } catch (error) {
      console.error('[BusinessCompetitionService] Exception in updateParticipantMetrics:', error);
    }
  }

  static async completeCompetition(competitionId: string): Promise<BusinessOperationResult<CompetitionResult>> {
    try {
      const { data: competition, error: compError } = await supabase
        .from('business_competitions')
        .select('*')
        .eq('id', competitionId)
        .single();

      if (compError || !competition) {
        return { success: false, error: 'Competition not found', errorCode: 'POOL_NOT_FOUND' };
      }

      await this.updateParticipantMetrics(competitionId);
      const leaderboard = await this.getLeaderboard(competitionId);

      const prizes: CompetitionPrize[] = JSON.parse(competition.prizes || '[]');
      const winners = leaderboard.slice(0, prizes.length).map((entry, index) => ({
        rank: entry.rank,
        userId: entry.userId,
        userName: entry.userName,
        businessName: entry.businessName,
        score: entry.score,
        prize: prizes[index],
      }));

      const now = new Date().toISOString();
      const result: CompetitionResult = {
        id: `result_${Date.now()}`,
        competitionId,
        competitionName: competition.name,
        type: competition.type,
        finalLeaderboard: leaderboard,
        winners,
        totalParticipants: competition.current_participants,
        totalPrizeDistributed: prizes.reduce((sum, p) => sum + (p.amount || 0), 0),
        completedAt: now,
      };

      await supabase
        .from('competition_results')
        .insert({
          id: result.id,
          competition_id: competitionId,
          competition_name: competition.name,
          type: competition.type,
          final_leaderboard: leaderboard,
          winners,
          total_participants: competition.current_participants,
          total_prize_distributed: result.totalPrizeDistributed,
          completed_at: now,
        });

      await supabase
        .from('business_competitions')
        .update({ status: 'completed', updated_at: now })
        .eq('id', competitionId);

      console.log('[BusinessCompetitionService] Competition completed:', competitionId);
      return { success: true, data: result };
    } catch (error) {
      console.error('[BusinessCompetitionService] Exception in completeCompetition:', error);
      return { success: false, error: 'Failed to complete competition', errorCode: 'EXCEPTION' };
    }
  }

  static async createCompetition(
    competition: Partial<BusinessCompetition>,
    createdBy: string
  ): Promise<BusinessOperationResult<BusinessCompetition>> {
    try {
      const now = new Date().toISOString();
      const competitionId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from('business_competitions')
        .insert({
          id: competitionId,
          name: competition.name || 'Business Competition',
          description: competition.description || '',
          type: competition.type || 'sales',
          category_id: competition.categoryId || null,
          category_name: competition.categoryName || null,
          status: 'upcoming',
          start_date: competition.startDate || now,
          end_date: competition.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          min_participants: competition.minParticipants || 2,
          max_participants: competition.maxParticipants || 50,
          current_participants: 0,
          entry_fee: competition.entryFee || 0,
          prize_pool: competition.prizePool || 0,
          prizes: JSON.stringify(competition.prizes || []),
          rules: JSON.stringify(competition.rules || []),
          eligibility_requirements: JSON.stringify(competition.eligibilityRequirements || {}),
          created_by: createdBy,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[BusinessCompetitionService] Error creating competition:', error);
        return { success: false, error: 'Failed to create competition', errorCode: 'DATABASE_ERROR' };
      }

      console.log('[BusinessCompetitionService] Competition created:', competitionId);
      return { success: true, data: this.mapCompetitionFromDb(data) };
    } catch (error) {
      console.error('[BusinessCompetitionService] Exception in createCompetition:', error);
      return { success: false, error: 'Failed to create competition', errorCode: 'EXCEPTION' };
    }
  }

  static async getCompetitionResults(userId: string): Promise<CompetitionResult[]> {
    try {
      const { data, error } = await supabase
        .from('competition_results')
        .select('*')
        .order('completed_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[BusinessCompetitionService] Error fetching results:', error);
        return [];
      }

      return (data || []).map((r: any) => ({
        id: r.id,
        competitionId: r.competition_id,
        competitionName: r.competition_name,
        type: r.type,
        finalLeaderboard: r.final_leaderboard || [],
        winners: r.winners || [],
        totalParticipants: r.total_participants,
        totalPrizeDistributed: r.total_prize_distributed,
        completedAt: r.completed_at,
      }));
    } catch (error) {
      console.error('[BusinessCompetitionService] Exception in getCompetitionResults:', error);
      return [];
    }
  }

  private static getMetricValue(type: CompetitionType, business: any): number {
    switch (type) {
      case 'sales':
      case 'revenue_growth':
        return business.monthly_revenue || 0;
      case 'profit':
        return business.monthly_profit || 0;
      case 'customer_acquisition':
        return business.customer_count || 0;
      case 'market_share':
        return business.market_share || 0;
      case 'innovation':
        return business.innovation_score || 0;
      case 'efficiency':
        return business.monthly_revenue > 0
          ? (business.monthly_profit / business.monthly_revenue) * 100
          : 0;
      default:
        return 0;
    }
  }

  private static mapCompetitionFromDb(data: any): BusinessCompetition {
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      type: data.type,
      categoryId: data.category_id,
      categoryName: data.category_name,
      status: data.status,
      startDate: data.start_date,
      endDate: data.end_date,
      minParticipants: data.min_participants || 2,
      maxParticipants: data.max_participants || 50,
      currentParticipants: data.current_participants || 0,
      entryFee: data.entry_fee || 0,
      prizePool: data.prize_pool || 0,
      prizes: JSON.parse(data.prizes || '[]'),
      rules: JSON.parse(data.rules || '[]'),
      eligibilityRequirements: JSON.parse(data.eligibility_requirements || '{}'),
      leaderboard: [],
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
