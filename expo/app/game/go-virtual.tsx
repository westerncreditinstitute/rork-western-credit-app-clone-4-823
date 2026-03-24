import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  MapPin,
  ChevronRight,
  ChevronLeft,
  X,
  Star,
  DollarSign,
  Eye,
  Footprints,
  Compass,
  RotateCcw,
  RotateCw,
  Building2,
  Home,
  Umbrella,
  Map,
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowDown,
  ShoppingBag,
  Coins,
  Trophy,
  Target,
  Flame,
  Gift,
  Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useScavengerHunt } from '@/contexts/ScavengerHuntContext';
import { useWalletUnlock } from '@/contexts/WalletUnlockContext';
import { RARITY_CONFIG, TREASURE_TYPE_CONFIG, MAX_DAILY_TREASURES, TreasureLocation } from '@/types/scavengerHunt';
import AnimatedTreasureChest from '@/components/AnimatedTreasureChest';
import AnimatedTokenFountain from '@/components/AnimatedTokenFountain';
import AnimatedGoldenMuso from '@/components/AnimatedGoldenMuso';
import AnimatedCrystalVault from '@/components/AnimatedCrystalVault';
import AnimatedCoinPile from '@/components/AnimatedCoinPile';
import {
  getCity3DConfig,
  getCityIdMapping,
  getBlockAt,
  getAdjacentBlocks,
  getDirectionLabel,
  turnLeft,
  turnRight,
  moveForward,
  moveBackward,
  Building3D,
  PlayerPosition,
} from '@/mocks/virtualCity3DData';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUILDING_SCALE = 0.55;

const BUILDING_TYPE_ICONS: Record<string, typeof Building2> = {
  residential: Home,
  commercial: ShoppingBag,
  landmark: Star,
  skyscraper: Building2,
  park: MapPin,
  beach: Umbrella,
};

type ViewMode = 'landing' | 'overhead' | 'street';

interface BlockTreasure {
  treasure: TreasureLocation;
  blockX: number;
  blockY: number;
}

