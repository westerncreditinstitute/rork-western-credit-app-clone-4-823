import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import {
  X,
  ClipboardList,
  Search,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Copy,
  Check,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useDisputes, Dispute } from "@/contexts/DisputesContext";
import * as Clipboard from "expo-clipboard";

// ============================================================
// Constants — mirror app/dispute-tracker.tsx
// ============================================================

const STATUSES = ["all", "sent", "in-progress", "resolved", "rejected"] as const;
const STATUS_META: Record<
  Dispute["status"],
  { label: string; color: string; icon: typeof Clock }
> = {
  sent: { label: "Sent", color: Colors.info, icon: Clock },
  "in-progress": { label: "In Progress", color: Colors.warning, icon: AlertTriangle },
  resolved: { label: "Resolved", color: Colors.success, icon: CheckCircle },
  rejected: { label: "Rejected", color: Colors.error, icon: XCircle },
};

// ============================================================
// Props
// ============================================================

export interface DisputeTrackerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called when dispute data changes (used to refresh chat context) */
  onDataChanged?: () => void;
}

// ============================================================
// Component
// ============================================================

export default function DisputeTrackerModal({
  visible,
  onClose,
  onDataChanged,
}: DisputeTrackerModalProps) {
  const {
    disputes,
    isLoading,
    createDispute,
    updateDispute,
    deleteDispute,
    addNote,
    refetch,
  } = useDisputes();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newDispute, setNewDispute] = useState({
    creditor: "",
    accountNumber: "",
    disputeType: "609 Letter",
    dateSent: new Date().toISOString().split("T")[0],
    status: "sent" as Dispute["status"],
    notes: "",
  });

  // ── Filtered disputes ─────────────────────────────────────────
  const filteredDisputes = useMemo(() => {
    return disputes.filter((d) => {
      const matchesSearch =
        d.creditor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.accountNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.disputeType?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [disputes, searchQuery, statusFilter]);

  // ── Stats summary ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = disputes.length;
    const sent = disputes.filter((d) => d.status === "sent").length;
    const inProgress = disputes.filter((d) => d.status === "in-progress").length;
    const resolved = disputes.filter((d) => d.status === "resolved").length;
    const rejected = disputes.filter((d) => d.status === "rejected").length;
    return { total, sent, inProgress, resolved, rejected };
  }, [disputes]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch?.();
    setRefreshing(false);
    onDataChanged?.();
  }, [refetch, onDataChanged]);

  const handleCreate = useCallback(async () => {
    if (!newDispute.creditor.trim()) {
      Alert.alert("Missing Information", "Please enter the creditor name.");
      return;
    }
    try {
      const responseBy = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      await createDispute({
        creditor: newDispute.creditor.trim(),
        accountNumber: newDispute.accountNumber.trim(),
        disputeType: newDispute.disputeType,
        dateSent: newDispute.dateSent,
        status: newDispute.status,
        responseBy,
        notes: newDispute.notes.trim(),
      });
      setNewDispute({
        creditor: "",
        accountNumber: "",
        disputeType: "609 Letter",
        dateSent: new Date().toISOString().split("T")[0],
        status: "sent",
        notes: "",
      });
      setShowAddForm(false);
      onDataChanged?.();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create dispute.");
    }
  }, [newDispute, createDispute, onDataChanged]);

  const handleStatusChange = useCallback(
    async (id: string, status: Dispute["status"]) => {
      try {
        await updateDispute(id, { status });
        onDataChanged?.();
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to update dispute.");
      }
    },
    [updateDispute, onDataChanged]
  );

  const handleDelete = useCallback(
    (id: string, creditor: string) => {
      Alert.alert(
        "Delete Dispute",
        `Are you sure you want to delete the dispute for ${creditor}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteDispute(id);
                onDataChanged?.();
              } catch (error: any) {
                Alert.alert("Error", error.message || "Failed to delete.");
              }
            },
          },
        ]
      );
    },
    [deleteDispute, onDataChanged]
  );

  const handleCopyLetter = useCallback(
    async (dispute: Dispute) => {
      if (dispute.letterContent) {
        await Clipboard.setStringAsync(dispute.letterContent);
        setCopiedId(dispute.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    },
    []
  );

  // ============================================================
  // Render
  // ============================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ClipboardList size={24} color={Colors.primary} />
            <Text style={styles.headerTitle}>Dispute Tracker</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close dispute tracker"
          >
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Stats summary ──────────────────────────────────── */}
          <View style={styles.statsRow}>
            {[
              { label: "Total", value: stats.total, color: Colors.text },
              { label: "Sent", value: stats.sent, color: Colors.info },
              { label: "Active", value: stats.inProgress, color: Colors.warning },
              { label: "Resolved", value: stats.resolved, color: Colors.success },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Search bar ─────────────────────────────────────── */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={18} color={Colors.textLight} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search disputes..."
                placeholderTextColor={Colors.textLight}
                accessibilityLabel="Search disputes"
              />
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddForm(!showAddForm)}
              accessibilityRole="button"
              accessibilityLabel="Add new dispute"
            >
              <Plus size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* ── Status filter chips ─────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={{ gap: 8, paddingRight: 20 }}
          >
            {STATUSES.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  statusFilter === status && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(status)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${status}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === status && styles.filterChipTextActive,
                  ]}
                >
                  {status === "all"
                    ? "All"
                    : STATUS_META[status as Dispute["status"]]?.label || status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Add dispute form ────────────────────────────────── */}
          {showAddForm ? (
            <View style={styles.addForm}>
              <Text style={styles.addFormTitle}>Add New Dispute</Text>
              <TextInput
                style={styles.input}
                value={newDispute.creditor}
                onChangeText={(v) => setNewDispute({ ...newDispute, creditor: v })}
                placeholder="Creditor / Collection Agency"
                placeholderTextColor={Colors.textLight}
              />
              <TextInput
                style={styles.input}
                value={newDispute.accountNumber}
                onChangeText={(v) => setNewDispute({ ...newDispute, accountNumber: v })}
                placeholder="Account Number"
                placeholderTextColor={Colors.textLight}
              />
              <TextInput
                style={styles.input}
                value={newDispute.disputeType}
                onChangeText={(v) => setNewDispute({ ...newDispute, disputeType: v })}
                placeholder="Dispute Type (e.g., 609 Letter)"
                placeholderTextColor={Colors.textLight}
              />
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={newDispute.notes}
                onChangeText={(v) => setNewDispute({ ...newDispute, notes: v })}
                placeholder="Notes (optional)"
                placeholderTextColor={Colors.textLight}
                multiline
              />
              <View style={styles.addFormActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleCreate}
                >
                  <Text style={styles.saveButtonText}>Save Dispute</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* ── Dispute list ────────────────────────────────────── */}
          {isLoading ? (
            <Text style={styles.emptyText}>Loading disputes...</Text>
          ) : filteredDisputes.length === 0 ? (
            <View style={styles.emptyState}>
              <ClipboardList size={48} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No disputes found</Text>
              <Text style={styles.emptyDesc}>
                {disputes.length === 0
                  ? "Start by generating a dispute letter or adding one manually."
                  : "Try adjusting your search or filter."}
              </Text>
            </View>
          ) : (
            <View style={styles.disputeList}>
              {filteredDisputes.map((dispute) => {
                const statusInfo = STATUS_META[dispute.status] || STATUS_META.sent;
                const StatusIcon = statusInfo.icon;
                const isExpanded = expandedId === dispute.id;

                return (
                  <View key={dispute.id} style={styles.disputeCard}>
                    {/* Card header */}
                    <TouchableOpacity
                      style={styles.disputeHeader}
                      onPress={() => setExpandedId(isExpanded ? null : dispute.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Dispute for ${dispute.creditor}, status: ${statusInfo.label}`}
                    >
                      <View style={styles.disputeHeaderLeft}>
                        <View
                          style={[styles.statusIcon, { backgroundColor: statusInfo.color + "20" }]}
                        >
                          <StatusIcon size={16} color={statusInfo.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.disputeCreditor} numberOfLines={1}>
                            {dispute.creditor}
                          </Text>
                          <Text style={styles.disputeMeta}>
                            {dispute.disputeType} • {dispute.dateSent}
                          </Text>
                        </View>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={20} color={Colors.textLight} />
                      ) : (
                        <ChevronDown size={20} color={Colors.textLight} />
                      )}
                    </TouchableOpacity>

                    {/* Expanded details */}
                    {isExpanded ? (
                      <View style={styles.disputeDetails}>
                        {dispute.accountNumber ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Account #:</Text>
                            <Text style={styles.detailValue}>{dispute.accountNumber}</Text>
                          </View>
                        ) : null}
                        {dispute.responseBy ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Response By:</Text>
                            <Text style={styles.detailValue}>{dispute.responseBy}</Text>
                          </View>
                        ) : null}
                        {dispute.lastUpdated ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Last Updated:</Text>
                            <Text style={styles.detailValue}>{dispute.lastUpdated}</Text>
                          </View>
                        ) : null}

                        {/* Status changer */}
                        <Text style={styles.detailLabel}>Change Status:</Text>
                        <View style={styles.statusChangerRow}>
                          {(Object.keys(STATUS_META) as Dispute["status"][]).map((st) => {
                            const meta = STATUS_META[st];
                            const SIcon = meta.icon;
                            return (
                              <TouchableOpacity
                                key={st}
                                style={[
                                  styles.statusChip,
                                  dispute.status === st && { backgroundColor: meta.color },
                                ]}
                                onPress={() => handleStatusChange(dispute.id, st)}
                                accessibilityRole="button"
                                accessibilityLabel={`Set status to ${meta.label}`}
                              >
                                <SIcon
                                  size={12}
                                  color={dispute.status === st ? Colors.white : meta.color}
                                />
                                <Text
                                  style={[
                                    styles.statusChipText,
                                    dispute.status === st && { color: Colors.white },
                                  ]}
                                >
                                  {meta.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Letter content */}
                        {dispute.letterContent ? (
                          <View style={styles.letterPreview}>
                            <View style={styles.letterPreviewHeader}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <FileText size={14} color={Colors.primary} />
                                <Text style={styles.letterPreviewTitle}>Letter Content</Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => handleCopyLetter(dispute)}
                                style={styles.copyBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Copy letter content"
                              >
                                {copiedId === dispute.id ? (
                                  <Check size={14} color={Colors.success} />
                                ) : (
                                  <Copy size={14} color={Colors.primary} />
                                )}
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.letterPreviewText} numberOfLines={6}>
                              {dispute.letterContent}
                            </Text>
                          </View>
                        ) : null}

                        {/* Timeline */}
                        {dispute.timeline && dispute.timeline.length > 0 ? (
                          <View style={styles.timelineSection}>
                            <Text style={styles.detailLabel}>Timeline:</Text>
                            {dispute.timeline.map((entry, i) => (
                              <View key={i} style={styles.timelineItem}>
                                <View style={styles.timelineDot} />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.timelineDate}>{entry.date}</Text>
                                  <Text style={styles.timelineAction}>{entry.action}</Text>
                                  {entry.note ? (
                                    <Text style={styles.timelineNote}>{entry.note}</Text>
                                  ) : null}
                                </View>
                              </View>
                            ))}
                          </View>
                        ) : null}

                        {/* Delete */}
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDelete(dispute.id, dispute.creditor)}
                          accessibilityRole="button"
                          accessibilityLabel="Delete this dispute"
                        >
                          <Trash2 size={14} color={Colors.error} />
                          <Text style={styles.deleteButtonText}>Delete Dispute</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Refresh button ──────────────────────────────────── */}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            accessibilityRole="button"
            accessibilityLabel="Refresh disputes"
          >
            <RefreshCw size={16} color={Colors.primary} />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  addForm: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  addFormTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 14,
    color: Colors.text,
  },
  addFormActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
  },
  disputeList: {
    gap: 10,
  },
  disputeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  disputeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  disputeHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  disputeCreditor: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  disputeMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  disputeDetails: {
    padding: 14,
    paddingTop: 0,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  statusChangerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  letterPreview: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  letterPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  letterPreviewTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  copyBtn: {
    padding: 4,
  },
  letterPreviewText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  timelineSection: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  timelineDate: {
    fontSize: 11,
    color: Colors.textLight,
  },
  timelineAction: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.text,
  },
  timelineNote: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: Colors.errorLight + "20",
    alignSelf: "flex-start",
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.error,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 40,
    color: Colors.textSecondary,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    marginTop: 20,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
});
