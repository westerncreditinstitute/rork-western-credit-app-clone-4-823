import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Building2,
  Home,
  Castle,
  Umbrella,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Calendar,
  MapPin,
  Maximize2,
  Bed,
  Bath,
  Star,
  ChevronRight,
  Wallet,
  PieChart,
  BarChart3,
  RefreshCw,
  Filter,
  Plus,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { PropertyService, PropertyData } from '@/services/PropertyService';
import { RentalIncomeService } from '@/services/RentalIncomeService';
import * as Haptics from 'expo-haptics';

const getPropertyIcon = (propertyType: string, color: string) => {
  const size = 24;
  switch (propertyType) {
    case 'apartment': return <Building2 size={size} color={color} />;
    case 'house': return <Home size={size} color={color} />;
    case 'mansion': return <Castle size={size} color={color} />;
    case 'beach_house': return <Umbrella size={size} color={color} />;
    default: return <Building2 size={size} color={color} />;
  }
};

const getPropertyColor = (propertyType: string): string => {
  switch (propertyType) {
    case 'apartment': return '#3B82F6';
    case 'house': return '#10B981';
    case 'mansion': return '#8B5CF6';
    case 'beach_house': return '#F59E0B';
    default: return '#6B7280';
  }
};

const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
};

interface PropertyCardProps {
  property: PropertyData;
  onPress: () => void;
}

