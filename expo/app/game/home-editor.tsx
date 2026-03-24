import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Save,
  X,
  RotateCw,
  Trash2,
  Grid3X3,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Package,
  Home,
  ChevronDown,
  Check,
  Lock,
  Unlock,
  Sparkles,
} from 'lucide-react-native';
import { HomeData, getHomeTierConfig, InternalHomeData, RoomData } from '@/types/home';

interface EditorPlacedItem {
  id: string;
  itemId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  roomName: string;
  placedAt: string;
}

interface HomeEditorData {
  homeId: string;
  playerId: string;
  homeTier: number;
  isPublic: boolean;
  maxVisitors: number;
  rooms: RoomData[];
  placedItems: EditorPlacedItem[];
  createdAt: string;
  updatedAt: string;
}
import { homeManager, HomeManagerState } from '@/utils/homeManager';
import { useHome } from '@/contexts/HomeContext';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  itemPlacementSystem,
  ItemPlacementState,
  ItemDefinition,
  SAMPLE_ITEM_DEFINITIONS,
} from '@/utils/itemPlacementSystem';
import HomeNavigation from '@/components/HomeNavigation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ItemCategory = 'all' | 'furniture' | 'decor' | 'electronics' | 'appliance' | 'storage' | 'lighting';

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  all: 'All Items',
  furniture: 'Furniture',
  decor: 'Decor',
  electronics: 'Electronics',
  appliance: 'Appliances',
  storage: 'Storage',
  lighting: 'Lighting',
};

