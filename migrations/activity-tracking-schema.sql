-- =============================================
-- COMPREHENSIVE ACTIVITY TRACKING SCHEMA
-- For Credit Life Simulator - Saves ALL user activity including demo mode
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USER ACTIVITY LOG TABLE
-- Tracks all actions taken by users (including demo users)
-- =============================================
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL, -- TEXT to support both UUID and demo-xxxxx format
    session_id TEXT,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'account_opened', 'account_closed', 'payment_made', 'payment_missed',
        'job_change', 'property_purchased', 'property_rented', 'vehicle_purchased',
        'clothing_purchased', 'food_purchased', 'gas_purchased',
        'application_submitted', 'application_approved', 'application_denied',
        'score_change', 'achievement_unlocked', 'month_advanced',
        'emergency_event', 'random_incident', 'health_event',
        'profile_updated', 'city_selected', 'game_started', 'game_reset',
        'transfer_made', 'expense_paid', 'income_received',
        'solar_installed', 'escrow_started', 'rental_application',
        'budget_transaction', 'token_mint', 'token_burn',
        'login', 'logout', 'other'
    )),
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    amount DECIMAL(15, 2),
    previous_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    user_agent TEXT,
    platform TEXT CHECK (platform IN ('ios', 'android', 'web', 'unknown')),
    app_version TEXT,
    is_demo_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity log
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_type ON user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_session ON user_activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_demo ON user_activity_log(is_demo_mode);

-- =============================================
-- 2. REAL ESTATE APPLICATIONS TABLE
-- Tracks rental and purchase applications
-- =============================================
CREATE TABLE IF NOT EXISTS real_estate_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL, -- TEXT to support demo users
    application_type TEXT NOT NULL CHECK (application_type IN ('rental', 'purchase', 'escrow')),
    property_id TEXT,
    property_name TEXT NOT NULL,
    property_address TEXT,
    property_type TEXT,
    city TEXT,
    neighborhood TEXT,
    
    -- Applicant Details
    applicant_name TEXT NOT NULL,
    current_address TEXT,
    current_employer TEXT,
    employment_status TEXT,
    monthly_income DECIMAL(15, 2),
    annual_income DECIMAL(15, 2),
    
    -- Financial Details
    bank_account_balance DECIMAL(15, 2),
    savings_balance DECIMAL(15, 2),
    credit_score INTEGER,
    total_debt DECIMAL(15, 2),
    debt_to_income_ratio DECIMAL(5, 2),
    
    -- Property Details
    monthly_rent DECIMAL(10, 2),
    purchase_price DECIMAL(15, 2),
    down_payment DECIMAL(15, 2),
    security_deposit DECIMAL(10, 2),
    
    -- Application Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'under_review', 'approved', 'denied', 
        'cancelled', 'completed', 'expired'
    )),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    decision_date TIMESTAMPTZ,
    denial_reason TEXT,
    approval_conditions TEXT,
    
    -- Terms & Conditions
    terms_accepted BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMPTZ,
    background_check_consent BOOLEAN DEFAULT false,
    credit_check_consent BOOLEAN DEFAULT false,
    
    -- Lease/Contract Details
    lease_start_date DATE,
    lease_end_date DATE,
    lease_term_months INTEGER,
    
    -- Additional Metadata
    roommates JSONB DEFAULT '[]',
    applicant_references JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    is_demo_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for real estate applications
CREATE INDEX IF NOT EXISTS idx_re_applications_user ON real_estate_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_re_applications_status ON real_estate_applications(status);
CREATE INDEX IF NOT EXISTS idx_re_applications_type ON real_estate_applications(application_type);
CREATE INDEX IF NOT EXISTS idx_re_applications_property ON real_estate_applications(property_id);
CREATE INDEX IF NOT EXISTS idx_re_applications_city ON real_estate_applications(city);
CREATE INDEX IF NOT EXISTS idx_re_applications_demo ON real_estate_applications(is_demo_mode);

