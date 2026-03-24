import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Clock,
  Filter,
  ChevronDown,
  X,
  CheckCircle,
  Percent,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  LogOut,
  RefreshCw,
  PieChart,
  BarChart3,
  Calendar,
  Building2,
} from 'lucide-react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import type { ContributionStatus } from '@/types/business';
import * as Haptics from 'expo-haptics';

type SortOption = 'newest' | 'largest_amount' | 'highest_return' | 'highest_ownership';
type StatusFilter = 'all' | 'active' | 'withdrawn' | 'refunded';

interface UserInvestment {
  id: string;
  poolId: string;
  poolName: string;
  businessName: string;
  businessType: string;
  contributionAmount: number;
  ownershipPercentage: number;
  contributionDate: number;
  totalReturnReceived: number;
  expectedRoiPercentage: number;
  status: ContributionStatus;
  fundingProgress: number;
  deadline: number;
}

const MOCK_USER_INVESTMENTS: UserInvestment[] = [
  {
    id: 'inv_1',
    poolId: 'pool_1',
    poolName: 'Downtown Italian Restaurant Pool',
    businessName: 'Downtown Italian Restaurant',
    businessType: 'Food & Beverage',
    contributionAmount: 15000,
    ownershipPercentage: 5.0,
    contributionDate: Date.now() - 25 * 24 * 60 * 60 * 1000,
    totalReturnReceived: 2250,
    expectedRoiPercentage: 18,
    status: 'active',
    fundingProgress: 61.67,
    deadline: Date.now() + 60 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'inv_2',
    poolId: 'pool_2',
    poolName: 'FinTrack - Personal Finance App',
    businessName: 'FinTrack App',
    businessType: 'Technology',
    contributionAmount: 7500,
    ownershipPercentage: 3.75,
    contributionDate: Date.now() - 40 * 24 * 60 * 60 * 1000,
    totalReturnReceived: 1875,
    expectedRoiPercentage: 35,
    status: 'active',
    fundingProgress: 71.0,
    deadline: Date.now() + 45 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'inv_3',
    poolId: 'pool_3',
    poolName: 'Metro Property Group',
    businessName: 'Metro Property Group',
    businessType: 'Real Estate',
    contributionAmount: 25000,
    ownershipPercentage: 16.67,
    contributionDate: Date.now() - 90 * 24 * 60 * 60 * 1000,
    totalReturnReceived: 30500,
    expectedRoiPercentage: 22,
    status: 'withdrawn',
    fundingProgress: 100,
    deadline: Date.now() - 15 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'inv_4',
    poolId: 'pool_5',
    poolName: 'Bright Smile Dental',
    businessName: 'Bright Smile Dental',
    businessType: 'Medical',
    contributionAmount: 20000,
    ownershipPercentage: 4.0,
    contributionDate: Date.now() - 35 * 24 * 60 * 60 * 1000,
    totalReturnReceived: 800,
    expectedRoiPercentage: 25,
    status: 'active',
    fundingProgress: 62.4,
    deadline: Date.now() + 50 * 24 * 60 * 60 * 1000,
  },
];

interface InvestmentCardProps {
  investment: UserInvestment;
  onPress: () => void;
}

