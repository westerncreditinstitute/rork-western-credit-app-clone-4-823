import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Percent,
  ChevronRight,
  Plus,
  Wallet,
  Award,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { UserBusinessData, BusinessStage } from '@/types/business';
import { formatCurrency } from '@/mocks/businessCategories';

const getStageColor = (stage: BusinessStage): string => {
  switch (stage) {
    case 'planning': return '#6B7280';
    case 'funding': return '#3B82F6';
    case 'operational': return '#22C55E';
    case 'profitable': return '#10B981';
    case 'struggling': return '#F59E0B';
    case 'closed': return '#EF4444';
    default: return '#6B7280';
  }
};

const getStageLabel = (stage: BusinessStage): string => {
  switch (stage) {
    case 'planning': return 'Planning';
    case 'funding': return 'Seeking Funding';
    case 'operational': return 'Operational';
    case 'profitable': return 'Profitable';
    case 'struggling': return 'Struggling';
    case 'closed': return 'Closed';
    default: return 'Unknown';
  }
};

interface BusinessCardProps {
  business: UserBusinessData;
  onPress: () => void;
}

const BusinessCard = ({ business, onPress }: BusinessCardProps) => {
  const { colors } = useTheme();
  const stageColor = getStageColor(business.businessStage);
  const isProfitable = business.monthlyProfit > 0;
  const fundingProgress = business.fundingGoal > 0 
    ? (business.currentFunding / business.fundingGoal) * 100 
    : 100;

  return (
    <TouchableOpacity
      style={[styles.businessCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.businessCardHeader}>
        <View style={[styles.businessIcon, { backgroundColor: stageColor + '20' }]}>
          <Building2 size={24} color={stageColor} />
        </View>
        <View style={styles.businessInfo}>
          <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
            {business.businessName}
          </Text>
          <Text style={[styles.businessType, { color: colors.textSecondary }]}>
            {business.businessType}
          </Text>
        </View>
        <View style={[styles.stageBadge, { backgroundColor: stageColor + '20' }]}>
          <Text style={[styles.stageBadgeText, { color: stageColor }]}>
            {getStageLabel(business.businessStage)}
          </Text>
        </View>
      </View>

      {business.businessStage === 'funding' && (
        <View style={styles.fundingProgress}>
          <View style={styles.fundingHeader}>
            <Text style={[styles.fundingLabel, { color: colors.textSecondary }]}>Funding Progress</Text>
            <Text style={[styles.fundingPercent, { color: colors.text }]}>
              {fundingProgress.toFixed(0)}%
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: '#3B82F6', width: `${Math.min(fundingProgress, 100)}%` }
              ]}
            />
          </View>
          <View style={styles.fundingAmounts}>
            <Text style={[styles.fundingAmount, { color: colors.text }]}>
              {formatCurrency(business.currentFunding)}
            </Text>
            <Text style={[styles.fundingGoal, { color: colors.textSecondary }]}>
              of {formatCurrency(business.fundingGoal)}
            </Text>
          </View>
        </View>
      )}

      {(business.businessStage === 'operational' || business.businessStage === 'profitable' || business.businessStage === 'struggling') && (
        <View style={styles.financials}>
          <View style={styles.financialItem}>
            <View style={styles.financialHeader}>
              <TrendingUp size={14} color="#10B981" />
              <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Revenue</Text>
            </View>
            <Text style={[styles.financialValue, { color: '#10B981' }]}>
              {formatCurrency(business.monthlyRevenue)}/mo
            </Text>
          </View>
          <View style={styles.financialItem}>
            <View style={styles.financialHeader}>
              <TrendingDown size={14} color="#EF4444" />
              <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Expenses</Text>
            </View>
            <Text style={[styles.financialValue, { color: '#EF4444' }]}>
              {formatCurrency(business.monthlyExpenses)}/mo
            </Text>
          </View>
          <View style={styles.financialItem}>
            <View style={styles.financialHeader}>
              {isProfitable ? (
                <ArrowUpRight size={14} color="#10B981" />
              ) : (
                <ArrowDownRight size={14} color="#EF4444" />
              )}
              <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Profit</Text>
            </View>
            <Text style={[styles.financialValue, { color: isProfitable ? '#10B981' : '#EF4444' }]}>
              {isProfitable ? '+' : ''}{formatCurrency(business.monthlyProfit)}/mo
            </Text>
          </View>
        </View>
      )}

      <View style={styles.businessCardFooter}>
        <View style={styles.ownershipBadge}>
          <Percent size={12} color={colors.textSecondary} />
          <Text style={[styles.ownershipText, { color: colors.textSecondary }]}>
            {business.ownershipPercentage.toFixed(1)}% ownership
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

