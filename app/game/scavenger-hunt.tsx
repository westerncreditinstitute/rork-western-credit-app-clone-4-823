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
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  MapPin,
  Camera,
  Coins,
  Trophy,
  Compass,
  Navigation,
  ChevronLeft,
  ChevronRight,
  X,
  Gift,
  Zap,
  Target,
  Eye,
  Flame,
  Map as MapIcon,
  RefreshCw,
  Shield,
  Lock,
  Unlock,
  LocateFixed,
  Fuel,
  TreePine,
  UtensilsCrossed,
  AlertCircle,
  BookOpen,
  Star,
  Sparkles,
  ScanLine,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useScavengerHunt } from '@/contexts/ScavengerHuntContext';
import { ScavengerHuntService } from '@/services/ScavengerHuntService';
import { RARITY_CONFIG, TREASURE_TYPE_CONFIG, PLACE_TYPE_CONFIG, MAX_DAILY_TREASURES, STREAK_BONUSES, TreasureLocation } from '@/types/scavengerHunt';
import AnimatedTreasureChest from '@/components/AnimatedTreasureChest';
import AnimatedTokenFountain from '@/components/AnimatedTokenFountain';
import AnimatedGoldenMuso from '@/components/AnimatedGoldenMuso';
import AnimatedCrystalVault from '@/components/AnimatedCrystalVault';
import AnimatedCoinPile from '@/components/AnimatedCoinPile';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ViewMode = 'map' | 'list' | 'legend' | 'stats';

