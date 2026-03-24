import { useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { getCreditTier } from '@/utils/creditEngine';
import { Achievement } from '@/types/game';

export function useGameStats() {
  const { gameState, totalMonthlyExpenses, totalDebt, creditUtilization, tokenWallet } = useGame();
  
  return useMemo(() => ({
    bankBalance: gameState.bankBalance,
    totalNetWorth: gameState.totalNetWorth,
    creditUtilization,
    totalMonthlyExpenses,
    totalDebt,
    monthsPlayed: gameState.monthsPlayed,
    consecutiveOnTimePayments: gameState.consecutiveOnTimePayments,
    creditAccountsCount: gameState.creditAccounts.length,
    musoTokenBalance: tokenWallet.musoToken.balance,
  }), [
    gameState.bankBalance,
    gameState.totalNetWorth,
    creditUtilization,
    totalMonthlyExpenses,
    totalDebt,
    gameState.monthsPlayed,
    gameState.consecutiveOnTimePayments,
    gameState.creditAccounts.length,
    tokenWallet.musoToken.balance,
  ]);
}

export function useCreditScoreData() {
  const { gameState } = useGame();
  
  return useMemo(() => {
    const tier = getCreditTier(gameState.creditScores.composite);
    return {
      scores: gameState.creditScores,
      tier,
      composite: gameState.creditScores.composite,
    };
  }, [gameState.creditScores]);
}

export function useGameDate() {
  const { gameState } = useGame();
  
  return useMemo(() => {
    const currentDate = new Date(gameState.currentDate);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      currentDate,
      monthName: monthNames[currentDate.getMonth()],
      year: currentDate.getFullYear(),
      monthsPlayed: gameState.monthsPlayed,
    };
  }, [gameState.currentDate, gameState.monthsPlayed]);
}

export function useAchievementsData() {
  const { gameState } = useGame();
  
  return useMemo(() => {
    const unlockedSet = new Set(gameState.unlockedAchievements);
    const unlockedCount = gameState.unlockedAchievements.length;
    const totalCount = gameState.achievements.length;
    const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;
    
    const isUnlocked = (id: string) => unlockedSet.has(id);
    
    const categorizedAchievements = gameState.achievements.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    }, {} as Record<string, Achievement[]>);
    
    const categoryStats = Object.entries(categorizedAchievements).reduce((acc, [category, achievements]) => {
      acc[category] = {
        total: achievements.length,
        unlocked: achievements.filter(a => unlockedSet.has(a.id)).length,
      };
      return acc;
    }, {} as Record<string, { total: number; unlocked: number }>);
    
    return {
      unlockedCount,
      totalCount,
      progress,
      isUnlocked,
      categorizedAchievements,
      categoryStats,
      achievements: gameState.achievements,
    };
  }, [gameState.achievements, gameState.unlockedAchievements]);
}

export function useLifestyleData() {
  const { gameState } = useGame();
  
  return useMemo(() => ({
    lifestyle: gameState.lifestyle,
    cityId: gameState.lifestyle.cityId,
    cityName: gameState.lifestyle.cityName,
    housingType: gameState.lifestyle.housingType,
    sharedRental: gameState.lifestyle.sharedRental,
  }), [gameState.lifestyle]);
}

export function usePlayerProfile() {
  const { gameState } = useGame();
  
  return useMemo(() => ({
    playerId: gameState.playerId,
    playerName: gameState.playerName,
    avatar: gameState.avatar,
    profilePhotoUrl: gameState.profilePhotoUrl,
    useCustomPhoto: gameState.useCustomPhoto,
    currentJob: gameState.currentJob,
    monthlyIncome: gameState.monthlyIncome,
  }), [
    gameState.playerId,
    gameState.playerName,
    gameState.avatar,
    gameState.profilePhotoUrl,
    gameState.useCustomPhoto,
    gameState.currentJob,
    gameState.monthlyIncome,
  ]);
}
