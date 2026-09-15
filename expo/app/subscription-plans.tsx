import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Check,
  Crown,
  BookOpen,
  Star,
  Zap,
  Award,
  DollarSign,
  Clock,
  ChevronRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  ACE1_TRIAL_DAYS,
  ACE23_DUE_TODAY,
  BUNDLE_PAYOUT_CSO,
  BUNDLE_PRICE,
  CERTIFICATE_FEE,
  ENROLLMENT_FEE,
  MONTHLY_SUBSCRIPTION,
  REFERRAL_ACE1_ENROLLED,
  REFERRAL_ACE23_BOUNTY,
  formatPrice,
} from "@/constants/pricing";

type PlanType = "ace1_course";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: PlanType;
  name: string;
  subtitle: string;
  price: number;
  priceLabel: string;
  features: PlanFeature[];
  popular?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: "ace1_course",
    name: "ACE-1 Course",
    subtitle: `${ACE1_TRIAL_DAYS}-Day Free Trial`,
    price: 0,
    priceLabel: "Free to Start",
    badge: "BEST START",
    features: [
      { text: `Start free — nothing due for ${ACE1_TRIAL_DAYS} days`, included: true },
      { text: "AI Credit Repair Coach", included: true },
      { text: "AI Dispute Assistant", included: true },
      { text: "Lawsuit Assistant", included: true },
      { text: "Cloud Dispute Tracker", included: true },
      { text: "Certificate of Completion", included: true },
      { text: `${formatPrice(REFERRAL_ACE1_ENROLLED)} referral bonus per student`, included: true },
      { text: `${formatPrice(REFERRAL_ACE23_BOUNTY)} per ACE-2/ACE-3 referral`, included: true },
      {
        text: `${formatPrice(CERTIFICATE_FEE)} certificate fee after your trial`,
        included: true,
      },
      {
        text: `Then ${formatPrice(MONTHLY_SUBSCRIPTION)}/mo subscription`,
        included: true,
      },
    ],
  },
];

interface CourseOption {
  id: string;
  name: string;
  description: string;
  image: string;
  /** Certificate fee, charged on every ACE course except the bundle. */
  certFee?: number;
  /** Extra one-time enrollment fee (ACE-2 / ACE-3 only). */
  enrollmentFee?: number;
  /** Days of free access before billing starts (ACE-1 only). */
  freeTrialDays?: number;
  /** Recurring subscription that keeps the course active. */
  monthlyPrice?: number;
  /** One-time lifetime price (ACE-4 bundle only). */
  oneTimePrice?: number;
  autoDebitOnly?: boolean;
}

