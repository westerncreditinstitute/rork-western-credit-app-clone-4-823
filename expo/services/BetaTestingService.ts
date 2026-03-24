import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  BetaTester,
  TestScenario,
  TesterScenarioProgress,
  BetaFeedback,
  BetaTestingStats,
  TestSession,
  FeedbackFormData,
  ScenarioFilter,
  FeedbackFilter,
} from '@/types/beta-testing';

const STORAGE_KEYS = {
  TESTERS: 'beta_testers',
  SCENARIOS: 'beta_scenarios',
  PROGRESS: 'beta_progress',
  FEEDBACK: 'beta_feedback',
  SESSIONS: 'beta_sessions',
  CURRENT_SESSION: 'beta_current_session',
};

const DEFAULT_SCENARIOS: TestScenario[] = [
  {
    id: 'scenario_1',
    name: 'Simple Purchase Flow',
    description: 'Test basic marketplace purchase functionality',
    category: 'simple_purchase',
    priority: 1,
    estimated_duration: 10,
    expected_outcome: 'Item successfully transferred from seller to buyer, funds transferred correctly',
    acceptance_criteria: [
      'Listing appears in marketplace',
      'Purchase completes without errors',
      'Buyer receives item in inventory',
      'Seller receives funds',
      'Listing removed from marketplace',
    ],
    steps: [
      { id: 'step_1_1', order: 1, action: 'Navigate to Marketplace', expected_result: 'Marketplace page loads with listings' },
      { id: 'step_1_2', order: 2, action: 'List a common item for sale', expected_result: 'Listing created successfully' },
      { id: 'step_1_3', order: 3, action: 'Log in as different user', expected_result: 'Successfully switched accounts' },
      { id: 'step_1_4', order: 4, action: 'Find and view the listing', expected_result: 'Listing details displayed correctly' },
      { id: 'step_1_5', order: 5, action: 'Complete purchase', expected_result: 'Purchase successful, item in inventory' },
      { id: 'step_1_6', order: 6, action: 'Verify transaction records', expected_result: 'Both parties have correct transaction history' },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'scenario_2',
    name: 'Auction Purchase Flow',
    description: 'Test auction listing and bidding functionality',
    category: 'auction',
    priority: 2,
    estimated_duration: 20,
    expected_outcome: 'Auction completes correctly, winner receives item, losers refunded',
    acceptance_criteria: [
      'Auction listing created with end time',
      'Multiple users can place bids',
      'Highest bidder wins when auction ends',
      'Winner receives item',
      'Losing bidders refunded',
    ],
    steps: [
      { id: 'step_2_1', order: 1, action: 'Create auction listing', expected_result: 'Auction created with timer' },
      { id: 'step_2_2', order: 2, action: 'Place initial bid (User A)', expected_result: 'Bid accepted, shown as current bid' },
      { id: 'step_2_3', order: 3, action: 'Place higher bid (User B)', expected_result: 'New highest bid displayed' },
      { id: 'step_2_4', order: 4, action: 'Attempt lower bid (User C)', expected_result: 'Bid rejected with error message' },
      { id: 'step_2_5', order: 5, action: 'Wait for auction end', expected_result: 'Auction closes automatically' },
      { id: 'step_2_6', order: 6, action: 'Verify winner receives item', expected_result: 'Item in winner inventory' },
      { id: 'step_2_7', order: 7, action: 'Verify losers refunded', expected_result: 'Funds returned to losing bidders' },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'scenario_3',
    name: 'Bulk Trading Flow',
    description: 'Test listing and purchasing multiple items',
    category: 'bulk_trading',
    priority: 3,
    estimated_duration: 15,
    expected_outcome: 'Multiple items transferred correctly, all inventories updated',
    acceptance_criteria: [
      'Multiple items can be listed',
      'Bulk purchase works correctly',
      'All inventory updates applied',
      'Transaction history accurate',
    ],
    steps: [
      { id: 'step_3_1', order: 1, action: 'List 5 different items', expected_result: 'All listings created successfully' },
      { id: 'step_3_2', order: 2, action: 'View all listings in marketplace', expected_result: 'All 5 items visible' },
      { id: 'step_3_3', order: 3, action: 'Purchase 3 items sequentially', expected_result: 'All purchases complete' },
      { id: 'step_3_4', order: 4, action: 'Verify buyer inventory', expected_result: '3 new items in inventory' },
      { id: 'step_3_5', order: 5, action: 'Verify remaining listings', expected_result: '2 items still available' },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'scenario_4',
    name: 'Cross-Currency Trading',
    description: 'Test purchases with different currency types',
    category: 'cross_currency',
    priority: 4,
    estimated_duration: 15,
    expected_outcome: 'Currency conversion works correctly, transaction completes',
    acceptance_criteria: [
      'Item listed in USD',
      'User can pay with MUSO tokens',
      'Conversion rate applied correctly',
      'Both balances updated',
    ],
    steps: [
      { id: 'step_4_1', order: 1, action: 'List item priced in USD', expected_result: 'Listing shows USD price' },
      { id: 'step_4_2', order: 2, action: 'View as buyer with MUSO balance', expected_result: 'Converted price displayed' },
      { id: 'step_4_3', order: 3, action: 'Complete purchase with MUSO', expected_result: 'Purchase successful' },
      { id: 'step_4_4', order: 4, action: 'Verify MUSO deducted correctly', expected_result: 'Correct amount deducted' },
      { id: 'step_4_5', order: 5, action: 'Verify seller receives USD', expected_result: 'USD amount credited to seller' },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'scenario_5',
    name: 'Business Inventory Sync',
    description: 'Test business inventory updates on purchase',
    category: 'business_sync',
    priority: 5,
    estimated_duration: 15,
    expected_outcome: 'Business stock decreases on purchase, restock works',
    acceptance_criteria: [
      'Business stock visible',
      'Stock decreases on purchase',
      'Out of stock prevents purchase',
      'Restock increases stock',
    ],
    steps: [
      { id: 'step_5_1', order: 1, action: 'View business inventory', expected_result: 'Stock quantities displayed' },
      { id: 'step_5_2', order: 2, action: 'Purchase item from business', expected_result: 'Purchase completes' },
      { id: 'step_5_3', order: 3, action: 'Verify stock decreased', expected_result: 'Stock count reduced by 1' },
      { id: 'step_5_4', order: 4, action: 'Purchase until out of stock', expected_result: 'Item shows as unavailable' },
      { id: 'step_5_5', order: 5, action: 'Attempt purchase of out-of-stock item', expected_result: 'Error message shown' },
      { id: 'step_5_6', order: 6, action: 'Trigger restock (admin)', expected_result: 'Stock replenished' },
      { id: 'step_5_7', order: 7, action: 'Verify item available again', expected_result: 'Purchase now possible' },
    ],
    created_at: new Date().toISOString(),
  },
];

class BetaTestingService {
  private async getStoredData<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error(`[BetaTesting] Error reading ${key}:`, error);
      return defaultValue;
    }
  }

  private async setStoredData<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`[BetaTesting] Error writing ${key}:`, error);
    }
  }

  async initializeScenarios(): Promise<void> {
    const existing = await this.getStoredData<TestScenario[]>(STORAGE_KEYS.SCENARIOS, []);
    if (existing.length === 0) {
      await this.setStoredData(STORAGE_KEYS.SCENARIOS, DEFAULT_SCENARIOS);
      console.log('[BetaTesting] Initialized default scenarios');
    }
  }

  async createTestAccount(userData: { name: string; email: string; userId: string }): Promise<BetaTester> {
    const testers = await this.getStoredData<BetaTester[]>(STORAGE_KEYS.TESTERS, []);
    const scenarios = await this.getScenarios();

    const newTester: BetaTester = {
      id: `tester_${Date.now()}`,
      user_id: userData.userId,
      name: userData.name,
      email: userData.email,
      status: 'invited',
      invited_at: new Date().toISOString(),
      scenarios_completed: 0,
      total_scenarios: scenarios.length,
      feedback_count: 0,
    };

    testers.push(newTester);
    await this.setStoredData(STORAGE_KEYS.TESTERS, testers);
    console.log('[BetaTesting] Created test account:', newTester.email);

    return newTester;
  }

  async activateTester(testerId: string): Promise<BetaTester | null> {
    const testers = await this.getStoredData<BetaTester[]>(STORAGE_KEYS.TESTERS, []);
    const index = testers.findIndex(t => t.id === testerId);

    if (index === -1) return null;

    testers[index] = {
      ...testers[index],
      status: 'active',
      joined_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    };

    await this.setStoredData(STORAGE_KEYS.TESTERS, testers);
    return testers[index];
  }

  async getTesters(): Promise<BetaTester[]> {
    return this.getStoredData<BetaTester[]>(STORAGE_KEYS.TESTERS, []);
  }

  async getTesterById(testerId: string): Promise<BetaTester | null> {
    const testers = await this.getTesters();
    return testers.find(t => t.id === testerId) || null;
  }

  async getTesterByUserId(userId: string): Promise<BetaTester | null> {
    const testers = await this.getTesters();
    return testers.find(t => t.user_id === userId) || null;
  }

  async getScenarios(filter?: ScenarioFilter): Promise<TestScenario[]> {
    await this.initializeScenarios();
    let scenarios = await this.getStoredData<TestScenario[]>(STORAGE_KEYS.SCENARIOS, DEFAULT_SCENARIOS);

    if (filter?.category) {
      scenarios = scenarios.filter(s => s.category === filter.category);
    }

    if (filter?.priority !== undefined) {
      scenarios = scenarios.filter(s => s.priority === filter.priority);
    }

    return scenarios.sort((a, b) => a.priority - b.priority);
  }

  async getScenarioById(scenarioId: string): Promise<TestScenario | null> {
    const scenarios = await this.getScenarios();
    return scenarios.find(s => s.id === scenarioId) || null;
  }

  async startScenario(testerId: string, scenarioId: string): Promise<TesterScenarioProgress> {
    const progressList = await this.getStoredData<TesterScenarioProgress[]>(STORAGE_KEYS.PROGRESS, []);

    const existing = progressList.find(p => p.tester_id === testerId && p.scenario_id === scenarioId);
    if (existing && existing.status === 'in_progress') {
      return existing;
    }

    const newProgress: TesterScenarioProgress = {
      id: `progress_${Date.now()}`,
      tester_id: testerId,
      scenario_id: scenarioId,
      status: 'in_progress',
      current_step: 0,
      started_at: new Date().toISOString(),
      step_results: [],
      issues_found: [],
    };

    progressList.push(newProgress);
    await this.setStoredData(STORAGE_KEYS.PROGRESS, progressList);

    await this.updateTesterActivity(testerId);
    console.log('[BetaTesting] Started scenario:', scenarioId, 'for tester:', testerId);

    return newProgress;
  }

  async updateStepResult(
    progressId: string,
    stepId: string,
    passed: boolean,
    actualResult?: string
  ): Promise<TesterScenarioProgress | null> {
    const progressList = await this.getStoredData<TesterScenarioProgress[]>(STORAGE_KEYS.PROGRESS, []);
    const index = progressList.findIndex(p => p.id === progressId);

    if (index === -1) return null;

    const stepResult = {
      step_id: stepId,
      passed,
      actual_result: actualResult,
      timestamp: new Date().toISOString(),
    };

    progressList[index].step_results.push(stepResult);
    progressList[index].current_step += 1;

    await this.setStoredData(STORAGE_KEYS.PROGRESS, progressList);
    await this.updateTesterActivity(progressList[index].tester_id);

    return progressList[index];
  }

  async completeScenario(
    progressId: string,
    status: 'completed' | 'failed',
    notes?: string,
    issues?: string[]
  ): Promise<TesterScenarioProgress | null> {
    const progressList = await this.getStoredData<TesterScenarioProgress[]>(STORAGE_KEYS.PROGRESS, []);
    const index = progressList.findIndex(p => p.id === progressId);

    if (index === -1) return null;

    progressList[index] = {
      ...progressList[index],
      status,
      completed_at: new Date().toISOString(),
      notes,
      issues_found: issues || progressList[index].issues_found,
    };

    await this.setStoredData(STORAGE_KEYS.PROGRESS, progressList);

    if (status === 'completed') {
      await this.incrementTesterCompletion(progressList[index].tester_id);
    }

    console.log('[BetaTesting] Completed scenario with status:', status);
    return progressList[index];
  }

  async getTesterProgress(testerId: string): Promise<TesterScenarioProgress[]> {
    const progressList = await this.getStoredData<TesterScenarioProgress[]>(STORAGE_KEYS.PROGRESS, []);
    return progressList.filter(p => p.tester_id === testerId);
  }

  async getScenarioProgress(testerId: string, scenarioId: string): Promise<TesterScenarioProgress | null> {
    const progressList = await this.getTesterProgress(testerId);
    return progressList.find(p => p.scenario_id === scenarioId) || null;
  }

  async submitFeedback(testerId: string, testerName: string, feedbackData: FeedbackFormData): Promise<BetaFeedback> {
    const feedbackList = await this.getStoredData<BetaFeedback[]>(STORAGE_KEYS.FEEDBACK, []);

    const newFeedback: BetaFeedback = {
      id: `feedback_${Date.now()}`,
      tester_id: testerId,
      tester_name: testerName,
      scenario_id: feedbackData.scenario_id,
      category: feedbackData.category,
      priority: feedbackData.priority,
      title: feedbackData.title,
      description: feedbackData.description,
      steps_to_reproduce: feedbackData.steps_to_reproduce,
      expected_behavior: feedbackData.expected_behavior,
      actual_behavior: feedbackData.actual_behavior,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    feedbackList.push(newFeedback);
    await this.setStoredData(STORAGE_KEYS.FEEDBACK, feedbackList);

    await this.incrementTesterFeedback(testerId);
    console.log('[BetaTesting] Feedback submitted:', newFeedback.title);

    return newFeedback;
  }

  async getFeedback(filter?: FeedbackFilter): Promise<BetaFeedback[]> {
    let feedbackList = await this.getStoredData<BetaFeedback[]>(STORAGE_KEYS.FEEDBACK, []);

    if (filter?.category) {
      feedbackList = feedbackList.filter(f => f.category === filter.category);
    }
    if (filter?.priority) {
      feedbackList = feedbackList.filter(f => f.priority === filter.priority);
    }
    if (filter?.status) {
      feedbackList = feedbackList.filter(f => f.status === filter.status);
    }
    if (filter?.tester_id) {
      feedbackList = feedbackList.filter(f => f.tester_id === filter.tester_id);
    }

    return feedbackList.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async updateFeedbackStatus(
    feedbackId: string,
    status: BetaFeedback['status'],
    adminNotes?: string
  ): Promise<BetaFeedback | null> {
    const feedbackList = await this.getStoredData<BetaFeedback[]>(STORAGE_KEYS.FEEDBACK, []);
    const index = feedbackList.findIndex(f => f.id === feedbackId);

    if (index === -1) return null;

    feedbackList[index] = {
      ...feedbackList[index],
      status,
      admin_notes: adminNotes || feedbackList[index].admin_notes,
      resolved_at: status === 'resolved' ? new Date().toISOString() : feedbackList[index].resolved_at,
      updated_at: new Date().toISOString(),
    };

    await this.setStoredData(STORAGE_KEYS.FEEDBACK, feedbackList);
    return feedbackList[index];
  }

  async getStats(): Promise<BetaTestingStats> {
    const testers = await this.getTesters();
    const scenarios = await this.getScenarios();
    const progressList = await this.getStoredData<TesterScenarioProgress[]>(STORAGE_KEYS.PROGRESS, []);
    const feedbackList = await this.getStoredData<BetaFeedback[]>(STORAGE_KEYS.FEEDBACK, []);

    const activeTesters = testers.filter(t => t.status === 'active').length;
    const completedScenarios = progressList.filter(p => p.status === 'completed').length;
    const criticalBugs = feedbackList.filter(f => f.priority === 'critical' && f.category === 'bug').length;
    const highPriorityIssues = feedbackList.filter(f => f.priority === 'high').length;
    const resolvedIssues = feedbackList.filter(f => f.status === 'resolved').length;

    const completionRate = testers.length > 0
      ? (testers.reduce((sum, t) => sum + t.scenarios_completed, 0) / (testers.length * scenarios.length)) * 100
      : 0;

    const completedWithTime = progressList.filter(p => p.status === 'completed' && p.started_at && p.completed_at);
    const avgDuration = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, p) => {
          const start = new Date(p.started_at!).getTime();
          const end = new Date(p.completed_at!).getTime();
          return sum + (end - start) / 60000;
        }, 0) / completedWithTime.length
      : 0;

    return {
      total_testers: testers.length,
      active_testers: activeTesters,
      total_scenarios: scenarios.length,
      completed_scenarios: completedScenarios,
      total_feedback: feedbackList.length,
      critical_bugs: criticalBugs,
      high_priority_issues: highPriorityIssues,
      resolved_issues: resolvedIssues,
      completion_rate: Math.round(completionRate * 10) / 10,
      avg_scenario_duration: Math.round(avgDuration * 10) / 10,
    };
  }

  async startSession(testerId: string): Promise<TestSession> {
    const session: TestSession = {
      id: `session_${Date.now()}`,
      tester_id: testerId,
      started_at: new Date().toISOString(),
      scenarios_attempted: [],
      scenarios_completed: [],
      feedback_submitted: [],
    };

    await this.setStoredData(STORAGE_KEYS.CURRENT_SESSION, session);
    console.log('[BetaTesting] Started session:', session.id);

    return session;
  }

  async endSession(sessionId: string): Promise<TestSession | null> {
    const session = await this.getStoredData<TestSession | null>(STORAGE_KEYS.CURRENT_SESSION, null);
    if (!session || session.id !== sessionId) return null;

    const endedAt = new Date();
    const startedAt = new Date(session.started_at);
    const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

    const completedSession: TestSession = {
      ...session,
      ended_at: endedAt.toISOString(),
      duration_minutes: durationMinutes,
    };

    const sessions = await this.getStoredData<TestSession[]>(STORAGE_KEYS.SESSIONS, []);
    sessions.push(completedSession);
    await this.setStoredData(STORAGE_KEYS.SESSIONS, sessions);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);

    console.log('[BetaTesting] Ended session:', sessionId, 'Duration:', durationMinutes, 'min');
    return completedSession;
  }

  async getCurrentSession(): Promise<TestSession | null> {
    return this.getStoredData<TestSession | null>(STORAGE_KEYS.CURRENT_SESSION, null);
  }

  private async updateTesterActivity(testerId: string): Promise<void> {
    const testers = await this.getStoredData<BetaTester[]>(STORAGE_KEYS.TESTERS, []);
    const index = testers.findIndex(t => t.id === testerId);

    if (index !== -1) {
      testers[index].last_activity = new Date().toISOString();
      await this.setStoredData(STORAGE_KEYS.TESTERS, testers);
    }
  }

  private async incrementTesterCompletion(testerId: string): Promise<void> {
    const testers = await this.getStoredData<BetaTester[]>(STORAGE_KEYS.TESTERS, []);
    const index = testers.findIndex(t => t.id === testerId);

    if (index !== -1) {
      testers[index].scenarios_completed += 1;
      await this.setStoredData(STORAGE_KEYS.TESTERS, testers);
    }
  }

  private async incrementTesterFeedback(testerId: string): Promise<void> {
    const testers = await this.getStoredData<BetaTester[]>(STORAGE_KEYS.TESTERS, []);
    const index = testers.findIndex(t => t.id === testerId);

    if (index !== -1) {
      testers[index].feedback_count += 1;
      await this.setStoredData(STORAGE_KEYS.TESTERS, testers);
    }
  }

  async clearAllData(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TESTERS,
      STORAGE_KEYS.SCENARIOS,
      STORAGE_KEYS.PROGRESS,
      STORAGE_KEYS.FEEDBACK,
      STORAGE_KEYS.SESSIONS,
      STORAGE_KEYS.CURRENT_SESSION,
    ]);
    console.log('[BetaTesting] All data cleared');
  }
}

export const betaTestingService = new BetaTestingService();
