import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
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
  X,
  Target,
  Calendar,
  MapPin,
  BarChart3,
  Award,
  AlertCircle,
  CheckCircle,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { UserBusinessData, BusinessStage } from '@/types/business';
import { formatCurrency } from '@/mocks/businessCategories';
import * as Haptics from 'expo-haptics';
import React from "react";

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

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const StatCard = ({ icon, label, value, color, trend, trendValue }: StatCardProps) => (
  <View style={[styles.statCard, { backgroundColor: '#F3F4F620' }]}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      {icon}
    </View>
    <Text style={[styles.statLabel]}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {trend && trendValue && (
      <View style={styles.statTrend}>
        {trend === 'up' && <ArrowUpRight size={12} color="#10B981" />}
        {trend === 'down' && <ArrowDownRight size={12} color="#EF4444" />}
        <Text style={[
          styles.statTrendValue,
          { color: trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280' }
        ]}>
          {trendValue}
        </Text>
      </View>
    )}
  </View>
);

interface TimelineItemProps {
  title: string;
  date: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
}

const TimelineItem = ({ title, date, description, status }: TimelineItemProps) => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineDot, {
        backgroundColor: status === 'completed' ? '#10B981' : status === 'in_progress' ? '#3B82F6' : '#E5E7EB'
      }]} />
      <View style={styles.timelineContent}>
        <Text style={[styles.timelineTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.timelineDate, { color: colors.textSecondary }]}>{date}</Text>
        <Text style={[styles.timelineDescription, { color: colors.textLight }]}>{description}</Text>
      </View>
    </View>
  );
};

