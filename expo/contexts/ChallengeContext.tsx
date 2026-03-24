import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/contexts/AuthContext';
import challengeService from '@/services/ChallengeService';
import {
  Challenge,
  ChallengeProgress,
  LeaderboardType,
  LeaderboardPeriod,
} from '@/types/challenges';

export const [ChallengeProvider, useChallenges] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLeaderboardType, setSelectedLeaderboardType] = useState<LeaderboardType>('most_visited');
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>('weekly');

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', selectedLeaderboardType, selectedPeriod, user?.id],
    queryFn: () => challengeService.getLeaderboard(
      selectedLeaderboardType,
      selectedPeriod,
      50,
      user?.id
    ),
    staleTime: 5 * 60 * 1000,
  });

  const allChallengesQuery = useQuery({
    queryKey: ['challenges', 'all', user?.id],
    queryFn: () => challengeService.getChallenges(undefined, user?.id),
    staleTime: 5 * 60 * 1000,
  });

  const achievementFeedQuery = useQuery({
    queryKey: ['achievementFeed', user?.id],
    queryFn: () => challengeService.getAchievementFeed(20, user?.id),
    staleTime: 2 * 60 * 1000,
  });

  const joinChallengeMutation = useMutation({
    mutationFn: (challengeId: string) => 
      challengeService.joinChallenge(challengeId, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
    },
  });

  const leaveChallengeMutation = useMutation({
    mutationFn: (challengeId: string) => 
      challengeService.leaveChallenge(challengeId, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
    },
  });

  const shareAchievementMutation = useMutation({
    mutationFn: (params: {
      achievementId: string;
      achievementName: string;
      achievementIcon: string;
      achievementRarity: string;
    }) => challengeService.shareAchievement(
      params.achievementId,
      params.achievementName,
      params.achievementIcon,
      params.achievementRarity,
      user?.id || '',
      user?.email?.split('@')[0] || 'Player',
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.split('@')[0] || 'P')}&background=random`
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievementFeed'] });
    },
  });

  const congratulateMutation = useMutation({
    mutationFn: (params: { shareId: string; message: string; emoji?: string }) =>
      challengeService.congratulateAchievement(
        params.shareId,
        user?.id || '',
        user?.email?.split('@')[0] || 'Player',
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.split('@')[0] || 'P')}&background=random`,
        params.message,
        params.emoji
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievementFeed'] });
    },
  });

  const likeShareMutation = useMutation({
    mutationFn: (shareId: string) =>
      challengeService.likeAchievementShare(shareId, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievementFeed'] });
    },
  });

  const getChallengeProgress = useCallback(async (challengeId: string): Promise<ChallengeProgress | null> => {
    if (!user?.id) return null;
    return challengeService.getChallengeProgress(challengeId, user.id);
  }, [user?.id]);

  const getChallengeById = useCallback(async (challengeId: string): Promise<Challenge | null> => {
    return challengeService.getChallengeById(challengeId, user?.id);
  }, [user?.id]);

  const activeChallenges = useMemo(() => {
    return allChallengesQuery.data?.filter(c => c.status === 'active') || [];
  }, [allChallengesQuery.data]);

  const upcomingChallenges = useMemo(() => {
    return allChallengesQuery.data?.filter(c => c.status === 'upcoming') || [];
  }, [allChallengesQuery.data]);

  const votingChallenges = useMemo(() => {
    return allChallengesQuery.data?.filter(c => c.status === 'voting') || [];
  }, [allChallengesQuery.data]);

  const completedChallenges = useMemo(() => {
    return allChallengesQuery.data?.filter(c => c.status === 'completed') || [];
  }, [allChallengesQuery.data]);

  const joinedChallenges = useMemo(() => {
    return allChallengesQuery.data?.filter(c => c.isJoined) || [];
  }, [allChallengesQuery.data]);

  const refreshLeaderboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
  }, [queryClient]);

  const refreshChallenges = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['challenges'] });
  }, [queryClient]);

  const refreshAchievementFeed = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['achievementFeed'] });
  }, [queryClient]);

  return {
    leaderboard: leaderboardQuery.data,
    isLoadingLeaderboard: leaderboardQuery.isLoading,
    selectedLeaderboardType,
    setSelectedLeaderboardType,
    selectedPeriod,
    setSelectedPeriod,
    refreshLeaderboard,

    challenges: allChallengesQuery.data || [],
    activeChallenges,
    upcomingChallenges,
    votingChallenges,
    completedChallenges,
    joinedChallenges,
    isLoadingChallenges: allChallengesQuery.isLoading,
    refreshChallenges,

    joinChallenge: joinChallengeMutation.mutateAsync,
    isJoiningChallenge: joinChallengeMutation.isPending,
    leaveChallenge: leaveChallengeMutation.mutateAsync,
    isLeavingChallenge: leaveChallengeMutation.isPending,

    getChallengeProgress,
    getChallengeById,

    achievementFeed: achievementFeedQuery.data || [],
    isLoadingAchievementFeed: achievementFeedQuery.isLoading,
    refreshAchievementFeed,

    shareAchievement: shareAchievementMutation.mutateAsync,
    isSharingAchievement: shareAchievementMutation.isPending,
    congratulate: congratulateMutation.mutateAsync,
    isCongratulating: congratulateMutation.isPending,
    likeShare: likeShareMutation.mutateAsync,
    isLikingShare: likeShareMutation.isPending,
  };
});

export function useLeaderboard(type?: LeaderboardType, period?: LeaderboardPeriod) {
  const context = useChallenges();
  
  useEffect(() => {
    if (type && type !== context.selectedLeaderboardType) {
      context.setSelectedLeaderboardType(type);
    }
    if (period && period !== context.selectedPeriod) {
      context.setSelectedPeriod(period);
    }
  }, [type, period, context.selectedLeaderboardType, context.selectedPeriod, context.setSelectedLeaderboardType, context.setSelectedPeriod]);

  return {
    leaderboard: context.leaderboard,
    isLoading: context.isLoadingLeaderboard,
    selectedType: context.selectedLeaderboardType,
    selectedPeriod: context.selectedPeriod,
    setType: context.setSelectedLeaderboardType,
    setPeriod: context.setSelectedPeriod,
    refresh: context.refreshLeaderboard,
  };
}

export function useActiveChallenges() {
  const { activeChallenges, isLoadingChallenges, refreshChallenges } = useChallenges();
  return {
    challenges: activeChallenges,
    isLoading: isLoadingChallenges,
    refresh: refreshChallenges,
  };
}

export function useJoinedChallenges() {
  const { joinedChallenges, isLoadingChallenges, refreshChallenges } = useChallenges();
  return {
    challenges: joinedChallenges,
    isLoading: isLoadingChallenges,
    refresh: refreshChallenges,
  };
}
