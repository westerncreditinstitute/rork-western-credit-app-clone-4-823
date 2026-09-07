import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Platform,
} from "react-native";
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  FileText,
} from "lucide-react-native";
import Colors from "@/constants/colors";

/**
 * ParsedAccount type matches the shape from CreditReportParser.tsx
 */
export interface ParsedAccount {
  creditor: string;
  accountNumber: string;
  balance: string;
  status: string;
  openDate: string;
  lastReported: string;
  negativeType?: string;
}

interface AccountSummaryProps {
  accounts: ParsedAccount[];
  bureau: string;
  onSelectNegativeAccounts?: (selected: ParsedAccount[]) => void;
}

interface CategorizedAccounts {
  negative: ParsedAccount[];
  positive: ParsedAccount[];
  neutral: ParsedAccount[];
}

/**
 * Categorizes accounts based on their status and negativeType
 */
const categorizeAccounts = (accounts: ParsedAccount[]): CategorizedAccounts => {
  const categorized: CategorizedAccounts = {
    negative: [],
    positive: [],
    neutral: [],
  };

  accounts.forEach((account) => {
    if (account.negativeType) {
      categorized.negative.push(account);
    } else if (
      account.status &&
      (account.status.toLowerCase().includes("open") ||
        account.status.toLowerCase().includes("good standing") ||
        account.status.toLowerCase().includes("current") ||
        account.status.toLowerCase().includes("paid as agreed"))
    ) {
      categorized.positive.push(account);
    } else {
      categorized.neutral.push(account);
    }
  });

  return categorized;
};

/**
 * AccountCard component for individual account display
 */
