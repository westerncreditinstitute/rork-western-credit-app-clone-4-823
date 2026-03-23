import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Search,
  User,
  MessageSquare,
  Flag,
  Ban,
  AlertOctagon,
  TrendingUp,
  Eye,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { reportingService, Report, ReportStatus, ReportPriority, ReportCategory } from '@/services/ReportingService';

const PRIORITY_COLORS: Record<ReportPriority, string> = {
  urgent: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: '#6B7280',
  under_review: '#3B82F6',
  resolved: '#22C55E',
  dismissed: '#9CA3AF',
  escalated: '#EF4444',
};

const CATEGORY_ICONS: Record<ReportCategory, React.ReactNode> = {
  harassment: <AlertTriangle size={16} color="#F97316" />,
  hate_speech: <AlertOctagon size={16} color="#EF4444" />,
  spam: <MessageSquare size={16} color="#6B7280" />,
  scam: <Ban size={16} color="#EF4444" />,
  inappropriate_content: <Eye size={16} color="#F97316" />,
  impersonation: <User size={16} color="#8B5CF6" />,
  cheating: <TrendingUp size={16} color="#EAB308" />,
  threats: <AlertOctagon size={16} color="#EF4444" />,
  personal_info: <Shield size={16} color="#3B82F6" />,
  other: <Flag size={16} color="#6B7280" />,
};

interface ReportStats {
  totalReports: number;
  pendingReports: number;
  resolvedToday: number;
  averageResolutionTime: number;
  topCategories: { category: ReportCategory; count: number }[];
}

