// Scavenger Hunt Context - State management for MUSO Token Treasure Hunt

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TreasureLocation,
  TreasureClaim,
  DailyHuntProgress,
  HuntStreak,
  PlayerLocation,
  TreasureDistance,
  ScavengerHuntState,
} from '../types/scavengerHunt';
import { ScavengerHuntService } from '../services/ScavengerHuntService';

const STORAGE_KEY = '@scavenger_hunt_state';

interface ScavengerHuntContextValue {
  // State
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

  // Actions
  setPlayerLocation: (location: PlayerLocation) => void;
  selectTreasure: (treasure: TreasureLocation | null) => void;
  setShowARView: (show: boolean) => void;
  claimTreasure: (treasureId: string) => { success: boolean; tokensAwarded: number; message: string };
  isTreasureClaimed: (treasureId: string) => boolean;
  refreshDailyTreasures: () => void;
  getStreakBonusLabel: () => string | null;
}

const ScavengerHuntContext = createContext<ScavengerHuntContextValue | undefined>(undefined);

export function ScavengerHuntProvider({ children }: { children: React.ReactNode }) {
  const [treasures, setTreasures] = useState<TreasureLocation[]>([]);
  const [claims, setClaims] = useState<TreasureClaim[]>([]);
  const [dailyProgress, setDailyProgress] = useState<DailyHuntProgress>(
    ScavengerHuntService.createDailyProgress(0)
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
  const [playerLocation, setPlayerLocation] = useState<PlayerLocation | null>(null);
  const [treasureDistances, setTreasureDistances] = useState<TreasureDistance[]>([]);
  const [huntActive, setHuntActive] = useState(true);
  const [totalTokensEarned, setTotalTokensEarned] = useState(0);
  const initialized = useRef(false);

  // Load persisted state
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadState();
  }, []);

  // Update distances when player location changes
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

  const loadState = async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const todayKey = ScavengerHuntService.getTodayKey();
      const todayTreasures = ScavengerHuntService.getTodaysTreasures();

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

        // Check if daily progress needs reset
        if (parsed.dailyProgress?.dayKey === todayKey) {
          setDailyProgress(parsed.dailyProgress);
        } else {
          // New day - reset daily progress
          const newProgress = ScavengerHuntService.createDailyProgress(todayTreasures.length);

          // Update streak
          const updatedStreak = ScavengerHuntService.updateStreak(
            parsed.huntStreak || { currentStreak: 0, longestStreak: 0, lastHuntDate: null, totalDaysHunted: 0 },
            false
          );
          setHuntStreak(updatedStreak);
          setDailyProgress(newProgress);
        }
      } else {
        setDailyProgress(ScavengerHuntService.createDailyProgress(todayTreasures.length));
      }

      setTreasures(todayTreasures);
    } catch (error) {
      console.error('[ScavengerHunt] Failed to load state:', error);
      const todayTreasures = ScavengerHuntService.getTodaysTreasures();
      setTreasures(todayTreasures);
      setDailyProgress(ScavengerHuntService.createDailyProgress(todayTreasures.length));
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

  const claimTreasure = useCallback((treasureId: string): { success: boolean; tokensAwarded: number; message: string } => {
    const treasure = treasures.find(t => t.id === treasureId);
    if (!treasure) {
      return { success: false, tokensAwarded: 0, message: 'Treasure not found!' };
    }

    // Check if already claimed today
    if (ScavengerHuntService.isTreasureClaimedToday(treasureId, claims)) {
      return { success: false, tokensAwarded: 0, message: 'Already claimed today! Come back tomorrow.' };
    }

    // Calculate reward
    const reward = ScavengerHuntService.calculateReward(treasure, huntStreak.currentStreak);

    // Create claim
    const newClaim = ScavengerHuntService.createClaim(
      treasureId,
      'player',
      reward.totalReward,
      huntStreak.currentStreak,
      reward.streakMultiplier
    );

    // Update state
    const updatedClaims = [newClaim, ...claims];
    const updatedProgress: DailyHuntProgress = {
      ...dailyProgress,
      claimedTreasures: dailyProgress.claimedTreasures + 1,
      totalTokensEarned: dailyProgress.totalTokensEarned + reward.totalReward,
      claimedIds: [...dailyProgress.claimedIds, treasureId],
      bonusTokensEarned: dailyProgress.bonusTokensEarned + (reward.totalReward - reward.baseReward),
      completedAt: dailyProgress.claimedTreasures + 1 >= dailyProgress.totalTreasures ? Date.now() : null,
    };
    const updatedStreak = ScavengerHuntService.updateStreak(huntStreak, true);
    const updatedTotalTokens = totalTokensEarned + reward.totalReward;

    setClaims(updatedClaims);
    setDailyProgress(updatedProgress);
    setHuntStreak(updatedStreak);
    setTotalTokensEarned(updatedTotalTokens);

    // Persist
    void saveState(updatedClaims, updatedProgress, updatedStreak, updatedTotalTokens);

    const streakLabel = ScavengerHuntService.getStreakBonusLabel(updatedStreak.currentStreak);
    const message = streakLabel
      ? `+${reward.totalReward} MUSO! ${streakLabel}`
      : `+${reward.totalReward} MUSO Tokens collected!`;

    return { success: true, tokensAwarded: reward.totalReward, message };
  }, [treasures, claims, dailyProgress, huntStreak, totalTokensEarned, saveState]);

  const isTreasureClaimed = useCallback((treasureId: string): boolean => {
    return ScavengerHuntService.isTreasureClaimedToday(treasureId, claims);
  }, [claims]);

  const refreshDailyTreasures = useCallback(() => {
    const todayTreasures = ScavengerHuntService.getTodaysTreasures();
    setTreasures(todayTreasures);

    const todayKey = ScavengerHuntService.getTodayKey();
    if (dailyProgress.dayKey !== todayKey) {
      const newProgress = ScavengerHuntService.createDailyProgress(todayTreasures.length);
      setDailyProgress(newProgress);
    }
  }, [dailyProgress.dayKey]);

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
    setPlayerLocation,
    selectTreasure,
    setShowARView,
    claimTreasure,
    isTreasureClaimed,
    refreshDailyTreasures,
    getStreakBonusLabel,
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