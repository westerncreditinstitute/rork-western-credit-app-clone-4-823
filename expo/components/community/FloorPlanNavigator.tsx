import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Home,
  ChefHat,
  Bed,
  Bath,
  Sofa,
  Monitor,
  Car,
  Waves,
  TreePine,
  Sun,
  X,
  Users,
  Navigation,
} from 'lucide-react-native';
import { Room3D, RoomType, VisitorInfo } from '@/types/communityHomes';
import { useTheme } from '@/contexts/ThemeContext';

Dimensions.get('window');

interface FloorPlanNavigatorProps {
  rooms: Room3D[];
  currentRoomId: string;
  visitors: VisitorInfo[];
  onRoomSelect: (roomId: string) => void;
  onClose: () => void;
  isExpanded?: boolean;
}

const ROOM_ICONS: Record<RoomType, React.ReactNode> = {
  living_room: <Sofa color="#FFFFFF" size={18} />,
  kitchen: <ChefHat color="#FFFFFF" size={18} />,
  bedroom: <Bed color="#FFFFFF" size={18} />,
  bathroom: <Bath color="#FFFFFF" size={18} />,
  dining_room: <Home color="#FFFFFF" size={18} />,
  office: <Monitor color="#FFFFFF" size={18} />,
  garage: <Car color="#FFFFFF" size={18} />,
  pool: <Waves color="#FFFFFF" size={18} />,
  garden: <TreePine color="#FFFFFF" size={18} />,
  balcony: <Sun color="#FFFFFF" size={18} />,
};

const ROOM_COLORS: Record<RoomType, string> = {
  living_room: '#3B82F6',
  kitchen: '#F59E0B',
  bedroom: '#8B5CF6',
  bathroom: '#06B6D4',
  dining_room: '#EC4899',
  office: '#6366F1',
  garage: '#6B7280',
  pool: '#14B8A6',
  garden: '#22C55E',
  balcony: '#F97316',
};

