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
  Eye,
  Star,
  DollarSign,
  Sofa,
  Wallet,
  Users,
  Heart,
  TrendingUp,
  Clock,
  ChevronRight,
  Swords,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useChallenges } from '@/contexts/ChallengeContext';
import LeaderboardCard from '@/components/community/LeaderboardCard';
import {
  LeaderboardType,
  LeaderboardPeriod,
  LEADERBOARD_CONFIG,
  formatLeaderboardScore,
} from '@/types/challenges';
import { getTimeAgo } from '@/types/communityHomes';

const LEADERBOARD_TABS: { id: LeaderboardType; label: string; icon: any }[] = [
  { id: 'most_visited', label: 'Most Visited', icon: Eye },
  { id: 'highest_rated', label: 'Top Rated', icon: Star },
  { id: 'most_expensive', label: 'Most Valuable', icon: DollarSign },
  { id: 'most_items', label: 'Most Decorated', icon: Sofa },
  { id: 'wealthiest', label: 'Wealthiest', icon: Wallet },
  { id: 'top_hosts', label: 'Top Hosts', icon: Users },
  { id: 'most_liked', label: 'Most Liked', icon: Heart },
  { id: 'rising_stars', label: 'Rising Stars', icon: TrendingUp },
];

const PERIOD_OPTIONS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'weekly', label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
  { id: 'all_time', label: 'All Time' },
];