const InvestmentCard = ({ investment, onPress }: InvestmentCardProps) => {
  const { colors } = useTheme();
  const profitLoss = investment.totalReturnReceived - investment.contributionAmount;
  const isProfitable = profitLoss >= 0;
  const roiAchieved = investment.contributionAmount > 0 
    ? ((investment.totalReturnReceived - investment.contributionAmount) / investment.contributionAmount) * 100 
    : 0;

  const getStatusColor = (status: ContributionStatus): string => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'withdrawn': return '#3B82F6';
      case 'refunded': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: ContributionStatus): string => {
    switch (status) {
      case 'active': return 'Active';
      case 'withdrawn': return 'Completed';
      case 'refunded': return 'Refunded';
      default: return 'Unknown';
    }
  };

  const getCategoryColor = (type: string): string => {
    if (type.includes('Technology')) return '#06B6D4';
    if (type.includes('Real Estate')) return '#10B981';
    if (type.includes('Medical')) return '#EF4444';
    if (type.includes('Food')) return '#F59E0B';
    if (type.includes('Financial')) return '#8B5CF6';
    return '#6B7280';
  };

  return (
    <TouchableOpacity
      style={[styles.investmentCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(investment.businessType) + '20' }]}>
          <Building2 size={12} color={getCategoryColor(investment.businessType)} />
          <Text style={[styles.categoryText, { color: getCategoryColor(investment.businessType) }]}>
            {investment.businessType}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(investment.status) + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(investment.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(investment.status) }]}>
            {getStatusLabel(investment.status)}
          </Text>
        </View>
      </View>

      <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
        {investment.businessName}
      </Text>
      <Text style={[styles.poolName, { color: colors.textSecondary }]} numberOfLines={1}>
        {investment.poolName}
      </Text>

      <View style={styles.investmentStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Invested</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            ${investment.contributionAmount.toLocaleString()}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ownership</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {investment.ownershipPercentage.toFixed(2)}%
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Returns</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            ${investment.totalReturnReceived.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={[styles.profitRow, { backgroundColor: isProfitable ? '#10B98110' : '#EF444410' }]}>
        {isProfitable ? (
          <ArrowUpRight size={16} color="#10B981" />
        ) : (
          <ArrowDownRight size={16} color="#EF4444" />
        )}
        <Text style={[styles.profitText, { color: isProfitable ? '#10B981' : '#EF4444' }]}>
          {isProfitable ? '+' : ''}{profitLoss.toLocaleString()} ({roiAchieved >= 0 ? '+' : ''}{roiAchieved.toFixed(1)}%)
        </Text>
        <View style={styles.profitSpacer} />
        <Text style={[styles.expectedRoi, { color: colors.textSecondary }]}>
          Expected: {investment.expectedRoiPercentage}% ROI
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.dateInfo}>
          <Calendar size={12} color={colors.textSecondary} />
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {new Date(investment.contributionDate).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.viewButton, { backgroundColor: colors.primary }]}
          onPress={onPress}
        >
          <Text style={styles.viewButtonText}>Details</Text>
          <ArrowRight size={14} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function InvestmentPortfolioScreen() {
  const { colors } = useTheme();
  useGame();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<UserInvestment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const investments = MOCK_USER_INVESTMENTS;

  const portfolioSummary = useMemo(() => {
    let totalInvested = 0;
    let totalReturned = 0;
    let activeCount = 0;
    let completedCount = 0;

    investments.forEach((inv) => {
      totalInvested += inv.contributionAmount;
      totalReturned += inv.totalReturnReceived;
      if (inv.status === 'active') activeCount++;
      else if (inv.status === 'withdrawn') completedCount++;
    });

    const totalProfit = totalReturned - totalInvested;
    const overallRoi = totalInvested > 0 ? ((totalReturned - totalInvested) / totalInvested) * 100 : 0;

    return { totalInvested, totalReturned, totalProfit, overallRoi, activeCount, completedCount };
  }, [investments]);

  const filteredInvestments = useMemo(() => {
    let filtered = [...investments];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === statusFilter);
    }

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.contributionDate - a.contributionDate);
        break;
      case 'largest_amount':
        filtered.sort((a, b) => b.contributionAmount - a.contributionAmount);
        break;
      case 'highest_return':
        filtered.sort((a, b) => b.totalReturnReceived - a.totalReturnReceived);
        break;
      case 'highest_ownership':
        filtered.sort((a, b) => b.ownershipPercentage - a.ownershipPercentage);
        break;
    }

    return filtered;
  }, [investments, statusFilter, sortBy]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const handleInvestmentPress = useCallback((investment: UserInvestment) => {
    setSelectedInvestment(investment);
    setShowDetailModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleWithdraw = useCallback(() => {
    if (!selectedInvestment) return;

    Alert.alert(
      'Withdraw Investment',
      `Are you sure you want to withdraw your investment of $${selectedInvestment.contributionAmount.toLocaleString()} from ${selectedInvestment.businessName}?\n\nCurrent return: $${selectedInvestment.totalReturnReceived.toLocaleString()}\n\nNote: Early withdrawal may result in reduced returns.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            Alert.alert(
              'Withdrawal Successful',
              `You have withdrawn $${selectedInvestment.totalReturnReceived.toLocaleString()} from ${selectedInvestment.businessName}.`
            );
            setShowDetailModal(false);
            setSelectedInvestment(null);
          },
        },
      ]
    );
  }, [selectedInvestment]);

  const handleViewBusiness = useCallback(() => {
    if (!selectedInvestment) return;
    setShowDetailModal(false);
    router.push('/game/investment-pools' as any);
  }, [selectedInvestment]);

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: 'newest', label: 'Newest First' },
    { id: 'largest_amount', label: 'Largest Investment' },
    { id: 'highest_return', label: 'Highest Returns' },
    { id: 'highest_ownership', label: 'Highest Ownership' },
  ];

  const statusOptions: { id: StatusFilter; label: string; color: string }[] = [
    { id: 'all', label: 'All Investments', color: colors.textSecondary },
    { id: 'active', label: 'Active', color: '#22C55E' },
    { id: 'withdrawn', label: 'Completed', color: '#3B82F6' },
    { id: 'refunded', label: 'Refunded', color: '#F59E0B' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Investment Portfolio',
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
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: '#10B98120' }]}>
                <PieChart size={24} color="#10B981" />
              </View>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Portfolio Summary</Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Invested</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  ${portfolioSummary.totalInvested.toLocaleString()}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Returns</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  ${portfolioSummary.totalReturned.toLocaleString()}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Profit/Loss</Text>
                <View style={styles.profitContainer}>
                  {portfolioSummary.totalProfit >= 0 ? (
                    <TrendingUp size={16} color="#10B981" />
                  ) : (
                    <TrendingDown size={16} color="#EF4444" />
                  )}
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: portfolioSummary.totalProfit >= 0 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {portfolioSummary.totalProfit >= 0 ? '+' : ''}$
                    {portfolioSummary.totalProfit.toLocaleString()}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Overall ROI</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: portfolioSummary.overallRoi >= 0 ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {portfolioSummary.overallRoi >= 0 ? '+' : ''}
                  {portfolioSummary.overallRoi.toFixed(1)}%
                </Text>
              </View>
            </View>

            <View style={[styles.investmentCounts, { borderTopColor: colors.border }]}>
              <View style={styles.countItem}>
                <View style={[styles.countBadge, { backgroundColor: '#22C55E20' }]}>
                  <Text style={[styles.countNumber, { color: '#22C55E' }]}>{portfolioSummary.activeCount}</Text>
                </View>
                <Text style={[styles.countLabel, { color: colors.textSecondary }]}>Active</Text>
              </View>
              <View style={styles.countItem}>
                <View style={[styles.countBadge, { backgroundColor: '#3B82F620' }]}>
                  <Text style={[styles.countNumber, { color: '#3B82F6' }]}>{portfolioSummary.completedCount}</Text>
                </View>
                <Text style={[styles.countLabel, { color: colors.textSecondary }]}>Completed</Text>
              </View>
            </View>
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowFilterModal(true)}
            >
              <Filter size={16} color={colors.textSecondary} />
              <Text style={[styles.filterButtonText, { color: colors.text }]}>
                {statusFilter === 'all' ? 'Status' : statusOptions.find((s) => s.id === statusFilter)?.label}
              </Text>
              <ChevronDown size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowSortModal(true)}
            >
              <BarChart3 size={16} color={colors.textSecondary} />
              <Text style={[styles.filterButtonText, { color: colors.text }]}>
                {sortOptions.find((s) => s.id === sortBy)?.label || 'Sort'}
              </Text>
              <ChevronDown size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
              {filteredInvestments.length} investment{filteredInvestments.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
              <RefreshCw size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.investmentsList}>
            {filteredInvestments.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                <Briefcase size={48} color={colors.textLight} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Investments Found</Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  {statusFilter !== 'all'
                    ? 'Try adjusting your filters.'
                    : 'Start investing in business pools to build your portfolio.'}
                </Text>
                <TouchableOpacity
                  style={[styles.exploreButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/game/investment-pools' as any)}
                >
                  <Text style={styles.exploreButtonText}>Explore Investment Pools</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredInvestments.map((investment) => (
                <InvestmentCard
                  key={investment.id}
                  investment={investment}
                  onPress={() => handleInvestmentPress(investment)}
                />
              ))
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        <Modal visible={showFilterModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Status</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.modalOption,
                    statusFilter === option.id && { backgroundColor: option.color + '20' },
                  ]}
                  onPress={() => {
                    setStatusFilter(option.id);
                    setShowFilterModal(false);
                  }}
                >
                  <View style={[styles.statusIndicator, { backgroundColor: option.color }]} />
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{option.label}</Text>
                  {statusFilter === option.id && <CheckCircle size={20} color={option.color} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        <Modal visible={showSortModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Sort By</Text>
                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.modalOption,
                    sortBy === option.id && { backgroundColor: colors.primary + '20' },
                  ]}
                  onPress={() => {
                    setSortBy(option.id);
                    setShowSortModal(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{option.label}</Text>
                  {sortBy === option.id && <CheckCircle size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        <Modal visible={showDetailModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.detailModalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Investment Details</Text>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {selectedInvestment && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={[styles.detailBusinessName, { color: colors.text }]}>
                    {selectedInvestment.businessName}
                  </Text>
                  <Text style={[styles.detailPoolName, { color: colors.textSecondary }]}>
                    {selectedInvestment.poolName}
                  </Text>
                  <View style={[styles.detailTypeBadge, { backgroundColor: '#3B82F620' }]}>
                    <Text style={[styles.detailTypeText, { color: '#3B82F6' }]}>
                      {selectedInvestment.businessType}
                    </Text>
                  </View>

                  <View style={[styles.detailStatsGrid, { backgroundColor: colors.surfaceAlt }]}>
                    <View style={styles.detailStatItem}>
                      <DollarSign size={18} color="#10B981" />
                      <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Invested</Text>
                      <Text style={[styles.detailStatValue, { color: colors.text }]}>
                        ${selectedInvestment.contributionAmount.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.detailStatItem}>
                      <Percent size={18} color="#3B82F6" />
                      <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Ownership</Text>
                      <Text style={[styles.detailStatValue, { color: colors.text }]}>
                        {selectedInvestment.ownershipPercentage.toFixed(2)}%
                      </Text>
                    </View>
                    <View style={styles.detailStatItem}>
                      <TrendingUp size={18} color="#F59E0B" />
                      <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Expected ROI</Text>
                      <Text style={[styles.detailStatValue, { color: colors.text }]}>
                        {selectedInvestment.expectedRoiPercentage}%
                      </Text>
                    </View>
                    <View style={styles.detailStatItem}>
                      <Clock size={18} color="#8B5CF6" />
                      <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Invested</Text>
                      <Text style={[styles.detailStatValue, { color: colors.text }]}>
                        {new Date(selectedInvestment.contributionDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.returnsCard, { backgroundColor: '#10B98110' }]}>
                    <Text style={[styles.returnsTitle, { color: '#10B981' }]}>Returns Summary</Text>
                    <View style={styles.returnsRow}>
                      <Text style={[styles.returnsLabel, { color: colors.textSecondary }]}>Current Return</Text>
                      <Text style={[styles.returnsValue, { color: colors.text }]}>
                        ${selectedInvestment.totalReturnReceived.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.returnsRow}>
                      <Text style={[styles.returnsLabel, { color: colors.textSecondary }]}>Profit/Loss</Text>
                      <Text
                        style={[
                          styles.returnsValue,
                          {
                            color:
                              selectedInvestment.totalReturnReceived >= selectedInvestment.contributionAmount
                                ? '#10B981'
                                : '#EF4444',
                          },
                        ]}
                      >
                        {selectedInvestment.totalReturnReceived >= selectedInvestment.contributionAmount ? '+' : ''}$
                        {(selectedInvestment.totalReturnReceived - selectedInvestment.contributionAmount).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.returnsRow}>
                      <Text style={[styles.returnsLabel, { color: colors.textSecondary }]}>ROI Achieved</Text>
                      <Text
                        style={[
                          styles.returnsValue,
                          {
                            color:
                              selectedInvestment.totalReturnReceived >= selectedInvestment.contributionAmount
                                ? '#10B981'
                                : '#EF4444',
                          },
                        ]}
                      >
                        {(
                          ((selectedInvestment.totalReturnReceived - selectedInvestment.contributionAmount) /
                            selectedInvestment.contributionAmount) *
                          100
                        ).toFixed(1)}
                        %
                      </Text>
                    </View>
                    <View style={styles.returnsRow}>
                      <Text style={[styles.returnsLabel, { color: colors.textSecondary }]}>Est. Full Return</Text>
                      <Text style={[styles.returnsValue, { color: '#10B981' }]}>
                        $
                        {(
                          selectedInvestment.contributionAmount *
                          (1 + selectedInvestment.expectedRoiPercentage / 100)
                        ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressSection}>
                    <Text style={[styles.progressSectionTitle, { color: colors.text }]}>Pool Funding Progress</Text>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceAlt }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            backgroundColor: selectedInvestment.fundingProgress >= 100 ? '#10B981' : '#3B82F6',
                            width: `${Math.min(selectedInvestment.fundingProgress, 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                      {selectedInvestment.fundingProgress.toFixed(1)}% funded
                    </Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
                      onPress={handleViewBusiness}
                    >
                      <Eye size={18} color={colors.text} />
                      <Text style={[styles.actionButtonText, { color: colors.text }]}>View Pool</Text>
                    </TouchableOpacity>

                    {selectedInvestment.status === 'active' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.withdrawButton]}
                        onPress={handleWithdraw}
                      >
                        <LogOut size={18} color="#FFF" />
                        <Text style={styles.withdrawButtonText}>Withdraw</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.detailBottomPadding} />
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  investmentCounts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  countItem: {
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  countLabel: {
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 13,
  },
  refreshButton: {
    padding: 4,
  },
  investmentsList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  investmentCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  poolName: {
    fontSize: 13,
    marginBottom: 16,
  },
  investmentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 6,
  },
  profitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  profitSpacer: {
    flex: 1,
  },
  expectedRoi: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyState: {
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
  },
  exploreButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  detailModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  detailBusinessName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailPoolName: {
    fontSize: 14,
    marginBottom: 12,
  },
  detailTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
  },
  detailTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailStatItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  detailStatLabel: {
    fontSize: 12,
  },
  detailStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  returnsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  returnsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  returnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  returnsLabel: {
    fontSize: 14,
  },
  returnsValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  withdrawButton: {
    backgroundColor: '#EF4444',
  },
  withdrawButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  detailBottomPadding: {
    height: 20,
  },
});
