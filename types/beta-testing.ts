export type TestScenarioStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
export type FeedbackCategory = 'bug' | 'ux_issue' | 'feature_request' | 'performance' | 'other';
export type FeedbackPriority = 'critical' | 'high' | 'medium' | 'low';
export type BetaTesterStatus = 'invited' | 'active' | 'inactive' | 'completed';

export interface BetaTester {
  id: string;
  user_id: string;
  name: string;
  email: string;
  status: BetaTesterStatus;
  invited_at: string;
  joined_at?: string;
  scenarios_completed: number;
  total_scenarios: number;
  feedback_count: number;
  last_activity?: string;
  device_info?: string;
  notes?: string;
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  category: 'simple_purchase' | 'auction' | 'bulk_trading' | 'cross_currency' | 'business_sync';
  steps: TestStep[];
  expected_outcome: string;
  acceptance_criteria: string[];
  priority: number;
  estimated_duration: number; // minutes
  created_at: string;
}

export interface TestStep {
  id: string;
  order: number;
  action: string;
  expected_result: string;
  notes?: string;
}

export interface TesterScenarioProgress {
  id: string;
  tester_id: string;
  scenario_id: string;
  status: TestScenarioStatus;
  current_step: number;
  started_at?: string;
  completed_at?: string;
  step_results: StepResult[];
  notes?: string;
  issues_found: string[];
}

export interface StepResult {
  step_id: string;
  passed: boolean;
  actual_result?: string;
  screenshot_url?: string;
  timestamp: string;
}

export interface BetaFeedback {
  id: string;
  tester_id: string;
  tester_name: string;
  scenario_id?: string;
  category: FeedbackCategory;
  priority: FeedbackPriority;
  title: string;
  description: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  device_info?: string;
  app_version?: string;
  screenshot_urls?: string[];
  status: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'wont_fix';
  admin_notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BetaTestingStats {
  total_testers: number;
  active_testers: number;
  total_scenarios: number;
  completed_scenarios: number;
  total_feedback: number;
  critical_bugs: number;
  high_priority_issues: number;
  resolved_issues: number;
  completion_rate: number;
  avg_scenario_duration: number;
}

export interface TestSession {
  id: string;
  tester_id: string;
  started_at: string;
  ended_at?: string;
  scenarios_attempted: string[];
  scenarios_completed: string[];
  feedback_submitted: string[];
  duration_minutes?: number;
}

export interface FeedbackFormData {
  category: FeedbackCategory;
  priority: FeedbackPriority;
  title: string;
  description: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  scenario_id?: string;
}

export interface ScenarioFilter {
  category?: string;
  status?: TestScenarioStatus;
  priority?: number;
}

export interface FeedbackFilter {
  category?: FeedbackCategory;
  priority?: FeedbackPriority;
  status?: string;
  tester_id?: string;
  date_from?: string;
  date_to?: string;
}
