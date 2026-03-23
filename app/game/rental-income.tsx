import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  RefreshCw,
  Home,
  Building2,
  CheckCircle,
  AlertCircle,
  PieChart,
  Percent,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { PropertyService, PropertyData } from '@/services/PropertyService';
import { RentalIncomeService } from '@/services/RentalIncomeService';
import * as Haptics from 'expo-haptics';

const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
};

export default function RentalIncomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const auth = useAuth();

  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [rentalSummary, setRentalSummary] = useState<any>(null);

  const userId = auth?.user?.id;

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const [propertiesResult, incomeResult, summaryResult] = await Promise.all([
        PropertyService.getPlayerProperties(userId),
        RentalIncomeService.calculateProjectedIncome(userId),
        RentalIncomeService.getPlayerRentalSummary(userId, 6),
      ]);

      if (propertiesResult.success) {
        setProperties(propertiesResult.data || []);
      }

      if (incomeResult.success) {
        setMonthlyIncome(incomeResult.projectedIncome);
      }

      if (summaryResult.success) {
        setRentalSummary(summaryResult.data);
      }
    } catch (error) {
      console.error('[RentalIncome] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleCollectRent = async () => {
    if (isCollecting || properties.length === 0) return;

    Alert.alert(
      'Collect Rent',
      `Collect rent from ${properties.length} propert${properties.length === 1 ? 'y' : 'ies'}?\n\nProjected income: ${formatCurrency(monthlyIncome)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Collect',
          onPress: async () => {
            setIsCollecting(true);
            try {
              const result = await RentalIncomeService.collectRentForAllProperties(userId!);

              if (result.success) {
                if (typeof Haptics.notificationAsync !== 'undefined') {
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                Alert.alert(
                  'Rent Collected!',
                  `Successfully collected ${formatCurrency(result.totalCollected)} from ${result.propertyCount} propert${result.propertyCount === 1 ? 'y' : 'ies'}.`,
                  [{ text: 'OK' }]
                );

                // Reload data
                await loadData();
              } else {
                Alert.alert('Collection Failed', result.error || 'Failed to collect rent');
              }
            } catch (error) {
              console.error('[RentalIncome] Error collecting rent:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsCollecting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Rental Income' }} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading rental data...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Rental Income',
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
          {/* Income Overview */}
          <View style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
            <View style={styles.overviewHeader}>
              <View style={[styles.overviewIcon, { backgroundColor: '#10B98120' }]}>
                <Wallet size={28} color="#10B981" />
              </View>
              <View style={styles.overviewInfo}>
                <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Projected Monthly Income</Text>
                <Text style={[styles.overviewValue, { color: colors.text }]}>
                  {formatCurrency(monthlyIncome)}
                </Text>
              </View>
            </View>

            <View style={styles.overviewStats}>
              <View style={styles.overviewStat}>
                <Text style={[styles.overviewStatLabel, { color: colors.textSecondary }]}>Annual Income</Text>
                <Text style={[styles.overviewStatValue, { color: '#10B981' }]}>
                  {formatCurrency(monthlyIncome * 12)}
                </Text>
              </View>
              <View style={styles.overviewStat}>
                <Text style={[styles.overviewStatLabel, { color: colors.textSecondary }]}>Properties</Text>
                <Text style={[styles.overviewStatValue, { color: colors.text }]}>
                  {properties.length}
                </Text>
              </View>
              <View style={styles.overviewStat}>
                <Text style={[styles.overviewStatLabel, { color: colors.textSecondary }]}>Avg/Month</Text>
                <Text style={[styles.overviewStatValue, { color: colors.text }]}>
                  {properties.length > 0 ? formatCurrency(monthlyIncome / properties.length) : '$0'}
                </Text>
              </View>
            </View>
          </View>

          {/* Collect Rent Button */}
          {properties.length > 0 && (
            <TouchableOpacity
              style={[
                styles.collectButton,
                { backgroundColor: isCollecting ? colors.surfaceAlt : colors.primary }
              ]}
              onPress={handleCollectRent}
              disabled={isCollecting}
            >
              {isCollecting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <DollarSign size={20} color="#FFF" />
                  <Text style={styles.collectButtonText}>Collect Rent</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Monthly History */}
          {rentalSummary?.byMonth && rentalSummary.byMonth.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <BarChart3 size={18} color={colors.textSecondary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly History</Text>
              </View>

              <View style={[styles.historyCard, { backgroundColor: colors.surface }]}>
                {rentalSummary.byMonth.slice(0, 6).map((item: any, index: number) => {
                  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const monthName = monthNames[item.month - 1];
                  const isLastMonth = index === 0;

                  return (
                    <View key={`${item.year}-${item.month}`} style={styles.historyItem}>
                      <View style={styles.historyMonth}>
                        <Text style={[styles.historyMonthText, { color: colors.text }]}>
                          {monthName}
                        </Text>
                        <Text style={[styles.historyYearText, { color: colors.textSecondary }]}>
                          {item.year}
                        </Text>
                      </View>
                      <View style={styles.historyStats}>
                        <Text style={[styles.historyIncome, { color: colors.text }]}>
                          {formatCurrency(item.totalCollected)}
                        </Text>
                        <Text style={[styles.historyProperties, { color: colors.textSecondary }]}>
                          {item.propertyCount} propert{item.propertyCount === 1 ? 'y' : 'ies'}
                        </Text>
                      </View>
                      {isLastMonth && (
                        <View style={[styles.lastMonthBadge, { backgroundColor: '#10B98120' }]}>
                          <Text style={[styles.lastMonthText, { color: '#10B981' }]}>Current</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Properties List */}
          <View style={styles.sectionHeader}>
            <Home size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Income by Property</Text>
          </View>

          {properties.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Building2 size={48} color={colors.textLight} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Properties</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Purchase properties to start earning rental income.
              </Text>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/game/real-estate' as any)}
              >
                <Text style={styles.browseButtonText}>Browse Properties</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.propertiesList}>
              {properties.map((property) => {
                const rent = property.currentRentPrice || property.baseRentPrice;
                const income = Math.round(rent * 0.95);

                return (
                  <View key={property.propertyId} style={[styles.propertyCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.propertyCardHeader}>
                      <View style={styles.propertyInfo}>
                        <Text style={[styles.propertyType, { color: colors.text }]}>
                          {property.propertyType.replace('_', ' ').toUpperCase()}
                        </Text>
                        <Text style={[styles.propertyAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                          {property.address}
                        </Text>
                      </View>
                      <Text style={[styles.propertyIncome, { color: '#10B981' }]}>
                        {formatCurrency(income)}/mo
                      </Text>
                    </View>

                    <View style={styles.propertyStats}>
                      <View style={styles.propertyStat}>
                        <DollarSign size={14} color={colors.textSecondary} />
                        <Text style={[styles.propertyStatLabel, { color: colors.textSecondary }]}>Base Rent</Text>
                        <Text style={[styles.propertyStatValue, { color: colors.text }]}>
                          {formatCurrency(rent)}
                        </Text>
                      </View>
                      <View style={styles.propertyStat}>
                        <Percent size={14} color={colors.textSecondary} />
                        <Text style={[styles.propertyStatLabel, { color: colors.textSecondary }]}>Occupancy</Text>
                        <Text style={[styles.propertyStatValue, { color: colors.text }]}>
                          95%
                        </Text>
                      </View>
                      <View style={styles.propertyStat}>
                        <Calendar size={14} color={colors.textSecondary} />
                        <Text style={[styles.propertyStatLabel, { color: colors.textSecondary }]}>Annual</Text>
                        <Text style={[styles.propertyStatValue, { color: colors.text }]}>
                          {formatCurrency(income * 12)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  overviewCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  overviewIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  overviewInfo: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB20',
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  overviewStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  collectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 18,
    borderRadius: 16,
    gap: 10,
  },
  collectButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  historyCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB20',
  },
  historyMonth: {
    width: 80,
  },
  historyMonthText: {
    fontSize: 15,
    fontWeight: '600',
  },
  historyYearText: {
    fontSize: 12,
    marginTop: 2,
  },
  historyStats: {
    flex: 1,
    alignItems: 'flex-end',
  },
  historyIncome: {
    fontSize: 16,
    fontWeight: '700',
  },
  historyProperties: {
    fontSize: 12,
    marginTop: 2,
  },
  lastMonthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  lastMonthText: {
    fontSize: 11,
    fontWeight: '600',
  },
  propertiesList: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  propertyCard: {
    padding: 16,
    borderRadius: 16,
  },
  propertyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyType: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
  },
  propertyIncome: {
    fontSize: 18,
    fontWeight: '700',
  },
  propertyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  propertyStat: {
    alignItems: 'center',
  },
  propertyStatLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  propertyStatValue: {
    fontSize: 13,
    fontWeight: '600',
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
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  browseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  bottomPadding: {
    height: 40,
  },
});