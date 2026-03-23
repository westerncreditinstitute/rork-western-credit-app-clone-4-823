import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { BudgetService } from '@/services/BudgetService';
import { BudgetActivityService } from '@/services/BudgetActivityService';
import {
  UserBudget,
  BudgetState,
  BudgetActivityPayload,
  BudgetSettings,
  CustomExpense,
} from '@/types/budget';

const BUDGET_STORAGE_KEY = 'credit_life_budget_state_';
const AUTO_SAVE_INTERVAL = 60000; // 60 seconds - reduced frequency for performance

export const [BudgetProvider, useBudget] = createContextHook(() => {
  const auth = useAuth();
  const userId = auth?.user?.id || 'anonymous';
  const isAuthenticated = !!auth?.user?.id;

  const [budgetState, setBudgetState] = useState<BudgetState>({
    currentBudget: null,
    activityLog: [],
    isLoading: true,
    isSaving: false,
    hasUnsavedChanges: false,
    lastSavedAt: null,
    error: null,
  });

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = `${BUDGET_STORAGE_KEY}${userId}`;

  /**
   * Initialize budget for user
   */
  const initializeBudgetRef = useRef(false);

  const initializeBudget = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      console.log('[BudgetContext] Not authenticated, skipping budget initialization');
      setBudgetState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    if (initializeBudgetRef.current) {
      console.log('[BudgetContext] Budget initialization already in progress, skipping');
      return;
    }

    initializeBudgetRef.current = true;
    console.log('[BudgetContext] Initializing budget for user:', userId);
    setBudgetState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get or create budget from database
      const budget = await BudgetService.getOrCreateBudget(userId);
      
      if (budget) {
        console.log('[BudgetContext] Budget loaded successfully:', budget.id);
        setBudgetState(prev => ({
          ...prev,
          currentBudget: budget,
          isLoading: false,
          lastSavedAt: Date.now(),
          hasUnsavedChanges: false,
        }));

        // Save to local storage for offline access
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify(budget));
        } catch (storageError) {
          console.warn('[BudgetContext] Failed to save to local storage:', storageError);
        }
      } else {
        console.log('[BudgetContext] No budget returned, user may need to create one');
        setBudgetState(prev => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
      }
    } catch (error) {
      console.error('[BudgetContext] Exception in initializeBudget:', error);
      setBudgetState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to initialize budget',
      }));
    } finally {
      initializeBudgetRef.current = false;
    }
  }, [isAuthenticated, userId, storageKey]);

  /**
   * Save budget to database
   */
  const saveBudget = useCallback(async () => {
    if (!budgetState.currentBudget || !isAuthenticated) {
      console.log('[BudgetContext] No budget to save or not authenticated');
      return false;
    }

    setBudgetState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const updatedBudget = await BudgetService.updateBudget({
        budget_id: budgetState.currentBudget.id,
        user_id: userId,
        budget_name: budgetState.currentBudget.budget_name,
        monthly_income: budgetState.currentBudget.monthly_income,
        savings_goal: budgetState.currentBudget.savings_goal,
        budget_categories: budgetState.currentBudget.budget_categories,
        custom_expenses: budgetState.currentBudget.custom_expenses,
        expense_limits: budgetState.currentBudget.expense_limits,
        budget_settings: budgetState.currentBudget.budget_settings,
      });

      if (updatedBudget) {
        console.log('[BudgetContext] Budget saved successfully:', updatedBudget.id);
        setBudgetState(prev => ({
          ...prev,
          currentBudget: updatedBudget,
          isSaving: false,
          hasUnsavedChanges: false,
          lastSavedAt: Date.now(),
        }));

        // Update local storage
        await AsyncStorage.setItem(storageKey, JSON.stringify(updatedBudget));
        return true;
      } else {
        throw new Error('Failed to save budget to database');
      }
    } catch (error) {
      console.error('[BudgetContext] Exception in saveBudget:', error);
      setBudgetState(prev => ({
        ...prev,
        isSaving: false,
        error: 'Failed to save budget',
      }));
      return false;
    }
  }, [budgetState.currentBudget, isAuthenticated, userId, storageKey]);

  /**
   * Log budget activity
   */
  const logActivity = useCallback(async (payload: BudgetActivityPayload) => {
    if (!isAuthenticated) return;

    try {
      const activity = await BudgetActivityService.logActivity(userId, payload);
      if (activity) {
        console.log('[BudgetContext] Activity logged:', activity.activity_type);
        setBudgetState(prev => ({
          ...prev,
          activityLog: [activity, ...prev.activityLog].slice(0, 100), // Keep last 100
        }));
      }
    } catch (error) {
      console.error('[BudgetContext] Exception in logActivity:', error);
    }
  }, [isAuthenticated, userId]);

  /**
   * Update budget field with activity logging
   */
  const updateBudgetField = useCallback(async (
    field: keyof UserBudget,
    value: any,
    logActivityDetails: boolean = true
  ) => {
    if (!budgetState.currentBudget) return;

    const oldValue = budgetState.currentBudget[field];
    const newValue = value;

    setBudgetState(prev => ({
      ...prev,
      currentBudget: prev.currentBudget ? {
        ...prev.currentBudget,
        [field]: newValue,
      } : null,
      hasUnsavedChanges: true,
    }));

    // Log activity if requested
    if (logActivityDetails && oldValue !== newValue) {
      await logActivity({
        budget_id: budgetState.currentBudget.id,
        activity_type: 'settings_updated',
        activity_details: { field, changed: true },
        old_value: { [field]: oldValue },
        new_value: { [field]: newValue },
      });
    }

    // Trigger auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      console.log('[BudgetContext] Auto-save triggered');
      saveBudget();
    }, AUTO_SAVE_INTERVAL);
  }, [budgetState.currentBudget, logActivity, saveBudget]);

  /**
   * Set budget name
   */
  const setBudgetName = useCallback(async (name: string) => {
    if (budgetState.currentBudget) {
      await updateBudgetField('budget_name', name);
      await logActivity({
        budget_id: budgetState.currentBudget.id,
        activity_type: 'settings_updated',
        activity_details: { action: 'rename_budget' },
        old_value: { budget_name: budgetState.currentBudget.budget_name },
        new_value: { budget_name: name },
      });
    }
  }, [budgetState.currentBudget, updateBudgetField, logActivity]);

  /**
   * Set monthly income
   */
  const setMonthlyIncome = useCallback(async (income: number) => {
    if (budgetState.currentBudget) {
      await updateBudgetField('monthly_income', income);
      await logActivity({
        budget_id: budgetState.currentBudget.id,
        activity_type: 'income_updated',
        activity_details: { action: 'update_income' },
        old_value: { monthly_income: budgetState.currentBudget.monthly_income },
        new_value: { monthly_income: income },
      });
    }
  }, [budgetState.currentBudget, updateBudgetField, logActivity]);

  /**
   * Set savings goal
   */
  const setSavingsGoal = useCallback(async (goal: number) => {
    if (budgetState.currentBudget) {
      await updateBudgetField('savings_goal', goal);
      await logActivity({
        budget_id: budgetState.currentBudget.id,
        activity_type: 'goal_updated',
        activity_details: { action: 'update_goal' },
        old_value: { savings_goal: budgetState.currentBudget.savings_goal },
        new_value: { savings_goal: goal },
      });
    }
  }, [budgetState.currentBudget, updateBudgetField, logActivity]);

  /**
   * Add custom expense
   */
  const addCustomExpense = useCallback(async (expense: CustomExpense) => {
    if (!budgetState.currentBudget) return;

    const newExpenses = [...budgetState.currentBudget.custom_expenses, expense];
    await updateBudgetField('custom_expenses', newExpenses, false);
    
    await logActivity({
      budget_id: budgetState.currentBudget.id,
      activity_type: 'expense_added',
      activity_details: { expense_id: expense.id, expense_name: expense.name },
      new_value: { expense },
    });
  }, [budgetState.currentBudget, updateBudgetField, logActivity]);

  /**
   * Remove custom expense
   */
  const removeCustomExpense = useCallback(async (expenseId: string) => {
    if (!budgetState.currentBudget) return;

    const expenseToRemove = budgetState.currentBudget.custom_expenses.find(e => e.id === expenseId);
    const newExpenses = budgetState.currentBudget.custom_expenses.filter(e => e.id !== expenseId);
    
    await updateBudgetField('custom_expenses', newExpenses, false);
    
    await logActivity({
      budget_id: budgetState.currentBudget.id,
      activity_type: 'expense_removed',
      activity_details: { expense_id: expenseId, expense_name: expenseToRemove?.name },
      old_value: { expense: expenseToRemove },
    });
  }, [budgetState.currentBudget, updateBudgetField, logActivity]);

  /**
   * Update expense limit
   */
  const updateExpenseLimit = useCallback(async (category: string, limit: number) => {
    if (!budgetState.currentBudget) return;

    const newLimits = {
      ...budgetState.currentBudget.expense_limits,
      [category]: limit,
    };
    
    await updateBudgetField('expense_limits', newLimits, false);
    
    await logActivity({
      budget_id: budgetState.currentBudget.id,
      activity_type: 'limit_changed',
      activity_details: { category, new_limit: limit },
      old_value: { [category]: budgetState.currentBudget.expense_limits[category] },
      new_value: { [category]: limit },
    });
  }, [budgetState.currentBudget, updateBudgetField, logActivity]);

  /**
   * Update budget settings
   */
  const updateSettings = useCallback(async (settings: Partial<BudgetSettings>) => {
    if (!budgetState.currentBudget) return;

    const newSettings = {
      ...budgetState.currentBudget.budget_settings,
      ...settings,
    };
    
    await updateBudgetField('budget_settings', newSettings, true);
  }, [budgetState.currentBudget, updateBudgetField]);

  /**
   * Load activity log
   */
  const loadActivityLog = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const activities = await BudgetActivityService.getActivityLog(userId, 50);
      setBudgetState(prev => ({
        ...prev,
        activityLog: activities,
      }));
    } catch (error) {
      console.error('[BudgetContext] Exception in loadActivityLog:', error);
    }
  }, [isAuthenticated, userId]);

  /**
   * Cleanup on logout
   */
  const cleanup = useCallback(() => {
    // Clear auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // Reset state
    setBudgetState({
      currentBudget: null,
      activityLog: [],
      isLoading: false,
      isSaving: false,
      hasUnsavedChanges: false,
      lastSavedAt: null,
      error: null,
    });
  }, []);

  // Initialize budget on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && userId) {
      initializeBudget();
      loadActivityLog();
    } else {
      cleanup();
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId]);

  // Auto-save on app state change (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' && budgetState.hasUnsavedChanges) {
        console.log('[BudgetContext] App going to background, saving budget');
        saveBudget();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [budgetState.hasUnsavedChanges, saveBudget]);

  // Auto-save on visibility change (web)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && budgetState.hasUnsavedChanges) {
        console.log('[BudgetContext] Page hidden, saving budget');
        saveBudget();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [budgetState.hasUnsavedChanges, saveBudget]);

  return {
    ...budgetState,
    saveBudget,
    updateBudgetField,
    setBudgetName,
    setMonthlyIncome,
    setSavingsGoal,
    addCustomExpense,
    removeCustomExpense,
    updateExpenseLimit,
    updateSettings,
    logActivity,
    loadActivityLog,
    cleanup,
  };
});