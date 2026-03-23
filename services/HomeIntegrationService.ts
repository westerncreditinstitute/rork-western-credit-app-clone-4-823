import { notificationService } from '@/services/NotificationService';
import { getHomeTierConfig } from '@/types/home';

export interface HomeTransaction {
  id: string;
  type: 'home_creation' | 'tier_upgrade' | 'item_purchase' | 'visitor_tip';
  amount: number;
  description: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface CareerRequirement {
  minLevel: number;
  minSalary: number;
  requiredJobTypes?: string[];
}

export const HOME_TIER_CAREER_REQUIREMENTS: Record<number, CareerRequirement> = {
  1: { minLevel: 0, minSalary: 0 },
  2: { minLevel: 1, minSalary: 2500 },
  3: { minLevel: 2, minSalary: 5000 },
  4: { minLevel: 3, minSalary: 10000 },
};

export const HOME_TIER_COSTS: Record<number, number> = {
  1: 0,
  2: 25000,
  3: 100000,
  4: 500000,
};

class HomeIntegrationService {
  private transactions: HomeTransaction[] = [];

  validateAuthentication(userId: string | null | undefined): { valid: boolean; error?: string } {
    if (!userId) {
      console.log('[HomeIntegration] Authentication validation failed: No user ID');
      return { valid: false, error: 'You must be logged in to access home features' };
    }
    console.log('[HomeIntegration] Authentication validated for user:', userId);
    return { valid: true };
  }

  validateBalance(
    currentBalance: number,
    requiredAmount: number,
    operationType: string
  ): { valid: boolean; error?: string; shortfall?: number } {
    console.log(`[HomeIntegration] Validating balance for ${operationType}: ${currentBalance} >= ${requiredAmount}`);
    
    if (currentBalance < requiredAmount) {
      const shortfall = requiredAmount - currentBalance;
      return {
        valid: false,
        error: `Insufficient funds for ${operationType}. You need $${shortfall.toLocaleString()} more.`,
        shortfall,
      };
    }
    return { valid: true };
  }

  validateCareerRequirements(
    targetTier: number,
    currentJob: { level?: number; salary?: number; type?: string } | null | undefined
  ): { valid: boolean; error?: string; requirements?: CareerRequirement } {
    const requirements = HOME_TIER_CAREER_REQUIREMENTS[targetTier];
    if (!requirements) {
      return { valid: true };
    }

    console.log(`[HomeIntegration] Validating career requirements for tier ${targetTier}:`, requirements);

    if (!currentJob) {
      if (requirements.minLevel > 0 || requirements.minSalary > 0) {
        return {
          valid: false,
          error: `You need a job to unlock Tier ${targetTier} homes`,
          requirements,
        };
      }
      return { valid: true, requirements };
    }

    const jobLevel = currentJob.level || 0;
    const jobSalary = currentJob.salary || 0;

    if (jobLevel < requirements.minLevel) {
      return {
        valid: false,
        error: `Career level ${requirements.minLevel} required for Tier ${targetTier} (current: ${jobLevel})`,
        requirements,
      };
    }

    if (jobSalary < requirements.minSalary) {
      return {
        valid: false,
        error: `Minimum salary of $${requirements.minSalary.toLocaleString()}/month required for Tier ${targetTier}`,
        requirements,
      };
    }

    if (requirements.requiredJobTypes && requirements.requiredJobTypes.length > 0) {
      if (!currentJob.type || !requirements.requiredJobTypes.includes(currentJob.type)) {
        return {
          valid: false,
          error: `This tier requires a job in: ${requirements.requiredJobTypes.join(', ')}`,
          requirements,
        };
      }
    }

    console.log('[HomeIntegration] Career requirements validated');
    return { valid: true, requirements };
  }

