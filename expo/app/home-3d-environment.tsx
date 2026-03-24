import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  Map,
  Users,
  User,
  Sun,
  Moon,
  CloudRain,
  Settings,
  ChevronLeft,
  ChevronRight,
  Camera,
  Volume2,
  VolumeX,
  Compass,
  Home,
  Eye,
  Sparkles,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useCommunityHomes } from '@/contexts/CommunityHomesContext';
import Room3DView from '@/components/community/Room3DView';
import FurnitureDetailModal from '@/components/community/FurnitureDetailModal';
import FloorPlanNavigator from '@/components/community/FloorPlanNavigator';
import AvatarCustomizer from '@/components/community/AvatarCustomizer';
import { InteractiveHotspotGroup } from '@/components/community/RoomHotspot';
import VisitorAvatar from '@/components/community/VisitorAvatar';
import { FurnitureItem, DecorItem, Hotspot, VisitorInfo } from '@/types/communityHomes';

const { height } = Dimensions.get('window');

const MOCK_VISITORS: VisitorInfo[] = [
  {
    id: 'v1',
    name: 'Alex',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    position: { x: 100, y: 0, z: 0 },
    rotation: 0,
    isHost: false,
    joinedAt: Date.now() - 120000,
    avatarColor: '#3B82F6',
    status: 'active',
  },
  {
    id: 'v2',
    name: 'Sarah',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    position: { x: 200, y: 0, z: 0 },
    rotation: 0,
    isHost: false,
    joinedAt: Date.now() - 60000,
    avatarColor: '#EC4899',
    status: 'exploring',
  },
  {
    id: 'v3',
    name: 'Mike',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    position: { x: 150, y: 0, z: 0 },
    rotation: 0,
    isHost: false,
    joinedAt: Date.now() - 30000,
    avatarColor: '#22C55E',
    status: 'idle',
  },
];

type LightingPreset = 'day' | 'night' | 'sunset' | 'dramatic';
type WeatherEffect = 'clear' | 'rain' | 'snow' | 'fog';

