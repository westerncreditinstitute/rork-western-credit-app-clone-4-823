import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  X,
  Check,
  Crown,
  Sparkles,
  ArrowRight,
  Infinity as InfinityIcon,
} from "lucide-react-native";

import { useTheme } from "@/contexts/ThemeContext";
import {
  ACE1_TRIAL_DAYS,
  ACE23_DUE_TODAY,
  BUNDLE_PRICE,
  CERTIFICATE_FEE,
  ENROLLMENT_FEE,
  MONTHLY_SUBSCRIPTION,
  REFERRAL_ACE1_ENROLLED,
  REFERRAL_ACE23_BOUNTY,
  formatPrice,
} from "@/constants/pricing";

const { width } = Dimensions.get("window");

interface OfferCourse {
  /** Course id in `mocks/data.ts`, used to open the right detail screen. */
  id: string;
  code: string;
  title: string;
  tagline: string;
  /** Large headline figure - what they pay today. */
  dueToday: number;
  dueTodayCaption: string;
  /** Recurring cost after any free period. Omitted for the lifetime bundle. */
  monthlyCaption?: string;
  perks: string[];
  accent: string;
  gradient: [string, string];
  badge?: string;
  featured?: boolean;
}

/**
 * The four things a new member can buy, in the order we want them weighed:
 * ACE-1 first because it is the cheapest way in, the bundle last because it
 * is the anchor that makes the monthly courses look small.
 */
const OFFERS: OfferCourse[] = [
  {
    id: "3",
    code: "ACE-1",
    title: "Advanced Credit Repair",
    tagline: "Remove negative items and take back your report.",
    dueToday: 0,
    dueTodayCaption: `Nothing due today — ${ACE1_TRIAL_DAYS}-day free trial`,
    monthlyCaption: `${formatPrice(CERTIFICATE_FEE)} certificate, then ${formatPrice(MONTHLY_SUBSCRIPTION)}/mo after your trial`,
    perks: [
      `Free for ${ACE1_TRIAL_DAYS} days, no charge today`,
      "Your own AI Credit Repair Agent",
      "AI Dispute & Lawsuit Assistants",
      "Cloud Dispute Tracker",
      `${formatPrice(REFERRAL_ACE1_ENROLLED)} per student you refer`,
    ],
    accent: "#10B981",
    gradient: ["#064E3B", "#065F46"],
    badge: "BEST START",
  },
  {
    id: "4",
    code: "ACE-2",
    title: "Advanced Credit Building",
    tagline: "Build toward an 800+ FICO score in as little as 90 days.",
    dueToday: ACE23_DUE_TODAY,
    dueTodayCaption: `${formatPrice(CERTIFICATE_FEE)} certificate + ${formatPrice(ENROLLMENT_FEE)} enrollment`,
    monthlyCaption: `${formatPrice(MONTHLY_SUBSCRIPTION)}/mo — no free trial`,
    perks: [
      "Establish an 800+ FICO score",
      "AI agent trained on score building",
      "Interactive Coach access",
      "Credit chain & authorized user strategies",
      `${formatPrice(REFERRAL_ACE23_BOUNTY)} per ACE-2/3 referral`,
    ],
    accent: "#3B82F6",
    gradient: ["#1E3A8A", "#1E40AF"],
  },
  {
    id: "5",
    code: "ACE-3",
    title: "Advanced Business Credit",
    tagline: "Build corporate credit and unlock business funding.",
    dueToday: ACE23_DUE_TODAY,
    dueTodayCaption: `${formatPrice(CERTIFICATE_FEE)} certificate + ${formatPrice(ENROLLMENT_FEE)} enrollment`,
    monthlyCaption: `${formatPrice(MONTHLY_SUBSCRIPTION)}/mo — no free trial`,
    perks: [
      "Establish a business credit profile",
      "Trade lines & vendor accounts",
      "SBA loans and business funding",
      "Interactive Coach access",
      "Separate personal & business credit",
    ],
    accent: "#A855F7",
    gradient: ["#4C1D95", "#5B21B6"],
  },
  {
    id: "9",
    code: "ACE-4",
    title: "Complete ACE Bundle",
    tagline: "All three courses. One payment. Yours for life.",
    dueToday: BUNDLE_PRICE,
    dueTodayCaption: "One time — lifetime access, no subscription ever",
    perks: [
      "ACE-1, ACE-2 and ACE-3 included",
      "Every AI tool with no topic limits",
      "All three certificates",
      "Affiliate network + all future updates",
      "50% commission as a CSO Affiliate",
    ],
    accent: "#D4AF37",
    gradient: ["#78350F", "#92400E"],
    badge: "BEST VALUE",
    featured: true,
  },
];

export interface UpgradeOfferModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * The upgrade offer shown once, immediately after registration.
 *
 * Everyone signs up free, so this is the first and best moment to explain
 * what the paid courses actually are. It is deliberately dismissible with a
 * single obvious X - a new member who feels trapped behind a paywall churns
 * before they ever see the product.
 */
