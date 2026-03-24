import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import CertificationEligibility from "@/components/CertificationEligibility";

import {
  Clock,
  BookOpen,
  Play,
  CheckCircle,
  FileText,
  Cloud,
  Zap,
  AlertTriangle,
  Scale,
  Shield,
  Search,
  Download,
  Users,
  TrendingUp,
  BarChart3,
  Settings,
  FolderPlus,
  Briefcase,
  Building,
  CreditCard,
  Wallet,
  DollarSign,
  UserPlus,
  Rocket,
  Gavel,
  FileCheck,
  Handshake,
  Package,
  Award,
  Star,
  Lock,
  Gift,
  XCircle,
  GraduationCap,
  ClipboardCheck,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { courses } from "@/mocks/data";
import { useSubscription } from "@/contexts/SubscriptionContext";

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { enrollInCourse, isEnrolled, getCourseProgress } = useSubscription();

  const course = courses.find((c) => c.id === id);
  const courseEnrolled = course ? isEnrolled(course.id) : false;
  const currentProgress = course ? getCourseProgress(course.id) : 0;

  if (!course) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Course not found</Text>
      </View>
    );
  }

  const isACE1Course = course.id === "3";
  const isACECourse = ["3", "4", "5", "9"].includes(course.id);
  const hasFreeTrialDays = course.freeTrialDays && course.freeTrialDays > 0;
  const hasInstallmentPlan = course.monthlyInstallment && course.installmentMonths && !course.noPaymentPlan;
  const isBundle = course.isBundle === true;
  const isFreeWithRequirements = course.isFree && course.requiresCompletedCourses;
  const MOCK_USER_ID = "user_demo_123";

  const checkCourseCompletion = (courseId: string): boolean => {
    const targetCourse = courses.find(c => c.id === courseId);
    return targetCourse?.enrolled === true && (targetCourse?.progress === 100 || false);
  };

  const getCompletedRequiredCourses = (): string[] => {
    if (!course.requiresCompletedCourses) return [];
    return course.requiresCompletedCourses.filter(courseId => checkCourseCompletion(courseId));
  };

  const getMissingRequiredCourses = (): { id: string; name: string }[] => {
    if (!course.requiresCompletedCourses || !course.requiresCompletedCoursesNames) return [];
    const missing: { id: string; name: string }[] = [];
    course.requiresCompletedCourses.forEach((courseId, index) => {
      if (!checkCourseCompletion(courseId)) {
        missing.push({
          id: courseId,
          name: course.requiresCompletedCoursesNames?.[index] || `Course ${courseId}`
        });
      }
    });
    return missing;
  };

  const isEligibleForFreeCourse = (): boolean => {
    if (!isFreeWithRequirements) return true;
    const missing = getMissingRequiredCourses();
    return missing.length === 0;
  };

  const completedRequiredCount = getCompletedRequiredCourses().length;
  const totalRequiredCount = course.requiresCompletedCourses?.length || 0;
  const missingCourses = getMissingRequiredCourses();
  const isEligible = isEligibleForFreeCourse();

  const getSectionIcon = (iconName?: string) => {
    const iconSize = 20;
    const iconColor = Colors.primary;
    switch (iconName) {
      case "BookOpen": return <BookOpen size={iconSize} color={iconColor} />;
      case "FileText": return <FileText size={iconSize} color={iconColor} />;
      case "Download": return <Download size={iconSize} color={iconColor} />;
      case "Search": return <Search size={iconSize} color={iconColor} />;
      case "AlertTriangle": return <AlertTriangle size={iconSize} color={iconColor} />;
      case "Scale": return <Scale size={iconSize} color={iconColor} />;
      case "Shield": return <Shield size={iconSize} color={iconColor} />;
      case "Handshake": return <Handshake size={iconSize} color={iconColor} />;
      case "Gavel": return <Gavel size={iconSize} color={iconColor} />;
      case "FileCheck": return <FileCheck size={iconSize} color={iconColor} />;
      case "Users": return <Users size={iconSize} color={iconColor} />;
      case "TrendingUp": return <TrendingUp size={iconSize} color={iconColor} />;
      case "BarChart3": return <BarChart3 size={iconSize} color={iconColor} />;
      case "Settings": return <Settings size={iconSize} color={iconColor} />;
      case "FolderPlus": return <FolderPlus size={iconSize} color={iconColor} />;
      case "Briefcase": return <Briefcase size={iconSize} color={iconColor} />;
      case "Building": return <Building size={iconSize} color={iconColor} />;
      case "CreditCard": return <CreditCard size={iconSize} color={iconColor} />;
      case "Wallet": return <Wallet size={iconSize} color={iconColor} />;
      case "DollarSign": return <DollarSign size={iconSize} color={iconColor} />;
      case "UserPlus": return <UserPlus size={iconSize} color={iconColor} />;
      case "Rocket": return <Rocket size={iconSize} color={iconColor} />;
      case "GraduationCap": return <GraduationCap size={iconSize} color={iconColor} />;
      case "ClipboardCheck": return <ClipboardCheck size={iconSize} color={iconColor} />;
      default: return <BookOpen size={iconSize} color={iconColor} />;
    }
  };

  const handleEnrollment = async () => {
    if (isFreeWithRequirements) {
      if (!isEligible) {
        Alert.alert(
          "Not Eligible Yet",
          `You must complete the following courses before registering for ${course.title}:\n\n${missingCourses.map(c => `• ${c.name}`).join('\n')}`,
          [
            { text: "OK", style: "default" },
            {
              text: "View Courses",
              onPress: () => router.push("/courses" as any),
            },
          ]
        );
        return;
      }
      Alert.alert(
        "Free Enrollment",
        `Congratulations! You've completed all required courses and are eligible for FREE enrollment in ${course.title}.\n\nThis certification program will qualify you as a CSO professional.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Enroll Now - FREE",
            onPress: async () => {
              const success = await enrollInCourse(course.id, false);
              if (success) {
                Alert.alert(
                  "Welcome! 🎉",
                  `You are now enrolled in ${course.title}!\n\nComplete the lecture and pass the exam to receive your CSO Certification.`
                );
              } else {
                Alert.alert("Error", "Failed to enroll. Please try again.");
              }
            },
          },
        ]
      );
      return;
    }
    if (hasFreeTrialDays) {
      Alert.alert(
        "ACE-1 Free Trial",
        `Start your credit repair journey FREE for ${course.freeTrialDays} days!\n\nYou only pay the ${course.certificationFee} certificate fee to enroll. After ${course.freeTrialDays} days, continue access for $25/month.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: `Pay ${course.certificationFee} Certificate Fee`,
            onPress: async () => {
              const success = await enrollInCourse(course.id, isACE1Course);
              if (success) {
                Alert.alert(
                  "Success!",
                  `You are now enrolled in ${course.title}! Your ${course.freeTrialDays}-day free trial has started.`
                );
              } else {
                Alert.alert("Error", "Failed to enroll. Please try again.");
              }
            },
          },
        ]
      );
    } else if (hasInstallmentPlan) {
      const lockoutWarning = course.autoDebitOnly 
        ? "\n\n⚠️ IMPORTANT: If auto-debit payment fails, you will be immediately locked out of the course until payment is received."
        : "";
      
      Alert.alert(
        "Enrollment - Auto-Debit Payment Plan",
        `${course.title}\n\n✅ Enrollment Fee: ${course.certificationFee} (due today)\n\n💳 Course Fee: ${(course.monthlyInstallment || 0) * (course.installmentMonths || 3)}\nBroken into ${course.installmentMonths} monthly payments of ${course.monthlyInstallment?.toFixed(2)}/mo\n\n⚡ AUTO-DEBIT ONLY - No other payment options${lockoutWarning}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: `Pay ${course.certificationFee} Now`,
            onPress: async () => {
              const success = await enrollInCourse(course.id, false);
              if (success) {
                Alert.alert(
                  "Enrollment Confirmed! 🎉",
                  `Welcome to ${course.title}!\n\nYour enrollment fee of ${course.certificationFee} has been processed.\n\nYour first installment of ${course.monthlyInstallment?.toFixed(2)} will be charged in 30 days via auto-debit.\n\n⚠️ Remember: If any auto-debit payment fails, your course access will be locked until payment is received.`
                );
              } else {
                Alert.alert("Error", "Failed to enroll. Please try again.");
              }
            },
          },
        ]
      );
    } else if (isBundle) {
      Alert.alert(
        "Complete ACE Bundle",
        `${course.title}\n\n🎁 BEST VALUE PACKAGE\n\nIncludes:\n• ACE-1: Advanced Credit Repair\n• ACE-2: Advanced Credit Building\n• ACE-3: Advanced Business Credit\n\n✅ 3 Course Certificates Included\n✅ CSO Certification Eligibility\n\nOne-Time Payment: ${course.price.toLocaleString()}\n\n⚠️ No payment plan available for this bundle`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: `Pay ${course.price.toLocaleString()}`,
            onPress: async () => {
              await enrollInCourse(course.id, false);
              await enrollInCourse("3", true);
              await enrollInCourse("4", false);
              await enrollInCourse("5", false);
              Alert.alert(
                "Enrollment Confirmed! 🎉",
                `Welcome to the Complete ACE Bundle!\n\nYou now have access to:\n• ACE-1: Advanced Credit Repair\n• ACE-2: Advanced Credit Building\n• ACE-3: Advanced Business Credit\n\nUpon completion, you will receive certificates for all three courses and be eligible for CSO Certification.`
              );
            },
          },
        ]
      );
    } else {
      const total = course.certificationFee
        ? course.price + course.certificationFee
        : course.price;

      Alert.alert(
        "Course Registration",
        `${course.title}\n\nCourse Fee: ${course.price}${course.certificationFee ? `\nCertificate Fee: ${course.certificationFee}\n\nTotal: ${total}` : ""}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: `Pay ${total}`,
            onPress: async () => {
              const success = await enrollInCourse(course.id, false);
              if (success) {
                Alert.alert("Success!", `You are now enrolled in ${course.title}!`);
              } else {
                Alert.alert("Error", "Failed to enroll. Please try again.");
              }
            },
          },
        ]
      );
    }
  };

  const lessons = [
    { id: 1, title: "Understanding Credit Reports", duration: "15 min", completed: true },
    { id: 2, title: "FCRA Rights & Protections", duration: "20 min", completed: true },
    { id: 3, title: "Advanced Dispute Strategies", duration: "25 min", completed: false },
    { id: 4, title: "Bureau Response Analysis", duration: "18 min", completed: false },
    { id: 5, title: "Creditor Negotiations", duration: "22 min", completed: false },
  ];

  const totalSteps = course.sections?.reduce((sum, section) => sum + section.steps, 0) || 0;
  const completedSteps = course.sections?.reduce((sum, section) => sum + (section.completed || 0), 0) || 0;

  const renderDisputeTrackerSection = () => {
    if (!isACE1Course) return null;

    return (
      <TouchableOpacity
        style={styles.disputeTrackerSection}
        activeOpacity={0.9}
        onPress={() => router.push("/dispute-tracker" as any)}
      >
        <View style={styles.disputeTrackerHeader}>
          <View style={styles.disputeTrackerIconContainer}>
            <Cloud color={Colors.surface} size={24} />
          </View>
          <View style={styles.disputeTrackerHeaderText}>
            <View style={styles.disputeTrackerTitleRow}>
              <Text style={styles.disputeTrackerTitle}>Cloud Dispute Tracker</Text>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>Step 4</Text>
              </View>
            </View>
            <Text style={styles.disputeTrackerSubtitle}>
              Track and manage all your credit disputes in one place
            </Text>
          </View>
        </View>

        <View style={styles.disputeTrackerFeatures}>
          <View style={styles.disputeFeatureItem}>
            <FileText color={Colors.primary} size={18} />
            <Text style={styles.disputeFeatureText}>Track Disputes</Text>
          </View>
          <View style={styles.disputeFeatureItem}>
            <CheckCircle color={Colors.secondary} size={18} />
            <Text style={styles.disputeFeatureText}>Monitor Status</Text>
          </View>
          <View style={styles.disputeFeatureItem}>
            <Clock color={Colors.primary} size={18} />
            <Text style={styles.disputeFeatureText}>Response Timeline</Text>
          </View>
        </View>

        <View style={styles.disputeTrackerAction}>
          <Text style={styles.disputeTrackerActionText}>Open Dispute Tracker</Text>
          <Play color={Colors.surface} size={16} fill={Colors.surface} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <View style={styles.container}>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Image source={{ uri: course.image }} style={styles.courseImage} />

          <View style={styles.courseInfo}>
            <View style={styles.courseBadges}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{course.level}</Text>
              </View>
              {isBundle && (
                <View style={styles.bundleBadge}>
                  <Package size={12} color={Colors.surface} />
                  <Text style={styles.bundleBadgeText}>BUNDLE</Text>
                </View>
              )}
              {course.csoEligible && (
                <View style={styles.csoBadge}>
                  <Award size={12} color={Colors.surface} />
                  <Text style={styles.csoBadgeText}>CSO ELIGIBLE</Text>
                </View>
              )}
              {(course.enrolled || courseEnrolled) && (
                <View style={styles.enrolledBadge}>
                  <Text style={styles.enrolledText}>Enrolled</Text>
                </View>
              )}
            </View>

            <Text style={styles.courseTitle}>{course.title}</Text>
            <Text style={styles.courseDescription}>
              {course.fullDescription || course.description}
            </Text>

            <View style={styles.courseMeta}>
              <View style={styles.metaItem}>
                <Clock color={Colors.textLight} size={18} />
                <Text style={styles.metaText}>{course.duration}</Text>
              </View>
              <View style={styles.metaItem}>
                <BookOpen color={Colors.textLight} size={18} />
                <Text style={styles.metaText}>{course.lessons} lessons</Text>
              </View>
            </View>

            {(course.enrolled || courseEnrolled) && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Your Progress</Text>
                  <Text style={styles.progressPercentage}>{courseEnrolled ? currentProgress : (course.progress || 0)}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${courseEnrolled ? currentProgress : (course.progress || 0)}%` }]} />
                </View>
              </View>
            )}
          </View>

          {renderDisputeTrackerSection()}

          {isACECourse && (course.enrolled || courseEnrolled) && (
            <View style={styles.certificationSection}>
              <CertificationEligibility
                userId={MOCK_USER_ID}
                courseId={course.id}
                courseName={course.title}
                onNavigateToSection={(sectionId) => {
                  router.push(`/section-detail?courseId=${course.id}&sectionId=${sectionId}` as any);
                }}
              />
            </View>
          )}

          {course.learningObjectives && course.learningObjectives.length > 0 && (
            <View style={styles.objectivesSection}>
              <Text style={styles.sectionTitle}>
                {course.id === "3" ? "Learn How to Legally Remove" : "Learn The Following Strategies"}
              </Text>
              <View style={styles.objectivesChipGrid}>
                {course.learningObjectives.map((objective, index) => (
                  <View key={index} style={styles.objectiveChip}>
                    <CheckCircle color={Colors.secondary} size={12} />
                    <Text style={styles.objectiveChipText}>{objective}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {course.features && course.features.length > 0 && (
            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}>Course Includes</Text>
              <View style={styles.featuresGrid}>
                {course.features.map((feature, index) => (
                  <View key={index} style={styles.featureCard}>
                    <CheckCircle color={Colors.primary} size={18} />
                    <Text style={styles.featureCardText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.lessonsSection}>
            {course.sections && course.sections.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Course Curriculum</Text>
                  <Text style={styles.sectionSubtitle}>
                    {completedSteps} of {totalSteps} steps completed
                  </Text>
                </View>
                {course.sections.map((section) => (
                  <TouchableOpacity 
                    key={section.id} 
                    style={styles.sectionItem}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/section-detail?courseId=${course.id}&sectionId=${section.id}` as any)}
                  >
                    <View style={styles.sectionItemRow}>
                      <View style={styles.sectionIconContainer}>
                        {getSectionIcon(section.icon)}
                      </View>
                      <View style={styles.sectionItemContent}>
                        <View style={styles.sectionItemHeader}>
                          <Text style={styles.sectionItemTitle}>{section.title}</Text>
                          <Text style={styles.sectionSteps}>
                            {section.completed || 0}/{section.steps} steps
                          </Text>
                        </View>
                        <View style={styles.sectionProgressBar}>
                          <View
                            style={[
                              styles.sectionProgressFill,
                              {
                                width: `${((section.completed || 0) / section.steps) * 100}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Course Content</Text>
                {lessons.map((lesson, index) => (
                  <TouchableOpacity
                    key={lesson.id}
                    style={styles.lessonItem}
                    activeOpacity={0.7}
                  >
                    <View style={styles.lessonLeft}>
                      {lesson.completed ? (
                        <View style={styles.lessonCompleted}>
                          <CheckCircle color={Colors.surface} size={16} />
                        </View>
                      ) : (
                        <View style={styles.lessonNumber}>
                          <Text style={styles.lessonNumberText}>{lesson.id}</Text>
                        </View>
                      )}
                      <View style={styles.lessonInfo}>
                        <Text style={styles.lessonTitle}>
                          {lesson.title}
                        </Text>
                        <Text style={styles.lessonDuration}>{lesson.duration}</Text>
                      </View>
                    </View>
                    <Play color={lesson.completed ? Colors.primary : Colors.textLight} size={18} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {!(course.enrolled || courseEnrolled) && (
          <View style={styles.footer}>
            {isFreeWithRequirements ? (
              <View style={styles.freeCoursePricing}>
                <View style={styles.freeBadge}>
                  <Gift color={Colors.surface} size={16} />
                  <Text style={styles.freeBadgeText}>FREE COURSE</Text>
                </View>
                <Text style={styles.freeTitle}>CSO Certification Program</Text>
                
                <View style={styles.requirementsBox}>
                  <Text style={styles.requirementsTitle}>Prerequisites Required:</Text>
                  {course.requiresCompletedCoursesNames?.map((name, index) => {
                    const courseId = course.requiresCompletedCourses?.[index];
                    const isCompleted = courseId ? checkCourseCompletion(courseId) : false;
                    return (
                      <View key={index} style={styles.requirementItem}>
                        {isCompleted ? (
                          <CheckCircle color={Colors.secondary} size={16} />
                        ) : (
                          <XCircle color={Colors.error} size={16} />
                        )}
                        <Text style={[
                          styles.requirementText,
                          isCompleted && styles.requirementCompleted
                        ]}>{name}</Text>
                        {isCompleted && (
                          <Text style={styles.completedTag}>Completed</Text>
                        )}
                      </View>
                    );
                  })}
                </View>

                <View style={styles.eligibilityProgress}>
                  <Text style={styles.eligibilityLabel}>
                    Progress: {completedRequiredCount}/{totalRequiredCount} courses completed
                  </Text>
                  <View style={styles.eligibilityBar}>
                    <View style={[
                      styles.eligibilityFill,
                      { width: `${(completedRequiredCount / totalRequiredCount) * 100}%` }
                    ]} />
                  </View>
                </View>

                {!isEligible && (
                  <View style={styles.notEligibleNote}>
                    <Lock color={Colors.warning} size={16} />
                    <Text style={styles.notEligibleText}>
                      Complete all ACE courses to unlock this free certification
                    </Text>
                  </View>
                )}
              </View>
            ) : hasFreeTrialDays ? (
              <View style={styles.freeTrialPricing}>
                <View style={styles.freeTrialBadge}>
                  <Zap color={Colors.surface} size={16} />
                  <Text style={styles.freeTrialBadgeText}>
                    {course.freeTrialDays} DAYS FREE
                  </Text>
                </View>
                <Text style={styles.freeTrialDescription}>
                  Start your journey with just the certificate fee!
                </Text>
                <View style={styles.freeTrialPriceRow}>
                  <Text style={styles.freeTrialCertLabel}>Certificate Fee:</Text>
                  <Text style={styles.freeTrialCertPrice}>${course.certificationFee}</Text>
                </View>
                <Text style={styles.freeTrialNote}>
                  After {course.freeTrialDays} days: $25/month to continue access
                </Text>
              </View>
            ) : hasInstallmentPlan ? (
              <View style={styles.installmentPricing}>
                <View style={styles.autoDebitBadge}>
                  <CreditCard color={Colors.surface} size={14} />
                  <Text style={styles.autoDebitBadgeText}>AUTO-DEBIT ONLY</Text>
                </View>
                <Text style={styles.installmentTitle}>Payment Plan</Text>
                
                <View style={styles.installmentRow}>
                  <Text style={styles.installmentLabel}>Enrollment Fee (Today):</Text>
                  <Text style={styles.installmentValue}>${course.certificationFee}</Text>
                </View>
                
                <View style={styles.installmentDivider} />
                
                <View style={styles.installmentRow}>
                  <Text style={styles.installmentLabelBold}>{course.installmentMonths} Monthly Payments:</Text>
                  <Text style={styles.installmentValueBold}>${course.monthlyInstallment?.toFixed(2)}/mo</Text>
                </View>
                
                <View style={styles.installmentRow}>
                  <Text style={styles.installmentLabel}>Total Course Cost:</Text>
                  <Text style={styles.installmentValue}>${((course.monthlyInstallment || 0) * (course.installmentMonths || 3) + (course.certificationFee || 0)).toFixed(2)}</Text>
                </View>
                
                {course.autoDebitOnly && (
                  <View style={styles.lockoutWarning}>
                    <AlertTriangle color={Colors.error} size={16} />
                    <Text style={styles.lockoutWarningText}>
                      If auto-debit fails, you will be immediately locked out until payment is received.
                    </Text>
                  </View>
                )}
              </View>
            ) : isBundle ? (
              <View style={styles.bundlePricing}>
                <View style={styles.bundleOfferBadge}>
                  <Star color={Colors.surface} size={14} fill={Colors.surface} />
                  <Text style={styles.bundleOfferText}>BEST VALUE</Text>
                </View>
                <Text style={styles.bundleTitle}>Complete ACE Bundle</Text>
                
                <View style={styles.bundleIncludes}>
                  <Text style={styles.bundleIncludesTitle}>Bundle Includes:</Text>
                  {course.bundleIncludes?.map((item, index) => (
                    <View key={index} style={styles.bundleIncludeItem}>
                      <CheckCircle color={Colors.secondary} size={14} />
                      <Text style={styles.bundleIncludeText}>{item}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.bundleCertificates}>
                  <Award color={Colors.primary} size={16} />
                  <Text style={styles.bundleCertText}>3 Certificates Included</Text>
                </View>
                
                <View style={styles.bundleCertificates}>
                  <Star color={Colors.warning} size={16} fill={Colors.warning} />
                  <Text style={styles.bundleCertText}>CSO Certification Eligible</Text>
                </View>

                <View style={styles.bundlePriceRow}>
                  <Text style={styles.bundlePriceLabel}>One-Time Payment:</Text>
                  <Text style={styles.bundlePrice}>${course.price.toLocaleString()}</Text>
                </View>
                
                <View style={styles.noPaymentPlanNote}>
                  <AlertTriangle color={Colors.textLight} size={14} />
                  <Text style={styles.noPaymentPlanText}>No payment plan available</Text>
                </View>
              </View>
            ) : (
              <View style={styles.pricingInfo}>
                <Text style={styles.pricingLabel}>Course Fee</Text>
                <Text style={styles.pricingAmount}>${course.price}</Text>
                {course.certificationFee && (
                  <>
                    <Text style={styles.pricingLabel}>Certificate Fee</Text>
                    <Text style={styles.pricingAmount}>${course.certificationFee}</Text>
                    <View style={styles.totalDivider} />
                    <Text style={styles.totalLabel}>Total Investment</Text>
                    <Text style={styles.totalAmount}>
                      ${course.price + course.certificationFee}
                    </Text>
                  </>
                )}
              </View>
            )}
            <TouchableOpacity
              style={[
                styles.enrollButton,
                isFreeWithRequirements && !isEligible && styles.enrollButtonDisabled
              ]}
              activeOpacity={0.8}
              onPress={handleEnrollment}
            >
              <Text style={styles.enrollButtonText}>
                {isFreeWithRequirements
                  ? isEligible
                    ? "Enroll Now - FREE"
                    : "Complete Required Courses"
                  : hasFreeTrialDays
                  ? `Start Free Trial - ${course.certificationFee} Cert Fee`
                  : hasInstallmentPlan
                  ? `Enroll Now - ${course.certificationFee} Today`
                  : isBundle
                  ? `Get Bundle - ${course.price.toLocaleString()}`
                  : `Enroll Now - ${course.certificationFee ? course.price + course.certificationFee : course.price}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

// Note: insets removed as header handles safe area

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  content: {
    flex: 1,
  },
  courseImage: {
    width: "100%",
    height: 240,
  },
  courseInfo: {
    padding: 20,
  },
  courseBadges: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  levelBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    textTransform: "uppercase",
  },
  enrolledBadge: {
    backgroundColor: Colors.secondary + "20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  enrolledText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.secondary,
  },
  courseTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 12,
  },
  courseDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  courseMeta: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textLight,
  },
  progressSection: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.secondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.secondary,
    borderRadius: 4,
  },
  lessonsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 16,
  },
  lessonItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  lessonLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  lessonCompleted: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  lessonNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  lessonNumberText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },

  lessonDuration: {
    fontSize: 12,
    color: Colors.textLight,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pricingInfo: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pricingLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    width: "60%",
  },
  pricingAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    width: "35%",
    textAlign: "right",
  },
  totalDivider: {
    width: "100%",
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    width: "60%",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary,
    width: "35%",
    textAlign: "right",
  },
  enrollButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  enrollButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.surface,
  },
  freeTrialPricing: {
    backgroundColor: Colors.secondary + "15",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.secondary + "30",
  },
  freeTrialBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.secondary,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  freeTrialBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.surface,
  },
  freeTrialDescription: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  freeTrialPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  freeTrialCertLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  freeTrialCertPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.secondary,
  },
  freeTrialNote: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 40,
  },
  objectivesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  objectivesChipGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  objectiveChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: Colors.secondary + "15",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.secondary + "25",
  },
  objectiveChipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  featureCardText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },
  sectionItem: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  sectionItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  sectionSteps: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textLight,
  },
  sectionProgressBar: {
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  sectionProgressFill: {
    height: "100%",
    backgroundColor: Colors.secondary,
    borderRadius: 3,
  },
  sectionItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  sectionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionItemContent: {
    flex: 1,
  },
  disputeTrackerSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.secondary + "30",
  },
  disputeTrackerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 20,
    gap: 14,
    backgroundColor: Colors.secondary + "10",
  },
  disputeTrackerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  disputeTrackerHeaderText: {
    flex: 1,
  },
  disputeTrackerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  disputeTrackerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },
  stepBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.surface,
    textTransform: "uppercase",
  },
  disputeTrackerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  disputeTrackerFeatures: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  disputeFeatureItem: {
    alignItems: "center",
    gap: 6,
  },
  disputeFeatureText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  disputeTrackerAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
  },
  disputeTrackerActionText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.surface,
  },
  installmentPricing: {
    backgroundColor: Colors.warning + "12",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.warning + "40",
  },
  limitedOfferBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.warning,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  limitedOfferText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.surface,
    letterSpacing: 0.5,
  },
  installmentTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 14,
  },
  installmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  installmentLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  installmentLabelBold: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  installmentValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.secondary,
  },
  installmentValueStrike: {
    fontSize: 14,
    color: Colors.textLight,
    textDecorationLine: "line-through",
  },
  installmentValueBold: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary,
  },
  installmentDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  autoDebitNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.warning + "15",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  autoDebitText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.warning,
  },
  autoDebitBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.error,
    alignSelf: "flex-start" as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  autoDebitBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.surface,
    letterSpacing: 0.5,
  },
  lockoutWarning: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
    backgroundColor: Colors.error + "15",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.error + "30",
  },
  lockoutWarningText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.error,
    flex: 1,
    lineHeight: 18,
  },
  renewalNote: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: "italic",
    marginTop: 4,
  },
  bundleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  bundleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.surface,
    letterSpacing: 0.5,
  },
  csoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  csoBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.surface,
    letterSpacing: 0.5,
  },
  bundlePricing: {
    backgroundColor: Colors.primary + "12",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.primary + "30",
  },
  bundleOfferBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  bundleOfferText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.surface,
    letterSpacing: 0.5,
  },
  bundleTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 14,
  },
  bundleIncludes: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  bundleIncludesTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  bundleIncludeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  bundleIncludeText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  bundleCertificates: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  bundleCertText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  bundlePriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bundlePriceLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  bundlePrice: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.primary,
  },
  noPaymentPlanNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    justifyContent: "center",
  },
  noPaymentPlanText: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: "italic",
  },
  freeCoursePricing: {
    backgroundColor: Colors.secondary + "12",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.secondary + "30",
  },
  freeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.secondary,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.surface,
    letterSpacing: 0.5,
  },
  freeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 14,
  },
  requirementsBox: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
    flex: 1,
  },
  requirementCompleted: {
    color: Colors.secondary,
  },
  completedTag: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.secondary,
    backgroundColor: Colors.secondary + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eligibilityProgress: {
    marginBottom: 12,
  },
  eligibilityLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  eligibilityBar: {
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    overflow: "hidden",
  },
  eligibilityFill: {
    height: "100%",
    backgroundColor: Colors.secondary,
    borderRadius: 4,
  },
  notEligibleNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.warning + "15",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  notEligibleText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.warning,
    flex: 1,
  },
  enrollButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  certificationSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
});
