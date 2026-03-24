export interface UATSession {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime?: string;
  deviceInfo: DeviceInfo;
  appVersion: string;
  feedbackItems: UATFeedbackItem[];
  bugReports: UATBugReport[];
  featureRatings: UATFeatureRating[];
  sessionNotes: string;
  overallRating?: number;
  wouldRecommend?: boolean;
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  osVersion: string;
  deviceModel?: string;
  screenWidth: number;
  screenHeight: number;
  connectionType?: string;
}

export interface UATFeedbackItem {
  id: string;
  sessionId: string;
  timestamp: string;
  category: UATFeedbackCategory;
  feature: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  screenshotUrl?: string;
  metadata?: Record<string, any>;
}

export type UATFeedbackCategory = 
  | 'multiplayer'
  | 'chat'
  | 'presence'
  | 'leaderboard'
  | 'business'
  | 'home_visit'
  | 'performance'
  | 'ui_ux'
  | 'navigation'
  | 'other';

export interface UATBugReport {
  id: string;
  sessionId: string;
  timestamp: string;
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  title: string;
  description: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  feature: string;
  screenshotUrl?: string;
  consoleLogs?: string;
  status: 'new' | 'acknowledged' | 'in_progress' | 'fixed' | 'wont_fix';
}

export interface UATFeatureRating {
  feature: string;
  rating: 1 | 2 | 3 | 4 | 5;
  usability: 1 | 2 | 3 | 4 | 5;
  performance: 1 | 2 | 3 | 4 | 5;
  design: 1 | 2 | 3 | 4 | 5;
  comments: string;
}

export interface UATSummaryReport {
  totalSessions: number;
  totalFeedbackItems: number;
  totalBugReports: number;
  averageOverallRating: number;
  recommendationRate: number;
  featureRatings: Record<string, {
    avgRating: number;
    avgUsability: number;
    avgPerformance: number;
    avgDesign: number;
    totalResponses: number;
  }>;
  bugsBySeverity: Record<string, number>;
  bugsByStatus: Record<string, number>;
  topIssues: {
    feature: string;
    issueCount: number;
    avgSeverity: number;
  }[];
  topPraises: {
    feature: string;
    praiseCount: number;
    avgRating: number;
  }[];
  deviceBreakdown: Record<string, number>;
}

export interface UATTestCase {
  id: string;
  name: string;
  description: string;
  feature: UATFeedbackCategory;
  steps: string[];
  expectedResult: string;
  priority: 'high' | 'medium' | 'low';
}

export interface UATTestResult {
  testCaseId: string;
  sessionId: string;
  passed: boolean;
  notes: string;
  executionTimeMs: number;
  timestamp: string;
}
