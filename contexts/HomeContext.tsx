import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { LifestyleStats } from '@/types/game';
import { homeManager, HomeManagerState, PlaceItemParams } from '@/utils/homeManager';
import { visitorSystem, VisitorSystemState, PublicHomeEntry, VisitHistoryEntry } from '@/utils/visitorSystem';
import { itemPlacementSystem, ItemPlacementState, ItemDefinition, SAMPLE_ITEM_DEFINITIONS, PlacementHistoryEntry } from '@/utils/itemPlacementSystem';
import { HomeData, VisitorData, HOME_TIERS, getHomeTierConfig, InternalHomeData, InternalPlacedItem, RoomData, Vector3 } from '@/types/home';
import { trpc } from '@/lib/trpc';
import { useHomeRealtimeSubscriptions } from '@/hooks/useHomeRealtimeSubscriptions';
import { useHomeServices, ServiceError } from '@/hooks/useHomeServices';
import { useHomeUndoRedo, createStateSnapshot, HomeEditState } from '@/hooks/useHomeUndoRedo';
import { useHomeIntegration } from '@/hooks/useHomeIntegration';

const HOME_STORAGE_KEY = 'credit_life_home_data';
const HOME_INVENTORY_KEY = 'credit_life_home_inventory';
const HOME_SETTINGS_KEY = 'credit_life_home_settings';

export interface HomeInventoryItem {
  id: string;
  itemId: string;
  name: string;
  category: 'furniture' | 'decor' | 'electronics' | 'appliance' | 'storage' | 'lighting';
  purchasedAt: string;
  price: number;
  imageUrl: string;
  isPlaced: boolean;
}

export interface EditModeState {
  isEditing: boolean;
  isVisiting: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  autoSaveEnabled: boolean;
}

export interface RoomState {
  selectedRoom: string | null;
  roomList: RoomData[];
  roomVisibility: Record<string, boolean>;
}

export interface ItemState {
  selectedItem: ItemDefinition | null;
  selectedPlacedItem: InternalPlacedItem | null;
  placedItems: InternalPlacedItem[];
  highlightedItemId: string | null;
}

