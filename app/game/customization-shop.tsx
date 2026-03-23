import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ShoppingBag,
  Search,
  Filter,
  Store,
  ShoppingCart,
  TrendingUp,
  MapPin,
  Star,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { customizationService } from '@/services/CustomizationService';
import type { AvailableItem, AvatarItem } from '@/types/customization';

export default function CustomizationShopScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AvailableItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<AvailableItem | null>(null);

  const categories = ['all', 'outfit', 'hat', 'accessory', 'shoes', 'glasses'];
  const sources = ['all', 'business', 'marketplace'];

  useEffect(() => {
    loadAvailableItems();
  }, [params.city_id]);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCategory, selectedSource, availableItems]);

  const loadAvailableItems = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Authentication Required', 'Please log in to shop');
        return;
      }

      const items = await customizationService.getAvailableItems(
        user.id,
        params.city_id as string
      );

      setAvailableItems(items);
      setFilteredItems(items);
    } catch (error) {
      console.error('Error loading available items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...availableItems];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((item) =>
        item.item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.item.item_type === selectedCategory);
    }

    // Apply source filter
    if (selectedSource === 'business') {
      filtered = filtered.filter((item) => item.is_available_locally);
    } else if (selectedSource === 'marketplace') {
      filtered = filtered.filter((item) => item.available_from.marketplace.length > 0);
    }

    setFilteredItems(filtered);
  };

  const handlePurchaseFromBusiness = async (businessId: string, itemId: string, price: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const result = await customizationService.purchaseFromBusiness(
        user.id,
        businessId,
        itemId,
        price
      );

      if (result.success) {
        Alert.alert(
          'Purchase Successful!',
          `You have purchased the item for $${price.toLocaleString()}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedItem(null);
                loadAvailableItems();
              },
            },
          ]
        );
      } else {
        Alert.alert('Purchase Failed', result.error || 'An error occurred');
      }
    } catch (error) {
      console.error('Error purchasing item:', error);
      Alert.alert('Error', 'An error occurred while purchasing the item');
    }
  };

  const showPurchaseOptions = (item: AvailableItem) => {
    setSelectedItem(item);
  };

  const renderCategoryFilter = (category: string) => {
    const displayName = category.charAt(0).toUpperCase() + category.slice(1);
    return (
      <TouchableOpacity
        style={[styles.filterChip, selectedCategory === category && styles.filterChipActive]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text style={[styles.filterChipText, selectedCategory === category && styles.filterChipTextActive]}>
          {displayName}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSourceFilter = (source: string) => {
    const displayName = source.charAt(0).toUpperCase() + source.slice(1);
    return (
      <TouchableOpacity
        style={[styles.filterChip, selectedSource === source && styles.filterChipActive]}
        onPress={() => setSelectedSource(source)}
      >
        <Text style={[styles.filterChipText, selectedSource === source && styles.filterChipTextActive]}>
          {displayName}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItemCard = (item: AvailableItem) => {
    const hasBusinessStock = item.available_from.businesses.some((b: { stock: number }) => b.stock > 0);
    const hasMarketplaceListings = item.available_from.marketplace.length > 0;

    return (
      <TouchableOpacity
        key={item.item.id}
        style={styles.itemCard}
        onPress={() => showPurchaseOptions(item)}
      >
        <View style={styles.itemImageContainer}>
          {item.item.image_url ? (
            <Image
              source={{ uri: item.item.image_url }}
              style={styles.itemImage}
            />
          ) : (
            <View style={styles.itemImagePlaceholder}>
              <ShoppingBag size={32} color="#6366f1" />
            </View>
          )}
          <View style={styles.rarityBadge}>
            <Text style={styles.rarityText}>{item.item.rarity}</Text>
          </View>
        </View>

        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{item.item.name}</Text>
          <Text style={styles.itemCategory}>{item.item.category}</Text>

          <View style={styles.itemStats}>
            <View style={styles.stat}>
              <Store size={16} color="#64748b" />
              <Text style={styles.statText}>{item.available_from.businesses.length} stores</Text>
            </View>
            <View style={styles.stat}>
              <ShoppingCart size={16} color="#64748b" />
              <Text style={styles.statText}>{item.available_from.marketplace.length} listings</Text>
            </View>
          </View>

          <View style={styles.priceSection}>
            <View>
              <Text style={styles.priceLabel}>Best Price</Text>
              <Text style={styles.priceValue}>${item.best_price.toLocaleString()}</Text>
            </View>
            <View style={styles.availabilityBadge}>
              <Text style={styles.availabilityText}>
                {item.total_availability} available
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPurchaseModal = () => {
    if (!selectedItem) return null;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Purchase {selectedItem.item.name}</Text>
            <TouchableOpacity onPress={() => setSelectedItem(null)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Business Options */}
            {selectedItem.available_from.businesses.map((business: { business_id: string; business_name: string; price: number; stock: number }) => (
              <TouchableOpacity
                key={business.business_id}
                style={styles.purchaseOption}
                onPress={() => handlePurchaseFromBusiness(business.business_id, selectedItem.item.id, business.price)}
              >
                <View style={styles.purchaseOptionLeft}>
                  <MapPin size={20} color="#6366f1" />
                  <View style={styles.purchaseOptionInfo}>
                    <Text style={styles.purchaseOptionName}>{business.business_name}</Text>
                    <Text style={styles.purchaseOptionDetail}>
                      Stock: {business.stock}
                    </Text>
                  </View>
                </View>
                <View style={styles.purchaseOptionRight}>
                  <Text style={styles.purchaseOptionPrice}>${business.price.toLocaleString()}</Text>
                  <Star size={16} color="#f59e0b" fill="#f59e0b" />
                </View>
              </TouchableOpacity>
            ))}

            {/* Marketplace Options */}
            {selectedItem.available_from.marketplace.map((listing: { listing_id: string; seller_name: string; price: number; condition: string }) => (
              <TouchableOpacity
                key={listing.listing_id}
                style={[styles.purchaseOption, styles.marketplaceOption]}
                onPress={() => {
                  // Navigate to marketplace listing
                  router.push(`/game/marketplace-listing?id=${listing.listing_id}` as any);
                  setSelectedItem(null);
                }}
              >
                <View style={styles.purchaseOptionLeft}>
                  <ShoppingCart size={20} color="#6366f1" />
                  <View style={styles.purchaseOptionInfo}>
                    <Text style={styles.purchaseOptionName}>Seller: {listing.seller_name}</Text>
                    <Text style={styles.purchaseOptionDetail}>
                      Condition: {listing.condition}
                    </Text>
                  </View>
                </View>
                <View style={styles.purchaseOptionRight}>
                  <Text style={styles.purchaseOptionPrice}>${listing.price.toLocaleString()}</Text>
                  <TrendingUp size={16} color="#6366f1" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customization Shop</Text>
        <Text style={styles.headerSubtitle}>
          Browse items from local businesses and marketplace
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Category:</Text>
          {categories.map((category) => renderCategoryFilter(category))}
        </View>
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Source:</Text>
          {sources.map((source) => renderSourceFilter(source))}
        </View>
      </ScrollView>

      {/* Items Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading items...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingBag size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No items found</Text>
          <Text style={styles.emptyText}>
            Try adjusting your filters or search query
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.itemsContainer}>
          <View style={styles.itemsGrid}>
            {filteredItems.map((item) => renderItemCard(item))}
          </View>
        </ScrollView>
      )}

      {/* Purchase Modal */}
      {renderPurchaseModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  searchContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: '#1e293b',
  },
  filterButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  itemsContainer: {
    flex: 1,
    padding: 16,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  itemCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: '1%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  itemContent: {
    padding: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  itemStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 4,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  availabilityBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
  },
  modalBody: {
    maxHeight: '70%',
  },
  purchaseOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  marketplaceOption: {
    backgroundColor: '#f8fafc',
  },
  purchaseOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  purchaseOptionInfo: {
    marginLeft: 12,
  },
  purchaseOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  purchaseOptionDetail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  purchaseOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  purchaseOptionPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
    marginRight: 8,
  },
});