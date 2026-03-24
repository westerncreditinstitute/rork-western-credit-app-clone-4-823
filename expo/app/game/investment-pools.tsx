import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  Filter,
  Search,
  ChevronDown,
  X,
  AlertCircle,
  CheckCircle,
  Target,
  Percent,
  ArrowRight,
  Shield,
  Zap,
  RefreshCw,
} from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { InvestmentPoolData } from '@/types/business';
import { formatCurrency } from '@/mocks/businessCategories';
import * as Haptics from 'expo-haptics';

type SortOption = 'newest' | 'highest_roi' | 'lowest_risk' | 'most_funded' | 'deadline';
type RiskFilter = 'all' | 'low' | 'medium' | 'high';

interface PoolCardProps {
  pool: InvestmentPoolData;
  onPress: () => void;
}

const PoolCard = ({ pool, onPress }: PoolCardProps) => {
  const { colors } = useTheme();
  const fundingPercentage = pool.fundingGoal > 0 
    ? (pool.currentAmount / pool.fundingGoal) * 100 
    : 100;
  const daysRemaining = Math.max(0, Math.ceil((new Date(pool.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const isOpen = pool.status === 'open' && daysRemaining > 0;

  const getRiskColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'low': return '#22C55E';
      case 'medium': return '#F59E0B';
      case 'high': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getRiskLabel = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'low': return 'Low Risk';
      case 'medium': return 'Medium Risk';
      case 'high': return 'High Risk';
      default: return 'Unknown';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.poolCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.poolCardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: isOpen ? '#10B98120' : '#6B728020' }]}>
          <View style={[styles.statusDot, { backgroundColor: isOpen ? '#10B981' : '#6B7280' }]} />
          <Text style={[styles.statusText, { color: isOpen ? '#10B981' : '#6B7280' }]}>
            {isOpen ? 'Open' : pool.status === 'funded' ? 'Funded' : 'Closed'}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(pool.riskLevel) + '20' }]}>
          <Shield size={12} color={getRiskColor(pool.riskLevel)} />
          <Text style={[styles.riskText, { color: getRiskColor(pool.riskLevel) }]}>
            {getRiskLabel(pool.riskLevel)}
          </Text>
        </View>
      </View>

      <Text style={[styles.poolName, { color: colors.text }]} numberOfLines={1}>
        {pool.poolName}
      </Text>
      <Text style={[styles.poolCreator, { color: colors.textSecondary }]}>
        Investment Pool
      </Text>

      <Text style={[styles.poolDescription, { color: colors.textLight }]} numberOfLines={2}>
        {pool.description}
      </Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Funding Progress</Text>
          <Text style={[styles.progressValue, { color: colors.text }]}>
            {fundingPercentage.toFixed(0)}%
          </Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: fundingPercentage >= 100 ? '#10B981' : '#3B82F6',
                width: `${Math.min(fundingPercentage, 100)}%`,
              },
            ]}
          />
        </View>
        <View style={styles.progressStats}>
          <Text style={[styles.progressAmount, { color: colors.text }]}>
            {formatCurrency(pool.currentAmount)}
          </Text>
          <Text style={[styles.progressTarget, { color: colors.textSecondary }]}>
            of {formatCurrency(pool.fundingGoal)}
          </Text>
        </View>
      </View>

      <View style={styles.poolStats}>
        <View style={styles.poolStatItem}>
          <Percent size={14} color="#10B981" />
          <Text style={[styles.poolStatValue, { color: colors.text }]}>
            {pool.expectedRoiPercentage}% ROI
          </Text>
        </View>
        <View style={styles.poolStatItem}>
          <Users size={14} color="#3B82F6" />
          <Text style={[styles.poolStatValue, { color: colors.text }]}>
            {pool.currentInvestorCount || 0} investors
          </Text>
        </View>
        <View style={styles.poolStatItem}>
          <Clock size={14} color={daysRemaining <= 7 ? '#EF4444' : '#F59E0B'} />
          <Text style={[styles.poolStatValue, { color: daysRemaining <= 7 ? '#EF4444' : colors.text }]}>
            {daysRemaining}d left
          </Text>
        </View>
      </View>

      <View style={styles.poolCardFooter}>
        <View>
          <Text style={[styles.minInvestLabel, { color: colors.textSecondary }]}>Min Investment</Text>
          <Text style={[styles.minInvestValue, { color: colors.text }]}>
            {formatCurrency(pool.minInvestment)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.viewButton, { backgroundColor: isOpen ? colors.primary : colors.surfaceAlt }]}
          onPress={onPress}
        >
          <Text style={[styles.viewButtonText, { color: isOpen ? '#FFF' : colors.textSecondary }]}>
            {isOpen ? 'View Details' : 'View'}
          </Text>
          <ArrowRight size={14} color={isOpen ? '#FFF' : colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function InvestmentPoolsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const { gameState, updateBalance } = useGame();
  const { 
    getOpenPools,
    getUserContributions,
    contributeToPool,
    refreshPools
  } = useBusiness();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<RiskFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showOpenOnly, setShowOpenOnly] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState<InvestmentPoolData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const availableFunds = (gameState.bankBalance || 0) + (gameState.savingsBalance || 0);
  const userId = auth?.user?.id;

  // Load pools from database
  useEffect(() => {
    loadPools();
  }, []);

  const loadPools = async () => {
    setIsLoading(true);
    try {
      if (userId) {
        await refreshPools();
      }
    } catch (error) {
      console.error('[InvestmentPools] Error loading pools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get pools from business context
  const allPools = getOpenPools();
  
  const filteredPools = useMemo(() => {
    let pools = [...allPools];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      pools = pools.filter(
        (pool) =>
          pool.poolName.toLowerCase().includes(query) ||
          pool.description.toLowerCase().includes(query)
      );
    }

    if (selectedRisk !== 'all') {
      pools = pools.filter((pool) => pool.riskLevel === selectedRisk);
    }

    if (showOpenOnly) {
      pools = pools.filter((pool) => {
        const daysRemaining = Math.ceil((new Date(pool.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return pool.status === 'open' && daysRemaining > 0;
      });
    }

    switch (sortBy) {
      case 'newest':
        pools.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'highest_roi':
        pools.sort((a, b) => b.expectedRoiPercentage - a.expectedRoiPercentage);
        break;
      case 'lowest_risk':
        pools.sort((a, b) => {
          const riskOrder = { low: 0, medium: 1, high: 2 };
          return riskOrder[a.riskLevel as keyof typeof riskOrder] - riskOrder[b.riskLevel as keyof typeof riskOrder];
        });
        break;
      case 'most_funded':
        pools.sort((a, b) => {
          const progressA = a.fundingGoal > 0 ? (a.currentAmount / a.fundingGoal) : 0;
          const progressB = b.fundingGoal > 0 ? (b.currentAmount / b.fundingGoal) : 0;
          return progressB - progressA;
        });
        break;
      case 'deadline':
        pools.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        break;
    }

    return pools;
  }, [allPools, searchQuery, selectedRisk, sortBy, showOpenOnly]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPools();
    setIsRefreshing(false);
  }, []);

  const handlePoolPress = useCallback((pool: InvestmentPoolData) => {
    setSelectedPool(pool);
    setInvestmentAmount(pool.minInvestment.toString());
    setShowDetailModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleInvest = useCallback(async () => {
    if (!selectedPool || !userId) return;

    const amount = parseFloat(investmentAmount.replace(/,/g, ''));
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid investment amount.');
      return;
    }

    if (amount < selectedPool.minInvestment) {
      Alert.alert('Minimum Not Met', `Minimum investment is ${formatCurrency(selectedPool.minInvestment)}`);
      return;
    }

    if (amount > availableFunds) {
      Alert.alert('Insufficient Funds', `You only have ${formatCurrency(availableFunds)} available.`);
      return;
    }

    try {
      const result = await contributeToPool(selectedPool.id, amount, userId!);
      
      if (result.success) {
        // Deduct funds
        if (amount <= gameState.bankBalance) {
          updateBalance(-amount, 'bank');
        } else {
          const fromBank = gameState.bankBalance;
          const fromSavings = amount - fromBank;
          updateBalance(-fromBank, 'bank');
          updateBalance(-fromSavings, 'savings');
        }

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        Alert.alert(
          'Investment Successful',
          `You have invested ${formatCurrency(amount)} in ${selectedPool.poolName}!\n\nExpected Return: ${formatCurrency(amount * (1 + selectedPool.expectedRoiPercentage / 100))}`,
          [
            {
              text: 'View Portfolio',
              onPress: () => {
                setShowDetailModal(false);
                setSelectedPool(null);
                router.push('/game/business-dashboard' as any);
              },
            },
            {
              text: 'Done',
              onPress: () => {
                setShowDetailModal(false);
                setSelectedPool(null);
              },
            },
          ]
        );
      } else {
        Alert.alert('Investment Failed', result.error || 'Failed to complete investment');
      }
    } catch (error) {
      console.error('[InvestmentPools] Error investing:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  }, [selectedPool, investmentAmount, availableFunds, userId, gameState, updateBalance, router, contributeToPool]);

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: 'newest', label: 'Newest First' },
    { id: 'highest_roi', label: 'Highest ROI' },
    { id: 'lowest_risk', label: 'Lowest Risk' },
    { id: 'most_funded', label: 'Most Funded' },
    { id: 'deadline', label: 'Deadline Soon' },
  ];

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Investment Pools',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading investment pools...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Investment Pools',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerStat}>
              <Text style={[styles.headerStatLabel, { color: colors.textSecondary }]}>Available to Invest</Text>
              <Text style={[styles.headerStatValue, { color: '#10B981' }]}>
                {formatCurrency(availableFunds)}
              </Text>
            </View>
            <View style={styles.headerDivider} />
            <View style={styles.headerStat}>
              <Text style={[styles.headerStatLabel, { color: colors.textSecondary }]}>Open Pools</Text>
              <Text style={[styles.headerStatValue, { color: colors.text }]}>
                {filteredPools.length}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchInput, { backgroundColor: colors.surface }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchTextInput, { color: colors.text }]}
              placeholder="Search pools..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterButton, showOpenOnly && { backgroundColor: colors.primary + '20' }]}
            onPress={() => setShowOpenOnly(!showOpenOnly)}
          >
            <CheckCircle size={16} color={showOpenOnly ? colors.primary : colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: showOpenOnly ? colors.primary : colors.textSecondary }]}>
              Open Only
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowSortModal(true)}
          >
            <Filter size={16} color={colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: colors.text }]}>
              {sortOptions.find(opt => opt.id === sortBy)?.label || 'Sort'}
            </Text>
            <ChevronDown size={14} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Shield size={16} color={colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: colors.text }]}>
              {selectedRisk === 'all' ? 'All Risks' : `${selectedRisk.charAt(0).toUpperCase() + selectedRisk.slice(1)} Risk`}
            </Text>
            <ChevronDown size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {filteredPools.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <AlertCircle size={48} color={colors.textLight} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Pools Found</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                {searchQuery || selectedRisk !== 'all' || showOpenOnly
                  ? 'Try adjusting your filters or search terms.'
                  : 'No investment pools are currently available.'}
              </Text>
            </View>
          ) : (
            <View style={styles.poolsList}>
              {filteredPools.map((pool) => (
                <PoolCard
                  key={pool.id}
                  pool={pool}
                  onPress={() => handlePoolPress(pool)}
                />
              ))}
            </View>
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Detail Modal */}
        <Modal visible={showDetailModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.detailModal, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Investment Details</Text>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedPool && (
                  <>
                    <View style={[styles.detailBanner, { backgroundColor: colors.primary + '15' }]}>
                      <View style={[styles.detailIcon, { backgroundColor: colors.primary + '25' }]}>
                        <Target size={32} color={colors.primary} />
                      </View>
                      <View style={styles.detailBannerInfo}>
                        <Text style={[styles.detailPoolName, { color: colors.text }]} numberOfLines={2}>
                          {selectedPool.poolName}
                        </Text>
                        <Text style={[styles.detailPoolDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {selectedPool.description}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailStats}>
                      <View style={styles.detailStat}>
                        <Percent size={18} color="#10B981" />
                        <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Expected ROI</Text>
                        <Text style={[styles.detailStatValue, { color: '#10B981' }]}>
                          {selectedPool.expectedRoiPercentage}%
                        </Text>
                      </View>
                      <View style={styles.detailStat}>
                        <Clock size={18} color="#F59E0B" />
                        <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Break Even</Text>
                        <Text style={[styles.detailStatValue, { color: colors.text }]}>
                          {selectedPool.estimatedBreakEvenMonths} months
                        </Text>
                      </View>
                      <View style={styles.detailStat}>
                        <Shield size={18} color="#EF4444" />
                        <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Risk Level</Text>
                        <Text style={[styles.detailStatValue, { color: colors.text }]}>
                          {selectedPool.riskLevel.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Investment Amount</Text>
                      <View style={[styles.detailInput, { backgroundColor: colors.surfaceAlt }]}>
                        <DollarSign size={18} color={colors.textSecondary} />
                        <TextInput
                          style={[styles.detailTextInput, { color: colors.text }]}
                          placeholder="Enter amount"
                          placeholderTextColor={colors.textLight}
                          value={investmentAmount}
                          onChangeText={(text) => setInvestmentAmount(text.replace(/[^0-9]/g, ''))}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.detailHints}>
                        <Text style={[styles.detailHint, { color: colors.textSecondary }]}>
                          Min: {formatCurrency(selectedPool.minInvestment)}
                        </Text>
                        <Text style={[styles.detailHint, { color: colors.textSecondary }]}>
                          Available: {formatCurrency(availableFunds)}
                        </Text>
                      </View>
                    </View>

                    {selectedPool.businessPlan && (
                      <View style={styles.detailSection}>
                        <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Business Plan</Text>
                        <View style={[styles.detailPlan, { backgroundColor: colors.surfaceAlt }]}>
                          <Text style={[styles.detailPlanText, { color: colors.text }]}>
                            {selectedPool.businessPlan}
                          </Text>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.investButton, { backgroundColor: colors.primary }]}
                      onPress={handleInvest}
                    >
                      <Target size={18} color="#FFF" />
                      <Text style={styles.investButtonText}>Invest Now</Text>
                    </TouchableOpacity>
                  </>
                )}
                <View style={styles.modalBottomPadding} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Filter Modal */}
        <Modal visible={showFilterModal} animationType="fade" transparent>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          >
            <View style={[styles.filterModal, { backgroundColor: colors.surface }]}>
              <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filter by Risk</Text>
              {(['all', 'low', 'medium', 'high'] as RiskFilter[]).map((risk) => (
                <TouchableOpacity
                  key={risk}
                  style={[
                    styles.filterOption,
                    selectedRisk === risk && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setSelectedRisk(risk);
                    setShowFilterModal(false);
                  }}
                >
                  <CheckCircle
                    size={18}
                    color={selectedRisk === risk ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[
                    styles.filterOptionText,
                    { color: selectedRisk === risk ? colors.primary : colors.text }
                  ]}>
                    {risk === 'all' ? 'All Risks' : `${risk.charAt(0).toUpperCase() + risk.slice(1)} Risk`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Sort Modal */}
        <Modal visible={showSortModal} animationType="fade" transparent>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}
          >
            <View style={[styles.filterModal, { backgroundColor: colors.surface }]}>
              <Text style={[styles.filterModalTitle, { color: colors.text }]}>Sort By</Text>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.filterOption,
                    sortBy === option.id && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setSortBy(option.id);
                    setShowSortModal(false);
                  }}
                >
                  <CheckCircle
                    size={18}
                    color={sortBy === option.id ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[
                    styles.filterOptionText,
                    { color: sortBy === option.id ? colors.primary : colors.text }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  headerCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerStat: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 15,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  poolsList: {
    gap: 12,
  },
  poolCard: {
    padding: 16,
    borderRadius: 16,
  },
  poolCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
  },
  poolName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  poolCreator: {
    fontSize: 13,
    marginBottom: 8,
  },
  poolDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
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
  progressStats: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  progressAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressTarget: {
    fontSize: 14,
  },
  poolStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB20',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB20',
    marginBottom: 12,
  },
  poolStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  poolStatValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  poolCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minInvestLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  minInvestValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
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
  detailBanner: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 20,
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBannerInfo: {
    flex: 1,
  },
  detailPoolName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailPoolDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  detailStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F620',
  },
  detailStatLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  detailStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  detailTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  detailHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  detailHint: {
    fontSize: 12,
  },
  detailPlan: {
    padding: 16,
    borderRadius: 12,
    minHeight: 100,
  },
  detailPlanText: {
    fontSize: 14,
    lineHeight: 20,
  },
  investButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  investButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  modalBottomPadding: {
    height: 40,
  },
  filterModal: {
    marginHorizontal: 40,
    marginVertical: 100,
    padding: 20,
    borderRadius: 20,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 8,
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
});