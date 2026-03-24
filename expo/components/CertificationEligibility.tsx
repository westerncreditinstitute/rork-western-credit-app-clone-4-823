import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  Award,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Play,
  Clock,
  Target,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { trpc } from "@/lib/trpc";

interface IncompleteVideo {
  videoId: string;
  title: string;
  sectionId: string;
  progressPercent: number;
  requiredPercent: number;
}

interface CertificationEligibilityProps {
  userId: string;
  courseId: string;
  courseName: string;
  onNavigateToSection?: (sectionId: string) => void;
}

export default function CertificationEligibility({
  userId,
  courseId,
  courseName,
  onNavigateToSection,
}: CertificationEligibilityProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const eligibilityQuery = trpc.videoProgress.getCertificationEligibility.useQuery(
    { userId, courseId },
    { enabled: !!userId && !!courseId }
  );

  if (eligibilityQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (!eligibilityQuery.data?.requiresCertification) {
    return null;
  }

  const {
    isEligible,
    incompleteVideos,
    totalVideos,
    eligibleVideos,
    threshold,
  } = eligibilityQuery.data;

  const handleVideoPress = (video: IncompleteVideo) => {
    if (onNavigateToSection) {
      onNavigateToSection(video.sectionId);
    } else {
      router.push(`/section-detail?courseId=${courseId}&sectionId=${video.sectionId}` as any);
    }
  };

  if (isEligible) {
    return (
      <View style={styles.eligibleContainer}>
        <View style={styles.eligibleHeader}>
          <View style={styles.eligibleIconContainer}>
            <Award color={Colors.surface} size={24} />
          </View>
          <View style={styles.eligibleContent}>
            <Text style={styles.eligibleTitle}>CSO Exam Eligible</Text>
            <Text style={styles.eligibleSubtitle}>
              You have watched {threshold}%+ of all videos in this course
            </Text>
          </View>
          <CheckCircle color={Colors.secondary} size={28} />
        </View>
        <View style={styles.eligibleStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{eligibleVideos}</Text>
            <Text style={styles.statLabel}>Videos Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{threshold}%</Text>
            <Text style={styles.statLabel}>Min. Watch Time</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.secondary }]}>Ready</Text>
            <Text style={styles.statLabel}>Certification</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.warningIconContainer}>
            <AlertTriangle color={Colors.surface} size={20} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>CSO Exam Requirements</Text>
            <Text style={styles.headerSubtitle}>
              {incompleteVideos.length} video{incompleteVideos.length !== 1 ? "s" : ""} need {threshold}% watch time
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>
              {eligibleVideos}/{totalVideos}
            </Text>
          </View>
          {isExpanded ? (
            <ChevronUp color={Colors.text} size={20} />
          ) : (
            <ChevronDown color={Colors.text} size={20} />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${totalVideos > 0 ? (eligibleVideos / totalVideos) * 100 : 0}%` },
          ]}
        />
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.infoBox}>
            <Target color={Colors.primary} size={18} />
            <Text style={styles.infoText}>
              Watch at least {threshold}% of each video to be eligible for CSO certification exam.
            </Text>
          </View>

          <Text style={styles.incompleteTitle}>Incomplete Videos</Text>
          <ScrollView
            style={styles.incompleteList}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {incompleteVideos.map((video, index) => (
              <TouchableOpacity
                key={video.videoId}
                style={styles.incompleteItem}
                onPress={() => handleVideoPress(video)}
                activeOpacity={0.7}
              >
                <View style={styles.incompleteItemLeft}>
                  <View style={styles.videoNumberBadge}>
                    <Text style={styles.videoNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.incompleteItemContent}>
                    <Text style={styles.incompleteItemTitle} numberOfLines={2}>
                      {video.title}
                    </Text>
                    <View style={styles.incompleteItemMeta}>
                      <Clock color={Colors.textLight} size={12} />
                      <Text style={styles.incompleteItemProgress}>
                        {video.progressPercent}% watched
                      </Text>
                      <Text style={styles.incompleteItemRequired}>
                        (need {threshold - video.progressPercent}% more)
                      </Text>
                    </View>
                    <View style={styles.miniProgressContainer}>
                      <View
                        style={[
                          styles.miniProgress,
                          { width: `${video.progressPercent}%` },
                        ]}
                      />
                      <View
                        style={[
                          styles.miniProgressTarget,
                          { left: `${threshold}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.playIconContainer}>
                  <Play color={Colors.primary} size={16} fill={Colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.warning + "12",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.warning + "30",
    overflow: "hidden",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  warningIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.warning,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.surface,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: Colors.warning + "30",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.secondary,
  },
  expandedContent: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.warning + "20",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.primary + "10",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  incompleteTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 12,
  },
  incompleteList: {
    maxHeight: 280,
  },
  incompleteItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  incompleteItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  videoNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.warning + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  videoNumberText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.warning,
  },
  incompleteItemContent: {
    flex: 1,
  },
  incompleteItemTitle: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  incompleteItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  incompleteItemProgress: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  incompleteItemRequired: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: "500" as const,
  },
  miniProgressContainer: {
    height: 4,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 2,
    position: "relative" as const,
    overflow: "visible",
  },
  miniProgress: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  miniProgressTarget: {
    position: "absolute" as const,
    top: -2,
    width: 2,
    height: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 1,
  },
  playIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  eligibleContainer: {
    backgroundColor: Colors.secondary + "12",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.secondary + "30",
    overflow: "hidden",
  },
  eligibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  eligibleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  eligibleContent: {
    flex: 1,
  },
  eligibleTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  eligibleSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  eligibleStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.secondary + "08",
    borderTopWidth: 1,
    borderTopColor: Colors.secondary + "20",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.secondary + "30",
  },
});
