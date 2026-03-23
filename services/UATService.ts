import { Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UATSession,
  UATFeedbackItem,
  UATBugReport,
  UATFeatureRating,
  UATSummaryReport,
  UATTestCase,
  UATTestResult,
  UATFeedbackCategory,
  DeviceInfo,
} from '@/types/uat';

const UAT_SESSIONS_KEY = '@uat_sessions';
const UAT_FEEDBACK_KEY = '@uat_feedback';
const UAT_BUGS_KEY = '@uat_bugs';
const UAT_RATINGS_KEY = '@uat_ratings';
const UAT_TEST_RESULTS_KEY = '@uat_test_results';

class UATService {
  private currentSession: UATSession | null = null;

  async startSession(userId: string, userName: string): Promise<UATSession> {
    const { width, height } = Dimensions.get('window');
    
    const deviceInfo: DeviceInfo = {
      platform: Platform.OS as 'ios' | 'android' | 'web',
      osVersion: Platform.Version?.toString() || 'unknown',
      screenWidth: width,
      screenHeight: height,
    };

    const session: UATSession = {
      id: `uat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName,
      startTime: new Date().toISOString(),
      deviceInfo,
      appVersion: '1.0.0',
      feedbackItems: [],
      bugReports: [],
      featureRatings: [],
      sessionNotes: '',
    };

    this.currentSession = session;
    await this.saveSession(session);
    
    console.log('[UATService] Session started:', session.id);
    return session;
  }

  async endSession(overallRating?: number, wouldRecommend?: boolean): Promise<UATSession | null> {
    if (!this.currentSession) {
      console.warn('[UATService] No active session to end');
      return null;
    }

    this.currentSession.endTime = new Date().toISOString();
    this.currentSession.overallRating = overallRating;
    this.currentSession.wouldRecommend = wouldRecommend;

    await this.saveSession(this.currentSession);
    
    const endedSession = this.currentSession;
    this.currentSession = null;
    
    console.log('[UATService] Session ended:', endedSession.id);
    return endedSession;
  }

  getCurrentSession(): UATSession | null {
    return this.currentSession;
  }

  async submitFeedback(
    category: UATFeedbackCategory,
    feature: string,
    rating: 1 | 2 | 3 | 4 | 5,
    comment: string,
    screenshotUrl?: string
  ): Promise<UATFeedbackItem> {
    const feedback: UATFeedbackItem = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.currentSession?.id || 'no-session',
      timestamp: new Date().toISOString(),
      category,
      feature,
      rating,
      comment,
      screenshotUrl,
    };

    if (this.currentSession) {
      this.currentSession.feedbackItems.push(feedback);
      await this.saveSession(this.currentSession);
    }

    await this.saveFeedback(feedback);
    console.log('[UATService] Feedback submitted:', feedback.id);
    
    return feedback;
  }

  async submitBugReport(
    severity: UATBugReport['severity'],
    title: string,
    description: string,
    stepsToReproduce: string[],
    expectedBehavior: string,
    actualBehavior: string,
    feature: string,
    screenshotUrl?: string,
    consoleLogs?: string
  ): Promise<UATBugReport> {
    const bug: UATBugReport = {
      id: `bug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.currentSession?.id || 'no-session',
      timestamp: new Date().toISOString(),
      severity,
      title,
      description,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      feature,
      screenshotUrl,
      consoleLogs,
      status: 'new',
    };

    if (this.currentSession) {
      this.currentSession.bugReports.push(bug);
      await this.saveSession(this.currentSession);
    }

    await this.saveBug(bug);
    console.log('[UATService] Bug report submitted:', bug.id);
    
    return bug;
  }

  async submitFeatureRating(
    feature: string,
    rating: 1 | 2 | 3 | 4 | 5,
    usability: 1 | 2 | 3 | 4 | 5,
    performance: 1 | 2 | 3 | 4 | 5,
    design: 1 | 2 | 3 | 4 | 5,
    comments: string
  ): Promise<UATFeatureRating> {
    const featureRating: UATFeatureRating = {
      feature,
      rating,
      usability,
      performance,
      design,
      comments,
    };

    if (this.currentSession) {
      const existingIndex = this.currentSession.featureRatings.findIndex(
        r => r.feature === feature
      );
      if (existingIndex >= 0) {
        this.currentSession.featureRatings[existingIndex] = featureRating;
      } else {
        this.currentSession.featureRatings.push(featureRating);
      }
      await this.saveSession(this.currentSession);
    }

    await this.saveRating(featureRating);
    console.log('[UATService] Feature rating submitted:', feature);
    
    return featureRating;
  }

