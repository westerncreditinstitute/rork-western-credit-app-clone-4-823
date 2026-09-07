import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
} from "lucide-react-native";
import Colors from "@/constants/colors";

/**
 * Simple pressable checkbox — replaces the old `CheckBox` import from
 * react-native, which was removed from RN core in newer versions
 * (was silently `undefined` here, crashing at render time).
 */
const SimpleCheckbox: React.FC<{
  value: boolean;
  onValueChange: () => void;
  disabled?: boolean;
}> = ({ value, onValueChange, disabled }) => (
  <TouchableOpacity
    onPress={onValueChange}
    disabled={disabled}
    style={[
      checkboxStyles.box,
      value && checkboxStyles.boxChecked,
      disabled && checkboxStyles.boxDisabled,
    ]}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: value, disabled: !!disabled }}
  >
    {value ? <Check size={14} color={Colors.white} /> : null}
  </TouchableOpacity>
);

const checkboxStyles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  boxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  boxDisabled: {
    opacity: 0.5,
  },
});

export interface ParsedAccount {
  creditor: string;
  accountNumber: string;
  balance: string;
  status: string;
  openDate: string;
  lastReported: string;
  negativeType?: string;
}

interface DisputeLetterPromptProps {
  negativeAccounts: ParsedAccount[];
  onStartDispute: (selectedAccounts: ParsedAccount[]) => void;
  isLoading?: boolean;
}

export const DisputeLetterPrompt: React.FC<DisputeLetterPromptProps> = ({
  negativeAccounts,
  onStartDispute,
  isLoading = false,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [selectedAccounts, setSelectedAccounts] = useState<ParsedAccount[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleToggleAccount = (account: ParsedAccount) => {
    setSelectedAccounts((prev) => {
      const isSelected = prev.some(
        (a) =>
          a.creditor === account.creditor &&
          a.accountNumber === account.accountNumber
      );

      if (isSelected) {
        return prev.filter(
          (a) =>
            !(
              a.creditor === account.creditor &&
              a.accountNumber === account.accountNumber
            )
        );
      } else {
        return [...prev, account];
      }
    });
    setSelectAll(false);
  };

  const handleSelectAll = (value: boolean) => {
    setSelectAll(value);
    if (value) {
      setSelectedAccounts(negativeAccounts);
    } else {
      setSelectedAccounts([]);
    }
  };

  const handleStartDispute = () => {
    if (selectedAccounts.length === 0) {
      alert("Please select at least one account to dispute.");
      return;
    }
    onStartDispute(selectedAccounts);
  };

  if (negativeAccounts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <AlertCircle size={24} color={Colors.error} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Generate Dispute Letters</Text>
            <Text style={styles.headerSubtitle}>
              {negativeAccounts.length} negative account
              {negativeAccounts.length !== 1 ? "s" : ""} found
            </Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={24} color={Colors.error} />
        ) : (
          <ChevronDown size={24} color={Colors.error} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          <Text style={styles.promptText}>
            Would you like to generate dispute letters for these negative accounts?
            You can select individual accounts or all of them.
          </Text>

          {/* Account Selection */}
          <View style={styles.accountSelectionContainer}>
            <View style={styles.selectAllContainer}>
              <SimpleCheckbox
                value={selectAll}
                onValueChange={() => handleSelectAll(!selectAll)}
                disabled={isLoading}
              />
              <Text style={styles.selectAllText}>Select All Accounts</Text>
            </View>

            {negativeAccounts.map((account, index) => (
              <View key={`${account.creditor}-${account.accountNumber}`} style={styles.accountCheckItem}>
                <SimpleCheckbox
                  value={selectedAccounts.some(
                    (a) =>
                      a.creditor === account.creditor &&
                      a.accountNumber === account.accountNumber
                  )}
                  onValueChange={() => handleToggleAccount(account)}
                  disabled={isLoading}
                />
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.creditor}</Text>
                  <Text style={styles.accountDetails}>
                    {account.accountNumber} • {account.negativeType || "Derogatory"}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.generateButton,
                (selectedAccounts.length === 0 || isLoading) &&
                  styles.generateButtonDisabled,
              ]}
              onPress={handleStartDispute}
              disabled={selectedAccounts.length === 0 || isLoading}
              activeOpacity={0.8}
            >
              <FileText
                size={18}
                color={
                  selectedAccounts.length === 0 || isLoading ? "#d1d5db" : "white"
                }
                style={styles.buttonIcon}
              />
              <Text
                style={[
                  styles.generateButtonText,
                  (selectedAccounts.length === 0 || isLoading) &&
                    styles.generateButtonTextDisabled,
                ]}
              >
                {isLoading ? "Generating..." : "Generate Dispute Letters"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>ℹ</Text>
            </View>
            <Text style={styles.infoText}>
              Dispute letters will be customized for each account and include
              all necessary legal language. You can review and send them
              immediately or save them for later.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fef2f2",
    borderTopWidth: 1,
    borderTopColor: "#fee2e2",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 16,
    overflow: "hidden",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fef2f2",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.error,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#dc2626",
  },

  // Content
  content: {
    borderTopWidth: 1,
    borderTopColor: "#fee2e2",
    padding: 16,
    backgroundColor: "white",
  },
  promptText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: "500",
  },

  // Account Selection
  accountSelectionContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectAllContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 10,
    width: 20,
    height: 20,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  accountCheckItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  accountInfo: {
    marginLeft: 10,
    flex: 1,
  },
  accountName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  accountDetails: {
    fontSize: 11,
    color: "#6b7280",
  },

  // Action Buttons
  actionButtons: {
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
  buttonIcon: {
    marginTop: Platform.OS === "android" ? 2 : 0,
  },
  generateButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  generateButtonTextDisabled: {
    color: "#d1d5db",
  },

  // Info Box
  infoBox: {
    backgroundColor: "#eff6ff",
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderRadius: 6,
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  infoIconText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#0369a1",
    lineHeight: 18,
  },
});

export default DisputeLetterPrompt;
