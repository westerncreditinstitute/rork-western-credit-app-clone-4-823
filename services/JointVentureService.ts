import { supabase } from '@/lib/supabase';
import {
  JointVentureData,
  JointVentureProposal,
  JointVentureDecision,
  JointVenturePartner,
  ProfitDistribution,
  CreateJointVentureRequest,
  ProposeDecisionRequest,
  VoteOnDecisionRequest,
  JointVentureStatus,
} from '@/types/multiplayer-business';
import { BusinessOperationResult } from '@/types/business';

export class JointVentureService {
  static async getActiveVentures(userId: string): Promise<JointVentureData[]> {
    try {
      const { data, error } = await supabase
        .from('joint_ventures')
        .select(`
          *,
          joint_venture_partners (*)
        `)
        .eq('status', 'active')
        .contains('partner_ids', [userId])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[JointVentureService] Error fetching ventures:', error);
        return [];
      }

      return (data || []).map(this.mapVentureFromDb);
    } catch (error) {
      console.error('[JointVentureService] Exception in getActiveVentures:', error);
      return [];
    }
  }

  static async getVentureById(ventureId: string): Promise<JointVentureData | null> {
    try {
      const { data, error } = await supabase
        .from('joint_ventures')
        .select(`
          *,
          joint_venture_partners (*),
          joint_venture_decisions (*)
        `)
        .eq('id', ventureId)
        .single();

      if (error) {
        console.error('[JointVentureService] Error fetching venture:', error);
        return null;
      }

      return this.mapVentureFromDb(data);
    } catch (error) {
      console.error('[JointVentureService] Exception in getVentureById:', error);
      return null;
    }
  }

  static async createVenture(
    request: CreateJointVentureRequest,
    creatorId: string,
    creatorName: string
  ): Promise<BusinessOperationResult<JointVentureData>> {
    try {
      const now = new Date().toISOString();
      const ventureId = `venture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from('joint_ventures')
        .insert({
          id: ventureId,
          name: request.name,
          business_id: request.businessId || null,
          category_id: request.categoryId,
          total_investment: request.initialInvestment,
          current_valuation: request.initialInvestment,
          monthly_revenue: 0,
          monthly_expenses: 0,
          monthly_profit: 0,
          total_profit_distributed: 0,
          partner_ids: [creatorId, ...request.partnerIds],
          status: 'proposed',
          terms: request.terms || '',
          founded_at: now,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[JointVentureService] Error creating venture:', error);
        return { success: false, error: 'Failed to create joint venture', errorCode: 'DATABASE_ERROR' };
      }

      const creatorShare = request.ownershipSplits[creatorId] || 50;
      await this.addPartner(ventureId, {
        id: `partner_${Date.now()}`,
        ventureId,
        userId: creatorId,
        userName: creatorName,
        ownershipPercentage: creatorShare,
        investmentAmount: (request.initialInvestment * creatorShare) / 100,
        role: 'founder',
        votingPower: creatorShare,
        profitShare: creatorShare,
        joinedAt: now,
        isActive: true,
      });

      console.log('[JointVentureService] Venture created:', ventureId);
      return { success: true, data: this.mapVentureFromDb(data) };
    } catch (error) {
      console.error('[JointVentureService] Exception in createVenture:', error);
      return { success: false, error: 'Failed to create joint venture', errorCode: 'EXCEPTION' };
    }
  }

  static async addPartner(ventureId: string, partner: JointVenturePartner): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('joint_venture_partners')
        .insert({
          id: partner.id,
          venture_id: ventureId,
          user_id: partner.userId,
          user_name: partner.userName,
          user_avatar: partner.userAvatar || null,
          ownership_percentage: partner.ownershipPercentage,
          investment_amount: partner.investmentAmount,
          role: partner.role,
          voting_power: partner.votingPower,
          profit_share: partner.profitShare,
          joined_at: partner.joinedAt,
          is_active: partner.isActive,
        });

      if (error) {
        console.error('[JointVentureService] Error adding partner:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[JointVentureService] Exception in addPartner:', error);
      return false;
    }
  }

  static async sendProposal(
    proposerId: string,
    proposerName: string,
    targetUserId: string,
    targetUserName: string,
    proposal: Partial<JointVentureProposal>
  ): Promise<BusinessOperationResult<JointVentureProposal>> {
    try {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const newProposal: JointVentureProposal = {
        id: `proposal_${Date.now()}`,
        proposerId,
        proposerName,
        targetUserId,
        targetUserName,
        businessId: proposal.businessId,
        businessName: proposal.businessName,
        proposedName: proposal.proposedName || 'Joint Venture',
        proposedCategory: proposal.proposedCategory || '',
        proposedOwnershipSplit: proposal.proposedOwnershipSplit || 50,
        proposedInvestment: proposal.proposedInvestment || 0,
        proposedTerms: proposal.proposedTerms || '',
        message: proposal.message || '',
        status: 'pending',
        expiresAt,
        createdAt: now,
        updatedAt: now,
      };

      const { error } = await supabase
        .from('joint_venture_proposals')
        .insert({
          id: newProposal.id,
          proposer_id: proposerId,
          proposer_name: proposerName,
          target_user_id: targetUserId,
          target_user_name: targetUserName,
          business_id: newProposal.businessId,
          business_name: newProposal.businessName,
          proposed_name: newProposal.proposedName,
          proposed_category: newProposal.proposedCategory,
          proposed_ownership_split: newProposal.proposedOwnershipSplit,
          proposed_investment: newProposal.proposedInvestment,
          proposed_terms: newProposal.proposedTerms,
          message: newProposal.message,
          status: 'pending',
          expires_at: expiresAt,
          created_at: now,
          updated_at: now,
        });

      if (error) {
        console.error('[JointVentureService] Error sending proposal:', error);
        return { success: false, error: 'Failed to send proposal', errorCode: 'DATABASE_ERROR' };
      }

      return { success: true, data: newProposal };
    } catch (error) {
      console.error('[JointVentureService] Exception in sendProposal:', error);
      return { success: false, error: 'Failed to send proposal', errorCode: 'EXCEPTION' };
    }
  }

  static async respondToProposal(
    proposalId: string,
    accept: boolean,
    userId: string
  ): Promise<BusinessOperationResult<JointVentureData | null>> {
    try {
      const { data: proposal, error: fetchError } = await supabase
        .from('joint_venture_proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (fetchError || !proposal) {
        return { success: false, error: 'Proposal not found', errorCode: 'POOL_NOT_FOUND' };
      }

      const now = new Date().toISOString();
      const newStatus = accept ? 'accepted' : 'rejected';

      await supabase
        .from('joint_venture_proposals')
        .update({ status: newStatus, updated_at: now })
        .eq('id', proposalId);

      if (accept) {
        const ventureResult = await this.createVenture(
          {
            name: proposal.proposed_name,
            businessId: proposal.business_id,
            categoryId: proposal.proposed_category,
            initialInvestment: proposal.proposed_investment * 2,
            partnerIds: [userId],
            ownershipSplits: {
              [proposal.proposer_id]: proposal.proposed_ownership_split,
              [userId]: 100 - proposal.proposed_ownership_split,
            },
            terms: proposal.proposed_terms,
          },
          proposal.proposer_id,
          proposal.proposer_name
        );

        if (ventureResult.success && ventureResult.data) {
          await this.addPartner(ventureResult.data.id, {
            id: `partner_${Date.now()}`,
            ventureId: ventureResult.data.id,
            userId,
            userName: proposal.target_user_name,
            ownershipPercentage: 100 - proposal.proposed_ownership_split,
            investmentAmount: proposal.proposed_investment,
            role: 'co_founder',
            votingPower: 100 - proposal.proposed_ownership_split,
            profitShare: 100 - proposal.proposed_ownership_split,
            joinedAt: now,
            isActive: true,
          });

          await supabase
            .from('joint_ventures')
            .update({ status: 'active', updated_at: now })
            .eq('id', ventureResult.data.id);

          return { success: true, data: ventureResult.data };
        }
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('[JointVentureService] Exception in respondToProposal:', error);
      return { success: false, error: 'Failed to respond to proposal', errorCode: 'EXCEPTION' };
    }
  }

  static async getPendingProposals(userId: string): Promise<JointVentureProposal[]> {
    try {
      const { data, error } = await supabase
        .from('joint_venture_proposals')
        .select('*')
        .eq('target_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[JointVentureService] Error fetching proposals:', error);
        return [];
      }

      return (data || []).map(this.mapProposalFromDb);
    } catch (error) {
      console.error('[JointVentureService] Exception in getPendingProposals:', error);
      return [];
    }
  }

  static async proposeDecision(
    request: ProposeDecisionRequest,
    proposerId: string,
    proposerName: string
  ): Promise<BusinessOperationResult<JointVentureDecision>> {
    try {
      const now = new Date().toISOString();
      const deadlineDays = request.deadlineDays || 3;
      const deadline = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString();

      const decision: JointVentureDecision = {
        id: `decision_${Date.now()}`,
        ventureId: request.ventureId,
        decisionType: request.decisionType,
        title: request.title,
        description: request.description,
        proposedBy: proposerId,
        proposedByName: proposerName,
        requiredApprovalPercentage: request.decisionType === 'dissolution' ? 75 : 51,
        currentApprovalPercentage: 0,
        votes: [],
        estimatedImpact: request.estimatedImpact || {},
        deadline,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      const { error } = await supabase
        .from('joint_venture_decisions')
        .insert({
          id: decision.id,
          venture_id: decision.ventureId,
          decision_type: decision.decisionType,
          title: decision.title,
          description: decision.description,
          proposed_by: decision.proposedBy,
          proposed_by_name: decision.proposedByName,
          required_approval_percentage: decision.requiredApprovalPercentage,
          current_approval_percentage: 0,
          estimated_impact: decision.estimatedImpact,
          deadline,
          status: 'pending',
          created_at: now,
          updated_at: now,
        });

      if (error) {
        console.error('[JointVentureService] Error proposing decision:', error);
        return { success: false, error: 'Failed to propose decision', errorCode: 'DATABASE_ERROR' };
      }

      return { success: true, data: decision };
    } catch (error) {
      console.error('[JointVentureService] Exception in proposeDecision:', error);
      return { success: false, error: 'Failed to propose decision', errorCode: 'EXCEPTION' };
    }
  }

  static async voteOnDecision(
    request: VoteOnDecisionRequest,
    partnerId: string,
    partnerName: string,
    votingPower: number
  ): Promise<BusinessOperationResult<boolean>> {
    try {
      const now = new Date().toISOString();

      const { error: voteError } = await supabase
        .from('joint_venture_votes')
        .insert({
          id: `vote_${Date.now()}`,
          decision_id: request.decisionId,
          partner_id: partnerId,
          partner_name: partnerName,
          vote: request.vote,
          voting_power: votingPower,
          comment: request.comment || null,
          voted_at: now,
        });

      if (voteError) {
        console.error('[JointVentureService] Error voting:', voteError);
        return { success: false, error: 'Failed to submit vote', errorCode: 'DATABASE_ERROR' };
      }

      await this.updateDecisionStatus(request.decisionId);

      return { success: true, data: true };
    } catch (error) {
      console.error('[JointVentureService] Exception in voteOnDecision:', error);
      return { success: false, error: 'Failed to submit vote', errorCode: 'EXCEPTION' };
    }
  }

  static async updateDecisionStatus(decisionId: string): Promise<void> {
    try {
      const { data: votes } = await supabase
        .from('joint_venture_votes')
        .select('*')
        .eq('decision_id', decisionId);

      const { data: decision } = await supabase
        .from('joint_venture_decisions')
        .select('*')
        .eq('id', decisionId)
        .single();

      if (!decision || !votes) return;

      const approvedPower = votes
        .filter((v: any) => v.vote === 'approve')
        .reduce((sum: number, v: any) => sum + v.voting_power, 0);

      const rejectedPower = votes
        .filter((v: any) => v.vote === 'reject')
        .reduce((sum: number, v: any) => sum + v.voting_power, 0);

      let newStatus = decision.status;
      if (approvedPower >= decision.required_approval_percentage) {
        newStatus = 'approved';
      } else if (rejectedPower > (100 - decision.required_approval_percentage)) {
        newStatus = 'rejected';
      }

      await supabase
        .from('joint_venture_decisions')
        .update({
          current_approval_percentage: approvedPower,
          status: newStatus,
          executed_at: newStatus === 'approved' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', decisionId);
    } catch (error) {
      console.error('[JointVentureService] Exception in updateDecisionStatus:', error);
    }
  }

  static async distributeProfit(
    ventureId: string,
    totalAmount: number
  ): Promise<BusinessOperationResult<ProfitDistribution>> {
    try {
      const { data: partners } = await supabase
        .from('joint_venture_partners')
        .select('*')
        .eq('venture_id', ventureId)
        .eq('is_active', true);

      if (!partners || partners.length === 0) {
        return { success: false, error: 'No active partners', errorCode: 'VALIDATION_ERROR' };
      }

      const now = new Date().toISOString();
      const distributions = partners.map((p: any) => ({
        partnerId: p.user_id,
        partnerName: p.user_name,
        amount: (totalAmount * p.profit_share) / 100,
        percentage: p.profit_share,
      }));

      const distribution: ProfitDistribution = {
        id: `dist_${Date.now()}`,
        ventureId,
        totalAmount,
        distributionDate: now,
        distributions,
        createdAt: now,
      };

      await supabase
        .from('profit_distributions')
        .insert({
          id: distribution.id,
          venture_id: ventureId,
          total_amount: totalAmount,
          distribution_date: now,
          distributions: distributions,
          created_at: now,
        });

      await supabase
        .from('joint_ventures')
        .update({
          total_profit_distributed: supabase.rpc('increment', { x: totalAmount }),
          last_profit_distribution: now,
          updated_at: now,
        })
        .eq('id', ventureId);

      return { success: true, data: distribution };
    } catch (error) {
      console.error('[JointVentureService] Exception in distributeProfit:', error);
      return { success: false, error: 'Failed to distribute profits', errorCode: 'EXCEPTION' };
    }
  }

  static async dissolveVenture(
    ventureId: string,
    reason: string
  ): Promise<BusinessOperationResult<boolean>> {
    try {
      const now = new Date().toISOString();

      await supabase
        .from('joint_ventures')
        .update({
          status: 'dissolved' as JointVentureStatus,
          dissolution_reason: reason,
          updated_at: now,
        })
        .eq('id', ventureId);

      await supabase
        .from('joint_venture_partners')
        .update({ is_active: false })
        .eq('venture_id', ventureId);

      return { success: true, data: true };
    } catch (error) {
      console.error('[JointVentureService] Exception in dissolveVenture:', error);
      return { success: false, error: 'Failed to dissolve venture', errorCode: 'EXCEPTION' };
    }
  }

  private static mapVentureFromDb(data: any): JointVentureData {
    return {
      id: data.id,
      name: data.name,
      businessId: data.business_id,
      businessName: data.business_name || data.name,
      categoryId: data.category_id,
      categoryName: data.category_name || '',
      totalInvestment: data.total_investment || 0,
      currentValuation: data.current_valuation || 0,
      monthlyRevenue: data.monthly_revenue || 0,
      monthlyExpenses: data.monthly_expenses || 0,
      monthlyProfit: data.monthly_profit || 0,
      totalProfitDistributed: data.total_profit_distributed || 0,
      partners: (data.joint_venture_partners || []).map((p: any) => ({
        id: p.id,
        ventureId: p.venture_id,
        userId: p.user_id,
        userName: p.user_name,
        userAvatar: p.user_avatar,
        ownershipPercentage: p.ownership_percentage,
        investmentAmount: p.investment_amount,
        role: p.role,
        votingPower: p.voting_power,
        profitShare: p.profit_share,
        joinedAt: p.joined_at,
        isActive: p.is_active,
      })),
      pendingDecisions: (data.joint_venture_decisions || [])
        .filter((d: any) => d.status === 'pending')
        .map((d: any) => ({
          id: d.id,
          ventureId: d.venture_id,
          decisionType: d.decision_type,
          title: d.title,
          description: d.description,
          proposedBy: d.proposed_by,
          proposedByName: d.proposed_by_name,
          requiredApprovalPercentage: d.required_approval_percentage,
          currentApprovalPercentage: d.current_approval_percentage,
          votes: [],
          estimatedImpact: d.estimated_impact || {},
          deadline: d.deadline,
          status: d.status,
          executedAt: d.executed_at,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        })),
      status: data.status,
      foundedAt: data.founded_at,
      lastProfitDistribution: data.last_profit_distribution,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static mapProposalFromDb(data: any): JointVentureProposal {
    return {
      id: data.id,
      proposerId: data.proposer_id,
      proposerName: data.proposer_name,
      targetUserId: data.target_user_id,
      targetUserName: data.target_user_name,
      businessId: data.business_id,
      businessName: data.business_name,
      proposedName: data.proposed_name,
      proposedCategory: data.proposed_category,
      proposedOwnershipSplit: data.proposed_ownership_split,
      proposedInvestment: data.proposed_investment,
      proposedTerms: data.proposed_terms,
      message: data.message,
      status: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
