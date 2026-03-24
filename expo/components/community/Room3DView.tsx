import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Sun, Moon, CloudRain, Cloud, Maximize2, Minimize2 } from 'lucide-react-native';
import { Room3D, FurnitureItem, DecorItem, Hotspot } from '@/types/communityHomes';
import { useTheme } from '@/contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface Room3DViewProps {
  room: Room3D;
  roomImage: string;
  hotspots: Hotspot[];
  lightingPreset: 'day' | 'night' | 'sunset' | 'dramatic';
  weatherEffect?: 'clear' | 'rain' | 'snow' | 'fog';
  onHotspotPress: (hotspot: Hotspot) => void;
  onFurniturePress: (furniture: FurnitureItem) => void;
  onDecorPress: (decor: DecorItem) => void;
  visitors?: { id: string; name: string; avatar: string; position: { x: number; y: number } }[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const ROOM_IMAGES: Record<string, string> = {
  living_room: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200',
  kitchen: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200',
  bedroom: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200',
  bathroom: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200',
  dining_room: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1200',
  office: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=1200',
  garage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200',
  pool: 'https://images.unsplash.com/photo-1572331165267-854da2b021aa?w=1200',
  garden: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1200',
  balcony: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1200',
};

const LIGHTING_OVERLAYS: Record<string, string[]> = {
  day: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.05)'],
  night: ['rgba(0,0,40,0.4)', 'rgba(0,0,60,0.5)'],
  sunset: ['rgba(255,150,50,0.15)', 'rgba(255,100,50,0.2)'],
  dramatic: ['rgba(0,0,0,0.2)', 'rgba(50,50,100,0.3)'],
};

