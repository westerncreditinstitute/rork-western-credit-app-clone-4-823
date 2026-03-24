import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react-native';
import type { TestScenario, TesterScenarioProgress, TestStep } from '@/types/beta-testing';

interface ScenarioTrackerProps {
  scenario: TestScenario;
  progress?: TesterScenarioProgress;
  onStart: () => void;
  onStepComplete: (stepId: string, passed: boolean, notes?: string) => void;
  onComplete: (status: 'completed' | 'failed', notes?: string, issues?: string[]) => void;
  onReportIssue: () => void;
  isLoading?: boolean;
}

export default function ScenarioTracker({
  scenario,
  progress,
  onStart,
  onStepComplete,
  onComplete,
  onReportIssue,
  isLoading = false,
}: ScenarioTrackerProps) {
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});
  const [completionNotes, setCompletionNotes] = useState('');
  const [issuesFound, setIssuesFound] = useState<string[]>([]);
  const [newIssue, setNewIssue] = useState('');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const currentStepIndex = progress?.current_step ?? 0;
  const isStarted = progress?.status === 'in_progress';
  const isCompleted = progress?.status === 'completed' || progress?.status === 'failed';

  const getStepStatus = useCallback((stepIndex: number): 'pending' | 'current' | 'passed' | 'failed' => {
    if (!progress) return 'pending';
    if (stepIndex < currentStepIndex) {
      const result = progress.step_results.find(r => r.step_id === scenario.steps[stepIndex].id);
      return result?.passed ? 'passed' : 'failed';
    }
    if (stepIndex === currentStepIndex && isStarted) return 'current';
    return 'pending';
  }, [progress, currentStepIndex, isStarted, scenario.steps]);

  const handleStepComplete = useCallback((step: TestStep, passed: boolean) => {
    onStepComplete(step.id, passed, stepNotes[step.id]);
    setExpandedStep(null);
  }, [onStepComplete, stepNotes]);

  const handleAddIssue = useCallback(() => {
    if (newIssue.trim()) {
      setIssuesFound(prev => [...prev, newIssue.trim()]);
      setNewIssue('');
    }
  }, [newIssue]);

  const handleRemoveIssue = useCallback((index: number) => {
    setIssuesFound(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleComplete = useCallback((status: 'completed' | 'failed') => {
    onComplete(status, completionNotes, issuesFound);
  }, [onComplete, completionNotes, issuesFound]);

  const allStepsCompleted = currentStepIndex >= scenario.steps.length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={[styles.categoryBadge, getCategoryStyle(scenario.category)]}>
            <Text style={styles.categoryText}>{formatCategory(scenario.category)}</Text>
          </View>
          <View style={styles.durationBadge}>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.durationText}>~{scenario.estimated_duration} min</Text>
          </View>
        </View>
        <Text style={styles.title}>{scenario.name}</Text>
        <Text style={styles.description}>{scenario.description}</Text>
      </View>

      {!isStarted && !isCompleted && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={onStart}
          disabled={isLoading}
        >
          <Play size={20} color="#FFFFFF" />
          <Text style={styles.startButtonText}>Start Scenario</Text>
        </TouchableOpacity>
      )}

      {(isStarted || isCompleted) && (
        <>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>Steps</Text>
            <Text style={styles.progressText}>
              {Math.min(currentStepIndex, scenario.steps.length)}/{scenario.steps.length} completed
            </Text>
          </View>

          <View style={styles.stepsContainer}>
            {scenario.steps.map((step, index) => {
              const status = getStepStatus(index);
              const isExpanded = expandedStep === step.id;
              const isCurrent = status === 'current';

              return (
                <View key={step.id}>
                  <TouchableOpacity
                    style={[
                      styles.stepCard,
                      isCurrent && styles.stepCardCurrent,
                      status === 'passed' && styles.stepCardPassed,
                      status === 'failed' && styles.stepCardFailed,
                    ]}
                    onPress={() => isCurrent && setExpandedStep(isExpanded ? null : step.id)}
                    disabled={!isCurrent}
                  >
                    <View style={styles.stepHeader}>
                      <View style={[styles.stepNumber, getStepNumberStyle(status)]}>
                        {status === 'passed' ? (
                          <CheckCircle size={16} color="#22C55E" />
                        ) : status === 'failed' ? (
                          <XCircle size={16} color="#EF4444" />
                        ) : (
                          <Text style={[styles.stepNumberText, isCurrent && styles.stepNumberTextCurrent]}>
                            {index + 1}
                          </Text>
                        )}
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={[styles.stepAction, status !== 'pending' && styles.stepActionCompleted]}>
                          {step.action}
                        </Text>
                        <Text style={styles.stepExpected}>Expected: {step.expected_result}</Text>
                      </View>
                      {isCurrent && (
                        <ChevronRight
                          size={20}
                          color="#6B7280"
                          style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                        />
                      )}
                    </View>
                  </TouchableOpacity>

                  {isExpanded && isCurrent && (
                    <View style={styles.stepExpanded}>
                      <TextInput
                        style={styles.notesInput}
                        placeholder="Add notes about this step (optional)"
                        placeholderTextColor="#9CA3AF"
                        value={stepNotes[step.id] || ''}
                        onChangeText={(text) => setStepNotes(prev => ({ ...prev, [step.id]: text }))}
                        multiline
                      />
                      <View style={styles.stepActions}>
                        <TouchableOpacity
                          style={styles.failButton}
                          onPress={() => handleStepComplete(step, false)}
                        >
                          <XCircle size={18} color="#EF4444" />
                          <Text style={styles.failButtonText}>Failed</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.passButton}
                          onPress={() => handleStepComplete(step, true)}
                        >
                          <CheckCircle size={18} color="#FFFFFF" />
                          <Text style={styles.passButtonText}>Passed</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {allStepsCompleted && !isCompleted && (
            <View style={styles.completionSection}>
              <Text style={styles.sectionTitle}>Complete Scenario</Text>

              <View style={styles.issuesSection}>
                <Text style={styles.issuesLabel}>Issues Found</Text>
                <View style={styles.issueInputRow}>
                  <TextInput
                    style={styles.issueInput}
                    placeholder="Describe an issue..."
                    placeholderTextColor="#9CA3AF"
                    value={newIssue}
                    onChangeText={setNewIssue}
                  />
                  <TouchableOpacity style={styles.addIssueButton} onPress={handleAddIssue}>
                    <Text style={styles.addIssueButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {issuesFound.map((issue, index) => (
                  <View key={index} style={styles.issueTag}>
                    <AlertTriangle size={14} color="#F97316" />
                    <Text style={styles.issueTagText}>{issue}</Text>
                    <TouchableOpacity onPress={() => handleRemoveIssue(index)}>
                      <XCircle size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TextInput
                style={[styles.notesInput, styles.completionNotes]}
                placeholder="Add final notes about this scenario..."
                placeholderTextColor="#9CA3AF"
                value={completionNotes}
                onChangeText={setCompletionNotes}
                multiline
              />

              <View style={styles.completionButtons}>
                <TouchableOpacity
                  style={styles.completeFailButton}
                  onPress={() => handleComplete('failed')}
                >
                  <XCircle size={20} color="#EF4444" />
                  <Text style={styles.completeFailText}>Mark as Failed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.completePassButton}
                  onPress={() => handleComplete('completed')}
                >
                  <CheckCircle size={20} color="#FFFFFF" />
                  <Text style={styles.completePassText}>Complete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isCompleted && (
            <View style={[
              styles.completedBanner,
              progress?.status === 'completed' ? styles.completedBannerSuccess : styles.completedBannerFailed
            ]}>
              {progress?.status === 'completed' ? (
                <CheckCircle size={24} color="#22C55E" />
              ) : (
                <XCircle size={24} color="#EF4444" />
              )}
              <Text style={[
                styles.completedBannerText,
                progress?.status === 'completed' ? styles.completedTextSuccess : styles.completedTextFailed
              ]}>
                Scenario {progress?.status === 'completed' ? 'Completed' : 'Failed'}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.reportButton} onPress={onReportIssue}>
            <MessageSquare size={18} color="#4F46E5" />
            <Text style={styles.reportButtonText}>Report Issue or Feedback</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.criteriaSection}>
        <Text style={styles.sectionTitle}>Acceptance Criteria</Text>
        {scenario.acceptance_criteria.map((criterion, index) => (
          <View key={index} style={styles.criterionItem}>
            <View style={styles.criterionBullet} />
            <Text style={styles.criterionText}>{criterion}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function formatCategory(category: string): string {
  return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getCategoryStyle(category: string): object {
  const colors: Record<string, { bg: string; text: string }> = {
    simple_purchase: { bg: '#DCFCE7', text: '#166534' },
    auction: { bg: '#FEF3C7', text: '#92400E' },
    bulk_trading: { bg: '#DBEAFE', text: '#1E40AF' },
    cross_currency: { bg: '#F3E8FF', text: '#7C3AED' },
    business_sync: { bg: '#FEE2E2', text: '#991B1B' },
  };
  const style = colors[category] || { bg: '#F3F4F6', text: '#374151' };
  return { backgroundColor: style.bg };
}

function getStepNumberStyle(status: string): object {
  switch (status) {
    case 'current':
      return { backgroundColor: '#4F46E5', borderColor: '#4F46E5' };
    case 'passed':
      return { backgroundColor: '#DCFCE7', borderColor: '#22C55E' };
    case 'failed':
      return { backgroundColor: '#FEE2E2', borderColor: '#EF4444' };
    default:
      return { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#374151',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: '#4F46E5',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  stepsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepCardCurrent: {
    borderColor: '#4F46E5',
    backgroundColor: '#F5F3FF',
  },
  stepCardPassed: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  stepCardFailed: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  stepNumberTextCurrent: {
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepAction: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#111827',
    marginBottom: 4,
  },
  stepActionCompleted: {
    color: '#6B7280',
  },
  stepExpected: {
    fontSize: 13,
    color: '#6B7280',
  },
  stepExpanded: {
    backgroundColor: '#FFFFFF',
    marginTop: -8,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#4F46E5',
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 60,
    marginBottom: 12,
  },
  stepActions: {
    flexDirection: 'row',
    gap: 12,
  },
  failButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  failButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  passButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#22C55E',
  },
  passButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  completionSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  issuesSection: {
    marginTop: 16,
  },
  issuesLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 8,
  },
  issueInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  issueInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  addIssueButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addIssueButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
  },
  issueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  issueTagText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  completionNotes: {
    marginTop: 16,
  },
  completionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  completeFailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  completeFailText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  completePassButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#22C55E',
  },
  completePassText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  completedBannerSuccess: {
    backgroundColor: '#DCFCE7',
  },
  completedBannerFailed: {
    backgroundColor: '#FEE2E2',
  },
  completedBannerText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  completedTextSuccess: {
    color: '#166534',
  },
  completedTextFailed: {
    color: '#991B1B',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4F46E5',
    backgroundColor: '#F5F3FF',
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#4F46E5',
  },
  criteriaSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  criterionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
  },
  criterionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4F46E5',
    marginTop: 6,
  },
  criterionText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});
