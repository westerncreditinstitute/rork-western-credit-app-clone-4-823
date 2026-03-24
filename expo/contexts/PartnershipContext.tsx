import { useState, useEffect, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/contexts/AuthContext';
import { PartnershipService } from '@/services/PartnershipService';
import {
  Partnership,
  PartnershipProposal,
  PartnershipTerms,
  PartnershipType,
  PartnershipOperationResult,
  PartnershipNotification,
  createDefaultTerms,
} from '@/types/partnership';

interface PartnershipState {
  proposals: PartnershipProposal[];
  partnerships: Partnership[];
  notifications: PartnershipNotification[];
  isLoading: boolean;
  isSyncing: boolean;
}

const createInitialState = (): PartnershipState => ({
  proposals: [],
  partnerships: [],
  notifications: [],
  isLoading: true,
  isSyncing: false,
});

export const [PartnershipProvider, usePartnership] = createContextHook(() => {
  const auth = useAuth();
  const userId = auth?.user?.id || '';
  const userName = auth?.user?.name || 'User';
  const isAuthenticated = !!auth?.user?.id;

  const [state, setState] = useState<PartnershipState>(createInitialState());

  const loadProposals = useCallback(async () => {
    if (!isAuthenticated || !userId) return;

    try {
      const proposals = await PartnershipService.getProposalsByUser(userId);
      
      const mappedProposals = proposals.map(p => ({
        ...p,
        direction: p.proposerId === userId ? 'sent' : 'received',
      })) as PartnershipProposal[];

      setState(prev => ({ ...prev, proposals: mappedProposals }));
      console.log('[PartnershipContext] Loaded proposals:', proposals.length);
    } catch (error) {
      console.error('[PartnershipContext] Error loading proposals:', error);
    }
  }, [isAuthenticated, userId]);

  const loadPartnerships = useCallback(async () => {
    if (!isAuthenticated || !userId) return;

    try {
      const partnerships = await PartnershipService.getPartnershipsByUser(userId);
      setState(prev => ({ ...prev, partnerships }));
      console.log('[PartnershipContext] Loaded partnerships:', partnerships.length);
    } catch (error) {
      console.error('[PartnershipContext] Error loading partnerships:', error);
    }
  }, [isAuthenticated, userId]);

  const initialize = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    await Promise.all([loadProposals(), loadPartnerships()]);
    
    setState(prev => ({ ...prev, isLoading: false }));
  }, [loadProposals, loadPartnerships]);

  useEffect(() => {
    if (isAuthenticated) {
      initialize();
    }
  }, [isAuthenticated, initialize]);

  const sendProposal = useCallback(async (
    businessId: string,
    businessName: string,
    recipientId: string,
    recipientName: string,
    partnershipType: PartnershipType,
    terms: PartnershipTerms,
    message: string
  ): Promise<PartnershipOperationResult<PartnershipProposal>> => {
    if (!userId) {
      return { success: false, error: 'Not authenticated', errorCode: 'UNAUTHORIZED' };
    }

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      const result = await PartnershipService.createProposal(
        businessId,
        businessName,
        userId,
        userName,
        recipientId,
        recipientName,
        partnershipType,
        terms,
        message
      );

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          proposals: [{ ...result.data!, direction: 'sent' as const }, ...prev.proposals],
        }));
      }

      return result;
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [userId, userName]);

  const respondToProposal = useCallback(async (
    proposalId: string,
    accept: boolean,
    counterTerms?: PartnershipTerms,
    message?: string
  ): Promise<PartnershipOperationResult<Partnership | PartnershipProposal | void>> => {
    if (!userId) {
      return { success: false, error: 'Not authenticated', errorCode: 'UNAUTHORIZED' };
    }

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      const result = await PartnershipService.respondToProposal(
        proposalId,
        userId,
        accept,
        counterTerms,
        message
      );

      if (result.success) {
        if (accept && result.data && 'partnerAId' in result.data) {
          setState(prev => ({
            ...prev,
            proposals: prev.proposals.filter(p => p.id !== proposalId),
            partnerships: [result.data as Partnership, ...prev.partnerships],
          }));
        } else if (result.data && 'proposerId' in result.data) {
          setState(prev => ({
            ...prev,
            proposals: prev.proposals.map(p =>
              p.id === proposalId ? { ...result.data as PartnershipProposal, direction: p.direction } : p
            ),
          }));
        } else {
          setState(prev => ({
            ...prev,
            proposals: prev.proposals.map(p =>
              p.id === proposalId ? { ...p, status: 'rejected' } : p
            ),
          }));
        }
      }

      return result;
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [userId]);

  const terminatePartnership = useCallback(async (
    partnershipId: string,
    reason: string
  ): Promise<PartnershipOperationResult> => {
    if (!userId) {
      return { success: false, error: 'Not authenticated', errorCode: 'UNAUTHORIZED' };
    }

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      const result = await PartnershipService.terminatePartnership(partnershipId, userId, reason);

      if (result.success) {
        setState(prev => ({
          ...prev,
          partnerships: prev.partnerships.map(p =>
            p.id === partnershipId ? { ...p, status: 'terminated' } : p
          ),
        }));
      }

      return result;
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [userId]);

  const getReceivedProposals = useCallback((): PartnershipProposal[] => {
    return state.proposals.filter(p => p.direction === 'received' && p.status !== 'rejected');
  }, [state.proposals]);

  const getSentProposals = useCallback((): PartnershipProposal[] => {
    return state.proposals.filter(p => p.direction === 'sent');
  }, [state.proposals]);

  const getActivePartnerships = useCallback((): Partnership[] => {
    return state.partnerships.filter(p => p.status === 'active');
  }, [state.partnerships]);

  const getPartnershipStats = useCallback(() => {
    const active = state.partnerships.filter(p => p.status === 'active');
    const totalProfit = active.reduce((sum, p) => {
      const isPartnerA = p.partnerAId === userId;
      return sum + (isPartnerA ? p.partnerAProfitReceived : p.partnerBProfitReceived);
    }, 0);

    return {
      activePartnerships: active.length,
      pendingProposals: state.proposals.filter(p => p.status === 'pending' && p.direction === 'received').length,
      totalProfitReceived: totalProfit,
      sentProposals: state.proposals.filter(p => p.direction === 'sent').length,
    };
  }, [state.partnerships, state.proposals, userId]);

  const refreshData = useCallback(async () => {
    setState(prev => ({ ...prev, isSyncing: true }));
    await Promise.all([loadProposals(), loadPartnerships()]);
    setState(prev => ({ ...prev, isSyncing: false }));
  }, [loadProposals, loadPartnerships]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
    }));
  }, []);

  return {
    ...state,
    userId,
    userName,
    isAuthenticated,
    sendProposal,
    respondToProposal,
    terminatePartnership,
    getReceivedProposals,
    getSentProposals,
    getActivePartnerships,
    getPartnershipStats,
    refreshData,
    markNotificationRead,
    createDefaultTerms,
  };
});
