import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Heart,
  Bookmark,
  Share2,
  MapPin,
  Bed,
  Bath,
  Maximize,
  TrendingUp,
  Verified,
  Users,
  X,
  Star,
  Calendar,
  Eye,
  ChevronRight,
  Tag,
  Key,
  Clock,
  Car,
  Phone,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import {
  MapProperty,
  getPropertyTypeConfig,
  formatPropertyPrice,
} from '@/types/mapProperty';

const { width } = Dimensions.get('window');

interface PropertyDetailModalProps {
  property: MapProperty | null;
  visible: boolean;
  onClose: () => void;
  onLike?: (propertyId: string) => void;
  onSave?: (propertyId: string) => void;
  onShare?: (property: MapProperty) => void;
  onApplyRent?: (property: MapProperty) => void;
  onApplyPurchase?: (property: MapProperty) => void;
}

function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function getCreditScoreColor(score: number): string {
  if (score >= 800) return '#22C55E';
  if (score >= 740) return '#84CC16';
  if (score >= 670) return '#EAB308';
  if (score >= 580) return '#F97316';
  return '#EF4444';
}

function getCreditScoreLabel(score: number): string {
  if (score >= 800) return 'Excellent';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

export default function PropertyDetailModal({
  property,
  visible,
  onClose,
  onLike,
  onSave,
  onShare,
  onApplyRent,
  onApplyPurchase,
}: PropertyDetailModalProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'financials'>('details');

  const styles = createStyles(colors, isDark);

  const handleLike = useCallback(() => {
    if (property && onLike) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onLike(property.id);
    }
  }, [property, onLike]);

  const handleSave = useCallback(() => {
    if (property && onSave) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSave(property.id);
    }
  }, [property, onSave]);

  const handleShare = useCallback(() => {
    if (property && onShare) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onShare(property);
    }
  }, [property, onShare]);

  const handleApplyRent = useCallback(() => {
    if (property && onApplyRent) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onApplyRent(property);
    }
  }, [property, onApplyRent]);

  const handleApplyPurchase = useCallback(() => {
    if (property && onApplyPurchase) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onApplyPurchase(property);
    }
  }, [property, onApplyPurchase]);

  if (!property) return null;

  const typeConfig = getPropertyTypeConfig(property.propertyType);
  const isCommercial = property.category === 'commercial';

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.headerOverlay, { opacity: headerOpacity }]}>
          <LinearGradient
            colors={isDark ? ['#0F172A', '#0F172A'] : ['#001F42', '#001F42']}
            style={[styles.headerGradient, { paddingTop: insets.top }]}
          >
            <TouchableOpacity style={styles.headerCloseButton} onPress={onClose}>
              <X color="#FFFFFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{property.title}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleSave}>
                <Bookmark
                  color="#FFFFFF"
                  size={22}
                  fill={property.social.isSaved ? '#FFFFFF' : 'transparent'}
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.ScrollView
          style={styles.scrollView}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          <View style={styles.imageGallery}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setSelectedImageIndex(index);
              }}
            >
              {property.images.map((image, index) => (
                <Image key={index} source={{ uri: image }} style={styles.galleryImage} />
              ))}
            </ScrollView>
            <LinearGradient
              colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']}
              style={styles.galleryGradient}
            />
            <TouchableOpacity
              style={[styles.closeButtonOverlay, { top: insets.top + 10 }]}
              onPress={onClose}
            >
              <X color="#FFFFFF" size={24} />
            </TouchableOpacity>
            <View style={styles.galleryPagination}>
              {property.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    selectedImageIndex === index && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
            <View style={styles.priceOverlay}>
              <Text style={styles.priceText}>
                {formatPropertyPrice(property.financials.currentValue)}
              </Text>
              {property.financials.isForRent && property.financials.monthlyRentPrice && (
                <Text style={styles.rentText}>
                  ${property.financials.monthlyRentPrice.toLocaleString()}/mo
                </Text>
              )}
            </View>
          </View>

          <View style={styles.content}>
            <TouchableOpacity style={styles.ownerSection}>
              <View style={styles.ownerAvatarContainer}>
                <Image source={{ uri: property.owner.avatar }} style={styles.ownerAvatar} />
                {property.owner.isOnline && <View style={styles.onlineIndicator} />}
              </View>
              <View style={styles.ownerInfo}>
                <View style={styles.ownerNameRow}>
                  <Text style={styles.ownerName}>{property.owner.name}</Text>
                  {property.owner.isVerified && <Verified color="#3B82F6" size={16} fill="#3B82F6" />}
                </View>
                <View style={styles.ownerMeta}>
                  <Text style={styles.ownerLevel}>Level {property.owner.level}</Text>
                  <View style={[styles.creditBadge, { backgroundColor: getCreditScoreColor(property.owner.creditScore) + '20' }]}>
                    <Text style={[styles.creditScoreText, { color: getCreditScoreColor(property.owner.creditScore) }]}>
                      {property.owner.creditScore} • {getCreditScoreLabel(property.owner.creditScore)}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.followButton}>
                <Text style={styles.followButtonText}>Follow</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            <View style={styles.propertyHeader}>
              <View style={styles.propertyTypeRow}>
                <Text style={styles.propertyTypeEmoji}>{typeConfig.icon}</Text>
                <View style={[styles.styleBadge, { backgroundColor: typeConfig.color + '20' }]}>
                  <Text style={[styles.styleText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
                </View>
                <View style={[styles.categoryBadge, { backgroundColor: isCommercial ? '#F59E0B20' : '#3B82F620' }]}>
                  <Text style={[styles.categoryText, { color: isCommercial ? '#F59E0B' : '#3B82F6' }]}>
                    {isCommercial ? 'Commercial' : 'Residential'}
                  </Text>
                </View>
              </View>
              <Text style={styles.propertyName}>{property.title}</Text>
              <View style={styles.locationRow}>
                <MapPin color={colors.textLight} size={16} />
                <Text style={styles.locationText}>{property.address}</Text>
              </View>
              <Text style={styles.neighborhoodText}>{property.neighborhood}, {property.city}, {property.state} {property.zipCode}</Text>
            </View>

            <Text style={styles.description}>{property.description}</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Eye color={colors.primary} size={20} />
                <Text style={styles.statValue}>{formatCompactNumber(property.stats.visits)}</Text>
                <Text style={styles.statLabel}>Visits</Text>
              </View>
              <View style={styles.statCard}>
                <Heart color="#EF4444" size={20} />
                <Text style={styles.statValue}>{formatCompactNumber(property.stats.likes)}</Text>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
              <View style={styles.statCard}>
                <Star color="#F59E0B" size={20} />
                <Text style={styles.statValue}>{property.stats.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statCard}>
                <Users color="#8B5CF6" size={20} />
                <Text style={styles.statValue}>{formatCompactNumber(property.stats.weeklyVisitors)}</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </View>
            </View>

            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'details' && styles.tabActive]}
                onPress={() => setActiveTab('details')}
              >
                <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
                  Details
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'financials' && styles.tabActive]}
                onPress={() => setActiveTab('financials')}
              >
                <Text style={[styles.tabText, activeTab === 'financials' && styles.tabTextActive]}>
                  Financials
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
                onPress={() => setActiveTab('reviews')}
              >
                <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
                  Reviews ({property.stats.reviewCount})
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'details' && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Property Details</Text>
                <View style={styles.detailsGrid}>
                  {!isCommercial && property.details.bedrooms !== undefined && (
                    <View style={styles.detailItem}>
                      <Bed color={colors.textSecondary} size={22} />
                      <Text style={styles.detailValue}>{property.details.bedrooms}</Text>
                      <Text style={styles.detailLabel}>Bedrooms</Text>
                    </View>
                  )}
                  {!isCommercial && property.details.bathrooms !== undefined && (
                    <View style={styles.detailItem}>
                      <Bath color={colors.textSecondary} size={22} />
                      <Text style={styles.detailValue}>{property.details.bathrooms}</Text>
                      <Text style={styles.detailLabel}>Bathrooms</Text>
                    </View>
                  )}
                  <View style={styles.detailItem}>
                    <Maximize color={colors.textSecondary} size={22} />
                    <Text style={styles.detailValue}>{property.details.squareFootage.toLocaleString()}</Text>
                    <Text style={styles.detailLabel}>Sq Ft</Text>
                  </View>
                  {property.details.yearBuilt && (
                    <View style={styles.detailItem}>
                      <Calendar color={colors.textSecondary} size={22} />
                      <Text style={styles.detailValue}>{property.details.yearBuilt}</Text>
                      <Text style={styles.detailLabel}>Year Built</Text>
                    </View>
                  )}
                  {property.details.parkingSpaces !== undefined && (
                    <View style={styles.detailItem}>
                      <Car color={colors.textSecondary} size={22} />
                      <Text style={styles.detailValue}>{property.details.parkingSpaces}</Text>
                      <Text style={styles.detailLabel}>Parking</Text>
                    </View>
                  )}
                  {isCommercial && property.details.capacity && (
                    <View style={styles.detailItem}>
                      <Users color={colors.textSecondary} size={22} />
                      <Text style={styles.detailValue}>{property.details.capacity}</Text>
                      <Text style={styles.detailLabel}>Capacity</Text>
                    </View>
                  )}
                </View>

                {isCommercial && property.details.operatingHours && (
                  <View style={styles.operatingHoursCard}>
                    <Clock color={colors.primary} size={20} />
                    <View style={styles.operatingHoursContent}>
                      <Text style={styles.operatingHoursLabel}>Operating Hours</Text>
                      <Text style={styles.operatingHoursValue}>{property.details.operatingHours}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.featuresSection}>
                  <Text style={styles.sectionTitle}>Features & Amenities</Text>
                  <View style={styles.featuresGrid}>
                    {property.features.map((feature, index) => (
                      <View key={index} style={styles.featureChip}>
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'financials' && (
              <View style={styles.financialSection}>
                <Text style={styles.sectionTitle}>Financial Information</Text>
                <View style={styles.financialCard}>
                  <View style={styles.financialRow}>
                    <Text style={styles.financialLabel}>Purchase Price</Text>
                    <Text style={styles.financialValue}>
                      {formatPropertyPrice(property.financials.purchasePrice)}
                    </Text>
                  </View>
                  <View style={styles.financialRow}>
                    <Text style={styles.financialLabel}>Current Value</Text>
                    <Text style={[styles.financialValue, { color: colors.success }]}>
                      {formatPropertyPrice(property.financials.currentValue)}
                    </Text>
                  </View>
                  {property.financials.appreciationRate && (
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Appreciation</Text>
                      <View style={styles.gainRow}>
                        <TrendingUp color="#10B981" size={16} />
                        <Text style={styles.gainValue}>+{property.financials.appreciationRate}%</Text>
                      </View>
                    </View>
                  )}
                  {property.financials.monthlyRentPrice && (
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Monthly Rent</Text>
                      <Text style={styles.financialValue}>
                        ${property.financials.monthlyRentPrice.toLocaleString()}/mo
                      </Text>
                    </View>
                  )}
                  {isCommercial && property.financials.monthlyRevenue && (
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Est. Monthly Revenue</Text>
                      <Text style={[styles.financialValue, { color: '#10B981' }]}>
                        ${property.financials.monthlyRevenue.toLocaleString()}/mo
                      </Text>
                    </View>
                  )}
                  {property.financials.annualTaxes && (
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Annual Property Taxes</Text>
                      <Text style={styles.financialValue}>
                        ${property.financials.annualTaxes.toLocaleString()}/yr
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {activeTab === 'reviews' && (
              <View style={styles.reviewsSection}>
                <View style={styles.reviewsSummary}>
                  <View style={styles.reviewsRating}>
                    <Star color="#F59E0B" size={32} fill="#F59E0B" />
                    <Text style={styles.reviewsRatingValue}>{property.stats.rating.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.reviewsCount}>{property.stats.reviewCount} reviews</Text>
                </View>
                <View style={styles.emptyReviews}>
                  <Star color={colors.textLight} size={40} />
                  <Text style={styles.emptyReviewsText}>Reviews coming soon</Text>
                  <Text style={styles.emptyReviewsSubtext}>Be the first to leave a review!</Text>
                </View>
              </View>
            )}

            {(property.financials.isForSale || property.financials.isForRent) && (
              <View style={styles.listingActionsSection}>
                <Text style={styles.sectionTitle}>Available Actions</Text>
                <View style={styles.listingActionsCard}>
                  {property.financials.isForSale && (
                    <TouchableOpacity
                      style={styles.listingActionButton}
                      onPress={handleApplyPurchase}
                    >
                      <View style={[styles.listingActionIcon, { backgroundColor: '#10B98120' }]}>
                        <Tag color="#10B981" size={22} />
                      </View>
                      <View style={styles.listingActionContent}>
                        <Text style={styles.listingActionTitle}>Start Purchase Process</Text>
                        <Text style={styles.listingActionSubtitle}>
                          Buy for {formatPropertyPrice(property.financials.askingPrice || property.financials.currentValue)}
                        </Text>
                      </View>
                      <ChevronRight color={colors.textLight} size={20} />
                    </TouchableOpacity>
                  )}
                  {property.financials.isForRent && property.financials.monthlyRentPrice && (
                    <TouchableOpacity
                      style={styles.listingActionButton}
                      onPress={handleApplyRent}
                    >
                      <View style={[styles.listingActionIcon, { backgroundColor: '#3B82F620' }]}>
                        <Key color="#3B82F6" size={22} />
                      </View>
                      <View style={styles.listingActionContent}>
                        <Text style={styles.listingActionTitle}>Apply to Rent</Text>
                        <Text style={styles.listingActionSubtitle}>
                          ${property.financials.monthlyRentPrice.toLocaleString()}/month
                        </Text>
                      </View>
                      <ChevronRight color={colors.textLight} size={20} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            <View style={{ height: 120 }} />
          </View>
        </Animated.ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Heart
                color={property.social.isLiked ? '#EF4444' : colors.text}
                size={24}
                fill={property.social.isLiked ? '#EF4444' : 'transparent'}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
              <Bookmark
                color={property.social.isSaved ? '#F59E0B' : colors.text}
                size={24}
                fill={property.social.isSaved ? '#F59E0B' : 'transparent'}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Share2 color={colors.text} size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton}>
              <Phone color="#FFFFFF" size={18} />
              <Text style={styles.contactButtonText}>Contact Owner</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  scrollView: {
    flex: 1,
  },
  imageGallery: {
    width,
    height: 320,
    position: 'relative',
  },
  galleryImage: {
    width,
    height: 320,
  },
  galleryGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  closeButtonOverlay: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryPagination: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  rentText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600' as const,
    marginTop: 2,
  },
  content: {
    padding: 20,
  },
  ownerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  ownerAvatarContainer: {
    position: 'relative',
  },
  ownerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.border,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
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
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  ownerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ownerLevel: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '500' as const,
  },
  creditBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  creditScoreText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  propertyHeader: {
    marginBottom: 16,
  },
  propertyTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  propertyTypeEmoji: {
    fontSize: 24,
  },
  styleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  styleText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  propertyName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: colors.text,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500' as const,
  },
  neighborhoodText: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
    marginLeft: 22,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 14,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    width: (width - 64) / 3 - 8,
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 14,
  },
  detailValue: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 6,
  },
  detailLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  operatingHoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    marginTop: 16,
    gap: 12,
  },
  operatingHoursContent: {
    flex: 1,
  },
  operatingHoursLabel: {
    fontSize: 13,
    color: colors.textLight,
  },
  operatingHoursValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: 2,
  },
  featuresSection: {
    marginTop: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  featureText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500' as const,
  },
  financialSection: {
    marginBottom: 24,
  },
  financialCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  financialLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gainValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  reviewsSection: {
    marginBottom: 24,
  },
  reviewsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  reviewsRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewsRatingValue: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: colors.text,
  },
  reviewsCount: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 16,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyReviewsText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: 12,
  },
  emptyReviewsSubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
  },
  listingActionsSection: {
    marginBottom: 24,
  },
  listingActionsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  listingActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listingActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  listingActionContent: {
    flex: 1,
  },
  listingActionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 4,
  },
  listingActionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt || colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
});