  async recordTestResult(
    testCase: UATTestCase,
    passed: boolean,
    notes: string,
    executionTimeMs: number
  ): Promise<UATTestResult> {
    const result: UATTestResult = {
      testCaseId: testCase.id,
      sessionId: this.currentSession?.id || 'no-session',
      passed,
      notes,
      executionTimeMs,
      timestamp: new Date().toISOString(),
    };

    await this.saveTestResult(result);
    console.log('[UATService] Test result recorded:', testCase.id, passed ? 'PASS' : 'FAIL');
    
    return result;
  }

  async generateSummaryReport(): Promise<UATSummaryReport> {
    const sessions = await this.getAllSessions();
    const feedback = await this.getAllFeedback();
    const bugs = await this.getAllBugs();

    const totalOverallRatings = sessions.filter(s => s.overallRating !== undefined);
    const avgOverallRating = totalOverallRatings.length > 0
      ? totalOverallRatings.reduce((sum, s) => sum + (s.overallRating || 0), 0) / totalOverallRatings.length
      : 0;

    const recommendCount = sessions.filter(s => s.wouldRecommend === true).length;
    const recommendTotal = sessions.filter(s => s.wouldRecommend !== undefined).length;
    const recommendationRate = recommendTotal > 0 ? recommendCount / recommendTotal : 0;

    const featureRatings: UATSummaryReport['featureRatings'] = {};
    for (const session of sessions) {
      for (const rating of session.featureRatings) {
        if (!featureRatings[rating.feature]) {
          featureRatings[rating.feature] = {
            avgRating: 0,
            avgUsability: 0,
            avgPerformance: 0,
            avgDesign: 0,
            totalResponses: 0,
          };
        }
        const fr = featureRatings[rating.feature];
        const count = fr.totalResponses;
        fr.avgRating = (fr.avgRating * count + rating.rating) / (count + 1);
        fr.avgUsability = (fr.avgUsability * count + rating.usability) / (count + 1);
        fr.avgPerformance = (fr.avgPerformance * count + rating.performance) / (count + 1);
        fr.avgDesign = (fr.avgDesign * count + rating.design) / (count + 1);
        fr.totalResponses++;
      }
    }

    const bugsBySeverity: Record<string, number> = {
      critical: 0,
      major: 0,
      minor: 0,
      cosmetic: 0,
    };
    const bugsByStatus: Record<string, number> = {};
    const bugsByFeature: Record<string, { count: number; severitySum: number }> = {};

    for (const bug of bugs) {
      bugsBySeverity[bug.severity] = (bugsBySeverity[bug.severity] || 0) + 1;
      bugsByStatus[bug.status] = (bugsByStatus[bug.status] || 0) + 1;
      
      if (!bugsByFeature[bug.feature]) {
        bugsByFeature[bug.feature] = { count: 0, severitySum: 0 };
      }
      bugsByFeature[bug.feature].count++;
      const severityValue = { critical: 4, major: 3, minor: 2, cosmetic: 1 }[bug.severity] || 1;
      bugsByFeature[bug.feature].severitySum += severityValue;
    }

    const topIssues = Object.entries(bugsByFeature)
      .map(([feature, data]) => ({
        feature,
        issueCount: data.count,
        avgSeverity: data.severitySum / data.count,
      }))
      .sort((a, b) => b.issueCount - a.issueCount)
      .slice(0, 5);

    const praiseByFeature: Record<string, { count: number; ratingSum: number }> = {};
    for (const fb of feedback) {
      if (fb.rating >= 4) {
        if (!praiseByFeature[fb.feature]) {
          praiseByFeature[fb.feature] = { count: 0, ratingSum: 0 };
        }
        praiseByFeature[fb.feature].count++;
        praiseByFeature[fb.feature].ratingSum += fb.rating;
      }
    }

    const topPraises = Object.entries(praiseByFeature)
      .map(([feature, data]) => ({
        feature,
        praiseCount: data.count,
        avgRating: data.ratingSum / data.count,
      }))
      .sort((a, b) => b.praiseCount - a.praiseCount)
      .slice(0, 5);

    const deviceBreakdown: Record<string, number> = {};
    for (const session of sessions) {
      const key = session.deviceInfo.platform;
      deviceBreakdown[key] = (deviceBreakdown[key] || 0) + 1;
    }

    return {
      totalSessions: sessions.length,
      totalFeedbackItems: feedback.length,
      totalBugReports: bugs.length,
      averageOverallRating: avgOverallRating,
      recommendationRate,
      featureRatings,
      bugsBySeverity,
      bugsByStatus,
      topIssues,
      topPraises,
      deviceBreakdown,
    };
  }

