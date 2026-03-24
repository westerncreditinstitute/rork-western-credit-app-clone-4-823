import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  X,
  User,
  Palette,
  Shirt,
  Sparkles,
  Check,
  Crown,
  Star,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface AvatarCustomizerProps {
  visible: boolean;
  currentAvatar: {
    color: string;
    accessory?: string;
    outfit?: string;
    effect?: string;
  };
  onSave: (avatar: { color: string; accessory?: string; outfit?: string; effect?: string }) => void;
  onClose: () => void;
  userLevel?: number;
}

const AVATAR_COLORS = [
  { id: 'blue', color: '#3B82F6', name: 'Ocean Blue' },
  { id: 'purple', color: '#8B5CF6', name: 'Royal Purple' },
  { id: 'pink', color: '#EC4899', name: 'Hot Pink' },
  { id: 'green', color: '#22C55E', name: 'Emerald' },
  { id: 'orange', color: '#F97316', name: 'Sunset' },
  { id: 'cyan', color: '#06B6D4', name: 'Aqua' },
  { id: 'red', color: '#EF4444', name: 'Ruby' },
  { id: 'yellow', color: '#EAB308', name: 'Gold' },
  { id: 'indigo', color: '#6366F1', name: 'Indigo' },
  { id: 'teal', color: '#14B8A6', name: 'Teal' },
];

const ACCESSORIES = [
  { id: 'none', icon: '❌', name: 'None', minLevel: 0 },
  { id: 'crown', icon: '👑', name: 'Crown', minLevel: 10 },
  { id: 'halo', icon: '😇', name: 'Halo', minLevel: 15 },
  { id: 'glasses', icon: '🕶️', name: 'Shades', minLevel: 5 },
  { id: 'hat', icon: '🎩', name: 'Top Hat', minLevel: 20 },
  { id: 'headphones', icon: '🎧', name: 'Headphones', minLevel: 8 },
  { id: 'flower', icon: '🌸', name: 'Flower', minLevel: 3 },
  { id: 'star', icon: '⭐', name: 'Star', minLevel: 25 },
];

const OUTFITS = [
  { id: 'casual', icon: '👕', name: 'Casual', minLevel: 0 },
  { id: 'business', icon: '👔', name: 'Business', minLevel: 5 },
  { id: 'formal', icon: '🤵', name: 'Formal', minLevel: 15 },
  { id: 'sporty', icon: '🏃', name: 'Sporty', minLevel: 8 },
  { id: 'fancy', icon: '✨', name: 'Fancy', minLevel: 20 },
  { id: 'cozy', icon: '🧥', name: 'Cozy', minLevel: 3 },
];

const EFFECTS = [
  { id: 'none', icon: '❌', name: 'None', minLevel: 0 },
  { id: 'sparkle', icon: '✨', name: 'Sparkle', minLevel: 10 },
  { id: 'fire', icon: '🔥', name: 'Fire', minLevel: 25 },
  { id: 'rainbow', icon: '🌈', name: 'Rainbow', minLevel: 30 },
  { id: 'hearts', icon: '💕', name: 'Hearts', minLevel: 15 },
  { id: 'stars', icon: '🌟', name: 'Starlight', minLevel: 20 },
];

type TabType = 'color' | 'accessory' | 'outfit' | 'effect';

