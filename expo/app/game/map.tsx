import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Platform,
  FlatList,
  TextInput,
} from 'react-native';
import type { Region } from 'react-native-maps';
import { 
  MapPin, 
  Home, 
  DollarSign, 
  ChevronDown, 
  RefreshCw, 
  Search,
  Building2,
  X,
} from 'lucide-react-native';
import { useMap } from '@/contexts/MapContext';
import { useTheme } from '@/contexts/ThemeContext';
import { MapProperty, getPropertyTypeConfig, formatPropertyPrice, getMarkerColor } from '@/types/mapProperty';
import PropertyDetailModal from '@/components/map/PropertyDetailModal';

const { width, height } = Dimensions.get('window');

const MAX_VISIBLE_MARKERS = 100;

interface PropertyCluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  properties: MapProperty[];
}

function clusterProperties(properties: MapProperty[], region: Region): (MapProperty | PropertyCluster)[] {
  if (properties.length <= MAX_VISIBLE_MARKERS) {
    return properties;
  }

  const latDelta = region.latitudeDelta;
  const lngDelta = region.longitudeDelta;
  const cellSize = Math.max(latDelta, lngDelta) / 10;

  const grid: Record<string, MapProperty[]> = {};

  properties.forEach(property => {
    const cellX = Math.floor(property.lng / cellSize);
    const cellY = Math.floor(property.lat / cellSize);
    const key = `${cellX},${cellY}`;
    
    if (!grid[key]) {
      grid[key] = [];
    }
    grid[key].push(property);
  });

  const result: (MapProperty | PropertyCluster)[] = [];

  Object.entries(grid).forEach(([key, cellProperties]) => {
    if (cellProperties.length === 1) {
      result.push(cellProperties[0]);
    } else {
      const avgLat = cellProperties.reduce((sum, p) => sum + p.lat, 0) / cellProperties.length;
      const avgLng = cellProperties.reduce((sum, p) => sum + p.lng, 0) / cellProperties.length;
      
      result.push({
        id: `cluster-${key}`,
        lat: avgLat,
        lng: avgLng,
        count: cellProperties.length,
        properties: cellProperties,
      });
    }
  });

  return result;
}

function isCluster(item: MapProperty | PropertyCluster): item is PropertyCluster {
  return 'count' in item && 'properties' in item;
}

let MapView: any = null;
let Marker: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
  PROVIDER_DEFAULT = RNMaps.PROVIDER_DEFAULT;
}

