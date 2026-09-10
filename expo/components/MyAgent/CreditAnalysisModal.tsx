import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  X,
  FileSearch,
  AlertTriangle,
  CheckCircle2,
  FileText,
  TrendingDown,
  MessageCircle,
  Download,
  BarChart3,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/contexts/UserContext";
import CreditReportParser, {
  ParsedAccount,
} from "@/components/CreditReportParser";
import { AccountSummary } from "@/components/AccountSummary";
import { useEquifaxReport } from "@/contexts/EquifaxReportContext";
import type {
  ParsedCreditReport,
  ParsedNegativeAccount,
} from "@/backend/equifax/equifax-client";
import { generateEquifaxReportPDF } from "@/lib/pdf/equifax-report-pdf";

// ============================================================
// Types
// ============================================================

export interface AnalysisRecommendation {
  creditor: string;
  furnisherAddress?: string;
  accountNumber: string;
  negativeType: string;
  letterType: string;
  rationale: string;
  balance: string;
}

export interface CreditAnalysisResult {
  negativeCount: number;
  totalNegativeBalance: number;
  summary: string;
  recommendations: AnalysisRecommendation[];
}

export interface CreditAnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  agentName?: string;
  /** Generate a dispute letter for a specific recommendation. */
  onGenerateLetter?: (data: {
    letterType: string;
    creditorName: string;
    accountNumber: string;
    furnisherAddress?: string;
  }) => void;
  /** Continue the conversation about this analysis in chat. */
  onDiscussInChat?: (analysis: CreditAnalysisResult) => void;
}

// ============================================================
// Component
// ============================================================

