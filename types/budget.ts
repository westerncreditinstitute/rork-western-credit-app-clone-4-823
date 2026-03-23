// Budget System Types

export interface UserBudget {
  id: string;
  user_id: string;
  budget_name: string;
  monthly_income: number;
  savings_goal: number;
  budget_categories: Record<string, BudgetCategory>;
  custom_expenses: CustomExpense[];
  expense_limits: Record<string, number>;
  budget_settings: BudgetSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  allocated: number;
  spent: number;
  icon?: string;
  color?: string;
  label?: string;
}

export interface CustomExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  isFixed: boolean;
  createdAt?: number;
}

export interface BudgetSettings {
  autoSave: boolean;
  saveInterval: number; // seconds
  notifications: boolean;
  showWarnings: boolean;
  warningThreshold: number; // percentage (0-100)
}

export interface BudgetActivityLog {
  id: string;
  user_id: string;
  budget_id: string | null;
  activity_type: BudgetActivityType;
  activity_details: Record<string, any>;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type BudgetActivityType =
  | 'expense_added'
  | 'expense_removed'
  | 'expense_updated'
  | 'limit_changed'
  | 'settings_updated'
  | 'budget_created'
  | 'budget_deleted'
  | 'income_updated'
  | 'goal_updated';

export interface BudgetActivityPayload {
  budget_id?: string;
  activity_type: BudgetActivityType;
  activity_details?: Record<string, any>;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
}

export interface BudgetState {
  currentBudget: UserBudget | null;
  activityLog: BudgetActivityLog[];
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: number | null;
  error: string | null;
}

export interface CreateBudgetInput {
  user_id: string;
  budget_name?: string;
  monthly_income?: number;
  savings_goal?: number;
  budget_categories?: Record<string, BudgetCategory>;
  custom_expenses?: CustomExpense[];
  expense_limits?: Record<string, number>;
  budget_settings?: BudgetSettings;
}

export interface UpdateBudgetInput {
  budget_id: string;
  user_id: string;
  budget_name?: string;
  monthly_income?: number;
  savings_goal?: number;
  budget_categories?: Record<string, BudgetCategory>;
  custom_expenses?: CustomExpense[];
  expense_limits?: Record<string, number>;
  budget_settings?: BudgetSettings;
}