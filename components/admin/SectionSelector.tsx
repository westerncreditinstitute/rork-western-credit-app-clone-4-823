import React, { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { AlertCircle } from "lucide-react-native";
import Colors from "@/constants/colors";

interface Section {
  id: string;
  title: string;
}

interface SectionSelectorProps {
  sections: Section[];
  selectedSectionId: string;
  selectedCourseName: string;
  onSelectSection: (sectionId: string) => void;
}

const SectionChip = React.memo(function SectionChip({
  section,
  index,
  isSelected,
  onPress,
}: {
  section: Section;
  index: number;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, styles.sectionChip, isSelected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={styles.sectionChipNumber}>{index + 1}</Text>
      <Text
        style={[styles.chipText, isSelected && styles.chipTextSelected]}
        numberOfLines={1}
      >
        {section.title}
      </Text>
    </TouchableOpacity>
  );
});

const SectionSelector = React.memo(function SectionSelector({
  sections,
  selectedSectionId,
  selectedCourseName,
  onSelectSection,
}: SectionSelectorProps) {
  const selectedSectionName = sections.find(s => s.id === selectedSectionId)?.title || 'Select Section';

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepIndicatorText}>2</Text>
          </View>
          <Text style={styles.sectionTitle}>Select Section (Step)</Text>
        </View>
        <Text style={styles.sectionHint}>Videos will be added to this section</Text>
      </View>
      <View style={styles.selectedDestination}>
        <AlertCircle color={Colors.primary} size={16} />
        <Text style={styles.selectedDestinationText}>
          Current: <Text style={styles.selectedDestinationBold}>{selectedCourseName}</Text> → <Text style={styles.selectedDestinationBold}>{selectedSectionName}</Text>
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
        {sections.map((section, index) => (
          <SectionChip
            key={section.id}
            section={section}
            index={index}
            isSelected={selectedSectionId === section.id}
            onPress={() => onSelectSection(section.id)}
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
  sectionChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  sectionChipNumber: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textLight,
    backgroundColor: Colors.background,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  selectedDestination: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: Colors.primary + "10",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedDestinationText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  selectedDestinationBold: {
    fontWeight: "600" as const,
    color: Colors.primary,
  },
});

export default SectionSelector;