export interface UndoRedoState {
  history: PlacementHistoryEntry[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  futureLength: number;
}

export interface VisitorState {
  currentVisitors: VisitorData[];
  visitHistory: VisitHistoryEntry[];
  isHosting: boolean;
  maxVisitors: number;
  visitorCount: number;
}

export interface LoadingState {
  isInitializing: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isUpgrading: boolean;
}

export interface ErrorState {
  error: string | null;
  lastError: string | null;
  errorTimestamp: number | null;
  serviceError: ServiceError | null;
}

export interface RealtimeState {
  isConnected: boolean;
  lastEvent: {
    type: string;
    action: string;
    timestamp: number;
  } | null;
}

export interface HomeContextState {
  homeManagerState: HomeManagerState;
  visitorSystemState: VisitorSystemState;
  placementState: ItemPlacementState;
  homeInventory: HomeInventoryItem[];
  isInitialized: boolean;
  editMode: EditModeState;
  roomState: RoomState;
  itemState: ItemState;
  undoRedoState: UndoRedoState;
  visitorState: VisitorState;
  loadingState: LoadingState;
  errorState: ErrorState;
  realtimeState: RealtimeState;
}



export const [HomeProvider, useHome] = createContextHook(() => {
  const auth = useAuth();
  const game = useGame();
  const queryClient = useQueryClient();
  const playerId = game?.gameState?.playerId || auth?.user?.id;
  
  const integration = useHomeIntegration();
  
  const createHomeMutation = trpc.homes.createHome.useMutation();
  const updateHomeMutation = trpc.homes.updateHome.useMutation();
  const recordVisitMutation = trpc.homes.recordVisit.useMutation();

  const currentHomeId = useRef<string | null>(null);

  const [homeManagerState, setHomeManagerState] = useState<HomeManagerState>(homeManager.getState());
  const [visitorSystemState, setVisitorSystemState] = useState<VisitorSystemState>(visitorSystem.getState());
  const [placementState, setPlacementState] = useState<ItemPlacementState>(itemPlacementSystem.getState());
  const [homeInventory, setHomeInventory] = useState<HomeInventoryItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const [editMode, setEditMode] = useState<EditModeState>({
    isEditing: false,
    isVisiting: false,
    hasUnsavedChanges: false,
    lastSavedAt: null,
    autoSaveEnabled: true,
  });

  const [roomState, setRoomState] = useState<RoomState>({
    selectedRoom: null,
    roomList: [],
    roomVisibility: {},
  });

  const [itemState, setItemState] = useState<ItemState>({
    selectedItem: null,
    selectedPlacedItem: null,
    placedItems: [],
    highlightedItemId: null,
  });

  const [undoRedoState] = useState<UndoRedoState>({
    history: [],
    historyIndex: -1,
    canUndo: false,
    canRedo: false,
    historyLength: 0,
    futureLength: 0,
  });

  const handleStateRestore = useCallback((state: HomeEditState) => {
    console.log('[HomeContext] Restoring state from undo/redo');
    const currentHome = homeManager.getCurrentHome();
    if (currentHome) {
      const restoredHome: InternalHomeData = {
        ...currentHome,
        placedItems: state.placedItems,
        rooms: state.rooms,
        updatedAt: new Date().toISOString(),
      };
      homeManager.loadHome(restoredHome);
    }
  }, []);

  const undoRedoHook = useHomeUndoRedo(
    playerId,
    homeManagerState.currentHome
      ? createStateSnapshot(
          homeManagerState.currentHome.placedItems,
          homeManagerState.currentHome.rooms
        )
      : null,
    handleStateRestore
  );

  const [visitorState, setVisitorState] = useState<VisitorState>({
    currentVisitors: [],
    visitHistory: [],
    isHosting: false,
    maxVisitors: 0,
    visitorCount: 0,
  });

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isInitializing: true,
    isLoading: false,
    isSaving: false,
    isUpgrading: false,
  });

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    lastError: null,
    errorTimestamp: null,
    serviceError: null,
  });

  const [realtimeState, setRealtimeState] = useState<RealtimeState>({
    isConnected: false,
    lastEvent: null,
  });

  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef<string | null>(null);

  const homeServices = useHomeServices(playerId, currentHomeId.current ?? undefined);

  const realtimeSubscriptions = useHomeRealtimeSubscriptions(
    currentHomeId.current ?? undefined,
    {
      onHomeUpdate: useCallback((payload) => {
        console.log('[HomeContext] Realtime home update received:', payload.eventType);
        setRealtimeState(prev => ({
          ...prev,
          lastEvent: {
            type: 'home_update',
            action: payload.eventType,
            timestamp: Date.now(),
          },
        }));
      }, []),
      onRoomUpdate: useCallback((payload) => {
        console.log('[HomeContext] Realtime room update received:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['homeRooms'] });
      }, [queryClient]),
      onItemUpdate: useCallback((payload) => {
        console.log('[HomeContext] Realtime item update received:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['homeItems'] });
      }, [queryClient]),
      onVisitorUpdate: useCallback((payload) => {
        console.log('[HomeContext] Realtime visitor update received:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['activeVisitors'] });
      }, [queryClient]),
      onError: useCallback((error) => {
        console.error('[HomeContext] Realtime subscription error:', error);
        setErrorState(prev => ({
          ...prev,
          error: `Realtime connection error: ${error}`,
          errorTimestamp: Date.now(),
        }));
      }, []),
      enabled: !!currentHomeId.current,
    }
  );

  useEffect(() => {
    setRealtimeState(prev => ({
      ...prev,
      isConnected: realtimeSubscriptions.isConnected,
    }));
  }, [realtimeSubscriptions.isConnected]);

  useEffect(() => {
    homeManager.setOnStateChange((state) => {
      setHomeManagerState(state);
      if (state.currentHome) {
        setRoomState(prev => {
          const rooms = state.currentHome!.rooms;
          const visibility: Record<string, boolean> = {};
          rooms.forEach(room => {
            visibility[room.roomName] = true;
          });
          return {
            ...prev,
            roomList: rooms,
            roomVisibility: visibility,
            selectedRoom: prev.selectedRoom || (rooms.length > 0 ? rooms[0].roomName : null),
          };
        });
        setItemState(prev => ({
          ...prev,
          placedItems: state.currentHome?.placedItems || [],
        }));
      }
    });
    visitorSystem.setOnStateChange((state) => {
      setVisitorSystemState(state);
      const visitors = Array.from(state.visitorPositions.values()).map(pos => ({
        visitorId: pos.visitorId,
        visitorName: 'Visitor',
        visitStartTime: state.visitStartTime || new Date().toISOString(),
        isOnline: true,
      }));
      setVisitorState(prev => ({
        ...prev,
        currentVisitors: visitors,
        isHosting: state.isHost,
        visitorCount: visitors.length,
      }));
    });
    itemPlacementSystem.setOnStateChange((state) => {
      setPlacementState(state);
    });

    itemPlacementSystem.registerItemDefinitions(SAMPLE_ITEM_DEFINITIONS);

    return () => {
      homeManager.setOnStateChange(() => {});
      visitorSystem.setOnStateChange(() => {});
      itemPlacementSystem.setOnStateChange(() => {});
    };
  }, []);


  useEffect(() => {
    if (!playerId) return;

    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      const loadHomeData = async () => {
        try {
          console.log('[HomeContext] Loading home data for player:', playerId);
          setLoadingState(prev => ({ ...prev, isInitializing: true }));

          const savedHome = await AsyncStorage.getItem(`${HOME_STORAGE_KEY}_${playerId}`);
          if (savedHome) {
            const homeData = JSON.parse(savedHome) as InternalHomeData;
            homeManager.loadHome(homeData);
            snapshotRef.current = savedHome;
            currentHomeId.current = homeData.homeId;
            console.log('[HomeContext] Loaded existing home:', homeData.homeId);
          }

          const savedInventory = await AsyncStorage.getItem(`${HOME_INVENTORY_KEY}_${playerId}`);
          if (savedInventory) {
            setHomeInventory(JSON.parse(savedInventory));
            console.log('[HomeContext] Loaded home inventory');
          }

          const savedSettings = await AsyncStorage.getItem(`${HOME_SETTINGS_KEY}_${playerId}`);
          if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            setEditMode(prev => ({
              ...prev,
              autoSaveEnabled: settings.autoSaveEnabled ?? true,
            }));
          }

          setIsInitialized(true);
          setLoadingState(prev => ({ ...prev, isInitializing: false }));
        } catch (error) {
          console.error('[HomeContext] Error loading home data:', error);
          setErrorState(prev => ({
            ...prev,
            error: 'Failed to load home data',
            lastError: prev.error,
            errorTimestamp: Date.now(),
          }));
          setIsInitialized(true);
          setLoadingState(prev => ({ ...prev, isInitializing: false }));
        }
      };

      loadHomeData();
    });

    return () => interactionHandle.cancel();
  }, [playerId]);

  const saveHomeData = useCallback(async () => {
    if (!playerId) return;

    const currentHome = homeManager.getCurrentHome();
    if (currentHome) {
      try {
        setLoadingState(prev => ({ ...prev, isSaving: true }));
        const homeJson = JSON.stringify(currentHome);
        
        await AsyncStorage.setItem(`${HOME_STORAGE_KEY}_${playerId}`, homeJson);
        
        snapshotRef.current = homeJson;
        setEditMode(prev => ({
          ...prev,
          hasUnsavedChanges: false,
          lastSavedAt: new Date().toISOString(),
        }));
        
        console.log('[HomeContext] Home data saved');
        setLoadingState(prev => ({ ...prev, isSaving: false }));
      } catch (error) {
        console.error('[HomeContext] Error saving home data:', error);
        setErrorState(prev => ({
          ...prev,
          error: 'Failed to save home data',
          lastError: prev.error,
          errorTimestamp: Date.now(),
        }));
        setLoadingState(prev => ({ ...prev, isSaving: false }));
      }
    }
  }, [playerId]);

  const saveInventory = useCallback(async () => {
    if (!playerId) return;

    try {
      await AsyncStorage.setItem(
        `${HOME_INVENTORY_KEY}_${playerId}`,
        JSON.stringify(homeInventory)
      );
      console.log('[HomeContext] Inventory saved');
    } catch (error) {
      console.error('[HomeContext] Error saving inventory:', error);
    }
  }, [playerId, homeInventory]);

  const checkForUnsavedChanges = useCallback(() => {
    const currentHome = homeManager.getCurrentHome();
    if (!currentHome || !snapshotRef.current) return false;
    
    const currentJson = JSON.stringify(currentHome);
    return currentJson !== snapshotRef.current;
  }, []);

  useEffect(() => {
    if (isInitialized && homeManagerState.currentHome) {
      const hasChanges = checkForUnsavedChanges();
      
      if (hasChanges !== editMode.hasUnsavedChanges) {
        setEditMode(prev => ({ ...prev, hasUnsavedChanges: hasChanges }));
      }

      if (editMode.autoSaveEnabled && hasChanges) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(() => {
          saveHomeData();
        }, 5000);
      }
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [homeManagerState.currentHome, isInitialized, editMode.autoSaveEnabled, checkForUnsavedChanges, saveHomeData, editMode.hasUnsavedChanges]);

  useEffect(() => {
    if (isInitialized && homeInventory.length > 0) {
      saveInventory();
    }
  }, [homeInventory, isInitialized, saveInventory]);

  const setError = useCallback((error: string | null) => {
    setErrorState(prev => ({
      ...prev,
      error,
      lastError: prev.error,
      errorTimestamp: error ? Date.now() : null,
    }));
  }, []);

  const setServiceError = useCallback((serviceError: ServiceError | null) => {
    setErrorState(prev => ({
      ...prev,
      serviceError,
      error: serviceError?.message || null,
      errorTimestamp: serviceError ? Date.now() : null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      error: null,
      serviceError: null,
    }));
    homeServices.clearAllErrors();
  }, [homeServices]);

  const retryLastOperation = useCallback(async () => {
    console.log('[HomeContext] Retrying last operation');
    clearError();
    if (homeServices.homeManager.homeError) {
      await homeServices.homeManager.refetchHome();
    }
  }, [clearError, homeServices.homeManager]);

  const enterEditMode = useCallback(() => {
    console.log('[HomeContext] Entering edit mode');
    itemPlacementSystem.setOwnership(true);
    setEditMode(prev => ({ ...prev, isEditing: true, isVisiting: false }));
    
    const currentHome = homeManager.getCurrentHome();
    if (currentHome) {
      integration.analytics.trackEditSessionStarted(currentHome.homeId);
    }
  }, [integration.analytics]);

  const exitEditMode = useCallback(async (saveChanges: boolean = true) => {
    console.log('[HomeContext] Exiting edit mode, save:', saveChanges);
    
    integration.analytics.trackEditSessionEnded();
    
    if (saveChanges && editMode.hasUnsavedChanges) {
      await saveHomeData();
    }
    
    itemPlacementSystem.exitPlacementMode();
    setEditMode(prev => ({ ...prev, isEditing: false }));
    setItemState(prev => ({
      ...prev,
      selectedItem: null,
      selectedPlacedItem: null,
      highlightedItemId: null,
    }));
  }, [editMode.hasUnsavedChanges, saveHomeData, integration.analytics]);

  const selectRoom = useCallback((roomName: string | null) => {
    console.log('[HomeContext] Selecting room:', roomName);
    setRoomState(prev => ({ ...prev, selectedRoom: roomName }));
    
    if (placementState.mode !== 'idle') {
      itemPlacementSystem.exitPlacementMode();
    }
  }, [placementState.mode]);

  const setRoomVisibility = useCallback((roomName: string, visible: boolean) => {
    setRoomState(prev => ({
      ...prev,
      roomVisibility: { ...prev.roomVisibility, [roomName]: visible },
    }));
  }, []);

  const selectItem = useCallback((item: ItemDefinition | null) => {
    setItemState(prev => ({
      ...prev,
      selectedItem: item,
      selectedPlacedItem: null,
    }));
  }, []);

  const selectPlacedItem = useCallback((item: InternalPlacedItem | null) => {
    setItemState(prev => ({
      ...prev,
      selectedPlacedItem: item,
      highlightedItemId: item?.id || null,
    }));
  }, []);

  const highlightItem = useCallback((itemId: string | null) => {
    setItemState(prev => ({ ...prev, highlightedItemId: itemId }));
  }, []);

  const setAutoSave = useCallback(async (enabled: boolean) => {
    setEditMode(prev => ({ ...prev, autoSaveEnabled: enabled }));
    
    if (playerId) {
      await AsyncStorage.setItem(
        `${HOME_SETTINGS_KEY}_${playerId}`,
        JSON.stringify({ autoSaveEnabled: enabled })
      );
    }
  }, [playerId]);

  const createHome = useCallback(async (tier: number = 1): Promise<HomeData | null> => {
    if (!playerId) {
      console.error('[HomeContext] No player ID available');
      setError('No player ID available');
      return null;
    }

    const validation = integration.validation.canCreateHome(tier);
    if (!validation.canCreate) {
      console.error('[HomeContext] Cannot create home:', validation.errors);
      setError(validation.errors[0] || 'Cannot create home');
      return null;
    }

    try {
      setLoadingState(prev => ({ ...prev, isLoading: true }));
      const home = await homeManager.createHome(playerId, tier);
      currentHomeId.current = home.homeId;
      console.log('[HomeContext] Home created locally:', home.homeId);
      
      integration.analytics.trackHomeCreated(home.homeId, tier);
      
      try {
        await createHomeMutation.mutateAsync({
          playerId,
          homeTier: tier,
          rooms: home.rooms as any,
          maxVisitors: home.maxVisitors,
        });
        console.log('[HomeContext] Home synced to Supabase');
      } catch (syncError) {
        console.warn('[HomeContext] Failed to sync home to Supabase:', syncError);
      }
      
      setLoadingState(prev => ({ ...prev, isLoading: false }));
      return home as any;
    } catch (error) {
      console.error('[HomeContext] Error creating home:', error);
      setError('Failed to create home');
      setLoadingState(prev => ({ ...prev, isLoading: false }));
      return null;
    }
  }, [playerId, createHomeMutation, setError, integration.validation, integration.analytics]);

  const upgradeHome = useCallback(async (targetTier: number): Promise<boolean> => {
    const currentHome = homeManager.getCurrentHome();
    if (!currentHome) {
      console.error('[HomeContext] No home to upgrade');
      setError('No home to upgrade');
      return false;
    }

    const currentTier = currentHome.homeTier || 1;
    const validation = integration.validation.canUpgradeHome(currentTier, targetTier);
    if (!validation.canUpgrade) {
      console.error('[HomeContext] Cannot upgrade home:', validation.errors);
      setError(validation.errors[0] || 'Cannot upgrade home');
      return false;
    }

    setLoadingState(prev => ({ ...prev, isUpgrading: true }));

    const upgradedHome = await homeManager.upgradeHome(targetTier);
    if (upgradedHome) {
      integration.economy.deductBalance(validation.cost);
      integration.analytics.trackHomeUpgraded(currentHome.homeId, currentTier, targetTier);
      integration.notifications.sendTierUpgradeNotification(targetTier);
      console.log('[HomeContext] Home upgraded to tier:', targetTier);
      setLoadingState(prev => ({ ...prev, isUpgrading: false }));
      return true;
    }

    setLoadingState(prev => ({ ...prev, isUpgrading: false }));
    return false;
  }, [setError, integration.validation, integration.economy, integration.analytics, integration.notifications]);

  const purchaseHomeItem = useCallback(async (
    itemDefinition: ItemDefinition,
    price: number
  ): Promise<boolean> => {
    const validation = integration.validation.canPurchaseItem(price);
    if (!validation.canPurchase) {
      console.error('[HomeContext] Cannot purchase item:', validation.errors);
      setError(validation.errors[0] || 'Cannot purchase item');
      return false;
    }

    const inventoryItem: HomeInventoryItem = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemId: itemDefinition.id,
      name: itemDefinition.name,
      category: itemDefinition.category,
      purchasedAt: new Date().toISOString(),
      price,
      imageUrl: itemDefinition.imageUrl,
      isPlaced: false,
    };

    setHomeInventory(prev => [...prev, inventoryItem]);
    integration.economy.deductBalance(price);
    integration.analytics.trackItemPurchased(itemDefinition.id, itemDefinition.name, price);

    console.log('[HomeContext] Purchased home item:', itemDefinition.name);
    return true;
  }, [setError, integration.validation, integration.economy, integration.analytics]);

  const captureStateForUndo = useCallback(() => {
    const currentHome = homeManager.getCurrentHome();
    if (currentHome) {
      const snapshot = createStateSnapshot(currentHome.placedItems, currentHome.rooms);
      undoRedoHook.pushState(snapshot);
      console.log('[HomeContext] State captured for undo');
    }
  }, [undoRedoHook]);

  const placeItemFromInventory = useCallback((
    inventoryItemId: string,
    params: Omit<PlaceItemParams, 'itemId'>
  ): InternalPlacedItem | null => {
    const inventoryItem = homeInventory.find(item => item.id === inventoryItemId);
    if (!inventoryItem) {
      console.error('[HomeContext] Inventory item not found');
      setError('Inventory item not found');
      return null;
    }

    captureStateForUndo();

    const placedItem = homeManager.placeItem({
      ...params,
      itemId: inventoryItem.itemId,
    });

    if (placedItem) {
      setHomeInventory(prev =>
        prev.map(item =>
          item.id === inventoryItemId ? { ...item, isPlaced: true } : item
        )
      );
      console.log('[HomeContext] Item placed from inventory:', inventoryItem.name);
    }

    return placedItem;
  }, [homeInventory, setError, captureStateForUndo]);

  const removeItemToInventory = useCallback((placedItemId: string): boolean => {
    const currentHome = homeManager.getCurrentHome();
    if (!currentHome) return false;

    const placedItem = (currentHome as InternalHomeData).placedItems.find((item: InternalPlacedItem) => item.id === placedItemId);
    if (!placedItem) return false;

    captureStateForUndo();

    const success = homeManager.removeItem(placedItemId);
    if (success) {
      setHomeInventory(prev =>
        prev.map(item =>
          item.itemId === placedItem.itemId && item.isPlaced
            ? { ...item, isPlaced: false }
            : item
        )
      );
      console.log('[HomeContext] Item returned to inventory');
    }

    return success;
  }, [captureStateForUndo]);

  const moveItem = useCallback((itemId: string, newPosition: Vector3, newRotation?: Vector3): boolean => {
    captureStateForUndo();
    return homeManager.moveItem(itemId, newPosition, newRotation);
  }, [captureStateForUndo]);

  const browsePublicHomes = useCallback(async (): Promise<PublicHomeEntry[]> => {
    setLoadingState(prev => ({ ...prev, isLoading: true }));
    const homes = await visitorSystem.browsePublicHomes();
    setLoadingState(prev => ({ ...prev, isLoading: false }));
    return homes;
  }, []);

  const visitHome = useCallback(async (
    homeId: string,
    visitorName: string
  ): Promise<boolean> => {
    if (!playerId) return false;
    
    setEditMode(prev => ({ ...prev, isVisiting: true, isEditing: false }));
    const success = await visitorSystem.visitHome(homeId, playerId, visitorName);
    
    if (success) {
      try {
        await recordVisitMutation.mutateAsync({
          homeId,
          visitorId: playerId,
          visitorName,
        });
        console.log('[HomeContext] Visit recorded to Supabase');
      } catch (error) {
        console.warn('[HomeContext] Failed to record visit to Supabase:', error);
      }
    } else {
      setEditMode(prev => ({ ...prev, isVisiting: false }));
    }
    
    return success;
  }, [playerId, recordVisitMutation]);

  const leaveVisit = useCallback((): VisitHistoryEntry | null => {
    if (!playerId) return null;
    const entry = visitorSystem.leaveVisit(playerId);
    
    if (entry) {
      setVisitorState(prev => ({
        ...prev,
        visitHistory: [...prev.visitHistory, entry],
      }));
    }
    
    setEditMode(prev => ({ ...prev, isVisiting: false }));
    return entry;
  }, [playerId]);

  const setHomePublic = useCallback((isPublic: boolean): void => {
    homeManager.setHomePublic(isPublic);
    
    const currentHome = homeManager.getCurrentHome();
    if (currentHome) {
      integration.analytics.trackPrivacyChanged(currentHome.homeId, isPublic);
      updateHomeMutation.mutate({
        homeId: currentHome.homeId,
        updates: { isPublic },
      });
    }
  }, [updateHomeMutation, integration.analytics]);

  const hostSession = useCallback((): boolean => {
    const success = visitorSystem.hostSession();
    if (success) {
      setVisitorState(prev => ({ ...prev, isHosting: true }));
    }
    return success;
  }, []);

  const endHostSession = useCallback((): VisitorData[] => {
    const visitors = visitorSystem.endHostSession();
    setVisitorState(prev => ({ ...prev, isHosting: false, currentVisitors: [] }));
    return visitors;
  }, []);

  const enterPlacementMode = useCallback((
    itemDefinition: ItemDefinition,
    roomName: string
  ): boolean => {
    if (!editMode.isEditing) {
      console.warn('[HomeContext] Must be in edit mode to place items');
      return false;
    }
    itemPlacementSystem.setOwnership(true);
    return itemPlacementSystem.enterPlacementMode(itemDefinition, roomName);
  }, [editMode.isEditing]);

  const exitPlacementMode = useCallback((): void => {
    itemPlacementSystem.exitPlacementMode();
  }, []);

  const confirmPlacement = useCallback((): InternalPlacedItem | null => {
    return itemPlacementSystem.confirmPlacement();
  }, []);

  const undoPlacement = useCallback((): boolean => {
    const result = undoRedoHook.undo();
    if (result) {
      console.log('[HomeContext] Undo successful');
      return true;
    }
    return itemPlacementSystem.undo();
  }, [undoRedoHook]);

  const redoPlacement = useCallback((): boolean => {
    const result = undoRedoHook.redo();
    if (result) {
      console.log('[HomeContext] Redo successful');
      return true;
    }
    return itemPlacementSystem.redo();
  }, [undoRedoHook]);

  const discardChanges = useCallback(() => {
    if (snapshotRef.current && playerId) {
      const savedHome = JSON.parse(snapshotRef.current) as InternalHomeData;
      homeManager.loadHome(savedHome);
      itemPlacementSystem.clearHistory();
      undoRedoHook.clearHistory();
      setEditMode(prev => ({ ...prev, hasUnsavedChanges: false }));
      console.log('[HomeContext] Changes discarded, reverted to last save');
    }
  }, [playerId, undoRedoHook]);

  const currentHome = useMemo(() => {
    return homeManagerState.currentHome;
  }, [homeManagerState.currentHome]);

  const hasHome = useMemo(() => {
    return homeManagerState.currentHome !== null;
  }, [homeManagerState.currentHome]);

  const homeStats = useMemo(() => {
    return homeManager.getHomeStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeManagerState.currentHome]);

  const availableInventory = useMemo(() => {
    return homeInventory.filter(item => !item.isPlaced);
  }, [homeInventory]);

  const placedInventory = useMemo(() => {
    return homeInventory.filter(item => item.isPlaced);
  }, [homeInventory]);

  const isVisiting = useMemo(() => {
    return visitorSystemState.status === 'visiting' && !visitorSystemState.isHost;
  }, [visitorSystemState.status, visitorSystemState.isHost]);

  const isHosting = useMemo(() => {
    return visitorSystemState.status === 'visiting' && visitorSystemState.isHost;
  }, [visitorSystemState.status, visitorSystemState.isHost]);

  const housingType = useMemo((): LifestyleStats['housingType'] => {
    return game?.gameState?.lifestyle?.housingType || 'homeless';
  }, [game?.gameState?.lifestyle?.housingType]);

  const canAccessHomeEditor = useMemo(() => {
    return housingType === 'renting';
  }, [housingType]);

  const isSharedRental = useMemo(() => {
    return housingType === 'shared_rental';
  }, [housingType]);

  const isPropertyOwner = useMemo(() => {
    return housingType === 'owns_condo' || housingType === 'owns_house' || housingType === 'owns_luxury';
  }, [housingType]);

  const isHomeless = useMemo(() => {
    return housingType === 'homeless';
  }, [housingType]);

  const getHousingStatusText = useCallback((): string => {
    switch (housingType) {
      case 'renting':
        return game?.gameState?.lifestyle?.housingName || 'Renting';
      case 'shared_rental':
        return 'Shared Rental';
      case 'owns_condo':
        return game?.gameState?.lifestyle?.housingName || 'Condo Owner';
      case 'owns_house':
        return game?.gameState?.lifestyle?.housingName || 'Homeowner';
      case 'owns_luxury':
        return game?.gameState?.lifestyle?.housingName || 'Luxury Property Owner';
      case 'homeless':
      default:
        return 'No current housing';
    }
  }, [housingType, game?.gameState?.lifestyle?.housingName]);

  const getHomeEditorEligibilityMessage = useCallback((): { eligible: boolean; message: string; actionLabel?: string } => {
    if (canAccessHomeEditor) {
      return { eligible: true, message: 'You can customize your rented home.' };
    }
    
    if (isSharedRental) {
      return {
        eligible: false,
        message: 'The Home Editor is not available for shared rental homes. You need to rent your own place to access this feature.',
      };
    }
    
    if (isHomeless) {
      return {
        eligible: false,
        message: 'You need to rent a home first to access the Home Editor.',
        actionLabel: 'Browse Rentals',
      };
    }
    
    if (isPropertyOwner) {
      return {
        eligible: false,
        message: 'The Home Editor is designed for rented homes. As a property owner, you have full control over your property through the Real Estate section.',
      };
    }
    
    return { eligible: false, message: 'Home Editor unavailable.' };
  }, [canAccessHomeEditor, isSharedRental, isHomeless, isPropertyOwner]);

  const visitDuration = useMemo(() => {
    return visitorSystem.formatDuration(visitorSystemState.visitDuration);
  }, [visitorSystemState.visitDuration]);

  const getUpgradeCost = useCallback((targetTier: number): number => {
    return homeManager.getUpgradeCost(targetTier);
  }, []);

  const canUpgrade = useCallback((targetTier: number): boolean => {
    if (!game) return false;
    return homeManager.canUpgrade(targetTier, game.gameState.bankBalance);
  }, [game]);

  const getItemDefinition = useCallback((itemId: string): ItemDefinition | undefined => {
    return itemPlacementSystem.getItemDefinition(itemId);
  }, []);

  const getItemsInRoom = useCallback((roomName: string): InternalPlacedItem[] => {
    return homeManager.getItemsInRoom(roomName);
  }, []);

  const getRoomCapacity = useCallback((roomName: string) => {
    return homeManager.getRoomCapacity(roomName);
  }, []);

  const resetHome = useCallback(async (): Promise<void> => {
    homeManager.reset();
    visitorSystem.reset();
    itemPlacementSystem.reset();
    setHomeInventory([]);
    snapshotRef.current = null;

    setEditMode({
      isEditing: false,
      isVisiting: false,
      hasUnsavedChanges: false,
      lastSavedAt: null,
      autoSaveEnabled: true,
    });

    setRoomState({
      selectedRoom: null,
      roomList: [],
      roomVisibility: {},
    });

    setItemState({
      selectedItem: null,
      selectedPlacedItem: null,
      placedItems: [],
      highlightedItemId: null,
    });

    if (playerId) {
      await AsyncStorage.removeItem(`${HOME_STORAGE_KEY}_${playerId}`);
      await AsyncStorage.removeItem(`${HOME_INVENTORY_KEY}_${playerId}`);
      await AsyncStorage.removeItem(`${HOME_SETTINGS_KEY}_${playerId}`);
    }

    console.log('[HomeContext] Home data reset');
  }, [playerId]);

  return {
    currentHome,
    hasHome,
    homeStats,
    homeInventory,
    availableInventory,
    placedInventory,
    isInitialized,
    homeManagerState,
    visitorSystemState,
    placementState,
    isVisiting,
    isHosting,
    visitDuration,
    housingType,
    canAccessHomeEditor,
    isSharedRental,
    isPropertyOwner,
    isHomeless,
    
    editMode,
    roomState,
    itemState,
    undoRedoState: {
      ...undoRedoState,
      canUndo: undoRedoHook.canUndo || undoRedoState.canUndo,
      canRedo: undoRedoHook.canRedo || undoRedoState.canRedo,
      historyLength: undoRedoHook.historyLength,
      futureLength: undoRedoHook.futureLength,
    },
    visitorState,
    loadingState,
    errorState,
    realtimeState,
    
    homeServices,
    realtimeSubscriptions,
    
    getHousingStatusText,
    getHomeEditorEligibilityMessage,
    HOME_TIERS,
    getHomeTierConfig,
    
    createHome,
    upgradeHome,
    getUpgradeCost,
    canUpgrade,
    
    purchaseHomeItem,
    placeItemFromInventory,
    removeItemToInventory,
    moveItem,
    
    browsePublicHomes,
    visitHome,
    leaveVisit,
    setHomePublic,
    hostSession,
    endHostSession,
    
    enterEditMode,
    exitEditMode,
    selectRoom,
    setRoomVisibility,
    selectItem,
    selectPlacedItem,
    highlightItem,
    setAutoSave,
    discardChanges,
    
    enterPlacementMode,
    exitPlacementMode,
    confirmPlacement,
    undoPlacement,
    redoPlacement,
    
    getItemDefinition,
    getItemsInRoom,
    getRoomCapacity,
    
    setError,
    setServiceError,
    clearError,
    retryLastOperation,
    
    resetHome,
    saveHomeData,
    
    integration,
  };
});