-- =============================================
-- 3. TRANSACTION HISTORY TABLE
-- Tracks all financial transactions for budget management
-- =============================================
CREATE TABLE IF NOT EXISTS transaction_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL, -- TEXT to support demo users
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'income', 'expense', 'transfer', 'payment', 'purchase',
        'credit_card_charge', 'loan_payment', 'rent_payment',
        'utility_payment', 'insurance_payment', 'subscription',
        'refund', 'cashback', 'interest', 'fee', 'deposit',
        'withdrawal', 'investment', 'dividend', 'other'
    )),
    category TEXT CHECK (category IN (
        'housing', 'utilities', 'transportation', 'food', 'healthcare',
        'insurance', 'entertainment', 'clothing', 'education',
        'personal_care', 'debt_payment', 'savings', 'investment',
        'income', 'salary', 'bonus', 'gift', 'refund', 'other'
    )),
    
    -- Amount Details
    amount DECIMAL(15, 2) NOT NULL,
    is_debit BOOLEAN NOT NULL, -- true = money out, false = money in
    
    -- Account Details
    from_account TEXT, -- bank, savings, emergency, credit_card, etc.
    to_account TEXT,
    account_balance_after DECIMAL(15, 2),
    
    -- Related Entities
    related_expense_id TEXT,
    related_expense_name TEXT,
    related_account_id TEXT,
    related_property_id TEXT,
    related_vehicle_id TEXT,
    
    -- Payment Method
    payment_method TEXT CHECK (payment_method IN (
        'bank_account', 'credit_card', 'debit_card', 'cash',
        'savings', 'emergency_fund', 'auto_pay', 'other'
    )),
    credit_card_id TEXT,
    credit_card_name TEXT,
    
    -- Description
    description TEXT NOT NULL,
    notes TEXT,
    
    -- Token Tracking (MUSO tokens)
    token_amount DECIMAL(15, 2),
    token_balance_after DECIMAL(15, 2),
    token_transaction_type TEXT CHECK (token_transaction_type IN ('mint', 'burn', 'transfer')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    is_recurring BOOLEAN DEFAULT false,
    recurrence_id TEXT,
    
    -- Game Context
    game_month INTEGER,
    game_date BIGINT,
    
    is_demo_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transaction history
CREATE INDEX IF NOT EXISTS idx_transaction_history_user ON transaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_type ON transaction_history(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transaction_history_category ON transaction_history(category);
CREATE INDEX IF NOT EXISTS idx_transaction_history_created ON transaction_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_history_demo ON transaction_history(is_demo_mode);
CREATE INDEX IF NOT EXISTS idx_transaction_history_expense ON transaction_history(related_expense_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_game_month ON transaction_history(game_month);

-- =============================================
-- 4. CREDIT SCORE HISTORY TABLE
-- Tracks credit score changes over time
-- =============================================
CREATE TABLE IF NOT EXISTS credit_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    experian_score INTEGER CHECK (experian_score >= 300 AND experian_score <= 850),
    equifax_score INTEGER CHECK (equifax_score >= 300 AND equifax_score <= 850),
    transunion_score INTEGER CHECK (transunion_score >= 300 AND transunion_score <= 850),
    composite_score INTEGER CHECK (composite_score >= 300 AND composite_score <= 850),
    change_reason TEXT,
    previous_composite INTEGER,
    score_change INTEGER,
    
    -- Factors that influenced the change
    payment_history_factor DECIMAL(5, 2),
    credit_utilization_factor DECIMAL(5, 2),
    credit_age_factor DECIMAL(5, 2),
    credit_mix_factor DECIMAL(5, 2),
    new_credit_factor DECIMAL(5, 2),
    
    game_month INTEGER,
    game_date BIGINT,
    
    is_demo_mode BOOLEAN DEFAULT false,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for credit score history
CREATE INDEX IF NOT EXISTS idx_credit_score_history_user ON credit_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_score_history_recorded ON credit_score_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_score_history_demo ON credit_score_history(is_demo_mode);

-- =============================================
-- 5. GAME SESSION TABLE
-- Tracks individual game sessions
-- =============================================
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    session_id TEXT UNIQUE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Session Stats
    starting_credit_score INTEGER,
    ending_credit_score INTEGER,
    starting_net_worth DECIMAL(15, 2),
    ending_net_worth DECIMAL(15, 2),
    months_advanced INTEGER DEFAULT 0,
    
    -- Activity Counts
    transactions_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    payments_count INTEGER DEFAULT 0,
    purchases_count INTEGER DEFAULT 0,
    
    -- Device Info
    platform TEXT,
    app_version TEXT,
    device_info JSONB DEFAULT '{}',
    
    is_demo_mode BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for game sessions
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_started ON game_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_demo ON game_sessions(is_demo_mode);

-- =============================================
-- 6. OWNER/RENTER BUDGET RECORDS TABLE
-- Links transactions to property owners/renters
-- =============================================
CREATE TABLE IF NOT EXISTS property_budget_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    property_id TEXT,
    property_name TEXT,
    
    -- Role in transaction
    role TEXT NOT NULL CHECK (role IN ('owner', 'renter', 'applicant', 'buyer', 'seller')),
    
    -- Transaction Reference
    transaction_id UUID REFERENCES transaction_history(id) ON DELETE SET NULL,
    application_id UUID REFERENCES real_estate_applications(id) ON DELETE SET NULL,
    
    -- Amount
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type TEXT NOT NULL,
    description TEXT,
    
    -- Counterparty (the other party in the transaction)
    counterparty_user_id TEXT,
    counterparty_name TEXT,
    counterparty_role TEXT,
    
    is_demo_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for property budget records
CREATE INDEX IF NOT EXISTS idx_property_budget_user ON property_budget_records(user_id);
CREATE INDEX IF NOT EXISTS idx_property_budget_property ON property_budget_records(property_id);
CREATE INDEX IF NOT EXISTS idx_property_budget_role ON property_budget_records(role);
CREATE INDEX IF NOT EXISTS idx_property_budget_demo ON property_budget_records(is_demo_mode);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_estate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_budget_records ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES (Allow all for testing)
-- =============================================

-- User Activity Log Policies
DROP POLICY IF EXISTS "Allow all on user_activity_log" ON user_activity_log;
CREATE POLICY "Allow all on user_activity_log" ON user_activity_log FOR ALL USING (true) WITH CHECK (true);

-- Real Estate Applications Policies
DROP POLICY IF EXISTS "Allow all on real_estate_applications" ON real_estate_applications;
CREATE POLICY "Allow all on real_estate_applications" ON real_estate_applications FOR ALL USING (true) WITH CHECK (true);

-- Transaction History Policies
DROP POLICY IF EXISTS "Allow all on transaction_history" ON transaction_history;
CREATE POLICY "Allow all on transaction_history" ON transaction_history FOR ALL USING (true) WITH CHECK (true);

-- Credit Score History Policies
DROP POLICY IF EXISTS "Allow all on credit_score_history" ON credit_score_history;
CREATE POLICY "Allow all on credit_score_history" ON credit_score_history FOR ALL USING (true) WITH CHECK (true);

-- Game Sessions Policies
DROP POLICY IF EXISTS "Allow all on game_sessions" ON game_sessions;
CREATE POLICY "Allow all on game_sessions" ON game_sessions FOR ALL USING (true) WITH CHECK (true);

-- Property Budget Records Policies
DROP POLICY IF EXISTS "Allow all on property_budget_records" ON property_budget_records;
CREATE POLICY "Allow all on property_budget_records" ON property_budget_records FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
DROP TRIGGER IF EXISTS update_real_estate_applications_updated_at ON real_estate_applications;
CREATE TRIGGER update_real_estate_applications_updated_at 
    BEFORE UPDATE ON real_estate_applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id TEXT,
    p_activity_type TEXT,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_amount DECIMAL DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_is_demo_mode BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO user_activity_log (
        user_id, activity_type, title, description, amount, metadata, is_demo_mode
    ) VALUES (
        p_user_id, p_activity_type, p_title, p_description, p_amount, p_metadata, p_is_demo_mode
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

-- Function to record a transaction
CREATE OR REPLACE FUNCTION record_transaction(
    p_user_id TEXT,
    p_transaction_type TEXT,
    p_category TEXT,
    p_amount DECIMAL,
    p_is_debit BOOLEAN,
    p_description TEXT,
    p_from_account TEXT DEFAULT NULL,
    p_to_account TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_is_demo_mode BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO transaction_history (
        user_id, transaction_type, category, amount, is_debit,
        description, from_account, to_account, payment_method,
        metadata, is_demo_mode
    ) VALUES (
        p_user_id, p_transaction_type, p_category, p_amount, p_is_debit,
        p_description, p_from_account, p_to_account, p_payment_method,
        p_metadata, p_is_demo_mode
    )
    RETURNING id INTO v_id;
    
    -- Also log as activity
    PERFORM log_user_activity(
        p_user_id,
        'budget_transaction',
        p_transaction_type || ': ' || p_description,
        p_description,
        p_amount,
        p_metadata,
        p_is_demo_mode
    );
    
    RETURN v_id;
END;
$$;

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(p_user_id TEXT)
RETURNS TABLE (
    activity_type TEXT,
    count BIGINT,
    total_amount DECIMAL,
    last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ual.activity_type,
        COUNT(*)::BIGINT as count,
        COALESCE(SUM(ual.amount), 0) as total_amount,
        MAX(ual.created_at) as last_activity
    FROM user_activity_log ual
    WHERE ual.user_id = p_user_id
    GROUP BY ual.activity_type
    ORDER BY count DESC;
END;
$$;

-- Function to get transaction summary by category
CREATE OR REPLACE FUNCTION get_transaction_summary(
    p_user_id TEXT,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    category TEXT,
    total_income DECIMAL,
    total_expenses DECIMAL,
    net_amount DECIMAL,
    transaction_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        th.category,
        SUM(CASE WHEN NOT th.is_debit THEN th.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN th.is_debit THEN th.amount ELSE 0 END) as total_expenses,
        SUM(CASE WHEN th.is_debit THEN -th.amount ELSE th.amount END) as net_amount,
        COUNT(*)::BIGINT as transaction_count
    FROM transaction_history th
    WHERE th.user_id = p_user_id
        AND (p_start_date IS NULL OR th.created_at >= p_start_date)
        AND (p_end_date IS NULL OR th.created_at <= p_end_date)
    GROUP BY th.category
    ORDER BY total_expenses DESC;
END;
$$;

-- =============================================
-- SAMPLE DATA VERIFICATION QUERY
-- Run this after the migration to verify tables are created
-- =============================================
-- SELECT 
--     table_name,
--     (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
-- FROM information_schema.tables t
-- WHERE table_schema = 'public' 
-- AND table_name IN (
--     'user_activity_log',
--     'real_estate_applications', 
--     'transaction_history',
--     'credit_score_history',
--     'game_sessions',
--     'property_budget_records'
-- );
