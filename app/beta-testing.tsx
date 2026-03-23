import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  Users,
  ClipboardList,
  MessageSquare,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Bug,
  Lightbulb,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { betaTestingService } from '@/services/BetaTestingService';
import FeedbackForm from '@/components/beta/FeedbackForm';
import ScenarioTracker from '@/components/beta/ScenarioTracker';
import type {
  BetaTester,
  TestScenario,
  TesterScenarioProgress,
  BetaTestingStats,
  BetaFeedback,
  FeedbackFormData,
} from '@/types/beta-testing';

type TabType = 'overview' | 'scenarios' | 'feedback' | 'stats';

export default function BetaTestingScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [tester, setTester] = useState<BetaTester | null>(null);
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [progress, setProgress] = useState<TesterScenarioProgress[]>([]);
  const [feedback, setFeedback] = useState<BetaFeedback[]>([]);
  const [stats, setStats] = useState<BetaTestingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackScenarioId, setFeedbackScenarioId] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      console.log('[BetaTesting] Loading data...');
      
      const [scenariosData, statsData, feedbackData] = await Promise.all([
        betaTestingService.getScenarios(),
        betaTestingService.getStats(),
        betaTestingService.getFeedback(),
      ]);

      setScenarios(scenariosData);
      setStats(statsData);
      setFeedback(feedbackData);

      if (user?.id) {
        let testerData = await betaTestingService.getTesterByUserId(user.id);
        
        if (!testerData) {
          testerData = await betaTestingService.createTestAccount({
            userId: user.id,
            name: user.name,
            email: user.email,
          });
          await betaTestingService.activateTester(testerData.id);
          testerData = await betaTestingService.getTesterById(testerData.id);
        }

        if (testerData) {
          setTester(testerData);
          const progressData = await betaTestingService.getTesterProgress(testerData.id);
          setProgress(progressData);
        }
      }

      console.log('[BetaTesting] Data loaded successfully');
    } catch (error) {
      console.error('[BetaTesting] Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  const handleStartScenario = useCallback(async (scenario: TestScenario) => {
    if (!tester) return;

    try {
      await betaTestingService.startScenario(tester.id, scenario.id);
      const progressData = await betaTestingService.getTesterProgress(tester.id);
      setProgress(progressData);
      setSelectedScenario(scenario);
    } catch (error) {
      console.error('[BetaTesting] Error starting scenario:', error);
      Alert.alert('Error', 'Failed to start scenario');
    }
  }, [tester]);

  const handleStepComplete = useCallback(async (stepId: string, passed: boolean, notes?: string) => {
    if (!tester || !selectedScenario) return;

    const scenarioProgress = progress.find(p => p.scenario_id === selectedScenario.id);
    if (!scenarioProgress) return;

    try {
      await betaTestingService.updateStepResult(scenarioProgress.id, stepId, passed, notes);
      const progressData = await betaTestingService.getTesterProgress(tester.id);
      setProgress(progressData);
    } catch (error) {
      console.error('[BetaTesting] Error updating step:', error);
    }
  }, [tester, selectedScenario, progress]);

  const handleScenarioComplete = useCallback(async (
    status: 'completed' | 'failed',
    notes?: string,
    issues?: string[]
  ) => {
    if (!tester || !selectedScenario) return;

    const scenarioProgress = progress.find(p => p.scenario_id === selectedScenario.id);
    if (!scenarioProgress) return;

    try {
      await betaTestingService.completeScenario(scenarioProgress.id, status, notes, issues);
      const [progressData, statsData, testerData] = await Promise.all([
        betaTestingService.getTesterProgress(tester.id),
        betaTestingService.getStats(),
        betaTestingService.getTesterById(tester.id),
      ]);
      setProgress(progressData);
      setStats(statsData);
      if (testerData) setTester(testerData);
      
      Alert.alert(
        status === 'completed' ? 'Scenario Completed!' : 'Scenario Marked as Failed',
        status === 'completed' 
          ? 'Great job! You can now move on to the next scenario.'
          : 'Thanks for your feedback. This helps us improve.',
        [{ text: 'OK', onPress: () => setSelectedScenario(null) }]
      );
    } catch (error) {
      console.error('[BetaTesting] Error completing scenario:', error);
    }
  }, [tester, selectedScenario, progress]);

  const handleSubmitFeedback = useCallback(async (data: FeedbackFormData) => {
    if (!tester) return;

    setIsSubmitting(true);
    try {
      await betaTestingService.submitFeedback(tester.id, tester.name, data);
      const [feedbackData, statsData, testerData] = await Promise.all([
        betaTestingService.getFeedback(),
        betaTestingService.getStats(),
        betaTestingService.getTesterById(tester.id),
      ]);
      setFeedback(feedbackData);
      setStats(statsData);
      if (testerData) setTester(testerData);
      
      setShowFeedbackForm(false);
      setFeedbackScenarioId(undefined);
      Alert.alert('Thank You!', 'Your feedback has been submitted successfully.');
    } catch (error) {
      console.error('[BetaTesting] Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [tester]);

  const openFeedbackForm = useCallback((scenarioId?: string) => {
    setFeedbackScenarioId(scenarioId);
    setShowFeedbackForm(true);
  }, []);

  const getScenarioStatus = useCallback((scenarioId: string): TesterScenarioProgress | undefined => {
    return progress.find(p => p.scenario_id === scenarioId);
  }, [progress]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading beta testing...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Beta Testing',
          headerStyle: { backgroundColor: '#4F46E5' },
          headerTintColor: '#FFFFFF',
        }}
      />

      {selectedScenario ? (
        <ScenarioTracker
          scenario={selectedScenario}
          progress={getScenarioStatus(selectedScenario.id)}
          onStart={() => handleStartScenario(selectedScenario)}
          onStepComplete={handleStepComplete}
          onComplete={handleScenarioComplete}
          onReportIssue={() => openFeedbackForm(selectedScenario.id)}
        />
      ) : (
        <>
          <View style={styles.tabs}>
            {(['overview', 'scenarios', 'feedback', 'stats'] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={styles.content}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'overview' && (
              <OverviewTab
                tester={tester}
                stats={stats}
                scenarios={scenarios}
                progress={progress}
                onSelectScenario={setSelectedScenario}
                onOpenFeedback={() => openFeedbackForm()}
              />
            )}

            {activeTab === 'scenarios' && (
              <ScenariosTab
                scenarios={scenarios}
                progress={progress}
                onSelectScenario={setSelectedScenario}
              />
            )}

            {activeTab === 'feedback' && (
              <FeedbackTab
                feedback={feedback}
                onNewFeedback={() => openFeedbackForm()}
              />
            )}

            {activeTab === 'stats' && stats && (
              <StatsTab stats={stats} />
            )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </>
      )}

      <Modal
        visible={showFeedbackForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <FeedbackForm
          scenarioId={feedbackScenarioId}
          scenarioName={scenarios.find(s => s.id === feedbackScenarioId)?.name}
          onSubmit={handleSubmitFeedback}
          onCancel={() => {
            setShowFeedbackForm(false);
            setFeedbackScenarioId(undefined);
          }}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </SafeAreaView>
  );
}

function OverviewTab({
  tester,
  stats,
  scenarios,
  progress,
  onSelectScenario,
  onOpenFeedback,
}: {
  tester: BetaTester | null;
  stats: BetaTestingStats | null;
  scenarios: TestScenario[];
  progress: TesterScenarioProgress[];
  onSelectScenario: (scenario: TestScenario) => void;
  onOpenFeedback: () => void;
}) {
  const completedCount = progress.filter(p => p.status === 'completed').length;
  const inProgressScenario = scenarios.find(s => 
    progress.find(p => p.scenario_id === s.id && p.status === 'in_progress')
  );

  return (
    <View style={styles.tabContent}>
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>Welcome, {tester?.name || 'Tester'}!</Text>
        <Text style={styles.welcomeSubtitle}>
          Help us improve by testing scenarios and providing feedback
        </Text>
      </View>

      <View style={styles.quickStats}>
        <View style={styles.quickStatItem}>
          <View style={[styles.quickStatIcon, { backgroundColor: '#DCFCE7' }]}>
            <CheckCircle size={20} color="#22C55E" />
          </View>
          <Text style={styles.quickStatValue}>{completedCount}</Text>
          <Text style={styles.quickStatLabel}>Completed</Text>
        </View>
        <View style={styles.quickStatItem}>
          <View style={[styles.quickStatIcon, { backgroundColor: '#DBEAFE' }]}>
            <ClipboardList size={20} color="#3B82F6" />
          </View>
          <Text style={styles.quickStatValue}>{scenarios.length - completedCount}</Text>
          <Text style={styles.quickStatLabel}>Remaining</Text>
        </View>
        <View style={styles.quickStatItem}>
          <View style={[styles.quickStatIcon, { backgroundColor: '#FEF3C7' }]}>
            <MessageSquare size={20} color="#F59E0B" />
          </View>
          <Text style={styles.quickStatValue}>{tester?.feedback_count || 0}</Text>
          <Text style={styles.quickStatLabel}>Feedback</Text>
        </View>
      </View>

      {inProgressScenario && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Testing</Text>
          <TouchableOpacity
            style={styles.continueCard}
            onPress={() => onSelectScenario(inProgressScenario)}
          >
            <View style={styles.continueContent}>
              <Play size={24} color="#4F46E5" />
              <View style={styles.continueText}>
                <Text style={styles.continueName}>{inProgressScenario.name}</Text>
                <Text style={styles.continueProgress}>
                  {progress.find(p => p.scenario_id === inProgressScenario.id)?.current_step || 0}/
                  {inProgressScenario.steps.length} steps
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={onOpenFeedback}>
            <Bug size={24} color="#EF4444" />
            <Text style={styles.actionText}>Report Bug</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={onOpenFeedback}>
            <Lightbulb size={24} color="#F59E0B" />
            <Text style={styles.actionText}>Suggest Feature</Text>
          </TouchableOpacity>
        </View>
      </View>

      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Progress</Text>
          <View style={styles.overallProgressCard}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${stats.completion_rate}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{stats.completion_rate}% Complete</Text>
            <Text style={styles.progressDetail}>
              {stats.completed_scenarios} of {stats.total_scenarios * stats.total_testers} total tests completed
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function ScenariosTab({
  scenarios,
  progress,
  onSelectScenario,
}: {
  scenarios: TestScenario[];
  progress: TesterScenarioProgress[];
  onSelectScenario: (scenario: TestScenario) => void;
}) {
  const getStatus = (scenarioId: string) => {
    const p = progress.find(pr => pr.scenario_id === scenarioId);
    return p?.status || 'pending';
  };

  return (
    <View style={styles.tabContent}>
      <Text style={styles.scenariosHeader}>Test Scenarios</Text>
      <Text style={styles.scenariosSubheader}>
        Complete each scenario and provide feedback
      </Text>

      {scenarios.map((scenario) => {
        const status = getStatus(scenario.id);
        const scenarioProgress = progress.find(p => p.scenario_id === scenario.id);

        return (
          <TouchableOpacity
            key={scenario.id}
            style={styles.scenarioCard}
            onPress={() => onSelectScenario(scenario)}
          >
            <View style={styles.scenarioHeader}>
              <View style={[styles.scenarioStatus, getStatusStyle(status)]}>
                {status === 'completed' && <CheckCircle size={16} color="#22C55E" />}
                {status === 'failed' && <XCircle size={16} color="#EF4444" />}
                {status === 'in_progress' && <Clock size={16} color="#F59E0B" />}
                {status === 'pending' && <Play size={16} color="#6B7280" />}
              </View>
              <View style={styles.scenarioInfo}>
                <Text style={styles.scenarioName}>{scenario.name}</Text>
                <Text style={styles.scenarioCategory}>
                  {formatCategory(scenario.category)} • ~{scenario.estimated_duration} min
                </Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </View>
            <Text style={styles.scenarioDescription} numberOfLines={2}>
              {scenario.description}
            </Text>
            {scenarioProgress && status !== 'pending' && (
              <View style={styles.scenarioProgressBar}>
                <View
                  style={[
                    styles.scenarioProgressFill,
                    {
                      width: `${(scenarioProgress.current_step / scenario.steps.length) * 100}%`,
                      backgroundColor: status === 'completed' ? '#22C55E' : status === 'failed' ? '#EF4444' : '#4F46E5',
                    },
                  ]}
                />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FeedbackTab({
  feedback,
  onNewFeedback,
}: {
  feedback: BetaFeedback[];
  onNewFeedback: () => void;
}) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.feedbackHeader}>
        <Text style={styles.feedbackTitle}>Submitted Feedback</Text>
        <TouchableOpacity style={styles.newFeedbackButton} onPress={onNewFeedback}>
          <MessageSquare size={16} color="#FFFFFF" />
          <Text style={styles.newFeedbackText}>New</Text>
        </TouchableOpacity>
      </View>

      {feedback.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageSquare size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>No feedback submitted yet</Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={onNewFeedback}>
            <Text style={styles.emptyStateButtonText}>Submit Feedback</Text>
          </TouchableOpacity>
        </View>
      ) : (
        feedback.map((item) => (
          <View key={item.id} style={styles.feedbackCard}>
            <View style={styles.feedbackCardHeader}>
              <View style={[styles.priorityBadge, getPriorityStyle(item.priority)]}>
                <Text style={styles.priorityBadgeText}>{item.priority}</Text>
              </View>
              <View style={[styles.categoryBadge, getCategoryBadgeStyle(item.category)]}>
                <Text style={styles.categoryBadgeText}>{formatFeedbackCategory(item.category)}</Text>
              </View>
              <View style={[styles.statusBadge, getFeedbackStatusStyle(item.status)]}>
                <Text style={styles.statusBadgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.feedbackCardTitle}>{item.title}</Text>
            <Text style={styles.feedbackCardDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.feedbackCardDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function StatsTab({ stats }: { stats: BetaTestingStats }) {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.statsTitle}>Testing Statistics</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Users size={24} color="#4F46E5" />
          <Text style={styles.statValue}>{stats.total_testers}</Text>
          <Text style={styles.statLabel}>Total Testers</Text>
        </View>
        <View style={styles.statCard}>
          <Users size={24} color="#22C55E" />
          <Text style={styles.statValue}>{stats.active_testers}</Text>
          <Text style={styles.statLabel}>Active Testers</Text>
        </View>
        <View style={styles.statCard}>
          <ClipboardList size={24} color="#3B82F6" />
          <Text style={styles.statValue}>{stats.total_scenarios}</Text>
          <Text style={styles.statLabel}>Scenarios</Text>
        </View>
        <View style={styles.statCard}>
          <CheckCircle size={24} color="#22C55E" />
          <Text style={styles.statValue}>{stats.completed_scenarios}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.issuesSection}>
        <Text style={styles.issuesSectionTitle}>Issues Overview</Text>
        <View style={styles.issueRow}>
          <View style={styles.issueIndicator}>
            <AlertTriangle size={18} color="#EF4444" />
          </View>
          <Text style={styles.issueLabel}>Critical Bugs</Text>
          <Text style={styles.issueValue}>{stats.critical_bugs}</Text>
        </View>
        <View style={styles.issueRow}>
          <View style={styles.issueIndicator}>
            <AlertTriangle size={18} color="#F97316" />
          </View>
          <Text style={styles.issueLabel}>High Priority</Text>
          <Text style={styles.issueValue}>{stats.high_priority_issues}</Text>
        </View>
        <View style={styles.issueRow}>
          <View style={styles.issueIndicator}>
            <CheckCircle size={18} color="#22C55E" />
          </View>
          <Text style={styles.issueLabel}>Resolved</Text>
          <Text style={styles.issueValue}>{stats.resolved_issues}</Text>
        </View>
      </View>

      <View style={styles.metricsSection}>
        <Text style={styles.metricsSectionTitle}>Performance Metrics</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Completion Rate</Text>
          <Text style={styles.metricValue}>{stats.completion_rate}%</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Avg. Scenario Duration</Text>
          <Text style={styles.metricValue}>{stats.avg_scenario_duration} min</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Total Feedback</Text>
          <Text style={styles.metricValue}>{stats.total_feedback}</Text>
        </View>
      </View>
    </View>
  );
}

function formatCategory(category: string): string {
  return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatFeedbackCategory(category: string): string {
  const map: Record<string, string> = {
    bug: 'Bug',
    ux_issue: 'UX',
    feature_request: 'Feature',
    performance: 'Performance',
    other: 'Other',
  };
  return map[category] || category;
}

function getStatusStyle(status: string): object {
  switch (status) {
    case 'completed':
      return { backgroundColor: '#DCFCE7' };
    case 'failed':
      return { backgroundColor: '#FEE2E2' };
    case 'in_progress':
      return { backgroundColor: '#FEF3C7' };
    default:
      return { backgroundColor: '#F3F4F6' };
  }
}

function getPriorityStyle(priority: string): object {
  switch (priority) {
    case 'critical':
      return { backgroundColor: '#FEE2E2' };
    case 'high':
      return { backgroundColor: '#FFEDD5' };
    case 'medium':
      return { backgroundColor: '#FEF3C7' };
    default:
      return { backgroundColor: '#DCFCE7' };
  }
}

function getCategoryBadgeStyle(category: string): object {
  switch (category) {
    case 'bug':
      return { backgroundColor: '#FEE2E2' };
    case 'ux_issue':
      return { backgroundColor: '#E0E7FF' };
    case 'feature_request':
      return { backgroundColor: '#D1FAE5' };
    case 'performance':
      return { backgroundColor: '#FEF3C7' };
    default:
      return { backgroundColor: '#F3F4F6' };
  }
}

function getFeedbackStatusStyle(status: string): object {
  switch (status) {
    case 'new':
      return { backgroundColor: '#DBEAFE' };
    case 'reviewed':
      return { backgroundColor: '#E0E7FF' };
    case 'in_progress':
      return { backgroundColor: '#FEF3C7' };
    case 'resolved':
      return { backgroundColor: '#DCFCE7' };
    default:
      return { backgroundColor: '#F3F4F6' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#4F46E5',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  bottomSpacer: {
    height: 40,
  },
  welcomeCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#C7D2FE',
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 12,
  },
  continueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  continueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  continueText: {
    gap: 2,
  },
  continueName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  continueProgress: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
  },
  overallProgressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#111827',
  },
  progressDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  scenariosHeader: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 4,
  },
  scenariosSubheader: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  scenarioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scenarioStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  scenarioCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  scenarioDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  scenarioProgressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  scenarioProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#111827',
  },
  newFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newFeedbackText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  feedbackCardHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#374151',
    textTransform: 'uppercase',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#374151',
    textTransform: 'capitalize',
  },
  feedbackCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 6,
  },
  feedbackCardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  feedbackCardDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  issuesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  issuesSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 12,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  issueIndicator: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  issueLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  issueValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  metricsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricsSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#111827',
  },
});
