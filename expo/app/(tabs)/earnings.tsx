import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Animated,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import {
  DollarSign,
  TrendingUp,
  Users,
  Copy,
  Share2,
  Clock,
  CheckCircle,
  Gift,
  Briefcase,
  Crown,
  Package,
  ArrowRight,
  Repeat,
} from "lucide-react-native";

import { useTheme } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { currentUser, earnings } from "@/mocks/data";
import { Card, Badge, Button } from "@/components/ui";
import ReferralProgramBreakdown from "@/components/earnings/ReferralProgramBreakdown";
import {
  BUNDLE_PAYOUT_CSO,
  CSO_MONTHLY_FEE,
  CSO_RESIDUAL_BONUS_SHARE,
  CSO_RESIDUAL_BONUS_THRESHOLD,
  CSO_RESIDUAL_MONTHLY,
  REFERRAL_ACE1_ENROLLED,
  REFERRAL_ACE1_FREE,
  REFERRAL_ACE23_BOUNTY,
  ace1ReferralBonus,
  bundleCommission,
  formatPrice,
} from "@/constants/pricing";

type EarningType = "all" | "referral" | "commission" | "residual" | "coaching";

export default function EarningsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isFree, isCSO, tier } = useSubscription();
  
  const [selectedType, setSelectedType] = useState<EarningType>("all");
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

  const referralLink = `westerncredit.com/ref/${currentUser.id}`;
  const totalPending = earnings
    .filter((e) => e.status === "pending")
    .reduce((sum, e) => sum + e.amount, 0);
  const thisMonthEarnings = earnings
    .filter((e) => e.date.startsWith("2025-01"))
    .reduce((sum, e) => sum + e.amount, 0);

  const filteredEarnings =
    selectedType === "all"
      ? earnings
      : earnings.filter((e) => e.type === selectedType);

  const earningTypeConfig = {
    referral: { icon: Users, color: colors.info, label: "Referral" },
    commission: { icon: DollarSign, color: colors.secondary, label: "Commission" },
    residual: { icon: TrendingUp, color: colors.accent, label: "Residual" },
    coaching: { icon: Briefcase, color: colors.primary, label: "Coaching" },
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(referralLink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Join Western Credit Institute and start your credit education journey! Use my referral link: https://${referralLink}`,
      });
    } catch (error) {
      console.log("Error sharing:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const styles = createStyles(colors, isDark);

  // The referral program is open to every member, including the free tier -
  // a free member earns on an ACE-1 referral, just at half the enrolled rate.
  // So this screen explains the program to everyone rather than paywalling it,
  // and uses the rate gap itself as the argument for upgrading.
  if (isFree) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Earnings & Referrals</Text>
          <Text style={styles.headerSubtitle}>You can start earning today</Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={colors.gradient.primary as [string, string]}
            style={styles.freeHero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Gift color={colors.white} size={28} />
            <Text style={styles.freeHeroTitle}>
              Earn {formatPrice(REFERRAL_ACE1_FREE)} per referral, starting now
            </Text>
            <Text style={styles.freeHeroText}>
              You do not need to be enrolled to get paid. Share your link, and
              when someone signs up for ACE-1 and stays past their first 7 days,
              that is {formatPrice(REFERRAL_ACE1_FREE)} to you.
            </Text>
            <Text style={styles.freeHeroKicker}>
              Enroll in ACE-1 and the same referral pays{" "}
              {formatPrice(REFERRAL_ACE1_ENROLLED)} instead.
            </Text>
          </LinearGradient>

          <Card variant="default" padding="lg" style={styles.referralSection}>
            <View style={styles.sectionHeader}>
              <Gift color={colors.secondary} size={22} />
              <Text style={styles.sectionTitle}>Your Referral Link</Text>
            </View>
            <View style={styles.referralLinkBox}>
              <Text style={styles.referralLink} numberOfLines={1}>
                {referralLink}
              </Text>
              <View style={styles.referralActions}>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
                  <Copy color={colors.primary} size={18} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                  <Share2 color={colors.white} size={18} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          <ReferralProgramBreakdown tier={tier} />

          <Button
            title="View Plans & Upgrade"
            onPress={() => router.push("/subscription-plans" as any)}
            variant="primary"
            size="lg"
            fullWidth
            icon={<ArrowRight color={colors.white} size={18} />}
            iconPosition="right"
          />

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings & Referrals</Text>
        <Text style={styles.headerSubtitle}>Track your income</Text>
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
              <Text style={styles.balanceLabel}>Total Earnings</Text>
              <View style={styles.trendBadge}>
                <TrendingUp color={colors.secondary} size={14} />
                <Text style={styles.trendText}>+12%</Text>
              </View>
            </View>
            <Text style={styles.balanceAmount}>
              ${currentUser.totalEarnings.toLocaleString()}
            </Text>
            <View style={styles.balanceStats}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>This Month</Text>
                <Text style={styles.balanceStatValue}>${thisMonthEarnings}</Text>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Pending</Text>
                <Text style={styles.balanceStatValue}>${totalPending}</Text>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Referrals</Text>
                <Text style={styles.balanceStatValue}>{currentUser.referrals}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Card variant="default" padding="lg" style={styles.referralSection}>
          <View style={styles.sectionHeader}>
            <Gift color={colors.secondary} size={22} />
            <Text style={styles.sectionTitle}>Refer & Earn</Text>
          </View>
          <Text style={styles.referralDescription}>
            {isCSO
              ? `You earn ${formatPrice(REFERRAL_ACE1_ENROLLED)} per ACE-1 referral, ${formatPrice(REFERRAL_ACE23_BOUNTY)} per ACE-2/ACE-3 registration, ${formatPrice(BUNDLE_PAYOUT_CSO)} on every bundle sale, and ${formatPrice(CSO_RESIDUAL_MONTHLY)} every month for each CSO Affiliate you sign up.`
              : `You earn ${formatPrice(ace1ReferralBonus(tier))} per ACE-1 referral, ${formatPrice(REFERRAL_ACE23_BOUNTY)} per ACE-2/ACE-3 registration, and ${formatPrice(bundleCommission(tier))} on every bundle sale.`}
          </Text>
          <View style={styles.referralLinkBox}>
            <Text style={styles.referralLink} numberOfLines={1}>
              {referralLink}
            </Text>
            <View style={styles.referralActions}>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyLink}
              >
                <Copy color={colors.primary} size={18} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
              >
                <Share2 color={colors.white} size={18} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        <ReferralProgramBreakdown tier={tier} />

        <View style={styles.incomeTypesSection}>
          <Text style={styles.incomeTypesTitle}>Income Streams</Text>
          <View style={styles.incomeTypesGrid}>
            <Card variant="default" padding="md" style={styles.incomeTypeCard}>
              <View style={[styles.incomeTypeIcon, { backgroundColor: colors.info + "20" }]}>
                <Users color={colors.info} size={22} />
              </View>
              <Text style={styles.incomeTypeTitle}>ACE-1 Referrals</Text>
              <Text style={styles.incomeTypeDesc}>
                {formatPrice(ace1ReferralBonus(tier))} per student
              </Text>
            </Card>

            <Card variant="default" padding="md" style={styles.incomeTypeCard}>
              <View style={[styles.incomeTypeIcon, { backgroundColor: colors.accent + "20" }]}>
                <TrendingUp color={colors.accent} size={22} />
              </View>
              <Text style={styles.incomeTypeTitle}>ACE-2 / ACE-3</Text>
              <Text style={styles.incomeTypeDesc}>
                {formatPrice(REFERRAL_ACE23_BOUNTY)} each
              </Text>
            </Card>

            <Card variant="default" padding="md" style={styles.incomeTypeCard}>
              <View style={[styles.incomeTypeIcon, { backgroundColor: colors.warning + "20" }]}>
                <Package color={colors.warning} size={22} />
              </View>
              <Text style={styles.incomeTypeTitle}>Bundle Sales</Text>
              <Text style={styles.incomeTypeDesc}>
                {formatPrice(bundleCommission(tier))} each
              </Text>
            </Card>

            {isCSO && (
              <Card variant="default" padding="md" style={styles.incomeTypeCard}>
                <View style={[styles.incomeTypeIcon, { backgroundColor: colors.secondary + "20" }]}>
                  <Repeat color={colors.secondary} size={22} />
                </View>
                <Text style={styles.incomeTypeTitle}>CSO Residuals</Text>
                <Text style={styles.incomeTypeDesc}>
                  {formatPrice(CSO_RESIDUAL_MONTHLY)}/mo each — {CSO_RESIDUAL_BONUS_SHARE * 100}% past{' '}
                  {CSO_RESIDUAL_BONUS_THRESHOLD}
                </Text>
              </Card>
            )}

            {isCSO && (
              <Card variant="default" padding="md" style={styles.incomeTypeCard}>
                <View style={[styles.incomeTypeIcon, { backgroundColor: colors.success + "20" }]}>
                  <DollarSign color={colors.success} size={22} />
                </View>
                <Text style={styles.incomeTypeTitle}>Consultations</Text>
                <Text style={styles.incomeTypeDesc}>$74.99 each</Text>
              </Card>
            )}
            
            <Card variant="default" padding="md" style={styles.incomeTypeCard}>
              <View style={[styles.incomeTypeIcon, { backgroundColor: colors.primary + "20" }]}>
                <Briefcase color={colors.primary} size={22} />
              </View>
              <Text style={styles.incomeTypeTitle}>Monthly Payouts</Text>
              <Text style={styles.incomeTypeDesc}>Paid 1st of month</Text>
            </Card>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Transaction History</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            {(["all", "referral", "commission", "residual", "coaching"] as EarningType[]).map(
              (type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    { 
                      backgroundColor: selectedType === type ? colors.primary : colors.surfaceAlt,
                      borderColor: selectedType === type ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedType(type);
                  }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: selectedType === type ? colors.white : colors.textSecondary },
                    ]}
                  >
                    {type === "all" ? "All" : earningTypeConfig[type].label}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>

          {filteredEarnings.map((earning, index) => {
            const config = earningTypeConfig[earning.type];
            const IconComponent = config.icon;
            return (
              <Animated.View
                key={earning.id}
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: Animated.multiply(slideAnim, (index % 3) * 0.3) }],
                }}
              >
                <Card variant="default" padding="md" style={styles.transactionCard}>
                  <View style={styles.transactionRow}>
                    <View style={[styles.transactionIcon, { backgroundColor: config.color + "20" }]}>
                      <IconComponent color={config.color} size={20} />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDesc}>{earning.description}</Text>
                      <View style={styles.transactionMeta}>
                        <Clock color={colors.textLight} size={12} />
                        <Text style={styles.transactionDate}>
                          {formatDate(earning.date)}
                        </Text>
                        {earning.status === "pending" ? (
                          <Badge text="Pending" variant="warning" size="sm" />
                        ) : (
                          <CheckCircle color={colors.success} size={14} />
                        )}
                      </View>
                    </View>
                    <Text style={[styles.transactionAmount, earning.status === "pending" && styles.pendingAmount]}>
                      +${earning.amount}
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  lockedCard: {
    alignItems: "center",
  },
  lockedIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warning + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 8,
    textAlign: "center" as const,
  },
  lockedDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 21,
    marginBottom: 24,
  },
  planComparison: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginBottom: 24,
  },
  planCard: {
    flex: 1,
  },
  planCardHighlight: {
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  popularBadge: {
    position: "absolute" as const,
    top: -10,
    right: 10,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: colors.primary,
    marginBottom: 12,
  },
  planFeatures: {
    gap: 4,
  },
  planFeature: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.secondary,
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
  },
  balanceStat: {
    flex: 1,
    alignItems: "center",
  },
  balanceStatLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 4,
  },
  balanceStatValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
  balanceStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  referralSection: {
    marginBottom: 20,
  },
  freeHero: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    gap: 10,
  },
  freeHeroTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: colors.white,
    letterSpacing: -0.4,
  },
  freeHeroText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 21,
  },
  freeHeroKicker: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.secondary,
    lineHeight: 21,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  referralDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  referralLinkBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  referralLink: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: "500" as const,
  },
  referralActions: {
    flexDirection: "row",
    gap: 8,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  residualSection: {
    marginBottom: 20,
  },
  tierCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
  },
  tierHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  tierInfo: {},
  currentTierLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  currentTierValue: {
    fontSize: 28,
    fontWeight: "800" as const,
  },
  tierProgress: {
    alignItems: "flex-end",
  },
  tierProgressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tierProgressValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  nextTierInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.warning + "15",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  nextTierText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: "500" as const,
  },
  incomeTypesSection: {
    marginBottom: 24,
  },
  incomeTypesTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 16,
  },
  incomeTypesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  incomeTypeCard: {
    width: "48%",
    flexGrow: 1,
  },
  incomeTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  incomeTypeTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 4,
  },
  incomeTypeDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  historySection: {
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 16,
  },
  filterScroll: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500" as const,
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
    gap: 6,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textLight,
    marginRight: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.secondary,
  },
  pendingAmount: {
    color: colors.textSecondary,
  },
});
