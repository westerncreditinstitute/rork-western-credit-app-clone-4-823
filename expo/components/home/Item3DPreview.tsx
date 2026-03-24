import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Eye } from 'lucide-react-native';
import { Vector3 } from '@/types/home';

export type ViewAngle = 'front' | 'side' | 'top' | 'isometric';

export interface Item3DPreviewItem {
  id?: string;
  name: string;
  imageUrl: string;
  category?: string;
  preview3D?: {
    front: string;
    side: string;
    top: string;
    isometric: string;
  };
  modelColor?: string;
  size?: Vector3;
}

interface Item3DPreviewProps {
  item: Item3DPreviewItem;
  size?: number;
  showControls?: boolean;
  initialAngle?: ViewAngle;
  rotation?: number;
  isSelected?: boolean;
  onPress?: () => void;
  style?: object;
}

const VIEW_ANGLE_LABELS: Record<ViewAngle, string> = {
  front: 'Front',
  side: 'Side',
  top: 'Top',
  isometric: '3D',
};

const VIEW_ANGLES: ViewAngle[] = ['isometric', 'front', 'side', 'top'];

export function Item3DPreview({
  item,
  size = 120,
  showControls = false,
  initialAngle = 'isometric',
  rotation = 0,
  isSelected = false,
  onPress,
  style,
}: Item3DPreviewProps) {
  const [currentAngle, setCurrentAngle] = useState<ViewAngle>(initialAngle);
  const [imageError, setImageError] = useState(false);

  const getImageUrl = useCallback((angle: ViewAngle): string => {
    if (item.preview3D) {
      return item.preview3D[angle] || item.imageUrl;
    }
    return item.imageUrl;
  }, [item]);

  const handleCycleAngle = useCallback(() => {
    const currentIndex = VIEW_ANGLES.indexOf(currentAngle);
    const nextIndex = (currentIndex + 1) % VIEW_ANGLES.length;
    setCurrentAngle(VIEW_ANGLES[nextIndex]);
    setImageError(false);
  }, [currentAngle]);

  const containerStyle = useMemo(() => [
    styles.container,
    {
      width: size,
      height: size,
      borderColor: isSelected ? '#10B981' : 'transparent',
      borderWidth: isSelected ? 2 : 0,
    },
    style,
  ], [size, isSelected, style]);

  const rotationStyle = useMemo(() => ({
    transform: [{ rotate: `${rotation}deg` }],
  }), [rotation]);

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <View style={[styles.imageContainer, rotationStyle]}>
        {!imageError ? (
          <Image
            source={{ uri: getImageUrl(currentAngle) }}
            style={[styles.image, { width: size - 8, height: size - 8 }]}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.fallbackContainer, { backgroundColor: item.modelColor || '#6B7280' }]}>
            <Item3DBlock
              size={item.size || { x: 1, y: 1, z: 1 }}
              color={item.modelColor || '#6B7280'}
              containerSize={size - 16}
            />
          </View>
        )}
      </View>

      {showControls && item.preview3D && (
        <View style={styles.controlsOverlay}>
          <TouchableOpacity
            style={styles.angleButton}
            onPress={handleCycleAngle}
          >
            <Eye color="#FFFFFF" size={14} />
            <Text style={styles.angleButtonText}>{VIEW_ANGLE_LABELS[currentAngle]}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSelected && (
        <View style={styles.selectedOverlay}>
          <View style={styles.selectedCorner} />
        </View>
      )}
    </TouchableOpacity>
  );
}

interface Item3DBlockProps {
  size: Vector3;
  color: string;
  containerSize: number;
}

function Item3DBlock({ size, color, containerSize }: Item3DBlockProps) {
  const safeSize = size || { x: 1, y: 1, z: 1 };
  const scale = Math.min(
    containerSize / (safeSize.x * 20),
    containerSize / (safeSize.y * 20),
    containerSize / (safeSize.z * 20)
  ) * 0.6;

  const width = safeSize.x * 20 * scale;
  const height = safeSize.y * 20 * scale;
  const depth = safeSize.z * 20 * scale;

  const topColor = lightenColor(color, 20);
  const rightColor = darkenColor(color, 20);

  return (
    <View style={styles.block3DContainer}>
      <View
        style={[
          styles.blockTop,
          {
            width: width,
            height: depth * 0.5,
            backgroundColor: topColor,
            transform: [
              { translateY: -height / 2 - depth * 0.25 },
              { skewX: '-45deg' },
            ],
          },
        ]}
      />
      <View
        style={[
          styles.blockFront,
          {
            width: width,
            height: height,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.blockRight,
          {
            width: depth * 0.5,
            height: height,
            backgroundColor: rightColor,
            transform: [
              { translateX: width / 2 + depth * 0.25 },
              { skewY: '-45deg' },
            ],
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
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    borderRadius: 8,
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  angleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  angleButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  selectedCorner: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 16,
    height: 16,
    backgroundColor: '#10B981',
    borderBottomLeftRadius: 8,
  },
  block3DContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  blockTop: {
    position: 'absolute',
  },
  blockFront: {
    position: 'absolute',
  },
  blockRight: {
    position: 'absolute',
  },
});

export default Item3DPreview;
