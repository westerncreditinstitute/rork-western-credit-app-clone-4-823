import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  CreditCard,
  DollarSign,
  Calendar,
  TrendingDown,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Pause,
  RefreshCw,
  History,
  PiggyBank,
  Info,
  Percent,
  Calculator,
} from 'lucide-react-native';
import { StudentLoan, LoanType, LoanStatus } from '@/types/education';

interface LoanOption {
  name: string;
  description: string;
  interestRate: number;
  maxAmountPerYear: number;
  requiresEnrollment: boolean;
  requiresCreditCheck?: boolean;
  minimumCreditScore?: number;
  gracePeriodMonths: number;
}

interface StudentLoansPanelProps {
  loans: StudentLoan[];
  loanOptions: Record<LoanType, LoanOption>;
  isEnrolled: boolean;
  creditScore: number;
  bankBalance: number;
  onApplyForLoan: (loanType: LoanType, amount: number) => StudentLoan | null;
  onMakePayment: (loanId: string, amount: number) => {
    success: boolean;
    newBalance: number;
    interestPaid: number;
    principalPaid: number;
    creditScoreImpact: number;
    isPayoffComplete: boolean;
    error?: string;
  };
  colors: {
    primary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
}

const STATUS_CONFIG: Record<LoanStatus, { color: string; icon: typeof CheckCircle2; label: string }> = {
  active: { color: '#3B82F6', icon: CreditCard, label: 'Active' },
  in_grace: { color: '#F59E0B', icon: Clock, label: 'Grace Period' },
  in_repayment: { color: '#8B5CF6', icon: DollarSign, label: 'In Repayment' },
  deferred: { color: '#6B7280', icon: Pause, label: 'Deferred' },
  defaulted: { color: '#EF4444', icon: AlertTriangle, label: 'Defaulted' },
  paid_off: { color: '#22C55E', icon: CheckCircle2, label: 'Paid Off' },
};

const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  federal_subsidized: 'Federal Subsidized',
  federal_unsubsidized: 'Federal Unsubsidized',
  private: 'Private',
  parent_plus: 'Parent PLUS',
  grad_plus: 'Grad PLUS',
};

