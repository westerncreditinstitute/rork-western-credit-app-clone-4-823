import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Plus, Download, Info } from "lucide-react-native";
import Colors from "@/constants/colors";
import { ManagementMode } from "@/types/admin";

interface AddContentSectionProps {
  mode: ManagementMode;
  onAddManually: () => void;
  onImportFromCDN: () => void;
}

const AddContentSection = React.memo(function AddContentSection({
  mode,
  onAddManually,
  onImportFromCDN,
}: AddContentSectionProps) {
  const getAddButtonText = () => {
    switch (mode) {
      case "videos":
        return "Add Manually";
      case "documents":
        return "Add Document";
      default:
        return "Add Avatar";
    }
  };

  return (
    <View style={styles.actionSection}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepIndicatorText}>3</Text>
          </View>
          <Text style={styles.sectionTitle}>Add Content</Text>
        </View>
        <Text style={styles.sectionHint}>Choose how to add your {mode}</Text>
      </View>
      
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.addButton} onPress={onAddManually}>
          <Plus color={Colors.white} size={20} />
          <Text style={styles.addButtonText}>{getAddButtonText()}</Text>
        </TouchableOpacity>
        {mode === "videos" && (
          <TouchableOpacity
            style={[styles.addButton, styles.importButton]}
            onPress={onImportFromCDN}
          >
            <Download color={Colors.white} size={20} />
            <Text style={styles.addButtonText}>Import from CDN</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {mode === "videos" && (
        <View style={styles.helpCard}>
          <Info color={Colors.primary} size={18} />
          <View style={styles.helpCardContent}>
            <Text style={styles.helpCardTitle}>How to Add Videos</Text>
            <Text style={styles.helpCardText}>
              • <Text style={styles.helpBold}>Add Manually</Text>: Enter video URL, embed code, or Bunny/Cloudflare Video ID{"\n"}
              • <Text style={styles.helpBold}>Import from CDN</Text>: Connect to Bunny.net or Cloudflare to import multiple videos at once
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  actionSection: {
    padding: 20,
    paddingTop: 0,
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
  actionButtonsRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 12,
  },
  addButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  importButton: {
    backgroundColor: Colors.secondary,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
    marginLeft: 8,
  },
  helpCard: {
    flexDirection: "row" as const,
    backgroundColor: Colors.primary + "08",
    padding: 14,
    borderRadius: 10,
    gap: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  helpCardContent: {
    flex: 1,
  },
  helpCardTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 6,
  },
  helpCardText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  helpBold: {
    fontWeight: "600" as const,
    color: Colors.text,
  },
});

export default AddContentSection;
