export interface LoadTestConfig {
  testId: string;
  testName: string;
  concurrentUsers: number;
  durationMs: number;
  rampUpMs: number;
  targetHomeId: string;
  messageIntervalMs?: number;
  positionUpdateIntervalMs?: number;
  enableChat?: boolean;
  enablePositionUpdates?: boolean;
  enablePresence?: boolean;
}

export interface VirtualUser {
  id: string;
  username: string;
  isConnected: boolean;
  joinedAt?: number;
  messagessSent: number;
  messagesReceived: number;
  positionUpdates: number;
  errors: string[];
  latencies: number[];
}

export interface LoadTestMetrics {
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalPositionUpdates: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  messagesPerSecond: number;
  connectionErrorRate: number;
  messageDeliveryRate: number;
  peakConcurrentUsers: number;
  totalErrors: number;
  errorsByType: Record<string, number>;
}

export interface LoadTestResult {
  testId: string;
  testName: string;
  config: LoadTestConfig;
  metrics: LoadTestMetrics;
  startTime: string;
  endTime: string;
  durationMs: number;
  status: 'passed' | 'failed' | 'partial';
  users: VirtualUser[];
  timeline: LoadTestTimelineEntry[];
  summary: string;
  recommendations: string[];
}

export interface LoadTestTimelineEntry {
  timestamp: number;
  event: 'user_joined' | 'user_left' | 'message_sent' | 'message_received' | 'position_update' | 'error' | 'checkpoint';
  userId?: string;
  details?: string;
  metrics?: Partial<LoadTestMetrics>;
}

export interface LoadTestScenario {
  id: string;
  name: string;
  description: string;
  config: Partial<LoadTestConfig>;
  expectedMetrics: {
    minConnectionSuccessRate: number;
    maxAverageLatencyMs: number;
    minMessageDeliveryRate: number;
  };
}

export interface ConnectionStabilityResult {
  testDurationMs: number;
  disconnections: number;
  reconnections: number;
  avgTimeToReconnectMs: number;
  maxDisconnectionDurationMs: number;
  stabilityScore: number;
}

export interface MessageThroughputResult {
  totalMessages: number;
  messagesPerSecond: number;
  peakMessagesPerSecond: number;
  droppedMessages: number;
  averageDeliveryTimeMs: number;
  throughputScore: number;
}

export type LoadTestStatus = 'idle' | 'preparing' | 'running' | 'completing' | 'completed' | 'error';

export interface LoadTestProgress {
  status: LoadTestStatus;
  currentUsers: number;
  targetUsers: number;
  elapsedMs: number;
  totalMs: number;
  messagesProcessed: number;
  errorsCount: number;
  currentMetrics: Partial<LoadTestMetrics>;
}
