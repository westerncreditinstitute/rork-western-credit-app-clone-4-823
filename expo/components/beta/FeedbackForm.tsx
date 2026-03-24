import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AlertCircle, Send, ChevronDown, X } from 'lucide-react-native';
import type { FeedbackCategory, FeedbackPriority, FeedbackFormData } from '@/types/beta-testing';

interface FeedbackFormProps {
  scenarioId?: string;
  scenarioName?: string;
  onSubmit: (data: FeedbackFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const CATEGORIES: { value: FeedbackCategory; label: string; icon: string }[] = [
  { value: 'bug', label: 'Bug Report', icon: '🐛' },
  { value: 'ux_issue', label: 'UX Issue', icon: '🎨' },
  { value: 'feature_request', label: 'Feature Request', icon: '✨' },
  { value: 'performance', label: 'Performance', icon: '⚡' },
  { value: 'other', label: 'Other', icon: '📝' },
];

const PRIORITIES: { value: FeedbackPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: '#EF4444' },
  { value: 'high', label: 'High', color: '#F97316' },
  { value: 'medium', label: 'Medium', color: '#EAB308' },
  { value: 'low', label: 'Low', color: '#22C55E' },
];

export default function FeedbackForm({
  scenarioId,
  scenarioName,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: FeedbackFormProps) {
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [priority, setPriority] = useState<FeedbackPriority>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (category === 'bug' && !stepsToReproduce.trim()) {
      newErrors.stepsToReproduce = 'Steps to reproduce are required for bug reports';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, description, category, stepsToReproduce]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const data: FeedbackFormData = {
      category,
      priority,
      title: title.trim(),
      description: description.trim(),
      steps_to_reproduce: stepsToReproduce.trim() || undefined,
      expected_behavior: expectedBehavior.trim() || undefined,
      actual_behavior: actualBehavior.trim() || undefined,
      scenario_id: scenarioId,
    };

    await onSubmit(data);
  }, [category, priority, title, description, stepsToReproduce, expectedBehavior, actualBehavior, scenarioId, validate, onSubmit]);

  const selectedCategory = CATEGORIES.find(c => c.value === category);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Submit Feedback</Text>
          {onCancel && (
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {scenarioName && (
          <View style={styles.scenarioTag}>
            <Text style={styles.scenarioTagText}>Related to: {scenarioName}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text style={styles.pickerButtonText}>
              {selectedCategory?.icon} {selectedCategory?.label}
            </Text>
            <ChevronDown size={20} color="#6B7280" />
          </TouchableOpacity>

          {showCategoryPicker && (
            <View style={styles.pickerOptions}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.pickerOption,
                    category === cat.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setCategory(cat.value);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>
                    {cat.icon} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityContainer}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.priorityButton,
                  priority === p.value && { backgroundColor: p.color + '20', borderColor: p.color },
                ]}
                onPress={() => setPriority(p.value)}
              >
                <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                <Text
                  style={[
                    styles.priorityText,
                    priority === p.value && { color: p.color },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            value={title}
            onChangeText={setTitle}
            placeholder="Brief summary of the issue"
            placeholderTextColor="#9CA3AF"
          />
          {errors.title && (
            <View style={styles.errorContainer}>
              <AlertCircle size={14} color="#EF4444" />
              <Text style={styles.errorText}>{errors.title}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detailed description of the issue or feedback"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {errors.description && (
            <View style={styles.errorContainer}>
              <AlertCircle size={14} color="#EF4444" />
              <Text style={styles.errorText}>{errors.description}</Text>
            </View>
          )}
        </View>

        {category === 'bug' && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Steps to Reproduce *</Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.stepsToReproduce && styles.inputError]}
                value={stepsToReproduce}
                onChangeText={setStepsToReproduce}
                placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {errors.stepsToReproduce && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{errors.stepsToReproduce}</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Expected Behavior</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={expectedBehavior}
                onChangeText={setExpectedBehavior}
                placeholder="What should have happened?"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Actual Behavior</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={actualBehavior}
                onChangeText={setActualBehavior}
                placeholder="What actually happened?"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Send size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  scenarioTag: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 20,
  },
  scenarioTagText: {
    fontSize: 14,
    color: '#4338CA',
    fontWeight: '500' as const,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerOptions: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionSelected: {
    backgroundColor: '#F0F9FF',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 40,
  },
});
