import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  X,
  ShoppingBag,
  Info,
  Palette,
  Box,
  Tag,
  Heart,
  Share2,
  ExternalLink,
  Sparkles,
} from 'lucide-react-native';
import { FurnitureItem, DecorItem } from '@/types/communityHomes';
import { useTheme } from '@/contexts/ThemeContext';

const { height } = Dimensions.get('window');

interface FurnitureDetailModalProps {
  visible: boolean;
  item: FurnitureItem | DecorItem | null;
  type: 'furniture' | 'decor';
  onClose: () => void;
}

const FURNITURE_IMAGES: Record<string, string> = {
  sofa: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
  table: 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=800',
  bed: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800',
  chair: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800',
  island: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
  default: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
};

const DECOR_IMAGES: Record<string, string> = {
  plant: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800',
  art: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800',
  rug: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=800',
  lighting: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
  accessory: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
};

export default function FurnitureDetailModal({
  visible,
  item,
  type,
  onClose,
}: FurnitureDetailModalProps) {
  const { colors, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
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
  }, [visible, slideAnim, fadeAnim, scaleAnim]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!visible || !item) return null;

  const isFurniture = type === 'furniture';
  const furnitureItem = item as FurnitureItem;
  const decorItem = item as DecorItem;

  const getItemImage = () => {
    if (isFurniture) {
      const key = furnitureItem.modelId?.split('_')[0] || 'default';
      return FURNITURE_IMAGES[key] || FURNITURE_IMAGES.default;
    } else {
      return decorItem.thumbnailUrl || DECOR_IMAGES[decorItem.type] || DECOR_IMAGES.accessory;
    }
  };

  const styles = createStyles(colors, isDark);

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

        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X color={colors.text} size={22} />
        </TouchableOpacity>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.imageContainer}>
            <Image source={{ uri: getItemImage() }} style={styles.itemImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              style={styles.imageGradient}
              pointerEvents="none"
            />

            <View style={styles.imageActions}>
              <TouchableOpacity
                style={styles.imageActionButton}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <Heart color="#FFFFFF" size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imageActionButton}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <Share2 color="#FFFFFF" size={20} />
              </TouchableOpacity>
            </View>

            {isFurniture && furnitureItem.brand && (
              <View style={styles.brandBadge}>
                <Sparkles color="#F59E0B" size={12} />
                <Text style={styles.brandText}>{furnitureItem.brand}</Text>
              </View>
            )}
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.itemName}>{item.name}</Text>

            {!isFurniture && (
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                  {decorItem.type.charAt(0).toUpperCase() + decorItem.type.slice(1)}
                </Text>
              </View>
            )}

            <View style={styles.specGrid}>
              {isFurniture && furnitureItem.material && (
                <View style={styles.specItem}>
                  <View style={styles.specIcon}>
                    <Box color={colors.primary} size={18} />
                  </View>
                  <View>
                    <Text style={styles.specLabel}>Material</Text>
                    <Text style={styles.specValue}>
                      {furnitureItem.material.charAt(0).toUpperCase() +
                        furnitureItem.material.slice(1)}
                    </Text>
                  </View>
                </View>
              )}

              {isFurniture && furnitureItem.color && (
                <View style={styles.specItem}>
                  <View style={styles.specIcon}>
                    <Palette color={colors.primary} size={18} />
                  </View>
                  <View style={styles.specContent}>
                    <Text style={styles.specLabel}>Color</Text>
                    <View style={styles.colorRow}>
                      <View
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: furnitureItem.color },
                        ]}
                      />
                      <Text style={styles.specValue}>{furnitureItem.color}</Text>
                    </View>
                  </View>
                </View>
              )}

              {isFurniture && furnitureItem.price && (
                <View style={styles.specItem}>
                  <View style={styles.specIcon}>
                    <Tag color={colors.primary} size={18} />
                  </View>
                  <View>
                    <Text style={styles.specLabel}>Estimated Price</Text>
                    <Text style={styles.specValue}>
                      ${furnitureItem.price.toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.specItem}>
                <View style={styles.specIcon}>
                  <Info color={colors.primary} size={18} />
                </View>
                <View>
                  <Text style={styles.specLabel}>Position</Text>
                  <Text style={styles.specValue}>
                    X: {item.position.x.toFixed(1)}, Y: {item.position.y.toFixed(1)}, Z:{' '}
                    {item.position.z.toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>
                {isFurniture
                  ? `This ${furnitureItem.name.toLowerCase()} adds style and comfort to the space. ${
                      furnitureItem.brand
                        ? `From ${furnitureItem.brand}, known for quality craftsmanship.`
                        : 'A carefully selected piece that complements the room design.'
                    }`
                  : `A beautiful ${decorItem.type} that enhances the room aesthetic. ${
                      decorItem.type === 'plant'
                        ? 'Bringing life and freshness to the space.'
                        : decorItem.type === 'art'
                        ? 'A statement piece that draws the eye.'
                        : 'Perfectly placed to complete the room design.'
                    }`}
              </Text>
            </View>

            {isFurniture && (
              <View style={styles.dimensionsSection}>
                <Text style={styles.sectionTitle}>Dimensions</Text>
                <View style={styles.dimensionsGrid}>
                  <View style={styles.dimensionItem}>
                    <Text style={styles.dimensionValue}>
                      {Math.round(furnitureItem.scale * 36)}"
                    </Text>
                    <Text style={styles.dimensionLabel}>Width</Text>
                  </View>
                  <View style={styles.dimensionDivider} />
                  <View style={styles.dimensionItem}>
                    <Text style={styles.dimensionValue}>
                      {Math.round(furnitureItem.scale * 24)}"
                    </Text>
                    <Text style={styles.dimensionLabel}>Depth</Text>
                  </View>
                  <View style={styles.dimensionDivider} />
                  <View style={styles.dimensionItem}>
                    <Text style={styles.dimensionValue}>
                      {Math.round(furnitureItem.scale * 32)}"
                    </Text>
                    <Text style={styles.dimensionLabel}>Height</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Info color={colors.primary} size={18} />
            <Text style={styles.secondaryButtonText}>More Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          >
            <ShoppingBag color="#FFFFFF" size={18} />
            <Text style={styles.primaryButtonText}>Shop Similar</Text>
            <ExternalLink color="#FFFFFF" size={14} />
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
      maxHeight: height * 0.85,
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
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    content: {
      flex: 1,
    },
    imageContainer: {
      width: '100%',
      height: 240,
      position: 'relative',
    },
    itemImage: {
      width: '100%',
      height: '100%',
    },
    imageGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 100,
    },
    imageActions: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      flexDirection: 'row',
      gap: 12,
    },
    imageActionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandBadge: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
    },
    brandText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    detailsSection: {
      padding: 20,
    },
    itemName: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 8,
    },
    typeBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight || 'rgba(59, 130, 246, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      marginBottom: 16,
    },
    typeText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    specGrid: {
      marginTop: 16,
      gap: 16,
    },
    specItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    specIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    specContent: {
      flex: 1,
    },
    specLabel: {
      fontSize: 12,
      color: colors.textLight,
      marginBottom: 2,
    },
    specValue: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    colorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    colorSwatch: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
    },
    descriptionSection: {
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 10,
    },
    descriptionText: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    dimensionsSection: {
      marginTop: 24,
    },
    dimensionsGrid: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    dimensionItem: {
      flex: 1,
      alignItems: 'center',
    },
    dimensionValue: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text,
    },
    dimensionLabel: {
      fontSize: 12,
      color: colors.textLight,
      marginTop: 4,
    },
    dimensionDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
    },
    actionBar: {
      flexDirection: 'row',
      padding: 16,
      paddingBottom: 32,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    secondaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    primaryButton: {
      flex: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
  });
