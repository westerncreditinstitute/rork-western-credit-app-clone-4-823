import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Search, Filter, Clock, BookOpen, CheckCircle, Zap, X, Tag } from "lucide-react-native";

import { useTheme } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { courses as mockCourses } from "@/mocks/data";
import { Course } from "@/types";
import { Card, Badge, ProgressBar, EmptyState } from "@/components/ui";
import { SkeletonCard } from "@/components/ui/Skeleton";

const categories = ["All", "Certification", "Strategy", "Business", "Legal", "Bundle"];

export default function CoursesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isEnrolled, getCourseProgress, syncInitialEnrollments } = useSubscription();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"all" | "enrolled">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Sync mock enrolled courses with context
    const mockEnrolledIds = mockCourses.filter(c => c.enrolled).map(c => c.id);
    if (mockEnrolledIds.length > 0) {
      syncInitialEnrollments(mockEnrolledIds);
    }
  }, [syncInitialEnrollments]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
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
    }, 800);
    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const courses = mockCourses.map(course => ({
    ...course,
    enrolled: course.enrolled || isEnrolled(course.id),
    progress: isEnrolled(course.id) ? getCourseProgress(course.id) : course.progress,
  }));

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || course.category === selectedCategory;
    const matchesTab = activeTab === "all" || (activeTab === "enrolled" && course.enrolled);
    return matchesSearch && matchesCategory && matchesTab;
  });

  const handleCoursePress = (course: Course) => {
    if (course.comingSoon) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/course-detail?id=${course.id}` as any);
  };

  const renderCourseCard = (course: Course, index: number) => (
    <Animated.View
      key={course.id}
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: Animated.multiply(slideAnim, (index % 3) + 1) }],
      }}
    >
      <Card
        variant="elevated"
        padding="none"
        style={styles.courseCard}
        onPress={() => handleCoursePress(course)}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: course.image }} style={styles.courseImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
          {course.enrolled && course.progress === 100 && (
            <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
              <CheckCircle color={colors.white} size={14} />
            </View>
          )}
          {course.comingSoon && (
            <View style={[styles.comingSoonOverlay, { backgroundColor: colors.overlay }]}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          )}
        </View>
        <View style={styles.courseContent}>
          <View style={styles.courseHeader}>
            <Badge text={course.level} variant="primary" size="sm" />
            {course.comingSoon ? (
              <Badge text="Coming Soon" variant="default" size="sm" />
            ) : course.enrolled ? (
              <Badge text="Enrolled" variant="success" size="sm" />
            ) : course.freeTrialDays ? (
              <View style={[styles.freeTrialTag, { backgroundColor: colors.secondary }]}>
                <Zap color={colors.white} size={12} />
                <Text style={styles.freeTrialText}>{course.freeTrialDays} Days Free</Text>
              </View>
            ) : course.limitedTimeOffer ? (
              <View style={[styles.limitedOfferTag, { backgroundColor: colors.warning }]}>
                <Tag color={colors.white} size={12} />
                <Text style={styles.limitedOfferText}>Limited Offer</Text>
              </View>
            ) : course.isFree ? (
              <View style={[styles.freeTag, { backgroundColor: colors.secondary }]}>
                <Text style={styles.freeTagText}>FREE</Text>
              </View>
            ) : (
              <View style={styles.priceContainer}>
                <Text style={[styles.coursePrice, { color: colors.primary }]}>${course.price}</Text>
                {course.certificationFee && (
                  <Text style={[styles.certificationFee, { color: colors.textLight }]}>
                    +${course.certificationFee} cert
                  </Text>
                )}
              </View>
            )}
          </View>
          <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={[styles.courseDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {course.description}
          </Text>
          <View style={styles.courseMeta}>
            <View style={styles.metaItem}>
              <Clock color={colors.textLight} size={14} />
              <Text style={[styles.metaText, { color: colors.textLight }]}>{course.duration}</Text>
            </View>
            <View style={styles.metaItem}>
              <BookOpen color={colors.textLight} size={14} />
              <Text style={[styles.metaText, { color: colors.textLight }]}>{course.lessons} lessons</Text>
            </View>
          </View>
          {course.enrolled && course.progress !== undefined && (
            <View style={styles.progressContainer}>
              <ProgressBar 
                progress={course.progress} 
                height={6} 
                showLabel 
                labelPosition="right"
                variant="default"
              />
            </View>
          )}
        </View>
      </Card>
    </Animated.View>
  );

  const renderSkeletons = () => (
    <View style={styles.skeletonsContainer}>
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Courses</Text>
        <Text style={styles.headerSubtitle}>Master credit education</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search color={colors.textLight} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X color={colors.textLight} size={18} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Filter color={colors.primary} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "all" && styles.activeTab]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("all");
          }}
        >
          <Text style={[styles.tabText, activeTab === "all" && styles.activeTabText]}>
            All Courses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "enrolled" && styles.activeTab]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("enrolled");
          }}
        >
          <Text style={[styles.tabText, activeTab === "enrolled" && styles.activeTabText]}>
            My Courses
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              { 
                backgroundColor: selectedCategory === category ? colors.primary : colors.surfaceAlt,
                borderColor: selectedCategory === category ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedCategory(category);
            }}
          >
            <Text
              style={[
                styles.categoryText,
                { color: selectedCategory === category ? colors.white : colors.textSecondary },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.coursesList}
        contentContainerStyle={styles.coursesContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          renderSkeletons()
        ) : filteredCourses.length > 0 ? (
          filteredCourses.map((course, index) => renderCourseCard(course, index))
        ) : (
          <EmptyState
            icon={<BookOpen color={colors.textLight} size={40} />}
            title="No courses found"
            description="Try adjusting your search or filters to find what you're looking for."
            actionLabel={searchQuery || selectedCategory !== "All" ? "Clear Filters" : undefined}
            onAction={() => {
              setSearchQuery("");
              setSelectedCategory("All");
            }}
          />
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
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
  searchSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.white,
  },
  categoriesScroll: {
    maxHeight: 44,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  coursesList: {
    flex: 1,
    marginTop: 16,
  },
  coursesContainer: {
    paddingHorizontal: 20,
  },
  skeletonsContainer: {
    gap: 16,
  },
  courseCard: {
    marginBottom: 16,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative" as const,
  },
  courseImage: {
    width: "100%",
    height: 160,
  },
  completedBadge: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    borderRadius: 20,
    padding: 6,
  },
  comingSoonOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  courseContent: {
    padding: 16,
  },
  courseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  coursePrice: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  certificationFee: {
    fontSize: 10,
    fontWeight: "600" as const,
    marginTop: 2,
  },
  freeTrialTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  freeTrialText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  limitedOfferTag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  limitedOfferText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    marginBottom: 8,
    lineHeight: 22,
  },
  courseDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  courseMeta: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  progressContainer: {
    marginTop: 14,
  },
  freeTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeTagText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
});
