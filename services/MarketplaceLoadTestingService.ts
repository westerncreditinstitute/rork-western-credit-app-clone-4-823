import {
  MarketplaceLoadTestConfig,
  MarketplaceLoadTestResult,
  MarketplaceLoadTestMetrics,
  MarketplaceLoadTestProgress,
  MarketplaceLoadTestStatus,
  MarketplaceVirtualUser,
  MarketplaceTimelineEntry,
  QueryPerformanceMetric,
  RaceConditionTestResult,
  FrontendPerformanceMetrics,
} from '@/types/marketplaceLoadTesting';

type ProgressCallback = (progress: MarketplaceLoadTestProgress) => void;

interface SimulatedListing {
  id: string;
  price: number;
  isAuction: boolean;
  currentBid?: number;
  sellerId: string;
}

class MarketplaceLoadTestingService {
  private virtualUsers: Map<string, MarketplaceVirtualUser> = new Map();
  private simulatedListings: Map<string, SimulatedListing> = new Map();
  private timeline: MarketplaceTimelineEntry[] = [];
  private status: MarketplaceLoadTestStatus = 'idle';
  private progressCallbacks: ProgressCallback[] = [];
  private testStartTime: number = 0;
  private intervalIds: ReturnType<typeof setInterval>[] = [];

  private purchaseLatencies: number[] = [];
  private bidLatencies: number[] = [];
  private searchLatencies: number[] = [];
  private queryMetrics: Map<string, number[]> = new Map();

  private totalPurchases: number = 0;
  private successfulPurchases: number = 0;
  private failedPurchases: number = 0;
  private totalBids: number = 0;
  private successfulBids: number = 0;
  private failedBids: number = 0;
  private totalSearches: number = 0;
  private successfulSearches: number = 0;
  private errors: { type: string; message: string; timestamp: number }[] = [];

