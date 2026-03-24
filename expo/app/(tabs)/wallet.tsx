import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Animated,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  DollarSign,
  Gift,
  Briefcase,
  X,
  CreditCard,
  Building2,
  ChevronRight,
} from "lucide-react-native";

import { useTheme } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Card, Badge, Button } from "@/components/ui";

type TransactionType = "referral_bonus" | "residual_income" | "commission" | "payout" | "consultation";

interface WalletTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: "pending" | "completed" | "cancelled";
  description: string;
  createdAt: string;
}

const mockWallet = {
  availableBalance: 1250.00,
  pendingBalance: 375.00,
  totalEarned: 3250.00,
  totalWithdrawn: 1625.00,
};

const mockTransactions: WalletTransaction[] = [
  {
    id: "1",
    type: "referral_bonus",
    amount: 25,
    status: "completed",
    description: "ACE-1 Student Referral - Sarah Johnson",
    createdAt: "2025-01-08T10:30:00Z",
  },
  {
    id: "2",
    type: "residual_income",
    amount: 24.99,
    status: "pending",
    description: "CSO Affiliate Residual Income (50%) - January 2025",
    createdAt: "2025-01-07T00:00:00Z",
  },
  {
    id: "3",
    type: "commission",
    amount: 79.99,
    status: "completed",
    description: "20% Commission - ACE-1 Course Sale",
    createdAt: "2025-01-05T14:22:00Z",
  },
  {
    id: "4",
    type: "payout",
    amount: -500,
    status: "completed",
    description: "Payout Request - PayPal",
    createdAt: "2025-01-01T09:00:00Z",
  },
  {
    id: "5",
    type: "consultation",
    amount: 74.99,
    status: "completed",
    description: "Consultation Fee - Mike Brown",
    createdAt: "2024-12-28T16:45:00Z",
  },
  {
    id: "6",
    type: "referral_bonus",
    amount: 25,
    status: "completed",
    description: "ACE-1 Student Referral - James Wilson",
    createdAt: "2024-12-25T11:00:00Z",
  },
];