export default function GoVirtualScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { gameState, mintTokens } = useGame();
  const { isWalletUnlocked } = useWalletUnlock();
  const {
    treasures,
    dailyProgress,
    huntStreak,
    dailyClaimsRemaining,
    selectedTreasure,
    selectTreasure,
    claimTreasure,
    isTreasureClaimed,
    refreshDailyTreasures: _refreshDailyTreasures,
    isLoading: _huntLoading,
  } = useScavengerHunt();

  const cityId = gameState.lifestyle?.cityId || 'city_los_angeles';
  const mapped3DCityId = useMemo(() => getCityIdMapping(cityId), [cityId]);
  const city3D = useMemo(() => getCity3DConfig(mapped3DCityId), [mapped3DCityId]);

  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [playerPos, setPlayerPos] = useState<PlayerPosition>({ blockX: 0, blockY: 0, facing: 'south' });
  const [selectedBuilding, setSelectedBuilding] = useState<Building3D | null>(null);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [visitedBlocks, setVisitedBlocks] = useState<Set<string>>(new Set(['0_0']));
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showTreasureModal, setShowTreasureModal] = useState(false);
  const [showTreasurePanel] = useState(true);
  const [_claimedInSession, setClaimedInSession] = useState<Set<string>>(new Set());
  const [claimResult, setClaimResult] = useState<{ success: boolean; tokensAwarded: number; message: string } | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const heroScale = useRef(new Animated.Value(1.1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const viewTransition = useRef(new Animated.Value(0)).current;
  const streetTransition = useRef(new Animated.Value(1)).current;
  const buildingEntrance = useRef(new Animated.Value(0)).current;
  const treasureGlow = useRef(new Animated.Value(0)).current;
  const treasureBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(heroScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(treasureGlow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(treasureGlow, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    glow.start();

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(treasureBounce, { toValue: -8, duration: 1000, useNativeDriver: true }),
        Animated.timing(treasureBounce, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    bounce.start();

    return () => {
      pulse.stop();
      glow.stop();
      bounce.stop();
    };
  }, [fadeAnim, slideAnim, heroScale, pulseAnim, treasureGlow, treasureBounce]);

  const blockTreasures = useMemo((): BlockTreasure[] => {
    if (!city3D || treasures.length === 0) return [];
    const totalBlocks = city3D.blocks.length;
    return treasures.map((treasure, index) => ({
      treasure,
      blockX: city3D.blocks[index % totalBlocks].gridX,
      blockY: city3D.blocks[index % totalBlocks].gridY,
    }));
  }, [city3D, treasures]);

  const currentBlockTreasures = useMemo(() => {
    return blockTreasures.filter(
      bt => bt.blockX === playerPos.blockX && bt.blockY === playerPos.blockY
    );
  }, [blockTreasures, playerPos.blockX, playerPos.blockY]);

  const unclaimedTreasureCount = useMemo(() => {
    return blockTreasures.filter(bt => !isTreasureClaimed(bt.treasure.id)).length;
  }, [blockTreasures, isTreasureClaimed]);

  const currentBlock = useMemo(() => {
    if (!city3D) return null;
    return getBlockAt(city3D, playerPos.blockX, playerPos.blockY);
  }, [city3D, playerPos.blockX, playerPos.blockY]);

  const adjacentBlocks = useMemo(() => {
    if (!city3D) return { north: null, south: null, east: null, west: null };
    return getAdjacentBlocks(city3D, playerPos.blockX, playerPos.blockY);
  }, [city3D, playerPos.blockX, playerPos.blockY]);

  const forwardBlock = useMemo(() => {
    return adjacentBlocks[playerPos.facing] || null;
  }, [adjacentBlocks, playerPos.facing]);

  const handleEnterCity = useCallback((mode: ViewMode) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    Animated.timing(viewTransition, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setViewMode(mode);
      viewTransition.setValue(0);
    });
    console.log('[GoVirtual3D] Entered city in mode:', mode);
  }, [viewTransition]);

  const animateStreetTransition = useCallback((callback: () => void) => {
    Animated.sequence([
      Animated.timing(streetTransition, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(buildingEntrance, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start(() => {
      callback();
      Animated.parallel([
        Animated.timing(streetTransition, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(buildingEntrance, { toValue: 1, useNativeDriver: true, tension: 40, friction: 7 }),
      ]).start();
    });
  }, [streetTransition, buildingEntrance]);

  const handleMove = useCallback((direction: 'forward' | 'backward') => {
    if (!city3D) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    animateStreetTransition(() => {
      setPlayerPos(prev => {
        const newPos = direction === 'forward'
          ? moveForward(prev, city3D.gridSize)
          : moveBackward(prev, city3D.gridSize);
        setVisitedBlocks(visited => new Set(visited).add(`${newPos.blockX}_${newPos.blockY}`));
        console.log('[GoVirtual3D] Moved', direction, 'to', newPos.blockX, newPos.blockY);
        return newPos;
      });
    });
  }, [city3D, animateStreetTransition]);

  const handleTurn = useCallback((direction: 'left' | 'right') => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPlayerPos(prev => ({
      ...prev,
      facing: direction === 'left' ? turnLeft(prev.facing) : turnRight(prev.facing),
    }));
    console.log('[GoVirtual3D] Turned', direction);
  }, []);

  const handleSelectBuilding = useCallback((building: Building3D) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedBuilding(building);
    setShowBuildingModal(true);
    console.log('[GoVirtual3D] Selected building:', building.name);
  }, []);

  const handleBlockTap = useCallback((x: number, y: number) => {
    if (!city3D) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const targetBlock = getBlockAt(city3D, x, y);
    if (targetBlock) {
      animateStreetTransition(() => {
        setPlayerPos(prev => ({ ...prev, blockX: x, blockY: y }));
        setVisitedBlocks(visited => new Set(visited).add(`${x}_${y}`));
      });
    }
  }, [city3D, animateStreetTransition]);

  const handleTreasureTap = useCallback((treasure: TreasureLocation) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    selectTreasure(treasure);
    setClaimResult(null);
    setShowTreasureModal(true);
    console.log('[GoVirtual3D] Tapped treasure:', treasure.name);
  }, [selectTreasure]);

  const handleClaimTreasureInCity = useCallback(() => {
    if (!selectedTreasure) return;
    if (dailyClaimsRemaining <= 0) {
      Alert.alert('Daily Limit Reached', `You've claimed all ${MAX_DAILY_TREASURES} treasures for today. Come back tomorrow!`);
      return;
    }

    const result = claimTreasure(selectedTreasure.id);
    setClaimResult(result);

    if (result.success) {
      setClaimedInSession(prev => new Set(prev).add(selectedTreasure.id));
      if (isWalletUnlocked) {
        mintTokens(result.tokensAwarded, 'Scavenger Hunt: ' + selectedTreasure.name, {
          source: 'scavenger_hunt',
          category: 'treasure_claim',
          relatedId: selectedTreasure.id,
        });
      } else {
        Alert.alert(
          'MUSO Wallet Locked',
          'You need to unlock your MUSO Wallet ($25) to earn MUSO tokens. Visit the Token Wallet page to activate.',
        );
      }
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      console.log('[GoVirtual3D] Treasure claimed:', selectedTreasure.name, 'tokens:', result.tokensAwarded);
    } else {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }
  }, [selectedTreasure, dailyClaimsRemaining, claimTreasure, isWalletUnlocked, mintTokens]);

  const closeTreasureModal = useCallback(() => {
    setShowTreasureModal(false);
    setClaimResult(null);
    selectTreasure(null);
  }, [selectTreasure]);

  useEffect(() => {
    if (viewMode === 'street') {
      buildingEntrance.setValue(0);
      Animated.spring(buildingEntrance, { toValue: 1, useNativeDriver: true, tension: 35, friction: 8 }).start();
    }
  }, [viewMode, buildingEntrance]);

  const renderTreasureIcon = useCallback((treasure: TreasureLocation, size: number) => {
    const typeConfig = TREASURE_TYPE_CONFIG[treasure.treasureType];
    if (typeConfig.imageUrl && treasure.treasureType === 'treasure_chest') {
      return <AnimatedTreasureChest imageUrl={typeConfig.imageUrl} size={size} />;
    } else if (typeConfig.imageUrl && treasure.treasureType === 'token_fountain') {
      return <AnimatedTokenFountain imageUrl={typeConfig.imageUrl} size={size} />;
    } else if (typeConfig.imageUrl && treasure.treasureType === 'golden_muso') {
      return <AnimatedGoldenMuso imageUrl={typeConfig.imageUrl} size={size} />;
    } else if (typeConfig.imageUrl && treasure.treasureType === 'crystal_vault') {
      return <AnimatedCrystalVault imageUrl={typeConfig.imageUrl} size={size} />;
    } else if (typeConfig.imageUrl && treasure.treasureType === 'coin_pile') {
      return <AnimatedCoinPile imageUrl={typeConfig.imageUrl} size={size} />;
    } else if (typeConfig.imageUrl) {
      return <Image source={{ uri: typeConfig.imageUrl }} style={{ width: size, height: size }} resizeMode="contain" />;
    }
    return <Text style={{ fontSize: size * 0.6 }}>{treasure.icon}</Text>;
  }, []);

  const getBlockTreasureCount = useCallback((blockX: number, blockY: number): number => {
    return blockTreasures.filter(
      bt => bt.blockX === blockX && bt.blockY === blockY && !isTreasureClaimed(bt.treasure.id)
    ).length;
  }, [blockTreasures, isTreasureClaimed]);

  if (!city3D) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Go Virtual', headerShown: true }} />
        <View style={styles.errorContainer}>
          <MapPin size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>City not available</Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
            Your current city doesn&apos;t have virtual exploration yet.
          </Text>
        </View>
      </View>
    );
  }

  if (viewMode === 'landing') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: '#0A0A0A' }]}>
          <Animated.View style={[styles.heroContainer, { transform: [{ scale: heroScale }] }]}>
            <Image source={{ uri: city3D.heroImageUrl }} style={styles.heroImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)', '#0A0A0A']}
              locations={[0, 0.3, 0.65, 1]}
              style={styles.heroGradient}
            />
          </Animated.View>

          <SafeAreaView style={styles.heroContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ChevronLeft size={24} color="#FFF" />
            </TouchableOpacity>

            <Animated.View style={[styles.heroTextContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.cityBadge}>
                <Text style={styles.weatherEmoji}>{city3D.weatherEmoji}</Text>
                <Text style={styles.temperatureText}>{city3D.temperature}</Text>
              </View>

              <Text style={styles.heroTagline}>{city3D.tagline}</Text>
              <Text style={styles.heroCityName}>{city3D.cityName}</Text>

              <View style={styles.cityStatsRow}>
                <View style={styles.cityStatChip}>
                  <MapPin size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.cityStatText}>{city3D.population}</Text>
                </View>
                <View style={styles.cityStatChip}>
                  <DollarSign size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.cityStatText}>{city3D.avgRent}</Text>
                </View>
                <View style={styles.cityStatChip}>
                  <Building2 size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.cityStatText}>{city3D.blocks.length * 3} buildings</Text>
                </View>
              </View>

              {treasures.length > 0 && (
                <View style={styles.treasureHuntBanner}>
                  <LinearGradient
                    colors={['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.05)']}
                    style={styles.treasureHuntBannerGradient}
                  >
                    <View style={styles.treasureHuntBannerLeft}>
                      <Animated.View style={{ transform: [{ translateY: treasureBounce }] }}>
                        <Text style={styles.treasureHuntEmoji}>🗺️</Text>
                      </Animated.View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.treasureHuntBannerTitle}>Treasure Hunt Active!</Text>
                        <Text style={styles.treasureHuntBannerSub}>
                          {unclaimedTreasureCount} treasures hidden in the city · {dailyClaimsRemaining} claims left
                        </Text>
                      </View>
                    </View>
                    <View style={styles.treasureHuntBannerStats}>
                      <View style={styles.treasureHuntStatChip}>
                        <Flame size={10} color="#F59E0B" />
                        <Text style={styles.treasureHuntStatText}>{huntStreak.currentStreak}d</Text>
                      </View>
                      <View style={styles.treasureHuntStatChip}>
                        <Coins size={10} color="#F59E0B" />
                        <Text style={styles.treasureHuntStatText}>{dailyProgress.totalTokensEarned}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              )}

              <View style={styles.enterButtonsRow}>
                <Animated.View style={[styles.enterButtonWrapper, { transform: [{ scale: pulseAnim }] }]}>
                  <TouchableOpacity style={styles.enterButton} onPress={() => handleEnterCity('street')} activeOpacity={0.85}>
                    <LinearGradient colors={['#FF6B35', '#FF4444', '#CC2936']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.enterButtonGradient}>
                      <Footprints size={20} color="#FFF" />
                      <Text style={styles.enterButtonText}>Walk & Hunt Treasures</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity style={styles.enterButtonSecondary} onPress={() => handleEnterCity('overhead')} activeOpacity={0.85}>
                  <LinearGradient colors={['#1E3A5F', '#2C5F8A', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.enterButtonGradient}>
                    <Map size={20} color="#FFF" />
                    <Text style={styles.enterButtonText}>City Overview</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <Text style={styles.enterSubtext}>Explore {city3D.cityName} in 3D · Find Hidden MUSO Treasures</Text>
            </Animated.View>
          </SafeAreaView>
        </View>
      </>
    );
  }

  if (viewMode === 'overhead') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: '#0D1117' }]}>
          <LinearGradient colors={city3D.skyColor} style={styles.skyGradient} />

          <SafeAreaView style={styles.overheadSafeArea} edges={['top']}>
            <View style={styles.overheadHeader}>
              <TouchableOpacity style={styles.overheadBackBtn} onPress={() => setViewMode('landing')}>
                <ChevronLeft size={22} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.overheadHeaderCenter}>
                <Text style={styles.overheadCityLabel}>{city3D.cityName}</Text>
                <Text style={styles.overheadSubLabel}>TREASURE HUNT MAP</Text>
              </View>
              <TouchableOpacity style={styles.overheadBackBtn} onPress={() => { setViewMode('street'); }}>
                <Footprints size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <View style={styles.isometricGrid}>
            {city3D.blocks.map((block) => {
              const isPlayerHere = block.gridX === playerPos.blockX && block.gridY === playerPos.blockY;
              const isVisited = visitedBlocks.has(`${block.gridX}_${block.gridY}`);
              const blockTreasureCount = getBlockTreasureCount(block.gridX, block.gridY);
              const offsetX = (block.gridX - block.gridY) * 95;
              const offsetY = (block.gridX + block.gridY) * 55;

              return (
                <TouchableOpacity
                  key={block.id}
                  style={[
                    styles.isoBlock,
                    {
                      left: SCREEN_WIDTH / 2 + offsetX - 90,
                      top: 60 + offsetY,
                    },
                  ]}
                  onPress={() => handleBlockTap(block.gridX, block.gridY)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.isoBlockGround, { backgroundColor: isPlayerHere ? '#FF6B3540' : isVisited ? '#3B82F620' : '#1A1A2E' }]}>
                    {block.buildings.map((building, bi) => {
                      const bHeight = Math.min(building.height * 0.35, 100);
                      const bWidth = 50;
                      return (
                        <View
                          key={building.id}
                          style={[
                            styles.isoBuilding,
                            {
                              height: bHeight,
                              width: bWidth,
                              backgroundColor: building.color,
                              left: bi * 55 + 10,
                              bottom: 0,
                              borderColor: building.accentColor,
                            },
                          ]}
                        >
                          {Array.from({ length: Math.min(Math.floor(bHeight / 12), 6) }).map((_, wi) => (
                            <View
                              key={wi}
                              style={[
                                styles.isoBuildingWindow,
                                {
                                  backgroundColor: building.windowColor,
                                  top: 6 + wi * 12,
                                },
                              ]}
                            />
                          ))}
                          {building.isForSale && (
                            <View style={styles.isoForSaleDot} />
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {isPlayerHere && (
                    <View style={styles.isoPlayerMarker}>
                      <View style={styles.isoPlayerDot} />
                    </View>
                  )}

                  {blockTreasureCount > 0 && (
                    <Animated.View style={[styles.isoTreasureMarker, { opacity: treasureGlow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }]}>
                      <View style={styles.isoTreasureBadge}>
                        <Text style={styles.isoTreasureIcon}>💰</Text>
                        <Text style={styles.isoTreasureCount}>{blockTreasureCount}</Text>
                      </View>
                    </Animated.View>
                  )}

                  <Text style={styles.isoBlockLabel} numberOfLines={1}>{block.neighborhood}</Text>
                  <Text style={styles.isoBlockStreet} numberOfLines={1}>{block.streetName}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.overheadLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B35' }]} />
              <Text style={styles.legendText}>You</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={{ fontSize: 10 }}>💰</Text>
              <Text style={styles.legendText}>Treasure</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>For Sale</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Visited</Text>
            </View>
          </View>

          <View style={styles.overheadStats}>
            <View style={styles.overheadStatItem}>
              <Text style={styles.overheadStatNumber}>{visitedBlocks.size}</Text>
              <Text style={styles.overheadStatLabel}>Explored</Text>
            </View>
            <View style={styles.overheadStatDivider} />
            <View style={styles.overheadStatItem}>
              <Text style={[styles.overheadStatNumber, { color: '#F59E0B' }]}>{unclaimedTreasureCount}</Text>
              <Text style={styles.overheadStatLabel}>Treasures</Text>
            </View>
            <View style={styles.overheadStatDivider} />
            <View style={styles.overheadStatItem}>
              <Text style={styles.overheadStatNumber}>{dailyClaimsRemaining}</Text>
              <Text style={styles.overheadStatLabel}>Claims Left</Text>
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: '#0D1117' }]}>
        <LinearGradient colors={city3D.skyColor} style={styles.skyGradient} />

        <SafeAreaView style={styles.streetSafeArea} edges={['top']}>
          <View style={styles.streetHeader}>
            <TouchableOpacity style={styles.streetHeaderBtn} onPress={() => setViewMode('landing')}>
              <ChevronLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.streetHeaderCenter}>
              <Text style={styles.streetHeaderNeighborhood}>{currentBlock?.neighborhood || ''}</Text>
              <Text style={styles.streetHeaderStreet}>{currentBlock?.streetName || ''}</Text>
            </View>
            <TouchableOpacity style={styles.streetHeaderBtn} onPress={() => setViewMode('overhead')}>
              <Map size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={styles.compassBar}>
          <Compass size={14} color="#FF6B35" />
          <Text style={styles.compassText}>Facing {playerPos.facing.charAt(0).toUpperCase() + playerPos.facing.slice(1)}</Text>
          <View style={styles.compassDirectionDot}>
            <Text style={styles.compassDirectionText}>{getDirectionLabel(playerPos.facing)}</Text>
          </View>
          {currentBlockTreasures.length > 0 && (
            <View style={styles.compassTreasureIndicator}>
              <Text style={styles.compassTreasureText}>💰 {currentBlockTreasures.filter(bt => !isTreasureClaimed(bt.treasure.id)).length}</Text>
            </View>
          )}
        </View>

        <Animated.View style={[styles.streetView, { opacity: streetTransition }]}>
          <View style={styles.streetScene}>
            <View style={styles.roadSurface}>
              <LinearGradient
                colors={['#555555', '#444444', '#333333']}
                style={styles.roadGradient}
              />
              <View style={styles.roadLine} />
              <View style={[styles.roadLine, { left: '65%' as any }]} />
              <View style={styles.roadCenterLine} />
              {[0.2, 0.4, 0.6, 0.8].map((pos, i) => (
                <View key={i} style={[styles.roadDash, { top: `${pos * 100}%` as any }]} />
              ))}
            </View>

            <Animated.View style={[styles.buildingsLeft, { transform: [{ scale: buildingEntrance }] }]}>
              {currentBlock?.buildings.slice(0, 2).map((building) => (
                <TouchableOpacity
                  key={building.id}
                  style={[styles.streetBuilding, styles.streetBuildingLeft]}
                  onPress={() => handleSelectBuilding(building)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.buildingFacade,
                    {
                      height: Math.min(building.height * BUILDING_SCALE, 200),
                      backgroundColor: building.color,
                      borderColor: building.accentColor,
                    },
                  ]}>
                    <View style={[styles.buildingRoof, { backgroundColor: building.accentColor }]} />
                    <View style={styles.windowGrid}>
                      {Array.from({ length: Math.min(building.floors, 8) }).map((_, fi) => (
                        <View key={fi} style={styles.windowRow}>
                          {Array.from({ length: 3 }).map((__, wi) => (
                            <View key={wi} style={[styles.windowPane, { backgroundColor: building.windowColor }]} />
                          ))}
                        </View>
                      ))}
                    </View>
                    <View style={[styles.buildingDoor, { backgroundColor: building.accentColor }]} />
                    {building.isForSale && (
                      <View style={styles.forSaleBanner}>
                        <DollarSign size={8} color="#FFF" />
                        <Text style={styles.forSaleText}>FOR SALE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.buildingLabel} numberOfLines={1}>{building.name}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>

            <Animated.View style={[styles.buildingsRight, { transform: [{ scale: buildingEntrance }] }]}>
              {currentBlock?.buildings.slice(1, 3).map((building) => (
                <TouchableOpacity
                  key={building.id}
                  style={[styles.streetBuilding, styles.streetBuildingRight]}
                  onPress={() => handleSelectBuilding(building)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.buildingFacade,
                    {
                      height: Math.min(building.height * BUILDING_SCALE, 200),
                      backgroundColor: building.color,
                      borderColor: building.accentColor,
                    },
                  ]}>
                    <View style={[styles.buildingRoof, { backgroundColor: building.accentColor }]} />
                    <View style={styles.windowGrid}>
                      {Array.from({ length: Math.min(building.floors, 8) }).map((_, fi) => (
                        <View key={fi} style={styles.windowRow}>
                          {Array.from({ length: 3 }).map((__, wi) => (
                            <View key={wi} style={[styles.windowPane, { backgroundColor: building.windowColor }]} />
                          ))}
                        </View>
                      ))}
                    </View>
                    <View style={[styles.buildingDoor, { backgroundColor: building.accentColor }]} />
                    {building.isForSale && (
                      <View style={styles.forSaleBanner}>
                        <DollarSign size={8} color="#FFF" />
                        <Text style={styles.forSaleText}>FOR SALE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.buildingLabel} numberOfLines={1}>{building.name}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>

            {currentBlockTreasures.filter(bt => !isTreasureClaimed(bt.treasure.id)).length > 0 && (
              <View style={styles.streetTreasureFloat}>
                {currentBlockTreasures.filter(bt => !isTreasureClaimed(bt.treasure.id)).slice(0, 2).map((bt, idx) => {
                  const rarity = RARITY_CONFIG[bt.treasure.rarity];
                  return (
                    <TouchableOpacity
                      key={bt.treasure.id}
                      onPress={() => handleTreasureTap(bt.treasure)}
                      activeOpacity={0.7}
                    >
                      <Animated.View
                        style={[
                          styles.streetTreasureItem,
                          {
                            transform: [{ translateY: treasureBounce }],
                            left: idx === 0 ? -20 : 20,
                          },
                        ]}
                      >
                        <View style={[styles.streetTreasureGlow, { backgroundColor: rarity.color + '30', borderColor: rarity.color }]}>
                          {renderTreasureIcon(bt.treasure, 44)}
                        </View>
                        <View style={[styles.streetTreasureReward, { backgroundColor: rarity.color }]}>
                          <Coins size={8} color="#FFF" />
                          <Text style={styles.streetTreasureRewardText}>{bt.treasure.tokenReward}</Text>
                        </View>
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {forwardBlock && (
              <View style={styles.distantBuildings}>
                {forwardBlock.buildings.map((building, i) => (
                  <View
                    key={building.id}
                    style={[
                      styles.distantBuilding,
                      {
                        height: Math.min(building.height * 0.2, 50),
                        width: 20 + i * 5,
                        backgroundColor: building.color + '88',
                        left: 30 + i * 35,
                      },
                    ]}
                  />
                ))}
                <Text style={styles.distantLabel}>{forwardBlock.neighborhood}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <View style={styles.blockInfoBar}>
          <View style={styles.blockInfoContent}>
            <Text style={styles.blockInfoName}>{currentBlock?.name || 'Unknown'}</Text>
            <Text style={styles.blockInfoDetails}>
              {currentBlock?.buildings.length || 0} buildings · {currentBlockTreasures.filter(bt => !isTreasureClaimed(bt.treasure.id)).length} treasures nearby
            </Text>
          </View>
        </View>

        {showTreasurePanel && currentBlockTreasures.length > 0 && (
          <View style={styles.treasurePanelContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.treasurePanelContent}
            >
              {currentBlockTreasures.map((bt) => {
                const claimed = isTreasureClaimed(bt.treasure.id);
                const rarity = RARITY_CONFIG[bt.treasure.rarity];
                return (
                  <TouchableOpacity
                    key={bt.treasure.id}
                    style={[
                      styles.treasurePanelCard,
                      { borderColor: claimed ? 'rgba(255,255,255,0.1)' : rarity.color, opacity: claimed ? 0.5 : 1 },
                    ]}
                    onPress={() => !claimed && handleTreasureTap(bt.treasure)}
                    disabled={claimed}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.treasurePanelIcon, { backgroundColor: rarity.bgColor }]}>
                      {claimed ? (
                        <Text style={{ fontSize: 20 }}>✅</Text>
                      ) : (
                        renderTreasureIcon(bt.treasure, 32)
                      )}
                    </View>
                    <View style={styles.treasurePanelInfo}>
                      <Text style={styles.treasurePanelName} numberOfLines={1}>{bt.treasure.name}</Text>
                      <View style={styles.treasurePanelRewardRow}>
                        <View style={[styles.treasurePanelRarity, { backgroundColor: rarity.bgColor }]}>
                          <Text style={[styles.treasurePanelRarityText, { color: rarity.color }]}>{rarity.label}</Text>
                        </View>
                        <Coins size={10} color="#F59E0B" />
                        <Text style={styles.treasurePanelRewardText}>{bt.treasure.tokenReward}</Text>
                      </View>
                    </View>
                    {!claimed && <ChevronRight size={14} color="rgba(255,255,255,0.4)" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {currentBlockTreasures.length === 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.buildingCarousel}
            contentContainerStyle={styles.buildingCarouselContent}
          >
            {currentBlock?.buildings.map((building) => {
              const IconComp = BUILDING_TYPE_ICONS[building.type] || Building2;
              return (
                <TouchableOpacity
                  key={building.id}
                  style={styles.buildingCard}
                  onPress={() => handleSelectBuilding(building)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.buildingCardIcon, { backgroundColor: building.color + '30' }]}>
                    <IconComp size={18} color={building.accentColor} />
                  </View>
                  <View style={styles.buildingCardInfo}>
                    <Text style={styles.buildingCardName} numberOfLines={1}>{building.name}</Text>
                    <Text style={styles.buildingCardType}>
                      {building.type.charAt(0).toUpperCase() + building.type.slice(1)} · {building.floors}F
                    </Text>
                  </View>
                  {building.isForSale && (
                    <View style={styles.buildingCardSale}>
                      <Text style={styles.buildingCardPrice}>
                        ${((building.propertyValue || 0) / 1000000).toFixed(1)}M
                      </Text>
                    </View>
                  )}
                  <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.controlsContainer}>
          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlBtn} onPress={() => handleTurn('left')}>
              <RotateCcw size={20} color="#FFF" />
              <Text style={styles.controlLabel}>Turn L</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtnMain} onPress={() => handleMove('forward')}>
              <ArrowUp size={24} color="#FFF" />
              <Text style={styles.controlLabelMain}>Forward</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={() => handleTurn('right')}>
              <RotateCw size={20} color="#FFF" />
              <Text style={styles.controlLabel}>Turn R</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.controlBtnBack} onPress={() => handleMove('backward')}>
            <ArrowDown size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.controlLabelBack}>Back</Text>
          </TouchableOpacity>
        </View>

        {showMiniMap && (
          <View style={styles.miniMap}>
            <TouchableOpacity style={styles.miniMapClose} onPress={() => setShowMiniMap(false)}>
              <Minimize2 size={10} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            {city3D.blocks.map((block) => {
              const isPlayer = block.gridX === playerPos.blockX && block.gridY === playerPos.blockY;
              const isVisited = visitedBlocks.has(`${block.gridX}_${block.gridY}`);
              const hasTreasure = getBlockTreasureCount(block.gridX, block.gridY) > 0;
              return (
                <TouchableOpacity
                  key={block.id}
                  style={[
                    styles.miniMapBlock,
                    {
                      left: 6 + block.gridX * 22,
                      top: 18 + block.gridY * 22,
                      backgroundColor: isPlayer ? '#FF6B35' : hasTreasure ? '#F59E0B' : isVisited ? '#3B82F6' : '#333',
                    },
                  ]}
                  onPress={() => handleBlockTap(block.gridX, block.gridY)}
                />
              );
            })}
          </View>
        )}

        {!showMiniMap && (
          <TouchableOpacity style={styles.showMapBtn} onPress={() => setShowMiniMap(true)}>
            <Map size={16} color="#FFF" />
          </TouchableOpacity>
        )}

        <View style={styles.statsFloater}>
          <View style={styles.statsFloaterItem}>
            <Footprints size={12} color="#FF6B35" />
            <Text style={styles.statsFloaterText}>{visitedBlocks.size}/{city3D.blocks.length}</Text>
          </View>
          <View style={[styles.statsFloaterItem, { marginTop: 4 }]}>
            <Coins size={12} color="#F59E0B" />
            <Text style={styles.statsFloaterText}>{dailyProgress.totalTokensEarned}</Text>
          </View>
        </View>

        {/* Building Detail Modal */}
        <Modal visible={showBuildingModal && selectedBuilding !== null} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
              {selectedBuilding && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={[styles.modalIconBg, { backgroundColor: selectedBuilding.color + '30' }]}>
                      {(() => {
                        const IC = BUILDING_TYPE_ICONS[selectedBuilding.type] || Building2;
                        return <IC size={28} color={selectedBuilding.accentColor} />;
                      })()}
                    </View>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowBuildingModal(false)}>
                      <X size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.modalBuildingName, { color: colors.text }]}>{selectedBuilding.name}</Text>
                  <View style={styles.modalTypeRow}>
                    <View style={[styles.modalTypeChip, { backgroundColor: selectedBuilding.color + '20' }]}>
                      <Text style={[styles.modalTypeText, { color: selectedBuilding.accentColor }]}>
                        {selectedBuilding.type.charAt(0).toUpperCase() + selectedBuilding.type.slice(1)}
                      </Text>
                    </View>
                    <Text style={[styles.modalNeighborhood, { color: colors.textSecondary }]}>
                      {selectedBuilding.neighborhood}
                    </Text>
                  </View>

                  <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                    {selectedBuilding.description}
                  </Text>

                  <View style={styles.modalStatsGrid}>
                    <View style={[styles.modalStatCard, { backgroundColor: isDark ? '#252540' : '#F5F5F5' }]}>
                      <Building2 size={16} color="#3B82F6" />
                      <Text style={[styles.modalStatValue, { color: colors.text }]}>{selectedBuilding.floors}</Text>
                      <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Floors</Text>
                    </View>
                    <View style={[styles.modalStatCard, { backgroundColor: isDark ? '#252540' : '#F5F5F5' }]}>
                      <Maximize2 size={16} color="#10B981" />
                      <Text style={[styles.modalStatValue, { color: colors.text }]}>{selectedBuilding.height}ft</Text>
                      <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Height</Text>
                    </View>
                    {selectedBuilding.isForSale && (
                      <View style={[styles.modalStatCard, { backgroundColor: isDark ? '#252540' : '#F5F5F5' }]}>
                        <DollarSign size={16} color="#F59E0B" />
                        <Text style={[styles.modalStatValue, { color: colors.text }]}>
                          ${((selectedBuilding.propertyValue || 0) / 1000000).toFixed(1)}M
                        </Text>
                        <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Value</Text>
                      </View>
                    )}
                  </View>

                  {selectedBuilding.isForSale && (
                    <View style={styles.modalSaleSection}>
                      <LinearGradient colors={['#10B98120', '#10B98110']} style={styles.modalSaleGradient}>
                        <View style={styles.modalSaleRow}>
                          <View>
                            <Text style={[styles.modalSaleLabel, { color: colors.textSecondary }]}>Purchase Price</Text>
                            <Text style={[styles.modalSaleValue, { color: '#10B981' }]}>
                              ${(selectedBuilding.propertyValue || 0).toLocaleString()}
                            </Text>
                          </View>
                          <View style={styles.modalSaleRight}>
                            <Text style={[styles.modalSaleLabel, { color: colors.textSecondary }]}>Monthly Rent</Text>
                            <Text style={[styles.modalSaleValue, { color: '#3B82F6' }]}>
                              ${(selectedBuilding.rentPrice || 0).toLocaleString()}/mo
                            </Text>
                          </View>
                        </View>
                      </LinearGradient>

                      <TouchableOpacity
                        style={styles.modalBuyButton}
                        onPress={() => {
                          setShowBuildingModal(false);
                          router.push('/game/real-estate' as any);
                        }}
                      >
                        <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalBuyGradient}>
                          <ShoppingBag size={18} color="#FFF" />
                          <Text style={styles.modalBuyText}>View in Real Estate</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!selectedBuilding.isForSale && (
                    <TouchableOpacity style={styles.modalExploreButton} onPress={() => setShowBuildingModal(false)}>
                      <Eye size={18} color="#FFF" />
                      <Text style={styles.modalExploreText}>Continue Exploring</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Treasure Claim Modal */}
        <Modal visible={showTreasureModal && selectedTreasure !== null} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.treasureModalContent, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
              {selectedTreasure && (() => {
                const rarity = RARITY_CONFIG[selectedTreasure.rarity];
                const typeConfig = TREASURE_TYPE_CONFIG[selectedTreasure.treasureType];
                const claimed = isTreasureClaimed(selectedTreasure.id);
                const atDailyLimit = dailyClaimsRemaining <= 0;

                return (
                  <>
                    <View style={styles.treasureModalHeader}>
                      <TouchableOpacity onPress={closeTreasureModal} style={styles.treasureModalClose}>
                        <X size={22} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.treasureModalVisual, { backgroundColor: rarity.bgColor }]}>
                      <Animated.View style={{ transform: [{ translateY: treasureBounce }] }}>
                        {renderTreasureIcon(selectedTreasure, 100)}
                      </Animated.View>
                      <View style={[styles.treasureModalRarityBadge, { backgroundColor: rarity.color + '25', borderColor: rarity.color }]}>
                        <Text style={[styles.treasureModalRarityText, { color: rarity.color }]}>{rarity.label}</Text>
                      </View>
                    </View>

                    <Text style={[styles.treasureModalName, { color: colors.text }]}>{selectedTreasure.name}</Text>
                    <Text style={[styles.treasureModalDesc, { color: colors.textSecondary }]}>{selectedTreasure.description}</Text>

                    <View style={styles.treasureModalDetailsRow}>
                      <View style={[styles.treasureModalDetailChip, { backgroundColor: isDark ? '#252540' : '#F5F5F5' }]}>
                        <Gift size={14} color={rarity.color} />
                        <Text style={[styles.treasureModalDetailText, { color: colors.text }]}>{typeConfig.label}</Text>
                      </View>
                      <View style={[styles.treasureModalDetailChip, { backgroundColor: isDark ? '#252540' : '#F5F5F5' }]}>
                        <Coins size={14} color="#F59E0B" />
                        <Text style={[styles.treasureModalDetailText, { color: colors.text }]}>{selectedTreasure.tokenReward} MUSO</Text>
                      </View>
                      <View style={[styles.treasureModalDetailChip, { backgroundColor: isDark ? '#252540' : '#F5F5F5' }]}>
                        <Target size={14} color="#3B82F6" />
                        <Text style={[styles.treasureModalDetailText, { color: colors.text }]}>{dailyClaimsRemaining} left</Text>
                      </View>
                    </View>

                    <View style={[styles.treasureModalHint, { backgroundColor: isDark ? '#1E3A5F' : '#FEF3C7' }]}>
                      <Eye size={14} color={isDark ? '#FDE68A' : '#92400E'} />
                      <Text style={[styles.treasureModalHintText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                        {selectedTreasure.searchHint || selectedTreasure.hint}
                      </Text>
                    </View>

                    {claimResult && (
                      <View style={[
                        styles.treasureClaimResult,
                        { backgroundColor: claimResult.success ? '#10B98120' : '#EF444420', borderColor: claimResult.success ? '#10B981' : '#EF4444' },
                      ]}>
                        <Text style={{ fontSize: 24 }}>{claimResult.success ? '🎉' : '⏰'}</Text>
                        <Text style={[styles.treasureClaimResultText, { color: claimResult.success ? '#10B981' : '#EF4444' }]}>
                          {claimResult.message}
                        </Text>
                        {claimResult.success && (
                          <Text style={[styles.treasureClaimTokens, { color: '#F59E0B' }]}>
                            +{claimResult.tokensAwarded} MUSO Tokens
                          </Text>
                        )}
                      </View>
                    )}

                    {!claimed && !claimResult?.success && !atDailyLimit && (
                      <TouchableOpacity
                        style={[styles.treasureClaimButton, { backgroundColor: rarity.color }]}
                        onPress={handleClaimTreasureInCity}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[rarity.color, rarity.color + 'CC']}
                          style={styles.treasureClaimButtonGradient}
                        >
                          <Sparkles size={20} color="#FFF" />
                          <Text style={styles.treasureClaimButtonText}>Claim Treasure</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}

                    {atDailyLimit && !claimed && !claimResult?.success && (
                      <View style={styles.treasureLimitBanner}>
                        <Target size={18} color="#F59E0B" />
                        <Text style={styles.treasureLimitText}>
                          Daily limit of {MAX_DAILY_TREASURES} reached. Come back tomorrow!
                        </Text>
                      </View>
                    )}

                    {(claimed || claimResult?.success) && !claimResult && (
                      <View style={styles.treasureClaimedBanner}>
                        <Trophy size={18} color="#10B981" />
                        <Text style={styles.treasureClaimedText}>Already Claimed ✓</Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  errorText: { fontSize: 20, fontWeight: '700' as const },
  errorSubtext: { fontSize: 14, textAlign: 'center' as const },

  heroContainer: { ...StyleSheet.absoluteFillObject },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroContent: { flex: 1, justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', marginLeft: 16, marginTop: 8 },
  heroTextContainer: { padding: 24, paddingBottom: 40 },
  cityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  weatherEmoji: { fontSize: 24 },
  temperatureText: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: '500' as const },
  heroTagline: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 4, marginBottom: 4 },
  heroCityName: { fontSize: 44, fontWeight: '900' as const, color: '#FFF', letterSpacing: -1, marginBottom: 16 },
  cityStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  cityStatChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  cityStatText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' as const },

  treasureHuntBanner: { marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  treasureHuntBannerGradient: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  treasureHuntBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  treasureHuntEmoji: { fontSize: 28 },
  treasureHuntBannerTitle: { fontSize: 15, fontWeight: '800' as const, color: '#FDE68A' },
  treasureHuntBannerSub: { fontSize: 11, color: 'rgba(253,230,138,0.7)', marginTop: 2 },
  treasureHuntBannerStats: { flexDirection: 'row', gap: 8 },
  treasureHuntStatChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  treasureHuntStatText: { fontSize: 11, fontWeight: '700' as const, color: '#FDE68A' },

  enterButtonsRow: { gap: 10 },
  enterButtonWrapper: {},
  enterButton: { borderRadius: 16, overflow: 'hidden', shadowColor: '#FF4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  enterButtonSecondary: { borderRadius: 16, overflow: 'hidden' },
  enterButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 32, gap: 10 },
  enterButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' as const, letterSpacing: 0.5 },
  enterSubtext: { color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center' as const, marginTop: 14 },

  skyGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.45 },

  overheadSafeArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  overheadHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  overheadBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  overheadHeaderCenter: { flex: 1, alignItems: 'center' },
  overheadCityLabel: { fontSize: 18, fontWeight: '800' as const, color: '#FFF' },
  overheadSubLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' as const, letterSpacing: 3 },

  isometricGrid: { flex: 1, position: 'relative', marginTop: 100 },
  isoBlock: { position: 'absolute', width: 180, alignItems: 'center' },
  isoBlockGround: { width: 180, height: 90, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative', transform: [{ rotateX: '10deg' }] },
  isoBuilding: { position: 'absolute', borderRadius: 3, borderWidth: 1, overflow: 'hidden' },
  isoBuildingWindow: { position: 'absolute', left: 4, right: 4, height: 6, borderRadius: 1 },
  isoForSaleDot: { position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  isoPlayerMarker: { position: 'absolute', top: -8, alignSelf: 'center' },
  isoPlayerDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FF6B35', borderWidth: 2, borderColor: '#FFF', shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4 },
  isoTreasureMarker: { position: 'absolute', top: -20, right: 10 },
  isoTreasureBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 2 },
  isoTreasureIcon: { fontSize: 10 },
  isoTreasureCount: { fontSize: 10, fontWeight: '800' as const, color: '#FFF' },
  isoBlockLabel: { fontSize: 11, fontWeight: '700' as const, color: '#FFF', marginTop: 4 },
  isoBlockStreet: { fontSize: 9, color: 'rgba(255,255,255,0.5)' },

  overheadLegend: { flexDirection: 'row', justifyContent: 'center', gap: 14, paddingVertical: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },

  overheadStats: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 30, gap: 20 },
  overheadStatItem: { alignItems: 'center' },
  overheadStatNumber: { fontSize: 24, fontWeight: '800' as const, color: '#FFF' },
  overheadStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500' as const },
  overheadStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },

  streetSafeArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  streetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, gap: 10 },
  streetHeaderBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  streetHeaderCenter: { flex: 1, alignItems: 'center' },
  streetHeaderNeighborhood: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 2 },
  streetHeaderStreet: { fontSize: 16, fontWeight: '800' as const, color: '#FFF' },

  compassBar: { position: 'absolute', top: 105, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, gap: 6, zIndex: 5 },
  compassText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' as const },
  compassDirectionDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center' },
  compassDirectionText: { fontSize: 10, fontWeight: '800' as const, color: '#FFF' },
  compassTreasureIndicator: { backgroundColor: 'rgba(245,158,11,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  compassTreasureText: { fontSize: 10, fontWeight: '700' as const, color: '#FDE68A' },

  streetView: { flex: 1, marginTop: 90 },
  streetScene: { flex: 1, position: 'relative', overflow: 'hidden' },

  roadSurface: { position: 'absolute', bottom: 0, left: '25%' as any, right: '25%' as any, height: '70%' as any, borderTopLeftRadius: 100, borderTopRightRadius: 100 },
  roadGradient: { flex: 1, borderTopLeftRadius: 100, borderTopRightRadius: 100 },
  roadLine: { position: 'absolute', left: '35%' as any, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  roadCenterLine: { position: 'absolute', left: '50%' as any, marginLeft: -1, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,200,0,0.2)' },
  roadDash: { position: 'absolute', left: '50%' as any, marginLeft: -1, width: 2, height: 20, backgroundColor: 'rgba(255,200,0,0.4)' },

  buildingsLeft: { position: 'absolute', left: 0, top: 40, bottom: 60, width: '30%' as any, justifyContent: 'flex-end', alignItems: 'flex-end', gap: 8, paddingRight: 4 },
  buildingsRight: { position: 'absolute', right: 0, top: 40, bottom: 60, width: '30%' as any, justifyContent: 'flex-end', alignItems: 'flex-start', gap: 8, paddingLeft: 4 },

  streetBuilding: { alignItems: 'center' },
  streetBuildingLeft: { alignItems: 'flex-end' },
  streetBuildingRight: { alignItems: 'flex-start' },

  buildingFacade: { width: '90%' as any, borderWidth: 1.5, borderBottomWidth: 0, borderTopLeftRadius: 4, borderTopRightRadius: 4, position: 'relative', overflow: 'hidden', minHeight: 50 },
  buildingRoof: { height: 6, width: '100%' },
  windowGrid: { flex: 1, paddingHorizontal: 6, paddingVertical: 4, gap: 3 },
  windowRow: { flexDirection: 'row', justifyContent: 'space-around' },
  windowPane: { width: 8, height: 6, borderRadius: 1 },
  buildingDoor: { width: 16, height: 12, borderTopLeftRadius: 8, borderTopRightRadius: 8, alignSelf: 'center', marginBottom: 0 },

  forSaleBanner: { position: 'absolute', top: 8, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingVertical: 2, gap: 2 },
  forSaleText: { fontSize: 6, fontWeight: '800' as const, color: '#FFF', letterSpacing: 1 },

  buildingLabel: { fontSize: 8, fontWeight: '700' as const, color: 'rgba(255,255,255,0.7)', marginTop: 2, maxWidth: 80, textAlign: 'center' as const },

  streetTreasureFloat: { position: 'absolute', top: '25%' as any, alignSelf: 'center', alignItems: 'center', zIndex: 3 },
  streetTreasureItem: { alignItems: 'center', marginBottom: 8 },
  streetTreasureGlow: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 6 },
  streetTreasureReward: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  streetTreasureRewardText: { fontSize: 10, fontWeight: '800' as const, color: '#FFF' },

  distantBuildings: { position: 'absolute', top: 20, left: '30%' as any, right: '30%' as any, height: 60, alignItems: 'center' },
  distantBuilding: { position: 'absolute', bottom: 12, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  distantLabel: { position: 'absolute', bottom: 0, fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '600' as const },

  blockInfoBar: { paddingHorizontal: 16, paddingVertical: 6 },
  blockInfoContent: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  blockInfoName: { fontSize: 14, fontWeight: '700' as const, color: '#FFF' },
  blockInfoDetails: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  treasurePanelContainer: { maxHeight: 80, paddingHorizontal: 0 },
  treasurePanelContent: { paddingHorizontal: 12, gap: 8 },
  treasurePanelCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, gap: 8, minWidth: 200, borderWidth: 1.5 },
  treasurePanelIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  treasurePanelInfo: { flex: 1 },
  treasurePanelName: { fontSize: 12, fontWeight: '700' as const, color: '#FFF' },
  treasurePanelRewardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  treasurePanelRarity: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  treasurePanelRarityText: { fontSize: 9, fontWeight: '700' as const },
  treasurePanelRewardText: { fontSize: 11, fontWeight: '700' as const, color: '#F59E0B' },

  buildingCarousel: { maxHeight: 72, paddingHorizontal: 0 },
  buildingCarouselContent: { paddingHorizontal: 12, gap: 8 },
  buildingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, gap: 8, minWidth: 180 },
  buildingCardIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buildingCardInfo: { flex: 1 },
  buildingCardName: { fontSize: 12, fontWeight: '700' as const, color: '#FFF' },
  buildingCardType: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  buildingCardSale: { backgroundColor: '#10B98130', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  buildingCardPrice: { fontSize: 10, fontWeight: '700' as const, color: '#10B981' },

  controlsContainer: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 24 : 16, paddingTop: 8, alignItems: 'center' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  controlBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  controlBtnMain: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center', shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  controlBtnBack: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16, marginTop: 8 },
  controlLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: '600' as const },
  controlLabelMain: { fontSize: 10, color: '#FFF', marginTop: 2, fontWeight: '700' as const },
  controlLabelBack: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '500' as const },

  miniMap: { position: 'absolute', top: 130, right: 12, width: 80, height: 80, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', zIndex: 5 },
  miniMapClose: { position: 'absolute', top: 2, right: 2, zIndex: 1, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  miniMapBlock: { position: 'absolute', width: 18, height: 18, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  showMapBtn: { position: 'absolute', top: 130, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 5 },

  statsFloater: { position: 'absolute', top: 130, left: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, zIndex: 5 },
  statsFloaterItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsFloaterText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' as const },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalIconBg: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' },
  modalBuildingName: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.5, marginBottom: 8 },
  modalTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  modalTypeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modalTypeText: { fontSize: 12, fontWeight: '700' as const },
  modalNeighborhood: { fontSize: 13 },
  modalDescription: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  modalStatsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  modalStatCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 14, gap: 6 },
  modalStatValue: { fontSize: 18, fontWeight: '800' as const },
  modalStatLabel: { fontSize: 10, fontWeight: '500' as const },
  modalSaleSection: { gap: 12 },
  modalSaleGradient: { borderRadius: 16, padding: 16 },
  modalSaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalSaleRight: { alignItems: 'flex-end' },
  modalSaleLabel: { fontSize: 11, fontWeight: '500' as const, marginBottom: 4 },
  modalSaleValue: { fontSize: 18, fontWeight: '800' as const },
  modalBuyButton: { borderRadius: 14, overflow: 'hidden' },
  modalBuyGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 10 },
  modalBuyText: { color: '#FFF', fontSize: 15, fontWeight: '700' as const },
  modalExploreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', paddingVertical: 15, borderRadius: 14, gap: 10 },
  modalExploreText: { color: '#FFF', fontSize: 15, fontWeight: '700' as const },

  treasureModalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' },
  treasureModalHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  treasureModalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' },
  treasureModalVisual: { alignItems: 'center', paddingVertical: 24, borderRadius: 20, marginBottom: 16 },
  treasureModalRarityBadge: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, borderWidth: 1.5, marginTop: 12 },
  treasureModalRarityText: { fontSize: 12, fontWeight: '800' as const },
  treasureModalName: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.5, marginBottom: 6 },
  treasureModalDesc: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  treasureModalDetailsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  treasureModalDetailChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  treasureModalDetailText: { fontSize: 12, fontWeight: '600' as const },
  treasureModalHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14, borderRadius: 14, marginBottom: 16 },
  treasureModalHintText: { fontSize: 12, lineHeight: 18, flex: 1 },
  treasureClaimResult: { padding: 16, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', gap: 6, marginBottom: 16 },
  treasureClaimResultText: { fontSize: 14, fontWeight: '700' as const, textAlign: 'center' as const },
  treasureClaimTokens: { fontSize: 18, fontWeight: '900' as const },
  treasureClaimButton: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  treasureClaimButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  treasureClaimButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' as const },
  treasureLimitBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(245,158,11,0.1)', padding: 14, borderRadius: 14 },
  treasureLimitText: { fontSize: 13, color: '#F59E0B', fontWeight: '600' as const, flex: 1 },
  treasureClaimedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(16,185,129,0.1)', padding: 14, borderRadius: 14 },
  treasureClaimedText: { fontSize: 15, color: '#10B981', fontWeight: '700' as const },
});
