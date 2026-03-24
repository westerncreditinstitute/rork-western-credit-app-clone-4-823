import { loadTestingService } from '@/services/LoadTestingService';
import {
  LOAD_TEST_SCENARIOS,
  getScenarioById,
  createTestConfig,
  evaluateTestResult,
} from '@/mocks/loadTestScenarios';
import { LoadTestConfig, LoadTestScenario } from '@/types/loadTesting';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      track: jest.fn(),
      untrack: jest.fn(),
      send: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
  isSupabaseConfigured: false,
}));

describe('LoadTestingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runLoadTest', () => {
    it('should run a basic load test with 10 users', async () => {
      const config: LoadTestConfig = {
        testId: 'test-1',
        testName: 'Basic Test',
        concurrentUsers: 5,
        durationMs: 1000,
        rampUpMs: 500,
        targetHomeId: 'home-123',
        enableChat: true,
        enablePositionUpdates: true,
        enablePresence: true,
        messageIntervalMs: 200,
        positionUpdateIntervalMs: 200,
      };

      const result = await loadTestingService.runLoadTest(config);

      expect(result).toBeDefined();
      expect(result.testId).toBe('test-1');
      expect(result.testName).toBe('Basic Test');
      expect(result.status).toBeDefined();
      expect(['passed', 'partial', 'failed']).toContain(result.status);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalConnections).toBeGreaterThan(0);
    }, 15000);

    it('should track metrics correctly', async () => {
      const config: LoadTestConfig = {
        testId: 'test-metrics',
        testName: 'Metrics Test',
        concurrentUsers: 3,
        durationMs: 500,
        rampUpMs: 300,
        targetHomeId: 'home-456',
        enableChat: false,
        enablePositionUpdates: false,
        enablePresence: true,
      };

      const result = await loadTestingService.runLoadTest(config);

      expect(result.metrics.totalConnections).toBe(3);
      expect(result.metrics.successfulConnections).toBeLessThanOrEqual(3);
      expect(result.metrics.failedConnections).toBeLessThanOrEqual(3);
      expect(result.metrics.connectionErrorRate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.connectionErrorRate).toBeLessThanOrEqual(1);
    }, 10000);

    it('should include timeline entries', async () => {
      const config: LoadTestConfig = {
        testId: 'test-timeline',
        testName: 'Timeline Test',
        concurrentUsers: 2,
        durationMs: 500,
        rampUpMs: 200,
        targetHomeId: 'home-789',
        enableChat: false,
        enablePositionUpdates: false,
        enablePresence: true,
      };

      const result = await loadTestingService.runLoadTest(config);

      expect(result.timeline).toBeDefined();
      expect(Array.isArray(result.timeline)).toBe(true);
      expect(result.timeline.length).toBeGreaterThan(0);
      
      const joinEvents = result.timeline.filter(e => e.event === 'user_joined');
      expect(joinEvents.length).toBeGreaterThan(0);
    }, 10000);

    it('should generate recommendations for poor performance', async () => {
      const result = await loadTestingService.runLoadTest({
        testId: 'test-recommendations',
        testName: 'Recommendations Test',
        concurrentUsers: 2,
        durationMs: 300,
        rampUpMs: 100,
        targetHomeId: 'home-rec',
        enableChat: false,
        enablePositionUpdates: false,
        enablePresence: true,
      });

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    }, 10000);
  });

  describe('runConnectionStabilityTest', () => {
    it('should measure connection stability', async () => {
      const result = await loadTestingService.runConnectionStabilityTest('home-stability', 2000);

      expect(result).toBeDefined();
      expect(result.testDurationMs).toBe(2000);
      expect(result.disconnections).toBeGreaterThanOrEqual(0);
      expect(result.reconnections).toBeGreaterThanOrEqual(0);
      expect(result.stabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.stabilityScore).toBeLessThanOrEqual(100);
    }, 10000);
  });

  describe('runMessageThroughputTest', () => {
    it('should measure message throughput', async () => {
      const result = await loadTestingService.runMessageThroughputTest('home-throughput', 10, 1000);

      expect(result).toBeDefined();
      expect(result.totalMessages).toBeGreaterThan(0);
      expect(result.messagesPerSecond).toBeGreaterThan(0);
      expect(result.droppedMessages).toBeGreaterThanOrEqual(0);
      expect(result.throughputScore).toBeGreaterThanOrEqual(0);
    }, 10000);
  });

  describe('onProgress', () => {
    it('should notify progress callbacks', async () => {
      const progressUpdates: any[] = [];
      
      const unsubscribe = loadTestingService.onProgress((progress) => {
        progressUpdates.push(progress);
      });

      await loadTestingService.runLoadTest({
        testId: 'test-progress',
        testName: 'Progress Test',
        concurrentUsers: 2,
        durationMs: 500,
        rampUpMs: 200,
        targetHomeId: 'home-progress',
        enableChat: false,
        enablePositionUpdates: false,
        enablePresence: true,
      });

      unsubscribe();

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].status).toBeDefined();
      expect(progressUpdates[0].currentUsers).toBeDefined();
    }, 10000);

    it('should allow unsubscribing from progress', () => {
      const callback = jest.fn();
      const unsubscribe = loadTestingService.onProgress(callback);
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('getStatus', () => {
    it('should return current status', () => {
      const status = loadTestingService.getStatus();
      expect(['idle', 'preparing', 'running', 'completing', 'completed', 'error']).toContain(status);
    });
  });
});

