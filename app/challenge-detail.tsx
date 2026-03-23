import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Trophy,
  Users,
  Star,
  CheckCircle,
  Timer,
  Target,
  AlertCircle,
  TrendingUp,
  Award,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useChallenges } from '@/contexts/ChallengeContext';
import {
  Challenge,
  ChallengeProgress,
  ChallengeParticipant,
  getChallengeTimeRemaining,
  getChallengeStatusColor,
  getPrizeIcon,
} from '@/types/challenges';

export default function ChallengeDetailScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getChallengeById,
    getChallengeProgress,
    joinChallenge,
    isJoiningChallenge,
    leaveChallenge,
    isLeavingChallenge,
  } = useChallenges();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadChallenge = useCallback(async () => {
    if (!id) return;
    
    try {
      const challengeData = await getChallengeById(id);
      setChallenge(challengeData);
      
      if (challengeData?.isJoined) {
        const progressData = await getChallengeProgress(id);
        setProgress(progressData);
      }
    } catch (error) {
      console.error('[ChallengeDetail] Error loading challenge:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, getChallengeById, getChallengeProgress]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadChallenge();
    setIsRefreshing(false);
  }, [loadChallenge]);

  const handleJoin = useCallback(async () => {
    if (!challenge) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (challenge.entryFee && challenge.entryFee > 0) {
      Alert.alert(
        'Join Challenge',
        `This challenge has an entry fee of ${challenge.entryFee} ${challenge.entryCurrency}. Do you want to join?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Join',
            onPress: async () => {
              try {
                await joinChallenge(challenge.id);
                await loadChallenge();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch {
                Alert.alert('Error', 'Failed to join challenge');
              }
            },
          },
        ]
      );
    } else {
      try {
        await joinChallenge(challenge.id);
        await loadChallenge();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert('Error', 'Failed to join challenge');
      }
    }
  }, [challenge, joinChallenge, loadChallenge]);

  const handleLeave = useCallback(async () => {
    if (!challenge) return;
    
    Alert.alert(
      'Leave Challenge',
      'Are you sure you want to leave this challenge? Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveChallenge(challenge.id);
              await loadChallenge();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {
              Alert.alert('Error', 'Failed to leave challenge');
            }
          },
        },
      ]
    );
  }, [challenge, leaveChallenge, loadChallenge]);

  const handleParticipantPress = useCallback((participant: ChallengeParticipant) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/owner-profile?id=${participant.playerId}` as any);
  }, [router]);

  const timeLabel = useMemo(() => {
    if (!challenge) return '';
    if (challenge.status === 'upcoming') {
      return `Starts in ${getChallengeTimeRemaining(challenge.startDate)}`;
    }
    if (challenge.status === 'voting' && challenge.votingEndDate) {
      return `Voting ends in ${getChallengeTimeRemaining(challenge.votingEndDate)}`;
    }
    if (challenge.status === 'active') {
      return `Ends in ${getChallengeTimeRemaining(challenge.endDate)}`;
    }
    return 'Completed';
  }, [challenge]);

  const canJoin = challenge ? (challenge.status === 'active' || challenge.status === 'upcoming') : false;
  const statusColor = challenge ? getChallengeStatusColor(challenge.status) : colors.primary;
  const styles = createStyles(colors, isDark, statusColor);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Challenge',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading challenge...</Text>
        </View>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Challenge',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.errorContainer}>
          <AlertCircle color={colors.error} size={48} />
          <Text style={styles.errorTitle}>Challenge Not Found</Text>
          <Text style={styles.errorText}>This challenge may have been removed</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: challenge.title,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: challenge.coverImage }}
            style={styles.coverImage}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.gradient}
          />
          
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>
              {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
            </Text>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroIcon}>{challenge.icon}</Text>
            <Text style={styles.heroTitle}>{challenge.title}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaItem}>
                <Timer color="#FFFFFF" size={16} />
                <Text style={styles.heroMetaText}>{timeLabel}</Text>
              </View>
              <View style={styles.heroMetaItem}>
                <Users color="#FFFFFF" size={16} />
                <Text style={styles.heroMetaText}>
                  {challenge.totalParticipants.toLocaleString()} participants
                </Text>
              </View>
            </View>
          </View>
        </View>

        {challenge.isJoined && progress && (
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Your Progress</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View style={styles.progressRank}>
                  <Text style={styles.progressRankLabel}>Current Rank</Text>
                  <Text style={styles.progressRankValue}>#{progress.rank}</Text>
                </View>
                <View style={styles.progressScore}>
                  <Text style={styles.progressScoreLabel}>Score</Text>
                  <Text style={styles.progressScoreValue}>{progress.currentScore}</Text>
                </View>
              </View>

              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progress.progressPercent}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressBarText}>
                  {progress.currentScore}/{progress.targetScore} ({progress.progressPercent}%)
                </Text>
              </View>

              <View style={styles.milestones}>
                <Text style={styles.milestonesTitle}>Milestones</Text>
                {progress.milestones.map((milestone) => (
                  <View key={milestone.id} style={styles.milestoneItem}>
                    {milestone.isCompleted ? (
                      <CheckCircle color="#22C55E" size={18} />
                    ) : (
                      <Target color={colors.textLight} size={18} />
                    )}
                    <View style={styles.milestoneContent}>
                      <Text style={[
                        styles.milestoneTitle,
                        milestone.isCompleted && styles.milestoneTitleCompleted,
                      ]}>
                        {milestone.title}
                      </Text>
                      <Text style={styles.milestoneDescription}>
                        {milestone.description}
                      </Text>
                    </View>
                    {milestone.reward && (
                      <View style={styles.milestoneReward}>
                        <Text style={styles.milestoneRewardIcon}>
                          {getPrizeIcon(milestone.reward.type)}
                        </Text>
                        <Text style={styles.milestoneRewardText}>
                          +{milestone.reward.amount}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{challenge.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rules</Text>
          <View style={styles.rulesList}>
            {challenge.rules.map((rule, index) => (
              <View key={index} style={styles.ruleItem}>
                <View style={styles.ruleBullet}>
                  <Text style={styles.ruleBulletText}>{index + 1}</Text>
                </View>
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prizes</Text>
          <View style={styles.prizesList}>
            {challenge.prizes.map((prize, index) => (
              <View key={prize.id} style={styles.prizeItem}>
                <View style={[
                  styles.prizeBadge,
                  index === 0 && styles.prizeBadgeGold,
                  index === 1 && styles.prizeBadgeSilver,
                  index === 2 && styles.prizeBadgeBronze,
                ]}>
                  <Text style={styles.prizeBadgeText}>{prize.icon}</Text>
                </View>
                <View style={styles.prizeContent}>
                  <Text style={styles.prizeRank}>
                    {prize.rank === 1 ? '1st Place' : prize.rank === 2 ? '2nd Place' : `${prize.rank}th Place`}
                  </Text>
                  <Text style={styles.prizeDescription}>{prize.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {challenge.requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <View style={styles.requirementsList}>
              {challenge.requirements.minLevel && (
                <View style={styles.requirementItem}>
                  <Star color={colors.primary} size={18} />
                  <Text style={styles.requirementText}>
                    Minimum Level {challenge.requirements.minLevel}
                  </Text>
                </View>
              )}
              {challenge.requirements.hasHome && (
                <View style={styles.requirementItem}>
                  <Award color={colors.primary} size={18} />
                  <Text style={styles.requirementText}>
                    Must own a home
                  </Text>
                </View>
              )}
              {challenge.requirements.minCreditScore && (
                <View style={styles.requirementItem}>
                  <TrendingUp color={colors.primary} size={18} />
                  <Text style={styles.requirementText}>
                    Credit Score {challenge.requirements.minCreditScore}+
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {challenge.participants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Participants</Text>
            <View style={styles.participantsList}>
              {challenge.participants.slice(0, 10).map((participant) => (
                <TouchableOpacity
                  key={participant.id}
                  style={[
                    styles.participantItem,
                    participant.isCurrentUser && styles.participantItemHighlight,
                  ]}
                  onPress={() => handleParticipantPress(participant)}
                >
                  <View style={styles.participantRank}>
                    <Text style={[
                      styles.participantRankText,
                      participant.rank <= 3 && styles.participantRankTop,
                    ]}>
                      {participant.rank <= 3
                        ? ['🥇', '🥈', '🥉'][participant.rank - 1]
                        : `#${participant.rank}`}
                    </Text>
                  </View>
                  <Image
                    source={{ uri: participant.playerAvatar }}
                    style={styles.participantAvatar}
                    contentFit="cover"
                    transition={150}
                  />
                  <View style={styles.participantContent}>
                    <Text style={styles.participantName}>
                      {participant.isCurrentUser ? 'You' : participant.playerName}
                    </Text>
                    <Text style={styles.participantScore}>
                      {participant.score.toLocaleString()} pts
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {canJoin && (
        <View style={styles.bottomBar}>
          {challenge.isJoined ? (
            <View style={styles.bottomBarJoined}>
              <View style={styles.joinedStatus}>
                <CheckCircle color="#22C55E" size={20} />
                <Text style={styles.joinedStatusText}>You&apos;re in!</Text>
              </View>
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={handleLeave}
                disabled={isLeavingChallenge}
              >
                {isLeavingChallenge ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Text style={styles.leaveButtonText}>Leave</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoin}
              disabled={isJoiningChallenge}
            >
              {isJoiningChallenge ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Trophy color="#FFFFFF" size={20} />
                  <Text style={styles.joinButtonText}>
                    {challenge.entryFee && challenge.entryFee > 0
                      ? `Join for ${challenge.entryFee} ${challenge.entryCurrency}`
                      : 'Join Challenge'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean, statusColor: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroContainer: {
    height: 280,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroContent: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  heroIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  progressSection: {
    padding: 16,
    paddingBottom: 0,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressRank: {
    alignItems: 'flex-start',
  },
  progressRankLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressRankValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  progressScore: {
    alignItems: 'flex-end',
  },
  progressScoreLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressScoreValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  progressBarText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  milestones: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  milestonesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  milestoneTitleCompleted: {
    color: '#22C55E',
  },
  milestoneDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  milestoneReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  milestoneRewardIcon: {
    fontSize: 12,
  },
  milestoneRewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  rulesList: {
    gap: 10,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  ruleBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleBulletText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  prizesList: {
    gap: 12,
  },
  prizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prizeBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeBadgeGold: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  prizeBadgeSilver: {
    backgroundColor: 'rgba(192, 192, 192, 0.2)',
  },
  prizeBadgeBronze: {
    backgroundColor: 'rgba(205, 127, 50, 0.2)',
  },
  prizeBadgeText: {
    fontSize: 22,
  },
  prizeContent: {
    flex: 1,
  },
  prizeRank: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  prizeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  requirementsList: {
    gap: 10,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requirementText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  participantsList: {
    gap: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  participantItemHighlight: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  participantRank: {
    width: 36,
    alignItems: 'center',
  },
  participantRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  participantRankTop: {
    fontSize: 18,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
  },
  participantContent: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  participantScore: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 120 : 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  joinButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomBarJoined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinedStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
  },
  leaveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.error + '15',
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
});
