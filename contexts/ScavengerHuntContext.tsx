import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  TreasureLocation,
  TreasureClaim,
  DailyHuntProgress,
  HuntStreak,
  PlayerLocation,
  TreasureDistance,
  MAX_DAILY_TREASURES,
} from '../types/scavengerHunt';
import { ScavengerHuntService } from '../services/ScavengerHuntService';

const STORAGE_KEY = '@scavenger_hunt_state';
const LOCATION_STORAGE_KEY = '@scavenger_hunt_last_location';

interface ScavengerHuntContextValue {
  treasures: TreasureLocation[];
  dailyProgress: DailyHuntProgress;
  huntStreak: HuntStreak;
  claims: TreasureClaim[];
  isLoading: boolean;
  selectedTreasure: TreasureLocation | null;
  showARView: boolean;
  playerLocation: PlayerLocation | null;
  treasureDistances: TreasureDistance[];
  huntActive: boolean;
  totalTokensEarned: number;
  locationPermissionGranted: boolean;
  dailyClaimsRemaining: number;

  setPlayerLocation: (location: PlayerLocation) => void;
  selectTreasure: (treasure: TreasureLocation | null) => void;
  setShowARView: (show: boolean) => void;
  claimTreasure: (treasureId: string) => { success: boolean; tokensAwarded: number; message: string };
  isTreasureClaimed: (treasureId: string) => boolean;
  refreshDailyTreasures: () => void;
  getStreakBonusLabel: () => string | null;
  requestLocationPermission: () => Promise<boolean>;
  regenerateTreasuresForLocation: (lat: number, lon: number) => void;
}

const ScavengerHuntContext = createContext<ScavengerHuntContextValue | undefined>(undefined);

