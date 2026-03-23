export interface MarketplaceLoadTestConfig {
  testId: string;
  testName: string;
  concurrentUsers: number;
  durationMs: number;
  rampUpMs: number;
  listingsCount: number;
  purchasesPerMinute: number;
  bidsPerMinute: number;
  searchQueriesPerMinute: number;
  enableAuctions: boolean;
  enableSearch: boolean;
  enableFilters: boolean;
}

export interface MarketplaceVirtualUser {
  id: string;
  username: string;
  isActive: boolean;
  balance: number;
  purchasesMade: number;
  bidsMade: number;
  searchesMade: number;
  listingsViewed: number;
  errors: string[];
  latencies: number[];
}

export interface MarketplaceLoadTestMetrics {
  totalListings: number;
  totalPurchases: number;
  successfulPurchases: number;
  failedPurchases: number;
  totalBids: number;
  successfulBids: number;
  failedBids: number;
  totalSearches: number;
  successfulSearches: number;
  averageSearchLatencyMs: number;
  averagePurchaseLatencyMs: number;
  averageBidLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  purchasesPerSecond: number;
  bidsPerSecond: number;
  searchesPerSecond: number;
  errorRate: number;
  peakConcurrentUsers: number;
  totalErrors: number;
  errorsByType: Record<string, number>;
  databaseQueryTime: number;
  cacheHitRate: number;
}

export interface MarketplaceLoadTestResult {
  testId: string;
  testName: string;
  config: MarketplaceLoadTestConfig;
  metrics: MarketplaceLoadTestMetrics;
  startTime: string;
  endTime: string;
  durationMs: number;
  status: 'passed' | 'failed' | 'partial';
  users: MarketplaceVirtualUser[];
  timeline: MarketplaceTimelineEntry[];
  summary: string;
  recommendations: string[];
  queryPerformance: QueryPerformanceMetric[];
}

export interface MarketplaceTimelineEntry {
  timestamp: number;
  event: 'user_joined' | 'user_left' | 'purchase' | 'bid' | 'search' | 'listing_created' | 'error' | 'checkpoint';
  userId?: string;
  details?: string;
  latencyMs?: number;
  metrics?: Partial<MarketplaceLoadTestMetrics>;
}

export interface MarketplaceLoadTestScenario {
  id: string;
  name: string;
  description: string;
  config: Partial<MarketplaceLoadTestConfig>;
  expectedMetrics: {
    minPurchaseSuccessRate: number;
    maxAverageLatencyMs: number;
    minSearchSuccessRate: number;
    maxPurchaseLatencyMs: number;
    maxSearchLatencyMs: number;
  };
}

export interface QueryPerformanceMetric {
  queryType: 'listing' | 'purchase' | 'bid' | 'search' | 'filter';
  queryName: string;
  executionCount: number;
  avgExecutionTimeMs: number;
  minExecutionTimeMs: number;
  maxExecutionTimeMs: number;
  p95ExecutionTimeMs: number;
  slowQueryCount: number;
}

export type MarketplaceLoadTestStatus = 'idle' | 'preparing' | 'seeding' | 'running' | 'completing' | 'completed' | 'error';

export interface MarketplaceLoadTestProgress {
  status: MarketplaceLoadTestStatus;
  currentUsers: number;
  targetUsers: number;
  elapsedMs: number;
  totalMs: number;
  purchasesProcessed: number;
  bidsProcessed: number;
  searchesProcessed: number;
  errorsCount: number;
  currentMetrics: Partial<MarketplaceLoadTestMetrics>;
}

export interface RaceConditionTestResult {
  testName: string;
  totalAttempts: number;
  successfulAttempts: number;
  conflictsDetected: number;
  dataInconsistencies: number;
  avgResolutionTimeMs: number;
  passed: boolean;
  details: string[];
}

export interface FrontendPerformanceMetrics {
  pageLoadTimeMs: number;
  firstContentfulPaintMs: number;
  timeToInteractiveMs: number;
  listRenderTimeMs: number;
  scrollPerformanceFps: number;
  memoryUsageMb: number;
  rerenderCount: number;
  animationJankCount: number;
}

export interface PerformanceTarget {
  name: string;
  target: number;
  actual: number;
  unit: string;
  passed: boolean;
}
