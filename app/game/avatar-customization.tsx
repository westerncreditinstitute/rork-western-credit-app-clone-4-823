import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Shirt,
  HardHat,
  Watch,
  Glasses,
  ShoppingBag,
  Palette,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { customizationService } from '@/services/CustomizationService';
import type { PlayerInventory, PlayerAvatarConfig, InventoryStats } from '@/types/customization';

export default function AvatarCustomizationScreen() {
  const router = useRouter();

  const [avatarConfig, setAvatarConfig] = useState<PlayerAvatarConfig | null>(null);
  const [inventory, setInventory] = useState<PlayerInventory[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [selectedTab, setSelectedTab] = useState<'outfit' | 'hat' | 'accessory' | 'shoes' | 'glasses'>('outfit');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Authentication Required', 'Please log in to customize your avatar');
        return;
      }

      const [configData, inventoryData, statsData] = await Promise.all([
        customizationService.getPlayerAvatarConfig(user.id),
        customizationService.getPlayerInventory(user.id),
        customizationService.getInventoryStats(user.id),
      ]);

      setAvatarConfig(configData);
      setInventory(inventoryData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading customization data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEquipItem = async (inventoryId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const result = await customizationService.equipItem(user.id, inventoryId);

      if (result.success) {
        setAvatarConfig(result.equipped_items || null);
        // Refresh inventory
        const updatedInventory = await customizationService.getPlayerInventory(user.id);
        setInventory(updatedInventory);
      } else {
        Alert.alert('Error', result.error || 'Failed to equip item');
      }
    } catch (error) {
      console.error('Error equipping item:', error);
      Alert.alert('Error', 'An error occurred while equipping the item');
    }
  };

  const handleUnequipItem = async (itemType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await customizationService.unequipItemType(user.id, itemType);
      
      // Reload data
      const [configData, inventoryData] = await Promise.all([
        customizationService.getPlayerAvatarConfig(user.id),
        customizationService.getPlayerInventory(user.id),
      ]);

      setAvatarConfig(configData);
      setInventory(inventoryData);
    } catch (error) {
      console.error('Error unequipping item:', error);
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'outfit':
        return Shirt;
      case 'hat':
        return HardHat;
      case 'accessory':
        return Watch;
      case 'shoes':
        return ShoppingBag;
      case 'glasses':
        return Glasses;
      default:
        return Shirt;
    }
  };

  const getEquippedItem = (itemType: string): PlayerInventory | null => {
    if (!avatarConfig) return null;

    switch (itemType) {
      case 'outfit':
        return avatarConfig.current_outfit || null;
      case 'hat':
        return avatarConfig.current_hat || null;
      case 'accessory':
        return avatarConfig.current_accessory || null;
      case 'shoes':
        return avatarConfig.current_shoes || null;
      case 'glasses':
        return avatarConfig.current_glasses || null;
      default:
        return null;
    }
  };

  const getFilteredInventory = () => {
    return inventory.filter((item) => item.item?.item_type === selectedTab);
  };

  const renderTab = (tab: string, label: string) => {
    const Icon = getTabIcon(tab);
    const isActive = selectedTab === tab;

    return (
      <TouchableOpacity
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => setSelectedTab(tab as any)}
      >
        <Icon size={20} color={isActive ? '#6366f1' : '#64748b'} />
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderEquippedItem = () => {
    const equippedItem = getEquippedItem(selectedTab);

    if (!equippedItem) {
      return (
        <View style={styles.emptyEquipped}>
          <Palette size={32} color="#94a3b8" />
          <Text style={styles.emptyEquippedText}>No {selectedTab} equipped</Text>
        </View>
      );
    }

    return (
      <View style={styles.equippedCard}>
        <View style={styles.equippedImageContainer}>
          {equippedItem.item?.image_url ? (
            <Image
              source={{ uri: equippedItem.item.image_url }}
              style={styles.equippedImage}
            />
          ) : (
            <View style={styles.equippedImagePlaceholder}>
              <Sparkles size={24} color="#6366f1" />
            </View>
          )}
        </View>
        <View style={styles.equippedInfo}>
          <Text style={styles.equippedName}>{equippedItem.item?.name}</Text>
          <View style={styles.equippedMeta}>
            <Text style={styles.equippedRarity}>{equippedItem.item?.rarity}</Text>
            <Text style={styles.equippedCondition}>{equippedItem.condition_status}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.unequipButton}
          onPress={() => handleUnequipItem(selectedTab)}
        >
          <Text style={styles.unequipButtonText}>Unequip</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderInventoryItem = (item: PlayerInventory) => {
    const isEquipped = item.is_equipped;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.inventoryCard, isEquipped && styles.inventoryCardEquipped]}
        onPress={() => !isEquipped && handleEquipItem(item.id)}
        disabled={isEquipped}
      >
        <View style={styles.inventoryImageContainer}>
          {item.item?.image_url ? (
            <Image
              source={{ uri: item.item.image_url }}
              style={styles.inventoryImage}
            />
          ) : (
            <View style={styles.inventoryImagePlaceholder}>
              <Sparkles size={20} color="#6366f1" />
            </View>
          )}
          {isEquipped && (
            <View style={styles.equippedBadge}>
              <TrendingUp size={12} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.inventoryInfo}>
          <Text style={styles.inventoryName}>{item.item?.name}</Text>
          <View style={styles.inventoryMeta}>
            <Text
              style={[
                styles.inventoryRarity,
                { color: getRarityColor(item.item?.rarity) },
              ]}
            >
              {item.item?.rarity}
            </Text>
            <Text style={styles.inventoryCondition}>{item.condition_status}</Text>
          </View>
          <Text style={styles.inventoryWear}>Wear: {item.wear_percentage}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'common':
        return '#64748b';
      case 'uncommon':
        return '#22c55e';
      case 'rare':
        return '#3b82f6';
      case 'epic':
        return '#a855f7';
      case 'legendary':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarPreview}>
          <View style={styles.avatarCircle}>
            <User size={48} color="#6366f1" />
          </View>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Avatar Customization</Text>
          {stats && (
            <Text style={styles.headerSubtitle}>
              {stats.total_items} items • {stats.equipped_items} equipped
            </Text>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {renderTab('outfit', 'Outfit')}
        {renderTab('hat', 'Hat')}
        {renderTab('accessory', 'Accessory')}
        {renderTab('shoes', 'Shoes')}
        {renderTab('glasses', 'Glasses')}
      </View>

      <ScrollView style={styles.content}>
        {/* Equipped Item */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currently Equipped</Text>
          {renderEquippedItem()}
        </View>

        {/* Inventory */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Your {selectedTab}s ({getFilteredInventory().length})
          </Text>
          <View style={styles.inventoryGrid}>
            {getFilteredInventory().map((item) => renderInventoryItem(item))}
          </View>
        </View>

        {/* Shop Button */}
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => router.push('/game/customization-shop' as any)}
        >
          <ShoppingBag size={20} color="#fff" />
          <Text style={styles.shopButtonText}>Visit Shop</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatarPreview: {
    marginRight: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#e0e7ff',
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  emptyEquipped: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyEquippedText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  equippedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  equippedImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
  },
  equippedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  equippedImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equippedInfo: {
    flex: 1,
  },
  equippedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  equippedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equippedRarity: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
    marginRight: 12,
  },
  equippedCondition: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  unequipButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unequipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  inventoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  inventoryCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: '1%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inventoryCardEquipped: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  inventoryImageContainer: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  inventoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  inventoryImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equippedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 4,
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  inventoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inventoryRarity: {
    fontSize: 11,
    textTransform: 'capitalize',
    marginRight: 8,
  },
  inventoryCondition: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  inventoryWear: {
    fontSize: 11,
    color: '#64748b',
  },
  shopButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});