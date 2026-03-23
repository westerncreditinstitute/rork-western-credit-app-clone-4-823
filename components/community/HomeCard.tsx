import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Heart,
  Bookmark,
  MessageCircle,
  Eye,
  Share2,
  Play,
  MapPin,
  Bed,
  Bath,
  Maximize,
  TrendingUp,
  Verified,
  Users,
  Radio,
  Tag,
  Home as HomeIcon,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  CommunityHome,
  formatHomeValue,
  formatCompactNumber,
  getTimeAgo,
  getPropertyTypeIcon,
  getCreditScoreColor,
} from '@/types/communityHomes';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

interface HomeCardProps {
  home: CommunityHome;
  onPress: () => void;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onShare: () => void;
  onVisit: () => void;
  onOwnerPress: () => void;
  onViewListing?: (type: 'sale' | 'rent') => void;
}

export default function HomeCard({
  home,
  onPress,
  onLike,
  onSave,
  onComment,
  onShare,
  onVisit,
  onOwnerPress,
  onViewListing,
}: HomeCardProps) {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.spring(heartAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onLike();
  }, [heartAnim, onLike]);

  const styles = createStyles(colors, isDark);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: home.coverImage }} style={styles.coverImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageGradient}
            pointerEvents="none"
          />

          {home.stats.trending && (
            <View style={styles.trendingBadge} pointerEvents="none">
              <TrendingUp color="#FFFFFF" size={12} />
              <Text style={styles.trendingText}>#{home.stats.trendingRank} Trending</Text>
            </View>
          )}

          {home.virtualTour?.isLive && (
            <View style={styles.liveBadge} pointerEvents="none">
              <Radio color="#FFFFFF" size={12} />
              <Text style={styles.liveText}>LIVE</Text>
              <Text style={styles.liveViewers}>{home.virtualTour.currentVisitors}</Text>
            </View>
          )}

          <View style={styles.propertyTypeBadge} pointerEvents="none">
            <Text style={styles.propertyTypeEmoji}>{getPropertyTypeIcon(home.propertyType)}</Text>
            <Text style={styles.propertyTypeText}>{home.style}</Text>
          </View>

          <View style={styles.imageStats} pointerEvents="none">
            <View style={styles.imageStat}>
              <Eye color="#FFFFFF" size={14} />
              <Text style={styles.imageStatText}>{formatCompactNumber(home.stats.visits)}</Text>
            </View>
          </View>

          {(home.financials.isForSale || home.financials.isForRent) && (
            <View style={styles.listingBadgesContainer}>
              {home.financials.isForSale && (
                <TouchableOpacity 
                  style={styles.forSaleBadge}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onViewListing?.('sale');
                  }}
                >
                  <Tag color="#FFFFFF" size={10} />
                  <Text style={styles.listingBadgeText}>FOR SALE</Text>
                </TouchableOpacity>
              )}
              {home.financials.isForRent && (
                <TouchableOpacity 
                  style={styles.forRentBadge}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onViewListing?.('rent');
                  }}
                >
                  <HomeIcon color="#FFFFFF" size={10} />
                  <Text style={styles.listingBadgeText}>FOR RENT</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {home.settings.virtualTourAvailable && (
            <TouchableOpacity
              style={styles.visitButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onVisit();
              }}
            >
              <Play color="#FFFFFF" size={16} fill="#FFFFFF" />
              <Text style={styles.visitButtonText}>Enter Home</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          <TouchableOpacity style={styles.ownerRow} onPress={onOwnerPress}>
            <View style={styles.ownerAvatarContainer}>
              <Image source={{ uri: home.owner.avatar }} style={styles.ownerAvatar} contentFit="cover" transition={150} cachePolicy="memory-disk" />
              {home.owner.isOnline && <View style={styles.onlineIndicator} />}
            </View>
            <View style={styles.ownerInfo}>
              <View style={styles.ownerNameRow}>
                <Text style={styles.ownerName}>{home.owner.name}</Text>
                {home.owner.isVerified && (
                  <Verified color="#3B82F6" size={14} fill="#3B82F6" />
                )}
              </View>
              <View style={styles.ownerMeta}>
                <Text style={styles.ownerLevel}>Lvl {home.owner.level}</Text>
                <View style={[styles.creditDot, { backgroundColor: getCreditScoreColor(home.owner.creditScore) }]} />
                <Text style={[styles.creditScore, { color: getCreditScoreColor(home.owner.creditScore) }]}>
                  {home.owner.creditScore}
                </Text>
              </View>
            </View>
            <Text style={styles.timeAgo}>{getTimeAgo(home.lastUpdated)}</Text>
          </TouchableOpacity>

          <Text style={styles.propertyName}>{home.propertyName}</Text>
          
          <View style={styles.locationRow}>
            <MapPin color={colors.textLight} size={14} />
            <Text style={styles.locationText}>{home.neighborhood}, {home.city}</Text>
          </View>

          <Text style={styles.description} numberOfLines={2}>{home.description}</Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Bed color={colors.textSecondary} size={16} />
              <Text style={styles.detailText}>{home.details.bedrooms}</Text>
            </View>
            <View style={styles.detailItem}>
              <Bath color={colors.textSecondary} size={16} />
              <Text style={styles.detailText}>{home.details.bathrooms}</Text>
            </View>
            <View style={styles.detailItem}>
              <Maximize color={colors.textSecondary} size={16} />
              <Text style={styles.detailText}>{home.details.squareFootage.toLocaleString()} sqft</Text>
            </View>
          </View>

          <View style={styles.listingStatusRow}>
            <TouchableOpacity 
              style={styles.listingStatusItem}
              onPress={() => {
                if (home.financials.isForSale) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onViewListing?.('sale');
                }
              }}
              disabled={!home.financials.isForSale}
            >
              <Text style={styles.listingStatusLabel}>For Sale</Text>
              <View style={[styles.listingStatusValue, home.financials.isForSale ? styles.listingStatusYes : styles.listingStatusNo]}>
                <Text style={[styles.listingStatusValueText, home.financials.isForSale ? styles.listingStatusYesText : styles.listingStatusNoText]}>
                  {home.financials.isForSale ? 'Yes' : 'No'}
                </Text>
              </View>
              {home.financials.isForSale && (
                <Text style={styles.viewListingLink}>View →</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.listingStatusItem}
              onPress={() => {
                if (home.financials.isForRent) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onViewListing?.('rent');
                }
              }}
              disabled={!home.financials.isForRent}
            >
              <Text style={styles.listingStatusLabel}>For Rent</Text>
              <View style={[styles.listingStatusValue, home.financials.isForRent ? styles.listingStatusYes : styles.listingStatusNo]}>
                <Text style={[styles.listingStatusValueText, home.financials.isForRent ? styles.listingStatusYesText : styles.listingStatusNoText]}>
                  {home.financials.isForRent ? 'Yes' : 'No'}
                </Text>
              </View>
              {home.financials.isForRent && (
                <Text style={styles.viewListingLink}>View →</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.financialRow}>
            <View style={styles.valueContainer}>
              <Text style={styles.valueLabel}>{home.financials.isRenting ? 'Monthly Rent' : 'Home Value'}</Text>
              <Text style={styles.valueAmount}>
                {home.financials.isRenting
                  ? `${home.financials.monthlyRent?.toLocaleString()}/mo`
                  : formatHomeValue(home.financials.currentValue)}
              </Text>
            </View>
            {!home.financials.isRenting && home.financials.netWorthGain && (
              <View style={styles.gainContainer}>
                <TrendingUp color="#10B981" size={14} />
                <Text style={styles.gainText}>+{formatHomeValue(home.financials.netWorthGain)}</Text>
              </View>
            )}
          </View>

          {home.financials.isForSale && home.financials.askingPrice && (
            <View style={styles.askingPriceRow}>
              <Text style={styles.askingPriceLabel}>Asking Price:</Text>
              <Text style={styles.askingPriceValue}>{formatHomeValue(home.financials.askingPrice)}</Text>
            </View>
          )}
          {home.financials.isForRent && home.financials.monthlyRentPrice && (
            <View style={styles.askingPriceRow}>
              <Text style={styles.askingPriceLabel}>Monthly Rent:</Text>
              <Text style={styles.askingPriceValue}>${home.financials.monthlyRentPrice.toLocaleString()}/mo</Text>
            </View>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
                <Heart
                  color={home.social.isLiked ? '#EF4444' : colors.textLight}
                  size={22}
                  fill={home.social.isLiked ? '#EF4444' : 'transparent'}
                />
              </Animated.View>
              <Text style={[styles.actionText, home.social.isLiked && styles.actionTextActive]}>
                {formatCompactNumber(home.stats.likes)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onComment}>
              <MessageCircle color={colors.textLight} size={22} />
              <Text style={styles.actionText}>{formatCompactNumber(home.stats.comments)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onSave}>
              <Bookmark
                color={home.social.isSaved ? '#F59E0B' : colors.textLight}
                size={22}
                fill={home.social.isSaved ? '#F59E0B' : 'transparent'}
              />
              <Text style={[styles.actionText, home.social.isSaved && styles.actionTextSaved]}>
                {formatCompactNumber(home.stats.saves)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onShare}>
              <Share2 color={colors.textLight} size={20} />
            </TouchableOpacity>

            {home.settings.multiplayerEnabled && (
              <View style={styles.multiplayerIndicator}>
                <Users color="#8B5CF6" size={14} />
                <Text style={styles.multiplayerText}>{home.stats.weeklyVisitors}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  trendingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  trendingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveViewers: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  propertyTypeBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  propertyTypeEmoji: {
    fontSize: 14,
  },
  propertyTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  imageStats: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  imageStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  imageStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  visitButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -55 }, { translateY: -20 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  visitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ownerAvatarContainer: {
    position: 'relative',
  },
  ownerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.border,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  ownerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  ownerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  ownerLevel: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
  },
  creditDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  creditScore: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textLight,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: colors.textLight,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  valueContainer: {},
  valueLabel: {
    fontSize: 11,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  valueAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  gainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  gainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  listingBadgesContainer: {
    position: 'absolute',
    top: 48,
    left: 12,
    flexDirection: 'column',
    gap: 6,
  },
  forSaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  forRentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  listingBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listingStatusRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: 12,
  },
  listingStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  viewListingLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
  listingStatusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  listingStatusValue: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  listingStatusYes: {
    backgroundColor: '#10B98120',
  },
  listingStatusNo: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
  },
  listingStatusValueText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listingStatusYesText: {
    color: '#10B981',
  },
  listingStatusNoText: {
    color: colors.textLight,
  },
  askingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#10B98110',
    borderRadius: 10,
    marginBottom: 12,
  },
  askingPriceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  askingPriceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '600',
  },
  actionTextActive: {
    color: '#EF4444',
  },
  actionTextSaved: {
    color: '#F59E0B',
  },
  multiplayerIndicator: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF615',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  multiplayerText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },
});