  canCreateHome(
    userId: string | null | undefined,
    bankBalance: number,
    tier: number = 1
  ): { canCreate: boolean; errors: string[] } {
    const errors: string[] = [];

    const authResult = this.validateAuthentication(userId);
    if (!authResult.valid && authResult.error) {
      errors.push(authResult.error);
    }

    const tierCost = HOME_TIER_COSTS[tier] || 0;
    if (tierCost > 0) {
      const balanceResult = this.validateBalance(bankBalance, tierCost, 'home creation');
      if (!balanceResult.valid && balanceResult.error) {
        errors.push(balanceResult.error);
      }
    }

    return { canCreate: errors.length === 0, errors };
  }

  canUpgradeHome(
    userId: string | null | undefined,
    bankBalance: number,
    currentTier: number,
    targetTier: number,
    currentJob: { level?: number; salary?: number; type?: string } | null | undefined
  ): { canUpgrade: boolean; errors: string[]; cost: number } {
    const errors: string[] = [];

    const authResult = this.validateAuthentication(userId);
    if (!authResult.valid && authResult.error) {
      errors.push(authResult.error);
    }

    if (targetTier <= currentTier) {
      errors.push('Cannot downgrade home tier');
    }

    if (targetTier > 4) {
      errors.push('Maximum home tier is 4');
    }

    const upgradeCost = HOME_TIER_COSTS[targetTier] || 0;
    const balanceResult = this.validateBalance(bankBalance, upgradeCost, 'tier upgrade');
    if (!balanceResult.valid && balanceResult.error) {
      errors.push(balanceResult.error);
    }

    const careerResult = this.validateCareerRequirements(targetTier, currentJob);
    if (!careerResult.valid && careerResult.error) {
      errors.push(careerResult.error);
    }

    return { canUpgrade: errors.length === 0, errors, cost: upgradeCost };
  }

  canPurchaseItem(
    userId: string | null | undefined,
    bankBalance: number,
    itemPrice: number
  ): { canPurchase: boolean; errors: string[] } {
    const errors: string[] = [];

    const authResult = this.validateAuthentication(userId);
    if (!authResult.valid && authResult.error) {
      errors.push(authResult.error);
    }

    const balanceResult = this.validateBalance(bankBalance, itemPrice, 'item purchase');
    if (!balanceResult.valid && balanceResult.error) {
      errors.push(balanceResult.error);
    }

    return { canPurchase: errors.length === 0, errors };
  }