export default function ModerationQueueScreen() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<ReportPriority | 'all'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [reportsData, statsData] = await Promise.all([
        reportingService.getPendingReports(100),
        reportingService.getReportStats(),
      ]);
      setReports(reportsData);
      setStats(statsData);
      console.log('[ModerationQueue] Loaded', reportsData.length, 'reports');
    } catch (error) {
      console.error('[ModerationQueue] Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  const filteredReports = reports.filter(report => {
    if (selectedStatus !== 'all' && report.status !== selectedStatus) return false;
    if (selectedPriority !== 'all' && report.priority !== selectedPriority) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        report.reportedUserName?.toLowerCase().includes(query) ||
        report.reporterName?.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query) ||
        report.category.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleReportPress = (report: Report) => {
    setSelectedReport(report);
    setModeratorNotes(report.moderatorNotes || '');
    setShowDetailModal(true);
  };

  const handleUpdateStatus = async (status: ReportStatus, resolution?: string) => {
    if (!selectedReport || !user) return;

    setIsSubmitting(true);
    try {
      const result = await reportingService.updateReportStatus(
        selectedReport.id,
        status,
        user.id,
        moderatorNotes,
        resolution
      );

      if (result.success) {
        setShowDetailModal(false);
        loadData();
        Alert.alert('Success', `Report ${status === 'resolved' ? 'resolved' : status === 'dismissed' ? 'dismissed' : 'updated'} successfully`);
      } else {
        Alert.alert('Error', result.error || 'Failed to update report');
      }
    } catch (error) {
      console.error('[ModerationQueue] Error updating report:', error);
      Alert.alert('Error', 'Failed to update report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Clock size={20} color="#D97706" />
            <Text style={styles.statValue}>{stats.pendingReports}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
            <CheckCircle size={20} color="#16A34A" />
            <Text style={styles.statValue}>{stats.resolvedToday}</Text>
            <Text style={styles.statLabel}>Resolved Today</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
            <TrendingUp size={20} color="#2563EB" />
            <Text style={styles.statValue}>{stats.averageResolutionTime}h</Text>
            <Text style={styles.statLabel}>Avg. Time</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.searchContainer}>
        <Search size={18} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search reports..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity
          style={[styles.filterChip, selectedStatus === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedStatus('all')}
        >
          <Text style={[styles.filterChipText, selectedStatus === 'all' && styles.filterChipTextActive]}>
            All Status
          </Text>
        </TouchableOpacity>
        {(['pending', 'under_review', 'escalated'] as ReportStatus[]).map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, selectedStatus === status && styles.filterChipActive]}
            onPress={() => setSelectedStatus(status)}
          >
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
            <Text style={[styles.filterChipText, selectedStatus === status && styles.filterChipTextActive]}>
              {status.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity
          style={[styles.filterChip, selectedPriority === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedPriority('all')}
        >
          <Text style={[styles.filterChipText, selectedPriority === 'all' && styles.filterChipTextActive]}>
            All Priority
          </Text>
        </TouchableOpacity>
        {(['urgent', 'high', 'medium', 'low'] as ReportPriority[]).map(priority => (
          <TouchableOpacity
            key={priority}
            style={[styles.filterChip, selectedPriority === priority && styles.filterChipActive]}
            onPress={() => setSelectedPriority(priority)}
          >
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[priority] }]} />
            <Text style={[styles.filterChipText, selectedPriority === priority && styles.filterChipTextActive]}>
              {priority}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderReportCard = (report: Report) => (
    <TouchableOpacity
      key={report.id}
      style={styles.reportCard}
      onPress={() => handleReportPress(report)}
      activeOpacity={0.7}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportMeta}>
          <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[report.priority] + '20' }]}>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[report.priority] }]} />
            <Text style={[styles.priorityText, { color: PRIORITY_COLORS[report.priority] }]}>
              {report.priority.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[report.status] + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[report.status] }]}>
              {report.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Text style={styles.reportTime}>{formatDate(report.createdAt)}</Text>
      </View>

      <View style={styles.reportBody}>
        <View style={styles.categoryRow}>
          {CATEGORY_ICONS[report.category]}
          <Text style={styles.categoryText}>{report.category.replace('_', ' ')}</Text>
        </View>

        <View style={styles.usersRow}>
          <View style={styles.userInfo}>
            <Text style={styles.userLabel}>Reporter</Text>
            <Text style={styles.userName}>{report.reporterName || 'Anonymous'}</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
          <View style={styles.userInfo}>
            <Text style={styles.userLabel}>Reported</Text>
            <Text style={styles.userName}>{report.reportedUserName || 'Unknown'}</Text>
          </View>
        </View>

        <Text style={styles.reportDescription} numberOfLines={2}>
          {report.description}
        </Text>
      </View>

      <View style={styles.reportFooter}>
        <Text style={styles.contentType}>{report.contentType}</Text>
        <ChevronRight size={20} color="#6B7280" />
      </View>
    </TouchableOpacity>
  );

  const renderDetailModal = () => {
    if (!selectedReport) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Report Details</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[selectedReport.priority] + '20' }]}>
                  <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[selectedReport.priority] }]} />
                  <Text style={[styles.priorityText, { color: PRIORITY_COLORS[selectedReport.priority] }]}>
                    {selectedReport.priority.toUpperCase()} PRIORITY
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedReport.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[selectedReport.status] }]}>
                    {selectedReport.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Category</Text>
              <View style={styles.categoryBadge}>
                {CATEGORY_ICONS[selectedReport.category]}
                <Text style={styles.categoryBadgeText}>
                  {selectedReport.category.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Reporter</Text>
              <View style={styles.userCard}>
                <User size={20} color="#6B7280" />
                <View style={styles.userCardInfo}>
                  <Text style={styles.userCardName}>{selectedReport.reporterName || 'Anonymous'}</Text>
                  <Text style={styles.userCardId}>ID: {selectedReport.reporterId}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Reported User</Text>
              <View style={styles.userCard}>
                <User size={20} color="#EF4444" />
                <View style={styles.userCardInfo}>
                  <Text style={styles.userCardName}>{selectedReport.reportedUserName || 'Unknown'}</Text>
                  <Text style={styles.userCardId}>ID: {selectedReport.reportedUserId}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Description</Text>
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>{selectedReport.description}</Text>
              </View>
            </View>

            {selectedReport.evidence && selectedReport.evidence.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Evidence ({selectedReport.evidence.length})</Text>
                {selectedReport.evidence.map((item, index) => (
                  <View key={index} style={styles.evidenceItem}>
                    <Text style={styles.evidenceText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Moderator Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add notes about this report..."
                placeholderTextColor="#9CA3AF"
                value={moderatorNotes}
                onChangeText={setModeratorNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Submitted</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedReport.createdAt).toLocaleString()}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.dismissButton]}
              onPress={() => handleUpdateStatus('dismissed', 'No action required')}
              disabled={isSubmitting}
            >
              <XCircle size={20} color="#6B7280" />
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.escalateButton]}
              onPress={() => handleUpdateStatus('escalated')}
              disabled={isSubmitting}
            >
              <AlertTriangle size={20} color="#F97316" />
              <Text style={styles.escalateButtonText}>Escalate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.resolveButton]}
              onPress={() => handleUpdateStatus('resolved', 'Action taken')}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <CheckCircle size={20} color="#fff" />
                  <Text style={styles.resolveButtonText}>Resolve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading moderation queue...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Moderation Queue',
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#3B82F6" />
        }
      >
        {renderStatsCard()}
        {renderFilters()}

        <View style={styles.reportsContainer}>
          <View style={styles.reportsHeader}>
            <Text style={styles.reportsTitle}>Reports ({filteredReports.length})</Text>
          </View>

          {filteredReports.length === 0 ? (
            <View style={styles.emptyState}>
              <Shield size={48} color="#4B5563" />
              <Text style={styles.emptyTitle}>No Reports</Text>
              <Text style={styles.emptyText}>
                {searchQuery || selectedStatus !== 'all' || selectedPriority !== 'all'
                  ? 'No reports match your filters'
                  : 'The moderation queue is clear'}
              </Text>
            </View>
          ) : (
            filteredReports.map(renderReportCard)
          )}
        </View>
      </ScrollView>

      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    marginTop: 12,
    color: '#9CA3AF',
    fontSize: 14,
  },
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500' as const,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
  },
  filterChipText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500' as const,
    textTransform: 'capitalize' as const,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reportsContainer: {
    padding: 16,
  },
  reportsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  reportCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  reportTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  reportBody: {
    gap: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#D1D5DB',
    fontWeight: '500' as const,
    textTransform: 'capitalize' as const,
  },
  usersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500' as const,
  },
  reportDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  contentType: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  modalCancel: {
    fontSize: 16,
    color: '#3B82F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: '#D1D5DB',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500' as const,
    textTransform: 'capitalize' as const,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 10,
  },
  userCardInfo: {
    flex: 1,
  },
  userCardName: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500' as const,
  },
  userCardId: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  descriptionCard: {
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  evidenceItem: {
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  evidenceText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  notesInput: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  dismissButton: {
    backgroundColor: '#374151',
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#9CA3AF',
  },
  escalateButton: {
    backgroundColor: '#7C2D12',
  },
  escalateButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FDBA74',
  },
  resolveButton: {
    backgroundColor: '#16A34A',
  },
  resolveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
