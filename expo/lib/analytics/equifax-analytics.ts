/**
 * Equifax Analytics & Performance Monitoring
 *
 * Tracks:
 * - Report fetch latency by bureau
 * - Parsing performance
 * - Error rates and types
 * - Chat context injection performance
 * - Letter generation metrics
 */

export type MetricType = "FETCH" | "PARSE" | "INJECT" | "LETTER_GEN" | "ERROR";
export type BureauType = "Equifax" | "Experian" | "TransUnion" | "Combined";

interface AnalyticsMetric {
  id: string;
  timestamp: string;
  type: MetricType;
  bureau?: BureauType;
  duration?: number; // milliseconds
  accountsProcessed?: number;
  negativeAccountsFound?: number;
  success: boolean;
  error?: string;
  errorType?: string;
  userId?: string;
  agentId?: number;
  tags?: Record<string, string>;
}

interface BureauMetrics {
  bureau: BureauType;
  fetchCount: number;
  totalFetchTime: number;
  averageFetchTime: number;
  errorCount: number;
  successCount: number;
  lastFetchTime?: number;
  lastError?: string;
}

interface AnalyticsDashboard {
  totalSessions: number;
  totalReports: number;
  totalErrors: number;
  bureauMetrics: Record<BureauType, BureauMetrics>;
  recentMetrics: AnalyticsMetric[];
  performanceStats: {
    averageFetchTime: number;
    averageParseTime: number;
    averageInjectTime: number;
    errorRate: number;
  };
}

/**
 * Singleton analytics tracker
 */
