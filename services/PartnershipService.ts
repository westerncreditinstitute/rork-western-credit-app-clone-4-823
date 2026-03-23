import { supabase } from '@/lib/supabase';
import {
  Partnership,
  PartnershipProposal,
  PartnershipTerms,
  PartnershipType,
  NegotiationMessage,
  PartnershipOperationResult,
} from '@/types/partnership';

export class PartnershipService {
  static async getProposalsByUser(userId: string): Promise<PartnershipProposal[]> {
    try {
      const { data, error } = await supabase
        .from('partnership_proposals')
        .select('*')
        .or(`proposer_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.log('[PartnershipService] Partnership proposals table may not exist:', errorMessage);
        return [];
      }

      return (data || []).map(this.mapProposalFromDb);
    } catch (error) {
      console.error('[PartnershipService] Exception in getProposalsByUser:', error);
      return [];
    }
  }

  static async getPartnershipsByUser(userId: string): Promise<Partnership[]> {
    try {
      const { data, error } = await supabase
        .from('partnerships')
        .select('*')
        .or(`partner_a_id.eq.${userId},partner_b_id.eq.${userId}`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.log('[PartnershipService] Partnerships table may not exist:', errorMessage);
        return [];
      }

      return (data || []).map(this.mapPartnershipFromDb);
    } catch (error) {
      console.error('[PartnershipService] Exception in getPartnershipsByUser:', error);
      return [];
    }
  }

  static async createProposal(
    businessId: string,
    businessName: string,
    proposerId: string,
    proposerName: string,
    recipientId: string,
    recipientName: string,
    partnershipType: PartnershipType,
    terms: PartnershipTerms,
    message: string
  ): Promise<PartnershipOperationResult<PartnershipProposal>> {
    try {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('partnership_proposals')
        .insert({
          business_id: businessId,
          business_name: businessName,
          proposer_id: proposerId,
          proposer_name: proposerName,
          recipient_id: recipientId,
          recipient_name: recipientName,
          partnership_type: partnershipType,
          proposed_terms: JSON.stringify(terms),
          message,
          status: 'pending',
          expires_at: expiresAt,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[PartnershipService] Error creating proposal:', error);
        return { success: false, error: 'Failed to create proposal', errorCode: 'DATABASE_ERROR' };
      }

      console.log('[PartnershipService] Proposal created:', data.id);
      return { success: true, data: this.mapProposalFromDb(data) };
    } catch (error) {
      console.error('[PartnershipService] Exception in createProposal:', error);
      return { success: false, error: 'Failed to create proposal', errorCode: 'DATABASE_ERROR' };
    }
  }

  static async respondToProposal(
    proposalId: string,
    userId: string,
    accept: boolean,
    counterTerms?: PartnershipTerms,
    message?: string
  ): Promise<PartnershipOperationResult<PartnershipProposal | Partnership>> {
    try {
      const { data: proposal, error: fetchError } = await supabase
        .from('partnership_proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (fetchError || !proposal) {
        return { success: false, error: 'Proposal not found', errorCode: 'PROPOSAL_NOT_FOUND' };
      }

      if (proposal.recipient_id !== userId) {
        return { success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' };
      }

      const now = new Date().toISOString();

      if (accept) {
        const { error: updateError } = await supabase
          .from('partnership_proposals')
          .update({ status: 'accepted', updated_at: now })
          .eq('id', proposalId);

        if (updateError) {
          return { success: false, error: 'Failed to accept proposal', errorCode: 'DATABASE_ERROR' };
        }

        const partnershipResult = await this.createPartnershipFromProposal(proposal);
        return partnershipResult;
      } else if (counterTerms) {
        const { data, error: updateError } = await supabase
          .from('partnership_proposals')
          .update({
            status: 'negotiating',
            counter_terms: JSON.stringify(counterTerms),
            updated_at: now,
          })
          .eq('id', proposalId)
          .select()
          .single();

        if (updateError) {
          return { success: false, error: 'Failed to counter proposal', errorCode: 'DATABASE_ERROR' };
        }

        if (message) {
          await this.addNegotiationMessage(proposalId, userId, proposal.recipient_name, message, counterTerms);
        }

        return { success: true, data: this.mapProposalFromDb(data) };
      } else {
        const { data, error: updateError } = await supabase
          .from('partnership_proposals')
          .update({ status: 'rejected', updated_at: now })
          .eq('id', proposalId)
          .select()
          .single();

        if (updateError) {
          return { success: false, error: 'Failed to reject proposal', errorCode: 'DATABASE_ERROR' };
        }

        return { success: true, data: this.mapProposalFromDb(data) };
      }
    } catch (error) {
      console.error('[PartnershipService] Exception in respondToProposal:', error);
      return { success: false, error: 'Failed to respond to proposal', errorCode: 'DATABASE_ERROR' };
    }
  }

  static async addNegotiationMessage(
    proposalId: string,
    senderId: string,
    senderName: string,
    message: string,
    termsUpdate?: Partial<PartnershipTerms>
  ): Promise<PartnershipOperationResult<NegotiationMessage>> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('negotiation_messages')
        .insert({
          proposal_id: proposalId,
          sender_id: senderId,
          sender_name: senderName,
          message,
          terms_update: termsUpdate ? JSON.stringify(termsUpdate) : null,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[PartnershipService] Error adding negotiation message:', error);
        return { success: false, error: 'Failed to add message', errorCode: 'DATABASE_ERROR' };
      }

      return {
        success: true,
        data: {
          id: data.id,
          proposalId: data.proposal_id,
          senderId: data.sender_id,
          senderName: data.sender_name,
          message: data.message,
          termsUpdate: data.terms_update ? JSON.parse(data.terms_update) : undefined,
          createdAt: data.created_at,
        },
      };
    } catch (error) {
      console.error('[PartnershipService] Exception in addNegotiationMessage:', error);
      return { success: false, error: 'Failed to add message', errorCode: 'DATABASE_ERROR' };
    }
  }

  static async getNegotiationHistory(proposalId: string): Promise<NegotiationMessage[]> {
    try {
      const { data, error } = await supabase
        .from('negotiation_messages')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[PartnershipService] Error fetching negotiation history:', error);
        return [];
      }

      return (data || []).map((msg) => ({
        id: msg.id,
        proposalId: msg.proposal_id,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        message: msg.message,
        termsUpdate: msg.terms_update ? JSON.parse(msg.terms_update) : undefined,
        createdAt: msg.created_at,
      }));
    } catch (error) {
      console.error('[PartnershipService] Exception in getNegotiationHistory:', error);
      return [];
    }
  }

  private static async createPartnershipFromProposal(
    proposal: any
  ): Promise<PartnershipOperationResult<Partnership>> {
    try {
      const now = new Date().toISOString();
      const terms = JSON.parse(proposal.proposed_terms);

      const { data, error } = await supabase
        .from('partnerships')
        .insert({
          business_id: proposal.business_id,
          business_name: proposal.business_name,
          partner_a_id: proposal.proposer_id,
          partner_a_name: proposal.proposer_name,
          partner_a_equity: 100 - terms.equityPercentage,
          partner_b_id: proposal.recipient_id,
          partner_b_name: proposal.recipient_name,
          partner_b_equity: terms.equityPercentage,
          partnership_type: proposal.partnership_type,
          terms: proposal.proposed_terms,
          status: 'active',
          total_invested: terms.initialInvestment,
          total_profit_distributed: 0,
          partner_a_profit_received: 0,
          partner_b_profit_received: 0,
          performance_metrics: JSON.stringify({
            monthsActive: 0,
            totalRevenue: 0,
            totalProfit: 0,
            averageMonthlyProfit: 0,
            roiPercentage: 0,
            profitTrend: 'stable',
          }),
          start_date: now,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[PartnershipService] Error creating partnership:', error);
        return { success: false, error: 'Failed to create partnership', errorCode: 'DATABASE_ERROR' };
      }

      console.log('[PartnershipService] Partnership created:', data.id);
      return { success: true, data: this.mapPartnershipFromDb(data) };
    } catch (error) {
      console.error('[PartnershipService] Exception in createPartnershipFromProposal:', error);
      return { success: false, error: 'Failed to create partnership', errorCode: 'DATABASE_ERROR' };
    }
  }

  static async terminatePartnership(
    partnershipId: string,
    userId: string,
    reason: string
  ): Promise<PartnershipOperationResult> {
    try {
      const { data: partnership, error: fetchError } = await supabase
        .from('partnerships')
        .select('*')
        .eq('id', partnershipId)
        .single();

      if (fetchError || !partnership) {
        return { success: false, error: 'Partnership not found', errorCode: 'PARTNERSHIP_NOT_FOUND' };
      }

      if (partnership.partner_a_id !== userId && partnership.partner_b_id !== userId) {
        return { success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' };
      }

      const now = new Date().toISOString();

      const { error } = await supabase
        .from('partnerships')
        .update({
          status: 'terminated',
          end_date: now,
          updated_at: now,
        })
        .eq('id', partnershipId);

      if (error) {
        return { success: false, error: 'Failed to terminate partnership', errorCode: 'DATABASE_ERROR' };
      }

      console.log('[PartnershipService] Partnership terminated:', partnershipId, reason);
      return { success: true };
    } catch (error) {
      console.error('[PartnershipService] Exception in terminatePartnership:', error);
      return { success: false, error: 'Failed to terminate partnership', errorCode: 'DATABASE_ERROR' };
    }
  }

  static async distributeProfits(
    partnershipId: string,
    totalProfit: number,
    totalRevenue: number
  ): Promise<PartnershipOperationResult> {
    try {
      const { data: partnership, error: fetchError } = await supabase
        .from('partnerships')
        .select('*')
        .eq('id', partnershipId)
        .single();

      if (fetchError || !partnership) {
        return { success: false, error: 'Partnership not found', errorCode: 'PARTNERSHIP_NOT_FOUND' };
      }

      const terms = JSON.parse(partnership.terms);
      const partnerAShare = totalProfit * ((100 - terms.equityPercentage) / 100);
      const partnerBShare = totalProfit * (terms.equityPercentage / 100);

      const now = new Date().toISOString();
      const metrics = JSON.parse(partnership.performance_metrics);

      const { error } = await supabase
        .from('partnerships')
        .update({
          total_profit_distributed: partnership.total_profit_distributed + totalProfit,
          partner_a_profit_received: partnership.partner_a_profit_received + partnerAShare,
          partner_b_profit_received: partnership.partner_b_profit_received + partnerBShare,
          performance_metrics: JSON.stringify({
            ...metrics,
            monthsActive: metrics.monthsActive + 1,
            totalRevenue: metrics.totalRevenue + totalRevenue,
            totalProfit: metrics.totalProfit + totalProfit,
            averageMonthlyProfit: (metrics.totalProfit + totalProfit) / (metrics.monthsActive + 1),
            roiPercentage: partnership.total_invested > 0
              ? ((metrics.totalProfit + totalProfit) / partnership.total_invested) * 100
              : 0,
          }),
          updated_at: now,
        })
        .eq('id', partnershipId);

      if (error) {
        return { success: false, error: 'Failed to distribute profits', errorCode: 'DATABASE_ERROR' };
      }

      console.log('[PartnershipService] Profits distributed:', {
        partnershipId,
        partnerAShare,
        partnerBShare,
      });

      return { success: true };
    } catch (error) {
      console.error('[PartnershipService] Exception in distributeProfits:', error);
      return { success: false, error: 'Failed to distribute profits', errorCode: 'DATABASE_ERROR' };
    }
  }

  static async getPartnershipById(partnershipId: string): Promise<Partnership | null> {
    try {
      const { data, error } = await supabase
        .from('partnerships')
        .select('*')
        .eq('id', partnershipId)
        .single();

      if (error) {
        console.error('[PartnershipService] Error fetching partnership:', error);
        return null;
      }

      return this.mapPartnershipFromDb(data);
    } catch (error) {
      console.error('[PartnershipService] Exception in getPartnershipById:', error);
      return null;
    }
  }

  private static mapProposalFromDb(data: any): PartnershipProposal {
    return {
      id: data.id,
      businessId: data.business_id,
      businessName: data.business_name,
      proposerId: data.proposer_id,
      proposerName: data.proposer_name,
      proposerAvatar: data.proposer_avatar,
      recipientId: data.recipient_id,
      recipientName: data.recipient_name,
      recipientAvatar: data.recipient_avatar,
      partnershipType: data.partnership_type,
      proposedTerms: JSON.parse(data.proposed_terms || '{}'),
      counterTerms: data.counter_terms ? JSON.parse(data.counter_terms) : undefined,
      message: data.message,
      status: data.status,
      direction: 'sent',
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      negotiationHistory: [],
    };
  }

  private static mapPartnershipFromDb(data: any): Partnership {
    return {
      id: data.id,
      businessId: data.business_id,
      businessName: data.business_name,
      partnerAId: data.partner_a_id,
      partnerAName: data.partner_a_name,
      partnerAAvatar: data.partner_a_avatar,
      partnerAEquity: data.partner_a_equity,
      partnerBId: data.partner_b_id,
      partnerBName: data.partner_b_name,
      partnerBAvatar: data.partner_b_avatar,
      partnerBEquity: data.partner_b_equity,
      partnershipType: data.partnership_type,
      terms: JSON.parse(data.terms || '{}'),
      status: data.status,
      totalInvested: data.total_invested,
      totalProfitDistributed: data.total_profit_distributed,
      partnerAProfitReceived: data.partner_a_profit_received,
      partnerBProfitReceived: data.partner_b_profit_received,
      performanceMetrics: JSON.parse(data.performance_metrics || '{}'),
      startDate: data.start_date,
      endDate: data.end_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