export default function CreditAnalysisModal({
  visible,
  onClose,
  agentName = "your agent",
  onGenerateLetter,
  onDiscussInChat,
}: CreditAnalysisModalProps) {
  const { user } = useUser();
  const userId = user?.id || "";

  // Get multi-bureau report from Equifax context
  const { report: equifaxReport, negativeAccountsByBureau } = useEquifaxReport();

  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CreditAnalysisResult | null>(null);
  const [bureau, setBureau] = useState<string>("");
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [parsedAccounts, setParsedAccounts] = useState<ParsedAccount[]>([]);

  // Track which view is active: "upload" for manual upload, "equifax" for multi-bureau Equifax report
  const [activeView, setActiveView] = useState<"upload" | "equifax">("upload");
  const [fetchingEquifax, setFetchingEquifax] = useState(false);
  const [equifaxError, setEquifaxError] = useState<string | null>(null);

  const saveAnalysisMutation = trpc.aiAgents.saveCreditAnalysis.useMutation();
  const fetchEquifaxMutation = trpc.equifax.fetchCreditReport.useMutation();

  // Determine if we should show the Equifax multi-bureau view
  const hasEquifaxReport = useMemo(() => {
    return equifaxReport && equifaxReport.bureaus && Object.keys(equifaxReport.bureaus).length > 0;
  }, [equifaxReport]);

  // Fetch Equifax report
  const handleFetchEquifaxReport = useCallback(async () => {
    if (!userId) {
      setEquifaxError("You must be logged in to fetch your Equifax report. Please sign in and try again.");
      return;
    }

    setFetchingEquifax(true);
    setEquifaxError(null);

    try {
      const result = await fetchEquifaxMutation.mutateAsync({
        multiBureau: true,
      });

      if (!result.success) {
        setEquifaxError(result.error || "Failed to fetch Equifax report");
        return;
      }

      if (result.combined.totalAccounts === 0) {
        setEquifaxError("No credit data found. Please ensure your Equifax connection is active.");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to fetch Equifax report";
      setEquifaxError(errorMsg);
      console.error("Equifax fetch error:", error);
    } finally {
      setFetchingEquifax(false);
    }
  }, [userId, fetchEquifaxMutation]);

  // Handle parsed accounts from the WebView parser
  const handleAccountsParsed = useCallback(
    (accounts: ParsedAccount[], detectedBureau: string) => {
      setParseError(null);
      setBureau(detectedBureau);
      setParsedAccounts(accounts || []);

      if (!accounts || accounts.length === 0) {
        setParseError(
          "No accounts could be read from that report. Try pasting the report text directly, or upload a different PDF.",
        );
        return;
      }

      saveAnalysisMutation.mutate(
        {
          userId,
          bureau: detectedBureau,
          accounts: accounts.map((a) => ({
            creditor: a.creditor || "Unknown Creditor",
            furnisherAddress: a.furnisherAddress,
            accountNumber: a.accountNumber || "",
            balance: a.balance || "",
            status: a.status || "",
            openDate: a.openDate || "",
            lastReported: a.lastReported || "",
            negativeType: a.negativeType,
          })),
        },
        {
          onSuccess: (data) => {
            setAnalysis({
              negativeCount: data.negativeCount,
              totalNegativeBalance: data.totalNegativeBalance,
              summary: data.summary,
              recommendations:
                (data.recommendations as AnalysisRecommendation[]) || [],
            });
            if (!data.success) {
              setSaveWarning(
                "Analysis complete, but it couldn't be saved for later. Your agent may not remember it in a new chat session.",
              );
            } else {
              setSaveWarning(null);
            }
          },
          onError: (err) => {
            setParseError(
              err.message || "Could not analyze the report. Please try again.",
            );
          },
        },
      );
    },
    [userId, saveAnalysisMutation],
  );

  const handleReset = useCallback(() => {
    setAnalysis(null);
    setParseError(null);
    setSaveWarning(null);
    setBureau("");
    setParsedAccounts([]);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle PDF export for Equifax multi-bureau report
  const handleExportPDF = useCallback(() => {
    if (!equifaxReport) return;

    try {
      const html = generateEquifaxReportPDF(equifaxReport);
      
      // For web platform, use html2pdf library if available
      if (Platform.OS === "web") {
        const element = document.createElement("div");
        element.innerHTML = html;
        
        // Use html2pdf library (must be available in project)
        if ((window as any).html2pdf) {
          (window as any).html2pdf().set({
            margin: 10,
            filename: "credit-report.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
          }).save();
        } else {
          // Fallback: alert user to enable html2pdf
          alert("PDF export requires html2pdf library. Please add it to your project.");
        }
      } else {
        // For native platforms, would need different PDF generation approach
        alert("PDF export is currently available on web. On native, use your system's print-to-PDF feature.");
      }
    } catch (error) {
      console.error("PDF export error:", error);
      alert("Failed to export PDF. Please try again.");
    }
  }, [equifaxReport]);

  const isBusy = parsing || saveAnalysisMutation.isPending;

  // Render multi-bureau Equifax report section
  const renderEquifaxReport = () => {
    if (!equifaxReport) return null;

    const bureauList = [
      { key: "equifax", label: "Equifax", accounts: negativeAccountsByBureau.equifax },
      { key: "experian", label: "Experian", accounts: negativeAccountsByBureau.experian },
      { key: "transunion", label: "TransUnion", accounts: negativeAccountsByBureau.transunion },
    ];

    const totalNegative = Object.values(negativeAccountsByBureau).reduce((sum, accounts) => sum + accounts.length, 0);
    const averageScore = equifaxReport.combined.averageCreditScore;

    return (
      <>
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            {totalNegative === 0 ? (
              <CheckCircle2 size={22} color={Colors.success} />
            ) : (
              <TrendingDown size={22} color={Colors.warning} />
            )}
            <Text style={styles.summaryTitle}>
              {totalNegative === 0
                ? "No Negative Items Found"
                : `${totalNegative} Negative Item${totalNegative === 1 ? "" : "s"} Found`}
            </Text>
          </View>
          <Text style={styles.summarySubtitle}>Multi-Bureau Report</Text>
          <Text style={styles.summaryText}>
            Checked {equifaxReport.combined.totalBureaus} bureaus. Average credit score:{" "}
            {averageScore ? averageScore.toFixed(0) : "N/A"}
          </Text>
        </View>

        {/* Bureau tabs/sections */}
        <View style={styles.bureauTabs}>
          {bureauList.map(({ key, label, accounts }) => (
            <View key={key} style={styles.bureauSection}>
              <View style={styles.bureauHeader}>
                <View style={styles.bureauBadge}>
                  <Text style={styles.bureauBadgeText}>{label}</Text>
                </View>
                <Text style={styles.bureauCount}>
                  {accounts.length} negative {accounts.length === 1 ? "item" : "items"}
                </Text>
              </View>

              {accounts.length === 0 ? (
                <View style={styles.noBureauItems}>
                  <CheckCircle2 size={16} color={Colors.success} />
                  <Text style={styles.noBureauText}>No negative items</Text>
                </View>
              ) : (
                <View style={styles.bureauAccountsList}>
                  {accounts.map((account, idx) => (
                    <View key={`${account.accountNumber}-${idx}`} style={styles.accountCard}>
                      <View style={styles.accountCardHeader}>
                        <Text style={styles.accountCreditor}>{account.creditorName}</Text>
                        <Text style={styles.accountType}>{account.accountType}</Text>
                      </View>
                      <Text style={styles.accountNumber}>
                        {account.accountNumber}
                      </Text>
                      {account.balance && (
                        <Text style={styles.accountBalance}>
                          Balance: ${account.balance.toLocaleString()}
                        </Text>
                      )}
                      {account.status && (
                        <Text style={styles.accountStatus}>Status: {account.status}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* PDF Export Button */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportPDF}
          accessibilityRole="button"
          accessibilityLabel="Export report as PDF"
        >
          <Download size={18} color={Colors.white} />
          <Text style={styles.exportButtonText}>Export as PDF</Text>
        </TouchableOpacity>
      </>
    );
  };

  // Render main content
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <FileSearch size={20} color={Colors.primary} />
            <Text style={styles.headerTitle}>AI Dispute Assistant</Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close credit analysis"
          >
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* View selector (if both manual and Equifax reports available) */}
        <View style={styles.viewSelector}>
          <TouchableOpacity
            style={[
              styles.viewTab,
              activeView === "equifax" && styles.viewTabActive,
            ]}
            onPress={() => setActiveView("equifax")}
            accessibilityRole="button"
            accessibilityLabel="View Equifax report"
          >
            <BarChart3 size={16} color={activeView === "equifax" ? Colors.primary : Colors.textLight} />
            <Text
              style={[
                styles.viewTabText,
                activeView === "equifax" && styles.viewTabTextActive,
              ]}
            >
              Equifax Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewTab,
              activeView === "upload" && styles.viewTabActive,
            ]}
            onPress={() => setActiveView("upload")}
            accessibilityRole="button"
            accessibilityLabel="Upload new report"
          >
            <FileSearch size={16} color={activeView === "upload" ? Colors.primary : Colors.textLight} />
            <Text
              style={[
                styles.viewTabText,
                activeView === "upload" && styles.viewTabTextActive,
              ]}
            >
              Upload Report
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Busy state */}
          {isBusy ? (
            <View style={styles.busyBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.busyText}>
                {agentName} is analyzing your report...
              </Text>
            </View>
          ) : null}

          {/* Error */}
          {parseError && !isBusy ? (
            <View style={styles.errorBox}>
              <AlertTriangle size={18} color={Colors.warning} />
              <Text style={styles.errorText}>{parseError}</Text>
            </View>
          ) : null}

          {/* Equifax multi-bureau report view */}
          {activeView === "equifax" && hasEquifaxReport ? (
            renderEquifaxReport()
          ) : activeView === "equifax" && !hasEquifaxReport ? (
            <View style={styles.emptyStateContainer}>
              <BarChart3 size={64} color={Colors.primary} />
              <Text style={styles.emptyStateTitle}>Connect to Equifax</Text>
              <Text style={styles.emptyStateDesc}>
                Fetch your multi-bureau credit report directly from Equifax to see Equifax, Experian, and TransUnion data in one place.
              </Text>
              
              {equifaxError && (
                <View style={styles.errorBox}>
                  <AlertTriangle size={18} color={Colors.error} />
                  <Text style={styles.errorText}>{equifaxError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.fetchButton, fetchingEquifax && { opacity: 0.6 }]}
                onPress={handleFetchEquifaxReport}
                disabled={fetchingEquifax}
              >
                {fetchingEquifax ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Download size={20} color={Colors.white} />
                    <Text style={styles.fetchButtonText}>Fetch My Equifax Report</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.privacyNote}>
                ✓ Your data is secure and never stored on our servers. We only use it to help you understand your credit.
              </Text>
            </View>
          ) : null}

          {/* Upload / parse view */}
          {activeView === "upload" && !analysis && !isBusy ? (
            <>
              <Text style={styles.introTitle}>
                Let your agent read your credit report
              </Text>
              <Text style={styles.introDesc}>
                Upload a PDF or paste your report text. {agentName} will find
                every negative account and tell you exactly which dispute
                letter to send — and why.
              </Text>

              <View style={styles.privacyNote}>
                <Text style={styles.privacyText}>
                  Your report is parsed on your device. Only the extracted
                  account summary is stored so your agent can reference it in
                  chat.
                </Text>
              </View>

              <View style={styles.parserWrap}>
                <CreditReportParser
                  onAccountsParsed={handleAccountsParsed}
                  onError={(e) => setParseError(e)}
                  onLoadingChange={setParsing}
                />
              </View>
            </>
          ) : null}

          {/* Results */}
          {activeView === "upload" && analysis && !isBusy ? (
            <>
              {saveWarning ? (
                <View style={styles.warnBox}>
                  <AlertTriangle size={16} color={Colors.warning} />
                  <Text style={styles.warnText}>{saveWarning}</Text>
                </View>
              ) : null}

              {/* Summary card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  {analysis.negativeCount === 0 ? (
                    <CheckCircle2 size={22} color={Colors.success} />
                  ) : (
                    <TrendingDown size={22} color={Colors.warning} />
                  )}
                  <Text style={styles.summaryTitle}>
                    {analysis.negativeCount === 0
                      ? "No Negative Items Found"
                      : `${analysis.negativeCount} Negative Item${analysis.negativeCount === 1 ? "" : "s"} Found`}
                  </Text>
                </View>
                {bureau ? (
                  <Text style={styles.bureauTag}>Bureau: {bureau}</Text>
                ) : null}
                <Text style={styles.summaryText}>{analysis.summary}</Text>
              </View>

              {/* Full Account Summary */}
              {parsedAccounts.length > 0 ? (
                <View style={styles.accountSummaryWrap}>
                  <Text style={styles.sectionTitle}>Summary of Accounts</Text>
                  <AccountSummary
                    accounts={parsedAccounts}
                    bureau={bureau}
                    nested
                  />
                </View>
              ) : null}

              {/* Recommendations */}
              {analysis.recommendations.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>
                    Recommended Dispute Strategy
                  </Text>
                  <Text style={styles.sectionHint}>
                    Dispute one item at a time. Sending many letters at once can
                    get them flagged as frivolous.
                  </Text>

                  {analysis.recommendations.map((rec, i) => (
                    <View
                      key={`${rec.creditor}-${rec.accountNumber}-${i}`}
                      style={styles.recCard}
                    >
                      <View style={styles.recHeader}>
                        <Text style={styles.recIndex}>{i + 1}</Text>
                        <View style={styles.recHeaderText}>
                          <Text style={styles.recCreditor}>{rec.creditor}</Text>
                          <Text style={styles.recMeta}>
                            {rec.negativeType}
                            {rec.balance ? ` · ${rec.balance}` : ""}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.recLetterRow}>
                        <FileText size={14} color={Colors.primary} />
                        <Text style={styles.recLetterType}>
                          {rec.letterType}
                        </Text>
                      </View>

                      <Text style={styles.recRationale}>{rec.rationale}</Text>

                      {onGenerateLetter ? (
                        <TouchableOpacity
                          style={styles.recButton}
                          onPress={() =>
                            onGenerateLetter({
                              letterType: rec.letterType,
                              creditorName: rec.creditor,
                              accountNumber: rec.accountNumber,
                              furnisherAddress: rec.furnisherAddress,
                            })
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Generate ${rec.letterType} for ${rec.creditor}`}
                        >
                          <Text style={styles.recButtonText}>
                            Generate This Letter
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                </>
              ) : null}

              {/* Footer actions */}
              <View style={styles.footerActions}>
                {onDiscussInChat ? (
                  <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={() => onDiscussInChat(analysis)}
                    accessibilityRole="button"
                    accessibilityLabel="Discuss this analysis with your agent"
                  >
                    <MessageCircle size={18} color={Colors.white} />
                    <Text style={styles.primaryActionText}>
                      Discuss With {agentName}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={handleReset}
                  accessibilityRole="button"
                  accessibilityLabel="Analyze another report"
                >
                  <Text style={styles.secondaryActionText}>
                    Analyze Another Report
                  </Text>
                </TouchableOpacity>
              </View>
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
  headerTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  closeButton: { padding: 4 },

  // View selector tabs
  viewSelector: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  viewTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  viewTabActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  viewTabText: { fontSize: 13, fontWeight: "600", color: Colors.textLight },
  viewTabTextActive: { color: Colors.primary },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  busyBox: { alignItems: "center", paddingVertical: 48, gap: 14 },
  busyText: { fontSize: 15, color: Colors.textLight, textAlign: "center" },

  errorBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: Colors.warning + "15",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  errorText: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 19 },

  warnBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.warning + "15",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  warnText: { flex: 1, fontSize: 12, color: Colors.textLight, lineHeight: 17 },

  introTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  introDesc: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 21,
    marginBottom: 14,
  },
  privacyNote: {
    backgroundColor: Colors.primary + "10",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  privacyText: { fontSize: 12, color: Colors.textLight, lineHeight: 18 },
  parserWrap: {
    minHeight: 420,
    borderRadius: 12,
    overflow: "hidden",
    ...(Platform.OS === "web" ? {} : { flex: 1 }),
  },

  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountSummaryWrap: {
    marginBottom: 20,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  summaryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  summarySubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  bureauTag: { fontSize: 12, color: Colors.textLight, marginBottom: 8 },
  summaryText: { fontSize: 14, color: Colors.textLight, lineHeight: 21 },

  // Bureau sections
  bureauTabs: {
    marginBottom: 20,
  },
  bureauSection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bureauHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  bureauBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bureauBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.white,
  },
  bureauCount: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textLight,
  },
  noBureauItems: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    justifyContent: "center",
  },
  noBureauText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  bureauAccountsList: {
    gap: 10,
  },
  accountCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  accountCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  accountCreditor: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  accountType: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.warning,
    backgroundColor: Colors.warning + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  accountNumber: {
    fontSize: 12,
    color: Colors.textLight,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: "600",
    marginBottom: 2,
  },
  accountStatus: {
    fontSize: 11,
    color: Colors.textLight,
  },

  // Export button
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },

  // Equifax empty state
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  emptyStateDesc: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: "center",
    lineHeight: 20,
  },
  fetchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginVertical: 12,
    minHeight: 48,
  },
  fetchButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 18,
    marginBottom: 14,
  },

  recCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  recIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 24,
    overflow: "hidden",
  },
  recHeaderText: { flex: 1 },
  recCreditor: { fontSize: 15, fontWeight: "600", color: Colors.text },
  recMeta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  recLetterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  recLetterType: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  recRationale: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 19,
    marginTop: 6,
  },
  recButton: {
    marginTop: 12,
    backgroundColor: Colors.primary + "15",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  recButtonText: { fontSize: 13, fontWeight: "700", color: Colors.primary },

  footerActions: { marginTop: 12, gap: 10 },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryActionText: { fontSize: 15, fontWeight: "700", color: Colors.white },
  secondaryAction: { alignItems: "center", paddingVertical: 12 },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textLight,
  },
});
