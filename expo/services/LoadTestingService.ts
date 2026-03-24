import {
  LoadTestConfig,
  LoadTestResult,
  LoadTestMetrics,
  LoadTestProgress,
  LoadTestStatus,
  VirtualUser,
  LoadTestTimelineEntry,
  ConnectionStabilityResult,
  MessageThroughputResult,
} from '@/types/loadTesting';

type ProgressCallback = (progress: LoadTestProgress) => void;

class LoadTestingService {
  private virtualUsers: Map<string, VirtualUser> = new Map();
  private timeline: LoadTestTimelineEntry[] = [];
  private status: LoadTestStatus = 'idle';
  private progressCallbacks: ProgressCallback[] = [];
  private testStartTime: number = 0;
  private messageLatencies: number[] = [];
  private connectionAttempts: number = 0;
  private successfulConnections: number = 0;
  private failedConnections: number = 0;
  private totalMessagesSent: number = 0;
  private totalMessagesReceived: number = 0;
  private totalPositionUpdates: number = 0;
  private errors: { type: string; message: string; timestamp: number }[] = [];
  private intervalIds: ReturnType<typeof setInterval>[] = [];

  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    console.log('[LoadTestingService] Starting load test:', config.testName);
    
    this.resetState();
    this.status = 'preparing';
    this.testStartTime = Date.now();
    
    this.notifyProgress(config);

    try {
      this.status = 'running';
      
      await this.rampUpUsers(config);
      
      await this.runTestPhase(config);
      
      this.status = 'completing';
      await this.rampDownUsers();
      
      this.status = 'completed';
      
      const result = this.generateResult(config);
      console.log('[LoadTestingService] Load test completed:', result.status);
      
      return result;
    } catch (error) {
      this.status = 'error';
      console.error('[LoadTestingService] Load test failed:', error);
      
      return this.generateResult(config, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.cleanup();
    }
  }

  async runConnectionStabilityTest(
    homeId: string,
    durationMs: number = 300000
  ): Promise<ConnectionStabilityResult> {
    console.log('[LoadTestingService] Running connection stability test');
    
    const disconnections: { timestamp: number; reconnectedAt?: number }[] = [];
    let currentlyConnected = true;
    
    const virtualUser = this.createVirtualUser('stability-test-user');
    
    const startTime = Date.now();
    const endTime = startTime + durationMs;
    
    await this.simulateUserConnection(virtualUser, homeId);
    
    while (Date.now() < endTime) {
      await this.delay(1000);
      
      const shouldSimulateDisconnect = Math.random() < 0.02;
      
      if (shouldSimulateDisconnect && currentlyConnected) {
        currentlyConnected = false;
        disconnections.push({ timestamp: Date.now() });
        this.addTimelineEntry('user_left', virtualUser.id, 'Simulated disconnect');
      } else if (!currentlyConnected) {
        const reconnectDelay = Math.random() * 5000 + 1000;
        await this.delay(reconnectDelay);
        currentlyConnected = true;
        const lastDisconnect = disconnections[disconnections.length - 1];
        if (lastDisconnect) {
          lastDisconnect.reconnectedAt = Date.now();
        }
        this.addTimelineEntry('user_joined', virtualUser.id, 'Reconnected');
      }
    }
    
    const reconnectTimes = disconnections
      .filter(d => d.reconnectedAt)
      .map(d => d.reconnectedAt! - d.timestamp);
    
    const avgReconnectTime = reconnectTimes.length > 0
      ? reconnectTimes.reduce((a, b) => a + b, 0) / reconnectTimes.length
      : 0;
    
    const maxDisconnectDuration = Math.max(...reconnectTimes, 0);
    
    const stabilityScore = Math.max(0, 100 - (disconnections.length * 5) - (avgReconnectTime / 100));
    
    return {
      testDurationMs: durationMs,
      disconnections: disconnections.length,
      reconnections: reconnectTimes.length,
      avgTimeToReconnectMs: avgReconnectTime,
      maxDisconnectionDurationMs: maxDisconnectDuration,
      stabilityScore,
    };
  }

