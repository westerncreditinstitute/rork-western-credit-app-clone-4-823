import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Home,
  Building2,
  Castle,
  Crown,
  Check,
  ChevronRight,
  Users,
  Package,
  Sparkles,
  ArrowLeft,
  Lock,
} from 'lucide-react-native';
import { useHome } from '@/contexts/HomeContext';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { HOME_TIERS, HomeTierConfig } from '@/types/home';
import HomeNavigation from '@/components/HomeNavigation';

const { width: _SCREEN_WIDTH } = Dimensions.get('window');

const TIER_ICONS: Record<number, React.ReactNode> = {
  1: <Home size={32} color="#10B981" />,
  2: <Building2 size={32} color="#3B82F6" />,
  3: <Castle size={32} color="#8B5CF6" />,
  4: <Crown size={32} color="#F59E0B" />,
};

const TIER_COLORS: Record<number, { primary: string; bg: string; border: string }> = {
  1: { primary: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' },
  2: { primary: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
  3: { primary: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)' },
  4: { primary: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
};

const TIER_COSTS: Record<number, number> = {
  1: 0,
  2: 25000,
  3: 100000,
  4: 500000,
};

interface TierCardProps {
  config: HomeTierConfig;
  isSelected: boolean;
  isAffordable: boolean;
  onSelect: () => void;
  animDelay: number;
}

function TierCard({ config, isSelected, isAffordable, onSelect, animDelay }: TierCardProps) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: animDelay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: animDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animDelay]);

  useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSelected]);

  const colors = TIER_COLORS[config.id];
  const cost = TIER_COSTS[config.id];
  const isFree = cost === 0;
  const isLocked = !isAffordable && !isFree;

  return (
    <Animated.View
      style={[
        styles.tierCardContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.tierCard,
          {
            backgroundColor: isSelected ? colors.bg : '#1E293B',
            borderColor: isSelected ? colors.primary : colors.border,
          },
          isLocked && styles.tierCardLocked,
        ]}
        onPress={onSelect}
        activeOpacity={isLocked ? 1 : 0.7}
        disabled={isLocked}
      >
        <View style={styles.tierCardHeader}>
          <View style={[styles.tierIconContainer, { backgroundColor: colors.bg }]}>
            {TIER_ICONS[config.id]}
          </View>
          <View style={styles.tierTitleContainer}>
            <Text style={[styles.tierName, { color: isSelected ? colors.primary : '#fff' }]}>
              {config.tierName}
            </Text>
            <View style={styles.tierBadgeRow}>
              {isFree ? (
                <View style={[styles.freeBadge, { backgroundColor: colors.bg }]}>
                  <Sparkles size={12} color={colors.primary} />
                  <Text style={[styles.freeBadgeText, { color: colors.primary }]}>Free Starter</Text>
                </View>
              ) : (
                <Text style={styles.tierCost}>${cost.toLocaleString()}</Text>
              )}
            </View>
          </View>
          {isSelected ? (
            <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
              <Check size={16} color="#fff" />
            </View>
          ) : isLocked ? (
            <View style={styles.lockCircle}>
              <Lock size={16} color="#6B7280" />
            </View>
          ) : null}
        </View>

        <View style={styles.tierStatsRow}>
          <View style={styles.tierStat}>
            <Home size={14} color="#9CA3AF" />
            <Text style={styles.tierStatText}>{config.maxRooms} rooms</Text>
          </View>
          <View style={styles.tierStat}>
            <Package size={14} color="#9CA3AF" />
            <Text style={styles.tierStatText}>{config.totalMaxItems} items</Text>
          </View>
          <View style={styles.tierStat}>
            <Users size={14} color="#9CA3AF" />
            <Text style={styles.tierStatText}>{config.maxVisitors} visitors</Text>
          </View>
        </View>

        <View style={styles.roomTypesContainer}>
          <Text style={styles.roomTypesLabel}>Rooms:</Text>
          <Text style={styles.roomTypesList} numberOfLines={2}>
            {config.defaultRoomTypes.join(' • ')}
          </Text>
        </View>

        {isLocked && (
          <View style={styles.lockedOverlay}>
            <Text style={styles.lockedText}>Insufficient funds</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeCreationScreen() {
  const router = useRouter();
  const { createHome, hasHome } = useHome();
  const game = useGame();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const playerBalance = game?.gameState?.bankBalance || 0;
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      console.log('[HomeCreation] Non-admin user attempted access, redirecting back');
      Alert.alert(
        'Admin Only Feature',
        'The Home Creation feature is currently available for administrators only. This feature will be available to all users in a future update.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    if (hasHome) {
      router.replace('/game/home-editor' as any);
      return;
    }

    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [hasHome, isAdmin]);

  const canAffordTier = useCallback((tier: number): boolean => {
    const cost = TIER_COSTS[tier];
    if (cost === 0) return true;
    return playerBalance >= cost;
  }, [playerBalance]);

  const handleSelectTier = useCallback((tier: number) => {
    if (canAffordTier(tier) || TIER_COSTS[tier] === 0) {
      setSelectedTier(tier);
      console.log('[HomeCreation] Selected tier:', tier);
    }
  }, [canAffordTier]);

  const handleCreateHome = useCallback(async () => {
    if (isCreating) return;

    const cost = TIER_COSTS[selectedTier];
    if (cost > 0 && !canAffordTier(selectedTier)) {
      Alert.alert('Insufficient Funds', `You need $${cost.toLocaleString()} to purchase this home tier.`);
      return;
    }

    setIsCreating(true);
    console.log('[HomeCreation] Creating home with tier:', selectedTier);

    try {
      if (cost > 0 && game) {
        game.updateBalance(-cost, 'bank');
      }

      const home = await createHome(selectedTier);
      if (home) {
        console.log('[HomeCreation] Home created successfully:', home.id);
        router.replace('/game/home-editor' as any);
      } else {
        Alert.alert('Error', 'Failed to create home. Please try again.');
        if (cost > 0 && game) {
          game.updateBalance(cost, 'bank');
        }
      }
    } catch (error) {
      console.error('[HomeCreation] Error creating home:', error);
      Alert.alert('Error', 'An error occurred while creating your home.');
      if (cost > 0 && game) {
        game.updateBalance(cost, 'bank');
      }
    } finally {
      setIsCreating(false);
    }
  }, [selectedTier, isCreating, createHome, game, canAffordTier, router]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const selectedConfig = HOME_TIERS.find(t => t.id === selectedTier);
  const selectedColors = TIER_COLORS[selectedTier];
  const selectedCost = TIER_COSTS[selectedTier];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeNavigation currentScreen="creation" showCompact />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Animated.View style={[styles.headerContent, { opacity: headerAnim }]}>
          <Text style={styles.headerTitle}>Create Your Home</Text>
          <Text style={styles.headerSubtitle}>Choose your starting home tier</Text>
        </Animated.View>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceAmount}>${playerBalance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tiersContainer}>
          {HOME_TIERS.map((tierConfig, index) => (
            <TierCard
              key={tierConfig.id}
              config={tierConfig}
              isSelected={selectedTier === tierConfig.id}
              isAffordable={canAffordTier(tierConfig.id)}
              onSelect={() => handleSelectTier(tierConfig.id)}
              animDelay={index * 100}
            />
          ))}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Sparkles size={18} color="#10B981" />
            <Text style={styles.infoText}>
              Start with a free Starter Studio and upgrade anytime!
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Users size={18} color="#3B82F6" />
            <Text style={styles.infoText}>
              Invite friends to visit and explore your decorated home.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.selectedSummary}>
          <View style={[styles.summaryIcon, { backgroundColor: selectedColors.bg }]}>
            {TIER_ICONS[selectedTier]}
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>{selectedConfig?.tierName}</Text>
            <Text style={styles.summaryCost}>
              {selectedCost === 0 ? 'Free' : `$${selectedCost.toLocaleString()}`}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.createButton,
            { backgroundColor: selectedColors.primary },
            isCreating && styles.createButtonDisabled,
          ]}
          onPress={handleCreateHome}
          disabled={isCreating}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>
            {isCreating ? 'Creating...' : 'Create Home'}
          </Text>
          {!isCreating && <ChevronRight size={20} color="#fff" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  balanceContainer: {
    alignItems: 'flex-end',
    paddingLeft: 12,
  },
  balanceLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#10B981',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
  },
  tiersContainer: {
    gap: 12,
  },
  tierCardContainer: {
    marginBottom: 4,
  },
  tierCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    overflow: 'hidden',
  },
  tierCardLocked: {
    opacity: 0.6,
  },
  tierCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  tierIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierTitleContainer: {
    flex: 1,
    marginLeft: 14,
  },
  tierName: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  tierBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  tierCost: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#9CA3AF',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  tierStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierStatText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  roomTypesContainer: {
    marginTop: 12,
  },
  roomTypesLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  roomTypesList: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  lockedText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#9CA3AF',
  },
  infoCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    padding: 16,
    paddingBottom: 32,
  },
  selectedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryInfo: {
    marginLeft: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  summaryCost: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