export default function WalletScreen() {
  const { colors, isDark } = useTheme();
  useSubscription();
  
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "bank_transfer">("paypal");
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payout amount.");
      return;
    }

    if (amount > mockWallet.availableBalance) {
      Alert.alert("Insufficient Balance", "You don't have enough available balance for this payout.");
      return;
    }

    if (amount < 25) {
      Alert.alert("Minimum Payout", "The minimum payout amount is $25.00.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setShowPayoutModal(false);
      setPayoutAmount("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Payout Requested",
        `Your payout request for ${formatCurrency(amount)} has been submitted. Payouts are processed monthly and you will receive your funds within 5-7 business days.`
      );
    }, 1500);
  };

  const transactionConfig: Record<TransactionType, { icon: any; color: string; label: string }> = {
    referral_bonus: { icon: Users, color: colors.info, label: "Referral Bonus" },
    residual_income: { icon: TrendingUp, color: colors.accent, label: "Residual Income" },
    commission: { icon: DollarSign, color: colors.secondary, label: "Commission" },
    payout: { icon: ArrowUpCircle, color: colors.error, label: "Payout" },
    consultation: { icon: Briefcase, color: colors.primary, label: "Consultation" },
  };

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <Text style={styles.headerSubtitle}>Manage your earnings</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <LinearGradient
            colors={colors.gradient.primary as [string, string]}
            style={styles.balanceCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.balanceHeader}>
              <View style={styles.walletIconWrap}>
                <Wallet color={colors.white} size={24} />
              </View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
            </View>
            <Text style={styles.balanceAmount}>
              {formatCurrency(mockWallet.availableBalance)}
            </Text>
            
            <View style={styles.balanceStats}>
              <View style={styles.balanceStat}>
                <Clock color="rgba(255,255,255,0.6)" size={16} />
                <View>
                  <Text style={styles.balanceStatLabel}>Pending</Text>
                  <Text style={styles.balanceStatValue}>{formatCurrency(mockWallet.pendingBalance)}</Text>
                </View>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <ArrowDownCircle color="rgba(255,255,255,0.6)" size={16} />
                <View>
                  <Text style={styles.balanceStatLabel}>Total Earned</Text>
                  <Text style={styles.balanceStatValue}>{formatCurrency(mockWallet.totalEarned)}</Text>
                </View>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <ArrowUpCircle color="rgba(255,255,255,0.6)" size={16} />
                <View>
                  <Text style={styles.balanceStatLabel}>Withdrawn</Text>
                  <Text style={styles.balanceStatValue}>{formatCurrency(mockWallet.totalWithdrawn)}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.payoutButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowPayoutModal(true);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.payoutButtonText}>Request Payout</Text>
              <ChevronRight color={colors.primary} size={18} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        <Card variant="default" padding="md" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Gift color={colors.secondary} size={20} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Monthly Payouts</Text>
              <Text style={styles.infoText}>
                All referral earnings are paid out once monthly. Pending earnings become available after the billing cycle closes.
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.earningsSection}>
          <Text style={styles.sectionTitle}>Earning Sources</Text>
          <View style={styles.earningsGrid}>
            <Card variant="default" padding="md" style={styles.earningCard}>
              <View style={[styles.earningIcon, { backgroundColor: colors.info + "20" }]}>
                <Users color={colors.info} size={20} />
              </View>
              <Text style={styles.earningLabel}>ACE-1 Referrals</Text>
              <Text style={styles.earningAmount}>$25 each</Text>
            </Card>
            <Card variant="default" padding="md" style={styles.earningCard}>
              <View style={[styles.earningIcon, { backgroundColor: colors.accent + "20" }]}>
                <TrendingUp color={colors.accent} size={20} />
              </View>
              <Text style={styles.earningLabel}>CSO Residual</Text>
              <Text style={styles.earningAmount}>50-75%</Text>
            </Card>
            <Card variant="default" padding="md" style={styles.earningCard}>
              <View style={[styles.earningIcon, { backgroundColor: colors.secondary + "20" }]}>
                <DollarSign color={colors.secondary} size={20} />
              </View>
              <Text style={styles.earningLabel}>Sales Commission</Text>
              <Text style={styles.earningAmount}>20%</Text>
            </Card>
            <Card variant="default" padding="md" style={styles.earningCard}>
              <View style={[styles.earningIcon, { backgroundColor: colors.primary + "20" }]}>
                <Briefcase color={colors.primary} size={20} />
              </View>
              <Text style={styles.earningLabel}>Consultations</Text>
              <Text style={styles.earningAmount}>$74.99</Text>
            </Card>
          </View>
        </View>

        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {mockTransactions.map((transaction, index) => {
            const config = transactionConfig[transaction.type];
            const IconComponent = config.icon;
            const isNegative = transaction.amount < 0;

            return (
              <Animated.View
                key={transaction.id}
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: Animated.multiply(slideAnim, (index % 3) * 0.5) }],
                }}
              >
                <Card variant="default" padding="md" style={styles.transactionCard}>
                  <View style={styles.transactionRow}>
                    <View style={[styles.transactionIcon, { backgroundColor: config.color + "20" }]}>
                      <IconComponent color={config.color} size={20} />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDesc}>{transaction.description}</Text>
                      <View style={styles.transactionMeta}>
                        <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
                        {transaction.status === "pending" ? (
                          <Badge text="Pending" variant="warning" size="sm" />
                        ) : (
                          <CheckCircle color={colors.success} size={14} />
                        )}
                      </View>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      isNegative ? styles.negativeAmount : styles.positiveAmount,
                    ]}>
                      {isNegative ? "-" : "+"}{formatCurrency(Math.abs(transaction.amount))}
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={showPayoutModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPayoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Payout</Text>
              <TouchableOpacity 
                onPress={() => setShowPayoutModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X color={colors.textLight} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.availableBalanceRow}>
                <Text style={styles.availableLabel}>Available Balance</Text>
                <Text style={styles.availableAmount}>{formatCurrency(mockWallet.availableBalance)}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payout Amount</Text>
                <View style={styles.amountInputWrap}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={payoutAmount}
                    onChangeText={setPayoutAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <Text style={styles.minPayout}>Minimum payout: $25.00</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.paymentMethods}>
                  <TouchableOpacity
                    style={[styles.paymentMethod, paymentMethod === "paypal" && styles.selectedPayment]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPaymentMethod("paypal");
                    }}
                  >
                    <CreditCard color={paymentMethod === "paypal" ? colors.primary : colors.textLight} size={20} />
                    <Text style={[styles.paymentMethodText, paymentMethod === "paypal" && styles.selectedPaymentText]}>
                      PayPal
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.paymentMethod, paymentMethod === "bank_transfer" && styles.selectedPayment]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPaymentMethod("bank_transfer");
                    }}
                  >
                    <Building2 color={paymentMethod === "bank_transfer" ? colors.primary : colors.textLight} size={20} />
                    <Text style={[styles.paymentMethodText, paymentMethod === "bank_transfer" && styles.selectedPaymentText]}>
                      Bank Transfer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.payoutNotice}>
                <Clock color={colors.warning} size={16} />
                <Text style={styles.payoutNoticeText}>
                  Payouts are processed monthly and typically arrive within 5-7 business days.
                </Text>
              </View>

              <Button
                title={isProcessing ? "Processing..." : "Submit Payout Request"}
                onPress={handleRequestPayout}
                variant="primary"
                size="lg"
                fullWidth
                loading={isProcessing}
                disabled={isProcessing}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  walletIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: "800" as const,
    color: colors.white,
    marginBottom: 20,
    letterSpacing: -1,
  },
  balanceStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  balanceStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
  },
  balanceStatValue: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.white,
  },
  balanceStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 8,
  },
  payoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  payoutButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  infoCard: {
    marginBottom: 24,
    backgroundColor: isDark ? colors.surface : colors.secondary + "08",
    borderWidth: 1,
    borderColor: colors.secondary + "20",
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  earningsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 16,
  },
  earningsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  earningCard: {
    width: "48%",
    flexGrow: 1,
  },
  earningIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  earningLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  earningAmount: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.text,
  },
  transactionsSection: {
    marginBottom: 8,
  },
  transactionCard: {
    marginBottom: 12,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 14,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 6,
  },
  transactionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  positiveAmount: {
    color: colors.success,
  },
  negativeAmount: {
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  availableBalanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  availableLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  availableAmount: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 8,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600" as const,
    color: colors.text,
    paddingVertical: 14,
  },
  minPayout: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 8,
  },
  paymentMethods: {
    flexDirection: "row",
    gap: 12,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedPayment: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  selectedPaymentText: {
    color: colors.primary,
  },
  payoutNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.warning + "15",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  payoutNoticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
