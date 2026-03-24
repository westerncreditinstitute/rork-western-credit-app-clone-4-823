import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  Play,
  Square,
  Users,
  ShoppingCart,
  Search,
  Gavel,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Zap,
  Database,
  BarChart3,
  RefreshCw,
} from 'lucide-react-native';
import { marketplaceLoadTestingService } from '@/services/MarketplaceLoadTestingService';
import {
  MARKETPLACE_LOAD_TEST_SCENARIOS,
  PERFORMANCE_TARGETS,
  createMarketplaceTestConfig,
  evaluateMarketplaceTestResult,
} from '@/mocks/marketplaceLoadTestScenarios';
import {
  MarketplaceLoadTestResult,
  MarketplaceLoadTestProgress,
  MarketplaceLoadTestScenario,
  MarketplaceLoadTestMetrics,
  RaceConditionTestResult,
  QueryPerformanceMetric,
  FrontendPerformanceMetrics,
  PerformanceTarget,
} from '@/types/marketplaceLoadTesting';

type TestTab = 'load' | 'database' | 'race' | 'frontend';

export default function MarketplaceLoadTestDashboard() {
  const [activeTab, setActiveTab] = useState<TestTab>('load');
  const [selectedScenario, setSelectedScenario] = useState<MarketplaceLoadTestScenario | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<MarketplaceLoadTestProgress | null>(null);
  const [result, setResult] = useState<MarketplaceLoadTestResult | null>(null);
  const [, setResults] = useState<MarketplaceLoadTestResult[]>([]);
  const [raceConditionResult, setRaceConditionResult] = useState<RaceConditionTestResult | null>(null);
  const [queryPerformance, setQueryPerformance] = useState<QueryPerformanceMetric[]>([]);
  const [frontendMetrics, setFrontendMetrics] = useState<FrontendPerformanceMetrics | null>(null);
  const [performanceTargets, setPerformanceTargets] = useState<PerformanceTarget[]>(PERFORMANCE_TARGETS);
  const [progressAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (progress) {
      const progressPercent = progress.totalMs > 0
        ? (progress.elapsedMs / progress.totalMs) * 100
        : 0;

      Animated.timing(progressAnim, {
        toValue: progressPercent,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [progress, progressAnim]);

  const handleRunLoadTest = useCallback(async () => {
    if (!selectedScenario) return;

    setIsRunning(true);
    setResult(null);
    setProgress(null);

    const config = createMarketplaceTestConfig(selectedScenario);

    const unsubscribe = marketplaceLoadTestingService.onProgress((p) => {
      setProgress(p);
    });

    try {
      const testResult = await marketplaceLoadTestingService.runLoadTest(config);
      setResult(testResult);
      setResults((prev) => [testResult, ...prev].slice(0, 10));

      updatePerformanceTargets(testResult.metrics);
    } catch (error) {
      console.error('[MarketplaceLoadTestDashboard] Test failed:', error);
    } finally {
      setIsRunning(false);
      unsubscribe();
    }
  }, [selectedScenario]);

  const handleRunRaceConditionTest = useCallback(async () => {
    setIsRunning(true);
    setRaceConditionResult(null);

    try {
      const result = await marketplaceLoadTestingService.runRaceConditionTest(10, 30000);
      setRaceConditionResult(result);
    } catch (error) {
      console.error('[MarketplaceLoadTestDashboard] Race condition test failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const handleRunDatabaseTest = useCallback(async () => {
    setIsRunning(true);
    setQueryPerformance([]);

    try {
      const results = await marketplaceLoadTestingService.runDatabasePerformanceTest(50);
      setQueryPerformance(results);
    } catch (error) {
      console.error('[MarketplaceLoadTestDashboard] Database test failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const handleMeasureFrontend = useCallback(() => {
    const metrics = marketplaceLoadTestingService.measureFrontendPerformance();
    setFrontendMetrics(metrics);
  }, []);

  const handleCancelTest = useCallback(() => {
    marketplaceLoadTestingService.cancelTest();
    setIsRunning(false);
  }, []);

  const updatePerformanceTargets = (metrics: MarketplaceLoadTestMetrics) => {
    setPerformanceTargets([
      {
        name: 'Marketplace Load Time',
        target: 2000,
        actual: metrics.averageSearchLatencyMs * 3,
        unit: 'ms',
        passed: metrics.averageSearchLatencyMs * 3 < 2000,
      },
      {
        name: 'Purchase Processing',
        target: 1000,
        actual: metrics.averagePurchaseLatencyMs,
        unit: 'ms',
        passed: metrics.averagePurchaseLatencyMs < 1000,
      },
      {
        name: 'Search Response',
        target: 500,
        actual: metrics.averageSearchLatencyMs,
        unit: 'ms',
        passed: metrics.averageSearchLatencyMs < 500,
      },
      {
        name: 'Concurrent Users',
        target: 100,
        actual: metrics.peakConcurrentUsers,
        unit: 'users',
        passed: metrics.peakConcurrentUsers >= 100,
      },
    ]);
  };

  const getStatusColor = (status: MarketplaceLoadTestResult['status']) => {
    switch (status) {
      case 'passed':
        return '#10B981';
      case 'partial':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: MarketplaceLoadTestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle size={20} color="#10B981" />;
      case 'partial':
        return <AlertTriangle size={20} color="#F59E0B" />;
      case 'failed':
        return <XCircle size={20} color="#EF4444" />;
      default:
        return null;
    }
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {[
        { id: 'load' as TestTab, label: 'Load Tests', icon: Users },
        { id: 'database' as TestTab, label: 'Database', icon: Database },
        { id: 'race' as TestTab, label: 'Race Conditions', icon: Zap },
        { id: 'frontend' as TestTab, label: 'Frontend', icon: BarChart3 },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          onPress={() => setActiveTab(tab.id)}
        >
          <tab.icon size={16} color={activeTab === tab.id ? '#3B82F6' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderScenarioSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Test Scenario</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scenarioList}>
        {MARKETPLACE_LOAD_TEST_SCENARIOS.map((scenario) => (
          <TouchableOpacity
            key={scenario.id}
            style={[
              styles.scenarioCard,
              selectedScenario?.id === scenario.id && styles.scenarioCardSelected,
            ]}
            onPress={() => setSelectedScenario(scenario)}
            disabled={isRunning}
          >
            <View style={styles.scenarioHeader}>
              <Users
                size={16}
                color={selectedScenario?.id === scenario.id ? '#3B82F6' : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.scenarioUsers,
                  selectedScenario?.id === scenario.id && styles.scenarioUsersSelected,
                ]}
              >
                {scenario.config.concurrentUsers} users
              </Text>
            </View>
            <Text
              style={[
                styles.scenarioName,
                selectedScenario?.id === scenario.id && styles.scenarioNameSelected,
              ]}
            >
              {scenario.name}
            </Text>
            <Text style={styles.scenarioDescription} numberOfLines={2}>
              {scenario.description}
            </Text>
            <View style={styles.scenarioStats}>
              {scenario.config.listingsCount && (
                <Text style={styles.scenarioStat}>{scenario.config.listingsCount} listings</Text>
              )}
              {scenario.config.purchasesPerMinute && scenario.config.purchasesPerMinute > 0 && (
                <Text style={styles.scenarioStat}>{scenario.config.purchasesPerMinute}/min purchases</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderProgressSection = () => {
    if (!progress || !isRunning) return null;

    const progressPercent = progress.totalMs > 0
      ? Math.min((progress.elapsedMs / progress.totalMs) * 100, 100)
      : 0;

    return (
      <View style={styles.section}>
        <View style={styles.progressHeader}>
          <Text style={styles.sectionTitle}>Test In Progress</Text>
          <View style={styles.statusBadge}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.statusText}>{progress.status}</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressPercent}>{progressPercent.toFixed(0)}%</Text>

        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <Users size={16} color="#3B82F6" />
            <Text style={styles.progressStatValue}>
              {progress.currentUsers}/{progress.targetUsers}
            </Text>
            <Text style={styles.progressStatLabel}>Users</Text>
          </View>
          <View style={styles.progressStat}>
            <ShoppingCart size={16} color="#10B981" />
            <Text style={styles.progressStatValue}>{progress.purchasesProcessed}</Text>
            <Text style={styles.progressStatLabel}>Purchases</Text>
          </View>
          <View style={styles.progressStat}>
            <Gavel size={16} color="#8B5CF6" />
            <Text style={styles.progressStatValue}>{progress.bidsProcessed}</Text>
            <Text style={styles.progressStatLabel}>Bids</Text>
          </View>
          <View style={styles.progressStat}>
            <Search size={16} color="#F59E0B" />
            <Text style={styles.progressStatValue}>{progress.searchesProcessed}</Text>
            <Text style={styles.progressStatLabel}>Searches</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMetricsCard = (metrics: MarketplaceLoadTestMetrics) => (
    <View style={styles.metricsGrid}>
      <View style={styles.metricCard}>
        <ShoppingCart size={20} color="#10B981" />
        <Text style={styles.metricValue}>
          {metrics.totalPurchases > 0
            ? ((metrics.successfulPurchases / metrics.totalPurchases) * 100).toFixed(1)
            : 0}
          %
        </Text>
        <Text style={styles.metricLabel}>Purchase Success</Text>
      </View>
      <View style={styles.metricCard}>
        <Zap size={20} color="#F59E0B" />
        <Text style={styles.metricValue}>{metrics.averagePurchaseLatencyMs.toFixed(0)}ms</Text>
        <Text style={styles.metricLabel}>Avg Purchase</Text>
      </View>
      <View style={styles.metricCard}>
        <Search size={20} color="#3B82F6" />
        <Text style={styles.metricValue}>{metrics.averageSearchLatencyMs.toFixed(0)}ms</Text>
        <Text style={styles.metricLabel}>Avg Search</Text>
      </View>
      <View style={styles.metricCard}>
        <TrendingUp size={20} color="#8B5CF6" />
        <Text style={styles.metricValue}>{metrics.purchasesPerSecond.toFixed(1)}/s</Text>
        <Text style={styles.metricLabel}>Throughput</Text>
      </View>
    </View>
  );

  const renderResultSection = () => {
    if (!result) return null;

    const evaluation = selectedScenario
      ? evaluateMarketplaceTestResult(selectedScenario, {
          purchaseSuccessRate:
            result.metrics.totalPurchases > 0
              ? result.metrics.successfulPurchases / result.metrics.totalPurchases
              : 1,
          searchSuccessRate:
            result.metrics.totalSearches > 0
              ? result.metrics.successfulSearches / result.metrics.totalSearches
              : 1,
          averagePurchaseLatencyMs: result.metrics.averagePurchaseLatencyMs,
          averageSearchLatencyMs: result.metrics.averageSearchLatencyMs,
        })
      : null;

    return (
      <View style={styles.section}>
        <View style={styles.resultHeader}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <View
            style={[styles.resultBadge, { backgroundColor: `${getStatusColor(result.status)}20` }]}
          >
            {getStatusIcon(result.status)}
            <Text style={[styles.resultBadgeText, { color: getStatusColor(result.status) }]}>
              {result.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.resultSummary}>{result.summary}</Text>

        {renderMetricsCard(result.metrics)}

        <View style={styles.latencyBreakdown}>
          <Text style={styles.subSectionTitle}>Latency Breakdown</Text>
          <View style={styles.latencyRow}>
            <Text style={styles.latencyLabel}>Min</Text>
            <Text style={styles.latencyValue}>{result.metrics.minLatencyMs.toFixed(0)}ms</Text>
          </View>
          <View style={styles.latencyRow}>
            <Text style={styles.latencyLabel}>P95</Text>
            <Text style={styles.latencyValue}>{result.metrics.p95LatencyMs.toFixed(0)}ms</Text>
          </View>
          <View style={styles.latencyRow}>
            <Text style={styles.latencyLabel}>P99</Text>
            <Text style={styles.latencyValue}>{result.metrics.p99LatencyMs.toFixed(0)}ms</Text>
          </View>
          <View style={styles.latencyRow}>
            <Text style={styles.latencyLabel}>Max</Text>
            <Text style={styles.latencyValue}>{result.metrics.maxLatencyMs.toFixed(0)}ms</Text>
          </View>
        </View>

        {evaluation && (
          <View style={styles.evaluationSection}>
            <Text style={styles.subSectionTitle}>Evaluation</Text>
            {evaluation.details.map((detail, index) => (
              <Text
                key={index}
                style={[
                  styles.evaluationItem,
                  detail.startsWith('✓') ? styles.evaluationPass : styles.evaluationFail,
                ]}
              >
                {detail}
              </Text>
            ))}
          </View>
        )}

        {result.recommendations.length > 0 && (
          <View style={styles.recommendationsSection}>
            <Text style={styles.subSectionTitle}>Recommendations</Text>
            {result.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <AlertTriangle size={14} color="#F59E0B" />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderPerformanceTargets = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Performance Targets</Text>
      {performanceTargets.map((target, index) => (
        <View key={index} style={styles.targetRow}>
          <View style={styles.targetInfo}>
            {target.passed ? (
              <CheckCircle size={16} color="#10B981" />
            ) : (
              <XCircle size={16} color="#EF4444" />
            )}
            <Text style={styles.targetName}>{target.name}</Text>
          </View>
          <View style={styles.targetValues}>
            <Text style={[styles.targetActual, target.passed ? styles.targetPass : styles.targetFail]}>
              {target.actual.toFixed(0)} {target.unit}
            </Text>
            <Text style={styles.targetExpected}>/ {target.target} {target.unit}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderDatabaseTab = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Database Performance Test</Text>
        <Text style={styles.sectionDescription}>
          Analyze query performance for listing, search, purchase, and bid operations.
        </Text>
        <TouchableOpacity
          style={[styles.runButton, isRunning && styles.runButtonDisabled]}
          onPress={handleRunDatabaseTest}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Database size={20} color="#FFF" />
          )}
          <Text style={styles.runButtonText}>
            {isRunning ? 'Running...' : 'Run Database Test'}
          </Text>
        </TouchableOpacity>
      </View>

      {queryPerformance.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Query Performance Results</Text>
          {queryPerformance.map((query, index) => (
            <View key={index} style={styles.queryCard}>
              <View style={styles.queryHeader}>
                <Text style={styles.queryName}>{query.queryName}</Text>
                <Text style={[
                  styles.queryBadge,
                  query.slowQueryCount > 0 ? styles.queryBadgeWarn : styles.queryBadgeOk,
                ]}>
                  {query.slowQueryCount > 0 ? `${query.slowQueryCount} slow` : 'OK'}
                </Text>
              </View>
              <View style={styles.queryStats}>
                <View style={styles.queryStat}>
                  <Text style={styles.queryStatLabel}>Avg</Text>
                  <Text style={styles.queryStatValue}>{query.avgExecutionTimeMs.toFixed(0)}ms</Text>
                </View>
                <View style={styles.queryStat}>
                  <Text style={styles.queryStatLabel}>Min</Text>
                  <Text style={styles.queryStatValue}>{query.minExecutionTimeMs.toFixed(0)}ms</Text>
                </View>
                <View style={styles.queryStat}>
                  <Text style={styles.queryStatLabel}>Max</Text>
                  <Text style={styles.queryStatValue}>{query.maxExecutionTimeMs.toFixed(0)}ms</Text>
                </View>
                <View style={styles.queryStat}>
                  <Text style={styles.queryStatLabel}>P95</Text>
                  <Text style={styles.queryStatValue}>{query.p95ExecutionTimeMs.toFixed(0)}ms</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );

  const renderRaceConditionTab = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Race Condition Test</Text>
        <Text style={styles.sectionDescription}>
          Test concurrent bidding with 10 simultaneous bidders to detect race conditions and data inconsistencies.
        </Text>
        <TouchableOpacity
          style={[styles.runButton, isRunning && styles.runButtonDisabled]}
          onPress={handleRunRaceConditionTest}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Zap size={20} color="#FFF" />
          )}
          <Text style={styles.runButtonText}>
            {isRunning ? 'Running...' : 'Run Race Condition Test'}
          </Text>
        </TouchableOpacity>
      </View>

      {raceConditionResult && (
        <View style={styles.section}>
          <View style={styles.resultHeader}>
            <Text style={styles.sectionTitle}>{raceConditionResult.testName}</Text>
            <View
              style={[
                styles.resultBadge,
                { backgroundColor: raceConditionResult.passed ? '#10B98120' : '#EF444420' },
              ]}
            >
              {raceConditionResult.passed ? (
                <CheckCircle size={20} color="#10B981" />
              ) : (
                <XCircle size={20} color="#EF4444" />
              )}
              <Text
                style={[
                  styles.resultBadgeText,
                  { color: raceConditionResult.passed ? '#10B981' : '#EF4444' },
                ]}
              >
                {raceConditionResult.passed ? 'PASSED' : 'FAILED'}
              </Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{raceConditionResult.totalAttempts}</Text>
              <Text style={styles.metricLabel}>Total Attempts</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{raceConditionResult.conflictsDetected}</Text>
              <Text style={styles.metricLabel}>Conflicts</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{raceConditionResult.dataInconsistencies}</Text>
              <Text style={styles.metricLabel}>Inconsistencies</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {raceConditionResult.avgResolutionTimeMs.toFixed(0)}ms
              </Text>
              <Text style={styles.metricLabel}>Avg Resolution</Text>
            </View>
          </View>

          <View style={styles.evaluationSection}>
            {raceConditionResult.details.map((detail, index) => (
              <Text
                key={index}
                style={[
                  styles.evaluationItem,
                  detail.startsWith('✓') ? styles.evaluationPass : styles.evaluationFail,
                ]}
              >
                {detail}
              </Text>
            ))}
          </View>
        </View>
      )}
    </>
  );

  const renderFrontendTab = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frontend Performance</Text>
        <Text style={styles.sectionDescription}>
          Measure page load times, animation performance, memory usage, and re-render counts.
        </Text>
        <TouchableOpacity style={styles.runButton} onPress={handleMeasureFrontend}>
          <RefreshCw size={20} color="#FFF" />
          <Text style={styles.runButtonText}>Measure Performance</Text>
        </TouchableOpacity>
      </View>

      {frontendMetrics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frontend Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Clock size={20} color="#3B82F6" />
              <Text style={styles.metricValue}>{frontendMetrics.pageLoadTimeMs.toFixed(0)}ms</Text>
              <Text style={styles.metricLabel}>Page Load</Text>
            </View>
            <View style={styles.metricCard}>
              <Zap size={20} color="#10B981" />
              <Text style={styles.metricValue}>{frontendMetrics.firstContentfulPaintMs.toFixed(0)}ms</Text>
              <Text style={styles.metricLabel}>FCP</Text>
            </View>
            <View style={styles.metricCard}>
              <TrendingUp size={20} color="#F59E0B" />
              <Text style={styles.metricValue}>{frontendMetrics.scrollPerformanceFps.toFixed(0)} fps</Text>
              <Text style={styles.metricLabel}>Scroll FPS</Text>
            </View>
            <View style={styles.metricCard}>
              <Database size={20} color="#8B5CF6" />
              <Text style={styles.metricValue}>{frontendMetrics.memoryUsageMb.toFixed(1)} MB</Text>
              <Text style={styles.metricLabel}>Memory</Text>
            </View>
          </View>

          <View style={styles.latencyBreakdown}>
            <Text style={styles.subSectionTitle}>Additional Metrics</Text>
            <View style={styles.latencyRow}>
              <Text style={styles.latencyLabel}>Time to Interactive</Text>
              <Text style={styles.latencyValue}>{frontendMetrics.timeToInteractiveMs.toFixed(0)}ms</Text>
            </View>
            <View style={styles.latencyRow}>
              <Text style={styles.latencyLabel}>List Render Time</Text>
              <Text style={styles.latencyValue}>{frontendMetrics.listRenderTimeMs.toFixed(0)}ms</Text>
            </View>
            <View style={styles.latencyRow}>
              <Text style={styles.latencyLabel}>Re-render Count</Text>
              <Text style={styles.latencyValue}>{frontendMetrics.rerenderCount}</Text>
            </View>
            <View style={styles.latencyRow}>
              <Text style={styles.latencyLabel}>Animation Jank</Text>
              <Text style={styles.latencyValue}>{frontendMetrics.animationJankCount}</Text>
            </View>
          </View>
        </View>
      )}
    </>
  );

  const renderLoadTestTab = () => (
    <>
      {renderScenarioSelector()}

      <View style={styles.controls}>
        {!isRunning ? (
          <TouchableOpacity
            style={[styles.runButton, !selectedScenario && styles.runButtonDisabled]}
            onPress={handleRunLoadTest}
            disabled={!selectedScenario}
          >
            <Play size={20} color="#FFF" />
            <Text style={styles.runButtonText}>Run Test</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTest}>
            <Square size={20} color="#FFF" />
            <Text style={styles.cancelButtonText}>Cancel Test</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderProgressSection()}
      {renderResultSection()}
      {renderPerformanceTargets()}
    </>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace Performance Testing</Text>
        <Text style={styles.subtitle}>
          Load test marketplace with simulated users, purchases, and bids
        </Text>
      </View>

      {renderTabs()}

      {activeTab === 'load' && renderLoadTestTab()}
      {activeTab === 'database' && renderDatabaseTab()}
      {activeTab === 'race' && renderRaceConditionTab()}
      {activeTab === 'frontend' && renderFrontendTab()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#3B82F620',
  },
  tabText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 18,
  },
  scenarioList: {
    marginHorizontal: -8,
  },
  scenarioCard: {
    width: 180,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scenarioCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A20',
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  scenarioUsers: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600' as const,
  },
  scenarioUsersSelected: {
    color: '#3B82F6',
  },
  scenarioName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#E5E7EB',
    marginBottom: 4,
  },
  scenarioNameSelected: {
    color: '#FFF',
  },
  scenarioDescription: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
    marginBottom: 8,
  },
  scenarioStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scenarioStat: {
    fontSize: 10,
    color: '#9CA3AF',
    backgroundColor: '#374151',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  controls: {
    marginBottom: 16,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  runButtonDisabled: {
    backgroundColor: '#374151',
  },
  runButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F620',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginBottom: 16,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
    gap: 4,
  },
  progressStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  progressStatLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  resultSummary: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  latencyBreakdown: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  latencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  latencyLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  latencyValue: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600' as const,
  },
  evaluationSection: {
    marginBottom: 16,
  },
  evaluationItem: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  evaluationPass: {
    color: '#10B981',
  },
  evaluationFail: {
    color: '#EF4444',
  },
  recommendationsSection: {
    backgroundColor: '#F59E0B10',
    borderRadius: 10,
    padding: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: '#FCD34D',
    lineHeight: 18,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  targetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetName: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  targetValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  targetActual: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  targetPass: {
    color: '#10B981',
  },
  targetFail: {
    color: '#EF4444',
  },
  targetExpected: {
    fontSize: 12,
    color: '#6B7280',
  },
  queryCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  queryName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  queryBadge: {
    fontSize: 11,
    fontWeight: '600' as const,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  queryBadgeOk: {
    backgroundColor: '#10B98120',
    color: '#10B981',
  },
  queryBadgeWarn: {
    backgroundColor: '#F59E0B20',
    color: '#F59E0B',
  },
  queryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  queryStat: {
    alignItems: 'center',
  },
  queryStatLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  queryStatValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
});
