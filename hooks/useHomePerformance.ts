// Performance hooks for large homes - pagination, lazy loading, and optimizations

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { useQueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { HomeCacheService } from '@/services/HomeCacheService';
import { ItemPlacementService } from '@/services/ItemPlacementService';
import { RoomLayoutService } from '@/services/RoomLayoutService';
import { PlacedItem, RoomLayout } from '@/types/home';

const DEFAULT_PAGE_SIZE = 50;

interface LazyLoadState {
  loadedRooms: Set<string>;
  loadingRooms: Set<string>;
  roomItems: Map<string, PlacedItem[]>;
  roomItemCounts: Map<string, number>;
}

export function usePaginatedItems(
  homeId: string | undefined,
  roomId: string | undefined,
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['paginatedItems', homeId, roomId, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      if (!homeId || !roomId) {
        return { data: [], page: 0, hasMore: false, totalCount: 0 };
      }

      console.log('[usePaginatedItems] Fetching page:', pageParam, 'for room:', roomId);

      // Check cache first
      const cached = await HomeCacheService.getCachedItems<PlacedItem>(roomId, pageParam);
      if (cached) {
        console.log('[usePaginatedItems] Cache hit for page:', pageParam);
        return {
          data: cached,
          page: pageParam,
          hasMore: cached.length === pageSize,
          totalCount: -1, // Unknown from cache
        };
      }

      // Fetch from service with pagination
      const allItems = await ItemPlacementService.getRoomItems(roomId);
      const start = pageParam * pageSize;
      const end = start + pageSize;
      const pageItems = allItems.slice(start, end);

      // Cache the result
      await HomeCacheService.cacheItems(roomId, pageItems, pageParam);

      return {
        data: pageItems,
        page: pageParam,
        hasMore: end < allItems.length,
        totalCount: allItems.length,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: !!homeId && !!roomId,
    staleTime: 2 * 60 * 1000,
  });

  const allItems = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data?.pages]);

  const totalCount = useMemo(() => {
    if (!data?.pages || data.pages.length === 0) return 0;
    const lastPageWithCount = data.pages.find((p) => p.totalCount >= 0);
    return lastPageWithCount?.totalCount ?? allItems.length;
  }, [data?.pages, allItems.length]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      console.log('[usePaginatedItems] Loading more items');
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const prefetchNextPage = useCallback(async () => {
    if (!hasNextPage || !roomId) return;

    const nextPage = (data?.pages?.length ?? 0);
    const cached = await HomeCacheService.getCachedItems(roomId, nextPage);
    
    if (!cached) {
      console.log('[usePaginatedItems] Prefetching page:', nextPage);
      queryClient.prefetchInfiniteQuery({
        queryKey: ['paginatedItems', homeId, roomId, pageSize],
        initialPageParam: nextPage,
      });
    }
  }, [hasNextPage, roomId, data?.pages?.length, queryClient, homeId, pageSize]);

  return {
    items: allItems,
    totalCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    loadMore,
    prefetchNextPage,
    refetch,
  };
}

