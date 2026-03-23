import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Animated,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  User,
  Users,
  BookOpen,
  Award,
  CreditCard,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  Phone,
  Mail,
  ExternalLink,
  LogOut,
  Settings,
  Sun,
  Moon,
  Smartphone,
  Check,
  Crown,
  RefreshCw,
  Calendar,
  AlertCircle,
  Star,
  Lock,
  TrendingUp,
} from "lucide-react-native";

import { useTheme, ThemeMode } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";

import { trpc } from "@/lib/trpc";

import { Card, Avatar, Badge } from "@/components/ui";
import { courses as mockCourses } from "@/mocks/data";
import { Course } from "@/types";

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showBadge?: boolean;
  badgeText?: string;
  isDestructive?: boolean;
  rightElement?: React.ReactNode;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, themeMode, setTheme, isDark } = useTheme();
  const { user } = useUser();
  const { logout } = useAuth();
  const { 
    tier, 
    isPremium, 
    isExpired, 
    expiryDate, 
    daysUntilExpiry,
    renewSubscription,
    upgradeToCSOAffiliate,
    hasCompletedAllCourses,
    isCSOCertified,
    canAccessCSOAffiliate,
    currentPlan,
    enrolledCourses,
    isEnrolled,
    syncInitialEnrollments,
  } = useSubscription();



  const certificateCount = React.useMemo(() => {
    const allEnrolled = new Set(enrolledCourses);
    mockCourses.forEach(course => {
      if (course.enrolled || isEnrolled(course.id)) {
        allEnrolled.add(course.id);
      }
    });
    const certificateCourseIds = ['3', '4', '5', '1'];
    return certificateCourseIds.filter(id => allEnrolled.has(id)).length;
  }, [enrolledCourses, isEnrolled]);

  const enrolledCoursesList = React.useMemo((): Course[] => {
    const allEnrolledIds = new Set(enrolledCourses);
    mockCourses.forEach(course => {
      if (course.enrolled || isEnrolled(course.id)) {
        allEnrolledIds.add(course.id);
      }
    });
    return mockCourses.filter(course => allEnrolledIds.has(course.id));
  }, [enrolledCourses, isEnrolled]);

  // Sync mock enrolled courses on mount
  useEffect(() => {
    const mockEnrolledIds = mockCourses.filter(c => c.enrolled).map(c => c.id);
    if (mockEnrolledIds.length > 0) {
      syncInitialEnrollments(mockEnrolledIds);
    }
  }, [syncInitialEnrollments]);

  // Calculate total enrolled courses (combining mock and context)
  const totalEnrolledCourses = React.useMemo(() => {
    const enrolledSet = new Set(enrolledCourses);
    mockCourses.forEach(course => {
      if (course.enrolled || isEnrolled(course.id)) {
        enrolledSet.add(course.id);
      }
    });
    return enrolledSet.size;
  }, [enrolledCourses, isEnrolled]);

  const providerQuery = trpc.providers.getByUserId.useQuery(
    { userId: user?.id || '' },
    { enabled: isCSOCertified && !!user?.id }
  );

  const csoProvider = providerQuery.data;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleContact = (type: "phone" | "email" | "website") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (type) {
      case "phone":
        Linking.openURL("tel:+18004378557");
        break;
      case "email":
        Linking.openURL("mailto:support@westerncreditinstitute.com");
        break;
      case "website":
        Linking.openURL("https://www.westerncreditinstitute.com");
        break;
    }
  };

  const handleLegalLink = (type: "terms" | "privacy") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (type === "terms") {
      router.push("/terms-conditions" as any);
    } else {
      router.push("/privacy-policy" as any);
    }
  };

  const handleRenewSubscription = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Renew ACE-1 Subscription",
      "Renew your ACE-1 subscription for $25/month to continue accessing all features.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Renew - $25/mo",
          onPress: async () => {
            const success = await renewSubscription();
            if (success) {
              Alert.alert("Success", "Your subscription has been renewed for 30 days!");
            } else {
              Alert.alert("Error", "Failed to renew subscription. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleUpgradeToCSOAffiliate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!canAccessCSOAffiliate) {
      Alert.alert(
        "CSO Affiliate Requirements",
        "To become a CSO Affiliate, you must:\n\n• Complete all 4 ACE courses (ACE-1 through ACE-4)\n• Receive your CSO Certification badge\n\nKeep learning to unlock this exclusive opportunity!",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Upgrade to CSO Affiliate",
      "Become a CSO Affiliate for $49.99/month and unlock:\n\n• All ACE courses included\n• 50-75% residual income\n• 20% sales commission\n• Listed in Hire A Pro\n• Priority support",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Upgrade - $49.99/mo",
          onPress: async () => {
            const success = await upgradeToCSOAffiliate();
            if (success) {
              Alert.alert("Welcome CSO Affiliate!", "You now have access to all premium features and earning opportunities!");
            } else {
              Alert.alert("Error", "Failed to upgrade. Please try again.");
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showBadge,
    badgeText,
    isDestructive,
    rightElement,
  }: MenuItemProps) => (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View
          style={[
            styles.menuIcon,
            { backgroundColor: colors.surfaceAlt },
            isDestructive && { backgroundColor: colors.error + "15" },
          ]}
        >
          {icon}
        </View>
        <View>
          <Text
            style={[styles.menuTitle, { color: colors.text }, isDestructive && { color: colors.error }]}
          >
            {title}
          </Text>
          {subtitle && <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.menuItemRight}>
        {showBadge && (
          <Badge text={badgeText || ""} variant="success" size="sm" />
        )}
        {rightElement}
        {!rightElement && (
          <ChevronRight
            color={isDestructive ? colors.error : colors.textLight}
            size={20}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const ThemeOption = ({ mode, icon, label }: { mode: ThemeMode; icon: React.ReactNode; label: string }) => (
    <TouchableOpacity
      style={[
        styles.themeOption,
        { 
          backgroundColor: colors.surfaceAlt, 
          borderColor: themeMode === mode ? colors.primary : colors.border,
          borderWidth: themeMode === mode ? 2 : 1,
        },
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        setTheme(mode);
      }}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[styles.themeOptionLabel, { color: colors.text }]}>{label}</Text>
      {themeMode === mode && (
        <View style={[styles.themeCheck, { backgroundColor: colors.primary }]}>
          <Check color={colors.white} size={12} />
        </View>
      )}
    </TouchableOpacity>
  );

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Settings color={colors.text} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Card variant="elevated" padding="lg" style={styles.profileCard}>
            <View style={styles.profileRow}>
              <Avatar source={user.avatar} size="lg" />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.name}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                <View style={styles.roleRow}>
                  <Badge 
                    text={user.role} 
                    variant="secondary" 
                    size="sm"
                    icon={<Award color={colors.secondary} size={12} />}
                  />
                  {isPremium && (
                    <Badge 
                      text={tier === "cso_affiliate" ? "CSO" : "ACE-1"} 
                      variant="primary" 
                      size="sm"
                    />
                  )}
                </View>
              </View>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/personal-info" as any);
                }}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </Animated.View>

        {isCSOCertified && (
          <Card variant="default" padding="lg" style={styles.csoRatingCard}>
            <View style={styles.csoRatingHeader}>
              <View style={[styles.csoBadgeIcon, { backgroundColor: colors.secondary + '15' }]}>
                <Shield color={colors.secondary} size={24} />
              </View>
              <View style={styles.csoRatingInfo}>
                <Text style={styles.csoRatingTitle}>CSO Certified Professional</Text>
                <Text style={styles.csoRatingSubtitle}>Your service rating from clients</Text>
              </View>
            </View>
            
            <View style={[styles.csoRatingContent, { borderTopColor: colors.border }]}>
              <View style={styles.ratingDisplay}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={24}
                      color={star <= Math.round(csoProvider?.rating || 0) ? '#FFD700' : colors.border}
                      fill={star <= Math.round(csoProvider?.rating || 0) ? '#FFD700' : 'transparent'}
                    />
                  ))}
                </View>
                <Text style={styles.ratingValue}>
                  {csoProvider?.rating?.toFixed(1) || '0.0'}
                </Text>
              </View>
              
              <View style={styles.ratingStats}>
                <View style={styles.ratingStat}>
                  <Users color={colors.primary} size={18} />
                  <Text style={styles.ratingStatValue}>{csoProvider?.reviewCount || 0}</Text>
                  <Text style={styles.ratingStatLabel}>Reviews</Text>
                </View>
                <View style={[styles.ratingStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.ratingStat}>
                  <TrendingUp color={colors.success} size={18} />
                  <Text style={styles.ratingStatValue}>
                    {csoProvider?.rating && csoProvider.rating >= 4.5 ? 'Top Rated' : 
                     csoProvider?.rating && csoProvider.rating >= 4.0 ? 'Excellent' :
                     csoProvider?.rating && csoProvider.rating >= 3.0 ? 'Good' : 'New'}
                  </Text>
                  <Text style={styles.ratingStatLabel}>Status</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.viewReviewsButton, { backgroundColor: colors.secondary + '15' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/hire-pro" as any);
                }}
              >
                <Text style={[styles.viewReviewsText, { color: colors.secondary }]}>View All Reviews</Text>
                <ChevronRight color={colors.secondary} size={18} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        <Card variant="default" padding="lg" style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalEnrolledCourses}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${user.totalEarnings.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.referrals}</Text>
            <Text style={styles.statLabel}>Referrals</Text>
          </View>
        </Card>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Subscription</Text>
          <Card variant="default" padding="lg" style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <View style={styles.subscriptionTitleRow}>
                <View style={[styles.subscriptionIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Crown color={colors.primary} size={20} />
                </View>
                <View style={styles.subscriptionInfo}>
                  <Text style={styles.subscriptionPlan}>{currentPlan.name}</Text>
                  <Text style={styles.subscriptionPrice}>
                    {tier === 'free' ? 'Free Plan' : `${currentPlan.price}/month`}
                  </Text>
                </View>
              </View>
              {tier !== 'free' && (
                <Badge 
                  text={isExpired ? "EXPIRED" : "ACTIVE"} 
                  variant={isExpired ? "error" : "success"} 
                  size="sm" 
                />
              )}
            </View>

            {tier !== 'free' && expiryDate && (
              <View style={[styles.expiryRow, { borderTopColor: colors.border }]}>
                <View style={styles.expiryInfo}>
                  <Calendar color={colors.textSecondary} size={16} />
                  <Text style={styles.expiryLabel}>
                    {isExpired ? "Expired on" : "Expires on"}
                  </Text>
                  <Text style={styles.expiryDate}>{formatDate(expiryDate)}</Text>
                </View>
                {!isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
                  <View style={styles.expiryWarning}>
                    <AlertCircle color={colors.warning} size={14} />
                    <Text style={[styles.expiryWarningText, { color: colors.warning }]}>
                      {daysUntilExpiry} days left
                    </Text>
                  </View>
                )}
              </View>
            )}

            {tier === 'free' && (
              <TouchableOpacity
                style={[styles.subscriptionButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/subscription-plans" as any)}
                activeOpacity={0.8}
              >
                <Crown color={colors.white} size={18} />
                <Text style={styles.subscriptionButtonText}>Get Started with ACE-1</Text>
              </TouchableOpacity>
            )}

            {(tier === 'ace1_student' && isExpired) && (
              <TouchableOpacity
                style={[styles.subscriptionButton, { backgroundColor: colors.success }]}
                onPress={handleRenewSubscription}
                activeOpacity={0.8}
              >
                <RefreshCw color={colors.white} size={18} />
                <Text style={styles.subscriptionButtonText}>Renew Subscription - $25/mo</Text>
              </TouchableOpacity>
            )}

            {tier === 'ace1_student' && !isExpired && (
              <View style={styles.renewalNote}>
                <Text style={[styles.renewalNoteText, { color: colors.textSecondary }]}>
                  Your subscription will auto-renew. Cancel anytime.
                </Text>
              </View>
            )}
          </Card>

          {enrolledCoursesList.length > 0 && (
            <Card variant="outlined" padding="md" style={styles.enrolledCoursesCard}>
              <View style={styles.enrolledCoursesHeader}>
                <BookOpen color={colors.primary} size={18} />
                <Text style={styles.enrolledCoursesTitle}>Enrolled Courses ({enrolledCoursesList.length})</Text>
              </View>
              <View style={styles.enrolledCoursesList}>
                {enrolledCoursesList.map((course, index) => (
                  <TouchableOpacity
                    key={course.id}
                    style={[
                      styles.enrolledCourseItem,
                      index < enrolledCoursesList.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({ pathname: "/course-detail" as any, params: { id: course.id } });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.enrolledCourseInfo}>
                      <Text style={styles.enrolledCourseTitle} numberOfLines={1}>{course.title}</Text>
                      <Text style={styles.enrolledCourseCategory}>{course.category} • {course.level}</Text>
                    </View>
                    <View style={styles.enrolledCourseRight}>
                      <Badge 
                        text={course.isFree ? "FREE" : course.isBundle ? "BUNDLE" : "ACTIVE"}
                        variant={course.isFree ? "secondary" : course.isBundle ? "primary" : "success"}
                        size="sm"
                      />
                      <ChevronRight color={colors.textLight} size={18} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          {tier !== 'cso_affiliate' && (
            <Card 
              variant="outlined" 
              padding="lg" 
              style={[
                styles.csoUpgradeCard, 
                { borderColor: canAccessCSOAffiliate ? colors.secondary : colors.border }
              ]}
            >
              <View style={styles.csoHeader}>
                <View style={styles.csoTitleRow}>
                  <View style={[
                    styles.csoIcon, 
                    { backgroundColor: canAccessCSOAffiliate ? colors.secondary + '15' : colors.surfaceAlt }
                  ]}>
                    {canAccessCSOAffiliate ? (
                      <Star color={colors.secondary} size={20} />
                    ) : (
                      <Lock color={colors.textLight} size={20} />
                    )}
                  </View>
                  <View>
                    <Text style={styles.csoTitle}>CSO Affiliate</Text>
                    <Text style={[
                      styles.csoSubtitle, 
                      { color: canAccessCSOAffiliate ? colors.secondary : colors.textLight }
                    ]}>
                      {canAccessCSOAffiliate ? "You're eligible!" : "Complete all courses to unlock"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.csoPrice}>$49.99/mo</Text>
              </View>

              {!canAccessCSOAffiliate && (
                <View style={styles.csoRequirements}>
                  <View style={styles.csoRequirementRow}>
                    <View style={[
                      styles.csoCheckbox,
                      hasCompletedAllCourses && { backgroundColor: colors.success }
                    ]}>
                      {hasCompletedAllCourses && <Check color={colors.white} size={12} />}
                    </View>
                    <Text style={[
                      styles.csoRequirementText,
                      { color: hasCompletedAllCourses ? colors.text : colors.textLight }
                    ]}>
                      Complete all 4 ACE courses
                    </Text>
                  </View>
                  <View style={styles.csoRequirementRow}>
                    <View style={[
                      styles.csoCheckbox,
                      isCSOCertified && { backgroundColor: colors.success }
                    ]}>
                      {isCSOCertified && <Check color={colors.white} size={12} />}
                    </View>
                    <Text style={[
                      styles.csoRequirementText,
                      { color: isCSOCertified ? colors.text : colors.textLight }
                    ]}>
                      Receive CSO Certification badge
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.csoButton,
                  { 
                    backgroundColor: canAccessCSOAffiliate ? colors.secondary : colors.surfaceAlt,
                    opacity: canAccessCSOAffiliate ? 1 : 0.7,
                  }
                ]}
                onPress={handleUpgradeToCSOAffiliate}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.csoButtonText,
                  { color: canAccessCSOAffiliate ? colors.white : colors.textLight }
                ]}>
                  {canAccessCSOAffiliate ? "Upgrade to CSO Affiliate" : "Requirements Not Met"}
                </Text>
              </TouchableOpacity>
            </Card>
          )}
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Appearance</Text>
          <Card variant="default" padding="md">
            <Text style={styles.themeLabel}>Theme</Text>
            <View style={styles.themeOptions}>
              <ThemeOption
                mode="light"
                icon={<Sun color={themeMode === "light" ? colors.primary : colors.textSecondary} size={20} />}
                label="Light"
              />
              <ThemeOption
                mode="dark"
                icon={<Moon color={themeMode === "dark" ? colors.primary : colors.textSecondary} size={20} />}
                label="Dark"
              />
              <ThemeOption
                mode="system"
                icon={<Smartphone color={themeMode === "system" ? colors.primary : colors.textSecondary} size={20} />}
                label="System"
              />
            </View>
          </Card>
        </View>



        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Account</Text>
          <Card variant="default" padding="none">
            <MenuItem
              icon={<User color={colors.primary} size={20} />}
              title="Personal Information"
              subtitle="Name, email, phone"
              onPress={() => router.push("/personal-info" as any)}
            />
            <MenuItem
              icon={<BookOpen color={colors.primary} size={20} />}
              title="My Certificates"
              subtitle="View earned certificates"
              showBadge={certificateCount > 0}
              badgeText={String(certificateCount)}
              onPress={() => router.push("/certificates" as any)}
            />
            <MenuItem
              icon={<CreditCard color={colors.primary} size={20} />}
              title="Payment Methods"
              subtitle="Manage payment options"
              onPress={() => router.push("/payment-methods" as any)}
            />
            <MenuItem
              icon={<Bell color={colors.primary} size={20} />}
              title="Notifications"
              subtitle="Push, email preferences"
              onPress={() => router.push("/notifications" as any)}
            />
          </Card>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Support</Text>
          <Card variant="default" padding="none">
            <MenuItem
              icon={<HelpCircle color={colors.secondary} size={20} />}
              title="Help Center"
              subtitle="FAQs and guides"
              onPress={() => router.push("/help-center" as any)}
            />
            <MenuItem
              icon={<Phone color={colors.secondary} size={20} />}
              title="Contact Support"
              subtitle="1-800-437-8557"
              onPress={() => handleContact("phone")}
            />
            <MenuItem
              icon={<Mail color={colors.secondary} size={20} />}
              title="Email Us"
              subtitle="support@westerncreditinstitute.com"
              onPress={() => handleContact("email")}
            />
          </Card>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Legal</Text>
          <Card variant="default" padding="none">
            <MenuItem
              icon={<FileText color={colors.textSecondary} size={20} />}
              title="Terms & Conditions"
              subtitle="Course agreement and terms"
              onPress={() => handleLegalLink("terms")}
            />
            <MenuItem
              icon={<Shield color={colors.textSecondary} size={20} />}
              title="Privacy Policy"
              subtitle="How we protect your data"
              onPress={() => handleLegalLink("privacy")}
            />
            <MenuItem
              icon={<ExternalLink color={colors.textSecondary} size={20} />}
              title="Visit Website"
              subtitle="www.westerncreditinstitute.com"
              onPress={() => handleContact("website")}
            />
          </Card>
        </View>

        <View style={styles.menuSection}>
          <Card variant="default" padding="none">
            <MenuItem
              icon={<LogOut color={colors.error} size={20} />}
              title="Sign Out"
              isDestructive
              onPress={() => {
                Alert.alert(
                  "Sign Out",
                  "Are you sure you want to sign out?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Sign Out",
                      style: "destructive",
                      onPress: async () => {
                        await logout();
                        router.replace("/register" as any);
                      },
                    },
                  ]
                );
              }}
            />
          </Card>
        </View>

        <Text style={styles.versionText}>
          Member since {user.memberSince} • Version 1.0.0
        </Text>

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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  statsCard: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  csoRatingCard: {
    marginBottom: 16,
  },
  csoRatingHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 16,
  },
  csoBadgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: 14,
  },
  csoRatingInfo: {
    flex: 1,
  },
  csoRatingTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 2,
  },
  csoRatingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  csoRatingContent: {
    paddingTop: 16,
    borderTopWidth: 1,
  },
  ratingDisplay: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 20,
    gap: 12,
  },
  starsRow: {
    flexDirection: "row" as const,
    gap: 4,
  },
  ratingValue: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: colors.text,
  },
  ratingStats: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: 16,
  },
  ratingStat: {
    alignItems: "center" as const,
    paddingHorizontal: 24,
  },
  ratingStatValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text,
    marginTop: 6,
  },
  ratingStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ratingStatDivider: {
    width: 1,
    height: 40,
  },
  viewReviewsButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  viewReviewsText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  menuSection: {
    marginBottom: 24,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  subscriptionCard: {
    marginBottom: 12,
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subscriptionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  subscriptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  subscriptionInfo: {},
  subscriptionPlan: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.text,
  },
  subscriptionPrice: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  expiryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  expiryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expiryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  expiryDate: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.text,
  },
  expiryWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expiryWarningText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  subscriptionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  subscriptionButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
  renewalNote: {
    marginTop: 12,
    alignItems: "center",
  },
  renewalNoteText: {
    fontSize: 12,
  },
  enrolledCoursesCard: {
    marginTop: 12,
  },
  enrolledCoursesHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },
  enrolledCoursesTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.text,
  },
  enrolledCoursesList: {
    gap: 0,
  },
  enrolledCourseItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 12,
  },
  enrolledCourseInfo: {
    flex: 1,
    marginRight: 12,
  },
  enrolledCourseTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 2,
  },
  enrolledCourseCategory: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  enrolledCourseRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  csoUpgradeCard: {
    marginTop: 0,
  },
  csoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  csoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  csoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  csoTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.text,
  },
  csoSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  csoPrice: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.text,
  },
  csoRequirements: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  csoRequirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  csoCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  csoRequirementText: {
    fontSize: 14,
  },
  csoButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  csoButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  menuSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  versionText: {
    fontSize: 12,
    textAlign: "center" as const,
    color: colors.textLight,
    marginTop: 8,
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 12,
  },
  themeOptions: {
    flexDirection: "row",
    gap: 12,
  },
  themeOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 8,
    position: "relative" as const,
  },
  themeOptionLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  themeCheck: {
    position: "absolute" as const,
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
