import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  TextInput,
  Image,
  Dimensions,
  Animated,
  Share,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Search,
  Filter,
  TrendingUp,
  Users,
  MapPin,
  X,
  Sparkles,
  Home,
  Building2,
  Castle,
  Palmtree,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCommunityHomes } from '@/contexts/CommunityHomesContext';
import HomeProfileCard from '@/components/community/HomeProfileCard';
import {
  CommunityHome,
  HomeFeedSortOption,
  PropertyType,
} from '@/types/communityHomes';
import { FEATURED_CITIES } from '@/mocks/communityHomesData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SORT_OPTIONS: { value: HomeFeedSortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'trending', label: 'Trending', icon: <TrendingUp size={16} color="#EF4444" /> },
  { value: 'newest', label: 'New', icon: <Sparkles size={16} color="#8B5CF6" /> },
  { value: 'most_visited', label: 'Popular', icon: <Users size={16} color="#3B82F6" /> },
  { value: 'highest_value', label: 'Luxury', icon: <Castle size={16} color="#F59E0B" /> },
];

const PROPERTY_TYPES: { value: PropertyType; label: string; icon: React.ReactNode }[] = [
  { value: 'apartment', label: 'Apartment', icon: <Building2 size={18} color="#3B82F6" /> },
  { value: 'house', label: 'House', icon: <Home size={18} color="#22C55E" /> },
  { value: 'mansion', label: 'Mansion', icon: <Castle size={18} color="#F59E0B" /> },
  { value: 'beach_house', label: 'Beach', icon: <Palmtree size={18} color="#06B6D4" /> },
];

