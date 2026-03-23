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
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import { loadTestingService } from '@/services/LoadTestingService';
import { LOAD_TEST_SCENARIOS, createTestConfig, evaluateTestResult } from '@/mocks/loadTestScenarios';
import {
  LoadTestResult,
  LoadTestProgress,
  LoadTestScenario,
  LoadTestMetrics,
} from '@/types/loadTesting';

interface LoadTestDashboardProps {
  targetHomeId: string;
}

export default function LoadTestDashboard({ targetHomeId }: LoadTestDashboardProps) {
  const [selectedScenario, setSelectedScenario] = useState<LoadTestScenario | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<LoadTestProgress | null>(null);
  const [result, setResult] = useState<LoadTestResult | null>(null);
  const [results, setResults] = useState<LoadTestResult[]>([]);
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

  const handleRunTest = useCallback(async () => {
    if (!selectedScenario) return;

    setIsRunning(true);
    setResult(null);
    setProgress(null);

    const config = createTestConfig(selectedScenario, targetHomeId);

    const unsubscribe = loadTestingService.onProgress((p) => {
      setProgress(p);
    });

    try {
      const testResult = await loadTestingService.runLoadTest(config);
      setResult(testResult);
      setResults(prev => [testResult, ...prev].slice(0, 10));
    } catch (error) {
      console.error('[LoadTestDashboard] Test failed:', error);
    } finally {
      setIsRunning(false);
      unsubscribe();
    }
  }, [selectedScenario, targetHomeId]);

  const handleCancelTest = useCallback(() => {
    loadTestingService.cancelTest();
    setIsRunning(false);
  }, []);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusColor = (status: LoadTestResult['status']) => {
    switch (status) {
      case 'passed': return '#10B981';
      case 'partial': return '#F59E0B';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: LoadTestResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle size={20} color="#10B981" />;
      case 'partial': return <AlertTriangle size={20} color="#F59E0B" />;
      case 'failed': return <XCircle size={20} color="#EF4444" />;
      default: return null;
    }
  };

  const renderScenarioSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Test Scenario</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scenarioList}>
        {LOAD_TEST_SCENARIOS.map((scenario) => (
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
              <Users size={16} color={selectedScenario?.id === scenario.id ? '#3B82F6' : '#9CA3AF'} />
              <Text style={[
                styles.scenarioUsers,
                selectedScenario?.id === scenario.id && styles.scenarioUsersSelected,
              ]}>
                {scenario.config.concurrentUsers} users
              </Text>
            </View>
            <Text style={[
              styles.scenarioName,
              selectedScenario?.id === scenario.id && styles.scenarioNameSelected,
            ]}>
              {scenario.name}
            </Text>
            <Text style={styles.scenarioDescription} numberOfLines={2}>
              {scenario.description}
            </Text>
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
            <MessageSquare size={16} color="#10B981" />
            <Text style={styles.progressStatValue}>{progress.messagesProcessed}</Text>
            <Text style={styles.progressStatLabel}>Messages</Text>
          </View>
          <View style={styles.progressStat}>
            <Clock size={16} color="#F59E0B" />
            <Text style={styles.progressStatValue}>{formatDuration(progress.elapsedMs)}</Text>
            <Text style={styles.progressStatLabel}>Elapsed</Text>
          </View>
          <View style={styles.progressStat}>
            <AlertTriangle size={16} color="#EF4444" />
            <Text style={styles.progressStatValue}>{progress.errorsCount}</Text>
            <Text style={styles.progressStatLabel}>Errors</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMetricsCard = (metrics: LoadTestMetrics) => (
    <View style={styles.metricsGrid}>
      <View style={styles.metricCard}>
        <TrendingUp size={20} color="#10B981" />
        <Text style={styles.metricValue}>
          {((metrics.successfulConnections / Math.max(metrics.totalConnections, 1)) * 100).toFixed(1)}%
        </Text>
        <Text style={styles.metricLabel}>Connection Success</Text>
      </View>
      <View style={styles.metricCard}>
        <Zap size={20} color="#F59E0B" />
        <Text style={styles.metricValue}>{metrics.averageLatencyMs.toFixed(0)}ms</Text>
        <Text style={styles.metricLabel}>Avg Latency</Text>
      </View>
      <View style={styles.metricCard}>
        <MessageSquare size={20} color="#3B82F6" />
        <Text style={styles.metricValue}>{metrics.messagesPerSecond.toFixed(1)}/s</Text>
        <Text style={styles.metricLabel}>Msg Throughput</Text>
      </View>
      <View style={styles.metricCard}>
        <CheckCircle size={20} color="#8B5CF6" />
        <Text style={styles.metricValue}>
          {(metrics.messageDeliveryRate * 100).toFixed(1)}%
        </Text>
        <Text style={styles.metricLabel}>Delivery Rate</Text>
      </View>
    </View>
  );

  const renderResultSection = () => {
    if (!result) return null;

    const evaluation = selectedScenario 
      ? evaluateTestResult(selectedScenario, {
          connectionSuccessRate: result.metrics.successfulConnections / Math.max(result.metrics.totalConnections, 1),
          averageLatencyMs: result.metrics.averageLatencyMs,
          messageDeliveryRate: result.metrics.messageDeliveryRate,
        })
      : null;

    return (
      <View style={styles.section}>
        <View style={styles.resultHeader}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <View style={[styles.resultBadge, { backgroundColor: `${getStatusColor(result.status)}20` }]}>
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
            <Text style={styles.latencyLabel}>Avg</Text>
            <Text style={styles.latencyValue}>{result.metrics.averageLatencyMs.toFixed(0)}ms</Text>
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

  const renderPreviousResults = () => {
    if (results.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Previous Results</Text>
        {results.slice(0, 5).map((r, index) => (
          <View key={r.testId} style={styles.previousResultCard}>
            <View style={styles.previousResultHeader}>
              {getStatusIcon(r.status)}
              <Text style={styles.previousResultName}>{r.testName}</Text>
            </View>
            <View style={styles.previousResultStats}>
              <Text style={styles.previousResultStat}>
                {r.metrics.peakConcurrentUsers} users
              </Text>
              <Text style={styles.previousResultStat}>
                {r.metrics.averageLatencyMs.toFixed(0)}ms avg
              </Text>
              <Text style={styles.previousResultStat}>
                {formatDuration(r.durationMs)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Load Testing Dashboard</Text>
        <Text style={styles.subtitle}>
          Test multiplayer performance with simulated users
        </Text>
      </View>

      {renderScenarioSelector()}
      
      <View style={styles.controls}>
        {!isRunning ? (
          <TouchableOpacity
            style={[styles.runButton, !selectedScenario && styles.runButtonDisabled]}
            onPress={handleRunTest}
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
      {renderPreviousResults()}
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
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  scenarioList: {
    marginHorizontal: -8,
  },
  scenarioCard: {
    width: 160,
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
    fontWeight: '600',
  },
  scenarioUsersSelected: {
    color: '#3B82F6',
  },
  scenarioName: {
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '600',
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
  previousResultCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  previousResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previousResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  previousResultStats: {
    flexDirection: 'row',
    gap: 16,
  },
  previousResultStat: {
    fontSize: 12,
    color: '#6B7280',
  },
});