  async updateSessionNotes(notes: string): Promise<void> {
    if (this.currentSession) {
      this.currentSession.sessionNotes = notes;
      await this.saveSession(this.currentSession);
    }
  }

  private async saveSession(session: UATSession): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      const index = sessions.findIndex(s => s.id === session.id);
      if (index >= 0) {
        sessions[index] = session;
      } else {
        sessions.push(session);
      }
      await AsyncStorage.setItem(UAT_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('[UATService] Failed to save session:', error);
    }
  }

  private async getAllSessions(): Promise<UATSession[]> {
    try {
      const data = await AsyncStorage.getItem(UAT_SESSIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[UATService] Failed to get sessions:', error);
      return [];
    }
  }

  private async saveFeedback(feedback: UATFeedbackItem): Promise<void> {
    try {
      const items = await this.getAllFeedback();
      items.push(feedback);
      await AsyncStorage.setItem(UAT_FEEDBACK_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('[UATService] Failed to save feedback:', error);
    }
  }

  private async getAllFeedback(): Promise<UATFeedbackItem[]> {
    try {
      const data = await AsyncStorage.getItem(UAT_FEEDBACK_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[UATService] Failed to get feedback:', error);
      return [];
    }
  }

  private async saveBug(bug: UATBugReport): Promise<void> {
    try {
      const bugs = await this.getAllBugs();
      bugs.push(bug);
      await AsyncStorage.setItem(UAT_BUGS_KEY, JSON.stringify(bugs));
    } catch (error) {
      console.error('[UATService] Failed to save bug:', error);
    }
  }

  private async getAllBugs(): Promise<UATBugReport[]> {
    try {
      const data = await AsyncStorage.getItem(UAT_BUGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[UATService] Failed to get bugs:', error);
      return [];
    }
  }

  private async saveRating(rating: UATFeatureRating): Promise<void> {
    try {
      const ratings = await this.getAllRatings();
      ratings.push(rating);
      await AsyncStorage.setItem(UAT_RATINGS_KEY, JSON.stringify(ratings));
    } catch (error) {
      console.error('[UATService] Failed to save rating:', error);
    }
  }

  private async getAllRatings(): Promise<UATFeatureRating[]> {
    try {
      const data = await AsyncStorage.getItem(UAT_RATINGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[UATService] Failed to get ratings:', error);
      return [];
    }
  }

  private async saveTestResult(result: UATTestResult): Promise<void> {
    try {
      const results = await this.getAllTestResults();
      results.push(result);
      await AsyncStorage.setItem(UAT_TEST_RESULTS_KEY, JSON.stringify(results));
    } catch (error) {
      console.error('[UATService] Failed to save test result:', error);
    }
  }

  private async getAllTestResults(): Promise<UATTestResult[]> {
    try {
      const data = await AsyncStorage.getItem(UAT_TEST_RESULTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[UATService] Failed to get test results:', error);
      return [];
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        UAT_SESSIONS_KEY,
        UAT_FEEDBACK_KEY,
        UAT_BUGS_KEY,
        UAT_RATINGS_KEY,
        UAT_TEST_RESULTS_KEY,
      ]);
      this.currentSession = null;
      console.log('[UATService] All data cleared');
    } catch (error) {
      console.error('[UATService] Failed to clear data:', error);
    }
  }
}

export const uatService = new UATService();
export default uatService;
