import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  X,
  FileSearch,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Building2,
  MapPin,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/contexts/UserContext";

// ============================================================
// Types
// ============================================================

interface NegativeAccountEntry {
  creditor: string;
  furnisherAddress?: string;
  accountNumber: string;
  negativeType: string;
  letterType: string;
  rationale: string;
  balance: string;
}

interface BureauEntry {
  analysisId: number;
  bureau: string;
  createdAt: string;
  totalAccounts: number;
  negativeCount: number;
  totalNegativeBalance: number;
  summary: string;
  negativeAccounts: NegativeAccountEntry[];
}

export interface NegativeAccountsDashboardProps {
  visible: boolean;
  onClose: () => void;
  /** Jump straight into letter generation for a specific negative account. */
  onGenerateLetter?: (data: {
    letterType: string;
    creditorName: string;
    accountNumber: string;
    furnisherAddress?: string;
  }) => void;
}

// ============================================================
// Helpers
// ============================================================

const BUREAU_ORDER = ["Experian", "Equifax", "TransUnion"];

function sortBureaus(bureaus: BureauEntry[]): BureauEntry[] {
  return [...bureaus].sort((a, b) => {
    const ai = BUREAU_ORDER.indexOf(a.bureau);
    const bi = BUREAU_ORDER.indexOf(b.bureau);
    if (ai === -1 && bi === -1) return a.bureau.localeCompare(b.bureau);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// ============================================================
// Component
// ============================================================

export default function NegativeAccountsDashboard({
  visible,
  onClose,
  onGenerateLetter,
}: NegativeAccountsDashboardProps) {
  const { user } = useUser();
  const userId = user?.id || "";

  const [expandedBureau, setExpandedBureau] = useState<string | null>(null);
  const [expandedAccountKey, setExpandedAccountKey] = useState<string | null>(
    null,
  );

  const dashboardQuery = trpc.aiAgents.getBureauDashboard.useQuery(
    { userId },
    { enabled: visible && !!userId, staleTime: 15_000 },
  );

  const toggleBureau = useCallback((bureau: string) => {
    setExpandedBureau((prev) => (prev === bureau ? null : bureau));
    setExpandedAccountKey(null);
  }, []);

  const toggleAccount = useCallback((key: string) => {
    setExpandedAccountKey((prev) => (prev === key ? null : key));
  }, []);

  const bureaus = sortBureaus(dashboardQuery.data?.bureaus || []);
  const isLoading = dashboardQuery.isLoading;
  const isEmpty = !isLoading && bureaus.length === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <FileSearch size={20} color={Colors.primary} />
            <Text style={styles.headerTitle}>Negative Accounts by Bureau</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close negative accounts dashboard"
          >
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {isLoading ? (
            <View style={styles.busyBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.busyText}>Loading your saved reports...</Text>
            </View>
          ) : null}

          {isEmpty ? (
            <View style={styles.emptyBox}>
              <FileSearch size={32} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No reports uploaded yet</Text>
              <Text style={styles.emptyDesc}>
                Upload a credit report from Experian, Equifax, or TransUnion
                and it will show up here, grouped by bureau, with every
                negative account ready to dispute.
              </Text>
            </View>
          ) : null}

          {!isLoading && bureaus.length > 0 ? (
            <>
              <Text style={styles.introText}>
                Each card below shows your most recently uploaded report for
                that bureau. Tap a bureau to see its negative accounts, then
                tap an account for the furnisher's details and a recommended
                dispute letter.
              </Text>

              {bureaus.map((b) => {
                const isExpanded = expandedBureau === b.bureau;
                const hasNegatives = b.negativeCount > 0;

                return (
                  <View key={b.bureau} style={styles.bureauCard}>
                    <TouchableOpacity
                      style={styles.bureauHeader}
                      onPress={() => toggleBureau(b.bureau)}
                      accessibilityRole="button"
                      accessibilityLabel={`${b.bureau}: ${b.negativeCount} negative accounts`}
                    >
                      <View style={styles.bureauHeaderLeft}>
                        <Building2
                          size={18}
                          color={hasNegatives ? Colors.warning : Colors.success}
                        />
                        <View>
                          <Text style={styles.bureauName}>{b.bureau}</Text>
                          <Text style={styles.bureauMeta}>
                            {b.totalAccounts} account
                            {b.totalAccounts === 1 ? "" : "s"} reviewed
                          </Text>
                        </View>
                      </View>

                      <View style={styles.bureauHeaderRight}>
                        <View
                          style={[
                            styles.countBadge,
                            {
                              backgroundColor: hasNegatives
                                ? Colors.warning + "20"
                                : Colors.success + "20",
                            },
                          ]}
                        >
                          {hasNegatives ? (
                            <AlertTriangle size={13} color={Colors.warning} />
                          ) : (
                            <CheckCircle2 size={13} color={Colors.success} />
                          )}
                          <Text
                            style={[
                              styles.countBadgeText,
                              {
                                color: hasNegatives
                                  ? Colors.warning
                                  : Colors.success,
                              },
                            ]}
                          >
                            {b.negativeCount} negative
                          </Text>
                        </View>
                        {isExpanded ? (
                          <ChevronUp size={18} color={Colors.textLight} />
                        ) : (
                          <ChevronDown size={18} color={Colors.textLight} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {isExpanded ? (
                      <View style={styles.bureauBody}>
                        <Text style={styles.bureauSummary}>{b.summary}</Text>

                        {b.negativeAccounts.length === 0 ? (
                          <View style={styles.noNegBox}>
                            <CheckCircle2 size={16} color={Colors.success} />
                            <Text style={styles.noNegText}>
                              No negative accounts on this report.
                            </Text>
                          </View>
                        ) : (
                          b.negativeAccounts.map((acct, i) => {
                            const key = `${b.bureau}-${acct.creditor}-${acct.accountNumber}-${i}`;
                            const accountOpen = expandedAccountKey === key;
                            return (
                              <View key={key} style={styles.acctCard}>
                                <TouchableOpacity
                                  style={styles.acctHeader}
                                  onPress={() => toggleAccount(key)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${acct.creditor} details`}
                                >
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.acctCreditor}>
                                      {acct.creditor}
                                    </Text>
                                    <Text style={styles.acctMeta}>
                                      {acct.negativeType}
                                      {acct.balance
                                        ? ` \u00b7 ${acct.balance}`
                                        : ""}
                                    </Text>
                                  </View>
                                  {accountOpen ? (
                                    <ChevronUp
                                      size={16}
                                      color={Colors.textLight}
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={16}
                                      color={Colors.textLight}
                                    />
                                  )}
                                </TouchableOpacity>

                                {accountOpen ? (
                                  <View style={styles.acctDetails}>
                                    {acct.accountNumber ? (
                                      <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>
                                          Account #
                                        </Text>
                                        <Text style={styles.detailValue}>
                                          {acct.accountNumber}
                                        </Text>
                                      </View>
                                    ) : null}
                                    <View style={styles.detailRow}>
                                      <Text style={styles.detailLabel}>
                                        Status
                                      </Text>
                                      <Text style={styles.detailValue}>
                                        {acct.negativeType}
                                      </Text>
                                    </View>
                                    {acct.balance ? (
                                      <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>
                                          Balance
                                        </Text>
                                        <Text style={styles.detailValue}>
                                          {acct.balance}
                                        </Text>
                                      </View>
                                    ) : null}
                                    {acct.furnisherAddress ? (
                                      <View style={styles.addressBox}>
                                        <MapPin
                                          size={14}
                                          color={Colors.textLight}
                                        />
                                        <Text style={styles.addressText}>
                                          {acct.furnisherAddress}
                                        </Text>
                                      </View>
                                    ) : null}

                                    <View style={styles.letterRow}>
                                      <FileText
                                        size={13}
                                        color={Colors.primary}
                                      />
                                      <Text style={styles.letterType}>
                                        {acct.letterType}
                                      </Text>
                                    </View>
                                    <Text style={styles.rationale}>
                                      {acct.rationale}
                                    </Text>

                                    {onGenerateLetter ? (
                                      <TouchableOpacity
                                        style={styles.generateButton}
                                        onPress={() =>
                                          onGenerateLetter({
                                            letterType: acct.letterType,
                                            creditorName: acct.creditor,
                                            accountNumber: acct.accountNumber,
                                            furnisherAddress: acct.furnisherAddress,
                                          })
                                        }
                                        accessibilityRole="button"
                                        accessibilityLabel={`Generate ${acct.letterType} for ${acct.creditor}`}
                                      >
                                        <Text style={styles.generateButtonText}>
                                          Generate This Letter
                                        </Text>
                                      </TouchableOpacity>
                                    ) : null}
                                  </View>
                                ) : null}
                              </View>
                            );
                          })
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  closeButton: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  busyBox: { alignItems: "center", paddingVertical: 48, gap: 14 },
  busyText: { fontSize: 15, color: Colors.textLight, textAlign: "center" },

  emptyBox: { alignItems: "center", paddingVertical: 48, gap: 10, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: "center",
    lineHeight: 19,
  },

  introText: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 19,
    marginBottom: 16,
  },

  bureauCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  bureauHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  bureauHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  bureauName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  bureauMeta: { fontSize: 12, color: Colors.textLight, marginTop: 1 },
  bureauHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  countBadgeText: { fontSize: 12, fontWeight: "700" },

  bureauBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  bureauSummary: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 19,
    marginBottom: 12,
  },

  noNegBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.success + "15",
    borderRadius: 10,
    padding: 12,
  },
  noNegText: { fontSize: 13, color: Colors.text },

  acctCard: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: "hidden",
  },
  acctHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  acctCreditor: { fontSize: 14, fontWeight: "600", color: Colors.text },
  acctMeta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },

  acctDetails: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  detailLabel: { fontSize: 12, color: Colors.textLight },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    maxWidth: "65%",
    textAlign: "right",
  },

  addressBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: Colors.primary + "10",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  addressText: { flex: 1, fontSize: 12, color: Colors.text, lineHeight: 17 },

  letterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  letterType: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  rationale: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 18,
    marginTop: 6,
  },

  generateButton: {
    marginTop: 12,
    backgroundColor: Colors.primary + "15",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  generateButtonText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
});
