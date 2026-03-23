import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  MapPin,
  Camera,
  Coins,
  Trophy,
  Star,
  Compass,
  Navigation,
  ChevronRight,
  X,
  Gift,
  Zap,
  Target,
  Eye,
  Clock,
  Flame,
  Award,
  Map as MapIcon,
  RefreshCw,
  ChevronDown,
  Shield,
  Lock,
  Unlock,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useScavengerHunt } from '@/contexts/ScavengerHuntContext';
import { ScavengerHuntService } from '@/services/ScavengerHuntService';
import { RARITY_CONFIG, TREASURE_TYPE_CONFIG, TreasureLocation } from '@/types/scavengerHunt';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════
// 🗺️ SCAVENGER HUNT MAIN SCREEN
// ═══════════════════════════════════════════════════════════════

type ViewMode = 'map' | 'list' | 'stats';

export default function ScavengerHuntScreen() {
  const { colors, isDark } = useTheme();
  const { gameState, mintTokens } = useGame();
  const router = useRouter();
  const {
    treasures,
    dailyProgress,
    huntStreak,
    claims,
    isLoading,
    selectedTreasure,
    treasureDistances,
    totalTokensEarned,
    selectTreasure,
    claimTreasure,
    isTreasureClaimed,
    refreshDailyTreasures,
    setPlayerLocation,
    getStreakBonusLabel,
  } = useScavengerHunt();

  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showARCamera, setShowARCamera] = useState(false);
  const [claimResult, setClaimResult] = useState<{ success: boolean; tokensAwarded: number; message: string } | null>(null);
  const [arScanProgress, setArScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const coinSpinAnim = useRef(new Animated.Value(0)).current;
  const claimScaleAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Start animations
  useEffect(() => {
    // Pulse effect for nearby treasures
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Float animation for 3D token
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -12, duration: 1500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    // Coin spin
    Animated.loop(
      Animated.timing(coinSpinAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();

    // Shimmer
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();
  }, []);

  // Simulate player location (LA center area for demo)
  useEffect(() => {
    // Set a simulated location in central LA for demo purposes
    setPlayerLocation({
      latitude: 34.0522,
      longitude: -118.2437,
      accuracy: 10,
      timestamp: Date.now(),
    });
  }, [setPlayerLocation]);

  const streakBonusLabel = useMemo(() => getStreakBonusLabel(), [getStreakBonusLabel]);

  const handleTreasureTap = useCallback((treasure: TreasureLocation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectTreasure(treasure);
    setShowClaimModal(true);
  }, [selectTreasure]);

  const handleStartARScan = useCallback(() => {
    if (!selectedTreasure) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowARCamera(true);
    setIsScanning(true);
    setArScanProgress(0);

    // Animate scan line
    Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Simulate AR scanning progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setArScanProgress(100);
        setTimeout(() => {
          handleClaimTreasure();
        }, 500);
      } else {
        setArScanProgress(Math.min(progress, 99));
      }
    }, 400);
  }, [selectedTreasure]);

  const handleClaimTreasure = useCallback(() => {
    if (!selectedTreasure) return;

    const result = claimTreasure(selectedTreasure.id);
    setClaimResult(result);
    setIsScanning(false);
    setShowARCamera(false);

    if (result.success) {
      // Mint the tokens
      mintTokens(result.tokensAwarded, 'Scavenger Hunt: ' + selectedTreasure.name, {
        source: 'scavenger_hunt',
        category: 'treasure_claim',
        relatedId: selectedTreasure.id,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate claim
      Animated.spring(claimScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [selectedTreasure, claimTreasure, mintTokens]);

  const closeClaimModal = useCallback(() => {
    setShowClaimModal(false);
    setClaimResult(null);
    selectTreasure(null);
    claimScaleAnim.setValue(0);
  }, [selectTreasure, claimScaleAnim]);

  const coinRotation = coinSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ═══════════════════════════════════════════════════════════════
  // 🎨 RENDER COMPONENTS
  // ═══════════════════════════════════════════════════════════════

  const renderHeader = () => (
    <LinearGradient
      colors={isDark ? ['#1a0a2e', '#2d1b4e', '#1e1145'] : ['#4C1D95', '#6D28D9', '#7C3AED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>🗺️ Treasure Hunt</Text>
          <Text style={styles.headerSubtitle}>Los Angeles • {dailyProgress.totalTreasures} Treasures Today</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.streakBadge}>
            <Flame size={14} color="#F59E0B" />
            <Text style={styles.streakText}>{huntStreak.currentStreak}</Text>
          </View>
        </View>
      </View>

      {/* Daily Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${dailyProgress.totalTreasures > 0 ? (dailyProgress.claimedTreasures / dailyProgress.totalTreasures) * 100 : 0}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {dailyProgress.claimedTreasures}/{dailyProgress.totalTreasures} Claimed • {dailyProgress.totalTokensEarned} MUSO Today
        </Text>
      </View>

      {streakBonusLabel && (
        <View style={styles.streakBonusBanner}>
          <Zap size={14} color="#FDE68A" />
          <Text style={styles.streakBonusText}>{streakBonusLabel}</Text>
        </View>
      )}
    </LinearGradient>
  );

  const renderViewToggle = () => (
    <View style={[styles.viewToggle, { backgroundColor: colors.surface }]}>
      {(['map', 'list', 'stats'] as ViewMode[]).map(mode => (
        <TouchableOpacity
          key={mode}
          style={[styles.viewToggleBtn, viewMode === mode && { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode(mode);
          }}
        >
          {mode === 'map' && <MapIcon size={16} color={viewMode === mode ? '#FFF' : colors.textSecondary} />}
          {mode === 'list' && <Target size={16} color={viewMode === mode ? '#FFF' : colors.textSecondary} />}
          {mode === 'stats' && <Trophy size={16} color={viewMode === mode ? '#FFF' : colors.textSecondary} />}
          <Text style={[styles.viewToggleText, { color: viewMode === mode ? '#FFF' : colors.textSecondary }]}>
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      {/* OpenStreetMap Display */}
      <View style={[styles.mapPlaceholder, { backgroundColor: isDark ? '#1a1a2e' : '#E8F4FD' }]}>
        <Image
          source={{
            uri: `https://staticmap.openstreetmap.de/staticmap.php?center=34.0522,-118.2437&zoom=11&size=${Math.round(SCREEN_WIDTH)}x400&maptype=mapnik`,
          }}
          style={styles.mapImage}
          resizeMode="cover"
        />

        {/* Treasure Markers Overlay */}
        <View style={styles.markersOverlay}>
          {treasures.map(treasure => {
            const claimed = isTreasureClaimed(treasure.id);
            const rarity = RARITY_CONFIG[treasure.rarity];
            const relativeX = ((treasure.longitude + 118.8) / 0.7) * 100;
            const relativeY = ((34.2 - treasure.latitude) / 0.5) * 100;

            return (
              <TouchableOpacity
                key={treasure.id}
                style={[
                  styles.mapMarker,
                  {
                    left: `${Math.min(Math.max(relativeX, 5), 90)}%`,
                    top: `${Math.min(Math.max(relativeY, 5), 85)}%`,
                    opacity: claimed ? 0.4 : 1,
                  },
                ]}
                onPress={() => handleTreasureTap(treasure)}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[
                    styles.markerPulse,
                    {
                      backgroundColor: rarity.color + '30',
                      transform: [{ scale: claimed ? 1 : pulseAnim }],
                    },
                  ]}
                >
                  <View style={[styles.markerDot, { backgroundColor: rarity.color }]}>
                    <Text style={styles.markerIcon}>{claimed ? '✅' : treasure.icon}</Text>
                  </View>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Map Legend */}
        <View style={[styles.mapLegend, { backgroundColor: colors.surface + 'E6' }]}>
          <Text style={[styles.mapLegendTitle, { color: colors.text }]}>Rarity</Text>
          {Object.entries(RARITY_CONFIG).map(([key, config]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: config.color }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{config.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* OpenStreetMap Attribution */}
      <View style={[styles.osmAttribution, { backgroundColor: colors.surface }]}>
        <Text style={[styles.osmText, { color: colors.textSecondary }]}>
          © OpenStreetMap contributors
        </Text>
        <TouchableOpacity onPress={() => refreshDailyTreasures()}>
          <RefreshCw size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTreasureCard = (treasure: TreasureLocation, index: number) => {
    const claimed = isTreasureClaimed(treasure.id);
    const rarity = RARITY_CONFIG[treasure.rarity];
    const typeConfig = TREASURE_TYPE_CONFIG[treasure.treasureType];
    const distance = treasureDistances.find(d => d.treasure.id === treasure.id);

    return (
      <TouchableOpacity
        key={treasure.id}
        style={[
          styles.treasureCard,
          {
            backgroundColor: claimed ? colors.surface + '80' : colors.surface,
            borderLeftColor: rarity.color,
            borderLeftWidth: 4,
          },
        ]}
        onPress={() => handleTreasureTap(treasure)}
        activeOpacity={0.7}
      >
        <View style={styles.treasureCardLeft}>
          <View style={[styles.treasureIconWrap, { backgroundColor: rarity.bgColor }]}>
            <Text style={styles.treasureCardIcon}>{claimed ? '✅' : treasure.icon}</Text>
          </View>
        </View>

        <View style={styles.treasureCardCenter}>
          <View style={styles.treasureNameRow}>
            <Text style={[styles.treasureCardName, { color: claimed ? colors.textSecondary : colors.text }]}>
              {treasure.name}
            </Text>
            {claimed && <Lock size={12} color={colors.textSecondary} />}
          </View>
          <Text style={[styles.treasureCardLocation, { color: colors.textSecondary }]}>
            📍 {treasure.neighborhood} • {treasure.landmark}
          </Text>
          <View style={styles.treasureCardMeta}>
            <View style={[styles.rarityTag, { backgroundColor: rarity.bgColor }]}>
              <Text style={[styles.rarityTagText, { color: rarity.color }]}>{rarity.label}</Text>
            </View>
            <Text style={[styles.typeTag, { color: colors.textSecondary }]}>
              {typeConfig.icon} {typeConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.treasureCardRight}>
          <View style={styles.rewardBadge}>
            <Coins size={14} color="#F59E0B" />
            <Text style={styles.rewardText}>{treasure.tokenReward}</Text>
          </View>
          {distance && (
            <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
              {ScavengerHuntService.formatDistance(distance.distanceMeters)}
            </Text>
          )}
          <ChevronRight size={16} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderListView = () => (
    <View style={styles.listContainer}>
      <View style={styles.listHeader}>
        <Text style={[styles.listTitle, { color: colors.text }]}>Today's Treasures</Text>
        <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>
          {dailyProgress.claimedTreasures} of {dailyProgress.totalTreasures} found
        </Text>
      </View>
      {treasures.map((treasure, index) => renderTreasureCard(treasure, index))}
    </View>
  );

  const renderStatsView = () => {
    const stats = ScavengerHuntService.getHuntStats(claims, huntStreak);
    return (
      <View style={styles.statsContainer}>
        {/* Overall Stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statsCardTitle, { color: colors.text }]}>🏆 Hunt Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalTokens}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total MUSO</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.totalClaims}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Treasures Found</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#EF4444' }]}>{stats.currentStreak}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Current Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.totalDaysHunted}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Days Hunted</Text>
            </View>
          </View>
        </View>

        {/* Streak Card */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statsCardTitle, { color: colors.text }]}>🔥 Streak Bonuses</Text>
          <View style={styles.streakGrid}>
            {[3, 5, 7, 14, 30].map(days => {
              const active = huntStreak.currentStreak >= days;
              return (
                <View
                  key={days}
                  style={[
                    styles.streakItem,
                    {
                      backgroundColor: active ? '#F59E0B20' : colors.background,
                      borderColor: active ? '#F59E0B' : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.streakDays, { color: active ? '#F59E0B' : colors.textSecondary }]}>
                    {days}d
                  </Text>
                  {active ? <Unlock size={12} color="#F59E0B" /> : <Lock size={12} color={colors.textSecondary} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* Rarity Collection */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statsCardTitle, { color: colors.text }]}>💎 Rarity Collection</Text>
          {Object.entries(RARITY_CONFIG).map(([key, config]) => {
            const count = stats.rarityCounts[key] || 0;
            return (
              <View key={key} style={styles.rarityRow}>
                <View style={styles.rarityRowLeft}>
                  <View style={[styles.rarityDot, { backgroundColor: config.color }]} />
                  <Text style={[styles.rarityName, { color: colors.text }]}>{config.label}</Text>
                </View>
                <Text style={[styles.rarityCount, { color: config.color }]}>{count}</Text>
              </View>
            );
          })}
        </View>

        {/* Today's Summary */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statsCardTitle, { color: colors.text }]}>📅 Today's Progress</Text>
          <View style={styles.todayStats}>
            <View style={styles.todayStatRow}>
              <Text style={[styles.todayStatLabel, { color: colors.textSecondary }]}>Treasures Found</Text>
              <Text style={[styles.todayStatValue, { color: colors.text }]}>
                {stats.todayClaims} / {dailyProgress.totalTreasures}
              </Text>
            </View>
            <View style={styles.todayStatRow}>
              <Text style={[styles.todayStatLabel, { color: colors.textSecondary }]}>Tokens Earned</Text>
              <Text style={[styles.todayStatValue, { color: '#F59E0B' }]}>{stats.todayTokens} MUSO</Text>
            </View>
            <View style={styles.todayStatRow}>
              <Text style={[styles.todayStatLabel, { color: colors.textSecondary }]}>Locations Discovered</Text>
              <Text style={[styles.todayStatValue, { color: colors.primary }]}>
                {stats.uniqueLocations} / {stats.totalLocations}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // 📱 AR CAMERA VIEW
  // ═══════════════════════════════════════════════════════════════

  const renderARCamera = () => {
    if (!selectedTreasure) return null;
    const rarity = RARITY_CONFIG[selectedTreasure.rarity];

    return (
      <Modal visible={showARCamera} animationType="fade" statusBarTranslucent>
        <View style={styles.arContainer}>
          {/* Simulated Camera Background */}
          <LinearGradient
            colors={['#0a0a1a', '#1a1a3e', '#0d0d2b']}
            style={styles.arBackground}
          >
            {/* Grid overlay for AR effect */}
            <View style={styles.arGrid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <View
                  key={`h${i}`}
                  style={[styles.arGridLineH, { top: `${(i + 1) * 12}%`, opacity: 0.1 }]}
                />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={`v${i}`}
                  style={[styles.arGridLineV, { left: `${(i + 1) * 16}%`, opacity: 0.1 }]}
                />
              ))}
            </View>

            {/* Scanning line animation */}
            {isScanning && (
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    backgroundColor: rarity.color + '60',
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, SCREEN_HEIGHT],
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}

            {/* 3D MUSO Token Model (Simulated) */}
            <View style={styles.arTokenCenter}>
              <Animated.View
                style={[
                  styles.arTokenOuter,
                  {
                    transform: [
                      { translateY: floatAnim },
                      { scale: arScanProgress >= 100 ? 1.2 : 1 },
                    ],
                  },
                ]}
              >
                {/* Glow ring */}
                <View style={[styles.arGlowRing, { borderColor: rarity.color + '40' }]} />

                {/* Token body */}
                <Animated.View
                  style={[
                    styles.arTokenBody,
                    {
                      backgroundColor: selectedTreasure.modelColor,
                      borderColor: rarity.color,
                      transform: [{ rotateY: coinRotation }],
                    },
                  ]}
                >
                  <Text style={styles.arTokenSymbol}>M</Text>
                  <Text style={styles.arTokenLabel}>MUSO</Text>
                </Animated.View>

                {/* Sparkle particles */}
                {[...Array(6)].map((_, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.arParticle,
                      {
                        backgroundColor: rarity.color,
                        left: 40 + Math.cos((i * Math.PI * 2) / 6) * 55,
                        top: 40 + Math.sin((i * Math.PI * 2) / 6) * 55,
                        opacity: shimmerAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.3, 1, 0.3],
                        }),
                      },
                    ]}
                  />
                ))}
              </Animated.View>
            </View>

            {/* AR HUD Overlay */}
            <SafeAreaView style={styles.arHUD}>
              {/* Top bar */}
              <View style={styles.arTopBar}>
                <TouchableOpacity
                  style={styles.arCloseBtn}
                  onPress={() => {
                    setShowARCamera(false);
                    setIsScanning(false);
                  }}
                >
                  <X size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.arTreasureInfo}>
                  <Text style={styles.arTreasureName}>{selectedTreasure.name}</Text>
                  <View style={[styles.arRarityBadge, { backgroundColor: rarity.color + '30' }]}>
                    <Text style={[styles.arRarityText, { color: rarity.color }]}>{rarity.label}</Text>
                  </View>
                </View>
                <View style={styles.arRewardInfo}>
                  <Coins size={16} color="#F59E0B" />
                  <Text style={styles.arRewardText}>{selectedTreasure.tokenReward}</Text>
                </View>
              </View>

              {/* Bottom scan area */}
              <View style={styles.arBottomSection}>
                {/* Scan progress */}
                <View style={styles.arProgressContainer}>
                  <View style={styles.arProgressBg}>
                    <View
                      style={[
                        styles.arProgressFill,
                        {
                          width: `${arScanProgress}%`,
                          backgroundColor: arScanProgress >= 100 ? '#10B981' : rarity.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.arProgressText}>
                    {arScanProgress >= 100 ? '✅ MUSO Token Detected!' : `Scanning... ${Math.round(arScanProgress)}%`}
                  </Text>
                </View>

                {/* Instructions */}
                <View style={styles.arInstructions}>
                  <Camera size={20} color="#FFF" />
                  <Text style={styles.arInstructionText}>
                    {isScanning
                      ? 'Hold steady — detecting MUSO Token anchor...'
                      : 'Point your camera to scan for the hidden treasure'}
                  </Text>
                </View>

                {/* Geospatial anchor info */}
                <View style={styles.arAnchorInfo}>
                  <Navigation size={12} color="#8B5CF6" />
                  <Text style={styles.arAnchorText}>
                    Geospatial Anchor: {selectedTreasure.latitude.toFixed(4)}°N, {Math.abs(selectedTreasure.longitude).toFixed(4)}°W
                  </Text>
                </View>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </View>
      </Modal>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // 🎁 CLAIM MODAL
  // ═══════════════════════════════════════════════════════════════

  const renderClaimModal = () => {
    if (!selectedTreasure) return null;
    const rarity = RARITY_CONFIG[selectedTreasure.rarity];
    const typeConfig = TREASURE_TYPE_CONFIG[selectedTreasure.treasureType];
    const claimed = isTreasureClaimed(selectedTreasure.id);
    const distance = treasureDistances.find(d => d.treasure.id === selectedTreasure.id);

    return (
      <Modal visible={showClaimModal} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeClaimModal}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Treasure Visual */}
            <View style={[styles.modalTreasureVisual, { backgroundColor: rarity.bgColor }]}>
              <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                <Text style={styles.modalTreasureIcon}>{selectedTreasure.icon}</Text>
              </Animated.View>
              <View style={[styles.modalRarityBadge, { backgroundColor: rarity.color + '20', borderColor: rarity.color }]}>
                <Text style={[styles.modalRarityText, { color: rarity.color }]}>{rarity.label}</Text>
              </View>
            </View>

            {/* Info */}
            <Text style={[styles.modalTreasureName, { color: colors.text }]}>{selectedTreasure.name}</Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>{selectedTreasure.description}</Text>

            {/* Details */}
            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <MapPin size={16} color={colors.textSecondary} />
                <Text style={[styles.modalDetailText, { color: colors.text }]}>
                  {selectedTreasure.neighborhood} • {selectedTreasure.landmark}
                </Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Gift size={16} color={colors.textSecondary} />
                <Text style={[styles.modalDetailText, { color: colors.text }]}>
                  {typeConfig.icon} {typeConfig.label} • {selectedTreasure.tokenReward} MUSO
                </Text>
              </View>
              {distance && (
                <View style={styles.modalDetailRow}>
                  <Navigation size={16} color={colors.textSecondary} />
                  <Text style={[styles.modalDetailText, { color: colors.text }]}>
                    {ScavengerHuntService.formatDistance(distance.distanceMeters)} {distance.direction}
                  </Text>
                </View>
              )}
              <View style={styles.modalDetailRow}>
                <Compass size={16} color={colors.textSecondary} />
                <Text style={[styles.modalDetailText, { color: colors.text }]}>
                  {selectedTreasure.latitude.toFixed(4)}°N, {Math.abs(selectedTreasure.longitude).toFixed(4)}°W
                </Text>
              </View>
            </View>

            {/* Hint */}
            <View style={[styles.hintBox, { backgroundColor: colors.background }]}>
              <Eye size={14} color="#F59E0B" />
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                💡 Hint: {selectedTreasure.hint}
              </Text>
            </View>

            {/* Claim Result */}
            {claimResult && (
              <Animated.View
                style={[
                  styles.claimResultBox,
                  {
                    backgroundColor: claimResult.success ? '#10B98120' : '#EF444420',
                    borderColor: claimResult.success ? '#10B981' : '#EF4444',
                  },
                ]}
              >
                <Text style={styles.claimResultIcon}>{claimResult.success ? '🎉' : '⏰'}</Text>
                <Text style={[styles.claimResultText, { color: claimResult.success ? '#10B981' : '#EF4444' }]}>
                  {claimResult.message}
                </Text>
              </Animated.View>
            )}

            {/* Action Button */}
            {!claimed && !claimResult?.success && (
              <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: rarity.color }]}
                onPress={handleStartARScan}
                activeOpacity={0.8}
              >
                <Camera size={20} color="#FFF" />
                <Text style={styles.scanButtonText}>Open AR Scanner</Text>
              </TouchableOpacity>
            )}

            {(claimed || claimResult?.success) && (
              <View style={[styles.claimedBanner, { backgroundColor: '#10B98120' }]}>
                <Shield size={20} color="#10B981" />
                <Text style={styles.claimedText}>Claimed Today ✓</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // 📱 MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading treasures...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderHeader()}
        {renderViewToggle()}

        {viewMode === 'map' && renderMapView()}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'stats' && renderStatsView()}

        {/* Bottom info */}
        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>🎯 How It Works</Text>
          <View style={styles.infoSteps}>
            <View style={styles.infoStep}>
              <View style={[styles.infoStepIcon, { backgroundColor: '#8B5CF620' }]}>
                <MapPin size={18} color="#8B5CF6" />
              </View>
              <Text style={[styles.infoStepText, { color: colors.text }]}>Find treasure locations on the LA map</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={[styles.infoStepIcon, { backgroundColor: '#3B82F620' }]}>
                <Navigation size={18} color="#3B82F6" />
              </View>
              <Text style={[styles.infoStepText, { color: colors.text }]}>Visit the real-world location</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={[styles.infoStepIcon, { backgroundColor: '#F59E0B20' }]}>
                <Camera size={18} color="#F59E0B" />
              </View>
              <Text style={[styles.infoStepText, { color: colors.text }]}>Open AR camera to scan for 3D MUSO Tokens</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={[styles.infoStepIcon, { backgroundColor: '#10B98120' }]}>
                <Coins size={18} color="#10B981" />
              </View>
              <Text style={[styles.infoStepText, { color: colors.text }]}>Collect tokens and build your streak!</Text>
            </View>
          </View>
          <Text style={[styles.infoNote, { color: colors.textSecondary }]}>
            🔄 New treasures appear daily at 12:00 AM • Each treasure can be claimed once per day
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderClaimModal()}
      {renderARCamera()}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  // Header
  header: { padding: 20, paddingTop: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 13, color: '#E0D4F5', marginTop: 4 },
  headerRight: { alignItems: 'flex-end' },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  streakText: { color: '#F59E0B', fontSize: 16, fontWeight: '800' },

  // Progress
  progressSection: { marginTop: 16 },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: { color: '#E0D4F5', fontSize: 12, marginTop: 6, textAlign: 'center' },

  // Streak bonus banner
  streakBonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B20',
    borderRadius: 8,
    paddingVertical: 6,
    marginTop: 10,
    gap: 6,
  },
  streakBonusText: { color: '#FDE68A', fontSize: 13, fontWeight: '700' },

  // View Toggle
  viewToggle: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  viewToggleText: { fontSize: 13, fontWeight: '600' },

  // Map
  mapContainer: { marginHorizontal: 16 },
  mapPlaceholder: {
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  mapImage: { width: '100%', height: '100%' },
  markersOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mapMarker: {
    position: 'absolute',
    zIndex: 10,
  },
  markerPulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  markerIcon: { fontSize: 14 },
  mapLegend: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    padding: 10,
    borderRadius: 10,
  },
  mapLegendTitle: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10 },
  osmAttribution: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  osmText: { fontSize: 10 },

  // Treasure Cards
  listContainer: { paddingHorizontal: 16 },
  listHeader: { marginBottom: 12 },
  listTitle: { fontSize: 18, fontWeight: '700' },
  listSubtitle: { fontSize: 13, marginTop: 2 },
  treasureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  treasureCardLeft: { marginRight: 12 },
  treasureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treasureCardIcon: { fontSize: 24 },
  treasureCardCenter: { flex: 1 },
  treasureNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  treasureCardName: { fontSize: 15, fontWeight: '700' },
  treasureCardLocation: { fontSize: 12, marginTop: 3 },
  treasureCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rarityTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rarityTagText: { fontSize: 10, fontWeight: '700' },
  typeTag: { fontSize: 11 },
  treasureCardRight: { alignItems: 'flex-end', gap: 4 },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardText: { fontSize: 15, fontWeight: '800', color: '#F59E0B' },
  distanceText: { fontSize: 11 },

  // Stats
  statsContainer: { paddingHorizontal: 16, gap: 12 },
  statsCard: { borderRadius: 16, padding: 16 },
  statsCardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statItem: { width: '50%', alignItems: 'center', paddingVertical: 10 },
  statNumber: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  streakGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  streakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  streakDays: { fontSize: 14, fontWeight: '700' },
  rarityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  rarityRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rarityDot: { width: 10, height: 10, borderRadius: 5 },
  rarityName: { fontSize: 14, fontWeight: '600' },
  rarityCount: { fontSize: 18, fontWeight: '800' },
  todayStats: { gap: 10 },
  todayStatRow: { flexDirection: 'row', justifyContent: 'space-between' },
  todayStatLabel: { fontSize: 14 },
  todayStatValue: { fontSize: 14, fontWeight: '700' },

  // Info Section
  infoSection: { margin: 16, borderRadius: 16, padding: 16 },
  infoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  infoSteps: { gap: 12 },
  infoStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoStepIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoStepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  infoNote: { fontSize: 12, marginTop: 14, textAlign: 'center', fontStyle: 'italic' },

  // Claim Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  modalTreasureVisual: {
    alignItems: 'center',
    paddingVertical: 28,
    borderRadius: 20,
    marginBottom: 16,
  },
  modalTreasureIcon: { fontSize: 64 },
  modalRarityBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  modalRarityText: { fontSize: 13, fontWeight: '700' },
  modalTreasureName: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  modalDescription: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  modalDetails: { gap: 10, marginBottom: 16 },
  modalDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalDetailText: { fontSize: 14 },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  claimResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  claimResultIcon: { fontSize: 24 },
  claimResultText: { flex: 1, fontSize: 15, fontWeight: '700' },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  scanButtonText: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  claimedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  claimedText: { fontSize: 15, fontWeight: '700', color: '#10B981' },

  // AR Camera
  arContainer: { flex: 1 },
  arBackground: { flex: 1 },
  arGrid: { ...StyleSheet.absoluteFillObject },
  arGridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#8B5CF6' },
  arGridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#8B5CF6' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 3 },
  arTokenCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arTokenOuter: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arGlowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
  },
  arTokenBody: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  arTokenSymbol: { fontSize: 36, fontWeight: '900', color: '#FFF' },
  arTokenLabel: { fontSize: 10, fontWeight: '700', color: '#FFF', marginTop: -2 },
  arParticle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  arHUD: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  arTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  arCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arTreasureInfo: { alignItems: 'center' },
  arTreasureName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  arRarityBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  arRarityText: { fontSize: 11, fontWeight: '700' },
  arRewardInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arRewardText: { color: '#F59E0B', fontSize: 18, fontWeight: '800' },
  arBottomSection: { padding: 20 },
  arProgressContainer: { marginBottom: 16 },
  arProgressBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  arProgressFill: { height: '100%', borderRadius: 4 },
  arProgressText: { color: '#FFF', fontSize: 13, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  arInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  arInstructionText: { flex: 1, color: '#FFF', fontSize: 13, lineHeight: 18 },
  arAnchorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  arAnchorText: { color: '#A78BFA', fontSize: 11, fontWeight: '600' },
});