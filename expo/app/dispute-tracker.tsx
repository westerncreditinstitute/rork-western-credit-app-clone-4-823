import React, { useState, useCallback, useMemo } from "react";
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
  Modal,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Printer,
  RefreshCw,
  AlertCircle,
  CheckSquare,
  Square,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useDisputes, Dispute } from "@/contexts/DisputesContext";
import { useUser } from "@/contexts/UserContext";
import * as Clipboard from "expo-clipboard";

const BUREAUS = ["All", "Equifax", "Experian", "TransUnion"];
const STATUSES = ["all", "sent", "in-progress", "resolved", "rejected"] as const;
const DISPUTE_TYPES = [
  "623 Letter",
  "809 Letter",
  "611 Letter",
  "609 Letter",
  "Intent to Sue Creditor",
  "Intent to Sue Debt Collector",
  "Open Account Dispute",
  "Hand Written Dispute Letter",
  "Online Dispute",
  "General Dispute",
  "Other",
];

export default function DisputeTrackerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const {
    disputes,
    analytics,
    isLoading,
    createDispute,
    updateDispute,
    deleteDispute,
    addNote,
    refetch,
  } = useDisputes();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof STATUSES[number]>("all");
  const [bureauFilter, setBureauFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDisputes, setSelectedDisputes] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDispute, setEditingDispute] = useState<Dispute | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteDisputeId, setNoteDisputeId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteStatus, setNoteStatus] = useState<Dispute["status"]>("sent");
  const [refreshing, setRefreshing] = useState(false);

  const [newDispute, setNewDispute] = useState({
    creditor: "",
    accountNumber: "",
    disputeType: "",
    dateSent: new Date().toISOString().split("T")[0],
    status: "sent" as Dispute["status"],
    notes: "",
  });

  const filteredDisputes = useMemo(() => {
    return disputes.filter((dispute) => {
      const matchesSearch =
        dispute.creditor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.disputeType.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || dispute.status === statusFilter;

      const matchesBureau =
        bureauFilter === "All" ||
        (dispute.timeline?.[0]?.note?.toLowerCase().includes(bureauFilter.toLowerCase()) ?? false);

      return matchesSearch && matchesStatus && matchesBureau;
    });
  }, [disputes, searchQuery, statusFilter, bureauFilter]);

  const overdueDisputes = useMemo(() => {
    const today = new Date();
    return disputes.filter((d) => {
      if (d.status === "resolved" || d.status === "rejected") return false;
      const responseBy = new Date(d.responseBy);
      return responseBy < today;
    });
  }, [disputes]);

  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return disputes.filter((d) => {
      if (d.status === "resolved" || d.status === "rejected") return false;
      const responseBy = new Date(d.responseBy);
      return responseBy >= today && responseBy <= nextWeek;
    });
  }, [disputes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAddDispute = useCallback(async () => {
    if (!newDispute.creditor || !newDispute.accountNumber || !newDispute.disputeType) {
      Alert.alert("Required Fields", "Please fill in Creditor, Account Number, and Dispute Type.");
      return;
    }

    const responseDate = new Date(newDispute.dateSent);
    responseDate.setDate(responseDate.getDate() + 30);

    try {
      await createDispute({
        creditor: newDispute.creditor,
        accountNumber: newDispute.accountNumber,
        disputeType: newDispute.disputeType,
        dateSent: newDispute.dateSent,
        status: newDispute.status,
        responseBy: responseDate.toISOString().split("T")[0],
        notes: newDispute.notes,
      });

      setShowAddModal(false);
      setNewDispute({
        creditor: "",
        accountNumber: "",
        disputeType: "",
        dateSent: new Date().toISOString().split("T")[0],
        status: "sent",
        notes: "",
      });
      Alert.alert("Success", "Dispute added successfully!");
    } catch (error) {
      console.error("Error adding dispute:", error);
      Alert.alert("Error", "Failed to add dispute. Please try again.");
    }
  }, [newDispute, createDispute]);

  const handleEditDispute = useCallback(async () => {
    if (!editingDispute) return;

    try {
      await updateDispute(editingDispute.id, {
        creditor: editingDispute.creditor,
        accountNumber: editingDispute.accountNumber,
        disputeType: editingDispute.disputeType,
        status: editingDispute.status,
      });

      setShowEditModal(false);
      setEditingDispute(null);
      Alert.alert("Success", "Dispute updated successfully!");
    } catch (error) {
      console.error("Error updating dispute:", error);
      Alert.alert("Error", "Failed to update dispute. Please try again.");
    }
  }, [editingDispute, updateDispute]);

  const handleDeleteDispute = useCallback(
    async (id: string) => {
      Alert.alert("Delete Dispute", "Are you sure you want to delete this dispute?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDispute(id);
              setSelectedDisputes((prev) => prev.filter((d) => d !== id));
            } catch (error) {
              console.error("Error deleting dispute:", error);
              Alert.alert("Error", "Failed to delete dispute.");
            }
          },
        },
      ]);
    },
    [deleteDispute]
  );

  const handleBulkStatusUpdate = useCallback(
    async (newStatus: Dispute["status"]) => {
      if (selectedDisputes.length === 0) return;

      try {
        for (const id of selectedDisputes) {
          await updateDispute(id, { status: newStatus });
        }
        setSelectedDisputes([]);
        setShowBulkActions(false);
        Alert.alert("Success", `${selectedDisputes.length} dispute(s) updated to ${newStatus}`);
      } catch (error) {
        console.error("Error bulk updating:", error);
        Alert.alert("Error", "Failed to update some disputes.");
      }
    },
    [selectedDisputes, updateDispute]
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedDisputes.length === 0) return;

    Alert.alert(
      "Delete Selected",
      `Are you sure you want to delete ${selectedDisputes.length} dispute(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              for (const id of selectedDisputes) {
                await deleteDispute(id);
              }
              setSelectedDisputes([]);
              setShowBulkActions(false);
            } catch (error) {
              console.error("Error bulk deleting:", error);
              Alert.alert("Error", "Failed to delete some disputes.");
            }
          },
        },
      ]
    );
  }, [selectedDisputes, deleteDispute]);

  const handleAddNote = useCallback(async () => {
    if (!noteDisputeId || !noteText.trim()) {
      Alert.alert("Required", "Please enter a note.");
      return;
    }

    try {
      await addNote(noteDisputeId, noteText, noteStatus);
      setShowNoteModal(false);
      setNoteDisputeId(null);
      setNoteText("");
      Alert.alert("Success", "Note added successfully!");
    } catch (error) {
      console.error("Error adding note:", error);
      Alert.alert("Error", "Failed to add note.");
    }
  }, [noteDisputeId, noteText, noteStatus, addNote]);

  const toggleDisputeSelection = useCallback((id: string) => {
    setSelectedDisputes((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }, []);

  const selectAllDisputes = useCallback(() => {
    if (selectedDisputes.length === filteredDisputes.length) {
      setSelectedDisputes([]);
    } else {
      setSelectedDisputes(filteredDisputes.map((d) => d.id));
    }
  }, [selectedDisputes.length, filteredDisputes]);

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
        return <RefreshCw color={Colors.warning} size={16} />;
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

  if (!user?.id) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color={Colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Cloud Dispute Tracker</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.emptyState}>
            <AlertCircle color={Colors.textLight} size={48} />
            <Text style={styles.emptyTitle}>Sign In Required</Text>
            <Text style={styles.emptyText}>
              Please sign in to access your Cloud Dispute Tracker.
            </Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cloud Dispute Tracker</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Plus color={Colors.surface} size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          {/* Analytics Dashboard */}
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsTitle}>Dispute Analytics</Text>
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
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>{analytics.avgResponseTime}</Text>
                <Text style={styles.analyticsLabel}>Avg Days</Text>
              </View>
            </View>
          </View>

          {/* Alerts Section */}
          {(overdueDisputes.length > 0 || upcomingDeadlines.length > 0) && (
            <View style={styles.alertsSection}>
              {overdueDisputes.length > 0 && (
                <View style={[styles.alertCard, styles.alertOverdue]}>
                  <AlertTriangle color={Colors.error} size={20} />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>Overdue Response</Text>
                    <Text style={styles.alertText}>
                      {overdueDisputes.length} dispute(s) past expected response date
                    </Text>
                  </View>
                </View>
              )}
              {upcomingDeadlines.length > 0 && (
                <View style={[styles.alertCard, styles.alertUpcoming]}>
                  <Clock color={Colors.warning} size={20} />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>Upcoming Deadlines</Text>
                    <Text style={styles.alertText}>
                      {upcomingDeadlines.length} dispute(s) due within 7 days
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

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

              <Text style={[styles.filterLabel, { marginTop: 12 }]}>Credit Bureau</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {BUREAUS.map((bureau) => (
                  <TouchableOpacity
                    key={bureau}
                    style={[styles.filterChip, bureauFilter === bureau && styles.filterChipActive]}
                    onPress={() => setBureauFilter(bureau)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        bureauFilter === bureau && styles.filterChipTextActive,
                      ]}
                    >
                      {bureau}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Bulk Actions */}
          {selectedDisputes.length > 0 && (
            <View style={styles.bulkActionsBar}>
              <Text style={styles.bulkSelectedText}>{selectedDisputes.length} selected</Text>
              <View style={styles.bulkButtons}>
                <TouchableOpacity
                  style={styles.bulkButton}
                  onPress={() => setShowBulkActions(!showBulkActions)}
                >
                  <Edit3 color={Colors.primary} size={18} />
                  <Text style={styles.bulkButtonText}>Status</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bulkButtonDanger} onPress={handleBulkDelete}>
                  <Trash2 color={Colors.error} size={18} />
                  <Text style={[styles.bulkButtonText, { color: Colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showBulkActions && selectedDisputes.length > 0 && (
            <View style={styles.bulkStatusOptions}>
              {(["sent", "in-progress", "resolved", "rejected"] as Dispute["status"][]).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={styles.bulkStatusOption}
                  onPress={() => handleBulkStatusUpdate(status)}
                >
                  {getStatusIcon(status)}
                  <Text style={styles.bulkStatusText}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Select All */}
          {filteredDisputes.length > 0 && (
            <TouchableOpacity style={styles.selectAllRow} onPress={selectAllDisputes}>
              {selectedDisputes.length === filteredDisputes.length ? (
                <CheckSquare color={Colors.primary} size={20} />
              ) : (
                <Square color={Colors.textLight} size={20} />
              )}
              <Text style={styles.selectAllText}>
                {selectedDisputes.length === filteredDisputes.length ? "Deselect All" : "Select All"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Disputes List */}
          {isLoading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Loading disputes...</Text>
            </View>
          ) : filteredDisputes.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText color={Colors.textLight} size={48} />
              <Text style={styles.emptyTitle}>No Disputes Found</Text>
              <Text style={styles.emptyText}>
                {disputes.length === 0
                  ? "Add your first dispute or generate letters from the AI Dispute Assistant."
                  : "No disputes match your current filters."}
              </Text>
            </View>
          ) : (
            <View style={styles.disputesList}>
              {filteredDisputes.map((dispute) => {
                const isExpanded = expandedDispute === dispute.id;
                const isSelected = selectedDisputes.includes(dispute.id);
                const daysLeft = getDaysUntilDeadline(dispute.responseBy);
                const isOverdue = daysLeft < 0 && dispute.status !== "resolved" && dispute.status !== "rejected";

                return (
                  <View key={dispute.id} style={[styles.disputeCard, isSelected && styles.disputeCardSelected]}>
                    <View style={styles.disputeHeader}>
                      <TouchableOpacity
                        style={styles.checkboxArea}
                        onPress={() => toggleDisputeSelection(dispute.id)}
                      >
                        {isSelected ? (
                          <CheckSquare color={Colors.primary} size={22} />
                        ) : (
                          <Square color={Colors.textLight} size={22} />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.disputeMainContent}
                        onPress={() => setExpandedDispute(isExpanded ? null : dispute.id)}
                      >
                        <View style={styles.disputeInfo}>
                          <Text style={styles.disputeCreditor}>{dispute.creditor}</Text>
                          <Text style={styles.disputeAccount}>
                            •••• {dispute.accountNumber.slice(-4)}
                          </Text>
                          <View style={styles.disputeMetaRow}>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) + "20" }]}>
                              {getStatusIcon(dispute.status)}
                              <Text style={[styles.statusText, { color: getStatusColor(dispute.status) }]}>
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
                    </View>

                    {isExpanded && (
                      <View style={styles.disputeDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Type:</Text>
                          <Text style={styles.detailValue}>{dispute.disputeType}</Text>
                        </View>
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
                                  {item.note && <Text style={styles.timelineNote}>{item.note}</Text>}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Actions */}
                        <View style={styles.disputeActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                              setNoteDisputeId(dispute.id);
                              setNoteStatus(dispute.status);
                              setShowNoteModal(true);
                            }}
                          >
                            <Edit3 color={Colors.primary} size={16} />
                            <Text style={styles.actionText}>Add Note</Text>
                          </TouchableOpacity>

                          {dispute.letterContent && (
                            <>
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => copyLetterContent(dispute)}
                              >
                                <FileText color={Colors.primary} size={16} />
                                <Text style={styles.actionText}>Copy Letter</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => printLetter(dispute)}
                              >
                                <Printer color={Colors.primary} size={16} />
                                <Text style={styles.actionText}>Print</Text>
                              </TouchableOpacity>
                            </>
                          )}

                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                              setEditingDispute(dispute);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit3 color={Colors.secondary} size={16} />
                            <Text style={[styles.actionText, { color: Colors.secondary }]}>Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDeleteDispute(dispute.id)}
                          >
                            <Trash2 color={Colors.error} size={16} />
                            <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Add Dispute Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Dispute</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <XCircle color={Colors.textLight} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Creditor Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newDispute.creditor}
                  onChangeText={(text) => setNewDispute((prev) => ({ ...prev, creditor: text }))}
                  placeholder="e.g., Capital One"
                  placeholderTextColor={Colors.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Account Number *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newDispute.accountNumber}
                  onChangeText={(text) => setNewDispute((prev) => ({ ...prev, accountNumber: text }))}
                  placeholder="e.g., XXXX-1234"
                  placeholderTextColor={Colors.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Dispute Type *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.typeSelector}>
                    {DISPUTE_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeChip,
                          newDispute.disputeType === type && styles.typeChipActive,
                        ]}
                        onPress={() => setNewDispute((prev) => ({ ...prev, disputeType: type }))}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            newDispute.disputeType === type && styles.typeChipTextActive,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date Sent</Text>
                <TextInput
                  style={styles.formInput}
                  value={newDispute.dateSent}
                  onChangeText={(text) => setNewDispute((prev) => ({ ...prev, dateSent: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Status</Text>
                <View style={styles.statusSelector}>
                  {(["sent", "in-progress", "resolved", "rejected"] as Dispute["status"][]).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        newDispute.status === status && styles.statusOptionActive,
                      ]}
                      onPress={() => setNewDispute((prev) => ({ ...prev, status }))}
                    >
                      {getStatusIcon(status)}
                      <Text
                        style={[
                          styles.statusOptionText,
                          newDispute.status === status && styles.statusOptionTextActive,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={newDispute.notes}
                  onChangeText={(text) => setNewDispute((prev) => ({ ...prev, notes: text }))}
                  placeholder="Add any notes..."
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddDispute}>
                <Text style={styles.saveButtonText}>Add Dispute</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Dispute Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Dispute</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <XCircle color={Colors.textLight} size={24} />
              </TouchableOpacity>
            </View>
            {editingDispute && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Creditor Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingDispute.creditor}
                    onChangeText={(text) =>
                      setEditingDispute((prev) => (prev ? { ...prev, creditor: text } : prev))
                    }
                    placeholderTextColor={Colors.textLight}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Account Number</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingDispute.accountNumber}
                    onChangeText={(text) =>
                      setEditingDispute((prev) => (prev ? { ...prev, accountNumber: text } : prev))
                    }
                    placeholderTextColor={Colors.textLight}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Status</Text>
                  <View style={styles.statusSelector}>
                    {(["sent", "in-progress", "resolved", "rejected"] as Dispute["status"][]).map(
                      (status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusOption,
                            editingDispute.status === status && styles.statusOptionActive,
                          ]}
                          onPress={() =>
                            setEditingDispute((prev) => (prev ? { ...prev, status } : prev))
                          }
                        >
                          {getStatusIcon(status)}
                          <Text
                            style={[
                              styles.statusOptionText,
                              editingDispute.status === status && styles.statusOptionTextActive,
                            ]}
                          >
                            {status}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleEditDispute}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Note Modal */}
      <Modal visible={showNoteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Note / Update Status</Text>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <XCircle color={Colors.textLight} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Update Status</Text>
                <View style={styles.statusSelector}>
                  {(["sent", "in-progress", "resolved", "rejected"] as Dispute["status"][]).map(
                    (status) => (
                      <TouchableOpacity
                        key={status}
                        style={[styles.statusOption, noteStatus === status && styles.statusOptionActive]}
                        onPress={() => setNoteStatus(status)}
                      >
                        {getStatusIcon(status)}
                        <Text
                          style={[
                            styles.statusOptionText,
                            noteStatus === status && styles.statusOptionTextActive,
                          ]}
                        >
                          {status}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Note</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Add notes about this dispute..."
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowNoteModal(false);
                  setNoteText("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddNote}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  analyticsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  analyticsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  analyticsItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  alertsSection: {
    marginTop: 16,
    gap: 10,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  alertOverdue: {
    backgroundColor: Colors.error + "15",
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  alertUpcoming: {
    backgroundColor: Colors.warning + "15",
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  alertText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filtersContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.text,
  },
  filterChipTextActive: {
    color: Colors.surface,
  },
  bulkActionsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary + "15",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  bulkSelectedText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  bulkButtons: {
    flexDirection: "row",
    gap: 12,
  },
  bulkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  bulkButtonDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.error + "15",
    borderRadius: 8,
  },
  bulkButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  bulkStatusOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  bulkStatusOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bulkStatusText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.text,
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    paddingVertical: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  disputesList: {
    marginTop: 8,
    gap: 12,
  },
  disputeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
  },
  disputeCardSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  disputeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxArea: {
    padding: 14,
  },
  disputeMainContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 14,
    paddingVertical: 14,
  },
  disputeInfo: {
    flex: 1,
  },
  disputeCreditor: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  disputeAccount: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  disputeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    paddingVertical: 3,
    backgroundColor: Colors.error + "20",
    borderRadius: 10,
  },
  overdueText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.error,
  },
  disputeDetails: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  detailLabel: {
    width: 100,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  timelineSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 10,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 10,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 5,
    marginRight: 10,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
  },
  timelineAction: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.text,
  },
  timelineNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  disputeActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary + "10",
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  loadingState: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTextArea: {
    height: 100,
    textAlignVertical: "top",
  },
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    color: Colors.text,
  },
  typeChipTextActive: {
    color: Colors.surface,
    fontWeight: "600",
  },
  statusSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "15",
  },
  statusOptionText: {
    fontSize: 13,
    color: Colors.text,
    textTransform: "capitalize",
  },
  statusOptionTextActive: {
    fontWeight: "600",
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.surface,
  },
});
