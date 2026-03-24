import { LoadTestScenario, LoadTestConfig } from '@/types/loadTesting';

export const LOAD_TEST_SCENARIOS: LoadTestScenario[] = [
  {
    id: 'concurrent-10',
    name: '10 Concurrent Users',
    description: 'Basic load test with 10 simultaneous users in a home visit',
    config: {
      concurrentUsers: 10,
      durationMs: 60000,
      rampUpMs: 10000,
      messageIntervalMs: 2000,
      positionUpdateIntervalMs: 1000,
      enableChat: true,
      enablePositionUpdates: true,
      enablePresence: true,
    },
    expectedMetrics: {
      minConnectionSuccessRate: 0.98,
      maxAverageLatencyMs: 150,
      minMessageDeliveryRate: 0.98,
    },
  },
  {
    id: 'concurrent-50',
    name: '50 Concurrent Users',
    description: 'Medium load test with 50 simultaneous users testing scalability',
    config: {
      concurrentUsers: 50,
      durationMs: 120000,
      rampUpMs: 30000,
      messageIntervalMs: 3000,
      positionUpdateIntervalMs: 2000,
      enableChat: true,
      enablePositionUpdates: true,
      enablePresence: true,
    },
    expectedMetrics: {
      minConnectionSuccessRate: 0.95,
      maxAverageLatencyMs: 250,
      minMessageDeliveryRate: 0.95,
    },
  },
  {
    id: 'concurrent-100',
    name: '100 Concurrent Users',
    description: 'High load test with 100 simultaneous users for stress testing',
    config: {
      concurrentUsers: 100,
      durationMs: 180000,
      rampUpMs: 60000,
      messageIntervalMs: 5000,
      positionUpdateIntervalMs: 3000,
      enableChat: true,
      enablePositionUpdates: true,
      enablePresence: true,
    },
    expectedMetrics: {
      minConnectionSuccessRate: 0.90,
      maxAverageLatencyMs: 400,
      minMessageDeliveryRate: 0.90,
    },
  },
  {
    id: 'message-throughput',
    name: 'Message Throughput Test',
    description: 'Tests maximum message handling capacity with high frequency messaging',
    config: {
      concurrentUsers: 20,
      durationMs: 60000,
      rampUpMs: 5000,
      messageIntervalMs: 100,
      positionUpdateIntervalMs: 5000,
      enableChat: true,
      enablePositionUpdates: false,
      enablePresence: true,
    },
    expectedMetrics: {
      minConnectionSuccessRate: 0.98,
      maxAverageLatencyMs: 200,
      minMessageDeliveryRate: 0.95,
    },
  },
  {
    id: 'connection-stability',
    name: 'Connection Stability Test',
    description: 'Long-running test to verify connection stability over time',
    config: {
      concurrentUsers: 25,
      durationMs: 300000,
      rampUpMs: 15000,
      messageIntervalMs: 10000,
      positionUpdateIntervalMs: 5000,
      enableChat: true,
      enablePositionUpdates: true,
      enablePresence: true,
    },
    expectedMetrics: {
      minConnectionSuccessRate: 0.99,
      maxAverageLatencyMs: 150,
      minMessageDeliveryRate: 0.99,
    },
  },
  {
    id: 'burst-load',
    name: 'Burst Load Test',
    description: 'Tests system behavior under sudden spike in users',
    config: {
      concurrentUsers: 50,
      durationMs: 30000,
      rampUpMs: 3000,
      messageIntervalMs: 1000,
      positionUpdateIntervalMs: 500,
      enableChat: true,
      enablePositionUpdates: true,
      enablePresence: true,
    },
    expectedMetrics: {
      minConnectionSuccessRate: 0.85,
      maxAverageLatencyMs: 500,
      minMessageDeliveryRate: 0.85,
    },
  },
  {
    id: 'presence-only',
    name: 'Presence Only Test',
    description: 'Tests presence tracking with many users but minimal messaging',
    config: {
      concurrentUsers: 75,
      durationMs: 120000,
      rampUpMs: 30000,
      messageIntervalMs: 30000,
      positionUpdateIntervalMs: 2000,
      enableChat: false,
      enablePositionUpdates: true,
      enablePresence: true,
    },
    expectedMetrics: {
      minConnectionSuccessRate: 0.95,
      maxAverageLatencyMs: 100,
      minMessageDeliveryRate: 0.98,
    },
  },
];

export function getScenarioById(id: string): LoadTestScenario | undefined {
  return LOAD_TEST_SCENARIOS.find(s => s.id === id);
}

export function createTestConfig(
  scenario: LoadTestScenario,
  targetHomeId: string
): LoadTestConfig {
  return {
    testId: `test_${Date.now()}_${scenario.id}`,
    testName: scenario.name,
    targetHomeId,
    concurrentUsers: scenario.config.concurrentUsers || 10,
    durationMs: scenario.config.durationMs || 60000,
    rampUpMs: scenario.config.rampUpMs || 10000,
    messageIntervalMs: scenario.config.messageIntervalMs,
    positionUpdateIntervalMs: scenario.config.positionUpdateIntervalMs,
    enableChat: scenario.config.enableChat,
    enablePositionUpdates: scenario.config.enablePositionUpdates,
    enablePresence: scenario.config.enablePresence,
  };
}

export function evaluateTestResult(
  scenario: LoadTestScenario,
  metrics: {
    connectionSuccessRate: number;
    averageLatencyMs: number;
    messageDeliveryRate: number;
  }
): { passed: boolean; details: string[] } {
  const details: string[] = [];
  let passed = true;

  if (metrics.connectionSuccessRate < scenario.expectedMetrics.minConnectionSuccessRate) {
    passed = false;
    details.push(
      `Connection success rate ${(metrics.connectionSuccessRate * 100).toFixed(1)}% ` +
      `below expected ${(scenario.expectedMetrics.minConnectionSuccessRate * 100).toFixed(1)}%`
    );
  } else {
    details.push(`✓ Connection success rate: ${(metrics.connectionSuccessRate * 100).toFixed(1)}%`);
  }

  if (metrics.averageLatencyMs > scenario.expectedMetrics.maxAverageLatencyMs) {
    passed = false;
    details.push(
      `Average latency ${metrics.averageLatencyMs.toFixed(0)}ms ` +
      `exceeds expected ${scenario.expectedMetrics.maxAverageLatencyMs}ms`
    );
  } else {
    details.push(`✓ Average latency: ${metrics.averageLatencyMs.toFixed(0)}ms`);
  }

  if (metrics.messageDeliveryRate < scenario.expectedMetrics.minMessageDeliveryRate) {
    passed = false;
    details.push(
      `Message delivery rate ${(metrics.messageDeliveryRate * 100).toFixed(1)}% ` +
      `below expected ${(scenario.expectedMetrics.minMessageDeliveryRate * 100).toFixed(1)}%`
    );
  } else {
    details.push(`✓ Message delivery rate: ${(metrics.messageDeliveryRate * 100).toFixed(1)}%`);
  }

  return { passed, details };
}
