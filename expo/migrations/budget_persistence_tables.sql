-- Budget Persistence Tables
-- These tables enable user-specific budget data persistence and activity tracking

-- User Budgets Table
CREATE TABLE IF NOT EXISTS user_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  budget_name TEXT DEFAULT 'My Budget',
  monthly_income DECIMAL(10,2) DEFAULT 0,
  savings_goal DECIMAL(10,2) DEFAULT 0,
  budget_categories JSONB DEFAULT '{}',
  custom_expenses JSONB DEFAULT '[]',
  expense_limits JSONB DEFAULT '{}',
  budget_settings JSONB DEFAULT '{"autoSave": true, "saveInterval": 30, "notifications": true}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, is_active)
);

-- Budget Activity Log Table
CREATE TABLE IF NOT EXISTS budget_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  budget_id UUID REFERENCES user_budgets(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'expense_added', 'expense_removed', 'expense_updated', 'limit_changed', 'settings_updated'
  activity_details JSONB DEFAULT '{}',
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_user_budgets_user_id ON user_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_budgets_is_active ON user_budgets(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_budget_activity_user_id ON budget_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_activity_budget_id ON budget_activity_log(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_activity_type ON budget_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_budget_activity_created_at ON budget_activity_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_budgets
CREATE POLICY "Users can view their own budgets"
  ON user_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets"
  ON user_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
  ON user_budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
  ON user_budgets FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for budget_activity_log
CREATE POLICY "Users can view their own activity logs"
  ON budget_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
  ON budget_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_budgets_updated_at
  BEFORE UPDATE ON user_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_user_budgets_updated_at();

-- Function to log budget activities
CREATE OR REPLACE FUNCTION log_budget_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO budget_activity_log (
    user_id,
    budget_id,
    activity_type,
    activity_details,
    old_value,
    new_value,
    created_at
  ) VALUES (
    NEW.user_id,
    NEW.id,
    'budget_updated',
    jsonb_build_object('table', 'user_budgets', 'operation', TG_OP),
    jsonb_build_object('budget_name', OLD.budget_name, 'updated_at', OLD.updated_at),
    jsonb_build_object('budget_name', NEW.budget_name, 'updated_at', NEW.updated_at),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log budget updates (only for updates, not inserts)
DROP TRIGGER IF EXISTS trigger_log_budget_activity ON user_budgets;
CREATE TRIGGER trigger_log_budget_activity
  AFTER UPDATE ON user_budgets
  FOR EACH ROW
  EXECUTE FUNCTION log_budget_activity();