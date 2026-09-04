import React, { useState, useCallback } from "react";
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
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/contexts/UserContext";
import CreditReportParser, {
  ParsedAccount,
} from "@/components/CreditReportParser";

// ============================================================
// Types
// ============================================================

export interface AnalysisRecommendation {
  creditor: string;
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

  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CreditAnalysisResult | null>(null);
  const [bureau, setBureau] = useState<string>("");
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  const saveAnalysisMutation = trpc.aiAgents.saveCreditAnalysis.useMutation();

  // ── Handle parsed accounts from the WebView parser ─────────
  const handleAccountsParsed = useCallback(
    (accounts: ParsedAccount[], detectedBureau: string) => {
      setParseError(null);
      setBureau(detectedBureau);

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
            // Persistence can fail if migration 022 hasn't been run.
            // The analysis is still valid — warn rather than hide it.
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
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const isBusy = parsing || saveAnalysisMutation.isPending;

  // ── Render ─────────────────────────────────────────────────
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Busy state ───────────────────────────────── */}
          {isBusy ? (
            <View style={styles.busyBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.busyText}>
                {agentName} is analyzing your report...
              </Text>
            </View>
          ) : null}

          {/* ── Error ────────────────────────────────────── */}
          {parseError && !isBusy ? (
            <View style={styles.errorBox}>
              <AlertTriangle size={18} color={Colors.warning} />
              <Text style={styles.errorText}>{parseError}</Text>
            </View>
          ) : null}

          {/* ── Upload / parse view ──────────────────────── */}
          {!analysis && !isBusy ? (
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

          {/* ── Results ──────────────────────────────────── */}
          {analysis && !isBusy ? (
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
  bureauTag: { fontSize: 12, color: Colors.textLight, marginBottom: 8 },
  summaryText: { fontSize: 14, color: Colors.textLight, lineHeight: 21 },

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