const AccountCard: React.FC<{
  account: ParsedAccount;
  isNegative: boolean;
  isSelected?: boolean;
  onSelect?: (account: ParsedAccount) => void;
}> = ({ account, isNegative, isSelected, onSelect }) => {
  const [expanded, setExpanded] = useState(false);

  const badgeColor = isNegative ? "#dc2626" : "#16a34a";
  const badgeBackgroundColor = isNegative ? "#fee2e2" : "#dcfce7";

  return (
    <View style={[styles.accountCard, expanded && styles.accountCardExpanded]}>
      <TouchableOpacity
        style={styles.accountCardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.accountCardTitleRow}>
          <View style={styles.creditorInfo}>
            <Text style={styles.creditorName} numberOfLines={1}>
              {account.creditor}
            </Text>
            <Text style={styles.accountNumberText} numberOfLines={1}>
              {account.accountNumber}
            </Text>
          </View>

          <View style={styles.cardRightSection}>
            {isNegative && (
              <View style={[styles.badge, { backgroundColor: badgeBackgroundColor }]}>
                <Text style={[styles.badgeText, { color: badgeColor }]}>
                  ⚠ Negative
                </Text>
              </View>
            )}
            {!isNegative && (
              <View
                style={[styles.badge, { backgroundColor: badgeBackgroundColor }]}
              >
                <Text style={[styles.badgeText, { color: badgeColor }]}>
                  ✓ Positive
                </Text>
              </View>
            )}

            {expanded ? (
              <ChevronUp size={20} color={Colors.primary} />
            ) : (
              <ChevronDown size={20} color={Colors.primary} />
            )}
          </View>
        </View>

        <Text style={styles.statusPreview} numberOfLines={1}>
          {account.status}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.accountCardDetails}>
          <DetailRow label="Account Type" value={account.negativeType || "Standard"} />
          <DetailRow label="Status" value={account.status} />
          <DetailRow label="Balance" value={account.balance} />
          <DetailRow label="Opened" value={account.openDate} />
          <DetailRow label="Last Reported" value={account.lastReported} />

          {isNegative && onSelect && (
            <TouchableOpacity
              style={[
                styles.selectButton,
                isSelected && styles.selectButtonActive,
              ]}
              onPress={() => onSelect(account)}
            >
              <Text
                style={[
                  styles.selectButtonText,
                  isSelected && styles.selectButtonTextActive,
                ]}
              >
                {isSelected
                  ? "✓ Selected for Dispute"
                  : "Select for Dispute Letter"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * DetailRow component for displaying key-value pairs
 */
const DetailRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value || "N/A"}</Text>
  </View>
);

/**
 * Main AccountSummary component
 */
export const AccountSummary: React.FC<AccountSummaryProps> = ({
  accounts,
  bureau,
  onSelectNegativeAccounts,
}) => {
  const [expandedSection, setExpandedSection] = useState<
    "negative" | "positive" | "neutral" | null
  >("negative");
  const [selectedNegativeAccounts, setSelectedNegativeAccounts] = useState<
    ParsedAccount[]
  >([]);

  const categorized = useMemo(
    () => categorizeAccounts(accounts),
    [accounts]
  );

  const handleSelectAccount = (account: ParsedAccount) => {
    setSelectedNegativeAccounts((prev) => {
      const isAlreadySelected = prev.some(
        (a) =>
          a.creditor === account.creditor &&
          a.accountNumber === account.accountNumber
      );

      const updated = isAlreadySelected
        ? prev.filter(
            (a) =>
              !(
                a.creditor === account.creditor &&
                a.accountNumber === account.accountNumber
              )
          )
        : [...prev, account];

      onSelectNegativeAccounts?.(updated);
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (selectedNegativeAccounts.length === categorized.negative.length) {
      setSelectedNegativeAccounts([]);
      onSelectNegativeAccounts?.([]);
    } else {
      setSelectedNegativeAccounts(categorized.negative);
      onSelectNegativeAccounts?.(categorized.negative);
    }
  };

  const bureauDisplay = bureau
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Success Message */}
      <View style={styles.successBanner}>
        <CheckCircle size={24} color="#16a34a" />
        <View style={styles.successContent}>
          <Text style={styles.successTitle}>Credit Report Parsed Successfully</Text>
          <Text style={styles.successSubtitle}>
            Found {accounts.length} account{accounts.length !== 1 ? "s" : ""} from{" "}
            {bureauDisplay}
          </Text>
        </View>
      </View>

      {/* Account Summary Stats */}
      <View style={styles.statsContainer}>
        <StatCard
          icon="⚠"
          label="Negative"
          count={categorized.negative.length}
          color={Colors.danger}
        />
        <StatCard
          icon="✓"
          label="Positive"
          count={categorized.positive.length}
          color={Colors.success}
        />
        <StatCard
          icon="◎"
          label="Neutral"
          count={categorized.neutral.length}
          color="#6b7280"
        />
      </View>

      {/* Negative Accounts Section */}
      {categorized.negative.length > 0 && (
        <AccountSection
          title="Negative Accounts"
          icon="⚠"
          color={Colors.danger}
          count={categorized.negative.length}
          isExpanded={expandedSection === "negative"}
          onToggle={() =>
            setExpandedSection(
              expandedSection === "negative" ? null : "negative"
            )
          }
        >
          {expandedSection === "negative" && (
            <View>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={handleSelectAll}
              >
                <Text style={styles.selectAllButtonText}>
                  {selectedNegativeAccounts.length ===
                  categorized.negative.length
                    ? "Deselect All"
                    : "Select All for Dispute"}
                </Text>
              </TouchableOpacity>

              {categorized.negative.map((account, index) => (
                <AccountCard
                  key={`${account.creditor}-${account.accountNumber}-${index}`}
                  account={account}
                  isNegative={true}
                  isSelected={selectedNegativeAccounts.some(
                    (a) =>
                      a.creditor === account.creditor &&
                      a.accountNumber === account.accountNumber
                  )}
                  onSelect={handleSelectAccount}
                />
              ))}
            </View>
          )}
        </AccountSection>
      )}

      {/* Positive Accounts Section */}
      {categorized.positive.length > 0 && (
        <AccountSection
          title="Positive Accounts"
          icon="✓"
          color={Colors.success}
          count={categorized.positive.length}
          isExpanded={expandedSection === "positive"}
          onToggle={() =>
            setExpandedSection(
              expandedSection === "positive" ? null : "positive"
            )
          }
        >
          {expandedSection === "positive" &&
            categorized.positive.map((account, index) => (
              <AccountCard
                key={`${account.creditor}-${account.accountNumber}-${index}`}
                account={account}
                isNegative={false}
              />
            ))}
        </AccountSection>
      )}

      {/* Neutral Accounts Section */}
      {categorized.neutral.length > 0 && (
        <AccountSection
          title="Neutral/Other Accounts"
          icon="◎"
          color="#6b7280"
          count={categorized.neutral.length}
          isExpanded={expandedSection === "neutral"}
          onToggle={() =>
            setExpandedSection(
              expandedSection === "neutral" ? null : "neutral"
            )
          }
        >
          {expandedSection === "neutral" &&
            categorized.neutral.map((account, index) => (
              <AccountCard
                key={`${account.creditor}-${account.accountNumber}-${index}`}
                account={account}
                isNegative={false}
              />
            ))}
        </AccountSection>
      )}

      {/* No Negative Accounts Message */}
      {categorized.negative.length === 0 && (
        <View style={styles.noNegativesBanner}>
          <CheckCircle size={32} color={Colors.success} />
          <Text style={styles.noNegativesTitle}>
            No Negative Accounts Found
          </Text>
          <Text style={styles.noNegativesSubtitle}>
            Your credit report shows no derogatory accounts. All your accounts
            are in good standing.
          </Text>
        </View>
      )}

      {/* AI Agent Info Box */}
      <View style={styles.agentInfoBox}>
        <FileText size={18} color={Colors.primary} />
        <View style={styles.agentInfoContent}>
          <Text style={styles.agentInfoTitle}>AI Agent Reference</Text>
          <Text style={styles.agentInfoText}>
            This account summary has been saved and is available for the AI
            Agent to reference during conversations about your credit report.
          </Text>
        </View>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

/**
 * StatCard component for displaying summary statistics
 */
const StatCard: React.FC<{
  icon: string;
  label: string;
  count: number;
  color: string;
}> = ({ icon, label, count, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statCount}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/**
 * AccountSection component for collapsible sections
 */
const AccountSection: React.FC<{
  title: string;
  icon: string;
  color: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, icon, color, count, isExpanded, onToggle, children }) => (
  <View style={styles.sectionContainer}>
    <TouchableOpacity
      style={[styles.sectionHeader, { borderTopColor: color }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>
            {count} account{count !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>
      {isExpanded ? (
        <ChevronUp size={22} color={color} />
      ) : (
        <ChevronDown size={22} color={color} />
      )}
    </TouchableOpacity>
    {isExpanded && <View style={styles.sectionContent}>{children}</View>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  spacer: {
    height: 32,
  },

  // Success Banner
  successBanner: {
    flexDirection: "row",
    backgroundColor: "#d1fae5",
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: "center",
    gap: 12,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#065f46",
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 13,
    color: "#047857",
  },

  // Stats Container
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statCount: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },

  // Section Container
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 4,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  sectionCount: {
    fontSize: 12,
    color: "#6b7280",
  },
  sectionContent: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    padding: 12,
  },

  // Select All Button
  selectAllButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginBottom: 12,
  },
  selectAllButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  // Account Card
  accountCard: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    marginBottom: 10,
    overflow: "hidden",
  },
  accountCardExpanded: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  accountCardHeader: {
    padding: 12,
  },
  accountCardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  creditorInfo: {
    flex: 1,
    marginRight: 8,
  },
  creditorName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  accountNumberText: {
    fontSize: 12,
    color: "#6b7280",
  },
  cardRightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusPreview: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
  },
  accountCardDetails: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    padding: 12,
  },

  // Detail Row
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    flex: 0.35,
  },
  detailValue: {
    fontSize: 12,
    color: Colors.textPrimary,
    flex: 0.65,
    textAlign: "right",
  },

  // Select Button
  selectButton: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    alignItems: "center",
  },
  selectButtonActive: {
    backgroundColor: Colors.primary,
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  selectButtonTextActive: {
    color: "white",
  },

  // No Negatives Banner
  noNegativesBanner: {
    backgroundColor: "#d1fae5",
    borderRadius: 12,
    padding: 24,
    margin: 16,
    alignItems: "center",
  },
  noNegativesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#065f46",
    marginTop: 12,
    marginBottom: 8,
  },
  noNegativesSubtitle: {
    fontSize: 13,
    color: "#047857",
    textAlign: "center",
    lineHeight: 20,
  },

  // Agent Info Box
  agentInfoBox: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    gap: 12,
  },
  agentInfoContent: {
    flex: 1,
  },
  agentInfoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  agentInfoText: {
    fontSize: 12,
    color: "#0369a1",
    lineHeight: 18,
  },
});

export default AccountSummary;
