import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Handshake,
  Send,
  Inbox,
  Users,
  Building2,
  Clock,
  DollarSign,
  Percent,
  CheckCircle,
  XCircle,
  MessageSquare,
  ChevronRight,
  X,
  TrendingUp,
  Calendar,
  Edit3,
  Trash2,
} from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { usePartnership } from '@/contexts/PartnershipContext';
import { useBusiness } from '@/contexts/BusinessContext';
import {
  PartnershipProposal,
  Partnership,
  PartnershipTerms,
  PartnershipType,
  formatPartnershipType,
  formatPartnershipStatus,
  getPartnershipStatusColor,
  getPartnershipTypeColor,
  createDefaultTerms,
} from '@/types/partnership';
import { formatCurrency } from '@/mocks/businessCategories';
import * as Haptics from 'expo-haptics';

type TabType = 'active' | 'received' | 'sent';

export default function PartnershipsScreen() {
  const { colors } = useTheme();
  const {
    isLoading,
    userId,
    getActivePartnerships,
    getReceivedProposals,
    getSentProposals,
    getPartnershipStats,
    sendProposal,
    respondToProposal,
    terminatePartnership,
    refreshData,
  } = usePartnership();
  const { getUserBusinesses } = useBusiness();

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<PartnershipProposal | null>(null);
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterMessage, setCounterMessage] = useState('');

  const [newProposal, setNewProposal] = useState({
    businessId: '',
    businessName: '',
    recipientId: '',
    recipientName: '',
    partnershipType: 'equity' as PartnershipType,
    message: '',
    terms: createDefaultTerms(),
  });

  const activePartnerships = getActivePartnerships();
  const receivedProposals = getReceivedProposals();
  const sentProposals = getSentProposals();
  const stats = getPartnershipStats();
  const userBusinesses = getUserBusinesses();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  }, [refreshData]);

  const handleAcceptProposal = useCallback(async (proposal: PartnershipProposal) => {
    Alert.alert(
      'Accept Partnership',
      `Are you sure you want to accept this partnership proposal from ${proposal.proposerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            const result = await respondToProposal(proposal.id, true);
            if (result.success) {
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              Alert.alert('Success', 'Partnership accepted!');
              setShowDetailModal(false);
              setSelectedProposal(null);
            } else {
              Alert.alert('Error', result.error || 'Failed to accept proposal');
            }
          },
        },
      ]
    );
  }, [respondToProposal]);

  const handleRejectProposal = useCallback(async (proposal: PartnershipProposal) => {
    Alert.alert(
      'Reject Proposal',
      'Are you sure you want to reject this partnership proposal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const result = await respondToProposal(proposal.id, false);
            if (result.success) {
              setShowDetailModal(false);
              setSelectedProposal(null);
            } else {
              Alert.alert('Error', result.error || 'Failed to reject proposal');
            }
          },
        },
      ]
    );
  }, [respondToProposal]);

  const handleCounterProposal = useCallback(async () => {
    if (!selectedProposal) return;

    const counterTerms: PartnershipTerms = {
      ...selectedProposal.proposedTerms,
      equityPercentage: Math.max(10, selectedProposal.proposedTerms.equityPercentage - 5),
    };

    const result = await respondToProposal(
      selectedProposal.id,
      false,
      counterTerms,
      counterMessage
    );

    if (result.success) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      Alert.alert('Counter Offer Sent', 'Your counter offer has been sent to the proposer.');
      setShowCounterModal(false);
      setShowDetailModal(false);
      setSelectedProposal(null);
      setCounterMessage('');
    } else {
      Alert.alert('Error', result.error || 'Failed to send counter offer');
    }
  }, [selectedProposal, counterMessage, respondToProposal]);

  const handleTerminatePartnership = useCallback(async (partnership: Partnership) => {
    Alert.alert(
      'Terminate Partnership',
      'Are you sure you want to terminate this partnership? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: async () => {
            const result = await terminatePartnership(partnership.id, 'User requested termination');
            if (result.success) {
              Alert.alert('Partnership Terminated', 'The partnership has been terminated.');
              setShowDetailModal(false);
              setSelectedPartnership(null);
            } else {
              Alert.alert('Error', result.error || 'Failed to terminate partnership');
            }
          },
        },
      ]
    );
  }, [terminatePartnership]);

  const handleSendProposal = useCallback(async () => {
    if (!newProposal.businessId || !newProposal.recipientId) {
      Alert.alert('Missing Information', 'Please select a business and enter recipient details.');
      return;
    }

    const result = await sendProposal(
      newProposal.businessId,
      newProposal.businessName,
      newProposal.recipientId,
      newProposal.recipientName,
      newProposal.partnershipType,
      newProposal.terms,
      newProposal.message
    );

    if (result.success) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Proposal Sent', 'Your partnership proposal has been sent.');
      setShowProposalModal(false);
      setNewProposal({
        businessId: '',
        businessName: '',
        recipientId: '',
        recipientName: '',
        partnershipType: 'equity',
        message: '',
        terms: createDefaultTerms(),
      });
    } else {
      Alert.alert('Error', result.error || 'Failed to send proposal');
    }
  }, [newProposal, sendProposal]);

  const renderProposalCard = useCallback((proposal: PartnershipProposal, isReceived: boolean) => {
    const statusColor = getPartnershipStatusColor(proposal.status);
    const typeColor = getPartnershipTypeColor(proposal.partnershipType);

    return (
      <TouchableOpacity
        key={proposal.id}
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => {
          setSelectedProposal(proposal);
          setShowDetailModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>
              {formatPartnershipType(proposal.partnershipType)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {formatPartnershipStatus(proposal.status)}
            </Text>
          </View>
        </View>

        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {proposal.businessName}
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          {isReceived ? `From: ${proposal.proposerName}` : `To: ${proposal.recipientName}`}
        </Text>

        <View style={styles.cardStats}>
          <View style={styles.cardStat}>
            <Percent size={14} color={colors.primary} />
            <Text style={[styles.cardStatText, { color: colors.text }]}>
              {proposal.proposedTerms.equityPercentage}% equity
            </Text>
          </View>
          <View style={styles.cardStat}>
            <DollarSign size={14} color="#22C55E" />
            <Text style={[styles.cardStatText, { color: colors.text }]}>
              {formatCurrency(proposal.proposedTerms.initialInvestment)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.cardDate}>
            <Clock size={12} color={colors.textLight} />
            <Text style={[styles.cardDateText, { color: colors.textLight }]}>
              Expires {new Date(proposal.expiresAt).toLocaleDateString()}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  }, [colors]);

  const renderPartnershipCard = useCallback((partnership: Partnership) => {
    const isPartnerA = partnership.partnerAId === userId;
    const partnerName = isPartnerA ? partnership.partnerBName : partnership.partnerAName;
    const myEquity = isPartnerA ? partnership.partnerAEquity : partnership.partnerBEquity;
    const myProfit = isPartnerA ? partnership.partnerAProfitReceived : partnership.partnerBProfitReceived;
    const typeColor = getPartnershipTypeColor(partnership.partnershipType);

    return (
      <TouchableOpacity
        key={partnership.id}
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => {
          setSelectedPartnership(partnership);
          setShowDetailModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>
              {formatPartnershipType(partnership.partnershipType)}
            </Text>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: '#22C55E20' }]}>
            <View style={styles.activeDot} />
            <Text style={[styles.activeText, { color: '#22C55E' }]}>Active</Text>
          </View>
        </View>

        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {partnership.businessName}
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          Partner: {partnerName}
        </Text>

        <View style={styles.cardStats}>
          <View style={styles.cardStat}>
            <Percent size={14} color={colors.primary} />
            <Text style={[styles.cardStatText, { color: colors.text }]}>
              {myEquity}% ownership
            </Text>
          </View>
          <View style={styles.cardStat}>
            <TrendingUp size={14} color="#22C55E" />
            <Text style={[styles.cardStatText, { color: '#22C55E' }]}>
              {formatCurrency(myProfit)} earned
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.cardDate}>
            <Calendar size={12} color={colors.textLight} />
            <Text style={[styles.cardDateText, { color: colors.textLight }]}>
              Since {new Date(partnership.startDate).toLocaleDateString()}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  }, [colors, userId]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Partnerships', headerShown: true }} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading partnerships...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Partnerships', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.activePartnerships}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pendingProposals}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#22C55E' }]}>
                {formatCurrency(stats.totalProfitReceived)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Profit</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabBar}>
          {(['active', 'received', 'sent'] as TabType[]).map((tab) => {
            const count = tab === 'active' ? activePartnerships.length
              : tab === 'received' ? receivedProposals.length
              : sentProposals.length;

            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
                ]}
                onPress={() => setActiveTab(tab)}
              >
                {tab === 'active' && <Handshake size={16} color={activeTab === tab ? colors.primary : colors.textSecondary} />}
                {tab === 'received' && <Inbox size={16} color={activeTab === tab ? colors.primary : colors.textSecondary} />}
                {tab === 'sent' && <Send size={16} color={activeTab === tab ? colors.primary : colors.textSecondary} />}
                <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.tabBadgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === 'active' && (
            activePartnerships.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                <Handshake size={48} color={colors.textLight} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Partnerships</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Accept proposals or send your own to start collaborating!
                </Text>
              </View>
            ) : (
              activePartnerships.map(renderPartnershipCard)
            )
          )}

          {activeTab === 'received' && (
            receivedProposals.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                <Inbox size={48} color={colors.textLight} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Received Proposals</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  You have not received any partnership proposals yet.
                </Text>
              </View>
            ) : (
              receivedProposals.map(p => renderProposalCard(p, true))
            )
          )}

          {activeTab === 'sent' && (
            sentProposals.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                <Send size={48} color={colors.textLight} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sent Proposals</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Send a partnership proposal to start collaborating!
                </Text>
              </View>
            ) : (
              sentProposals.map(p => renderProposalCard(p, false))
            )
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowProposalModal(true)}
        >
          <Handshake size={24} color="#FFF" />
        </TouchableOpacity>

        <Modal visible={showDetailModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.detailModal, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedProposal ? 'Proposal Details' : 'Partnership Details'}
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowDetailModal(false);
                  setSelectedProposal(null);
                  setSelectedPartnership(null);
                }}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedProposal && (
                  <>
                    <View style={[styles.detailSection, { backgroundColor: colors.surfaceAlt }]}>
                      <Building2 size={20} color={colors.primary} />
                      <View style={styles.detailContent}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Business</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {selectedProposal.businessName}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.detailSection, { backgroundColor: colors.surfaceAlt }]}>
                      <Users size={20} color={colors.primary} />
                      <View style={styles.detailContent}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          {selectedProposal.direction === 'received' ? 'From' : 'To'}
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {selectedProposal.direction === 'received'
                            ? selectedProposal.proposerName
                            : selectedProposal.recipientName}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.termsGrid}>
                      <View style={[styles.termItem, { backgroundColor: colors.surfaceAlt }]}>
                        <Percent size={16} color={colors.primary} />
                        <Text style={[styles.termLabel, { color: colors.textSecondary }]}>Equity</Text>
                        <Text style={[styles.termValue, { color: colors.text }]}>
                          {selectedProposal.proposedTerms.equityPercentage}%
                        </Text>
                      </View>
                      <View style={[styles.termItem, { backgroundColor: colors.surfaceAlt }]}>
                        <DollarSign size={16} color="#22C55E" />
                        <Text style={[styles.termLabel, { color: colors.textSecondary }]}>Investment</Text>
                        <Text style={[styles.termValue, { color: colors.text }]}>
                          {formatCurrency(selectedProposal.proposedTerms.initialInvestment)}
                        </Text>
                      </View>
                      <View style={[styles.termItem, { backgroundColor: colors.surfaceAlt }]}>
                        <Calendar size={16} color="#F59E0B" />
                        <Text style={[styles.termLabel, { color: colors.textSecondary }]}>Commitment</Text>
                        <Text style={[styles.termValue, { color: colors.text }]}>
                          {selectedProposal.proposedTerms.minimumCommitmentMonths} months
                        </Text>
                      </View>
                      <View style={[styles.termItem, { backgroundColor: colors.surfaceAlt }]}>
                        <Clock size={16} color="#EF4444" />
                        <Text style={[styles.termLabel, { color: colors.textSecondary }]}>Expires</Text>
                        <Text style={[styles.termValue, { color: colors.text }]}>
                          {new Date(selectedProposal.expiresAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    {selectedProposal.message && (
                      <View style={[styles.messageSection, { backgroundColor: colors.surfaceAlt }]}>
                        <MessageSquare size={16} color={colors.textSecondary} />
                        <Text style={[styles.messageText, { color: colors.text }]}>
                          {selectedProposal.message}
                        </Text>
                      </View>
                    )}

                    {selectedProposal.direction === 'received' && selectedProposal.status === 'pending' && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
                          onPress={() => handleAcceptProposal(selectedProposal)}
                        >
                          <CheckCircle size={18} color="#FFF" />
                          <Text style={styles.actionButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
                          onPress={() => setShowCounterModal(true)}
                        >
                          <Edit3 size={18} color={colors.text} />
                          <Text style={[styles.actionButtonText, { color: colors.text }]}>Counter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                          onPress={() => handleRejectProposal(selectedProposal)}
                        >
                          <XCircle size={18} color="#FFF" />
                          <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}

                {selectedPartnership && (
                  <>
                    <View style={[styles.detailSection, { backgroundColor: colors.surfaceAlt }]}>
                      <Building2 size={20} color={colors.primary} />
                      <View style={styles.detailContent}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Business</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {selectedPartnership.businessName}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.partnersRow}>
                      <View style={[styles.partnerCard, { backgroundColor: colors.surfaceAlt }]}>
                        <Text style={[styles.partnerName, { color: colors.text }]}>
                          {selectedPartnership.partnerAName}
                        </Text>
                        <Text style={[styles.partnerEquity, { color: colors.primary }]}>
                          {selectedPartnership.partnerAEquity}%
                        </Text>
                        <Text style={[styles.partnerProfit, { color: '#22C55E' }]}>
                          {formatCurrency(selectedPartnership.partnerAProfitReceived)}
                        </Text>
                      </View>
                      <View style={styles.vsCircle}>
                        <Handshake size={16} color={colors.textSecondary} />
                      </View>
                      <View style={[styles.partnerCard, { backgroundColor: colors.surfaceAlt }]}>
                        <Text style={[styles.partnerName, { color: colors.text }]}>
                          {selectedPartnership.partnerBName}
                        </Text>
                        <Text style={[styles.partnerEquity, { color: colors.primary }]}>
                          {selectedPartnership.partnerBEquity}%
                        </Text>
                        <Text style={[styles.partnerProfit, { color: '#22C55E' }]}>
                          {formatCurrency(selectedPartnership.partnerBProfitReceived)}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.performanceCard, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={[styles.performanceTitle, { color: colors.text }]}>Performance</Text>
                      <View style={styles.performanceGrid}>
                        <View style={styles.performanceItem}>
                          <Text style={[styles.performanceValue, { color: '#22C55E' }]}>
                            {formatCurrency(selectedPartnership.performanceMetrics.totalProfit)}
                          </Text>
                          <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
                            Total Profit
                          </Text>
                        </View>
                        <View style={styles.performanceItem}>
                          <Text style={[styles.performanceValue, { color: colors.text }]}>
                            {selectedPartnership.performanceMetrics.monthsActive}
                          </Text>
                          <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
                            Months Active
                          </Text>
                        </View>
                        <View style={styles.performanceItem}>
                          <Text style={[styles.performanceValue, { color: colors.primary }]}>
                            {selectedPartnership.performanceMetrics.roiPercentage.toFixed(1)}%
                          </Text>
                          <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
                            ROI
                          </Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.terminateButton, { backgroundColor: '#EF444420' }]}
                      onPress={() => handleTerminatePartnership(selectedPartnership)}
                    >
                      <Trash2 size={18} color="#EF4444" />
                      <Text style={styles.terminateText}>Terminate Partnership</Text>
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.modalBottomPadding} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={showProposalModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.detailModal, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Send Proposal</Text>
                <TouchableOpacity onPress={() => setShowProposalModal(false)}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Select Business</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.businessPicker}>
                  {userBusinesses.map(business => (
                    <TouchableOpacity
                      key={business.id}
                      style={[
                        styles.businessOption,
                        { backgroundColor: colors.surfaceAlt },
                        newProposal.businessId === business.id && { borderColor: colors.primary, borderWidth: 2 }
                      ]}
                      onPress={() => setNewProposal(prev => ({
                        ...prev,
                        businessId: business.id,
                        businessName: business.businessName,
                      }))}
                    >
                      <Text style={[styles.businessOptionText, { color: colors.text }]} numberOfLines={1}>
                        {business.businessName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Partner Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                  placeholder="Enter partner's name"
                  placeholderTextColor={colors.textLight}
                  value={newProposal.recipientName}
                  onChangeText={(text) => setNewProposal(prev => ({ ...prev, recipientName: text, recipientId: `user_${Date.now()}` }))}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Equity Percentage</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                  placeholder="25"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={newProposal.terms.equityPercentage.toString()}
                  onChangeText={(text) => setNewProposal(prev => ({
                    ...prev,
                    terms: { ...prev.terms, equityPercentage: parseInt(text) || 0 }
                  }))}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Initial Investment</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                  placeholder="10000"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={newProposal.terms.initialInvestment.toString()}
                  onChangeText={(text) => setNewProposal(prev => ({
                    ...prev,
                    terms: { ...prev.terms, initialInvestment: parseInt(text) || 0 }
                  }))}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Message</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                  placeholder="Describe why you'd like to partner..."
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={4}
                  value={newProposal.message}
                  onChangeText={(text) => setNewProposal(prev => ({ ...prev, message: text }))}
                />

                <TouchableOpacity
                  style={[styles.sendProposalButton, { backgroundColor: colors.primary }]}
                  onPress={handleSendProposal}
                >
                  <Send size={18} color="#FFF" />
                  <Text style={styles.sendProposalText}>Send Proposal</Text>
                </TouchableOpacity>

                <View style={styles.modalBottomPadding} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={showCounterModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.counterModal, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Counter Offer</Text>
              <Text style={[styles.counterHint, { color: colors.textSecondary }]}>
                Your counter will reduce the equity percentage by 5% and include your message.
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                placeholder="Add a message (optional)"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
                value={counterMessage}
                onChangeText={setCounterMessage}
              />
              <View style={styles.counterActions}>
                <TouchableOpacity
                  style={[styles.counterButton, { backgroundColor: colors.surfaceAlt }]}
                  onPress={() => setShowCounterModal(false)}
                >
                  <Text style={[styles.counterButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.counterButton, { backgroundColor: colors.primary }]}
                  onPress={handleCounterProposal}
                >
                  <Text style={[styles.counterButtonText, { color: '#FFF' }]}>Send Counter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16 },
  statsCard: { margin: 16, padding: 16, borderRadius: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: '#E5E7EB30' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB20' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabBadge: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tabBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  scrollContent: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 11, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, gap: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  activeText: { fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 13 },
  cardStats: { flexDirection: 'row', gap: 16, marginTop: 4 },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStatText: { fontSize: 13, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  cardDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDateText: { fontSize: 11 },
  emptyState: { padding: 40, borderRadius: 16, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  bottomPadding: { height: 80 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  detailSection: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 12, marginBottom: 12 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '600' },
  termsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  termItem: { width: '48%', padding: 12, borderRadius: 10, alignItems: 'center', gap: 4 },
  termLabel: { fontSize: 11 },
  termValue: { fontSize: 14, fontWeight: '700' },
  messageSection: { flexDirection: 'row', padding: 14, borderRadius: 12, gap: 10, marginBottom: 16 },
  messageText: { flex: 1, fontSize: 14, lineHeight: 20 },
  actionButtons: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 6 },
  actionButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  partnersRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  partnerCard: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', gap: 4 },
  partnerName: { fontSize: 14, fontWeight: '600' },
  partnerEquity: { fontSize: 18, fontWeight: '700' },
  partnerProfit: { fontSize: 12, fontWeight: '500' },
  vsCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  performanceCard: { padding: 16, borderRadius: 14, marginBottom: 16 },
  performanceTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  performanceGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  performanceItem: { alignItems: 'center' },
  performanceValue: { fontSize: 18, fontWeight: '700' },
  performanceLabel: { fontSize: 11, marginTop: 2 },
  terminateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8 },
  terminateText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { padding: 14, borderRadius: 12, fontSize: 15 },
  textArea: { padding: 14, borderRadius: 12, fontSize: 15, minHeight: 100, textAlignVertical: 'top' },
  businessPicker: { marginBottom: 8 },
  businessOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginRight: 8 },
  businessOptionText: { fontSize: 14, fontWeight: '500' },
  sendProposalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8, marginTop: 20 },
  sendProposalText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  counterModal: { marginHorizontal: 20, marginVertical: 100, padding: 20, borderRadius: 20 },
  counterHint: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  counterActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  counterButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  counterButtonText: { fontSize: 15, fontWeight: '600' },
  modalBottomPadding: { height: 40 },
});
