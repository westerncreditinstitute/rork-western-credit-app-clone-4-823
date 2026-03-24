import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Send,
  Users,
  Play,
  Crown,
  Copy,
  Share2,
  Clock,
  Home,
  MapPin,
  Star,
  MessageCircle,
  Lock,
  Unlock,
  UserPlus,
  Check,
  Volume2,
  VolumeX,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useCommunityHomes } from '@/contexts/CommunityHomesContext';
import VisitorAvatar from '@/components/community/VisitorAvatar';
import { VisitorInfo, formatHomeValue } from '@/types/communityHomes';

const { width } = Dimensions.get('window');

const MOCK_LOBBY_VISITORS: VisitorInfo[] = [
  {
    id: 'v1',
    name: 'Alex Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    isHost: false,
    joinedAt: Date.now() - 120000,
    avatarColor: '#3B82F6',
    status: 'active',
  },
  {
    id: 'v2',
    name: 'Sarah Kim',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    isHost: false,
    joinedAt: Date.now() - 60000,
    avatarColor: '#EC4899',
    status: 'active',
  },
];

interface LobbyChatMessage {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorAvatar: string;
  content: string;
  timestamp: number;
}

export default function HomeLobbyScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: 'host' | 'guest' }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const { getHomeById } = useCommunityHomes();
  const home = getHomeById(id || '');

  const [visitors] = useState<VisitorInfo[]>(MOCK_LOBBY_VISITORS);
  const [chatMessages, setChatMessages] = useState<LobbyChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  const isHost = mode === 'host';
  const inviteCode = `TOUR-${(id || '').substring(0, 4).toUpperCase()}`;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  

  const styles = createStyles(colors, isDark);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      router.replace(`/home-visit?id=${id}&multiplayer=true` as any);
    }
  }, [countdown]);

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newMessage: LobbyChatMessage = {
      id: `msg_${Date.now()}`,
      visitorId: 'current_user',
      visitorName: 'You',
      visitorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      content: chatInput.trim(),
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
    console.log('[HomeLobby] Sent chat message');
  }, [chatInput]);

  const handleStartTour = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCountdown(3);
    console.log('[HomeLobby] Starting countdown');
  }, []);

  const handleEnterTour = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.replace(`/home-visit?id=${id}&multiplayer=true` as any);
    console.log('[HomeLobby] Entering tour');
  }, [id, router]);

  const handleToggleReady = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsReady(prev => !prev);
  }, []);

  const handleCopyCode = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('[HomeLobby] Copied invite code:', inviteCode);
  }, [inviteCode]);

  const handleLeave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  }, [router]);

  if (!home) {
    return (
      <View style={styles.notFoundContainer}>
        <Home color={colors.textLight} size={64} />
        <Text style={styles.notFoundText}>Home not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const readyCount = visitors.filter(v => v.status === 'active').length;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Image
        source={{ uri: home.coverImage }}
        style={styles.backgroundImage}
        blurRadius={20}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
        style={styles.overlay}
      />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.closeButton} onPress={handleLeave}>
          <X color="#FFFFFF" size={24} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.lobbyTitle}>Tour Lobby</Text>
          <View style={styles.visitorCountBadge}>
            <Users color="#FFFFFF" size={14} />
            <Text style={styles.visitorCountText}>
              {visitors.length + 1} waiting
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setIsMuted(!isMuted)}
        >
          {isMuted ? (
            <VolumeX color="#FFFFFF" size={22} />
          ) : (
            <Volume2 color="#FFFFFF" size={22} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.homePreviewCard}>
          <Image source={{ uri: home.coverImage }} style={styles.homePreviewImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.homePreviewGradient}
          />
          <View style={styles.homePreviewContent}>
            <Text style={styles.homePreviewName}>{home.propertyName}</Text>
            <View style={styles.homePreviewMeta}>
              <MapPin color="rgba(255,255,255,0.8)" size={14} />
              <Text style={styles.homePreviewLocation}>
                {home.neighborhood}, {home.city}
              </Text>
            </View>
            <View style={styles.homePreviewStats}>
              <View style={styles.homeStat}>
                <Star color="#F59E0B" size={14} fill="#F59E0B" />
                <Text style={styles.homeStatText}>4.9</Text>
              </View>
              <View style={styles.homeStat}>
                <Text style={styles.homeStatValue}>
                  {formatHomeValue(home.financials.currentValue)}
                </Text>
              </View>
            </View>
          </View>
          {isHost && (
            <View style={styles.hostBadge}>
              <Crown color="#F59E0B" size={14} />
              <Text style={styles.hostBadgeText}>Your Home</Text>
            </View>
          )}
        </View>

        <View style={styles.inviteSection}>
          <View style={styles.inviteSectionHeader}>
            <Text style={styles.inviteSectionTitle}>Invite Code</Text>
            {isHost && (
              <TouchableOpacity
                style={styles.privacyToggle}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsPrivate(!isPrivate);
                }}
              >
                {isPrivate ? (
                  <Lock color="#F59E0B" size={16} />
                ) : (
                  <Unlock color="#22C55E" size={16} />
                )}
                <Text style={[styles.privacyText, { color: isPrivate ? '#F59E0B' : '#22C55E' }]}>
                  {isPrivate ? 'Private' : 'Public'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.inviteCodeRow}>
            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteCode}>{inviteCode}</Text>
            </View>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
              <Copy color="#FFFFFF" size={18} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton}>
              <Share2 color="#FFFFFF" size={18} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.visitorsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Visitors</Text>
            <Text style={styles.readyCount}>
              {readyCount + (isReady ? 1 : 0)}/{visitors.length + 1} ready
            </Text>
          </View>
          <View style={styles.visitorsGrid}>
            <View style={styles.visitorSlot}>
              <VisitorAvatar
                visitor={{
                  id: 'current_user',
                  name: 'You',
                  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
                  position: { x: 0, y: 0, z: 0 },
                  rotation: 0,
                  isHost: isHost,
                  joinedAt: Date.now(),
                  avatarColor: '#8B5CF6',
                  status: isReady ? 'active' : 'idle',
                }}
                size="medium"
              />
              {isReady && (
                <View style={styles.readyBadge}>
                  <Check color="#FFFFFF" size={12} />
                </View>
              )}
            </View>
            {visitors.map((visitor) => (
              <View key={visitor.id} style={styles.visitorSlot}>
                <VisitorAvatar visitor={visitor} size="medium" />
                {visitor.status === 'active' && (
                  <View style={styles.readyBadge}>
                    <Check color="#FFFFFF" size={12} />
                  </View>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addVisitorSlot}>
              <UserPlus color="rgba(255,255,255,0.5)" size={24} />
              <Text style={styles.addVisitorText}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.chatSection}>
          <View style={styles.sectionHeader}>
            <MessageCircle color="#FFFFFF" size={18} />
            <Text style={styles.sectionTitle}>Lobby Chat</Text>
          </View>
          <View style={styles.chatContainer}>
            {chatMessages.length === 0 ? (
              <View style={styles.emptyChatContainer}>
                <Text style={styles.emptyChatText}>
                  Say hi to other visitors! 👋
                </Text>
              </View>
            ) : (
              <FlatList
                data={chatMessages}
                keyExtractor={(item) => item.id}
                style={styles.chatList}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={10}
                initialNumToRender={10}
                renderItem={({ item }) => (
                  <View style={styles.chatMessage}>
                    <Image
                      source={{ uri: item.visitorAvatar }}
                      style={styles.chatAvatar}
                    />
                    <View style={styles.chatBubble}>
                      <Text style={styles.chatSender}>{item.visitorName}</Text>
                      <Text style={styles.chatContent}>{item.content}</Text>
                    </View>
                  </View>
                )}
              />
            )}
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={chatInput}
                onChangeText={setChatInput}
              />
              <TouchableOpacity
                style={[styles.sendButton, !chatInput.trim() && styles.sendButtonDisabled]}
                onPress={handleSendChat}
                disabled={!chatInput.trim()}
              >
                <Send color={chatInput.trim() ? '#FFFFFF' : 'rgba(255,255,255,0.3)'} size={18} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {countdown !== null ? (
          <View style={styles.countdownContainer}>
            <Animated.View
              style={[
                styles.countdownCircle,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Text style={styles.countdownNumber}>{countdown}</Text>
            </Animated.View>
            <Text style={styles.countdownText}>Starting tour...</Text>
          </View>
        ) : (
          <>
            {!isHost && (
              <TouchableOpacity
                style={[styles.readyButton, isReady && styles.readyButtonActive]}
                onPress={handleToggleReady}
              >
                {isReady ? (
                  <Check color="#FFFFFF" size={20} />
                ) : (
                  <Clock color="#FFFFFF" size={20} />
                )}
                <Text style={styles.readyButtonText}>
                  {isReady ? 'Ready!' : 'Mark Ready'}
                </Text>
              </TouchableOpacity>
            )}
            {isHost && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartTour}
              >
                <Play color="#FFFFFF" size={22} fill="#FFFFFF" />
                <Text style={styles.startButtonText}>Start Tour</Text>
              </TouchableOpacity>
            )}
            {!isHost && (
              <TouchableOpacity
                style={styles.enterButton}
                onPress={handleEnterTour}
              >
                <Play color="#FFFFFF" size={20} fill="#FFFFFF" />
                <Text style={styles.enterButtonText}>Enter Solo</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  lobbyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  visitorCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visitorCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  homePreviewCard: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  homePreviewImage: {
    width: '100%',
    height: '100%',
  },
  homePreviewGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  homePreviewContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  homePreviewName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  homePreviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  homePreviewLocation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  homePreviewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  homeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  homeStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  homeStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22C55E',
  },
  hostBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  hostBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  inviteSection: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  inviteSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inviteSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inviteCodeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inviteCodeBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  inviteCode: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 3,
    textAlign: 'center',
  },
  copyButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitorsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  readyCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22C55E',
  },
  visitorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  visitorSlot: {
    alignItems: 'center',
    position: 'relative',
  },
  readyBadge: {
    position: 'absolute',
    bottom: 24,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  addVisitorSlot: {
    width: 80,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addVisitorText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  chatSection: {
    marginBottom: 20,
  },
  chatContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyChatContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyChatText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  chatList: {
    maxHeight: 150,
    padding: 12,
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  chatBubble: {
    marginLeft: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    maxWidth: width * 0.65,
  },
  chatSender: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 2,
  },
  chatContent: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    color: '#FFFFFF',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  countdownContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  countdownCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  countdownNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  readyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  readyButtonActive: {
    backgroundColor: '#22C55E',
  },
  readyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  startButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  enterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  enterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
