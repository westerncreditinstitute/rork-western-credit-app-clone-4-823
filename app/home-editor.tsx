import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';

import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Grid3X3,
  Sofa,
  Tv,
  Package,
  Flower2,
  Lightbulb,
  Plus,
  Trash2,
  RotateCw,
  X,
  Home,
  Lock,
  AlertCircle,
  Box,
  Layers,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useHome, useHomeEditor, useHomeInventory } from '@/contexts/HomeContext';
import { InternalPlacedItem, Vector3 } from '@/types/home';
import { Room3DPreview, ViewMode } from '@/components/home/Room3DPreview';
import { Item3DPreview, Item3DPreviewItem } from '@/components/home/Item3DPreview';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROOM_PREVIEW_SIZE = SCREEN_WIDTH - 32;

type ItemCategory = 'all' | 'furniture' | 'decor' | 'electronics' | 'appliance' | 'storage' | 'lighting';

const ITEM_CATEGORIES: { value: ItemCategory; label: string; icon: React.ComponentType<any> }[] = [
  { value: 'all', label: 'All', icon: Package },
  { value: 'furniture', label: 'Furniture', icon: Sofa },
  { value: 'decor', label: 'Decor', icon: Flower2 },
  { value: 'electronics', label: 'Electronics', icon: Tv },
  { value: 'appliance', label: 'Appliances', icon: Package },
  { value: 'storage', label: 'Storage', icon: Package },
  { value: 'lighting', label: 'Lighting', icon: Lightbulb },
];

