import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  X,
  Home,
  Building2,
  CheckCircle,
  ChevronRight,
  MapPin,
  Briefcase,
  ArrowLeft,
  Sparkles,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useCommunityHomes } from '@/contexts/CommunityHomesContext';
import { OwnedProperty } from '@/types/game';
import { UserBusinessData } from '@/types/business';
import { CommunityHome, PropertyType, HomeStyle } from '@/types/communityHomes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ShareableItemType = 'home' | 'business';

interface ShareableItem {
  id: string;
  type: ShareableItemType;
  name: string;
  value: number;
  imageUrl: string;
  subtitle: string;
  details: string[];
  raw: OwnedProperty | UserBusinessData;
}

interface ShareToCommunityModalProps {
  visible: boolean;
  onClose: () => void;
}

function mapPropertyTypeToCommunity(type: string): PropertyType {
  const map: Record<string, PropertyType> = {
    condo: 'apartment',
    townhouse: 'house',
    single_family: 'house',
    multi_family: 'house',
    luxury: 'mansion',
  };
  return map[type] || 'house';
}

function mapPropertyStyleToCommunity(type: string): HomeStyle {
  const map: Record<string, HomeStyle> = {
    condo: 'modern',
    townhouse: 'classic',
    single_family: 'classic',
    multi_family: 'industrial',
    luxury: 'luxury',
  };
  return map[type] || 'modern';
}

function buildCommunityHomeFromProperty(property: OwnedProperty, playerName: string): CommunityHome {
  const now = Date.now();
  return {
    id: `shared_home_${property.id}_${now}`,
    owner: {
      id: 'current_user',
      name: playerName,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      level: 25,
      creditScore: 750,
      isVerified: false,
      isOnline: true,
      joinedDate: now - 86400000 * 30,
      totalHomes: 1,
      followers: 0,
      following: 0,
      badges: [],
    },
    propertyName: property.name,
    propertyType: mapPropertyTypeToCommunity(property.type),
    style: mapPropertyStyleToCommunity(property.type),
    city: property.address.split(',').pop()?.trim() || 'Unknown City',
    neighborhood: property.address.split(',')[0]?.trim() || 'Downtown',
    description: property.description,
    coverImage: property.imageUrl,
    images: [property.imageUrl],
    stats: {
      likes: 0,
      visits: 0,
      saves: 0,
      shares: 0,
      comments: 0,
      averageVisitDuration: 0,
      weeklyVisitors: 0,
      trending: false,
    },
    details: {
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      squareFootage: property.squareFeet,
      yearBuilt: property.yearBuilt,
    },
    features: [],
    financials: {
      purchasePrice: property.purchasePrice,
      currentValue: property.currentValue,
      isRenting: false,
      isForSale: false,
      isForRent: false,
    },
    social: {
      isLiked: false,
      isSaved: false,
      isFollowingOwner: false,
      hasVisited: false,
    },
    settings: {
      isOpenForVisits: true,
      virtualTourAvailable: false,
      multiplayerEnabled: false,
      chatEnabled: true,
      guestBookEnabled: true,
      allowPhotography: true,
    },
    createdAt: now,
    lastUpdated: now,
  };
}

