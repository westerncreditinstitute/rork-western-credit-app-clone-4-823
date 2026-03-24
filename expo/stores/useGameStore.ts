import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameState,
  CreditAccount,
  CreditScores,
  HardInquiry,
  PlayerJob,
  Expense,
  OwnedVehicle,
  PlayerAvatar,
  OwnedClothing,
  ClothingItem,
  ClothingCategory,
  LifestyleStats,
  FoodItem,
  ActivityLogEntry,
  ActivityType,
  PaidExpenseRecord,
  GameMode,
} from '@/types/game';
import { creditScoreDomain, realEstateDomain } from '@/domains';
import type { CreditAccountCreationParams, PaymentParams } from '@/domains/CreditScoreDomain';
import type { PropertyPurchaseParams, RentalParams } from '@/domains/RealEstateDomain';
import { SharedRentalAssignment } from '@/mocks/cityData';
import { gameRepository, OptimisticOperationResult } from '@/repositories/GameRepository';

export type OptimisticAction<T = void> = {
  execute: () => T;
  rollback: () => void;
};

export interface OptimisticState {
  pendingOperations: Map<string, { previousState: GameState; timestamp: number }>;
  isRollingBack: boolean;
}

interface GameActions {
  updateCreditScores: (scores: CreditScores) => void;
  addCreditAccount: (params: CreditAccountCreationParams) => void;
  updateCreditAccount: (accountId: string, updates: Partial<CreditAccount>) => void;
  makePayment: (params: PaymentParams) => void;
  addHardInquiry: (inquiry: Omit<HardInquiry, 'id'>) => void;
  
  addProperty: (params: PropertyPurchaseParams) => { success: boolean; error?: string };
  rentProperty: (params: RentalParams) => void;
  selectSharedRental: (cityId: string, assignment: SharedRentalAssignment) => void;
  installSolarPanels: (propertyId: string) => void;
  sellProperty: (propertyId: string) => void;
  
  setCurrentJob: (job: PlayerJob | undefined) => void;
  updateBalance: (amount: number, type: 'bank' | 'savings' | 'emergency' | 'investments') => void;
  updateExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  removeExpense: (expenseId: string) => void;
  
  addVehicle: (vehicle: OwnedVehicle) => void;
  purchaseGas: (vehicleId: string, gallons: number, pricePerGallon?: number) => void;
  
  updatePlayerName: (name: string) => void;
  updateAvatar: (updates: Partial<PlayerAvatar>) => void;
  setProfilePhoto: (photoUrl: string | undefined) => void;
  setGameMode: (mode: GameMode) => void;
  
  purchaseClothing: (item: ClothingItem) => void;
  equipClothing: (itemId: string, category: ClothingCategory) => void;
  
  purchaseFood: (item: FoodItem) => void;
  
  markExpensePaid: (expenseId: string, method: string) => void;
  clearPaidExpensesForNewMonth: (newMonthKey: string) => void;
  
  advanceMonth: () => void;
  recalculateScores: () => void;
  resetGame: () => void;
  
  setGameState: (state: Partial<GameState>) => void;
  hydrateFromContext: (state: GameState) => void;
  
  makePaymentOptimistic: (
    params: PaymentParams,
    syncToServer: (state: GameState) => Promise<void>
  ) => Promise<OptimisticOperationResult<GameState>>;
  updateBalanceOptimistic: (
    amount: number,
    type: 'bank' | 'savings' | 'emergency' | 'investments',
    syncToServer: (state: GameState) => Promise<void>
  ) => Promise<OptimisticOperationResult<GameState>>;
  executeOptimistic: <T>(
    operationId: string,
    operationType: string,
    payload: T,
    applyUpdate: (state: GameState, payload: T) => GameState,
    syncToServer: (state: GameState) => Promise<void>
  ) => Promise<OptimisticOperationResult<GameState>>;
  rollbackToState: (state: GameState) => void;
  getPreviousState: () => GameState;
}

interface GameStore extends GameActions {
  gameState: GameState;
  isHydrated: boolean;
  previousState: GameState | null;
  pendingOperationIds: string[];
  isRollingBack: boolean;
}

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