export default function HomeEditorScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    hasHome,
    canAccessHomeEditor,
    getHomeEditorEligibilityMessage,
  } = useHome();

  const {
    hasUnsavedChanges,
    selectedRoom,
    roomList,
    selectedPlacedItem,
    canUndo,
    canRedo,
    isSaving,
    exitEditMode,
    selectRoom,
    selectPlacedItem,
    undo,
    redo,
    saveHomeData,
    placeItemFromInventory,
    removeItemToInventory,
    moveItem,
    getItemDefinition,
    getItemsInRoom,
    getRoomCapacity,
  } = useHomeEditor();

  const { availableInventory, getAvailableByCategory } = useHomeInventory();

  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('all');
  const [showGrid, setShowGrid] = useState(true);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  const eligibility = useMemo(() => getHomeEditorEligibilityMessage(), [getHomeEditorEligibilityMessage]);

  const currentRoomData = useMemo(() => {
    return roomList.find(r => r.roomName === selectedRoom);
  }, [roomList, selectedRoom]);

  const currentRoomItems = useMemo(() => {
    if (!selectedRoom) return [];
    return getItemsInRoom(selectedRoom);
  }, [selectedRoom, getItemsInRoom]);

  

  const filteredInventory = useMemo(() => {
    if (selectedCategory === 'all') return availableInventory;
    return getAvailableByCategory(selectedCategory);
  }, [availableInventory, selectedCategory, getAvailableByCategory]);

  

  const handleExitEditMode = useCallback((save: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowExitConfirmModal(false);
    exitEditMode(save);
  }, [exitEditMode]);

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowExitConfirmModal(true);
    } else {
      router.back();
    }
  }, [hasUnsavedChanges, router]);

  const handleSave = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveHomeData();
  }, [saveHomeData]);

  const handleUndo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    redo();
  }, [redo]);

  const handleSelectRoom = useCallback((roomName: string) => {
    Haptics.selectionAsync();
    selectRoom(roomName);
    selectPlacedItem(null);
  }, [selectRoom, selectPlacedItem]);

  const handleSelectItem = useCallback((item: InternalPlacedItem | null) => {
    selectPlacedItem(item);
  }, [selectPlacedItem]);

  const handleDeleteItem = useCallback(() => {
    if (!selectedPlacedItem) return;
    
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item? It will return to your inventory.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            removeItemToInventory(selectedPlacedItem.id);
            selectPlacedItem(null);
          },
        },
      ]
    );
  }, [selectedPlacedItem, removeItemToInventory, selectPlacedItem]);

  const handleRotateItem = useCallback(() => {
    if (!selectedPlacedItem) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newRotation: Vector3 = {
      ...selectedPlacedItem.rotation,
      y: (selectedPlacedItem.rotation.y + 90) % 360,
    };
    moveItem(selectedPlacedItem.id, selectedPlacedItem.position, newRotation);
  }, [selectedPlacedItem, moveItem]);

  const handlePlaceItem = useCallback((inventoryItemId: string) => {
    if (!selectedRoom) {
      Alert.alert('Select a Room', 'Please select a room first before placing items.');
      return;
    }

    const capacity = getRoomCapacity(selectedRoom);
    if (capacity && capacity.current >= capacity.max) {
      Alert.alert('Room Full', 'This room has reached its maximum item capacity.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const roomData = roomList.find(r => r.roomName === selectedRoom);
    if (!roomData) return;

    const centerPosition: Vector3 = {
      x: roomData.dimensions.x / 2,
      y: 0,
      z: roomData.dimensions.z / 2,
    };

    placeItemFromInventory(inventoryItemId, {
      position: centerPosition,
      rotation: { x: 0, y: 0, z: 0 },
      roomName: selectedRoom,
    });

    setShowInventoryModal(false);
  }, [selectedRoom, roomList, placeItemFromInventory, getRoomCapacity]);

  const dynamicStyles = createStyles(colors, isDark);

  if (!canAccessHomeEditor) {
    return (
      <View style={[dynamicStyles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <View style={dynamicStyles.header}>
          <TouchableOpacity style={dynamicStyles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Home Editor</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={dynamicStyles.ineligibleContainer}>
          <View style={dynamicStyles.ineligibleIconContainer}>
            <Lock color="#F59E0B" size={48} />
          </View>
          <Text style={dynamicStyles.ineligibleTitle}>Home Editor Unavailable</Text>
          <Text style={dynamicStyles.ineligibleMessage}>{eligibility.message}</Text>
          {eligibility.actionLabel && (
            <TouchableOpacity
              style={dynamicStyles.ineligibleActionButton}
              onPress={() => router.push('/home-browser' as any)}
            >
              <Text style={dynamicStyles.ineligibleActionText}>{eligibility.actionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (!hasHome) {
    return (
      <View style={[dynamicStyles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <View style={dynamicStyles.header}>
          <TouchableOpacity style={dynamicStyles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Home Editor</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={dynamicStyles.noHomeContainer}>
          <Home color={colors.textLight} size={64} />
          <Text style={dynamicStyles.noHomeTitle}>No Home Yet</Text>
          <Text style={dynamicStyles.noHomeMessage}>
            Create your first home to start decorating!
          </Text>
          <TouchableOpacity
            style={dynamicStyles.createHomeButton}
            onPress={() => router.push('/home-creation' as any)}
          >
            <Plus color="#FFFFFF" size={20} />
            <Text style={dynamicStyles.createHomeButtonText}>Create Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[dynamicStyles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={dynamicStyles.header}>
        <TouchableOpacity style={dynamicStyles.backButton} onPress={handleBack}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <View style={dynamicStyles.headerCenter}>
          <Text style={dynamicStyles.headerTitle}>Home Editor</Text>
          {hasUnsavedChanges && (
            <View style={dynamicStyles.unsavedBadge}>
              <Text style={dynamicStyles.unsavedBadgeText}>Unsaved</Text>
            </View>
          )}
        </View>
        <View style={dynamicStyles.headerActions}>
          <TouchableOpacity
            style={[dynamicStyles.viewModeToggle, viewMode === '3d' && dynamicStyles.viewModeToggleActive]}
            onPress={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
          >
            {viewMode === '2d' ? (
              <Box color={colors.textLight} size={18} />
            ) : (
              <Layers color="#FFFFFF" size={18} />
            )}
            <Text style={[dynamicStyles.viewModeText, viewMode === '3d' && dynamicStyles.viewModeTextActive]}>
              {viewMode === '2d' ? '3D' : '2D'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[dynamicStyles.gridToggle, showGrid && dynamicStyles.gridToggleActive]}
            onPress={() => setShowGrid(!showGrid)}
          >
            <Grid3X3 color={showGrid ? '#FFFFFF' : colors.textLight} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={dynamicStyles.controlsBar}>
        <View style={dynamicStyles.undoRedoControls}>
          <TouchableOpacity
            style={[dynamicStyles.controlButton, !canUndo && dynamicStyles.controlButtonDisabled]}
            onPress={handleUndo}
            disabled={!canUndo}
          >
            <Undo2 color={canUndo ? colors.text : colors.textLight} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[dynamicStyles.controlButton, !canRedo && dynamicStyles.controlButtonDisabled]}
            onPress={handleRedo}
            disabled={!canRedo}
          >
            <Redo2 color={canRedo ? colors.text : colors.textLight} size={20} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[dynamicStyles.saveButton, isSaving && dynamicStyles.saveButtonSaving]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Save color="#FFFFFF" size={18} />
          <Text style={dynamicStyles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.roomTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={dynamicStyles.roomTabsContent}
        >
          {roomList.map((room) => {
            const isSelected = selectedRoom === room.roomName;
            const capacity = getRoomCapacity(room.roomName);
            
            return (
              <TouchableOpacity
                key={room.roomName}
                style={[dynamicStyles.roomTab, isSelected && dynamicStyles.roomTabActive]}
                onPress={() => handleSelectRoom(room.roomName)}
              >
                <Text
                  style={[
                    dynamicStyles.roomTabText,
                    isSelected && dynamicStyles.roomTabTextActive,
                  ]}
                >
                  {room.roomName.replace('_', ' ')}
                </Text>
                <Text
                  style={[
                    dynamicStyles.roomTabCapacity,
                    isSelected && dynamicStyles.roomTabCapacityActive,
                  ]}
                >
                  {capacity?.current ?? 0}/{capacity?.max ?? 0}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={dynamicStyles.content}
        contentContainerStyle={dynamicStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {currentRoomData ? (
          <Room3DPreview
            room={currentRoomData}
            items={currentRoomItems}
            selectedItemId={selectedPlacedItem?.id || null}
            onSelectItem={handleSelectItem}
            onMoveItem={(id, pos) => moveItem(id, pos)}
            showGrid={showGrid}
            viewMode={viewMode}
            colors={colors}
            getItemDefinition={getItemDefinition}
          />
        ) : (
          <View style={dynamicStyles.noRoomSelected}>
            <Text style={dynamicStyles.noRoomText}>Select a room to start editing</Text>
          </View>
        )}

        {selectedPlacedItem && (
          <View style={dynamicStyles.selectedItemControls}>
            <View style={dynamicStyles.selectedItemInfo}>
              <Text style={dynamicStyles.selectedItemName}>
                {getItemDefinition(selectedPlacedItem.itemId)?.name || 'Item'}
              </Text>
              <Text style={dynamicStyles.selectedItemPosition}>
                Position: ({selectedPlacedItem.position.x.toFixed(1)}, {selectedPlacedItem.position.z.toFixed(1)})
              </Text>
            </View>
            <View style={dynamicStyles.selectedItemActions}>
              <TouchableOpacity
                style={dynamicStyles.itemActionButton}
                onPress={handleRotateItem}
              >
                <RotateCw color={colors.text} size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[dynamicStyles.itemActionButton, dynamicStyles.itemActionButtonDanger]}
                onPress={handleDeleteItem}
              >
                <Trash2 color="#EF4444" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={dynamicStyles.inventorySection}>
          <View style={dynamicStyles.inventorySectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>Inventory</Text>
            <TouchableOpacity
              style={dynamicStyles.addItemButton}
              onPress={() => setShowInventoryModal(true)}
            >
              <Plus color="#FFFFFF" size={18} />
              <Text style={dynamicStyles.addItemButtonText}>Place Item</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={dynamicStyles.categoryFilterContent}
          >
            {ITEM_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.value;
              
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[dynamicStyles.categoryChip, isSelected && dynamicStyles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat.value)}
                >
                  <Icon color={isSelected ? '#FFFFFF' : colors.textSecondary} size={16} />
                  <Text
                    style={[
                      dynamicStyles.categoryChipText,
                      isSelected && dynamicStyles.categoryChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={dynamicStyles.inventoryGrid}>
            {filteredInventory.length === 0 ? (
              <View style={dynamicStyles.emptyInventory}>
                <Package color={colors.textLight} size={40} />
                <Text style={dynamicStyles.emptyInventoryText}>No items available</Text>
                <Text style={dynamicStyles.emptyInventorySubtext}>
                  Purchase items from the marketplace
                </Text>
              </View>
            ) : (
              filteredInventory.slice(0, 6).map((item) => {
                const previewItem: Item3DPreviewItem = {
                  id: item.id,
                  name: item.name,
                  imageUrl: item.imageUrl,
                  category: item.category,
                };
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={dynamicStyles.inventoryItem}
                    onPress={() => handlePlaceItem(item.id)}
                  >
                    <Item3DPreview
                      item={previewItem}
                      size={(SCREEN_WIDTH - 32 - 24) / 3 - 16}
                      initialAngle={viewMode === '3d' ? 'isometric' : 'top'}
                      showControls={false}
                    />
                    <Text style={dynamicStyles.inventoryItemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      <Modal
        visible={showInventoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInventoryModal(false)}
      >
        <View style={[dynamicStyles.modalContainer, { paddingTop: insets.top }]}>
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>Place Item</Text>
            <TouchableOpacity onPress={() => setShowInventoryModal(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={dynamicStyles.modalCategoryContent}
          >
            {ITEM_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.value;
              
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[dynamicStyles.categoryChip, isSelected && dynamicStyles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat.value)}
                >
                  <Icon color={isSelected ? '#FFFFFF' : colors.textSecondary} size={16} />
                  <Text
                    style={[
                      dynamicStyles.categoryChipText,
                      isSelected && dynamicStyles.categoryChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView
            style={dynamicStyles.modalContent}
            contentContainerStyle={dynamicStyles.modalInventoryGrid}
          >
            {filteredInventory.length === 0 ? (
              <View style={dynamicStyles.emptyModalInventory}>
                <Package color={colors.textLight} size={48} />
                <Text style={dynamicStyles.emptyModalText}>No items in this category</Text>
              </View>
            ) : (
              filteredInventory.map((item) => {
                const itemDef = getItemDefinition(item.itemId);
                const previewItem: Item3DPreviewItem = {
                  id: item.id,
                  name: item.name,
                  imageUrl: item.imageUrl,
                  category: item.category,
                  preview3D: itemDef?.preview3D,
                  modelColor: itemDef?.modelColor,
                  size: itemDef?.size,
                };
                const has3D = !!itemDef?.preview3D;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={dynamicStyles.modalInventoryItem}
                    onPress={() => handlePlaceItem(item.id)}
                  >
                    <Item3DPreview
                      item={previewItem}
                      size={60}
                      initialAngle="isometric"
                      showControls={has3D}
                    />
                    <View style={dynamicStyles.modalItemInfo}>
                      <Text style={dynamicStyles.modalItemName}>{item.name}</Text>
                      <Text style={dynamicStyles.modalItemCategory}>{item.category}</Text>
                      {has3D && (
                        <View style={dynamicStyles.has3DBadge}>
                          <Box color="#10B981" size={10} />
                          <Text style={dynamicStyles.has3DBadgeText}>3D Preview</Text>
                        </View>
                      )}
                    </View>
                    <View style={dynamicStyles.modalPlaceButton}>
                      <Plus color="#FFFFFF" size={18} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showExitConfirmModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowExitConfirmModal(false)}
      >
        <View style={dynamicStyles.exitModalOverlay}>
          <View style={dynamicStyles.exitModalContent}>
            <View style={dynamicStyles.exitModalIcon}>
              <AlertCircle color="#F59E0B" size={32} />
            </View>
            <Text style={dynamicStyles.exitModalTitle}>Unsaved Changes</Text>
            <Text style={dynamicStyles.exitModalMessage}>
              You have unsaved changes. Would you like to save before leaving?
            </Text>
            <View style={dynamicStyles.exitModalActions}>
              <TouchableOpacity
                style={dynamicStyles.exitModalButtonDiscard}
                onPress={() => handleExitEditMode(false)}
              >
                <Text style={dynamicStyles.exitModalButtonDiscardText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={dynamicStyles.exitModalButtonSave}
                onPress={() => {
                  handleSave();
                  handleExitEditMode(true);
                }}
              >
                <Text style={dynamicStyles.exitModalButtonSaveText}>Save & Exit</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={dynamicStyles.exitModalCancel}
              onPress={() => setShowExitConfirmModal(false)}
            >
              <Text style={dynamicStyles.exitModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    headerCenter: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 12,
      gap: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    unsavedBadge: {
      backgroundColor: '#F59E0B20',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    unsavedBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#F59E0B',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    viewModeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      gap: 4,
    },
    viewModeToggleActive: {
      backgroundColor: colors.primary,
    },
    viewModeText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textLight,
    },
    viewModeTextActive: {
      color: '#FFFFFF',
    },
    gridToggle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    gridToggleActive: {
      backgroundColor: colors.primary,
    },
    controlsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    undoRedoControls: {
      flexDirection: 'row',
      gap: 8,
    },
    controlButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    controlButtonDisabled: {
      opacity: 0.5,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      gap: 6,
    },
    saveButtonSaving: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    roomTabsContainer: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    roomTabsContent: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    roomTab: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    roomTabActive: {
      backgroundColor: colors.primary,
    },
    roomTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    roomTabTextActive: {
      color: '#FFFFFF',
    },
    roomTabCapacity: {
      fontSize: 10,
      color: colors.textLight,
      marginTop: 2,
    },
    roomTabCapacityActive: {
      color: 'rgba(255,255,255,0.8)',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
    },
    noRoomSelected: {
      height: ROOM_PREVIEW_SIZE,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noRoomText: {
      fontSize: 15,
      color: colors.textLight,
    },
    selectedItemControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      padding: 14,
      borderRadius: 12,
      marginTop: 16,
    },
    selectedItemInfo: {
      flex: 1,
    },
    selectedItemName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    selectedItemPosition: {
      fontSize: 12,
      color: colors.textLight,
      marginTop: 2,
    },
    selectedItemActions: {
      flexDirection: 'row',
      gap: 8,
    },
    itemActionButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    itemActionButtonDanger: {
      backgroundColor: '#EF444420',
    },
    inventorySection: {
      marginTop: 24,
    },
    inventorySectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    addItemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
    },
    addItemButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
    },
    categoryFilterContent: {
      paddingBottom: 12,
      gap: 8,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: colors.surface,
      gap: 6,
    },
    categoryChipActive: {
      backgroundColor: colors.primary,
    },
    categoryChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    categoryChipTextActive: {
      color: '#FFFFFF',
    },
    inventoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    emptyInventory: {
      width: '100%',
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyInventoryText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginTop: 12,
    },
    emptyInventorySubtext: {
      fontSize: 13,
      color: colors.textLight,
      marginTop: 4,
    },
    inventoryItem: {
      width: (SCREEN_WIDTH - 32 - 24) / 3,
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      padding: 8,
      alignItems: 'center',
    },
    inventoryItemImage: {
      width: '100%',
      aspectRatio: 1,
    },
    inventoryItemName: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.text,
      padding: 8,
      textAlign: 'center',
    },
    ineligibleContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    ineligibleIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#F59E0B20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    ineligibleTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    ineligibleMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    ineligibleActionButton: {
      marginTop: 24,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
    },
    ineligibleActionText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
    noHomeContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    noHomeTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
    },
    noHomeMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    createHomeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 20,
      marginTop: 24,
      gap: 8,
    },
    createHomeButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    modalCategoryContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    modalContent: {
      flex: 1,
    },
    modalInventoryGrid: {
      padding: 16,
      gap: 12,
    },
    emptyModalInventory: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyModalText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
    },
    modalInventoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 12,
    },
    modalItemImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
    },
    modalItemInfo: {
      flex: 1,
      marginLeft: 12,
    },
    modalItemName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    modalItemCategory: {
      fontSize: 12,
      color: colors.textLight,
      marginTop: 2,
      textTransform: 'capitalize',
    },
    has3DBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 4,
    },
    has3DBadgeText: {
      fontSize: 10,
      color: '#10B981',
      fontWeight: '500' as const,
    },
    modalPlaceButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exitModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    exitModalContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      alignItems: 'center',
    },
    exitModalIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#F59E0B20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    exitModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    exitModalMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    exitModalActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    exitModalButtonDiscard: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
    },
    exitModalButtonDiscardText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    exitModalButtonSave: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    exitModalButtonSaveText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    exitModalCancel: {
      marginTop: 16,
      paddingVertical: 8,
    },
    exitModalCancelText: {
      fontSize: 14,
      color: colors.textLight,
    },
  });
