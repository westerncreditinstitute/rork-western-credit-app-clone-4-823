import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Building2, MapPin, DollarSign, Star, TrendingUp, Filter } from 'lucide-react-native';
import { businessOwnershipService } from '@/services/BusinessOwnershipService';
import type { PhysicalBusiness, City, BusinessCategory } from '@/types/business-ownership';

export default function BusinessBrowserScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [businesses, setBusinesses] = useState<PhysicalBusiness[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(params.city_id as string || null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedCity, selectedCategory]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [citiesData, categoriesData] = await Promise.all([
        businessOwnershipService.getCities(),
        businessOwnershipService.getBusinessCategories(),
      ]);

      setCities(citiesData);
      setCategories(categoriesData);

      const filter = {
        city_id: selectedCity || undefined,
        category_id: selectedCategory || undefined,
        for_sale_only: true,
      };

      const businessesData = await businessOwnershipService.getAvailableBusinesses(filter);
      setBusinesses(businessesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const renderCityFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Select City</Text>
      <FlatList
        horizontal
        data={cities}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, selectedCity === item.id && styles.filterChipActive]}
            onPress={() => setSelectedCity(item.id)}
          >
            <Text style={[styles.filterChipText, selectedCity === item.id && styles.filterChipTextActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.filterList}
      />
    </View>
  );

  const renderCategoryFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Business Category</Text>
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === item.id && styles.filterChipActive]}
            onPress={() => setSelectedCategory(item.id)}
          >
            <Text style={[styles.filterChipText, selectedCategory === item.id && styles.filterChipTextActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.filterList}
      />
    </View>
  );

  const renderBusinessCard = ({ item }: { item: PhysicalBusiness }) => (
    <TouchableOpacity
      style={styles.businessCard}
      onPress={() => router.push(`/game/business-detail?id=${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.businessInfo}>
          <Building2 size={24} color="#6366f1" />
          <View style={styles.businessNameContainer}>
            <Text style={styles.businessName}>{item.name}</Text>
            <Text style={styles.businessCategory}>{item.category?.name}</Text>
          </View>
        </View>
        <View style={[styles.badge, styles.forSaleBadge]}>
          <Text style={styles.badgeText}>For Sale</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <MapPin size={16} color="#64748b" />
          <Text style={styles.detailText}>{item.address_city}, {item.address_state}</Text>
        </View>

        <View style={styles.detailRow}>
          <DollarSign size={16} color="#64748b" />
          <Text style={styles.detailText}>${item.listing_price?.toLocaleString()}</Text>
        </View>

        {item.monthly_revenue > 0 && (
          <View style={styles.detailRow}>
            <TrendingUp size={16} color="#64748b" />
            <Text style={styles.detailText}>
              ${item.monthly_revenue.toLocaleString()}/mo revenue
            </Text>
          </View>
        )}

        {item.customer_rating && (
          <View style={styles.detailRow}>
            <Star size={16} color="#f59e0b" />
            <Text style={styles.detailText}>
              {item.customer_rating.toFixed(1)} ({item.total_reviews} reviews)
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.purchasePrice}>${item.listing_price?.toLocaleString()}</Text>
        <Text style={styles.viewDetails}>View Details →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Business Marketplace</Text>
        <Text style={styles.headerSubtitle}>
          {businesses.length} businesses available
        </Text>
      </View>

      {renderCityFilter()}
      {renderCategoryFilter()}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading businesses...</Text>
        </View>
      ) : businesses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Building2 size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No businesses found</Text>
          <Text style={styles.emptyText}>
            Try adjusting your filters or check back later
          </Text>
        </View>
      ) : (
        <FlatList
          data={businesses}
          renderItem={renderBusinessCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
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
  filterSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  filterList: {
    paddingRight: 16,
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
  list: {
    padding: 16,
  },
  businessCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  businessNameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  businessCategory: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  forSaleBadge: {
    backgroundColor: '#dcfce7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  purchasePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  viewDetails: {
    fontSize: 14,
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
});