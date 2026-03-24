import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Animated,
  Share,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  Users,
  UserPlus,
  Copy,
  Share2,
  Smile,
  Crown,
  Mic,
  MicOff,
  Eye,
  Navigation,
  X,
  Check,
  Search,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { MultiplayerVisitSession } from '@/types/communityHomes';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
}

interface MultiplayerControlsProps {
  session: MultiplayerVisitSession | null;
  isHost: boolean;
  onInviteFriend?: (friendId: string) => void;
  onSendReaction?: (reaction: string) => void;
  onToggleMute?: () => void;
  onStartGuide?: () => void;
  onStopGuide?: () => void;
  onKickVisitor?: (visitorId: string) => void;
  isMuted?: boolean;
  isGuiding?: boolean;
  friends?: Friend[];
}

const REACTIONS = [
  { id: 'heart', emoji: '❤️', label: 'Love' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'clap', emoji: '👏', label: 'Clap' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'eyes', emoji: '👀', label: 'Eyes' },
  { id: 'wave', emoji: '👋', label: 'Wave' },
  { id: 'sparkle', emoji: '✨', label: 'Sparkle' },
];

const MOCK_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Alex Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', isOnline: true },
  { id: 'f2', name: 'Sarah Kim', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', isOnline: true },
  { id: 'f3', name: 'Mike Johnson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', isOnline: false },
  { id: 'f4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', isOnline: true },
  { id: 'f5', name: 'Chris Lee', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', isOnline: false },
];

export default function MultiplayerControls({
  session,
  isHost,
  onInviteFriend,
  onSendReaction,
  onToggleMute,
  onStartGuide,
  onStopGuide,
  onKickVisitor,
  isMuted = false,
  isGuiding = false,
  friends = MOCK_FRIENDS,
}: MultiplayerControlsProps) {
  const { colors, isDark } = useTheme();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [showReactionsPanel, setShowReactionsPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  
  const reactionAnim = useRef(new Animated.Value(0)).current;
  const floatingReactions = useRef<{ id: string; emoji: string; anim: Animated.Value }[]>([]);

  const styles = createStyles(colors, isDark);

  const handleInvite = useCallback((friendId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInvitedIds(prev => [...prev, friendId]);
    onInviteFriend?.(friendId);
    console.log('[MultiplayerControls] Invited friend:', friendId);
  }, [onInviteFriend]);

  const handleReaction = useCallback((reaction: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSendReaction?.(reaction);
    
    const newReaction = {
      id: `${Date.now()}`,
      emoji: reaction,
      anim: new Animated.Value(0),
    };
    floatingReactions.current.push(newReaction);

    Animated.timing(newReaction.anim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start(() => {
      floatingReactions.current = floatingReactions.current.filter(r => r.id !== newReaction.id);
    });

    setShowReactionsPanel(false);
    console.log('[MultiplayerControls] Sent reaction:', reaction);
  }, [onSendReaction]);

  const handleShareInvite = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const inviteCode = session?.inviteCode || 'TOUR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      await Share.share({
        message: `Join my home tour! Use code: ${inviteCode}`,
        title: 'Home Tour Invite',
      });
    } catch (error) {
      console.log('[MultiplayerControls] Share error:', error);
    }
  }, [session?.inviteCode]);

  const handleCopyCode = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const inviteCode = session?.inviteCode || 'TOUR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log('[MultiplayerControls] Copied invite code:', inviteCode);
  }, [session?.inviteCode]);

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineFriends = filteredFriends.filter(f => f.isOnline);
  const offlineFriends = filteredFriends.filter(f => !f.isOnline);

  const toggleReactionsPanel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowReactionsPanel(prev => !prev);
    Animated.spring(reactionAnim, {
      toValue: showReactionsPanel ? 0 : 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [showReactionsPanel, reactionAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowVisitorsModal(true);
          }}
        >
          <Users color="#FFFFFF" size={20} />
          {session && session.visitors.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{session.visitors.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowInviteModal(true);
          }}
        >
          <UserPlus color="#FFFFFF" size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, showReactionsPanel && styles.actionButtonActive]}
          onPress={toggleReactionsPanel}
        >
          <Smile color="#FFFFFF" size={20} />
        </TouchableOpacity>

        {isHost && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, isMuted && styles.actionButtonMuted]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleMute?.();
              }}
            >
              {isMuted ? <MicOff color="#EF4444" size={20} /> : <Mic color="#FFFFFF" size={20} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, isGuiding && styles.actionButtonGuiding]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                isGuiding ? onStopGuide?.() : onStartGuide?.();
              }}
            >
              <Navigation color={isGuiding ? '#22C55E' : '#FFFFFF'} size={20} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {showReactionsPanel && (
        <Animated.View
          style={[
            styles.reactionsPanel,
            {
              opacity: reactionAnim,
              transform: [
                {
                  translateY: reactionAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {REACTIONS.map((reaction) => (
            <TouchableOpacity
              key={reaction.id}
              style={styles.reactionButton}
              onPress={() => handleReaction(reaction.emoji)}
            >
              <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Friends</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <X color={colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.inviteCodeSection}>
              <Text style={styles.inviteCodeLabel}>Share Invite Code</Text>
              <View style={styles.inviteCodeRow}>
                <View style={styles.inviteCodeBox}>
                  <Text style={styles.inviteCode}>
                    {session?.inviteCode || 'TOUR-' + Math.random().toString(36).substring(2, 6).toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                  <Copy color="#FFFFFF" size={18} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareInvite}>
                  <Share2 color="#FFFFFF" size={18} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Search color={colors.textLight} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search friends..."
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={[...onlineFriends, ...offlineFriends]}
              keyExtractor={(item) => item.id}
              style={styles.friendsList}
              ListHeaderComponent={
                onlineFriends.length > 0 ? (
                  <Text style={styles.friendsListHeader}>
                    Online ({onlineFriends.length})
                  </Text>
                ) : null
              }
              renderItem={({ item, index }) => {
                const isInvited = invitedIds.includes(item.id);
                const showOfflineHeader = index === onlineFriends.length && offlineFriends.length > 0;
                
                return (
                  <>
                    {showOfflineHeader && (
                      <Text style={[styles.friendsListHeader, { marginTop: 16 }]}>
                        Offline ({offlineFriends.length})
                      </Text>
                    )}
                    <View style={styles.friendItem}>
                      <Image source={{ uri: item.avatar }} style={styles.friendAvatar} contentFit="cover" transition={150} cachePolicy="memory-disk" />
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>{item.name}</Text>
                        <View style={styles.friendStatus}>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: item.isOnline ? '#22C55E' : '#6B7280' },
                            ]}
                          />
                          <Text style={styles.statusText}>
                            {item.isOnline ? 'Online' : 'Offline'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.inviteButton,
                          isInvited && styles.invitedButton,
                          !item.isOnline && styles.inviteButtonDisabled,
                        ]}
                        onPress={() => handleInvite(item.id)}
                        disabled={isInvited || !item.isOnline}
                      >
                        {isInvited ? (
                          <Check color="#22C55E" size={16} />
                        ) : (
                          <UserPlus color={item.isOnline ? '#FFFFFF' : colors.textLight} size={16} />
                        )}
                        <Text
                          style={[
                            styles.inviteButtonText,
                            isInvited && styles.invitedButtonText,
                            !item.isOnline && styles.inviteButtonTextDisabled,
                          ]}
                        >
                          {isInvited ? 'Invited' : 'Invite'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyFriends}>
                  <Users color={colors.textLight} size={40} />
                  <Text style={styles.emptyFriendsText}>No friends found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showVisitorsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowVisitorsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Visitors ({session?.visitors.length || 0})
              </Text>
              <TouchableOpacity onPress={() => setShowVisitorsModal(false)}>
                <X color={colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={session?.visitors || []}
              keyExtractor={(item) => item.id}
              style={styles.visitorsList}
              renderItem={({ item }) => (
                <View style={styles.visitorItem}>
                  <View style={[styles.visitorAvatarRing, { borderColor: item.avatarColor }]}>
                    <Image source={{ uri: item.avatar }} style={styles.visitorAvatar} contentFit="cover" transition={150} cachePolicy="memory-disk" />
                  </View>
                  <View style={styles.visitorInfo}>
                    <View style={styles.visitorNameRow}>
                      <Text style={styles.visitorName}>{item.name}</Text>
                      {item.isHost && (
                        <View style={styles.hostTag}>
                          <Crown color="#F59E0B" size={12} />
                          <Text style={styles.hostTagText}>Host</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.visitorStatus}>
                      {item.status === 'active' ? 'Exploring' : 
                       item.status === 'idle' ? 'Idle' : 'Following tour'}
                    </Text>
                  </View>
                  {isHost && !item.isHost && (
                    <TouchableOpacity
                      style={styles.kickButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onKickVisitor?.(item.id);
                      }}
                    >
                      <X color="#EF4444" size={16} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyVisitors}>
                  <Eye color={colors.textLight} size={40} />
                  <Text style={styles.emptyVisitorsText}>No other visitors yet</Text>
                  <Text style={styles.emptyVisitorsSubtext}>
                    Invite friends to explore together!
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    position: 'relative',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonActive: {
    backgroundColor: colors.primary,
  },
  actionButtonMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  actionButtonGuiding: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reactionsPanel: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
  },
  reactionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  inviteCodeSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inviteCodeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inviteCodeBox: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
  },
  copyButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  friendsList: {
    paddingHorizontal: 20,
  },
  friendsListHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: 8,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  friendStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  invitedButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  inviteButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  invitedButtonText: {
    color: '#22C55E',
  },
  inviteButtonTextDisabled: {
    color: colors.textLight,
  },
  emptyFriends: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyFriendsText: {
    fontSize: 15,
    color: colors.textLight,
    marginTop: 12,
  },
  visitorsList: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  visitorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  visitorAvatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    padding: 2,
  },
  visitorAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  visitorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  visitorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  hostTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  hostTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  visitorStatus: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  kickButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyVisitors: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyVisitorsText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptyVisitorsSubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
  },
});
