import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Star, Lock, Check, ShoppingCart } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { MarketplaceItem, formatCompactNumber } from '@/types/communityHomes';
import { getRarityColor } from '@/mocks/achievementsData';

interface MarketplaceItemCardProps {
  item: MarketplaceItem;
  onPress?: () => void;
  onPurchase?: () => void;
  userLevel?: number;
  userCoins?: number;
  userGems?: number;
}

export default function MarketplaceItemCard({
  item,
  onPress,
  onPurchase,
  userLevel = 1,
  userCoins = 0,
  userGems = 0,
}: MarketplaceItemCardProps) {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rarityColor = getRarityColor(item.rarity);

  const isLevelLocked = item.requiredLevel && userLevel < item.requiredLevel;
  const canAfford = item.currency === 'coins' ? userCoins >= item.price : userGems >= item.price;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const styles = createStyles(colors, isDark, rarityColor);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.inner}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.thumbnailUrl }} style={styles.image} contentFit="cover" transition={200} cachePolicy="memory-disk" />
          
          {item.isOwned && (
            <View style={styles.ownedBadge}>
              <Check color="#FFFFFF" size={12} strokeWidth={3} />
              <Text style={styles.ownedText}>Owned</Text>
            </View>
          )}

          {isLevelLocked && !item.isOwned && (
            <View style={styles.lockedOverlay}>
              <Lock color="#FFFFFF" size={24} />
              <Text style={styles.lockedText}>Level {item.requiredLevel}</Text>
            </View>
          )}

          <View style={[styles.rarityStrip, { backgroundColor: rarityColor }]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.ratingContainer}>
              <Star color="#F59E0B" size={12} fill="#F59E0B" />
              <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.purchases}>{formatCompactNumber(item.purchases)} sold</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <Text style={styles.currencyIcon}>
                {item.currency === 'coins' ? '🪙' : '💎'}
              </Text>
              <Text style={[
                styles.price,
                !canAfford && !item.isOwned && styles.priceUnaffordable,
              ]}>
                {item.price.toLocaleString()}
              </Text>
            </View>

            {!item.isOwned && !isLevelLocked && (
              <TouchableOpacity
                style={[
                  styles.buyButton,
                  !canAfford && styles.buyButtonDisabled,
                ]}
                onPress={onPurchase}
                disabled={!canAfford}
              >
                <ShoppingCart color="#FFFFFF" size={14} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (colors: any, isDark: boolean, rarityColor: string) => StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: 16,
  },
  inner: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    aspectRatio: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  ownedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ownedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  rarityStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  purchases: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyIcon: {
    fontSize: 14,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  priceUnaffordable: {
    color: colors.textLight,
  },
  buyButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.5,
  },
});