export default function StudentLoansPanel({
  loans,
  loanOptions,
  isEnrolled,
  creditScore,
  bankBalance,
  onApplyForLoan,
  onMakePayment,
  colors,
}: StudentLoansPanelProps) {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [selectedLoanType, setSelectedLoanType] = useState<LoanType>('federal_subsidized');
  const [selectedAmount, setSelectedAmount] = useState(5000);
  const [selectedLoan, setSelectedLoan] = useState<StudentLoan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  const totalDebt = useMemo(() => 
    loans.reduce((sum, loan) => sum + loan.currentBalance, 0), 
    [loans]
  );

  const totalMonthlyPayment = useMemo(() =>
    loans
      .filter(l => l.status === 'in_repayment' || l.status === 'active')
      .reduce((sum, loan) => sum + loan.monthlyPayment, 0),
    [loans]
  );

  const activeLoans = useMemo(() =>
    loans.filter(l => l.status !== 'paid_off'),
    [loans]
  );

  const canApplyForLoan = useCallback((loanType: LoanType) => {
    const option = loanOptions[loanType];
    if (!isEnrolled && option.requiresEnrollment) return false;
    if (option.requiresCreditCheck && option.minimumCreditScore && creditScore < option.minimumCreditScore) {
      return false;
    }
    return true;
  }, [loanOptions, isEnrolled, creditScore]);

  const handleOpenApplyModal = useCallback(() => {
    if (!isEnrolled) {
      Alert.alert(
        'Enrollment Required',
        'You must be enrolled in a school to apply for student loans.'
      );
      return;
    }
    setShowApplyModal(true);
  }, [isEnrolled]);

  const handleApplyForLoan = useCallback(async () => {
    if (!canApplyForLoan(selectedLoanType)) {
      Alert.alert('Not Eligible', 'You do not meet the requirements for this loan type.');
      return;
    }

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const result = onApplyForLoan(selectedLoanType, selectedAmount);
    setIsProcessing(false);
    setShowApplyModal(false);

    if (result) {
      Alert.alert(
        'Loan Approved! 💰',
        `$${selectedAmount.toLocaleString()} has been disbursed to your account.\n\nMonthly Payment: $${result.monthlyPayment.toLocaleString()}\nInterest Rate: ${result.interestRate}%`,
        [{ text: 'Great!' }]
      );
    } else {
      Alert.alert(
        'Loan Denied',
        'Your application was not approved. Please check your credit score or try a different loan type.',
        [{ text: 'OK' }]
      );
    }
  }, [selectedLoanType, selectedAmount, canApplyForLoan, onApplyForLoan]);

  const handleOpenPaymentModal = useCallback((loan: StudentLoan) => {
    setSelectedLoan(loan);
    setPaymentAmount(loan.minimumPayment);
    setShowPaymentModal(true);
  }, []);

  const handleMakePayment = useCallback(async () => {
    if (!selectedLoan) return;

    if (paymentAmount > bankBalance) {
      Alert.alert('Insufficient Funds', 'You do not have enough money in your bank account.');
      return;
    }

    if (paymentAmount < selectedLoan.minimumPayment) {
      Alert.alert('Minimum Payment Required', `The minimum payment is $${selectedLoan.minimumPayment.toLocaleString()}`);
      return;
    }

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = onMakePayment(selectedLoan.id, paymentAmount);
    setIsProcessing(false);
    setShowPaymentModal(false);

    if (result.success) {
      if (result.isPayoffComplete) {
        Alert.alert(
          'Loan Paid Off! 🎉',
          `Congratulations! You have completely paid off this loan!\n\nCredit Score Impact: +${result.creditScoreImpact}`,
          [{ text: 'Awesome!' }]
        );
      } else {
        Alert.alert(
          'Payment Successful',
          `Payment of $${paymentAmount.toLocaleString()} processed.\n\nPrincipal Paid: $${result.principalPaid.toLocaleString()}\nInterest Paid: $${result.interestPaid.toLocaleString()}\nNew Balance: $${result.newBalance.toLocaleString()}`,
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert('Payment Failed', result.error || 'Unable to process payment.');
    }
  }, [selectedLoan, paymentAmount, bankBalance, onMakePayment]);

  const handleViewDetails = useCallback((loan: StudentLoan) => {
    Alert.alert(
      'Payment History',
      `${loan.lenderName}\n\nPayments Made: ${loan.paymentsMade}\nTotal Interest Paid: ${loan.totalInterestPaid.toLocaleString()}\nOriginal Amount: ${loan.principalAmount.toLocaleString()}\nCurrent Balance: ${loan.currentBalance.toLocaleString()}`,
      [{ text: 'OK' }]
    );
  }, []);

  const handleDeferLoan = useCallback((loan: StudentLoan) => {
    Alert.alert(
      'Request Deferment',
      'Are you sure you want to request a deferment? Interest may still accrue during this period.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: () => {
            Alert.alert('Deferment Requested', 'Your deferment request has been submitted for review.');
          },
        },
      ]
    );
  }, []);

  const handleRefinance = useCallback((loan: StudentLoan) => {
    if (creditScore < 700) {
      Alert.alert(
        'Credit Score Too Low',
        'You need a credit score of at least 700 to refinance. Current score: ' + creditScore
      );
      return;
    }

    Alert.alert(
      'Refinance Loan',
      `Based on your credit score (${creditScore}), you may qualify for a lower rate.\n\nCurrent Rate: ${loan.interestRate}%\nEstimated New Rate: ${Math.max(loan.interestRate - 1.5, 3.5).toFixed(1)}%`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply to Refinance',
          onPress: () => {
            Alert.alert('Application Submitted', 'Your refinance application is being processed.');
          },
        },
      ]
    );
  }, [creditScore]);

  const renderLoanCard = (loan: StudentLoan) => {
    const statusConfig = STATUS_CONFIG[loan.status];
    const StatusIcon = statusConfig.icon;
    const isExpanded = expandedLoanId === loan.id;
    const isPaidOff = loan.status === 'paid_off';

    return (
      <View
        key={loan.id}
        style={[
          styles.loanCard,
          { 
            backgroundColor: colors.surface, 
            borderColor: isPaidOff ? colors.success : colors.border,
            opacity: isPaidOff ? 0.7 : 1,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.loanCardHeader}
          onPress={() => setExpandedLoanId(isExpanded ? null : loan.id)}
        >
          <View style={styles.loanTitleRow}>
            <View style={[styles.loanIconContainer, { backgroundColor: statusConfig.color + '15' }]}>
              <CreditCard size={20} color={statusConfig.color} />
            </View>
            <View style={styles.loanTitleContent}>
              <Text style={[styles.loanName, { color: colors.text }]}>{loan.lenderName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
                <StatusIcon size={12} color={statusConfig.color} />
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
            <View style={styles.loanBalanceContainer}>
              <Text style={[styles.loanBalanceLabel, { color: colors.textSecondary }]}>Balance</Text>
              <Text style={[styles.loanBalance, { color: isPaidOff ? colors.success : colors.text }]}>
                ${loan.currentBalance.toLocaleString()}
              </Text>
            </View>
            {isExpanded ? (
              <ChevronUp size={20} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.loanQuickStats}>
          <View style={styles.quickStatItem}>
            <Percent size={14} color={colors.textSecondary} />
            <Text style={[styles.quickStatValue, { color: colors.text }]}>{loan.interestRate}%</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Rate</Text>
          </View>
          <View style={styles.quickStatItem}>
            <DollarSign size={14} color={colors.textSecondary} />
            <Text style={[styles.quickStatValue, { color: colors.text }]}>${loan.monthlyPayment}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Monthly</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.quickStatValue, { color: colors.text }]}>{loan.paymentsRemaining}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Left</Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.loanExpandedContent}>
            <View style={[styles.loanDetailsGrid, { backgroundColor: colors.background }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Original Amount</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  ${loan.principalAmount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Interest Paid</Text>
                <Text style={[styles.detailValue, { color: colors.error }]}>
                  ${loan.totalInterestPaid.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Payments Made</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{loan.paymentsMade}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Term</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{loan.termMonths} months</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Origination Date</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(loan.originationDate).toLocaleDateString()}
                </Text>
              </View>
              {loan.lastPaymentDate && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last Payment</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(loan.lastPaymentDate).toLocaleDateString()} - ${loan.lastPaymentAmount?.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>

            {!isPaidOff && (
              <View style={styles.loanActions}>
                <TouchableOpacity
                  style={[styles.loanActionButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleOpenPaymentModal(loan)}
                >
                  <DollarSign size={16} color="#FFFFFF" />
                  <Text style={styles.loanActionText}>Make Payment</Text>
                </TouchableOpacity>
                
                <View style={styles.secondaryActions}>
                  <TouchableOpacity
                    style={[styles.secondaryActionButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => handleDeferLoan(loan)}
                  >
                    <Pause size={14} color={colors.textSecondary} />
                    <Text style={[styles.secondaryActionText, { color: colors.text }]}>Defer</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.secondaryActionButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => handleRefinance(loan)}
                  >
                    <RefreshCw size={14} color={colors.textSecondary} />
                    <Text style={[styles.secondaryActionText, { color: colors.text }]}>Refinance</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.secondaryActionButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => handleViewDetails(loan)}
                  >
                    <History size={14} color={colors.textSecondary} />
                    <Text style={[styles.secondaryActionText, { color: colors.text }]}>History</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderLoanTypeOption = (type: LoanType) => {
    const option = loanOptions[type];
    const isSelected = selectedLoanType === type;
    const canApply = canApplyForLoan(type);

    return (
      <TouchableOpacity
        key={type}
        style={[
          styles.loanTypeOption,
          {
            backgroundColor: isSelected ? colors.primary + '15' : colors.background,
            borderColor: isSelected ? colors.primary : colors.border,
            opacity: canApply ? 1 : 0.5,
          },
        ]}
        onPress={() => canApply && setSelectedLoanType(type)}
        disabled={!canApply}
      >
        <View style={styles.loanTypeHeader}>
          <Text style={[styles.loanTypeName, { color: colors.text }]}>
            {LOAN_TYPE_LABELS[type]}
          </Text>
          {isSelected && <CheckCircle2 size={18} color={colors.primary} />}
        </View>
        <Text style={[styles.loanTypeDescription, { color: colors.textSecondary }]}>
          {option.description}
        </Text>
        <View style={styles.loanTypeStats}>
          <View style={styles.loanTypeStat}>
            <Percent size={12} color={colors.primary} />
            <Text style={[styles.loanTypeStatValue, { color: colors.primary }]}>
              {option.interestRate}%
            </Text>
          </View>
          <View style={styles.loanTypeStat}>
            <DollarSign size={12} color={colors.textSecondary} />
            <Text style={[styles.loanTypeStatValue, { color: colors.textSecondary }]}>
              Max ${option.maxAmountPerYear.toLocaleString()}/yr
            </Text>
          </View>
        </View>
        {!canApply && option.minimumCreditScore && (
          <Text style={[styles.loanTypeWarning, { color: colors.error }]}>
            Requires {option.minimumCreditScore}+ credit score
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.summaryCard, { backgroundColor: colors.error }]}>
        <View style={styles.summaryMain}>
          <PiggyBank size={32} color="#FFFFFF" />
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Total Student Debt</Text>
            <Text style={styles.summaryAmount}>${totalDebt.toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>{activeLoans.length}</Text>
            <Text style={styles.summaryStatLabel}>Active Loans</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>${totalMonthlyPayment}</Text>
            <Text style={styles.summaryStatLabel}>Monthly</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>${bankBalance.toLocaleString()}</Text>
            <Text style={styles.summaryStatLabel}>Balance</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.applyButton, { backgroundColor: colors.primary }]}
        onPress={handleOpenApplyModal}
        testID="apply-loan-button"
      >
        <CreditCard size={20} color="#FFFFFF" />
        <Text style={styles.applyButtonText}>Apply for Student Loan</Text>
        <ChevronRight size={20} color="#FFFFFF" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!isEnrolled && (
          <View style={[styles.warningBanner, { backgroundColor: colors.warning + '20' }]}>
            <AlertTriangle size={20} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              You must be enrolled to apply for new loans
            </Text>
          </View>
        )}

        {activeLoans.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Loans</Text>
            {loans.map(renderLoanCard)}
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <CreditCard size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Student Loans</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Apply for a loan to help cover your education costs
            </Text>
          </View>
        )}

        <View style={[styles.tipsSection, { backgroundColor: colors.surface }]}>
          <View style={styles.tipsHeader}>
            <Info size={18} color={colors.primary} />
            <Text style={[styles.tipsTitle, { color: colors.text }]}>Loan Tips</Text>
          </View>
          <View style={styles.tipItem}>
            <TrendingDown size={14} color={colors.success} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Federal subsidized loans do not accrue interest while in school
            </Text>
          </View>
          <View style={styles.tipItem}>
            <TrendingUp size={14} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Making extra payments reduces total interest paid
            </Text>
          </View>
          <View style={styles.tipItem}>
            <CheckCircle2 size={14} color={colors.success} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              On-time payments improve your credit score
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showApplyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Apply for Loan</Text>
              <TouchableOpacity onPress={() => setShowApplyModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Select Loan Type</Text>
              {(Object.keys(loanOptions) as LoanType[]).map(renderLoanTypeOption)}

              <Text style={[styles.modalSectionTitle, { color: colors.text, marginTop: 20 }]}>
                Select Amount
              </Text>
              <View style={styles.amountOptions}>
                {[3000, 5000, 7500, 10000].map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.amountOption,
                      {
                        backgroundColor: selectedAmount === amount ? colors.primary : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setSelectedAmount(amount)}
                  >
                    <Text style={[
                      styles.amountOptionText,
                      { color: selectedAmount === amount ? '#FFFFFF' : colors.text }
                    ]}>
                      ${amount.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.loanSummary, { backgroundColor: colors.background }]}>
                <Text style={[styles.loanSummaryTitle, { color: colors.text }]}>Loan Summary</Text>
                <View style={styles.loanSummaryRow}>
                  <Text style={[styles.loanSummaryLabel, { color: colors.textSecondary }]}>Amount</Text>
                  <Text style={[styles.loanSummaryValue, { color: colors.text }]}>
                    ${selectedAmount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.loanSummaryRow}>
                  <Text style={[styles.loanSummaryLabel, { color: colors.textSecondary }]}>Interest Rate</Text>
                  <Text style={[styles.loanSummaryValue, { color: colors.text }]}>
                    {loanOptions[selectedLoanType].interestRate}%
                  </Text>
                </View>
                <View style={styles.loanSummaryRow}>
                  <Text style={[styles.loanSummaryLabel, { color: colors.textSecondary }]}>Est. Monthly Payment</Text>
                  <Text style={[styles.loanSummaryValue, { color: colors.primary }]}>
                    ${Math.round(selectedAmount / 120 * (1 + loanOptions[selectedLoanType].interestRate / 100)).toLocaleString()}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.background }]}
                onPress={() => setShowApplyModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleApplyForLoan}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Calculator size={18} color="#FFFFFF" />
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Apply</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Make Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedLoan && (
              <>
                <View style={[styles.paymentLoanInfo, { backgroundColor: colors.background }]}>
                  <Text style={[styles.paymentLoanName, { color: colors.text }]}>
                    {selectedLoan.lenderName}
                  </Text>
                  <Text style={[styles.paymentLoanBalance, { color: colors.textSecondary }]}>
                    Balance: ${selectedLoan.currentBalance.toLocaleString()}
                  </Text>
                </View>

                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Payment Amount</Text>
                <View style={styles.paymentAmountOptions}>
                  {[
                    { label: 'Minimum', amount: selectedLoan.minimumPayment },
                    { label: 'Monthly', amount: selectedLoan.monthlyPayment },
                    { label: 'Double', amount: selectedLoan.monthlyPayment * 2 },
                    { label: 'Pay Off', amount: selectedLoan.currentBalance },
                  ].map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.paymentOption,
                        {
                          backgroundColor: paymentAmount === option.amount ? colors.primary : colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => setPaymentAmount(option.amount)}
                    >
                      <Text style={[
                        styles.paymentOptionLabel,
                        { color: paymentAmount === option.amount ? '#FFFFFF' : colors.textSecondary }
                      ]}>
                        {option.label}
                      </Text>
                      <Text style={[
                        styles.paymentOptionAmount,
                        { color: paymentAmount === option.amount ? '#FFFFFF' : colors.text }
                      ]}>
                        ${option.amount.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={[styles.paymentInfo, { backgroundColor: colors.warning + '15' }]}>
                  <Info size={16} color={colors.warning} />
                  <Text style={[styles.paymentInfoText, { color: colors.warning }]}>
                    Available balance: ${bankBalance.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.background }]}
                    onPress={() => setShowPaymentModal(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.submitButton,
                      { backgroundColor: paymentAmount > bankBalance ? colors.textSecondary : colors.success }
                    ]}
                    onPress={handleMakePayment}
                    disabled={isProcessing || paymentAmount > bankBalance}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <DollarSign size={18} color="#FFFFFF" />
                        <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                          Pay ${paymentAmount.toLocaleString()}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryContent: {
    marginLeft: 12,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  loanCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  loanCardHeader: {
    padding: 16,
  },
  loanTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loanIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loanTitleContent: {
    flex: 1,
    marginLeft: 12,
  },
  loanName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loanBalanceContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  loanBalanceLabel: {
    fontSize: 10,
  },
  loanBalance: {
    fontSize: 18,
    fontWeight: '700',
  },
  loanQuickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  quickStatItem: {
    alignItems: 'center',
    gap: 2,
  },
  quickStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickStatLabel: {
    fontSize: 10,
  },
  loanExpandedContent: {
    padding: 16,
    paddingTop: 0,
  },
  loanDetailsGrid: {
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  loanActions: {
    marginTop: 12,
  },
  loanActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  loanActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  tipsSection: {
    padding: 16,
    borderRadius: 12,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
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
    maxHeight: '85%',
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
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  loanTypeOption: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  loanTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loanTypeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  loanTypeDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  loanTypeStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  loanTypeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loanTypeStatValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  loanTypeWarning: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
  amountOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amountOption: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  amountOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loanSummary: {
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  loanSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  loanSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  loanSummaryLabel: {
    fontSize: 13,
  },
  loanSummaryValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  paymentLoanInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  paymentLoanName: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentLoanBalance: {
    fontSize: 13,
    marginTop: 4,
  },
  paymentAmountOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  paymentOption: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  paymentOptionLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  paymentOptionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 20,
  },
  paymentInfoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButton: {
    flex: 2,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
