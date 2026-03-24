import { MarketplaceLoadTestScenario, MarketplaceLoadTestConfig, PerformanceTarget } from '@/types/marketplaceLoadTesting';

export const MARKETPLACE_LOAD_TEST_SCENARIOS: MarketplaceLoadTestScenario[] = [
  {
    id: 'browse-1000-listings',
    name: '1,000 Listings Browse',
    description: 'Test marketplace browsing with 1,000 listings and 10 concurrent users',
    config: {
      concurrentUsers: 10,
      durationMs: 60000,
      rampUpMs: 10000,
      listingsCount: 1000,
      purchasesPerMinute: 0,
      bidsPerMinute: 0,
      searchQueriesPerMinute: 60,
      enableAuctions: false,
      enableSearch: true,
      enableFilters: true,
    },
    expectedMetrics: {
      minPurchaseSuccessRate: 0.95,
      maxAverageLatencyMs: 2000,
      minSearchSuccessRate: 0.98,
      maxPurchaseLatencyMs: 1000,
      maxSearchLatencyMs: 500,
    },
  },
  {
    id: 'purchase-processing',
    name: '100 Purchases/Minute',
    description: 'Simulate 100 purchases per minute to test transaction processing',
    config: {
      concurrentUsers: 20,
      durationMs: 120000,
      rampUpMs: 15000,
      listingsCount: 500,
      purchasesPerMinute: 100,
      bidsPerMinute: 0,
      searchQueriesPerMinute: 30,
      enableAuctions: false,
      enableSearch: true,
      enableFilters: false,
    },
    expectedMetrics: {
      minPurchaseSuccessRate: 0.95,
      maxAverageLatencyMs: 1000,
      minSearchSuccessRate: 0.95,
      maxPurchaseLatencyMs: 1000,
      maxSearchLatencyMs: 500,
    },
  },
  {
    id: 'auction-bidding',
    name: '10 Concurrent Bidders',
    description: 'Test auction bidding with 10 concurrent bidders and rapid bid placement',
    config: {
      concurrentUsers: 10,
      durationMs: 60000,
      rampUpMs: 5000,
      listingsCount: 100,
      purchasesPerMinute: 0,
      bidsPerMinute: 120,
      searchQueriesPerMinute: 20,
      enableAuctions: true,
      enableSearch: true,
      enableFilters: false,
    },
    expectedMetrics: {
      minPurchaseSuccessRate: 0.90,
      maxAverageLatencyMs: 500,
      minSearchSuccessRate: 0.95,
      maxPurchaseLatencyMs: 800,
      maxSearchLatencyMs: 400,
    },
  },
  {
    id: 'high-concurrency',
    name: '100 Concurrent Users',
    description: 'Stress test with 100 concurrent users browsing and purchasing',
    config: {
      concurrentUsers: 100,
      durationMs: 180000,
      rampUpMs: 60000,
      listingsCount: 2000,
      purchasesPerMinute: 50,
      bidsPerMinute: 30,
      searchQueriesPerMinute: 100,
      enableAuctions: true,
      enableSearch: true,
      enableFilters: true,
    },
    expectedMetrics: {
      minPurchaseSuccessRate: 0.90,
      maxAverageLatencyMs: 2000,
      minSearchSuccessRate: 0.90,
      maxPurchaseLatencyMs: 2000,
      maxSearchLatencyMs: 1000,
    },
  },
  {
    id: 'search-stress',
    name: 'Search Stress Test',
    description: 'High-frequency search queries with filters to test search performance',
    config: {
      concurrentUsers: 30,
      durationMs: 90000,
      rampUpMs: 15000,
      listingsCount: 5000,
      purchasesPerMinute: 10,
      bidsPerMinute: 0,
      searchQueriesPerMinute: 200,
      enableAuctions: false,
      enableSearch: true,
      enableFilters: true,
    },
    expectedMetrics: {
      minPurchaseSuccessRate: 0.95,
      maxAverageLatencyMs: 500,
      minSearchSuccessRate: 0.98,
      maxPurchaseLatencyMs: 1000,
      maxSearchLatencyMs: 500,
    },
  },
  {
    id: 'mixed-workload',
    name: 'Mixed Workload Test',
    description: 'Realistic mix of browsing, searching, purchasing, and bidding',
    config: {
      concurrentUsers: 50,
      durationMs: 300000,
      rampUpMs: 30000,
      listingsCount: 1500,
      purchasesPerMinute: 30,
      bidsPerMinute: 20,
      searchQueriesPerMinute: 80,
      enableAuctions: true,
      enableSearch: true,
      enableFilters: true,
    },
    expectedMetrics: {
      minPurchaseSuccessRate: 0.95,
      maxAverageLatencyMs: 1000,
      minSearchSuccessRate: 0.95,
      maxPurchaseLatencyMs: 1000,
      maxSearchLatencyMs: 500,
    },
  },
  {
    id: 'burst-traffic',
    name: 'Burst Traffic Test',
    description: 'Simulate sudden spike in traffic with rapid user influx',
    config: {
      concurrentUsers: 75,
      durationMs: 60000,
      rampUpMs: 5000,
      listingsCount: 1000,
      purchasesPerMinute: 80,
      bidsPerMinute: 40,
      searchQueriesPerMinute: 150,
      enableAuctions: true,
      enableSearch: true,
      enableFilters: true,
    },
    expectedMetrics: {
      minPurchaseSuccessRate: 0.85,
      maxAverageLatencyMs: 3000,
      minSearchSuccessRate: 0.85,
      maxPurchaseLatencyMs: 2000,
      maxSearchLatencyMs: 1000,
    },
  },
];

