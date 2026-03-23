import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  X,
  Home,
  MapPin,
  Users,
  Edit3,
  Save,
  ChevronRight,
  Bed,
  Bath,
  Maximize,
  Calendar,
  DollarSign,
  Lock,
  Unlock,
  Sparkles,
  Settings,
  Info,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { formatCurrency } from '@/utils/creditEngine';

const { height } = Dimensions.get('window');

interface HousingDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onEditHome: () => void;
}

interface RoomInfo {
  name: string;
  type: string;
  items: number;
}

const HOME_IMAGES: Record<string, string> = {
  owns_luxury: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
  owns_house: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
  owns_condo: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
  renting: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
  shared_rental: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
  homeless: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
};

const HOUSING_COLORS: Record<string, string> = {
  owns_luxury: '#F59E0B',
  owns_house: '#22C55E',
  owns_condo: '#3B82F6',
  renting: '#8B5CF6',
  shared_rental: '#EC4899',
  homeless: '#6B7280',
};

const HOUSING_LABELS: Record<string, string> = {
  shared_rental: 'Shared Rental',
  renting: 'Apartment Rental',
  owns_condo: 'Condominium',
  owns_house: 'House',
  owns_luxury: 'Luxury Property',
  homeless: 'No Housing',
};

function getHousingStats(housingType: string) {
  switch (housingType) {
    case 'owns_luxury':
      return { bedrooms: 5, bathrooms: 4, sqft: 4200, occupants: 6 };
    case 'owns_house':
      return { bedrooms: 3, bathrooms: 2, sqft: 1800, occupants: 4 };
    case 'owns_condo':
      return { bedrooms: 2, bathrooms: 2, sqft: 1200, occupants: 3 };
    case 'renting':
      return { bedrooms: 2, bathrooms: 1, sqft: 850, occupants: 2 };
    case 'shared_rental':
      return { bedrooms: 1, bathrooms: 1, sqft: 450, occupants: 2 };
    default:
      return { bedrooms: 0, bathrooms: 0, sqft: 0, occupants: 0 };
  }
}

function getRooms(housingType: string): RoomInfo[] {
  switch (housingType) {
    case 'owns_luxury':
      return [
        { name: 'Grand Living Room', type: 'living', items: 18 },
        { name: 'Master Suite', type: 'bedroom', items: 14 },
        { name: 'Chef Kitchen', type: 'kitchen', items: 22 },
        { name: 'Master Bath', type: 'bathroom', items: 10 },
        { name: 'Home Office', type: 'office', items: 8 },
        { name: 'Guest Suite', type: 'bedroom', items: 9 },
      ];
    case 'owns_house':
      return [
        { name: 'Living Room', type: 'living', items: 12 },
        { name: 'Master Bedroom', type: 'bedroom', items: 8 },
        { name: 'Kitchen', type: 'kitchen', items: 15 },
        { name: 'Bathroom', type: 'bathroom', items: 6 },
        { name: 'Guest Room', type: 'bedroom', items: 5 },
      ];
    case 'owns_condo':
      return [
        { name: 'Living Room', type: 'living', items: 10 },
        { name: 'Bedroom', type: 'bedroom', items: 7 },
        { name: 'Kitchen', type: 'kitchen', items: 12 },
        { name: 'Bathroom', type: 'bathroom', items: 5 },
      ];
    case 'renting':
      return [
        { name: 'Living Room', type: 'living', items: 8 },
        { name: 'Bedroom', type: 'bedroom', items: 6 },
        { name: 'Kitchen', type: 'kitchen', items: 10 },
        { name: 'Bathroom', type: 'bathroom', items: 4 },
      ];
    case 'shared_rental':
      return [
        { name: 'Your Room', type: 'bedroom', items: 5 },
        { name: 'Shared Kitchen', type: 'kitchen', items: 8 },
        { name: 'Shared Bathroom', type: 'bathroom', items: 3 },
      ];
    default:
      return [];
  }
}

