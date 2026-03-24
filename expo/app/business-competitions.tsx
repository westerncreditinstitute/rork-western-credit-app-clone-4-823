import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Trophy,
  Flame,
  Clock,
  History,
  Medal,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { BusinessCompetitionService } from '@/services/BusinessCompetitionService';
import BusinessCompetitionCard from '@/components/business/BusinessCompetitionCard';
import {
  BusinessCompetition,
  CompetitionType,
} from '@/types/multiplayer-business';
import { formatCurrency } from '@/types/business';

type TabType = 'active' | 'upcoming' | 'history';
type FilterType = 'all' | CompetitionType;

export default function BusinessCompetitionsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { getUserBusinesses } = useBusiness();

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [competitions, setCompetitions] = useState<BusinessCompetition[]>([]);
  const [userCompetitions, setUserCompetitions] = useState<BusinessCompetition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?.id || 'anonymous';
  const userBusinesses = useMemo(() => getUserBusinesses(), [getUserBusinesses]);

  const loadCompetitions = useCallback(async () => {
    try {
      const [allComps, userComps] = await Promise.all([
        BusinessCompetitionService.getActiveCompetitions(),
        BusinessCompetitionService.getUserCompetitions(userId),
      ]);
      setCompetitions(allComps);
      setUserCompetitions(userComps);
      console.log('[BusinessCompetitionsScreen] Loaded competitions:', allComps.length);
    } catch (error) {
      console.error('[BusinessCompetitionsScreen] Error loading competitions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCompetitions();
  }, [loadCompetitions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCompetitions();
    setRefreshing(false);
  }, [loadCompetitions]);

  const filteredCompetitions = useMemo(() => {
    let filtered = competitions;

    if (activeTab === 'active') {
      filtered = filtered.filter(c => c.status === 'active');
    } else if (activeTab === 'upcoming') {
      filtered = filtered.filter(c => c.status === 'upcoming');
    } else {
      filtered = userCompetitions.filter(c => c.status === 'completed');
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.type === filterType);
    }

    return filtered;
  }, [competitions, userCompetitions, activeTab, filterType]);

  const userParticipatingIds = useMemo(() => 
    new Set(userCompetitions.map(c => c.id)),
    [userCompetitions]
  );

  const handleJoinCompetition = useCallback(async (competition: BusinessCompetition) => {
    if (userBusinesses.length === 0) {
      Alert.alert('No Business', 'You need at least one business to join a competition.');
      return;
    }

    if (userBusinesses.length === 1) {
      const result = await BusinessCompetitionService.joinCompetition(
        { competitionId: competition.id, businessId: userBusinesses[0].id },
        userId,
        user?.name || 'Player',
        user?.avatar
      );

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Joined!', `You've joined ${competition.name}`);
        loadCompetitions();
      } else {
        Alert.alert('Error', result.error || 'Failed to join competition');
      }
    } else {
      Alert.alert(
        'Select Business',
        'Which business would you like to enter?',
        userBusinesses.map(b => ({
          text: b.businessName,
          onPress: async () => {
            const result = await BusinessCompetitionService.joinCompetition(
              { competitionId: competition.id, businessId: b.id },
              userId,
              user?.name || 'Player',
              user?.avatar
            );

            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Joined!', `You've entered ${b.businessName} in ${competition.name}`);
              loadCompetitions();
            } else {
              Alert.alert('Error', result.error || 'Failed to join competition');
            }
          },
        }))
      );
    }
  }, [userBusinesses, userId, user, loadCompetitions]);

  const styles = createStyles(colors);

  const competitionTypes: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'sales', label: 'Sales' },
    { key: 'profit', label: 'Profit' },
    { key: 'revenue_growth', label: 'Growth' },
    { key: 'market_share', label: 'Market' },
  ];

  const renderStats = () => {
    const activeCount = competitions.filter(c => c.status === 'active').length;
    const participatingCount = userCompetitions.filter(c => c.status === 'active').length;
    const totalPrizePool = competitions.reduce((sum, c) => sum + c.prizePool, 0);

    return (
      <LinearGradient
        colors={colors.gradient.secondary as [string, string]}
        style={styles.statsCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statsHeader}>
          <Trophy size={24} color={colors.white} />
          <Text style={styles.statsTitle}>Business Competitions</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Flame size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Medal size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statValue}>{participatingCount}</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <TrendingUp size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statValue}>{formatCurrency(totalPrizePool)}</Text>
            <Text style={styles.statLabel}>Prize Pool</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {[
        { key: 'active' as TabType, label: 'Active', icon: Flame },
        { key: 'upcoming' as TabType, label: 'Upcoming', icon: Clock },
        { key: 'history' as TabType, label: 'History', icon: History },
      ].map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab.key);
            }}
            activeOpacity={0.7}
          >
            <Icon size={16} color={isActive ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersContainer}
    >
      {competitionTypes.map((type) => {
        const isActive = filterType === type.key;
        return (
          <TouchableOpacity
            key={type.key}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            onPress={() => setFilterType(type.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Trophy size={48} color={colors.textLight} />
      </View>
      <Text style={styles.emptyTitle}>No Competitions</Text>
      <Text style={styles.emptyText}>
        {activeTab === 'active'
          ? 'There are no active competitions right now. Check back soon!'
          : activeTab === 'upcoming'
          ? 'No upcoming competitions at the moment.'
          : "You haven't participated in any competitions yet."}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Competitions',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {renderStats()}
        {renderTabs()}
        {renderFilters()}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredCompetitions.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.competitionsList}>
            {filteredCompetitions.map((competition) => (
              <BusinessCompetitionCard
                key={competition.id}
                competition={competition}
                currentUserId={userId}
                isParticipating={userParticipatingIds.has(competition.id)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  console.log('[BusinessCompetitions] View competition:', competition.id);
                }}
                onJoinPress={() => handleJoinCompetition(competition)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.primary + '15',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600' as const,
  },
  filtersContainer: {
    gap: 8,
    paddingBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  competitionsList: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    maxWidth: 280,
    lineHeight: 20,
  },
});
