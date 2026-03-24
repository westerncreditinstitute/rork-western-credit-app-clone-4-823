import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import Colors from "@/constants/colors";

interface WorkflowStepsProps {
  currentStep: number;
}

const WorkflowSteps = React.memo(function WorkflowSteps({ currentStep }: WorkflowStepsProps) {
  return (
    <View style={styles.workflowContainer}>
      <Text style={styles.workflowTitle}>Quick Setup Guide</Text>
      <View style={styles.workflowSteps}>
        <View style={[styles.workflowStep, currentStep >= 1 && styles.workflowStepActive]}>
          <View style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>
            <Text style={[styles.stepNumberText, currentStep >= 1 && styles.stepNumberTextActive]}>1</Text>
          </View>
          <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Select Course</Text>
        </View>
        <ChevronRight color={Colors.textLight} size={16} />
        <View style={[styles.workflowStep, currentStep >= 2 && styles.workflowStepActive]}>
          <View style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>
            <Text style={[styles.stepNumberText, currentStep >= 2 && styles.stepNumberTextActive]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Select Section</Text>
        </View>
        <ChevronRight color={Colors.textLight} size={16} />
        <View style={[styles.workflowStep, currentStep >= 3 && styles.workflowStepActive]}>
          <View style={[styles.stepNumber, currentStep >= 3 && styles.stepNumberActive]}>
            <Text style={[styles.stepNumberText, currentStep >= 3 && styles.stepNumberTextActive]}>3</Text>
          </View>
          <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>Add Content</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  workflowContainer: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  workflowTitle: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textLight,
    marginBottom: 12,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  workflowSteps: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  workflowStep: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    opacity: 0.5,
  },
  workflowStepActive: {
    opacity: 1,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  stepNumberActive: {
    backgroundColor: Colors.primary,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textLight,
  },
  stepNumberTextActive: {
    color: Colors.white,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.textLight,
  },
  stepLabelActive: {
    color: Colors.text,
  },
});

export default WorkflowSteps;
