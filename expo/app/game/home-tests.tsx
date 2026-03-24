import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Zap,
} from 'lucide-react-native';
import {
  homeVisitationTests,
  runQuickValidation,
  TestResult,
  TestSuiteResult,
  ValidationCheckItem,
} from '@/utils/homeVisitationTests';

type ChecklistStatus = 'passed' | 'failed' | 'skipped' | 'pending';

export default function HomeTestsScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestSuiteResult | null>(null);
  const [quickValidation, setQuickValidation] = useState<{
    homeManager: boolean;
    visitorSystem: boolean;
    itemPlacement: boolean;
    errors: string[];
  } | null>(null);
  const [checklist, setChecklist] = useState<ValidationCheckItem[]>(
    homeVisitationTests.getValidationChecklist()
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'tests' | 'checklist'>('tests');

  const runFullTests = useCallback(async () => {
    setIsRunning(true);
    setTestResults(null);
    
    try {
      console.log('[HomeTests] Starting full test suite...');
      const results = await homeVisitationTests.runAllTests();
      setTestResults(results);
      
      Alert.alert(
        'Tests Complete',
        `${results.passed}/${results.totalTests} tests passed in ${results.duration}ms`
      );
    } catch (error) {
      console.error('[HomeTests] Error running tests:', error);
      Alert.alert('Error', 'Failed to run tests. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  }, []);

  const runQuickTest = useCallback(async () => {
    setIsRunning(true);
    setQuickValidation(null);
    
    try {
      console.log('[HomeTests] Running quick validation...');
      const results = await runQuickValidation();
      setQuickValidation(results);
      
      const allPassed = results.homeManager && results.visitorSystem && results.itemPlacement;
      Alert.alert(
        allPassed ? 'Validation Passed' : 'Validation Issues',
        allPassed 
          ? 'All systems operational!' 
          : `Found ${results.errors.length} issue(s). Check results below.`
      );
    } catch (error) {
      console.error('[HomeTests] Error running validation:', error);
      Alert.alert('Error', 'Failed to run validation.');
    } finally {
      setIsRunning(false);
    }
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const updateChecklistItem = useCallback((index: number, status: ChecklistStatus) => {
    setChecklist(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status };
      return next;
    });
  }, []);

  const getStatusIcon = (status: ChecklistStatus) => {
    switch (status) {
      case 'passed':
        return <CheckCircle size={18} color="#22C55E" />;
      case 'failed':
        return <XCircle size={18} color="#EF4444" />;
      case 'skipped':
        return <Clock size={18} color="#F59E0B" />;
      default:
        return <View style={styles.pendingDot} />;
    }
  };

  const getCategoryStats = (category: string) => {
    const items = checklist.filter(item => item.category === category);
    const passed = items.filter(item => item.status === 'passed').length;
    return `${passed}/${items.length}`;
  };

  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ValidationCheckItem[]>);

  const renderTestResult = (result: TestResult, index: number) => (
    <View key={index} style={[styles.testResultItem, !result.passed && styles.testResultFailed]}>
      <View style={styles.testResultHeader}>
        {result.passed ? (
          <CheckCircle size={16} color="#22C55E" />
        ) : (
          <XCircle size={16} color="#EF4444" />
        )}
        <Text style={[styles.testResultName, !result.passed && styles.testResultNameFailed]} numberOfLines={2}>
          {result.name}
        </Text>
      </View>
      <Text style={styles.testResultDuration}>{result.duration}ms</Text>
      {result.error && (
        <Text style={styles.testResultError}>{result.error}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Home System Tests',
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#F8FAFC',
        }}
      />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tests' && styles.tabActive]}
          onPress={() => setActiveTab('tests')}
        >
          <Play size={18} color={activeTab === 'tests' ? '#3B82F6' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'tests' && styles.tabTextActive]}>
            Tests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'checklist' && styles.tabActive]}
          onPress={() => setActiveTab('checklist')}
        >
          <Clipboard size={18} color={activeTab === 'checklist' ? '#3B82F6' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'checklist' && styles.tabTextActive]}>
            Checklist
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'tests' ? (
          <View style={styles.testsContainer}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.quickButton]}
                onPress={runQuickTest}
                disabled={isRunning}
              >
                {isRunning ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Zap size={20} color="#FFF" />
                    <Text style={styles.actionButtonText}>Quick Validation</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.fullButton]}
                onPress={runFullTests}
                disabled={isRunning}
              >
                {isRunning ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Play size={20} color="#FFF" />
                    <Text style={styles.actionButtonText}>Run Full Suite</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {quickValidation && (
              <View style={styles.quickResultsCard}>
                <Text style={styles.cardTitle}>Quick Validation Results</Text>
                <View style={styles.quickResultRow}>
                  {quickValidation.homeManager ? (
                    <CheckCircle size={18} color="#22C55E" />
                  ) : (
                    <XCircle size={18} color="#EF4444" />
                  )}
                  <Text style={styles.quickResultText}>HomeManager</Text>
                </View>
                <View style={styles.quickResultRow}>
                  {quickValidation.visitorSystem ? (
                    <CheckCircle size={18} color="#22C55E" />
                  ) : (
                    <XCircle size={18} color="#EF4444" />
                  )}
                  <Text style={styles.quickResultText}>VisitorSystem</Text>
                </View>
                <View style={styles.quickResultRow}>
                  {quickValidation.itemPlacement ? (
                    <CheckCircle size={18} color="#22C55E" />
                  ) : (
                    <XCircle size={18} color="#EF4444" />
                  )}
                  <Text style={styles.quickResultText}>ItemPlacementSystem</Text>
                </View>
                {quickValidation.errors.length > 0 && (
                  <View style={styles.errorsContainer}>
                    <Text style={styles.errorsTitle}>Errors:</Text>
                    {quickValidation.errors.map((error, i) => (
                      <Text key={i} style={styles.errorText}>• {error}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {testResults && (
              <View style={styles.resultsCard}>
                <View style={styles.resultsHeader}>
                  <Text style={styles.cardTitle}>Test Suite Results</Text>
                  <TouchableOpacity onPress={runFullTests} disabled={isRunning}>
                    <RefreshCw size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{testResults.totalTests}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, styles.statPassed]}>{testResults.passed}</Text>
                    <Text style={styles.statLabel}>Passed</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, styles.statFailed]}>{testResults.failed}</Text>
                    <Text style={styles.statLabel}>Failed</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{testResults.duration}ms</Text>
                    <Text style={styles.statLabel}>Duration</Text>
                  </View>
                </View>

                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(testResults.passed / testResults.totalTests) * 100}%` },
                    ]}
                  />
                </View>

                <Text style={styles.sectionTitle}>Test Results</Text>
                {testResults.results.map(renderTestResult)}
              </View>
            )}

            {!quickValidation && !testResults && (
              <View style={styles.emptyState}>
                <Play size={48} color="#64748B" />
                <Text style={styles.emptyTitle}>No Tests Run Yet</Text>
                <Text style={styles.emptyDescription}>
                  Run a quick validation to check system health, or run the full test suite for comprehensive testing.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.checklistContainer}>
            <Text style={styles.checklistDescription}>
              Use this checklist to manually verify each component of the home visitation system.
            </Text>

            {Object.entries(groupedChecklist).map(([category, items]) => (
              <View key={category} style={styles.categoryCard}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category)}
                >
                  <View style={styles.categoryTitleRow}>
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <Text style={styles.categoryStats}>{getCategoryStats(category)}</Text>
                  </View>
                  {expandedCategories.has(category) ? (
                    <ChevronUp size={20} color="#64748B" />
                  ) : (
                    <ChevronDown size={20} color="#64748B" />
                  )}
                </TouchableOpacity>

                {expandedCategories.has(category) && (
                  <View style={styles.categoryItems}>
                    {items.map((item, index) => {
                      const globalIndex = checklist.findIndex(
                        ci => ci.category === category && ci.item === item.item
                      );
                      return (
                        <View key={index} style={styles.checklistItem}>
                          <TouchableOpacity
                            style={styles.checklistItemContent}
                            onPress={() => {
                              const nextStatus: ChecklistStatus =
                                item.status === 'pending' ? 'passed' :
                                item.status === 'passed' ? 'failed' :
                                item.status === 'failed' ? 'skipped' : 'pending';
                              updateChecklistItem(globalIndex, nextStatus);
                            }}
                          >
                            {getStatusIcon(item.status)}
                            <Text style={styles.checklistItemText}>{item.item}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}

            <View style={styles.checklistSummary}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <View style={styles.summaryRow}>
                <CheckCircle size={16} color="#22C55E" />
                <Text style={styles.summaryText}>
                  Passed: {checklist.filter(i => i.status === 'passed').length}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <XCircle size={16} color="#EF4444" />
                <Text style={styles.summaryText}>
                  Failed: {checklist.filter(i => i.status === 'failed').length}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Clock size={16} color="#F59E0B" />
                <Text style={styles.summaryText}>
                  Skipped: {checklist.filter(i => i.status === 'skipped').length}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.pendingDot} />
                <Text style={styles.summaryText}>
                  Pending: {checklist.filter(i => i.status === 'pending').length}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#1E3A5F',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  testsContainer: {
    gap: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  quickButton: {
    backgroundColor: '#F59E0B',
  },
  fullButton: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  quickResultsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  quickResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickResultText: {
    fontSize: 15,
    color: '#CBD5E1',
  },
  errorsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#450A0A',
    borderRadius: 8,
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FCA5A5',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#FECACA',
    marginBottom: 4,
  },
  resultsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statPassed: {
    color: '#22C55E',
  },
  statFailed: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
  },
  testResultItem: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  testResultFailed: {
    borderLeftColor: '#EF4444',
  },
  testResultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  testResultName: {
    flex: 1,
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  testResultNameFailed: {
    color: '#FCA5A5',
  },
  testResultDuration: {
    fontSize: 12,
    color: '#64748B',
  },
  testResultError: {
    fontSize: 12,
    color: '#F87171',
    marginTop: 6,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  checklistContainer: {
    gap: 16,
  },
  checklistDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 8,
  },
  categoryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  categoryStats: {
    fontSize: 13,
    color: '#64748B',
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryItems: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  checklistItem: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    overflow: 'hidden',
  },
  checklistItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  checklistItemText: {
    flex: 1,
    fontSize: 14,
    color: '#CBD5E1',
  },
  pendingDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#64748B',
  },
  checklistSummary: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#CBD5E1',
  },
});