  async runMessageThroughputTest(
    homeId: string,
    messagesPerSecond: number = 100,
    durationMs: number = 60000
  ): Promise<MessageThroughputResult> {
    console.log('[LoadTestingService] Running message throughput test');
    
    const startTime = Date.now();
    const endTime = startTime + durationMs;
    const messageInterval = 1000 / messagesPerSecond;
    
    let totalMessages = 0;
    let droppedMessages = 0;
    const deliveryTimes: number[] = [];
    const messagesPerInterval: number[] = [];
    
    let intervalMessages = 0;
    const trackingInterval = setInterval(() => {
      messagesPerInterval.push(intervalMessages);
      intervalMessages = 0;
    }, 1000);
    
    while (Date.now() < endTime) {
      try {
        const deliveryTime = Math.random() * 100 + 10;
        await this.delay(messageInterval);
        
        deliveryTimes.push(deliveryTime);
        totalMessages++;
        intervalMessages++;
        
        this.addTimelineEntry('message_sent', 'throughput-test', `Message ${totalMessages}`);
      } catch {
        droppedMessages++;
        this.recordError('message_drop', 'Failed to send message');
      }
    }
    
    clearInterval(trackingInterval);
    
    const actualDuration = Date.now() - startTime;
    const actualMps = totalMessages / (actualDuration / 1000);
    const peakMps = Math.max(...messagesPerInterval, 0);
    const avgDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : 0;
    
    const throughputScore = Math.min(100, (actualMps / messagesPerSecond) * 100) * 
      (1 - droppedMessages / Math.max(totalMessages, 1));
    
    return {
      totalMessages,
      messagesPerSecond: actualMps,
      peakMessagesPerSecond: peakMps,
      droppedMessages,
      averageDeliveryTimeMs: avgDeliveryTime,
      throughputScore,
    };
  }

  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  getStatus(): LoadTestStatus {
    return this.status;
  }

  getCurrentMetrics(): Partial<LoadTestMetrics> {
    return this.calculateMetrics();
  }

  cancelTest(): void {
    console.log('[LoadTestingService] Cancelling load test');
    this.status = 'completing';
    this.cleanup();
  }

  private async rampUpUsers(config: LoadTestConfig): Promise<void> {
    const usersToAdd = config.concurrentUsers;
    const rampUpInterval = config.rampUpMs / usersToAdd;
    
    console.log(`[LoadTestingService] Ramping up ${usersToAdd} users over ${config.rampUpMs}ms`);
    
    for (let i = 0; i < usersToAdd; i++) {
      if (this.status !== 'running') break;
      
      const user = this.createVirtualUser(`user_${i + 1}`);
      await this.simulateUserConnection(user, config.targetHomeId);
      
      this.notifyProgress(config);
      
      if (i < usersToAdd - 1) {
        await this.delay(rampUpInterval);
      }
    }
  }

  private async runTestPhase(config: LoadTestConfig): Promise<void> {
    const testEndTime = Date.now() + config.durationMs;
    
    console.log(`[LoadTestingService] Running test phase for ${config.durationMs}ms`);
    
    if (config.enableChat && config.messageIntervalMs) {
      const chatInterval = setInterval(() => {
        this.simulateUserMessages(config);
      }, config.messageIntervalMs);
      this.intervalIds.push(chatInterval);
    }
    
    if (config.enablePositionUpdates && config.positionUpdateIntervalMs) {
      const positionInterval = setInterval(() => {
        this.simulatePositionUpdates(config);
      }, config.positionUpdateIntervalMs);
      this.intervalIds.push(positionInterval);
    }
    
    const checkpointInterval = setInterval(() => {
      this.addTimelineEntry('checkpoint', undefined, 'Periodic checkpoint', this.calculateMetrics());
      this.notifyProgress(config);
    }, 5000);
    this.intervalIds.push(checkpointInterval);
    
    while (Date.now() < testEndTime && this.status === 'running') {
      await this.delay(100);
    }
  }

