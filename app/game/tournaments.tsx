import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  Trophy,
  Clock,
  Users,
  DollarSign,
  Medal,
  Crown,
  ChevronRight,
  Calendar,
  Target,
  Zap,
  X,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { formatCurrency } from '@/utils/creditEngine';
import { Tournament } from '@/types/multiplayer';

type Tab = 'active' | 'upcoming' | 'completed';

export default function TournamentsScreen() {
  const { colors } = useTheme();
  const { tournaments, activeTournaments, upcomingTournaments, joinTournament, currentPlayer } = useMultiplayer();

  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const completedTournaments = tournaments.filter(t => t.status === 'completed');

  const getFilteredTournaments = () => {
    switch (activeTab) {
      case 'active': return activeTournaments;
      case 'upcoming': return upcomingTournaments;
      case 'completed': return completedTournaments;
      default: return [];
    }
  };

  const getCategoryColor = (category: Tournament['category']) => {
    switch (category) {
      case 'credit_improvement': return '#10B981';
      case 'net_worth': return '#3B82F6';
      case 'savings': return '#8B5CF6';
      case 'debt_reduction': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const getCategoryLabel = (category: Tournament['category']) => {
    switch (category) {
      case 'credit_improvement': return 'Credit';
      case 'net_worth': return 'Net Worth';
      case 'savings': return 'Savings';
      case 'debt_reduction': return 'Debt';
      default: return 'Mixed';
    }
  };

  const getTimeRemaining = (endDate: number) => {
    const diff = endDate - Date.now();
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const handleJoinTournament = (tournament: Tournament) => {
    if (!currentPlayer) return;

    const isParticipant = tournament.participants.some(p => p.playerId === currentPlayer.id);
    if (isParticipant) {
      Alert.alert('Already Joined', 'You are already participating in this tournament.');
      return;
    }

    Alert.alert(
      'Join Tournament',
      `Entry fee: ${formatCurrency(tournament.entryFee)}\n\nAre you sure you want to join "${tournament.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: () => {
            joinTournament(tournament.id);
            Alert.alert('Success', `You've joined ${tournament.name}!`);
            setShowDetailsModal(false);
          },
        },
      ]
    );
  };

  const renderTournamentCard = (tournament: Tournament) => {
    const categoryColor = getCategoryColor(tournament.category);
    const isJoined = currentPlayer && tournament.participants.some(p => p.playerId === currentPlayer.id);

    return (
      <TouchableOpacity
        key={tournament.id}
        style={[styles.tournamentCard, { backgroundColor: colors.surface }]}
        onPress={() => {
          setSelectedTournament(tournament);
          setShowDetailsModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.cardBanner, { backgroundColor: categoryColor }]}>
          <Trophy size={28} color="#FFF" />
          <View style={styles.cardBannerContent}>
            <Text style={styles.cardBannerTitle}>{tournament.name}</Text>
            <View style={styles.cardBannerMeta}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{tournament.type.toUpperCase()}</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{getCategoryLabel(tournament.category)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {tournament.description}
          </Text>

          <View style={styles.cardStats}>
            <View style={styles.cardStat}>
              <DollarSign size={16} color="#10B981" />
              <Text style={[styles.cardStatValue, { color: colors.text }]}>
                {formatCurrency(tournament.prizePool)}
              </Text>
              <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Prize</Text>
            </View>
            <View style={[styles.cardStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.cardStat}>
              <Users size={16} color="#3B82F6" />
              <Text style={[styles.cardStatValue, { color: colors.text }]}>
                {tournament.participants.length}/{tournament.maxParticipants}
              </Text>
              <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Players</Text>
            </View>
            <View style={[styles.cardStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.cardStat}>
              <Clock size={16} color="#F59E0B" />
              <Text style={[styles.cardStatValue, { color: colors.text }]}>
                {getTimeRemaining(tournament.endDate)}
              </Text>
              <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>
                {tournament.status === 'upcoming' ? 'Starts' : 'Left'}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            {isJoined ? (
              <View style={[styles.joinedBadge, { backgroundColor: '#10B98120' }]}>
                <Check size={14} color="#10B981" />
                <Text style={styles.joinedText}>Joined</Text>
              </View>
            ) : (
              <View style={[styles.entryFee, { backgroundColor: colors.background }]}>
                <Text style={[styles.entryFeeText, { color: colors.textSecondary }]}>
                  Entry: {formatCurrency(tournament.entryFee)}
                </Text>
              </View>
            )}
            <ChevronRight size={20} color={colors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLeaderboardItem = (entry: Tournament['leaderboard'][0], index: number) => {
    const getRankBadge = (rank: number) => {
      if (rank === 1) return { color: '#FFD700', Icon: Crown };
      if (rank === 2) return { color: '#C0C0C0', Icon: Medal };
      if (rank === 3) return { color: '#CD7F32', Icon: Medal };
      return null;
    };

    const badge = getRankBadge(entry.rank);

    return (
      <View key={entry.playerId} style={[styles.leaderboardItem, { backgroundColor: colors.background }]}>
        <View style={styles.leaderboardRank}>
          {badge ? (
            <View style={[styles.rankBadge, { backgroundColor: badge.color + '20' }]}>
              <badge.Icon size={16} color={badge.color} />
            </View>
          ) : (
            <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>#{entry.rank}</Text>
          )}
        </View>
        {entry.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={styles.leaderboardAvatar} />
        ) : (
          <View style={[styles.leaderboardAvatarPlaceholder, { backgroundColor: colors.primary + '30' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {entry.playerName.charAt(0)}
            </Text>
          </View>
        )}
        <View style={styles.leaderboardInfo}>
          <Text style={[styles.leaderboardName, { color: colors.text }]}>{entry.playerName}</Text>
          {entry.guildName && (
            <Text style={[styles.leaderboardGuild, { color: colors.textSecondary }]}>{entry.guildName}</Text>
          )}
        </View>
        <View style={styles.leaderboardScore}>
          <Text style={[styles.scoreValue, { color: '#10B981' }]}>+{entry.improvement}</Text>
          <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>pts</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Tournaments' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.tabs}>
            {(['active', 'upcoming', 'completed'] as Tab[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && { backgroundColor: colors.primary }]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, { color: activeTab === tab ? '#FFF' : colors.textSecondary }]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {getFilteredTournaments().length > 0 ? (
              getFilteredTournaments().map(renderTournamentCard)
            ) : (
              <View style={styles.emptyState}>
                <Trophy size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No {activeTab} Tournaments
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {activeTab === 'active'
                    ? 'Check back soon for new tournaments!'
                    : activeTab === 'upcoming'
                    ? 'New tournaments will be announced soon.'
                    : 'Complete tournaments to see your history.'}
                </Text>
              </View>
            )}
          </Animated.View>
          <View style={styles.bottomPadding} />
        </ScrollView>

        <Modal visible={showDetailsModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              {selectedTournament && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.modalClose, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setShowDetailsModal(false);
                      setSelectedTournament(null);
                    }}
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>

                  <View style={[styles.modalBanner, { backgroundColor: getCategoryColor(selectedTournament.category) }]}>
                    <Trophy size={40} color="#FFF" />
                    <Text style={styles.modalTitle}>{selectedTournament.name}</Text>
                    <View style={styles.modalBadges}>
                      <View style={styles.modalBadge}>
                        <Text style={styles.modalBadgeText}>{selectedTournament.type.toUpperCase()}</Text>
                      </View>
                      <View style={styles.modalBadge}>
                        <Text style={styles.modalBadgeText}>{getCategoryLabel(selectedTournament.category)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalBody}>
                    <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                      {selectedTournament.description}
                    </Text>

                    <View style={[styles.modalStats, { backgroundColor: colors.background }]}>
                      <View style={styles.modalStat}>
                        <DollarSign size={20} color="#10B981" />
                        <Text style={[styles.modalStatValue, { color: colors.text }]}>
                          {formatCurrency(selectedTournament.prizePool)}
                        </Text>
                        <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Prize Pool</Text>
                      </View>
                      <View style={styles.modalStat}>
                        <Users size={20} color="#3B82F6" />
                        <Text style={[styles.modalStatValue, { color: colors.text }]}>
                          {selectedTournament.participants.length}/{selectedTournament.maxParticipants}
                        </Text>
                        <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Players</Text>
                      </View>
                      <View style={styles.modalStat}>
                        <Clock size={20} color="#F59E0B" />
                        <Text style={[styles.modalStatValue, { color: colors.text }]}>
                          {getTimeRemaining(selectedTournament.endDate)}
                        </Text>
                        <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Remaining</Text>
                      </View>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Prizes</Text>
                    <View style={styles.prizesList}>
                      {selectedTournament.prizes.map((prize, index) => (
                        <View key={index} style={[styles.prizeItem, { backgroundColor: colors.background }]}>
                          <View style={[styles.prizeRank, { backgroundColor: index === 0 ? '#FFD70020' : index === 1 ? '#C0C0C020' : '#CD7F3220' }]}>
                            <Text style={[styles.prizeRankText, { color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }]}>
                              #{prize.rank}
                            </Text>
                          </View>
                          <Text style={[styles.prizeDescription, { color: colors.text }]}>{prize.description}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Rules</Text>
                    <View style={[styles.rulesCard, { backgroundColor: colors.background }]}>
                      {selectedTournament.rules.map((rule, index) => (
                        <View key={index} style={styles.ruleItem}>
                          <View style={[styles.ruleBullet, { backgroundColor: colors.primary }]} />
                          <Text style={[styles.ruleText, { color: colors.textSecondary }]}>{rule}</Text>
                        </View>
                      ))}
                    </View>

                    {selectedTournament.leaderboard.length > 0 && (
                      <>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Leaderboard</Text>
                        {selectedTournament.leaderboard.map(renderLeaderboardItem)}
                      </>
                    )}

                    {selectedTournament.status !== 'completed' && (
                      <TouchableOpacity
                        style={[styles.joinButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleJoinTournament(selectedTournament)}
                      >
                        <Zap size={20} color="#FFF" />
                        <Text style={styles.joinButtonText}>
                          {currentPlayer && selectedTournament.participants.some(p => p.playerId === currentPlayer.id)
                            ? 'Already Joined'
                            : `Join - ${formatCurrency(selectedTournament.entryFee)}`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  tournamentCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  cardBannerContent: {
    flex: 1,
  },
  cardBannerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  cardBannerMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  cardContent: {
    padding: 16,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  cardStats: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  cardStat: {
    flex: 1,
    alignItems: 'center',
  },
  cardStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  cardStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  cardStatDivider: {
    width: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  joinedText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  entryFee: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  entryFeeText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalBanner: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700' as const,
    marginTop: 12,
    textAlign: 'center',
  },
  modalBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  modalBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalStats: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  modalStat: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 6,
  },
  modalStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  prizesList: {
    gap: 10,
    marginBottom: 24,
  },
  prizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  prizeRank: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prizeRankText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  prizeDescription: {
    flex: 1,
    fontSize: 14,
  },
  rulesCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ruleBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  leaderboardRank: {
    width: 40,
    alignItems: 'center',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
  },
  leaderboardAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  leaderboardGuild: {
    fontSize: 12,
    marginTop: 2,
  },
  leaderboardScore: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  scoreLabel: {
    fontSize: 11,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  joinButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 40,
  },
});
