import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Home,
  Building2,
  Castle,
  Users,
  Package,
  DoorOpen,
  AlertCircle,
  Crown,
  Star,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useHome } from '@/contexts/HomeContext';
import { useGame } from '@/contexts/GameContext';
import { HOME_TIERS, HomeTierConfig, RoomType } from '@/types/home';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type WizardStep = 'tier' | 'name' | 'rooms' | 'confirm';

const STEP_ORDER: WizardStep[] = ['tier', 'name', 'rooms', 'confirm'];

const TIER_ICONS: Record<number, React.ComponentType<any>> = {
  1: Building2,
  2: Home,
  3: Castle,
  4: Crown,
};

const TIER_GRADIENTS: Record<number, readonly [string, string]> = {
  1: ['#6B7280', '#4B5563'] as const,
  2: ['#3B82F6', '#2563EB'] as const,
  3: ['#8B5CF6', '#7C3AED'] as const,
  4: ['#F59E0B', '#D97706'] as const,
};

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  living_room: 'Living Room',
  bedroom: 'Bedroom',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  garage: 'Garage',
  dining_room: 'Dining Room',
  library: 'Library',
  office: 'Office',
  pool: 'Pool',
  garden: 'Garden',
  storage: 'Storage',
  balcony: 'Balcony',
};

interface TierCardProps {
  tier: HomeTierConfig;
  isSelected: boolean;
  canAfford: boolean;
  onSelect: () => void;
  colors: any;
}