  private async rampDownUsers(): Promise<void> {
    console.log('[LoadTestingService] Ramping down users');
    
    const users = Array.from(this.virtualUsers.values());
    for (const user of users) {
      await this.simulateUserDisconnection(user);
      await this.delay(50);
    }
  }

  private createVirtualUser(username: string): VirtualUser {
    const user: VirtualUser = {
      id: `vu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      isConnected: false,
      messagessSent: 0,
      messagesReceived: 0,
      positionUpdates: 0,
      errors: [],
      latencies: [],
    };
    
    this.virtualUsers.set(user.id, user);
    return user;
  }

  private async simulateUserConnection(user: VirtualUser, homeId: string): Promise<void> {
    this.connectionAttempts++;
    
    try {
      const connectionLatency = Math.random() * 200 + 50;
      await this.delay(connectionLatency);
      
      if (Math.random() > 0.02) {
        user.isConnected = true;
        user.joinedAt = Date.now();
        user.latencies.push(connectionLatency);
        this.successfulConnections++;
        
        this.addTimelineEntry('user_joined', user.id, `Connected to ${homeId}`);
        console.log(`[LoadTestingService] User ${user.username} connected`);
      } else {
        throw new Error('Simulated connection failure');
      }
    } catch (error) {
      this.failedConnections++;
      user.errors.push(error instanceof Error ? error.message : 'Connection failed');
      this.recordError('connection', error instanceof Error ? error.message : 'Connection failed');
      
      this.addTimelineEntry('error', user.id, 'Connection failed');
    }
  }

  private async simulateUserDisconnection(user: VirtualUser): Promise<void> {
    user.isConnected = false;
    this.addTimelineEntry('user_left', user.id, 'Disconnected');
    console.log(`[LoadTestingService] User ${user.username} disconnected`);
  }

  private simulateUserMessages(config: LoadTestConfig): void {
    const connectedUsers = Array.from(this.virtualUsers.values()).filter(u => u.isConnected);
    
    for (const user of connectedUsers) {
      if (Math.random() < 0.3) {
        const latency = Math.random() * 150 + 20;
        
        user.messagessSent++;
        this.totalMessagesSent++;
        this.messageLatencies.push(latency);
        
        setTimeout(() => {
          this.totalMessagesReceived++;
          user.messagesReceived++;
          this.addTimelineEntry('message_received', user.id, `Latency: ${latency.toFixed(0)}ms`);
        }, latency);
        
        this.addTimelineEntry('message_sent', user.id, `Message from ${user.username}`);
      }
    }
  }

  private simulatePositionUpdates(config: LoadTestConfig): void {
    const connectedUsers = Array.from(this.virtualUsers.values()).filter(u => u.isConnected);
    
    for (const user of connectedUsers) {
      user.positionUpdates++;
      this.totalPositionUpdates++;
      
      this.addTimelineEntry('position_update', user.id, 'Position updated');
    }
  }

  private calculateMetrics(): LoadTestMetrics {
    const sortedLatencies = [...this.messageLatencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);
    
    const elapsedSeconds = Math.max(1, (Date.now() - this.testStartTime) / 1000);
    
    const errorsByType: Record<string, number> = {};
    for (const error of this.errors) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    }
    
    return {
      totalConnections: this.connectionAttempts,
      successfulConnections: this.successfulConnections,
      failedConnections: this.failedConnections,
      totalMessagesSent: this.totalMessagesSent,
      totalMessagesReceived: this.totalMessagesReceived,
      totalPositionUpdates: this.totalPositionUpdates,
      averageLatencyMs: sortedLatencies.length > 0
        ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length
        : 0,
      minLatencyMs: sortedLatencies.length > 0 ? sortedLatencies[0] : 0,
      maxLatencyMs: sortedLatencies.length > 0 ? sortedLatencies[sortedLatencies.length - 1] : 0,
      p95LatencyMs: sortedLatencies[p95Index] || 0,
      p99LatencyMs: sortedLatencies[p99Index] || 0,
      messagesPerSecond: this.totalMessagesSent / elapsedSeconds,
      connectionErrorRate: this.connectionAttempts > 0
        ? this.failedConnections / this.connectionAttempts
        : 0,
      messageDeliveryRate: this.totalMessagesSent > 0
        ? this.totalMessagesReceived / this.totalMessagesSent
        : 1,
      peakConcurrentUsers: this.virtualUsers.size,
      totalErrors: this.errors.length,
      errorsByType,
    };
  }

  private generateResult(config: LoadTestConfig, errorMessage?: string): LoadTestResult {
    const metrics = this.calculateMetrics();
    const endTime = Date.now();
    
    const connectionSuccessRate = metrics.totalConnections > 0
      ? metrics.successfulConnections / metrics.totalConnections
      : 0;
    
    let status: 'passed' | 'failed' | 'partial' = 'passed';
    if (errorMessage || connectionSuccessRate < 0.9) {
      status = 'failed';
    } else if (connectionSuccessRate < 0.98 || metrics.messageDeliveryRate < 0.95) {
      status = 'partial';
    }
    
    const recommendations: string[] = [];
    
    if (metrics.averageLatencyMs > 200) {
      recommendations.push('Consider optimizing message handling - average latency is above 200ms');
    }
    if (metrics.connectionErrorRate > 0.05) {
      recommendations.push('Connection error rate is above 5% - investigate connection stability');
    }
    if (metrics.messageDeliveryRate < 0.98) {
      recommendations.push('Message delivery rate is below 98% - check for dropped messages');
    }
    if (metrics.p99LatencyMs > 500) {
      recommendations.push('P99 latency is above 500ms - some users may experience delays');
    }
    
    const summary = `Load test ${status === 'passed' ? 'PASSED' : status === 'partial' ? 'PARTIALLY PASSED' : 'FAILED'}. ` +
      `${metrics.successfulConnections}/${metrics.totalConnections} connections successful. ` +
      `${metrics.totalMessagesSent} messages sent with ${(metrics.messageDeliveryRate * 100).toFixed(1)}% delivery rate. ` +
      `Average latency: ${metrics.averageLatencyMs.toFixed(0)}ms.`;
    
    return {
      testId: config.testId,
      testName: config.testName,
      config,
      metrics,
      startTime: new Date(this.testStartTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMs: endTime - this.testStartTime,
      status,
      users: Array.from(this.virtualUsers.values()),
      timeline: this.timeline,
      summary,
      recommendations,
    };
  }

  private addTimelineEntry(
    event: LoadTestTimelineEntry['event'],
    userId?: string,
    details?: string,
    metrics?: Partial<LoadTestMetrics>
  ): void {
    this.timeline.push({
      timestamp: Date.now(),
      event,
      userId,
      details,
      metrics,
    });
  }

  private recordError(type: string, message: string): void {
    this.errors.push({
      type,
      message,
      timestamp: Date.now(),
    });
  }

  private notifyProgress(config: LoadTestConfig): void {
    const progress: LoadTestProgress = {
      status: this.status,
      currentUsers: Array.from(this.virtualUsers.values()).filter(u => u.isConnected).length,
      targetUsers: config.concurrentUsers,
      elapsedMs: Date.now() - this.testStartTime,
      totalMs: config.rampUpMs + config.durationMs,
      messagesProcessed: this.totalMessagesSent,
      errorsCount: this.errors.length,
      currentMetrics: this.calculateMetrics(),
    };
    
    this.progressCallbacks.forEach(cb => cb(progress));
  }

  private resetState(): void {
    this.virtualUsers.clear();
    this.timeline = [];
    this.messageLatencies = [];
    this.connectionAttempts = 0;
    this.successfulConnections = 0;
    this.failedConnections = 0;
    this.totalMessagesSent = 0;
    this.totalMessagesReceived = 0;
    this.totalPositionUpdates = 0;
    this.errors = [];
    this.cleanup();
  }

  private cleanup(): void {
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds = [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const loadTestingService = new LoadTestingService();
export default loadTestingService;
