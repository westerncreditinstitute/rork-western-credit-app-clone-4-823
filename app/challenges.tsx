import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Swords,
  Trophy,
  Clock,
  Users,
  ChevronRight,
  Star,
  Zap,
  CheckCircle,
  Timer,
  Vote,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useChallenges } from '@/contexts/ChallengeContext';
import {
  Challenge,
  getChallengeTimeRemaining,
  getChallengeStatusColor,
} from '@/types/challenges';

type TabType = 'active' | 'upcoming' | 'voting' | 'completed' | 'joined';

const TABS: { id: TabType; label: string; icon: any }[] = [
  { id: 'active', label: 'Active', icon: Zap },
  { id: 'upcoming', label: 'Upcoming', icon: Clock },
  { id: 'voting', label: 'Voting', icon: Vote },
  { id: 'joined', label: 'My Challenges', icon: Star },
  { id: 'completed', label: 'Past', icon: CheckCircle },
];

interface ChallengeCardProps {
  challenge: Challenge;
  onPress: () => void;
}

function ChallengeCard({ challenge, onPress }: ChallengeCardProps) {
  const { colors, isDark } = useTheme();
  const statusColor = getChallengeStatusColor(challenge.status);
  
  const timeLabel = useMemo(() => {
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

  const styles = createCardStyles(colors, isDark, statusColor);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image
        source={{ uri: challenge.coverImage }}
        style={styles.coverImage}
        contentFit="cover"
        transition={200}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
      />
      
      <View style={styles.statusBadge}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.statusText}>
          {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
        </Text>
      </View>

      {challenge.isJoined && (
        <View style={styles.joinedBadge}>
          <CheckCircle color="#22C55E" size={14} />
          <Text style={styles.joinedText}>Joined</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.icon}>{challenge.icon}</Text>
        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {challenge.description}
        </Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Timer color="rgba(255,255,255,0.7)" size={14} />
            <Text style={styles.metaText}>{timeLabel}</Text>
          </View>
          <View style={styles.metaItem}>
            <Users color="rgba(255,255,255,0.7)" size={14} />
            <Text style={styles.metaText}>
              {challenge.totalParticipants.toLocaleString()} joined
            </Text>
          </View>
        </View>

        <View style={styles.prizeContainer}>
          <Text style={styles.prizeLabel}>Top Prize:</Text>
          <View style={styles.prize}>
            <Text style={styles.prizeIcon}>{challenge.prizes[0]?.icon || '🏆'}</Text>
            <Text style={styles.prizeText}>{challenge.prizes[0]?.description || 'TBA'}</Text>
          </View>
        </View>

        {challenge.isJoined && challenge.userRank && (
          <View style={styles.rankContainer}>
            <Text style={styles.rankLabel}>Your Rank:</Text>
            <Text style={styles.rankValue}>#{challenge.userRank}</Text>
          </View>
        )}
      </View>

      <View style={styles.arrow}>
        <ChevronRight color="rgba(255,255,255,0.6)" size={20} />
      </View>
    </TouchableOpacity>
  );
}

export default function ChallengesScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const {
    activeChallenges,
    upcomingChallenges,
    votingChallenges,
    completedChallenges,
    joinedChallenges,
    isLoadingChallenges,
    refreshChallenges,
  } = useChallenges();

  const [selectedTab, setSelectedTab] = useState<TabType>('active');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayedChallenges = useMemo(() => {
    switch (selectedTab) {
      case 'active':
        return activeChallenges;
      case 'upcoming':
        return upcomingChallenges;
      case 'voting':
        return votingChallenges;
      case 'completed':
        return completedChallenges;
      case 'joined':
        return joinedChallenges;
      default:
        return [];
    }
  }, [selectedTab, activeChallenges, upcomingChallenges, votingChallenges, completedChallenges, joinedChallenges]);

  const handleTabPress = useCallback((tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTab(tab);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    refreshChallenges();
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, [refreshChallenges]);

  const handleChallengePress = useCallback((challenge: Challenge) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/challenge-detail?id=${challenge.id}` as any);
  }, [router]);

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Challenges',
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
        <LinearGradient
          colors={isDark ? ['#7C3AED', '#4F46E5'] : ['#8B5CF6', '#6366F1']}
          style={styles.header}
        >
          <Swords color="#FFFFFF" size={40} />
          <Text style={styles.headerTitle}>Compete & Win</Text>
          <Text style={styles.headerSubtitle}>
            Join challenges, climb the ranks, and earn exclusive rewards!
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeChallenges.length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{joinedChallenges.length}</Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{upcomingChallenges.length}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {TABS.map((tab) => {
              const IconComponent = tab.icon;
              const isSelected = selectedTab === tab.id;
              const count = {
                active: activeChallenges.length,
                upcoming: upcomingChallenges.length,
                voting: votingChallenges.length,
                completed: completedChallenges.length,
                joined: joinedChallenges.length,
              }[tab.id];

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tab, isSelected && styles.tabSelected]}
                  onPress={() => handleTabPress(tab.id)}
                >
                  <IconComponent
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                    size={16}
                  />
                  <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                    {tab.label}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.tabBadge, isSelected && styles.tabBadgeSelected]}>
                      <Text style={[styles.tabBadgeText, isSelected && styles.tabBadgeTextSelected]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.listContainer}>
          {isLoadingChallenges ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading challenges...</Text>
            </View>
          ) : displayedChallenges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Trophy color={colors.textLight} size={48} />
              <Text style={styles.emptyTitle}>No Challenges</Text>
              <Text style={styles.emptyText}>
                {selectedTab === 'joined'
                  ? "You haven't joined any challenges yet"
                  : `No ${selectedTab} challenges at the moment`}
              </Text>
            </View>
          ) : (
            displayedChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onPress={() => handleChallengePress(challenge)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabsContainer: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    gap: 6,
  },
  tabSelected: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextSelected: {
    color: '#FFFFFF',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBadgeTextSelected: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

const createCardStyles = (colors: any, isDark: boolean, statusColor: string) => StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverImage: {
    width: '100%',
    height: 160,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 160,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  joinedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  joinedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  prizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  prizeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  prize: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  prizeIcon: {
    fontSize: 16,
  },
  prizeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
    flex: 1,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rankLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  rankValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  arrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: 60,
  },
});
