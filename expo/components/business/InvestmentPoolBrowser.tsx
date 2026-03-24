import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Search,
  Filter,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  ChevronRight,
  Target,
  Building2,
  Percent,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  InvestmentPoolData,
  formatCurrency,
  formatRiskLevel,
  getRiskLevelColor,
  getPoolFundingPercentage,
  isPoolOpen,
  RiskLevel,
} from '@/types/business';
import { Card, Button, Badge, ProgressBar } from '@/components/ui';

interface InvestmentPoolBrowserProps {
  visible: boolean;
  onClose: () => void;
  availableFunds?: number;
}

type SortOption = 'newest' | 'funding' | 'roi' | 'deadline';
type FilterRisk = 'all' | RiskLevel;

export default function InvestmentPoolBrowser({
  visible,
  onClose,
  availableFunds = 50000,
}: InvestmentPoolBrowserProps) {
  const { colors } = useTheme();
  const { getOpenPools, contributeToPool } = useBusiness();
  const auth = useAuth();
  const userId = auth?.user?.id || 'anonymous';

  const [pools, setPools] = useState<InvestmentPoolData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterRisk, setFilterRisk] = useState<FilterRisk>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedPool, setSelectedPool] = useState<InvestmentPoolData | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [isInvesting, setIsInvesting] = useState(false);

  const loadPools = useCallback(async () => {
    setIsLoading(true);
    try {
      const openPools = getOpenPools();
      setPools(openPools);
      console.log('[InvestmentPoolBrowser] Loaded', openPools.length, 'pools');
    } catch (error) {
      console.error('[InvestmentPoolBrowser] Error loading pools:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getOpenPools]);

  useEffect(() => {
    if (visible) {
      loadPools();
    }
  }, [visible, loadPools]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPools();
    setRefreshing(false);
  }, [loadPools]);

  const filteredAndSortedPools = useMemo(() => {
    let result = [...pools];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (pool) =>
          pool.poolName.toLowerCase().includes(query) ||
          pool.description.toLowerCase().includes(query)
      );
    }

    if (filterRisk !== 'all') {
      result = result.filter((pool) => pool.riskLevel === filterRisk);
    }

    switch (sortBy) {
      case 'funding':
        result.sort((a, b) => getPoolFundingPercentage(b) - getPoolFundingPercentage(a));
        break;
      case 'roi':
        result.sort((a, b) => b.expectedRoiPercentage - a.expectedRoiPercentage);
        break;
      case 'deadline':
        result.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        break;
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [pools, searchQuery, sortBy, filterRisk]);

  const handleInvest = useCallback(async () => {
    if (!selectedPool || isInvesting) return;

    const amount = parseFloat(investAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid investment amount.');
      return;
    }

    if (amount < selectedPool.minInvestment) {
      Alert.alert('Minimum Investment', `The minimum investment is ${formatCurrency(selectedPool.minInvestment)}.`);
      return;
    }

    if (amount > availableFunds) {
      Alert.alert('Insufficient Funds', 'You do not have enough available funds.');
      return;
    }

    setIsInvesting(true);
    try {
      const result = contributeToPool(selectedPool.id, amount, userId);
      
      if (result.success) {
        Alert.alert(
          'Investment Successful!',
          `You have invested ${formatCurrency(amount)} in ${selectedPool.poolName}.`
        );
        setSelectedPool(null);
        setInvestAmount('');
        await loadPools();
      } else {
        Alert.alert('Investment Failed', result.error || 'An error occurred.');
      }
    } catch (error) {
      console.error('[InvestmentPoolBrowser] Investment error:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsInvesting(false);
    }
  }, [selectedPool, investAmount, availableFunds, userId, contributeToPool, loadPools, isInvesting]);

  const getDaysRemaining = (deadline: string): number => {
    const now = new Date();
    const end = new Date(deadline);
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const styles = createStyles(colors);

  const renderPoolCard = (pool: InvestmentPoolData) => {
    const fundingProgress = getPoolFundingPercentage(pool);
    const daysRemaining = getDaysRemaining(pool.deadline);
    const isOpen = isPoolOpen(pool);

    return (
      <TouchableOpacity
        key={pool.id}
        style={styles.poolCard}
        onPress={() => {
          setSelectedPool(pool);
          setInvestAmount(pool.minInvestment.toString());
        }}
        activeOpacity={0.7}
      >
        <View style={styles.poolHeader}>
          <View style={[styles.poolIcon, { backgroundColor: colors.primary + '20' }]}>
            <Building2 size={24} color={colors.primary} />
          </View>
          <View style={styles.poolInfo}>
            <Text style={styles.poolName} numberOfLines={1}>{pool.poolName}</Text>
            <View style={styles.poolMeta}>
              <View style={[styles.riskBadge, { backgroundColor: getRiskLevelColor(pool.riskLevel) + '20' }]}>
                <Text style={[styles.riskBadgeText, { color: getRiskLevelColor(pool.riskLevel) }]}>
                  {formatRiskLevel(pool.riskLevel)}
                </Text>
              </View>
              {!isOpen && (
                <Badge text="Closed" variant="error" size="sm" />
              )}
            </View>
          </View>
          <View style={styles.roiBadge}>
            <Percent size={12} color={colors.success} />
            <Text style={styles.roiText}>{pool.expectedRoiPercentage}%</Text>
          </View>
        </View>

        <Text style={styles.poolDescription} numberOfLines={2}>{pool.description}</Text>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Funding Progress</Text>
            <Text style={styles.progressValue}>{fundingProgress.toFixed(0)}%</Text>
          </View>
          <ProgressBar progress={fundingProgress} height={8} variant="default" />
          <Text style={styles.progressAmount}>
            {formatCurrency(pool.currentAmount)} of {formatCurrency(pool.fundingGoal)}
          </Text>
        </View>

        <View style={styles.poolStats}>
          <View style={styles.poolStat}>
            <DollarSign size={14} color={colors.textSecondary} />
            <Text style={styles.poolStatText}>Min: {formatCurrency(pool.minInvestment)}</Text>
          </View>
          <View style={styles.poolStat}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={styles.poolStatText}>{pool.currentInvestorCount}/{pool.maxInvestors}</Text>
          </View>
          <View style={styles.poolStat}>
            <Clock size={14} color={daysRemaining < 7 ? colors.warning : colors.textSecondary} />
            <Text style={[styles.poolStatText, daysRemaining < 7 && { color: colors.warning }]}>
              {daysRemaining}d left
            </Text>
          </View>
        </View>

        <View style={styles.investButton}>
          <Text style={styles.investButtonText}>View Details</Text>
          <ChevronRight size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderInvestModal = () => {
    if (!selectedPool) return null;

    const fundingProgress = getPoolFundingPercentage(selectedPool);
    const daysRemaining = getDaysRemaining(selectedPool.deadline);
    const amount = parseFloat(investAmount.replace(/,/g, '')) || 0;
    const ownershipPercentage = selectedPool.fundingGoal > 0 ? (amount / selectedPool.fundingGoal) * 100 : 0;

    return (
      <Modal
        visible={!!selectedPool}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedPool(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Investment Details</Text>
              <TouchableOpacity onPress={() => setSelectedPool(null)}>
                <X size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Card variant="elevated" padding="lg" style={styles.poolDetailCard}>
                <View style={styles.poolDetailHeader}>
                  <View style={[styles.poolDetailIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Building2 size={32} color={colors.primary} />
                  </View>
                  <View style={styles.poolDetailInfo}>
                    <Text style={styles.poolDetailName}>{selectedPool.poolName}</Text>
                    <View style={[styles.riskBadge, { backgroundColor: getRiskLevelColor(selectedPool.riskLevel) + '20' }]}>
                      <Text style={[styles.riskBadgeText, { color: getRiskLevelColor(selectedPool.riskLevel) }]}>
                        {formatRiskLevel(selectedPool.riskLevel)}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.poolDetailDescription}>{selectedPool.description}</Text>

                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Funding Progress</Text>
                    <Text style={styles.progressValue}>{fundingProgress.toFixed(1)}%</Text>
                  </View>
                  <ProgressBar progress={fundingProgress} height={10} variant="default" />
                  <Text style={styles.progressAmount}>
                    {formatCurrency(selectedPool.currentAmount)} of {formatCurrency(selectedPool.fundingGoal)}
                  </Text>
                </View>
              </Card>

              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.success + '10' }]}>
                  <TrendingUp size={20} color={colors.success} />
                  <Text style={styles.statValue}>{selectedPool.expectedRoiPercentage}%</Text>
                  <Text style={styles.statLabel}>Expected ROI</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.info + '10' }]}>
                  <Clock size={20} color={colors.info} />
                  <Text style={styles.statValue}>{selectedPool.estimatedBreakEvenMonths}mo</Text>
                  <Text style={styles.statLabel}>Break-even</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.warning + '10' }]}>
                  <Calendar size={20} color={colors.warning} />
                  <Text style={styles.statValue}>{daysRemaining}d</Text>
                  <Text style={styles.statLabel}>Time Left</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.primary + '10' }]}>
                  <Users size={20} color={colors.primary} />
                  <Text style={styles.statValue}>{selectedPool.currentInvestorCount}/{selectedPool.maxInvestors}</Text>
                  <Text style={styles.statLabel}>Investors</Text>
                </View>
              </View>

              <View style={styles.investSection}>
                <Text style={styles.investSectionTitle}>Investment Amount</Text>
                
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Your Available Funds</Text>
                  <Text style={styles.balanceValue}>{formatCurrency(availableFunds)}</Text>
                </View>

                <View style={styles.amountInputContainer}>
                  <DollarSign size={20} color={colors.textSecondary} />
                  <TextInput
                    style={styles.amountInput}
                    value={investAmount}
                    onChangeText={(text) => setInvestAmount(text.replace(/[^0-9]/g, ''))}
                    placeholder="Enter amount"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                  />
                </View>
                <Text style={styles.minInvestText}>
                  Minimum: {formatCurrency(selectedPool.minInvestment)}
                </Text>

                {amount > 0 && (
                  <View style={styles.ownershipPreview}>
                    <Target size={16} color={colors.primary} />
                    <Text style={styles.ownershipText}>
                      You will own approximately <Text style={styles.ownershipValue}>{ownershipPercentage.toFixed(2)}%</Text> of this business
                    </Text>
                  </View>
                )}

                {amount > availableFunds && (
                  <View style={styles.warningBox}>
                    <AlertTriangle size={16} color={colors.error} />
                    <Text style={styles.warningText}>Insufficient funds</Text>
                  </View>
                )}
              </View>

              {selectedPool.businessPlan && (
                <View style={styles.businessPlanSection}>
                  <Text style={styles.businessPlanTitle}>Business Plan</Text>
                  <Text style={styles.businessPlanText}>{selectedPool.businessPlan}</Text>
                </View>
              )}

              <View style={styles.disclaimerBox}>
                <AlertTriangle size={16} color={colors.warning} />
                <Text style={styles.disclaimerText}>
                  Investing in businesses carries risk. You may lose some or all of your investment. Past performance does not guarantee future results.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title={isInvesting ? 'Processing...' : `Invest ${formatCurrency(amount)}`}
                onPress={handleInvest}
                variant="primary"
                size="lg"
                fullWidth
                loading={isInvesting}
                disabled={isInvesting || amount < selectedPool.minInvestment || amount > availableFunds}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Investment Pools</Text>
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterButton}>
            <Filter size={22} color={showFilters ? colors.primary : colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search investment pools..."
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        {showFilters && (
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
              <Text style={styles.filterLabel}>Sort:</Text>
              {(['newest', 'funding', 'roi', 'deadline'] as SortOption[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterChip, sortBy === option && styles.filterChipActive]}
                  onPress={() => setSortBy(option)}
                >
                  <Text style={[styles.filterChipText, sortBy === option && styles.filterChipTextActive]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
              <Text style={styles.filterLabel}>Risk:</Text>
              {(['all', 'low', 'medium', 'high', 'very_high'] as FilterRisk[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterChip, filterRisk === option && styles.filterChipActive]}
                  onPress={() => setFilterRisk(option)}
                >
                  <Text style={[styles.filterChipText, filterRisk === option && styles.filterChipTextActive]}>
                    {option === 'all' ? 'All' : formatRiskLevel(option as RiskLevel)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading pools...</Text>
            </View>
          ) : filteredAndSortedPools.length === 0 ? (
            <View style={styles.emptyState}>
              <Building2 size={48} color={colors.textLight} />
              <Text style={styles.emptyStateTitle}>No Investment Pools</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery || filterRisk !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No open investment pools available at this time.'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultsCount}>
                {filteredAndSortedPools.length} pool{filteredAndSortedPools.length !== 1 ? 's' : ''} available
              </Text>
              {filteredAndSortedPools.map(renderPoolCard)}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {renderInvestModal()}
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
  },
  filtersContainer: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginRight: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  resultsCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  poolCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  poolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  poolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolInfo: {
    flex: 1,
    marginLeft: 12,
  },
  poolName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  poolMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  roiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  roiText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.success,
  },
  poolDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressSection: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text,
  },
  progressAmount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  poolStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  poolStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poolStatText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  investButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  investButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  poolDetailCard: {
    marginBottom: 16,
  },
  poolDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  poolDetailIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolDetailInfo: {
    flex: 1,
    marginLeft: 14,
  },
  poolDetailName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 6,
  },
  poolDetailDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  investSection: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  investSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    paddingVertical: 14,
  },
  minInvestText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  ownershipPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  ownershipText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  ownershipValue: {
    fontWeight: '700' as const,
    color: colors.primary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '15',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  warningText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500' as const,
  },
  businessPlanSection: {
    marginBottom: 16,
  },
  businessPlanTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
  },
  businessPlanText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '10',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