function buildCommunityHomeFromBusiness(business: UserBusinessData, playerName: string): CommunityHome {
  const now = Date.now();
  return {
    id: `shared_biz_${business.id}_${now}`,
    owner: {
      id: 'current_user',
      name: playerName,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      level: 25,
      creditScore: 750,
      isVerified: false,
      isOnline: true,
      joinedDate: now - 86400000 * 30,
      totalHomes: 0,
      followers: 0,
      following: 0,
      badges: [],
    },
    propertyName: business.businessName,
    propertyType: 'loft',
    style: 'industrial',
    city: business.location || 'Unknown City',
    neighborhood: 'Business District',
    description: `${business.businessName} — a ${business.businessType} business currently ${business.businessStage}. Monthly revenue: $${business.monthlyRevenue.toLocaleString()}.`,
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    images: ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'],
    stats: {
      likes: 0,
      visits: 0,
      saves: 0,
      shares: 0,
      comments: 0,
      averageVisitDuration: 0,
      weeklyVisitors: 0,
      trending: false,
    },
    details: {
      bedrooms: 0,
      bathrooms: 0,
      squareFootage: 0,
    },
    features: [
      `${business.businessType}`,
      `${business.employeeCount} employees`,
      `Stage: ${business.businessStage}`,
    ],
    financials: {
      purchasePrice: business.startupCost,
      currentValue: business.currentFunding,
      isRenting: false,
      isForSale: false,
      isForRent: false,
    },
    social: {
      isLiked: false,
      isSaved: false,
      isFollowingOwner: false,
      hasVisited: false,
    },
    settings: {
      isOpenForVisits: true,
      virtualTourAvailable: false,
      multiplayerEnabled: false,
      chatEnabled: true,
      guestBookEnabled: true,
      allowPhotography: true,
    },
    createdAt: now,
    lastUpdated: now,
  };
}

