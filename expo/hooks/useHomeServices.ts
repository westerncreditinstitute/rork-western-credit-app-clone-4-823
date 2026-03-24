import { useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HomeManagerService } from '@/services/HomeManagerService';
import { RoomLayoutService } from '@/services/RoomLayoutService';
import { ItemPlacementService } from '@/services/ItemPlacementService';
import { VisitorService } from '@/services/VisitorService';
import {
  PlayerHome,
  RoomLayout,
  PlacedItem,
  CreateHomeInput,
  UpdateHomeInput,
  CreateRoomInput,
  PlaceItemInput,
  UpdateItemPositionInput,
  VisitHomeInput,
  RateHomeInput,
  PublicHomeListItem,
  HomeDetails,
  HomeTierConfig,
  RoomWithItems,
} from '@/types/home';

export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
}

const createServiceError = (error: unknown, code: string): ServiceError => {
  const message = error instanceof Error ? error.message : 'An unknown error occurred';
  return {
    code,
    message,
    details: error,
    timestamp: Date.now(),
  };
};

export function useHomeManagerService(playerId: string | undefined) {
  const queryClient = useQueryClient();
  const errorRef = useRef<ServiceError | null>(null);

  const playerHomeQuery = useQuery({
    queryKey: ['playerHome', playerId],
    queryFn: async () => {
      if (!playerId) return null;
      console.log('[useHomeManagerService] Fetching player home:', playerId);
      try {
        return await HomeManagerService.getPlayerHome(playerId);
      } catch (error) {
        console.error('[useHomeManagerService] Error fetching player home:', error);
        errorRef.current = createServiceError(error, 'FETCH_HOME_ERROR');
        throw error;
      }
    },
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const homeByIdQuery = useCallback(async (homeId: string): Promise<PlayerHome | null> => {
    console.log('[useHomeManagerService] Fetching home by ID:', homeId);
    try {
      return await HomeManagerService.getHomeById(homeId);
    } catch (error) {
      console.error('[useHomeManagerService] Error fetching home by ID:', error);
      errorRef.current = createServiceError(error, 'FETCH_HOME_BY_ID_ERROR');
      throw error;
    }
  }, []);

  const homeDetailsQuery = useCallback(async (homeId: string): Promise<HomeDetails> => {
    console.log('[useHomeManagerService] Fetching home details:', homeId);
    try {
      return await HomeManagerService.getHomeDetails(homeId);
    } catch (error) {
      console.error('[useHomeManagerService] Error fetching home details:', error);
      errorRef.current = createServiceError(error, 'FETCH_HOME_DETAILS_ERROR');
      throw error;
    }
  }, []);

  const createHomeMutation = useMutation({
    mutationFn: async (input: CreateHomeInput) => {
      console.log('[useHomeManagerService] Creating home:', input);
      try {
        return await HomeManagerService.createHome(input);
      } catch (error) {
        console.error('[useHomeManagerService] Error creating home:', error);
        errorRef.current = createServiceError(error, 'CREATE_HOME_ERROR');
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[useHomeManagerService] Home created successfully:', data.id);
      queryClient.invalidateQueries({ queryKey: ['playerHome', playerId] });
      queryClient.invalidateQueries({ queryKey: ['publicHomes'] });
    },
  });

  const updateHomeMutation = useMutation({
    mutationFn: async (input: UpdateHomeInput) => {
      console.log('[useHomeManagerService] Updating home:', input.homeId);
      try {
        return await HomeManagerService.updateHome(input);
      } catch (error) {
        console.error('[useHomeManagerService] Error updating home:', error);
        errorRef.current = createServiceError(error, 'UPDATE_HOME_ERROR');
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[useHomeManagerService] Home updated successfully');
      queryClient.invalidateQueries({ queryKey: ['playerHome', playerId] });
      queryClient.setQueryData(['home', data.id], data);
    },
  });

  const upgradeHomeMutation = useMutation({
    mutationFn: async ({ homeId, newTier }: { homeId: string; newTier: 1 | 2 | 3 | 4 }) => {
      console.log('[useHomeManagerService] Upgrading home:', homeId, 'to tier:', newTier);
      try {
        return await HomeManagerService.upgradeHomeTier(homeId, newTier);
      } catch (error) {
        console.error('[useHomeManagerService] Error upgrading home:', error);
        errorRef.current = createServiceError(error, 'UPGRADE_HOME_ERROR');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerHome', playerId] });
    },
  });

  const deleteHomeMutation = useMutation({
    mutationFn: async (homeId: string) => {
      console.log('[useHomeManagerService] Deleting home:', homeId);
      try {
        await HomeManagerService.deleteHome(homeId);
      } catch (error) {
        console.error('[useHomeManagerService] Error deleting home:', error);
        errorRef.current = createServiceError(error, 'DELETE_HOME_ERROR');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerHome', playerId] });
      queryClient.invalidateQueries({ queryKey: ['publicHomes'] });
    },
  });

  const publicHomesQuery = useQuery({
    queryKey: ['publicHomes'],
    queryFn: async () => {
      console.log('[useHomeManagerService] Fetching public homes');
      try {
        return await HomeManagerService.getPublicHomes();
      } catch (error) {
        console.error('[useHomeManagerService] Error fetching public homes:', error);
        errorRef.current = createServiceError(error, 'FETCH_PUBLIC_HOMES_ERROR');
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
  });

  const searchPublicHomes = useCallback(async (searchTerm: string, limit?: number): Promise<PublicHomeListItem[]> => {
    console.log('[useHomeManagerService] Searching public homes:', searchTerm);
    try {
      return await HomeManagerService.searchPublicHomes(searchTerm, limit);
    } catch (error) {
      console.error('[useHomeManagerService] Error searching public homes:', error);
      errorRef.current = createServiceError(error, 'SEARCH_HOMES_ERROR');
      throw error;
    }
  }, []);

  const getTierConfig = useCallback(async (tier: number): Promise<HomeTierConfig | null> => {
    try {
      return await HomeManagerService.getTierConfig(tier);
    } catch (error) {
      console.error('[useHomeManagerService] Error fetching tier config:', error);
      return null;
    }
  }, []);

  const getAllTierConfigs = useCallback(async (): Promise<HomeTierConfig[]> => {
    try {
      return await HomeManagerService.getAllTierConfigs();
    } catch (error) {
      console.error('[useHomeManagerService] Error fetching tier configs:', error);
      return [];
    }
  }, []);

  const clearError = useCallback(() => {
    errorRef.current = null;
  }, []);

  return {
    playerHome: playerHomeQuery.data,
    isLoadingHome: playerHomeQuery.isLoading,
    homeError: playerHomeQuery.error,
    refetchHome: playerHomeQuery.refetch,

    publicHomes: publicHomesQuery.data || [],
    isLoadingPublicHomes: publicHomesQuery.isLoading,
    refetchPublicHomes: publicHomesQuery.refetch,

    getHomeById: homeByIdQuery,
    getHomeDetails: homeDetailsQuery,
    searchPublicHomes,
    getTierConfig,
    getAllTierConfigs,

    createHome: createHomeMutation.mutateAsync,
    isCreatingHome: createHomeMutation.isPending,

    updateHome: updateHomeMutation.mutateAsync,
    isUpdatingHome: updateHomeMutation.isPending,

    upgradeHome: upgradeHomeMutation.mutateAsync,
    isUpgradingHome: upgradeHomeMutation.isPending,

    deleteHome: deleteHomeMutation.mutateAsync,
    isDeletingHome: deleteHomeMutation.isPending,

    lastError: errorRef.current,
    clearError,
  };
}

export function useRoomLayoutService(homeId: string | undefined) {
  const queryClient = useQueryClient();
  const errorRef = useRef<ServiceError | null>(null);

  const roomsQuery = useQuery({
    queryKey: ['homeRooms', homeId],
    queryFn: async () => {
      if (!homeId) return [];
      console.log('[useRoomLayoutService] Fetching rooms for home:', homeId);
      try {
        return await RoomLayoutService.getHomeRooms(homeId);
      } catch (error) {
        console.error('[useRoomLayoutService] Error fetching rooms:', error);
        errorRef.current = createServiceError(error, 'FETCH_ROOMS_ERROR');
        throw error;
      }
    },
    enabled: !!homeId,
    staleTime: 5 * 60 * 1000,
  });

  const getRoomById = useCallback(async (roomId: string): Promise<RoomLayout | null> => {
    console.log('[useRoomLayoutService] Fetching room:', roomId);
    try {
      return await RoomLayoutService.getRoomById(roomId);
    } catch (error) {
      console.error('[useRoomLayoutService] Error fetching room:', error);
      errorRef.current = createServiceError(error, 'FETCH_ROOM_ERROR');
      throw error;
    }
  }, []);

  const getRoomWithItems = useCallback(async (roomId: string): Promise<RoomWithItems> => {
    console.log('[useRoomLayoutService] Fetching room with items:', roomId);
    try {
      return await RoomLayoutService.getRoomWithItems(roomId);
    } catch (error) {
      console.error('[useRoomLayoutService] Error fetching room with items:', error);
      errorRef.current = createServiceError(error, 'FETCH_ROOM_ITEMS_ERROR');
      throw error;
    }
  }, []);

  const createRoomMutation = useMutation({
    mutationFn: async (input: CreateRoomInput) => {
      console.log('[useRoomLayoutService] Creating room:', input.roomName);
      try {
        return await RoomLayoutService.createRoom(input);
      } catch (error) {
        console.error('[useRoomLayoutService] Error creating room:', error);
        errorRef.current = createServiceError(error, 'CREATE_ROOM_ERROR');
        throw error;
      }
    },
    onSuccess: () => {
      console.log('[useRoomLayoutService] Room created successfully');
      queryClient.invalidateQueries({ queryKey: ['homeRooms', homeId] });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({ roomId, updates }: { 
      roomId: string; 
      updates: Parameters<typeof RoomLayoutService.updateRoom>[1] 
    }) => {
      console.log('[useRoomLayoutService] Updating room:', roomId);
      try {
        return await RoomLayoutService.updateRoom(roomId, updates);
      } catch (error) {
        console.error('[useRoomLayoutService] Error updating room:', error);
        errorRef.current = createServiceError(error, 'UPDATE_ROOM_ERROR');
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[useRoomLayoutService] Room updated successfully');
      queryClient.invalidateQueries({ queryKey: ['homeRooms', homeId] });
      queryClient.setQueryData(['room', data.id], data);
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      console.log('[useRoomLayoutService] Deleting room:', roomId);
      try {
        await RoomLayoutService.deleteRoom(roomId);
      } catch (error) {
        console.error('[useRoomLayoutService] Error deleting room:', error);
        errorRef.current = createServiceError(error, 'DELETE_ROOM_ERROR');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeRooms', homeId] });
    },
  });

  const getAvailableRoomTypes = useCallback(async (homeTier: number) => {
    try {
      return await RoomLayoutService.getAvailableRoomTypes(homeTier);
    } catch (error) {
      console.error('[useRoomLayoutService] Error fetching room types:', error);
      return [];
    }
  }, []);

  const clearError = useCallback(() => {
    errorRef.current = null;
  }, []);

  return {
    rooms: roomsQuery.data || [],
    isLoadingRooms: roomsQuery.isLoading,
    roomsError: roomsQuery.error,
    refetchRooms: roomsQuery.refetch,

    getRoomById,
    getRoomWithItems,
    getAvailableRoomTypes,

    createRoom: createRoomMutation.mutateAsync,
    isCreatingRoom: createRoomMutation.isPending,

    updateRoom: updateRoomMutation.mutateAsync,
    isUpdatingRoom: updateRoomMutation.isPending,

    deleteRoom: deleteRoomMutation.mutateAsync,
    isDeletingRoom: deleteRoomMutation.isPending,

    lastError: errorRef.current,
    clearError,
  };
}

export function useItemPlacementService(homeId: string | undefined) {
  const queryClient = useQueryClient();
  const errorRef = useRef<ServiceError | null>(null);

  const itemsQuery = useQuery({
    queryKey: ['homeItems', homeId],
    queryFn: async () => {
      if (!homeId) return [];
      console.log('[useItemPlacementService] Fetching items for home:', homeId);
      try {
        return await ItemPlacementService.getHomeItems(homeId);
      } catch (error) {
        console.error('[useItemPlacementService] Error fetching items:', error);
        errorRef.current = createServiceError(error, 'FETCH_ITEMS_ERROR');
        throw error;
      }
    },
    enabled: !!homeId,
    staleTime: 5 * 60 * 1000,
  });

  const getItemById = useCallback(async (itemId: string): Promise<PlacedItem | null> => {
    console.log('[useItemPlacementService] Fetching item:', itemId);
    try {
      return await ItemPlacementService.getItemById(itemId);
    } catch (error) {
      console.error('[useItemPlacementService] Error fetching item:', error);
      errorRef.current = createServiceError(error, 'FETCH_ITEM_ERROR');
      throw error;
    }
  }, []);

  const getRoomItems = useCallback(async (roomLayoutId: string): Promise<PlacedItem[]> => {
    console.log('[useItemPlacementService] Fetching items for room:', roomLayoutId);
    try {
      return await ItemPlacementService.getRoomItems(roomLayoutId);
    } catch (error) {
      console.error('[useItemPlacementService] Error fetching room items:', error);
      errorRef.current = createServiceError(error, 'FETCH_ROOM_ITEMS_ERROR');
      throw error;
    }
  }, []);

  const placeItemMutation = useMutation({
    mutationFn: async (input: PlaceItemInput) => {
      console.log('[useItemPlacementService] Placing item:', input.itemName);
      try {
        return await ItemPlacementService.placeItem(input);
      } catch (error) {
        console.error('[useItemPlacementService] Error placing item:', error);
        errorRef.current = createServiceError(error, 'PLACE_ITEM_ERROR');
        throw error;
      }
    },
    onSuccess: () => {
      console.log('[useItemPlacementService] Item placed successfully');
      queryClient.invalidateQueries({ queryKey: ['homeItems', homeId] });
    },
  });

  const updateItemPositionMutation = useMutation({
    mutationFn: async (input: UpdateItemPositionInput) => {
      console.log('[useItemPlacementService] Updating item position:', input.itemId);
      try {
        return await ItemPlacementService.updateItemPosition(input);
      } catch (error) {
        console.error('[useItemPlacementService] Error updating item position:', error);
        errorRef.current = createServiceError(error, 'UPDATE_ITEM_ERROR');
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['homeItems', homeId] });
      queryClient.setQueryData(['item', data.id], data);
    },
  });

  const moveItemToRoomMutation = useMutation({
    mutationFn: async ({ itemId, newRoomLayoutId, newPosition }: {
      itemId: string;
      newRoomLayoutId: string;
      newPosition: { x: number; y: number; z: number };
    }) => {
      console.log('[useItemPlacementService] Moving item to room:', newRoomLayoutId);
      try {
        return await ItemPlacementService.moveItemToRoom(itemId, newRoomLayoutId, newPosition);
      } catch (error) {
        console.error('[useItemPlacementService] Error moving item:', error);
        errorRef.current = createServiceError(error, 'MOVE_ITEM_ERROR');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeItems', homeId] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      console.log('[useItemPlacementService] Removing item:', itemId);
      try {
        await ItemPlacementService.removeItem(itemId);
      } catch (error) {
        console.error('[useItemPlacementService] Error removing item:', error);
        errorRef.current = createServiceError(error, 'REMOVE_ITEM_ERROR');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeItems', homeId] });
    },
  });

  const duplicateItemMutation = useMutation({
    mutationFn: async ({ itemId, newPosition }: {
      itemId: string;
      newPosition: { x: number; y: number; z: number };
    }) => {
      console.log('[useItemPlacementService] Duplicating item:', itemId);
      try {
        return await ItemPlacementService.duplicateItem(itemId, newPosition);
      } catch (error) {
        console.error('[useItemPlacementService] Error duplicating item:', error);
        errorRef.current = createServiceError(error, 'DUPLICATE_ITEM_ERROR');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeItems', homeId] });
    },
  });

  const clearRoomMutation = useMutation({
    mutationFn: async (roomLayoutId: string) => {
      console.log('[useItemPlacementService] Clearing room:', roomLayoutId);
      try {
        return await ItemPlacementService.clearRoom(roomLayoutId);
      } catch (error) {
        console.error('[useItemPlacementService] Error clearing room:', error);
        errorRef.current = createServiceError(error, 'CLEAR_ROOM_ERROR');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeItems', homeId] });
    },
  });

  const getItemsByCategory = useCallback(async (category: string): Promise<PlacedItem[]> => {
    if (!homeId) return [];
    try {
      return await ItemPlacementService.getItemsByCategory(homeId, category);
    } catch (error) {
      console.error('[useItemPlacementService] Error fetching items by category:', error);
      return [];
    }
  }, [homeId]);

  const clearError = useCallback(() => {
    errorRef.current = null;
  }, []);

  return {
    items: itemsQuery.data || [],
    isLoadingItems: itemsQuery.isLoading,
    itemsError: itemsQuery.error,
    refetchItems: itemsQuery.refetch,

    getItemById,
    getRoomItems,
    getItemsByCategory,

    placeItem: placeItemMutation.mutateAsync,
    isPlacingItem: placeItemMutation.isPending,

    updateItemPosition: updateItemPositionMutation.mutateAsync,
    isUpdatingItem: updateItemPositionMutation.isPending,

    moveItemToRoom: moveItemToRoomMutation.mutateAsync,
    isMovingItem: moveItemToRoomMutation.isPending,

    removeItem: removeItemMutation.mutateAsync,
    isRemovingItem: removeItemMutation.isPending,

    duplicateItem: duplicateItemMutation.mutateAsync,
    isDuplicatingItem: duplicateItemMutation.isPending,

    clearRoom: clearRoomMutation.mutateAsync,
    isClearingRoom: clearRoomMutation.isPending,

    lastError: errorRef.current,
    clearError,
  };
}

export function useVisitorService(homeId: string | undefined, visitorId: string | undefined) {
  const queryClient = useQueryClient();
  const errorRef = useRef<ServiceError | null>(null);

  const activeVisitorsQuery = useQuery({
    queryKey: ['activeVisitors', homeId],
    queryFn: async () => {
      if (!homeId) return [];
      console.log('[useVisitorService] Fetching active visitors for home:', homeId);
      try {
        return await VisitorService.getActiveVisits(homeId);
      } catch (error) {
        console.error('[useVisitorService] Error fetching active visitors:', error);
        errorRef.current = createServiceError(error, 'FETCH_VISITORS_ERROR');
        throw error;
      }
    },
    enabled: !!homeId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const visitHistoryQuery = useQuery({
    queryKey: ['visitHistory', visitorId],
    queryFn: async () => {
      if (!visitorId) return [];
      console.log('[useVisitorService] Fetching visit history for:', visitorId);
      try {
        return await VisitorService.getVisitorHistory(visitorId);
      } catch (error) {
        console.error('[useVisitorService] Error fetching visit history:', error);
        errorRef.current = createServiceError(error, 'FETCH_HISTORY_ERROR');
        throw error;
      }
    },
    enabled: !!visitorId,
    staleTime: 5 * 60 * 1000,
  });

  const homeRatingsQuery = useQuery({
    queryKey: ['homeRatings', homeId],
    queryFn: async () => {
      if (!homeId) return null;
      console.log('[useVisitorService] Fetching ratings for home:', homeId);
      try {
        return await VisitorService.getHomeRatings(homeId);
      } catch (error) {
        console.error('[useVisitorService] Error fetching ratings:', error);
        return null;
      }
    },
    enabled: !!homeId,
    staleTime: 5 * 60 * 1000,
  });

  const startVisitMutation = useMutation({
    mutationFn: async (input: VisitHomeInput) => {
      console.log('[useVisitorService] Starting visit to home:', input.homeId);
      try {
        return await VisitorService.startVisit(input);
      } catch (error) {
        console.error('[useVisitorService] Error starting visit:', error);
        errorRef.current = createServiceError(error, 'START_VISIT_ERROR');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeVisitors', homeId] });
    },
  });

  const endVisitMutation = useMutation({
    mutationFn: async ({ homeId: visitHomeId, visitorId: visId }: { homeId: string; visitorId: string }) => {
      console.log('[useVisitorService] Ending visit to home:', visitHomeId);
      try {
        return await VisitorService.endVisit(visitHomeId, visId);
      } catch (error) {
        console.error('[useVisitorService] Error ending visit:', error);
        errorRef.current = createServiceError(error, 'END_VISIT_ERROR');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeVisitors', homeId] });
      queryClient.invalidateQueries({ queryKey: ['visitHistory', visitorId] });
    },
  });

  const rateHomeMutation = useMutation({
    mutationFn: async (input: RateHomeInput) => {
      console.log('[useVisitorService] Rating home:', input.homeId, 'with:', input.rating);
      try {
        return await VisitorService.rateHome(input);
      } catch (error) {
        console.error('[useVisitorService] Error rating home:', error);
        errorRef.current = createServiceError(error, 'RATE_HOME_ERROR');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeRatings', homeId] });
    },
  });

  const canVisitHome = useCallback(async (targetHomeId: string, targetVisitorId: string) => {
    try {
      return await VisitorService.canVisitHome(targetHomeId, targetVisitorId);
    } catch (error) {
      console.error('[useVisitorService] Error checking visit eligibility:', error);
      return { canVisit: false, reason: 'Error checking eligibility' };
    }
  }, []);

  const getActiveHomeSession = useCallback(async (targetHomeId: string) => {
    try {
      return await VisitorService.getActiveHomeSession(targetHomeId);
    } catch (error) {
      console.error('[useVisitorService] Error fetching active session:', error);
      return null;
    }
  }, []);

  const getHomeVisitHistory = useCallback(async (targetHomeId: string, limit?: number) => {
    try {
      return await VisitorService.getHomeVisitHistory(targetHomeId, limit);
    } catch (error) {
      console.error('[useVisitorService] Error fetching home visit history:', error);
      return [];
    }
  }, []);

  const clearError = useCallback(() => {
    errorRef.current = null;
  }, []);

  return {
    activeVisitors: activeVisitorsQuery.data || [],
    isLoadingVisitors: activeVisitorsQuery.isLoading,
    refetchVisitors: activeVisitorsQuery.refetch,

    visitHistory: visitHistoryQuery.data || [],
    isLoadingHistory: visitHistoryQuery.isLoading,

    homeRatings: homeRatingsQuery.data,
    isLoadingRatings: homeRatingsQuery.isLoading,

    canVisitHome,
    getActiveHomeSession,
    getHomeVisitHistory,

    startVisit: startVisitMutation.mutateAsync,
    isStartingVisit: startVisitMutation.isPending,

    endVisit: endVisitMutation.mutateAsync,
    isEndingVisit: endVisitMutation.isPending,

    rateHome: rateHomeMutation.mutateAsync,
    isRatingHome: rateHomeMutation.isPending,

    lastError: errorRef.current,
    clearError,
  };
}

export function useHomeServices(playerId: string | undefined, homeId: string | undefined) {
  const homeManager = useHomeManagerService(playerId);
  const roomLayout = useRoomLayoutService(homeId);
  const itemPlacement = useItemPlacementService(homeId);
  const visitor = useVisitorService(homeId, playerId);

  const isLoading = 
    homeManager.isLoadingHome || 
    roomLayout.isLoadingRooms || 
    itemPlacement.isLoadingItems ||
    visitor.isLoadingVisitors;

  const hasError = 
    !!homeManager.lastError || 
    !!roomLayout.lastError || 
    !!itemPlacement.lastError ||
    !!visitor.lastError;

  const clearAllErrors = useCallback(() => {
    homeManager.clearError();
    roomLayout.clearError();
    itemPlacement.clearError();
    visitor.clearError();
  }, [homeManager, roomLayout, itemPlacement, visitor]);

  return {
    homeManager,
    roomLayout,
    itemPlacement,
    visitor,
    isLoading,
    hasError,
    clearAllErrors,
  };
}
