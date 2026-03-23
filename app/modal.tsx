import { router } from "expo-router";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { X, HelpCircle } from "lucide-react-native";

import Colors from "@/constants/colors";

export default function ModalScreen() {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={() => router.back()}
    >
      <Pressable style={styles.overlay} onPress={() => router.back()}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <TouchableOpacity
            style={styles.closeIcon}
            onPress={() => router.back()}
          >
            <X color={Colors.textSecondary} size={24} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <HelpCircle color={Colors.secondary} size={48} />
          </View>

          <Text style={styles.title}>Need Help?</Text>
          <Text style={styles.description}>
            Contact our support team for assistance with courses, earnings, or
            any questions about Western Credit Institute.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 37, 64, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    margin: 24,
    alignItems: "center",
    minWidth: 300,
    maxWidth: 340,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  closeIcon: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  description: {
    textAlign: "center",
    marginBottom: 28,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: Colors.surface,
    fontWeight: "600",
    textAlign: "center",
    fontSize: 15,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
    fontSize: 14,
  },
});