export default function BusinessDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { gameState } = useGame();
  const { 
    getUserBusinesses,
    getBusinessStats,
    closeBusiness
  } = useBusiness();

  const businessId = params?.id;
  const [business, setBusiness] = useState<UserBusinessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  useEffect(() => {
    loadBusiness();
  }, [businessId]);

  const loadBusiness = useCallback(async () => {
    if (!businessId) {
      router.back();
      return;
    }

    setIsLoading(true);
    try {
      const businesses = getUserBusinesses();
      const foundBusiness = businesses.find(b => b.id === businessId);
      
      if (foundBusiness) {
        setBusiness(foundBusiness);
      } else {
        Alert.alert('Business Not Found', 'The business you are looking for does not exist.');
        router.back();
      }
    } catch (error) {
      console.error('[BusinessDetail] Error loading business:', error);
      Alert.alert('Error', 'Failed to load business details');
    } finally {
      setIsLoading(false);
    }
  }, [businessId, getUserBusinesses, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadBusiness();
    setIsRefreshing(false);
  }, [loadBusiness]);

  const handleCloseBusiness = useCallback(async () => {
    if (!business || !businessId) return;

    Alert.alert(
      'Close Business',
      'Are you sure you want to close this business? This action cannot be undone and you will lose all ownership.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await closeBusiness(businessId);
              
              if (result.success) {
                if (typeof Haptics.notificationAsync !== 'undefined') {
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert('Business Closed', `${business.businessName} has been closed.`, [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                Alert.alert('Error', result.error || 'Failed to close business');
              }
            } catch (error) {
              console.error('[BusinessDetail] Error closing business:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            }
          }
        }
      ]
    );
  }, [business, businessId, closeBusiness, router]);

  const handleCollectProfits = useCallback(() => {
    if (!business) return;
    
    Alert.alert(
      'Collect Profits',
      `${business.businessName} has ${formatCurrency(business.monthlyProfit)} in available profits.\n\nProfits are automatically collected monthly.`,
      [
        { text: 'OK' }
      ]
    );
  }, [business]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Business Details',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading business details...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!business) {
    return null;
  }

  const stageColor = getStageColor(business.businessStage);
  const isProfitable = business.monthlyProfit > 0;
  const fundingProgress = business.fundingGoal > 0 
    ? (business.currentFunding / business.fundingGoal) * 100 
    : 100;
  const totalInvested = business.startupCost;
  const totalRevenue = business.monthlyRevenue * 12;
  const roi = totalInvested > 0 
    ? ((totalRevenue - totalInvested) / totalInvested) * 100 
    : 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: business.businessName,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowMoreActions(true)}>
              <Settings size={20} color={colors.text} />
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
          {/* Business Header */}
          <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
            <View style={styles.headerTop}>
              <View style={[styles.headerIcon, { backgroundColor: stageColor + '20' }]}>
                <Building2 size={32} color={stageColor} />
              </View>
              <View style={[styles.stageBadge, { backgroundColor: stageColor + '20' }]}>
                <View style={[styles.stageDot, { backgroundColor: stageColor }]} />
                <Text style={[styles.stageText, { color: stageColor }]}>
                  {getStageLabel(business.businessStage)}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.businessName, { color: colors.text }]}>{business.businessName}</Text>
            <Text style={[styles.businessType, { color: colors.textSecondary }]}>{business.businessType}</Text>
            
            <View style={styles.headerMeta}>
              <View style={styles.metaItem}>
                <MapPin size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {business.location}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {new Date(business.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Funding Progress (if applicable) */}
          {business.businessStage === 'funding' && (
            <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: colors.text }]}>Funding Progress</Text>
                <Text style={[styles.progressPercent, { color: colors.text }]}>
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
              <View style={styles.progressStats}>
                <Text style={[styles.progressAmount, { color: colors.text }]}>
                  {formatCurrency(business.currentFunding)}
                </Text>
                <Text style={[styles.progressGoal, { color: colors.textSecondary }]}>
                  of {formatCurrency(business.fundingGoal)}
                </Text>
              </View>
              {fundingProgress >= 100 && (
                <View style={[styles.fundedBadge, { backgroundColor: '#10B98120' }]}>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={[styles.fundedText, { color: '#10B981' }]}>
                    Funding Complete - Ready to Launch!
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Financial Overview */}
          <View style={styles.sectionHeader}>
            <Wallet size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial Overview</Text>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              icon={<TrendingUp size={18} color="#10B981" />}
              label="Monthly Revenue"
              value={`${formatCurrency(business.monthlyRevenue)}/mo`}
              color="#10B981"
            />
            <StatCard
              icon={<TrendingDown size={18} color="#EF4444" />}
              label="Monthly Expenses"
              value={`${formatCurrency(business.monthlyExpenses)}/mo`}
              color="#EF4444"
            />
            <StatCard
              icon={<DollarSign size={18} color={isProfitable ? '#10B981' : '#EF4444'} />}
              label="Monthly Profit"
              value={`${isProfitable ? '+' : ''}${formatCurrency(business.monthlyProfit)}/mo`}
              color={isProfitable ? '#10B981' : '#EF4444'}
              trend={business.monthlyProfit > 0 ? 'up' : business.monthlyProfit < 0 ? 'down' : 'neutral'}
              trendValue={`${isProfitable ? '+' : ''}${((business.monthlyProfit / business.monthlyRevenue) * 100).toFixed(1)}%`}
            />
            <StatCard
              icon={<Percent size={18} color="#8B5CF6" />}
              label="Total ROI"
              value={`${roi.toFixed(1)}%`}
              color="#8B5CF6"
              trend={roi > 0 ? 'up' : roi < 0 ? 'down' : 'neutral'}
              trendValue={roi > 0 ? `+${formatCurrency(totalRevenue - totalInvested)}` : undefined}
            />
          </View>

          {/* Business Details */}
          <View style={styles.sectionHeader}>
            <Target size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Business Details</Text>
          </View>

          <View style={[styles.detailsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Startup Cost</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatCurrency(business.startupCost)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Current Funding</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatCurrency(business.currentFunding)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Ownership</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {business.ownershipPercentage.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Employees</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {business.employeeCount || 0}
              </Text>
            </View>
            
          </View>

          {/* Milestones Timeline */}
          <View style={styles.sectionHeader}>
            <Award size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Business Timeline</Text>
          </View>

          <View style={[styles.timelineCard, { backgroundColor: colors.surface }]}>
            <TimelineItem
              title="Business Started"
              date={new Date(business.createdAt).toLocaleDateString()}
              description={`Initialized with ${formatCurrency(business.startupCost)} startup capital`}
              status="completed"
            />
            {business.businessStage !== 'planning' && (
              <TimelineItem
                title="Funding Complete"
                date={new Date(business.createdAt).toLocaleDateString()}
                description={`Raised ${formatCurrency(business.currentFunding)} total funding`}
                status="completed"
              />
            )}
            {(business.businessStage === 'operational' || business.businessStage === 'profitable' || business.businessStage === 'struggling') && (
              <TimelineItem
                title="Operational Phase"
                date={new Date(business.createdAt).toLocaleDateString()}
                description="Business is now generating revenue"
                status="completed"
              />
            )}
            {business.businessStage === 'profitable' && (
              <TimelineItem
                title="Profitable"
                date="Current"
                description="Business is generating consistent profits"
                status="in_progress"
              />
            )}
            {business.businessStage === 'struggling' && (
              <TimelineItem
                title="Challenges"
                date="Current"
                description="Business facing difficulties, needs attention"
                status="in_progress"
              />
            )}
            <TimelineItem
              title="Future Growth"
              date="TBD"
              description="Expand operations and increase market share"
              status="pending"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {(business.businessStage === 'operational' || business.businessStage === 'profitable') && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleCollectProfits}
              >
                <Wallet size={18} color="#FFF" />
                <Text style={styles.actionButtonText}>View Profits</Text>
              </TouchableOpacity>
            )}
            
            {business.businessStage !== 'closed' && (
              <TouchableOpacity
                style={[styles.actionButtonSecondary, { backgroundColor: colors.surface }]}
                onPress={() => setShowCloseModal(true)}
              >
                <X size={18} color="#EF4444" />
                <Text style={[styles.actionButtonSecondaryText, { color: '#EF4444' }]}>Close Business</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Close Confirmation Modal */}
      <Modal visible={showCloseModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.confirmIcon, { backgroundColor: '#EF444420' }]}>
              <AlertCircle size={32} color="#EF4444" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Close Business?</Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              Are you sure you want to close {business.businessName}? This action cannot be undone and you will lose all ownership and future profits.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButtonCancel, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => setShowCloseModal(false)}
              >
                <Text style={[styles.confirmButtonTextCancel, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButtonConfirm, { backgroundColor: '#EF4444' }]}
                onPress={handleCloseBusiness}
              >
                <Text style={styles.confirmButtonTextConfirm}>Close Business</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* More Actions Modal */}
      <Modal visible={showMoreActions} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreActions(false)}
        >
          <View style={[styles.actionsModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.actionsModalTitle, { color: colors.text }]}>Actions</Text>
            <TouchableOpacity style={styles.actionModalItem}>
              <Settings size={18} color={colors.textSecondary} />
              <Text style={[styles.actionModalItemText, { color: colors.text }]}>Business Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionModalItem}>
              <BarChart3 size={18} color={colors.textSecondary} />
              <Text style={[styles.actionModalItemText, { color: colors.text }]}>View Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionModalItem}>
              <Users size={18} color={colors.textSecondary} />
              <Text style={[styles.actionModalItemText, { color: colors.text }]}>Manage Investors</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionModalItem}>
              <Award size={18} color={colors.textSecondary} />
              <Text style={[styles.actionModalItemText, { color: colors.text }]}>Achievements</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  businessName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  businessType: {
    fontSize: 15,
    marginBottom: 12,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressStats: {
    flexDirection: 'row',
    gap: 8,
  },
  progressAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressGoal: {
    fontSize: 14,
  },
  fundedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  fundedText: {
    fontSize: 13,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTrendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB20',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB20',
  },
  detailSectionLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  detailSectionValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  timelineCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  actionButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    padding: 24,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButtonCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonTextCancel: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButtonConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonTextConfirm: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  actionsModal: {
    padding: 20,
    borderRadius: 20,
    width: '100%',
    maxWidth: 300,
  },
  actionsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  actionModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  actionModalItemText: {
    fontSize: 15,
  },
});