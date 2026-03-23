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
  GraduationCap,
  Star,
  Users,
  Clock,
  TrendingUp,
  ChevronRight,
  X,
  MessageCircle,
  Award,
  Target,
  CheckCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { MentorProfile } from '@/types/multiplayer';
import { getCreditTier } from '@/utils/creditEngine';

type Tab = 'find' | 'my_mentorship';

export default function MentorshipScreen() {
  const { colors } = useTheme();
  const { mentorProfiles, mentorship, requestMentorship, currentPlayer } = useMultiplayer();

  const [activeTab, setActiveTab] = useState<Tab>(mentorship ? 'my_mentorship' : 'find');
  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(null);
  const [showMentorModal, setShowMentorModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const handleRequestMentorship = (mentor: MentorProfile) => {
    if (mentorship) {
      Alert.alert('Already in Mentorship', 'You already have an active mentorship. Complete or cancel it first.');
      return;
    }

    Alert.alert(
      'Request Mentorship',
      `Would you like to request mentorship from ${mentor.player.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: () => {
            requestMentorship(mentor.playerId);
            setShowMentorModal(false);
            setSelectedMentor(null);
            Alert.alert('Request Sent', `Your mentorship request has been sent to ${mentor.player.name}!`);
          },
        },
      ]
    );
  };

  const renderMentorCard = (mentor: MentorProfile) => {
    const creditTier = getCreditTier(mentor.player.creditScore);

    return (
      <TouchableOpacity
        key={mentor.playerId}
        style={[styles.mentorCard, { backgroundColor: colors.surface }]}
        onPress={() => {
          setSelectedMentor(mentor);
          setShowMentorModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.mentorHeader}>
          {mentor.player.avatarUrl ? (
            <Image source={{ uri: mentor.player.avatarUrl }} style={styles.mentorAvatar} />
          ) : (
            <View style={[styles.mentorAvatarPlaceholder, { backgroundColor: colors.primary + '30' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {mentor.player.name.charAt(0)}
              </Text>
            </View>
          )}
          <View style={styles.mentorInfo}>
            <Text style={[styles.mentorName, { color: colors.text }]}>{mentor.player.name}</Text>
            <View style={styles.mentorStats}>
              <View style={[styles.creditBadge, { backgroundColor: creditTier.color + '20' }]}>
                <TrendingUp size={12} color={creditTier.color} />
                <Text style={[styles.creditText, { color: creditTier.color }]}>{mentor.player.creditScore}</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text style={[styles.ratingText, { color: colors.text }]}>{mentor.rating.toFixed(1)}</Text>
                <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>({mentor.reviewCount})</Text>
              </View>
            </View>
          </View>
          {mentor.isAvailable ? (
            <View style={[styles.availableBadge, { backgroundColor: '#10B98120' }]}>
              <Text style={styles.availableText}>Available</Text>
            </View>
          ) : (
            <View style={[styles.availableBadge, { backgroundColor: '#EF444420' }]}>
              <Text style={[styles.unavailableText, { color: '#EF4444' }]}>Full</Text>
            </View>
          )}
        </View>

        <Text style={[styles.mentorBio, { color: colors.textSecondary }]} numberOfLines={2}>
          {mentor.bio}
        </Text>

        <View style={styles.specialtiesContainer}>
          {mentor.specialties.slice(0, 3).map((specialty, idx) => (
            <View key={idx} style={[styles.specialtyBadge, { backgroundColor: colors.background }]}>
              <Text style={[styles.specialtyText, { color: colors.textSecondary }]}>{specialty}</Text>
            </View>
          ))}
        </View>

        <View style={styles.mentorFooter}>
          <View style={styles.mentorStat}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={[styles.mentorStatText, { color: colors.textSecondary }]}>
              {mentor.menteesHelped} helped
            </Text>
          </View>
          <View style={styles.mentorStat}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={[styles.mentorStatText, { color: colors.textSecondary }]}>
              {Math.floor(mentor.experience / 30)}+ months exp
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderMyMentorship = () => {
    if (!mentorship) {
      return (
        <View style={styles.emptyState}>
          <GraduationCap size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Mentorship</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Find a mentor to help you improve your credit score and financial skills!
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('find')}
          >
            <GraduationCap size={18} color="#FFF" />
            <Text style={styles.emptyButtonText}>Find a Mentor</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const mentor = mentorship.mentor;
    const creditTier = getCreditTier(mentor.creditScore);

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={[styles.mentorshipCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.statusBanner, { backgroundColor: mentorship.status === 'active' ? '#10B981' : '#F59E0B' }]}>
            <Text style={styles.statusText}>
              {mentorship.status === 'active' ? 'Active Mentorship' : 'Pending Approval'}
            </Text>
          </View>

          <View style={styles.mentorshipContent}>
            <View style={styles.mentorshipHeader}>
              {mentor.avatarUrl ? (
                <Image source={{ uri: mentor.avatarUrl }} style={styles.largeMentorAvatar} />
              ) : (
                <View style={[styles.largeMentorAvatarPlaceholder, { backgroundColor: colors.primary + '30' }]}>
                  <Text style={[styles.largeAvatarText, { color: colors.primary }]}>
                    {mentor.name.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={styles.mentorshipInfo}>
                <Text style={[styles.mentorshipName, { color: colors.text }]}>{mentor.name}</Text>
                <View style={[styles.creditBadge, { backgroundColor: creditTier.color + '20' }]}>
                  <TrendingUp size={14} color={creditTier.color} />
                  <Text style={[styles.creditText, { color: creditTier.color }]}>{mentor.creditScore}</Text>
                </View>
              </View>
            </View>

            {mentorship.goals.length > 0 && (
              <View style={styles.goalsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Goals</Text>
                {mentorship.goals.map(goal => (
                  <View key={goal.id} style={[styles.goalItem, { backgroundColor: colors.background }]}>
                    <View style={styles.goalHeader}>
                      <Target size={16} color={goal.completed ? '#10B981' : colors.primary} />
                      <Text style={[styles.goalText, { color: colors.text }]}>{goal.description}</Text>
                      {goal.completed && <CheckCircle size={16} color="#10B981" />}
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: goal.completed ? '#10B981' : colors.primary,
                            width: `${(goal.currentValue / goal.targetValue) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.goalProgress, { color: colors.textSecondary }]}>
                      {goal.currentValue}/{goal.targetValue}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                <MessageCircle size={18} color="#FFF" />
                <Text style={styles.actionButtonText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}>
                <Award size={18} color={colors.text} />
                <Text style={[styles.actionButtonTextSecondary, { color: colors.text }]}>Sessions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Mentorship' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'find' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab('find')}
            >
              <GraduationCap size={16} color={activeTab === 'find' ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === 'find' ? '#FFF' : colors.textSecondary }]}>
                Find Mentor
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my_mentorship' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab('my_mentorship')}
            >
              <Users size={16} color={activeTab === 'my_mentorship' ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === 'my_mentorship' ? '#FFF' : colors.textSecondary }]}>
                My Mentorship
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
            {activeTab === 'find' ? (
              mentorProfiles.length > 0 ? (
                mentorProfiles.map(renderMentorCard)
              ) : (
                <View style={styles.emptyState}>
                  <GraduationCap size={64} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Mentors Available</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Check back soon for available mentors!
                  </Text>
                </View>
              )
            ) : (
              renderMyMentorship()
            )}
          </Animated.View>
          <View style={styles.bottomPadding} />
        </ScrollView>

        <Modal visible={showMentorModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              {selectedMentor && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.modalClose, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setShowMentorModal(false);
                      setSelectedMentor(null);
                    }}
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>

                  <View style={styles.modalHeader}>
                    {selectedMentor.player.avatarUrl ? (
                      <Image source={{ uri: selectedMentor.player.avatarUrl }} style={styles.modalAvatar} />
                    ) : (
                      <View style={[styles.modalAvatarPlaceholder, { backgroundColor: colors.primary + '30' }]}>
                        <Text style={[styles.modalAvatarText, { color: colors.primary }]}>
                          {selectedMentor.player.name.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.modalName, { color: colors.text }]}>{selectedMentor.player.name}</Text>
                    <View style={styles.modalRating}>
                      <Star size={18} color="#F59E0B" fill="#F59E0B" />
                      <Text style={[styles.modalRatingText, { color: colors.text }]}>
                        {selectedMentor.rating.toFixed(1)}
                      </Text>
                      <Text style={[styles.modalReviewCount, { color: colors.textSecondary }]}>
                        ({selectedMentor.reviewCount} reviews)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalBody}>
                    <Text style={[styles.modalBio, { color: colors.textSecondary }]}>{selectedMentor.bio}</Text>

                    <View style={[styles.modalStats, { backgroundColor: colors.background }]}>
                      <View style={styles.modalStat}>
                        <Users size={20} color={colors.primary} />
                        <Text style={[styles.modalStatValue, { color: colors.text }]}>
                          {selectedMentor.menteesHelped}
                        </Text>
                        <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Helped</Text>
                      </View>
                      <View style={styles.modalStat}>
                        <Clock size={20} color="#F59E0B" />
                        <Text style={[styles.modalStatValue, { color: colors.text }]}>
                          {Math.floor(selectedMentor.experience / 30)}+
                        </Text>
                        <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Months</Text>
                      </View>
                      <View style={styles.modalStat}>
                        <GraduationCap size={20} color="#8B5CF6" />
                        <Text style={[styles.modalStatValue, { color: colors.text }]}>
                          {selectedMentor.currentMentees}/{selectedMentor.maxMentees}
                        </Text>
                        <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Slots</Text>
                      </View>
                    </View>

                    <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Specialties</Text>
                    <View style={styles.specialtiesGrid}>
                      {selectedMentor.specialties.map((specialty, idx) => (
                        <View key={idx} style={[styles.specialtyChip, { backgroundColor: colors.background }]}>
                          <Text style={[styles.specialtyChipText, { color: colors.text }]}>{specialty}</Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.requestButton,
                        { backgroundColor: selectedMentor.isAvailable ? colors.primary : colors.border },
                      ]}
                      onPress={() => handleRequestMentorship(selectedMentor)}
                      disabled={!selectedMentor.isAvailable}
                    >
                      <GraduationCap size={20} color={selectedMentor.isAvailable ? '#FFF' : colors.textSecondary} />
                      <Text
                        style={[
                          styles.requestButtonText,
                          { color: selectedMentor.isAvailable ? '#FFF' : colors.textSecondary },
                        ]}
                      >
                        {selectedMentor.isAvailable ? 'Request Mentorship' : 'Mentor is Full'}
                      </Text>
                    </TouchableOpacity>
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
  container: { flex: 1 },
  header: { padding: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  tabs: { flexDirection: 'row', gap: 10 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabText: { fontSize: 13, fontWeight: '600' as const },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  mentorCard: { padding: 16, borderRadius: 16, marginBottom: 14 },
  mentorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mentorAvatar: { width: 56, height: 56, borderRadius: 28 },
  mentorAvatarPlaceholder: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700' as const },
  mentorInfo: { flex: 1, marginLeft: 12 },
  mentorName: { fontSize: 17, fontWeight: '700' as const, marginBottom: 6 },
  mentorStats: { flexDirection: 'row', gap: 10 },
  creditBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  creditText: { fontSize: 12, fontWeight: '600' as const },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '600' as const },
  reviewCount: { fontSize: 11 },
  availableBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  availableText: { color: '#10B981', fontSize: 11, fontWeight: '600' as const },
  unavailableText: { fontSize: 11, fontWeight: '600' as const },
  mentorBio: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  specialtiesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  specialtyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  specialtyText: { fontSize: 11 },
  mentorFooter: { flexDirection: 'row', alignItems: 'center' },
  mentorStat: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 16 },
  mentorStatText: { fontSize: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20, gap: 8 },
  emptyButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' as const },
  mentorshipCard: { borderRadius: 20, overflow: 'hidden' },
  statusBanner: { paddingVertical: 10, alignItems: 'center' },
  statusText: { color: '#FFF', fontSize: 14, fontWeight: '600' as const },
  mentorshipContent: { padding: 20 },
  mentorshipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  largeMentorAvatar: { width: 70, height: 70, borderRadius: 35 },
  largeMentorAvatarPlaceholder: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  largeAvatarText: { fontSize: 28, fontWeight: '700' as const },
  mentorshipInfo: { marginLeft: 16 },
  mentorshipName: { fontSize: 20, fontWeight: '700' as const, marginBottom: 8 },
  goalsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 12 },
  goalItem: { padding: 14, borderRadius: 12, marginBottom: 10 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  goalText: { flex: 1, fontSize: 14 },
  progressBar: { height: 6, borderRadius: 3 },
  progressFill: { height: '100%', borderRadius: 3 },
  goalProgress: { fontSize: 11, marginTop: 6 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' as const },
  actionButtonTextSecondary: { fontSize: 14, fontWeight: '600' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  modalClose: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  modalHeader: { alignItems: 'center', paddingTop: 32, paddingBottom: 20 },
  modalAvatar: { width: 90, height: 90, borderRadius: 45 },
  modalAvatarPlaceholder: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  modalAvatarText: { fontSize: 36, fontWeight: '700' as const },
  modalName: { fontSize: 24, fontWeight: '700' as const, marginTop: 12 },
  modalRating: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  modalRatingText: { fontSize: 16, fontWeight: '600' as const },
  modalReviewCount: { fontSize: 14 },
  modalBody: { paddingHorizontal: 24, paddingBottom: 32 },
  modalBio: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  modalStats: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 24 },
  modalStat: { flex: 1, alignItems: 'center' },
  modalStatValue: { fontSize: 20, fontWeight: '700' as const, marginTop: 6 },
  modalStatLabel: { fontSize: 12, marginTop: 2 },
  modalSectionTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 12 },
  specialtiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  specialtyChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  specialtyChipText: { fontSize: 13 },
  requestButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8 },
  requestButtonText: { fontSize: 16, fontWeight: '600' as const },
  bottomPadding: { height: 40 },
});
