import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Eye,
  Play,
  Users,
  BadgeCheck,
  TrendingUp,
  Home,
  MapPin,
  Tag,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  CommunityHome,
  formatHomeValue,
  formatCompactNumber,
  getTimeAgo,
  getPropertyTypeIcon,
  getStyleColor,
  getCreditScoreColor,
} from '@/types/communityHomes';



interface HomeProfileCardProps {
  home: CommunityHome;
  onPress: () => void;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onVisit: () => void;
  onOwnerPress: () => void;
}

export const HomeProfileCard: React.FC<HomeProfileCardProps> = ({
  home,
  onPress,
  onLike,
  onSave,
  onShare,
  onVisit,
  onOwnerPress,
}) => {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleLike = useCallback(() => {
    Animated.sequence([
      Animated.timing(heartAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(heartAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    onLike();
  }, [heartAnim, onLike]);

  const isLiveTour = home.virtualTour?.isLive;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, { backgroundColor: colors.surface }]}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: home.coverImage }} style={styles.coverImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
          
          <View style={styles.imageOverlay} pointerEvents="box-none">
            <View style={styles.topBadges} pointerEvents="box-none">
              {home.stats.trending && (
                <View style={[styles.trendingBadge, { backgroundColor: '#EF4444' }]}>
                  <TrendingUp size={12} color="#FFF" />
                  <Text style={styles.trendingText}>#{home.stats.trendingRank}</Text>
                </View>
              )}
              {isLiveTour && (
                <View style={[styles.liveBadge, { backgroundColor: '#22C55E' }]}>
                  <View style={styles.liveIndicator} />
                  <Text style={styles.liveText}>LIVE</Text>
                  <Users size={12} color="#FFF" />
                  <Text style={styles.liveText}>{home.virtualTour?.currentVisitors}</Text>
                </View>
              )}
            </View>

            <View style={styles.propertyTypeBadge}>
              <Text style={styles.propertyTypeIcon}>{getPropertyTypeIcon(home.propertyType)}</Text>
              <Text style={styles.propertyTypeText}>
                {home.propertyType.replace('_', ' ')}
              </Text>
            </View>

            <View style={styles.valueBadge}>
              <Text style={styles.valueText}>{formatHomeValue(home.financials.currentValue)}</Text>
              {home.financials.netWorthGain && home.financials.netWorthGain > 0 && (
                <Text style={styles.gainText}>+{formatHomeValue(home.financials.netWorthGain)}</Text>
              )}
            </View>
          </View>

          {home.settings.virtualTourAvailable && (
            <TouchableOpacity
              style={styles.tourButton}
              onPress={onVisit}
            >
              <Play size={20} color="#FFF" fill="#FFF" />
              <Text style={styles.tourButtonText}>
                {isLiveTour ? 'Join Tour' : 'Virtual Tour'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.contentContainer}>
          <TouchableOpacity style={styles.ownerRow} onPress={onOwnerPress}>
            <Image source={{ uri: home.owner.avatar }} style={styles.ownerAvatar} contentFit="cover" transition={150} cachePolicy="memory-disk" />
            <View style={styles.ownerInfo}>
              <View style={styles.ownerNameRow}>
                <Text style={[styles.ownerName, { color: colors.text }]} numberOfLines={1}>
                  {home.owner.name}
                </Text>
                {home.owner.isVerified && (
                  <BadgeCheck size={14} color="#3B82F6" fill="#3B82F6" />
                )}
                {home.owner.isOnline && <View style={styles.onlineIndicator} />}
              </View>
              <View style={styles.ownerMeta}>
                <Text style={[styles.levelText, { color: colors.textSecondary }]}>
                  Lvl {home.owner.level}
                </Text>
                <View style={styles.creditScoreBadge}>
                  <Text style={[styles.creditScore, { color: getCreditScoreColor(home.owner.creditScore) }]}>
                    {home.owner.creditScore}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
              {getTimeAgo(home.lastUpdated)}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.propertyName, { color: colors.text }]} numberOfLines={1}>
            {home.propertyName}
          </Text>

          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {home.neighborhood}, {home.city}
            </Text>
            <View style={[styles.styleBadge, { backgroundColor: getStyleColor(home.style) + '20' }]}>
              <Text style={[styles.styleText, { color: getStyleColor(home.style) }]}>
                {home.style}
              </Text>
            </View>
          </View>

          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {home.description}
          </Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Home size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {home.details.bedrooms} bd • {home.details.bathrooms} ba
              </Text>
            </View>
            <Text style={[styles.sqftText, { color: colors.textSecondary }]}>
              {home.details.squareFootage.toLocaleString()} sqft
            </Text>
          </View>

          {home.financials.isForSale && (
            <View style={styles.forSaleContainer}>
              <View style={styles.forSaleBadge}>
                <Tag size={14} color="#FFFFFF" />
                <Text style={styles.forSaleText}>FOR SALE</Text>
              </View>
              {home.financials.askingPrice && (
                <Text style={styles.askingPriceText}>
                  Asking: {formatHomeValue(home.financials.askingPrice)}
                </Text>
              )}
            </View>
          )}

          <View style={styles.featuresRow}>
            {home.features.slice(0, 3).map((feature, index) => (
              <View
                key={index}
                style={[styles.featureBadge, { backgroundColor: colors.background }]}
              >
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  {feature}
                </Text>
              </View>
            ))}
            {home.features.length > 3 && (
              <Text style={[styles.moreFeatures, { color: colors.primary }]}>
                +{home.features.length - 3} more
              </Text>
            )}
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
                  <Heart
                    size={22}
                    color={home.social.isLiked ? '#EF4444' : colors.textSecondary}
                    fill={home.social.isLiked ? '#EF4444' : 'transparent'}
                  />
                </Animated.View>
                <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
                  {formatCompactNumber(home.stats.likes)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={onPress}>
                <MessageCircle size={22} color={colors.textSecondary} />
                <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
                  {formatCompactNumber(home.stats.comments)}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionButton}>
                <Eye size={22} color={colors.textSecondary} />
                <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
                  {formatCompactNumber(home.stats.visits)}
                </Text>
              </View>
            </View>

            <View style={styles.rightActions}>
              <TouchableOpacity style={styles.iconButton} onPress={onSave}>
                <Bookmark
                  size={22}
                  color={home.social.isSaved ? '#F59E0B' : colors.textSecondary}
                  fill={home.social.isSaved ? '#F59E0B' : 'transparent'}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton} onPress={onShare}>
                <Share2 size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 220,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
  },
  topBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendingText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  liveText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
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
    borderRadius: 16,
    gap: 4,
  },
  propertyTypeIcon: {
    fontSize: 14,
  },
  propertyTypeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  valueBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'flex-end',
  },
  valueText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  gainText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '600',
  },
  tourButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -55 }, { translateY: -20 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  tourButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 14,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 140,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginLeft: 4,
  },
  ownerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  levelText: {
    fontSize: 12,
  },
  creditScoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  creditScore: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeAgo: {
    fontSize: 12,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    flex: 1,
  },
  styleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  styleText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
  },
  sqftText: {
    fontSize: 13,
  },
  forSaleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  forSaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  forSaleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  askingPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22C55E',
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  featureBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 11,
  },
  moreFeatures: {
    fontSize: 11,
    fontWeight: '600',
    alignSelf: 'center',
    marginLeft: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
});

export default HomeProfileCard;
