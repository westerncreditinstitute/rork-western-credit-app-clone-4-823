import { useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { homeIntegrationService, HOME_TIER_COSTS, HOME_TIER_CAREER_REQUIREMENTS } from '@/services/HomeIntegrationService';
import { homeAnalyticsService } from '@/services/HomeAnalyticsService';

export interface HomeIntegrationState {
  isAuthenticated: boolean;
  userId: string | null;
  bankBalance: number;
  currentJob: {
    level: number;
    salary: number;
    type: string;
  } | null;
  profilePhotoUrl?: string;
}

export function useHomeIntegration() {
  const auth = useAuth();
  const game = useGame();

  const userId = useMemo(() => {
    return game?.gameState?.playerId || auth?.user?.id || null;
  }, [game?.gameState?.playerId, auth?.user?.id]);

  const bankBalance = useMemo(() => {
    return game?.gameState?.bankBalance || 0;
  }, [game?.gameState?.bankBalance]);

  const currentJob = useMemo(() => {
    const playerJob = game?.gameState?.currentJob;
    if (!playerJob) return null;
    const jobTierLevel = playerJob.job?.tier === 'entry' ? 0 : 
                         playerJob.job?.tier === 'mid' ? 1 : 
                         playerJob.job?.tier === 'senior' ? 2 : 
                         playerJob.job?.tier === 'executive' ? 3 : 0;
    return {
      level: jobTierLevel,
      salary: playerJob.currentSalary || playerJob.job?.baseSalary || 0,
      type: playerJob.job?.tier || '',
    };
  }, [game?.gameState?.currentJob]);



  const profilePhotoUrl = useMemo(() => {
    return game?.gameState?.profilePhotoUrl;
  }, [game?.gameState?.profilePhotoUrl]);

  useEffect(() => {
    if (userId) {
      homeAnalyticsService.initialize(userId);
    }
  }, [userId]);

  const canCreateHome = useCallback((tier: number = 1) => {
    return homeIntegrationService.canCreateHome(userId, bankBalance, tier);
  }, [userId, bankBalance]);

  const canUpgradeHome = useCallback((currentTier: number, targetTier: number) => {
    return homeIntegrationService.canUpgradeHome(
      userId,
      bankBalance,
      currentTier,
      targetTier,
      currentJob
    );
  }, [userId, bankBalance, currentJob]);

  const canPurchaseItem = useCallback((itemPrice: number) => {
    return homeIntegrationService.canPurchaseItem(userId, bankBalance, itemPrice);
  }, [userId, bankBalance]);

  const validateCareerForTier = useCallback((targetTier: number) => {
    return homeIntegrationService.validateCareerRequirements(targetTier, currentJob);
  }, [currentJob]);

  const getUpgradePreview = useCallback((currentTier: number, targetTier: number) => {
    return homeIntegrationService.getUpgradePreview(currentTier, targetTier);
  }, []);

  const getTierBenefits = useCallback((tier: number) => {
    return homeIntegrationService.getTierBenefits(tier);
  }, []);

  const getAvatarDisplay = useCallback(() => {
    return homeIntegrationService.getAvatarForDisplay(null, profilePhotoUrl);
  }, [profilePhotoUrl]);

  const deductBalance = useCallback((amount: number) => {
    if (game?.updateBalance) {
      game.updateBalance(-amount, 'bank');
      return true;
    }
    return false;
  }, [game]);

  const trackHomeCreated = useCallback((homeId: string, tier: number) => {
    if (userId) {
      homeAnalyticsService.trackHomeCreated(userId, homeId, tier);
      homeIntegrationService.recordTransaction('home_creation', HOME_TIER_COSTS[tier] || 0, `Created Tier ${tier} home`, { homeId, tier });
    }
  }, [userId]);

  const trackHomeUpgraded = useCallback((homeId: string, fromTier: number, toTier: number) => {
    if (userId) {
      const cost = HOME_TIER_COSTS[toTier] || 0;
      homeAnalyticsService.trackHomeUpgraded(userId, homeId, fromTier, toTier, cost);
      homeIntegrationService.recordTransaction('tier_upgrade', cost, `Upgraded home from Tier ${fromTier} to Tier ${toTier}`, { homeId, fromTier, toTier });
    }
  }, [userId]);

  const trackItemPlaced = useCallback((homeId: string, itemId: string, roomName: string) => {
    if (userId) {
      homeAnalyticsService.trackItemPlaced(userId, homeId, itemId, roomName);
    }
  }, [userId]);

  const trackItemRemoved = useCallback((homeId: string, itemId: string, roomName: string) => {
    if (userId) {
      homeAnalyticsService.trackItemRemoved(userId, homeId, itemId, roomName);
    }
  }, [userId]);

  const trackItemPurchased = useCallback((itemId: string, itemName: string, price: number) => {
    if (userId) {
      homeAnalyticsService.trackItemPurchased(userId, itemId, itemName, price);
      homeIntegrationService.recordTransaction('item_purchase', price, `Purchased ${itemName}`, { itemId, itemName });
    }
  }, [userId]);

  const trackVisitStarted = useCallback((homeId: string, hostId: string) => {
    if (userId) {
      homeAnalyticsService.trackVisitStarted(userId, homeId, hostId);
    }
  }, [userId]);

  const trackVisitEnded = useCallback((homeId: string, duration: number, rating?: number) => {
    if (userId) {
      homeAnalyticsService.trackVisitEnded(userId, homeId, duration, rating);
    }
  }, [userId]);

  const trackEditSessionStarted = useCallback((homeId: string) => {
    if (userId) {
      homeAnalyticsService.startEditSession(userId, homeId);
    }
  }, [userId]);

  const trackEditSessionEnded = useCallback(() => {
    if (userId) {
      return homeAnalyticsService.endEditSession(userId);
    }
    return 0;
  }, [userId]);

  const trackPrivacyChanged = useCallback((homeId: string, isPublic: boolean) => {
    if (userId) {
      homeAnalyticsService.trackPrivacyChanged(userId, homeId, isPublic);
    }
  }, [userId]);

  const sendVisitNotification = useCallback(async (
    hostId: string,
    visitorName: string,
    homeName: string,
    visitorAvatarUrl?: string
  ) => {
    if (userId) {
      await homeIntegrationService.sendVisitNotification(
        hostId,
        userId,
        visitorName,
        homeName,
        visitorAvatarUrl
      );
    }
  }, [userId]);

  const sendVisitorLeftNotification = useCallback(async (
    hostId: string,
    visitorName: string,
    homeName: string,
    visitDuration: string,
    rating?: number
  ) => {
    await homeIntegrationService.sendVisitorLeftNotification(
      hostId,
      visitorName,
      homeName,
      visitDuration,
      rating
    );
  }, []);

  const sendRatingNotification = useCallback(async (
    hostId: string,
    raterName: string,
    homeName: string,
    rating: number,
    comment?: string
  ) => {
    await homeIntegrationService.sendHomeRatingNotification(
      hostId,
      raterName,
      homeName,
      rating,
      comment
    );
  }, []);

  const sendTierUpgradeNotification = useCallback(async (newTier: number) => {
    if (userId) {
      await homeIntegrationService.sendTierUpgradeNotification(userId, newTier);
    }
  }, [userId]);

  const getMetrics = useCallback(() => {
    if (userId) {
      return homeAnalyticsService.getMetrics(userId);
    }
    return null;
  }, [userId]);

  const getVisitAnalytics = useCallback((homeId?: string) => {
    if (userId) {
      return homeAnalyticsService.getVisitAnalytics(userId, homeId);
    }
    return null;
  }, [userId]);

  const getTransactionHistory = useCallback(() => {
    return homeIntegrationService.getTransactionHistory();
  }, []);

  return {
    state: {
      isAuthenticated: !!userId,
      userId,
      bankBalance,
      currentJob,
      profilePhotoUrl,
    } as HomeIntegrationState,

    validation: {
      canCreateHome,
      canUpgradeHome,
      canPurchaseItem,
      validateCareerForTier,
    },

    tierInfo: {
      getUpgradePreview,
      getTierBenefits,
      tierCosts: HOME_TIER_COSTS,
      careerRequirements: HOME_TIER_CAREER_REQUIREMENTS,
    },

    avatar: {
      getAvatarDisplay,
    },

    economy: {
      deductBalance,
    },

    analytics: {
      trackHomeCreated,
      trackHomeUpgraded,
      trackItemPlaced,
      trackItemRemoved,
      trackItemPurchased,
      trackVisitStarted,
      trackVisitEnded,
      trackEditSessionStarted,
      trackEditSessionEnded,
      trackPrivacyChanged,
      getMetrics,
      getVisitAnalytics,
      getTransactionHistory,
    },

    notifications: {
      sendVisitNotification,
      sendVisitorLeftNotification,
      sendRatingNotification,
      sendTierUpgradeNotification,
    },
  };
}

export default useHomeIntegration;
