import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { gameRepository, OptimisticOperationResult } from '@/repositories/GameRepository';
import { useGameStore } from '@/stores/useGameStore';
import { 
  GameState, 
  CreditAccount, 
  PlayerJob, 
  Expense, 
  LoanApplication,
  HardInquiry,
  OwnedProperty,
  OwnedVehicle,
  MonthlyReport,
  PlayerAvatar,
  OwnedClothing,
  ClothingItem,
  ClothingCategory,
  LifestyleStats,
  GameMode,
  Alert,
  HealthStatus,
  FoodItem,
  ActivityLogEntry,
  ActivityType,
  ScoreHistoryEntry,
  TokenWallet,
  TokenTransaction,
  RandomIncident,
  EmergencyEvent,
  SharedRentalInfo,
  SharedRentalRoommate,
  PaidExpenseRecord,
} from '@/types/game';
import { calculateCreditScores, formatCurrency } from '@/utils/creditEngine';
import { CreditScoreService } from '@/services/CreditScoreService';
import { MonthAdvancementService } from '@/services/MonthAdvancementService';
import { compressActivityLog, compressScoreHistory, compressTransactions, compressGameState } from '@/services/StateCompression';
import { cleanupOldState } from '@/services/MemoryCleanup';
import { creditScoreDomain, realEstateDomain } from '@/domains';
import { ACHIEVEMENTS, DEFAULT_EXPENSES, EMERGENCY_EVENTS, DEFAULT_AVATAR, DEFAULT_LIFESTYLE, RANDOM_INCIDENT_CONFIG, getIncidentSeverity } from '@/mocks/gameData';
import { SharedRentalAssignment, getCityById, getApartmentById, assignSharedApartment, CITIES } from '@/mocks/cityData';

const GAME_STORAGE_KEY_PREFIX = 'credit_life_simulator_game_';

const DEFAULT_ALERTS: Alert[] = [
  { id: 'alert_rent', type: 'bill_due', name: 'Rent Due', enabled: true, dayOfMonth: 1 },
  { id: 'alert_utilities', type: 'bill_due', name: 'Utilities Due', enabled: true, dayOfMonth: 15 },
  { id: 'alert_groceries', type: 'groceries_low', name: 'Groceries Running Low', enabled: true },
  { id: 'alert_insurance', type: 'bill_due', name: 'Insurance Due', enabled: true, dayOfMonth: 1 },
  { id: 'alert_payday', type: 'payday', name: 'Payday', enabled: true, dayOfMonth: 1, message: 'Your salary has been deposited!' },
  { id: 'alert_payday_mid', type: 'payday', name: 'Mid-Month Payday', enabled: true, dayOfMonth: 15, message: 'Your bi-weekly pay has been deposited!' },
  { id: 'alert_low_fuel', type: 'low_fuel', name: 'Low Fuel Warning', enabled: true, message: 'Your gas tank is running low! Visit Marketplace to buy gas.' },
];

const DEFAULT_HEALTH: HealthStatus = {
  level: 100,
  lastFoodPurchaseMonth: 0,
  isHospitalized: false,
  hospitalDebt: 0,
};

const createActivityLogEntry = (
  type: ActivityType,
  title: string,
  description: string,
  metadata?: ActivityLogEntry['metadata']
): ActivityLogEntry => ({
  id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type,
  timestamp: Date.now(),
  title,
  description,
  metadata,
});

const createScoreHistoryEntry = (
  scores: GameState['creditScores'],
  reason?: string
): ScoreHistoryEntry => ({
  timestamp: Date.now(),
  experian: scores.experian,
  equifax: scores.equifax,
  transunion: scores.transunion,
  composite: scores.composite,
  reason,
});

const TOKENS_PER_DOLLAR = 10;
const INITIAL_TOKENS = 50000;

const createInitialTokenWallet = (playerId: string, initialBalance: number = INITIAL_TOKENS): TokenWallet => {
  const now = Date.now();
  return {
    address: `0x${playerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40).padEnd(40, '0')}`,
    musoToken: {
      balance: initialBalance,
      totalMinted: initialBalance,
      totalBurned: 0,
      lastUpdated: now,
    },
    transactions: [{
      id: `tx_${now}_initial`,
      type: 'mint',
      amount: initialBalance,
      reason: 'Initial wallet creation - starting savings',
      timestamp: now,
      balanceAfter: initialBalance,
      metadata: { source: 'system', category: 'initial' },
    }],
    createdAt: now,
  };
};

const createInitialGameState = (): GameState => {
  const now = Date.now();
  const playerId = `player_${now}`;
  const initialSavings = 5000;
  
  // Auto-assign default city (Los Angeles) and apartment
  const defaultCityId = 'city_los_angeles';
  const defaultCity = CITIES.find(c => c.id === defaultCityId) || CITIES[0];
  const assignment = assignSharedApartment(defaultCityId);
  const apartment = getApartmentById(assignment.apartmentId);
  
  // Create rent expense for the assigned apartment
  const rentExpense = {
    id: 'exp_shared_rent',
    name: `Shared Rent - ${apartment?.name || 'Apartment'}`,
    amount: assignment.monthlyShare,
    category: 'housing' as const,
    frequency: 'monthly' as const,
    isFixed: true,
  };
  
  const initialExpenses = [...DEFAULT_EXPENSES.filter(e => e.id !== 'exp_rent' && e.id !== 'exp_shared_rent'), rentExpense];
  // Deduct security deposit from initial savings - this is the move-in cost
  const initialBankBalance = initialSavings - assignment.securityDeposit;
  // Token balance should match the actual bank balance after move-in deduction (10:1 ratio)
  const initialTokenBalance = initialBankBalance * TOKENS_PER_DOLLAR;
  
  const sharedRentalInfo = {
    apartmentId: assignment.apartmentId,
    apartmentNumber: assignment.apartmentNumber,
    unitNumber: assignment.unitNumber,
    roommates: assignment.roommates.map(r => ({
      id: r.id,
      name: r.name,
      age: r.age,
      occupation: r.occupation,
      personality: r.personality,
      avatar: r.avatar,
      rentPaidOnTime: r.rentPaidOnTime,
      cleanliness: r.cleanliness,
      noisiness: r.noisiness,
    })),
    moveInDate: assignment.moveInDate,
    monthlyShare: assignment.monthlyShare,
    securityDeposit: assignment.securityDeposit,
  };
  
  return {
    playerId,
    playerName: 'New Player',
    avatar: { ...DEFAULT_AVATAR },
    profilePhotoUrl: undefined,
    useCustomPhoto: false,
    gameMode: 'simulation',
    alerts: [...DEFAULT_ALERTS],
    healthStatus: { ...DEFAULT_HEALTH },
    gameStartDate: now,
    currentDate: now,
    creditScores: {
      experian: 300,
      equifax: 300,
      transunion: 300,
      composite: 300,
    },
    creditAccounts: [],
    hardInquiries: [],
    currentJob: undefined,
    jobHistory: [],
    monthlyIncome: 0,
    expenses: initialExpenses,
    bankBalance: initialBankBalance,
    savingsBalance: 0,
    emergencyFund: 0,
    investments: 0,
    ownedProperties: [],
    ownedVehicles: [],
    ownedClothing: [],
    pendingApplications: [],
    achievements: ACHIEVEMENTS,
    unlockedAchievements: [],
    totalNetWorth: initialBankBalance,
    monthsPlayed: 0,
    consecutiveOnTimePayments: 0,
    lifetimeEarnings: 0,
    lifetimeSpending: assignment.securityDeposit,
    tutorialCompleted: false,
    lastEventDate: now,
    lifestyle: {
      ...DEFAULT_LIFESTYLE,
      housingType: 'shared_rental',
      housingName: `${apartment?.name || 'Apartment'} ${assignment.apartmentNumber}`,
      cityId: defaultCityId,
      cityName: defaultCity.name,
      sharedRental: sharedRentalInfo,
      monthlyRent: assignment.monthlyShare,
    },
    isPublicProfile: true,
    activityLog: [{
      id: `activity_${now}_initial`,
      type: 'property_purchased',
      timestamp: now,
      title: 'Moved to Los Angeles',
      description: `Started your financial journey in ${defaultCity.name} - Assigned to ${apartment?.name || 'Apartment'} ${assignment.apartmentNumber}`,
      metadata: { propertyName: apartment?.name, amount: assignment.securityDeposit },
    }],
    scoreHistory: [{
      timestamp: now,
      experian: 300,
      equifax: 300,
      transunion: 300,
      composite: 300,
      reason: 'No credit history - starting fresh',
    }],
    lastLoginDate: now,
    consecutiveLoginDays: 1,
    pendingIncidents: [],
    tokenWallet: createInitialTokenWallet(playerId, initialTokenBalance),
    citySelectionCompleted: true,
    paidExpenses: {},
    lastUpdated: now,
  };
};

const calculateIncidentProbability = (daysAbsent: number): number => {
  const { baseChance, maxChance, daysAbsentMultiplier, maxDaysForBonus } = RANDOM_INCIDENT_CONFIG;
  const cappedDays = Math.min(daysAbsent, maxDaysForBonus);
  const probability = baseChance + (cappedDays * daysAbsentMultiplier);
  return Math.min(probability, maxChance);
};

const selectRandomIncident = (daysAbsent: number): EmergencyEvent | null => {
  const { severityWeights } = RANDOM_INCIDENT_CONFIG;
  
  let targetSeverity: 'minor' | 'moderate' | 'severe' | 'catastrophic';
  const roll = Math.random();
  
  if (daysAbsent >= 5) {
    if (roll < 0.25) targetSeverity = 'catastrophic';
    else if (roll < 0.55) targetSeverity = 'severe';
    else if (roll < 0.85) targetSeverity = 'moderate';
    else targetSeverity = 'minor';
  } else if (daysAbsent >= 3) {
    if (roll < 0.10) targetSeverity = 'catastrophic';
    else if (roll < 0.35) targetSeverity = 'severe';
    else if (roll < 0.70) targetSeverity = 'moderate';
    else targetSeverity = 'minor';
  } else {
    if (roll < severityWeights.catastrophic) targetSeverity = 'catastrophic';
    else if (roll < severityWeights.catastrophic + severityWeights.severe) targetSeverity = 'severe';
    else if (roll < severityWeights.catastrophic + severityWeights.severe + severityWeights.moderate) targetSeverity = 'moderate';
    else targetSeverity = 'minor';
  }
  
  const eligibleEvents = EMERGENCY_EVENTS.filter(e => getIncidentSeverity(e.cost) === targetSeverity);
  
  if (eligibleEvents.length === 0) {
    return EMERGENCY_EVENTS[Math.floor(Math.random() * EMERGENCY_EVENTS.length)];
  }
  
  return eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
};