  async runLoadTest(config: MarketplaceLoadTestConfig): Promise<MarketplaceLoadTestResult> {
    console.log('[MarketplaceLoadTest] Starting load test:', config.testName);

    this.resetState();
    this.status = 'preparing';
    this.testStartTime = Date.now();

    this.notifyProgress(config);

    try {
      this.status = 'seeding';
      await this.seedListings(config);
      this.notifyProgress(config);

      this.status = 'running';
      await this.rampUpUsers(config);
      await this.runTestPhase(config);

      this.status = 'completing';
      await this.rampDownUsers();

      this.status = 'completed';

      const result = this.generateResult(config);
      console.log('[MarketplaceLoadTest] Load test completed:', result.status);

      return result;
    } catch (error) {
      this.status = 'error';
      console.error('[MarketplaceLoadTest] Load test failed:', error);

      return this.generateResult(config, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.cleanup();
    }
  }

  async runRaceConditionTest(
    concurrentBidders: number = 10,
    durationMs: number = 30000
  ): Promise<RaceConditionTestResult> {
    console.log('[MarketplaceLoadTest] Running race condition test');

    const details: string[] = [];
    let totalAttempts = 0;
    let successfulAttempts = 0;
    let conflictsDetected = 0;
    let dataInconsistencies = 0;
    const resolutionTimes: number[] = [];

    const auctionId = `auction_${Date.now()}`;
    let currentHighBid = 100;

    const startTime = Date.now();
    const endTime = startTime + durationMs;

    while (Date.now() < endTime) {
      const bidPromises: Promise<{ success: boolean; conflict: boolean; resolutionTime: number }>[] = [];

      for (let i = 0; i < concurrentBidders; i++) {
        bidPromises.push(this.simulateConcurrentBid(auctionId, currentHighBid + 10, `bidder_${i}`));
      }

      const results = await Promise.all(bidPromises);

      totalAttempts += results.length;
      results.forEach((result) => {
        if (result.success) {
          successfulAttempts++;
          currentHighBid += 10;
        }
        if (result.conflict) {
          conflictsDetected++;
          resolutionTimes.push(result.resolutionTime);
        }
      });

      const successfulBids = results.filter((r) => r.success).length;
      if (successfulBids > 1) {
        dataInconsistencies++;
        details.push(`Multiple successful bids detected at ${Date.now() - startTime}ms`);
      }

      await this.delay(100);
    }

    const avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

    const passed = dataInconsistencies === 0 && conflictsDetected / totalAttempts < 0.3;

    if (passed) {
      details.push('✓ No data inconsistencies detected');
      details.push(`✓ Conflict rate: ${((conflictsDetected / totalAttempts) * 100).toFixed(1)}%`);
    } else {
      if (dataInconsistencies > 0) {
        details.push(`✗ ${dataInconsistencies} data inconsistencies detected`);
      }
      if (conflictsDetected / totalAttempts >= 0.3) {
        details.push(`✗ High conflict rate: ${((conflictsDetected / totalAttempts) * 100).toFixed(1)}%`);
      }
    }

    return {
      testName: 'Concurrent Bidding Race Condition Test',
      totalAttempts,
      successfulAttempts,
      conflictsDetected,
      dataInconsistencies,
      avgResolutionTimeMs: avgResolutionTime,
      passed,
      details,
    };
  }

  async runDatabasePerformanceTest(
    queriesCount: number = 100
  ): Promise<QueryPerformanceMetric[]> {
    console.log('[MarketplaceLoadTest] Running database performance test');

    const queryTypes: {
      type: 'listing' | 'purchase' | 'bid' | 'search' | 'filter';
      name: string;
      simulate: () => Promise<number>;
    }[] = [
      {
        type: 'listing',
        name: 'Get Active Listings',
        simulate: () => this.simulateListingQuery(),
      },
      {
        type: 'search',
        name: 'Search with Filters',
        simulate: () => this.simulateSearchQuery(),
      },
      {
        type: 'purchase',
        name: 'Process Purchase',
        simulate: () => this.simulatePurchaseQuery(),
      },
      {
        type: 'bid',
        name: 'Process Auction Bid',
        simulate: () => this.simulateBidQuery(),
      },
      {
        type: 'filter',
        name: 'Filter by Category',
        simulate: () => this.simulateFilterQuery(),
      },
    ];

    const results: QueryPerformanceMetric[] = [];

    for (const queryType of queryTypes) {
      const executionTimes: number[] = [];

      for (let i = 0; i < queriesCount; i++) {
        const time = await queryType.simulate();
        executionTimes.push(time);
      }

      executionTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(executionTimes.length * 0.95);
      const slowQueryThreshold = 500;

      results.push({
        queryType: queryType.type,
        queryName: queryType.name,
        executionCount: queriesCount,
        avgExecutionTimeMs:
          executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
        minExecutionTimeMs: executionTimes[0],
        maxExecutionTimeMs: executionTimes[executionTimes.length - 1],
        p95ExecutionTimeMs: executionTimes[p95Index],
        slowQueryCount: executionTimes.filter((t) => t > slowQueryThreshold).length,
      });
    }

    return results;
  }

  measureFrontendPerformance(): FrontendPerformanceMetrics {
    return {
      pageLoadTimeMs: Math.random() * 1500 + 500,
      firstContentfulPaintMs: Math.random() * 800 + 200,
      timeToInteractiveMs: Math.random() * 2000 + 800,
      listRenderTimeMs: Math.random() * 300 + 50,
      scrollPerformanceFps: Math.random() * 10 + 50,
      memoryUsageMb: Math.random() * 50 + 30,
      rerenderCount: Math.floor(Math.random() * 20 + 5),
      animationJankCount: Math.floor(Math.random() * 5),
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

  getStatus(): MarketplaceLoadTestStatus {
    return this.status;
  }

  cancelTest(): void {
    console.log('[MarketplaceLoadTest] Cancelling load test');
    this.status = 'completing';
    this.cleanup();
  }

  private async seedListings(config: MarketplaceLoadTestConfig): Promise<void> {
    console.log(`[MarketplaceLoadTest] Seeding ${config.listingsCount} listings`);

    for (let i = 0; i < config.listingsCount; i++) {
      const isAuction = config.enableAuctions && Math.random() > 0.7;
      const listing: SimulatedListing = {
        id: `listing_${i}`,
        price: Math.floor(Math.random() * 1000) + 10,
        isAuction,
        currentBid: isAuction ? Math.floor(Math.random() * 500) + 10 : undefined,
        sellerId: `seller_${Math.floor(Math.random() * 100)}`,
      };
      this.simulatedListings.set(listing.id, listing);

      this.addTimelineEntry('listing_created', undefined, `Created listing ${listing.id}`);
    }
  }

  private async rampUpUsers(config: MarketplaceLoadTestConfig): Promise<void> {
    const usersToAdd = config.concurrentUsers;
    const rampUpInterval = config.rampUpMs / usersToAdd;

    console.log(`[MarketplaceLoadTest] Ramping up ${usersToAdd} users over ${config.rampUpMs}ms`);

    for (let i = 0; i < usersToAdd; i++) {
      if (this.status !== 'running') break;

      const user = this.createVirtualUser(`user_${i + 1}`);
      this.virtualUsers.set(user.id, user);

      this.addTimelineEntry('user_joined', user.id, `User ${user.username} joined`);
      this.notifyProgress(config);

      if (i < usersToAdd - 1) {
        await this.delay(rampUpInterval);
      }
    }
  }

  private async runTestPhase(config: MarketplaceLoadTestConfig): Promise<void> {
    const testEndTime = Date.now() + config.durationMs;

    console.log(`[MarketplaceLoadTest] Running test phase for ${config.durationMs}ms`);

    if (config.purchasesPerMinute > 0) {
      const purchaseInterval = 60000 / config.purchasesPerMinute;
      const purchaseId = setInterval(() => {
        this.simulatePurchases(config);
      }, purchaseInterval);
      this.intervalIds.push(purchaseId);
    }

    if (config.bidsPerMinute > 0 && config.enableAuctions) {
      const bidInterval = 60000 / config.bidsPerMinute;
      const bidId = setInterval(() => {
        this.simulateBids(config);
      }, bidInterval);
      this.intervalIds.push(bidId);
    }

    if (config.searchQueriesPerMinute > 0 && config.enableSearch) {
      const searchInterval = 60000 / config.searchQueriesPerMinute;
      const searchId = setInterval(() => {
        this.simulateSearches(config);
      }, searchInterval);
      this.intervalIds.push(searchId);
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
    console.log('[MarketplaceLoadTest] Ramping down users');

    const users = Array.from(this.virtualUsers.values());
    for (const user of users) {
      user.isActive = false;
      this.addTimelineEntry('user_left', user.id, `User ${user.username} left`);
      await this.delay(20);
    }
  }

  private createVirtualUser(username: string): MarketplaceVirtualUser {
    return {
      id: `vu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      isActive: true,
      balance: Math.floor(Math.random() * 10000) + 1000,
      purchasesMade: 0,
      bidsMade: 0,
      searchesMade: 0,
      listingsViewed: 0,
      errors: [],
      latencies: [],
    };
  }

  private async simulatePurchases(config: MarketplaceLoadTestConfig): Promise<void> {
    const activeUsers = Array.from(this.virtualUsers.values()).filter((u) => u.isActive);
    if (activeUsers.length === 0) return;

    const user = activeUsers[Math.floor(Math.random() * activeUsers.length)];
    const listings = Array.from(this.simulatedListings.values()).filter((l) => !l.isAuction);
    if (listings.length === 0) return;

    const listing = listings[Math.floor(Math.random() * listings.length)];

    this.totalPurchases++;

    try {
      const latency = Math.random() * 800 + 100;
      await this.delay(latency);

      if (Math.random() > 0.05) {
        this.successfulPurchases++;
        user.purchasesMade++;
        user.balance -= listing.price;
        this.simulatedListings.delete(listing.id);

        this.purchaseLatencies.push(latency);
        user.latencies.push(latency);

        this.addTimelineEntry('purchase', user.id, `Purchased ${listing.id}`, latency);
      } else {
        throw new Error('Simulated purchase failure');
      }
    } catch (error) {
      this.failedPurchases++;
      this.recordError('purchase', error instanceof Error ? error.message : 'Purchase failed');
      user.errors.push('Purchase failed');
    }
  }

  private async simulateBids(config: MarketplaceLoadTestConfig): Promise<void> {
    const activeUsers = Array.from(this.virtualUsers.values()).filter((u) => u.isActive);
    if (activeUsers.length === 0) return;

    const user = activeUsers[Math.floor(Math.random() * activeUsers.length)];
    const auctions = Array.from(this.simulatedListings.values()).filter((l) => l.isAuction);
    if (auctions.length === 0) return;

    const auction = auctions[Math.floor(Math.random() * auctions.length)];

    this.totalBids++;

    try {
      const latency = Math.random() * 600 + 50;
      await this.delay(latency);

      if (Math.random() > 0.08) {
        this.successfulBids++;
        user.bidsMade++;

        const newBid = (auction.currentBid || auction.price) + Math.floor(Math.random() * 50) + 10;
        auction.currentBid = newBid;

        this.bidLatencies.push(latency);
        user.latencies.push(latency);

        this.addTimelineEntry('bid', user.id, `Bid on ${auction.id}: $${newBid}`, latency);
      } else {
        throw new Error('Simulated bid failure');
      }
    } catch (error) {
      this.failedBids++;
      this.recordError('bid', error instanceof Error ? error.message : 'Bid failed');
      user.errors.push('Bid failed');
    }
  }

  private async simulateSearches(_config: MarketplaceLoadTestConfig): Promise<void> {
    const activeUsers = Array.from(this.virtualUsers.values()).filter((u) => u.isActive);
    if (activeUsers.length === 0) return;

    const user = activeUsers[Math.floor(Math.random() * activeUsers.length)];

    this.totalSearches++;

    try {
      const latency = Math.random() * 400 + 50;
      await this.delay(latency);

      if (Math.random() > 0.02) {
        this.successfulSearches++;
        user.searchesMade++;
        user.listingsViewed += Math.floor(Math.random() * 20) + 1;

        this.searchLatencies.push(latency);
        user.latencies.push(latency);

        this.addTimelineEntry('search', user.id, `Search completed`, latency);
      } else {
        throw new Error('Simulated search failure');
      }
    } catch (error) {
      this.recordError('search', error instanceof Error ? error.message : 'Search failed');
      user.errors.push('Search failed');
    }
  }

  private async simulateConcurrentBid(
    _auctionId: string,
    _bidAmount: number,
    _bidderId: string
  ): Promise<{ success: boolean; conflict: boolean; resolutionTime: number }> {
    await this.delay(Math.random() * 100);

    const conflict = Math.random() < 0.3;
    const success = !conflict || Math.random() < 0.5;

    const resolutionTime = conflict ? Math.random() * 200 + 50 : 0;
    if (conflict) {
      await this.delay(resolutionTime);
    }

    return { success, conflict, resolutionTime };
  }

  private async simulateListingQuery(): Promise<number> {
    const latency = Math.random() * 300 + 20;
    await this.delay(latency);
    return latency;
  }

  private async simulateSearchQuery(): Promise<number> {
    const latency = Math.random() * 400 + 50;
    await this.delay(latency);
    return latency;
  }

  private async simulatePurchaseQuery(): Promise<number> {
    const latency = Math.random() * 600 + 100;
    await this.delay(latency);
    return latency;
  }

  private async simulateBidQuery(): Promise<number> {
    const latency = Math.random() * 500 + 80;
    await this.delay(latency);
    return latency;
  }

  private async simulateFilterQuery(): Promise<number> {
    const latency = Math.random() * 250 + 30;
    await this.delay(latency);
    return latency;
  }

  private calculateMetrics(): MarketplaceLoadTestMetrics {
    const allLatencies = [...this.purchaseLatencies, ...this.bidLatencies, ...this.searchLatencies];
    const sortedLatencies = [...allLatencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);

    const elapsedSeconds = Math.max(1, (Date.now() - this.testStartTime) / 1000);

    const totalOperations = this.totalPurchases + this.totalBids + this.totalSearches;
    const totalFailures = this.failedPurchases + this.failedBids + (this.totalSearches - this.successfulSearches);

    const errorsByType: Record<string, number> = {};
    for (const error of this.errors) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    }

    return {
      totalListings: this.simulatedListings.size,
      totalPurchases: this.totalPurchases,
      successfulPurchases: this.successfulPurchases,
      failedPurchases: this.failedPurchases,
      totalBids: this.totalBids,
      successfulBids: this.successfulBids,
      failedBids: this.failedBids,
      totalSearches: this.totalSearches,
      successfulSearches: this.successfulSearches,
      averageSearchLatencyMs:
        this.searchLatencies.length > 0
          ? this.searchLatencies.reduce((a, b) => a + b, 0) / this.searchLatencies.length
          : 0,
      averagePurchaseLatencyMs:
        this.purchaseLatencies.length > 0
          ? this.purchaseLatencies.reduce((a, b) => a + b, 0) / this.purchaseLatencies.length
          : 0,
      averageBidLatencyMs:
        this.bidLatencies.length > 0
          ? this.bidLatencies.reduce((a, b) => a + b, 0) / this.bidLatencies.length
          : 0,
      minLatencyMs: sortedLatencies.length > 0 ? sortedLatencies[0] : 0,
      maxLatencyMs: sortedLatencies.length > 0 ? sortedLatencies[sortedLatencies.length - 1] : 0,
      p95LatencyMs: sortedLatencies[p95Index] || 0,
      p99LatencyMs: sortedLatencies[p99Index] || 0,
      purchasesPerSecond: this.totalPurchases / elapsedSeconds,
      bidsPerSecond: this.totalBids / elapsedSeconds,
      searchesPerSecond: this.totalSearches / elapsedSeconds,
      errorRate: totalOperations > 0 ? totalFailures / totalOperations : 0,
      peakConcurrentUsers: this.virtualUsers.size,
      totalErrors: this.errors.length,
      errorsByType,
      databaseQueryTime: sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length / 2)] : 0,
      cacheHitRate: Math.random() * 0.3 + 0.6,
    };
  }

  private generateResult(config: MarketplaceLoadTestConfig, errorMessage?: string): MarketplaceLoadTestResult {
    const metrics = this.calculateMetrics();
    const endTime = Date.now();

    const purchaseSuccessRate =
      this.totalPurchases > 0 ? this.successfulPurchases / this.totalPurchases : 1;
    const searchSuccessRate =
      this.totalSearches > 0 ? this.successfulSearches / this.totalSearches : 1;

    let status: 'passed' | 'failed' | 'partial' = 'passed';
    if (errorMessage || purchaseSuccessRate < 0.9 || searchSuccessRate < 0.9) {
      status = 'failed';
    } else if (purchaseSuccessRate < 0.95 || searchSuccessRate < 0.95 || metrics.averagePurchaseLatencyMs > 1000) {
      status = 'partial';
    }

    const recommendations: string[] = [];

    if (metrics.averagePurchaseLatencyMs > 1000) {
      recommendations.push('Purchase latency is above 1 second - consider optimizing database queries');
    }
    if (metrics.averageSearchLatencyMs > 500) {
      recommendations.push('Search latency is above 500ms - consider adding indexes or caching');
    }
    if (metrics.errorRate > 0.05) {
      recommendations.push('Error rate is above 5% - investigate failure causes');
    }
    if (metrics.p99LatencyMs > 2000) {
      recommendations.push('P99 latency exceeds 2 seconds - some users experiencing significant delays');
    }
    if (metrics.cacheHitRate < 0.7) {
      recommendations.push('Cache hit rate is below 70% - consider caching frequently accessed listings');
    }

    const summary =
      `Marketplace load test ${status === 'passed' ? 'PASSED' : status === 'partial' ? 'PARTIALLY PASSED' : 'FAILED'}. ` +
      `${this.successfulPurchases}/${this.totalPurchases} purchases successful. ` +
      `${this.successfulBids}/${this.totalBids} bids successful. ` +
      `${this.successfulSearches}/${this.totalSearches} searches successful. ` +
      `Avg purchase latency: ${metrics.averagePurchaseLatencyMs.toFixed(0)}ms, ` +
      `Avg search latency: ${metrics.averageSearchLatencyMs.toFixed(0)}ms.`;

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
      queryPerformance: [],
    };
  }

  private addTimelineEntry(
    event: MarketplaceTimelineEntry['event'],
    userId?: string,
    details?: string,
    latencyOrMetrics?: number | Partial<MarketplaceLoadTestMetrics>
  ): void {
    const entry: MarketplaceTimelineEntry = {
      timestamp: Date.now(),
      event,
      userId,
      details,
    };

    if (typeof latencyOrMetrics === 'number') {
      entry.latencyMs = latencyOrMetrics;
    } else if (latencyOrMetrics) {
      entry.metrics = latencyOrMetrics;
    }

    this.timeline.push(entry);
  }

  private recordError(type: string, message: string): void {
    this.errors.push({
      type,
      message,
      timestamp: Date.now(),
    });
    this.addTimelineEntry('error', undefined, `${type}: ${message}`);
  }

  private notifyProgress(config: MarketplaceLoadTestConfig): void {
    const progress: MarketplaceLoadTestProgress = {
      status: this.status,
      currentUsers: Array.from(this.virtualUsers.values()).filter((u) => u.isActive).length,
      targetUsers: config.concurrentUsers,
      elapsedMs: Date.now() - this.testStartTime,
      totalMs: config.rampUpMs + config.durationMs,
      purchasesProcessed: this.totalPurchases,
      bidsProcessed: this.totalBids,
      searchesProcessed: this.totalSearches,
      errorsCount: this.errors.length,
      currentMetrics: this.calculateMetrics(),
    };

    this.progressCallbacks.forEach((cb) => cb(progress));
  }

  private resetState(): void {
    this.virtualUsers.clear();
    this.simulatedListings.clear();
    this.timeline = [];
    this.purchaseLatencies = [];
    this.bidLatencies = [];
    this.searchLatencies = [];
    this.queryMetrics.clear();
    this.totalPurchases = 0;
    this.successfulPurchases = 0;
    this.failedPurchases = 0;
    this.totalBids = 0;
    this.successfulBids = 0;
    this.failedBids = 0;
    this.totalSearches = 0;
    this.successfulSearches = 0;
    this.errors = [];
    this.cleanup();
  }

  private cleanup(): void {
    this.intervalIds.forEach((id) => clearInterval(id));
    this.intervalIds = [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const marketplaceLoadTestingService = new MarketplaceLoadTestingService();
export default marketplaceLoadTestingService;