export default function Home3DEnvironmentScreen() {
  const { id, multiplayer } = useLocalSearchParams<{ id: string; multiplayer?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    getHomeById,
    currentVisitSession,
    startVisitSession,
    endVisitSession,
    setCurrentRoom,
  } = useCommunityHomes();

  const home = getHomeById(id || '');

  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [showFurnitureModal, setShowFurnitureModal] = useState(false);
  const [selectedFurniture, setSelectedFurniture] = useState<FurnitureItem | null>(null);
  const [selectedDecor, setSelectedDecor] = useState<DecorItem | null>(null);
  const [furnitureType, setFurnitureType] = useState<'furniture' | 'decor'>('furniture');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('day');
  const [weatherEffect, setWeatherEffect] = useState<WeatherEffect>('clear');
  const [showEnvironmentControls, setShowEnvironmentControls] = useState(false);
  const [activeHotspotId, setActiveHotspotId] = useState<string | undefined>(undefined);
  const [userAvatar, setUserAvatar] = useState({
    color: '#8B5CF6',
    accessory: undefined as string | undefined,
    outfit: 'casual',
    effect: undefined as string | undefined,
  });

  const [visitors] = useState<VisitorInfo[]>(multiplayer === 'true' ? MOCK_VISITORS : []);

  const transitionAnim = useRef(new Animated.Value(0)).current;
  const roomTransitionAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (id && !currentVisitSession) {
      try {
        startVisitSession(id);
        console.log('[Home3DEnvironment] Started session for home:', id);
      } catch (error) {
        console.log('[Home3DEnvironment] Error starting session:', error);
      }
    }

    Animated.timing(transitionAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => {
      if (currentVisitSession) {
        endVisitSession();
      }
    };
  }, [id]);

  const rooms = useMemo(() => home?.model3D?.rooms || [], [home]);
  const currentRoom = useMemo(() => rooms[currentRoomIndex], [rooms, currentRoomIndex]);
  const hotspots = useMemo(() => home?.model3D?.hotspots || [], [home]);

  const handleRoomChange = useCallback((direction: 'prev' | 'next') => {
    if (rooms.length === 0) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(roomTransitionAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(roomTransitionAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const newIndex = direction === 'next'
      ? (currentRoomIndex + 1) % rooms.length
      : (currentRoomIndex - 1 + rooms.length) % rooms.length;

    setTimeout(() => {
      setCurrentRoomIndex(newIndex);
      if (rooms[newIndex]) {
        setCurrentRoom(rooms[newIndex].id);
      }
    }, 150);
  }, [rooms, currentRoomIndex, roomTransitionAnim, setCurrentRoom]);

  const handleRoomSelect = useCallback((roomId: string) => {
    const index = rooms.findIndex(r => r.id === roomId);
    if (index !== -1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      Animated.sequence([
        Animated.timing(roomTransitionAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(roomTransitionAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        setCurrentRoomIndex(index);
        setCurrentRoom(roomId);
        setShowFloorPlan(false);
      }, 150);
    }
  }, [rooms, roomTransitionAnim, setCurrentRoom]);

  const handleHotspotPress = useCallback((hotspot: Hotspot) => {
    console.log('[Home3DEnvironment] Hotspot pressed:', hotspot.label);
    
    if (hotspot.type === 'navigation' && hotspot.targetRoomId) {
      handleRoomSelect(hotspot.targetRoomId);
    } else {
      setActiveHotspotId(activeHotspotId === hotspot.id ? undefined : hotspot.id);
    }
  }, [activeHotspotId, handleRoomSelect]);

  const handleFurniturePress = useCallback((furniture: FurnitureItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFurniture(furniture);
    setSelectedDecor(null);
    setFurnitureType('furniture');
    setShowFurnitureModal(true);
  }, []);

  const handleDecorPress = useCallback((decor: DecorItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDecor(decor);
    setSelectedFurniture(null);
    setFurnitureType('decor');
    setShowFurnitureModal(true);
  }, []);

  const handleAvatarSave = useCallback((avatar: { color: string; accessory?: string; outfit?: string; effect?: string }) => {
    setUserAvatar({
      color: avatar.color,
      accessory: avatar.accessory,
      outfit: avatar.outfit || 'casual',
      effect: avatar.effect,
    });
    console.log('[Home3DEnvironment] Avatar updated:', avatar);
  }, []);

  const handleExit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    endVisitSession();
    router.back();
  }, [endVisitSession, router]);

  const cycleLighting = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const presets: LightingPreset[] = ['day', 'sunset', 'night', 'dramatic'];
    const currentIndex = presets.indexOf(lightingPreset);
    setLightingPreset(presets[(currentIndex + 1) % presets.length]);
  }, [lightingPreset]);

  const cycleWeather = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const effects: WeatherEffect[] = ['clear', 'rain', 'fog'];
    const currentIndex = effects.indexOf(weatherEffect);
    setWeatherEffect(effects[(currentIndex + 1) % effects.length]);
  }, [weatherEffect]);

  const styles = createStyles(colors, isDark, isFullscreen);

  if (!home) {
    return (
      <View style={styles.notFoundContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Home color={colors.textLight} size={64} />
        <Text style={styles.notFoundText}>Home not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getLightingIcon = () => {
    switch (lightingPreset) {
      case 'night': return <Moon color="#A0AEC0" size={20} />;
      case 'sunset': return <Sun color="#F97316" size={20} />;
      case 'dramatic': return <Sparkles color="#8B5CF6" size={20} />;
      default: return <Sun color="#F59E0B" size={20} />;
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: transitionAnim }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View
        style={[
          styles.roomViewContainer,
          {
            opacity: roomTransitionAnim,
            transform: [
              {
                scale: roomTransitionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
        ]}
      >
        {currentRoom && (
          <Room3DView
            room={currentRoom}
            roomImage={home.images[currentRoomIndex % home.images.length]}
            hotspots={hotspots.filter(h => h.targetRoomId === currentRoom.id || !h.targetRoomId)}
            lightingPreset={lightingPreset}
            weatherEffect={weatherEffect}
            onHotspotPress={handleHotspotPress}
            onFurniturePress={handleFurniturePress}
            onDecorPress={handleDecorPress}
            visitors={visitors.map(v => ({
              id: v.id,
              name: v.name,
              avatar: v.avatar,
              position: { x: 80 + Math.random() * 150, y: height * 0.5 + Math.random() * 100 },
            }))}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          />
        )}

        <InteractiveHotspotGroup
          hotspots={hotspots.slice(0, 4)}
          onHotspotPress={handleHotspotPress}
          activeHotspotId={activeHotspotId}
        />
      </Animated.View>

      {!isFullscreen && (
        <>
          <View style={[styles.topBar, { paddingTop: insets.top }]}>
            <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
              <X color="#FFFFFF" size={22} />
            </TouchableOpacity>

            <View style={styles.homeInfoBar}>
              <Text style={styles.homeTitle} numberOfLines={1}>
                {home.propertyName}
              </Text>
              <View style={styles.homeMetaRow}>
                <Eye color="rgba(255,255,255,0.7)" size={12} />
                <Text style={styles.homeMeta}>
                  {currentRoom?.name || 'Exploring'}
                </Text>
              </View>
            </View>

            <View style={styles.topBarActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowEnvironmentControls(!showEnvironmentControls)}
              >
                <Settings color="#FFFFFF" size={20} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.visitorButton}
                onPress={() => {}}
              >
                <Users color="#FFFFFF" size={18} />
                <Text style={styles.visitorCount}>
                  {visitors.length + 1}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showEnvironmentControls && (
            <View style={styles.environmentPanel}>
              <Text style={styles.panelTitle}>Environment</Text>
              
              <View style={styles.environmentRow}>
                <TouchableOpacity
                  style={styles.environmentOption}
                  onPress={cycleLighting}
                >
                  {getLightingIcon()}
                  <Text style={styles.environmentLabel}>
                    {lightingPreset.charAt(0).toUpperCase() + lightingPreset.slice(1)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.environmentOption}
                  onPress={cycleWeather}
                >
                  <CloudRain color={weatherEffect === 'rain' ? '#3B82F6' : '#9CA3AF'} size={20} />
                  <Text style={styles.environmentLabel}>
                    {weatherEffect.charAt(0).toUpperCase() + weatherEffect.slice(1)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.environmentOption}
                  onPress={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? (
                    <VolumeX color="#EF4444" size={20} />
                  ) : (
                    <Volume2 color="#22C55E" size={20} />
                  )}
                  <Text style={styles.environmentLabel}>
                    {isMuted ? 'Muted' : 'Sound'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.sideControls}>
            <TouchableOpacity
              style={styles.sideButton}
              onPress={() => setShowFloorPlan(!showFloorPlan)}
            >
              <Map color="#FFFFFF" size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sideButton}
              onPress={() => setShowAvatarCustomizer(true)}
            >
              <User color="#FFFFFF" size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sideButton}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Camera color="#FFFFFF" size={20} />
            </TouchableOpacity>
          </View>

          {visitors.length > 0 && (
            <View style={styles.visitorsBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.visitorsScroll}
              >
                {visitors.map((visitor) => (
                  <View key={visitor.id} style={styles.visitorItem}>
                    <VisitorAvatar
                      visitor={visitor}
                      size="small"
                      showName={false}
                      showStatus={true}
                      animated={true}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => handleRoomChange('prev')}
            >
              <ChevronLeft color="#FFFFFF" size={28} />
            </TouchableOpacity>

            <View style={styles.roomIndicator}>
              <Compass color="rgba(255,255,255,0.7)" size={16} />
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

          <View style={styles.roomThumbnails}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailsContent}
            >
              {rooms.map((room, index) => (
                <TouchableOpacity
                  key={room.id}
                  style={[
                    styles.thumbnail,
                    currentRoomIndex === index && styles.thumbnailActive,
                  ]}
                  onPress={() => handleRoomSelect(room.id)}
                >
                  <Image
                    source={{ uri: home.images[index % home.images.length] }}
                    style={styles.thumbnailImage}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.thumbnailGradient}
                  />
                  <Text style={styles.thumbnailText} numberOfLines={1}>
                    {room.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}

      {showFloorPlan && (
        <FloorPlanNavigator
          rooms={rooms}
          currentRoomId={currentRoom?.id || ''}
          visitors={visitors}
          onRoomSelect={handleRoomSelect}
          onClose={() => setShowFloorPlan(false)}
        />
      )}

      <AvatarCustomizer
        visible={showAvatarCustomizer}
        currentAvatar={userAvatar}
        onSave={handleAvatarSave}
        onClose={() => setShowAvatarCustomizer(false)}
        userLevel={25}
      />

      <FurnitureDetailModal
        visible={showFurnitureModal}
        item={furnitureType === 'furniture' ? selectedFurniture : selectedDecor}
        type={furnitureType}
        onClose={() => {
          setShowFurnitureModal(false);
          setSelectedFurniture(null);
          setSelectedDecor(null);
        }}
      />
    </Animated.View>
  );
}

const createStyles = (colors: any, isDark: boolean, isFullscreen: boolean) =>
  StyleSheet.create({
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
    roomViewContainer: {
      flex: 1,
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
    homeTitle: {
      fontSize: 17,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    homeMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    homeMeta: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
    },
    topBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    visitorButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(139, 92, 246, 0.8)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
    },
    visitorCount: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    environmentPanel: {
      position: 'absolute',
      top: 110,
      right: 16,
      backgroundColor: 'rgba(0,0,0,0.85)',
      borderRadius: 16,
      padding: 16,
      minWidth: 180,
    },
    panelTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#FFFFFF',
      marginBottom: 12,
    },
    environmentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    environmentOption: {
      alignItems: 'center',
      gap: 6,
    },
    environmentLabel: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.7)',
    },
    sideControls: {
      position: 'absolute',
      left: 16,
      top: '50%',
      transform: [{ translateY: -80 }],
      gap: 12,
    },
    sideButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    visitorsBar: {
      position: 'absolute',
      right: 16,
      top: '50%',
      transform: [{ translateY: -60 }],
    },
    visitorsScroll: {
      gap: 8,
    },
    visitorItem: {
      marginBottom: 8,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 80,
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
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      gap: 8,
    },
    roomIndicatorText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    roomIndicatorCount: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.6)',
    },
    roomThumbnails: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingVertical: 12,
    },
    thumbnailsContent: {
      paddingHorizontal: 16,
      gap: 10,
    },
    thumbnail: {
      width: 80,
      height: 60,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    thumbnailActive: {
      borderColor: '#8B5CF6',
    },
    thumbnailImage: {
      width: '100%',
      height: '100%',
    },
    thumbnailGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 30,
    },
    thumbnailText: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      right: 4,
      fontSize: 9,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
  });