export default function AvatarCustomizer({
  visible,
  currentAvatar,
  onSave,
  onClose,
  userLevel = 1,
}: AvatarCustomizerProps) {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('color');
  const [selectedColor, setSelectedColor] = useState(currentAvatar.color);
  const [selectedAccessory, setSelectedAccessory] = useState(currentAvatar.accessory || 'none');
  const [selectedOutfit, setSelectedOutfit] = useState(currentAvatar.outfit || 'casual');
  const [selectedEffect, setSelectedEffect] = useState(currentAvatar.effect || 'none');

  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const previewPulseAnim = useRef(new Animated.Value(1)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

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
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(previewPulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(previewPulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
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
  }, [visible, slideAnim, fadeAnim, previewPulseAnim]);

  useEffect(() => {
    const tabIndex = ['color', 'accessory', 'outfit', 'effect'].indexOf(activeTab);
    Animated.spring(tabIndicatorAnim, {
      toValue: tabIndex * (width - 32) / 4,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabIndicatorAnim]);

  const handleTabChange = useCallback((tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColor(color);
  }, []);

  const handleAccessorySelect = useCallback((accessoryId: string, minLevel: number) => {
    if (userLevel >= minLevel) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedAccessory(accessoryId);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [userLevel]);

  const handleOutfitSelect = useCallback((outfitId: string, minLevel: number) => {
    if (userLevel >= minLevel) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedOutfit(outfitId);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [userLevel]);

  const handleEffectSelect = useCallback((effectId: string, minLevel: number) => {
    if (userLevel >= minLevel) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedEffect(effectId);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [userLevel]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave({
      color: selectedColor,
      accessory: selectedAccessory !== 'none' ? selectedAccessory : undefined,
      outfit: selectedOutfit,
      effect: selectedEffect !== 'none' ? selectedEffect : undefined,
    });
    onClose();
  }, [selectedColor, selectedAccessory, selectedOutfit, selectedEffect, onSave, onClose]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  if (!visible) return null;

  const styles = createStyles(colors, isDark);

  const currentAccessory = ACCESSORIES.find(a => a.id === selectedAccessory);
  const currentEffect = EFFECTS.find(e => e.id === selectedEffect);

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

      <Animated.View
        style={[
          styles.modal,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.handleBar} />

        <View style={styles.header}>
          <Text style={styles.title}>Customize Avatar</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X color={colors.text} size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.previewSection}>
          <Animated.View
            style={[
              styles.avatarPreview,
              {
                backgroundColor: selectedColor,
                transform: [{ scale: previewPulseAnim }],
              },
            ]}
          >
            {currentEffect?.id === 'sparkle' && (
              <View style={styles.effectOverlay} pointerEvents="none">
                <Text style={styles.effectEmoji}>✨</Text>
              </View>
            )}
            {currentEffect?.id === 'fire' && (
              <View style={styles.effectOverlay} pointerEvents="none">
                <Text style={styles.effectEmoji}>🔥</Text>
              </View>
            )}
            
            <User color="#FFFFFF" size={48} />
            
            {currentAccessory && currentAccessory.id !== 'none' && (
              <View style={styles.accessoryOverlay} pointerEvents="none">
                <Text style={styles.accessoryEmoji}>{currentAccessory.icon}</Text>
              </View>
            )}
          </Animated.View>

          <View style={styles.levelBadge}>
            <Star color="#F59E0B" size={12} fill="#F59E0B" />
            <Text style={styles.levelText}>Level {userLevel}</Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tabIndicator,
              { transform: [{ translateX: tabIndicatorAnim }] },
            ]}
          />
          
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange('color')}
          >
            <Palette
              color={activeTab === 'color' ? colors.primary : colors.textLight}
              size={18}
            />
            <Text style={[styles.tabText, activeTab === 'color' && styles.tabTextActive]}>
              Color
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange('accessory')}
          >
            <Crown
              color={activeTab === 'accessory' ? colors.primary : colors.textLight}
              size={18}
            />
            <Text style={[styles.tabText, activeTab === 'accessory' && styles.tabTextActive]}>
              Accessory
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange('outfit')}
          >
            <Shirt
              color={activeTab === 'outfit' ? colors.primary : colors.textLight}
              size={18}
            />
            <Text style={[styles.tabText, activeTab === 'outfit' && styles.tabTextActive]}>
              Outfit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange('effect')}
          >
            <Sparkles
              color={activeTab === 'effect' ? colors.primary : colors.textLight}
              size={18}
            />
            <Text style={[styles.tabText, activeTab === 'effect' && styles.tabTextActive]}>
              Effect
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
          {activeTab === 'color' && (
            <View style={styles.colorGrid}>
              {AVATAR_COLORS.map((colorOption) => (
                <TouchableOpacity
                  key={colorOption.id}
                  style={[
                    styles.colorOption,
                    { backgroundColor: colorOption.color },
                    selectedColor === colorOption.color && styles.colorOptionSelected,
                  ]}
                  onPress={() => handleColorSelect(colorOption.color)}
                >
                  {selectedColor === colorOption.color && (
                    <Check color="#FFFFFF" size={20} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeTab === 'accessory' && (
            <View style={styles.itemGrid}>
              {ACCESSORIES.map((accessory) => {
                const isLocked = userLevel < accessory.minLevel;
                const isSelected = selectedAccessory === accessory.id;

                return (
                  <TouchableOpacity
                    key={accessory.id}
                    style={[
                      styles.itemOption,
                      isSelected && styles.itemOptionSelected,
                      isLocked && styles.itemOptionLocked,
                    ]}
                    onPress={() => handleAccessorySelect(accessory.id, accessory.minLevel)}
                    disabled={isLocked}
                  >
                    <Text style={styles.itemEmoji}>{accessory.icon}</Text>
                    <Text style={[styles.itemName, isLocked && styles.itemNameLocked]}>
                      {accessory.name}
                    </Text>
                    {isLocked && (
                      <View style={styles.lockBadge}>
                        <Zap color="#F59E0B" size={10} />
                        <Text style={styles.lockText}>Lv.{accessory.minLevel}</Text>
                      </View>
                    )}
                    {isSelected && !isLocked && (
                      <View style={styles.selectedBadge}>
                        <Check color="#FFFFFF" size={12} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {activeTab === 'outfit' && (
            <View style={styles.itemGrid}>
              {OUTFITS.map((outfit) => {
                const isLocked = userLevel < outfit.minLevel;
                const isSelected = selectedOutfit === outfit.id;

                return (
                  <TouchableOpacity
                    key={outfit.id}
                    style={[
                      styles.itemOption,
                      isSelected && styles.itemOptionSelected,
                      isLocked && styles.itemOptionLocked,
                    ]}
                    onPress={() => handleOutfitSelect(outfit.id, outfit.minLevel)}
                    disabled={isLocked}
                  >
                    <Text style={styles.itemEmoji}>{outfit.icon}</Text>
                    <Text style={[styles.itemName, isLocked && styles.itemNameLocked]}>
                      {outfit.name}
                    </Text>
                    {isLocked && (
                      <View style={styles.lockBadge}>
                        <Zap color="#F59E0B" size={10} />
                        <Text style={styles.lockText}>Lv.{outfit.minLevel}</Text>
                      </View>
                    )}
                    {isSelected && !isLocked && (
                      <View style={styles.selectedBadge}>
                        <Check color="#FFFFFF" size={12} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {activeTab === 'effect' && (
            <View style={styles.itemGrid}>
              {EFFECTS.map((effect) => {
                const isLocked = userLevel < effect.minLevel;
                const isSelected = selectedEffect === effect.id;

                return (
                  <TouchableOpacity
                    key={effect.id}
                    style={[
                      styles.itemOption,
                      isSelected && styles.itemOptionSelected,
                      isLocked && styles.itemOptionLocked,
                    ]}
                    onPress={() => handleEffectSelect(effect.id, effect.minLevel)}
                    disabled={isLocked}
                  >
                    <Text style={styles.itemEmoji}>{effect.icon}</Text>
                    <Text style={[styles.itemName, isLocked && styles.itemNameLocked]}>
                      {effect.name}
                    </Text>
                    {isLocked && (
                      <View style={styles.lockBadge}>
                        <Zap color="#F59E0B" size={10} />
                        <Text style={styles.lockText}>Lv.{effect.minLevel}</Text>
                      </View>
                    )}
                    {isSelected && !isLocked && (
                      <View style={styles.selectedBadge}>
                        <Check color="#FFFFFF" size={12} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              <Check color="#FFFFFF" size={18} />
              <Text style={styles.saveButtonText}>Save Avatar</Text>
            </LinearGradient>
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
      maxHeight: '80%',
    },
    handleBar: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewSection: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    avatarPreview: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    effectOverlay: {
      position: 'absolute',
      top: -10,
      right: -10,
    },
    effectEmoji: {
      fontSize: 24,
    },
    accessoryOverlay: {
      position: 'absolute',
      top: -15,
    },
    accessoryEmoji: {
      fontSize: 28,
    },
    levelBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginTop: 12,
    },
    levelText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.text,
    },
    tabContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: 4,
      position: 'relative',
    },
    tabIndicator: {
      position: 'absolute',
      top: 4,
      left: 4,
      width: (width - 32 - 8) / 4,
      height: '100%',
      backgroundColor: colors.surface,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      gap: 4,
    },
    tabText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.textLight,
    },
    tabTextActive: {
      color: colors.primary,
    },
    optionsContainer: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 20,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
    },
    colorOption: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'transparent',
    },
    colorOptionSelected: {
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    itemGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    itemOption: {
      width: (width - 52) / 3,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      position: 'relative',
    },
    itemOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
    },
    itemOptionLocked: {
      opacity: 0.5,
    },
    itemEmoji: {
      fontSize: 32,
      marginBottom: 6,
    },
    itemName: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text,
      textAlign: 'center',
    },
    itemNameLocked: {
      color: colors.textLight,
    },
    lockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: 'rgba(245, 158, 11, 0.2)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginTop: 4,
    },
    lockText: {
      fontSize: 10,
      fontWeight: '600' as const,
      color: '#F59E0B',
    },
    selectedBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 16,
      paddingBottom: 32,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    saveButton: {
      flex: 2,
      borderRadius: 14,
      overflow: 'hidden',
    },
    saveButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
  });