export function useHomeEditor() {
  const home = useHome();
  
  return useMemo(() => ({
    isEditing: home.editMode.isEditing,
    hasUnsavedChanges: home.editMode.hasUnsavedChanges,
    lastSavedAt: home.editMode.lastSavedAt,
    autoSaveEnabled: home.editMode.autoSaveEnabled,
    
    selectedRoom: home.roomState.selectedRoom,
    roomList: home.roomState.roomList,
    roomVisibility: home.roomState.roomVisibility,
    
    selectedItem: home.itemState.selectedItem,
    selectedPlacedItem: home.itemState.selectedPlacedItem,
    placedItems: home.itemState.placedItems,
    highlightedItemId: home.itemState.highlightedItemId,
    
    placementState: home.placementState,
    
    canUndo: home.undoRedoState.canUndo,
    canRedo: home.undoRedoState.canRedo,
    
    isSaving: home.loadingState.isSaving,
    
    enterEditMode: home.enterEditMode,
    exitEditMode: home.exitEditMode,
    selectRoom: home.selectRoom,
    setRoomVisibility: home.setRoomVisibility,
    selectItem: home.selectItem,
    selectPlacedItem: home.selectPlacedItem,
    highlightItem: home.highlightItem,
    setAutoSave: home.setAutoSave,
    discardChanges: home.discardChanges,
    
    enterPlacementMode: home.enterPlacementMode,
    exitPlacementMode: home.exitPlacementMode,
    confirmPlacement: home.confirmPlacement,
    
    placeItemFromInventory: home.placeItemFromInventory,
    removeItemToInventory: home.removeItemToInventory,
    moveItem: home.moveItem,
    
    undo: home.undoPlacement,
    redo: home.redoPlacement,
    
    saveHomeData: home.saveHomeData,
    
    getItemDefinition: home.getItemDefinition,
    getItemsInRoom: home.getItemsInRoom,
    getRoomCapacity: home.getRoomCapacity,
  }), [home]);
}

