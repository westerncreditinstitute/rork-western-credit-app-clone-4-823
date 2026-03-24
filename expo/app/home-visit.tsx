import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  Animated,
  PanResponder,
  ScrollView,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Users,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  Camera,
  Star,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Volume2,
  VolumeX,
  BookOpen,
  MapPin,
  Crown,
  Navigation,
  Smile,
  Box,
  Clock,
  Eye,
  Info,
  ExternalLink,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useCommunityHomes } from '@/contexts/CommunityHomesContext';
import VisitorAvatar from '@/components/community/VisitorAvatar';
import MultiplayerControls from '@/components/community/MultiplayerControls';
import HomeChatPanel from '@/components/community/HomeChatPanel';
import { VisitorInfo } from '@/types/communityHomes';
import { ChatParticipant } from '@/types/homeChat';
import { homeChatService } from '@/services/HomeChatService';
import { useVisitorSync } from '@/hooks/useVisitorSync';
import { VisitorPosition, RoomChangeEvent, ItemUpdate } from '@/services/HomeRealtimeSyncService';

const { width, height } = Dimensions.get('window');

// Real-time visitors are now handled by useVisitorSync hook

interface PlacedItemInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  position: { x: number; y: number };
}

const MOCK_PLACED_ITEMS: PlacedItemInfo[] = [
  {
    id: 'item1',
    name: 'Modern Sofa',
    category: 'Furniture',
    description: 'A comfortable three-seater sofa with premium leather upholstery.',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300',
    position: { x: 80, y: 200 },
  },
  {
    id: 'item2',
    name: 'Abstract Art',
    category: 'Decoration',
    description: 'Contemporary abstract painting by local artist.',
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=300',
    position: { x: 220, y: 120 },
  },
  {
    id: 'item3',
    name: 'Smart TV',
    category: 'Electronics',
    description: '65" 4K OLED Smart TV with built-in streaming.',
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300',
    position: { x: 160, y: 80 },
  },
];