const createInitialGameState = (): GameState => {
  const now = Date.now();
  const playerId = `player_${now}`;
  
  return {
    playerId,
    playerName: 'New Player',
    avatar: {
      skinTone: '#E0AC69',
      hairStyle: 'short',
      hairColor: '#2C1810',
      eyeColor: '#634E34',
      outfit: {
        top: null,
        bottom: null,
        shoes: null,
        hat: null,
        jewelry: null,
        watch: null,
        bag: null,
        eyewear: null,
      },
    },
    useCustomPhoto: false,
    gameMode: 'simulation',
    alerts: [],
    healthStatus: {
      level: 100,
      lastFoodPurchaseMonth: 0,
      isHospitalized: false,
      hospitalDebt: 0,
    },
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
    expenses: [],
    bankBalance: 5000,
    savingsBalance: 0,
    emergencyFund: 0,
    investments: 0,
    ownedProperties: [],
    ownedVehicles: [],
    ownedClothing: [],
    pendingApplications: [],
    achievements: [],
    unlockedAchievements: [],
    totalNetWorth: 5000,
    monthsPlayed: 0,
    consecutiveOnTimePayments: 0,
    lifetimeEarnings: 0,
    lifetimeSpending: 0,
    tutorialCompleted: false,
    lastEventDate: now,
    lifestyle: {
      housingType: 'homeless',
      housingName: '',
      vehicleType: 'none',
      vehicleName: '',
      fashionStyle: 'basic',
      totalClothingValue: 0,
      totalPropertyValue: 0,
      totalVehicleValue: 0,
    },
    isPublicProfile: true,
    activityLog: [],
    scoreHistory: [],
    lastLoginDate: now,
    consecutiveLoginDays: 1,
    pendingIncidents: [],
    tokenWallet: {
      address: `0x${playerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40).padEnd(40, '0')}`,
      musoToken: {
        balance: 5000,
        totalMinted: 5000,
        totalBurned: 0,
        lastUpdated: now,
      },
      transactions: [],
      createdAt: now,
    },
    citySelectionCompleted: false,
    paidExpenses: {},
    lastUpdated: now,
  };
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameState: createInitialGameState(),
      isHydrated: false,
      previousState: null,
      pendingOperationIds: [],
      isRollingBack: false,

      updateCreditScores: (scores) => set((state) => ({
        gameState: {
          ...state.gameState,
          creditScores: scores,
          lastUpdated: Date.now(),
        },
      })),

      addCreditAccount: (params) => set((state) => {
        const newState = creditScoreDomain.addAccount(params, state.gameState);
        console.log('[GameStore] Added credit account:', params.institutionName);
        return { gameState: newState };
      }),

      updateCreditAccount: (accountId, updates) => set((state) => {
        const newState = creditScoreDomain.updateAccount(accountId, updates, state.gameState);
        return { gameState: newState };
      }),

      makePayment: (params) => set((state) => {
        const newState = creditScoreDomain.makePayment(params, state.gameState);
        console.log('[GameStore] Payment made:', params.amount);
        return { gameState: newState };
      }),

      addHardInquiry: (inquiry) => set((state) => {
        const newState = creditScoreDomain.addInquiry(inquiry, state.gameState);
        return { gameState: newState };
      }),

      addProperty: (params) => {
        const { gameState } = get();
        const result = realEstateDomain.purchaseProperty(params, gameState);
        
        if (result.success && result.newState) {
          set({ gameState: result.newState });
          console.log('[GameStore] Property purchased:', params.property.name);
        }
        
        return { success: result.success, error: result.error };
      },

      rentProperty: (params) => set((state) => {
        const newState = realEstateDomain.rentProperty(params, state.gameState);
        console.log('[GameStore] Property rented:', params.propertyName);
        return { gameState: newState };
      }),

      selectSharedRental: (cityId, assignment) => set((state) => {
        const newState = realEstateDomain.selectSharedRental(cityId, assignment, state.gameState);
        console.log('[GameStore] Shared rental selected:', cityId);
        return { gameState: newState };
      }),

      installSolarPanels: (propertyId) => set((state) => {
        const newState = realEstateDomain.installSolarPanels(propertyId, state.gameState);
        return { gameState: newState };
      }),

      sellProperty: (propertyId) => set((state) => {
        const newState = realEstateDomain.sellProperty(propertyId, state.gameState);
        console.log('[GameStore] Property sold:', propertyId);
        return { gameState: newState };
      }),

      setCurrentJob: (job) => set((state) => {
        const monthlyIncome = job ? Math.round(job.currentSalary / 12) : 0;
        const activity = job ? createActivityLogEntry(
          'job_change',
          'Career Update',
          `Started as ${job.job.title} at ${job.job.company}`,
          { jobTitle: job.job.title, amount: job.currentSalary }
        ) : null;

        return {
          gameState: {
            ...state.gameState,
            currentJob: job,
            monthlyIncome,
            jobHistory: job && state.gameState.currentJob
              ? [...state.gameState.jobHistory, state.gameState.currentJob]
              : state.gameState.jobHistory,
            activityLog: activity
              ? [...state.gameState.activityLog, activity]
              : state.gameState.activityLog,
            lastUpdated: Date.now(),
          },
        };
      }),

      updateBalance: (amount, type) => set((state) => {
        const key = type === 'bank' ? 'bankBalance'
          : type === 'savings' ? 'savingsBalance'
          : type === 'emergency' ? 'emergencyFund'
          : 'investments';

        return {
          gameState: {
            ...state.gameState,
            [key]: state.gameState[key] + amount,
            lastUpdated: Date.now(),
          },
        };
      }),

      updateExpenses: (expenses) => set((state) => ({
        gameState: {
          ...state.gameState,
          expenses,
          lastUpdated: Date.now(),
        },
      })),

      addExpense: (expense) => set((state) => ({
        gameState: {
          ...state.gameState,
          expenses: [...state.gameState.expenses, expense],
          lastUpdated: Date.now(),
        },
      })),

      removeExpense: (expenseId) => set((state) => ({
        gameState: {
          ...state.gameState,
          expenses: state.gameState.expenses.filter(e => e.id !== expenseId),
          lastUpdated: Date.now(),
        },
      })),

      addVehicle: (vehicle) => set((state) => {
        const newVehicles = [...state.gameState.ownedVehicles, vehicle];
        const totalVehicleValue = newVehicles.reduce((sum, v) => sum + v.currentValue, 0);

        const activity = createActivityLogEntry(
          'vehicle_purchased',
          'Vehicle Purchased',
          `Bought ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          { vehicleName: `${vehicle.make} ${vehicle.model}`, amount: vehicle.purchasePrice }
        );

        return {
          gameState: {
            ...state.gameState,
            ownedVehicles: newVehicles,
            lifestyle: {
              ...state.gameState.lifestyle,
              vehicleType: vehicle.loanId ? 'financed' : 'owned',
              vehicleName: `${vehicle.make} ${vehicle.model}`,
              totalVehicleValue,
            },
            activityLog: [...state.gameState.activityLog, activity],
            lastUpdated: Date.now(),
          },
        };
      }),

      purchaseGas: (vehicleId, gallons, pricePerGallon = 3.50) => set((state) => {
        const vehicle = state.gameState.ownedVehicles.find(v => v.id === vehicleId);
        if (!vehicle || vehicle.fuelType !== 'gas') return state;

        const totalCost = gallons * pricePerGallon;
        if (state.gameState.bankBalance < totalCost) return state;

        const tankCapacity = vehicle.tankCapacity || 12;
        const currentGallons = (vehicle.fuelLevel / 100) * tankCapacity;
        const newGallons = Math.min(currentGallons + gallons, tankCapacity);
        const newFuelLevel = (newGallons / tankCapacity) * 100;

        const newVehicles = state.gameState.ownedVehicles.map(v =>
          v.id === vehicleId
            ? { ...v, fuelLevel: newFuelLevel, milesUntilEmpty: newGallons * v.mpg }
            : v
        );

        return {
          gameState: {
            ...state.gameState,
            bankBalance: state.gameState.bankBalance - totalCost,
            ownedVehicles: newVehicles,
            lifetimeSpending: state.gameState.lifetimeSpending + totalCost,
            lastUpdated: Date.now(),
          },
        };
      }),

      updatePlayerName: (name) => set((state) => {
        const activity = createActivityLogEntry(
          'profile_updated',
          'Profile Updated',
          `Changed name to "${name}"`,
          { itemName: name }
        );

        return {
          gameState: {
            ...state.gameState,
            playerName: name,
            activityLog: [...state.gameState.activityLog, activity],
            lastUpdated: Date.now(),
          },
        };
      }),

      updateAvatar: (updates) => set((state) => ({
        gameState: {
          ...state.gameState,
          avatar: { ...state.gameState.avatar, ...updates },
          lastUpdated: Date.now(),
        },
      })),

      setProfilePhoto: (photoUrl) => set((state) => ({
        gameState: {
          ...state.gameState,
          profilePhotoUrl: photoUrl,
          useCustomPhoto: !!photoUrl,
          lastUpdated: Date.now(),
        },
      })),

      setGameMode: (mode) => set((state) => ({
        gameState: {
          ...state.gameState,
          gameMode: mode,
          lastUpdated: Date.now(),
        },
      })),

      purchaseClothing: (item) => set((state) => {
        if (state.gameState.bankBalance < item.price) return state;

        const ownedItem: OwnedClothing = {
          ...item,
          purchaseDate: state.gameState.currentDate,
          isEquipped: false,
        };

        const newClothing = [...state.gameState.ownedClothing, ownedItem];
        const totalClothingValue = newClothing.reduce((sum, c) => sum + c.price, 0);

        let fashionStyle: LifestyleStats['fashionStyle'] = 'basic';
        if (totalClothingValue >= 10000) fashionStyle = 'elite';
        else if (totalClothingValue >= 5000) fashionStyle = 'luxury';
        else if (totalClothingValue >= 2000) fashionStyle = 'business';
        else if (totalClothingValue >= 500) fashionStyle = 'casual';

        const activity = createActivityLogEntry(
          'clothing_purchased',
          'Clothing Purchased',
          `Bought ${item.name} from ${item.brand}`,
          { itemName: item.name, amount: item.price }
        );

        return {
          gameState: {
            ...state.gameState,
            bankBalance: state.gameState.bankBalance - item.price,
            ownedClothing: newClothing,
            lifetimeSpending: state.gameState.lifetimeSpending + item.price,
            lifestyle: {
              ...state.gameState.lifestyle,
              fashionStyle,
              totalClothingValue,
            },
            activityLog: [...state.gameState.activityLog, activity],
            lastUpdated: Date.now(),
          },
        };
      }),

      equipClothing: (itemId, category) => set((state) => {
        const item = state.gameState.ownedClothing.find(c => c.id === itemId);
        if (!item) return state;

        const validCategories: ClothingCategory[] = ['top', 'bottom', 'shoes', 'hat', 'jewelry', 'watch', 'bag', 'eyewear'];
        if (!validCategories.includes(category)) return state;

        const newClothing = state.gameState.ownedClothing.map(c => ({
          ...c,
          isEquipped: c.id === itemId ? true : (c.category === category ? false : c.isEquipped),
        }));

        return {
          gameState: {
            ...state.gameState,
            ownedClothing: newClothing,
            avatar: {
              ...state.gameState.avatar,
              outfit: {
                ...state.gameState.avatar.outfit,
                [category]: item,
              },
            },
            lastUpdated: Date.now(),
          },
        };
      }),

      purchaseFood: (item) => set((state) => {
        if (state.gameState.bankBalance < item.price) return state;

        const newHealth = Math.min(100, state.gameState.healthStatus.level + item.healthImpact + 20);

        return {
          gameState: {
            ...state.gameState,
            bankBalance: state.gameState.bankBalance - item.price,
            lifetimeSpending: state.gameState.lifetimeSpending + item.price,
            healthStatus: {
              ...state.gameState.healthStatus,
              level: newHealth,
              lastFoodPurchaseMonth: state.gameState.monthsPlayed,
              isHospitalized: false,
            },
            lastUpdated: Date.now(),
          },
        };
      }),

      markExpensePaid: (expenseId, method) => set((state) => {
        const d = new Date(state.gameState.currentDate);
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`;

        return {
          gameState: {
            ...state.gameState,
            paidExpenses: {
              ...state.gameState.paidExpenses,
              [expenseId]: {
                paidAt: Date.now(),
                method,
                monthKey,
              },
            },
            lastUpdated: Date.now(),
          },
        };
      }),

      clearPaidExpensesForNewMonth: (newMonthKey) => set((state) => {
        const updatedPaidExpenses: Record<string, PaidExpenseRecord> = {};
        Object.entries(state.gameState.paidExpenses).forEach(([expenseId, record]) => {
          if (record.monthKey === newMonthKey) {
            updatedPaidExpenses[expenseId] = record;
          }
        });

        return {
          gameState: {
            ...state.gameState,
            paidExpenses: updatedPaidExpenses,
            lastUpdated: Date.now(),
          },
        };
      }),

      advanceMonth: () => set((state) => {
        const prev = state.gameState;
        const newDate = prev.currentDate + (30 * 24 * 60 * 60 * 1000);
        
        const monthlyExpenses = prev.expenses.reduce((sum, exp) => {
          if (exp.frequency === 'monthly') return sum + exp.amount;
          if (exp.frequency === 'weekly') return sum + (exp.amount * 4);
          if (exp.frequency === 'annual') return sum + (exp.amount / 12);
          return sum;
        }, 0);

        const netIncome = prev.monthlyIncome - monthlyExpenses;
        let newBankBalance = prev.bankBalance + netIncome;

        const newAccounts = creditScoreDomain.applyMonthlyInterest(prev).creditAccounts;
        const newScores = creditScoreDomain.calculateScore(newAccounts, prev.hardInquiries, newDate);

        const propertyValue = realEstateDomain.calculatePropertyValue(prev.ownedProperties);
        const vehicleValue = prev.ownedVehicles.reduce((sum, v) => sum + v.currentValue, 0);
        const totalDebt = creditScoreDomain.getTotalDebt(newAccounts);
        const totalAssets = newBankBalance + prev.savingsBalance + prev.emergencyFund + prev.investments + propertyValue + vehicleValue;
        const newNetWorth = totalAssets - totalDebt;

        const BANKRUPTCY_THRESHOLD = -150000;
        if (newNetWorth <= BANKRUPTCY_THRESHOLD) {
          console.log('[GameStore] BANKRUPTCY TRIGGERED - Net worth:', newNetWorth);
        }

        const activity = createActivityLogEntry(
          'month_advanced',
          'Month Advanced',
          `Advanced to month ${prev.monthsPlayed + 1}`,
          { amount: netIncome }
        );

        const d = new Date(newDate);
        const newMonthKey = `${d.getFullYear()}-${d.getMonth()}`;
        const updatedPaidExpenses: Record<string, PaidExpenseRecord> = {};
        Object.entries(prev.paidExpenses).forEach(([expenseId, record]) => {
          if (record.monthKey === newMonthKey) {
            updatedPaidExpenses[expenseId] = record;
          }
        });

        return {
          gameState: {
            ...prev,
            currentDate: newDate,
            creditAccounts: newAccounts,
            creditScores: newScores,
            bankBalance: Math.round(newBankBalance * 100) / 100,
            totalNetWorth: Math.round(newNetWorth * 100) / 100,
            monthsPlayed: prev.monthsPlayed + 1,
            lifetimeEarnings: prev.lifetimeEarnings + prev.monthlyIncome,
            lifetimeSpending: prev.lifetimeSpending + monthlyExpenses,
            activityLog: [...prev.activityLog, activity],
            paidExpenses: updatedPaidExpenses,
            lastUpdated: Date.now(),
          },
        };
      }),

      recalculateScores: () => set((state) => {
        const newState = creditScoreDomain.recalculateScores(state.gameState);
        return { gameState: newState };
      }),

      resetGame: () => set({
        gameState: createInitialGameState(),
      }),

      setGameState: (partialState) => set((state) => ({
        gameState: {
          ...state.gameState,
          ...partialState,
          lastUpdated: Date.now(),
        },
      })),

      hydrateFromContext: (contextState) => set({
        gameState: contextState,
        isHydrated: true,
      }),

      makePaymentOptimistic: async (params, syncToServer) => {
        const { gameState } = get();
        const previousState = { ...gameState };
        
        set({ previousState, isRollingBack: false });
        
        const applyPayment = (state: GameState): GameState => {
          return creditScoreDomain.makePayment(params, state);
        };
        
        const result = await gameRepository.executeOptimisticUpdate(
          `payment_${params.accountId}`,
          'make_payment',
          params,
          gameState,
          applyPayment,
          syncToServer
        );
        
        if (result.success && result.data) {
          set({ gameState: result.data });
        } else {
          set({ gameState: previousState, isRollingBack: true });
          setTimeout(() => set({ isRollingBack: false }), 100);
        }
        
        return result;
      },

      updateBalanceOptimistic: async (amount, type, syncToServer) => {
        const { gameState } = get();
        const previousState = { ...gameState };
        
        set({ previousState, isRollingBack: false });
        
        const applyBalanceUpdate = (state: GameState): GameState => {
          const key = type === 'bank' ? 'bankBalance'
            : type === 'savings' ? 'savingsBalance'
            : type === 'emergency' ? 'emergencyFund'
            : 'investments';
          
          return {
            ...state,
            [key]: state[key] + amount,
            lastUpdated: Date.now(),
          };
        };
        
        const result = await gameRepository.executeOptimisticUpdate(
          `balance_${type}`,
          'update_balance',
          { amount, type },
          gameState,
          applyBalanceUpdate,
          syncToServer
        );
        
        if (result.success && result.data) {
          set({ gameState: result.data });
        } else {
          set({ gameState: previousState, isRollingBack: true });
          setTimeout(() => set({ isRollingBack: false }), 100);
        }
        
        return result;
      },

      executeOptimistic: async <T>(operationId: string, operationType: string, payload: T, applyUpdate: (state: GameState, payload: T) => GameState, syncToServer: (state: GameState) => Promise<void>) => {
        const { gameState, pendingOperationIds } = get();
        const previousState = { ...gameState };
        
        set({ 
          previousState, 
          isRollingBack: false,
          pendingOperationIds: [...pendingOperationIds, operationId],
        });
        
        const result = await gameRepository.executeOptimisticUpdate(
          operationId,
          operationType,
          payload,
          gameState,
          applyUpdate,
          syncToServer
        );
        
        const newPendingIds = get().pendingOperationIds.filter(id => id !== operationId);
        
        if (result.success && result.data) {
          set({ 
            gameState: result.data,
            pendingOperationIds: newPendingIds,
          });
        } else {
          set({ 
            gameState: previousState, 
            isRollingBack: true,
            pendingOperationIds: newPendingIds,
          });
          setTimeout(() => set({ isRollingBack: false }), 100);
        }
        
        return result;
      },

      rollbackToState: (state) => {
        console.log('[GameStore] Rolling back to previous state');
        set({ 
          gameState: state, 
          isRollingBack: true,
          pendingOperationIds: [],
        });
        setTimeout(() => set({ isRollingBack: false }), 100);
      },

      getPreviousState: () => {
        const { previousState, gameState } = get();
        return previousState || gameState;
      },
    }),
    {
      name: 'game-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        gameState: {
          ...state.gameState,
          activityLog: state.gameState.activityLog.slice(-100),
          scoreHistory: state.gameState.scoreHistory.slice(-50),
        },
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          console.log('[GameStore] Rehydrated from storage');
        }
      },
    }
  )
);

