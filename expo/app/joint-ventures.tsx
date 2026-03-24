import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Handshake,
  Plus,
  Inbox,
  Building2,
  TrendingUp,
  DollarSign,
  Bell,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { JointVentureService } from '@/services/JointVentureService';
import JointVentureCard from '@/components/business/JointVentureCard';
import JointVentureProposalModal from '@/components/business/JointVentureProposalModal';
import {
  JointVentureData,
  JointVentureProposal,
  getTimeRemaining,
} from '@/types/multiplayer-business';
import { formatCurrency } from '@/types/business';

type TabType = 'ventures' | 'proposals';

export default function JointVenturesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('ventures');
  const [ventures, setVentures] = useState<JointVentureData[]>([]);
  const [proposals, setProposals] = useState<JointVentureProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);

  const userId = user?.id || 'anonymous';
  const userName = user?.name || 'Player';

  const loadData = useCallback(async () => {
    try {
      const [venturesData, proposalsData] = await Promise.all([
        JointVentureService.getActiveVentures(userId),
        JointVentureService.getPendingProposals(userId),
      ]);
      setVentures(venturesData);
      setProposals(proposalsData);
      console.log('[JointVenturesScreen] Loaded ventures:', venturesData.length, 'proposals:', proposalsData.length);
    } catch (error) {
      console.error('[JointVenturesScreen] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleRespondToProposal = useCallback(async (proposal: JointVentureProposal, accept: boolean) => {
    const action = accept ? 'accept' : 'decline';
    
    Alert.alert(
      `${accept ? 'Accept' : 'Decline'} Proposal`,
      `Are you sure you want to ${action} this partnership proposal from ${proposal.proposerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: accept ? 'Accept' : 'Decline',
          style: accept ? 'default' : 'destructive',
          onPress: async () => {
            const result = await JointVentureService.respondToProposal(
              proposal.id,
              accept,
              userId
            );

            if (result.success) {
              Haptics.notificationAsync(
                accept
                  ? Haptics.NotificationFeedbackType.Success
                  : Haptics.NotificationFeedbackType.Warning
              );
              Alert.alert(
                accept ? 'Partnership Formed!' : 'Proposal Declined',
                accept
                  ? 'You are now partners in this venture!'
                  : 'The proposal has been declined.'
              );
              loadData();
            } else {
              Alert.alert('Error', result.error || 'Failed to respond to proposal');
            }
          },
        },
      ]
    );
  }, [userId, loadData]);

  const stats = useMemo(() => {
    const totalInvestment = ventures.reduce((sum, v) => {
      const partner = v.partners.find(p => p.userId === userId);
      return sum + (partner?.investmentAmount || 0);
    }, 0);

    const totalProfit = ventures.reduce((sum, v) => {
      const partner = v.partners.find(p => p.userId === userId);
      return sum + ((v.monthlyProfit * (partner?.profitShare || 0)) / 100);
    }, 0);

    const pendingDecisions = ventures.reduce((sum, v) => sum + v.pendingDecisions.length, 0);

    return { totalInvestment, totalProfit, pendingDecisions };
  }, [ventures, userId]);

  const styles = createStyles(colors);

  const renderStats = () => (
    <LinearGradient
      colors={colors.gradient.primary as [string, string]}
      style={styles.statsCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.statsHeader}>
        <Handshake size={24} color={colors.white} />
        <Text style={styles.statsTitle}>Joint Ventures</Text>
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Building2 size={18} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statValue}>{ventures.length}</Text>
          <Text style={styles.statLabel}>Ventures</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <DollarSign size={18} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statValue}>{formatCurrency(stats.totalInvestment)}</Text>
          <Text style={styles.statLabel}>Invested</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <TrendingUp size={18} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statValue}>{formatCurrency(stats.totalProfit)}</Text>
          <Text style={styles.statLabel}>Monthly</Text>
        </View>
      </View>
      {stats.pendingDecisions > 0 && (
        <View style={styles.pendingAlert}>
          <Bell size={16} color={colors.warning} />
          <Text style={styles.pendingAlertText}>
            {stats.pendingDecisions} decision{stats.pendingDecisions !== 1 ? 's' : ''} need your vote
          </Text>
        </View>
      )}
    </LinearGradient>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'ventures' && styles.tabActive]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveTab('ventures');
        }}
        activeOpacity={0.7}
      >
        <Building2 size={16} color={activeTab === 'ventures' ? colors.primary : colors.textSecondary} />
        <Text style={[styles.tabText, activeTab === 'ventures' && styles.tabTextActive]}>
          My Ventures
        </Text>
        {ventures.length > 0 && (
          <View style={[styles.tabBadge, activeTab === 'ventures' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, activeTab === 'ventures' && styles.tabBadgeTextActive]}>
              {ventures.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'proposals' && styles.tabActive]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveTab('proposals');
        }}
        activeOpacity={0.7}
      >
        <Inbox size={16} color={activeTab === 'proposals' ? colors.primary : colors.textSecondary} />
        <Text style={[styles.tabText, activeTab === 'proposals' && styles.tabTextActive]}>
          Proposals
        </Text>
        {proposals.length > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: colors.warning }]}>
            <Text style={[styles.tabBadgeText, { color: colors.white }]}>
              {proposals.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderProposalCard = (proposal: JointVentureProposal) => {
    const timeRemaining = getTimeRemaining(proposal.expiresAt);

    return (
      <View key={proposal.id} style={styles.proposalCard}>
        <View style={styles.proposalHeader}>
          <View style={styles.proposalFrom}>
            <View style={styles.proposalAvatar}>
              <Text style={styles.proposalAvatarText}>
                {proposal.proposerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.proposalName}>{proposal.proposerName}</Text>
              <Text style={styles.proposalTime}>
                {timeRemaining.isExpired ? 'Expired' : `Expires in ${timeRemaining.formatted}`}
              </Text>
            </View>
          </View>
          <View style={[styles.proposalBadge, { backgroundColor: colors.primary + '15' }]}>
            <Handshake size={14} color={colors.primary} />
          </View>
        </View>

        <View style={styles.proposalBody}>
          <Text style={styles.proposalVentureName}>{proposal.proposedName}</Text>
          {proposal.message && (
            <Text style={styles.proposalMessage} numberOfLines={2}>
              {`"${proposal.message}"`}
            </Text>
          )}
        </View>

        <View style={styles.proposalTerms}>
          <View style={styles.proposalTermItem}>
            <Text style={styles.termLabel}>Your Share</Text>
            <Text style={styles.termValue}>{100 - proposal.proposedOwnershipSplit}%</Text>
          </View>
          <View style={styles.termDivider} />
          <View style={styles.proposalTermItem}>
            <Text style={styles.termLabel}>Investment</Text>
            <Text style={styles.termValue}>{formatCurrency(proposal.proposedInvestment)}</Text>
          </View>
        </View>

        <View style={styles.proposalActions}>
          <TouchableOpacity
            style={[styles.proposalButton, styles.declineButton]}
            onPress={() => handleRespondToProposal(proposal, false)}
            activeOpacity={0.7}
          >
            <XCircle size={18} color={colors.error} />
            <Text style={[styles.proposalButtonText, { color: colors.error }]}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.proposalButton, styles.acceptButton]}
            onPress={() => handleRespondToProposal(proposal, true)}
            activeOpacity={0.7}
          >
            <CheckCircle size={18} color={colors.white} />
            <Text style={[styles.proposalButtonText, { color: colors.white }]}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        {activeTab === 'ventures' ? (
          <Handshake size={48} color={colors.textLight} />
        ) : (
          <Inbox size={48} color={colors.textLight} />
        )}
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'ventures' ? 'No Joint Ventures' : 'No Pending Proposals'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'ventures'
          ? 'Start a joint venture with another player to grow your business empire together!'
          : 'You have no pending partnership proposals at the moment.'}
      </Text>
      {activeTab === 'ventures' && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => setShowProposalModal(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color={colors.white} />
          <Text style={styles.emptyButtonText}>Propose Partnership</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Joint Ventures',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowProposalModal(true);
              }}
              style={styles.headerButton}
            >
              <Plus size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {renderStats()}
        {renderTabs()}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : activeTab === 'ventures' ? (
          ventures.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.venturesList}>
              {ventures.map((venture) => (
                <JointVentureCard
                  key={venture.id}
                  venture={venture}
                  currentUserId={userId}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    console.log('[JointVentures] View venture:', venture.id);
                  }}
                  onVotePress={(decisionId) => {
                    console.log('[JointVentures] Vote on decision:', decisionId);
                  }}
                />
              ))}
            </View>
          )
        ) : proposals.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.proposalsList}>
            {proposals.map(renderProposalCard)}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <JointVentureProposalModal
        visible={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        onProposalSent={() => loadData()}
        currentUserId={userId}
        currentUserName={userName}
      />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  pendingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  pendingAlertText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500' as const,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.primary + '15',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600' as const,
  },
  tabBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  tabBadgeActive: {
    backgroundColor: colors.primary + '20',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: colors.primary,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  venturesList: {
    gap: 12,
  },
  proposalsList: {
    gap: 12,
  },
  proposalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  proposalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  proposalFrom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proposalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proposalAvatarText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  proposalName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
  },
  proposalTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  proposalBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proposalBody: {
    marginBottom: 14,
  },
  proposalVentureName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 6,
  },
  proposalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic' as const,
    lineHeight: 20,
  },
  proposalTerms: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  proposalTermItem: {
    flex: 1,
    alignItems: 'center',
  },
  termDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  termLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  termValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  proposalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  proposalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  declineButton: {
    backgroundColor: colors.error + '15',
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  proposalButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.white,
  },
});
