import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Home,
  Zap,
  Car,
  Shield,
  ShoppingBag,
  Utensils,
  Tv,
  Plus,
  Trash2,
  X,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Edit2,
  Check,
  AlertTriangle,
  MoreHorizontal,
  CreditCard,
  Lock,
  CheckCircle,
  Calendar,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Save,
  History,
  CloudUpload,
  CloudDownload,
  AlertOctagon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useBudget } from '@/contexts/BudgetContext';
import { formatCurrency } from '@/utils/creditEngine';
import { Expense, ExpenseCategory } from '@/types/game';
import BudgetSettingsModal from './budget-settings-modal';

const CATEGORY_CONFIG: Record<ExpenseCategory, { icon: any; color: string; label: string }> = {
  housing: { icon: Home, color: '#3B82F6', label: 'Housing' },
  utilities: { icon: Zap, color: '#F59E0B', label: 'Utilities' },
  transportation: { icon: Car, color: '#10B981', label: 'Transportation' },
  insurance: { icon: Shield, color: '#8B5CF6', label: 'Insurance' },
  groceries: { icon: ShoppingBag, color: '#EC4899', label: 'Groceries' },
  dining: { icon: Utensils, color: '#EF4444', label: 'Dining' },
  entertainment: { icon: Tv, color: '#06B6D4', label: 'Entertainment' },
  shopping: { icon: ShoppingBag, color: '#F97316', label: 'Shopping' },
  healthcare: { icon: Shield, color: '#14B8A6', label: 'Healthcare' },
  education: { icon: TrendingUp, color: '#6366F1', label: 'Education' },
  personal_care: { icon: Shield, color: '#D946EF', label: 'Personal Care' },
  subscriptions: { icon: Tv, color: '#8B5CF6', label: 'Subscriptions' },
  debt_payment: { icon: DollarSign, color: '#EF4444', label: 'Debt Payment' },
  savings: { icon: PiggyBank, color: '#10B981', label: 'Savings' },
  emergency: { icon: Shield, color: '#F59E0B', label: 'Emergency' },
  other: { icon: MoreHorizontal, color: '#64748B', label: 'Other' },
};

