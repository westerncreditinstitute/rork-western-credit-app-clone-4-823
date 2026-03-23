import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Save,
  DollarSign,
  Target,
  Settings,
  TrendingUp,
  Bell,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useBudget } from '@/contexts/BudgetContext';
import { formatCurrency } from '@/utils/creditEngine';

interface BudgetSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BudgetSettingsModal({ visible, onClose }: BudgetSettingsModalProps) {
  const { colors } = useTheme();
  const { 
    currentBudget, 
    isSaving,
    setMonthlyIncome,
    setSavingsGoal,
    updateSettings,
    saveBudget,
  } = useBudget();

  const [income, setIncome] = useState('');
  const [savingsGoalValue, setSavingsGoalInput] = useState('');
  const [autoSave, setAutoSave] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);

  useEffect(() => {
    if (currentBudget) {
      setIncome(currentBudget.monthly_income.toString());
      setSavingsGoalInput(currentBudget.savings_goal.toString());
      setAutoSave(currentBudget.budget_settings.autoSave);
      setNotifications(currentBudget.budget_settings.notifications);
      setShowWarnings(currentBudget.budget_settings.showWarnings);
    }
  }, [currentBudget]);

  const handleSave = async () => {
    const newIncome = parseFloat(income);
    const newGoal = parseFloat(savingsGoalValue);

    if (isNaN(newIncome) || newIncome < 0) {
      Alert.alert('Error', 'Please enter a valid income amount');
      return;
    }

    if (isNaN(newGoal) || newGoal < 0) {
      Alert.alert('Error', 'Please enter a valid savings goal');
      return;
    }

    await setMonthlyIncome(newIncome);
    await setSavingsGoal(newGoal);
    await updateSettings({
      autoSave,
      notifications,
      showWarnings,
    });

    await saveBudget();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.overlay, { backgroundColor: colors.background + '99' }]}>
          <SafeAreaView style={styles.content} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Settings size={20} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>Budget Settings</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Monthly Income
                </Text>
                <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                  <View style={[styles.inputIcon, { backgroundColor: colors.primary + '20' }]}>
                    <DollarSign size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={income}
                    onChangeText={setIncome}
                    placeholder="Enter monthly income"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Savings Goal
                </Text>
                <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                  <View style={[styles.inputIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Target size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={savingsGoalValue}
                    onChangeText={setSavingsGoalInput}
                    placeholder="Enter savings goal"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Preferences
                </Text>

                <TouchableOpacity
                  style={[styles.settingRow, { borderBottomColor: colors.border }]}
                  onPress={() => setAutoSave(!autoSave)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Save size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>
                      Auto-Save
                    </Text>
                  </View>
                  <View style={[styles.switch, { backgroundColor: autoSave ? colors.primary : colors.border }]}>
                    {autoSave && <Check size={14} color="white" />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingRow, { borderBottomColor: colors.border }]}
                  onPress={() => setNotifications(!notifications)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Bell size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>
                      Notifications
                    </Text>
                  </View>
                  <View style={[styles.switch, { backgroundColor: notifications ? colors.primary : colors.border }]}>
                    {notifications && <Check size={14} color="white" />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingRow]}
                  onPress={() => setShowWarnings(!showWarnings)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.primary + '20' }]}>
                      <TrendingUp size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>
                      Show Warnings
                    </Text>
                  </View>
                  <View style={[styles.switch, { backgroundColor: showWarnings ? colors.primary : colors.border }]}>
                    {showWarnings && <Check size={14} color="white" />}
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Save size={20} color="white" />
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  switch: {
    width: 52,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});