import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessService } from '@/services/BusinessService';
import { InvestmentPoolService } from '@/services/InvestmentPoolService';
import { BusinessCalculator } from '@/services/BusinessCalculator';
import {
  BusinessCategoryData,
  UserBusinessData,
  InvestmentPoolData,
  PoolContributionData,
  BusinessStartupRequest,
  BusinessStage,
  BusinessAchievementData,
  BusinessOperationResult,
} from '@/types/business';
import { BUSINESS_CATEGORIES } from '@/mocks/businessCategories';

const BUSINESS_STORAGE_KEY = 'credit_life_business_state_';

interface BusinessState {
  userBusinesses: UserBusinessData[];
  investmentPools: InvestmentPoolData[];
  contributions: PoolContributionData[];
  achievements: BusinessAchievementData[];
  totalBusinessProfits: number;
  totalInvested: number;
  totalReturns: number;
}

const createInitialBusinessState = (): BusinessState => ({
  userBusinesses: [],
  investmentPools: [],
  contributions: [],
  achievements: [],
  totalBusinessProfits: 0,
  totalInvested: 0,
  totalReturns: 0,
});

export const [BusinessProvider, useBusiness] = createContextHook(() => {
  const auth = useAuth();
  const userId = auth?.user?.id || 'anonymous';
  const isAuthenticated = !!auth?.user?.id;

  const [businessState, setBusinessState] = useState<BusinessState>(createInitialBusinessState());
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [categories] = useState<BusinessCategoryData[]>(BUSINESS_CATEGORIES);

  const storageKey = `${BUSINESS_STORAGE_KEY}${userId}`;

  /**
   * Load user's businesses from database
   */
  const loadUserBusinesses = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsSyncing(true);
      const businesses = await BusinessService.getUserBusinesses(userId);
      
      setBusinessState(prev => ({
        ...prev,
        userBusinesses: businesses,
      }));
      
      console.log('[BusinessContext] Loaded businesses:', businesses.length);
    } catch (error) {
      console.error('[BusinessContext] Error loading businesses:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, userId]);

  /**
   * Load user's contributions from database
   */
  const loadUserContributions = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const contributions = await InvestmentPoolService.getUserContributions(userId);
      
      setBusinessState(prev => ({
        ...prev,
        contributions,
      }));
      
      console.log('[BusinessContext] Loaded contributions:', contributions.length);
    } catch (error) {
      console.error('[BusinessContext] Error loading contributions:', error);
    }
  }, [isAuthenticated, userId]);

  /**
   * Load open investment pools from database
   */
  const loadOpenPools = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsSyncing(true);
      const pools = await InvestmentPoolService.getOpenPools();
      
      setBusinessState(prev => ({
        ...prev,
        investmentPools: pools,
      }));
      
      console.log('[BusinessContext] Loaded pools:', pools.length);
    } catch (error) {
      console.error('[BusinessContext] Error loading pools:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated]);

  /**
   * Initialize business data
   */
  useEffect(() => {
    const initializeBusinessData = async () => {
      setIsLoading(true);
      
      if (isAuthenticated) {
        await loadUserBusinesses();
        await loadUserContributions();
        await loadOpenPools();
      }
      
      setIsLoading(false);
    };

    initializeBusinessData();
  }, [isAuthenticated, loadUserBusinesses, loadUserContributions, loadOpenPools]);

  const featuredCategories = useMemo(() => 
    categories.filter(c => c.isFeatured),
    [categories]
  );

  const getCategoryById = useCallback((categoryId: string): BusinessCategoryData | null => {
    return categories.find(c => c.id === categoryId) || null;
  }, [categories]);

  const validateBusinessQualifications = useCallback((
    categoryId: string,
    userCreditScore: number,
    hasRequiredEducation: boolean = true
  ): { eligible: boolean; reasons: string[] } => {
    const category = getCategoryById(categoryId);
    if (!category) {
      return { eligible: false, reasons: ['Category not found'] };
    }

    const reasons: string[] = [];

    if (userCreditScore < category.minCreditScore) {
      reasons.push(`Credit score must be at least ${category.minCreditScore} (you have ${userCreditScore})`);
    }

    if (category.requiredEducationId && !hasRequiredEducation) {
      reasons.push('Required education/certification not met');
    }

    return { eligible: reasons.length === 0, reasons };
  }, [getCategoryById]);

  /**
   * Create a new business with database integration
   */
  const createBusiness = useCallback(async (
    request: BusinessStartupRequest,
    availableFunds: number,
    userCreditScore: number
  ): Promise<BusinessOperationResult<UserBusinessData>> => {
    const category = getCategoryById(request.categoryId);
    if (!category) {
      return { success: false, error: 'Category not found', errorCode: 'CATEGORY_NOT_FOUND' };
    }

    const validation = validateBusinessQualifications(request.categoryId, userCreditScore);
    if (!validation.eligible) {
      return { 
        success: false, 
        error: validation.reasons[0], 
        errorCode: 'CREDIT_SCORE_TOO_LOW' 
      };
    }

    const personalFunds = request.usePersonalFunds ? Math.min(availableFunds, request.startupCost) : 0;
    
    if (request.usePersonalFunds && personalFunds < request.startupCost && !request.createInvestmentPool) {
      return { success: false, error: 'Insufficient funds', errorCode: 'INSUFFICIENT_FUNDS' };
    }

    try {
      // Create business in database
      const result = await BusinessService.createBusiness(request, category);
      
      if (!result.success || !result.data) {
        return result;
      }

      const newBusiness = result.data;

      // Create investment pool if requested
      if (request.createInvestmentPool) {
        const poolResult = await InvestmentPoolService.createPool({
          businessId: newBusiness.id,
          poolName: `${request.businessName} - Investment Pool`,
          fundingGoal: request.fundingGoal - personalFunds,
          minInvestment: request.poolMinInvestment || 500,
          maxInvestors: request.poolMaxInvestors || 10,
          expectedRoiPercentage: 15 + Math.floor(Math.random() * 10),
          estimatedBreakEvenMonths: category.timeToProfitabilityMonths,
          riskLevel: category.riskLevel,
          description: request.businessPlan || `Investment opportunity in ${request.businessName}`,
          businessPlan: request.businessPlan,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

        if (poolResult.success && poolResult.data) {
          setBusinessState(prev => ({
            ...prev,
            investmentPools: [...prev.investmentPools, poolResult.data!],
          }));
        }
      }

      // Update local state
      setBusinessState(prev => {
        const isFirstBusiness = prev.userBusinesses.length === 0;
        const newAchievements = [...prev.achievements];
        
        if (isFirstBusiness) {
          newAchievements.push({
            id: `achievement_${Date.now()}`,
            userId: request.userId,
            businessId: newBusiness.id,
            achievementType: 'first_business',
            achievementTitle: 'Entrepreneur',
            achievementDescription: 'Started your first business!',
            achievementDate: new Date().toISOString(),
            rewardAmount: 500,
            rewardType: 'cash',
            iconPath: null,
            createdAt: new Date().toISOString(),
          });
        }

        return {
          ...prev,
          userBusinesses: [...prev.userBusinesses, newBusiness],
          achievements: newAchievements,
        };
      });

      return {
        success: true,
        data: newBusiness,
      };
    } catch (error) {
      console.error('[BusinessContext] Error creating business:', error);
      return {
        success: false,
        error: 'Failed to create business',
        errorCode: 'EXCEPTION',
      };
    }
  }, [getCategoryById, validateBusinessQualifications]);

  const getUserBusinesses = useCallback((): UserBusinessData[] => {
    return businessState.userBusinesses.filter(b => b.isActive);
  }, [businessState.userBusinesses]);

  const getBusinessById = useCallback((businessId: string): UserBusinessData | null => {
    return businessState.userBusinesses.find(b => b.id === businessId) || null;
  }, [businessState.userBusinesses]);

  const updateBusinessStage = useCallback((businessId: string, newStage: BusinessStage) => {
    setBusinessState(prev => ({
      ...prev,
      userBusinesses: prev.userBusinesses.map(b =>
        b.id === businessId
          ? { ...b, businessStage: newStage, updatedAt: new Date().toISOString() }
          : b
      ),
    }));
  }, []);

  const addFundingToBusiness = useCallback((businessId: string, amount: number) => {
    setBusinessState(prev => {
      const business = prev.userBusinesses.find(b => b.id === businessId);
      if (!business) return prev;

      const newFunding = business.currentFunding + amount;
      const isFullyFunded = newFunding >= business.fundingGoal;

      return {
        ...prev,
        userBusinesses: prev.userBusinesses.map(b =>
          b.id === businessId
            ? {
                ...b,
                currentFunding: newFunding,
                businessStage: isFullyFunded ? 'operational' : b.businessStage,
                operationalDate: isFullyFunded && !b.operationalDate ? new Date().toISOString() : b.operationalDate,
                updatedAt: new Date().toISOString(),
              }
            : b
        ),
      };
    });
  }, []);

  const contributeToPool = useCallback((
    poolId: string,
    amount: number,
    investorUserId: string
  ): BusinessOperationResult<PoolContributionData> => {
    const pool = businessState.investmentPools.find(p => p.id === poolId);
    if (!pool) {
      return { success: false, error: 'Pool not found', errorCode: 'POOL_NOT_FOUND' };
    }

    if (pool.status !== 'open') {
      return { success: false, error: 'Pool is not open', errorCode: 'POOL_NOT_OPEN' };
    }

    if (amount < pool.minInvestment) {
      return { 
        success: false, 
        error: `Minimum investment is $${pool.minInvestment}`, 
        errorCode: 'MINIMUM_INVESTMENT_NOT_MET' 
      };
    }

    if (pool.currentInvestorCount >= pool.maxInvestors) {
      return { success: false, error: 'Pool is full', errorCode: 'POOL_FULL' };
    }

    const now = new Date().toISOString();
    const contribution: PoolContributionData = {
      id: `contribution_${Date.now()}`,
      poolId,
      investorUserId,
      contributionAmount: amount,
      ownershipPercentage: (amount / pool.fundingGoal) * 100,
      contributionDate: now,
      totalReturnReceived: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const newPoolAmount = pool.currentAmount + amount;
    const isPoolFunded = newPoolAmount >= pool.fundingGoal;

    setBusinessState(prev => ({
      ...prev,
      contributions: [...prev.contributions, contribution],
      totalInvested: prev.totalInvested + amount,
      investmentPools: prev.investmentPools.map(p =>
        p.id === poolId
          ? {
              ...p,
              currentAmount: newPoolAmount,
              currentInvestorCount: p.currentInvestorCount + 1,
              status: isPoolFunded ? 'funded' : p.status,
              updatedAt: now,
            }
          : p
      ),
    }));

    if (isPoolFunded) {
      addFundingToBusiness(pool.businessId, newPoolAmount);
    }

    return { success: true, data: contribution };
  }, [businessState.investmentPools, addFundingToBusiness]);

  const getOpenPools = useCallback((): InvestmentPoolData[] => {
    const now = Date.now();
    return businessState.investmentPools.filter(p => 
      p.status === 'open' && new Date(p.deadline).getTime() > now
    );
  }, [businessState.investmentPools]);

  const getUserContributions = useCallback((investorUserId: string): PoolContributionData[] => {
    return businessState.contributions.filter(c => c.investorUserId === investorUserId);
  }, [businessState.contributions]);

  const processMonthlyBusinessCycle = useCallback((monthsAdvanced: number = 1) => {
    setBusinessState(prev => {
      let totalProfitThisMonth = 0;
      const now = new Date().toISOString();

      const updatedBusinesses = prev.userBusinesses.map(business => {
        if (business.businessStage !== 'operational' && business.businessStage !== 'profitable') {
          return business;
        }

        const category = getCategoryById(business.categoryId);
        if (!category) return business;

        const revenueVariance = 0.7 + Math.random() * 0.6;
        const monthlyRevenue = Math.round(category.avgMonthlyRevenue * revenueVariance);
        const monthlyExpenses = Math.round(business.startupCost * 0.05 + business.employeeCount * 3000);
        const monthlyProfit = monthlyRevenue - monthlyExpenses;

        totalProfitThisMonth += monthlyProfit * (business.ownershipPercentage / 100);

        const newStage: BusinessStage = 
          monthlyProfit > 0 ? 'profitable' : 
          monthlyProfit < -1000 ? 'struggling' : 
          business.businessStage;

        return {
          ...business,
          monthlyRevenue,
          monthlyExpenses,
          monthlyProfit,
          businessStage: newStage,
          lastProfitUpdate: now,
          updatedAt: now,
        };
      });

      const updatedContributions = prev.contributions.map(contribution => {
        const pool = prev.investmentPools.find(p => p.id === contribution.poolId);
        if (!pool || contribution.status !== 'active') return contribution;

        const business = updatedBusinesses.find(b => b.id === pool.businessId);
        if (!business || business.monthlyProfit <= 0) return contribution;

        const profitShare = business.monthlyProfit * (contribution.ownershipPercentage / 100);
        
        return {
          ...contribution,
          totalReturnReceived: contribution.totalReturnReceived + profitShare,
          updatedAt: now,
        };
      });

      return {
        ...prev,
        userBusinesses: updatedBusinesses,
        contributions: updatedContributions,
        totalBusinessProfits: prev.totalBusinessProfits + totalProfitThisMonth,
        totalReturns: prev.totalReturns + updatedContributions.reduce((sum, c) => {
          const oldC = prev.contributions.find(oc => oc.id === c.id);
          return sum + (c.totalReturnReceived - (oldC?.totalReturnReceived || 0));
        }, 0),
      };
    });
  }, [getCategoryById]);

  const getBusinessAchievements = useCallback((): BusinessAchievementData[] => {
    return businessState.achievements;
  }, [businessState.achievements]);

  const getBusinessStats = useCallback(() => {
    const businesses = businessState.userBusinesses.filter(b => b.isActive);
    const profitableCount = businesses.filter(b => b.businessStage === 'profitable').length;
    const totalRevenue = businesses.reduce((sum, b) => sum + b.monthlyRevenue, 0);
    const totalProfit = businesses.reduce((sum, b) => sum + b.monthlyProfit, 0);

    return {
      totalBusinesses: businesses.length,
      profitableBusinesses: profitableCount,
      totalMonthlyRevenue: totalRevenue,
      totalMonthlyProfit: totalProfit,
      totalInvested: businessState.totalInvested,
      totalReturns: businessState.totalReturns,
      totalLifetimeProfits: businessState.totalBusinessProfits,
      achievementsUnlocked: businessState.achievements.length,
    };
  }, [businessState]);

  const closeBusiness = useCallback((businessId: string, reason: string = 'closed'): BusinessOperationResult => {
    const business = businessState.userBusinesses.find(b => b.id === businessId);
    if (!business) {
      return { success: false, error: 'Business not found', errorCode: 'BUSINESS_NOT_FOUND' };
    }
    
    setBusinessState(prev => ({
      ...prev,
      userBusinesses: prev.userBusinesses.map(b =>
        b.id === businessId
          ? { ...b, isActive: false, businessStage: 'closed' as BusinessStage, updatedAt: new Date().toISOString() }
          : b
      ),
    }));
    
    console.log('[BusinessContext] Business closed:', businessId, reason);
    return { success: true };
  }, [businessState.userBusinesses]);

  const resetBusinessState = useCallback(async () => {
    setBusinessState(createInitialBusinessState());
    await AsyncStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    businessState,
    isLoading,
    isSyncing,
    categories,
    featuredCategories,
    getCategoryById,
    validateBusinessQualifications,
    createBusiness,
    getUserBusinesses,
    getBusinessById,
    updateBusinessStage,
    addFundingToBusiness,
    contributeToPool,
    getOpenPools,
    getUserContributions,
    processMonthlyBusinessCycle,
    getBusinessAchievements,
    getBusinessStats,
    closeBusiness,
    resetBusinessState,
    loadUserBusinesses,
    loadUserContributions,
    refreshPools: loadOpenPools,
  };
});
