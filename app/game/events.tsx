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
  Calendar,
  Gift,
  Target,
  Clock,
  Users,
  ChevronRight,
  X,
  Check,
  Zap,
  Star,
  Trophy,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { CommunityEvent, Challenge } from '@/types/multiplayer';

type Tab = 'events' | 'challenges';

export default function EventsScreen() {
  const { colors } = useTheme();
  const {
    communityEvents,
    activeEvents,
    challenges,
    dailyChallenges,
    weeklyChallenges,
    joinEvent,
    startChallenge,
    completeChallenge,
  } = useMultiplayer();

  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const getEventTypeColor = (type: CommunityEvent['type']) => {
    switch (type) {
      case 'challenge': return '#EF4444';
      case 'celebration': return '#F59E0B';
      case 'competition': return '#8B5CF6';
      case 'learning': return '#3B82F6';
      case 'charity': return '#EC4899';
      default: return '#10B981';
    }
  };

  const getDifficultyColor = (difficulty: Challenge['difficulty']) => {
    switch (difficulty) {
      case 'easy': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'hard': return '#EF4444';
      case 'expert': return '#8B5CF6';
      default: return '#6B7280';
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

  const handleJoinEvent = (event: CommunityEvent) => {
    joinEvent(event.id);
    Alert.alert('Joined!', `You've joined ${event.name}!`);
    setShowEventModal(false);
  };

  const handleStartChallenge = (challenge: Challenge) => {
    if (challenge.status === 'active') {
      const progress = (challenge.goal.current / challenge.goal.target) * 100;
      if (progress >= 100) {
        completeChallenge(challenge.id);
        Alert.alert('Challenge Complete!', `You earned ${challenge.reward.tokens} tokens!`);
      } else {
        Alert.alert('Keep Going!', `You're ${progress.toFixed(0)}% there!`);
      }
    } else {
      startChallenge(challenge.id);
      Alert.alert('Challenge Started!', `Good luck with "${challenge.name}"!`);
    }
    setShowChallengeModal(false);
  };

  const renderEventCard = (event: CommunityEvent) => {
    const typeColor = getEventTypeColor(event.type);

    return (
      <TouchableOpacity
        key={event.id}
        style={[styles.eventCard, { backgroundColor: colors.surface }]}
        onPress={() => {
          setSelectedEvent(event);
          setShowEventModal(true);
        }}
        activeOpacity={0.7}
      >
        {event.imageUrl && (
          <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
        )}
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <View style={[styles.eventTypeBadge, { backgroundColor: typeColor + '20' }]}>
              <Text style={[styles.eventTypeText, { color: typeColor }]}>
                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
              </Text>
            </View>
            <View style={[styles.eventStatusBadge, { backgroundColor: event.status === 'active' ? '#10B98120' : '#F59E0B20' }]}>
              <Text style={[styles.eventStatusText, { color: event.status === 'active' ? '#10B981' : '#F59E0B' }]}>
                {event.status === 'active' ? 'Active' : 'Upcoming'}
              </Text>
            </View>
          </View>

          <Text style={[styles.eventTitle, { color: colors.text }]}>{event.name}</Text>
          <Text style={[styles.eventDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {event.description}
          </Text>

          <View style={styles.eventStats}>
            <View style={styles.eventStat}>
              <Users size={14} color={colors.textSecondary} />
              <Text style={[styles.eventStatText, { color: colors.textSecondary }]}>
                {event.participants.toLocaleString()} joined
              </Text>
            </View>
            <View style={styles.eventStat}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={[styles.eventStatText, { color: colors.textSecondary }]}>
                {getTimeRemaining(event.endDate)}
              </Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: typeColor, width: `${event.progress}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>{event.progress}% Complete</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderChallengeCard = (challenge: Challenge) => {
    const difficultyColor = getDifficultyColor(challenge.difficulty);
    const progress = (challenge.goal.current / challenge.goal.target) * 100;

    return (
      <TouchableOpacity
        key={challenge.id}
        style={[styles.challengeCard, { backgroundColor: colors.surface }]}
        onPress={() => {
          setSelectedChallenge(challenge);
          setShowChallengeModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.challengeHeader}>
          <View style={[styles.challengeTypeBadge, { backgroundColor: challenge.type === 'daily' ? '#10B98120' : challenge.type === 'weekly' ? '#3B82F620' : '#8B5CF620' }]}>
            <Text style={[styles.challengeTypeText, { color: challenge.type === 'daily' ? '#10B981' : challenge.type === 'weekly' ? '#3B82F6' : '#8B5CF6' }]}>
              {challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1)}
            </Text>
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor + '20' }]}>
            <Text style={[styles.difficultyText, { color: difficultyColor }]}>
              {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
            </Text>
          </View>
        </View>

        <Text style={[styles.challengeTitle, { color: colors.text }]}>{challenge.name}</Text>
        <Text style={[styles.challengeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {challenge.description}
        </Text>

        <View style={styles.challengeProgress}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min(progress, 100)}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {challenge.goal.current}/{challenge.goal.target} {challenge.goal.unit}
          </Text>
        </View>

        <View style={styles.challengeFooter}>
          <View style={styles.rewardSection}>
            <Gift size={14} color="#F59E0B" />
            <Text style={[styles.rewardText, { color: '#F59E0B' }]}>{challenge.reward.tokens} tokens</Text>
            <Text style={[styles.rewardXP, { color: colors.textSecondary }]}>+{challenge.reward.xp} XP</Text>
          </View>
          <View style={styles.participantsSection}>
            <Text style={[styles.participantsText, { color: colors.textSecondary }]}>
              {challenge.completions}/{challenge.participants} completed
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Events & Challenges' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'events' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab('events')}
            >
              <Calendar size={16} color={activeTab === 'events' ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === 'events' ? '#FFF' : colors.textSecondary }]}>
                Events ({activeEvents.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'challenges' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab('challenges')}
            >
              <Target size={16} color={activeTab === 'challenges' ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === 'challenges' ? '#FFF' : colors.textSecondary }]}>
                Challenges ({challenges.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {activeTab === 'events' ? (
              <>
                {communityEvents.length > 0 ? (
                  communityEvents.map(renderEventCard)
                ) : (
                  <View style={styles.emptyState}>
                    <Calendar size={64} color={colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Events</Text>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      Check back soon for community events!
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {dailyChallenges.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Challenges</Text>
                    {dailyChallenges.map(renderChallengeCard)}
                  </View>
                )}
                {weeklyChallenges.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Challenges</Text>
                    {weeklyChallenges.map(renderChallengeCard)}
                  </View>
                )}
                {challenges.filter(c => c.type === 'monthly').length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Challenges</Text>
                    {challenges.filter(c => c.type === 'monthly').map(renderChallengeCard)}
                  </View>
                )}
                {challenges.length === 0 && (
                  <View style={styles.emptyState}>
                    <Target size={64} color={colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Challenges</Text>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      New challenges are added regularly!
                    </Text>
                  </View>
                )}
              </>
            )}
          </Animated.View>
          <View style={styles.bottomPadding} />
        </ScrollView>

        <Modal visible={showEventModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              {selectedEvent && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.modalClose, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setShowEventModal(false);
                      setSelectedEvent(null);
                    }}
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>

                  {selectedEvent.imageUrl && (
                    <Image source={{ uri: selectedEvent.imageUrl }} style={styles.modalImage} />
                  )}

                  <View style={styles.modalBody}>
                    <View style={[styles.eventTypeBadge, { backgroundColor: getEventTypeColor(selectedEvent.type) + '20', alignSelf: 'flex-start' }]}>
                      <Text style={[styles.eventTypeText, { color: getEventTypeColor(selectedEvent.type) }]}>
                        {selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1)}
                      </Text>
                    </View>

                    <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedEvent.name}</Text>
                    <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                      {selectedEvent.description}
                    </Text>

                    <View style={[styles.modalStats, { backgroundColor: colors.background }]}>
                      <View style={styles.modalStat}>
                        <Users size={18} color={colors.primary} />
                        <Text style={[styles.modalStatValue, { color: colors.text }]}>
                          {selectedEvent.participants.toLocaleString()}
                        </Text>
                        <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Participants</Text>
                      </View>
                      <View style={styles.modalStat}>
                        <Clock size={18} color="#F59E0B" />
                        <Text style={[styles.modalStatValue, { color: colors.text }]}>
                          {getTimeRemaining(selectedEvent.endDate)}
                        </Text>
                        <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Remaining</Text>
                      </View>
                    </View>

                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Goals</Text>
                    {selectedEvent.goals.map(goal => (
                      <View key={goal.id} style={[styles.goalItem, { backgroundColor: colors.background }]}>
                        <View style={styles.goalHeader}>
                          <Text style={[styles.goalDescription, { color: colors.text }]}>{goal.description}</Text>
                          {goal.completed && <Check size={16} color="#10B981" />}
                        </View>
                        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                          <View style={[styles.progressFill, { backgroundColor: goal.completed ? '#10B981' : colors.primary, width: `${(goal.current / goal.target) * 100}%` }]} />
                        </View>
                        <Text style={[styles.goalProgress, { color: colors.textSecondary }]}>
                          {goal.current.toLocaleString()}/{goal.target.toLocaleString()}
                        </Text>
                      </View>
                    ))}

                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Rewards</Text>
                    {selectedEvent.rewards.map(reward => (
                      <View key={reward.id} style={[styles.rewardItem, { backgroundColor: colors.background }]}>
                        <View style={[styles.rewardTierBadge, { backgroundColor: reward.tier === 'gold' ? '#FFD70020' : reward.tier === 'silver' ? '#C0C0C020' : '#CD7F3220' }]}>
                          <Star size={14} color={reward.tier === 'gold' ? '#FFD700' : reward.tier === 'silver' ? '#C0C0C0' : '#CD7F32'} />
                        </View>
                        <Text style={[styles.rewardDescription, { color: colors.text }]}>{reward.description}</Text>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={[styles.joinButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleJoinEvent(selectedEvent)}
                    >
                      <Zap size={18} color="#FFF" />
                      <Text style={styles.joinButtonText}>Join Event</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <Modal visible={showChallengeModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.challengeModalContent, { backgroundColor: colors.surface }]}>
              {selectedChallenge && (
                <>
                  <TouchableOpacity
                    style={[styles.modalClose, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setShowChallengeModal(false);
                      setSelectedChallenge(null);
                    }}
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>

                  <View style={styles.challengeModalHeader}>
                    <Target size={40} color={colors.primary} />
                    <Text style={[styles.challengeModalTitle, { color: colors.text }]}>{selectedChallenge.name}</Text>
                    <View style={styles.challengeModalBadges}>
                      <View style={[styles.challengeTypeBadge, { backgroundColor: selectedChallenge.type === 'daily' ? '#10B98120' : '#3B82F620' }]}>
                        <Text style={[styles.challengeTypeText, { color: selectedChallenge.type === 'daily' ? '#10B981' : '#3B82F6' }]}>
                          {selectedChallenge.type.charAt(0).toUpperCase() + selectedChallenge.type.slice(1)}
                        </Text>
                      </View>
                      <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(selectedChallenge.difficulty) + '20' }]}>
                        <Text style={[styles.difficultyText, { color: getDifficultyColor(selectedChallenge.difficulty) }]}>
                          {selectedChallenge.difficulty.charAt(0).toUpperCase() + selectedChallenge.difficulty.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.challengeModalDescription, { color: colors.textSecondary }]}>
                    {selectedChallenge.description}
                  </Text>

                  <View style={[styles.challengeGoalCard, { backgroundColor: colors.background }]}>
                    <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>Goal</Text>
                    <Text style={[styles.goalValue, { color: colors.text }]}>
                      {selectedChallenge.goal.target} {selectedChallenge.goal.unit}
                    </Text>
                    <View style={[styles.progressBar, { backgroundColor: colors.border, marginTop: 12 }]}>
                      <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min((selectedChallenge.goal.current / selectedChallenge.goal.target) * 100, 100)}%` }]} />
                    </View>
                    <Text style={[styles.progressText, { color: colors.textSecondary, marginTop: 8 }]}>
                      {selectedChallenge.goal.current}/{selectedChallenge.goal.target} ({((selectedChallenge.goal.current / selectedChallenge.goal.target) * 100).toFixed(0)}%)
                    </Text>
                  </View>

                  <View style={[styles.rewardsCard, { backgroundColor: colors.background }]}>
                    <Text style={[styles.rewardsLabel, { color: colors.textSecondary }]}>Rewards</Text>
                    <View style={styles.rewardsRow}>
                      <View style={styles.rewardBox}>
                        <Gift size={20} color="#F59E0B" />
                        <Text style={[styles.rewardBoxValue, { color: colors.text }]}>{selectedChallenge.reward.tokens}</Text>
                        <Text style={[styles.rewardBoxLabel, { color: colors.textSecondary }]}>Tokens</Text>
                      </View>
                      <View style={styles.rewardBox}>
                        <Zap size={20} color="#8B5CF6" />
                        <Text style={[styles.rewardBoxValue, { color: colors.text }]}>{selectedChallenge.reward.xp}</Text>
                        <Text style={[styles.rewardBoxLabel, { color: colors.textSecondary }]}>XP</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleStartChallenge(selectedChallenge)}
                  >
                    <Text style={styles.startButtonText}>
                      {selectedChallenge.status === 'active' 
                        ? (selectedChallenge.goal.current >= selectedChallenge.goal.target ? 'Claim Reward' : 'Check Progress')
                        : 'Start Challenge'}
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
  container: { flex: 1 },
  header: { padding: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  tabs: { flexDirection: 'row', gap: 10 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabText: { fontSize: 13, fontWeight: '600' as const },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 12 },
  eventCard: { borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  eventImage: { width: '100%', height: 140 },
  eventContent: { padding: 16 },
  eventHeader: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  eventTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  eventTypeText: { fontSize: 11, fontWeight: '600' as const },
  eventStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  eventStatusText: { fontSize: 11, fontWeight: '600' as const },
  eventTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 6 },
  eventDescription: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  eventStats: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  eventStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventStatText: { fontSize: 12 },
  progressSection: { marginTop: 4 },
  progressBar: { height: 6, borderRadius: 3, marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11 },
  challengeCard: { padding: 16, borderRadius: 16, marginBottom: 12 },
  challengeHeader: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  challengeTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  challengeTypeText: { fontSize: 11, fontWeight: '600' as const },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  difficultyText: { fontSize: 11, fontWeight: '600' as const },
  challengeTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 4 },
  challengeDescription: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  challengeProgress: { marginBottom: 12 },
  challengeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardSection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardText: { fontSize: 13, fontWeight: '600' as const },
  rewardXP: { fontSize: 12 },
  participantsSection: {},
  participantsText: { fontSize: 11 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  modalClose: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  modalImage: { width: '100%', height: 180, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalBody: { padding: 20 },
  modalTitle: { fontSize: 24, fontWeight: '700' as const, marginTop: 12, marginBottom: 8 },
  modalDescription: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  modalStats: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 24 },
  modalStat: { flex: 1, alignItems: 'center' },
  modalStatValue: { fontSize: 18, fontWeight: '700' as const, marginTop: 6 },
  modalStatLabel: { fontSize: 12, marginTop: 2 },
  sectionLabel: { fontSize: 16, fontWeight: '700' as const, marginBottom: 12 },
  goalItem: { padding: 14, borderRadius: 12, marginBottom: 10 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  goalDescription: { fontSize: 14, flex: 1 },
  goalProgress: { fontSize: 11, marginTop: 4 },
  rewardItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8, gap: 12 },
  rewardTierBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  rewardDescription: { flex: 1, fontSize: 14 },
  joinButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 16, marginBottom: 20 },
  joinButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' as const },
  challengeModalContent: { borderRadius: 24, margin: 24, padding: 24 },
  challengeModalHeader: { alignItems: 'center', marginBottom: 20 },
  challengeModalTitle: { fontSize: 22, fontWeight: '700' as const, marginTop: 12, textAlign: 'center' },
  challengeModalBadges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  challengeModalDescription: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  challengeGoalCard: { padding: 16, borderRadius: 14, marginBottom: 16, alignItems: 'center' },
  goalLabel: { fontSize: 12, marginBottom: 4 },
  goalValue: { fontSize: 28, fontWeight: '700' as const },
  rewardsCard: { padding: 16, borderRadius: 14, marginBottom: 20 },
  rewardsLabel: { fontSize: 12, marginBottom: 12, textAlign: 'center' },
  rewardsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  rewardBox: { alignItems: 'center' },
  rewardBoxValue: { fontSize: 20, fontWeight: '700' as const, marginTop: 6 },
  rewardBoxLabel: { fontSize: 11, marginTop: 2 },
  startButton: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  startButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' as const },
  bottomPadding: { height: 40 },
});