export default function HomeVisitScreen() {
  const { id, multiplayer } = useLocalSearchParams<{ id: string; multiplayer?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    getHomeById,
    currentVisitSession,
    startVisitSession,
    endVisitSession,
    addGuestBookEntry,
    isHosting,
    isGuiding,
    floatingReactions,
    sendReaction,
    startGuidedTour,
    stopGuidedTour,
    inviteFriendToSession,
    removeVisitorFromSession,
    setCurrentRoom,
  } = useCommunityHomes();

  const home = getHomeById(id || '');
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showGuestBook, setShowGuestBook] = useState(false);
  const [showMultiplayerControls, setShowMultiplayerControls] = useState(false);
  const [guestMessage, setGuestMessage] = useState('');
  const [guestRating, setGuestRating] = useState(5);
  const [isMuted, setIsMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [, setRoomChangeNotification] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [visitStartTime] = useState(Date.now());
  const [currentRoomName, setCurrentRoomName] = useState('living_room');
  const [visitDuration, setVisitDuration] = useState(0);
  const [showVisitorList, setShowVisitorList] = useState(false);
  const [showItemInspector, setShowItemInspector] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PlacedItemInfo | null>(null);
  const [showExitRating, setShowExitRating] = useState(false);
  const [placedItems] = useState<PlacedItemInfo[]>(MOCK_PLACED_ITEMS);

  const panAnim = useRef(new Animated.ValueXY()).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const reactionAnims = useRef<Map<string, Animated.Value>>(new Map()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panAnim.setOffset({
          x: (panAnim.x as any)._value,
          y: (panAnim.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: panAnim.x, dy: panAnim.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        panAnim.flattenOffset();
      },
    })
  ).current;

  useEffect(() => {
    if (id && !currentVisitSession) {
      try {
        startVisitSession(id);
        console.log('[HomeVisit] Started visit session for home:', id);
        
        homeChatService.setCurrentUser(
          'current_user',
          'You',
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
        );
        homeChatService.joinHomeChat(id);
        console.log('[HomeVisit] Joined home chat for:', id);
      } catch (error) {
        console.log('[HomeVisit] Error starting session:', error);
      }
    }

    return () => {
      if (currentVisitSession) {
        endVisitSession();
      }
      if (id) {
        homeChatService.leaveHomeChat(id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisitDuration(Math.floor((Date.now() - visitStartTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [visitStartTime]);

  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    floatingReactions.forEach((reaction) => {
      if (!reactionAnims.has(reaction.id)) {
        const anim = new Animated.Value(0);
        reactionAnims.set(reaction.id, anim);
        
        Animated.timing(anim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }).start(() => {
          reactionAnims.delete(reaction.id);
        });
      }
    });
  }, [floatingReactions, reactionAnims]);

  

  const handleRoomChangeEvent = useCallback((event: RoomChangeEvent) => {
    console.log('[HomeVisit] Room change event:', event.visitorName, 'moved to', event.toRoom);
    setRoomChangeNotification(`${event.visitorName} moved to ${event.toRoom}`);
    setTimeout(() => setRoomChangeNotification(null), 3000);
  }, []);

  const handleItemUpdateEvent = useCallback((update: ItemUpdate) => {
    console.log('[HomeVisit] Item update received:', update.itemId);
  }, []);

  const handleVisitorJoin = useCallback((visitor: VisitorPosition) => {
    console.log('[HomeVisit] Visitor joined:', visitor.visitorName);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleVisitorLeave = useCallback((visitorId: string) => {
    console.log('[HomeVisit] Visitor left:', visitorId);
  }, []);

  const {
    visitors: syncedVisitors,
    visitorCount: syncedVisitorCount,
    isConnected: isSyncConnected,
    isLoading: isSyncLoading,
    error: syncError,
    updatePosition,
    changeRoom: syncChangeRoom,
    reconnect: reconnectSync,
  } = useVisitorSync({
    homeId: id,
    enabled: !!id,
    onRoomChange: handleRoomChangeEvent,
    onItemUpdate: handleItemUpdateEvent,
    onVisitorJoin: handleVisitorJoin,
    onVisitorLeave: handleVisitorLeave,
  });

  useEffect(() => {
    if (isSyncConnected) {
      setSyncStatus('connected');
    } else if (isSyncLoading) {
      setSyncStatus('reconnecting');
    } else {
      setSyncStatus('disconnected');
    }
  }, [isSyncConnected, isSyncLoading]);

  const realtimeVisitors: VisitorInfo[] = useMemo(() => {
    return syncedVisitors
      .filter(v => v.visitorId !== 'current_user')
      .map(v => ({
        id: v.visitorId,
        name: v.visitorName,
        avatar: v.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        position: v.position,
        rotation: v.rotation,
        isHost: false,
        joinedAt: v.lastUpdate,
        avatarColor: '#3B82F6',
        status: v.status,
      }));
  }, [syncedVisitors]);

  const handleLeaveGuestBook = useCallback(() => {
    if (!id || !guestMessage.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addGuestBookEntry(id, guestMessage.trim(), guestRating);
    setGuestMessage('');
    setShowGuestBook(false);
  }, [id, guestMessage, guestRating, addGuestBookEntry]);

  const handleRoomChange = useCallback((direction: 'prev' | 'next') => {
    if (!home?.model3D?.rooms && !home?.images?.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const roomCount = home.model3D?.rooms?.length || home.images.length;
    let newIndex = currentRoomIndex;
    
    if (direction === 'next') {
      newIndex = (currentRoomIndex + 1) % roomCount;
    } else {
      newIndex = (currentRoomIndex - 1 + roomCount) % roomCount;
    }
    
    setCurrentRoomIndex(newIndex);
    
    const previousRoom = currentRoomName;
    const newRoom = home.model3D?.rooms?.[newIndex]?.name || `room_${newIndex}`;
    setCurrentRoomName(newRoom);
    
    if (home.model3D?.rooms?.[newIndex]) {
      setCurrentRoom(home.model3D.rooms[newIndex].id);
    }

    syncChangeRoom(previousRoom, newRoom);
    updatePosition(
      { x: 0, y: 0, z: 0 },
      0,
      newRoom,
      'exploring'
    );

    Animated.parallel([
      Animated.timing(panAnim, {
        toValue: { x: 0, y: 0 },
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [home, currentRoomIndex, currentRoomName, panAnim, rotateAnim, setCurrentRoom, syncChangeRoom, updatePosition]);

  const handleZoom = useCallback((type: 'in' | 'out' | 'reset') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let newZoom = zoomLevel;
    if (type === 'in') newZoom = Math.min(3, zoomLevel + 0.5);
    else if (type === 'out') newZoom = Math.max(0.5, zoomLevel - 0.5);
    else newZoom = 1;
    
    setZoomLevel(newZoom);
    Animated.spring(scaleAnim, {
      toValue: newZoom,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [zoomLevel, scaleAnim]);

  const handleExit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowExitRating(true);
  }, []);

  const handleConfirmExit = useCallback(() => {
    endVisitSession();
    setShowExitRating(false);
    router.back();
  }, [endVisitSession, router]);

  const handleInspectItem = useCallback((item: PlacedItemInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem(item);
    setShowItemInspector(true);
    console.log('[HomeVisit] Inspecting item:', item.name);
  }, []);

  const handleViewProfile = useCallback((visitorId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowVisitorList(false);
    router.push(`/profile/${visitorId}` as any);
    console.log('[HomeVisit] Viewing profile:', visitorId);
  }, [router]);

  const getStatusText = useCallback((status: string): string => {
    switch (status) {
      case 'active': return 'Active';
      case 'idle': return 'Idle';
      case 'exploring': return 'Exploring';
      default: return 'Unknown';
    }
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'idle': return '#F59E0B';
      case 'exploring': return '#3B82F6';
      default: return '#6B7280';
    }
  }, []);

  const handleSendReaction = useCallback((emoji: string) => {
    sendReaction(emoji);
  }, [sendReaction]);

  const styles = createStyles(colors, isDark);

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

  const rooms = home.model3D?.rooms || [];
  const currentRoom = rooms[currentRoomIndex];
  const allVisitors = currentVisitSession?.visitors || [];
  const displayVisitors = [...allVisitors.filter(v => v.id !== 'current_user'), ...realtimeVisitors];

  const chatParticipants: ChatParticipant[] = [
    {
      id: 'current_user',
      name: 'You',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      isHost: isHosting,
      isOnline: true,
    },
    ...displayVisitors.map(v => ({
      id: v.id,
      name: v.name,
      avatar: v.avatar,
      isHost: v.isHost,
      isOnline: true,
    })),
  ];

  const rotate = rotateAnim.interpolate({
    inputRange: [-180, 180],
    outputRange: ['-180deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.sceneContainer} {...panResponder.panHandlers}>
        <LinearGradient
          colors={isDark ? ['#0a0a1a', '#1a1a3a', '#0a0a2a'] : ['#1a2a4a', '#2a3a5a', '#1a2a4a']}
          style={styles.skybox}
        />

        <Animated.View
          style={[
            styles.roomView,
            {
              transform: [
                { translateX: panAnim.x },
                { translateY: panAnim.y },
                { rotate },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <Image
            source={{ uri: home.images[currentRoomIndex % home.images.length] || home.coverImage }}
            style={styles.roomImage}
            resizeMode="cover"
          />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={styles.floorGradient}
          />

          {currentRoom && (
            <View style={styles.roomInfoOverlay}>
              <Text style={styles.roomName}>{currentRoom.name}</Text>
              <Text style={styles.roomSize}>
                {currentRoom.size.x}x{currentRoom.size.z} ft
              </Text>
            </View>
          )}

          <View style={styles.hotspotContainer}>
            {home.model3D?.hotspots?.slice(0, 3).map((hotspot, index) => (
              <TouchableOpacity
                key={hotspot.id}
                style={[styles.hotspot, { left: 50 + index * 100, top: 150 + index * 50 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={styles.hotspotDot} />
                <Text style={styles.hotspotLabel}>{hotspot.label}</Text>
              </TouchableOpacity>
            ))}
            {placedItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.placedItemMarker, { left: item.position.x, top: item.position.y }]}
                onPress={() => handleInspectItem(item)}
                testID={`item-marker-${item.id}`}
              >
                <View style={styles.itemMarkerOuter}>
                  <View style={styles.itemMarkerInner}>
                    <Eye color="#FFFFFF" size={14} />
                  </View>
                </View>
                <Text style={styles.itemMarkerLabel}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {displayVisitors.length > 0 && (
          <View style={styles.visitorsOverlay}>
            {displayVisitors.slice(0, 5).map((visitor, index) => (
              <Animated.View
                key={visitor.id}
                style={[
                  styles.visitorMarkerContainer,
                  {
                    left: 60 + index * 70,
                    bottom: 180 + (index % 2) * 50,
                  },
                ]}
              >
                <VisitorAvatar
                  visitor={visitor}
                  size="medium"
                  showName={true}
                  showStatus={true}
                  animated={true}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {floatingReactions.map((reaction) => {
          const anim = reactionAnims.get(reaction.id);
          if (!anim) return null;
          
          return (
            <Animated.View
              key={reaction.id}
              style={[
                styles.floatingReaction,
                {
                  opacity: anim.interpolate({
                    inputRange: [0, 0.2, 0.8, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  transform: [
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -150],
                      }),
                    },
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.5, 1.2, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.floatingReactionEmoji}>{reaction.emoji}</Text>
            </Animated.View>
          );
        })}
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <X color="#FFFFFF" size={24} />
        </TouchableOpacity>

        <View style={styles.homeInfoBar}>
          <View style={styles.homeInfoNameRow}>
            <Text style={styles.homeInfoName} numberOfLines={1}>{home.propertyName}</Text>
            {isHosting && (
              <View style={styles.hostIndicator}>
                <Crown color="#F59E0B" size={12} />
              </View>
            )}
          </View>
          <View style={styles.homeInfoMeta}>
            <MapPin color="rgba(255,255,255,0.7)" size={12} />
            <Text style={styles.homeInfoLocation}>{home.city}</Text>
            <View style={styles.durationBadge}>
              <Clock color="#FFFFFF" size={10} />
              <Text style={styles.durationText}>{formatDuration(visitDuration)}</Text>
            </View>
            {isGuiding && (
              <View style={styles.guidingBadge}>
                <Navigation color="#22C55E" size={10} />
                <Text style={styles.guidingText}>Guiding</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.visitorCountBadge}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowVisitorList(true);
          }}
        >
          <Users color="#FFFFFF" size={16} />
          <Text style={styles.visitorCountText}>
            {Math.max(syncedVisitorCount, 1)}
          </Text>
          {syncStatus === 'connected' && (
            <View style={styles.syncIndicator} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => handleZoom('in')}
          >
            <ZoomIn color="#FFFFFF" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => handleZoom('out')}
          >
            <ZoomOut color="#FFFFFF" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => handleZoom('reset')}
          >
            <RotateCcw color="#FFFFFF" size={20} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setIsMuted(!isMuted)}
        >
          {isMuted ? (
            <VolumeX color="#FFFFFF" size={20} />
          ) : (
            <Volume2 color="#FFFFFF" size={20} />
          )}
        </TouchableOpacity>
      </View>

      {showMultiplayerControls && (
        <View style={styles.multiplayerControlsContainer}>
          <MultiplayerControls
            session={currentVisitSession}
            isHost={isHosting}
            onInviteFriend={inviteFriendToSession}
            onSendReaction={handleSendReaction}
            onToggleMute={() => setIsMuted(!isMuted)}
            onStartGuide={startGuidedTour}
            onStopGuide={stopGuidedTour}
            onKickVisitor={removeVisitorFromSession}
            isMuted={isMuted}
            isGuiding={isGuiding}
          />
        </View>
      )}

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleRoomChange('prev')}
        >
          <ChevronLeft color="#FFFFFF" size={28} />
        </TouchableOpacity>

        <View style={styles.roomIndicator}>
          <Text style={styles.roomIndicatorText}>
            {currentRoom?.name || `Room ${currentRoomIndex + 1}`}
          </Text>
          <Text style={styles.roomIndicatorCount}>
            {currentRoomIndex + 1} / {rooms.length || home.images.length}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleRoomChange('next')}
        >
          <ChevronRight color="#FFFFFF" size={28} />
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowMultiplayerControls(!showMultiplayerControls);
          }}
        >
          <Smile color="#FFFFFF" size={22} />
          <Text style={styles.bottomButtonText}>React</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => setShowChat(!showChat)}
        >
          <MessageCircle color="#FFFFFF" size={22} />
          <Text style={styles.bottomButtonText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomButton}>
          <Camera color="#FFFFFF" size={22} />
          <Text style={styles.bottomButtonText}>Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => setShowGuestBook(true)}
        >
          <BookOpen color="#FFFFFF" size={22} />
          <Text style={styles.bottomButtonText}>Guest Book</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({
              pathname: '/home-3d-environment' as any,
              params: { id, multiplayer: multiplayer || 'false' },
            });
          }}
        >
          <Box color="#FFFFFF" size={22} />
          <Text style={styles.bottomButtonText}>3D View</Text>
        </TouchableOpacity>
      </View>

      <HomeChatPanel
        homeId={id || ''}
        isVisible={showChat}
        onClose={() => setShowChat(false)}
        participants={chatParticipants}
        isHost={isHosting}
        bottomInset={insets.bottom}
      />

      {showGuestBook && (
        <View style={[styles.guestBookModal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.guestBookContent}>
            <View style={styles.guestBookHeader}>
              <Text style={styles.guestBookTitle}>Sign the Guest Book</Text>
              <TouchableOpacity onPress={() => setShowGuestBook(false)}>
                <X color={colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.guestBookSubtitle}>
              Leave a message for {home.owner.name}
            </Text>

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Your Rating</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setGuestRating(star);
                    }}
                  >
                    <Star
                      color="#F59E0B"
                      size={32}
                      fill={star <= guestRating ? '#F59E0B' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={styles.guestBookInput}
              placeholder="Write your message here..."
              placeholderTextColor={colors.textLight}
              value={guestMessage}
              onChangeText={setGuestMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitButton, !guestMessage.trim() && styles.submitButtonDisabled]}
              onPress={handleLeaveGuestBook}
              disabled={!guestMessage.trim()}
            >
              <Text style={styles.submitButtonText}>Sign Guest Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        visible={showVisitorList}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVisitorList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.visitorListModal, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.visitorListHeader}>
              <Text style={styles.visitorListTitle}>Current Visitors</Text>
              <TouchableOpacity onPress={() => setShowVisitorList(false)}>
                <X color={colors.text} size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.visitorListSubtitleRow}>
              <Text style={styles.visitorListSubtitle}>
                {displayVisitors.length + 1} people in this home
              </Text>
              <View style={[styles.syncStatusBadge, syncStatus === 'connected' ? styles.syncConnected : styles.syncDisconnected]}>
                <View style={[styles.syncStatusDot, syncStatus === 'connected' ? styles.syncDotConnected : styles.syncDotDisconnected]} />
                <Text style={styles.syncStatusText}>
                  {syncStatus === 'connected' ? 'Live' : syncStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
                </Text>
              </View>
            </View>
            {syncError && (
              <TouchableOpacity style={styles.reconnectButton} onPress={reconnectSync}>
                <Text style={styles.reconnectButtonText}>Tap to reconnect</Text>
              </TouchableOpacity>
            )}
            <ScrollView style={styles.visitorListScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.visitorItem}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' }}
                  style={styles.visitorAvatar}
                />
                <View style={styles.visitorInfo}>
                  <View style={styles.visitorNameRow}>
                    <Text style={styles.visitorName}>You</Text>
                    {isHosting && (
                      <View style={styles.visitorHostBadge}>
                        <Crown color="#F59E0B" size={10} />
                        <Text style={styles.visitorHostText}>Host</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.visitorStatusRow}>
                    <View style={[styles.visitorStatusDot, { backgroundColor: '#22C55E' }]} />
                    <Text style={styles.visitorStatusText}>Active</Text>
                  </View>
                </View>
              </View>
              {displayVisitors.map((visitor) => (
                <TouchableOpacity
                  key={visitor.id}
                  style={styles.visitorItem}
                  onPress={() => handleViewProfile(visitor.id)}
                  testID={`visitor-${visitor.id}`}
                >
                  <Image source={{ uri: visitor.avatar }} style={styles.visitorAvatar} />
                  <View style={styles.visitorInfo}>
                    <View style={styles.visitorNameRow}>
                      <Text style={styles.visitorName}>{visitor.name}</Text>
                      {visitor.isHost && (
                        <View style={styles.visitorHostBadge}>
                          <Crown color="#F59E0B" size={10} />
                          <Text style={styles.visitorHostText}>Host</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.visitorStatusRow}>
                      <View style={[styles.visitorStatusDot, { backgroundColor: getStatusColor(visitor.status) }]} />
                      <Text style={styles.visitorStatusText}>{getStatusText(visitor.status)}</Text>
                      <Text style={styles.visitorJoinTime}>
                        • Joined {Math.floor((Date.now() - visitor.joinedAt) / 60000)}m ago
                      </Text>
                    </View>
                  </View>
                  <ExternalLink color={colors.textLight} size={18} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showItemInspector}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowItemInspector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.itemInspectorModal, { paddingBottom: insets.bottom + 20 }]}>
            {selectedItem && (
              <>
                <TouchableOpacity
                  style={styles.inspectorCloseButton}
                  onPress={() => setShowItemInspector(false)}
                >
                  <X color="#FFFFFF" size={20} />
                </TouchableOpacity>
                <Image
                  source={{ uri: selectedItem.imageUrl }}
                  style={styles.inspectorImage}
                  resizeMode="cover"
                />
                <View style={styles.inspectorContent}>
                  <View style={styles.inspectorCategoryBadge}>
                    <Text style={styles.inspectorCategoryText}>{selectedItem.category}</Text>
                  </View>
                  <Text style={styles.inspectorItemName}>{selectedItem.name}</Text>
                  <Text style={styles.inspectorItemDescription}>{selectedItem.description}</Text>
                  <View style={styles.inspectorActions}>
                    <TouchableOpacity style={styles.inspectorActionButton}>
                      <Info color={colors.primary} size={18} />
                      <Text style={styles.inspectorActionText}>Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.inspectorActionButton}>
                      <Camera color={colors.primary} size={18} />
                      <Text style={styles.inspectorActionText}>Photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showExitRating}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowExitRating(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.exitRatingModal, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.exitRatingTitle}>How was your visit?</Text>
            <Text style={styles.exitRatingSubtitle}>
              You spent {formatDuration(visitDuration)} exploring {home.propertyName}
            </Text>
            <View style={styles.exitRatingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setGuestRating(star);
                  }}
                >
                  <Star
                    color="#F59E0B"
                    size={40}
                    fill={star <= guestRating ? '#F59E0B' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.exitRatingInput}
              placeholder="Leave a comment (optional)..."
              placeholderTextColor={colors.textLight}
              value={guestMessage}
              onChangeText={setGuestMessage}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.exitRatingButtons}>
              <TouchableOpacity
                style={styles.exitRatingSkipButton}
                onPress={handleConfirmExit}
              >
                <Text style={styles.exitRatingSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exitRatingSubmitButton}
                onPress={() => {
                  if (id) {
                    addGuestBookEntry(id, guestMessage.trim() || 'Great visit!', guestRating);
                  }
                  handleConfirmExit();
                }}
              >
                <Text style={styles.exitRatingSubmitText}>Submit & Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
  },
  sceneContainer: {
    flex: 1,
    position: 'relative',
  },
  skybox: {
    ...StyleSheet.absoluteFillObject,
  },
  roomView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomImage: {
    width: width,
    height: height * 0.7,
    borderRadius: 20,
  },
  floorGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  roomInfoOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  roomSize: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  hotspotContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hotspot: {
    position: 'absolute',
    alignItems: 'center',
  },
  hotspotDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  hotspotLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    fontWeight: '600' as const,
  },
  placedItemMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  itemMarkerOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMarkerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  itemMarkerLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    fontWeight: '600' as const,
    maxWidth: 100,
    textAlign: 'center',
  },
  visitorsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  visitorMarkerContainer: {
    position: 'absolute',
  },
  floatingReaction: {
    position: 'absolute',
    bottom: 200,
    left: width / 2 - 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingReactionEmoji: {
    fontSize: 40,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeInfoBar: {
    flex: 1,
    marginHorizontal: 12,
  },
  homeInfoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  homeInfoName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    flex: 1,
  },
  hostIndicator: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    padding: 6,
    borderRadius: 12,
  },
  homeInfoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  homeInfoLocation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  guidingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
    gap: 4,
  },
  guidingText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#22C55E',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
    gap: 4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  visitorCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  visitorCountText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  syncIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginLeft: 4,
  },
  controlsContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -80 }],
    gap: 10,
  },
  zoomControls: {
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiplayerControlsContainer: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -60 }],
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomIndicator: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  roomIndicatorText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  roomIndicatorCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  bottomButton: {
    alignItems: 'center',
    gap: 4,
  },
  bottomButtonText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  chatPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatMessage: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  systemMessage: {
    justifyContent: 'center',
  },
  emojiMessage: {
    justifyContent: 'flex-start',
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  chatBubble: {
    marginLeft: 10,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    maxWidth: width * 0.7,
  },
  systemBubble: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    marginLeft: 0,
    borderTopLeftRadius: 16,
    alignSelf: 'center',
  },
  emojiBubble: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
  },
  chatSender: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.primary,
    marginBottom: 2,
  },
  chatContent: {
    fontSize: 14,
    color: colors.text,
  },
  emojiContent: {
    fontSize: 28,
  },
  systemContent: {
    fontSize: 13,
    color: colors.primary,
    fontStyle: 'italic' as const,
  },
  emptyChatContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyChatText: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 8,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    color: colors.text,
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  guestBookModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  guestBookContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
  },
  guestBookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  guestBookTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
  },
  guestBookSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  ratingSection: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 10,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 8,
  },
  guestBookInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 120,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  visitorListModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: height * 0.7,
  },
  visitorListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  visitorListTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
  },
  visitorListSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  visitorListSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  syncStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  syncConnected: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  syncDisconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  syncStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncDotConnected: {
    backgroundColor: '#22C55E',
  },
  syncDotDisconnected: {
    backgroundColor: '#EF4444',
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  reconnectButton: {
    backgroundColor: colors.primary + '20',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 12,
  },
  reconnectButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  visitorListScroll: {
    maxHeight: height * 0.45,
  },
  visitorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  visitorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  visitorInfo: {
    flex: 1,
  },
  visitorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  visitorHostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  visitorHostText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  visitorStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  visitorStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  visitorStatusText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  visitorJoinTime: {
    fontSize: 12,
    color: colors.textLight,
  },
  itemInspectorModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  inspectorCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  inspectorImage: {
    width: '100%',
    height: 220,
  },
  inspectorContent: {
    padding: 24,
  },
  inspectorCategoryBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  inspectorCategoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  inspectorItemName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 8,
  },
  inspectorItemDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  inspectorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  inspectorActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  inspectorActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  exitRatingModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  exitRatingTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  exitRatingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  exitRatingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  exitRatingInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  exitRatingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exitRatingSkipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  exitRatingSkipText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  exitRatingSubmitButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  exitRatingSubmitText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