class EquifaxAnalytics {
  private static instance: EquifaxAnalytics;
  private metrics: AnalyticsMetric[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics in memory
  private sessionStart: number = Date.now();

  private constructor() {
    console.log("[Analytics] Equifax Analytics initialized");
  }

  static getInstance(): EquifaxAnalytics {
    if (!EquifaxAnalytics.instance) {
      EquifaxAnalytics.instance = new EquifaxAnalytics();
    }
    return EquifaxAnalytics.instance;
  }

  /**
   * Track a metric
   */
  trackMetric(metric: Omit<AnalyticsMetric, "id" | "timestamp">): void {
    const fullMetric: AnalyticsMetric = {
      ...metric,
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
    };

    // Add to collection
    this.metrics.push(fullMetric);

    // Keep only recent metrics in memory
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log important metrics
    if (metric.type === "FETCH") {
      console.log(
        `[Analytics] Report fetch (${metric.bureau}): ${metric.duration}ms, ${metric.accountsProcessed} accounts, ${metric.negativeAccountsFound} negative`
      );
    } else if (metric.type === "ERROR") {
      console.error(
        `[Analytics] ${metric.errorType}: ${metric.error} (${metric.bureau})`
      );
    } else if (metric.type === "INJECT") {
      console.log(
        `[Analytics] Chat context injected: ${metric.duration}ms`
      );
    }

    // Send to backend for persistence (optional, async)
    this.sendToBackend(fullMetric);
  }

  /**
   * Track report fetch operation
   */
  trackFetch(
    bureau: BureauType,
    duration: number,
    accountsProcessed: number,
    negativeAccountsFound: number,
    userId?: string,
    error?: string
  ): void {
    this.trackMetric({
      type: "FETCH",
      bureau,
      duration,
      accountsProcessed,
      negativeAccountsFound,
      success: !error,
      error,
      errorType: error ? "FETCH_ERROR" : undefined,
      userId,
    });
  }

  /**
   * Track parsing operation
   */
  trackParse(
    bureau: BureauType,
    duration: number,
    accountsProcessed: number,
    negativeAccountsFound: number,
    success: boolean = true,
    error?: string
  ): void {
    this.trackMetric({
      type: "PARSE",
      bureau,
      duration,
      accountsProcessed,
      negativeAccountsFound,
      success,
      error,
      errorType: error ? "PARSE_ERROR" : undefined,
    });
  }

  /**
   * Track chat context injection
   */
  trackInject(
    duration: number,
    accountsCount: number,
    userId?: string,
    agentId?: number
  ): void {
    this.trackMetric({
      type: "INJECT",
      bureau: "Combined",
      duration,
      accountsProcessed: accountsCount,
      success: true,
      userId,
      agentId,
    });
  }

  /**
   * Track letter generation
   */
  trackLetterGeneration(
    letterType: string,
    bureau: BureauType,
    duration: number,
    success: boolean = true,
    userId?: string,
    agentId?: number,
    error?: string
  ): void {
    this.trackMetric({
      type: "LETTER_GEN",
      bureau,
      duration,
      success,
      error,
      errorType: error ? "LETTER_GEN_ERROR" : undefined,
      userId,
      agentId,
      tags: { letterType },
    });
  }

  /**
   * Track error
   */
  trackError(
    errorType: string,
    error: string,
    bureau?: BureauType,
    userId?: string
  ): void {
    this.trackMetric({
      type: "ERROR",
      bureau,
      success: false,
      error,
      errorType,
      userId,
    });
  }

  /**
   * Get performance statistics
   */
  getMetrics(
    filter?: {
      type?: MetricType;
      bureau?: BureauType;
      userId?: string;
      minutesBack?: number;
    }
  ): AnalyticsMetric[] {
    let filtered = this.metrics;

    if (filter?.type) {
      filtered = filtered.filter((m) => m.type === filter.type);
    }

    if (filter?.bureau) {
      filtered = filtered.filter((m) => m.bureau === filter.bureau);
    }

    if (filter?.userId) {
      filtered = filtered.filter((m) => m.userId === filter.userId);
    }

    if (filter?.minutesBack) {
      const cutoff = Date.now() - filter.minutesBack * 60 * 1000;
      filtered = filtered.filter(
        (m) => new Date(m.timestamp).getTime() > cutoff
      );
    }

    return filtered;
  }

  /**
   * Get analytics dashboard data
   */
  getDashboard(): AnalyticsDashboard {
    const bureaus: BureauType[] = [
      "Equifax",
      "Experian",
      "TransUnion",
      "Combined",
    ];
    const bureauMetrics: Record<BureauType, BureauMetrics> = {};

    for (const bureau of bureaus) {
      const bureauMetricsForBureau = this.getMetrics({ bureau });
      const fetchMetrics = bureauMetricsForBureau.filter(
        (m) => m.type === "FETCH"
      );
      const errorMetrics = bureauMetricsForBureau.filter(
        (m) => !m.success
      );
      const successMetrics = bureauMetricsForBureau.filter(
        (m) => m.success
      );

      const totalFetchTime = fetchMetrics.reduce(
        (sum, m) => sum + (m.duration || 0),
        0
      );

      bureauMetrics[bureau] = {
        bureau,
        fetchCount: fetchMetrics.length,
        totalFetchTime,
        averageFetchTime:
          fetchMetrics.length > 0 ? totalFetchTime / fetchMetrics.length : 0,
        errorCount: errorMetrics.length,
        successCount: successMetrics.length,
        lastFetchTime: fetchMetrics.length > 0 ? fetchMetrics[fetchMetrics.length - 1].duration : undefined,
        lastError: errorMetrics.length > 0 ? errorMetrics[errorMetrics.length - 1].error : undefined,
      };
    }

    const allFetchMetrics = this.getMetrics({ type: "FETCH" });
    const allParseMetrics = this.getMetrics({ type: "PARSE" });
    const allInjectMetrics = this.getMetrics({ type: "INJECT" });
    const allErrors = this.getMetrics({ type: "ERROR" });

    const computeAverage = (metrics: AnalyticsMetric[]): number => {
      if (metrics.length === 0) return 0;
      const total = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
      return Math.round(total / metrics.length);
    };

    return {
      totalSessions: 1, // Could track sessions separately
      totalReports: allFetchMetrics.length,
      totalErrors: allErrors.length,
      bureauMetrics,
      recentMetrics: this.metrics.slice(-20),
      performanceStats: {
        averageFetchTime: computeAverage(allFetchMetrics),
        averageParseTime: computeAverage(allParseMetrics),
        averageInjectTime: computeAverage(allInjectMetrics),
        errorRate:
          this.metrics.length > 0
            ? Math.round(
                (this.metrics.filter((m) => !m.success).length /
                  this.metrics.length) *
                100
              )
            : 0,
      },
    };
  }

  /**
   * Send metrics to backend for persistence (async)
   * In production, batch these for efficiency
   */
  private sendToBackend(metric: AnalyticsMetric): void {
    // This would call a tRPC endpoint to persist metrics
    // For now, just logged in console
    // Implement when backend analytics endpoint is ready
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.metrics = [];
    console.log("[Analytics] Metrics cleared");
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        sessionStart: new Date(this.sessionStart).toISOString(),
        metrics: this.metrics,
        dashboard: this.getDashboard(),
      },
      null,
      2
    );
  }
}

/**
 * Get singleton analytics instance
 */
export function getEquifaxAnalytics(): EquifaxAnalytics {
  return EquifaxAnalytics.getInstance();
}

/**
 * Hook for React components to use analytics
 */
export function useEquifaxAnalytics(): EquifaxAnalytics {
  return getEquifaxAnalytics();
}

export type { AnalyticsMetric, BureauMetrics, AnalyticsDashboard };
