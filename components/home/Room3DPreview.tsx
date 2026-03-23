import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react-native';
import { RoomData, InternalPlacedItem, Vector3 } from '@/types/home';
import { ItemDefinition } from '@/utils/itemPlacementSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ViewMode = '2d' | '3d';

interface Room3DPreviewProps {
  room: RoomData;
  items: InternalPlacedItem[];
  selectedItemId: string | null;
  onSelectItem: (item: InternalPlacedItem | null) => void;
  onMoveItem?: (itemId: string, position: Vector3) => void;
  showGrid: boolean;
  viewMode: ViewMode;
  colors: {
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textLight: string;
  };
  getItemDefinition: (itemId: string) => ItemDefinition | undefined;
  containerSize?: number;
}

const ISOMETRIC_ANGLE = 30;

export function Room3DPreview({
  room,
  items,
  selectedItemId,
  onSelectItem,
  onMoveItem,
  showGrid,
  viewMode,
  colors,
  getItemDefinition,
  containerSize = SCREEN_WIDTH - 32,
}: Room3DPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  const lastPanRef = useRef({ x: 0, y: 0 });

  const scale = useMemo(() => {
    const maxDim = Math.max(room.dimensions.x, room.dimensions.z);
    return ((containerSize - 60) / maxDim) * zoomLevel;
  }, [room.dimensions, containerSize, zoomLevel]);

  const toScreenCoords2D = useCallback((worldX: number, worldZ: number) => ({
    x: worldX * scale + 30,
    y: worldZ * scale + 30,
  }), [scale]);

  const toScreenCoords3D = useCallback((worldX: number, worldY: number, worldZ: number) => {
    const isoScale = scale * 0.7;
    const x = (worldX - worldZ) * Math.cos(ISOMETRIC_ANGLE * Math.PI / 180) * isoScale;
    const y = (worldX + worldZ) * Math.sin(ISOMETRIC_ANGLE * Math.PI / 180) * isoScale - worldY * isoScale;
    return {
      x: x + containerSize / 2 + panOffset.x,
      y: y + containerSize / 3 + panOffset.y,
    };
  }, [scale, containerSize, panOffset]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => viewMode === '3d',
    onMoveShouldSetPanResponder: () => viewMode === '3d',
    onPanResponderGrant: () => {
      lastPanRef.current = { ...panOffset };
    },
    onPanResponderMove: (_, gestureState) => {
      setPanOffset({
        x: lastPanRef.current.x + gestureState.dx,
        y: lastPanRef.current.y + gestureState.dy,
      });
    },
  }), [viewMode, panOffset]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  const handleResetView = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleItemPress = useCallback((item: InternalPlacedItem) => {
    onSelectItem(selectedItemId === item.id ? null : item);
  }, [selectedItemId, onSelectItem]);

  const handleBackgroundPress = useCallback(() => {
    onSelectItem(null);
  }, [onSelectItem]);

  const gridLines2D = useMemo(() => {
    if (!showGrid || viewMode !== '2d') return [];
    
    const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    const cellsX = Math.ceil(room.dimensions.x);
    const cellsZ = Math.ceil(room.dimensions.z);

    for (let i = 0; i <= cellsX; i++) {
      const start = toScreenCoords2D(i, 0);
      const end = toScreenCoords2D(i, room.dimensions.z);
      lines.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y, key: `v${i}` });
    }
    for (let i = 0; i <= cellsZ; i++) {
      const start = toScreenCoords2D(0, i);
      const end = toScreenCoords2D(room.dimensions.x, i);
      lines.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y, key: `h${i}` });
    }
    return lines;
  }, [room.dimensions, toScreenCoords2D, showGrid, viewMode]);

  const sortedItems = useMemo(() => {
    if (viewMode === '2d') return items;
    return [...items].sort((a, b) => {
      const depthA = a.position.x + a.position.z;
      const depthB = b.position.x + b.position.z;
      return depthA - depthB;
    });
  }, [items, viewMode]);

  const render2DView = () => (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleBackgroundPress}
      style={styles.roomTouchable}
    >
      <View
        style={[
          styles.roomFloor2D,
          {
            width: toScreenCoords2D(room.dimensions.x, 0).x + 30,
            height: toScreenCoords2D(0, room.dimensions.z).y + 30,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {gridLines2D.map((line) => (
          <View
            key={line.key}
            style={[
              styles.gridLine,
              {
                left: line.x1,
                top: line.y1,
                width: line.key.startsWith('v') ? 1 : line.x2 - line.x1,
                height: line.key.startsWith('h') ? 1 : line.y2 - line.y1,
                backgroundColor: colors.border,
              },
            ]}
          />
        ))}

        {room.doorPositions.map((door, index) => {
          const pos = toScreenCoords2D(door.x, door.z);
          return (
            <View
              key={`door-${index}`}
              style={[styles.doorMarker, { left: pos.x - 15, top: pos.y - 5 }]}
            >
              <View style={styles.doorIcon} />
              <Text style={styles.doorLabel}>Door</Text>
            </View>
          );
        })}

        {room.windowPositions.map((window, index) => {
          const pos = toScreenCoords2D(window.x, window.z);
          return (
            <View
              key={`window-${index}`}
              style={[styles.windowMarker, { left: pos.x - 10, top: pos.y - 3 }]}
            >
              <View style={styles.windowIcon} />
            </View>
          );
        })}

        {sortedItems.map((item) => {
          const itemDef = getItemDefinition(item.itemId);
          if (!itemDef) return null;

          const pos = toScreenCoords2D(item.position.x, item.position.z);
          const itemWidth = itemDef.size.x * scale;
          const itemHeight = itemDef.size.z * scale;
          const isSelected = selectedItemId === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.placedItem2D,
                {
                  left: pos.x - itemWidth / 2,
                  top: pos.y - itemHeight / 2,
                  width: itemWidth,
                  height: itemHeight,
                  transform: [{ rotate: `${item.rotation.y}deg` }],
                  borderColor: isSelected ? '#10B981' : 'transparent',
                  borderWidth: isSelected ? 2 : 0,
                  backgroundColor: isSelected ? '#10B98130' : '#E5E7EB50',
                },
              ]}
              onPress={() => handleItemPress(item)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: itemDef.imageUrl }}
                style={styles.itemImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </TouchableOpacity>
  );

  const render3DView = () => (
    <View {...panResponder.panHandlers} style={styles.roomTouchable}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleBackgroundPress}
        style={styles.room3DContainer}
      >
        <View style={styles.floor3D}>
          <FloorPlane
            width={room.dimensions.x}
            depth={room.dimensions.z}
            scale={scale * 0.7}
            offset={panOffset}
            containerSize={containerSize}
            showGrid={showGrid}
            gridColor={colors.border}
          />
        </View>

        <View style={styles.walls3D}>
          <WallPlane
            width={room.dimensions.x}
            height={room.dimensions.y}
            scale={scale * 0.7}
            offset={panOffset}
            containerSize={containerSize}
            position="back"
          />
          <WallPlane
            width={room.dimensions.z}
            height={room.dimensions.y}
            scale={scale * 0.7}
            offset={panOffset}
            containerSize={containerSize}
            position="left"
          />
        </View>

        {sortedItems.map((item) => {
          const itemDef = getItemDefinition(item.itemId);
          if (!itemDef) return null;

          const isSelected = selectedItemId === item.id;
          const pos = toScreenCoords3D(item.position.x, item.position.y, item.position.z);

          return (
            <Placed3DItem
              key={item.id}
              item={item}
              itemDef={itemDef}
              position={pos}
              scale={scale * 0.7}
              isSelected={isSelected}
              onPress={() => handleItemPress(item)}
            />
          );
        })}
      </TouchableOpacity>

      <View style={styles.viewControls}>
        <TouchableOpacity style={styles.viewControlButton} onPress={handleZoomIn}>
          <ZoomIn color={colors.text} size={18} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewControlButton} onPress={handleZoomOut}>
          <ZoomOut color={colors.text} size={18} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewControlButton} onPress={handleResetView}>
          <RotateCcw color={colors.text} size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.dragHint}>
        <Move color={colors.textLight} size={14} />
        <Text style={[styles.dragHintText, { color: colors.textLight }]}>Drag to pan</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt }]}>
      {viewMode === '2d' ? render2DView() : render3DView()}

      <View style={styles.roomInfoOverlay}>
        <Text style={[styles.roomDimensionsText, { color: colors.textLight }]}>
          {room.dimensions.x}m × {room.dimensions.z}m
        </Text>
      </View>
    </View>
  );
}

