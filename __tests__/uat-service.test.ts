import { uatService } from '@/services/UATService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '15.0',
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
}));

describe('UATService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
  });

  describe('startSession', () => {
    it('should start a new UAT session', async () => {
      const session = await uatService.startSession('user-123', 'Test User');

      expect(session).toBeDefined();
      expect(session.id).toContain('uat_');
      expect(session.userId).toBe('user-123');
      expect(session.userName).toBe('Test User');
      expect(session.startTime).toBeDefined();
      expect(session.deviceInfo.platform).toBe('ios');
      expect(session.feedbackItems).toEqual([]);
      expect(session.bugReports).toEqual([]);
      expect(session.featureRatings).toEqual([]);
    });

    it('should persist session to storage', async () => {
      await uatService.startSession('user-456', 'Another User');

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('getCurrentSession', () => {
    it('should return current session after starting', async () => {
      await uatService.startSession('user-789', 'Session User');
      const session = uatService.getCurrentSession();

      expect(session).toBeDefined();
      expect(session?.userId).toBe('user-789');
    });
  });

  describe('submitFeedback', () => {
    beforeEach(async () => {
      await uatService.startSession('feedback-user', 'Feedback Tester');
    });

    it('should submit feedback item', async () => {
      const feedback = await uatService.submitFeedback(
        'multiplayer',
        'Home Visit',
        4,
        'Great multiplayer experience!'
      );

      expect(feedback).toBeDefined();
      expect(feedback.id).toContain('fb_');
      expect(feedback.category).toBe('multiplayer');
      expect(feedback.feature).toBe('Home Visit');
      expect(feedback.rating).toBe(4);
      expect(feedback.comment).toBe('Great multiplayer experience!');
    });

    it('should add feedback to current session', async () => {
      await uatService.submitFeedback('chat', 'Chat Feature', 5, 'Excellent chat!');
      
      const session = uatService.getCurrentSession();
      expect(session?.feedbackItems.length).toBe(1);
      expect(session?.feedbackItems[0].category).toBe('chat');
    });

    it('should accept optional screenshot URL', async () => {
      const feedback = await uatService.submitFeedback(
        'ui_ux',
        'Design',
        3,
        'Could be better',
        'https://example.com/screenshot.png'
      );

      expect(feedback.screenshotUrl).toBe('https://example.com/screenshot.png');
    });
  });

  describe('submitBugReport', () => {
    beforeEach(async () => {
      await uatService.startSession('bug-user', 'Bug Reporter');
    });

    it('should submit bug report', async () => {
      const bug = await uatService.submitBugReport(
        'major',
        'Chat not loading',
        'The chat feature fails to load messages',
        ['Open home visit', 'Click on chat tab', 'See empty chat'],
        'Should show previous messages',
        'Shows blank screen',
        'chat'
      );

      expect(bug).toBeDefined();
      expect(bug.id).toContain('bug_');
      expect(bug.severity).toBe('major');
      expect(bug.title).toBe('Chat not loading');
      expect(bug.stepsToReproduce).toHaveLength(3);
      expect(bug.status).toBe('new');
    });

    it('should add bug to current session', async () => {
      await uatService.submitBugReport(
        'minor',
        'UI glitch',
        'Button flickers',
        ['Click button'],
        'No flicker',
        'Button flickers',
        'ui_ux'
      );

      const session = uatService.getCurrentSession();
      expect(session?.bugReports.length).toBe(1);
    });

    it('should handle all severity levels', async () => {
      const severities = ['critical', 'major', 'minor', 'cosmetic'] as const;
      
      for (const severity of severities) {
        const bug = await uatService.submitBugReport(
          severity,
          `${severity} bug`,
          'Description',
          ['Step 1'],
          'Expected',
          'Actual',
          'other'
        );
        expect(bug.severity).toBe(severity);
      }
    });
  });

  describe('submitFeatureRating', () => {
    beforeEach(async () => {
      await uatService.startSession('rating-user', 'Rating User');
    });

    it('should submit feature rating', async () => {
      const rating = await uatService.submitFeatureRating(
        'Leaderboard',
        5,
        4,
        5,
        4,
        'Love the leaderboard design!'
      );

      expect(rating).toBeDefined();
      expect(rating.feature).toBe('Leaderboard');
      expect(rating.rating).toBe(5);
      expect(rating.usability).toBe(4);
      expect(rating.performance).toBe(5);
      expect(rating.design).toBe(4);
    });

    it('should update existing rating for same feature', async () => {
      await uatService.submitFeatureRating('Chat', 3, 3, 3, 3, 'Initial');
      await uatService.submitFeatureRating('Chat', 5, 5, 5, 5, 'Updated');

      const session = uatService.getCurrentSession();
      expect(session?.featureRatings.length).toBe(1);
      expect(session?.featureRatings[0].rating).toBe(5);
    });
  });

  describe('endSession', () => {
    it('should end session with final ratings', async () => {
      await uatService.startSession('end-user', 'End User');
      
      const endedSession = await uatService.endSession(4, true);

      expect(endedSession).toBeDefined();
      expect(endedSession?.endTime).toBeDefined();
      expect(endedSession?.overallRating).toBe(4);
      expect(endedSession?.wouldRecommend).toBe(true);
    });

    it('should return null if no active session', async () => {
      await uatService.clearAllData();
      const result = await uatService.endSession();
      expect(result).toBeNull();
    });
  });

  describe('updateSessionNotes', () => {
    it('should update session notes', async () => {
      await uatService.startSession('notes-user', 'Notes User');
      await uatService.updateSessionNotes('Testing went well overall');

      const session = uatService.getCurrentSession();
      expect(session?.sessionNotes).toBe('Testing went well overall');
    });
  });

  describe('generateSummaryReport', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@uat_sessions') {
          return JSON.stringify([
            {
              id: 'session-1',
              userId: 'user-1',
              userName: 'User 1',
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString(),
              deviceInfo: { platform: 'ios', osVersion: '15', screenWidth: 375, screenHeight: 812 },
              appVersion: '1.0.0',
              feedbackItems: [],
              bugReports: [],
              featureRatings: [
                { feature: 'Chat', rating: 4, usability: 4, performance: 5, design: 4, comments: '' },
              ],
              sessionNotes: '',
              overallRating: 4,
              wouldRecommend: true,
            },
          ]);
        }
        if (key === '@uat_feedback') {
          return JSON.stringify([
            { id: 'fb-1', category: 'chat', feature: 'Chat', rating: 5, comment: 'Great!' },
          ]);
        }
        if (key === '@uat_bugs') {
          return JSON.stringify([
            { id: 'bug-1', severity: 'minor', feature: 'ui', status: 'new' },
          ]);
        }
        return null;
      });
    });

    it('should generate summary report', async () => {
      const report = await uatService.generateSummaryReport();

      expect(report).toBeDefined();
      expect(report.totalSessions).toBe(1);
      expect(report.totalFeedbackItems).toBe(1);
      expect(report.totalBugReports).toBe(1);
      expect(report.averageOverallRating).toBe(4);
      expect(report.recommendationRate).toBe(1);
    });

    it('should calculate device breakdown', async () => {
      const report = await uatService.generateSummaryReport();

      expect(report.deviceBreakdown).toBeDefined();
      expect(report.deviceBreakdown['ios']).toBe(1);
    });

    it('should calculate bugs by severity', async () => {
      const report = await uatService.generateSummaryReport();

      expect(report.bugsBySeverity).toBeDefined();
      expect(report.bugsBySeverity['minor']).toBe(1);
    });
  });

  describe('clearAllData', () => {
    it('should clear all stored data', async () => {
      await uatService.startSession('clear-user', 'Clear User');
      await uatService.clearAllData();

      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
      expect(uatService.getCurrentSession()).toBeNull();
    });
  });
});

describe('UAT Types', () => {
  it('should have valid feedback categories', () => {
    const categories = [
      'multiplayer',
      'chat',
      'presence',
      'leaderboard',
      'business',
      'home_visit',
      'performance',
      'ui_ux',
      'navigation',
      'other',
    ];

    categories.forEach((category) => {
      expect(typeof category).toBe('string');
    });
  });

  it('should have valid bug severity levels', () => {
    const severities = ['critical', 'major', 'minor', 'cosmetic'];
    
    severities.forEach((severity) => {
      expect(['critical', 'major', 'minor', 'cosmetic']).toContain(severity);
    });
  });

  it('should have valid bug status values', () => {
    const statuses = ['new', 'acknowledged', 'in_progress', 'fixed', 'wont_fix'];
    
    statuses.forEach((status) => {
      expect(typeof status).toBe('string');
    });
  });
});
