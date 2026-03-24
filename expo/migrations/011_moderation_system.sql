-- =============================================
-- MODERATION SYSTEM TABLES
-- =============================================

-- User Reports Table
CREATE TABLE IF NOT EXISTS user_reports (
  id TEXT PRIMARY KEY,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_name TEXT,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_user_name TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('user', 'message', 'business', 'home', 'comment', 'profile')),
  content_id TEXT,
  category TEXT NOT NULL CHECK (category IN ('harassment', 'hate_speech', 'spam', 'scam', 'inappropriate_content', 'impersonation', 'cheating', 'threats', 'personal_info', 'other')),
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed', 'escalated')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  moderator_notes TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Moderation Logs Table (for content moderation actions)
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL,
  original_content TEXT,
  sanitized_content TEXT,
  action TEXT NOT NULL CHECK (action IN ('allow', 'warn', 'block', 'review')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  flagged_terms JSONB DEFAULT '[]',
  reasons JSONB DEFAULT '[]',
  requires_review BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_decision TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked Users Table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id)
);

-- User Warnings Table
CREATE TABLE IF NOT EXISTS user_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  warning_type TEXT NOT NULL CHECK (warning_type IN ('content_violation', 'spam', 'harassment', 'cheating', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  description TEXT NOT NULL,
  related_report_id TEXT REFERENCES user_reports(id) ON DELETE SET NULL,
  issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Bans Table
CREATE TABLE IF NOT EXISTS user_bans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('temporary', 'permanent', 'shadow')),
  reason TEXT NOT NULL,
  related_report_id TEXT REFERENCES user_reports(id) ON DELETE SET NULL,
  issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  appeal_status TEXT CHECK (appeal_status IN ('none', 'pending', 'approved', 'denied')),
  appeal_reason TEXT,
  appeal_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  appeal_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderator Actions Log Table
CREATE TABLE IF NOT EXISTS moderator_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('report_review', 'ban_user', 'unban_user', 'warn_user', 'delete_content', 'edit_content', 'approve_content', 'escalate')),
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_content_type TEXT,
  target_content_id TEXT,
  related_report_id TEXT REFERENCES user_reports(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR MODERATION SYSTEM
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_priority ON user_reports(priority);
CREATE INDEX IF NOT EXISTS idx_user_reports_status_priority ON user_reports(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_category ON user_reports(category);
CREATE INDEX IF NOT EXISTS idx_user_reports_created ON user_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_moderator ON user_reports(moderator_id);

CREATE INDEX IF NOT EXISTS idx_moderation_logs_user ON moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_action ON moderation_logs(action);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_review ON moderation_logs(requires_review) WHERE requires_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created ON moderation_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blocked_users_user ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_user_id);

CREATE INDEX IF NOT EXISTS idx_user_warnings_user ON user_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_warnings_type ON user_warnings(warning_type);
CREATE INDEX IF NOT EXISTS idx_user_warnings_active ON user_warnings(user_id, expires_at) WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_bans_user ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_bans_appeal ON user_bans(appeal_status) WHERE appeal_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_moderator_actions_moderator ON moderator_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderator_actions_target ON moderator_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_moderator_actions_type ON moderator_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_moderator_actions_created ON moderator_actions(created_at DESC);

-- =============================================
-- ENABLE RLS FOR MODERATION TABLES
-- =============================================

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderator_actions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR USER REPORTS
-- =============================================

DROP POLICY IF EXISTS "Users can create reports" ON user_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON user_reports;
DROP POLICY IF EXISTS "Moderators can view all reports" ON user_reports;
DROP POLICY IF EXISTS "Moderators can update reports" ON user_reports;

-- Users can create reports
CREATE POLICY "Users can create reports" ON user_reports
  FOR INSERT WITH CHECK (true);

-- Users can view their own submitted reports
CREATE POLICY "Users can view own reports" ON user_reports
  FOR SELECT USING (true);

-- Moderators can update reports (status, notes, resolution)
CREATE POLICY "Moderators can update reports" ON user_reports
  FOR UPDATE USING (true);

-- =============================================
-- RLS POLICIES FOR MODERATION LOGS
-- =============================================

DROP POLICY IF EXISTS "System can insert moderation logs" ON moderation_logs;
DROP POLICY IF EXISTS "Moderators can view moderation logs" ON moderation_logs;
DROP POLICY IF EXISTS "Moderators can update moderation logs" ON moderation_logs;

CREATE POLICY "System can insert moderation logs" ON moderation_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Moderators can view moderation logs" ON moderation_logs
  FOR SELECT USING (true);

CREATE POLICY "Moderators can update moderation logs" ON moderation_logs
  FOR UPDATE USING (true);

-- =============================================
-- RLS POLICIES FOR BLOCKED USERS
-- =============================================

DROP POLICY IF EXISTS "Users can manage own blocks" ON blocked_users;
DROP POLICY IF EXISTS "Users can view own blocks" ON blocked_users;

CREATE POLICY "Users can manage own blocks" ON blocked_users
  FOR ALL USING (true);

CREATE POLICY "Users can view own blocks" ON blocked_users
  FOR SELECT USING (true);

-- =============================================
-- RLS POLICIES FOR USER WARNINGS
-- =============================================

DROP POLICY IF EXISTS "Users can view own warnings" ON user_warnings;
DROP POLICY IF EXISTS "Moderators can manage warnings" ON user_warnings;

CREATE POLICY "Users can view own warnings" ON user_warnings
  FOR SELECT USING (true);

CREATE POLICY "Moderators can manage warnings" ON user_warnings
  FOR ALL USING (true);

-- =============================================
-- RLS POLICIES FOR USER BANS
-- =============================================

DROP POLICY IF EXISTS "Users can view own bans" ON user_bans;
DROP POLICY IF EXISTS "Users can appeal bans" ON user_bans;
DROP POLICY IF EXISTS "Moderators can manage bans" ON user_bans;

CREATE POLICY "Users can view own bans" ON user_bans
  FOR SELECT USING (true);

CREATE POLICY "Users can appeal bans" ON user_bans
  FOR UPDATE USING (true);

CREATE POLICY "Moderators can manage bans" ON user_bans
  FOR ALL USING (true);

-- =============================================
-- RLS POLICIES FOR MODERATOR ACTIONS
-- =============================================

DROP POLICY IF EXISTS "Moderators can view actions" ON moderator_actions;
DROP POLICY IF EXISTS "Moderators can log actions" ON moderator_actions;

CREATE POLICY "Moderators can view actions" ON moderator_actions
  FOR SELECT USING (true);

CREATE POLICY "Moderators can log actions" ON moderator_actions
  FOR INSERT WITH CHECK (true);

-- =============================================
-- TRIGGERS FOR MODERATION TABLES
-- =============================================

DROP TRIGGER IF EXISTS update_user_reports_updated_at ON user_reports;
DROP TRIGGER IF EXISTS update_user_bans_updated_at ON user_bans;

CREATE TRIGGER update_user_reports_updated_at 
  BEFORE UPDATE ON user_reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_bans_updated_at 
  BEFORE UPDATE ON user_bans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS FOR MODERATION
-- =============================================

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION is_user_banned(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  ban_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_bans
    WHERE user_id = p_user_id
      AND is_active = TRUE
      AND (ends_at IS NULL OR ends_at > NOW())
  ) INTO ban_exists;
  
  RETURN ban_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to get user warning count
CREATE OR REPLACE FUNCTION get_user_warning_count(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  warning_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO warning_count
  FROM user_warnings
  WHERE user_id = p_user_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL;
  
  RETURN warning_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user report count (reports against them)
CREATE OR REPLACE FUNCTION get_user_report_count(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  report_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM user_reports
  WHERE reported_user_id = p_user_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL
    AND status NOT IN ('dismissed');
  
  RETURN report_count;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-escalate reports based on user history
CREATE OR REPLACE FUNCTION auto_escalate_report()
RETURNS TRIGGER AS $$
DECLARE
  warning_count INTEGER;
  report_count INTEGER;
BEGIN
  -- Get warning and report counts for reported user
  SELECT get_user_warning_count(NEW.reported_user_id, 30) INTO warning_count;
  SELECT get_user_report_count(NEW.reported_user_id, 30) INTO report_count;
  
  -- Auto-escalate if user has history
  IF warning_count >= 2 OR report_count >= 3 THEN
    NEW.priority := 'high';
    IF NEW.status = 'pending' THEN
      NEW.status := 'under_review';
    END IF;
  END IF;
  
  -- Auto-escalate urgent categories
  IF NEW.category IN ('threats', 'hate_speech') THEN
    NEW.priority := 'urgent';
    NEW.status := 'under_review';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_escalate_report ON user_reports;
CREATE TRIGGER trigger_auto_escalate_report
  BEFORE INSERT ON user_reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_escalate_report();

-- =============================================
-- MATERIALIZED VIEW FOR MODERATION STATS
-- =============================================

DROP MATERIALIZED VIEW IF EXISTS moderation_stats;
CREATE MATERIALIZED VIEW IF NOT EXISTS moderation_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_reports,
  COUNT(*) FILTER (WHERE status = 'under_review') AS under_review,
  COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_reports,
  COUNT(*) FILTER (WHERE status = 'dismissed') AS dismissed_reports,
  COUNT(*) FILTER (WHERE priority = 'urgent' AND status IN ('pending', 'under_review')) AS urgent_pending,
  COUNT(*) FILTER (WHERE resolved_at >= CURRENT_DATE) AS resolved_today,
  COUNT(DISTINCT reported_user_id) AS unique_reported_users,
  COUNT(DISTINCT reporter_id) AS unique_reporters,
  NOW() AS refreshed_at
FROM user_reports;

CREATE UNIQUE INDEX IF NOT EXISTS idx_moderation_stats_unique ON moderation_stats(refreshed_at);

-- Function to refresh moderation stats
CREATE OR REPLACE FUNCTION refresh_moderation_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY moderation_stats;
END;
$$ LANGUAGE plpgsql;
