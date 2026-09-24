import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  X,
  LayoutDashboard,
  Building2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Upload,
  ChevronRight,
  Clock,
  Wallet,
  FileSearch,
  CreditCard,
  Shield,
  Bell,
  Activity,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/contexts/UserContext";
import { useEquifaxReport } from "@/contexts/EquifaxReportContext";

// ============================================================
// CreditSummaryDashboard — the "all three bureaus in one place"
// view. Hero total of every negative item found across every
// saved report, one tile per bureau (including bureaus with no
// report on file), and a breakdown by negative-item type.
//
// Detailed per-account work stays in NegativeAccountsDashboard;
// this view answers "where do I stand overall?"
// ============================================================

// ============================================================
// Types — mirror of getBureauDashboard's response
// ============================================================

interface NegativeAccountEntry {
  creditor: string;
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

export interface CreditSummaryDashboardProps {
  visible: boolean;
  onClose: () => void;
  /** Jump to the detailed per-bureau negative accounts view. */
  onViewBreakdown?: () => void;
  /** Jump to the report upload/analysis modal. */
  onUploadReport?: () => void;
}

// ============================================================
// Helpers
// ============================================================

const ALL_BUREAUS = ["Experian", "Equifax", "TransUnion"];

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ============================================================
// Component
// ============================================================

export default function CreditSummaryDashboard({
  visible,
  onClose,
  onViewBreakdown,
  onUploadReport,
}: CreditSummaryDashboardProps) {
  const { user } = useUser();
  const userId = user?.id || "";

  // Live Consumer Data Suite data pulled this session (credit report + monitoring)
  const { report: liveReport, getSummary, monitoring } = useEquifaxReport();
  const liveSummary = getSummary("equifax");
  const hasLiveReport = !!liveReport;

  const summaryQuery = trpc.aiAgents.getBureauDashboard.useQuery(
    { userId },
    { enabled: visible && !!userId, staleTime: 15_000 },
  );

  const bureaus = useMemo<BureauEntry[]>(
    () => summaryQuery.data?.bureaus ?? [],
    [summaryQuery.data],
  );

  // Tiles for all three bureaus, so a bureau with no saved report
  // still shows as an explicit "not on file" slot rather than
  // silently disappearing from the picture.
  const bureauTiles = useMemo(() => {
    return ALL_BUREAUS.map((name) => {
      const entry = bureaus.find(
        (b) => b.bureau.toLowerCase() === name.toLowerCase(),
      );
      return { name, entry: entry ?? null };
    });
  }, [bureaus]);

  // Aggregate numbers across every saved report.
  const totals = useMemo(() => {
    const negativeCount = bureaus.reduce((n, b) => n + b.negativeCount, 0);
    const totalAccounts = bureaus.reduce((n, b) => n + b.totalAccounts, 0);
    const negativeBalance = bureaus.reduce(
      (n, b) => n + b.totalNegativeBalance,
      0,
    );
    const lastUpdated = bureaus.reduce<string | null>((latest, b) => {
      if (!latest || b.createdAt > latest) return b.createdAt;
      return latest;
    }, null);

    // How often each negative type shows up across all bureaus —
    // helps the user see "collections are my main problem".
    const typeCounts = new Map<string, number>();
    for (const b of bureaus) {
      for (const acct of b.negativeAccounts) {
        const type = acct.negativeType || "Other";
        typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
      }
    }
    const typeBreakdown = [...typeCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      negativeCount,
      totalAccounts,
      negativeBalance,
      lastUpdated,
      typeBreakdown,
      reportsOnFile: bureaus.length,
    };
  }, [bureaus]);

  const isLoading = summaryQuery.isLoading;
  const isEmpty = !isLoading && bureaus.length === 0 && !hasLiveReport;
  const hasNegatives = totals.negativeCount > 0;

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
            <LayoutDashboard size={20} color={Colors.primary} />
            <Text style={styles.headerTitle}>Credit Summary</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close credit summary"
          >
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Live Consumer Data Suite summary (this session) ── */}
          {liveSummary ? (
            <View style={styles.liveCard}>
              <View style={styles.liveHeader}>
                <CreditCard size={18} color={Colors.primary} />
                <Text style={styles.liveTitle}>Your Credit Snapshot</Text>
              </View>
              <View style={styles.liveGrid}>
                {[
                  {
                    label: "Credit Score",
                    value: liveSummary.creditScore
                      ? String(liveSummary.creditScore)
                      : "—",
                  },
                  {
                    label: "Open Accounts",
                    value: String(liveSummary.openAccounts),
                  },
                  {
                    label: "Utilization",
                    value:
                      typeof liveSummary.creditUtilization === "number"
                        ? `${liveSummary.creditUtilization.toFixed(0)}%`
                        : "—",
                  },
                  {
                    label: "Collections",
                    value: String(liveSummary.collections),
                  },
                  {
                    label: "Public Records",
                    value: String(liveSummary.publicRecords),
                  },
                  {
                    label: "Inquiries",
                    value: String(liveSummary.inquiries),
                  },
                  {
                    label: "Total Balance",
                    value:
                      typeof liveSummary.totalBalance === "number"
                        ? formatCurrency(liveSummary.totalBalance)
                        : "—",
                  },
                  {
                    label: "Credit Limit",
                    value:
                      typeof liveSummary.totalCreditLimit === "number"
                        ? formatCurrency(liveSummary.totalCreditLimit)
                        : "—",
                  },
                  {
                    label: "Credit History",
                    value:
                      typeof liveSummary.lengthOfCreditHistoryMonths === "number"
                        ? `${Math.round(liveSummary.lengthOfCreditHistoryMonths)} mo`
                        : "—",
                  },
                ].map((s) => (
                  <View key={s.label} style={styles.liveGridItem}>
                    <Text style={styles.liveGridValue}>{s.value}</Text>
                    <Text style={styles.liveGridLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── Credit monitoring alerts (this session) ── */}
          {monitoring ? (
            <View style={styles.liveCard}>
              <View style={styles.liveHeader}>
                <Shield size={18} color={Colors.primary} />
                <Text style={styles.liveTitle}>Credit Monitoring</Text>
              </View>
              {monitoring.alerts.length > 0 ? (
                <View style={styles.monitoringList}>
                  {monitoring.alerts.slice(0, 8).map((alert) => {
                    const tone =
                      alert.severity === "critical"
                        ? Colors.error
                        : alert.severity === "warning"
                          ? Colors.warning
                          : Colors.textLight;
                    return (
                      <View key={alert.id} style={styles.monitoringAlert}>
                        <View
                          style={[styles.monitoringDot, { backgroundColor: tone }]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.monitoringAlertTitle}>
                            {alert.title}
                          </Text>
                          {alert.description ? (
                            <Text style={styles.monitoringAlertDesc}>
                              {alert.description}
                            </Text>
                          ) : null}
                          <Text style={styles.monitoringAlertMeta}>
                            {alert.bureau} ·{" "}
                            {new Date(alert.date).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.monitoringEmpty}>
                  <CheckCircle2 size={16} color={Colors.success} />
                  <Text style={styles.monitoringEmptyText}>
                    No new changes detected on your credit file.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {isLoading ? (
            <View style={styles.busyBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.busyText}>Tallying your reports...</Text>
            </View>
          ) : null}

          {isEmpty ? (
            <View style={styles.emptyBox}>
              <FileSearch size={32} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>Nothing to summarize yet</Text>
              <Text style={styles.emptyDesc}>
                Once you upload or pull a report from Experian, Equifax, or
                TransUnion, this view combines all three into one overall
                picture of your negative items.
              </Text>
              {onUploadReport ? (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={onUploadReport}
                  accessibilityRole="button"
                  accessibilityLabel="Upload a credit report"
                >
                  <Upload size={15} color={Colors.white} />
                  <Text style={styles.emptyButtonText}>Upload a Report</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {!isLoading && bureaus.length > 0 ? (
            <>
              {/* ── Hero: total negative items across the board ──── */}
              <LinearGradient
                colors={Colors.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <Text style={styles.heroLabel}>
                  NEGATIVE ITEMS — ALL BUREAUS
                </Text>
                <Text style={styles.heroNumber}>{totals.negativeCount}</Text>
                <Text style={styles.heroSub}>
                  {hasNegatives
                    ? `across ${totals.reportsOnFile} report${totals.reportsOnFile === 1 ? "" : "s"} on file`
                    : "Nothing negative found in any saved report"}
                </Text>

                <View style={styles.heroDivider} />
                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStat}>
                    <Wallet size={14} color={Colors.white} />
                    <Text style={styles.heroStatValue}>
                      {formatCurrency(totals.negativeBalance)}
                    </Text>
                    <Text style={styles.heroStatLabel}>Disputed balance</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <FileText size={14} color={Colors.white} />
                    <Text style={styles.heroStatValue}>
                      {totals.totalAccounts}
                    </Text>
                    <Text style={styles.heroStatLabel}>Accounts reviewed</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Clock size={14} color={Colors.white} />
                    <Text style={styles.heroStatValue}>
                      {totals.lastUpdated
                        ? formatDate(totals.lastUpdated)
                        : "—"}
                    </Text>
                    <Text style={styles.heroStatLabel}>Last updated</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* ── Per-bureau tiles ─────────────────────────────── */}
              <Text style={styles.sectionTitle}>By Bureau</Text>
              <View style={styles.tilesRow}>
                {bureauTiles.map(({ name, entry }) => {
                  const hasReport = !!entry;
                  const bureauNegatives = entry?.negativeCount ?? 0;
                  return (
                    <View key={name} style={styles.tile}>
                      <View style={styles.tileHead}>
                        <Building2
                          size={13}
                          color={
                            !hasReport
                              ? Colors.textLight
                              : bureauNegatives > 0
                                ? Colors.warning
                                : Colors.success
                          }
                        />
                        <Text
                          style={[
                            styles.tileName,
                            !hasReport && styles.tileNameMuted,
                          ]}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                      </View>
                      {hasReport ? (
                        <>
                          <Text
                            style={[
                              styles.tileCount,
                              {
                                color:
                                  bureauNegatives > 0
                                    ? Colors.warning
                                    : Colors.success,
                              },
                            ]}
                          >
                            {bureauNegatives}
                          </Text>
                          <Text style={styles.tileMeta}>
                            {bureauNegatives === 0
                              ? "all clear"
                              : `negative item${bureauNegatives === 1 ? "" : "s"}`}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.tileCount, styles.tileCountMuted]}>
                            —
                          </Text>
                          <Text style={styles.tileMeta}>not on file</Text>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>

              {totals.reportsOnFile < ALL_BUREAUS.length ? (
                <View style={styles.missingNote}>
                  <AlertTriangle size={13} color={Colors.warning} />
                  <Text style={styles.missingNoteText}>
                    {ALL_BUREAUS.length - totals.reportsOnFile} of 3 bureaus
                    {ALL_BUREAUS.length - totals.reportsOnFile === 1
                      ? " has"
                      : " have"}{" "}
                    no report on file — the total only covers what you've
                    uploaded so far.
                  </Text>
                </View>
              ) : null}

              {/* ── Negative-type breakdown ──────────────────────── */}
              {totals.typeBreakdown.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>What You're Disputing</Text>
                  <View style={styles.typeCard}>
                    {totals.typeBreakdown.map(({ type, count }, i) => {
                      const max = totals.typeBreakdown[0].count;
                      return (
                        <View
                          key={type}
                          style={[
                            styles.typeRow,
                            i > 0 && styles.typeRowBorder,
                          ]}
                        >
                          <Text style={styles.typeName} numberOfLines={1}>
                            {type}
                          </Text>
                          <View style={styles.typeBarTrack}>
                            <View
                              style={[
                                styles.typeBarFill,
                                { width: `${Math.max(8, (count / max) * 100)}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.typeCount}>
                            {count}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : (
                <View style={styles.allClearBox}>
                  <CheckCircle2 size={18} color={Colors.success} />
                  <Text style={styles.allClearText}>
                    Every account on file came back clean. Focus on keeping
                    utilization low and payments on time.
                  </Text>
                </View>
              )}

              {/* ── Jump to detail ───────────────────────────────── */}
              {onViewBreakdown ? (
                <TouchableOpacity
                  style={styles.breakdownButton}
                  onPress={onViewBreakdown}
                  accessibilityRole="button"
                  accessibilityLabel="View every negative account by bureau"
                >
                  <FileSearch size={16} color={Colors.primary} />
                  <Text style={styles.breakdownButtonText}>
                    View Every Negative Account
                  </Text>
                  <ChevronRight size={16} color={Colors.textLight} />
                </TouchableOpacity>
              ) : null}
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

  // Live Consumer Data Suite summary + monitoring
  liveCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  liveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  liveTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  liveGrid: { flexDirection: "row", flexWrap: "wrap" },
  liveGridItem: { width: "33.33%", paddingVertical: 8 },
  liveGridValue: { fontSize: 17, fontWeight: "700", color: Colors.text },
  liveGridLabel: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  monitoringList: { gap: 12 },
  monitoringAlert: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  monitoringDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  monitoringAlertTitle: { fontSize: 14, fontWeight: "600", color: Colors.text },
  monitoringAlertDesc: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
    lineHeight: 18,
  },
  monitoringAlertMeta: { fontSize: 11, color: Colors.textLight, marginTop: 4 },
  monitoringEmpty: { flexDirection: "row", alignItems: "center", gap: 8 },
  monitoringEmptyText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 19,
  },

  busyBox: { alignItems: "center", paddingVertical: 48, gap: 14 },
  busyText: { fontSize: 15, color: Colors.textLight, textAlign: "center" },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 10,
  },
  emptyButtonText: { fontSize: 14, fontWeight: "700", color: Colors.white },

  // ── Hero ─────────────────────────────────────────────────────
  hero: {
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 1.6,
  },
  heroNumber: {
    fontSize: 64,
    fontWeight: "800",
    color: Colors.white,
    lineHeight: 72,
    marginTop: 4,
  },
  heroSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: -2,
  },
  heroDivider: {
    alignSelf: "stretch",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginTop: 18,
    marginBottom: 14,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    alignSelf: "stretch",
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.18)" },
  heroStatValue: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.white,
    textAlign: "center",
  },
  heroStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },

  // ── Sections ─────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginTop: 22,
    marginBottom: 10,
    textTransform: "uppercase",
  },

  // ── Bureau tiles ─────────────────────────────────────────────
  tilesRow: { flexDirection: "row", gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  tileHead: { flexDirection: "row", alignItems: "center", gap: 5 },
  tileName: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text,
  },
  tileNameMuted: { color: Colors.textLight },
  tileCount: { fontSize: 26, fontWeight: "800", lineHeight: 30 },
  tileCountMuted: { color: Colors.textLight, fontWeight: "600" },
  tileMeta: { fontSize: 10, color: Colors.textLight, textAlign: "center" },

  missingNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: Colors.warningLight,
    borderRadius: 10,
    padding: 11,
    marginTop: 10,
  },
  missingNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    lineHeight: 17,
  },

  // ── Type breakdown ───────────────────────────────────────────
  typeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  typeRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  typeName: {
    width: 110,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },
  typeBarTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.surfaceAlt,
    overflow: "hidden",
  },
  typeBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  typeCount: {
    width: 24,
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "right",
  },

  allClearBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: Colors.successLight,
    borderRadius: 12,
    padding: 14,
  },
  allClearText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },

  // ── Detail link ──────────────────────────────────────────────
  breakdownButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 15,
    marginTop: 22,
  },
  breakdownButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
});