function TierCard({ tier, isSelected, canAfford, onSelect, colors }: TierCardProps) {
  const Icon = TIER_ICONS[tier.id] || Home;
  const gradient = TIER_GRADIENTS[tier.id] || TIER_GRADIENTS[1];

  return (
    <TouchableOpacity
      style={[
        styles.tierCard,
        { backgroundColor: colors.surface },
        isSelected && styles.tierCardSelected,
        !canAfford && styles.tierCardDisabled,
      ]}
      onPress={onSelect}
      disabled={!canAfford}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradient}
        style={styles.tierCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.tierIconContainer}>
          <Icon color="#FFFFFF" size={32} />
        </View>
        {tier.id === 4 && (
          <View style={styles.premiumBadge}>
            <Star color="#FFFFFF" size={10} fill="#FFFFFF" />
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.tierCardContent}>
        <Text style={[styles.tierName, { color: colors.text }]}>{tier.tierName}</Text>
        <Text style={[styles.tierDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {tier.tierDescription}
        </Text>

        <View style={styles.tierStats}>
          <View style={styles.tierStatItem}>
            <DoorOpen color={colors.textLight} size={14} />
            <Text style={[styles.tierStatText, { color: colors.textSecondary }]}>
              {tier.maxRooms} rooms
            </Text>
          </View>
          <View style={styles.tierStatItem}>
            <Package color={colors.textLight} size={14} />
            <Text style={[styles.tierStatText, { color: colors.textSecondary }]}>
              {tier.totalMaxItems} items
            </Text>
          </View>
          <View style={styles.tierStatItem}>
            <Users color={colors.textLight} size={14} />
            <Text style={[styles.tierStatText, { color: colors.textSecondary }]}>
              {tier.maxVisitors} visitors
            </Text>
          </View>
        </View>

        <View style={styles.tierPriceRow}>
          {tier.unlockPrice > 0 ? (
            <Text style={[styles.tierPrice, { color: canAfford ? colors.success : '#EF4444' }]}>
              ${tier.unlockPrice.toLocaleString()}
            </Text>
          ) : (
            <Text style={[styles.tierPriceFree, { color: colors.success }]}>Free</Text>
          )}
          {isSelected && (
            <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
              <Check color="#FFFFFF" size={14} />
            </View>
          )}
        </View>
      </View>

      {!canAfford && (
        <View style={styles.tierCardOverlay}>
          <AlertCircle color="#EF4444" size={20} />
          <Text style={styles.tierCardOverlayText}>Insufficient funds</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HomeCreationScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const { hasHome, currentHome, createHome, upgradeHome, getUpgradeCost } = useHome();
  const { gameState } = useGame();

  const [currentStep, setCurrentStep] = useState<WizardStep>('tier');
  const [selectedTier, setSelectedTier] = useState<number>(hasHome ? (currentHome?.homeTier || 1) + 1 : 1);
  const [homeName, setHomeName] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<RoomType[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const isUpgradeMode = hasHome;
  const bankBalance = gameState?.bankBalance || 0;

  const availableTiers = useMemo(() => {
    if (isUpgradeMode) {
      const currentTier = currentHome?.homeTier || 1;
      return HOME_TIERS.filter(t => t.id > currentTier);
    }
    return HOME_TIERS;
  }, [isUpgradeMode, currentHome]);

  const selectedTierConfig = useMemo(() => {
    return HOME_TIERS.find(t => t.id === selectedTier);
  }, [selectedTier]);

  const tierCost = useMemo(() => {
    if (isUpgradeMode) {
      return getUpgradeCost(selectedTier);
    }
    return selectedTierConfig?.unlockPrice || 0;
  }, [isUpgradeMode, selectedTier, selectedTierConfig, getUpgradeCost]);

  const canAffordSelected = useMemo(() => {
    return bankBalance >= tierCost;
  }, [bankBalance, tierCost]);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEP_ORDER.length - 1;

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'tier':
        return selectedTier > 0 && canAffordSelected;
      case 'name':
        return homeName.trim().length >= 3;
      case 'rooms':
        return selectedRooms.length > 0;
      case 'confirm':
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedTier, canAffordSelected, homeName, selectedRooms]);

  const handleSelectTier = useCallback((tierId: number) => {
    Haptics.selectionAsync();
    setSelectedTier(tierId);
    
    const tier = HOME_TIERS.find(t => t.id === tierId);
    if (tier) {
      setSelectedRooms(tier.defaultRoomTypes);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (!canProceed) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (isLastStep) {
      handleCreateHomeAction();
    } else {
      const nextIndex = currentStepIndex + 1;
      setCurrentStep(STEP_ORDER[nextIndex]);
    }
  }, [canProceed, isLastStep, currentStepIndex]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (isFirstStep) {
      router.back();
    } else {
      const prevIndex = currentStepIndex - 1;
      setCurrentStep(STEP_ORDER[prevIndex]);
    }
  }, [isFirstStep, currentStepIndex, router]);

  const handleCreateHomeAction = useCallback(async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isUpgradeMode) {
        const success = await upgradeHome(selectedTier);
        if (success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Home Upgraded!',
            `Your home has been upgraded to ${selectedTierConfig?.tierName}!`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Upgrade Failed', 'Unable to upgrade your home. Please try again.');
        }
      } else {
        const home = await createHome(selectedTier);
        if (home) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Home Created!',
            `Welcome to your new ${selectedTierConfig?.tierName}!`,
            [{ text: 'Start Decorating', onPress: () => router.replace('/home-editor' as any) }]
          );
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Creation Failed', 'Unable to create your home. Please try again.');
        }
      }
    } catch (error) {
      console.error('[HomeCreation] Error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, isUpgradeMode, selectedTier, selectedTierConfig, createHome, upgradeHome, router]);

  const toggleRoom = useCallback((roomType: RoomType) => {
    Haptics.selectionAsync();
    setSelectedRooms(prev => {
      if (prev.includes(roomType)) {
        return prev.filter(r => r !== roomType);
      }
      
      const maxRooms = selectedTierConfig?.maxRooms || 3;
      if (prev.length >= maxRooms) {
        return prev;
      }
      
      return [...prev, roomType];
    });
  }, [selectedTierConfig]);

  const dynamicStyles = createStyles(colors, isDark);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'tier':
        return (
          <View style={dynamicStyles.stepContent}>
            <Text style={dynamicStyles.stepTitle}>
              {isUpgradeMode ? 'Select Upgrade Tier' : 'Choose Your Home Tier'}
            </Text>
            <Text style={dynamicStyles.stepSubtitle}>
              {isUpgradeMode
                ? 'Upgrade to unlock more rooms, items, and visitors'
                : 'Start with a tier that fits your budget and style'}
            </Text>

            <View style={dynamicStyles.balanceCard}>
              <Text style={dynamicStyles.balanceLabel}>Available Balance</Text>
              <Text style={dynamicStyles.balanceAmount}>${bankBalance.toLocaleString()}</Text>
            </View>

            <ScrollView
              style={dynamicStyles.tierScrollView}
              contentContainerStyle={dynamicStyles.tierScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {availableTiers.map((tier) => {
                const cost = isUpgradeMode ? getUpgradeCost(tier.id) : tier.unlockPrice;
                const affordable = bankBalance >= cost;
                
                return (
                  <TierCard
                    key={tier.id}
                    tier={tier}
                    isSelected={selectedTier === tier.id}
                    canAfford={affordable}
                    onSelect={() => handleSelectTier(tier.id)}
                    colors={colors}
                  />
                );
              })}
            </ScrollView>
          </View>
        );

      case 'name':
        return (
          <View style={dynamicStyles.stepContent}>
            <Text style={dynamicStyles.stepTitle}>Name Your Home</Text>
            <Text style={dynamicStyles.stepSubtitle}>
              Give your {selectedTierConfig?.tierName} a memorable name
            </Text>

            <View style={dynamicStyles.nameInputContainer}>
              <Home color={colors.textLight} size={24} />
              <TextInput
                style={dynamicStyles.nameInput}
                placeholder="Enter home name..."
                placeholderTextColor={colors.textLight}
                value={homeName}
                onChangeText={setHomeName}
                maxLength={30}
                autoFocus
              />
            </View>

            <Text style={dynamicStyles.nameCharCount}>
              {homeName.length}/30 characters
            </Text>

            <View style={dynamicStyles.nameSuggestions}>
              <Text style={dynamicStyles.nameSuggestionsTitle}>Suggestions:</Text>
              <View style={dynamicStyles.nameSuggestionChips}>
                {['My Cozy Place', 'Urban Retreat', 'Dream Home', 'The Sanctuary'].map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={dynamicStyles.nameSuggestionChip}
                    onPress={() => setHomeName(name)}
                  >
                    <Text style={dynamicStyles.nameSuggestionText}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 'rooms':
        return (
          <View style={dynamicStyles.stepContent}>
            <Text style={dynamicStyles.stepTitle}>Select Your Rooms</Text>
            <Text style={dynamicStyles.stepSubtitle}>
              Choose up to {selectedTierConfig?.maxRooms} rooms for your home
            </Text>

            <View style={dynamicStyles.roomCountBadge}>
              <Text style={dynamicStyles.roomCountText}>
                {selectedRooms.length} / {selectedTierConfig?.maxRooms} rooms selected
              </Text>
            </View>

            <ScrollView
              style={dynamicStyles.roomsScrollView}
              contentContainerStyle={dynamicStyles.roomsGrid}
              showsVerticalScrollIndicator={false}
            >
              {(Object.keys(ROOM_TYPE_LABELS) as RoomType[]).map((roomType) => {
                const isSelected = selectedRooms.includes(roomType);
                const isDefault = selectedTierConfig?.defaultRoomTypes.includes(roomType);
                const canSelect = isSelected || selectedRooms.length < (selectedTierConfig?.maxRooms || 3);

                return (
                  <TouchableOpacity
                    key={roomType}
                    style={[
                      dynamicStyles.roomOption,
                      isSelected && dynamicStyles.roomOptionSelected,
                      !canSelect && dynamicStyles.roomOptionDisabled,
                    ]}
                    onPress={() => toggleRoom(roomType)}
                    disabled={!canSelect && !isSelected}
                  >
                    <DoorOpen
                      color={isSelected ? '#FFFFFF' : colors.textSecondary}
                      size={20}
                    />
                    <Text
                      style={[
                        dynamicStyles.roomOptionText,
                        isSelected && dynamicStyles.roomOptionTextSelected,
                      ]}
                    >
                      {ROOM_TYPE_LABELS[roomType]}
                    </Text>
                    {isDefault && !isSelected && (
                      <View style={dynamicStyles.defaultBadge}>
                        <Text style={dynamicStyles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                    {isSelected && (
                      <Check color="#FFFFFF" size={16} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );

      case 'confirm':
        return (
          <View style={dynamicStyles.stepContent}>
            <Text style={dynamicStyles.stepTitle}>Confirm Your Home</Text>
            <Text style={dynamicStyles.stepSubtitle}>
              Review your selections before {isUpgradeMode ? 'upgrading' : 'creating'}
            </Text>

            <View style={dynamicStyles.confirmCard}>
              <LinearGradient
                colors={TIER_GRADIENTS[selectedTier] || TIER_GRADIENTS[1]}
                style={dynamicStyles.confirmCardHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {(() => {
                  const Icon = TIER_ICONS[selectedTier] || Home;
                  return <Icon color="#FFFFFF" size={40} />;
                })()}
                <Text style={dynamicStyles.confirmTierName}>
                  {selectedTierConfig?.tierName}
                </Text>
              </LinearGradient>

              <View style={dynamicStyles.confirmCardBody}>
                <View style={dynamicStyles.confirmRow}>
                  <Text style={dynamicStyles.confirmLabel}>Home Name</Text>
                  <Text style={dynamicStyles.confirmValue}>
                    {homeName || 'Unnamed Home'}
                  </Text>
                </View>

                <View style={dynamicStyles.confirmRow}>
                  <Text style={dynamicStyles.confirmLabel}>Rooms</Text>
                  <Text style={dynamicStyles.confirmValue}>
                    {selectedRooms.length} rooms
                  </Text>
                </View>

                <View style={dynamicStyles.confirmRoomsList}>
                  {selectedRooms.map((room, index) => (
                    <View key={room} style={dynamicStyles.confirmRoomChip}>
                      <Text style={dynamicStyles.confirmRoomChipText}>
                        {ROOM_TYPE_LABELS[room]}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={dynamicStyles.confirmRow}>
                  <Text style={dynamicStyles.confirmLabel}>Max Items</Text>
                  <Text style={dynamicStyles.confirmValue}>
                    {selectedTierConfig?.totalMaxItems} items
                  </Text>
                </View>

                <View style={dynamicStyles.confirmRow}>
                  <Text style={dynamicStyles.confirmLabel}>Max Visitors</Text>
                  <Text style={dynamicStyles.confirmValue}>
                    {selectedTierConfig?.maxVisitors} visitors
                  </Text>
                </View>

                <View style={[dynamicStyles.confirmRow, dynamicStyles.confirmRowTotal]}>
                  <Text style={dynamicStyles.confirmLabelTotal}>
                    {isUpgradeMode ? 'Upgrade Cost' : 'Total Cost'}
                  </Text>
                  <Text style={dynamicStyles.confirmValueTotal}>
                    {tierCost > 0 ? `$${tierCost.toLocaleString()}` : 'Free'}
                  </Text>
                </View>
              </View>
            </View>

            {tierCost > 0 && (
              <View style={dynamicStyles.balanceAfterCard}>
                <Text style={dynamicStyles.balanceAfterLabel}>Balance after purchase:</Text>
                <Text style={dynamicStyles.balanceAfterAmount}>
                  ${(bankBalance - tierCost).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[dynamicStyles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={dynamicStyles.header}>
        <TouchableOpacity style={dynamicStyles.backButton} onPress={handleBack}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>
          {isUpgradeMode ? 'Upgrade Home' : 'Create Home'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={dynamicStyles.progressContainer}>
        {STEP_ORDER.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <React.Fragment key={step}>
              <View
                style={[
                  dynamicStyles.progressDot,
                  isCompleted && dynamicStyles.progressDotCompleted,
                  isCurrent && dynamicStyles.progressDotCurrent,
                ]}
              >
                {isCompleted && <Check color="#FFFFFF" size={12} />}
              </View>
              {index < STEP_ORDER.length - 1 && (
                <View
                  style={[
                    dynamicStyles.progressLine,
                    isCompleted && dynamicStyles.progressLineCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {renderStepContent()}

      <View style={[dynamicStyles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            dynamicStyles.nextButton,
            !canProceed && dynamicStyles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!canProceed || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={dynamicStyles.nextButtonText}>
                {isLastStep
                  ? isUpgradeMode
                    ? 'Confirm Upgrade'
                    : 'Create Home'
                  : 'Continue'}
              </Text>
              {!isLastStep && <ArrowRight color="#FFFFFF" size={20} />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tierCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tierCardSelected: {
    borderColor: '#10B981',
  },
  tierCardDisabled: {
    opacity: 0.6,
  },
  tierCardGradient: {
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  tierIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  tierCardContent: {
    padding: 16,
  },
  tierName: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  tierDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  tierStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  tierStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierStatText: {
    fontSize: 12,
  },
  tierPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  tierPriceFree: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tierCardOverlayText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingVertical: 16,
    },
    progressDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    progressDotCompleted: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    progressDotCurrent: {
      borderColor: colors.primary,
      borderWidth: 3,
    },
    progressLine: {
      flex: 1,
      height: 2,
      backgroundColor: colors.border,
      marginHorizontal: 8,
    },
    progressLineCompleted: {
      backgroundColor: colors.primary,
    },
    stepContent: {
      flex: 1,
      paddingHorizontal: 16,
    },
    stepTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
    },
    stepSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 20,
      lineHeight: 22,
    },
    balanceCard: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    balanceLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    balanceAmount: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.success,
    },
    tierScrollView: {
      flex: 1,
    },
    tierScrollContent: {
      paddingBottom: 20,
    },
    nameInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 4,
      marginBottom: 12,
      gap: 12,
    },
    nameInput: {
      flex: 1,
      fontSize: 18,
      color: colors.text,
      paddingVertical: 16,
    },
    nameCharCount: {
      fontSize: 12,
      color: colors.textLight,
      textAlign: 'right',
      marginBottom: 24,
    },
    nameSuggestions: {
      marginTop: 8,
    },
    nameSuggestionsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 12,
    },
    nameSuggestionChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    nameSuggestionChip: {
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
    },
    nameSuggestionText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '500',
    },
    roomCountBadge: {
      backgroundColor: colors.surface,
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 16,
    },
    roomCountText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    roomsScrollView: {
      flex: 1,
    },
    roomsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingBottom: 20,
    },
    roomOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 8,
      minWidth: (SCREEN_WIDTH - 32 - 10) / 2,
    },
    roomOptionSelected: {
      backgroundColor: colors.primary,
    },
    roomOptionDisabled: {
      opacity: 0.5,
    },
    roomOptionText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
    },
    roomOptionTextSelected: {
      color: '#FFFFFF',
    },
    defaultBadge: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    defaultBadgeText: {
      fontSize: 9,
      fontWeight: '600',
      color: colors.textLight,
    },
    confirmCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 16,
    },
    confirmCardHeader: {
      padding: 24,
      alignItems: 'center',
      gap: 12,
    },
    confirmTierName: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    confirmCardBody: {
      padding: 20,
    },
    confirmRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    confirmRowTotal: {
      borderBottomWidth: 0,
      paddingTop: 16,
      marginTop: 8,
    },
    confirmLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    confirmValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    confirmLabelTotal: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    confirmValueTotal: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.primary,
    },
    confirmRoomsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingVertical: 12,
    },
    confirmRoomChip: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    confirmRoomChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
    },
    balanceAfterCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
    },
    balanceAfterLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    balanceAfterAmount: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    nextButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      gap: 8,
    },
    nextButtonDisabled: {
      backgroundColor: colors.textLight,
      opacity: 0.5,
    },
    nextButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
