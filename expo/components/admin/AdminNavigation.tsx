import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from "react-native";
import { Video, FileText, User, Youtube, TestTube, LogOut, Info } from "lucide-react-native";
import Colors from "@/constants/colors";
import { ManagementMode } from "@/types/admin";

interface AdminNavigationProps {
  mode: ManagementMode;
  onModeChange: (mode: ManagementMode) => void;
  sandboxMode: boolean;
  onSandboxModeChange: (value: boolean) => void;
  onLogout: () => void;
}

export default function AdminNavigation({
  mode,
  onModeChange,
  sandboxMode,
  onSandboxModeChange,
  onLogout,
}: AdminNavigationProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.title}>Content Manager</Text>
          <Text style={styles.subtitle}>Manage course content</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.sandboxToggle}>
            <TestTube color={sandboxMode ? Colors.success : Colors.textLight} size={18} />
            <Text style={[styles.sandboxLabel, sandboxMode && styles.sandboxLabelActive]}>Sandbox</Text>
            <Switch
              value={sandboxMode}
              onValueChange={onSandboxModeChange}
              trackColor={{ false: Colors.border, true: Colors.success + "60" }}
              thumbColor={sandboxMode ? Colors.success : Colors.textLight}
            />
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <LogOut color={Colors.error} size={18} />
          </TouchableOpacity>
        </View>
      </View>
      
      {sandboxMode && (
        <View style={styles.sandboxBanner}>
          <Info color={Colors.success} size={16} />
          <Text style={styles.sandboxBannerText}>
            Sandbox Mode: Test freely without subscription checks
          </Text>
        </View>
      )}
      
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, mode === "videos" && styles.modeButtonActive]}
          onPress={() => onModeChange("videos")}
        >
          <Video color={mode === "videos" ? Colors.white : Colors.primary} size={20} />
          <Text style={[styles.modeButtonText, mode === "videos" && styles.modeButtonTextActive]}>Videos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === "documents" && styles.modeButtonActive]}
          onPress={() => onModeChange("documents")}
        >
          <FileText color={mode === "documents" ? Colors.white : Colors.primary} size={20} />
          <Text style={[styles.modeButtonText, mode === "documents" && styles.modeButtonTextActive]}>Documents</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === "avatars" && styles.modeButtonActive]}
          onPress={() => onModeChange("avatars")}
        >
          <User color={mode === "avatars" ? Colors.white : Colors.primary} size={20} />
          <Text style={[styles.modeButtonText, mode === "avatars" && styles.modeButtonTextActive]}>Avatars</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === "promo" && styles.modeButtonActive, { backgroundColor: mode === "promo" ? "#FF0000" : Colors.background, borderColor: "#FF0000" }]}
          onPress={() => onModeChange("promo")}
        >
          <Youtube color={mode === "promo" ? Colors.white : "#FF0000"} size={20} />
          <Text style={[styles.modeButtonText, mode === "promo" && styles.modeButtonTextActive, { color: mode === "promo" ? Colors.white : "#FF0000" }]}>Promo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textLight,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  sandboxToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: Colors.background,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  sandboxLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.textLight,
  },
  sandboxLabelActive: {
    color: Colors.success,
  },
  sandboxBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: Colors.success + "15",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: -8,
  },
  sandboxBannerText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: "500" as const,
  },
  logoutButton: {
    padding: 10,
    backgroundColor: Colors.error + "15",
    borderRadius: 10,
  },
  modeSelector: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 16,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  modeButtonTextActive: {
    color: Colors.white,
  },
});