export const [GameProvider, useGame] = createContextHook(() => {
  // ===== SECTION 1: ALL useState HOOKS (must be first and in fixed order) =====
  const [gameState, setGameStateInternal] = useState<GameState>(createInitialGameState);
  const [isLoading, setIsLoading] = useState(true);
  const [lastReport, setLastReport] = useState<MonthlyReport | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOptimisticPending, setIsOptimisticPending] = useState(false);
  const [lastRollbackError, setLastRollbackError] = useState<string | null>(null);
  
  // ===== SECTION 2: ALL useRef HOOKS (must be in fixed order) =====
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedStateRef = useRef<string>('');
  const initialLoadDoneRef = useRef(false);
  const isMountedRef = useRef(true);
  const pendingSaveRef = useRef<GameState | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastSyncedUserIdRef = useRef<string | null>(null);
  const hasCheckedMigrationRef = useRef(false);
  const hasProcessedLoginRef = useRef(false);
  const previousUserIdRef = useRef<string | null | undefined>(undefined);
  const isLoggingOutRef = useRef(false);
  const optimisticStateRef = useRef<GameState | null>(null);
  
  // ===== SECTION 3: CONTEXT HOOKS (must be called unconditionally) =====
  const auth = useAuth();
  
  // Derived values from auth (not hooks, just computed values)
  const userId = auth?.user?.id;
  const isAuthenticated = auth?.isAuthenticated ?? false;

  // Wrapper to always update lastUpdated timestamp - defined as stable callback
  const setGameState = useCallback((updater: GameState | ((prev: GameState) => GameState)) => {
    setGameStateInternal(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      return {
        ...newState,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const gameStateQuery = trpc.gameState.getByUserId.useQuery(
    { userId: userId || '' },
    { 
      enabled: !!userId && isAuthenticated,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    }
  );

  const saveGameStateMutation = trpc.gameState.save.useMutation();

  const getStorageKey = useCallback(() => {
    if (isAuthenticated && userId) {
      return `${GAME_STORAGE_KEY_PREFIX}${userId}`;
    }
    return 'credit_life_simulator_game_anonymous';
  }, [isAuthenticated, userId]);

  const saveToDatabase = useCallback(async (state: GameState) => {
    if (!isAuthenticated || !userId) {
      console.log('[GameContext] Not authenticated, skipping database save');
      return;
    }

    if (isMountedRef.current) {
      setIsSyncing(true);
    }

    try {
      await gameRepository.saveRemoteState(
        state,
        userId,
        async (params) => {
          await saveGameStateMutation.mutateAsync({
            userId: params.userId,
            gameState: params.gameState as Parameters<typeof saveGameStateMutation.mutateAsync>[0]['gameState'],
          });
        }
      );
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [isAuthenticated, userId, saveGameStateMutation]);

  const forceSaveToStorage = useCallback(async (state: GameState) => {
    return await gameRepository.saveLocalState(state, userId, isAuthenticated);
  }, [userId, isAuthenticated]);

  const immediateSaveWithRetry = useCallback(async (state: GameState) => {
    // Don't save during logout
    if (isLoggingOutRef.current) {
      console.log('[GameContext] Skipping immediate save during logout');
      return;
    }
    
    console.log('[GameContext] Immediate save triggered');
    
    // Always save to local storage first - this is critical
    const localSaveSuccess = await forceSaveToStorage(state);
    if (!localSaveSuccess) {
      console.error('[GameContext] Critical: Local storage save failed!');
      // Try one more time
      await forceSaveToStorage(state);
    }
    
    // Update the ref immediately
    gameStateRef.current = state;
    
    // Then attempt database save (non-blocking)
    if (isAuthenticated && userId) {
      saveToDatabase(state).catch(err => {
        console.log('[GameContext] Database save failed, data is safe in local storage:', err);
      });
    }
  }, [forceSaveToStorage, isAuthenticated, userId, saveToDatabase]);

  const debouncedSave = useCallback((state: GameState) => {
    // Don't save during logout to prevent saving to wrong key
    if (isLoggingOutRef.current) {
      console.log('[GameContext] Skipping save during logout');
      return;
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    const delay = 1500; // Increased delay to reduce save frequency
    
    saveTimeoutRef.current = setTimeout(async () => {
      // Double check we're not logging out
      if (isLoggingOutRef.current) {
        console.log('[GameContext] Skipping delayed save during logout');
        return;
      }
      
      const stateToSave = {
        ...state,
        lastUpdated: Date.now(),
      };
      
      // Always save to local storage first
      try {
        const storageKey = getStorageKey();
        await AsyncStorage.setItem(storageKey, JSON.stringify(stateToSave));
        console.log('[GameContext] Game state saved to local storage:', storageKey, 'lastUpdated:', stateToSave.lastUpdated);
      } catch (error) {
        console.log('[GameContext] Error saving to local storage, retrying:', error);
        // Retry once
        try {
          const storageKey = getStorageKey();
          await AsyncStorage.setItem(storageKey, JSON.stringify(stateToSave));
          console.log('[GameContext] Retry successful');
        } catch (retryError) {
          console.error('[GameContext] Local storage save failed after retry:', retryError);
        }
      }
      
      // Then attempt database save (don't await, let it run in background)
      saveToDatabase(stateToSave).catch(err => {
        console.log('[GameContext] Database save failed, data is safe in local storage');
      });
    }, delay);
  }, [getStorageKey, saveToDatabase]);

  const forceSyncToUser = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      console.log('[GameContext] Cannot force sync - not authenticated');
      return;
    }
    
    console.log('[GameContext] Force syncing game state to user:', userId);
    const currentState = gameStateRef.current;
    
    try {
      const storageKey = `${GAME_STORAGE_KEY_PREFIX}${userId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(currentState));
      await gameRepository.setLastSyncedUser(userId);
      console.log('[GameContext] Force saved to local storage');
      
      await saveToDatabase(currentState);
      console.log('[GameContext] Force synced to database');
    } catch (error) {
      console.log('[GameContext] Error force syncing:', error);
    }
  }, [isAuthenticated, userId, saveToDatabase]);

  useEffect(() => {
    isMountedRef.current = true;
    gameRepository.setMounted(true);
    
    const checkPendingSync = async () => {
      if (!isAuthenticated || !userId) return;
      
      const pendingData = await gameRepository.checkPendingSync(userId);
      if (pendingData) {
        console.log('[GameContext] Found pending sync, attempting to sync...');
        setTimeout(() => {
          if (isMountedRef.current) {
            saveToDatabase(pendingData.state);
          }
        }, 3000);
      }
    };
    
    const syncTimer = setTimeout(checkPendingSync, 5000);
    
    return () => {
      isMountedRef.current = false;
      gameRepository.setMounted(false);
      clearTimeout(syncTimer);
      gameRepository.clearRetryTimeout();
    };
  }, [isAuthenticated, userId, saveToDatabase]);

  const migrateAnonymousDataToUser = useCallback(async (targetUserId: string): Promise<GameState | null> => {
    return await gameRepository.migrateAnonymousDataToUser(targetUserId);
  }, []);

  const mergeWithInitialState = useCallback((parsed: Partial<GameState>): GameState => {
    const initialState = createInitialGameState();
    const totalBalance = (parsed.bankBalance || 0) + (parsed.savingsBalance || 0) + (parsed.emergencyFund || 0);
    return {
      ...initialState,
      ...parsed,
      achievements: ACHIEVEMENTS,
      alerts: parsed.alerts || initialState.alerts,
      healthStatus: parsed.healthStatus || initialState.healthStatus,
      useCustomPhoto: parsed.useCustomPhoto || false,
      gameMode: parsed.gameMode || 'simulation',
      activityLog: parsed.activityLog || initialState.activityLog,
      scoreHistory: parsed.scoreHistory || initialState.scoreHistory,
      tokenWallet: parsed.tokenWallet || createInitialTokenWallet(parsed.playerId || initialState.playerId, INITIAL_TOKENS),
      citySelectionCompleted: parsed.citySelectionCompleted ?? initialState.citySelectionCompleted,
      paidExpenses: parsed.paidExpenses || {},
      lastUpdated: parsed.lastUpdated || initialState.lastUpdated,
      lifestyle: parsed.lifestyle ? {
        ...initialState.lifestyle,
        ...parsed.lifestyle,
      } : initialState.lifestyle,
    };
  }, []);

  useEffect(() => {
    const loadGame = async () => {
      if (!isMountedRef.current) return;
      
      const previousUserId = previousUserIdRef.current;
      const userChanged = userId !== lastSyncedUserIdRef.current;
      
      // Detect logout: previous user existed, now no user
      const isLoggingOut = previousUserId && !userId;
      
      // Update previous user ref
      previousUserIdRef.current = userId;
      
      if (isLoggingOut) {
        console.log('[GameContext] User logged out, saving state to user storage before clearing');
        isLoggingOutRef.current = true;
        
        const currentState = gameStateRef.current;
        if (currentState && previousUserId) {
          await gameRepository.saveUserStorageOnLogout(currentState, previousUserId);
        }
        
        lastSyncedUserIdRef.current = null;
        isLoggingOutRef.current = false;
        return;
      }
      
      if (initialLoadDoneRef.current && !userChanged) {
        console.log('[GameContext] Already loaded and user unchanged, skipping');
        return;
      }
      
      console.log('[GameContext] Loading game, userId:', userId, 'isAuthenticated:', isAuthenticated, 'userChanged:', userChanged);
      setIsLoading(true);
      lastSyncedUserIdRef.current = userId || null;
      
      try {
        if (isAuthenticated && userId) {
          let migratedState: GameState | null = null;
          if (!hasCheckedMigrationRef.current) {
            hasCheckedMigrationRef.current = true;
            migratedState = await migrateAnonymousDataToUser(userId);
          }
          
          const dbData = gameStateQuery.data?.gameState as Partial<GameState> | undefined;
          
          let stateToUse: Partial<GameState> | null = null;
          let source = 'none';
          
          if (migratedState) {
            stateToUse = migratedState;
            source = 'migrated';
          } else {
            const result = await gameRepository.getGameState({
              userId,
              isAuthenticated: true,
              remoteState: dbData,
              mergeWithInitial: mergeWithInitialState,
            });
            
            if (result.state) {
              if (!isMountedRef.current) return;
              setGameStateInternal(result.state);
              lastSavedStateRef.current = JSON.stringify(result.state);
              
              if (gameRepository.shouldSyncToDatabase(result.source)) {
                console.log('[GameContext] Local data is newer, will sync to database');
                gameRepository.resetLastSavedState();
              }
              
              await gameRepository.setLastSyncedUser(userId);
              console.log('[GameContext] Game state loaded from', result.source);
            } else {
              console.log('[GameContext] No saved game found for user, using initial state');
              await gameRepository.setLastSyncedUser(userId);
            }
            return;
          }
          
          if (stateToUse) {
            console.log('[GameContext] Loading migrated game state');
            const loadedState = mergeWithInitialState(stateToUse);
            
            if (!isMountedRef.current) return;
            setGameStateInternal(loadedState);
            lastSavedStateRef.current = JSON.stringify(loadedState);
            
            await gameRepository.saveLocalState(loadedState, userId, true);
            await gameRepository.setLastSyncedUser(userId);
            gameRepository.resetLastSavedState();
            
            console.log('[GameContext] Game state loaded from', source);
          }
        } else {
          const result = await gameRepository.getGameState({
            userId: undefined,
            isAuthenticated: false,
            remoteState: null,
            mergeWithInitial: mergeWithInitialState,
          });
          
          if (result.state) {
            if (!isMountedRef.current) return;
            setGameStateInternal(result.state);
            lastSavedStateRef.current = JSON.stringify(result.state);
            console.log('[GameContext] Game state loaded from', result.source);
          } else {
            console.log('[GameContext] No saved game found, using initial state');
          }
        }
      } catch (error) {
        console.log('[GameContext] Error loading game:', error);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          initialLoadDoneRef.current = true;
        }
      }
    };

    if (!gameStateQuery.isLoading || !isAuthenticated) {
      loadGame();
    }
  }, [userId, isAuthenticated, gameStateQuery.data, gameStateQuery.isLoading, getStorageKey, migrateAnonymousDataToUser, mergeWithInitialState]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!isLoading && initialLoadDoneRef.current && !isLoggingOutRef.current) {
      debouncedSave(gameState);
      
      // Also update the ref immediately so unmount saves have latest state
      gameStateRef.current = gameState;
    }
  }, [gameState, isLoading, debouncedSave]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        console.log('[GameContext] App going to background, saving game state immediately');
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        await forceSaveToStorage(gameStateRef.current);
        await saveToDatabase(gameStateRef.current);
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [forceSaveToStorage, saveToDatabase]);

  useEffect(() => {
    if (isLoading || !initialLoadDoneRef.current) return;

    const autoSaveInterval = setInterval(async () => {
      const currentState = gameStateRef.current;
      if (currentState && isMountedRef.current) {
        console.log('[GameContext] Auto-save triggered');
        await forceSaveToStorage(currentState);
        if (isAuthenticated && userId) {
          saveToDatabase(currentState);
        }
      }
    }, 60000); // Reduced from 30s to 60s

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [isLoading, isAuthenticated, userId, forceSaveToStorage, saveToDatabase]);

  useEffect(() => {
    return () => {
      console.log('[GameContext] Component unmounting, saving game state');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      const currentState = gameStateRef.current;
      const lastSyncedUserId = lastSyncedUserIdRef.current;
      if (initialLoadDoneRef.current && currentState) {
        const stateToSave = {
          ...currentState,
          lastUpdated: Date.now(),
        };
        const storageKey = lastSyncedUserId 
          ? `${GAME_STORAGE_KEY_PREFIX}${lastSyncedUserId}` 
          : (isAuthenticated && userId ? `${GAME_STORAGE_KEY_PREFIX}${userId}` : 'credit_life_simulator_game_anonymous');
        AsyncStorage.setItem(storageKey, JSON.stringify(stateToSave))
          .then(() => console.log('[GameContext] Unmount save to local storage completed, key:', storageKey, 'lastUpdated:', stateToSave.lastUpdated))
          .catch(err => console.log('[GameContext] Unmount save error:', err));
      }
    };
  }, [isAuthenticated, userId]);

  const resetGame = useCallback(async () => {
    const newState = createInitialGameState();
    setGameState(newState);
    lastSavedStateRef.current = '';
    const storageKey = getStorageKey();
    await AsyncStorage.removeItem(storageKey);
    
    if (isAuthenticated && userId) {
      try {
        await saveGameStateMutation.mutateAsync({
          userId,
          gameState: { ...newState } as Parameters<typeof saveGameStateMutation.mutateAsync>[0]['gameState'],
        });
      } catch (error) {
        console.error('[GameContext] Error resetting game in database:', error);
      }
    }
  }, [getStorageKey, isAuthenticated, userId, saveGameStateMutation]);

  const mintTokens = useCallback((amount: number, reason: string, metadata?: TokenTransaction['metadata']) => {
    const now = Date.now();
    setGameState(prev => {
      const newBalance = prev.tokenWallet.musoToken.balance + amount;
      const newTransaction: TokenTransaction = {
        id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'mint',
        amount,
        reason,
        timestamp: now,
        balanceAfter: newBalance,
        metadata,
      };
      console.log('[GameContext] Minting MUSO tokens:', { amount, reason, newBalance });
      return {
        ...prev,
        tokenWallet: {
          ...prev.tokenWallet,
          musoToken: {
            ...prev.tokenWallet.musoToken,
            balance: newBalance,
            totalMinted: prev.tokenWallet.musoToken.totalMinted + amount,
            lastUpdated: now,
          },
          transactions: compressTransactions([newTransaction, ...prev.tokenWallet.transactions]),
        },
      };
    });
  }, []);

  const burnTokens = useCallback((amount: number, reason: string, metadata?: TokenTransaction['metadata']) => {
    const now = Date.now();
    setGameState(prev => {
      if (prev.tokenWallet.musoToken.balance < amount) {
        console.log('[GameContext] Insufficient MUSO balance for burn:', { current: prev.tokenWallet.musoToken.balance, requested: amount });
        return prev;
      }
      const newBalance = prev.tokenWallet.musoToken.balance - amount;
      const newTransaction: TokenTransaction = {
        id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'burn',
        amount,
        reason,
        timestamp: now,
        balanceAfter: newBalance,
        metadata,
      };
      console.log('[GameContext] Burning MUSO tokens:', { amount, reason, newBalance });
      return {
        ...prev,
        tokenWallet: {
          ...prev.tokenWallet,
          musoToken: {
            ...prev.tokenWallet.musoToken,
            balance: newBalance,
            totalBurned: prev.tokenWallet.musoToken.totalBurned + amount,
            lastUpdated: now,
          },
          transactions: compressTransactions([newTransaction, ...prev.tokenWallet.transactions]),
        },
      };
    });
  }, []);

  const syncTokensWithBalance = useCallback(() => {
    setGameState(prev => {
      const totalBalance = prev.bankBalance + prev.savingsBalance + prev.emergencyFund;
      const expectedTokens = totalBalance * TOKENS_PER_DOLLAR;
      const currentTokenBalance = prev.tokenWallet.musoToken.balance;
      const difference = expectedTokens - currentTokenBalance;
      
      if (Math.abs(difference) <= 0.01) {
        return prev;
      }
      
      const now = Date.now();
      const isMint = difference > 0;
      const absAmount = Math.abs(difference);
      const newBalance = isMint ? currentTokenBalance + absAmount : currentTokenBalance - absAmount;
      
      const newTransaction: TokenTransaction = {
        id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: isMint ? 'mint' : 'burn',
        amount: absAmount,
        reason: 'Balance sync',
        timestamp: now,
        balanceAfter: newBalance,
        metadata: { source: 'game_sync', category: 'automatic' },
      };
      
      console.log('[GameContext] Syncing tokens with balance:', { totalBalance, expectedTokens, currentTokenBalance, difference });
      
      return {
        ...prev,
        tokenWallet: {
          ...prev.tokenWallet,
          musoToken: {
            ...prev.tokenWallet.musoToken,
            balance: newBalance,
            totalMinted: isMint ? prev.tokenWallet.musoToken.totalMinted + absAmount : prev.tokenWallet.musoToken.totalMinted,
            totalBurned: !isMint ? prev.tokenWallet.musoToken.totalBurned + absAmount : prev.tokenWallet.musoToken.totalBurned,
            lastUpdated: now,
          },
          transactions: compressTransactions([newTransaction, ...prev.tokenWallet.transactions]),
        },
      };
    });
  }, []);

  const recordBudgetTransaction = useCallback((
    transactionType: 'expense_payment' | 'transfer' | 'credit_card_charge' | 'income' | 'purchase',
    amount: number,
    description: string,
    metadata?: { 
      expenseId?: string; 
      expenseName?: string; 
      paymentMethod?: string;
      fromAccount?: string;
      toAccount?: string;
      creditCardId?: string;
      creditCardName?: string;
      category?: string;
    }
  ) => {
    const now = Date.now();
    const tokenAmount = amount * TOKENS_PER_DOLLAR;
    
    setGameState(prev => {
      const isDebit = transactionType !== 'income';
      const currentBalance = prev.tokenWallet.musoToken.balance;
      const newBalance = isDebit ? currentBalance - tokenAmount : currentBalance + tokenAmount;
      
      const newTransaction: TokenTransaction = {
        id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: isDebit ? 'burn' : 'mint',
        amount: tokenAmount,
        reason: description,
        timestamp: now,
        balanceAfter: Math.max(0, newBalance),
        metadata: {
          source: transactionType,
          category: metadata?.category || transactionType,
          relatedId: metadata?.expenseId || metadata?.creditCardId,
        },
      };
      
      console.log('[GameContext] Recording budget transaction:', { transactionType, amount, tokenAmount, description, newBalance });
      
      const newState = {
        ...prev,
        tokenWallet: {
          ...prev.tokenWallet,
          musoToken: {
            ...prev.tokenWallet.musoToken,
            balance: Math.max(0, newBalance),
            totalBurned: isDebit ? prev.tokenWallet.musoToken.totalBurned + tokenAmount : prev.tokenWallet.musoToken.totalBurned,
            totalMinted: !isDebit ? prev.tokenWallet.musoToken.totalMinted + tokenAmount : prev.tokenWallet.musoToken.totalMinted,
            lastUpdated: now,
          },
          transactions: compressTransactions([newTransaction, ...prev.tokenWallet.transactions]),
        },
        lastUpdated: now,
      };
      
      // Update ref immediately for saving
      gameStateRef.current = newState;
      
      return newState;
    });
    
    // Trigger immediate save after state update - use ref to get latest state
    if (isMountedRef.current && !isLoggingOutRef.current) {
      // Small delay to ensure React has processed the state update
      Promise.resolve().then(() => {
        if (isMountedRef.current && !isLoggingOutRef.current) {
          const currentState = gameStateRef.current;
          console.log('[GameContext] Saving budget transaction immediately, transactions count:', currentState.tokenWallet.transactions.length);
          immediateSaveWithRetry(currentState);
        }
      });
    }
  }, [immediateSaveWithRetry]);

  const updatePlayerName = useCallback((name: string) => {
    setGameState(prev => {
      const activity = createActivityLogEntry(
        'profile_updated',
        'Profile Name Updated',
        `Changed name to "${name}"`,
        { itemName: name }
      );
      return {
        ...prev,
        playerName: name,
        activityLog: [...prev.activityLog, activity],
      };
    });
  }, []);

  const recalculateCreditScores = useCallback(() => {
    setGameState(prev => {
      const newScores = CreditScoreService.calculateScore(
        prev.creditAccounts,
        prev.hardInquiries,
        prev.currentDate
      );
      return { ...prev, creditScores: newScores };
    });
  }, []);

  const addCreditAccount = useCallback((account: CreditAccount) => {
    setGameState(prev => {
      const newAccounts = [...prev.creditAccounts, account];
      const newScores = calculateCreditScores(newAccounts, prev.hardInquiries, prev.currentDate);
      const scoreChange = newScores.composite - prev.creditScores.composite;
      
      const activity = createActivityLogEntry(
        'account_opened',
        'New Account Opened',
        `Opened ${account.type.replace('_', ' ')} with ${account.institutionName}`,
        { accountId: account.id, institutionName: account.institutionName, amount: account.creditLimit }
      );
      
      const newActivityLog = [...prev.activityLog, activity];
      let newScoreHistory = prev.scoreHistory;
      
      if (scoreChange !== 0) {
        const scoreActivity = createActivityLogEntry(
          'score_change',
          'Credit Score Changed',
          `Score ${scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreChange)} points`,
          { previousScore: prev.creditScores.composite, newScore: newScores.composite }
        );
        newActivityLog.push(scoreActivity);
        newScoreHistory = [...newScoreHistory, createScoreHistoryEntry(newScores, 'New account opened')];
      }
      
      return { 
        ...prev, 
        creditAccounts: newAccounts,
        creditScores: newScores,
        activityLog: newActivityLog,
        scoreHistory: newScoreHistory,
      };
    });
  }, []);

  const updateCreditAccount = useCallback((accountId: string, updates: Partial<CreditAccount>) => {
    setGameState(prev => {
      const newAccounts = prev.creditAccounts.map(acc => 
        acc.id === accountId ? { ...acc, ...updates } : acc
      );
      const newScores = calculateCreditScores(newAccounts, prev.hardInquiries, prev.currentDate);
      return { 
        ...prev, 
        creditAccounts: newAccounts,
        creditScores: newScores,
      };
    });
  }, []);

  const addHardInquiry = useCallback((inquiry: HardInquiry) => {
    setGameState(prev => {
      const newInquiries = [...prev.hardInquiries, inquiry];
      const newScores = calculateCreditScores(prev.creditAccounts, newInquiries, prev.currentDate);
      const scoreChange = newScores.composite - prev.creditScores.composite;
      
      const activity = createActivityLogEntry(
        'inquiry_added',
        'Hard Inquiry Added',
        `${inquiry.institutionName} checked your credit for ${inquiry.type.replace('_', ' ')}`,
        { inquiryId: inquiry.id, institutionName: inquiry.institutionName }
      );
      
      const newActivityLog = [...prev.activityLog, activity];
      let newScoreHistory = prev.scoreHistory;
      
      if (scoreChange !== 0) {
        const scoreActivity = createActivityLogEntry(
          'score_change',
          'Credit Score Changed',
          `Score ${scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreChange)} points due to inquiry`,
          { previousScore: prev.creditScores.composite, newScore: newScores.composite }
        );
        newActivityLog.push(scoreActivity);
        newScoreHistory = [...newScoreHistory, createScoreHistoryEntry(newScores, 'Hard inquiry added')];
      }
      
      return { 
        ...prev, 
        hardInquiries: newInquiries,
        creditScores: newScores,
        activityLog: newActivityLog,
        scoreHistory: newScoreHistory,
      };
    });
  }, []);

  const setCurrentJob = useCallback((job: PlayerJob | undefined) => {
    setGameState(prev => {
      const monthlyIncome = job ? Math.round(job.currentSalary / 12) : 0;
      
      let activity: ActivityLogEntry | null = null;
      if (job) {
        activity = createActivityLogEntry(
          'job_change',
          'Career Update',
          `Started as ${job.job.title} at ${job.job.company} - ${job.currentSalary.toLocaleString()}/year`,
          { jobTitle: job.job.title, amount: job.currentSalary }
        );
      }
      
      return { 
        ...prev, 
        currentJob: job,
        monthlyIncome,
        jobHistory: job && prev.currentJob 
          ? [...prev.jobHistory, prev.currentJob]
          : prev.jobHistory,
        activityLog: activity ? [...prev.activityLog, activity] : prev.activityLog,
      };
    });
  }, []);

  const updateExpenses = useCallback((expenses: Expense[]) => {
    setGameState(prev => ({ ...prev, expenses }));
  }, []);

  const addExpense = useCallback((expense: Expense) => {
    setGameState(prev => ({ 
      ...prev, 
      expenses: [...prev.expenses, expense],
    }));
  }, []);

  const removeExpense = useCallback((expenseId: string) => {
    setGameState(prev => ({ 
      ...prev, 
      expenses: prev.expenses.filter(e => e.id !== expenseId),
    }));
  }, []);

  const updateBalance = useCallback((amount: number, type: 'bank' | 'savings' | 'emergency' | 'investments') => {
    setGameState(prev => {
      const now = Date.now();
      let newState: GameState;
      const tokenAmount = Math.abs(amount) * TOKENS_PER_DOLLAR;
      const isDebit = amount < 0;
      
      switch (type) {
        case 'bank':
          newState = { ...prev, bankBalance: prev.bankBalance + amount, lastUpdated: now };
          break;
        case 'savings':
          newState = { ...prev, savingsBalance: prev.savingsBalance + amount, lastUpdated: now };
          break;
        case 'emergency':
          newState = { ...prev, emergencyFund: prev.emergencyFund + amount, lastUpdated: now };
          break;
        case 'investments':
          newState = { ...prev, investments: prev.investments + amount, lastUpdated: now };
          break;
        default:
          return prev;
      }
      
      // Sync token balance with bank/savings/emergency changes
      if (type === 'bank' || type === 'savings' || type === 'emergency') {
        const currentTokenBalance = prev.tokenWallet.musoToken.balance;
        const newTokenBalance = isDebit 
          ? Math.max(0, currentTokenBalance - tokenAmount)
          : currentTokenBalance + tokenAmount;
        
        const newTransaction: TokenTransaction = {
          id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
          type: isDebit ? 'burn' : 'mint',
          amount: tokenAmount,
          reason: `Balance ${isDebit ? 'withdrawal' : 'deposit'} - ${type}`,
          timestamp: now,
          balanceAfter: newTokenBalance,
          metadata: { source: 'balance_update', category: type },
        };
        
        console.log('[GameContext] Syncing tokens with balance update:', { type, amount, tokenAmount, newTokenBalance });
        
        newState = {
          ...newState,
          tokenWallet: {
            ...prev.tokenWallet,
            musoToken: {
              ...prev.tokenWallet.musoToken,
              balance: newTokenBalance,
              totalMinted: !isDebit ? prev.tokenWallet.musoToken.totalMinted + tokenAmount : prev.tokenWallet.musoToken.totalMinted,
              totalBurned: isDebit ? prev.tokenWallet.musoToken.totalBurned + tokenAmount : prev.tokenWallet.musoToken.totalBurned,
              lastUpdated: now,
            },
            transactions: compressTransactions([newTransaction, ...prev.tokenWallet.transactions]),
          },
        };
      }
      
      // Update ref immediately for saving
      gameStateRef.current = newState;
      
      return newState;
    });
    
    // Trigger immediate save after state update
    if (isMountedRef.current && !isLoggingOutRef.current) {
      Promise.resolve().then(() => {
        if (isMountedRef.current && !isLoggingOutRef.current) {
          const currentState = gameStateRef.current;
          console.log('[GameContext] Saving balance update immediately, bank:', currentState.bankBalance);
          immediateSaveWithRetry(currentState);
        }
      });
    }
  }, [immediateSaveWithRetry]);

  const updateBalanceOptimistic = useCallback(async (
    amount: number, 
    type: 'bank' | 'savings' | 'emergency' | 'investments'
  ): Promise<OptimisticOperationResult<GameState>> => {
    const currentState = gameStateRef.current;
    optimisticStateRef.current = currentState;
    setIsOptimisticPending(true);
    setLastRollbackError(null);
    
    const applyBalanceUpdate = (state: GameState): GameState => {
      const now = Date.now();
      switch (type) {
        case 'bank':
          return { ...state, bankBalance: state.bankBalance + amount, lastUpdated: now };
        case 'savings':
          return { ...state, savingsBalance: state.savingsBalance + amount, lastUpdated: now };
        case 'emergency':
          return { ...state, emergencyFund: state.emergencyFund + amount, lastUpdated: now };
        case 'investments':
          return { ...state, investments: state.investments + amount, lastUpdated: now };
        default:
          return state;
      }
    };
    
    const syncToServer = async (newState: GameState) => {
      if (isAuthenticated && userId) {
        await saveToDatabase(newState);
      }
    };
    
    try {
      const result = await gameRepository.executeOptimisticUpdate(
        `balance_${type}`,
        'update_balance',
        { amount, type },
        currentState,
        applyBalanceUpdate,
        syncToServer
      );
      
      if (result.success && result.data) {
        setGameStateInternal(result.data);
        gameStateRef.current = result.data;
        console.log('[GameContext] Optimistic balance update committed');
      } else {
        console.log('[GameContext] Optimistic balance update failed, rolled back');
        setLastRollbackError(result.error || 'Balance update failed');
        if (optimisticStateRef.current) {
          setGameStateInternal(optimisticStateRef.current);
        }
      }
      
      setIsOptimisticPending(false);
      return result;
    } catch (error) {
      console.error('[GameContext] Optimistic balance update error:', error);
      setIsOptimisticPending(false);
      if (optimisticStateRef.current) {
        setGameStateInternal(optimisticStateRef.current);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [isAuthenticated, userId, saveToDatabase]);

  const executeOptimisticAction = useCallback(async (
    operationId: string,
    operationType: string,
    payload: unknown,
    applyUpdate: (state: GameState, payload: unknown) => GameState,
    options?: { rollbackOnFailure?: boolean; showNotification?: boolean }
  ): Promise<OptimisticOperationResult<GameState>> => {
    const { rollbackOnFailure = true } = options || {};
    const currentState = gameStateRef.current;
    optimisticStateRef.current = currentState;
    setIsOptimisticPending(true);
    setLastRollbackError(null);
    
    const syncToServer = async (newState: GameState) => {
      if (isAuthenticated && userId) {
        await saveToDatabase(newState);
      }
    };
    
    try {
      const result = await gameRepository.executeOptimisticUpdateWithRetry(
        operationId,
        operationType,
        payload,
        currentState,
        applyUpdate,
        syncToServer,
        { rollbackOnFailure }
      );
      
      if (result.success && result.data) {
        setGameStateInternal(result.data);
        gameStateRef.current = result.data;
        console.log('[GameContext] Optimistic action committed:', operationType);
      } else if (rollbackOnFailure) {
        console.log('[GameContext] Optimistic action failed, rolled back:', operationType);
        setLastRollbackError(result.error || 'Action failed');
        if (optimisticStateRef.current) {
          setGameStateInternal(optimisticStateRef.current);
        }
      }
      
      setIsOptimisticPending(false);
      return result;
    } catch (error) {
      console.error('[GameContext] Optimistic action error:', operationType, error);
      setIsOptimisticPending(false);
      if (rollbackOnFailure && optimisticStateRef.current) {
        setGameStateInternal(optimisticStateRef.current);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [isAuthenticated, userId, saveToDatabase]);

  const rollbackToLastState = useCallback(() => {
    if (optimisticStateRef.current) {
      console.log('[GameContext] Manual rollback to last saved state');
      setGameStateInternal(optimisticStateRef.current);
      gameStateRef.current = optimisticStateRef.current;
      setLastRollbackError(null);
    }
  }, []);

  const makePayment = useCallback((accountId: string, amount: number, onTime: boolean = true) => {
    setGameState(prev => {
      const account = prev.creditAccounts.find(a => a.id === accountId);
      if (!account) return prev;

      const payment = {
        date: prev.currentDate,
        amount,
        onTime,
        daysLate: onTime ? 0 : 30,
      };

      const newBalance = Math.max(0, account.balance - amount);
      const newPaymentHistory = [...account.paymentHistory, payment];

      const newAccounts = prev.creditAccounts.map(acc => 
        acc.id === accountId 
          ? { 
              ...acc, 
              balance: newBalance, 
              paymentHistory: newPaymentHistory,
              lastPaymentDate: prev.currentDate,
              status: onTime ? 'current' as const : 'late_30' as const,
            } 
          : acc
      );

      const newScores = calculateCreditScores(newAccounts, prev.hardInquiries, prev.currentDate);
      const newStreak = onTime ? prev.consecutiveOnTimePayments + 1 : 0;
      const scoreChange = newScores.composite - prev.creditScores.composite;
      
      const activity = createActivityLogEntry(
        'payment_made',
        'Payment Made',
        `Paid ${amount.toLocaleString()} to ${account.institutionName}${onTime ? ' (on time)' : ' (late)'}`,
        { accountId, amount, institutionName: account.institutionName }
      );
      
      const newActivityLog = [...prev.activityLog, activity];
      let newScoreHistory = prev.scoreHistory;
      
      if (scoreChange !== 0) {
        const scoreActivity = createActivityLogEntry(
          'score_change',
          'Credit Score Changed',
          `Score ${scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreChange)} points`,
          { previousScore: prev.creditScores.composite, newScore: newScores.composite }
        );
        newActivityLog.push(scoreActivity);
        newScoreHistory = [...newScoreHistory, createScoreHistoryEntry(newScores, onTime ? 'On-time payment' : 'Late payment')];
      }

      const tokenAmount = amount * TOKENS_PER_DOLLAR;
      const newTokenBalance = Math.max(0, prev.tokenWallet.musoToken.balance - tokenAmount);
      const tokenTransaction: TokenTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'burn',
        amount: tokenAmount,
        reason: `Credit payment to ${account.institutionName}`,
        timestamp: Date.now(),
        balanceAfter: newTokenBalance,
        metadata: { source: 'credit_payment', category: 'payment', relatedId: accountId },
      };
      
      console.log('[GameContext] Burning tokens for payment:', { amount, tokenAmount, newTokenBalance });

      return { 
        ...prev, 
        creditAccounts: newAccounts,
        creditScores: newScores,
        bankBalance: prev.bankBalance - amount,
        consecutiveOnTimePayments: newStreak,
        lifetimeSpending: prev.lifetimeSpending + amount,
        activityLog: newActivityLog,
        scoreHistory: newScoreHistory,
        tokenWallet: {
          ...prev.tokenWallet,
          musoToken: {
            ...prev.tokenWallet.musoToken,
            balance: newTokenBalance,
            totalBurned: prev.tokenWallet.musoToken.totalBurned + tokenAmount,
            lastUpdated: Date.now(),
          },
          transactions: compressTransactions([tokenTransaction, ...prev.tokenWallet.transactions]),
        },
      };
    });
  }, []);

  const makePaymentOptimistic = useCallback(async (
    accountId: string, 
    amount: number, 
    onTime: boolean = true
  ): Promise<OptimisticOperationResult<GameState>> => {
    const currentState = gameStateRef.current;
    optimisticStateRef.current = currentState;
    setIsOptimisticPending(true);
    setLastRollbackError(null);
    
    const applyPayment = (state: GameState): GameState => {
      const account = state.creditAccounts.find(a => a.id === accountId);
      if (!account) return state;

      const payment = {
        date: state.currentDate,
        amount,
        onTime,
        daysLate: onTime ? 0 : 30,
      };

      const newBalance = Math.max(0, account.balance - amount);
      const newPaymentHistory = [...account.paymentHistory, payment];

      const newAccounts = state.creditAccounts.map(acc => 
        acc.id === accountId 
          ? { 
              ...acc, 
              balance: newBalance, 
              paymentHistory: newPaymentHistory,
              lastPaymentDate: state.currentDate,
              status: onTime ? 'current' as const : 'late_30' as const,
            } 
          : acc
      );

      const newScores = calculateCreditScores(newAccounts, state.hardInquiries, state.currentDate);
      const newStreak = onTime ? state.consecutiveOnTimePayments + 1 : 0;
      
      const activity = createActivityLogEntry(
        'payment_made',
        'Payment Made',
        `Paid ${amount.toLocaleString()} to ${account.institutionName}${onTime ? ' (on time)' : ' (late)'}`,
        { accountId, amount, institutionName: account.institutionName }
      );

      return { 
        ...state, 
        creditAccounts: newAccounts,
        creditScores: newScores,
        bankBalance: state.bankBalance - amount,
        consecutiveOnTimePayments: newStreak,
        lifetimeSpending: state.lifetimeSpending + amount,
        activityLog: [...state.activityLog, activity],
        lastUpdated: Date.now(),
      };
    };
    
    const syncToServer = async (newState: GameState) => {
      if (isAuthenticated && userId) {
        await saveToDatabase(newState);
      }
    };
    
    try {
      const result = await gameRepository.executeOptimisticUpdate(
        `payment_${accountId}`,
        'make_payment',
        { accountId, amount, onTime },
        currentState,
        applyPayment,
        syncToServer
      );
      
      if (result.success && result.data) {
        setGameStateInternal(result.data);
        gameStateRef.current = result.data;
        console.log('[GameContext] Optimistic payment committed successfully');
      } else {
        console.log('[GameContext] Optimistic payment failed, rolled back');
        setLastRollbackError(result.error || 'Payment failed');
        if (optimisticStateRef.current) {
          setGameStateInternal(optimisticStateRef.current);
        }
      }
      
      setIsOptimisticPending(false);
      return result;
    } catch (error) {
      console.error('[GameContext] Optimistic payment error:', error);
      setIsOptimisticPending(false);
      if (optimisticStateRef.current) {
        setGameStateInternal(optimisticStateRef.current);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [isAuthenticated, userId, saveToDatabase]);

  const addPendingApplication = useCallback((application: LoanApplication) => {
    setGameState(prev => {
      const activity = createActivityLogEntry(
        'application_submitted',
        'Application Submitted',
        `Applied for ${application.termMonths > 0 ? application.termMonths + ' month' : ''} ${application.amount.toLocaleString()} loan`,
        { applicationId: application.id, amount: application.amount }
      );
      
      return {
        ...prev,
        pendingApplications: [...prev.pendingApplications, application],
        activityLog: [...prev.activityLog, activity],
      };
    });
  }, []);

  const updateApplication = useCallback((applicationId: string, updates: Partial<LoanApplication>) => {
    setGameState(prev => {
      const app = prev.pendingApplications.find(a => a.id === applicationId);
      let newActivityLog = prev.activityLog;
      
      if (updates.status && app) {
        if (updates.status === 'approved') {
          const activity = createActivityLogEntry(
            'application_approved',
            'Application Approved',
            `Your ${app.amount.toLocaleString()} loan application was approved`,
            { applicationId, amount: app.amount }
          );
          newActivityLog = [...newActivityLog, activity];
        } else if (updates.status === 'denied') {
          const activity = createActivityLogEntry(
            'application_denied',
            'Application Denied',
            `Your ${app.amount.toLocaleString()} loan application was denied${updates.denialReason ? ': ' + updates.denialReason : ''}`,
            { applicationId, amount: app.amount }
          );
          newActivityLog = [...newActivityLog, activity];
        }
      }
      
      return {
        ...prev,
        pendingApplications: prev.pendingApplications.map(a =>
          a.id === applicationId ? { ...a, ...updates } : a
        ),
        activityLog: newActivityLog,
      };
    });
  }, []);

  const removeApplication = useCallback((applicationId: string) => {
    setGameState(prev => ({
      ...prev,
      pendingApplications: prev.pendingApplications.filter(app => app.id !== applicationId),
    }));
  }, []);

  const addProperty = useCallback((property: OwnedProperty) => {
    setGameState(prev => {
      const now = Date.now();
      const propertyWithSolar: OwnedProperty = {
        ...property,
        hasSolarPanels: property.hasSolarPanels || false,
      };
      
      const newProperties = [...prev.ownedProperties, propertyWithSolar];
      const totalPropertyValue = newProperties.reduce((sum, p) => sum + p.currentValue, 0);
      
      let housingType: LifestyleStats['housingType'] = 'renting';
      if (property.type === 'luxury') housingType = 'owns_luxury';
      else if (property.type === 'single_family' || property.type === 'multi_family') housingType = 'owns_house';
      else housingType = 'owns_condo';
      
      const activity = createActivityLogEntry(
        'property_purchased',
        'Property Purchased',
        `Bought ${property.name} for ${property.purchasePrice.toLocaleString()}`,
        { propertyName: property.name, amount: property.purchasePrice }
      );
      
      // Burn tokens for property purchase (10 tokens per $1)
      const tokenAmount = property.purchasePrice * TOKENS_PER_DOLLAR;
      const newTokenBalance = Math.max(0, prev.tokenWallet.musoToken.balance - tokenAmount);
      
      const tokenTransaction: TokenTransaction = {
        id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'burn',
        amount: tokenAmount,
        reason: `Property purchase: ${property.name}`,
        timestamp: now,
        balanceAfter: newTokenBalance,
        metadata: { source: 'property_purchase', category: 'real_estate' },
      };
      
      console.log('[GameContext] Burning tokens for property purchase:', { price: property.purchasePrice, tokenAmount, newTokenBalance });
      
      return {
        ...prev,
        ownedProperties: newProperties,
        lifestyle: {
          ...prev.lifestyle,
          housingType,
          housingName: property.name,
          totalPropertyValue,
        },
        activityLog: [...prev.activityLog, activity],
        lifetimeSpending: prev.lifetimeSpending + property.purchasePrice,
        tokenWallet: {
          ...prev.tokenWallet,
          musoToken: {
            ...prev.tokenWallet.musoToken,
            balance: newTokenBalance,
            totalBurned: prev.tokenWallet.musoToken.totalBurned + tokenAmount,
            lastUpdated: now,
          },
          transactions: compressTransactions([tokenTransaction, ...prev.tokenWallet.transactions]),
        },
      };
    });
  }, []);

  const rentProperty = useCallback((propertyName: string, monthlyRent: number, propertyType: string, neighborhood: string) => {
    const moveInCost = monthlyRent * 2;
    
    setGameState(prev => {
      if (prev.bankBalance < moveInCost) {
        console.log('[GameContext] Insufficient funds for rental move-in cost');
        return prev;
      }
      
      const now = Date.now();
      const existingRentExpense = prev.expenses.find(e => e.id === 'exp_rent');
      let newExpenses = prev.expenses;
      
      if (existingRentExpense) {
        newExpenses = prev.expenses.map(e => 
          e.id === 'exp_rent' ? { ...e, amount: monthlyRent, name: `Rent - ${propertyName}` } : e
        );
      } else {
        const rentExpense: Expense = {
          id: 'exp_rent',
          name: `Rent - ${propertyName}`,
          amount: monthlyRent,
          category: 'housing',
          frequency: 'monthly',
          isFixed: true,
        };
        newExpenses = [...prev.expenses, rentExpense];
      }
      
      const activity = createActivityLogEntry(
        'property_purchased',
        'Rental Signed',
        `Rented ${propertyName} in ${neighborhood} for ${monthlyRent.toLocaleString()}/month`,
        { propertyName, amount: moveInCost }
      );
      
      const tokenAmount = moveInCost * TOKENS_PER_DOLLAR;
      const newTokenBalance = Math.max(0, prev.tokenWallet.musoToken.balance - tokenAmount);
      
      const tokenTransaction: TokenTransaction = {
        id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'burn',
        amount: tokenAmount,
        reason: `Rental move-in: ${propertyName}`,
        timestamp: now,
        balanceAfter: newTokenBalance,
        metadata: { source: 'rental', category: 'housing' },
      };
      
      console.log('[GameContext] Burning tokens for rental move-in:', { moveInCost, tokenAmount, newTokenBalance });
      
      return {
        ...prev,
        bankBalance: prev.bankBalance - moveInCost,
        expenses: newExpenses,
        lifestyle: {
          ...prev.lifestyle,
          housingType: 'renting',
          housingName: propertyName,
          rentalPropertyType: propertyType,
          rentalNeighborhood: neighborhood,
          monthlyRent,
        },
        lifetimeSpending: prev.lifetimeSpending + moveInCost,
        activityLog: [...prev.activityLog, activity],
        tokenWallet: {
          ...prev.tokenWallet,
          musoToken: {
            ...prev.tokenWallet.musoToken,
            balance: newTokenBalance,
            totalBurned: prev.tokenWallet.musoToken.totalBurned + tokenAmount,
            lastUpdated: now,
          },
          transactions: compressTransactions([tokenTransaction, ...prev.tokenWallet.transactions]),
        },
      };
    });
    
    return true;
  }, []);

  const installSolarPanels = useCallback((propertyId: string) => {
    const SOLAR_INSTALL_COST = 15000;
    
    setGameState(prev => {
      if (prev.bankBalance < SOLAR_INSTALL_COST) return prev;
      
      const property = prev.ownedProperties.find(p => p.id === propertyId);
      if (!property || property.hasSolarPanels) return prev;
      
      const now = Date.now();
      const newProperties = prev.ownedProperties.map(p =>
        p.id === propertyId
          ? { ...p, hasSolarPanels: true, solarInstallDate: prev.currentDate }
          : p
      );
      
      const activity = createActivityLogEntry(
        'property_purchased',
        'Solar Panels Installed',
        `Installed solar panels on ${property.name} for ${SOLAR_INSTALL_COST.toLocaleString()} - Save $75/month on utilities!`,
        { propertyName: property.name, amount: SOLAR_INSTALL_COST }
      );
      
      const tokenAmount = SOLAR_INSTALL_COST * TOKENS_PER_DOLLAR;
      const newTokenBalance = Math.max(0, prev.tokenWallet.musoToken.balance - tokenAmount);
      
      const tokenTransaction: TokenTransaction = {
        id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'burn',
        amount: tokenAmount,
        reason: `Solar panel installation: ${property.name}`,
        timestamp: now,
        balanceAfter: newTokenBalance,
        metadata: { source: 'solar_panels', category: 'property_upgrade' },
      };
      
      console.log('[GameContext] Burning tokens for solar installation:', { cost: SOLAR_INSTALL_COST, tokenAmount, newTokenBalance });
      
      return {
        ...prev,
        bankBalance: prev.bankBalance - SOLAR_INSTALL_COST,
        ownedProperties: newProperties,
        lifetimeSpending: prev.lifetimeSpending + SOLAR_INSTALL_COST,
        activityLog: [...prev.activityLog, activity],
        tokenWallet: {
          ...prev.tokenWallet,
          musoToken: {
            ...prev.tokenWallet.musoToken,
            balance: newTokenBalance,
            totalBurned: prev.tokenWallet.musoToken.totalBurned + tokenAmount,
            lastUpdated: now,
          },
          transactions: compressTransactions([tokenTransaction, ...prev.tokenWallet.transactions]),
        },
      };
    });
  }, []);

  const purchaseGas = useCallback((vehicleId: string, gallons: number, pricePerGallon: number = 3.50) => {
    setGameState(prev => {
      const vehicle = prev.ownedVehicles.find(v => v.id === vehicleId);
      if (!vehicle || vehicle.fuelType !== 'gas') return prev;
      
      const totalCost = gallons * pricePerGallon;
      if (prev.bankBalance < totalCost) return prev;
      
      const now = Date.now();
      const tankCapacity = vehicle.tankCapacity || 12;
      const currentGallons = (vehicle.fuelLevel / 100) * tankCapacity;
      const newGallons = Math.min(currentGallons + gallons, tankCapacity);
      const newFuelLevel = (newGallons / tankCapacity) * 100;
      const milesUntilEmpty = newGallons * vehicle.mpg;
      
      const newVehicles = prev.ownedVehicles.map(v =>
        v.id === vehicleId
          ? { ...v, fuelLevel: newFuelLevel, milesUntilEmpty }
          : v
      );
      
      const tokenAmount = totalCost * TOKENS_PER_DOLLAR;
      const newTokenBalance = Math.max(0, prev.tokenWallet.musoToken.balance - tokenAmount);
      
      const tokenTransaction: TokenTransaction = {
        id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'burn',
        amount: tokenAmount,
        reason: `Gas purchase: ${gallons.toFixed(1)} gallons`,
        timestamp: now,
        balanceAfter: newTokenBalance,
        metadata: { source: 'gas_purchase', category: 'vehicle' },
      };
      
      console.log('[GameContext] Burning tokens for gas purchase:', { totalCost, tokenAmount, newTokenBalance });
      
      return {
        ...prev,
        bankBalance: prev.bankBalance - totalCost,
        ownedVehicles: newVehicles,
        lifetimeSpending: prev.lifetimeSpending + totalCost,
        tokenWallet: {
          ...prev.tokenWallet,
          musoToken: {
            ...prev.tokenWallet.musoToken,
            balance: newTokenBalance,
            totalBurned: prev.tokenWallet.musoToken.totalBurned + tokenAmount,
            lastUpdated: now,
          },
          transactions: compressTransactions([tokenTransaction, ...prev.tokenWallet.transactions]),
        },
      };
    });
  }, []);

  const consumeFuel = useCallback(() => {
    setGameState(prev => {
      const newVehicles = prev.ownedVehicles.map(vehicle => {
        if (vehicle.fuelType !== 'gas') return vehicle;
        
        const monthlyMiles = 1000;
        const gallonsUsed = monthlyMiles / vehicle.mpg;
        const tankCapacity = vehicle.tankCapacity || 12;
        const fuelPercentUsed = (gallonsUsed / tankCapacity) * 100;
        const newFuelLevel = Math.max(0, vehicle.fuelLevel - fuelPercentUsed);
        const newGallons = (newFuelLevel / 100) * tankCapacity;
        const milesUntilEmpty = newGallons * vehicle.mpg;
        
        return {
          ...vehicle,
          fuelLevel: newFuelLevel,
          milesUntilEmpty,
        };
      });
      
      return {
        ...prev,
        ownedVehicles: newVehicles,
      };
    });
  }, []);

  const addVehicle = useCallback((vehicle: OwnedVehicle) => {
    setGameState(prev => {
      const now = Date.now();
      const vehicleWithFuel: OwnedVehicle = {
        ...vehicle,
        fuelLevel: 100,
        milesUntilEmpty: vehicle.fuelType === 'gas' ? (vehicle.tankCapacity || 12) * vehicle.mpg : 300,
      };
      
      const newVehicles = [...prev.ownedVehicles, vehicleWithFuel];
      const totalVehicleValue = newVehicles.reduce((sum, v) => sum + v.currentValue, 0);
      const hasLoan = vehicle.loanId !== undefined;
      
      const activity = createActivityLogEntry(
        'vehicle_purchased',
        'Vehicle Purchased',
        `Bought ${vehicle.year} ${vehicle.make} ${vehicle.model} for ${vehicle.purchasePrice.toLocaleString()}`,
        { vehicleName: `${vehicle.make} ${vehicle.model}`, amount: vehicle.purchasePrice }
      );
      
      // Burn tokens for vehicle purchase (10 tokens per $1)
      const tokenAmount = vehicle.purchasePrice * TOKENS_PER_DOLLAR;
      const newTokenBalance = Math.max(0, prev.tokenWallet.musoToken.balance - tokenAmount);
      
      const tokenTransaction: TokenTransaction = {
        id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'burn',
        amount: tokenAmount,
        reason: `Vehicle purchase: ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        timestamp: now,
        balanceAfter: newTokenBalance,
        metadata: { source: 'vehicle_purchase', category: 'vehicle' },
      };
      
      console.log('[GameContext] Burning tokens for vehicle purchase:', { price: vehicle.purchasePrice, tokenAmount, newTokenBalance });
      
      return {
        ...prev,
        ownedVehicles: newVehicles,
        lifestyle: {
          ...prev.lifestyle,
          vehicleType: hasLoan ? 'financed' : 'owned',
          vehicleName: `${vehicle.make} ${vehicle.model}`,
          totalVehicleValue,
        },
        activityLog: [...prev.activityLog, activity],
        lifetimeSpending: prev.lifetimeSpending + vehicle.purchasePrice,
        tokenWallet: {
          ...prev.tokenWallet,
          musoToken: {
            ...prev.tokenWallet.musoToken,
            balance: newTokenBalance,
            totalBurned: prev.tokenWallet.musoToken.totalBurned + tokenAmount,
            lastUpdated: now,
          },
          transactions: compressTransactions([tokenTransaction, ...prev.tokenWallet.transactions]),
        },
      };
    });
  }, []);

  const updateAvatar = useCallback((updates: Partial<PlayerAvatar>) => {
    setGameState(prev => ({
      ...prev,
      avatar: { ...prev.avatar, ...updates },
    }));
  }, []);

  const setProfilePhoto = useCallback((photoUrl: string | undefined) => {
    setGameState(prev => ({
      ...prev,
      profilePhotoUrl: photoUrl,
      useCustomPhoto: !!photoUrl,
    }));
  }, []);

  const toggleUseCustomPhoto = useCallback((useCustom: boolean) => {
    setGameState(prev => ({
      ...prev,
      useCustomPhoto: useCustom,
    }));
  }, []);

  const setGameMode = useCallback((mode: GameMode) => {
    setGameState(prev => ({
      ...prev,
      gameMode: mode,
    }));
  }, []);

  const updateAlert = useCallback((alertId: string, updates: Partial<Alert>) => {
    setGameState(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert =>
        alert.id === alertId ? { ...alert, ...updates } : alert
      ),
    }));
  }, []);

  const addAlert = useCallback((alert: Alert) => {
    setGameState(prev => ({
      ...prev,
      alerts: [...prev.alerts, alert],
    }));
  }, []);

  const removeAlert = useCallback((alertId: string) => {
    setGameState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(a => a.id !== alertId),
    }));
  }, []);

  const purchaseFood = useCallback((item: FoodItem) => {
    setGameState(prev => {
      if (prev.bankBalance < item.price) return prev;
      
      const currentMonth = prev.monthsPlayed;
      const newHealth = Math.min(100, prev.healthStatus.level + item.healthImpact + 20);
      const now = Date.now();
      const tokenAmount = item.price * TOKENS_PER_DOLLAR;
      const newTokenBalance = Math.max(0, prev.tokenWallet.musoToken.balance - tokenAmount);
      
      const tokenTransaction: TokenTransaction = {
        id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'burn',
        amount: tokenAmount,
        reason: `Food purchase: ${item.name}`,
        timestamp: now,
        balanceAfter: newTokenBalance,
        metadata: { source: 'food_purchase', category: 'food' },
      };
      
      console.log('[GameContext] Burning tokens for food purchase:', { price: item.price, tokenAmount, newTokenBalance });
      
      return {
        ...prev,
        bankBalance: prev.bankBalance - item.price,
        lifetimeSpending: prev.lifetimeSpending + item.price,
        healthStatus: {
          ...prev.healthStatus,
          level: newHealth,
          lastFoodPurchaseMonth: currentMonth,
          isHospitalized: false,
        },
        tokenWallet: {
          ...prev.tokenWallet,
          musoToken: {
            ...prev.tokenWallet.musoToken,
            balance: newTokenBalance,
            totalBurned: prev.tokenWallet.musoToken.totalBurned + tokenAmount,
            lastUpdated: now,
          },
          transactions: compressTransactions([tokenTransaction, ...prev.tokenWallet.transactions]),
        },
      };
    });
  }, []);

  const checkHealthStatus = useCallback(() => {
    setGameState(prev => {
      const monthsSinceFood = prev.monthsPlayed - prev.healthStatus.lastFoodPurchaseMonth;
      
      if (monthsSinceFood >= 1 && !prev.healthStatus.isHospitalized) {
        const hospitalCost = 2500;
        const newDebt = prev.healthStatus.hospitalDebt + hospitalCost;
        
        return {
          ...prev,
          healthStatus: {
            ...prev.healthStatus,
            level: 30,
            isHospitalized: true,
            hospitalDebt: newDebt,
          },
          bankBalance: prev.bankBalance - hospitalCost,
          creditScores: {
            ...prev.creditScores,
            experian: Math.max(300, prev.creditScores.experian - 15),
            equifax: Math.max(300, prev.creditScores.equifax - 15),
            transunion: Math.max(300, prev.creditScores.transunion - 15),
            composite: Math.max(300, prev.creditScores.composite - 15),
          },
        };
      }
      
      return prev;
    });
  }, []);

  const updateExpenseAmount = useCallback((expenseId: string, newAmount: number) => {
    setGameState(prev => ({
      ...prev,
      expenses: prev.expenses.map(exp =>
        exp.id === expenseId ? { ...exp, amount: newAmount } : exp
      ),
    }));
  }, []);

  const getCurrentMonthKey = useCallback((date: number) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth()}`;
  }, []);

  const markExpensePaid = useCallback((expenseId: string, method: string) => {
    setGameState(prev => {
      const monthKey = getCurrentMonthKey(prev.currentDate);
      const now = Date.now();
      console.log('[GameContext] Marking expense as paid:', expenseId, 'method:', method, 'monthKey:', monthKey);
      
      const newState = {
        ...prev,
        paidExpenses: {
          ...prev.paidExpenses,
          [expenseId]: {
            paidAt: now,
            method,
            monthKey,
          },
        },
        lastUpdated: now,
      };
      
      // Update ref immediately for saving
      gameStateRef.current = newState;
      
      return newState;
    });
    
    // Trigger immediate save after state update
    if (isMountedRef.current && !isLoggingOutRef.current) {
      Promise.resolve().then(() => {
        if (isMountedRef.current && !isLoggingOutRef.current) {
          const currentState = gameStateRef.current;
          console.log('[GameContext] Saving paid expense immediately, paidExpenses:', Object.keys(currentState.paidExpenses).length);
          immediateSaveWithRetry(currentState);
        }
      });
    }
  }, [getCurrentMonthKey, immediateSaveWithRetry]);

  const clearPaidExpensesForNewMonth = useCallback((newMonthKey: string) => {
    setGameState(prev => {
      const updatedPaidExpenses: Record<string, PaidExpenseRecord> = {};
      Object.entries(prev.paidExpenses).forEach(([expenseId, record]) => {
        if (record.monthKey === newMonthKey) {
          updatedPaidExpenses[expenseId] = record;
        }
      });
      console.log('[GameContext] Cleared paid expenses for new month:', newMonthKey);
      return {
        ...prev,
        paidExpenses: updatedPaidExpenses,
      };
    });
  }, []);

  const purchaseClothing = useCallback((item: ClothingItem) => {
    setGameState(prev => {
      if (prev.bankBalance < item.price) return prev;
      
      const now = Date.now();
      const ownedItem: OwnedClothing = {
        ...item,
        purchaseDate: prev.currentDate,
        isEquipped: false,
      };
      
      const newClothing = [...prev.ownedClothing, ownedItem];
      const totalClothingValue = newClothing.reduce((sum, c) => sum + c.price, 0);
      
      let fashionStyle: LifestyleStats['fashionStyle'] = 'basic';
      if (totalClothingValue >= 10000) fashionStyle = 'elite';
      else if (totalClothingValue >= 5000) fashionStyle = 'luxury';
      else if (totalClothingValue >= 2000) fashionStyle = 'business';
      else if (totalClothingValue >= 500) fashionStyle = 'casual';
      
      const activity = createActivityLogEntry(
        'clothing_purchased',
        'Clothing Purchased',
        `Bought ${item.name} from ${item.brand} for ${item.price.toLocaleString()}`,
        { itemName: item.name, amount: item.price }
      );
      
      const tokenAmount = item.price * TOKENS_PER_DOLLAR;
      const newTokenBalance = Math.max(0, prev.tokenWallet.musoToken.balance - tokenAmount);
      
      const tokenTransaction: TokenTransaction = {
        id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'burn',
        amount: tokenAmount,
        reason: `Clothing purchase: ${item.name}`,
        timestamp: now,
        balanceAfter: newTokenBalance,
        metadata: { source: 'clothing_purchase', category: 'clothing' },
      };
      
      console.log('[GameContext] Burning tokens for clothing purchase:', { price: item.price, tokenAmount, newTokenBalance });
      
      return {
        ...prev,
        bankBalance: prev.bankBalance - item.price,
        ownedClothing: newClothing,
        lifetimeSpending: prev.lifetimeSpending + item.price,
        lifestyle: {
          ...prev.lifestyle,
          fashionStyle,
          totalClothingValue,
        },
        activityLog: [...prev.activityLog, activity],
        tokenWallet: {
          ...prev.tokenWallet,
          musoToken: {
            ...prev.tokenWallet.musoToken,
            balance: newTokenBalance,
            totalBurned: prev.tokenWallet.musoToken.totalBurned + tokenAmount,
            lastUpdated: now,
          },
          transactions: compressTransactions([tokenTransaction, ...prev.tokenWallet.transactions]),
        },
      };
    });
  }, []);

  const equipClothing = useCallback((itemId: string, category: ClothingCategory) => {
    setGameState(prev => {
      const item = prev.ownedClothing.find(c => c.id === itemId);
      if (!item) return prev;
      
      const validCategories: ClothingCategory[] = ['top', 'bottom', 'shoes', 'hat', 'jewelry', 'watch', 'bag', 'eyewear'];
      if (!validCategories.includes(category)) return prev;
      
      const newClothing = prev.ownedClothing.map(c => ({
        ...c,
        isEquipped: c.id === itemId ? true : (c.category === category ? false : c.isEquipped),
      }));
      
      return {
        ...prev,
        ownedClothing: newClothing,
        avatar: {
          ...prev.avatar,
          outfit: {
            ...prev.avatar.outfit,
            [category]: item,
          },
        },
      };
    });
  }, []);

  const togglePublicProfile = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPublicProfile: !prev.isPublicProfile,
    }));
  }, []);

  const unlockAchievement = useCallback((achievementId: string) => {
    setGameState(prev => {
      if (prev.unlockedAchievements.includes(achievementId)) return prev;
      
      const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
      let bankBonus = 0;
      if (achievement?.reward?.type === 'cash') {
        bankBonus = achievement.reward.amount;
      }
      
      const activity = createActivityLogEntry(
        'achievement_unlocked',
        'Achievement Unlocked',
        achievement ? `Unlocked "${achievement.title}"${bankBonus > 0 ? ` - Earned ${bankBonus}` : ''}` : 'Achievement unlocked',
        { achievementId, amount: bankBonus }
      );

      return {
        ...prev,
        unlockedAchievements: [...prev.unlockedAchievements, achievementId],
        bankBalance: prev.bankBalance + bankBonus,
        activityLog: [...prev.activityLog, activity],
      };
    });
  }, []);

  const checkAchievements = useCallback(() => {
    const state = gameStateRef.current;
    
    ACHIEVEMENTS.forEach(achievement => {
      if (state.unlockedAchievements.includes(achievement.id)) return;

      let unlocked = false;
      const { type, value, comparison } = achievement.requirement;

      switch (type) {
        case 'credit_score':
          const score = state.creditScores.composite;
          unlocked = comparison === 'gte' ? score >= value : score <= value;
          break;
        case 'net_worth':
          unlocked = comparison === 'gte' ? state.totalNetWorth >= value : state.totalNetWorth <= value;
          break;
        case 'income':
          const income = state.currentJob?.currentSalary || 0;
          unlocked = comparison === 'gte' ? income >= value : income <= value;
          break;
        case 'savings':
          unlocked = comparison === 'gte' ? state.emergencyFund >= value : state.emergencyFund <= value;
          break;
        case 'property':
          unlocked = comparison === 'gte' ? state.ownedProperties.length >= value : state.ownedProperties.length <= value;
          break;
        case 'accounts':
          unlocked = comparison === 'gte' ? state.creditAccounts.length >= value : state.creditAccounts.length <= value;
          break;
        case 'streak':
          unlocked = comparison === 'gte' ? state.consecutiveOnTimePayments >= value : state.consecutiveOnTimePayments <= value;
          break;
        case 'debt_free':
          const totalDebt = state.creditAccounts.reduce((sum, acc) => sum + acc.balance, 0);
          unlocked = totalDebt === 0 && state.creditAccounts.length > 0;
          break;
        case 'first_rental':
          unlocked = state.lifestyle.housingType === 'renting' || state.lifestyle.housingType === 'shared_rental';
          break;
        case 'first_vehicle':
          unlocked = state.ownedVehicles.length >= value;
          break;
        case 'first_business':
          unlocked = state.activityLog.some(log => 
            log.type === 'property_purchased' && 
            log.title.toLowerCase().includes('business')
          ) || state.lifestyle.totalPropertyValue > 0;
          break;
        case 'first_house':
          const hasHouse = state.ownedProperties.some(p => 
            p.type === 'single_family' || p.type === 'multi_family' || p.type === 'luxury'
          );
          unlocked = hasHouse;
          break;
      }

      if (unlocked) {
        unlockAchievement(achievement.id);
      }
    });
  }, [unlockAchievement]);

  const advanceMonth = useCallback((): { isBankrupt: boolean } => {
    let bankruptResult = false;
    setGameState(prev => {
      const { newState, report, isBankrupt } = MonthAdvancementService.advanceMonth(prev);
      setLastReport(report);
      bankruptResult = isBankrupt;
      return newState;
    });

    setTimeout(checkAchievements, 100);
    return { isBankrupt: bankruptResult };
  }, [checkAchievements]);

  const triggerRandomEvent = useCallback(() => {
    const shouldTrigger = Math.random() < 0.15;
    if (!shouldTrigger) return null;

    const event = EMERGENCY_EVENTS[Math.floor(Math.random() * EMERGENCY_EVENTS.length)];
    
    setGameState(prev => {
      let newBankBalance = prev.bankBalance - event.cost;
      let newScores = prev.creditScores;

      if (event.creditImpact) {
        newScores = {
          ...prev.creditScores,
          experian: Math.max(300, prev.creditScores.experian + event.creditImpact),
          equifax: Math.max(300, prev.creditScores.equifax + event.creditImpact),
          transunion: Math.max(300, prev.creditScores.transunion + event.creditImpact),
          composite: Math.max(300, prev.creditScores.composite + event.creditImpact),
        };
      }
      
      const activity = createActivityLogEntry(
        'emergency_event',
        event.title,
        `${event.description} - Cost: ${event.cost.toLocaleString()}`,
        { amount: event.cost, eventType: event.category }
      );
      
      let newActivityLog = [...prev.activityLog, activity];
      let newScoreHistory = prev.scoreHistory;
      
      if (event.creditImpact && event.creditImpact !== 0) {
        const scoreActivity = createActivityLogEntry(
          'score_change',
          'Emergency Impact',
          `Credit score ${event.creditImpact > 0 ? 'increased' : 'decreased'} by ${Math.abs(event.creditImpact)} points due to ${event.title}`,
          { previousScore: prev.creditScores.composite, newScore: newScores.composite }
        );
        newActivityLog.push(scoreActivity);
        newScoreHistory = [...newScoreHistory, createScoreHistoryEntry(newScores, `Emergency: ${event.title}`)];
      }

      return {
        ...prev,
        bankBalance: newBankBalance,
        creditScores: newScores,
        lastEventDate: prev.currentDate,
        activityLog: newActivityLog,
        scoreHistory: newScoreHistory,
      };
    });

    return event;
  }, []);

  const creditBreakdown = useMemo(() => {
    return CreditScoreService.getScoreBreakdown(
      gameState.creditAccounts,
      gameState.hardInquiries,
      gameState.currentDate
    );
  }, [gameState.creditAccounts, gameState.hardInquiries, gameState.currentDate]);

  const totalMonthlyExpenses = useMemo(() => {
    return gameState.expenses.reduce((sum, exp) => {
      if (exp.frequency === 'monthly') return sum + exp.amount;
      if (exp.frequency === 'weekly') return sum + (exp.amount * 4);
      if (exp.frequency === 'annual') return sum + (exp.amount / 12);
      return sum;
    }, 0);
  }, [gameState.expenses]);

  const totalDebt = useMemo(() => {
    return CreditScoreService.getTotalDebt(gameState.creditAccounts);
  }, [gameState.creditAccounts]);

  const creditUtilization = useMemo(() => {
    const utilization = CreditScoreService.calculateUtilization(gameState.creditAccounts);
    console.log('[GameContext] Credit utilization calculated:', utilization.toFixed(2) + '%');
    return utilization;
  }, [gameState.creditAccounts]);

  const checkAndProcessLogin = useCallback(() => {
    const now = Date.now();
    const lastLogin = gameStateRef.current.lastLoginDate || now;
    const daysSinceLastLogin = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
    
    console.log('[GameContext] Login check - Days since last login:', daysSinceLastLogin);
    
    if (daysSinceLastLogin === 0) {
      return { daysAbsent: 0, incidents: [] };
    }
    
    const newIncidents: RandomIncident[] = [];
    const incidentProbability = calculateIncidentProbability(daysSinceLastLogin);
    
    console.log('[GameContext] Incident probability:', (incidentProbability * 100).toFixed(1) + '%');
    
    for (let day = 1; day <= daysSinceLastLogin; day++) {
      const roll = Math.random();
      if (roll < incidentProbability) {
        const event = selectRandomIncident(daysSinceLastLogin);
        if (event) {
          const incident: RandomIncident = {
            id: `incident_${now}_${day}_${Math.random().toString(36).substr(2, 9)}`,
            event,
            occurredAt: lastLogin + (day * 24 * 60 * 60 * 1000),
            wasNotified: false,
            severity: getIncidentSeverity(event.cost),
            daysAbsent: daysSinceLastLogin,
          };
          newIncidents.push(incident);
          console.log('[GameContext] Random incident generated:', event.title, 'Severity:', incident.severity);
        }
      }
    }
    
    return { daysAbsent: daysSinceLastLogin, incidents: newIncidents };
  }, []);

  const processLoginIncidents = useCallback(() => {
    const { daysAbsent, incidents } = checkAndProcessLogin();
    
    if (incidents.length === 0 && daysAbsent === 0) {
      setGameState(prev => ({
        ...prev,
        lastLoginDate: Date.now(),
        consecutiveLoginDays: prev.consecutiveLoginDays + 1,
      }));
      return [];
    }
    
    setGameState(prev => {
      const now = Date.now();
      let newBankBalance = prev.bankBalance;
      let newScores = { ...prev.creditScores };
      let newActivityLog = [...prev.activityLog];
      let newScoreHistory = [...prev.scoreHistory];
      let newAlerts = [...prev.alerts];
      
      incidents.forEach(incident => {
        const event = incident.event;
        newBankBalance -= event.cost;
        
        if (event.creditImpact) {
          newScores = {
            experian: Math.max(300, newScores.experian + event.creditImpact),
            equifax: Math.max(300, newScores.equifax + event.creditImpact),
            transunion: Math.max(300, newScores.transunion + event.creditImpact),
            composite: Math.max(300, newScores.composite + event.creditImpact),
          };
        }
        
        const activity = createActivityLogEntry(
          'random_incident',
          `⚠️ ${event.title}`,
          `While you were away: ${event.description} Cost: ${event.cost.toLocaleString()}`,
          { amount: event.cost, eventType: event.category }
        );
        newActivityLog.push(activity);
        
        if (event.creditImpact && event.creditImpact !== 0) {
          newScoreHistory.push(createScoreHistoryEntry(newScores, `Incident: ${event.title}`));
        }
        
        const incidentAlert: Alert = {
          id: `alert_incident_${incident.id}`,
          type: 'random_incident',
          name: event.title,
          enabled: true,
          message: `${event.description} - Cost: ${event.cost.toLocaleString()}`,
          incidentId: incident.id,
          severity: incident.severity,
        };
        newAlerts.push(incidentAlert);
      });
      
      const updatedIncidents = incidents.map(i => ({ ...i, wasNotified: true }));
      
      return {
        ...prev,
        bankBalance: Math.round(newBankBalance * 100) / 100,
        creditScores: newScores,
        activityLog: compressActivityLog(newActivityLog),
        scoreHistory: compressScoreHistory(newScoreHistory),
        alerts: newAlerts,
        pendingIncidents: [...prev.pendingIncidents, ...updatedIncidents],
        lastLoginDate: now,
        consecutiveLoginDays: daysAbsent > 0 ? 1 : prev.consecutiveLoginDays + 1,
        lifetimeSpending: prev.lifetimeSpending + incidents.reduce((sum, i) => sum + i.event.cost, 0),
      };
    });
    
    return incidents;
  }, [checkAndProcessLogin]);

  const dismissIncidentAlert = useCallback((alertId: string) => {
    setGameState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(a => a.id !== alertId),
    }));
  }, []);

  const getActiveIncidentAlerts = useCallback(() => {
    return gameStateRef.current.alerts.filter(a => a.type === 'random_incident');
  }, []);

  const getIncidentHistory = useCallback(() => {
    return gameStateRef.current.pendingIncidents.sort((a, b) => b.occurredAt - a.occurredAt);
  }, []);

  const selectCity = useCallback(async (cityId: string, assignment: SharedRentalAssignment) => {
    const city = getCityById(cityId);
    const apartment = getApartmentById(assignment.apartmentId);
    
    if (!city || !apartment) {
      console.error('[GameContext] Invalid city or apartment assignment');
      return;
    }

    console.log('[GameContext] Selecting city:', city.name, 'Apartment:', apartment.name);

    const sharedRentalInfo: SharedRentalInfo = {
      apartmentId: assignment.apartmentId,
      apartmentNumber: assignment.apartmentNumber,
      unitNumber: assignment.unitNumber,
      roommates: assignment.roommates.map(r => ({
        id: r.id,
        name: r.name,
        age: r.age,
        occupation: r.occupation,
        personality: r.personality,
        avatar: r.avatar,
        rentPaidOnTime: r.rentPaidOnTime,
        cleanliness: r.cleanliness,
        noisiness: r.noisiness,
      } as SharedRentalRoommate)),
      moveInDate: assignment.moveInDate,
      monthlyShare: assignment.monthlyShare,
      securityDeposit: assignment.securityDeposit,
    };

    let newState: GameState | null = null;

    setGameState(prev => {
      const rentExpense: Expense = {
        id: 'exp_shared_rent',
        name: `Shared Rent - ${apartment.name}`,
        amount: assignment.monthlyShare,
        category: 'housing',
        frequency: 'monthly',
        isFixed: true,
      };

      const existingRentIndex = prev.expenses.findIndex(e => e.id === 'exp_rent' || e.id === 'exp_shared_rent');
      let newExpenses = [...prev.expenses];
      if (existingRentIndex >= 0) {
        newExpenses[existingRentIndex] = rentExpense;
      } else {
        newExpenses.push(rentExpense);
      }

      const activity = createActivityLogEntry(
        'property_purchased',
        'Moved to New City',
        `Moved to ${city.name} - Assigned to ${apartment.name} ${assignment.apartmentNumber}`,
        { propertyName: apartment.name, amount: assignment.securityDeposit }
      );

      newState = {
        ...prev,
        citySelectionCompleted: true,
        bankBalance: prev.bankBalance - assignment.securityDeposit,
        expenses: newExpenses,
        lifestyle: {
          ...prev.lifestyle,
          housingType: 'shared_rental',
          housingName: `${apartment.name} ${assignment.apartmentNumber}`,
          cityId: cityId,
          cityName: city.name,
          sharedRental: sharedRentalInfo,
          monthlyRent: assignment.monthlyShare,
        },
        lifetimeSpending: prev.lifetimeSpending + assignment.securityDeposit,
        activityLog: [...prev.activityLog, activity],
      };

      return newState;
    });

    // Immediately save to ensure city selection is persisted
    setTimeout(async () => {
      const currentState = gameStateRef.current;
      if (currentState && currentState.citySelectionCompleted) {
        console.log('[GameContext] Immediately saving city selection state');
        await forceSaveToStorage(currentState);
        await saveToDatabase(currentState);
      }
    }, 100);
  }, [forceSaveToStorage, saveToDatabase]);

  const setHomeResidence = useCallback((propertyId: string, cityId: string, cityName: string) => {
    console.log('[GameContext] Setting home residence:', { propertyId, cityId, cityName });
    
    setGameState(prev => {
      const property = prev.ownedProperties.find(p => p.id === propertyId);
      if (!property) {
        console.error('[GameContext] Property not found for home residence:', propertyId);
        return prev;
      }

      const activity = createActivityLogEntry(
        'profile_updated',
        'Home Residence Set',
        `Set ${property.name} in ${cityName} as your Home Residence`,
        { propertyName: property.name }
      );

      return {
        ...prev,
        lifestyle: {
          ...prev.lifestyle,
          homeResidencePropertyId: propertyId,
          homeResidenceCityId: cityId,
          homeResidenceCityName: cityName,
        },
        activityLog: [...prev.activityLog, activity],
      };
    });

    // Immediately save to ensure home residence is persisted
    setTimeout(async () => {
      const currentState = gameStateRef.current;
      if (currentState) {
        console.log('[GameContext] Immediately saving home residence state');
        await forceSaveToStorage(currentState);
        await saveToDatabase(currentState);
      }
    }, 100);
  }, [forceSaveToStorage, saveToDatabase]);

  useEffect(() => {
    if (!isLoading && initialLoadDoneRef.current) {
      console.log('[GameContext] Running memory cleanup on app launch');
      setGameState(cleanupOldState);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && initialLoadDoneRef.current && !hasProcessedLoginRef.current) {
      const state = gameStateRef.current;
      if (state.lastLoginDate) {
        const now = Date.now();
        const lastLogin = state.lastLoginDate;
        const daysSinceLastLogin = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastLogin > 0) {
          console.log('[GameContext] User returned after', daysSinceLastLogin, 'days - checking for incidents');
          hasProcessedLoginRef.current = true;
          processLoginIncidents();
        }
      }
    }
  }, [isLoading, processLoginIncidents]);

  return {
    gameState,
    isLoading,
    isSyncing,
    lastReport,
    creditBreakdown,
    totalMonthlyExpenses,
    totalDebt,
    creditUtilization,
    tokenWallet: gameState.tokenWallet,
    mintTokens,
    burnTokens,
    syncTokensWithBalance,
    recordBudgetTransaction,
    resetGame,
    updatePlayerName,
    recalculateCreditScores,
    addCreditAccount,
    updateCreditAccount,
    addHardInquiry,
    setCurrentJob,
    updateExpenses,
    addExpense,
    removeExpense,
    updateBalance,
    makePayment,
    addPendingApplication,
    updateApplication,
    removeApplication,
    addProperty,
    addVehicle,
    unlockAchievement,
    checkAchievements,
    advanceMonth,
    triggerRandomEvent,
    updateAvatar,
    purchaseClothing,
    equipClothing,
    togglePublicProfile,
    setProfilePhoto,
    toggleUseCustomPhoto,
    setGameMode,
    updateAlert,
    addAlert,
    removeAlert,
    purchaseFood,
    checkHealthStatus,
    updateExpenseAmount,
    markExpensePaid,
    clearPaidExpensesForNewMonth,
    getCurrentMonthKey,
    rentProperty,
    installSolarPanels,
    purchaseGas,
    consumeFuel,
    processLoginIncidents,
    dismissIncidentAlert,
    getActiveIncidentAlerts,
    getIncidentHistory,
    selectCity,
    setHomeResidence,
    forceSyncToUser,
    immediateSaveWithRetry,
    makePaymentOptimistic,
    updateBalanceOptimistic,
    executeOptimisticAction,
    rollbackToLastState,
    isOptimisticPending,
    lastRollbackError,
  };
});