export default function ScavengerHuntScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { mintTokens } = useGame();
  const {
    treasures,
    dailyProgress,
    huntStreak,
    claims,
    isLoading,
    selectedTreasure,
    treasureDistances,
    selectTreasure,
    claimTreasure,
    isTreasureClaimed,
    refreshDailyTreasures,
    setPlayerLocation,
    getStreakBonusLabel,
    playerLocation,
    dailyClaimsRemaining,
    requestLocationPermission,
  } = useScavengerHunt();

  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showARCamera, setShowARCamera] = useState(false);
  const [claimResult, setClaimResult] = useState<{ success: boolean; tokensAwarded: number; message: string } | null>(null);
  const [arScanProgress, setArScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showLegendPreview, setShowLegendPreview] = useState(false);
  const [legendPreviewType, setLegendPreviewType] = useState<{ key: string; label: string; icon: string; baseReward: number; imageUrl?: string; isGif?: boolean } | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const coinSpinAnim = useRef(new Animated.Value(0)).current;
  const claimScaleAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const locationPulse = useRef(new Animated.Value(0)).current;
  const holdProgressAnim = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [proximityChecked, setProximityChecked] = useState(false);
  const [isNearTreasure, setIsNearTreasure] = useState(false);
  const [scanPhase, setScanPhase] = useState<'waiting_camera' | 'scanning' | 'ready' | 'claiming' | 'claimed'>('waiting_camera');
  const CLAIM_PROXIMITY_METERS = 200;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -12, duration: 1500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(coinSpinAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();

    Animated.loop(
    // eslint-disable-next-line react-hooks/exhaustive-deps
      Animated.sequence([
        Animated.timing(locationPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(locationPulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void handleRequestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestLocation = useCallback(async () => {
    setIsLocating(true);
    console.log('[TreasureHunt] Requesting player location...');
    const granted: boolean = await requestLocationPermission();
    if (!granted) {
      console.log('[TreasureHunt] Location not granted, using fallback location');
      setPlayerLocation({
        latitude: 34.0522,
        longitude: -118.2437,
        accuracy: 100,
        timestamp: Date.now(),
      });
    }
    setIsLocating(false);
  }, [requestLocationPermission, setPlayerLocation]);

  const streakBonusLabel = useMemo(() => getStreakBonusLabel(), [getStreakBonusLabel]);

  const handleTreasureTap = useCallback((treasure: TreasureLocation) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectTreasure(treasure);
    setShowClaimModal(true);
  }, [selectTreasure]);

  useEffect(() => {
    if (cameraPermission?.granted) {
      setPermissionGranted(true);
    }
  }, [cameraPermission]);

  const handleRequestCameraPermission = useCallback(async () => {
    console.log('[TreasureHunt] Requesting camera permission... Platform:', Platform.OS);
    if (Platform.OS === 'web') {
      console.log('[TreasureHunt] Web platform: skipping native camera permission');
      setPermissionGranted(true);
      return true;
    }
    try {
      if (cameraPermission?.granted) {
        console.log('[TreasureHunt] Camera permission already granted via hook');
        setPermissionGranted(true);
        return true;
      }

      console.log('[TreasureHunt] Trying hook requestCameraPermission...');
      const hookResult = await requestCameraPermission();
      console.log('[TreasureHunt] Hook permission result:', JSON.stringify(hookResult));
      if (hookResult?.granted) {
        setPermissionGranted(true);
        return true;
      }

      console.log('[TreasureHunt] Hook failed, trying Camera.requestCameraPermissionsAsync...');
      const directResult = await Camera.requestCameraPermissionsAsync();
      console.log('[TreasureHunt] Direct permission result:', JSON.stringify(directResult));
      if (directResult?.granted) {
        setPermissionGranted(true);
        return true;
      }

      if (hookResult?.canAskAgain === false && directResult?.canAskAgain === false) {
        console.log('[TreasureHunt] Camera permission permanently denied');
      }
      return false;
    } catch (error) {
      console.log('[TreasureHunt] Camera permission error:', error);
      try {
        const fallbackResult = await Camera.getCameraPermissionsAsync();
        console.log('[TreasureHunt] Fallback check result:', JSON.stringify(fallbackResult));
        if (fallbackResult?.granted) {
          setPermissionGranted(true);
          return true;
        }
      } catch (e2) {
        console.log('[TreasureHunt] Fallback check also failed:', e2);
      }
      return false;
    }
  }, [cameraPermission, requestCameraPermission]);

  const handleLegendPreview = useCallback(async (typeConfig: { key: string; label: string; icon: string; baseReward: number }) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('[TreasureHunt] Opening AR preview for:', typeConfig.label);
    const granted = await handleRequestCameraPermission();
    if (!granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera access to view AR treasure previews. Go to your device settings to enable it.',
        [{ text: 'OK' }]
      );
      return;
    }
    setCameraKey(prev => prev + 1);
    setLegendPreviewType(typeConfig);
    setShowLegendPreview(true);
    setCameraReady(false);
  }, [handleRequestCameraPermission]);

  const checkProximity = useCallback((): boolean => {
    if (!selectedTreasure || !playerLocation) {
      console.log('[TreasureHunt] No player location or treasure selected for proximity check');
      return false;
    }
    const R = 6371000;
    const dLat = (selectedTreasure.latitude - playerLocation.latitude) * Math.PI / 180;
    const dLon = (selectedTreasure.longitude - playerLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(playerLocation.latitude * Math.PI / 180) * Math.cos(selectedTreasure.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    console.log(`[TreasureHunt] Distance to treasure: ${distance.toFixed(0)}m (limit: ${CLAIM_PROXIMITY_METERS}m)`);
    return distance <= CLAIM_PROXIMITY_METERS;
  }, [selectedTreasure, playerLocation, CLAIM_PROXIMITY_METERS]);

  const handleStartARScan = useCallback(async () => {
    if (!selectedTreasure) return;

    if (dailyClaimsRemaining <= 0) {
      Alert.alert('Daily Limit Reached', `You've claimed all ${MAX_DAILY_TREASURES} treasures for today. Come back tomorrow!`);
      return;
    }

    console.log('[TreasureHunt] Starting AR scan for treasure:', selectedTreasure.name);
    const granted = await handleRequestCameraPermission();
    console.log('[TreasureHunt] Permission result for AR scan:', granted);
    if (!granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera access to scan for treasures. Go to your device settings to enable it.',
        [{ text: 'OK' }]
      );
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    console.log('[TreasureHunt] Opening AR camera modal...');
    setCameraKey(prev => prev + 1);
    setShowARCamera(true);
    setIsScanning(false);
    setArScanProgress(0);
    setHoldProgress(0);
    setIsClaiming(false);
    setIsHolding(false);
    setCameraReady(false);
    setProximityChecked(false);
    setIsNearTreasure(false);
    setScanPhase('waiting_camera');
    holdProgressAnim.setValue(0);

    Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTreasure, dailyClaimsRemaining, handleRequestCameraPermission]);

  useEffect(() => {
    if (showARCamera && cameraReady && scanPhase === 'waiting_camera') {
      console.log('[TreasureHunt] Camera is ready, checking proximity...');
      setScanPhase('scanning');
      setIsScanning(true);

      const near = checkProximity();
      setProximityChecked(true);
      setIsNearTreasure(near);

      if (near) {
        console.log('[TreasureHunt] Player is near treasure, starting scan...');
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 10 + 3;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setArScanProgress(100);
            setScanPhase('ready');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            setArScanProgress(Math.min(progress, 99));
          }
        }, 500);
      } else {
        console.log('[TreasureHunt] Player is NOT near treasure');
        setArScanProgress(0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showARCamera, cameraReady, scanPhase]);

  useEffect(() => {
    if (showARCamera && scanPhase === 'waiting_camera') {
      if (Platform.OS === 'web') {
        const timer = setTimeout(() => {
          console.log('[TreasureHunt] Web fallback: treating camera as ready');
          setCameraReady(true);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        const nativeFallbackTimer = setTimeout(() => {
          if (!cameraReady) {
            console.log('[TreasureHunt] Native fallback: onCameraReady did not fire after 3s, forcing ready');
            setCameraReady(true);
          }
        }, 3000);
        return () => clearTimeout(nativeFallbackTimer);
      }
    }
  }, [showARCamera, scanPhase, cameraReady]);

  useEffect(() => {
    if (showLegendPreview && !cameraReady && Platform.OS !== 'web') {
      const timer = setTimeout(() => {
        if (!cameraReady) {
          console.log('[TreasureHunt] Legend preview camera fallback: forcing ready after 3s');
          setCameraReady(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showLegendPreview, cameraReady]);

  const handleHoldStart = useCallback(() => {
    if (scanPhase !== 'ready' || isClaiming || !isNearTreasure) return;
    console.log('[TreasureHunt] Hold started for claim...');
    setIsHolding(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let hp = 0;
    holdTimerRef.current = setInterval(() => {
      hp += 3;
      if (hp >= 100) {
        hp = 100;
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        setHoldProgress(100);
        holdProgressAnim.setValue(1);
        setIsClaiming(true);
        setScanPhase('claimed');
        setIsHolding(false);
        console.log('[TreasureHunt] Hold complete, claiming treasure!');
        setTimeout(() => {
          handleClaimTreasure();
        }, 300);
      } else {
        setHoldProgress(hp);
        holdProgressAnim.setValue(hp / 100);
      }
    }, 80);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanPhase, isClaiming, isNearTreasure, holdProgressAnim]);

  const handleHoldEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (!isClaiming) {
      setIsHolding(false);
      setHoldProgress(0);
      holdProgressAnim.setValue(0);
    }
  }, [isClaiming, holdProgressAnim]);

  const handleClaimTreasure = useCallback(() => {
    if (!selectedTreasure) return;

    const result = claimTreasure(selectedTreasure.id);
    setClaimResult(result);
    setIsScanning(false);
    setShowARCamera(false);

    if (result.success) {
      mintTokens(result.tokensAwarded, 'Scavenger Hunt: ' + selectedTreasure.name, {
        source: 'scavenger_hunt',
        category: 'treasure_claim',
        relatedId: selectedTreasure.id,
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.spring(claimScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTreasure, claimTreasure, mintTokens]);

  const closeClaimModal = useCallback(() => {
    setShowClaimModal(false);
    setClaimResult(null);
    selectTreasure(null);
    claimScaleAnim.setValue(0);
    setHoldProgress(0);
    setIsClaiming(false);
    setIsHolding(false);
    setProximityChecked(false);
    setIsNearTreasure(false);
    setScanPhase('waiting_camera');
    holdProgressAnim.setValue(0);
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectTreasure]);

  const coinRotation = coinSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getPlaceTypeIcon = (placeType: string) => {
    switch (placeType) {
      case 'park': return <TreePine size={12} color="#10B981" />;
      case 'gas_station': return <Fuel size={12} color="#F59E0B" />;
      case 'restaurant': return <UtensilsCrossed size={12} color="#EF4444" />;
      default: return <MapPin size={12} color={colors.textSecondary} />;
    }
  };

  const renderHeader = () => (
    <LinearGradient
      colors={isDark ? ['#0a1628', '#132744', '#0d1f3c'] : ['#0F4C75', '#1B6CA8', '#3282B8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🗺️ Treasure Hunt</Text>
          <View style={styles.locationRow}>
            {playerLocation ? (
              <Text style={styles.headerSubtitle}>
                📍 {playerLocation.latitude.toFixed(3)}°N, {Math.abs(playerLocation.longitude).toFixed(3)}°W
              </Text>
            ) : (
              <Text style={styles.headerSubtitle}>📍 Locating you...</Text>
            )}
            <TouchableOpacity
              style={styles.relocateBtn}
              onPress={handleRequestLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#7DD3FC" />
              ) : (
                <LocateFixed size={14} color="#7DD3FC" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.streakBadge}>
            <Flame size={14} color="#F59E0B" />
            <Text style={styles.streakText}>{huntStreak.currentStreak}</Text>
          </View>
        </View>
      </View>

      <View style={styles.dailyLimitBar}>
        <View style={styles.dailyLimitLeft}>
          <Target size={14} color="#7DD3FC" />
          <Text style={styles.dailyLimitText}>
            {dailyClaimsRemaining}/{MAX_DAILY_TREASURES} Claims Left Today
          </Text>
        </View>
        <View style={styles.dailyLimitDots}>
          {Array.from({ length: MAX_DAILY_TREASURES }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dailyLimitDot,
                {
                  backgroundColor: i < (MAX_DAILY_TREASURES - dailyClaimsRemaining)
                    ? '#10B981'
                    : 'rgba(255,255,255,0.2)',
                },
              ]}
            />
          ))}
        </View>
      </View>

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

  const renderRadiusBanner = () => (
    <View style={[styles.radiusBanner, { backgroundColor: isDark ? '#132744' : '#E0F2FE' }]}>
      <View style={styles.radiusBannerContent}>
        <Animated.View style={{ opacity: locationPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }}>
          <LocateFixed size={18} color={isDark ? '#38BDF8' : '#0284C7'} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.radiusBannerTitle, { color: isDark ? '#7DD3FC' : '#0369A1' }]}>
            5-Mile Radius Active
          </Text>
          <Text style={[styles.radiusBannerSub, { color: isDark ? '#BAE6FD' : '#0C4A6E' }]}>
            10 treasures placed near parks, gas stations & restaurants around you
          </Text>
        </View>
      </View>
      <View style={styles.placeTypeRow}>
        {(['park', 'gas_station', 'restaurant'] as const).map(type => {
          const config = PLACE_TYPE_CONFIG[type];
          const count = treasures.filter(t => t.placeType === type).length;
          return (
            <View key={type} style={[styles.placeTypeChip, { backgroundColor: isDark ? '#1E3A5F' : '#BAE6FD' }]}>
              <Text style={styles.placeTypeChipIcon}>{config.icon}</Text>
              <Text style={[styles.placeTypeChipText, { color: isDark ? '#BAE6FD' : '#0C4A6E' }]}>
                {config.label} ({count})
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderViewToggle = () => (
    <View style={[styles.viewToggle, { backgroundColor: colors.surface }]}>
      {(['map', 'list', 'legend', 'stats'] as ViewMode[]).map(mode => (
        <TouchableOpacity
          key={mode}
          style={[styles.viewToggleBtn, viewMode === mode && { backgroundColor: '#0F4C75' }]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode(mode);
          }}
        >
          {mode === 'map' && <MapIcon size={14} color={viewMode === mode ? '#FFF' : colors.textSecondary} />}
          {mode === 'list' && <Target size={14} color={viewMode === mode ? '#FFF' : colors.textSecondary} />}
          {mode === 'legend' && <BookOpen size={14} color={viewMode === mode ? '#FFF' : colors.textSecondary} />}
          {mode === 'stats' && <Trophy size={14} color={viewMode === mode ? '#FFF' : colors.textSecondary} />}
          <Text style={[styles.viewToggleText, { color: viewMode === mode ? '#FFF' : colors.textSecondary }]}>
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMapView = () => {
    const centerLat = playerLocation?.latitude || 34.0522;
    const centerLon = playerLocation?.longitude || -118.2437;

    return (
      <View style={styles.mapContainer}>
        <View style={[styles.mapPlaceholder, { backgroundColor: isDark ? '#0a1628' : '#E0F2FE' }]}>
          <Image
            source={{
              uri: `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLon}&zoom=12&size=${Math.round(SCREEN_WIDTH)}x400&maptype=mapnik`,
            }}
            style={styles.mapImage}
            resizeMode="cover"
          />

          <View style={styles.markersOverlay}>
            {playerLocation && (
              <View style={[styles.playerMarker, { left: '48%', top: '47%' }]}>
                <Animated.View
                  style={[
                    styles.playerPulseRing,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: locationPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] }),
                    },
                  ]}
                />
                <View style={styles.playerDot}>
                  <Text style={styles.playerDotIcon}>📍</Text>
                </View>
              </View>
            )}

            {treasures.map(treasure => {
              const claimed = isTreasureClaimed(treasure.id);
              const rarity = RARITY_CONFIG[treasure.rarity];
              const latDiff = treasure.latitude - centerLat;
              const lonDiff = treasure.longitude - centerLon;
              const relativeX = 50 + (lonDiff / 0.12) * 45;
              const relativeY = 50 - (latDiff / 0.08) * 45;

              return (
                <TouchableOpacity
                  key={treasure.id}
                  style={[
                    styles.mapMarker,
                    {
                      left: `${Math.min(Math.max(relativeX, 3), 93)}%`,
                      top: `${Math.min(Math.max(relativeY, 3), 88)}%`,
                      opacity: claimed ? 0.35 : 1,
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

          <View style={[styles.mapLegend, { backgroundColor: colors.surface + 'E6' }]}>
            <Text style={[styles.mapLegendTitle, { color: colors.text }]}>Locations</Text>
            {(['park', 'gas_station', 'restaurant'] as const).map(type => {
              const config = PLACE_TYPE_CONFIG[type];
              return (
                <View key={type} style={styles.legendItem}>
                  <Text style={{ fontSize: 10 }}>{config.icon}</Text>
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>{config.label}</Text>
                </View>
              );
            })}
          </View>

          <View style={[styles.radiusIndicator, { borderColor: isDark ? '#38BDF840' : '#0284C740' }]}>
            <Text style={[styles.radiusIndicatorText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>5 mi</Text>
          </View>
        </View>

        <View style={[styles.osmAttribution, { backgroundColor: colors.surface }]}>
          <Text style={[styles.osmText, { color: colors.textSecondary }]}>
            © OpenStreetMap contributors • 5-mile radius
          </Text>
          <TouchableOpacity onPress={() => refreshDailyTreasures()}>
            <RefreshCw size={14} color="#0F4C75" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTreasureCard = (treasure: TreasureLocation, _index: number) => {
    const claimed = isTreasureClaimed(treasure.id);
    const rarity = RARITY_CONFIG[treasure.rarity];
    const typeConfig = TREASURE_TYPE_CONFIG[treasure.treasureType];
    const placeConfig = PLACE_TYPE_CONFIG[treasure.placeType];
    const distance = treasureDistances.find(d => d.treasure.id === treasure.id);
    const isReal = treasure.isRealPlace && treasure.locationName;
    const isPark = treasure.placeType === 'park';

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
            {!claimed && typeConfig.imageUrl && treasure.treasureType === 'treasure_chest' ? (
              <AnimatedTreasureChest imageUrl={typeConfig.imageUrl} size={40} />
            ) : !claimed && typeConfig.imageUrl && treasure.treasureType === 'token_fountain' ? (
              <AnimatedTokenFountain imageUrl={typeConfig.imageUrl} size={40} />
            ) : !claimed && typeConfig.imageUrl && treasure.treasureType === 'golden_muso' ? (
              <AnimatedGoldenMuso imageUrl={typeConfig.imageUrl} size={40} />
            ) : !claimed && typeConfig.imageUrl && treasure.treasureType === 'crystal_vault' ? (
              <AnimatedCrystalVault imageUrl={typeConfig.imageUrl} size={40} />
            ) : !claimed && typeConfig.imageUrl && treasure.treasureType === 'coin_pile' ? (
              <AnimatedCoinPile imageUrl={typeConfig.imageUrl} size={40} />
            ) : !claimed && typeConfig.imageUrl ? (
              <Image source={{ uri: typeConfig.imageUrl }} style={styles.treasureCardImage} resizeMode="contain" />
            ) : (
              <Text style={styles.treasureCardIcon}>{claimed ? '✅' : treasure.icon}</Text>
            )}
          </View>
        </View>

        <View style={styles.treasureCardCenter}>
          <View style={styles.treasureNameRow}>
            <Text style={[styles.treasureCardName, { color: claimed ? colors.textSecondary : colors.text }]} numberOfLines={1}>
              {treasure.name}
            </Text>
            {claimed && <Lock size={12} color={colors.textSecondary} />}
            {isReal && (
              <View style={styles.realPlaceBadge}>
                <Text style={styles.realPlaceBadgeText}>REAL</Text>
              </View>
            )}
          </View>

          {isReal && !isPark && (
            <View style={styles.realLocationLabelRow}>
              <MapPin size={11} color="#0EA5E9" />
              <Text style={[styles.realLocationLabel, { color: '#0EA5E9' }]} numberOfLines={1}>
                {treasure.locationName}{treasure.locationAddress ? `, ${treasure.locationAddress}` : ''}
              </Text>
            </View>
          )}

          {isReal && isPark && (
            <View style={styles.parkHintRow}>
              <Eye size={11} color="#10B981" />
              <Text style={[styles.parkHintLabel, { color: '#10B981' }]} numberOfLines={1}>
                Hint: Search near {treasure.locationName}
              </Text>
            </View>
          )}

          <View style={styles.treasureLocationRow}>
            {getPlaceTypeIcon(treasure.placeType)}
            <Text style={[styles.treasureCardLocation, { color: colors.textSecondary }]} numberOfLines={1}>
              {placeConfig.label} • {treasure.neighborhood}
            </Text>
          </View>
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
          {dailyProgress.claimedTreasures} of {MAX_DAILY_TREASURES} found • {dailyClaimsRemaining} claims left
        </Text>
      </View>

      {dailyClaimsRemaining <= 0 && (
        <View style={[styles.limitReachedBanner, { backgroundColor: '#F59E0B15' }]}>
          <AlertCircle size={18} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.limitReachedTitle, { color: '#F59E0B' }]}>Daily Limit Reached!</Text>
            <Text style={[styles.limitReachedSub, { color: colors.textSecondary }]}>
              You've claimed all {MAX_DAILY_TREASURES} treasures today. New treasures appear at midnight.
            </Text>
          </View>
        </View>
      )}

      {treasures.map((treasure, index) => renderTreasureCard(treasure, index))}
    </View>
  );

  const renderLegendView = () => {
    const treasureTypes = Object.entries(TREASURE_TYPE_CONFIG) as [string, { label: string; icon: string; baseReward: number; imageUrl?: string; isGif?: boolean }][];
    const rarities = Object.entries(RARITY_CONFIG) as [string, { color: string; glowIntensity: number; label: string; multiplier: number; bgColor: string }][];
    const placeTypes = Object.entries(PLACE_TYPE_CONFIG) as [string, { label: string; icon: string; priority: number }][];
    const streaks = Object.entries(STREAK_BONUSES) as [string, { multiplier: number; label: string }][];

    return (
      <View style={styles.legendContainer}>
        <View style={[styles.legendSection, { backgroundColor: colors.surface }]}> 
          <View style={styles.legendSectionHeader}>
            <View style={[styles.legendSectionIconWrap, { backgroundColor: '#F59E0B18' }]}>
              <Gift size={18} color="#F59E0B" />
            </View>
            <View>
              <Text style={[styles.legendSectionTitle, { color: colors.text }]}>Treasure Types</Text>
              <Text style={[styles.legendSectionSub, { color: colors.textSecondary }]}>What you can discover</Text>
            </View>
          </View>
          {treasureTypes.map(([key, config], index) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.legendRow,
                index < treasureTypes.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
              ]}
              activeOpacity={0.7}
              onPress={() => handleLegendPreview({ key, ...config })}
            >
              <View style={[styles.legendItemIcon, { backgroundColor: '#F59E0B10' }]}>
                {config.imageUrl && key === 'treasure_chest' ? (
                  <AnimatedTreasureChest imageUrl={config.imageUrl} size={36} />
                ) : config.imageUrl && key === 'token_fountain' ? (
                  <AnimatedTokenFountain imageUrl={config.imageUrl} size={36} />
                ) : config.imageUrl && key === 'golden_muso' ? (
                  <AnimatedGoldenMuso imageUrl={config.imageUrl} size={36} />
                ) : config.imageUrl && key === 'crystal_vault' ? (
                  <AnimatedCrystalVault imageUrl={config.imageUrl} size={36} />
                ) : config.imageUrl && key === 'coin_pile' ? (
                  <AnimatedCoinPile imageUrl={config.imageUrl} size={36} />
                ) : config.imageUrl ? (
                  <Image source={{ uri: config.imageUrl }} style={styles.legendItemImage} resizeMode="contain" />
                ) : (
                  <Text style={styles.legendItemEmoji}>{config.icon}</Text>
                )}
              </View>
              <View style={styles.legendItemInfo}>
                <Text style={[styles.legendItemName, { color: colors.text }]}>{config.label}</Text>
                <Text style={[styles.legendItemDesc, { color: colors.textSecondary }]}>Tap to preview in AR</Text>
              </View>
              <View style={styles.legendItemValue}>
                <Camera size={14} color="#0F4C75" />
                <Coins size={14} color="#F59E0B" />
                <Text style={styles.legendItemReward}>{config.baseReward}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={[styles.legendNote, { backgroundColor: isDark ? '#1E3A5F' : '#FEF3C7' }]}>
            <Sparkles size={13} color="#F59E0B" />
            <Text style={[styles.legendNoteText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
              Final reward = Base × Rarity Multiplier × Streak Bonus
            </Text>
          </View>
        </View>

        <View style={[styles.legendSection, { backgroundColor: colors.surface }]}>
          <View style={styles.legendSectionHeader}>
            <View style={[styles.legendSectionIconWrap, { backgroundColor: '#8B5CF618' }]}>
              <Star size={18} color="#8B5CF6" />
            </View>
            <View>
              <Text style={[styles.legendSectionTitle, { color: colors.text }]}>Rarity Tiers</Text>
              <Text style={[styles.legendSectionSub, { color: colors.textSecondary }]}>Higher rarity = bigger rewards</Text>
            </View>
          </View>
          {rarities.map(([key, config], index) => (
            <View
              key={key}
              style={[
                styles.legendRow,
                index < rarities.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
              ]}
            >
              <View style={[styles.legendRarityDot, { backgroundColor: config.bgColor, borderColor: config.color }]}>
                <View style={[styles.legendRarityInner, { backgroundColor: config.color }]} />
              </View>
              <View style={styles.legendItemInfo}>
                <Text style={[styles.legendItemName, { color: config.color }]}>{config.label}</Text>
                <View style={styles.legendGlowBar}>
                  <View style={[styles.legendGlowFill, { width: `${config.glowIntensity * 100}%`, backgroundColor: config.color }]} />
                </View>
              </View>
              <View style={[styles.legendMultiplierBadge, { backgroundColor: config.bgColor }]}>
                <Text style={[styles.legendMultiplierText, { color: config.color }]}>×{config.multiplier}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.legendSection, { backgroundColor: colors.surface }]}>
          <View style={styles.legendSectionHeader}>
            <View style={[styles.legendSectionIconWrap, { backgroundColor: '#10B98118' }]}>
              <MapPin size={18} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.legendSectionTitle, { color: colors.text }]}>Location Types</Text>
              <Text style={[styles.legendSectionSub, { color: colors.textSecondary }]}>Where treasures spawn</Text>
            </View>
          </View>
          {placeTypes.map(([key, config], index) => (
            <View
              key={key}
              style={[
                styles.legendRow,
                index < placeTypes.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
              ]}
            >
              <View style={[styles.legendItemIcon, { backgroundColor: config.priority === 1 ? '#10B98110' : config.priority === 2 ? '#3B82F610' : '#9CA3AF10' }]}>
                <Text style={styles.legendItemEmoji}>{config.icon}</Text>
              </View>
              <View style={styles.legendItemInfo}>
                <Text style={[styles.legendItemName, { color: colors.text }]}>{config.label}</Text>
                <Text style={[styles.legendItemDesc, { color: colors.textSecondary }]}>
                  {config.priority === 1 ? 'High priority' : config.priority === 2 ? 'Medium priority' : 'Low priority'}
                </Text>
              </View>
              <View style={[styles.legendPriorityBadge, {
                backgroundColor: config.priority === 1 ? '#10B98118' : config.priority === 2 ? '#3B82F618' : '#9CA3AF18',
              }]}>
                <Text style={[styles.legendPriorityText, {
                  color: config.priority === 1 ? '#10B981' : config.priority === 2 ? '#3B82F6' : '#9CA3AF',
                }]}>P{config.priority}</Text>
              </View>
            </View>
          ))}
          <View style={[styles.legendNote, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
            <TreePine size={13} color="#10B981" />
            <Text style={[styles.legendNoteText, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
              Parks give hints only — gas stations & restaurants show exact names
            </Text>
          </View>
        </View>

        <View style={[styles.legendSection, { backgroundColor: colors.surface }]}>
          <View style={styles.legendSectionHeader}>
            <View style={[styles.legendSectionIconWrap, { backgroundColor: '#EF444418' }]}>
              <Flame size={18} color="#EF4444" />
            </View>
            <View>
              <Text style={[styles.legendSectionTitle, { color: colors.text }]}>Streak Bonuses</Text>
              <Text style={[styles.legendSectionSub, { color: colors.textSecondary }]}>Hunt daily for multipliers</Text>
            </View>
          </View>
          {streaks.map(([days, config], index) => {
            const active = huntStreak.currentStreak >= Number(days);
            return (
              <View
                key={days}
                style={[
                  styles.legendRow,
                  index < streaks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
                ]}
              >
                <View style={[
                  styles.legendStreakIcon,
                  { backgroundColor: active ? '#F59E0B18' : colors.background },
                ]}>
                  {active ? <Unlock size={16} color="#F59E0B" /> : <Lock size={16} color={colors.textSecondary} />}
                </View>
                <View style={styles.legendItemInfo}>
                  <Text style={[styles.legendItemName, { color: active ? '#F59E0B' : colors.text }]}>
                    {days}-Day Streak
                  </Text>
                  <Text style={[styles.legendItemDesc, { color: colors.textSecondary }]}>{config.label}</Text>
                </View>
                <View style={[styles.legendMultiplierBadge, {
                  backgroundColor: active ? '#F59E0B18' : colors.background,
                }]}>
                  <Text style={[styles.legendMultiplierText, {
                    color: active ? '#F59E0B' : colors.textSecondary,
                  }]}>×{config.multiplier}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.legendSection, { backgroundColor: colors.surface }]}>
          <View style={styles.legendSectionHeader}>
            <View style={[styles.legendSectionIconWrap, { backgroundColor: '#0F4C7518' }]}>
              <Coins size={18} color="#0F4C75" />
            </View>
            <View>
              <Text style={[styles.legendSectionTitle, { color: colors.text }]}>Reward Examples</Text>
              <Text style={[styles.legendSectionSub, { color: colors.textSecondary }]}>Potential MUSO earnings</Text>
            </View>
          </View>
          {[
            { type: 'Coin Pile', rarity: 'Common', base: 25, mult: 1.0, total: 25, icon: '🪙', rarityColor: '#9CA3AF', imageUrl: TREASURE_TYPE_CONFIG.coin_pile.imageUrl },
            { type: 'Treasure Chest', rarity: 'Rare', base: 50, mult: 1.5, total: 75, icon: '📦', rarityColor: '#3B82F6', imageUrl: TREASURE_TYPE_CONFIG.treasure_chest.imageUrl },
            { type: 'Golden MUSO', rarity: 'Epic', base: 100, mult: 2.0, total: 200, icon: '🏆', rarityColor: '#8B5CF6', imageUrl: TREASURE_TYPE_CONFIG.golden_muso.imageUrl },
            { type: 'Token Fountain', rarity: 'Legendary', base: 200, mult: 3.0, total: 600, icon: '⛲', rarityColor: '#F59E0B', imageUrl: TREASURE_TYPE_CONFIG.token_fountain.imageUrl },
          ].map((example, index) => (
            <View
              key={index}
              style={[
                styles.legendExampleRow,
                index < 3 && { borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
              ]}
            >
              {example.imageUrl && example.type === 'Treasure Chest' ? (
                <AnimatedTreasureChest imageUrl={example.imageUrl} size={36} />
              ) : example.imageUrl && example.type === 'Token Fountain' ? (
                <AnimatedTokenFountain imageUrl={example.imageUrl} size={36} />
              ) : example.imageUrl && example.type === 'Golden MUSO' ? (
                <AnimatedGoldenMuso imageUrl={example.imageUrl} size={36} />
              ) : example.imageUrl && example.type === 'Crystal Vault' ? (
                <AnimatedCrystalVault imageUrl={example.imageUrl} size={36} />
              ) : example.imageUrl && example.type === 'Coin Pile' ? (
                <AnimatedCoinPile imageUrl={example.imageUrl} size={36} />
              ) : example.imageUrl ? (
                <Image source={{ uri: example.imageUrl }} style={styles.legendExampleImage} resizeMode="contain" />
              ) : (
                <Text style={styles.legendExampleIcon}>{example.icon}</Text>
              )}
              <View style={styles.legendExampleInfo}>
                <Text style={[styles.legendExampleName, { color: colors.text }]}>{example.type}</Text>
                <Text style={[styles.legendExampleCalc, { color: colors.textSecondary }]}>
                  {example.base} × {example.mult} = <Text style={{ color: example.rarityColor, fontWeight: '700' as const }}>{example.total} MUSO</Text>
                </Text>
              </View>
              <View style={[styles.legendExampleBadge, { backgroundColor: example.rarityColor + '18' }]}>
                <Text style={[styles.legendExampleBadgeText, { color: example.rarityColor }]}>{example.rarity}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStatsView = () => {
    const stats = ScavengerHuntService.getHuntStats(claims, huntStreak);
    return (
      <View style={styles.statsContainer}>
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statsCardTitle, { color: colors.text }]}>🏆 Hunt Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#0F4C75' }]}>{stats.totalTokens}</Text>
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

        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statsCardTitle, { color: colors.text }]}>📍 Daily Limits</Text>
          <View style={styles.dailyLimitStats}>
            <View style={styles.dailyLimitStatRow}>
              <Text style={[styles.dailyLimitStatLabel, { color: colors.textSecondary }]}>Max Claims Per Day</Text>
              <Text style={[styles.dailyLimitStatValue, { color: colors.text }]}>{MAX_DAILY_TREASURES}</Text>
            </View>
            <View style={styles.dailyLimitStatRow}>
              <Text style={[styles.dailyLimitStatLabel, { color: colors.textSecondary }]}>Claimed Today</Text>
              <Text style={[styles.dailyLimitStatValue, { color: '#10B981' }]}>{stats.todayClaims}</Text>
            </View>
            <View style={styles.dailyLimitStatRow}>
              <Text style={[styles.dailyLimitStatLabel, { color: colors.textSecondary }]}>Remaining Today</Text>
              <Text style={[styles.dailyLimitStatValue, { color: '#F59E0B' }]}>{stats.remainingToday}</Text>
            </View>
            <View style={styles.dailyLimitStatRow}>
              <Text style={[styles.dailyLimitStatLabel, { color: colors.textSecondary }]}>Treasure Radius</Text>
              <Text style={[styles.dailyLimitStatValue, { color: '#3B82F6' }]}>5 miles</Text>
            </View>
          </View>
        </View>

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

        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statsCardTitle, { color: colors.text }]}>📅 Today's Progress</Text>
          <View style={styles.todayStats}>
            <View style={styles.todayStatRow}>
              <Text style={[styles.todayStatLabel, { color: colors.textSecondary }]}>Treasures Found</Text>
              <Text style={[styles.todayStatValue, { color: colors.text }]}>
                {stats.todayClaims} / {MAX_DAILY_TREASURES}
              </Text>
            </View>
            <View style={styles.todayStatRow}>
              <Text style={[styles.todayStatLabel, { color: colors.textSecondary }]}>Tokens Earned</Text>
              <Text style={[styles.todayStatValue, { color: '#F59E0B' }]}>{stats.todayTokens} MUSO</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderCameraBackground = () => {
    const hasPermission = permissionGranted || cameraPermission?.granted;
    console.log('[TreasureHunt] renderCameraBackground - Platform:', Platform.OS, 'permissionGranted:', permissionGranted, 'hookGranted:', cameraPermission?.granted, 'hookStatus:', cameraPermission?.status, 'hasPermission:', hasPermission);
    if (Platform.OS === 'web') {
      return (
        <LinearGradient
          colors={['#0a0a1a', '#1a1a3e', '#0d0d2b']}
          style={StyleSheet.absoluteFill}
        />
      );
    }
    if (!hasPermission) {
      console.log('[TreasureHunt] No camera permission, showing gradient with retry button');
      return (
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['#0a0a1a', '#1a1a3e', '#0d0d2b']}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Camera size={48} color="#7DD3FC" />
            <Text style={{ color: '#7DD3FC', fontSize: 16, marginTop: 16, textAlign: 'center', paddingHorizontal: 32 }}>
              Camera permission is needed to scan for treasures
            </Text>
            <TouchableOpacity
              style={{ marginTop: 16, backgroundColor: '#1B6CA8', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
              onPress={async () => {
                console.log('[TreasureHunt] Retry permission from camera background');
                const granted = await handleRequestCameraPermission();
                if (granted) {
                  setCameraKey(prev => prev + 1);
                }
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' as const }}>Grant Camera Access</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    console.log('[TreasureHunt] Rendering CameraView component, key:', cameraKey);
    return (
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          key={`camera-${cameraKey}`}
          style={{ flex: 1 }}
          facing="back"
          onCameraReady={() => {
            console.log('[TreasureHunt] Camera ready callback fired!');
            setCameraReady(true);
          }}
          onMountError={(e) => {
            console.log('[TreasureHunt] Camera mount error:', e.message);
            Alert.alert('Camera Error', 'Failed to open camera: ' + e.message);
            setCameraReady(true);
          }}
        />
      </View>
    );
  };

  const renderLegendPreviewModal = () => {
    if (!legendPreviewType) return null;

    const treasureTypeColors: Record<string, string> = {
      coin_pile: '#F59E0B',
      treasure_chest: '#3B82F6',
      golden_muso: '#EF4444',
      crystal_vault: '#8B5CF6',
      token_fountain: '#10B981',
    };

    const typeColor = treasureTypeColors[legendPreviewType.key] || '#F59E0B';

    return (
      <Modal visible={showLegendPreview} animationType="fade" statusBarTranslucent onRequestClose={() => { setShowLegendPreview(false); setLegendPreviewType(null); }}>
        <View style={styles.arContainer}>
          {renderCameraBackground()}

          <View style={styles.arOverlay}>
            <View style={styles.arGrid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <View
                  key={`h${i}`}
                  style={[styles.arGridLineH, { top: `${(i + 1) * 12}%`, opacity: 0.08 }]}
                />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={`v${i}`}
                  style={[styles.arGridLineV, { left: `${(i + 1) * 16}%`, opacity: 0.08 }]}
                />
              ))}
            </View>

            <View style={styles.arTokenCenter}>
              <Animated.View
                style={[
                  styles.arPreviewOuter,
                  {
                    transform: [{ translateY: floatAnim }],
                  },
                ]}
              >
                <View style={[styles.arPreviewGlow, { borderColor: typeColor + '50', shadowColor: typeColor }]} />
                <View style={[styles.arPreviewBody, { backgroundColor: typeColor + '20', borderColor: typeColor }]}>
                  {legendPreviewType.imageUrl && legendPreviewType.key === 'treasure_chest' ? (
                    <AnimatedTreasureChest imageUrl={legendPreviewType.imageUrl} size={140} />
                  ) : legendPreviewType.imageUrl && legendPreviewType.key === 'token_fountain' ? (
                    <AnimatedTokenFountain imageUrl={legendPreviewType.imageUrl} size={140} />
                  ) : legendPreviewType.imageUrl && legendPreviewType.key === 'golden_muso' ? (
                    <AnimatedGoldenMuso imageUrl={legendPreviewType.imageUrl} size={140} />
                  ) : legendPreviewType.imageUrl && legendPreviewType.key === 'crystal_vault' ? (
                    <AnimatedCrystalVault imageUrl={legendPreviewType.imageUrl} size={140} />
                  ) : legendPreviewType.imageUrl && legendPreviewType.key === 'coin_pile' ? (
                    <AnimatedCoinPile imageUrl={legendPreviewType.imageUrl} size={140} />
                  ) : legendPreviewType.imageUrl ? (
                    <Image source={{ uri: legendPreviewType.imageUrl }} style={styles.arPreviewImage} resizeMode="contain" />
                  ) : (
                    <Text style={styles.arPreviewIcon}>{legendPreviewType.icon}</Text>
                  )}
                </View>
                {[...Array(8)].map((_, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.arParticle,
                      {
                        backgroundColor: typeColor,
                        left: (SCREEN_WIDTH * 0.45) + Math.cos((i * Math.PI * 2) / 8) * 100,
                        top: (SCREEN_HEIGHT * 0.35) + Math.sin((i * Math.PI * 2) / 8) * 100,
                        opacity: shimmerAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.2, 0.9, 0.2],
                        }),
                      },
                    ]}
                  />
                ))}
              </Animated.View>
            </View>

            <SafeAreaView style={styles.arHUD} pointerEvents="box-none">
              <View style={styles.arTopBar}>
                <TouchableOpacity
                  style={styles.arBackBtn}
                  onPress={() => {
                    setShowLegendPreview(false);
                    setLegendPreviewType(null);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ChevronLeft size={22} color="#FFF" />
                  <Text style={styles.arBackBtnText}>Back</Text>
                </TouchableOpacity>
                <View style={styles.arTreasureInfo}>
                  <Text style={styles.arTreasureName}>AR Preview</Text>
                  <View style={[styles.arRarityBadge, { backgroundColor: typeColor + '30' }]}>
                    <Text style={[styles.arRarityText, { color: typeColor }]}>{legendPreviewType.label}</Text>
                  </View>
                </View>
                <View style={styles.arRewardInfo}>
                  <Coins size={16} color="#F59E0B" />
                  <Text style={styles.arRewardText}>{legendPreviewType.baseReward}</Text>
                </View>
              </View>

              <View style={styles.arBottomSection}>
                <View style={styles.arPreviewInfoCard}>
                  <View style={styles.arPreviewInfoHeader}>
                    {legendPreviewType.imageUrl && legendPreviewType.key === 'treasure_chest' ? (
                      <AnimatedTreasureChest imageUrl={legendPreviewType.imageUrl} size={44} />
                    ) : legendPreviewType.imageUrl && legendPreviewType.key === 'token_fountain' ? (
                      <AnimatedTokenFountain imageUrl={legendPreviewType.imageUrl} size={44} />
                    ) : legendPreviewType.imageUrl && legendPreviewType.key === 'golden_muso' ? (
                      <AnimatedGoldenMuso imageUrl={legendPreviewType.imageUrl} size={44} />
                    ) : legendPreviewType.imageUrl && legendPreviewType.key === 'crystal_vault' ? (
                      <AnimatedCrystalVault imageUrl={legendPreviewType.imageUrl} size={44} />
                    ) : legendPreviewType.imageUrl && legendPreviewType.key === 'coin_pile' ? (
                      <AnimatedCoinPile imageUrl={legendPreviewType.imageUrl} size={44} />
                    ) : legendPreviewType.imageUrl ? (
                      <Image source={{ uri: legendPreviewType.imageUrl }} style={styles.arPreviewInfoImage} resizeMode="contain" />
                    ) : (
                      <Text style={styles.arPreviewInfoEmoji}>{legendPreviewType.icon}</Text>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.arPreviewInfoTitle}>{legendPreviewType.label}</Text>
                      <Text style={styles.arPreviewInfoSub}>Base Reward: {legendPreviewType.baseReward} MUSO</Text>
                    </View>
                  </View>
                  <Text style={styles.arPreviewInfoDesc}>
                    This is what a {legendPreviewType.label} looks like in AR when you discover it during a treasure hunt. Look for the floating icon near real-world locations!
                  </Text>
                </View>

                <View style={styles.arInstructions}>
                  <ScanLine size={20} color="#FFF" />
                  <Text style={styles.arInstructionText}>
                    Move your phone around to see the treasure floating in your environment
                  </Text>
                </View>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderARCamera = () => {
    if (!selectedTreasure) return null;
    const rarity = RARITY_CONFIG[selectedTreasure.rarity];
    const typeConfig = TREASURE_TYPE_CONFIG[selectedTreasure.treasureType];

    return (
      <Modal visible={showARCamera} animationType="fade" statusBarTranslucent>
        <View style={styles.arContainer}>
          {renderCameraBackground()}

          <View style={styles.arOverlay}>
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

            <View style={styles.arTokenCenter}>
              <Animated.View
                style={[
                  styles.arScanTreasureOuter,
                  {
                    transform: [
                      { translateY: floatAnim },
                      { scale: arScanProgress >= 100 ? 1 : 0.9 },
                    ],
                  },
                ]}
              >
                <View style={[styles.arScanGlowRing, { borderColor: rarity.color + '40', shadowColor: rarity.color }]} />

                <View style={[styles.arScanTreasureBody, { backgroundColor: rarity.color + '15', borderColor: rarity.color }]}>
                  {typeConfig.imageUrl && selectedTreasure.treasureType === 'treasure_chest' ? (
                    <AnimatedTreasureChest imageUrl={typeConfig.imageUrl} size={SCREEN_HEIGHT * 0.45} />
                  ) : typeConfig.imageUrl && selectedTreasure.treasureType === 'token_fountain' ? (
                    <AnimatedTokenFountain imageUrl={typeConfig.imageUrl} size={SCREEN_HEIGHT * 0.45} />
                  ) : typeConfig.imageUrl && selectedTreasure.treasureType === 'golden_muso' ? (
                    <AnimatedGoldenMuso imageUrl={typeConfig.imageUrl} size={SCREEN_HEIGHT * 0.45} />
                  ) : typeConfig.imageUrl && selectedTreasure.treasureType === 'crystal_vault' ? (
                    <AnimatedCrystalVault imageUrl={typeConfig.imageUrl} size={SCREEN_HEIGHT * 0.45} />
                  ) : typeConfig.imageUrl && selectedTreasure.treasureType === 'coin_pile' ? (
                    <AnimatedCoinPile imageUrl={typeConfig.imageUrl} size={SCREEN_HEIGHT * 0.45} />
                  ) : typeConfig.imageUrl ? (
                    <Image source={{ uri: typeConfig.imageUrl }} style={styles.arScanTreasureImage} resizeMode="contain" />
                  ) : (
                    <View style={[styles.arTokenBody, { backgroundColor: selectedTreasure.modelColor, borderColor: rarity.color }]}>
                      <Animated.View style={{ transform: [{ rotateY: coinRotation }] }}>
                        <Text style={styles.arTokenSymbol}>M</Text>
                        <Text style={styles.arTokenLabel}>MUSO</Text>
                      </Animated.View>
                    </View>
                  )}
                </View>

                {[...Array(8)].map((_, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.arParticle,
                      {
                        backgroundColor: rarity.color,
                        left: (SCREEN_WIDTH * 0.4) + Math.cos((i * Math.PI * 2) / 8) * (SCREEN_HEIGHT * 0.28),
                        top: (SCREEN_HEIGHT * 0.28) + Math.sin((i * Math.PI * 2) / 8) * (SCREEN_HEIGHT * 0.28),
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

            <SafeAreaView style={styles.arHUD}>
              <View style={styles.arTopBar}>
                <TouchableOpacity
                  style={styles.arCloseBtn}
                  onPress={() => {
                    setShowARCamera(false);
                    setIsScanning(false);
                    setScanPhase('waiting_camera');
                    setCameraReady(false);
                    setProximityChecked(false);
                    setIsNearTreasure(false);
                    setHoldProgress(0);
                    setIsClaiming(false);
                    setIsHolding(false);
                    if (holdTimerRef.current) {
                      clearInterval(holdTimerRef.current);
                      holdTimerRef.current = null;
                    }
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

              <View style={styles.arBottomSection}>
                {scanPhase === 'waiting_camera' && (
                  <View style={styles.arProgressContainer}>
                    <ActivityIndicator size="large" color="#FFF" style={{ marginBottom: 12 }} />
                    <Text style={[styles.arProgressText, { fontSize: 15 }]}>
                      Initializing Camera...
                    </Text>
                    <Text style={[styles.arProgressText, { fontSize: 12, marginTop: 4, opacity: 0.7 }]}>
                      Point your camera at the treasure location
                    </Text>
                  </View>
                )}

                {scanPhase === 'scanning' && isNearTreasure && (
                  <View style={styles.arProgressContainer}>
                    <View style={styles.arProgressBg}>
                      <View
                        style={[
                          styles.arProgressFill,
                          {
                            width: `${arScanProgress}%`,
                            backgroundColor: rarity.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.arProgressText}>
                      Scanning... {Math.round(arScanProgress)}%
                    </Text>
                  </View>
                )}

                {scanPhase === 'scanning' && proximityChecked && !isNearTreasure && (
                  <View style={styles.arProgressContainer}>
                    <View style={[styles.arProximityWarning, { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#EF4444' }]}>
                      <AlertCircle size={24} color="#EF4444" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.arProgressText, { fontSize: 15, textAlign: 'left', marginTop: 0, fontWeight: '700' as const }]}>
                          Too Far Away!
                        </Text>
                        <Text style={[styles.arProgressText, { fontSize: 12, textAlign: 'left', marginTop: 4, opacity: 0.85 }]}>
                          You need to be within {CLAIM_PROXIMITY_METERS}m of the treasure location to scan and claim it. Move closer and try again.
                        </Text>
                      </View>
                    </View>
                    {treasureDistances.find(d => d.treasure.id === selectedTreasure.id) && (
                      <Text style={[styles.arProgressText, { marginTop: 8 }]}>
                        📍 Distance: {ScavengerHuntService.formatDistance(treasureDistances.find(d => d.treasure.id === selectedTreasure.id)!.distanceMeters)}
                      </Text>
                    )}
                  </View>
                )}

                {scanPhase === 'ready' && !isClaiming && (
                  <View style={styles.arProgressContainer}>
                    <Text style={[styles.arProgressText, { fontSize: 15, marginBottom: 8 }]}>
                      ✅ Treasure Found!
                    </Text>
                    <View style={styles.holdProgressBarBg}>
                      <View
                        style={[
                          styles.holdProgressBarFill,
                          {
                            width: `${holdProgress}%`,
                            backgroundColor: holdProgress >= 100 ? '#10B981' : '#F59E0B',
                          },
                        ]}
                      />
                    </View>
                    {isHolding && (
                      <Text style={[styles.arProgressText, { marginTop: 6 }]}>
                        Claiming... {Math.round(holdProgress)}%
                      </Text>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.arClaimButton,
                        {
                          backgroundColor: isHolding ? '#F59E0B' : rarity.color,
                        },
                      ]}
                      onPressIn={handleHoldStart}
                      onPressOut={handleHoldEnd}
                      activeOpacity={0.8}
                    >
                      <Target size={22} color="#FFF" />
                      <Text style={styles.arClaimButtonText}>
                        {isHolding ? 'Keep Holding...' : 'Hold to Claim Treasure'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {(scanPhase === 'claimed' || isClaiming) && (
                  <View style={styles.arProgressContainer}>
                    <Text style={[styles.arProgressText, { fontSize: 18, marginBottom: 8 }]}>
                      🎉 Treasure Claimed!
                    </Text>
                    <Text style={[styles.arProgressText, { fontSize: 15 }]}>
                      +{selectedTreasure.tokenReward} MUSO Tokens Added!
                    </Text>
                  </View>
                )}

                <View style={styles.arInstructions}>
                  {scanPhase === 'claimed' || isClaiming ? (
                    <Target size={20} color="#10B981" />
                  ) : scanPhase === 'ready' ? (
                    <Target size={20} color="#F59E0B" />
                  ) : (
                    <Camera size={20} color="#FFF" />
                  )}
                  <Text style={styles.arInstructionText}>
                    {scanPhase === 'claimed' || isClaiming
                      ? 'Treasure claimed! MUSO tokens have been added to your account.'
                      : scanPhase === 'ready'
                        ? 'Press and hold the button below to claim your treasure!'
                        : proximityChecked && !isNearTreasure
                          ? 'You must be physically near the treasure location to claim it.'
                          : scanPhase === 'waiting_camera'
                            ? 'Waiting for camera to initialize...'
                            : 'Scanning the area for hidden treasure...'}
                  </Text>
                </View>

                <View style={styles.arAnchorInfo}>
                  <Navigation size={12} color="#38BDF8" />
                  <Text style={styles.arAnchorText}>
                    AR Anchor: {selectedTreasure.latitude.toFixed(4)}°N, {Math.abs(selectedTreasure.longitude).toFixed(4)}°W
                  </Text>
                </View>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderClaimModal = () => {
    if (!selectedTreasure) return null;
    const rarity = RARITY_CONFIG[selectedTreasure.rarity];
    const typeConfig = TREASURE_TYPE_CONFIG[selectedTreasure.treasureType];
    const placeConfig = PLACE_TYPE_CONFIG[selectedTreasure.placeType];
    const claimed = isTreasureClaimed(selectedTreasure.id);
    const distance = treasureDistances.find(d => d.treasure.id === selectedTreasure.id);
    const atDailyLimit = dailyClaimsRemaining <= 0;

    return (
      <Modal visible={showClaimModal} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeClaimModal}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalTreasureVisual, { backgroundColor: rarity.bgColor }]}>
              <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                {typeConfig.imageUrl && selectedTreasure.treasureType === 'treasure_chest' ? (
                  <AnimatedTreasureChest imageUrl={typeConfig.imageUrl} size={120} />
                ) : typeConfig.imageUrl && selectedTreasure.treasureType === 'token_fountain' ? (
                  <AnimatedTokenFountain imageUrl={typeConfig.imageUrl} size={120} />
                ) : typeConfig.imageUrl && selectedTreasure.treasureType === 'golden_muso' ? (
                  <AnimatedGoldenMuso imageUrl={typeConfig.imageUrl} size={120} />
                ) : typeConfig.imageUrl && selectedTreasure.treasureType === 'crystal_vault' ? (
                  <AnimatedCrystalVault imageUrl={typeConfig.imageUrl} size={120} />
                ) : typeConfig.imageUrl && selectedTreasure.treasureType === 'coin_pile' ? (
                  <AnimatedCoinPile imageUrl={typeConfig.imageUrl} size={120} />
                ) : typeConfig.imageUrl ? (
                  <Image source={{ uri: typeConfig.imageUrl }} style={styles.modalTreasureImage} resizeMode="contain" />
                ) : (
                  <Text style={styles.modalTreasureIcon}>{selectedTreasure.icon}</Text>
                )}
              </Animated.View>
              <View style={[styles.modalRarityBadge, { backgroundColor: rarity.color + '20', borderColor: rarity.color }]}>
                <Text style={[styles.modalRarityText, { color: rarity.color }]}>{rarity.label}</Text>
              </View>
            </View>

            <Text style={[styles.modalTreasureName, { color: colors.text }]}>{selectedTreasure.name}</Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>{selectedTreasure.description}</Text>

            {selectedTreasure.isRealPlace && selectedTreasure.locationName && selectedTreasure.placeType !== 'park' && (
              <View style={[styles.realLocationBanner, { backgroundColor: isDark ? '#0C4A6E' : '#E0F2FE' }]}>
                <MapPin size={18} color="#0EA5E9" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.realLocationBannerName, { color: isDark ? '#7DD3FC' : '#0369A1' }]}>
                    {selectedTreasure.locationName}
                  </Text>
                  {selectedTreasure.locationAddress ? (
                    <Text style={[styles.realLocationBannerAddr, { color: isDark ? '#BAE6FD' : '#0C4A6E' }]}>
                      {selectedTreasure.locationAddress}
                    </Text>
                  ) : null}
                  <Text style={[styles.realLocationBannerHint, { color: isDark ? '#BAE6FD' : '#0C4A6E' }]}>
                    AR anchor placed at the entryway
                  </Text>
                </View>
              </View>
            )}

            {selectedTreasure.isRealPlace && selectedTreasure.locationName && selectedTreasure.placeType === 'park' && (
              <View style={[styles.parkLocationBanner, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                <TreePine size={18} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.parkLocationBannerName, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                    {selectedTreasure.locationName}
                  </Text>
                  <Text style={[styles.parkLocationBannerHint, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                    Exact location hidden — use the hint below to find it!
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <MapPin size={16} color={colors.textSecondary} />
                <Text style={[styles.modalDetailText, { color: colors.text }]}>
                  {placeConfig.icon} {placeConfig.label} • {selectedTreasure.neighborhood}
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
                  AR Anchor: {selectedTreasure.latitude.toFixed(4)}°N, {Math.abs(selectedTreasure.longitude).toFixed(4)}°W
                </Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Target size={16} color={colors.textSecondary} />
                <Text style={[styles.modalDetailText, { color: colors.text }]}>
                  Claims remaining today: {dailyClaimsRemaining}
                </Text>
              </View>
            </View>

            <View style={[styles.hintBox, { backgroundColor: colors.background }]}>
              <Eye size={14} color={selectedTreasure.placeType === 'park' ? '#10B981' : '#F59E0B'} />
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                {selectedTreasure.searchHint || `💡 Hint: ${selectedTreasure.hint}`}
              </Text>
            </View>

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

            {!claimed && !claimResult?.success && !atDailyLimit && (
              <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: rarity.color }]}
                onPress={handleStartARScan}
                activeOpacity={0.8}
              >
                <Camera size={20} color="#FFF" />
                <Text style={styles.scanButtonText}>Open AR Scanner</Text>
              </TouchableOpacity>
            )}

            {atDailyLimit && !claimed && !claimResult?.success && (
              <View style={[styles.limitReachedModal, { backgroundColor: '#F59E0B15' }]}>
                <AlertCircle size={20} color="#F59E0B" />
                <Text style={styles.limitReachedModalText}>
                  Daily limit of {MAX_DAILY_TREASURES} treasures reached. Come back tomorrow!
                </Text>
              </View>
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

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F4C75" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Placing treasures near you...</Text>
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
        {renderRadiusBanner()}
        {renderViewToggle()}

        {viewMode === 'map' && renderMapView()}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'legend' && renderLegendView()}
        {viewMode === 'stats' && renderStatsView()}

        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>🎯 How It Works</Text>
          <View style={styles.infoSteps}>
            <View style={styles.infoStep}>
              <View style={[styles.infoStepIcon, { backgroundColor: '#0F4C7520' }]}>
                <LocateFixed size={18} color="#0F4C75" />
              </View>
              <Text style={[styles.infoStepText, { color: colors.text }]}>10 treasures are placed within 5 miles of you</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={[styles.infoStepIcon, { backgroundColor: '#10B98120' }]}>
                <TreePine size={18} color="#10B981" />
              </View>
              <Text style={[styles.infoStepText, { color: colors.text }]}>Find treasures at parks, gas stations & restaurants</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={[styles.infoStepIcon, { backgroundColor: '#F59E0B20' }]}>
                <Camera size={18} color="#F59E0B" />
              </View>
              <Text style={[styles.infoStepText, { color: colors.text }]}>Open AR camera to scan the 3D MUSO Token anchor</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={[styles.infoStepIcon, { backgroundColor: '#EF444420' }]}>
                <Target size={18} color="#EF4444" />
              </View>
              <Text style={[styles.infoStepText, { color: colors.text }]}>Claim up to {MAX_DAILY_TREASURES} treasures per day max</Text>
            </View>
          </View>
          <Text style={[styles.infoNote, { color: colors.textSecondary }]}>
            🔄 New treasures appear daily at 12:00 AM • Max {MAX_DAILY_TREASURES} claims per day
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderClaimModal()}
      {renderARCamera()}
      {renderLegendPreviewModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  header: { padding: 20, paddingTop: 12 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800' as const, color: '#FFF' },
  headerSubtitle: { fontSize: 12, color: '#BAE6FD', marginTop: 4 },
  headerRight: { alignItems: 'flex-end' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  relocateBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  streakText: { color: '#F59E0B', fontSize: 16, fontWeight: '800' as const },

  dailyLimitBar: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 10,
  },
  dailyLimitLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  dailyLimitText: { color: '#BAE6FD', fontSize: 13, fontWeight: '600' as const },
  dailyLimitDots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dailyLimitDot: { width: 20, height: 6, borderRadius: 3 },

  progressSection: { marginTop: 12 },
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
  progressText: { color: '#BAE6FD', fontSize: 12, marginTop: 6, textAlign: 'center' },

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
  streakBonusText: { color: '#FDE68A', fontSize: 13, fontWeight: '700' as const },

  radiusBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
  },
  radiusBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radiusBannerTitle: { fontSize: 14, fontWeight: '700' as const },
  radiusBannerSub: { fontSize: 12, marginTop: 2 },
  placeTypeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  placeTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  placeTypeChipIcon: { fontSize: 12 },
  placeTypeChipText: { fontSize: 11, fontWeight: '600' as const },

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
  viewToggleText: { fontSize: 13, fontWeight: '600' as const },

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
  playerMarker: {
    position: 'absolute',
    zIndex: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerPulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
  },
  playerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  playerDotIcon: { fontSize: 12 },
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
  mapLegendTitle: { fontSize: 11, fontWeight: '700' as const, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  legendText: { fontSize: 10 },
  radiusIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  radiusIndicatorText: { fontSize: 10, fontWeight: '700' as const },
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

  listContainer: { paddingHorizontal: 16 },
  listHeader: { marginBottom: 12 },
  listTitle: { fontSize: 18, fontWeight: '700' as const },
  listSubtitle: { fontSize: 13, marginTop: 2 },
  limitReachedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  limitReachedTitle: { fontSize: 14, fontWeight: '700' as const },
  limitReachedSub: { fontSize: 12, marginTop: 2 },
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
  treasureCardImage: { width: 40, height: 40, borderRadius: 8 },
  treasureCardCenter: { flex: 1 },
  treasureNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  treasureCardName: { fontSize: 15, fontWeight: '700' as const, flexShrink: 1 },
  treasureLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  treasureCardLocation: { fontSize: 12, flexShrink: 1 },
  treasureCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rarityTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rarityTagText: { fontSize: 10, fontWeight: '700' as const },
  typeTag: { fontSize: 11 },
  treasureCardRight: { alignItems: 'flex-end', gap: 4 },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardText: { fontSize: 15, fontWeight: '800' as const, color: '#F59E0B' },
  distanceText: { fontSize: 11 },

  legendContainer: { paddingHorizontal: 16, gap: 12 },
  legendSection: { borderRadius: 16, padding: 16, overflow: 'hidden' },
  legendSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  legendSectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendSectionTitle: { fontSize: 16, fontWeight: '700' as const },
  legendSectionSub: { fontSize: 12, marginTop: 1 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  legendItemIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendItemEmoji: { fontSize: 22 },
  legendItemImage: { width: 36, height: 36, borderRadius: 6 },
  legendItemInfo: { flex: 1 },
  legendItemName: { fontSize: 15, fontWeight: '600' as const },
  legendItemDesc: { fontSize: 12, marginTop: 2 },
  legendItemValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendItemReward: { fontSize: 16, fontWeight: '800' as const, color: '#F59E0B' },
  legendRarityDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRarityInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendGlowBar: {
    height: 4,
    backgroundColor: 'rgba(128,128,128,0.15)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  legendGlowFill: {
    height: '100%',
    borderRadius: 2,
  },
  legendMultiplierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  legendMultiplierText: { fontSize: 15, fontWeight: '800' as const },
  legendPriorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  legendPriorityText: { fontSize: 12, fontWeight: '700' as const },
  legendStreakIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  legendNoteText: { fontSize: 12, flex: 1, lineHeight: 16 },
  legendExampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  legendExampleIcon: { fontSize: 28 },
  legendExampleImage: { width: 36, height: 36, borderRadius: 8 },
  legendExampleInfo: { flex: 1 },
  legendExampleName: { fontSize: 14, fontWeight: '600' as const },
  legendExampleCalc: { fontSize: 12, marginTop: 2 },
  legendExampleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  legendExampleBadgeText: { fontSize: 11, fontWeight: '700' as const },

  statsContainer: { paddingHorizontal: 16, gap: 12 },
  statsCard: { borderRadius: 16, padding: 16 },
  statsCardTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statItem: { width: '50%', alignItems: 'center', paddingVertical: 10 },
  statNumber: { fontSize: 28, fontWeight: '800' as const },
  statLabel: { fontSize: 12, marginTop: 4 },
  dailyLimitStats: { gap: 10 },
  dailyLimitStatRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dailyLimitStatLabel: { fontSize: 14 },
  dailyLimitStatValue: { fontSize: 14, fontWeight: '700' as const },
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
  streakDays: { fontSize: 14, fontWeight: '700' as const },
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
  rarityName: { fontSize: 14, fontWeight: '600' as const },
  rarityCount: { fontSize: 18, fontWeight: '800' as const },
  todayStats: { gap: 10 },
  todayStatRow: { flexDirection: 'row', justifyContent: 'space-between' },
  todayStatLabel: { fontSize: 14 },
  todayStatValue: { fontSize: 14, fontWeight: '700' as const },

  infoSection: { margin: 16, borderRadius: 16, padding: 16 },
  infoTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 14 },
  infoSteps: { gap: 12 },
  infoStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoStepIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoStepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  infoNote: { fontSize: 12, marginTop: 14, textAlign: 'center', fontStyle: 'italic' },

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
  modalTreasureImage: { width: 120, height: 120, borderRadius: 16 },
  modalRarityBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  modalRarityText: { fontSize: 13, fontWeight: '700' as const },
  modalTreasureName: { fontSize: 22, fontWeight: '800' as const, textAlign: 'center' },
  modalDescription: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  modalDetails: { gap: 10, marginBottom: 16 },
  modalDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalDetailText: { fontSize: 14, flex: 1 },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18, fontStyle: 'italic' as const },
  realPlaceBadge: {
    backgroundColor: '#0EA5E920',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  realPlaceBadgeText: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: '#0EA5E9',
    letterSpacing: 0.5,
  },
  realLocationLabelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 2,
  },
  realLocationLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    flexShrink: 1,
  },
  parkHintRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 2,
  },
  parkHintLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    fontStyle: 'italic' as const,
    flexShrink: 1,
  },
  realLocationBanner: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  realLocationBannerName: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  realLocationBannerAddr: {
    fontSize: 12,
    marginTop: 2,
  },
  realLocationBannerHint: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  parkLocationBanner: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  parkLocationBannerName: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  parkLocationBannerHint: {
    fontSize: 12,
    marginTop: 3,
    fontStyle: 'italic' as const,
  },
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
  claimResultText: { flex: 1, fontSize: 15, fontWeight: '700' as const },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  scanButtonText: { fontSize: 17, fontWeight: '800' as const, color: '#FFF' },
  claimedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  claimedText: { fontSize: 15, fontWeight: '700' as const, color: '#10B981' },
  limitReachedModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  limitReachedModalText: { fontSize: 14, fontWeight: '600' as const, color: '#F59E0B', flex: 1 },

  arContainer: { flex: 1 },
  arBackground: { flex: 1 },
  arGrid: { ...StyleSheet.absoluteFillObject },
  arGridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#38BDF8' },
  arGridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#38BDF8' },
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
  arTokenSymbol: { fontSize: 36, fontWeight: '900' as const, color: '#FFF' },
  arTokenLabel: { fontSize: 10, fontWeight: '700' as const, color: '#FFF', marginTop: -2 },
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
  arBackBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    paddingLeft: 8,
    borderRadius: 22,
    gap: 4,
    zIndex: 100,
  },
  arBackBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  arTreasureInfo: { alignItems: 'center' },
  arTreasureName: { color: '#FFF', fontSize: 16, fontWeight: '700' as const },
  arRarityBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  arRarityText: { fontSize: 11, fontWeight: '700' as const },
  arRewardInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arRewardText: { color: '#F59E0B', fontSize: 18, fontWeight: '800' as const },
  arBottomSection: { padding: 20 },
  arProgressContainer: { marginBottom: 16 },
  arProgressBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  arProgressFill: { height: '100%', borderRadius: 4 },
  arProgressText: { color: '#FFF', fontSize: 13, textAlign: 'center', marginTop: 6, fontWeight: '600' as const },
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
  arAnchorText: { color: '#7DD3FC', fontSize: 11, fontWeight: '600' as const },
  arOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  arPreviewOuter: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_HEIGHT * 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arPreviewGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  arPreviewBody: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  arPreviewIcon: {
    fontSize: 72,
  },
  arPreviewImage: {
    width: 130,
    height: 130,
  },
  arScanTreasureOuter: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arScanGlowRing: {
    position: 'absolute',
    width: SCREEN_HEIGHT * 0.5,
    height: SCREEN_HEIGHT * 0.5,
    borderRadius: SCREEN_HEIGHT * 0.25,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  arScanTreasureBody: {
    width: SCREEN_HEIGHT * 0.48,
    height: SCREEN_HEIGHT * 0.48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  arScanTreasureImage: {
    width: SCREEN_HEIGHT * 0.42,
    height: SCREEN_HEIGHT * 0.42,
  },
  holdProgressBarBg: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  holdProgressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  arClaimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    marginTop: 14,
  },
  arClaimButtonText: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  arProximityWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  arPreviewInfoCard: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  arPreviewInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  arPreviewInfoEmoji: {
    fontSize: 36,
  },
  arPreviewInfoImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  arPreviewInfoTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  arPreviewInfoSub: {
    fontSize: 13,
    color: '#BAE6FD',
    marginTop: 2,
  },
  arPreviewInfoDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 19,
  },
});
