import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  Shield,
  Users,
  Trophy,
  Target,
  Crown,
  Star,
  TrendingUp,
  ChevronRight,
  Search,
  X,
  Check,
  LogOut,
  Zap,
  Gift,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { formatCurrency, getCreditTier } from '@/utils/creditEngine';
import { Guild } from '@/types/multiplayer';

type Tab = 'my_guild' | 'browse';

export default function GuildsScreen() {
  const { colors } = useTheme();
  const { guild, availableGuilds, joinGuild, leaveGuild } = useMultiplayer();

  const [activeTab, setActiveTab] = useState<Tab>(guild ? 'my_guild' : 'browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const filteredGuilds = availableGuilds.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinGuild = () => {
    if (selectedGuild) {
      joinGuild(selectedGuild.id, applicationMessage || undefined);
      setShowJoinModal(false);
      setSelectedGuild(null);
      setApplicationMessage('');
      
      if (selectedGuild.isOpen) {
        Alert.alert('Welcome!', `You've joined ${selectedGuild.name}!`);
        setActiveTab('my_guild');
      } else {
        Alert.alert('Application Sent', `Your application to ${selectedGuild.name} has been submitted.`);
      }
    }
  };

  const handleLeaveGuild = () => {
    if (guild) {
      Alert.alert(
        'Leave Guild',
        `Are you sure you want to leave ${guild.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              leaveGuild();
              setActiveTab('browse');
            },
          },
        ]
      );
    }
  };

  const renderMyGuild = () => {
    if (!guild) {
      return (
        <View style={styles.emptyState}>
          <Shield size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Guild Yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Join a guild to access exclusive perks, compete in tournaments, and connect with other players!
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('browse')}
          >
            <Search size={18} color="#FFF" />
            <Text style={styles.emptyButtonText}>Browse Guilds</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={[styles.guildHeader, { backgroundColor: guild.bannerColor }]}>
          <View style={styles.guildBanner}>
            {guild.logoUrl && (
              <Image source={{ uri: guild.logoUrl }} style={styles.guildLogo} />
            )}
            <View style={styles.guildTitleSection}>
              <View style={styles.guildNameRow}>
                <Text style={styles.guildName}>{guild.name}</Text>
                <View style={styles.guildTag}>
                  <Text style={styles.guildTagText}>[{guild.tag}]</Text>
                </View>
              </View>
              <View style={styles.guildLevelRow}>
                <Zap size={14} color="#FFD700" />
                <Text style={styles.guildLevel}>Level {guild.level}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.guildStats, { backgroundColor: colors.surface }]}>
          <View style={styles.statItem}>
            <Users size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{guild.stats.totalMembers}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Members</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <TrendingUp size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: colors.text }]}>{guild.stats.avgCreditScore}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Score</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Trophy size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.text }]}>#{guild.stats.rank}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rank</Text>
          </View>
        </View>

        <View style={[styles.descriptionCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{guild.description}</Text>
        </View>

        {guild.weeklyChallenge && (
          <View style={[styles.challengeCard, { backgroundColor: colors.surface }]}>
            <View style={styles.challengeHeader}>
              <Target size={20} color={colors.primary} />
              <Text style={[styles.challengeTitle, { color: colors.text }]}>Weekly Guild Challenge</Text>
            </View>
            <Text style={[styles.challengeName, { color: colors.text }]}>{guild.weeklyChallenge.name}</Text>
            <Text style={[styles.challengeDesc, { color: colors.textSecondary }]}>
              {guild.weeklyChallenge.description}
            </Text>
            <View style={styles.progressSection}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.primary, width: `${guild.weeklyChallenge.guildProgress}%` },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {guild.weeklyChallenge.guildProgress}% Complete
              </Text>
            </View>
            <View style={styles.rewardRow}>
              <Gift size={16} color="#F59E0B" />
              <Text style={[styles.rewardText, { color: '#F59E0B' }]}>
                {guild.weeklyChallenge.reward.tokens.toLocaleString()} tokens
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.perksCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Guild Perks</Text>
          {guild.perks.map(perk => (
            <View key={perk.id} style={styles.perkItem}>
              <View style={[styles.perkIcon, { backgroundColor: colors.primary + '20' }]}>
                <Star size={16} color={colors.primary} />
              </View>
              <View style={styles.perkInfo}>
                <Text style={[styles.perkName, { color: colors.text }]}>{perk.name}</Text>
                <Text style={[styles.perkDesc, { color: colors.textSecondary }]}>{perk.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.leaveButton, { borderColor: '#EF4444' }]}
          onPress={handleLeaveGuild}
        >
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.leaveText}>Leave Guild</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderGuildCard = (g: Guild) => {
    const isCurrentGuild = guild?.id === g.id;

    return (
      <TouchableOpacity
        key={g.id}
        style={[styles.guildCard, { backgroundColor: colors.surface }]}
        onPress={() => {
          if (!isCurrentGuild) {
            setSelectedGuild(g);
            setShowJoinModal(true);
          }
        }}
        activeOpacity={0.7}
        disabled={isCurrentGuild}
      >
        <View style={[styles.cardBanner, { backgroundColor: g.bannerColor }]}>
          {g.logoUrl && <Image source={{ uri: g.logoUrl }} style={styles.cardLogo} />}
          <View style={styles.cardRank}>
            <Text style={styles.cardRankText}>#{g.stats.rank}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{g.name}</Text>
            <View style={[styles.cardTag, { backgroundColor: g.bannerColor + '30' }]}>
              <Text style={[styles.cardTagText, { color: g.bannerColor }]}>{g.tag}</Text>
            </View>
          </View>

          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {g.description}
          </Text>

          <View style={styles.cardStats}>
            <View style={styles.cardStat}>
              <Users size={14} color={colors.textSecondary} />
              <Text style={[styles.cardStatText, { color: colors.textSecondary }]}>
                {g.stats.totalMembers}/{g.maxMembers}
              </Text>
            </View>
            <View style={styles.cardStat}>
              <TrendingUp size={14} color="#10B981" />
              <Text style={[styles.cardStatText, { color: colors.textSecondary }]}>
                {g.stats.avgCreditScore} avg
              </Text>
            </View>
            <View style={styles.cardStat}>
              <Zap size={14} color="#F59E0B" />
              <Text style={[styles.cardStatText, { color: colors.textSecondary }]}>Lv.{g.level}</Text>
            </View>
          </View>

          {g.requirements.minCreditScore && (
            <View style={[styles.requirementBadge, { backgroundColor: colors.background }]}>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                Min {g.requirements.minCreditScore} credit score
              </Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            {isCurrentGuild ? (
              <View style={[styles.memberBadge, { backgroundColor: colors.primary + '20' }]}>
                <Check size={14} color={colors.primary} />
                <Text style={[styles.memberText, { color: colors.primary }]}>Member</Text>
              </View>
            ) : g.isOpen ? (
              <View style={[styles.openBadge, { backgroundColor: '#10B98120' }]}>
                <Text style={styles.openText}>Open to Join</Text>
              </View>
            ) : (
              <View style={[styles.applyBadge, { backgroundColor: '#F59E0B20' }]}>
                <Text style={styles.applyText}>Apply to Join</Text>
              </View>
            )}
            <ChevronRight size={20} color={colors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Guilds' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my_guild' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab('my_guild')}
            >
              <Shield size={16} color={activeTab === 'my_guild' ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === 'my_guild' ? '#FFF' : colors.textSecondary }]}>
                My Guild
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'browse' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab('browse')}
            >
              <Search size={16} color={activeTab === 'browse' ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === 'browse' ? '#FFF' : colors.textSecondary }]}>
                Browse
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'browse' && (
            <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
              <Search size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search guilds..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {activeTab === 'my_guild' ? (
            renderMyGuild()
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              {filteredGuilds.map(renderGuildCard)}
            </Animated.View>
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>

        <Modal visible={showJoinModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowJoinModal(false);
                  setSelectedGuild(null);
                  setApplicationMessage('');
                }}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>

              {selectedGuild && (
                <>
                  <View style={[styles.modalBanner, { backgroundColor: selectedGuild.bannerColor }]}>
                    {selectedGuild.logoUrl && (
                      <Image source={{ uri: selectedGuild.logoUrl }} style={styles.modalLogo} />
                    )}
                  </View>

                  <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedGuild.name}</Text>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    {selectedGuild.description}
                  </Text>

                  <View style={styles.modalStats}>
                    <View style={[styles.modalStat, { backgroundColor: colors.background }]}>
                      <Users size={16} color={colors.primary} />
                      <Text style={[styles.modalStatText, { color: colors.text }]}>
                        {selectedGuild.stats.totalMembers} members
                      </Text>
                    </View>
                    <View style={[styles.modalStat, { backgroundColor: colors.background }]}>
                      <Trophy size={16} color="#F59E0B" />
                      <Text style={[styles.modalStatText, { color: colors.text }]}>
                        Rank #{selectedGuild.stats.rank}
                      </Text>
                    </View>
                  </View>

                  {!selectedGuild.isOpen && (
                    <>
                      <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                        Application Message
                      </Text>
                      <TextInput
                        style={[styles.applicationInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="Tell them why you want to join..."
                        placeholderTextColor={colors.textSecondary}
                        value={applicationMessage}
                        onChangeText={setApplicationMessage}
                        multiline
                        maxLength={200}
                      />
                    </>
                  )}

                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: colors.primary }]}
                    onPress={handleJoinGuild}
                  >
                    <Text style={styles.joinButtonText}>
                      {selectedGuild.isOpen ? 'Join Guild' : 'Send Application'}
                    </Text>
                  </TouchableOpacity>
                </>
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
    gap: 10,
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
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
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
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  guildHeader: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  guildBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  guildLogo: {
    width: 70,
    height: 70,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  guildTitleSection: {
    marginLeft: 16,
    flex: 1,
  },
  guildNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guildName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  guildTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guildTagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  guildLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  guildLevel: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  guildStats: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
  },
  descriptionCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  challengeCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  challengeName: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  challengeDesc: {
    fontSize: 13,
    marginBottom: 14,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  perksCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 14,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  perkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perkInfo: {
    flex: 1,
    marginLeft: 12,
  },
  perkName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  perkDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  leaveText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  guildCard: {
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardBanner: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardRank: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardRankText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  cardContent: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700' as const,
    flex: 1,
  },
  cardTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cardDesc: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardStatText: {
    fontSize: 12,
  },
  requirementBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  requirementText: {
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  memberText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  openBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  openText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  applyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  applyText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
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
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLogo: {
    width: 70,
    height: 70,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
  },
  modalDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 24,
  },
  modalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  modalStatText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  modalLabel: {
    fontSize: 13,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  applicationInput: {
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  joinButton: {
    marginHorizontal: 24,
    marginVertical: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
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
