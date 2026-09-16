import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Copy,
  Printer,
  RefreshCw,
  Check,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useDisputes, Dispute } from "@/contexts/DisputesContext";
import * as Clipboard from "expo-clipboard";

const STATUSES = ["all", "sent", "in-progress", "resolved", "rejected"] as const;

interface DisputeTrackerEmbeddedProps {
  showHeader?: boolean;
  maxHeight?: number | `${number}%`;
  onDisputeSelected?: (dispute: Dispute) => void;
}

/**
 * Human-readable "how long ago" for the sync line. Deliberately coarse -
 * the point is to reassure the user the list is current, not to display a
 * stopwatch.
 */
function describeSyncAge(timestamp: number | null): string {
  if (!timestamp) return "Not synced yet";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 10) return "Up to date";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `Updated ${hours}h ago`;
}

export default function DisputeTrackerEmbedded({
  showHeader = true,
  maxHeight = "100%",
  onDisputeSelected,
}: DisputeTrackerEmbeddedProps) {
  const { disputes, analytics, isLoading, isSyncing, lastSyncedAt, refreshDisputes } =
    useDisputes();

  const [isRefreshing, setIsRefreshing] = useState(false);
  // Re-renders the relative sync timestamp so "Updated 5s ago" doesn't
  // freeze on screen while the list sits idle.
  const [, setSyncTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSyncTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshDisputes();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshDisputes]);

  const syncLabel = useMemo(
    () => (isSyncing ? "Syncing…" : describeSyncAge(lastSyncedAt)),
    [isSyncing, lastSyncedAt],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof STATUSES[number]>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);

  const filteredDisputes = useMemo(() => {
    return disputes.filter((dispute) => {
      const matchesSearch =
        dispute.creditor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.disputeType.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || dispute.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [disputes, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return Colors.primary;
      case "in-progress":
        return Colors.warning;
      case "resolved":
        return Colors.success;
      case "rejected":
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Clock color={Colors.primary} size={16} />;
      case "in-progress":
        return <AlertTriangle color={Colors.warning} size={16} />;
      case "resolved":
        return <CheckCircle color={Colors.success} size={16} />;
      case "rejected":
        return <XCircle color={Colors.error} size={16} />;
      default:
        return <Clock color={Colors.textLight} size={16} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysUntilDeadline = (responseBy: string) => {
    const today = new Date();
    const deadline = new Date(responseBy);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const copyLetterContent = useCallback(async (dispute: Dispute) => {
    if (dispute.letterContent) {
      await Clipboard.setStringAsync(dispute.letterContent);
      Alert.alert("Copied!", "Letter content copied to clipboard.");
    } else {
      Alert.alert("No Content", "No letter content available for this dispute.");
    }
  }, []);

  const printLetter = useCallback((dispute: Dispute) => {
    if (Platform.OS === "web" && dispute.letterContent) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>${dispute.disputeType} - ${dispute.creditor}</title>
            <style>
              body { font-family: 'Courier New', monospace; line-height: 1.6; padding: 40px; white-space: pre-wrap; }
            </style>
          </head>
          <body>${dispute.letterContent.replace(/\n/g, "<br>")}</body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
      }
    } else {
      Alert.alert("Print", "Use the Copy feature to copy the letter and print from another app.");
    }
  }, []);

  return (
    <View style={[styles.container, { maxHeight }]}>
      {showHeader && (
        <>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Dispute Tracker</Text>
            {/* Sync status: proves the list reflects the server, and gives a
                manual escape hatch when a refresh is wanted right now. */}
            <TouchableOpacity
              style={styles.syncPill}
              onPress={handleRefresh}
              disabled={isSyncing || isRefreshing}
              accessibilityRole="button"
              accessibilityLabel={`${syncLabel}. Tap to refresh disputes.`}
            >
              {isSyncing || isRefreshing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : lastSyncedAt ? (
                <Check color={Colors.success} size={13} />
              ) : (
                <RefreshCw color={Colors.textLight} size={13} />
              )}
              <Text style={styles.syncPillText}>{syncLabel}</Text>
            </TouchableOpacity>
          </View>

          {/* Analytics Summary */}
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>{analytics.totalDisputes}</Text>
                <Text style={styles.analyticsLabel}>Total</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={[styles.analyticsValue, { color: Colors.success }]}>
                  {analytics.successRate}%
                </Text>
                <Text style={styles.analyticsLabel}>Success</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>{analytics.pendingDisputes}</Text>
                <Text style={styles.analyticsLabel}>Pending</Text>
              </View>
            </View>
          </View>

          {/* Search and Filters */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Search color={Colors.textLight} size={20} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search disputes..."
                placeholderTextColor={Colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity
              style={[styles.filterButton, showFilters && styles.filterButtonActive]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter color={showFilters ? Colors.surface : Colors.primary} size={20} />
            </TouchableOpacity>
          </View>

          {showFilters && (
            <View style={styles.filtersContainer}>
              <Text style={styles.filterLabel}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === status && styles.filterChipTextActive,
                      ]}
                    >
                      {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Disputes List */}
      <ScrollView
        style={styles.disputesList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading disputes...</Text>
          </View>
        ) : filteredDisputes.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText color={Colors.textLight} size={40} />
            <Text style={styles.emptyTitle}>No Disputes</Text>
            <Text style={styles.emptyText}>
              {disputes.length === 0
                ? "Generated letters will appear here"
                : "No disputes match your filters"}
            </Text>
          </View>
        ) : (
          <>
            {filteredDisputes.map((dispute) => {
              const isExpanded = expandedDispute === dispute.id;
              const daysLeft = getDaysUntilDeadline(dispute.responseBy);
              const isOverdue =
                daysLeft < 0 && dispute.status !== "resolved" && dispute.status !== "rejected";

              return (
                <View key={dispute.id} style={styles.disputeCard}>
                  <TouchableOpacity
                    style={styles.disputeHeader}
                    onPress={() => {
                      setExpandedDispute(isExpanded ? null : dispute.id);
                      if (onDisputeSelected) {
                        onDisputeSelected(dispute);
                      }
                    }}
                  >
                    <View style={styles.disputeMainContent}>
                      <Text style={styles.disputeCreditor}>{dispute.creditor}</Text>
                      <Text style={styles.disputeAccount}>
                        •••• {dispute.accountNumber.slice(-4)} • {dispute.disputeType}
                      </Text>
                      <View style={styles.disputeMetaRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(dispute.status) + "20" },
                          ]}
                        >
                          {getStatusIcon(dispute.status)}
                          <Text
                            style={[styles.statusText, { color: getStatusColor(dispute.status) }]}
                          >
                            {dispute.status}
                          </Text>
                        </View>
                        {isOverdue && (
                          <View style={styles.overdueBadge}>
                            <AlertTriangle color={Colors.error} size={12} />
                            <Text style={styles.overdueText}>Overdue</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {isExpanded ? (
                      <ChevronUp color={Colors.textLight} size={24} />
                    ) : (
                      <ChevronDown color={Colors.textLight} size={24} />
                    )}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.disputeDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Sent:</Text>
                        <Text style={styles.detailValue}>{formatDate(dispute.dateSent)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Response By:</Text>
                        <Text style={[styles.detailValue, isOverdue && { color: Colors.error }]}>
                          {formatDate(dispute.responseBy)}
                          {daysLeft > 0 && ` (${daysLeft} days)`}
                          {isOverdue && ` (${Math.abs(daysLeft)} days overdue)`}
                        </Text>
                      </View>

                      {/* Letter Actions */}
                      {dispute.letterContent && (
                        <View style={styles.letterActionsContainer}>
                          <Text style={styles.letterActionsTitle}>Letter Actions</Text>
                          <View style={styles.letterActions}>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => copyLetterContent(dispute)}
                            >
                              <Copy color={Colors.primary} size={18} />
                              <Text style={styles.actionButtonText}>Copy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => printLetter(dispute)}
                            >
                              <Printer color={Colors.primary} size={18} />
                              <Text style={styles.actionButtonText}>Print</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Timeline */}
                      {dispute.timeline && dispute.timeline.length > 0 && (
                        <View style={styles.timelineSection}>
                          <Text style={styles.timelineTitle}>Timeline</Text>
                          {dispute.timeline.slice(0, 3).map((item, index) => (
                            <View key={index} style={styles.timelineItem}>
                              <View style={styles.timelineDot} />
                              <View style={styles.timelineContent}>
                                <Text style={styles.timelineDate}>{formatDate(item.date)}</Text>
                                <Text style={styles.timelineAction}>{item.action}</Text>
                                {item.note ? (
                                  <Text style={styles.timelineNote}>{item.note}</Text>
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: "hidden",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 28,
  },
  syncPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  analyticsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    margin: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  analyticsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  analyticsItem: {
    alignItems: "center",
    flex: 1,
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },
  analyticsLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  searchSection: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filtersContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  filterScroll: {
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.text,
  },
  filterChipTextActive: {
    color: Colors.surface,
  },
  disputesList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  disputeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  disputeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  disputeMainContent: {
    flex: 1,
  },
  disputeCreditor: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  disputeAccount: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  disputeMetaRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  overdueBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.error + "20",
  },
  overdueText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.error,
  },
  disputeDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textLight,
  },
  detailValue: {
    fontSize: 12,
    color: Colors.text,
    flex: 1,
    textAlign: "right",
  },
  letterActionsContainer: {
    marginTop: 8,
  },
  letterActionsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  letterActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.primary + "10",
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  timelineSection: {
    marginTop: 8,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginTop: 3,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textLight,
    marginBottom: 2,
  },
  timelineAction: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "500",
  },
  timelineNote: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
    fontStyle: "italic",
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    textAlign: "center",
  },
});