export default function ShareToCommunityModal({ visible, onClose }: ShareToCommunityModalProps) {
  const { colors, isDark } = useTheme();
  const { gameState } = useGame();
  const { businessState } = useBusiness();
  const { postToCommunity } = useCommunityHomes();

  const [selectedItem, setSelectedItem] = useState<ShareableItem | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep('select');
      setSelectedItem(null);
      setIsPosting(false);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const playerName = gameState?.playerName ?? 'Player';

  const shareableItems = useMemo<ShareableItem[]>(() => {
    const items: ShareableItem[] = [];

    const properties = gameState?.ownedProperties ?? [];
    for (const prop of properties) {
      items.push({
        id: `home_${prop.id}`,
        type: 'home',
        name: prop.name,
        value: prop.currentValue,
        imageUrl: prop.imageUrl,
        subtitle: prop.address,
        details: [
          `${prop.bedrooms} bed`,
          `${prop.bathrooms} bath`,
          `${prop.squareFeet.toLocaleString()} sqft`,
        ],
        raw: prop,
      });
    }

    const businesses = businessState?.userBusinesses?.filter(b => b.isActive) ?? [];
    for (const biz of businesses) {
      items.push({
        id: `biz_${biz.id}`,
        type: 'business',
        name: biz.businessName,
        value: biz.currentFunding,
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
        subtitle: biz.location || biz.businessType,
        details: [
          biz.businessType,
          `${biz.employeeCount} staff`,
          `$${biz.monthlyRevenue.toLocaleString()}/mo`,
        ],
        raw: biz,
      });
    }

    return items;
  }, [gameState?.ownedProperties, businessState?.userBusinesses]);

  const handleSelectItem = useCallback((item: ShareableItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem(item);
    setStep('confirm');
  }, []);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('select');
    setSelectedItem(null);
  }, []);

  const handlePost = useCallback(async () => {
    if (!selectedItem) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsPosting(true);

    try {
      let communityHome: CommunityHome;
      if (selectedItem.type === 'home') {
        communityHome = buildCommunityHomeFromProperty(selectedItem.raw as OwnedProperty, playerName);
      } else {
        communityHome = buildCommunityHomeFromBusiness(selectedItem.raw as UserBusinessData, playerName);
      }

      postToCommunity(communityHome);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Shared Successfully!',
        `"${selectedItem.name}" is now live on the Community Feed.`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.log('[ShareToCommunity] Error posting:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsPosting(false);
    }
  }, [selectedItem, playerName, postToCommunity, onClose]);

  const st = createStyles(colors, isDark);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const renderSelectStep = () => (
    <View style={st.stepContainer}>
      <View style={st.stepHeaderRow}>
        <Sparkles color="#F59E0B" size={20} />
        <Text style={st.stepTitle}>Share to Community</Text>
      </View>
      <Text style={st.stepSubtitle}>
        Showcase a home or business you own on the Community Feed
      </Text>

      {shareableItems.length === 0 ? (
        <View style={st.emptyState}>
          <View style={st.emptyIconWrap}>
            <Home color={colors.textLight} size={36} />
          </View>
          <Text style={st.emptyTitle}>Nothing to Share Yet</Text>
          <Text style={st.emptyText}>
            Purchase a home or start a business first, then come back to share it with the community.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={st.itemsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.itemsListContent}
        >
          {shareableItems.filter(i => i.type === 'home').length > 0 && (
            <>
              <View style={st.sectionLabelRow}>
                <View style={[st.sectionIcon, { backgroundColor: '#2563EB15' }]}>
                  <Home color="#2563EB" size={14} />
                </View>
                <Text style={st.sectionLabel}>My Properties</Text>
                <Text style={st.sectionCount}>{shareableItems.filter(i => i.type === 'home').length}</Text>
              </View>
              {shareableItems.filter(i => i.type === 'home').map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={st.itemCard}
                  onPress={() => handleSelectItem(item)}
                  activeOpacity={0.7}
                  testID={`share-item-${item.id}`}
                >
                  <Animated.Image
                    source={{ uri: item.imageUrl }}
                    style={st.itemImage}
                  />
                  <View style={st.itemInfo}>
                    <Text style={st.itemName} numberOfLines={1}>{item.name}</Text>
                    <View style={st.itemSubRow}>
                      <MapPin color={colors.textLight} size={11} />
                      <Text style={st.itemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    </View>
                    <View style={st.itemDetailsRow}>
                      {item.details.map((d, idx) => (
                        <View key={idx} style={st.detailChip}>
                          <Text style={st.detailChipText}>{d}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={st.itemValue}>${item.value.toLocaleString()}</Text>
                  </View>
                  <View style={st.itemArrow}>
                    <ChevronRight color={colors.textLight} size={18} />
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {shareableItems.filter(i => i.type === 'business').length > 0 && (
            <>
              <View style={[st.sectionLabelRow, { marginTop: 14 }]}>
                <View style={[st.sectionIcon, { backgroundColor: '#F59E0B15' }]}>
                  <Building2 color="#F59E0B" size={14} />
                </View>
                <Text style={st.sectionLabel}>My Businesses</Text>
                <Text style={st.sectionCount}>{shareableItems.filter(i => i.type === 'business').length}</Text>
              </View>
              {shareableItems.filter(i => i.type === 'business').map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={st.itemCard}
                  onPress={() => handleSelectItem(item)}
                  activeOpacity={0.7}
                  testID={`share-item-${item.id}`}
                >
                  <View style={[st.itemImagePlaceholder, { backgroundColor: '#F59E0B15' }]}>
                    <Briefcase color="#F59E0B" size={24} />
                  </View>
                  <View style={st.itemInfo}>
                    <Text style={st.itemName} numberOfLines={1}>{item.name}</Text>
                    <View style={st.itemSubRow}>
                      <MapPin color={colors.textLight} size={11} />
                      <Text style={st.itemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    </View>
                    <View style={st.itemDetailsRow}>
                      {item.details.map((d, idx) => (
                        <View key={idx} style={st.detailChip}>
                          <Text style={st.detailChipText}>{d}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={st.itemValue}>${item.value.toLocaleString()}</Text>
                  </View>
                  <View style={st.itemArrow}>
                    <ChevronRight color={colors.textLight} size={18} />
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );

  const renderConfirmStep = () => {
    if (!selectedItem) return null;
    const isBiz = selectedItem.type === 'business';
    return (
      <ScrollView style={st.confirmScroll} showsVerticalScrollIndicator={false}>
        <View style={st.stepContainer}>
          <TouchableOpacity style={st.backRow} onPress={handleBack} testID="share-back">
            <ArrowLeft color={colors.primary} size={18} />
            <Text style={st.backText}>Back</Text>
          </TouchableOpacity>

          <View style={st.stepHeaderRow}>
            <CheckCircle color="#22C55E" size={20} />
            <Text style={st.stepTitle}>Confirm Post</Text>
          </View>
          <Text style={st.stepSubtitle}>
            Review before sharing to the Community Feed
          </Text>

          <View style={st.confirmCard}>
            {isBiz ? (
              <View style={[st.confirmImagePlaceholder, { backgroundColor: '#F59E0B12' }]}>
                <Briefcase color="#F59E0B" size={32} />
              </View>
            ) : (
              <Animated.Image
                source={{ uri: selectedItem.imageUrl }}
                style={st.confirmImage}
              />
            )}
            <View style={st.confirmInfo}>
              <Text style={st.confirmName}>{selectedItem.name}</Text>
              <View style={st.confirmTypeBadge}>
                {isBiz ? <Building2 color="#F59E0B" size={12} /> : <Home color="#2563EB" size={12} />}
                <Text style={[st.confirmTypeText, { color: isBiz ? '#F59E0B' : '#2563EB' }]}>
                  {isBiz ? 'Business' : 'Property'}
                </Text>
              </View>
              <View style={st.confirmSubRow}>
                <MapPin color={colors.textLight} size={11} />
                <Text style={st.confirmSubtitle}>{selectedItem.subtitle}</Text>
              </View>
              <View style={st.confirmDetailsRow}>
                {selectedItem.details.map((d, idx) => (
                  <View key={idx} style={st.confirmDetailChip}>
                    <Text style={st.confirmDetailText}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={st.postButton}
            onPress={handlePost}
            disabled={isPosting}
            activeOpacity={0.8}
            testID="share-confirm-btn"
          >
            <LinearGradient
              colors={['#059669', '#047857']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={st.postButtonGradient}
            >
              {isPosting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <CheckCircle color="#FFF" size={18} />
                  <Text style={st.postButtonText}>
                    Share to Community
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[st.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={st.overlayTouch} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[st.sheet, { transform: [{ translateY }] }]}>
          <View style={st.handleBar} />
          <TouchableOpacity style={st.closeButton} onPress={onClose} testID="share-close">
            <X color={colors.text} size={20} />
          </TouchableOpacity>
          {step === 'select' ? renderSelectStep() : renderConfirmStep()}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '88%',
    minHeight: 380,
    paddingBottom: 36,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 14,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContainer: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: colors.text,
  },
  stepSubtitle: {
    fontSize: 13,
    color: colors.textLight,
    lineHeight: 19,
    marginBottom: 16,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.text,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textLight,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemsList: {
    maxHeight: 400,
  },
  itemsListContent: {
    paddingBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
  },
  itemImage: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB',
  },
  itemImagePlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 2,
  },
  itemSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 5,
  },
  itemSubtitle: {
    fontSize: 11,
    color: colors.textLight,
    flex: 1,
  },
  itemDetailsRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 3,
  },
  detailChip: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  detailChipText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: colors.textSecondary || colors.textLight,
  },
  itemValue: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#059669',
  },
  itemArrow: {
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center' as const,
    lineHeight: 19,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  confirmScroll: {
    flex: 1,
  },
  confirmCard: {
    flexDirection: 'row',
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    marginBottom: 14,
  },
  confirmImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB',
  },
  confirmImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmInfo: {
    flex: 1,
    marginLeft: 12,
  },
  confirmName: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: colors.text,
    marginBottom: 4,
  },
  confirmTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  confirmTypeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  confirmSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  confirmSubtitle: {
    fontSize: 12,
    color: colors.textLight,
  },
  confirmDetailsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  confirmDetailChip: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  confirmDetailText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textSecondary || colors.textLight,
  },
  postButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  postButtonDisabled: {
    opacity: 0.55,
  },
  postButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  postButtonText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
});