interface FloorPlaneProps {
  width: number;
  depth: number;
  scale: number;
  offset: { x: number; y: number };
  containerSize: number;
  showGrid: boolean;
  gridColor: string;
}

function FloorPlane({ width, depth, scale, offset, containerSize, showGrid, gridColor }: FloorPlaneProps) {
  const floorWidth = width * scale;
  const floorDepth = depth * scale;

  return (
    <View
      style={[
        styles.floorPlane,
        {
          width: floorWidth + floorDepth,
          height: (floorWidth + floorDepth) / 2,
          left: containerSize / 2 - (floorWidth + floorDepth) / 2 + offset.x,
          top: containerSize / 3 + offset.y,
          transform: [{ rotateX: '60deg' }, { rotateZ: '45deg' }],
        },
      ]}
    >
      <View style={[styles.floorSurface, { backgroundColor: '#D4C4A8' }]}>
        {showGrid && (
          <View style={styles.floorGridContainer}>
            {Array.from({ length: Math.ceil(width) + 1 }).map((_, i) => (
              <View
                key={`fv${i}`}
                style={[
                  styles.floorGridLine,
                  {
                    left: (i / width) * 100 + '%',
                    width: 1,
                    height: '100%',
                    backgroundColor: gridColor,
                    opacity: 0.3,
                  },
                ]}
              />
            ))}
            {Array.from({ length: Math.ceil(depth) + 1 }).map((_, i) => (
              <View
                key={`fh${i}`}
                style={[
                  styles.floorGridLine,
                  {
                    top: (i / depth) * 100 + '%',
                    height: 1,
                    width: '100%',
                    backgroundColor: gridColor,
                    opacity: 0.3,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

interface WallPlaneProps {
  width: number;
  height: number;
  scale: number;
  offset: { x: number; y: number };
  containerSize: number;
  position: 'back' | 'left';
}

function WallPlane({ width, height, scale, offset, containerSize, position }: WallPlaneProps) {
  const wallWidth = width * scale;
  const wallHeight = height * scale;

  const isBack = position === 'back';
  const baseColor = isBack ? '#E8E0D5' : '#DDD5C8';

  return (
    <View
      style={[
        styles.wallPlane,
        {
          width: wallWidth,
          height: wallHeight,
          backgroundColor: baseColor,
          left: isBack 
            ? containerSize / 2 - wallWidth / 2 + offset.x 
            : containerSize / 2 - wallWidth - 20 + offset.x,
          top: isBack 
            ? containerSize / 3 - wallHeight + offset.y - 20
            : containerSize / 3 - wallHeight / 2 + offset.y,
          transform: isBack 
            ? [{ skewX: '-30deg' }] 
            : [{ skewX: '30deg' }],
        },
      ]}
    >
      <View style={styles.wallShadow} />
    </View>
  );
}

interface Placed3DItemProps {
  item: InternalPlacedItem;
  itemDef: ItemDefinition;
  position: { x: number; y: number };
  scale: number;
  isSelected: boolean;
  onPress: () => void;
}

function Placed3DItem({ item, itemDef, position, scale, isSelected, onPress }: Placed3DItemProps) {
  const itemWidth = itemDef.size.x * scale;
  const itemHeight = itemDef.size.y * scale;
  const itemDepth = itemDef.size.z * scale;

  const has3DImage = !!itemDef.preview3D?.isometric;
  const imageUrl = has3DImage ? itemDef.preview3D!.isometric : itemDef.imageUrl;

  return (
    <TouchableOpacity
      style={[
        styles.placed3DItem,
        {
          left: position.x - itemWidth / 2,
          top: position.y - itemHeight,
          width: itemWidth + itemDepth * 0.3,
          height: itemHeight + itemDepth * 0.3,
          zIndex: Math.round((item.position.x + item.position.z) * 10),
        },
        isSelected && styles.placed3DItemSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {has3DImage ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.item3DImage}
          resizeMode="contain"
        />
      ) : (
        <Item3DBox
          width={itemWidth}
          height={itemHeight}
          depth={itemDepth}
          color={itemDef.modelColor || '#6B7280'}
          imageUrl={itemDef.imageUrl}
        />
      )}
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <View style={styles.selectedDot} />
        </View>
      )}
    </TouchableOpacity>
  );
}

interface Item3DBoxProps {
  width: number;
  height: number;
  depth: number;
  color: string;
  imageUrl?: string;
}

function Item3DBox({ width, height, depth, color, imageUrl }: Item3DBoxProps) {
  const topColor = lightenColor(color, 25);
  const rightColor = darkenColor(color, 15);

  return (
    <View style={styles.item3DBoxContainer}>
      <View
        style={[
          styles.boxTop,
          {
            width: width,
            height: depth * 0.5,
            backgroundColor: topColor,
            top: 0,
            left: depth * 0.25,
            transform: [{ skewX: '-45deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.boxFront,
          {
            width: width,
            height: height,
            backgroundColor: color,
            top: depth * 0.25,
            left: 0,
            overflow: 'hidden',
          },
        ]}
      >
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.boxFrontImage}
            resizeMode="cover"
          />
        )}
      </View>
      <View
        style={[
          styles.boxRight,
          {
            width: depth * 0.5,
            height: height,
            backgroundColor: rightColor,
            top: depth * 0.25,
            left: width,
            transform: [{ skewY: '-45deg' }],
          },
        ]}
      />
    </View>
  );
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  roomTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomFloor2D: {
    position: 'relative',
    borderRadius: 8,
  },
  room3DContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    opacity: 0.3,
  },
  doorMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  doorIcon: {
    width: 30,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  doorLabel: {
    fontSize: 8,
    color: '#F59E0B',
    marginTop: 2,
  },
  windowMarker: {
    position: 'absolute',
  },
  windowIcon: {
    width: 20,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },
  placedItem2D: {
    position: 'absolute',
    borderRadius: 4,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  roomInfoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roomDimensionsText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  floor3D: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  walls3D: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  floorPlane: {
    position: 'absolute',
  },
  floorSurface: {
    flex: 1,
    borderRadius: 4,
  },
  floorGridContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  floorGridLine: {
    position: 'absolute',
  },
  wallPlane: {
    position: 'absolute',
    borderRadius: 2,
  },
  wallShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  placed3DItem: {
    position: 'absolute',
  },
  placed3DItemSelected: {
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 4,
  },
  item3DImage: {
    width: '100%',
    height: '100%',
  },
  item3DBoxContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  boxTop: {
    position: 'absolute',
  },
  boxFront: {
    position: 'absolute',
  },
  boxFrontImage: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  boxRight: {
    position: 'absolute',
  },
  selectedIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  viewControls: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'column',
    gap: 6,
  },
  viewControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dragHint: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  dragHintText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
});

export default Room3DPreview;