export function ScavengerHuntProvider({ children }: { children: React.ReactNode }) {
  const [treasures, setTreasures] = useState<TreasureLocation[]>([]);
  const [claims, setClaims] = useState<TreasureClaim[]>([]);
  const [dailyProgress, setDailyProgress] = useState<DailyHuntProgress>(
    ScavengerHuntService.createDailyProgress(MAX_DAILY_TREASURES)
  );
  const [huntStreak, setHuntStreak] = useState<HuntStreak>({
    currentStreak: 0,
    longestStreak: 0,
    lastHuntDate: null,
    totalDaysHunted: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTreasure, setSelectedTreasure] = useState<TreasureLocation | null>(null);
  const [showARView, setShowARView] = useState(false);
  const [playerLocation, setPlayerLocationState] = useState<PlayerLocation | null>(null);
  const [treasureDistances, setTreasureDistances] = useState<TreasureDistance[]>([]);
  const [huntActive] = useState(true);
  const [totalTokensEarned, setTotalTokensEarned] = useState(0);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const initialized = useRef(false);
  const treasuresGeneratedForDay = useRef<string | null>(null);

  const dailyClaimsRemaining = MAX_DAILY_TREASURES - ScavengerHuntService.getTodayClaimCount(claims);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (playerLocation && treasures.length > 0) {
      const distances = ScavengerHuntService.getTreasureDistances(
        playerLocation.latitude,
        playerLocation.longitude,
        treasures
      );
      setTreasureDistances(distances);
    }
  }, [playerLocation, treasures]);

  const generateTreasuresForLocation = useCallback((lat: number, lon: number) => {
    const todayKey = ScavengerHuntService.getTodayKey();
    const gridKey = `${todayKey}_${Math.round(lat * 100)}_${Math.round(lon * 100)}`;

    if (treasuresGeneratedForDay.current === gridKey) {
      console.log('[ScavengerHunt] Treasures already generated for this location grid today');
      return;
    }

    console.log(`[ScavengerHunt] Generating ${MAX_DAILY_TREASURES} treasures within 5mi of ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    const generated = ScavengerHuntService.generateTreasuresAroundPlayer(lat, lon, todayKey);
    setTreasures(generated);
    treasuresGeneratedForDay.current = gridKey;

    AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat, lon, dayKey: todayKey })).catch(
      (err) => console.error('[ScavengerHunt] Failed to save location:', err)
    );
  }, []);

  const loadState = async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const todayKey = ScavengerHuntService.getTodayKey();

      if (stored) {
        const parsed = JSON.parse(stored);
        setClaims(parsed.claims || []);
        setHuntStreak(parsed.huntStreak || {
          currentStreak: 0,
          longestStreak: 0,
          lastHuntDate: null,
          totalDaysHunted: 0,
        });
        setTotalTokensEarned(parsed.totalTokensEarned || 0);

        if (parsed.dailyProgress?.dayKey === todayKey) {
          setDailyProgress(parsed.dailyProgress);
        } else {
          const newProgress = ScavengerHuntService.createDailyProgress(MAX_DAILY_TREASURES);
          const updatedStreak = ScavengerHuntService.updateStreak(
            parsed.huntStreak || { currentStreak: 0, longestStreak: 0, lastHuntDate: null, totalDaysHunted: 0 },
            false
          );
          setHuntStreak(updatedStreak);
          setDailyProgress(newProgress);
        }
      } else {
        setDailyProgress(ScavengerHuntService.createDailyProgress(MAX_DAILY_TREASURES));
      }

      const lastLoc = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (lastLoc) {
        const locData = JSON.parse(lastLoc);
        if (locData.dayKey === todayKey && locData.lat && locData.lon) {
          console.log('[ScavengerHunt] Restoring treasures from last known location');
          generateTreasuresForLocation(locData.lat, locData.lon);
        } else {
          const fallback = ScavengerHuntService.generateTreasuresAroundPlayer(34.0522, -118.2437);
          setTreasures(fallback);
        }
      } else {
        const fallback = ScavengerHuntService.generateTreasuresAroundPlayer(34.0522, -118.2437);
        setTreasures(fallback);
      }
    } catch (error) {
      console.error('[ScavengerHunt] Failed to load state:', error);
      const fallback = ScavengerHuntService.generateTreasuresAroundPlayer(34.0522, -118.2437);
      setTreasures(fallback);
      setDailyProgress(ScavengerHuntService.createDailyProgress(MAX_DAILY_TREASURES));
    } finally {
      setIsLoading(false);
    }
  };

  const saveState = useCallback(async (
    updatedClaims: TreasureClaim[],
    updatedProgress: DailyHuntProgress,
    updatedStreak: HuntStreak,
    updatedTotalTokens: number
  ) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        claims: updatedClaims,
        dailyProgress: updatedProgress,
        huntStreak: updatedStreak,
        totalTokensEarned: updatedTotalTokens,
      }));
    } catch (error) {
      console.error('[ScavengerHunt] Failed to save state:', error);
    }
  }, []);

  const setPlayerLocation = useCallback((location: PlayerLocation) => {
    setPlayerLocationState(location);
    generateTreasuresForLocation(location.latitude, location.longitude);
  }, [generateTreasuresForLocation]);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            console.log('[ScavengerHunt] Geolocation not available on web');
            resolve(false);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const loc: PlayerLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp,
              };
              setPlayerLocation(loc);
              setLocationPermissionGranted(true);
              console.log(`[ScavengerHunt] Web location: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
              resolve(true);
            },
            (error) => {
              console.log('[ScavengerHunt] Web geolocation error:', error.message);
              resolve(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }

      const Location = require('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[ScavengerHunt] Location permission denied');
        setLocationPermissionGranted(false);
        return false;
      }

      setLocationPermissionGranted(true);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const loc: PlayerLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      setPlayerLocation(loc);
      console.log(`[ScavengerHunt] Device location: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
      return true;
    } catch (error) {
      console.error('[ScavengerHunt] Location error:', error);
      return false;
    }
  }, [setPlayerLocation]);

  const regenerateTreasuresForLocation = useCallback((lat: number, lon: number) => {
    treasuresGeneratedForDay.current = null;
    generateTreasuresForLocation(lat, lon);
  }, [generateTreasuresForLocation]);

  const claimTreasure = useCallback((treasureId: string): { success: boolean; tokensAwarded: number; message: string } => {
    if (!ScavengerHuntService.canClaimMore(claims)) {
      return {
        success: false,
        tokensAwarded: 0,
        message: `Daily limit reached! You can claim up to ${MAX_DAILY_TREASURES} treasures per day. Come back tomorrow!`,
      };
    }

    const treasure = treasures.find(t => t.id === treasureId);
    if (!treasure) {
      return { success: false, tokensAwarded: 0, message: 'Treasure not found!' };
    }

    if (ScavengerHuntService.isTreasureClaimedToday(treasureId, claims)) {
      return { success: false, tokensAwarded: 0, message: 'Already claimed today! Come back tomorrow.' };
    }

    const reward = ScavengerHuntService.calculateReward(treasure, huntStreak.currentStreak);

    const newClaim = ScavengerHuntService.createClaim(
      treasureId,
      'player',
      reward.totalReward,
      huntStreak.currentStreak,
      reward.streakMultiplier
    );

    const updatedClaims = [newClaim, ...claims];
    const updatedProgress: DailyHuntProgress = {
      ...dailyProgress,
      claimedTreasures: dailyProgress.claimedTreasures + 1,
      totalTokensEarned: dailyProgress.totalTokensEarned + reward.totalReward,
      claimedIds: [...dailyProgress.claimedIds, treasureId],
      bonusTokensEarned: dailyProgress.bonusTokensEarned + (reward.totalReward - reward.baseReward),
      completedAt: dailyProgress.claimedTreasures + 1 >= MAX_DAILY_TREASURES ? Date.now() : null,
    };
    const updatedStreak = ScavengerHuntService.updateStreak(huntStreak, true);
    const updatedTotalTokens = totalTokensEarned + reward.totalReward;

    setClaims(updatedClaims);
    setDailyProgress(updatedProgress);
    setHuntStreak(updatedStreak);
    setTotalTokensEarned(updatedTotalTokens);

    void saveState(updatedClaims, updatedProgress, updatedStreak, updatedTotalTokens);

    const remaining = MAX_DAILY_TREASURES - ScavengerHuntService.getTodayClaimCount(updatedClaims);
    const streakLabel = ScavengerHuntService.getStreakBonusLabel(updatedStreak.currentStreak);
    const message = streakLabel
      ? `+${reward.totalReward} MUSO! ${streakLabel} (${remaining} left today)`
      : `+${reward.totalReward} MUSO Tokens collected! (${remaining} left today)`;

    return { success: true, tokensAwarded: reward.totalReward, message };
  }, [treasures, claims, dailyProgress, huntStreak, totalTokensEarned, saveState]);

  const isTreasureClaimed = useCallback((treasureId: string): boolean => {
    return ScavengerHuntService.isTreasureClaimedToday(treasureId, claims);
  }, [claims]);

  const refreshDailyTreasures = useCallback(() => {
    if (playerLocation) {
      treasuresGeneratedForDay.current = null;
      generateTreasuresForLocation(playerLocation.latitude, playerLocation.longitude);
    } else {
      const fallback = ScavengerHuntService.generateTreasuresAroundPlayer(34.0522, -118.2437);
      setTreasures(fallback);
    }

    const todayKey = ScavengerHuntService.getTodayKey();
    if (dailyProgress.dayKey !== todayKey) {
      const newProgress = ScavengerHuntService.createDailyProgress(MAX_DAILY_TREASURES);
      setDailyProgress(newProgress);
    }
  }, [dailyProgress.dayKey, playerLocation, generateTreasuresForLocation]);

  const selectTreasure = useCallback((treasure: TreasureLocation | null) => {
    setSelectedTreasure(treasure);
  }, []);

  const getStreakBonusLabel = useCallback((): string | null => {
    return ScavengerHuntService.getStreakBonusLabel(huntStreak.currentStreak);
  }, [huntStreak.currentStreak]);

  const value: ScavengerHuntContextValue = {
    treasures,
    dailyProgress,
    huntStreak,
    claims,
    isLoading,
    selectedTreasure,
    showARView,
    playerLocation,
    treasureDistances,
    huntActive,
    totalTokensEarned,
    locationPermissionGranted,
    dailyClaimsRemaining,
    setPlayerLocation,
    selectTreasure,
    setShowARView,
    claimTreasure,
    isTreasureClaimed,
    refreshDailyTreasures,
    getStreakBonusLabel,
    requestLocationPermission,
    regenerateTreasuresForLocation,
  };

  return (
    <ScavengerHuntContext.Provider value={value}>
      {children}
    </ScavengerHuntContext.Provider>
  );
}

export function useScavengerHunt(): ScavengerHuntContextValue {
  const context = useContext(ScavengerHuntContext);
  if (!context) {
    throw new Error('useScavengerHunt must be used within a ScavengerHuntProvider');
  }
  return context;
}
