import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Users,
  GraduationCap,
  Package,
  Crown,
  Check,
  TrendingUp,
  Clock,
} from "lucide-react-native";

import { useTheme } from "@/contexts/ThemeContext";
import type { ThemeColors } from "@/constants/colors";
import { Card, Badge } from "@/components/ui";
import {
  BUNDLE_COMMISSION_CSO,
  BUNDLE_COMMISSION_STANDARD,
  BUNDLE_CSO_ADVANTAGE,
  BUNDLE_PAYOUT_CSO,
  BUNDLE_PAYOUT_STANDARD,
  CSO_MONTHLY_FEE,
  EARNINGS_SCENARIOS,
  REFERRAL_ACE1_ENROLLED,
  REFERRAL_ACE1_FREE,
  REFERRAL_ACE23_BOUNTY,
  REFERRAL_QUALIFYING_DAYS,
  type ReferrerTier,
  ace1ReferralBonus,
  bundleCommission,
  formatPrice,
  projectMonthlyEarnings,
} from "@/constants/pricing";

interface ReferralProgramBreakdownProps {
  /** The signed-in user's tier - drives which rate is marked as theirs. */
  tier: ReferrerTier;
}

/**
 * Plain-language explanation of the referral program.
 *
 * Every dollar figure here is computed from `constants/pricing`, so the
 * worked examples can never drift out of step with what the payout code
 * actually pays. The iOS mirror is `ReferralProgramBreakdownView.swift`.
 */