  recordTransaction(
    type: HomeTransaction['type'],
    amount: number,
    description: string,
    metadata?: Record<string, unknown>
  ): HomeTransaction {
    const transaction: HomeTransaction = {
      id: `home_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      amount,
      description,
      timestamp: Date.now(),
      metadata,
    };

    this.transactions.push(transaction);
    console.log('[HomeIntegration] Transaction recorded:', transaction);

    if (this.transactions.length > 100) {
      this.transactions = this.transactions.slice(-100);
    }

    return transaction;
  }

  getTransactionHistory(): HomeTransaction[] {
    return [...this.transactions];
  }

  async sendVisitNotification(
    hostId: string,
    visitorId: string,
    visitorName: string,
    homeName: string,
    visitorAvatarUrl?: string
  ): Promise<void> {
    console.log('[HomeIntegration] Sending visit notification to host:', hostId);
    
    await notificationService.createNotification({
      userId: hostId,
      type: 'home_visitor_joined',
      title: 'New Visitor!',
      body: `${visitorName} is visiting your home "${homeName}"`,
      data: {
        friendId: visitorId,
        friendName: visitorName,
        friendAvatarUrl: visitorAvatarUrl,
        actionUrl: '/home-lobby',
      },
      priority: 'normal',
    });
  }

  async sendVisitorLeftNotification(
    hostId: string,
    visitorName: string,
    homeName: string,
    visitDuration: string,
    rating?: number
  ): Promise<void> {
    console.log('[HomeIntegration] Sending visitor left notification to host:', hostId);
    
    const ratingText = rating ? ` and gave it ${rating} stars` : '';
    
    await notificationService.createNotification({
      userId: hostId,
      type: 'home_visitor_left',
      title: 'Visitor Left',
      body: `${visitorName} visited "${homeName}" for ${visitDuration}${ratingText}`,
      data: {
        friendName: visitorName,
        homeName,
        visitDuration,
        rating,
      },
      priority: 'low',
    });
  }

  async sendHomeRatingNotification(
    hostId: string,
    raterName: string,
    homeName: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    console.log('[HomeIntegration] Sending rating notification to host:', hostId);
    
    await notificationService.createNotification({
      userId: hostId,
      type: 'system',
      title: 'New Home Rating!',
      body: `${raterName} rated your home "${homeName}" ${rating} stars${comment ? `: "${comment}"` : ''}`,
      data: {
        friendName: raterName,
        homeName,
        rating,
        comment,
        actionUrl: '/home-detail',
      },
      priority: 'normal',
    });
  }

  async sendTierUpgradeNotification(userId: string, newTier: number): Promise<void> {
    const tierConfig = getHomeTierConfig(newTier);
    const tierName = tierConfig?.tierName || `Tier ${newTier} Home`;
    
    await notificationService.createNotification({
      userId,
      type: 'achievement_unlocked',
      title: 'Home Upgraded!',
      body: `Congratulations! Your home is now a ${tierName}`,
      data: {
        achievementName: `Tier ${newTier} Home`,
        actionUrl: '/home-editor',
      },
      priority: 'high',
    });
  }

  getAvatarForDisplay(avatar: {
    skinTone?: string;
    hairStyle?: string;
    hairColor?: string;
    outfit?: { top?: string; bottom?: string };
  } | null | undefined, profilePhotoUrl?: string): {
    type: 'photo' | 'avatar';
    photoUrl?: string;
    avatarConfig?: typeof avatar;
    fallbackUrl: string;
  } {
    const fallbackUrl = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face';

    if (profilePhotoUrl) {
      return {
        type: 'photo',
        photoUrl: profilePhotoUrl,
        fallbackUrl,
      };
    }

    if (avatar) {
      return {
        type: 'avatar',
        avatarConfig: avatar,
        fallbackUrl,
      };
    }

    return {
      type: 'photo',
      photoUrl: fallbackUrl,
      fallbackUrl,
    };
  }

  calculateVisitorCapacity(tier: number, hasBonus: boolean = false): number {
    const tierConfig = getHomeTierConfig(tier);
    const baseCapacity = tierConfig?.maxVisitors || 2;
    return hasBonus ? baseCapacity + 2 : baseCapacity;
  }

  getTierBenefits(tier: number): {
    maxRooms: number;
    totalMaxItems: number;
    maxVisitors: number;
    tierDescription: string;
  } {
    const config = getHomeTierConfig(tier);
    return {
      maxRooms: config?.maxRooms || 3,
      totalMaxItems: config?.totalMaxItems || 20,
      maxVisitors: config?.maxVisitors || 2,
      tierDescription: config?.tierDescription || '',
    };
  }

  getUpgradePreview(currentTier: number, targetTier: number): {
    costDifference: number;
    roomsGained: number;
    itemsGained: number;
    visitorsGained: number;
  } {
    const currentConfig = getHomeTierConfig(currentTier);
    const targetConfig = getHomeTierConfig(targetTier);
    
    return {
      costDifference: HOME_TIER_COSTS[targetTier] - (HOME_TIER_COSTS[currentTier] || 0),
      roomsGained: (targetConfig?.maxRooms || 0) - (currentConfig?.maxRooms || 0),
      itemsGained: (targetConfig?.totalMaxItems || 0) - (currentConfig?.totalMaxItems || 0),
      visitorsGained: (targetConfig?.maxVisitors || 0) - (currentConfig?.maxVisitors || 0),
    };
  }
}

export const homeIntegrationService = new HomeIntegrationService();
export default homeIntegrationService;