export default function BusinessDashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  useGame();
  const { 
    getUserBusinesses, 
    getBusinessStats,
    getBusinessAchievements,
    getOpenPools,
  } = useBusiness();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setSelectedBusinessId] = useState<string | null>(params.id || null);

  const userBusinesses = useMemo(() => getUserBusinesses(), [getUserBusinesses]);
  const stats = useMemo(() => getBusinessStats(), [getBusinessStats]);
  const achievements = useMemo(() => getBusinessAchievements(), [getBusinessAchievements]);
  const openPools = useMemo(() => getOpenPools(), [getOpenPools]);

  

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  const handleBusinessPress = useCallback((business: UserBusinessData) => {
    setSelectedBusinessId(business.id);
    router.push(`/game/business-detail?id=${business.id}` as any);
  }, [router]);

  const handleStartBusiness = useCallback(() => {
    router.push('/game/start-business' as any);
  }, [router]);

  const handleViewInvestmentPools = useCallback(() => {
    router.push('/game/investment-pools' as any);
  }, [router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Businesses',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          <View style={[styles.statsOverview, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statsTitle, { color: colors.text }]}>Business Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <View style={[styles.statIcon, { backgroundColor: '#3B82F620' }]}>
                  <Building2 size={18} color="#3B82F6" />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalBusinesses}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Businesses</Text>
              </View>
              <View style={styles.statBox}>
                <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
                  <TrendingUp size={18} color="#10B981" />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.profitableBusinesses}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Profitable</Text>
              </View>
              <View style={styles.statBox}>
                <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
                  <DollarSign size={18} color="#F59E0B" />
                </View>
                <Text style={[styles.statNumber, { color: '#10B981' }]}>
                  {formatCurrency(stats.totalMonthlyProfit)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Monthly Profit</Text>
              </View>
              <View style={styles.statBox}>
                <View style={[styles.statIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Award size={18} color="#8B5CF6" />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.achievementsUnlocked}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Achievements</Text>
              </View>
            </View>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleStartBusiness}
            >
              <Plus size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Start Business</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButtonSecondary, { backgroundColor: colors.surface }]}
              onPress={handleViewInvestmentPools}
            >
              <Users size={18} color={colors.primary} />
              <Text style={[styles.actionButtonSecondaryText, { color: colors.text }]}>
                Invest ({openPools.length})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Building2 size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Businesses</Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {userBusinesses.length}
            </Text>
          </View>

          {userBusinesses.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Building2 size={48} color={colors.textLight} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Businesses Yet</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Start your entrepreneurial journey by creating your first business!
              </Text>
              <TouchableOpacity
                style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                onPress={handleStartBusiness}
              >
                <Plus size={16} color="#FFF" />
                <Text style={styles.emptyStateButtonText}>Start A Business</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.businessList}>
              {userBusinesses.map(business => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  onPress={() => handleBusinessPress(business)}
                />
              ))}
            </View>
          )}

          {stats.totalInvested > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Wallet size={18} color={colors.textSecondary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Investment Summary</Text>
              </View>

              <View style={[styles.investmentSummary, { backgroundColor: colors.surface }]}>
                <View style={styles.investmentRow}>
                  <Text style={[styles.investmentLabel, { color: colors.textSecondary }]}>Total Invested</Text>
                  <Text style={[styles.investmentValue, { color: colors.text }]}>
                    {formatCurrency(stats.totalInvested)}
                  </Text>
                </View>
                <View style={styles.investmentRow}>
                  <Text style={[styles.investmentLabel, { color: colors.textSecondary }]}>Total Returns</Text>
                  <Text style={[styles.investmentValue, { color: '#10B981' }]}>
                    {formatCurrency(stats.totalReturns)}
                  </Text>
                </View>
                <View style={[styles.investmentRow, styles.investmentRowLast]}>
                  <Text style={[styles.investmentLabel, { color: colors.textSecondary }]}>ROI</Text>
                  <Text style={[
                    styles.investmentValue, 
                    { color: stats.totalReturns >= stats.totalInvested ? '#10B981' : '#EF4444' }
                  ]}>
                    {stats.totalInvested > 0 
                      ? `${(((stats.totalReturns - stats.totalInvested) / stats.totalInvested) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </Text>
                </View>
              </View>
            </>
          )}

          {achievements.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Award size={18} color={colors.textSecondary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Achievements</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsList}>
                {achievements.slice(0, 5).map(achievement => (
                  <View
                    key={achievement.id}
                    style={[styles.achievementCard, { backgroundColor: colors.surface }]}
                  >
                    <View style={[styles.achievementIcon, { backgroundColor: '#F59E0B20' }]}>
                      <Award size={20} color="#F59E0B" />
                    </View>
                    <Text style={[styles.achievementTitle, { color: colors.text }]} numberOfLines={1}>
                      {achievement.achievementTitle}
                    </Text>
                    <Text style={[styles.achievementDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {achievement.achievementDescription}
                    </Text>
                    {achievement.rewardAmount > 0 && (
                      <View style={styles.achievementReward}>
                        <DollarSign size={12} color="#10B981" />
                        <Text style={styles.achievementRewardText}>
                          +{formatCurrency(achievement.rewardAmount)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsOverview: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  businessList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  businessCard: {
    padding: 16,
    borderRadius: 16,
  },
  businessCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  businessIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
  },
  businessType: {
    fontSize: 13,
    marginTop: 2,
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fundingProgress: {
    marginBottom: 12,
  },
  fundingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fundingLabel: {
    fontSize: 12,
  },
  fundingPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  fundingAmounts: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 4,
  },
  fundingAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  fundingGoal: {
    fontSize: 14,
  },
  financials: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  financialItem: {
    alignItems: 'center',
  },
  financialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  financialLabel: {
    fontSize: 11,
  },
  financialValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  businessCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB20',
  },
  ownershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownershipText: {
    fontSize: 12,
  },
  emptyState: {
    margin: 16,
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  investmentSummary: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  investmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB20',
  },
  investmentRowLast: {
    borderBottomWidth: 0,
  },
  investmentLabel: {
    fontSize: 14,
  },
  investmentValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  achievementsList: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  achievementCard: {
    width: 160,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  achievementReward: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  achievementRewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  bottomPadding: {
    height: 40,
  },
});
