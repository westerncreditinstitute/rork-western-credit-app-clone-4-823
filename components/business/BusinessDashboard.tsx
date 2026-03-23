import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Plus,
  ChevronRight,
  Award,
  BarChart3,
  Briefcase,
  MapPin,
  Trophy,
  Handshake,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserBusinessData,
  formatCurrency,
  formatBusinessStage,
  getBusinessStageColor,
} from '@/types/business';
import { Card, Button, ProgressBar } from '@/components/ui';
import BusinessCreationModal from './BusinessCreationModal';
import InvestmentPoolBrowser from './InvestmentPoolBrowser';

interface BusinessDashboardProps {
  onBusinessSelect?: (businessId: string) => void;
  availableFunds?: number;
  userCreditScore?: number;
}

export default function BusinessDashboard({
  onBusinessSelect,
  availableFunds = 50000,
  userCreditScore = 700,
}: BusinessDashboardProps) {
  const { colors, isDark } = useTheme();
  const { getUserBusinesses, getBusinessStats, getBusinessAchievements, closeBusiness } = useBusiness();
  const router = useRouter();
  useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPoolBrowser, setShowPoolBrowser] = useState(false);

  const businesses = useMemo(() => getUserBusinesses(), [getUserBusinesses]);
  const stats = useMemo(() => getBusinessStats(), [getBusinessStats]);
  const achievements = useMemo(() => getBusinessAchievements(), [getBusinessAchievements]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleCloseBusiness = useCallback((business: UserBusinessData) => {
    Alert.alert(
      'Close Business',
      `Are you sure you want to close ${business.businessName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Business',
          style: 'destructive',
          onPress: () => {
            closeBusiness(business.id, 'User closed');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [closeBusiness]);

  const styles = createStyles(colors, isDark);

  const renderStatsCard = () => (
    <LinearGradient
      colors={colors.gradient.primary as [string, string]}
      style={styles.statsCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.statsHeader}>
        <View style={styles.statsIconWrap}>
          <BarChart3 color={colors.white} size={24} />
        </View>
        <Text style={styles.statsTitle}>Business Portfolio</Text>
      </View>

      <View style={styles.mainStat}>
        <Text style={styles.mainStatLabel}>Total Monthly Profit</Text>
        <Text style={styles.mainStatValue}>
          {stats.totalMonthlyProfit >= 0 ? '+' : ''}{formatCurrency(stats.totalMonthlyProfit)}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Building2 color="rgba(255,255,255,0.7)" size={18} />
          <Text style={styles.statValue}>{stats.totalBusinesses}</Text>
          <Text style={styles.statLabel}>Businesses</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <TrendingUp color="rgba(255,255,255,0.7)" size={18} />
          <Text style={styles.statValue}>{stats.profitableBusinesses}</Text>
          <Text style={styles.statLabel}>Profitable</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <DollarSign color="rgba(255,255,255,0.7)" size={18} />
          <Text style={styles.statValue}>{formatCurrency(stats.totalMonthlyRevenue)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const renderQuickActions = () => (
    <>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowCreateModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
            <Plus size={24} color={colors.primary} />
          </View>
          <Text style={styles.actionTitle}>Start Business</Text>
          <Text style={styles.actionDesc}>Launch a new venture</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowPoolBrowser(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.info + '20' }]}>
            <Users size={24} color={colors.info} />
          </View>
          <Text style={styles.actionTitle}>Invest</Text>
          <Text style={styles.actionDesc}>Browse opportunities</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/joint-ventures' as any);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.success + '20' }]}>
            <Handshake size={24} color={colors.success} />
          </View>
          <Text style={styles.actionTitle}>Joint Ventures</Text>
          <Text style={styles.actionDesc}>Partner with others</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/business-competitions' as any);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.warning + '20' }]}>
            <Trophy size={24} color={colors.warning} />
          </View>
          <Text style={styles.actionTitle}>Competitions</Text>
          <Text style={styles.actionDesc}>Compete & win prizes</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderBusinessCard = (business: UserBusinessData) => {
    const fundingProgress = business.fundingGoal > 0
      ? (business.currentFunding / business.fundingGoal) * 100
      : 100;
    const isProfitable = business.monthlyProfit > 0;
    const stageColor = getBusinessStageColor(business.businessStage);

    return (
      <TouchableOpacity
        key={business.id}
        style={styles.businessCard}
        onPress={() => onBusinessSelect?.(business.id)}
        onLongPress={() => handleCloseBusiness(business)}
        activeOpacity={0.7}
      >
        <View style={styles.businessHeader}>
          <View style={[styles.businessIcon, { backgroundColor: colors.primary + '15' }]}>
            <Building2 size={24} color={colors.primary} />
          </View>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName} numberOfLines={1}>{business.businessName}</Text>
            <View style={styles.businessMeta}>
              <MapPin size={12} color={colors.textSecondary} />
              <Text style={styles.businessLocation}>{business.location}</Text>
            </View>
          </View>
          <View style={[styles.stageBadge, { backgroundColor: stageColor + '20' }]}>
            <Text style={[styles.stageBadgeText, { color: stageColor }]}>
              {formatBusinessStage(business.businessStage)}
            </Text>
          </View>
        </View>

        {business.businessStage === 'funding' && (
          <View style={styles.fundingProgress}>
            <View style={styles.fundingHeader}>
              <Text style={styles.fundingLabel}>Funding Progress</Text>
              <Text style={styles.fundingPercent}>{fundingProgress.toFixed(0)}%</Text>
            </View>
            <ProgressBar progress={fundingProgress} height={6} variant="default" />
            <Text style={styles.fundingAmount}>
              {formatCurrency(business.currentFunding)} / {formatCurrency(business.fundingGoal)}
            </Text>
          </View>
        )}

        {(business.businessStage === 'operational' || business.businessStage === 'profitable' || business.businessStage === 'struggling') && (
          <View style={styles.financials}>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Revenue</Text>
              <Text style={styles.financialValue}>{formatCurrency(business.monthlyRevenue)}</Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Expenses</Text>
              <Text style={styles.financialValue}>{formatCurrency(business.monthlyExpenses)}</Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Profit</Text>
              <View style={styles.profitRow}>
                {isProfitable ? (
                  <TrendingUp size={14} color={colors.success} />
                ) : (
                  <TrendingDown size={14} color={colors.error} />
                )}
                <Text style={[styles.profitValue, { color: isProfitable ? colors.success : colors.error }]}>
                  {formatCurrency(business.monthlyProfit)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.businessFooter}>
          <View style={styles.footerStat}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={styles.footerStatText}>{business.employeeCount} employees</Text>
          </View>
          <View style={styles.footerStat}>
            <Target size={14} color={colors.textSecondary} />
            <Text style={styles.footerStatText}>{business.ownershipPercentage.toFixed(0)}% owned</Text>
          </View>
          <ChevronRight size={18} color={colors.textLight} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderAchievements = () => {
    if (achievements.length === 0) return null;

    return (
      <View style={styles.achievementsSection}>
        <View style={styles.sectionHeader}>
          <Award size={20} color={colors.warning} />
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
          {achievements.slice(0, 5).map((achievement) => (
            <View key={achievement.id} style={styles.achievementCard}>
              <View style={[styles.achievementIcon, { backgroundColor: colors.warning + '20' }]}>
                <Award size={20} color={colors.warning} />
              </View>
              <Text style={styles.achievementTitle}>{achievement.achievementTitle}</Text>
              <Text style={styles.achievementDesc} numberOfLines={2}>{achievement.achievementDescription}</Text>
              {achievement.rewardAmount > 0 && (
                <Text style={styles.achievementReward}>+{formatCurrency(achievement.rewardAmount)}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {renderStatsCard()}
        {renderQuickActions()}
        {renderAchievements()}

        <View style={styles.businessesSection}>
          <View style={styles.sectionHeader}>
            <Briefcase size={20} color={colors.text} />
            <Text style={styles.sectionTitle}>Your Businesses</Text>
            {businesses.length > 0 && (
              <Text style={styles.sectionCount}>{businesses.length}</Text>
            )}
          </View>

          {businesses.length === 0 ? (
            <Card variant="outlined" padding="lg" style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Building2 size={40} color={colors.textLight} />
              </View>
              <Text style={styles.emptyTitle}>No Businesses Yet</Text>
              <Text style={styles.emptyText}>
                Start your entrepreneurial journey by creating your first business or investing in existing opportunities.
              </Text>
              <Button
                title="Start a Business"
                onPress={() => setShowCreateModal(true)}
                variant="primary"
                size="md"
                icon={<Plus size={18} color={colors.white} />}
              />
            </Card>
          ) : (
            businesses.map(renderBusinessCard)
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BusinessCreationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onBusinessCreated={(id) => {
          console.log('[BusinessDashboard] Business created:', id);
        }}
        availableFunds={availableFunds}
        userCreditScore={userCreditScore}
      />

      <InvestmentPoolBrowser
        visible={showPoolBrowser}
        onClose={() => setShowPoolBrowser(false)}
        availableFunds={availableFunds}
      />
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
    marginBottom: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.9)',
  },
  mainStat: {
    marginBottom: 20,
  },
  mainStatLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  mainStatValue: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: colors.white,
    letterSpacing: -1,
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
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.white,
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  achievementsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  achievementsScroll: {
    gap: 12,
  },
  achievementCard: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  achievementReward: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.success,
  },
  businessesSection: {
    marginBottom: 16,
  },
  businessCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  businessIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessInfo: {
    flex: 1,
    marginLeft: 12,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  businessMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  businessLocation: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  fundingProgress: {
    marginBottom: 14,
  },
  fundingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fundingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  fundingPercent: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text,
  },
  fundingAmount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  financials: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  financialItem: {
    flex: 1,
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profitValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  businessFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
  },
  footerStatText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 20,
  },
});