export default function HomeEditorScreen() {
  const router = useRouter();
  const { hasHome, isInitialized } = useHome();
  const game = useGame();
  const { user } = useAuth();
  
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  
  const housingType = game?.gameState?.lifestyle?.housingType || 'homeless';
  const canAccessHomeEditor = housingType === 'renting';
  const isSharedRental = housingType === 'shared_rental';
  const [homeState, setHomeState] = useState<HomeManagerState>(homeManager.getState());
  const [placementState, setPlacementState] = useState<ItemPlacementState>(itemPlacementSystem.getState());
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('all');
  const [showInventory, setShowInventory] = useState(false);
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [showItemOptions, setShowItemOptions] = useState(false);
  const [selectedPlacedItem, setSelectedPlacedItem] = useState<EditorPlacedItem | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalHome, setOriginalHome] = useState<HomeData | null>(null);
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (isInitialized) {
      if (!canAccessHomeEditor) {
        console.log('[HomeEditor] User not eligible for home editor, housing type:', housingType);
        if (isSharedRental) {
          Alert.alert(
            'Home Editor Unavailable',
            'The Home Editor is not available for shared rental homes. You need to rent your own place to access this feature.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else if (housingType === 'homeless') {
          Alert.alert(
            'No Housing',
            'You need to rent a home first to access the Home Editor.',
            [
              { text: 'Cancel', onPress: () => router.back() },
              { text: 'Browse Rentals', onPress: () => router.replace('/game/real-estate' as any) }
            ]
          );
        } else {
          Alert.alert(
            'Home Editor',
            'The Home Editor is designed for rented homes only.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
        return;
      }
      
      if (!hasHome) {
        console.log('[HomeEditor] No home found');
        if (isAdmin) {
          console.log('[HomeEditor] Admin user, redirecting to creation');
          router.replace('/game/home-creation' as any);
        } else {
          console.log('[HomeEditor] Non-admin user, home creation unavailable');
          Alert.alert(
            'Home Creation Unavailable',
            'The Create Home feature is currently available for administrators only. This feature will be available to all users in a future update.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      }
    }
  }, [isInitialized, hasHome, canAccessHomeEditor, housingType, isSharedRental, router]);

  useEffect(() => {
    console.log('[HomeEditor] Initializing editor');
    homeManager.setOnStateChange(setHomeState as (state: HomeManagerState) => void);
    itemPlacementSystem.setOnStateChange(setPlacementState);
    itemPlacementSystem.registerItemDefinitions(SAMPLE_ITEM_DEFINITIONS);
    itemPlacementSystem.setOwnership(true);

    const currentHome = homeManager.getCurrentHome() as HomeEditorData | null;
    if (currentHome) {
      setOriginalHome(JSON.parse(JSON.stringify(currentHome)));
      if (currentHome.rooms && currentHome.rooms.length > 0) {
        setSelectedRoom(currentHome.rooms[0].roomName);
      }
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    return () => {
      homeManager.setOnStateChange(() => {});
      itemPlacementSystem.setOnStateChange(() => {});
    };
  }, []);

  const currentHome = homeState.currentHome as HomeEditorData | null;
  const tierConfig = currentHome ? getHomeTierConfig(currentHome.homeTier) : null;

  const currentRoomData = useMemo(() => {
    if (!currentHome || !selectedRoom || !currentHome.rooms) return null;
    return currentHome.rooms.find(r => r.roomName === selectedRoom) || null;
  }, [currentHome, selectedRoom]);

  const roomItems = useMemo(() => {
    if (!currentHome || !selectedRoom || !currentHome.placedItems) return [];
    return currentHome.placedItems.filter((item: EditorPlacedItem) => item.roomName === selectedRoom);
  }, [currentHome, selectedRoom]);

  const filteredInventory = useMemo(() => {
    if (selectedCategory === 'all') return SAMPLE_ITEM_DEFINITIONS;
    return SAMPLE_ITEM_DEFINITIONS.filter(item => item.category === selectedCategory);
  }, [selectedCategory]);

  const totalCapacity = useMemo(() => {
    if (!currentHome || !tierConfig) return { current: 0, max: 0 };
    return {
      current: currentHome.placedItems?.length || 0,
      max: tierConfig.totalMaxItems,
    };
  }, [currentHome, tierConfig]);

  const roomCapacity = useMemo(() => {
    if (!currentRoomData || !currentHome) return { current: 0, max: 0 };
    const itemsInRoom = currentHome.placedItems?.filter((i: EditorPlacedItem) => i.roomName === selectedRoom).length || 0;
    return {
      current: itemsInRoom,
      max: currentRoomData.maxItems,
    };
  }, [currentRoomData, currentHome, selectedRoom]);

  const handlePlaceItem = useCallback((item: ItemDefinition) => {
    if (!selectedRoom) {
      Alert.alert('Select Room', 'Please select a room first');
      return;
    }

    if (roomCapacity.current >= roomCapacity.max) {
      Alert.alert('Room Full', 'This room has reached maximum capacity');
      return;
    }

    if (totalCapacity.current >= totalCapacity.max) {
      Alert.alert('Home Full', 'Your home has reached maximum item capacity');
      return;
    }

    const randomX = Math.random() * 6 + 1;
    const randomZ = Math.random() * 6 + 1;

    const placedItem = homeManager.placeItem({
      itemId: item.id,
      position: { x: randomX, y: 0, z: randomZ },
      rotation: { x: 0, y: 0, z: 0 },
      roomName: selectedRoom,
    });

    if (placedItem) {
      setHasUnsavedChanges(true);
      setShowInventory(false);
      console.log('[HomeEditor] Item placed:', placedItem.id);
    }
  }, [selectedRoom, roomCapacity, totalCapacity]);

  const handleRemoveItem = useCallback((item: EditorPlacedItem) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const success = itemPlacementSystem.removeItem(item as any);
            if (success) {
              setHasUnsavedChanges(true);
              setShowItemOptions(false);
              setSelectedPlacedItem(null);
            }
          },
        },
      ]
    );
  }, []);

  const handleRotateItem = useCallback((item: EditorPlacedItem) => {
    const success = itemPlacementSystem.rotateItem(item as any, 90);
    if (success) {
      setHasUnsavedChanges(true);
    }
  }, []);

  const handleItemPress = useCallback((item: EditorPlacedItem) => {
    setSelectedPlacedItem(item);
    setShowItemOptions(true);
  }, []);

  const handleSaveHome = useCallback(async () => {
    try {
      console.log('[HomeEditor] Saving home...');
      setHasUnsavedChanges(false);
      setOriginalHome(currentHome ? JSON.parse(JSON.stringify(currentHome)) : null);
      Alert.alert('Success', 'Home saved successfully!');
    } catch (error) {
      console.error('[HomeEditor] Error saving home:', error);
      Alert.alert('Error', 'Failed to save home');
    }
  }, [currentHome]);

  const handleCancelEditing = useCallback(() => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              if (originalHome) {
                homeManager.loadHome(originalHome as unknown as InternalHomeData);
              }
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  }, [hasUnsavedChanges, originalHome, router]);

  const handleTogglePublic = useCallback(() => {
    if (currentHome) {
      homeManager.setHomePublic(!currentHome.isPublic);
      setHasUnsavedChanges(true);
    }
  }, [currentHome]);

  const handleUndo = useCallback(() => {
    if (itemPlacementSystem.canUndo()) {
      itemPlacementSystem.undo();
      setHasUnsavedChanges(true);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (itemPlacementSystem.canRedo()) {
      itemPlacementSystem.redo();
      setHasUnsavedChanges(true);
    }
  }, []);

  const getItemDefinition = useCallback((itemId: string): ItemDefinition | undefined => {
    return SAMPLE_ITEM_DEFINITIONS.find(item => item.id === itemId);
  }, []);

  if (!isInitialized || !currentHome || !canAccessHomeEditor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {!isInitialized ? 'Loading...' : 
             !canAccessHomeEditor ? 'Checking eligibility...' : 
             'Setting up your home...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <HomeNavigation currentScreen="editor" showCompact />
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleCancelEditing}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Home Editor</Text>
            <Text style={styles.subtitle}>{tierConfig?.tierName || 'Home'}</Text>
          </View>
          <View style={styles.headerActions}>
            {hasUnsavedChanges && (
              <View style={styles.unsavedBadge}>
                <Text style={styles.unsavedText}>●</Text>
              </View>
            )}
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveHome}>
              <Save size={20} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[styles.toolButton, !itemPlacementSystem.canUndo() && styles.toolButtonDisabled]}
            onPress={handleUndo}
            disabled={!itemPlacementSystem.canUndo()}
          >
            <Undo2 size={20} color={itemPlacementSystem.canUndo() ? '#fff' : '#666'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolButton, !itemPlacementSystem.canRedo() && styles.toolButtonDisabled]}
            onPress={handleRedo}
            disabled={!itemPlacementSystem.canRedo()}
          >
            <Redo2 size={20} color={itemPlacementSystem.canRedo() ? '#fff' : '#666'} />
          </TouchableOpacity>
          <View style={styles.toolDivider} />
          <TouchableOpacity
            style={[styles.toolButton, placementState.showGrid && styles.toolButtonActive]}
            onPress={() => itemPlacementSystem.setShowGrid(!placementState.showGrid)}
          >
            <Grid3X3 size={20} color={placementState.showGrid ? '#10B981' : '#fff'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleTogglePublic}>
            {currentHome.isPublic ? (
              <Unlock size={20} color="#10B981" />
            ) : (
              <Lock size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Home size={14} color="#9CA3AF" />
            <Text style={styles.statText}>
              {totalCapacity.current}/{totalCapacity.max} items
            </Text>
          </View>
          <View style={styles.statItem}>
            <Package size={14} color="#9CA3AF" />
            <Text style={styles.statText}>
              {roomCapacity.current}/{roomCapacity.max} in room
            </Text>
          </View>
          <View style={[styles.statItem, styles.visibilityBadge]}>
            {currentHome.isPublic ? (
              <>
                <Eye size={14} color="#10B981" />
                <Text style={[styles.statText, styles.publicText]}>Public</Text>
              </>
            ) : (
              <>
                <EyeOff size={14} color="#6B7280" />
                <Text style={styles.statText}>Private</Text>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.roomSelector} onPress={() => setShowRoomSelector(true)}>
          <View style={styles.roomSelectorContent}>
            <Sparkles size={18} color="#10B981" />
            <Text style={styles.roomSelectorText}>{selectedRoom || 'Select Room'}</Text>
          </View>
          <ChevronDown size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <ScrollView style={styles.roomView} contentContainerStyle={styles.roomViewContent}>
          {placementState.showGrid && (
            <View style={styles.gridOverlay}>
              {Array.from({ length: 10 }).map((_, i) => (
                <View key={`h-${i}`} style={[styles.gridLine, styles.gridLineHorizontal, { top: `${i * 10}%` }]} />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <View key={`v-${i}`} style={[styles.gridLine, styles.gridLineVertical, { left: `${i * 10}%` }]} />
              ))}
            </View>
          )}

          <View style={styles.roomFloor}>
            {roomItems.map((item: EditorPlacedItem) => {
              const itemDef = getItemDefinition(item.itemId);
              if (!itemDef) return null;

              const posX = (item.position.x / 10) * 100;
              const posZ = (item.position.z / 10) * 100;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.placedItem,
                    {
                      left: `${Math.min(Math.max(posX, 5), 85)}%`,
                      top: `${Math.min(Math.max(posZ, 5), 85)}%`,
                      transform: [{ rotate: `${item.rotation.y}deg` }],
                    },
                    selectedPlacedItem?.id === item.id && styles.placedItemSelected,
                  ]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: itemDef.imageUrl }} style={styles.placedItemImage} />
                  <Text style={styles.placedItemName} numberOfLines={1}>
                    {itemDef.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {roomItems.length === 0 && (
              <View style={styles.emptyRoomMessage}>
                <Package size={48} color="#374151" />
                <Text style={styles.emptyRoomText}>No items in this room</Text>
                <Text style={styles.emptyRoomSubtext}>Tap the + button to add furniture</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.addItemButton}
          onPress={() => setShowInventory(true)}
        >
          <Package size={24} color="#fff" />
          <Text style={styles.addItemText}>Add Item</Text>
        </TouchableOpacity>

        <Modal
          visible={showRoomSelector}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRoomSelector(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.roomSelectorModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Room</Text>
                <TouchableOpacity onPress={() => setShowRoomSelector(false)}>
                  <X size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.roomList}>
                {(currentHome.rooms || []).map((room) => {
                  const itemsInRoom = currentHome.placedItems?.filter((i: EditorPlacedItem) => i.roomName === room.roomName).length || 0;
                  const isSelected = selectedRoom === room.roomName;

                  return (
                    <TouchableOpacity
                      key={room.roomName}
                      style={[styles.roomOption, isSelected && styles.roomOptionSelected]}
                      onPress={() => {
                        setSelectedRoom(room.roomName);
                        setShowRoomSelector(false);
                      }}
                    >
                      <View style={styles.roomOptionContent}>
                        <Home size={20} color={isSelected ? '#10B981' : '#9CA3AF'} />
                        <View style={styles.roomOptionInfo}>
                          <Text style={[styles.roomOptionName, isSelected && styles.roomOptionNameSelected]}>
                            {room.roomName}
                          </Text>
                          <Text style={styles.roomOptionCapacity}>
                            {itemsInRoom}/{room.maxItems} items
                          </Text>
                        </View>
                      </View>
                      {isSelected && <Check size={20} color="#10B981" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showInventory}
          transparent
          animationType="slide"
          onRequestClose={() => setShowInventory(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.inventoryModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Inventory</Text>
                <TouchableOpacity onPress={() => setShowInventory(false)}>
                  <X size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryTabs}
                contentContainerStyle={styles.categoryTabsContent}
              >
                {(Object.keys(CATEGORY_LABELS) as ItemCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryTab, selectedCategory === cat && styles.categoryTabActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.categoryTabText, selectedCategory === cat && styles.categoryTabTextActive]}>
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView style={styles.inventoryList} contentContainerStyle={styles.inventoryListContent}>
                {filteredInventory.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.inventoryItem}
                    onPress={() => handlePlaceItem(item)}
                  >
                    <Image source={{ uri: item.imageUrl }} style={styles.inventoryItemImage} />
                    <View style={styles.inventoryItemInfo}>
                      <Text style={styles.inventoryItemName}>{item.name}</Text>
                      <Text style={styles.inventoryItemCategory}>{item.category}</Text>
                      <Text style={styles.inventoryItemPrice}>${item.price.toLocaleString()}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showItemOptions}
          transparent
          animationType="fade"
          onRequestClose={() => setShowItemOptions(false)}
        >
          <TouchableOpacity
            style={styles.itemOptionsOverlay}
            activeOpacity={1}
            onPress={() => setShowItemOptions(false)}
          >
            <View style={styles.itemOptionsModal}>
              {selectedPlacedItem && (
                <>
                  <View style={styles.itemOptionsHeader}>
                    <Text style={styles.itemOptionsTitle}>
                      {getItemDefinition(selectedPlacedItem.itemId)?.name || 'Item'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.itemOptionButton}
                    onPress={() => {
                      handleRotateItem(selectedPlacedItem);
                    }}
                  >
                    <RotateCw size={20} color="#10B981" />
                    <Text style={styles.itemOptionText}>Rotate 90°</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.itemOptionButton, styles.itemOptionButtonDanger]}
                    onPress={() => handleRemoveItem(selectedPlacedItem)}
                  >
                    <Trash2 size={20} color="#EF4444" />
                    <Text style={[styles.itemOptionText, styles.itemOptionTextDanger]}>Remove</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unsavedBadge: {
    marginRight: 4,
  },
  unsavedText: {
    color: '#F59E0B',
    fontSize: 12,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  toolButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonDisabled: {
    opacity: 0.5,
  },
  toolButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  toolDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#374151',
    marginHorizontal: 4,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
    backgroundColor: '#1E293B',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  visibilityBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
  },
  publicText: {
    color: '#10B981',
  },
  roomSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  roomSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roomSelectorText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  roomView: {
    flex: 1,
    margin: 16,
  },
  roomViewContent: {
    flexGrow: 1,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
  },
  gridLineHorizontal: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineVertical: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  roomFloor: {
    flex: 1,
    minHeight: 400,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#374151',
    position: 'relative',
    overflow: 'hidden',
  },
  placedItem: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
  },
  placedItemSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  placedItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  placedItemName: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyRoomMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyRoomText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6B7280',
    marginTop: 16,
  },
  emptyRoomSubtext: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    backgroundColor: '#10B981',
    borderRadius: 12,
  },
  addItemText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  roomSelectorModal: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  roomList: {
    padding: 16,
  },
  roomOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  roomOptionSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  roomOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roomOptionInfo: {
    gap: 2,
  },
  roomOptionName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  roomOptionNameSelected: {
    color: '#10B981',
  },
  roomOptionCapacity: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  inventoryModal: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  categoryTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: '#10B981',
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#9CA3AF',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  inventoryList: {
    padding: 16,
  },
  inventoryListContent: {
    paddingBottom: 24,
  },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  inventoryItemImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#374151',
  },
  inventoryItemInfo: {
    flex: 1,
    marginLeft: 14,
  },
  inventoryItemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  inventoryItemCategory: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  inventoryItemPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#10B981',
    marginTop: 4,
  },
  itemOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemOptionsModal: {
    width: SCREEN_WIDTH * 0.8,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    overflow: 'hidden',
  },
  itemOptionsHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  itemOptionsTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
  },
  itemOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  itemOptionButtonDanger: {
    borderBottomWidth: 0,
  },
  itemOptionText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#fff',
  },
  itemOptionTextDanger: {
    color: '#EF4444',
  },
});