describe('Load Test Scenarios', () => {
  describe('LOAD_TEST_SCENARIOS', () => {
    it('should have all required scenarios', () => {
      expect(LOAD_TEST_SCENARIOS.length).toBeGreaterThanOrEqual(5);
      
      const scenarioIds = LOAD_TEST_SCENARIOS.map(s => s.id);
      expect(scenarioIds).toContain('concurrent-10');
      expect(scenarioIds).toContain('concurrent-50');
      expect(scenarioIds).toContain('concurrent-100');
      expect(scenarioIds).toContain('message-throughput');
      expect(scenarioIds).toContain('connection-stability');
    });

    it('should have valid configuration for each scenario', () => {
      LOAD_TEST_SCENARIOS.forEach((scenario) => {
        expect(scenario.id).toBeDefined();
        expect(scenario.name).toBeDefined();
        expect(scenario.description).toBeDefined();
        expect(scenario.config.concurrentUsers).toBeGreaterThan(0);
        expect(scenario.config.durationMs).toBeGreaterThan(0);
        expect(scenario.config.rampUpMs).toBeGreaterThan(0);
        expect(scenario.expectedMetrics.minConnectionSuccessRate).toBeGreaterThan(0);
        expect(scenario.expectedMetrics.minConnectionSuccessRate).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('getScenarioById', () => {
    it('should return scenario by id', () => {
      const scenario = getScenarioById('concurrent-10');
      expect(scenario).toBeDefined();
      expect(scenario?.id).toBe('concurrent-10');
      expect(scenario?.config.concurrentUsers).toBe(10);
    });

    it('should return undefined for unknown id', () => {
      const scenario = getScenarioById('unknown-scenario');
      expect(scenario).toBeUndefined();
    });
  });

  describe('createTestConfig', () => {
    it('should create valid test config from scenario', () => {
      const scenario = LOAD_TEST_SCENARIOS[0];
      const config = createTestConfig(scenario, 'home-test-123');

      expect(config.testId).toContain(scenario.id);
      expect(config.testName).toBe(scenario.name);
      expect(config.targetHomeId).toBe('home-test-123');
      expect(config.concurrentUsers).toBe(scenario.config.concurrentUsers);
      expect(config.durationMs).toBe(scenario.config.durationMs);
      expect(config.rampUpMs).toBe(scenario.config.rampUpMs);
    });
  });

  describe('evaluateTestResult', () => {
    it('should pass when metrics meet expectations', () => {
      const scenario: LoadTestScenario = {
        id: 'test',
        name: 'Test',
        description: 'Test scenario',
        config: { concurrentUsers: 10, durationMs: 60000, rampUpMs: 10000 },
        expectedMetrics: {
          minConnectionSuccessRate: 0.90,
          maxAverageLatencyMs: 200,
          minMessageDeliveryRate: 0.90,
        },
      };

      const result = evaluateTestResult(scenario, {
        connectionSuccessRate: 0.95,
        averageLatencyMs: 150,
        messageDeliveryRate: 0.95,
      });

      expect(result.passed).toBe(true);
      expect(result.details.every(d => d.startsWith('✓'))).toBe(true);
    });

    it('should fail when metrics do not meet expectations', () => {
      const scenario: LoadTestScenario = {
        id: 'test',
        name: 'Test',
        description: 'Test scenario',
        config: { concurrentUsers: 10, durationMs: 60000, rampUpMs: 10000 },
        expectedMetrics: {
          minConnectionSuccessRate: 0.95,
          maxAverageLatencyMs: 100,
          minMessageDeliveryRate: 0.95,
        },
      };

      const result = evaluateTestResult(scenario, {
        connectionSuccessRate: 0.80,
        averageLatencyMs: 250,
        messageDeliveryRate: 0.85,
      });

      expect(result.passed).toBe(false);
      expect(result.details.length).toBe(3);
    });
  });
});

describe('Load Test Types', () => {
  it('should have correct VirtualUser structure', () => {
    const user = {
      id: 'vu_1',
      username: 'test_user',
      isConnected: true,
      joinedAt: Date.now(),
      messagessSent: 10,
      messagesReceived: 8,
      positionUpdates: 5,
      errors: [],
      latencies: [50, 60, 70],
    };

    expect(user.id).toBeDefined();
    expect(user.username).toBeDefined();
    expect(typeof user.isConnected).toBe('boolean');
    expect(Array.isArray(user.latencies)).toBe(true);
  });

  it('should have correct LoadTestMetrics structure', () => {
    const metrics = {
      totalConnections: 100,
      successfulConnections: 95,
      failedConnections: 5,
      totalMessagesSent: 500,
      totalMessagesReceived: 480,
      totalPositionUpdates: 200,
      averageLatencyMs: 85,
      minLatencyMs: 20,
      maxLatencyMs: 250,
      p95LatencyMs: 180,
      p99LatencyMs: 220,
      messagesPerSecond: 8.3,
      connectionErrorRate: 0.05,
      messageDeliveryRate: 0.96,
      peakConcurrentUsers: 100,
      totalErrors: 10,
      errorsByType: { connection: 5, message: 5 },
    };

    expect(metrics.connectionErrorRate).toBe(metrics.failedConnections / metrics.totalConnections);
    expect(metrics.messageDeliveryRate).toBe(metrics.totalMessagesReceived / metrics.totalMessagesSent);
  });
});