export const useGameState = () => useGameStore((state) => state.gameState);
export const useCreditScores = () => useGameStore((state) => state.gameState.creditScores);
export const useCreditAccounts = () => useGameStore((state) => state.gameState.creditAccounts);
export const useOwnedProperties = () => useGameStore((state) => state.gameState.ownedProperties);
export const useOwnedVehicles = () => useGameStore((state) => state.gameState.ownedVehicles);
export const useBankBalance = () => useGameStore((state) => state.gameState.bankBalance);
export const useCurrentJob = () => useGameStore((state) => state.gameState.currentJob);
export const useLifestyle = () => useGameStore((state) => state.gameState.lifestyle);

export const useCreditUtilization = () => {
  const accounts = useGameStore((state) => state.gameState.creditAccounts);
  return creditScoreDomain.calculateUtilization(accounts);
};

export const useTotalDebt = () => {
  const accounts = useGameStore((state) => state.gameState.creditAccounts);
  return creditScoreDomain.getTotalDebt(accounts);
};

export const useTotalPropertyValue = () => {
  const properties = useGameStore((state) => state.gameState.ownedProperties);
  return realEstateDomain.calculatePropertyValue(properties);
};

export const useTotalEquity = () => {
  const properties = useGameStore((state) => state.gameState.ownedProperties);
  return realEstateDomain.calculateTotalEquity(properties);
};