const PropertyCard = ({ property, onPress }: PropertyCardProps) => {
  const { colors } = useTheme();
  const propertyColor = getPropertyColor(property.propertyType);
  const rent = property.currentRentPrice || property.baseRentPrice;
  const monthlyIncome = Math.round(rent * 0.95); // 95% occupancy
  const roi = ((monthlyIncome * 12) / property.purchasePrice) * 100;

  return (
    <TouchableOpacity
      style={[styles.propertyCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.propertyCardHeader}>
        <View style={[styles.propertyIcon, { backgroundColor: propertyColor + '20' }]}>
          {getPropertyIcon(property.propertyType, propertyColor)}
        </View>
        <View style={styles.propertyInfo}>
          <Text style={[styles.propertyType, { color: propertyColor }]}>
            {property.propertyType.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={[styles.propertyAddress, { color: colors.text }]} numberOfLines={1}>
            {property.address}
          </Text>
        </View>
        <View style={[styles.qualityBadge, { backgroundColor: propertyColor + '20' }]}>
          <Star size={12} color={propertyColor} />
          <Text style={[styles.qualityText, { color: propertyColor }]}>
            {property.propertyQuality}/10
          </Text>
        </View>
      </View>

      <View style={styles.propertyStats}>
        <View style={styles.propertyStat}>
          <DollarSign size={14} color="#10B981" />
          <Text style={[styles.propertyStatLabel, { color: colors.textSecondary }]}>Purchase Price</Text>
          <Text style={[styles.propertyStatValue, { color: colors.text }]}>
            {formatCurrency(property.purchasePrice)}
          </Text>
        </View>
        <View style={styles.propertyStat}>
          <Wallet size={14} color="#3B82F6" />
          <Text style={[styles.propertyStatLabel, { color: colors.textSecondary }]}>Monthly Income</Text>
          <Text style={[styles.propertyStatValue, { color: '#10B981' }]}>
            {formatCurrency(monthlyIncome)}
          </Text>
        </View>
        <View style={styles.propertyStat}>
          <Percent size={14} color="#8B5CF6" />
          <Text style={[styles.propertyStatLabel, { color: colors.textSecondary }]}>ROI</Text>
          <Text style={[styles.propertyStatValue, { color: '#8B5CF6' }]}>
            {roi.toFixed(1)}%
          </Text>
        </View>
      </View>

      <View style={styles.propertyMeta}>
        <View style={styles.metaItem}>
          <MapPin size={12} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
            {property.neighborhood}, {property.city}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Bed size={12} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {property.bedrooms} bd
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Bath size={12} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {property.bathrooms} ba
          </Text>
        </View>
      </View>

      <View style={styles.propertyCardFooter}>
        <ChevronRight size={18} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

export default function PropertyPortfolioScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const auth = useAuth();

  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [projectedIncome, setProjectedIncome] = useState(0);

  const userId = auth?.user?.id;

  useEffect(() => {
    loadPortfolio();
  }, [userId]);

  const loadPortfolio = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const [propertiesResult, incomeResult] = await Promise.all([
        PropertyService.getPlayerProperties(userId),
        RentalIncomeService.calculateProjectedIncome(userId),
      ]);

      if (propertiesResult.success) {
        setProperties(propertiesResult.data || []);
      }

      if (incomeResult.success) {
        setProjectedIncome(incomeResult.projectedIncome);
      }
    } catch (error) {
      console.error('[PropertyPortfolio] Error loading portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPortfolio();
    setIsRefreshing(false);
  };

  const handlePropertyPress = useCallback((property: PropertyData) => {
    router.push(`/game/property-detail?id=${property.propertyId}` as any);
  }, [router]);

  const handleBrowseProperties = useCallback(() => {
    router.push('/game/real-estate' as any);
  }, [router]);

  const portfolioStats = useMemo(() => {
    const totalValue = properties.reduce((sum, p) => sum + p.purchasePrice, 0);
    const propertiesByType: Record<string, number> = {
      apartment: 0,
      house: 0,
      mansion: 0,
      beach_house: 0,
    };

    properties.forEach(p => {
      propertiesByType[p.propertyType]++;
    });

    const valueByType: Record<string, number> = {
      apartment: 0,
      house: 0,
      mansion: 0,
      beach_house: 0,
    };

    properties.forEach(p => {
      valueByType[p.propertyType] += p.purchasePrice;
    });

    return {
      totalProperties: properties.length,
      totalValue,
      monthlyIncome: projectedIncome,
      annualIncome: projectedIncome * 12,
      averageROI: properties.length > 0
        ? properties.reduce((sum, p) => {
            const rent = p.currentRentPrice || p.baseRentPrice;
            const income = Math.round(rent * 0.95);
            return sum + ((income * 12) / p.purchasePrice) * 100;
          }, 0) / properties.length
        : 0,
      propertiesByType,
      valueByType,
    };
  }, [properties, projectedIncome]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Property Portfolio' }} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading portfolio...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Property Portfolio',
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
          {/* Portfolio Overview */}
          <View style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.overviewTitle, { color: colors.text }]}>Portfolio Overview</Text>
            <View style={styles.overviewStats}>
              <View style={styles.overviewStat}>
                <View style={[styles.overviewStatIcon, { backgroundColor: '#3B82F620' }]}>
                  <Building2 size={18} color="#3B82F6" />
                </View>
                <Text style={[styles.overviewStatNumber, { color: colors.text }]}>
                  {portfolioStats.totalProperties}
                </Text>
                <Text style={[styles.overviewStatLabel, { color: colors.textSecondary }]}>Properties</Text>
              </View>
              <View style={styles.overviewStat}>
                <View style={[styles.overviewStatIcon, { backgroundColor: '#10B98120' }]}>
                  <DollarSign size={18} color="#10B981" />
                </View>
                <Text style={[styles.overviewStatNumber, { color: colors.text }]}>
                  {formatCurrency(portfolioStats.monthlyIncome)}/mo
                </Text>
                <Text style={[styles.overviewStatLabel, { color: colors.textSecondary }]}>Income</Text>
              </View>
              <View style={styles.overviewStat}>
                <View style={[styles.overviewStatIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Percent size={18} color="#8B5CF6" />
                </View>
                <Text style={[styles.overviewStatNumber, { color: colors.text }]}>
                  {portfolioStats.averageROI.toFixed(1)}%
                </Text>
                <Text style={[styles.overviewStatLabel, { color: colors.textSecondary }]}>Avg ROI</Text>
              </View>
              <View style={styles.overviewStat}>
                <View style={[styles.overviewStatIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Wallet size={18} color="#F59E0B" />
                </View>
                <Text style={[styles.overviewStatNumber, { color: colors.text }]}>
                  {formatCurrency(portfolioStats.totalValue)}
                </Text>
                <Text style={[styles.overviewStatLabel, { color: colors.textSecondary }]}>Value</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleBrowseProperties}
            >
              <Plus size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Buy Property</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButtonSecondary, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/game/rental-income' as any)}
            >
              <Wallet size={18} color={colors.primary} />
              <Text style={[styles.actionButtonSecondaryText, { color: colors.text }]}>
                Rental Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Properties List */}
          <View style={styles.sectionHeader}>
            <Building2 size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Properties</Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {portfolioStats.totalProperties}
            </Text>
          </View>

          {properties.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Building2 size={48} color={colors.textLight} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Properties Yet</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Start building your real estate portfolio by purchasing your first property!
              </Text>
              <TouchableOpacity
                style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                onPress={handleBrowseProperties}
              >
                <Plus size={16} color="#FFF" />
                <Text style={styles.emptyStateButtonText}>Browse Properties</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.propertiesList}>
              {properties.map((property) => (
                <PropertyCard
                  key={property.propertyId}
                  property={property}
                  onPress={() => handlePropertyPress(property)}
                />
              ))}
            </View>
          )}

          {/* Portfolio Breakdown */}
          {properties.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <PieChart size={18} color={colors.textSecondary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Portfolio Breakdown</Text>
              </View>

              <View style={[styles.breakdownCard, { backgroundColor: colors.surface }]}>
                <View style={styles.breakdownRow}>
                  <View style={[styles.breakdownDot, { backgroundColor: getPropertyColor('apartment') }]} />
                  <Text style={[styles.breakdownLabel, { color: colors.text }]}>Apartments</Text>
                  <Text style={[styles.breakdownCount, { color: colors.text }]}>
                    {portfolioStats.propertiesByType.apartment}
                  </Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>
                    {formatCurrency(portfolioStats.valueByType.apartment)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <View style={[styles.breakdownDot, { backgroundColor: getPropertyColor('house') }]} />
                  <Text style={[styles.breakdownLabel, { color: colors.text }]}>Houses</Text>
                  <Text style={[styles.breakdownCount, { color: colors.text }]}>
                    {portfolioStats.propertiesByType.house}
                  </Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>
                    {formatCurrency(portfolioStats.valueByType.house)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <View style={[styles.breakdownDot, { backgroundColor: getPropertyColor('mansion') }]} />
                  <Text style={[styles.breakdownLabel, { color: colors.text }]}>Mansions</Text>
                  <Text style={[styles.breakdownCount, { color: colors.text }]}>
                    {portfolioStats.propertiesByType.mansion}
                  </Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>
                    {formatCurrency(portfolioStats.valueByType.mansion)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <View style={[styles.breakdownDot, { backgroundColor: getPropertyColor('beach_house') }]} />
                  <Text style={[styles.breakdownLabel, { color: colors.text }]}>Beach Houses</Text>
                  <Text style={[styles.breakdownCount, { color: colors.text }]}>
                    {portfolioStats.propertiesByType.beach_house}
                  </Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>
                    {formatCurrency(portfolioStats.valueByType.beach_house)}
                  </Text>
                </View>
              </View>
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
  overviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewStat: {
    alignItems: 'center',
    flex: 1,
  },
  overviewStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  overviewStatLabel: {
    fontSize: 11,
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
    padding: 14,
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
    padding: 14,
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
    marginTop: 8,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  propertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyType: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  propertyAddress: {
    fontSize: 14,
    fontWeight: '500',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  qualityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  propertyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    fontWeight: '700',
  },
  propertyMeta: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  propertyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
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
  breakdownCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB20',
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 14,
  },
  breakdownCount: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 16,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 40,
  },
});