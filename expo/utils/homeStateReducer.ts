import {
  NormalizedHomeState,
  HomeAction,
  initialNormalizedState,
  NormalizedHome,
  NormalizedRoom,
  NormalizedItem,
} from '@/types/normalizedHomeState';

export function homeStateReducer(
  state: NormalizedHomeState,
  action: HomeAction
): NormalizedHomeState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'LOAD_HOME': {
      const { home, rooms, items } = action.payload;
      const roomsMap = rooms.reduce<Record<string, NormalizedRoom>>((acc, room) => {
        acc[room.id] = room;
        return acc;
      }, {});
      const itemsMap = items.reduce<Record<string, NormalizedItem>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});

      return {
        ...state,
        homes: { ...state.homes, [home.id]: home },
        rooms: { ...state.rooms, ...roomsMap },
        items: { ...state.items, ...itemsMap },
        homeIds: state.homeIds.includes(home.id) ? state.homeIds : [...state.homeIds, home.id],
        activeHomeId: home.id,
      };
    }

    case 'LOAD_HOMES': {
      const { homes, rooms, items } = action.payload;
      const homesMap = homes.reduce<Record<string, NormalizedHome>>((acc, home) => {
        acc[home.id] = home;
        return acc;
      }, {});
      const roomsMap = rooms.reduce<Record<string, NormalizedRoom>>((acc, room) => {
        acc[room.id] = room;
        return acc;
      }, {});
      const itemsMap = items.reduce<Record<string, NormalizedItem>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});

      return {
        ...state,
        homes: { ...state.homes, ...homesMap },
        rooms: { ...state.rooms, ...roomsMap },
        items: { ...state.items, ...itemsMap },
        homeIds: [...new Set([...state.homeIds, ...homes.map(h => h.id)])],
      };
    }

    case 'ADD_HOME': {
      const home = action.payload;
      return {
        ...state,
        homes: { ...state.homes, [home.id]: home },
        homeIds: [...state.homeIds, home.id],
      };
    }

    case 'UPDATE_HOME': {
      const { id, updates } = action.payload;
      const existing = state.homes[id];
      if (!existing) return state;

      return {
        ...state,
        homes: {
          ...state.homes,
          [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
        },
      };
    }

    case 'REMOVE_HOME': {
      const homeId = action.payload;
      const home = state.homes[homeId];
      if (!home) return state;

      const { [homeId]: removedHome, ...remainingHomes } = state.homes;

      const roomsToRemove = home.roomIds;
      const remainingRooms = { ...state.rooms };
      const itemsToRemove: string[] = [];
      roomsToRemove.forEach(roomId => {
        const room = remainingRooms[roomId];
        if (room) {
          itemsToRemove.push(...room.itemIds);
          delete remainingRooms[roomId];
        }
      });

      const remainingItems = { ...state.items };
      itemsToRemove.forEach(itemId => {
        delete remainingItems[itemId];
      });

      return {
        ...state,
        homes: remainingHomes,
        rooms: remainingRooms,
        items: remainingItems,
        homeIds: state.homeIds.filter(id => id !== homeId),
        activeHomeId: state.activeHomeId === homeId ? null : state.activeHomeId,
        activeRoomId: roomsToRemove.includes(state.activeRoomId || '')
          ? null
          : state.activeRoomId,
      };
    }

    case 'SET_ACTIVE_HOME':
      return { ...state, activeHomeId: action.payload, activeRoomId: null, selectedItemId: null };

    case 'ADD_ROOM': {
      const room = action.payload;
      const home = state.homes[room.homeId];
      if (!home) return state;

      return {
        ...state,
        rooms: { ...state.rooms, [room.id]: room },
        homes: {
          ...state.homes,
          [room.homeId]: {
            ...home,
            roomIds: [...home.roomIds, room.id],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }

    case 'UPDATE_ROOM': {
      const { id, updates } = action.payload;
      const existing = state.rooms[id];
      if (!existing) return state;

      return {
        ...state,
        rooms: {
          ...state.rooms,
          [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
        },
      };
    }

    case 'REMOVE_ROOM': {
      const { roomId, homeId } = action.payload;
      const room = state.rooms[roomId];
      const home = state.homes[homeId];
      if (!room || !home) return state;

      const { [roomId]: removedRoom, ...remainingRooms } = state.rooms;

      const remainingItems = { ...state.items };
      room.itemIds.forEach(itemId => {
        delete remainingItems[itemId];
      });

      return {
        ...state,
        rooms: remainingRooms,
        items: remainingItems,
        homes: {
          ...state.homes,
          [homeId]: {
            ...home,
            roomIds: home.roomIds.filter(id => id !== roomId),
            updatedAt: new Date().toISOString(),
          },
        },
        activeRoomId: state.activeRoomId === roomId ? null : state.activeRoomId,
      };
    }

    case 'SET_ACTIVE_ROOM':
      return { ...state, activeRoomId: action.payload, selectedItemId: null };

    case 'ADD_ITEM': {
      const item = action.payload;
      const room = state.rooms[item.roomId];
      if (!room) return state;

      return {
        ...state,
        items: { ...state.items, [item.id]: item },
        rooms: {
          ...state.rooms,
          [item.roomId]: {
            ...room,
            itemIds: [...room.itemIds, item.id],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }

    case 'UPDATE_ITEM': {
      const { id, updates } = action.payload;
      const existing = state.items[id];
      if (!existing) return state;

      return {
        ...state,
        items: {
          ...state.items,
          [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
        },
      };
    }

    case 'MOVE_ITEM': {
      const { id, position, rotation } = action.payload;
      const existing = state.items[id];
      if (!existing) return state;

      return {
        ...state,
        items: {
          ...state.items,
          [id]: {
            ...existing,
            position,
            rotation: rotation || existing.rotation,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }

    case 'REMOVE_ITEM': {
      const { itemId, roomId } = action.payload;
      const room = state.rooms[roomId];
      if (!room) return state;

      const { [itemId]: removedItem, ...remainingItems } = state.items;

      return {
        ...state,
        items: remainingItems,
        rooms: {
          ...state.rooms,
          [roomId]: {
            ...room,
            itemIds: room.itemIds.filter(id => id !== itemId),
            updatedAt: new Date().toISOString(),
          },
        },
        selectedItemId: state.selectedItemId === itemId ? null : state.selectedItemId,
      };
    }

    case 'SELECT_ITEM':
      return { ...state, selectedItemId: action.payload };

    case 'BATCH_UPDATE_ITEMS': {
      const updatedItems = action.payload.reduce<Record<string, NormalizedItem>>(
        (acc, item) => {
          acc[item.id] = item;
          return acc;
        },
        {}
      );

      return {
        ...state,
        items: { ...state.items, ...updatedItems },
      };
    }

    case 'RESET_STATE':
      return initialNormalizedState;

    default:
      return state;
  }
}