export function useHomeVisitor() {
  const home = useHome();
  
  return useMemo(() => ({
    isVisiting: home.isVisiting,
    isHosting: home.isHosting,
    visitDuration: home.visitDuration,
    
    currentVisitors: home.visitorState.currentVisitors,
    visitHistory: home.visitorState.visitHistory,
    visitorCount: home.visitorState.visitorCount,
    maxVisitors: home.visitorState.maxVisitors,
    
    visitorSystemState: home.visitorSystemState,
    
    publicHomes: home.visitorSystemState.publicHomes,
    
    isLoading: home.loadingState.isLoading,
    
    browsePublicHomes: home.browsePublicHomes,
    visitHome: home.visitHome,
    leaveVisit: home.leaveVisit,
    
    setHomePublic: home.setHomePublic,
    hostSession: home.hostSession,
    endHostSession: home.endHostSession,
  }), [home]);
}

export function useHomeInventory() {
  const home = useHome();
  
  return useMemo(() => ({
    inventory: home.homeInventory,
    availableInventory: home.availableInventory,
    placedInventory: home.placedInventory,
    
    totalItems: home.homeInventory.length,
    availableCount: home.availableInventory.length,
    placedCount: home.placedInventory.length,
    
    purchaseHomeItem: home.purchaseHomeItem,
    placeItemFromInventory: home.placeItemFromInventory,
    removeItemToInventory: home.removeItemToInventory,
    
    getItemDefinition: home.getItemDefinition,
    
    getInventoryByCategory: (category: string) => 
      home.homeInventory.filter(item => item.category === category),
    
    getAvailableByCategory: (category: string) =>
      home.availableInventory.filter(item => item.category === category),
    
    getTotalValue: () =>
      home.homeInventory.reduce((sum, item) => sum + item.price, 0),
    
    getPlacedValue: () =>
      home.placedInventory.reduce((sum, item) => sum + item.price, 0),
  }), [home]);
}