export default function LeaderboardsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const {
    leaderboard,
    isLoadingLeaderboard,
    selectedLeaderboardType,
    setSelectedLeaderboardType,
    selectedPeriod,
    setSelectedPeriod,
    refreshLeaderboard,
    activeChallenges,
  } = useChallenges();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const topThree = useMemo(() => {
    return leaderboard?.entries.slice(0, 3) || [];
  }, [leaderboard]);

  const restOfList = useMemo(() => {
    return leaderboard?.entries.slice(3) || [];
  }, [leaderboard]);

  const handleTabPress = useCallback((type: LeaderboardType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLeaderboardType(type);
  }, [setSelectedLeaderboardType]);

  const handlePeriodPress = useCallback((period: LeaderboardPeriod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPeriod(period);
  }, [setSelectedPeriod]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    refreshLeaderboard();
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, [refreshLeaderboard]);

  const handleEntryPress = useCallback((entry: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedLeaderboardType === 'top_hosts' || selectedLeaderboardType === 'wealthiest') {
      router.push(`/owner-profile?id=${entry.playerId}` as any);
    } else {
      router.push(`/home-detail?id=${entry.metadata?.homeId || entry.id}` as any);
    }
  }, [selectedLeaderboardType, router]);

  const handleChallengesPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/challenges' as any);
  }, [router]);

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Leaderboards',
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
        {activeChallenges.length > 0 && (
          <TouchableOpacity style={styles.challengeBanner} onPress={handleChallengesPress}>
            <LinearGradient
              colors={['#F59E0B', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.challengeBannerGradient}
            >
              <View style={styles.challengeBannerContent}>
                <Swords color="#FFFFFF" size={24} />
                <View style={styles.challengeBannerText}>
                  <Text style={styles.challengeBannerTitle}>
                    {activeChallenges.length} Active Challenge{activeChallenges.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.challengeBannerSubtitle}>
                    Compete for prizes and glory!
                  </Text>
                </View>
              </View>
              <ChevronRight color="#FFFFFF" size={20} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.periodContainer}>
          {PERIOD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.periodButton,
                selectedPeriod === option.id && styles.periodButtonSelected,
              ]}
              onPress={() => handlePeriodPress(option.id)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === option.id && styles.periodButtonTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {LEADERBOARD_TABS.map((tab) => {
              const IconComponent = tab.icon;
              const isSelected = selectedLeaderboardType === tab.id;
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
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <LinearGradient
          colors={isDark ? ['#0F172A', '#1E293B'] : ['#001F42', '#003D82']}
          style={styles.podiumSection}
        >
          <View style={styles.leaderboardHeader}>
            <Text style={styles.leaderboardTitle}>
              {LEADERBOARD_CONFIG[selectedLeaderboardType].icon} {LEADERBOARD_CONFIG[selectedLeaderboardType].title}
            </Text>
            <Text style={styles.leaderboardDescription}>
              {LEADERBOARD_CONFIG[selectedLeaderboardType].description}
            </Text>
          </View>

          <View style={styles.podiumContainer}>
            {topThree[1] && (
              <View style={styles.podiumItem}>
                <View style={[styles.podiumAvatar, styles.podiumSecond]}>
                  <Image 
                    source={{ uri: topThree[1].avatar }} 
                    style={styles.podiumImage} 
                    contentFit="cover"
                    transition={150}
                  />
                  <View style={[styles.podiumBadge, { backgroundColor: '#C0C0C0' }]}>
                    <Text style={styles.podiumRank}>2</Text>
                  </View>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{topThree[1].name}</Text>
                <Text style={styles.podiumScore}>
                  {formatLeaderboardScore(selectedLeaderboardType, topThree[1].score)}
                </Text>
              </View>
            )}

            {topThree[0] && (
              <View style={styles.podiumItem}>
                <View style={styles.crownContainer}>
                  <Text style={styles.crown}>👑</Text>
                </View>
                <View style={[styles.podiumAvatar, styles.podiumFirst]}>
                  <Image 
                    source={{ uri: topThree[0].avatar }} 
                    style={styles.podiumImage}
                    contentFit="cover"
                    transition={150}
                  />
                  <View style={[styles.podiumBadge, { backgroundColor: '#FFD700' }]}>
                    <Text style={[styles.podiumRank, { color: '#1A1A1A' }]}>1</Text>
                  </View>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{topThree[0].name}</Text>
                <Text style={styles.podiumScore}>
                  {formatLeaderboardScore(selectedLeaderboardType, topThree[0].score)}
                </Text>
              </View>
            )}

            {topThree[2] && (
              <View style={styles.podiumItem}>
                <View style={[styles.podiumAvatar, styles.podiumThird]}>
                  <Image 
                    source={{ uri: topThree[2].avatar }} 
                    style={styles.podiumImage}
                    contentFit="cover"
                    transition={150}
                  />
                  <View style={[styles.podiumBadge, { backgroundColor: '#CD7F32' }]}>
                    <Text style={styles.podiumRank}>3</Text>
                  </View>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{topThree[2].name}</Text>
                <Text style={styles.podiumScore}>
                  {formatLeaderboardScore(selectedLeaderboardType, topThree[2].score)}
                </Text>
              </View>
            )}
          </View>

          {leaderboard?.userRank && leaderboard.userRank > 3 && (
            <View style={styles.userRankContainer}>
              <Text style={styles.userRankLabel}>Your Rank</Text>
              <View style={styles.userRankBadge}>
                <Text style={styles.userRankNumber}>#{leaderboard.userRank}</Text>
                <Text style={styles.userRankScore}>
                  {formatLeaderboardScore(selectedLeaderboardType, leaderboard.userScore || 0)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.updateInfo}>
            <Clock color="rgba(255,255,255,0.6)" size={12} />
            <Text style={styles.updateText}>
              Updated {leaderboard ? getTimeAgo(leaderboard.lastUpdated) : '...'} ago
            </Text>
            <Text style={styles.participantCount}>
              • {leaderboard?.totalParticipants.toLocaleString() || 0} participants
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Full Rankings</Text>
          {isLoadingLeaderboard ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : restOfList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No more entries</Text>
            </View>
          ) : (
            restOfList.map((entry) => (
              <LeaderboardCard
                key={entry.id}
                entry={{
                  ...entry,
                  score: entry.score,
                }}
                onPress={() => handleEntryPress(entry)}
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
  challengeBanner: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  challengeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  challengeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  challengeBannerText: {
    gap: 2,
  },
  challengeBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  challengeBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  periodButtonSelected: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodButtonTextSelected: {
    color: '#FFFFFF',
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextSelected: {
    color: '#FFFFFF',
  },
  podiumSection: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  leaderboardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  leaderboardDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  podiumItem: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  crownContainer: {
    marginBottom: 4,
  },
  crown: {
    fontSize: 28,
  },
  podiumAvatar: {
    borderRadius: 35,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  podiumFirst: {
    width: 80,
    height: 80,
    borderColor: '#FFD700',
  },
  podiumSecond: {
    width: 64,
    height: 64,
    borderColor: '#C0C0C0',
    marginTop: 20,
  },
  podiumThird: {
    width: 64,
    height: 64,
    borderColor: '#CD7F32',
    marginTop: 20,
  },
  podiumImage: {
    width: '100%',
    height: '100%',
  },
  podiumBadge: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRank: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 80,
    textAlign: 'center',
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  userRankContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  userRankLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },
  userRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userRankNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userRankScore: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  updateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  participantCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
