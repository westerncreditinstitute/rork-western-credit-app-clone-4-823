import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
  ListRenderItemInfo,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Package,
  RotateCw,
  Trash2,
  Copy,
  Check,
  Box,
} from 'lucide-react-native';

import { PlacedItem } from '@/types/home';
import { usePaginatedItems } from '@/hooks/useHomePerformance';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 80;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 48) / 3;

interface PlacedItemCardProps {
  item: PlacedItem;
  isSelected: boolean;
  colors: any;
  onSelect: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const PlacedItemCardComponent = ({
  item,
  isSelected,
  colors,
  onSelect,
  onRotate,
  onDelete,
  onDuplicate,
}: PlacedItemCardProps) => {
  const handleSelect = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  }, [onSelect]);

  const handleRotate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRotate();
  }, [onRotate]);

  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete();
  }, [onDelete]);

  const handleDuplicate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDuplicate();
  }, [onDuplicate]);

  return (
    <TouchableOpacity
      style={[
        styles.itemCard,
        { backgroundColor: colors.surface },
        isSelected && { borderColor: colors.primary, borderWidth: 2 },
      ]}
      onPress={handleSelect}
      activeOpacity={0.8}
    >
      <View style={styles.itemImageContainer}>
        {item.itemImageUrl ? (
          <Image
            source={{ uri: item.itemImageUrl }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.itemImagePlaceholder, { backgroundColor: colors.surfaceAlt }]}>
            <Package color={colors.textLight} size={24} />
          </View>
        )}
      </View>

      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
          {item.itemName}
        </Text>
        <Text style={[styles.itemCategory, { color: colors.textLight }]}>
          {item.itemCategory}
        </Text>
        <Text style={[styles.itemPosition, { color: colors.textSecondary }]}>
          ({item.position.x.toFixed(1)}, {item.position.z.toFixed(1)})
        </Text>
      </View>

      {isSelected && (
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
            onPress={handleRotate}
          >
            <RotateCw color={colors.text} size={16} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
            onPress={handleDuplicate}
          >
            <Copy color={colors.text} size={16} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EF444420' }]}
            onPress={handleDelete}
          >
            <Trash2 color="#EF4444" size={16} />
          </TouchableOpacity>
        </View>
      )}

      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
          <Check color="#FFFFFF" size={12} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const PlacedItemCard = memo(PlacedItemCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.position.x === nextProps.item.position.x &&
    prevProps.item.position.z === nextProps.item.position.z &&
    prevProps.item.rotation.y === nextProps.item.rotation.y &&
    prevProps.isSelected === nextProps.isSelected
  );
});

interface GridItemCardProps {
  item: PlacedItem;
  isSelected: boolean;
  colors: any;
  onSelect: () => void;
}

