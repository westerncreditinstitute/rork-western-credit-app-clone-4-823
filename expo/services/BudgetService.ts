import { supabase } from '@/lib/supabase';
import {
  UserBudget,
  CreateBudgetInput,
  UpdateBudgetInput,
} from '@/types/budget';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

function isDemoUser(userId: string): boolean {
  return userId.startsWith('demo-') || !isValidUUID(userId);
}

function createLocalBudget(userId: string): UserBudget {
  return {
    id: `local-budget-${userId}`,
    user_id: userId,
    budget_name: 'My Budget',
    monthly_income: 0,
    savings_goal: 0,
    budget_categories: {},
    custom_expenses: [],
    expense_limits: {},
    budget_settings: {
      autoSave: true,
      saveInterval: 30,
      notifications: true,
      showWarnings: true,
      warningThreshold: 80,
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export class BudgetService {
  /**
   * Get user's active budget
   */
  static async getUserBudget(userId: string): Promise<UserBudget | null> {
    try {
      if (isDemoUser(userId)) {
        console.log('[BudgetService] Demo user detected, skipping database fetch');
        return null;
      }

      const { data, error } = await supabase
        .from('user_budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[BudgetService] Error fetching user budget:', error.message || JSON.stringify(error));
        return null;
      }

      return data as UserBudget | null;
    } catch (error) {
      console.error('[BudgetService] Exception in getUserBudget:', error);
      return null;
    }
  }

  /**
   * Create a new budget for user
   */
  static async createBudget(input: CreateBudgetInput): Promise<UserBudget | null> {
    try {
      if (isDemoUser(input.user_id)) {
        console.log('[BudgetService] Demo user detected, returning local budget');
        return createLocalBudget(input.user_id);
      }

      // First check if user already has an active budget
      const existingBudget = await this.getUserBudget(input.user_id);
      if (existingBudget) {
        console.log('[BudgetService] User already has an active budget, returning existing');
        return existingBudget;
      }

      const { data, error } = await supabase
        .from('user_budgets')
        .insert({
          user_id: input.user_id,
          budget_name: input.budget_name || 'My Budget',
          monthly_income: input.monthly_income || 0,
          savings_goal: input.savings_goal || 0,
          budget_categories: input.budget_categories || {},
          custom_expenses: input.custom_expenses || [],
          expense_limits: input.expense_limits || {},
          budget_settings: input.budget_settings || {
            autoSave: true,
            saveInterval: 30,
            notifications: true,
            showWarnings: true,
            warningThreshold: 80,
          },
          is_active: true,
        })
        .select()
        .maybeSingle();

      if (error) {
        // Handle duplicate key constraint - budget was created by another concurrent request
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
          console.log('[BudgetService] Budget already exists (race condition), fetching existing budget');
          const existingBudget = await this.getUserBudget(input.user_id);
          if (existingBudget) {
            return existingBudget;
          }
        }
        // If RLS error, try to return local budget as fallback
        if (error.message?.includes('row-level security') || error.code === '42501') {
          console.warn('[BudgetService] RLS policy error, returning local budget as fallback');
          return createLocalBudget(input.user_id);
        }
        console.error('[BudgetService] Error creating budget:', error.message || JSON.stringify(error));
        return null;
      }

      if (!data) {
        console.warn('[BudgetService] No data returned after insert, returning local budget');
        return createLocalBudget(input.user_id);
      }

      console.log('[BudgetService] Budget created successfully:', data.id);
      return data as UserBudget;
    } catch (error) {
      console.error('[BudgetService] Exception in createBudget:', error);
      return null;
    }
  }

  /**
   * Update an existing budget
   */
  static async updateBudget(input: UpdateBudgetInput): Promise<UserBudget | null> {
    try {
      if (isDemoUser(input.user_id)) {
        console.log('[BudgetService] Demo user detected, returning mock updated budget');
        return {
          id: input.budget_id,
          user_id: input.user_id,
          budget_name: input.budget_name || 'My Budget',
          monthly_income: input.monthly_income || 0,
          savings_goal: input.savings_goal || 0,
          budget_categories: input.budget_categories || {},
          custom_expenses: input.custom_expenses || [],
          expense_limits: input.expense_limits || {},
          budget_settings: input.budget_settings || {
            autoSave: true,
            saveInterval: 30,
            notifications: true,
            showWarnings: true,
            warningThreshold: 80,
          },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      const updateData: any = {};
      
      if (input.budget_name !== undefined) updateData.budget_name = input.budget_name;
      if (input.monthly_income !== undefined) updateData.monthly_income = input.monthly_income;
      if (input.savings_goal !== undefined) updateData.savings_goal = input.savings_goal;
      if (input.budget_categories !== undefined) updateData.budget_categories = input.budget_categories;
      if (input.custom_expenses !== undefined) updateData.custom_expenses = input.custom_expenses;
      if (input.expense_limits !== undefined) updateData.expense_limits = input.expense_limits;
      if (input.budget_settings !== undefined) updateData.budget_settings = input.budget_settings;

      const { data, error } = await supabase
        .from('user_budgets')
        .update(updateData)
        .eq('id', input.budget_id)
        .eq('user_id', input.user_id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('[BudgetService] Error updating budget:', error.message || JSON.stringify(error));
        return null;
      }

      if (!data) {
        console.warn('[BudgetService] No data returned after update');
        return null;
      }

      console.log('[BudgetService] Budget updated successfully:', data.id);
      return data as UserBudget;
    } catch (error) {
      console.error('[BudgetService] Exception in updateBudget:', error);
      return null;
    }
  }

  /**
   * Delete a budget (soft delete by setting is_active to false)
   */
  static async deleteBudget(budgetId: string, userId: string): Promise<boolean> {
    try {
      if (isDemoUser(userId)) {
        console.log('[BudgetService] Demo user detected, returning success');
        return true;
      }

      const { error } = await supabase
        .from('user_budgets')
        .update({ is_active: false })
        .eq('id', budgetId)
        .eq('user_id', userId);

      if (error) {
        console.error('[BudgetService] Error deleting budget:', error.message || JSON.stringify(error));
        return false;
      }

      console.log('[BudgetService] Budget deleted successfully:', budgetId);
      return true;
    } catch (error) {
      console.error('[BudgetService] Exception in deleteBudget:', error);
      return false;
    }
  }

  /**
   * Get or create user's budget (if doesn't exist)
   */
  static async getOrCreateBudget(userId: string): Promise<UserBudget | null> {
    try {
      if (isDemoUser(userId)) {
        console.log('[BudgetService] Demo user detected, returning local budget');
        return createLocalBudget(userId);
      }

      // Try to get existing budget first
      let budget = await this.getUserBudget(userId);
      
      if (!budget) {
        console.log('[BudgetService] No budget found, creating new budget for user:', userId);
        budget = await this.createBudget({
          user_id: userId,
        });
      }
      
      return budget;
    } catch (error) {
      console.error('[BudgetService] Exception in getOrCreateBudget:', error);
      return null;
    }
  }

  /**
   * Update specific field in budget
   */
  static async updateBudgetField(
    budgetId: string,
    userId: string,
    field: keyof UpdateBudgetInput,
    value: any
  ): Promise<UserBudget | null> {
    try {
      if (isDemoUser(userId)) {
        console.log('[BudgetService] Demo user detected, returning mock budget');
        return createLocalBudget(userId);
      }

      const { data, error } = await supabase
        .from('user_budgets')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', budgetId)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('[BudgetService] Error updating budget field:', error.message || JSON.stringify(error));
        return null;
      }

      return data as UserBudget;
    } catch (error) {
      console.error('[BudgetService] Exception in updateBudgetField:', error);
      return null;
    }
  }
}