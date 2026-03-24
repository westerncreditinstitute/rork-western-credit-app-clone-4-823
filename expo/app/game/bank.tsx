import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CreditCard,
  Car,
  Home,
  DollarSign,
  Percent,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle,
  Shield,
  Wallet,
  PiggyBank,
  Building2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { FINANCIAL_INSTITUTIONS } from '@/mocks/gameData';
import { formatCurrency, calculateInterestRate, calculateMonthlyPayment } from '@/utils/creditEngine';
import { CreditAccount, FinancialProduct, HardInquiry } from '@/types/game';
import * as Haptics from 'expo-haptics';

export default function BankScreen() {
  const { colors } = useTheme();
  const { 
    gameState, 
    addCreditAccount, 
    addHardInquiry, 
    makePayment,
    updateBalance,
  } = useGame();
  
  const [selectedProduct, setSelectedProduct] = useState<{
    institution: typeof FINANCIAL_INSTITUTIONS[0];
    product: FinancialProduct;
  } | null>(null);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanTerm, setLoanTerm] = useState<number | null>(null);
  const [showAccounts, setShowAccounts] = useState(true);

  const handleApply = () => {
    if (!selectedProduct) return;

    const { institution, product } = selectedProduct;
    const creditScore = gameState.creditScores.composite;

    if (creditScore < product.minCreditScore) {
      Alert.alert(
        'Application Denied',
        `Your credit score (${creditScore}) does not meet the minimum requirement of ${product.minCreditScore}.`
      );
      return;
    }

    const inquiry: HardInquiry = {
      id: `inq_${Date.now()}`,
      institutionName: institution.name,
      date: gameState.currentDate,
      type: product.type as any,
    };
    addHardInquiry(inquiry);

    const approvalOdds = Math.min(0.95, (creditScore - product.minCreditScore + 100) / 200);
    const approved = Math.random() < approvalOdds;

    if (!approved) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert(
        'Application Denied',
        'Unfortunately, your application was not approved at this time. This may be due to insufficient credit history or other factors.'
      );
      setSelectedProduct(null);
      return;
    }

    const apr = calculateInterestRate(product.baseApr, product.maxApr, creditScore);
    
    let creditLimit = 0;
    let balance = 0;
    let minimumPayment = 0;

    if (product.type === 'credit_card') {
      if (product.isSecured && product.securityDeposit) {
        creditLimit = product.securityDeposit;
        if (gameState.bankBalance < product.securityDeposit) {
          Alert.alert(
            'Insufficient Funds',
            `You need ${formatCurrency(product.securityDeposit)} for the security deposit. Your current balance is ${formatCurrency(gameState.bankBalance)}.`
          );
          setSelectedProduct(null);
          return;
        }
        updateBalance(-product.securityDeposit, 'bank');
      } else {
        creditLimit = Math.round(((creditScore - 300) / 550) * 10000 + 500);
      }
      balance = 0;
      minimumPayment = 25;
    } else {
      const amount = parseFloat(loanAmount) || 10000;
      const term = loanTerm || (product.termMonths?.[0] || 36);
      creditLimit = amount;
      balance = amount;
      minimumPayment = calculateMonthlyPayment(amount, apr, term);
      
      updateBalance(amount, 'bank');
    }

    const newAccount: CreditAccount = {
      id: `acc_${Date.now()}`,
      type: product.type as any,
      institutionId: institution.id,
      institutionName: institution.name,
      balance,
      creditLimit,
      apr,
      minimumPayment,
      openedDate: gameState.currentDate,
      lastPaymentDate: gameState.currentDate,
      paymentHistory: [],
      status: 'current',
    };

    addCreditAccount(newAccount);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const securedMessage = product.isSecured && product.securityDeposit 
      ? `\nSecurity Deposit: ${formatCurrency(product.securityDeposit)} (refundable)` 
      : '';

    Alert.alert(
      'Congratulations!',
      `Your ${product.name} has been approved!\n\n` +
      `${product.type === 'credit_card' ? 'Credit Limit' : 'Loan Amount'}: ${formatCurrency(creditLimit)}\n` +
      `APR: ${apr}%` +
      securedMessage +
      `${product.annualFee ? `\nAnnual Fee: ${formatCurrency(product.annualFee)}` : ''}`
    );

    setSelectedProduct(null);
    setLoanAmount('');
    setLoanTerm(null);
  };

  const handleMakePayment = (account: CreditAccount) => {
    if (account.balance <= 0) {
      Alert.alert('No Balance', 'This account has no outstanding balance.');
      return;
    }

    Alert.alert(
      'Make Payment',
      `Current Balance: ${formatCurrency(account.balance)}\nMinimum Payment: ${formatCurrency(account.minimumPayment)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Minimum',
          onPress: () => {
            if (gameState.bankBalance < account.minimumPayment) {
              Alert.alert('Insufficient Funds', 'You do not have enough in your bank account.');
              return;
            }
            makePayment(account.id, account.minimumPayment, true);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        },
        {
          text: 'Pay Full',
          onPress: () => {
            if (gameState.bankBalance < account.balance) {
              Alert.alert('Insufficient Funds', 'You do not have enough in your bank account.');
              return;
            }
            makePayment(account.id, account.balance, true);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          },
        },
      ]
    );
  };

  const getProductIcon = (type: string) => {
    switch (type) {
      case 'credit_card': return CreditCard;
      case 'auto_loan': return Car;
      case 'mortgage': return Home;
      default: return DollarSign;
    }
  };

  const getProductColor = (type: string) => {
    switch (type) {
      case 'credit_card': return '#3B82F6';
      case 'auto_loan': return '#10B981';
      case 'mortgage': return '#8B5CF6';
      case 'personal_loan': return '#F59E0B';
      default: return colors.primary;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              showAccounts && { backgroundColor: colors.primary }
            ]}
            onPress={() => setShowAccounts(true)}
          >
            <Text style={[styles.tabText, { color: showAccounts ? '#FFF' : colors.text }]}>
              My Accounts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              !showAccounts && { backgroundColor: colors.primary }
            ]}
            onPress={() => setShowAccounts(false)}
          >
            <Text style={[styles.tabText, { color: !showAccounts ? '#FFF' : colors.text }]}>
              Apply
            </Text>
          </TouchableOpacity>
        </View>

        {showAccounts ? (
          <View style={styles.accountsSection}>
            <View style={[styles.bankAccountsHeader, { backgroundColor: colors.surface }]}>
              <Text style={[styles.bankAccountsTitle, { color: colors.text }]}>Bank Accounts</Text>
            </View>
            
            <View style={[styles.accountCard, { backgroundColor: colors.surface }]}>
              <View style={styles.accountHeader}>
                <View style={[styles.accountIcon, { backgroundColor: '#10B98120' }]}>
                  <Wallet size={24} color="#10B981" />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: colors.text }]}>
                    Checking Account
                  </Text>
                  <Text style={[styles.accountType, { color: colors.textSecondary }]}>
                    Primary Account
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                  <Text style={[styles.statusText, { color: '#10B981' }]}>Active</Text>
                </View>
              </View>
              <View style={styles.accountDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Available Balance</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatCurrency(gameState.bankBalance)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.accountCard, { backgroundColor: colors.surface }]}>
              <View style={styles.accountHeader}>
                <View style={[styles.accountIcon, { backgroundColor: '#3B82F620' }]}>
                  <PiggyBank size={24} color="#3B82F6" />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: colors.text }]}>
                    Savings Account
                  </Text>
                  <Text style={[styles.accountType, { color: colors.textSecondary }]}>
                    High Yield Savings
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                  <Text style={[styles.statusText, { color: '#10B981' }]}>Active</Text>
                </View>
              </View>
              <View style={styles.accountDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Balance</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatCurrency(gameState.savingsBalance)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>APY</Text>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>4.5%</Text>
                </View>
              </View>
            </View>

            {gameState.emergencyFund > 0 && (
              <View style={[styles.accountCard, { backgroundColor: colors.surface }]}>
                <View style={styles.accountHeader}>
                  <View style={[styles.accountIcon, { backgroundColor: '#F59E0B20' }]}>
                    <Building2 size={24} color="#F59E0B" />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: colors.text }]}>
                      Emergency Fund
                    </Text>
                    <Text style={[styles.accountType, { color: colors.textSecondary }]}>
                      Reserved Savings
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                    <Text style={[styles.statusText, { color: '#10B981' }]}>Active</Text>
                  </View>
                </View>
                <View style={styles.accountDetails}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Balance</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatCurrency(gameState.emergencyFund)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={[styles.bankAccountsHeader, { backgroundColor: colors.surface, marginTop: 16 }]}>
              <Text style={[styles.bankAccountsTitle, { color: colors.text }]}>Credit Accounts</Text>
            </View>

            {gameState.creditAccounts.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                <CreditCard size={48} color={colors.textLight} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Credit Accounts</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Apply for a credit card or loan to start building credit.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowAccounts(false)}
                >
                  <Text style={styles.emptyButtonText}>Browse Products</Text>
                </TouchableOpacity>
              </View>
            ) : (
              gameState.creditAccounts.map((account) => {
                const Icon = getProductIcon(account.type);
                const color = getProductColor(account.type);
                const utilization = account.type === 'credit_card' 
                  ? (account.balance / account.creditLimit) * 100 
                  : 0;

                return (
                  <View key={account.id} style={[styles.accountCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.accountHeader}>
                      <View style={[styles.accountIcon, { backgroundColor: color + '20' }]}>
                        <Icon size={24} color={color} />
                      </View>
                      <View style={styles.accountInfo}>
                        <Text style={[styles.accountName, { color: colors.text }]}>
                          {account.institutionName}
                        </Text>
                        <Text style={[styles.accountType, { color: colors.textSecondary }]}>
                          {account.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                      </View>
                      <View style={[
                        styles.statusBadge, 
                        { backgroundColor: account.status === 'current' ? '#10B98120' : '#EF444420' }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: account.status === 'current' ? '#10B981' : '#EF4444' }
                        ]}>
                          {account.status === 'current' ? 'Current' : 'Late'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.accountDetails}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Balance</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {formatCurrency(account.balance)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          {account.type === 'credit_card' ? 'Credit Limit' : 'Original Amount'}
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {formatCurrency(account.creditLimit)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>APR</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {account.apr}%
                        </Text>
                      </View>
                      {account.type === 'credit_card' && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Utilization</Text>
                          <Text style={[
                            styles.detailValue, 
                            { color: utilization > 30 ? '#EF4444' : '#10B981' }
                          ]}>
                            {utilization.toFixed(0)}%
                          </Text>
                        </View>
                      )}
                    </View>

                    {account.balance > 0 && (
                      <TouchableOpacity
                        style={[styles.paymentButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleMakePayment(account)}
                      >
                        <DollarSign size={16} color="#FFF" />
                        <Text style={styles.paymentButtonText}>Make Payment</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.productsSection}>
            {FINANCIAL_INSTITUTIONS.map((institution) => (
              <View key={institution.id} style={[styles.institutionCard, { backgroundColor: colors.surface }]}>
                <View style={styles.institutionHeader}>
                  <View style={[styles.institutionIcon, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={styles.institutionEmoji}>{institution.logo}</Text>
                  </View>
                  <View style={styles.institutionInfo}>
                    <Text style={[styles.institutionName, { color: colors.text }]}>
                      {institution.name}
                    </Text>
                    <Text style={[styles.institutionType, { color: colors.textSecondary }]}>
                      {institution.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                </View>

                <View style={styles.productsList}>
                  {institution.products.map((product) => {
                    const Icon = getProductIcon(product.type);
                    const color = getProductColor(product.type);
                    const eligible = gameState.creditScores.composite >= product.minCreditScore;

                    return (
                      <TouchableOpacity
                        key={product.id}
                        style={[
                          styles.productItem,
                          { borderColor: colors.border, opacity: eligible ? 1 : 0.6 }
                        ]}
                        onPress={() => eligible && setSelectedProduct({ institution, product })}
                        disabled={!eligible}
                      >
                        <View style={[styles.productIcon, { backgroundColor: color + '20' }]}>
                          <Icon size={18} color={color} />
                        </View>
                        <View style={styles.productInfo}>
                          <Text style={[styles.productName, { color: colors.text }]}>
                            {product.name}
                          </Text>
                          <Text style={[styles.productApr, { color: colors.textSecondary }]}>
                            {product.baseApr}% - {product.maxApr}% APR
                          </Text>
                          {product.rewards && (
                            <Text style={[styles.productRewards, { color: color }]} numberOfLines={1}>
                              {product.rewards}
                            </Text>
                          )}
                          {product.isSecured && product.securityDeposit && (
                            <View style={styles.securedBadgeSmall}>
                              <Shield size={10} color="#059669" />
                              <Text style={styles.securedBadgeText}>
                                ${product.securityDeposit} deposit
                              </Text>
                            </View>
                          )}
                        </View>
                        {eligible ? (
                          <ChevronRight size={20} color={colors.textLight} />
                        ) : (
                          <View style={styles.lockedBadge}>
                            <Text style={styles.lockedText}>{product.minCreditScore}+</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={selectedProduct !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Apply for Credit</Text>
              <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <>
                <View style={styles.selectedProductInfo}>
                  <Text style={[styles.selectedProductName, { color: colors.text }]}>
                    {selectedProduct.product.name}
                  </Text>
                  <Text style={[styles.selectedInstitution, { color: colors.textSecondary }]}>
                    {selectedProduct.institution.name}
                  </Text>
                </View>

                {selectedProduct.product.isSecured && (
                  <View style={[styles.securedInfoBox, { backgroundColor: '#05966920' }]}>
                    <View style={styles.securedInfoHeader}>
                      <Shield size={20} color="#059669" />
                      <Text style={[styles.securedInfoTitle, { color: '#059669' }]}>
                        Secured Credit Card
                      </Text>
                    </View>
                    <Text style={[styles.securedInfoText, { color: colors.text }]}>
                      This card requires a refundable security deposit of{' '}
                      <Text style={{ fontWeight: '700' }}>
                        {formatCurrency(selectedProduct.product.securityDeposit || 200)}
                      </Text>
                      {' '}which becomes your credit limit. Perfect for building credit with no credit history!
                    </Text>
                    <View style={styles.securedBenefits}>
                      <Text style={[styles.securedBenefit, { color: colors.textSecondary }]}>
                        • Reports to all 3 credit bureaus
                      </Text>
                      <Text style={[styles.securedBenefit, { color: colors.textSecondary }]}>
                        • Build credit with responsible use
                      </Text>
                      <Text style={[styles.securedBenefit, { color: colors.textSecondary }]}>
                        • Deposit refunded when you close or upgrade
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.aprInfo}>
                  <Percent size={20} color={colors.primary} />
                  <Text style={[styles.aprLabel, { color: colors.textSecondary }]}>
                    Estimated APR based on your credit:
                  </Text>
                  <Text style={[styles.aprValue, { color: colors.primary }]}>
                    {calculateInterestRate(
                      selectedProduct.product.baseApr,
                      selectedProduct.product.maxApr,
                      gameState.creditScores.composite
                    )}%
                  </Text>
                </View>

                {selectedProduct.product.type !== 'credit_card' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Loan Amount</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                        value={loanAmount}
                        onChangeText={setLoanAmount}
                        keyboardType="numeric"
                        placeholder={`Up to ${formatCurrency(selectedProduct.product.maxAmount || 50000)}`}
                        placeholderTextColor={colors.textLight}
                      />
                    </View>

                    {selectedProduct.product.termMonths && (
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Term (months)</Text>
                        <View style={styles.termOptions}>
                          {selectedProduct.product.termMonths.map((term) => (
                            <TouchableOpacity
                              key={term}
                              style={[
                                styles.termOption,
                                { 
                                  backgroundColor: loanTerm === term ? colors.primary : colors.surfaceAlt,
                                  borderColor: colors.border,
                                }
                              ]}
                              onPress={() => setLoanTerm(term)}
                            >
                              <Text style={[
                                styles.termText,
                                { color: loanTerm === term ? '#FFF' : colors.text }
                              ]}>
                                {term}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {loanAmount && loanTerm && (
                      <View style={[styles.paymentPreview, { backgroundColor: colors.surfaceAlt }]}>
                        <Text style={[styles.paymentPreviewLabel, { color: colors.textSecondary }]}>
                          Estimated Monthly Payment
                        </Text>
                        <Text style={[styles.paymentPreviewValue, { color: colors.text }]}>
                          {formatCurrency(calculateMonthlyPayment(
                            parseFloat(loanAmount),
                            calculateInterestRate(
                              selectedProduct.product.baseApr,
                              selectedProduct.product.maxApr,
                              gameState.creditScores.composite
                            ),
                            loanTerm
                          ))}
                        </Text>
                      </View>
                    )}
                  </>
                )}

                <View style={[styles.warningBox, { backgroundColor: '#F59E0B20' }]}>
                  <AlertCircle size={18} color="#F59E0B" />
                  <Text style={[styles.warningText, { color: colors.text }]}>
                    Applying will result in a hard inquiry on your credit report, which may temporarily lower your score.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: colors.primary }]}
                  onPress={handleApply}
                >
                  <CheckCircle size={20} color="#FFF" />
                  <Text style={styles.applyButtonText}>Submit Application</Text>
                </TouchableOpacity>
              </>
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
  bankAccountsHeader: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  bankAccountsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    margin: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  accountsSection: {
    paddingHorizontal: 16,
  },
  emptyState: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  accountCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountType: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accountDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  paymentButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  productsSection: {
    paddingHorizontal: 16,
  },
  institutionCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  institutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  institutionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  institutionEmoji: {
    fontSize: 24,
  },
  institutionInfo: {
    flex: 1,
  },
  institutionName: {
    fontSize: 17,
    fontWeight: '700',
  },
  institutionType: {
    fontSize: 13,
    marginTop: 2,
  },
  productsList: {
    gap: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
  },
  productApr: {
    fontSize: 12,
    marginTop: 2,
  },
  productRewards: {
    fontSize: 11,
    marginTop: 4,
  },
  lockedBadge: {
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  securedBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05966915',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
    gap: 4,
  },
  securedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  securedInfoBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  securedInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  securedInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  securedInfoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  securedBenefits: {
    gap: 4,
  },
  securedBenefit: {
    fontSize: 13,
    lineHeight: 18,
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
    maxHeight: '80%',
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
  selectedProductInfo: {
    marginBottom: 20,
  },
  selectedProductName: {
    fontSize: 18,
    fontWeight: '600',
  },
  selectedInstitution: {
    fontSize: 14,
    marginTop: 4,
  },
  aprInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  aprLabel: {
    fontSize: 14,
  },
  aprValue: {
    fontSize: 18,
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
  termOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  termOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  termText: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentPreview: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  paymentPreviewLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  paymentPreviewValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
