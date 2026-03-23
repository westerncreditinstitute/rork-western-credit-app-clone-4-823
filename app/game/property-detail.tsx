import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  Building2,
  Home,
  Castle,
  Umbrella,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Star,
  Heart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Shield,
  Award,
  CheckCircle,
  X,
  Info,
  Calculator,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { PropertyService, PropertyData } from '@/services/PropertyService';
import { RentalIncomeService } from '@/services/RentalIncomeService';
import * as Haptics from 'expo-haptics';

const getPropertyIcon = (propertyType: string, color: string) => {
  const size = 48;
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

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard = ({ icon, label, value, color, trend }: StatCardProps) => (
  <View style={[styles.statCard, { backgroundColor: '#F3F4F620' }]}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      {icon}
    </View>
    <Text style={[styles.statLabel]}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {trend && (
      <View style={styles.statTrend}>
        {trend === 'up' && <ArrowUpRight size={12} color="#10B981" />}
        {trend === 'down' && <ArrowDownRight size={12} color="#EF4444" />}
      </View>
    )}
  </View>
);

export default function PropertyDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { gameState, updateBalance } = useGame();
  const auth = useAuth();

  const propertyId = params?.id;
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [projectedIncome, setProjectedIncome] = useState(0);

  const userId = auth?.user?.id;
  const availableFunds = (gameState.bankBalance || 0) + (gameState.savingsBalance || 0);

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  const loadProperty = useCallback(async () => {
    if (!propertyId) {
      router.back();
      return;
    }

    setIsLoading(true);
    try {
      const result = await PropertyService.getPropertyById(propertyId);
      
      if (result.success && result.data) {
        setProperty(result.data);
        
        // Calculate projected income
        const rent = result.data.currentRentPrice || result.data.baseRentPrice;
        setProjectedIncome(Math.round(rent * 0.95));
      } else {
        Alert.alert('Property Not Found', 'The property you are looking for does not exist.');
        router.back();
      }
    } catch (error) {
      console.error('[PropertyDetail] Error loading property:', error);
      Alert.alert('Error', 'Failed to load property details');
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadProperty();
    setIsRefreshing(false);
  }, [loadProperty]);

  const handleToggleWatchlist = async () => {
    if (!property || !userId) return;

    try {
      if (inWatchlist) {
        await PropertyService.removeFromWatchlist(userId, property.id);
      } else {
        await PropertyService.addToWatchlist(userId, property.id);
      }
      setInWatchlist(!inWatchlist);
      
      if (typeof Haptics.impactAsync !== 'undefined') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('[PropertyDetail] Error toggling watchlist:', error);
      Alert.alert('Error', 'Failed to update watchlist');
    }
  };

  const handlePurchase = async () => {
    if (!property || !userId) return;

    const closingCosts = property.purchasePrice * 0.02;
    const totalAmount = property.purchasePrice + closingCosts;

    if (totalAmount > availableFunds) {
      Alert.alert(
        'Insufficient Funds',
        `You need ${formatCurrency(totalAmount)} to purchase this property (including closing costs).\n\nYou have ${formatCurrency(availableFunds)} available.`
      );
      return;
    }

    Alert.alert(
      'Confirm Purchase',
      `Purchase ${property.address} for ${formatCurrency(property.purchasePrice)}?\n\n` +
      `• Property: ${property.propertyType}\n` +
      `• Location: ${property.neighborhood}, ${property.city}\n` +
      `• Closing Costs: ${formatCurrency(closingCosts)}\n` +
      `• Total: ${formatCurrency(totalAmount)}\n` +
      `• Estimated Monthly Income: ${formatCurrency(projectedIncome)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            setIsPurchasing(true);
            try {
              const result = await PropertyService.purchaseProperty({
                playerId: userId,
                propertyId: property.propertyId,
                purchasePrice: property.purchasePrice,
                closingCosts,
              });

              if (result.success) {
                // Deduct funds
                if (totalAmount <= gameState.bankBalance) {
                  updateBalance(-totalAmount, 'bank');
                } else {
                  const fromBank = gameState.bankBalance;
                  const fromSavings = totalAmount - fromBank;
                  updateBalance(-fromBank, 'bank');
                  updateBalance(-fromSavings, 'savings');
                }

                if (typeof Haptics.notificationAsync !== 'undefined') {
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                Alert.alert(
                  'Purchase Successful!',
                  `Congratulations! You now own ${property.address}.\n\nEstimated Monthly Income: ${formatCurrency(projectedIncome)}`,
                  [
                    {
                      text: 'View Portfolio',
                      onPress: () => {
                        setShowPurchaseModal(false);
                        router.push('/game/property-portfolio' as any);
                      },
                    },
                    {
                      text: 'Done',
                      onPress: () => {
                        setShowPurchaseModal(false);
                        router.back();
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Purchase Failed', result.error || 'Failed to purchase property');
              }
            } catch (error) {
              console.error('[PropertyDetail] Error purchasing:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsPurchasing(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Property Details' }} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading property details...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!property) {
    return null;
  }

  const propertyColor = getPropertyColor(property.propertyType);
  const roi = ((projectedIncome * 12) / property.purchasePrice) * 100;

  return (
    <>
      <Stack.Screen
        options={{
          title: property.neighborhood,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleToggleWatchlist}>
              <Heart size={22} color={inWatchlist ? '#EF4444' : colors.textSecondary} fill={inWatchlist ? '#EF4444' : 'none'} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {/* Property Header */}
          <View style={[styles.headerCard, { backgroundColor: propertyColor + '15' }]}>
            <View style={[styles.headerIcon, { backgroundColor: propertyColor + '25' }]}>
              {getPropertyIcon(property.propertyType, propertyColor)}
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.propertyType, { color: propertyColor }]}>
                {property.propertyType.replace('_', ' ').toUpperCase()}
              </Text>
              <Text style={[styles.propertyAddress, { color: colors.text }]} numberOfLines={2}>
                {property.address}
              </Text>
              <View style={styles.headerMeta}>
                <View style={styles.metaItem}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {property.neighborhood}, {property.city}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.qualityBadge, { backgroundColor: propertyColor + '20' }]}>
              <Star size={14} color={propertyColor} />
              <Text style={[styles.qualityText, { color: propertyColor }]}>
                {property.propertyQuality}/10
              </Text>
            </View>
          </View>

          {/* Price & Investment Info */}
          <View style={[styles.priceCard, { backgroundColor: colors.surface }]}>
            <View style={styles.priceHeader}>
              <View>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Purchase Price</Text>
                <Text style={[styles.priceValue, { color: colors.primary }]}>
                  {formatCurrency(property.purchasePrice)}
                </Text>
              </View>
              <View style={[styles.roiBadge, { backgroundColor: '#10B98120' }]}>
                <TrendingUp size={16} color="#10B981" />
                <Text style={[styles.roiText, { color: '#10B981' }]}>
                  {roi.toFixed(1)}% ROI
                </Text>
              </View>
            </View>
            
            <View style={styles.priceDetails}>
              <View style={styles.priceDetail}>
                <Text style={[styles.priceDetailLabel, { color: colors.textSecondary }]}>Base Rent</Text>
                <Text style={[styles.priceDetailValue, { color: colors.text }]}>
                  {formatCurrency(property.baseRentPrice)}/mo
                </Text>
              </View>
              <View style={styles.priceDetail}>
                <Text style={[styles.priceDetailLabel, { color: colors.textSecondary }]}>Est. Income</Text>
                <Text style={[styles.priceDetailValue, { color: '#10B981' }]}>
                  {formatCurrency(projectedIncome)}/mo
                </Text>
              </View>
            </View>
          </View>

          {/* Property Specs */}
          <View style={styles.sectionHeader}>
            <Maximize2 size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Details</Text>
          </View>

          <View style={[styles.specsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.specsGrid}>
              <View style={styles.specItem}>
                <Bed size={20} color={colors.primary} />
                <Text style={[styles.specValue, { color: colors.text }]}>{property.bedrooms}</Text>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Bedrooms</Text>
              </View>
              <View style={styles.specItem}>
                <Bath size={20} color={colors.primary} />
                <Text style={[styles.specValue, { color: colors.text }]}>{property.bathrooms}</Text>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Bathrooms</Text>
              </View>
              <View style={styles.specItem}>
                <Maximize2 size={20} color={colors.primary} />
                <Text style={[styles.specValue, { color: colors.text }]}>
                  {property.squareFootage.toLocaleString()}
                </Text>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Sq Ft</Text>
              </View>
              {property.totalUnits && (
                <View style={styles.specItem}>
                  <Building2 size={20} color={colors.primary} />
                  <Text style={[styles.specValue, { color: colors.text }]}>
                    {property.totalUnits}
                  </Text>
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Units</Text>
                </View>
              )}
            </View>
          </View>

          {/* Investment Analysis */}
          <View style={styles.sectionHeader}>
            <Calculator size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Investment Analysis</Text>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              icon={<DollarSign size={18} color="#10B981" />}
              label="Monthly Income"
              value={formatCurrency(projectedIncome)}
              color="#10B981"
              trend="up"
            />
            <StatCard
              icon={<TrendingUp size={18} color="#8B5CF6" />}
              label="Annual Income"
              value={formatCurrency(projectedIncome * 12)}
              color="#8B5CF6"
              trend="up"
            />
            <StatCard
              icon={<Award size={18} color="#F59E0B" />}
              label="Payback Period"
              value={`${(property.purchasePrice / projectedIncome).toFixed(1)} mo`}
              color="#F59E0B"
            />
            <StatCard
              icon={<Star size={18} color={propertyColor} />}
              label="Quality Rating"
              value={`${property.propertyQuality}/10`}
              color={propertyColor}
            />
          </View>

          {/* Purchase Button */}
          {property.status === 'available' && (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[styles.purchaseButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowPurchaseModal(true)}
              >
                <DollarSign size={20} color="#FFF" />
                <Text style={styles.purchaseButtonText}>Purchase Property</Text>
              </TouchableOpacity>
              <View style={[styles.fundsInfo, { backgroundColor: colors.surface }]}>
                <Text style={[styles.fundsInfoLabel, { color: colors.textSecondary }]}>Available Funds</Text>
                <Text style={[styles.fundsInfoValue, { color: availableFunds >= property.purchasePrice ? '#10B981' : '#EF4444' }]}>
                  {formatCurrency(availableFunds)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Purchase Confirmation Modal */}
      <Modal visible={showPurchaseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.purchaseModal, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Purchase</Text>
              <TouchableOpacity onPress={() => setShowPurchaseModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {property && (
                <>
                  <View style={[styles.propertySummary, { backgroundColor: '#F3F4F620' }]}>
                    <View style={[styles.summaryIcon, { backgroundColor: propertyColor + '25' }]}>
                      {getPropertyIcon(property.propertyType, propertyColor)}
                    </View>
                    <View style={styles.summaryInfo}>
                      <Text style={[styles.summaryType, { color: propertyColor }]}>
                        {property.propertyType.replace('_', ' ').toUpperCase()}
                      </Text>
                      <Text style={[styles.summaryAddress, { color: colors.text }]} numberOfLines={1}>
                        {property.address}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.costBreakdown}>
                    <Text style={[styles.breakdownTitle, { color: colors.text }]}>Cost Breakdown</Text>
                    
                    <View style={styles.breakdownItem}>
                      <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Purchase Price</Text>
                      <Text style={[styles.breakdownValue, { color: colors.text }]}>
                        {formatCurrency(property.purchasePrice)}
                      </Text>
                    </View>
                    <View style={styles.breakdownItem}>
                      <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Closing Costs (2%)</Text>
                      <Text style={[styles.breakdownValue, { color: colors.text }]}>
                        {formatCurrency(property.purchasePrice * 0.02)}
                      </Text>
                    </View>
                    <View style={[styles.breakdownItem, styles.breakdownTotal]}>
                      <Text style={[styles.breakdownLabel, { color: colors.text }]}>Total</Text>
                      <Text style={[styles.breakdownValue, { color: colors.primary, fontWeight: '700' }]}>
                        {formatCurrency(property.purchasePrice * 1.02)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.infoBox, { backgroundColor: '#3B82F610' }]}>
                    <Info size={16} color="#3B82F6" />
                    <Text style={[styles.infoText, { color: colors.text }]}>
                      You will receive an estimated {formatCurrency(projectedIncome)} per month in rental income (95% occupancy rate).
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      { backgroundColor: isPurchasing ? colors.surfaceAlt : colors.primary }
                    ]}
                    onPress={handlePurchase}
                    disabled={isPurchasing}
                  >
                    {isPurchasing ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <CheckCircle size={18} color="#FFF" />
                        <Text style={styles.confirmButtonText}>Complete Purchase</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: colors.surfaceAlt }]}
                    onPress={() => setShowPurchaseModal(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
              <View style={styles.modalBottomPadding} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  propertyType: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  qualityText: {
    fontSize: 14,
    fontWeight: '700',
  },
  priceCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  roiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  roiText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  priceDetail: {
    flex: 1,
  },
  priceDetailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  priceDetailValue: {
    fontSize: 16,
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
  specsCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  specItem: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F3F4F620',
  },
  specValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  specLabel: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
    color: '#6B7280',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTrend: {
    height: 20,
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 10,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  fundsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  fundsInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  fundsInfoValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  purchaseModal: {
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
  propertySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 12,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryType: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryAddress: {
    fontSize: 15,
    fontWeight: '600',
  },
  costBreakdown: {
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB20',
  },
  breakdownTotal: {
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 16,
  },
  breakdownLabel: {
    fontSize: 15,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBottomPadding: {
    height: 40,
  },
});