export default function UpgradeOfferModal({ visible, onClose }: UpgradeOfferModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (courseId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Close first so the offer isn't left stacked behind the course screen
      // when the user navigates back.
      onClose();
      router.push({ pathname: "/course-detail", params: { id: courseId } } as any);
    },
    [onClose, router]
  );

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <LinearGradient
          colors={["#0A1628", "#1A365D", "#0A1628"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topBarSpacer} />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close upgrade offer"
            testID="upgrade-offer-close"
          >
            <X color="#FFFFFF" size={22} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.welcomePill}>
              <Sparkles color="#D4AF37" size={14} />
              <Text style={styles.welcomePillText}>YOUR ACCOUNT IS READY</Text>
            </View>
            <Text style={styles.title}>Pick the course that fits your goal</Text>
            <Text style={styles.subtitle}>
              Your free account is active and you can start referring today. Add a
              course whenever you&apos;re ready — or skip this and look around first.
            </Text>
          </View>

          {OFFERS.map((offer) => (
            <TouchableOpacity
              key={offer.id}
              activeOpacity={0.9}
              onPress={() => handleSelect(offer.id)}
              style={[styles.card, offer.featured && { borderColor: offer.accent }]}
              testID={`upgrade-offer-${offer.id}`}
            >
              <LinearGradient
                colors={offer.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.codePill, { backgroundColor: `${offer.accent}26` }]}>
                      <Text style={[styles.codeText, { color: offer.accent }]}>
                        {offer.code}
                      </Text>
                    </View>
                    {offer.badge ? (
                      <View style={[styles.badge, { backgroundColor: offer.accent }]}>
                        <Text style={styles.badgeText}>{offer.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  {offer.featured ? (
                    <Crown color={offer.accent} size={20} />
                  ) : null}
                </View>

                <Text style={styles.cardTitle}>{offer.title}</Text>
                <Text style={styles.cardTagline}>{offer.tagline}</Text>

                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: offer.accent }]}>
                    {formatPrice(offer.dueToday)}
                  </Text>
                  {offer.monthlyCaption ? null : (
                    <View style={styles.lifetimePill}>
                      <InfinityIcon color={offer.accent} size={12} />
                      <Text style={[styles.lifetimeText, { color: offer.accent }]}>
                        LIFETIME
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.priceCaption}>{offer.dueTodayCaption}</Text>
                {offer.monthlyCaption ? (
                  <Text style={styles.monthlyCaption}>{offer.monthlyCaption}</Text>
                ) : null}

                <View style={styles.divider} />

                {offer.perks.map((perk) => (
                  <View key={perk} style={styles.perkRow}>
                    <Check color={offer.accent} size={15} strokeWidth={3} />
                    <Text style={styles.perkText}>{perk}</Text>
                  </View>
                ))}

                <View style={[styles.cta, { backgroundColor: offer.accent }]}>
                  <Text style={styles.ctaText}>
                    {offer.featured ? "Get lifetime access" : `View ${offer.code}`}
                  </Text>
                  <ArrowRight color="#0A1628" size={16} strokeWidth={2.5} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Continue with the free account"
          >
            <Text style={styles.skipText}>Maybe later — keep exploring free</Text>
          </TouchableOpacity>

          <Text style={styles.footnote}>
            You can enroll any time from the Courses tab. Your free account never
            expires.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#0A1628",
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    topBarSpacer: {
      width: 40,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.18)",
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    header: {
      marginBottom: 24,
    },
    welcomePill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "rgba(212, 175, 55, 0.14)",
      borderWidth: 1,
      borderColor: "rgba(212, 175, 55, 0.3)",
      marginBottom: 14,
    },
    welcomePillText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#D4AF37",
      letterSpacing: 1,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: -0.5,
      lineHeight: 34,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 21,
      color: "#94A3B8",
    },
    card: {
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    cardGradient: {
      padding: 20,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    cardHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    codePill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    codeText: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: "800",
      color: "#0A1628",
      letterSpacing: 0.8,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#FFFFFF",
      marginBottom: 4,
      letterSpacing: -0.3,
    },
    cardTagline: {
      fontSize: 13,
      color: "rgba(255, 255, 255, 0.7)",
      lineHeight: 19,
      marginBottom: 16,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    price: {
      fontSize: 30,
      fontWeight: "800",
      letterSpacing: -1,
    },
    lifetimePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    lifetimeText: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.8,
    },
    priceCaption: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.65)",
      marginTop: 2,
    },
    monthlyCaption: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.5)",
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      marginVertical: 16,
    },
    perkRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 9,
    },
    perkText: {
      flex: 1,
      fontSize: 13,
      color: "rgba(255, 255, 255, 0.88)",
      lineHeight: 19,
    },
    cta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 13,
      borderRadius: 12,
      marginTop: 10,
    },
    ctaText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#0A1628",
      letterSpacing: 0.2,
    },
    skipButton: {
      alignItems: "center",
      paddingVertical: 16,
      marginTop: 4,
    },
    skipText: {
      fontSize: 15,
      fontWeight: "600",
      color: "#D4AF37",
    },
    footnote: {
      fontSize: 12,
      color: "#64748B",
      textAlign: "center",
      lineHeight: 18,
      paddingHorizontal: 20,
    },
  });
}

export { width as UPGRADE_OFFER_WIDTH, type OfferCourse };