export default function MapScreen() {
  const {
    cities,
    selectedCity,
    filteredMapProperties,
    selectCity,
    selectMapProperty,
    selectedMapProperty,
    refreshData,
    isRefreshing,
    isLoading,
    updateViewport,
    showPropertyModal,
    setShowPropertyModal,
    toggleLikeProperty,
    toggleSaveProperty,
    updateExtendedFilters,
    extendedFilters,
  } = useMap();

  const { colors, isDark } = useTheme();
  const mapRef = useRef<any>(null);
  const [showCitySelector, setShowCitySelector] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<PropertyCluster | null>(null);

  const styles = createStyles(colors, isDark);

  const visibleItems = useMemo(() => {
    if (!currentRegion) return filteredMapProperties.slice(0, MAX_VISIBLE_MARKERS);
    return clusterProperties(filteredMapProperties, currentRegion);
  }, [filteredMapProperties, currentRegion]);

  useEffect(() => {
    if (selectedCity && mapRef.current) {
      const region: Region = {
        latitude: selectedCity.center_lat,
        longitude: selectedCity.center_lng,
        latitudeDelta: Math.abs((selectedCity.bounds_north || selectedCity.center_lat + 0.1) - (selectedCity.bounds_south || selectedCity.center_lat - 0.1)),
        longitudeDelta: Math.abs((selectedCity.bounds_east || selectedCity.center_lng + 0.1) - (selectedCity.bounds_west || selectedCity.center_lng - 0.1)),
      };
      mapRef.current.animateToRegion(region, 1000);
      setCurrentRegion(region);
    }
  }, [selectedCity]);

  const handleMarkerPress = useCallback((item: MapProperty | PropertyCluster) => {
    if (isCluster(item)) {
      if (mapRef.current && currentRegion) {
        const newRegion: Region = {
          latitude: item.lat,
          longitude: item.lng,
          latitudeDelta: currentRegion.latitudeDelta / 2,
          longitudeDelta: currentRegion.longitudeDelta / 2,
        };
        mapRef.current.animateToRegion(newRegion, 500);
      }
      setSelectedCluster(item);
    } else {
      selectMapProperty(item);
    }
  }, [selectMapProperty, currentRegion]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    setCurrentRegion(region);
    updateViewport({
      center: [region.longitude, region.latitude],
      zoom: Math.log2(360 / region.longitudeDelta),
      bounds: {
        north: region.latitude + region.latitudeDelta / 2,
        south: region.latitude - region.latitudeDelta / 2,
        east: region.longitude + region.longitudeDelta / 2,
        west: region.longitude - region.longitudeDelta / 2,
      },
    });
    setSelectedCluster(null);
  }, [updateViewport]);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    updateExtendedFilters({ searchQuery: text });
  }, [updateExtendedFilters]);

  const handleFilterCategory = useCallback((category: 'residential' | 'commercial' | undefined) => {
    updateExtendedFilters({ category });
  }, [updateExtendedFilters]);

  const renderCitySelector = () => {
    if (!showCitySelector) return null;

    return (
      <View style={styles.citySelector}>
        <View style={styles.citySelectorContent}>
          <Text style={styles.citySelectorTitle}>Select a City</Text>
          <ScrollView style={styles.cityList}>
            {cities.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={[
                  styles.cityItem,
                  selectedCity?.id === city.id && styles.cityItemSelected,
                ]}
                onPress={() => {
                  selectCity(city);
                  setShowCitySelector(false);
                }}
              >
                <View>
                  <Text style={[
                    styles.cityName,
                    selectedCity?.id === city.id && styles.cityNameSelected,
                  ]}>
                    {city.name}
                  </Text>
                  <Text style={styles.cityState}>{city.state}</Text>
                </View>
                {selectedCity?.id === city.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowCitySelector(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderClusterList = () => {
    if (!selectedCluster) return null;

    return (
      <View style={styles.clusterListOverlay}>
        <View style={styles.clusterListContent}>
          <View style={styles.clusterListHeader}>
            <Text style={styles.clusterListTitle}>
              {selectedCluster.count} Properties
            </Text>
            <TouchableOpacity onPress={() => setSelectedCluster(null)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={selectedCluster.properties}
            keyExtractor={(item) => item.id}
            style={styles.clusterList}
            renderItem={({ item: property }) => {
              const config = getPropertyTypeConfig(property.propertyType);
              return (
                <TouchableOpacity
                  style={styles.clusterPropertyCard}
                  onPress={() => {
                    setSelectedCluster(null);
                    selectMapProperty(property);
                  }}
                >
                  <View style={[styles.clusterPropertyIcon, { backgroundColor: config.color + '20' }]}>
                    <Text style={styles.clusterPropertyEmoji}>{config.icon}</Text>
                  </View>
                  <View style={styles.clusterPropertyInfo}>
                    <Text style={styles.clusterPropertyTitle} numberOfLines={1}>
                      {property.title}
                    </Text>
                    <Text style={styles.clusterPropertyAddress} numberOfLines={1}>
                      {property.address}
                    </Text>
                    <Text style={styles.clusterPropertyPrice}>
                      {formatPropertyPrice(property.financials.currentValue)}
                    </Text>
                  </View>
                  <View style={[
                    styles.clusterStatusBadge,
                    property.saleStatus === 'available' ? styles.statusAvailable : styles.statusSold
                  ]}>
                    <Text style={[
                      styles.clusterStatusText,
                      property.saleStatus === 'available' ? styles.statusTextAvailable : styles.statusTextSold
                    ]}>
                      {property.saleStatus}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    );
  };

  const renderFilterBar = () => (
    <View style={styles.filterBar}>
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search properties..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <X size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.filterButtons}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            !extendedFilters.category && styles.filterChipActive,
          ]}
          onPress={() => handleFilterCategory(undefined)}
        >
          <Text style={[
            styles.filterChipText,
            !extendedFilters.category && styles.filterChipTextActive,
          ]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            extendedFilters.category === 'residential' && styles.filterChipActive,
          ]}
          onPress={() => handleFilterCategory('residential')}
        >
          <Home size={14} color={extendedFilters.category === 'residential' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[
            styles.filterChipText,
            extendedFilters.category === 'residential' && styles.filterChipTextActive,
          ]}>Residential</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            extendedFilters.category === 'commercial' && styles.filterChipActive,
          ]}
          onPress={() => handleFilterCategory('commercial')}
        >
          <Building2 size={14} color={extendedFilters.category === 'commercial' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[
            styles.filterChipText,
            extendedFilters.category === 'commercial' && styles.filterChipTextActive,
          ]}>Commercial</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (!selectedCity) {
    return (
      <View style={styles.noCityContainer}>
        <Text style={styles.noCityTitle}>Select a City</Text>
        <Text style={styles.noCityText}>Choose a city to explore properties</Text>
        <ScrollView style={styles.noCityList}>
          {cities.map((city) => (
            <TouchableOpacity
              key={city.id}
              style={styles.noCityItem}
              onPress={() => selectCity(city)}
            >
              <View>
                <Text style={styles.noCityItemName}>{city.name}</Text>
                <Text style={styles.noCityItemState}>{city.state}</Text>
              </View>
              <Text style={styles.noCityItemCount}>
                {city.description || 'Explore properties'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webHeader}>
          <TouchableOpacity
            style={styles.webCityButton}
            onPress={() => setShowCitySelector(true)}
          >
            <MapPin size={18} color={colors.primary} />
            <Text style={styles.webCityButtonText}>{selectedCity.name}</Text>
            <ChevronDown size={16} color={colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.webRefreshButton}
            onPress={refreshData} 
            disabled={isRefreshing}
          >
            <RefreshCw size={18} color={isRefreshing ? colors.textLight : colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.webFilterBar}>
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search properties..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <X size={18} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.webFilterButtons}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                !extendedFilters.category && styles.filterChipActive,
              ]}
              onPress={() => handleFilterCategory(undefined)}
            >
              <Text style={[
                styles.filterChipText,
                !extendedFilters.category && styles.filterChipTextActive,
              ]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                extendedFilters.category === 'residential' && styles.filterChipActive,
              ]}
              onPress={() => handleFilterCategory('residential')}
            >
              <Home size={14} color={extendedFilters.category === 'residential' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[
                styles.filterChipText,
                extendedFilters.category === 'residential' && styles.filterChipTextActive,
              ]}>Residential</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                extendedFilters.category === 'commercial' && styles.filterChipActive,
              ]}
              onPress={() => handleFilterCategory('commercial')}
            >
              <Building2 size={14} color={extendedFilters.category === 'commercial' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[
                styles.filterChipText,
                extendedFilters.category === 'commercial' && styles.filterChipTextActive,
              ]}>Commercial</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.webStatsBar}>
          <Text style={styles.webStatsText}>
            {filteredMapProperties.length} properties in {selectedCity.name}
          </Text>
        </View>

        <FlatList
          data={filteredMapProperties}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.webListContent}
          renderItem={({ item: property }) => {
            const config = getPropertyTypeConfig(property.propertyType);
            return (
              <TouchableOpacity
                style={[
                  styles.webPropertyCard,
                  selectedMapProperty?.id === property.id && styles.webPropertyCardSelected,
                ]}
                onPress={() => selectMapProperty(property)}
              >
                <View style={[styles.webPropertyIcon, { backgroundColor: config.color + '20' }]}>
                  <Text style={styles.webPropertyEmoji}>{config.icon}</Text>
                </View>
                <View style={styles.webPropertyInfo}>
                  <View style={styles.webPropertyHeader}>
                    <Text style={styles.webPropertyTitle} numberOfLines={1}>
                      {property.title}
                    </Text>
                    <View style={[
                      styles.categoryBadge,
                      property.category === 'commercial' ? styles.categoryCommercial : styles.categoryResidential
                    ]}>
                      <Text style={[
                        styles.categoryBadgeText,
                        property.category === 'commercial' ? styles.categoryTextCommercial : styles.categoryTextResidential
                      ]}>
                        {property.category === 'commercial' ? 'Commercial' : 'Residential'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.webPropertyAddress} numberOfLines={1}>
                    {property.address}
                  </Text>
                  <View style={styles.webPropertyMeta}>
                    <View style={styles.webPropertyPrice}>
                      <DollarSign size={14} color="#10B981" />
                      <Text style={styles.webPropertyPriceText}>
                        {formatPropertyPrice(property.financials.currentValue).replace('$', '')}
                      </Text>
                    </View>
                    <View style={[
                      styles.webStatusBadge,
                      property.saleStatus === 'available' ? styles.statusAvailable : styles.statusSold
                    ]}>
                      <Text style={[
                        styles.webStatusText,
                        property.saleStatus === 'available' ? styles.statusTextAvailable : styles.statusTextSold
                      ]}>
                        {property.saleStatus}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.webEmptyState}>
              <Home size={48} color={colors.textLight} />
              <Text style={styles.webEmptyText}>No properties found</Text>
            </View>
          }
        />

        {renderCitySelector()}
        
        <PropertyDetailModal
          property={selectedMapProperty}
          visible={showPropertyModal}
          onClose={() => setShowPropertyModal(false)}
          onLike={toggleLikeProperty}
          onSave={toggleSaveProperty}
        />
      </View>
    );
  }

  const initialRegion: Region = {
    latitude: selectedCity.center_lat,
    longitude: selectedCity.center_lng,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        showsScale
      >
        {visibleItems.map((item) => {
          if (isCluster(item)) {
            return (
              <Marker
                key={item.id}
                coordinate={{
                  latitude: item.lat,
                  longitude: item.lng,
                }}
                onPress={() => handleMarkerPress(item)}
                tracksViewChanges={false}
              >
                <View style={styles.clusterMarker}>
                  <Text style={styles.clusterMarkerText}>{item.count}</Text>
                </View>
              </Marker>
            );
          }

          const config = getPropertyTypeConfig(item.propertyType);
          const isSelected = selectedMapProperty?.id === item.id;
          const markerColor = getMarkerColor(item);

          return (
            <Marker
              key={item.id}
              identifier={item.id}
              coordinate={{
                latitude: item.lat,
                longitude: item.lng,
              }}
              onPress={() => handleMarkerPress(item)}
              tracksViewChanges={false}
            >
              <View style={[
                styles.markerContainer,
                isSelected && styles.markerSelected,
              ]}>
                <View style={[styles.marker, { backgroundColor: markerColor }]}>
                  <Text style={styles.markerEmoji}>{config.icon}</Text>
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <TouchableOpacity
        style={styles.cityButton}
        onPress={() => setShowCitySelector(true)}
      >
        <View style={styles.cityButtonContent}>
          <Text style={styles.cityButtonText}>{selectedCity.name}</Text>
          <Text style={styles.cityButtonArrow}>▼</Text>
        </View>
      </TouchableOpacity>

      {renderFilterBar()}

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredMapProperties.length} properties
        </Text>
        <TouchableOpacity onPress={refreshData} disabled={isRefreshing}>
          <Text style={[styles.refreshText, isRefreshing && styles.refreshTextDisabled]}>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {renderClusterList()}
      {renderCitySelector()}
      
      <PropertyDetailModal
        property={selectedMapProperty}
        visible={showPropertyModal}
        onClose={() => setShowPropertyModal(false)}
        onLike={toggleLikeProperty}
        onSave={toggleSaveProperty}
      />
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  noCityContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  noCityTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: colors.text,
    marginBottom: 8,
  },
  noCityText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  noCityList: {
    flex: 1,
  },
  noCityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noCityItemName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  noCityItemState: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  noCityItemCount: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600' as const,
  },
  cityButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  cityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  cityButtonArrow: {
    marginLeft: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterBar: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  statsBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  statsText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  refreshText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600' as const,
  },
  refreshTextDisabled: {
    color: colors.textLight,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerSelected: {
    transform: [{ scale: 1.3 }],
  },
  markerEmoji: {
    fontSize: 18,
  },
  clusterMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  clusterMarkerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  clusterListOverlay: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    maxHeight: height * 0.4,
    backgroundColor: colors.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  clusterListContent: {
    padding: 16,
  },
  clusterListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clusterListTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  clusterList: {
    maxHeight: height * 0.3,
  },
  clusterPropertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 8,
  },
  clusterPropertyIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clusterPropertyEmoji: {
    fontSize: 20,
  },
  clusterPropertyInfo: {
    flex: 1,
  },
  clusterPropertyTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  clusterPropertyAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  clusterPropertyPrice: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  clusterStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  clusterStatusText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  citySelector: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  citySelectorContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: width - 48,
    maxHeight: height * 0.65,
  },
  citySelectorTitle: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  cityList: {
    maxHeight: height * 0.4,
    marginBottom: 16,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  cityItemSelected: {
    backgroundColor: colors.primary + '15',
  },
  cityName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  cityNameSelected: {
    color: colors.primary,
  },
  cityState: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: 'bold' as const,
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  webCityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  webCityButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  webRefreshButton: {
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  webFilterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  webFilterButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  webStatsBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surfaceAlt || colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  webStatsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  webListContent: {
    padding: 16,
    gap: 12,
  },
  webPropertyCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  webPropertyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  webPropertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  webPropertyEmoji: {
    fontSize: 24,
  },
  webPropertyInfo: {
    flex: 1,
  },
  webPropertyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  webPropertyAddress: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  webPropertyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webPropertyPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  webPropertyPriceText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  webStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  webStatusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  statusAvailable: {
    backgroundColor: '#D1FAE5',
  },
  statusSold: {
    backgroundColor: '#FEE2E2',
  },
  statusTextAvailable: {
    color: '#065F46',
  },
  statusTextSold: {
    color: '#991B1B',
  },
  webEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  webEmptyText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  webPropertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryCommercial: {
    backgroundColor: '#EDE9FE',
  },
  categoryResidential: {
    backgroundColor: '#DBEAFE',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  categoryTextCommercial: {
    color: '#7C3AED',
  },
  categoryTextResidential: {
    color: '#2563EB',
  },
});