function ReferralProgramBreakdown({ tier }: ReferralProgramBreakdownProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isCSO = tier === "cso_affiliate";
  const isEnrolled = tier !== "free";

  const scenarios = useMemo(
    () =>
      EARNINGS_SCENARIOS.map((scenario) => ({
        ...scenario,
        csoTotal: projectMonthlyEarnings({ ...scenario, tier: "cso_affiliate" }),
        yourTotal: projectMonthlyEarnings({ ...scenario, tier }),
      })),
    [tier]
  );

  return (
    <View>
      <Card variant="default" padding="lg" style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users color={colors.info} size={22} />
          <Text style={styles.sectionTitle}>How You Get Paid</Text>
        </View>
        <Text style={styles.sectionIntro}>
          Share your link. When someone signs up through it, you earn. There is
          no cap on how many people you can refer.
        </Text>

        <PayoutRow
          styles={styles}
          colors={colors}
          icon={<Users color={colors.info} size={20} />}
          tint={colors.info}
          title="They sign up for ACE-1"
          amount={formatPrice(REFERRAL_ACE1_FREE)}
          subtitle={`Paid once they keep the account open past ${REFERRAL_QUALIFYING_DAYS} days.`}
          tag="If you're on the Free plan"
          isYours={tier === "free"}
        />

        <PayoutRow
          styles={styles}
          colors={colors}
          icon={<GraduationCap color={colors.secondary} size={20} />}
          tint={colors.secondary}
          title="They sign up for ACE-1"
          amount={formatPrice(REFERRAL_ACE1_ENROLLED)}
          subtitle={`Double the free rate, for the same referral. Paid after ${REFERRAL_QUALIFYING_DAYS} days.`}
          tag="If you're an ACE student or CSO"
          isYours={isEnrolled}
        />

        <PayoutRow
          styles={styles}
          colors={colors}
          icon={<TrendingUp color={colors.accent} size={20} />}
          tint={colors.accent}
          title="That same person adds ACE-2 or ACE-3"
          amount={`${formatPrice(REFERRAL_ACE23_BOUNTY)} each`}
          subtitle="No trial on these courses, so it pays as soon as they register. Both courses means you get paid twice."
          tag="Everyone earns this rate"
          isYours
        />

        <PayoutRow
          styles={styles}
          colors={colors}
          icon={<Package color={colors.warning} size={20} />}
          tint={colors.warning}
          title="They buy the Complete ACE Bundle"
          amount={isCSO ? formatPrice(BUNDLE_PAYOUT_CSO) : formatPrice(BUNDLE_PAYOUT_STANDARD)}
          subtitle={
            isCSO
              ? `${BUNDLE_COMMISSION_CSO * 100}% of the sale because you're a CSO Affiliate.`
              : `${BUNDLE_COMMISSION_STANDARD * 100}% of the sale. CSO Affiliates get ${
                  BUNDLE_COMMISSION_CSO * 100
                }% — ${formatPrice(BUNDLE_PAYOUT_CSO)} — on the exact same sale.`
          }
          tag={isCSO ? "Your CSO rate" : "Your current rate"}
          isYours
          isLast
        />

        <View style={styles.noteBox}>
          <Clock color={colors.textSecondary} size={14} />
          <Text style={styles.noteText}>
            One person can earn you money more than once — the ACE-1 bonus, then
            again for every course they add on top.
          </Text>
        </View>
      </Card>

      <Card variant="default" padding="lg" style={styles.section}>
        <View style={styles.sectionHeader}>
          <TrendingUp color={colors.secondary} size={22} />
          <Text style={styles.sectionTitle}>What This Adds Up To</Text>
        </View>
        <Text style={styles.sectionIntro}>
          Real math at CSO Affiliate rates — not projections. Here is what a
          month looks like at three levels of activity.
        </Text>

        {scenarios.map((scenario) => (
          <View key={scenario.id} style={styles.scenarioCard}>
            <View style={styles.scenarioHeader}>
              <Text style={styles.scenarioLabel}>{scenario.label}</Text>
              <Text style={styles.scenarioTotal}>
                {formatPrice(scenario.csoTotal)}
                <Text style={styles.scenarioPer}>/mo</Text>
              </Text>
            </View>
            <Text style={styles.scenarioCaption}>{scenario.caption}</Text>

            <View style={styles.scenarioBreakdown}>
              <Text style={styles.scenarioLine}>
                {scenario.ace1Referrals} ACE-1 referrals ×{" "}
                {formatPrice(REFERRAL_ACE1_ENROLLED)} ={" "}
                {formatPrice(scenario.ace1Referrals * REFERRAL_ACE1_ENROLLED)}
              </Text>
              <Text style={styles.scenarioLine}>
                {scenario.advancedCourseRegistrations} ACE-2/ACE-3 registrations ×{" "}
                {formatPrice(REFERRAL_ACE23_BOUNTY)} ={" "}
                {formatPrice(
                  scenario.advancedCourseRegistrations * REFERRAL_ACE23_BOUNTY
                )}
              </Text>
              <Text style={styles.scenarioLine}>
                {scenario.bundleSales} bundle sales ×{" "}
                {formatPrice(BUNDLE_PAYOUT_CSO)} ={" "}
                {formatPrice(scenario.bundleSales * BUNDLE_PAYOUT_CSO)}
              </Text>
            </View>

            {!isCSO && (
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonText}>
                  At your current rate: {formatPrice(scenario.yourTotal)}/mo
                </Text>
                <Badge
                  text={`+${formatPrice(scenario.csoTotal - scenario.yourTotal)} as CSO`}
                  variant="success"
                  size="sm"
                />
              </View>
            )}
          </View>
        ))}
      </Card>

      {!isCSO && (
        <Card variant="elevated" padding="lg" style={styles.ctaCard}>
          <View style={styles.ctaHeader}>
            <Crown color={colors.warning} size={26} />
            <Text style={styles.ctaTitle}>Become a CSO Affiliate</Text>
          </View>
          <Text style={styles.ctaSubtitle}>
            This is where the money is. CSO Affiliates keep{" "}
            {BUNDLE_COMMISSION_CSO * 100}% of every bundle sale instead of{" "}
            {BUNDLE_COMMISSION_STANDARD * 100}%.
          </Text>

          <View style={styles.ctaCompare}>
            <View style={styles.ctaCompareCol}>
              <Text style={styles.ctaCompareLabel}>You now</Text>
              <Text style={styles.ctaCompareValue}>
                {formatPrice(bundleCommission(tier))}
              </Text>
              <Text style={styles.ctaCompareCaption}>per bundle sale</Text>
            </View>
            <View style={styles.ctaCompareDivider} />
            <View style={styles.ctaCompareCol}>
              <Text style={[styles.ctaCompareLabel, { color: colors.warning }]}>
                As a CSO
              </Text>
              <Text style={[styles.ctaCompareValue, { color: colors.warning }]}>
                {formatPrice(BUNDLE_PAYOUT_CSO)}
              </Text>
              <Text style={styles.ctaCompareCaption}>per bundle sale</Text>
            </View>
          </View>

          <Text style={styles.ctaAdvantage}>
            That is {formatPrice(BUNDLE_CSO_ADVANTAGE)} more on every single
            bundle you sell. Two bundles a month more than covers your CSO dues.
          </Text>

          <View style={styles.ctaBenefits}>
            {[
              `${BUNDLE_COMMISSION_CSO * 100}% commission on every bundle sale`,
              `${formatPrice(REFERRAL_ACE1_ENROLLED)} per ACE-1 referral`,
              `${formatPrice(REFERRAL_ACE23_BOUNTY)} per ACE-2/ACE-3 registration`,
              "Listed publicly on the Hire a Pro page",
              "Paid client consultations through the network",
            ].map((benefit) => (
              <View key={benefit} style={styles.ctaBenefitRow}>
                <Check color={colors.secondary} size={16} />
                <Text style={styles.ctaBenefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaPriceBox}>
            <Text style={styles.ctaPriceText}>
              CSO Affiliate membership is {formatPrice(CSO_MONTHLY_FEE)}/month to
              stay in the network and keep your Hire a Pro listing.
            </Text>
          </View>
        </Card>
      )}
    </View>
  );
}

interface PayoutRowProps {
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  icon: React.ReactNode;
  tint: string;
  title: string;
  amount: string;
  subtitle: string;
  tag: string;
  isYours?: boolean;
  isLast?: boolean;
}

function PayoutRow({
  styles,
  colors,
  icon,
  tint,
  title,
  amount,
  subtitle,
  tag,
  isYours = false,
  isLast = false,
}: PayoutRowProps) {
  return (
    <View style={[styles.payoutRow, isLast && styles.payoutRowLast]}>
      <View style={[styles.payoutIcon, { backgroundColor: tint + "1A" }]}>
        {icon}
      </View>
      <View style={styles.payoutBody}>
        <View style={styles.payoutTitleRow}>
          <Text style={styles.payoutTitle}>{title}</Text>
          <Text style={[styles.payoutAmount, { color: tint }]}>{amount}</Text>
        </View>
        <Text style={styles.payoutSubtitle}>{subtitle}</Text>
        <View style={styles.payoutTagRow}>
          <Text
            style={[
              styles.payoutTag,
              isYours && { color: colors.secondary, fontWeight: "700" as const },
            ]}
          >
            {tag}
          </Text>
          {isYours && (
            <View style={[styles.yoursPill, { backgroundColor: colors.secondary + "1A" }]}>
              <Text style={[styles.yoursPillText, { color: colors.secondary }]}>
                YOU
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    section: {
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.text,
    },
    sectionIntro: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 21,
      marginBottom: 18,
    },
    payoutRow: {
      flexDirection: "row",
      gap: 14,
      paddingBottom: 18,
      marginBottom: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    payoutRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
      marginBottom: 8,
    },
    payoutIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    payoutBody: {
      flex: 1,
    },
    payoutTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 4,
    },
    payoutTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.text,
    },
    payoutAmount: {
      fontSize: 17,
      fontWeight: "800" as const,
    },
    payoutSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      marginBottom: 6,
    },
    payoutTagRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    payoutTag: {
      fontSize: 12,
      color: colors.textLight,
    },
    yoursPill: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    yoursPillText: {
      fontSize: 10,
      fontWeight: "800" as const,
      letterSpacing: 0.5,
    },
    noteBox: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      padding: 12,
      marginTop: 4,
    },
    noteText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    scenarioCard: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    scenarioHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 10,
    },
    scenarioLabel: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.text,
    },
    scenarioTotal: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.secondary,
    },
    scenarioPer: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
    scenarioCaption: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
      marginBottom: 12,
      lineHeight: 19,
    },
    scenarioBreakdown: {
      gap: 5,
    },
    scenarioLine: {
      fontSize: 12,
      color: colors.textLight,
      lineHeight: 18,
    },
    comparisonRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    comparisonText: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
    },
    ctaCard: {
      marginBottom: 20,
      borderWidth: 2,
      borderColor: colors.warning + "55",
    },
    ctaHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    ctaTitle: {
      fontSize: 20,
      fontWeight: "800" as const,
      color: colors.text,
    },
    ctaSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 21,
      marginBottom: 18,
    },
    ctaCompare: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 16,
    },
    ctaCompareCol: {
      flex: 1,
      alignItems: "center",
    },
    ctaCompareDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: "stretch",
      backgroundColor: colors.border,
    },
    ctaCompareLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    ctaCompareValue: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.text,
    },
    ctaCompareCaption: {
      fontSize: 11,
      color: colors.textLight,
      marginTop: 2,
    },
    ctaAdvantage: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "600" as const,
      lineHeight: 21,
      marginTop: 14,
      marginBottom: 16,
    },
    ctaBenefits: {
      gap: 10,
      marginBottom: 16,
    },
    ctaBenefitRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    ctaBenefitText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    ctaPriceBox: {
      backgroundColor: colors.warning + "12",
      borderRadius: 12,
      padding: 12,
    },
    ctaPriceText: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 19,
    },
  });

export default React.memo(ReferralProgramBreakdown);