function BudgetScreen() {
  const { colors } = useTheme();
  const { gameState, addExpense, removeExpense, updateBalance, totalMonthlyExpenses, updateExpenseAmount, updateCreditAccount, markExpensePaid, getCurrentMonthKey, recordBudgetTransaction, tokenWallet, isSyncing } = useGame();
  const { 
    currentBudget, 
    isLoading: budgetLoading, 
    isSaving: budgetSaving, 
    hasUnsavedChanges,
    lastSavedAt,
    saveBudget,
    setMonthlyIncome,
    setSavingsGoal,
    addCustomExpense,
    removeCustomExpense,
    updateExpenseLimit,
    loadActivityLog,
  } = useBudget();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'expense' | 'transfer' | 'income'>('all');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    category: 'shopping' as ExpenseCategory,
    isFixed: false,
  });
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFrom, setTransferFrom] = useState<'bank' | 'savings' | 'emergency'>('bank');
  const [transferTo, setTransferTo] = useState<'bank' | 'savings' | 'emergency'>('savings');

  const handleTransferFromChange = (newFrom: 'bank' | 'savings' | 'emergency') => {
    setTransferFrom(newFrom);
    if (transferTo === newFrom) {
      if (newFrom === 'bank') setTransferTo('savings');
      else if (newFrom === 'savings') setTransferTo('bank');
      else setTransferTo('bank');
    }
  };

  const handleTransferToChange = (newTo: 'bank' | 'savings' | 'emergency') => {
    if (newTo !== transferFrom) {
      setTransferTo(newTo);
    }
  };
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedExpenseForPayment, setSelectedExpenseForPayment] = useState<Expense | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState('');
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);

  const currentMonth = useMemo(() => {
    return getCurrentMonthKey(gameState.currentDate);
  }, [gameState.currentDate, getCurrentMonthKey]);

  const paidExpenses = useMemo(() => {
    const filteredExpenses: Record<string, { paidAt: number; method: string }> = {};
    Object.entries(gameState.paidExpenses || {}).forEach(([expenseId, record]) => {
      if (record.monthKey === currentMonth) {
        filteredExpenses[expenseId] = { paidAt: record.paidAt, method: record.method };
      }
    });
    return filteredExpenses;
  }, [gameState.paidExpenses, currentMonth]);

  const getExpenseDueDay = (expense: Expense): number => {
    if (expense.dueDay) return expense.dueDay;
    switch (expense.category) {
      case 'housing': return 1;
      case 'utilities': return 15;
      case 'insurance': return 1;
      case 'transportation': return 10;
      case 'subscriptions': return 5;
      default: return 15;
    }
  };

  const getDueDateStatus = (expense: Expense): { status: 'paid' | 'due_soon' | 'overdue' | 'upcoming'; daysUntilDue: number } => {
    if (paidExpenses[expense.id]) {
      return { status: 'paid', daysUntilDue: 0 };
    }
    
    const currentDate = new Date(gameState.currentDate);
    const currentDay = currentDate.getDate();
    const dueDay = getExpenseDueDay(expense);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    
    let daysUntilDue: number;
    if (dueDay >= currentDay) {
      daysUntilDue = dueDay - currentDay;
    } else {
      daysUntilDue = (daysInMonth - currentDay) + dueDay;
    }
    
    if (dueDay < currentDay && daysUntilDue > 15) {
      return { status: 'overdue', daysUntilDue: currentDay - dueDay };
    } else if (daysUntilDue <= 3) {
      return { status: 'due_soon', daysUntilDue };
    }
    return { status: 'upcoming', daysUntilDue };
  };

  const monthlyIncome = currentBudget?.monthly_income || gameState.monthlyIncome;
  const netIncome = monthlyIncome - totalMonthlyExpenses;

  const expensesByCategory = gameState.expenses.reduce((acc, expense) => {
    const category = expense.category;
    if (!acc[category]) {
      acc[category] = { total: 0, items: [] };
    }
    let amount = expense.amount;
    if (expense.frequency === 'weekly') amount *= 4;
    if (expense.frequency === 'annual') amount /= 12;
    acc[category].total += amount;
    acc[category].items.push(expense);
    return acc;
  }, {} as Record<string, { total: number; items: Expense[] }>);

  const handleAddExpense = () => {
    if (!newExpense.name || !newExpense.amount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const expense: Expense = {
      id: `custom_${Date.now()}`,
      name: newExpense.name,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      frequency: 'monthly',
      isFixed: newExpense.isFixed,
    };

    // Add to GameContext
    addExpense(expense);
    
    // Add to BudgetContext for persistence
    addCustomExpense({
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      category: expense.category,
      frequency: 'monthly',
      isFixed: expense.isFixed,
      createdAt: Date.now(),
    });
    
    setShowAddModal(false);
    setNewExpense({ name: '', amount: '', category: 'shopping', isFixed: false });
  };

  const DEFAULT_EXPENSE_IDS = [
    'exp_rent',
    'exp_utilities',
    'exp_phone',
    'exp_internet',
    'exp_groceries',
    'exp_transportation',
    'exp_health_insurance',
    'exp_renters_insurance',
    'exp_personal_care',
    'exp_entertainment',
    'exp_dining',
  ];

  const isDefaultExpense = (expenseId: string) => {
    return DEFAULT_EXPENSE_IDS.includes(expenseId);
  };

  const handleRemoveExpense = (expenseId: string) => {
    if (isDefaultExpense(expenseId)) {
      Alert.alert(
        'Cannot Remove',
        'This is a default monthly expense and cannot be removed. These are essential living expenses that must be paid each month.'
      );
      return;
    }
    Alert.alert(
      'Remove Expense',
      'Are you sure you want to remove this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: () => {
            // Remove from GameContext
            removeExpense(expenseId);
            // Remove from BudgetContext for persistence
            removeCustomExpense(expenseId);
          } 
        },
      ]
    );
  };

  const handlePayExpense = (expense: Expense) => {
    setSelectedExpenseForPayment(expense);
    setShowPaymentMethodModal(true);
  };

  const getAvailableCreditCards = () => {
    return gameState.creditAccounts.filter(account => 
      account.type === 'credit_card'
    );
  };

  const handlePayWithBank = () => {
    if (!selectedExpenseForPayment) return;
    
    let monthlyAmount = selectedExpenseForPayment.amount;
    if (selectedExpenseForPayment.frequency === 'weekly') monthlyAmount *= 4;
    if (selectedExpenseForPayment.frequency === 'annual') monthlyAmount /= 12;

    if (gameState.bankBalance < monthlyAmount) {
      Alert.alert(
        'Insufficient Funds',
        `You need ${formatCurrency(monthlyAmount)} to pay this expense, but your bank balance is ${formatCurrency(gameState.bankBalance)}.`
      );
      return;
    }

    updateBalance(-monthlyAmount, 'bank');
    
    markExpensePaid(selectedExpenseForPayment.id, 'Bank Account');
    
    recordBudgetTransaction(
      'expense_payment',
      monthlyAmount,
      `Paid ${selectedExpenseForPayment.name}`,
      {
        expenseId: selectedExpenseForPayment.id,
        expenseName: selectedExpenseForPayment.name,
        paymentMethod: 'Bank Account',
        category: selectedExpenseForPayment.category,
      }
    );

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowPaymentMethodModal(false);
    setSelectedExpenseForPayment(null);
    Alert.alert('Payment Successful', `${selectedExpenseForPayment.name} has been paid from your bank account!`);
  };

  const handlePayWithCreditCard = (cardId: string) => {
    if (!selectedExpenseForPayment) return;
    
    let monthlyAmount = selectedExpenseForPayment.amount;
    if (selectedExpenseForPayment.frequency === 'weekly') monthlyAmount *= 4;
    if (selectedExpenseForPayment.frequency === 'annual') monthlyAmount /= 12;

    const card = gameState.creditAccounts.find(acc => acc.id === cardId);
    if (!card) {
      Alert.alert('Error', 'Credit card not found');
      return;
    }

    const availableCredit = card.creditLimit - card.balance;
    if (availableCredit < monthlyAmount) {
      Alert.alert(
        'Insufficient Credit',
        `You need ${formatCurrency(monthlyAmount)} but only have ${formatCurrency(availableCredit)} available on this card.`
      );
      return;
    }

    updateCreditAccount(cardId, { balance: card.balance + monthlyAmount });

    markExpensePaid(selectedExpenseForPayment.id, card.institutionName);
    
    recordBudgetTransaction(
      'credit_card_charge',
      monthlyAmount,
      `Charged ${selectedExpenseForPayment.name} to ${card.institutionName}`,
      {
        expenseId: selectedExpenseForPayment.id,
        expenseName: selectedExpenseForPayment.name,
        paymentMethod: card.institutionName,
        creditCardId: card.id,
        creditCardName: card.institutionName,
        category: selectedExpenseForPayment.category,
      }
    );

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowPaymentMethodModal(false);
    setSelectedExpenseForPayment(null);
    Alert.alert('Payment Successful', `${selectedExpenseForPayment.name} has been charged to ${card.institutionName}!`);
  };

  const handleEditExpense = (expenseId: string, currentAmount: number) => {
    setEditingExpenseId(expenseId);
    setEditingAmount(currentAmount.toString());
  };

  const handleSaveExpenseEdit = () => {
    if (editingExpenseId) {
      const newAmount = parseFloat(editingAmount);
      if (!isNaN(newAmount) && newAmount >= 0) {
        // Update in GameContext
        updateExpenseAmount(editingExpenseId, newAmount);
        
        // Update expense limit in BudgetContext if needed
        const expense = gameState.expenses.find(e => e.id === editingExpenseId);
        if (expense && !isDefaultExpense(editingExpenseId)) {
          updateExpenseLimit(expense.category, newAmount);
        }
      }
      setEditingExpenseId(null);
      setEditingAmount('');
    }
  };

  const getAccountBalance = (account: 'bank' | 'savings' | 'emergency') => {
    switch (account) {
      case 'bank': return gameState.bankBalance;
      case 'savings': return gameState.savingsBalance;
      case 'emergency': return gameState.emergencyFund;
    }
  };

  const getAccountLabel = (account: 'bank' | 'savings' | 'emergency') => {
    switch (account) {
      case 'bank': return 'Checking';
      case 'savings': return 'Savings';
      case 'emergency': return 'Emergency';
    }
  };

  const handleTransfer = () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    if (transferFrom === transferTo) {
      Alert.alert('Error', 'Cannot transfer to the same account');
      return;
    }

    const sourceBalance = getAccountBalance(transferFrom);
    if (amount > sourceBalance) {
      Alert.alert('Error', `Insufficient funds in ${getAccountLabel(transferFrom)} account`);
      return;
    }

    updateBalance(-amount, transferFrom);
    updateBalance(amount, transferTo);
    
    recordBudgetTransaction(
      'transfer',
      amount,
      `Transfer: ${getAccountLabel(transferFrom)} → ${getAccountLabel(transferTo)}`,
      {
        fromAccount: transferFrom,
        toAccount: transferTo,
        category: 'transfer',
      }
    );
    
    setShowTransferModal(false);
    setTransferAmount('');
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert('Transfer Successful', `${formatCurrency(amount)} transferred from ${getAccountLabel(transferFrom)} to ${getAccountLabel(transferTo)}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {gameState.gameMode === 'real' && (
          <View style={[styles.realModeBanner, { backgroundColor: '#3B82F620' }]}>
            <AlertTriangle size={16} color="#3B82F6" />
            <Text style={[styles.realModeBannerText, { color: '#3B82F6' }]}>
              Real Data Mode: Tap any expense to edit the amount
            </Text>
          </View>
        )}

        {/* Budget Sync Status Indicator */}
        {(budgetLoading || budgetSaving || hasUnsavedChanges) && (
          <View style={[styles.syncBanner, { backgroundColor: colors.surface }]}>
            {budgetLoading ? (
              <View style={styles.syncRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.syncText, { color: colors.textSecondary }]}>
                  Loading budget...
                </Text>
              </View>
            ) : budgetSaving ? (
              <View style={styles.syncRow}>
                <CloudUpload size={16} color={colors.primary} />
                <Text style={[styles.syncText, { color: colors.textSecondary }]}>
                  Saving budget...
                </Text>
              </View>
            ) : hasUnsavedChanges ? (
              <View style={styles.syncRow}>
                <AlertOctagon size={16} color="#F59E0B" />
                <Text style={[styles.syncText, { color: '#F59E0B' }]}>
                  Unsaved changes
                </Text>
                <TouchableOpacity 
                  style={[styles.syncButton, { backgroundColor: colors.primary }]}
                  onPress={saveBudget}
                >
                  <Save size={14} color="white" />
                  <Text style={styles.syncButtonText}>Save Now</Text>
                </TouchableOpacity>
              </View>
            ) : lastSavedAt && (
              <View style={styles.syncRow}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={[styles.syncText, { color: colors.textSecondary }]}>
                  Saved {new Date(lastSavedAt).toLocaleTimeString()}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Monthly Overview</Text>
            <TouchableOpacity 
              style={[styles.settingsButton, { backgroundColor: colors.surface + '80' }]}
              onPress={() => setShowBudgetSettings(true)}
            >
              <Edit2 size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <TrendingUp size={20} color="#10B981" />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {formatCurrency(monthlyIncome)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <TrendingDown size={20} color="#EF4444" />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Expenses</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                {formatCurrency(totalMonthlyExpenses)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <DollarSign size={20} color={netIncome >= 0 ? '#10B981' : '#EF4444'} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Net</Text>
              <Text style={[styles.summaryValue, { color: netIncome >= 0 ? '#10B981' : '#EF4444' }]}>
                {netIncome >= 0 ? '+' : ''}{formatCurrency(netIncome)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.balancesCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Balances</Text>
          
          <View style={styles.balanceRow}>
            <View style={[styles.balanceIcon, { backgroundColor: '#3B82F620' }]}>
              <DollarSign size={20} color="#3B82F6" />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Bank Account</Text>
              <Text style={[styles.balanceValue, { color: colors.text }]}>
                {formatCurrency(gameState.bankBalance)}
              </Text>
            </View>
          </View>
          
          <View style={styles.balanceRow}>
            <View style={[styles.balanceIcon, { backgroundColor: '#10B98120' }]}>
              <PiggyBank size={20} color="#10B981" />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Savings</Text>
              <Text style={[styles.balanceValue, { color: colors.text }]}>
                {formatCurrency(gameState.savingsBalance)}
              </Text>
            </View>
          </View>
          
          <View style={styles.balanceRow}>
            <View style={[styles.balanceIcon, { backgroundColor: '#F59E0B20' }]}>
              <Shield size={20} color="#F59E0B" />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Emergency Fund</Text>
              <Text style={[styles.balanceValue, { color: colors.text }]}>
                {formatCurrency(gameState.emergencyFund)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.transferButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowTransferModal(true)}
          >
            <Text style={styles.transferButtonText}>Transfer Funds</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.expensesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Expenses</Text>
            {gameState.gameMode === 'real' && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={18} color="#FFF" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {Object.entries(expensesByCategory).map(([category, data]) => {
            const config = CATEGORY_CONFIG[category as ExpenseCategory];
            if (!config) return null;
            const Icon = config.icon;

            return (
              <View key={category} style={[styles.categoryCard, { backgroundColor: colors.surface }]}>
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryIcon, { backgroundColor: config.color + '20' }]}>
                    <Icon size={20} color={config.color} />
                  </View>
                  <Text style={[styles.categoryTitle, { color: colors.text }]}>{config.label}</Text>
                  <Text style={[styles.categoryTotal, { color: config.color }]}>
                    {formatCurrency(data.total)}
                  </Text>
                </View>

                {data.items.map((expense) => {
                  const isDefault = isDefaultExpense(expense.id);
                  let monthlyAmount = expense.amount;
                  if (expense.frequency === 'weekly') monthlyAmount *= 4;
                  if (expense.frequency === 'annual') monthlyAmount /= 12;
                  
                  const dueDay = getExpenseDueDay(expense);
                  const { status: paymentStatus, daysUntilDue } = getDueDateStatus(expense);
                  const isPaid = paymentStatus === 'paid';

                  return (
                    <View key={expense.id} style={[styles.expenseItem, isPaid && styles.expenseItemPaid]}>
                      <View style={styles.expenseInfo}>
                        <View style={styles.expenseNameRow}>
                          <Text style={[styles.expenseName, { color: colors.text }]}>{expense.name}</Text>
                          {isPaid && (
                            <View style={[styles.paidBadge, { backgroundColor: '#10B98120' }]}>
                              <CheckCircle size={10} color="#10B981" />
                              <Text style={styles.paidBadgeText}>Paid</Text>
                            </View>
                          )}
                          {isDefault && !isPaid && (
                            <View style={[styles.defaultBadge, { backgroundColor: colors.primary + '20' }]}>
                              <Lock size={10} color={colors.primary} />
                              <Text style={[styles.defaultBadgeText, { color: colors.primary }]}>Required</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.expenseMetaRow}>
                          <Text style={[styles.expenseFrequency, { color: colors.textLight }]}>
                            {expense.frequency} {expense.isFixed ? '• Fixed' : '• Variable'}
                          </Text>
                          <View style={styles.dueDateContainer}>
                            {isPaid ? (
                              <Text style={[styles.paidOnText, { color: '#10B981' }]}>
                                Paid via {paidExpenses[expense.id]?.method}
                              </Text>
                            ) : (
                              <>
                                <Calendar size={10} color={paymentStatus === 'overdue' ? '#EF4444' : paymentStatus === 'due_soon' ? '#F59E0B' : colors.textLight} />
                                <Text style={[
                                  styles.dueDateText,
                                  { color: paymentStatus === 'overdue' ? '#EF4444' : paymentStatus === 'due_soon' ? '#F59E0B' : colors.textLight }
                                ]}>
                                  {paymentStatus === 'overdue' 
                                    ? `Overdue by ${daysUntilDue} days`
                                    : paymentStatus === 'due_soon'
                                      ? `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`
                                      : `Due on the ${dueDay}${dueDay === 1 ? 'st' : dueDay === 2 ? 'nd' : dueDay === 3 ? 'rd' : 'th'}`
                                  }
                                </Text>
                              </>
                            )}
                          </View>
                        </View>
                      </View>
                      {editingExpenseId === expense.id ? (
                        <View style={styles.editAmountContainer}>
                          <TextInput
                            style={[styles.editAmountInput, { backgroundColor: colors.background, color: colors.text }]}
                            value={editingAmount}
                            onChangeText={setEditingAmount}
                            keyboardType="numeric"
                            autoFocus
                          />
                          <TouchableOpacity
                            onPress={handleSaveExpenseEdit}
                            style={[styles.saveEditButton, { backgroundColor: '#10B981' }]}
                          >
                            <Check size={16} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.expenseActions}>
                          <TouchableOpacity
                            onPress={() => gameState.gameMode === 'real' && handleEditExpense(expense.id, expense.amount)}
                            disabled={gameState.gameMode !== 'real'}
                          >
                            <Text style={[styles.expenseAmount, { color: colors.text }]}>
                              {formatCurrency(monthlyAmount)}
                            </Text>
                          </TouchableOpacity>
                          {gameState.gameMode === 'real' && (
                            <TouchableOpacity
                              onPress={() => handleEditExpense(expense.id, expense.amount)}
                              style={styles.editButton}
                            >
                              <Edit2 size={14} color={colors.primary} />
                            </TouchableOpacity>
                          )}
                          {!isPaid && (
                            <TouchableOpacity
                              onPress={() => handlePayExpense(expense)}
                              style={[styles.payNowButton, { backgroundColor: paymentStatus === 'overdue' ? '#EF4444' : paymentStatus === 'due_soon' ? '#F59E0B' : '#10B981' }]}
                            >
                              <CreditCard size={12} color="#FFF" />
                              <Text style={styles.payNowButtonText}>
                                {paymentStatus === 'overdue' ? 'Pay Now!' : paymentStatus === 'due_soon' ? 'Pay Soon' : 'Pay'}
                              </Text>
                            </TouchableOpacity>
                          )}
                          {isPaid && (
                            <View style={styles.paidCheckmark}>
                              <CheckCircle size={20} color="#10B981" />
                            </View>
                          )}
                          {!isDefault ? (
                            <TouchableOpacity
                              onPress={() => handleRemoveExpense(expense.id)}
                              style={styles.deleteButton}
                            >
                              <Trash2 size={16} color="#EF4444" />
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.lockedPlaceholder} />
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        {/* Transaction History Section */}
        <View style={[styles.transactionHistorySection, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.transactionHistoryHeader}
            onPress={() => setShowTransactionHistory(!showTransactionHistory)}
          >
            <View style={styles.transactionHistoryTitleRow}>
              <View style={[styles.transactionHistoryIcon, { backgroundColor: '#8B5CF620' }]}>
                <Receipt size={20} color="#8B5CF6" />
              </View>
              <View>
                <Text style={[styles.transactionHistoryTitle, { color: colors.text }]}>Transaction History</Text>
                <Text style={[styles.transactionHistorySubtitle, { color: colors.textSecondary }]}>
                  {tokenWallet.transactions.length} transactions
                </Text>
              </View>
            </View>
            <View style={styles.transactionHistoryToggle}>
              {isSyncing && <RefreshCw size={14} color={colors.primary} style={{ marginRight: 8 }} />}
              {showTransactionHistory ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </View>
          </TouchableOpacity>

          {showTransactionHistory && (
            <View style={styles.transactionHistoryContent}>
              {/* Filter Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
                <TouchableOpacity
                  style={[
                    styles.filterTab,
                    { backgroundColor: transactionFilter === 'all' ? colors.primary : colors.surfaceAlt }
                  ]}
                  onPress={() => setTransactionFilter('all')}
                >
                  <Text style={[
                    styles.filterTabText,
                    { color: transactionFilter === 'all' ? '#FFF' : colors.text }
                  ]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterTab,
                    { backgroundColor: transactionFilter === 'expense' ? '#EF4444' : colors.surfaceAlt }
                  ]}
                  onPress={() => setTransactionFilter('expense')}
                >
                  <Text style={[
                    styles.filterTabText,
                    { color: transactionFilter === 'expense' ? '#FFF' : colors.text }
                  ]}>Expenses</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterTab,
                    { backgroundColor: transactionFilter === 'transfer' ? '#3B82F6' : colors.surfaceAlt }
                  ]}
                  onPress={() => setTransactionFilter('transfer')}
                >
                  <Text style={[
                    styles.filterTabText,
                    { color: transactionFilter === 'transfer' ? '#FFF' : colors.text }
                  ]}>Transfers</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterTab,
                    { backgroundColor: transactionFilter === 'income' ? '#10B981' : colors.surfaceAlt }
                  ]}
                  onPress={() => setTransactionFilter('income')}
                >
                  <Text style={[
                    styles.filterTabText,
                    { color: transactionFilter === 'income' ? '#FFF' : colors.text }
                  ]}>Income</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Transaction List */}
              {tokenWallet.transactions.length === 0 ? (
                <View style={styles.emptyTransactions}>
                  <Receipt size={40} color={colors.textLight} />
                  <Text style={[styles.emptyTransactionsText, { color: colors.textSecondary }]}>
                    No transactions yet
                  </Text>
                  <Text style={[styles.emptyTransactionsSubtext, { color: colors.textLight }]}>
                    Your payment and transfer history will appear here
                  </Text>
                </View>
              ) : (
                <View style={styles.transactionsList}>
                  {tokenWallet.transactions
                    .filter(tx => {
                      if (transactionFilter === 'all') return true;
                      if (transactionFilter === 'expense') {
                        return tx.metadata?.source === 'expense_payment' || tx.metadata?.source === 'credit_card_charge' || tx.metadata?.source === 'purchase';
                      }
                      if (transactionFilter === 'transfer') {
                        return tx.metadata?.source === 'transfer';
                      }
                      if (transactionFilter === 'income') {
                        return tx.type === 'mint' && tx.metadata?.source !== 'transfer' && tx.metadata?.source !== 'game_sync';
                      }
                      return true;
                    })
                    .slice(0, 50)
                    .map((tx) => {
                      const isDebit = tx.type === 'burn';
                      const txDate = new Date(tx.timestamp);
                      const formattedDate = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      const formattedTime = txDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                      
                      let iconColor = isDebit ? '#EF4444' : '#10B981';
                      let IconComponent = isDebit ? ArrowUpCircle : ArrowDownCircle;
                      
                      if (tx.metadata?.source === 'transfer') {
                        iconColor = '#3B82F6';
                        IconComponent = isDebit ? ArrowUpCircle : ArrowDownCircle;
                      } else if (tx.metadata?.source === 'credit_card_charge') {
                        iconColor = '#8B5CF6';
                        IconComponent = CreditCard;
                      }

                      return (
                        <View key={tx.id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
                          <View style={[styles.transactionItemIcon, { backgroundColor: iconColor + '20' }]}>
                            <IconComponent size={18} color={iconColor} />
                          </View>
                          <View style={styles.transactionItemInfo}>
                            <Text style={[styles.transactionItemReason, { color: colors.text }]} numberOfLines={1}>
                              {tx.reason}
                            </Text>
                            <Text style={[styles.transactionItemDate, { color: colors.textLight }]}>
                              {formattedDate} at {formattedTime}
                            </Text>
                          </View>
                          <View style={styles.transactionItemAmountContainer}>
                            <Text style={[
                              styles.transactionItemAmount,
                              { color: isDebit ? '#EF4444' : '#10B981' }
                            ]}>
                              {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
                            </Text>
                            <Text style={[styles.transactionItemBalance, { color: colors.textLight }]}>
                              Balance: {formatCurrency(tx.balanceAfter)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Budget Settings Modal */}
      <BudgetSettingsModal
        visible={showBudgetSettings}
        onClose={() => setShowBudgetSettings(false)}
      />

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Expense</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                value={newExpense.name}
                onChangeText={(text) => setNewExpense({ ...newExpense, name: text })}
                placeholder="e.g., Netflix Subscription"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Amount (monthly)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                value={newExpense.amount}
                onChangeText={(text) => setNewExpense({ ...newExpense, amount: text })}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryOptions}>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.categoryOption,
                        {
                          backgroundColor: newExpense.category === key ? config.color : colors.surfaceAlt,
                        }
                      ]}
                      onPress={() => setNewExpense({ ...newExpense, category: key as ExpenseCategory })}
                    >
                      <config.icon size={16} color={newExpense.category === key ? '#FFF' : config.color} />
                      <Text style={[
                        styles.categoryOptionText,
                        { color: newExpense.category === key ? '#FFF' : colors.text }
                      ]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleAddExpense}
            >
              <Text style={styles.submitButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showTransferModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Transfer Funds</Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>From</Text>
              <View style={styles.transferOptions}>
                <TouchableOpacity
                  style={[
                    styles.transferOptionSmall,
                    {
                      backgroundColor: transferFrom === 'bank' ? '#3B82F6' : colors.surfaceAlt,
                    }
                  ]}
                  onPress={() => handleTransferFromChange('bank')}
                >
                  <DollarSign size={18} color={transferFrom === 'bank' ? '#FFF' : '#3B82F6'} />
                  <Text style={[
                    styles.transferOptionTextSmall,
                    { color: transferFrom === 'bank' ? '#FFF' : colors.text }
                  ]}>
                    Checking
                  </Text>
                  <Text style={[
                    styles.transferOptionBalance,
                    { color: transferFrom === 'bank' ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                  ]}>
                    {formatCurrency(gameState.bankBalance)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.transferOptionSmall,
                    {
                      backgroundColor: transferFrom === 'savings' ? '#10B981' : colors.surfaceAlt,
                    }
                  ]}
                  onPress={() => handleTransferFromChange('savings')}
                >
                  <PiggyBank size={18} color={transferFrom === 'savings' ? '#FFF' : '#10B981'} />
                  <Text style={[
                    styles.transferOptionTextSmall,
                    { color: transferFrom === 'savings' ? '#FFF' : colors.text }
                  ]}>
                    Savings
                  </Text>
                  <Text style={[
                    styles.transferOptionBalance,
                    { color: transferFrom === 'savings' ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                  ]}>
                    {formatCurrency(gameState.savingsBalance)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.transferOptionSmall,
                    {
                      backgroundColor: transferFrom === 'emergency' ? '#F59E0B' : colors.surfaceAlt,
                    }
                  ]}
                  onPress={() => handleTransferFromChange('emergency')}
                >
                  <Shield size={18} color={transferFrom === 'emergency' ? '#FFF' : '#F59E0B'} />
                  <Text style={[
                    styles.transferOptionTextSmall,
                    { color: transferFrom === 'emergency' ? '#FFF' : colors.text }
                  ]}>
                    Emergency
                  </Text>
                  <Text style={[
                    styles.transferOptionBalance,
                    { color: transferFrom === 'emergency' ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                  ]}>
                    {formatCurrency(gameState.emergencyFund)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>To</Text>
              <View style={styles.transferOptions}>
                <TouchableOpacity
                  style={[
                    styles.transferOptionSmall,
                    {
                      backgroundColor: transferTo === 'bank' ? '#3B82F6' : colors.surfaceAlt,
                      opacity: transferFrom === 'bank' ? 0.5 : 1,
                    }
                  ]}
                  onPress={() => handleTransferToChange('bank')}
                  disabled={transferFrom === 'bank'}
                >
                  <DollarSign size={18} color={transferTo === 'bank' ? '#FFF' : '#3B82F6'} />
                  <Text style={[
                    styles.transferOptionTextSmall,
                    { color: transferTo === 'bank' ? '#FFF' : colors.text }
                  ]}>
                    Checking
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.transferOptionSmall,
                    {
                      backgroundColor: transferTo === 'savings' ? '#10B981' : colors.surfaceAlt,
                      opacity: transferFrom === 'savings' ? 0.5 : 1,
                    }
                  ]}
                  onPress={() => handleTransferToChange('savings')}
                  disabled={transferFrom === 'savings'}
                >
                  <PiggyBank size={18} color={transferTo === 'savings' ? '#FFF' : '#10B981'} />
                  <Text style={[
                    styles.transferOptionTextSmall,
                    { color: transferTo === 'savings' ? '#FFF' : colors.text }
                  ]}>
                    Savings
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.transferOptionSmall,
                    {
                      backgroundColor: transferTo === 'emergency' ? '#F59E0B' : colors.surfaceAlt,
                      opacity: transferFrom === 'emergency' ? 0.5 : 1,
                    }
                  ]}
                  onPress={() => handleTransferToChange('emergency')}
                  disabled={transferFrom === 'emergency'}
                >
                  <Shield size={18} color={transferTo === 'emergency' ? '#FFF' : '#F59E0B'} />
                  <Text style={[
                    styles.transferOptionTextSmall,
                    { color: transferTo === 'emergency' ? '#FFF' : colors.text }
                  ]}>
                    Emergency
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Amount</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                value={transferAmount}
                onChangeText={setTransferAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleTransfer}
            >
              <Text style={styles.submitButtonText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showPaymentMethodModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => {
                setShowPaymentMethodModal(false);
                setSelectedExpenseForPayment(null);
              }}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedExpenseForPayment && (
              <View style={[styles.paymentSummary, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.paymentSummaryLabel, { color: colors.textSecondary }]}>Paying for</Text>
                <Text style={[styles.paymentSummaryName, { color: colors.text }]}>{selectedExpenseForPayment.name}</Text>
                <Text style={[styles.paymentSummaryAmount, { color: colors.primary }]}>
                  {formatCurrency(
                    selectedExpenseForPayment.frequency === 'weekly' 
                      ? selectedExpenseForPayment.amount * 4 
                      : selectedExpenseForPayment.frequency === 'annual' 
                        ? selectedExpenseForPayment.amount / 12 
                        : selectedExpenseForPayment.amount
                  )}
                </Text>
              </View>
            )}

            <Text style={[styles.paymentSectionTitle, { color: colors.text }]}>Bank Account</Text>
            <TouchableOpacity
              style={[styles.paymentMethodOption, { backgroundColor: colors.surfaceAlt }]}
              onPress={handlePayWithBank}
            >
              <View style={[styles.paymentMethodIcon, { backgroundColor: '#3B82F620' }]}>
                <DollarSign size={20} color="#3B82F6" />
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={[styles.paymentMethodName, { color: colors.text }]}>Checking Account</Text>
                <Text style={[styles.paymentMethodBalance, { color: colors.textSecondary }]}>
                  Available: {formatCurrency(gameState.bankBalance)}
                </Text>
              </View>
            </TouchableOpacity>

            {getAvailableCreditCards().length > 0 && (
              <>
                <Text style={[styles.paymentSectionTitle, { color: colors.text, marginTop: 16 }]}>Credit Cards</Text>
                {getAvailableCreditCards().map((card) => {
                  const availableCredit = card.creditLimit - card.balance;
                  return (
                    <TouchableOpacity
                      key={card.id}
                      style={[styles.paymentMethodOption, { backgroundColor: colors.surfaceAlt }]}
                      onPress={() => handlePayWithCreditCard(card.id)}
                    >
                      <View style={[styles.paymentMethodIcon, { backgroundColor: '#8B5CF620' }]}>
                        <CreditCard size={20} color="#8B5CF6" />
                      </View>
                      <View style={styles.paymentMethodInfo}>
                        <Text style={[styles.paymentMethodName, { color: colors.text }]}>{card.institutionName}</Text>
                        <Text style={[styles.paymentMethodBalance, { color: colors.textSecondary }]}>
                          Available: {formatCurrency(availableCredit)} / {formatCurrency(card.creditLimit)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {getAvailableCreditCards().length === 0 && (
              <View style={[styles.noCreditCardsNotice, { backgroundColor: colors.surfaceAlt }]}>
                <CreditCard size={20} color={colors.textSecondary} />
                <Text style={[styles.noCreditCardsText, { color: colors.textSecondary }]}>
                  No credit cards available. Visit the Financial Center to apply for one.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  balancesCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  transferButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  transferButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  expensesSection: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  categoryTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseName: {
    fontSize: 14,
    fontWeight: '500',
  },
  expenseFrequency: {
    fontSize: 11,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  deleteButton: {
    padding: 8,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
  },
  categoryOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  transferBalance: {
    fontSize: 14,
    marginBottom: 16,
  },
  transferOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  transferOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  transferOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  transferOptionSmall: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  transferOptionTextSmall: {
    fontSize: 12,
    fontWeight: '600',
  },
  transferOptionBalance: {
    fontSize: 10,
    fontWeight: '500',
  },
  paymentSummary: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  paymentSummaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  paymentSummaryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentSummaryAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  paymentSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  paymentMethodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  paymentMethodBalance: {
    fontSize: 13,
  },
  noCreditCardsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 10,
  },
  noCreditCardsText: {
    flex: 1,
    fontSize: 13,
  },
  realModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    gap: 10,
  },
  realModeBannerText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  editAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editAmountInput: {
    width: 80,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  saveEditButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    padding: 6,
    marginLeft: 4,
  },
  expenseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  expenseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  payNowButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  lockedPlaceholder: {
    width: 32,
    height: 32,
  },
  transactionHistorySection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  transactionHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  transactionHistoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionHistoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionHistorySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionHistoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionHistoryContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterTabs: {
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyTransactionsText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyTransactionsSubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  transactionsList: {
    gap: 0,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionItemReason: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionItemDate: {
    fontSize: 11,
    marginTop: 2,
  },
  transactionItemAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionItemAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  transactionItemBalance: {
    fontSize: 10,
    marginTop: 2,
  },
  expenseItemPaid: {
    opacity: 0.7,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  paidBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#10B981',
  },
  expenseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: 8,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 10,
    fontWeight: '500',
  },
  paidOnText: {
    fontSize: 10,
    fontWeight: '500',
  },
  paidCheckmark: {
    padding: 6,
  },
  syncBanner: {
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 16,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncText: {
    fontSize: 14,
    flex: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BudgetScreen;