export const PERFORMANCE_TARGETS: PerformanceTarget[] = [
  { name: 'Marketplace Load Time', target: 2000, actual: 0, unit: 'ms', passed: false },
  { name: 'Purchase Processing', target: 1000, actual: 0, unit: 'ms', passed: false },
  { name: 'Search Response', target: 500, actual: 0, unit: 'ms', passed: false },
  { name: 'Concurrent Users', target: 100, actual: 0, unit: 'users', passed: false },
];

export function getMarketplaceScenarioById(id: string): MarketplaceLoadTestScenario | undefined {
  return MARKETPLACE_LOAD_TEST_SCENARIOS.find((s) => s.id === id);
}

export function createMarketplaceTestConfig(
  scenario: MarketplaceLoadTestScenario
): MarketplaceLoadTestConfig {
  return {
    testId: `mkt_test_${Date.now()}_${scenario.id}`,
    testName: scenario.name,
    concurrentUsers: scenario.config.concurrentUsers || 10,
    durationMs: scenario.config.durationMs || 60000,
    rampUpMs: scenario.config.rampUpMs || 10000,
    listingsCount: scenario.config.listingsCount || 100,
    purchasesPerMinute: scenario.config.purchasesPerMinute || 0,
    bidsPerMinute: scenario.config.bidsPerMinute || 0,
    searchQueriesPerMinute: scenario.config.searchQueriesPerMinute || 0,
    enableAuctions: scenario.config.enableAuctions || false,
    enableSearch: scenario.config.enableSearch || true,
    enableFilters: scenario.config.enableFilters || false,
  };
}

export function evaluateMarketplaceTestResult(
  scenario: MarketplaceLoadTestScenario,
  metrics: {
    purchaseSuccessRate: number;
    searchSuccessRate: number;
    averagePurchaseLatencyMs: number;
    averageSearchLatencyMs: number;
  }
): { passed: boolean; details: string[] } {
  const details: string[] = [];
  let passed = true;

  if (metrics.purchaseSuccessRate < scenario.expectedMetrics.minPurchaseSuccessRate) {
    passed = false;
    details.push(
      `✗ Purchase success rate ${(metrics.purchaseSuccessRate * 100).toFixed(1)}% ` +
        `below expected ${(scenario.expectedMetrics.minPurchaseSuccessRate * 100).toFixed(1)}%`
    );
  } else {
    details.push(`✓ Purchase success rate: ${(metrics.purchaseSuccessRate * 100).toFixed(1)}%`);
  }

  if (metrics.searchSuccessRate < scenario.expectedMetrics.minSearchSuccessRate) {
    passed = false;
    details.push(
      `✗ Search success rate ${(metrics.searchSuccessRate * 100).toFixed(1)}% ` +
        `below expected ${(scenario.expectedMetrics.minSearchSuccessRate * 100).toFixed(1)}%`
    );
  } else {
    details.push(`✓ Search success rate: ${(metrics.searchSuccessRate * 100).toFixed(1)}%`);
  }

  if (metrics.averagePurchaseLatencyMs > scenario.expectedMetrics.maxPurchaseLatencyMs) {
    passed = false;
    details.push(
      `✗ Avg purchase latency ${metrics.averagePurchaseLatencyMs.toFixed(0)}ms ` +
        `exceeds max ${scenario.expectedMetrics.maxPurchaseLatencyMs}ms`
    );
  } else {
    details.push(`✓ Avg purchase latency: ${metrics.averagePurchaseLatencyMs.toFixed(0)}ms`);
  }

  if (metrics.averageSearchLatencyMs > scenario.expectedMetrics.maxSearchLatencyMs) {
    passed = false;
    details.push(
      `✗ Avg search latency ${metrics.averageSearchLatencyMs.toFixed(0)}ms ` +
        `exceeds max ${scenario.expectedMetrics.maxSearchLatencyMs}ms`
    );
  } else {
    details.push(`✓ Avg search latency: ${metrics.averageSearchLatencyMs.toFixed(0)}ms`);
  }

  return { passed, details };
}

export function generatePerformanceReport(
  results: {
    scenarioId: string;
    passed: boolean;
    metrics: {
      purchaseSuccessRate: number;
      searchSuccessRate: number;
      averagePurchaseLatencyMs: number;
      averageSearchLatencyMs: number;
      peakConcurrentUsers: number;
    };
  }[]
): {
  overallScore: number;
  passedTests: number;
  totalTests: number;
  bottlenecks: string[];
  recommendations: string[];
} {
  const passedTests = results.filter((r) => r.passed).length;
  const totalTests = results.length;
  const overallScore = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  const bottlenecks: string[] = [];
  const recommendations: string[] = [];

  const avgPurchaseLatency =
    results.reduce((sum, r) => sum + r.metrics.averagePurchaseLatencyMs, 0) / results.length;
  const avgSearchLatency =
    results.reduce((sum, r) => sum + r.metrics.averageSearchLatencyMs, 0) / results.length;

  if (avgPurchaseLatency > 800) {
    bottlenecks.push('Purchase processing is slow');
    recommendations.push('Optimize database transactions for purchases');
    recommendations.push('Consider using database connection pooling');
  }

  if (avgSearchLatency > 400) {
    bottlenecks.push('Search queries are slow');
    recommendations.push('Add indexes on frequently searched columns');
    recommendations.push('Implement search result caching');
  }

  const lowSuccessRateTests = results.filter((r) => r.metrics.purchaseSuccessRate < 0.9);
  if (lowSuccessRateTests.length > 0) {
    bottlenecks.push('Transaction failures under load');
    recommendations.push('Implement retry logic for failed transactions');
    recommendations.push('Add circuit breaker pattern for external services');
  }

  return {
    overallScore,
    passedTests,
    totalTests,
    bottlenecks,
    recommendations,
  };
}