export function useLazyRoomLoading(homeId: string | undefined) {
  const [state, setState] = useState<LazyLoadState>({
    loadedRooms: new Set(),
    loadingRooms: new Set(),
    roomItems: new Map(),
    roomItemCounts: new Map(),
  });

  // Load room metadata without items
  const roomsQuery = useQuery({
    queryKey: ['lazyRooms', homeId],
    queryFn: async () => {
      if (!homeId) return [];

      const cached = await HomeCacheService.getCachedRooms<RoomLayout>(homeId);
      if (cached) {
        console.log('[useLazyRoomLoading] Cache hit for rooms');
        return cached;
      }

      const rooms = await RoomLayoutService.getHomeRooms(homeId);
      await HomeCacheService.cacheRooms(homeId, rooms);
      return rooms;
    },
    enabled: !!homeId,
    staleTime: 5 * 60 * 1000,
  });

  const loadRoomItems = useCallback(async (roomId: string) => {
    if (state.loadedRooms.has(roomId) || state.loadingRooms.has(roomId)) {
      console.log('[useLazyRoomLoading] Room already loaded/loading:', roomId);
      return;
    }

    console.log('[useLazyRoomLoading] Loading items for room:', roomId);

    setState((prev) => ({
      ...prev,
      loadingRooms: new Set([...prev.loadingRooms, roomId]),
    }));

    try {
      // Use InteractionManager to defer heavy work
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(async () => {
          try {
            const items = await ItemPlacementService.getRoomItems(roomId);

            setState((prev) => {
              const newLoadedRooms = new Set(prev.loadedRooms);
              newLoadedRooms.add(roomId);

              const newLoadingRooms = new Set(prev.loadingRooms);
              newLoadingRooms.delete(roomId);

              const newRoomItems = new Map(prev.roomItems);
              newRoomItems.set(roomId, items);

              const newRoomItemCounts = new Map(prev.roomItemCounts);
              newRoomItemCounts.set(roomId, items.length);

              return {
                loadedRooms: newLoadedRooms,
                loadingRooms: newLoadingRooms,
                roomItems: newRoomItems,
                roomItemCounts: newRoomItemCounts,
              };
            });

            resolve();
          } catch (error) {
            console.error('[useLazyRoomLoading] Failed to load room items:', error);
            setState((prev) => {
              const newLoadingRooms = new Set(prev.loadingRooms);
              newLoadingRooms.delete(roomId);
              return { ...prev, loadingRooms: newLoadingRooms };
            });
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('[useLazyRoomLoading] Error in loadRoomItems:', error);
    }
  }, [state.loadedRooms, state.loadingRooms]);

  const unloadRoomItems = useCallback((roomId: string) => {
    console.log('[useLazyRoomLoading] Unloading room:', roomId);

    setState((prev) => {
      const newLoadedRooms = new Set(prev.loadedRooms);
      newLoadedRooms.delete(roomId);

      const newRoomItems = new Map(prev.roomItems);
      newRoomItems.delete(roomId);

      return {
        ...prev,
        loadedRooms: newLoadedRooms,
        roomItems: newRoomItems,
      };
    });
  }, []);

  const getRoomItems = useCallback((roomId: string): PlacedItem[] => {
    return state.roomItems.get(roomId) || [];
  }, [state.roomItems]);

  const isRoomLoaded = useCallback((roomId: string): boolean => {
    return state.loadedRooms.has(roomId);
  }, [state.loadedRooms]);

  const isRoomLoading = useCallback((roomId: string): boolean => {
    return state.loadingRooms.has(roomId);
  }, [state.loadingRooms]);

  const getRoomItemCount = useCallback((roomId: string): number => {
    return state.roomItemCounts.get(roomId) ?? 0;
  }, [state.roomItemCounts]);

  const prefetchAdjacentRooms = useCallback((currentRoomIndex: number) => {
    const rooms = roomsQuery.data || [];
    const indicesToPrefetch = [currentRoomIndex - 1, currentRoomIndex + 1];

    indicesToPrefetch.forEach((index) => {
      if (index >= 0 && index < rooms.length) {
        const room = rooms[index];
        if (!state.loadedRooms.has(room.id) && !state.loadingRooms.has(room.id)) {
          console.log('[useLazyRoomLoading] Prefetching adjacent room:', room.roomName);
          loadRoomItems(room.id);
        }
      }
    });
  }, [roomsQuery.data, state.loadedRooms, state.loadingRooms, loadRoomItems]);

  const clearAllRoomItems = useCallback(() => {
    setState({
      loadedRooms: new Set(),
      loadingRooms: new Set(),
      roomItems: new Map(),
      roomItemCounts: new Map(),
    });
  }, []);

  return {
    rooms: roomsQuery.data || [],
    isLoadingRooms: roomsQuery.isLoading,
    loadRoomItems,
    unloadRoomItems,
    getRoomItems,
    isRoomLoaded,
    isRoomLoading,
    getRoomItemCount,
    prefetchAdjacentRooms,
    clearAllRoomItems,
    loadedRoomCount: state.loadedRooms.size,
  };
}

export function useItemVirtualization<T extends { id: string }>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) {
  const [scrollOffset, setScrollOffset] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollOffset / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollOffset + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollOffset, containerHeight, itemHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useCallback((offset: number) => {
    setScrollOffset(offset);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange,
  };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useThrottle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0);
  const lastResult = useRef<ReturnType<T> | undefined>(undefined);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        lastResult.current = callback(...args);
      }
      return lastResult.current;
    }) as T,
    [callback, delay]
  );
}

export function useDeferredValue<T>(value: T): T {
  const [deferredValue, setDeferredValue] = useState(value);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setDeferredValue(value);
    });
    return () => handle.cancel();
  }, [value]);

  return deferredValue;
}

export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (__DEV__) {
      console.log(
        `[Performance] ${componentName} rendered #${renderCount.current}, ` +
          `time since last: ${timeSinceLastRender}ms`
      );
    }
  });

  return {
    renderCount: renderCount.current,
  };
}

// Batch operations for better performance
export function useBatchedUpdates() {
  const pendingUpdates = useRef<(() => void)[]>([]);
  const isProcessing = useRef(false);

  const queueUpdate = useCallback((update: () => void) => {
    pendingUpdates.current.push(update);

    if (!isProcessing.current) {
      isProcessing.current = true;

      InteractionManager.runAfterInteractions(() => {
        const updates = pendingUpdates.current;
        pendingUpdates.current = [];
        isProcessing.current = false;

        // Execute all updates in batch
        updates.forEach((fn) => fn());
      });
    }
  }, []);

  return { queueUpdate };
}