const courseOptions: CourseOption[] = [
  {
    id: "ace1",
    name: "ACE-1: Advanced Credit Repair",
    certFee: CERTIFICATE_FEE,
    freeTrialDays: ACE1_TRIAL_DAYS,
    monthlyPrice: MONTHLY_SUBSCRIPTION,
    description: "Master advanced credit repair techniques",
    image: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&h=400&fit=crop",
  },
  {
    id: "ace2",
    name: "ACE-2: Advanced Credit Building",
    certFee: CERTIFICATE_FEE,
    enrollmentFee: ENROLLMENT_FEE,
    monthlyPrice: MONTHLY_SUBSCRIPTION,
    autoDebitOnly: true,
    description: "Build an 800+ FICO score in 90 days",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop",
  },
  {
    id: "ace3",
    name: "ACE-3: Advanced Business Credit",
    certFee: CERTIFICATE_FEE,
    enrollmentFee: ENROLLMENT_FEE,
    monthlyPrice: MONTHLY_SUBSCRIPTION,
    autoDebitOnly: true,
    description: "Master business credit strategies",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop",
  },
  {
    id: "ace4",
    name: "ACE-4: Complete ACE Bundle",
    oneTimePrice: BUNDLE_PRICE,
    description: "All 3 courses, lifetime access, no subscription",
    image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=600&h=400&fit=crop",
  },
];

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { upgradeToACE1 } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [showCourses, setShowCourses] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectPlan = (planId: PlanType) => {
    setSelectedPlan(planId);
  };

  const handleEnroll = () => {
    if (!selectedPlan) {
      Alert.alert("Select a Plan", "Please select a subscription plan to continue.");
      return;
    }

    const plan = plans.find(p => p.id === selectedPlan);
    Alert.alert(
      "Confirm Enrollment",
      `You selected ${plan?.name} at $${plan?.price}${plan?.priceLabel.includes("/") ? plan?.priceLabel : ""}. Continue to payment?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Continue", 
          onPress: () => {
            Alert.alert("Success", "Your enrollment has been processed! Welcome to Western Credit Institute.");
            router.back();
          }
        },
      ]
    );
  };

  const handleCourseEnroll = async (courseId: string) => {
    const course = courseOptions.find(c => c.id === courseId);
    if (!course) return;

    const isACE1 = courseId === "ace1";
    const isBundle = courseId === "ace4";
    const dueToday = isBundle
      ? course.oneTimePrice ?? BUNDLE_PRICE
      : (course.certFee ?? 0) + (course.enrollmentFee ?? 0);

    const message = isACE1
      ? `Start ACE-1 free for ${ACE1_TRIAL_DAYS} days — nothing is charged today.\n\nDuring the trial you get the course, your AI agent and your credit report analysis. The full dispute letter library opens when your subscription starts.\n\nWhen the trial ends: ${formatPrice(course.certFee ?? CERTIFICATE_FEE)} certificate fee, then ${formatPrice(MONTHLY_SUBSCRIPTION)}/month.`
      : isBundle
      ? `One payment of ${formatPrice(dueToday)} for LIFETIME access to all 3 courses, AI tools, certificates, the affiliate network and every future update. No monthly subscription, ever.`
      : `${course.name}\n\nCertificate fee: ${formatPrice(course.certFee ?? CERTIFICATE_FEE)}\nEnrollment fee: ${formatPrice(course.enrollmentFee ?? ENROLLMENT_FEE)}\n\nDue today: ${formatPrice(dueToday)}\nThen ${formatPrice(MONTHLY_SUBSCRIPTION)}/month to keep your subscription.\n\nThere is no free trial for this course.`;

    Alert.alert(
      "Course Registration",
      message,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Pay ${formatPrice(dueToday)}`,
          onPress: async () => {
            if (isACE1) {
              setIsProcessing(true);
              try {
                console.log('[SubscriptionPlans] Starting ACE-1 upgrade...');
                const success = await upgradeToACE1();
                
                if (success) {
                  console.log('[SubscriptionPlans] ACE-1 upgrade successful');
                  Alert.alert(
                    "Successfully Enrolled!", 
                    `You are now enrolled in ACE-1! Your ${ACE1_TRIAL_DAYS}-day free trial is active and nothing has been charged.`,
                    [{ text: "OK", onPress: () => router.back() }]
                  );
                } else {
                  console.error('[SubscriptionPlans] ACE-1 upgrade failed');
                  Alert.alert(
                    "Enrollment Error",
                    "Failed to process your enrollment. Please try again.",
                    [{ text: "OK" }]
                  );
                }
              } catch (error) {
                console.error('[SubscriptionPlans] Error during enrollment:', error);
                Alert.alert(
                  "Enrollment Error",
                  "An unexpected error occurred. Please try again.",
                  [{ text: "OK" }]
                );
              } finally {
                setIsProcessing(false);
              }
            } else {
              Alert.alert("Success", `You are now enrolled in ${course.name}!`);
              router.back();
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Crown color={Colors.accent} size={40} />
          <Text style={styles.title}>Choose Your Path</Text>
          <Text style={styles.subtitle}>
            Select a plan that fits your goals and start your credit education journey
          </Text>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, !showCourses && styles.toggleButtonActive]}
            onPress={() => setShowCourses(false)}
          >
            <Text style={[styles.toggleText, !showCourses && styles.toggleTextActive]}>
              Subscription Plans
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, showCourses && styles.toggleButtonActive]}
            onPress={() => setShowCourses(true)}
          >
            <Text style={[styles.toggleText, showCourses && styles.toggleTextActive]}>
              Individual Courses
            </Text>
          </TouchableOpacity>
        </View>

        {!showCourses ? (
          <>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.planCardSelected,
                  plan.popular && styles.planCardPopular,
                ]}
                onPress={() => handleSelectPlan(plan.id)}
                activeOpacity={0.8}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Star color={Colors.surface} size={12} fill={Colors.surface} />
                    <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}
                {plan.badge && !plan.popular && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <View style={styles.planTitleRow}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {selectedPlan === plan.id && (
                      <View style={styles.checkCircle}>
                        <Check color={Colors.surface} size={16} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.planSubtitle}>{plan.subtitle}</Text>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceAmount}>${plan.price}</Text>
                  <Text style={styles.priceLabel}>{plan.priceLabel}</Text>
                </View>

                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <View style={[
                        styles.featureIcon,
                        !feature.included && styles.featureIconDisabled
                      ]}>
                        <Check
                          color={feature.included ? Colors.success : Colors.textLight}
                          size={14}
                        />
                      </View>
                      <Text style={[
                        styles.featureText,
                        !feature.included && styles.featureTextDisabled
                      ]}>
                        {feature.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.enrollButton, !selectedPlan && styles.enrollButtonDisabled]}
              onPress={handleEnroll}
              disabled={!selectedPlan}
              activeOpacity={0.8}
            >
              <Text style={styles.enrollButtonText}>
                {selectedPlan ? "Continue to Payment" : "Select a Plan"}
              </Text>
              <ChevronRight color={Colors.surface} size={20} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.coursesHeader}>
              <BookOpen color={Colors.primary} size={24} />
              <Text style={styles.coursesTitle}>ACE Course Registration</Text>
            </View>

            <View style={styles.ace1Highlight}>
              <LinearGradient
                colors={[Colors.secondary + "20", Colors.secondary + "05"]}
                style={styles.ace1HighlightGradient}
              >
                <View style={styles.ace1Badge}>
                  <Zap color={Colors.surface} size={14} />
                  <Text style={styles.ace1BadgeText}>SPECIAL OFFER</Text>
                </View>
                <Text style={styles.ace1HighlightTitle}>
                  ACE-1 Free for {ACE1_TRIAL_DAYS} Days!
                </Text>
                <Text style={styles.ace1HighlightText}>
                  Start your credit repair journey with just the{" "}
                  {formatPrice(CERTIFICATE_FEE)} certificate fee. Get full access to
                  all course materials and AI tools, then{" "}
                  {formatPrice(MONTHLY_SUBSCRIPTION)}/month to keep your
                  subscription.
                </Text>
              </LinearGradient>
            </View>

            {courseOptions.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={styles.courseCard}
                onPress={() => handleCourseEnroll(course.id)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: course.image }} style={styles.courseImage} />
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseDescription}>{course.description}</Text>
                  <View style={styles.coursePricing}>
                    {course.freeTrialDays ? (
                      <>
                        <View style={styles.freeTrialBadge}>
                          <Clock color={Colors.success} size={12} />
                          <Text style={styles.freeTrialText}>
                            {course.freeTrialDays} Days Free
                          </Text>
                        </View>
                        <Text style={styles.certFeeText}>
                          {formatPrice(course.certFee ?? CERTIFICATE_FEE)} cert fee to enroll
                        </Text>
                        <View style={styles.renewalInfo}>
                          <Text style={styles.renewalText}>
                            Then {formatPrice(course.monthlyPrice ?? MONTHLY_SUBSCRIPTION)}/mo
                          </Text>
                        </View>
                      </>
                    ) : course.oneTimePrice ? (
                      <View style={styles.monthlyPricingContainer}>
                        <View style={styles.monthlyBadge}>
                          <DollarSign color={Colors.primary} size={12} />
                          <Text style={styles.monthlyBadgeText}>
                            {formatPrice(course.oneTimePrice)} one time
                          </Text>
                        </View>
                        <Text style={styles.certFeeText}>
                          Lifetime access — no subscription
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.monthlyPricingContainer}>
                        <View style={styles.monthlyBadge}>
                          <DollarSign color={Colors.primary} size={12} />
                          <Text style={styles.monthlyBadgeText}>
                            {formatPrice(ACE23_DUE_TODAY)} due today
                          </Text>
                        </View>
                        <Text style={styles.certFeeText}>
                          {formatPrice(course.certFee ?? CERTIFICATE_FEE)} cert +{" "}
                          {formatPrice(course.enrollmentFee ?? ENROLLMENT_FEE)} enrollment
                        </Text>
                        <View style={styles.renewalInfo}>
                          <Text style={styles.renewalText}>
                            Then {formatPrice(course.monthlyPrice ?? MONTHLY_SUBSCRIPTION)}/mo
                          </Text>
                        </View>
                        {course.autoDebitOnly && (
                          <View style={styles.autoDebitBadge}>
                            <Text style={styles.autoDebitText}>Auto-debit only</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
                <ChevronRight color={Colors.primary} size={24} />
              </TouchableOpacity>
            ))}

            <View style={styles.infoBox}>
              <Award color={Colors.info} size={20} />
              <Text style={styles.infoText}>
                Complete ACE-1, ACE-2, and ACE-3 to qualify for CSO Certification 
                and join our professional network.
              </Text>
            </View>
          </>
        )}

        <View style={styles.guaranteeSection}>
          <DollarSign color={Colors.secondary} size={24} />
          <Text style={styles.guaranteeTitle}>Earn While You Learn</Text>
          <Text style={styles.guaranteeText}>
            Start earning referral bonuses immediately — even on the free plan.
            Enrolled students earn {formatPrice(REFERRAL_ACE1_ENROLLED)} per ACE-1
            referral and {formatPrice(REFERRAL_ACE23_BOUNTY)} per ACE-2/ACE-3
            registration, and CSO Affiliates keep{" "}
            {formatPrice(BUNDLE_PAYOUT_CSO)} on every bundle sale — a realistic
            path past $10,000 per month.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  toggleContainer: {
    flexDirection: "row" as const,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center" as const,
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.surface,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  planCardSelected: {
    borderColor: Colors.primary,
  },
  planCardPopular: {
    borderColor: Colors.secondary,
  },
  popularBadge: {
    position: "absolute" as const,
    top: -12,
    right: 20,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.surface,
  },
  badgeContainer: {
    position: "absolute" as const,
    top: -12,
    right: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.surface,
  },
  planHeader: {
    marginBottom: 16,
  },
  planTitleRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  planName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  planSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    marginBottom: 20,
    gap: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: "800" as const,
    color: Colors.primary,
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  featuresContainer: {
    gap: 10,
  },
  featureRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.success + "20",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  featureIconDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
  featureText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  featureTextDisabled: {
    color: Colors.textLight,
  },
  enrollButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
  },
  enrollButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  enrollButtonText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.surface,
  },
  coursesHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 16,
  },
  coursesTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  ace1Highlight: {
    borderRadius: 16,
    overflow: "hidden" as const,
    marginBottom: 20,
  },
  ace1HighlightGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.secondary + "30",
    borderRadius: 16,
  },
  ace1Badge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.secondary,
    alignSelf: "flex-start" as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  ace1BadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.surface,
  },
  ace1HighlightTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  ace1HighlightText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  courseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden" as const,
  },
  courseImage: {
    width: "100%" as const,
    height: 140,
  },
  courseInfo: {
    flex: 1,
    padding: 16,
  },
  courseName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  courseDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  coursePricing: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  freeTrialBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.success + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  freeTrialText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.success,
  },
  certFeeText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  coursePrice: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  certFeeSmall: {
    fontSize: 12,
    color: Colors.textLight,
  },
  monthlyPricingContainer: {
    gap: 6,
  },
  monthlyBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    alignSelf: "flex-start" as const,
  },
  monthlyBadgeText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  renewalInfo: {
    marginTop: 2,
  },
  renewalText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic" as const,
  },
  autoDebitBadge: {
    backgroundColor: Colors.warning + "15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start" as const,
    marginTop: 2,
  },
  autoDebitText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.warning,
  },
  infoBox: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    backgroundColor: Colors.info + "15",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  guaranteeSection: {
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.secondary + "30",
  },
  guaranteeTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  guaranteeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
  },
});