const GridItemCardComponent = ({
  item,
  isSelected,
  colors,
  onSelect,
}: GridItemCardProps) => {
  return (
    <TouchableOpacity
      style={[
        styles.gridItem,
        { backgroundColor: colors.surface },
        isSelected && { borderColor: colors.primary, borderWidth: 2 },
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {item.itemImageUrl ? (
        <Image
          source={{ uri: item.itemImageUrl }}
          style={styles.gridItemImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.gridItemPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
          <Box color={colors.textLight} size={32} />
        </View>
      )}
      <Text style={[styles.gridItemName, { color: colors.text }]} numberOfLines={1}>
        {item.itemName}
      </Text>
      {isSelected && (
        <View style={[styles.gridSelectedBadge, { backgroundColor: colors.primary }]}>
          <Check color="#FFFFFF" size={10} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const GridItemCard = memo(GridItemCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isSelected === nextProps.isSelected
  );
});

interface VirtualizedItemListProps {
  homeId: string;
  roomId: string;
  selectedItemId: string | null;
  colors: any;
  viewMode?: 'list' | 'grid';
  onSelectItem: (item: PlacedItem) => void;
  onRotateItem: (item: PlacedItem) => void;
  onDeleteItem: (item: PlacedItem) => void;
  onDuplicateItem: (item: PlacedItem) => void;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
}

const WINDOW_SIZE = 5;
const MAX_TO_RENDER_PER_BATCH = 10;
const INITIAL_NUM_TO_RENDER = 15;

export function VirtualizedItemList({
  homeId,
  roomId,
  selectedItemId,
  colors,
  viewMode = 'list',
  onSelectItem,
  onRotateItem,
  onDeleteItem,
  onDuplicateItem,
  ListHeaderComponent,
  ListEmptyComponent,
}: VirtualizedItemListProps) {
  const flatListRef = useRef<FlatList>(null);

  const {
    items,
    totalCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    prefetchNextPage,
  } = usePaginatedItems(homeId, roomId);

  const keyExtractor = useCallback((item: PlacedItem) => item.id, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<PlacedItem> | null | undefined, index: number) => {
      const itemSize = viewMode === 'list' ? ITEM_HEIGHT : GRID_ITEM_SIZE + 8;
      return {
        length: itemSize,
        offset: itemSize * index,
        index,
      };
    },
    [viewMode]
  );

  const renderListItem = useCallback(
    ({ item }: ListRenderItemInfo<PlacedItem>) => (
      <PlacedItemCard
        item={item}
        isSelected={selectedItemId === item.id}
        colors={colors}
        onSelect={() => onSelectItem(item)}
        onRotate={() => onRotateItem(item)}
        onDelete={() => onDeleteItem(item)}
        onDuplicate={() => onDuplicateItem(item)}
      />
    ),
    [colors, selectedItemId, onSelectItem, onRotateItem, onDeleteItem, onDuplicateItem]
  );

  const renderGridItem = useCallback(
    ({ item }: ListRenderItemInfo<PlacedItem>) => (
      <GridItemCard
        item={item}
        isSelected={selectedItemId === item.id}
        colors={colors}
        onSelect={() => onSelectItem(item)}
      />
    ),
    [colors, selectedItemId, onSelectItem]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      console.log('[VirtualizedItemList] Loading more items');
      loadMore();
    }
  }, [hasNextPage, isFetchingNextPage, loadMore]);

  const handleScrollBeginDrag = useCallback(() => {
    prefetchNextPage();
  }, [prefetchNextPage]);

  const ListFooterComponent = useMemo(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading more items...
          </Text>
        </View>
      );
    }
    if (!hasNextPage && items.length > 0) {
      return (
        <View style={styles.endFooter}>
          <Text style={[styles.endText, { color: colors.textLight }]}>
            {totalCount} items total
          </Text>
        </View>
      );
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, items.length, totalCount, colors]);

  const DefaultEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Package color={colors.textLight} size={48} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Items</Text>
        <Text style={[styles.emptyText, { color: colors.textLight }]}>
          This room is empty. Add items from your inventory.
        </Text>
      </View>
    ),
    [colors]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading items...
        </Text>
      </View>
    );
  }

  if (viewMode === 'grid') {
    return (
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderGridItem}
        keyExtractor={keyExtractor}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        windowSize={WINDOW_SIZE}
        maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
        initialNumToRender={INITIAL_NUM_TO_RENDER}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        onScrollBeginDrag={handleScrollBeginDrag}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent || DefaultEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={items}
      renderItem={renderListItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      windowSize={WINDOW_SIZE}
      maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
      initialNumToRender={INITIAL_NUM_TO_RENDER}
      removeClippedSubviews={true}
      updateCellsBatchingPeriod={50}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      onScrollBeginDrag={handleScrollBeginDrag}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent || DefaultEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

interface ItemListSkeletonProps {
  colors: any;
  count?: number;
  viewMode?: 'list' | 'grid';
}

const SkeletonComponent = ({ colors, count = 5, viewMode = 'list' }: ItemListSkeletonProps) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  if (viewMode === 'grid') {
    return (
      <View style={styles.skeletonGridContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.skeletonGridItem,
              { backgroundColor: colors.surface, opacity },
            ]}
          >
            <View style={[styles.skeletonGridImage, { backgroundColor: colors.border }]} />
            <View style={[styles.skeletonLine, { width: '80%', backgroundColor: colors.border }]} />
          </Animated.View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.skeletonListContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.skeletonListItem,
            { backgroundColor: colors.surface, opacity },
          ]}
        >
          <View style={[styles.skeletonImage, { backgroundColor: colors.border }]} />
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonLine, { width: '70%', backgroundColor: colors.border }]} />
            <View style={[styles.skeletonLine, { width: '50%', backgroundColor: colors.border }]} />
            <View style={[styles.skeletonLine, { width: '30%', backgroundColor: colors.border }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

export const ItemListSkeleton = memo(SkeletonComponent);

const styles = StyleSheet.create({
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  itemCategory: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  itemPosition: {
    fontSize: 11,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gridItemImage: {
    width: '100%',
    aspectRatio: 1,
  },
  gridItemPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemName: {
    fontSize: 11,
    fontWeight: '500' as const,
    padding: 8,
    textAlign: 'center',
  },
  gridSelectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  gridContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  endFooter: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  endText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  skeletonListContainer: {
    paddingTop: 8,
  },
  skeletonListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  skeletonImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    gap: 6,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  skeletonGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  skeletonGridItem: {
    width: GRID_ITEM_SIZE,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8,
    alignItems: 'center',
  },
  skeletonGridImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
});
