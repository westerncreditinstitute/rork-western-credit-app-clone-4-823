import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  Home,
  Users,
  Star,
  Filter,
  ChevronRight,
  Eye,
  Package,
  Clock,
  TrendingUp,
  Building2,
  Castle,
  Warehouse,
  X,
  SortAsc,
  SortDesc,
  History,
  MapPin,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { visitorSystem, PublicHomeEntry, VisitHistoryEntry } from '@/utils/visitorSystem';
import { HOME_TIERS } from '@/types/home';
import { useHome } from '@/contexts/HomeContext';
import HomeNavigation from '@/components/HomeNavigation';
import { trpc } from '@/lib/trpc';

type SortOption = 'rating' | 'visitors' | 'items' | 'recent';
type FilterTier = 0 | 1 | 2 | 3 | 4;

const TIER_ICONS: Record<number, React.ComponentType<any>> = {
  1: Warehouse,
  2: Building2,
  3: Home,
  4: Castle,
};

const TIER_COLORS: Record<number, readonly [string, string]> = {
  1: ['#6B7280', '#4B5563'],
  2: ['#3B82F6', '#2563EB'],
  3: ['#10B981', '#059669'],
  4: ['#F59E0B', '#D97706'],
};

export default function HomeBrowserScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasHome } = useHome();
  
  const publicHomesQuery = trpc.homes.getPublicHomes.useQuery(
    { limit: 50 },
    { staleTime: 30000 }
  );
  
  const [publicHomes, setPublicHomes] = useState<PublicHomeEntry[]>([]);
  const [filteredHomes, setFilteredHomes] = useState<PublicHomeEntry[]>([]);
  const [visitHistory, setVisitHistory] = useState<VisitHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [sortAscending, setSortAscending] = useState(false);
  const [filterTier, setFilterTier] = useState<FilterTier>(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'browse' | 'history'>('browse');
  const [visitingHomeId, setVisitingHomeId] = useState<string | null>(null);
  
  const filterAnimation = useState(new Animated.Value(0))[0];

  const loadPublicHomes = useCallback(async () => {
    console.log('[HomeBrowser] Loading public homes');
    try {
      if (publicHomesQuery.data?.homes) {
        setPublicHomes(publicHomesQuery.data.homes as PublicHomeEntry[]);
      } else {
        const homes = await visitorSystem.browsePublicHomes();
        setPublicHomes(homes);
      }
      setVisitHistory(visitorSystem.getVisitHistory());
    } catch (error) {
      console.error('[HomeBrowser] Error loading homes:', error);
      Alert.alert('Error', 'Failed to load public homes. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [publicHomesQuery.data]);

  useEffect(() => {
    loadPublicHomes();
  }, [loadPublicHomes]);

  useEffect(() => {
    if (publicHomesQuery.data?.homes) {
      setPublicHomes(publicHomesQuery.data.homes as PublicHomeEntry[]);
      setIsLoading(false);
    }
  }, [publicHomesQuery.data]);

  useEffect(() => {
    let filtered = [...publicHomes];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        home =>
          home.hostName.toLowerCase().includes(query) ||
          home.tierName.toLowerCase().includes(query)
      );
    }

    if (filterTier > 0) {
      filtered = filtered.filter(home => home.homeTier === filterTier);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'rating':
          comparison = b.rating - a.rating;
          break;
        case 'visitors':
          comparison = b.visitorCount - a.visitorCount;
          break;
        case 'items':
          comparison = b.itemCount - a.itemCount;
          break;
        case 'recent':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
      }
      return sortAscending ? -comparison : comparison;
    });

    setFilteredHomes(filtered);
  }, [publicHomes, searchQuery, sortBy, sortAscending, filterTier]);

  const toggleFilters = useCallback(() => {
    const toValue = showFilters ? 0 : 1;
    setShowFilters(!showFilters);
    Animated.spring(filterAnimation, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 10,
    }).start();
  }, [showFilters, filterAnimation]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPublicHomes();
  }, [loadPublicHomes]);

  const handleVisitHome = useCallback(async (home: PublicHomeEntry) => {
    if (home.visitorCount >= home.maxVisitors) {
      Alert.alert('Home Full', 'This home is at maximum visitor capacity. Please try again later.');
      return;
    }

    setVisitingHomeId(home.homeId);
    console.log('[HomeBrowser] Visiting home:', home.homeId);

    try {
      const success = await visitorSystem.visitHome(
        home.homeId,
        'current_user_id',
        'CurrentPlayer'
      );

      if (success) {
        Alert.alert(
          'Welcome!',
          `You are now visiting ${home.hostName}'s ${home.tierName}.`,
          [{ text: 'Explore', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', 'Failed to join home visit. Please try again.');
      }
    } catch (error) {
      console.error('[HomeBrowser] Error visiting home:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setVisitingHomeId(null);
    }
  }, [router]);

  const renderTierIcon = (tier: number, size: number = 20, color: string = '#FFFFFF') => {
    const IconComponent = TIER_ICONS[tier] || Home;
    return <IconComponent size={size} color={color} />;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const renderHomeCard = (home: PublicHomeEntry) => {
    const tierColors = TIER_COLORS[home.homeTier] || TIER_COLORS[1];
    const isVisiting = visitingHomeId === home.homeId;
    const isFull = home.visitorCount >= home.maxVisitors;

    return (
      <TouchableOpacity
        key={home.homeId}
        style={styles.homeCard}
        onPress={() => handleVisitHome(home)}
        disabled={isVisiting || isFull}
        activeOpacity={0.8}
      >
        <View style={styles.homeImageContainer}>
          {home.previewImageUrl ? (
            <Image source={{ uri: home.previewImageUrl }} style={styles.homeImage} />
          ) : (
            <LinearGradient colors={tierColors} style={styles.homeImagePlaceholder}>
              {renderTierIcon(home.homeTier, 48, 'rgba(255,255,255,0.5)')}
            </LinearGradient>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageOverlay}
          />
          <View style={styles.tierBadge}>
            <LinearGradient colors={tierColors} style={styles.tierBadgeGradient}>
              {renderTierIcon(home.homeTier, 14, '#FFFFFF')}
              <Text style={styles.tierBadgeText}>{home.tierName}</Text>
            </LinearGradient>
          </View>
          {isFull && (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>FULL</Text>
            </View>
          )}
        </View>

        <View style={styles.homeContent}>
          <View style={styles.homeHeader}>
            <Text style={styles.hostName}>{home.hostName}</Text>
            <View style={styles.ratingContainer}>
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>{home.rating.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.homeStats}>
            <View style={styles.statItem}>
              <Users size={14} color="#6B7280" />
              <Text style={styles.statText}>
                {home.visitorCount}/{home.maxVisitors}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Package size={14} color="#6B7280" />
              <Text style={styles.statText}>{home.itemCount} items</Text>
            </View>
            <View style={styles.statItem}>
              <Eye size={14} color="#6B7280" />
              <Text style={styles.statText}>{home.totalVisits}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.roomCount}>{home.roomCount} rooms</Text>
            {isVisiting ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <View style={[styles.visitButton, isFull && styles.visitButtonDisabled]}>
                <Text style={[styles.visitButtonText, isFull && styles.visitButtonTextDisabled]}>
                  {isFull ? 'Full' : 'Visit'}
                </Text>
                {!isFull && <ChevronRight size={16} color="#FFFFFF" />}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHistoryItem = (entry: VisitHistoryEntry, index: number) => (
    <View key={`${entry.homeId}-${index}`} style={styles.historyItem}>
      <View style={styles.historyIcon}>
        <MapPin size={20} color="#6B7280" />
      </View>
      <View style={styles.historyContent}>
        <Text style={styles.historyHostName}>{entry.hostName}</Text>
        <View style={styles.historyDetails}>
          <Clock size={12} color="#9CA3AF" />
          <Text style={styles.historyDetailText}>
            {formatDuration(entry.duration)} • {formatDate(entry.visitTime)}
          </Text>
        </View>
        <Text style={styles.roomsVisited}>
          Visited: {entry.roomsVisited.join(', ')}
        </Text>
      </View>
    </View>
  );

  const filterHeight = filterAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Home Browser',
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#FFFFFF',
        }}
      />

      <HomeNavigation currentScreen="browser" showCompact />

      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search homes..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'browse' && styles.tabActive]}
            onPress={() => setSelectedTab('browse')}
          >
            <Home size={18} color={selectedTab === 'browse' ? '#3B82F6' : '#6B7280'} />
            <Text style={[styles.tabText, selectedTab === 'browse' && styles.tabTextActive]}>
              Browse
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'history' && styles.tabActive]}
            onPress={() => setSelectedTab('history')}
          >
            <History size={18} color={selectedTab === 'history' ? '#3B82F6' : '#6B7280'} />
            <Text style={[styles.tabText, selectedTab === 'history' && styles.tabTextActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTab === 'browse' && (
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.filterButton} onPress={toggleFilters}>
              <Filter size={18} color={showFilters ? '#3B82F6' : '#FFFFFF'} />
              <Text style={[styles.filterButtonText, showFilters && styles.filterButtonTextActive]}>
                Filters
              </Text>
            </TouchableOpacity>

            <View style={styles.sortContainer}>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => setSortAscending(!sortAscending)}
              >
                {sortAscending ? (
                  <SortAsc size={18} color="#FFFFFF" />
                ) : (
                  <SortDesc size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(['rating', 'visitors', 'items', 'recent'] as SortOption[]).map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.sortOption, sortBy === option && styles.sortOptionActive]}
                    onPress={() => setSortBy(option)}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        sortBy === option && styles.sortOptionTextActive,
                      ]}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        <Animated.View style={[styles.filtersPanel, { height: filterHeight, overflow: 'hidden' }]}>
          <Text style={styles.filterLabel}>Filter by Tier</Text>
          <View style={styles.tierFilters}>
            <TouchableOpacity
              style={[styles.tierFilter, filterTier === 0 && styles.tierFilterActive]}
              onPress={() => setFilterTier(0)}
            >
              <Text style={[styles.tierFilterText, filterTier === 0 && styles.tierFilterTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {HOME_TIERS.map(tier => (
              <TouchableOpacity
                key={tier.id}
                style={[styles.tierFilter, filterTier === tier.id && styles.tierFilterActive]}
                onPress={() => setFilterTier(tier.id as FilterTier)}
              >
                <LinearGradient
                  colors={TIER_COLORS[tier.id]}
                  style={styles.tierFilterGradient}
                >
                  {renderTierIcon(tier.id, 16, '#FFFFFF')}
                </LinearGradient>
                <Text
                  style={[
                    styles.tierFilterText,
                    filterTier === tier.id && styles.tierFilterTextActive,
                  ]}
                >
                  {tier.tierName.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading homes...</Text>
        </View>
      ) : selectedTab === 'browse' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#3B82F6" />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredHomes.length === 0 ? (
            <View style={styles.emptyState}>
              <Home size={48} color="#4B5563" />
              <Text style={styles.emptyStateTitle}>No homes found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery || filterTier > 0
                  ? 'Try adjusting your filters'
                  : 'Be the first to make your home public!'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultCount}>
                {filteredHomes.length} {filteredHomes.length === 1 ? 'home' : 'homes'} available
              </Text>
              {filteredHomes.map(renderHomeCard)}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {visitHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <History size={48} color="#4B5563" />
              <Text style={styles.emptyStateTitle}>No visit history</Text>
              <Text style={styles.emptyStateText}>
                Start exploring other players&apos; homes to build your history!
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.statsOverview}>
                <View style={styles.statCard}>
                  <TrendingUp size={24} color="#3B82F6" />
                  <Text style={styles.statCardValue}>{visitHistory.length}</Text>
                  <Text style={styles.statCardLabel}>Total Visits</Text>
                </View>
                <View style={styles.statCard}>
                  <Clock size={24} color="#10B981" />
                  <Text style={styles.statCardValue}>
                    {formatDuration(visitHistory.reduce((sum, v) => sum + v.duration, 0))}
                  </Text>
                  <Text style={styles.statCardLabel}>Time Spent</Text>
                </View>
              </View>
              <Text style={styles.sectionTitle}>Recent Visits</Text>
              {visitHistory.slice().reverse().map((entry, index) => renderHistoryItem(entry, index))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#3B82F6',
  },
  sortContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortButton: {
    padding: 8,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#1E293B',
  },
  sortOptionActive: {
    backgroundColor: '#3B82F6',
  },
  sortOptionText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#FFFFFF',
  },
  filtersPanel: {
    paddingTop: 12,
  },
  filterLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tierFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  tierFilterActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  tierFilterGradient: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierFilterText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  tierFilterTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  resultCount: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 12,
  },
  homeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  homeImageContainer: {
    height: 160,
    position: 'relative',
  },
  homeImage: {
    width: '100%',
    height: '100%',
  },
  homeImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  tierBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  tierBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  fullBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  fullBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  homeContent: {
    padding: 14,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hostName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
  homeStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
    marginTop: 4,
  },
  roomCount: {
    color: '#6B7280',
    fontSize: 13,
  },
  visitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  visitButtonDisabled: {
    backgroundColor: '#374151',
  },
  visitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  visitButtonTextDisabled: {
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyStateText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  statsOverview: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  statCardValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  statCardLabel: {
    color: '#6B7280',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyHostName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  historyDetailText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  roomsVisited: {
    color: '#6B7280',
    fontSize: 12,
  },
});
