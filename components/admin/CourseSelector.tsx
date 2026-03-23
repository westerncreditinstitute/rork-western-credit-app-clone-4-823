import React, { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import Colors from "@/constants/colors";

interface Course {
  id: string;
  title: string;
  sections?: { id: string; title: string }[];
}

interface CourseSelectorProps {
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (courseId: string, firstSectionId: string) => void;
}

const CourseChip = React.memo(function CourseChip({
  course,
  isSelected,
  onPress,
}: {
  course: Course;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, isSelected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text
        style={[styles.chipText, isSelected && styles.chipTextSelected]}
        numberOfLines={1}
      >
        {course.title}
      </Text>
    </TouchableOpacity>
  );
});

const CourseSelector = React.memo(function CourseSelector({
  courses,
  selectedCourseId,
  onSelectCourse,
}: CourseSelectorProps) {
  const filteredCourses = courses.filter(c => c.sections && c.sections.length > 0);

  const handleCoursePress = useCallback((course: Course) => {
    const firstSectionId = course.sections?.[0]?.id || "1";
    onSelectCourse(course.id, firstSectionId);
  }, [onSelectCourse]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepIndicatorText}>1</Text>
          </View>
          <Text style={styles.sectionTitle}>Select Course</Text>
        </View>
        <Text style={styles.sectionHint}>Choose which course to add content to</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
        {filteredCourses.map((course) => (
          <CourseChip
            key={course.id}
            course={course}
            isSelected={selectedCourseId === course.id}
            onPress={() => handleCoursePress(course)}
          />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 4,
  },
  stepIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  stepIndicatorText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textLight,
    marginLeft: 30,
  },
  chipContainer: {
    flexDirection: "row" as const,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500" as const,
  },
  chipTextSelected: {
    color: Colors.white,
  },
});

export default CourseSelector;