export default function HousingDetailsModal({
  visible,
  onClose,
  onEditHome,
}: HousingDetailsModalProps) {
  const { colors, isDark } = useTheme();
  const { gameState, updateAlert } = useGame();

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const [editingHomeName, setEditingHomeName] = useState(false);
  const [homeNameInput, setHomeNameInput] = useState('');
  const [isPublicHome, setIsPublicHome] = useState(false);

  const housingType = gameState.lifestyle.housingType;
  const housingColor = HOUSING_COLORS[housingType] ?? '#6B7280';
  const housingLabel = HOUSING_LABELS[housingType] ?? 'Rental';
  const homeImage = HOME_IMAGES[housingType] ?? HOME_IMAGES.homeless;
  const stats = getHousingStats(housingType);
  const rooms = getRooms(housingType);
  const monthlyCost = gameState.lifestyle.monthlyRent ?? 0;

  useEffect(() => {
    if (visible) {
      setHomeNameInput(gameState.lifestyle.housingName || '');
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim, scaleAnim, gameState.lifestyle.housingName]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleEditHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onEditHome();
    handleClose();
  };

  const handleSaveHomeName = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingHomeName(false);
  };

  const renderHousingIcon = () => {
    switch (housingType) {
      case 'owns_luxury':
        return <Sparkles size={24} color="#F59E0B" />;
      case 'owns_house':
        return <Home size={24} color="#22C55E" />;
      case 'owns_condo':
        return <Home size={24} color="#3B82F6" />;
      default:
        return <Home size={24} color="#6B7280" />;
    }
  };

  const styles = createStyles(colors, isDark);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />

      <Animated.View
        style={[
          styles.modal,
          {
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.handleBar} />

        <TouchableOpacity style={styles.closeButton} onPress={handleClose} testID="housing-modal-close">
          <X color={colors.text} size={22} />
        </TouchableOpacity>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: homeImage }}
              style={styles.homeImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />
            <View style={styles.imageOverlay}>
              <View style={styles.typeBadge}>
                {renderHousingIcon()}
                <Text style={styles.typeText}>{housingLabel}</Text>
              </View>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: housingColor }]}
                onPress={handleEditHome}
                testID="housing-modal-edit"
              >
                <Edit3 color="#FFFFFF" size={18} />
                <Text style={styles.editButtonText}>Edit Home</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <View style={styles.nameRow}>
              {editingHomeName ? (
                <View style={styles.nameEditContainer}>
                  <TextInput
                    style={[styles.nameInput, { color: colors.text, borderBottomColor: housingColor }]}
                    value={homeNameInput}
                    onChangeText={setHomeNameInput}
                    placeholder="Enter home name"
                    placeholderTextColor={colors.textSecondary}
                    autoFocus
                    testID="housing-modal-name-input"
                  />
                  <TouchableOpacity
                    style={[styles.saveNameButton, { backgroundColor: `${housingColor}20` }]}
                    onPress={handleSaveHomeName}
                    testID="housing-modal-save-name"
                  >
                    <Save color={housingColor} size={18} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nameDisplay}>
                  <Text style={[styles.homeName, { color: colors.text }]}>
                    {gameState.lifestyle.housingName || 'My Home'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEditingHomeName(true)}
                    style={styles.editNameButton}
                    testID="housing-modal-edit-name"
                  >
                    <Edit3 color={colors.textSecondary} size={16} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: `${housingColor}20` }]}>
                <MapPin color={housingColor} size={18} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Location</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {gameState.lifestyle.cityName || 'San Francisco, CA'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#10B98120' }]}>
                <DollarSign color="#10B981" size={18} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Property Value</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatCurrency(gameState.lifestyle.totalPropertyValue)}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#EF444420' }]}>
                <Calendar color="#EF4444" size={18} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Monthly Cost</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatCurrency(monthlyCost)}
                </Text>
              </View>
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Rooms</Text>
              <Text style={[styles.roomCount, { color: colors.textSecondary }]}>
                {rooms.length} room{rooms.length !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={styles.roomsGrid}>
              {rooms.map((room, index) => (
                <TouchableOpacity
                  key={`${room.type}-${index}`}
                  style={[styles.roomCard, { backgroundColor: isDark ? colors.background : colors.surfaceAlt ?? '#F3F4F6' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  testID={`housing-room-${index}`}
                >
                  <View style={[styles.roomIcon, { backgroundColor: `${housingColor}15` }]}>
                    <Home color={housingColor} size={20} />
                  </View>
                  <View style={styles.roomInfo}>
                    <Text style={[styles.roomName, { color: colors.text }]} numberOfLines={1}>
                      {room.name}
                    </Text>
                    <Text style={[styles.roomItems, { color: colors.textSecondary }]}>
                      {room.items} items
                    </Text>
                  </View>
                  <ChevronRight color={colors.textSecondary} size={16} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Stats</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statItem, { backgroundColor: isDark ? colors.background : colors.surfaceAlt ?? '#F3F4F6' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#3B82F620' }]}>
                  <Bed color="#3B82F6" size={20} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.bedrooms}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bedrooms</Text>
              </View>

              <View style={[styles.statItem, { backgroundColor: isDark ? colors.background : colors.surfaceAlt ?? '#F3F4F6' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Bath color="#8B5CF6" size={20} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.bathrooms}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bathrooms</Text>
              </View>

              <View style={[styles.statItem, { backgroundColor: isDark ? colors.background : colors.surfaceAlt ?? '#F3F4F6' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
                  <Maximize color="#10B981" size={20} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.sqft.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sq Ft</Text>
              </View>

              <View style={[styles.statItem, { backgroundColor: isDark ? colors.background : colors.surfaceAlt ?? '#F3F4F6' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Users color="#F59E0B" size={20} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.occupants}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Occupants</Text>
              </View>
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy Settings</Text>
            </View>

            <TouchableOpacity
              style={[styles.privacyRow, { backgroundColor: isDark ? colors.background : colors.surfaceAlt ?? '#F3F4F6' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsPublicHome(!isPublicHome);
              }}
              testID="housing-privacy-toggle"
            >
              <View style={styles.privacyInfo}>
                <View style={[styles.privacyIcon, { backgroundColor: '#6366F120' }]}>
                  {isPublicHome ? (
                    <Unlock color="#6366F1" size={20} />
                  ) : (
                    <Lock color="#6366F1" size={20} />
                  )}
                </View>
                <View style={styles.privacyTextWrap}>
                  <Text style={[styles.privacyTitle, { color: colors.text }]}>Public Home</Text>
                  <Text style={[styles.privacyDescription, { color: colors.textSecondary }]}>
                    {isPublicHome
                      ? 'Other players can visit your home'
                      : 'Only you can see your home'}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.toggleTrack,
                  { backgroundColor: isPublicHome ? housingColor : colors.border },
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    { transform: [{ translateX: isPublicHome ? 20 : 0 }] },
                  ]}
                />
              </View>
            </TouchableOpacity>

            <View
              style={[
                styles.infoBox,
                { backgroundColor: `${housingColor}10`, borderColor: `${housingColor}30` },
              ]}
            >
              <Info color={housingColor} size={18} />
              <Text style={[styles.infoBoxText, { color: colors.text }]}>
                Upgrade your home to unlock more rooms, customization options, and
                visitor capacity. Visit the Real Estate marketplace to explore
                available properties.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, { borderColor: housingColor }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Home Settings', 'Additional home settings coming soon!');
            }}
            testID="housing-settings-btn"
          >
            <Settings color={housingColor} size={18} />
            <Text style={[styles.actionButtonText, { color: housingColor }]}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: housingColor }]}
            onPress={handleEditHome}
            testID="housing-edit-btn"
          >
            <Edit3 color="#FFFFFF" size={18} />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Edit Home</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      zIndex: 1000,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modal: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: height * 0.9,
      overflow: 'hidden',
    },
    handleBar: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    content: {
      flex: 1,
    },
    imageContainer: {
      width: '100%',
      height: 220,
      position: 'relative',
    },
    homeImage: {
      width: '100%',
      height: '100%',
    },
    imageGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 120,
    },
    imageOverlay: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      gap: 8,
    },
    typeText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      gap: 6,
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    detailsSection: {
      padding: 20,
    },
    nameRow: {
      marginBottom: 20,
    },
    nameDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    homeName: {
      fontSize: 26,
      fontWeight: '700' as const,
    },
    editNameButton: {
      padding: 8,
    },
    nameEditContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    nameInput: {
      flex: 1,
      fontSize: 24,
      fontWeight: '600' as const,
      borderBottomWidth: 2,
      paddingVertical: 4,
    },
    saveNameButton: {
      padding: 8,
      borderRadius: 12,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 14,
    },
    infoIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 12,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    roomCount: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    roomsGrid: {
      gap: 10,
    },
    roomCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 14,
      gap: 12,
    },
    roomIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roomInfo: {
      flex: 1,
    },
    roomName: {
      fontSize: 15,
      fontWeight: '600' as const,
      marginBottom: 2,
    },
    roomItems: {
      fontSize: 13,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statItem: {
      flex: 1,
      minWidth: '45%' as any,
      padding: 16,
      borderRadius: 14,
      alignItems: 'center',
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700' as const,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      textAlign: 'center' as const,
    },
    privacyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 14,
    },
    privacyInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    privacyIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    privacyTextWrap: {
      flex: 1,
    },
    privacyTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      marginBottom: 2,
    },
    privacyDescription: {
      fontSize: 13,
    },
    toggleTrack: {
      width: 48,
      height: 28,
      borderRadius: 14,
      padding: 3,
    },
    toggleThumb: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      marginTop: 20,
    },
    infoBoxText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
    },
    actionBar: {
      flexDirection: 'row',
      padding: 16,
      paddingBottom: 32,
      gap: 12,
      borderTopWidth: 1,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
    },
    secondaryButton: {
      borderWidth: 1.5,
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
  });