function CommunityHomesContent() {
  const { colors } = useTheme();
  const {
    homes,
    liveTourHomes,
    featuredOwners,
    isRefreshing,
    sortBy,
    searchQuery,
    filter,
    setSortBy,
    setSearchQuery,
    setFilter,
    toggleLike,
    toggleSave,
    refreshFeed,
    clearFilters,
    startVisitSession,
  } = useCommunityHomes();

  const [showSearch, setShowSearch] = useState(false);
  const [, setShowFilters] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;

  const toggleSearch = useCallback(() => {
    setShowSearch(prev => {
      Animated.timing(searchAnim, {
        toValue: prev ? 0 : 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
      return !prev;
    });
  }, [searchAnim]);

  const handleHomePress = useCallback((home: CommunityHome) => {
    console.log('[CommunityHomes] Home pressed:', home.id);
  }, []);

  const handleVisit = useCallback((home: CommunityHome) => {
    try {
      startVisitSession(home.id);
      Alert.alert(
        'Virtual Tour Started',
        `You're now touring ${home.propertyName}. Explore the ${home.details.bedrooms} bedrooms and ${home.details.bathrooms} bathrooms!`,
        [{ text: 'Continue', style: 'default' }]
      );
    } catch (error) {
      console.log('[CommunityHomes] Error starting visit:', error);
    }
  }, [startVisitSession]);

  const handleShare = useCallback(async (home: CommunityHome) => {
    try {
      await Share.share({
        message: `Check out ${home.propertyName} by ${home.owner.name} - ${home.financials.currentValue > 0 ? `valued at $${home.financials.currentValue.toLocaleString()}` : 'Rental Property'}`,
        title: home.propertyName,
      });
    } catch (error) {
      console.log('[CommunityHomes] Share error:', error);
    }
  }, []);

  const handleOwnerPress = useCallback((ownerId: string) => {
    console.log('[CommunityHomes] Owner pressed:', ownerId);
  }, []);

  const handleSortChange = useCallback((sort: HomeFeedSortOption) => {
    setSortBy(sort);
  }, [setSortBy]);

  const handlePropertyTypeFilter = useCallback((type: PropertyType) => {
    setFilter(prev => {
      const currentTypes = prev.propertyTypes || [];
      const hasType = currentTypes.includes(type);
      return {
        ...prev,
        propertyTypes: hasType
          ? currentTypes.filter(t => t !== type)
          : [...currentTypes, type],
      };
    });
  }, [setFilter]);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {liveTourHomes.length > 0 && (
        <View style={styles.liveSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.liveDot} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Tours</Text>
            <Text style={[styles.liveCount, { color: '#22C55E' }]}>
              {liveTourHomes.length} live now
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.liveScroll}
          >
            {liveTourHomes.map(home => (
              <TouchableOpacity
                key={home.id}
                style={styles.liveCard}
                onPress={() => handleVisit(home)}
              >
                <Image source={{ uri: home.coverImage }} style={styles.liveImage} />
                <View style={styles.liveOverlay} pointerEvents="none">
                  <View style={styles.liveBadge}>
                    <View style={styles.livePulse} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                  <View style={styles.liveViewers}>
                    <Users size={12} color="#FFF" />
                    <Text style={styles.liveViewersText}>
                      {home.virtualTour?.currentVisitors}
                    </Text>
                  </View>
                </View>
                <View style={styles.liveInfo}>
                  <Image source={{ uri: home.owner.avatar }} style={styles.liveAvatar} />
                  <View style={styles.liveTextContainer}>
                    <Text style={[styles.liveName, { color: colors.text }]} numberOfLines={1}>
                      {home.propertyName}
                    </Text>
                    <Text style={[styles.liveOwner, { color: colors.textSecondary }]} numberOfLines={1}>
                      {home.owner.name}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.featuredOwnersSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Owners</Text>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ownersScroll}
        >
          {featuredOwners.map(owner => (
            <TouchableOpacity
              key={owner.id}
              style={styles.ownerCard}
              onPress={() => handleOwnerPress(owner.id)}
            >
              <View style={styles.ownerAvatarContainer}>
                <Image source={{ uri: owner.avatar }} style={styles.ownerAvatar} />
                {owner.isOnline && <View style={styles.ownerOnline} />}
              </View>
              <Text style={[styles.ownerName, { color: colors.text }]} numberOfLines={1}>
                {owner.name.split('_')[0]}
              </Text>
              <Text style={[styles.ownerScore, { color: colors.textSecondary }]}>
                {owner.creditScore}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.citiesSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore Cities</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.citiesScroll}
        >
          {FEATURED_CITIES.map(city => (
            <TouchableOpacity
              key={city.name}
              style={styles.cityCard}
              onPress={() => setFilter({ ...filter, cities: [city.name] })}
            >
              <Image source={{ uri: city.image }} style={styles.cityImage} />
              <View style={styles.cityOverlay} pointerEvents="none">
                <MapPin size={14} color="#FFF" />
                <Text style={styles.cityName}>{city.name}</Text>
                <Text style={styles.cityCount}>{city.count} homes</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.sortSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortScroll}
        >
          {SORT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortChip,
                sortBy === option.value && { backgroundColor: colors.primary + '15' },
                { borderColor: sortBy === option.value ? colors.primary : colors.border },
              ]}
              onPress={() => handleSortChange(option.value)}
            >
              {option.icon}
              <Text
                style={[
                  styles.sortChipText,
                  { color: sortBy === option.value ? colors.primary : colors.textSecondary },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.propertyTypeSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeScroll}
        >
          {PROPERTY_TYPES.map(type => {
            const isSelected = filter.propertyTypes?.includes(type.value);
            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeChip,
                  isSelected && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                  { borderColor: isSelected ? colors.primary : colors.border },
                ]}
                onPress={() => handlePropertyTypeFilter(type.value)}
              >
                {type.icon}
                <Text
                  style={[
                    styles.typeChipText,
                    { color: isSelected ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {(filter.propertyTypes?.length || filter.cities?.length) && (
        <TouchableOpacity style={styles.clearFilters} onPress={clearFilters}>
          <X size={14} color={colors.primary} />
          <Text style={[styles.clearFiltersText, { color: colors.primary }]}>
            Clear Filters
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.feedHeader}>
        <Text style={[styles.feedTitle, { color: colors.text }]}>
          Community Homes
        </Text>
        <Text style={[styles.feedCount, { color: colors.textSecondary }]}>
          {homes.length} homes
        </Text>
      </View>
    </View>
  );

  const renderHome = useCallback(({ item }: { item: CommunityHome }) => (
    <HomeProfileCard
      home={item}
      onPress={() => handleHomePress(item)}
      onLike={() => toggleLike(item.id)}
      onSave={() => toggleSave(item.id)}
      onShare={() => handleShare(item)}
      onVisit={() => handleVisit(item)}
      onOwnerPress={() => handleOwnerPress(item.owner.id)}
    />
  ), [toggleLike, toggleSave, handleShare, handleVisit, handleHomePress, handleOwnerPress]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Home size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No homes found</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Try adjusting your filters or search query
      </Text>
      <TouchableOpacity
        style={[styles.clearButton, { backgroundColor: colors.primary }]}
        onPress={clearFilters}
      >
        <Text style={styles.clearButtonText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );

  const searchWidth = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, SCREEN_WIDTH - 80],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Community Homes',
          headerRight: () => (
            <View style={styles.headerActions}>
              <Animated.View style={[styles.searchContainer, { width: searchWidth }]}>
                {showSearch ? (
                  <View style={[styles.searchInputContainer, { backgroundColor: colors.surface }]}>
                    <Search size={18} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Search homes..."
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus
                    />
                    <TouchableOpacity onPress={toggleSearch}>
                      <X size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.headerButton} onPress={toggleSearch}>
                    <Search size={22} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </Animated.View>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowFilters(true)}
              >
                <Filter size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <FlatList
        data={homes}
        keyExtractor={(item) => item.id}
        renderItem={renderHome}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshFeed}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />
    </View>
  );
}

export default function CommunityHomesScreen() {
  return <CommunityHomesContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    overflow: 'hidden',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
  },
  headerContent: {
    paddingTop: 8,
  },
  liveSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  liveCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  liveScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  liveCard: {
    width: 180,
    borderRadius: 12,
    overflow: 'hidden',
  },
  liveImage: {
    width: '100%',
    height: 100,
  },
  liveOverlay: {
    ...StyleSheet.absoluteFillObject,
    height: 100,
    padding: 8,
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  liveBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  liveViewers: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  liveViewersText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  liveInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },
  liveAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  liveTextContainer: {
    flex: 1,
  },
  liveName: {
    fontSize: 13,
    fontWeight: '600',
  },
  liveOwner: {
    fontSize: 11,
  },
  featuredOwnersSection: {
    marginBottom: 20,
  },
  ownersScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  ownerCard: {
    alignItems: 'center',
    width: 70,
  },
  ownerAvatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  ownerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  ownerOnline: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  ownerName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  ownerScore: {
    fontSize: 11,
    fontWeight: '600',
  },
  citiesSection: {
    marginBottom: 16,
  },
  citiesScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cityCard: {
    width: 140,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cityImage: {
    width: '100%',
    height: '100%',
  },
  cityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 10,
    justifyContent: 'flex-end',
  },
  cityName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  cityCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  sortSection: {
    marginBottom: 12,
  },
  sortScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  propertyTypeSection: {
    marginBottom: 12,
  },
  typeScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  feedTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  feedCount: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