export default function FloorPlanNavigator({
  rooms,
  currentRoomId,
  visitors,
  onRoomSelect,
  onClose,
  isExpanded = false,
}: FloorPlanNavigatorProps) {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnims = useRef<Map<string, Animated.Value>>(new Map()).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    rooms.forEach((room) => {
      if (room.id === currentRoomId && !pulseAnims.has(room.id)) {
        const anim = new Animated.Value(0);
        pulseAnims.set(room.id, anim);
        
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    });
  }, [currentRoomId, rooms, scaleAnim, fadeAnim, pulseAnims]);

  const handleRoomPress = useCallback((roomId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRoomSelect(roomId);
  }, [onRoomSelect]);

  const getVisitorsInRoom = useCallback((roomId: string) => {
    return visitors.filter(v => {
      const roomIndex = rooms.findIndex(r => r.id === roomId);
      return Math.floor(v.position.x / 100) === roomIndex;
    });
  }, [visitors, rooms]);

  const styles = createStyles(colors, isDark, isExpanded);

  const totalArea = rooms.reduce((sum, room) => sum + room.size.x * room.size.z, 0);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#FFFFFF', '#F8FAFC']}
        style={styles.gradient}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Navigation color={colors.primary} size={18} />
          <Text style={styles.title}>Floor Plan</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X color={colors.text} size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{rooms.length}</Text>
          <Text style={styles.statLabel}>Rooms</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalArea.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Sq Ft</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{visitors.length}</Text>
          <Text style={styles.statLabel}>Visitors</Text>
        </View>
      </View>

      <ScrollView
        style={styles.roomsScroll}
        contentContainerStyle={styles.roomsContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.floorPlanContainer}>
          {rooms.map((room, index) => {
            const isCurrentRoom = room.id === currentRoomId;
            const roomVisitors = getVisitorsInRoom(room.id);
            const pulseAnim = pulseAnims.get(room.id);
            const roomColor = ROOM_COLORS[room.type];

            const roomWidth = Math.max(70, (room.size.x / 25) * 100);
            const roomHeight = Math.max(60, (room.size.z / 25) * 80);

            return (
              <TouchableOpacity
                key={room.id}
                style={[
                  styles.roomBlock,
                  {
                    width: roomWidth,
                    height: roomHeight,
                    backgroundColor: isCurrentRoom
                      ? roomColor
                      : isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.05)',
                    borderColor: isCurrentRoom ? roomColor : colors.border,
                  },
                ]}
                onPress={() => handleRoomPress(room.id)}
                activeOpacity={0.7}
              >
                {isCurrentRoom && pulseAnim && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.roomPulse,
                      {
                        backgroundColor: roomColor,
                        opacity: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 0],
                        }),
                        transform: [
                          {
                            scale: pulseAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.3],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                )}

                <View
                  style={[
                    styles.roomIcon,
                    {
                      backgroundColor: isCurrentRoom
                        ? 'rgba(255,255,255,0.2)'
                        : roomColor,
                    },
                  ]}
                >
                  {ROOM_ICONS[room.type]}
                </View>

                <Text
                  style={[
                    styles.roomName,
                    isCurrentRoom && styles.roomNameActive,
                  ]}
                  numberOfLines={1}
                >
                  {room.name}
                </Text>

                <Text
                  style={[
                    styles.roomSize,
                    isCurrentRoom && styles.roomSizeActive,
                  ]}
                >
                  {room.size.x}×{room.size.z}
                </Text>

                {roomVisitors.length > 0 && (
                  <View style={styles.visitorBadge}>
                    <Users color="#FFFFFF" size={10} />
                    <Text style={styles.visitorCount}>{roomVisitors.length}</Text>
                  </View>
                )}

                {isCurrentRoom && (
                  <View style={styles.currentIndicator}>
                    <Text style={styles.currentText}>Here</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Room Types</Text>
          <View style={styles.legendItems}>
            {Object.entries(ROOM_COLORS).slice(0, 6).map(([type, color]) => (
              <View key={type} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.quickNav}>
        <Text style={styles.quickNavTitle}>Quick Navigation</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickNavItems}
        >
          {rooms.map((room) => {
            const isCurrentRoom = room.id === currentRoomId;
            const roomColor = ROOM_COLORS[room.type];

            return (
              <TouchableOpacity
                key={room.id}
                style={[
                  styles.quickNavItem,
                  {
                    backgroundColor: isCurrentRoom ? roomColor : colors.surfaceAlt,
                  },
                ]}
                onPress={() => handleRoomPress(room.id)}
              >
                {ROOM_ICONS[room.type]}
                <Text
                  style={[
                    styles.quickNavText,
                    isCurrentRoom && styles.quickNavTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {room.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const createStyles = (colors: any, isDark: boolean, isExpanded: boolean) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 100,
      left: 12,
      right: 12,
      backgroundColor: colors.surface,
      borderRadius: 20,
      overflow: 'hidden',
      maxHeight: isExpanded ? 500 : 380,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textLight,
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: colors.border,
    },
    roomsScroll: {
      flex: 1,
    },
    roomsContent: {
      padding: 16,
    },
    floorPlanContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
    },
    roomBlock: {
      borderRadius: 12,
      borderWidth: 2,
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    roomPulse: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 10,
    },
    roomIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    roomName: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.text,
      textAlign: 'center',
    },
    roomNameActive: {
      color: '#FFFFFF',
    },
    roomSize: {
      fontSize: 9,
      color: colors.textLight,
      marginTop: 2,
    },
    roomSizeActive: {
      color: 'rgba(255,255,255,0.7)',
    },
    visitorBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#8B5CF6',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      gap: 3,
    },
    visitorCount: {
      fontSize: 10,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    currentIndicator: {
      position: 'absolute',
      bottom: 4,
      backgroundColor: 'rgba(255,255,255,0.3)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    currentText: {
      fontSize: 8,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    legend: {
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    legendTitle: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textLight,
      marginBottom: 8,
    },
    legendItems: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendColor: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendLabel: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    quickNav: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    quickNavTitle: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textLight,
      marginBottom: 10,
    },
    quickNavItems: {
      gap: 8,
    },
    quickNavItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
    },
    quickNavText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text,
    },
    quickNavTextActive: {
      color: '#FFFFFF',
    },
  });