export default function Room3DView({
  room,
  roomImage,
  hotspots,
  lightingPreset,
  weatherEffect,
  onHotspotPress,
  onFurniturePress,
  onDecorPress,
  visitors = [],
  isFullscreen = false,
  onToggleFullscreen,
}: Room3DViewProps) {
  const { colors, isDark } = useTheme();
  const [zoom, setZoom] = useState(1);
  const [showWeatherParticles, setShowWeatherParticles] = useState(false);

  const panAnim = useRef(new Animated.ValueXY()).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateYAnim = useRef(new Animated.Value(0)).current;
  const pulseAnims = useRef<Map<string, Animated.Value>>(new Map()).current;
  const weatherAnims = useRef<Animated.Value[]>([]).current;

  const actualRoomImage = roomImage || ROOM_IMAGES[room.type] || ROOM_IMAGES.living_room;

  useEffect(() => {
    hotspots.forEach((hotspot) => {
      if (!pulseAnims.has(hotspot.id)) {
        const anim = new Animated.Value(0);
        pulseAnims.set(hotspot.id, anim);
        
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    });
  }, [hotspots, pulseAnims]);

  useEffect(() => {
    if (weatherEffect === 'rain' || weatherEffect === 'snow') {
      setShowWeatherParticles(true);
      for (let i = 0; i < 20; i++) {
        const anim = new Animated.Value(0);
        weatherAnims.push(anim);
        
        const delay = Math.random() * 2000;
        const duration = weatherEffect === 'rain' ? 1000 : 3000;
        
        setTimeout(() => {
          Animated.loop(
            Animated.timing(anim, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            })
          ).start();
        }, delay);
      }
    } else {
      setShowWeatherParticles(false);
    }
  }, [weatherEffect, weatherAnims]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        panAnim.setOffset({
          x: (panAnim.x as any)._value,
          y: (panAnim.y as any)._value,
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gestureState) => {
        const maxPanX = (zoom - 1) * width * 0.3;
        const maxPanY = (zoom - 1) * height * 0.2;
        
        const newX = Math.max(-maxPanX, Math.min(maxPanX, gestureState.dx));
        const newY = Math.max(-maxPanY, Math.min(maxPanY, gestureState.dy));
        
        panAnim.setValue({ x: newX, y: newY });
        
        const rotateY = (gestureState.dx / width) * 15;
        rotateYAnim.setValue(rotateY);
      },
      onPanResponderRelease: () => {
        panAnim.flattenOffset();
        
        Animated.spring(rotateYAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newZoom = direction === 'in' 
      ? Math.min(2.5, zoom + 0.25) 
      : Math.max(1, zoom - 0.25);
    
    setZoom(newZoom);
    
    Animated.spring(scaleAnim, {
      toValue: newZoom,
      friction: 8,
      useNativeDriver: true,
    }).start();

    if (newZoom === 1) {
      Animated.spring(panAnim, {
        toValue: { x: 0, y: 0 },
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
  }, [zoom, scaleAnim, panAnim]);

  const handleHotspotPress = useCallback((hotspot: Hotspot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onHotspotPress(hotspot);
  }, [onHotspotPress]);

  const rotateY = rotateYAnim.interpolate({
    inputRange: [-15, 15],
    outputRange: ['-5deg', '5deg'],
  });

  const styles = createStyles(colors, isDark, isFullscreen);

  const getLightingIcon = () => {
    switch (lightingPreset) {
      case 'night': return <Moon color="#A0AEC0" size={16} />;
      case 'sunset': return <Sun color="#F59E0B" size={16} />;
      default: return <Sun color="#F59E0B" size={16} />;
    }
  };

  const getWeatherIcon = () => {
    switch (weatherEffect) {
      case 'rain': return <CloudRain color="#3B82F6" size={16} />;
      case 'fog': return <Cloud color="#9CA3AF" size={16} />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sceneWrapper} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.roomContainer,
            {
              transform: [
                { translateX: panAnim.x },
                { translateY: panAnim.y },
                { scale: scaleAnim },
                { perspective: 1000 },
                { rotateY },
              ],
            },
          ]}
        >
          <Image
            source={{ uri: actualRoomImage }}
            style={styles.roomImage}
            resizeMode="cover"
          />

          <LinearGradient
            colors={LIGHTING_OVERLAYS[lightingPreset] as [string, string]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)']}
            style={styles.floorGradient}
            pointerEvents="none"
          />

          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent']}
            style={styles.ceilingGradient}
            pointerEvents="none"
          />

          {hotspots.map((hotspot, index) => {
            const pulseAnim = pulseAnims.get(hotspot.id);
            const posX = 30 + (index % 4) * 80;
            const posY = 100 + Math.floor(index / 4) * 100;

            return (
              <TouchableOpacity
                key={hotspot.id}
                style={[styles.hotspotContainer, { left: posX, top: posY }]}
                onPress={() => handleHotspotPress(hotspot)}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    styles.hotspotPulse,
                    {
                      opacity: pulseAnim?.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.8],
                      }) || 0.5,
                      transform: [
                        {
                          scale: pulseAnim?.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.5],
                          }) || 1,
                        },
                      ],
                    },
                  ]}
                />
                <View
                  style={[
                    styles.hotspotDot,
                    hotspot.type === 'navigation' && styles.hotspotNavigation,
                    hotspot.type === 'interaction' && styles.hotspotInteraction,
                    hotspot.type === 'feature' && styles.hotspotFeature,
                  ]}
                />
                <View style={styles.hotspotLabel}>
                  <Text style={styles.hotspotLabelText}>{hotspot.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {room.furnitureItems.slice(0, 3).map((furniture, index) => (
            <TouchableOpacity
              key={furniture.id}
              style={[
                styles.furnitureMarker,
                { left: 50 + index * 100, top: 200 + (index % 2) * 80 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onFurniturePress(furniture);
              }}
            >
              <View style={styles.furnitureIcon}>
                <Text style={styles.furnitureEmoji}>🛋️</Text>
              </View>
              <Text style={styles.furnitureName} numberOfLines={1}>
                {furniture.name}
              </Text>
            </TouchableOpacity>
          ))}

          {visitors.map((visitor) => (
            <View
              key={visitor.id}
              style={[
                styles.visitorAvatar,
                { left: visitor.position.x, top: visitor.position.y },
              ]}
            >
              <Image source={{ uri: visitor.avatar }} style={styles.visitorImage} contentFit="cover" transition={150} cachePolicy="memory-disk" />
              <Text style={styles.visitorName}>{visitor.name}</Text>
            </View>
          ))}
        </Animated.View>

        {showWeatherParticles && (
          <View style={styles.weatherOverlay} pointerEvents="none">
            {weatherAnims.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  weatherEffect === 'rain' ? styles.raindrop : styles.snowflake,
                  {
                    left: `${(index * 5) % 100}%`,
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, height],
                        }),
                      },
                    ],
                    opacity: anim.interpolate({
                      inputRange: [0, 0.1, 0.9, 1],
                      outputRange: [0, 1, 1, 0],
                    }),
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.roomInfoBar}>
        <View style={styles.roomNameContainer}>
          <Text style={styles.roomName}>{room.name}</Text>
          <Text style={styles.roomSize}>
            {room.size.x} × {room.size.z} ft • {room.ceilingHeight}ft ceiling
          </Text>
        </View>

        <View style={styles.environmentInfo}>
          {getLightingIcon()}
          {getWeatherIcon()}
        </View>
      </View>

      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => handleZoom('in')}
          disabled={zoom >= 2.5}
        >
          <Text style={styles.zoomButtonText}>+</Text>
        </TouchableOpacity>
        <Text style={styles.zoomLevel}>{Math.round(zoom * 100)}%</Text>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => handleZoom('out')}
          disabled={zoom <= 1}
        >
          <Text style={styles.zoomButtonText}>−</Text>
        </TouchableOpacity>
      </View>

      {onToggleFullscreen && (
        <TouchableOpacity
          style={styles.fullscreenButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleFullscreen();
          }}
        >
          {isFullscreen ? (
            <Minimize2 color="#FFFFFF" size={20} />
          ) : (
            <Maximize2 color="#FFFFFF" size={20} />
          )}
        </TouchableOpacity>
      )}

      <View style={styles.materialsInfo}>
        <View style={styles.materialChip}>
          <View style={[styles.materialColor, { backgroundColor: room.wallColor }]} />
          <Text style={styles.materialLabel}>Walls</Text>
        </View>
        <View style={styles.materialChip}>
          <Text style={styles.materialEmoji}>🪵</Text>
          <Text style={styles.materialLabel}>{room.floorType.replace('_', ' ')}</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean, isFullscreen: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
      borderRadius: isFullscreen ? 0 : 16,
      overflow: 'hidden',
    },
    sceneWrapper: {
      flex: 1,
      overflow: 'hidden',
    },
    roomContainer: {
      flex: 1,
      position: 'relative',
    },
    roomImage: {
      width: '100%',
      height: '100%',
    },
    floorGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 150,
    },
    ceilingGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 80,
    },
    hotspotContainer: {
      position: 'absolute',
      alignItems: 'center',
    },
    hotspotPulse: {
      position: 'absolute',
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#3B82F6',
    },
    hotspotDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#3B82F6',
      borderWidth: 3,
      borderColor: '#FFFFFF',
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 6,
    },
    hotspotNavigation: {
      backgroundColor: '#22C55E',
      shadowColor: '#22C55E',
    },
    hotspotInteraction: {
      backgroundColor: '#F59E0B',
      shadowColor: '#F59E0B',
    },
    hotspotFeature: {
      backgroundColor: '#8B5CF6',
      shadowColor: '#8B5CF6',
    },
    hotspotLabel: {
      marginTop: 6,
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    hotspotLabelText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    furnitureMarker: {
      position: 'absolute',
      alignItems: 'center',
    },
    furnitureIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    furnitureEmoji: {
      fontSize: 18,
    },
    furnitureName: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: '600' as const,
      color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      maxWidth: 80,
    },
    visitorAvatar: {
      position: 'absolute',
      alignItems: 'center',
    },
    visitorImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: '#8B5CF6',
    },
    visitorName: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: '600' as const,
      color: '#FFFFFF',
      backgroundColor: 'rgba(139, 92, 246, 0.8)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    weatherOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    raindrop: {
      position: 'absolute',
      width: 2,
      height: 20,
      backgroundColor: 'rgba(100, 150, 255, 0.6)',
      borderRadius: 1,
    },
    snowflake: {
      position: 'absolute',
      width: 8,
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderRadius: 4,
    },
    roomInfoBar: {
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    roomNameContainer: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingHorizontal: 14,
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
    environmentInfo: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
    },
    zoomControls: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: [{ translateY: -60 }],
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 12,
      padding: 8,
      alignItems: 'center',
      gap: 4,
    },
    zoomButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomButtonText: {
      fontSize: 24,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    zoomLevel: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: 'rgba(255,255,255,0.7)',
      paddingVertical: 4,
    },
    fullscreenButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    materialsInfo: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      flexDirection: 'row',
      gap: 8,
    },
    materialChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 6,
    },
    materialColor: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    materialEmoji: {
      fontSize: 12,
    },
    materialLabel: {
      fontSize: 11,
      fontWeight: '500' as const,
      color: '#FFFFFF',
      textTransform: 'capitalize' as const,
    },
  });
