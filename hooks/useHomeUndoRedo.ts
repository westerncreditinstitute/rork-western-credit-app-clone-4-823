import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InternalPlacedItem, RoomData } from '@/types/home';

const MAX_HISTORY_SIZE = 50;
const HISTORY_STORAGE_KEY = 'credit_life_home_edit_history';

export interface HomeEditState {
  placedItems: InternalPlacedItem[];
  rooms: RoomData[];
  timestamp: number;
}

export interface HistoryState {
  past: HomeEditState[];
  present: HomeEditState;
  future: HomeEditState[];
}

export interface UndoRedoActions {
  undo: () => HomeEditState | null;
  redo: () => HomeEditState | null;
  pushState: (state: HomeEditState) => void;
  clearHistory: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  futureLength: number;
}

export function useHomeUndoRedo(
  playerId: string | undefined,
  initialState: HomeEditState | null,
  onStateRestore?: (state: HomeEditState) => void
): UndoRedoActions {
  const [historyState, setHistoryState] = useState<HistoryState>(() => ({
    past: [],
    present: initialState || { placedItems: [], rooms: [], timestamp: Date.now() },
    future: [],
  }));

  const isInitializedRef = useRef(false);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!playerId || isInitializedRef.current) return;

    const loadHistory = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem(`${HISTORY_STORAGE_KEY}_${playerId}`);
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory) as HistoryState;
          if (parsed.present && parsed.past && parsed.future) {
            console.log('[useHomeUndoRedo] Loaded history from storage:', {
              past: parsed.past.length,
              future: parsed.future.length,
            });
            setHistoryState(parsed);
          }
        }
        isInitializedRef.current = true;
      } catch (error) {
        console.error('[useHomeUndoRedo] Error loading history:', error);
        isInitializedRef.current = true;
      }
    };

    loadHistory();
  }, [playerId]);

  const saveHistoryDebounced = useCallback((state: HistoryState) => {
    if (!playerId) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const historyToSave: HistoryState = {
          past: state.past.slice(-10),
          present: state.present,
          future: state.future.slice(0, 10),
        };
        await AsyncStorage.setItem(
          `${HISTORY_STORAGE_KEY}_${playerId}`,
          JSON.stringify(historyToSave)
        );
        console.log('[useHomeUndoRedo] History saved to storage');
      } catch (error) {
        console.error('[useHomeUndoRedo] Error saving history:', error);
      }
    }, 2000);
  }, [playerId]);

  const pushState = useCallback((newState: HomeEditState) => {
    setHistoryState((prev) => {
      const stateWithTimestamp = {
        ...newState,
        timestamp: Date.now(),
      };

      let newPast = [...prev.past, prev.present];
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast = newPast.slice(newPast.length - MAX_HISTORY_SIZE);
      }

      const newHistory: HistoryState = {
        past: newPast,
        present: stateWithTimestamp,
        future: [],
      };

      saveHistoryDebounced(newHistory);
      console.log('[useHomeUndoRedo] State pushed, history size:', newPast.length);
      return newHistory;
    });
  }, [saveHistoryDebounced]);

  const undo = useCallback((): HomeEditState | null => {
    let restoredState: HomeEditState | null = null;

    setHistoryState((prev) => {
      if (prev.past.length === 0) {
        console.log('[useHomeUndoRedo] Nothing to undo');
        return prev;
      }

      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);

      const newHistory: HistoryState = {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future].slice(0, MAX_HISTORY_SIZE),
      };

      restoredState = previous;
      saveHistoryDebounced(newHistory);
      console.log('[useHomeUndoRedo] Undo performed, remaining past:', newPast.length);
      return newHistory;
    });

    if (restoredState && onStateRestore) {
      setTimeout(() => onStateRestore(restoredState!), 0);
    }

    return restoredState;
  }, [saveHistoryDebounced, onStateRestore]);

  const redo = useCallback((): HomeEditState | null => {
    let restoredState: HomeEditState | null = null;

    setHistoryState((prev) => {
      if (prev.future.length === 0) {
        console.log('[useHomeUndoRedo] Nothing to redo');
        return prev;
      }

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      const newHistory: HistoryState = {
        past: [...prev.past, prev.present].slice(-MAX_HISTORY_SIZE),
        present: next,
        future: newFuture,
      };

      restoredState = next;
      saveHistoryDebounced(newHistory);
      console.log('[useHomeUndoRedo] Redo performed, remaining future:', newFuture.length);
      return newHistory;
    });

    if (restoredState && onStateRestore) {
      setTimeout(() => onStateRestore(restoredState!), 0);
    }

    return restoredState;
  }, [saveHistoryDebounced, onStateRestore]);

  const clearHistory = useCallback(async () => {
    const newHistory: HistoryState = {
      past: [],
      present: historyState.present,
      future: [],
    };
    setHistoryState(newHistory);

    if (playerId) {
      try {
        await AsyncStorage.removeItem(`${HISTORY_STORAGE_KEY}_${playerId}`);
        console.log('[useHomeUndoRedo] History cleared');
      } catch (error) {
        console.error('[useHomeUndoRedo] Error clearing history:', error);
      }
    }
  }, [playerId, historyState.present]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    undo,
    redo,
    pushState,
    clearHistory,
    canUndo: historyState.past.length > 0,
    canRedo: historyState.future.length > 0,
    historyLength: historyState.past.length,
    futureLength: historyState.future.length,
  };
}

export function createStateSnapshot(
  placedItems: InternalPlacedItem[],
  rooms: RoomData[]
): HomeEditState {
  return {
    placedItems: placedItems.map(item => ({ ...item })),
    rooms: rooms.map(room => ({ ...room })),
    timestamp: Date.now(),
  };
}

export function diffStates(
  oldState: HomeEditState,
  newState: HomeEditState
): {
  addedItems: InternalPlacedItem[];
  removedItems: InternalPlacedItem[];
  movedItems: { item: InternalPlacedItem; oldPosition: InternalPlacedItem }[];
} {
  const oldItemMap = new Map(oldState.placedItems.map(item => [item.id, item]));
  const newItemMap = new Map(newState.placedItems.map(item => [item.id, item]));

  const addedItems: InternalPlacedItem[] = [];
  const removedItems: InternalPlacedItem[] = [];
  const movedItems: { item: InternalPlacedItem; oldPosition: InternalPlacedItem }[] = [];

  for (const [id, newItem] of newItemMap) {
    const oldItem = oldItemMap.get(id);
    if (!oldItem) {
      addedItems.push(newItem);
    } else if (
      oldItem.position.x !== newItem.position.x ||
      oldItem.position.y !== newItem.position.y ||
      oldItem.position.z !== newItem.position.z ||
      oldItem.rotation.x !== newItem.rotation.x ||
      oldItem.rotation.y !== newItem.rotation.y ||
      oldItem.rotation.z !== newItem.rotation.z
    ) {
      movedItems.push({ item: newItem, oldPosition: oldItem });
    }
  }

  for (const [id, oldItem] of oldItemMap) {
    if (!newItemMap.has(id)) {
      removedItems.push(oldItem);
    }
  }

  return { addedItems, removedItems, movedItems };
}
