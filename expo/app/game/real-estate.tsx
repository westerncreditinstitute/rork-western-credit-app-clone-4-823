import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Region } from 'react-native-maps';

let MapViewComponent: any = null;
let MarkerComponent: any = null;
let PROVIDER_DEFAULT_VALUE: any = null;

if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapViewComponent = RNMaps.default;
  MarkerComponent = RNMaps.Marker;
  PROVIDER_DEFAULT_VALUE = RNMaps.PROVIDER_DEFAULT;
}
import { Stack, useRouter } from 'expo-router';
import {
  Building2,
  Home,
  Castle,
  Umbrella,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Star,
  Heart,
  DollarSign,
  TrendingUp,
  ChevronDown,
  X,
  Check,
  Search,
  Sparkles,
  Navigation,
  Layers,
  Zap,
  Store,
  Users,
  Clock,
  Bookmark,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useRealEstate } from '@/contexts/RealEstateContext';
import { useGame } from '@/contexts/GameContext';
import {
  PropertyData,
  PropertyType,
  PropertyFilter,
  CityData,
  formatPropertyType,
  getPropertyTypeColor,
  createPropertyPurchaseRequest,
} from '@/types/realEstate';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = 220;

type ListingType = 'buy' | 'rent';
type SortOption = 'price_asc' | 'price_desc' | 'rent_desc' | 'quality_desc';

const PROPERTY_TYPE_ICONS: Record<string, typeof Building2> = {
  apartment: Building2,
  house: Home,
  mansion: Castle,
  beach_house: Umbrella,
  commercial: Store,
};

const getPropertyIcon = (property: PropertyData) => {
  if ((property as any).category === 'commercial') {
    return Store;
  }
  return PROPERTY_TYPE_ICONS[property.propertyType] || Building2;
};

const getPropertyColor = (property: PropertyData) => {
  if ((property as any).category === 'commercial') {
    return '#F59E0B';
  }
  return getPropertyTypeColor(property.propertyType);
};

const getPropertyLabel = (property: PropertyData) => {
  if ((property as any).category === 'commercial') {
    const venueType = (property as any).venueType || (property as any).propertyType;
    return venueType?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Commercial';
  }
  return formatPropertyType(property.propertyType);
};

const QUICK_FILTERS = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'apartment', label: 'Apartments', icon: Building2 },
  { id: 'house', label: 'Houses', icon: Home },
  { id: 'mansion', label: 'Mansions', icon: Castle },
  { id: 'beach_house', label: 'Beach', icon: Umbrella },
  { id: 'commercial', label: 'Commercial', icon: Store },
];

const getApartmentUnits = (property: PropertyData): number => {
  if (property.totalUnits) return property.totalUnits;
  const seed = property.propertyId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 250 + (seed % 751);
};

interface FeaturedPropertyCardProps {
  property: PropertyData;
  colors: any;
  onPress: () => void;
}

const FeaturedPropertyCard = React.memo(({ property, colors, onPress }: FeaturedPropertyCardProps) => {
  const TypeIcon = getPropertyIcon(property);
  const typeColor = getPropertyColor(property);
  const roi = ((property.baseRentPrice * 12) / property.purchasePrice) * 100;

  return (
    <TouchableOpacity
      style={[styles.featuredCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={[typeColor + '30', typeColor + '10']}
        style={styles.featuredGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.featuredIconWrapper}>
          <TypeIcon size={28} color={typeColor} />
        </View>
        <View style={[styles.featuredBadge, { backgroundColor: colors.success + '20' }]}>
          <TrendingUp size={10} color={colors.success} />
          <Text style={[styles.featuredBadgeText, { color: colors.success }]}>
            {roi.toFixed(1)}%
          </Text>
        </View>
      </LinearGradient>
      <View style={styles.featuredContent}>
        <Text style={[styles.featuredType, { color: typeColor }]}>
          {getPropertyLabel(property)}
        </Text>
        <Text style={[styles.featuredNeighborhood, { color: colors.text }]} numberOfLines={1}>
          {property.neighborhood}
        </Text>
        <View style={styles.featuredPriceRow}>
          <Text style={[styles.featuredPrice, { color: colors.primary }]}>
            ${property.purchasePrice >= 1000000
              ? `${(property.purchasePrice / 1000000).toFixed(1)}M`
              : `${(property.purchasePrice / 1000).toFixed(0)}K`
            }
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});
FeaturedPropertyCard.displayName = 'FeaturedPropertyCard';

interface PropertyListItemProps {
  property: PropertyData;
  listingType: ListingType;
  colors: any;
  inWatchlist: boolean;
  onPress: () => void;
  onWatchlistToggle: () => void;
}

const PropertyListItem = React.memo(({ 
  property, 
  listingType, 
  colors, 
  inWatchlist,
  onPress, 
  onWatchlistToggle 
}: PropertyListItemProps) => {
  const TypeIcon = getPropertyIcon(property);
  const typeColor = getPropertyColor(property);
  const isCommercial = (property as any).category === 'commercial';
  const roi = ((property.baseRentPrice * 12) / property.purchasePrice) * 100;

  const getPropertySpecs = () => {
    if (isCommercial) {
      const capacity = (property as any).capacity;
      return capacity ? `${capacity} capacity • ${property.squareFootage.toLocaleString()} sqft` : `${property.squareFootage.toLocaleString()} sqft`;
    }
    if (property.propertyType === 'apartment') {
      return `${getApartmentUnits(property).toLocaleString()} units`;
    }
    return `${property.bedrooms} bd • ${property.bathrooms} ba • ${property.squareFootage.toLocaleString()} sqft`;
  };

  return (
    <TouchableOpacity
      style={[styles.propertyItem, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.propertyIconContainer, { backgroundColor: typeColor + '15' }]}>
        <TypeIcon size={22} color={typeColor} />
      </View>
      <View style={styles.propertyInfo}>
        <View style={styles.propertyHeader}>
          <Text style={[styles.propertyType, { color: typeColor }]}>
            {getPropertyLabel(property)}
          </Text>
          {isCommercial ? (
            <View style={[styles.commercialBadge, { backgroundColor: '#F59E0B20' }]}>
              <Text style={[styles.commercialBadgeText, { color: '#F59E0B' }]}>Commercial</Text>
            </View>
          ) : null}
          {!isCommercial && listingType === 'buy' ? (
            <View style={[styles.roiMini, { backgroundColor: colors.success + '15' }]}>
              <Text style={[styles.roiMiniText, { color: colors.success }]}>{roi.toFixed(1)}% ROI</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.propertyNeighborhood, { color: colors.text }]} numberOfLines={1}>
          {property.neighborhood}
        </Text>
        <View style={styles.propertyMeta}>
          <Text style={[styles.propertySpecs, { color: colors.textSecondary }]}>
            {getPropertySpecs()}
          </Text>
        </View>
      </View>
      <View style={styles.propertyPricing}>
        {listingType === 'buy' ? (
          <>
            <Text style={[styles.propertyPrice, { color: colors.primary }]}>
              ${property.purchasePrice >= 1000000 
                ? `${(property.purchasePrice / 1000000).toFixed(1)}M`
                : `${(property.purchasePrice / 1000).toFixed(0)}K`
              }
            </Text>
            <Text style={[styles.propertyRent, { color: colors.success }]}>
              ${property.baseRentPrice >= 1000000 
                ? `${(property.baseRentPrice / 1000000).toFixed(2)}M`
                : property.baseRentPrice.toLocaleString()
              }/mo
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.propertyPrice, { color: colors.success }]}>
              ${property.baseRentPrice >= 1000000 
                ? `${(property.baseRentPrice / 1000000).toFixed(2)}M`
                : property.baseRentPrice.toLocaleString()
              }
            </Text>
            <Text style={[styles.propertyRent, { color: colors.textSecondary }]}>/month</Text>
          </>
        )}
      </View>
      <TouchableOpacity
        style={styles.watchlistBtn}
        onPress={(e) => {
          e.stopPropagation();
          onWatchlistToggle();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {inWatchlist ? (
          <Heart size={18} color="#EF4444" fill="#EF4444" />
        ) : (
          <Heart size={18} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
});
PropertyListItem.displayName = 'PropertyListItem';

export default function RealEstateBrowserScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { gameState, rentProperty } = useGame();
  const {
    cities,
    selectedCity,
    availableProperties,
    portfolio,
    selectCity,
    loadProperties,
    purchaseProperty,
    addToWatchlist,
    removeFromWatchlist,
    isPropertyInWatchlist,
  } = useRealEstate();

  const mapRef = useRef<any>(null);
  const [showCitySelector, setShowCitySelector] = useState(!selectedCity);
  const [showFilters, setShowFilters] = useState(false); // Reserved for future advanced filters
  const [showPropertyDetail, setShowPropertyDetail] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToLease, setAgreedToLease] = useState(false);
  const [agreedToDisclosure, setAgreedToDisclosure] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [listingType, setListingType] = useState<ListingType>('buy');
  const [sortOption] = useState<SortOption>('price_asc');
  const [filter, setFilter] = useState<PropertyFilter>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (selectedCity && availableProperties.length === 0) {
      loadProperties();
    }
  }, [selectedCity, availableProperties.length, loadProperties]);

  const handleCitySelect = async (city: CityData) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await selectCity(city.cityCode);
    setShowCitySelector(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProperties(filter);
    setRefreshing(false);
  };

  const handlePropertyPress = (property: PropertyData) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedProperty(property);
    setShowPropertyDetail(true);
  };

  const handleWatchlistToggle = async (property: PropertyData) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (isPropertyInWatchlist(property.propertyId)) {
      await removeFromWatchlist(property.propertyId);
    } else {
      await addToWatchlist(property.propertyId);
    }
  };

  const handleQuickFilter = (filterId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveFilter(filterId);
    if (filterId === 'all') {
      setFilter({});
    } else if (filterId === 'commercial') {
      setFilter({ category: 'commercial' } as any);
    } else {
      setFilter({ propertyType: filterId as PropertyType });
    }
  };

  const handleMapMarkerPress = (property: PropertyData) => {
    handlePropertyPress(property);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: property.latitude,
        longitude: property.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    }
  };

  const handlePurchasePress = () => {
    setShowPropertyDetail(false);
    setAgreedToTerms(false);
    setAgreedToLease(false);
    setAgreedToDisclosure(false);
    setShowApplicationForm(true);
  };

  const handleApplicationSubmit = () => {
    if (!agreedToTerms || !agreedToLease || !agreedToDisclosure) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowApplicationForm(false);
    setShowPurchaseConfirm(true);
  };

  const handlePurchaseConfirm = async () => {
    if (!selectedProperty) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    if (listingType === 'rent') {
      const propertyName = `${formatPropertyType(selectedProperty.propertyType)} in ${selectedProperty.neighborhood}`;
      rentProperty(
        propertyName,
        selectedProperty.baseRentPrice,
        selectedProperty.propertyType,
        selectedProperty.neighborhood
      );
      setShowPurchaseConfirm(false);
      setSelectedProperty(null);
    } else {
      const request = createPropertyPurchaseRequest(
        selectedProperty.propertyId,
        selectedProperty.purchasePrice
      );

      const result = await purchaseProperty(request, gameState.bankBalance);
      
      if (result.success) {
        setShowPurchaseConfirm(false);
        setSelectedProperty(null);
      }
    }
  };

  const filteredProperties = useMemo(() => {
    let properties = [...availableProperties];

    if ((filter as any).category === 'commercial') {
      properties = properties.filter(p => (p as any).category === 'commercial');
    } else if (filter.propertyType) {
      properties = properties.filter(p => p.propertyType === filter.propertyType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      properties = properties.filter(p =>
        p.neighborhood.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query)
      );
    }

    switch (sortOption) {
      case 'price_asc':
        properties.sort((a, b) => listingType === 'rent' 
          ? a.baseRentPrice - b.baseRentPrice 
          : a.purchasePrice - b.purchasePrice);
        break;
      case 'price_desc':
        properties.sort((a, b) => listingType === 'rent' 
          ? b.baseRentPrice - a.baseRentPrice 
          : b.purchasePrice - a.purchasePrice);
        break;
      case 'rent_desc':
        properties.sort((a, b) => b.baseRentPrice - a.baseRentPrice);
        break;
      case 'quality_desc':
        properties.sort((a, b) => b.propertyQuality - a.propertyQuality);
        break;
    }

    return properties;
  }, [availableProperties, filter, searchQuery, sortOption, listingType]);

  const featuredProperties = useMemo(() => {
    return [...availableProperties]
      .sort((a, b) => {
        const roiA = (a.baseRentPrice * 12) / a.purchasePrice;
        const roiB = (b.baseRentPrice * 12) / b.purchasePrice;
        return roiB - roiA;
      })
      .slice(0, 8);
  }, [availableProperties]);

  const mapRegion = useMemo((): Region | undefined => {
    if (!selectedCity) return undefined;
    return {
      latitude: selectedCity.centerCoordinates.latitude,
      longitude: selectedCity.centerCoordinates.longitude,
      latitudeDelta: 0.15,
      longitudeDelta: 0.15,
    };
  }, [selectedCity]);

  if (!selectedCity || showCitySelector) {
    return (
      <>
        <Stack.Screen options={{ title: 'Select City', headerShown: true }} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={styles.citySelectorHeader}>
            <Text style={[styles.citySelectorTitle, { color: colors.text }]}>
              Choose Your City
            </Text>
            <Text style={[styles.citySelectorSubtitle, { color: colors.textSecondary }]}>
              Each city offers unique real estate opportunities
            </Text>
          </View>
          <ScrollView
            style={styles.cityList}
            contentContainerStyle={styles.cityListContent}
            showsVerticalScrollIndicator={false}
          >
            {cities.map((city) => {
              const isSelected = selectedCity?.cityCode === city.cityCode;
              return (
                <TouchableOpacity
                  key={city.cityCode}
                  style={[
                    styles.cityCard,
                    { backgroundColor: colors.surface },
                    isSelected && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => handleCitySelect(city)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={getCityGradient(city.name)}
                    style={styles.cityCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.cityCardOverlay}>
                      <Text style={styles.cityName}>{city.name}</Text>
                      <Text style={styles.cityState}>{city.state}</Text>
                    </View>
                  </LinearGradient>
                  <View style={styles.cityCardContent}>
                    <View style={styles.cityStatRow}>
                      <Building2 size={14} color={colors.textSecondary} />
                      <Text style={[styles.cityStat, { color: colors.textSecondary }]}>
                        {city.totalProperties.toLocaleString()} properties
                      </Text>
                    </View>
                    <View style={styles.cityStatRow}>
                      <DollarSign size={14} color={colors.success} />
                      <Text style={[styles.cityStat, { color: colors.text }]}>
                        Avg: ${city.averagePrice >= 1000000 
                          ? `${(city.averagePrice / 1000000).toFixed(0)}M`
                          : `${(city.averagePrice / 1000).toFixed(0)}K`
                        }
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                      <Check size={12} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `${selectedCity.name} Real Estate`, headerShown: true }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.mapSection}>
            {Platform.OS !== 'web' && MapViewComponent ? (
              <MapViewComponent
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT_VALUE}
                initialRegion={mapRegion}
                showsUserLocation
                showsCompass={false}
                showsScale={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {filteredProperties.slice(0, 50).map((property) => {
                  const typeColor = getPropertyTypeColor(property.propertyType);
                  return MarkerComponent ? (
                    <MarkerComponent
                      key={property.propertyId}
                      coordinate={{
                        latitude: property.latitude,
                        longitude: property.longitude,
                      }}
                      onPress={() => handleMapMarkerPress(property)}
                      tracksViewChanges={false}
                    >
                      <View style={[styles.mapMarker, { backgroundColor: typeColor }]}>
                        <Text style={styles.mapMarkerText}>$</Text>
                      </View>
                    </MarkerComponent>
                  ) : null;
                })}
              </MapViewComponent>
            ) : (
              <View style={[styles.map, { backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }]}>
                <MapPin size={32} color="rgba(255,255,255,0.4)" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8, fontSize: 13 }}>Map available on mobile</Text>
              </View>
            )}
            <View style={styles.mapOverlay}>
              <TouchableOpacity
                style={[styles.citySelector, { backgroundColor: colors.surface }]}
                onPress={() => setShowCitySelector(true)}
              >
                <MapPin size={16} color={colors.primary} />
                <Text style={[styles.citySelectorText, { color: colors.text }]} numberOfLines={1}>
                  {selectedCity.name}
                </Text>
                <ChevronDown size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.expandMapBtn, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/game/map' as any)}
              >
                <Navigation size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.mapStats, { backgroundColor: colors.surface + 'F0' }]}>
              <View style={styles.mapStatItem}>
                <Text style={[styles.mapStatValue, { color: colors.primary }]}>
                  {filteredProperties.length}
                </Text>
                <Text style={[styles.mapStatLabel, { color: colors.textSecondary }]}>
                  Properties
                </Text>
              </View>
              <View style={[styles.mapStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.mapStatItem}>
                <Text style={[styles.mapStatValue, { color: colors.success }]}>
                  {portfolio.totalProperties}
                </Text>
                <Text style={[styles.mapStatLabel, { color: colors.textSecondary }]}>
                  Owned
                </Text>
              </View>
              <View style={[styles.mapStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.mapStatItem}>
                <Text style={[styles.mapStatValue, { color: colors.text }]}>
                  ${(portfolio.monthlyIncome / 1000).toFixed(0)}K
                </Text>
                <Text style={[styles.mapStatLabel, { color: colors.textSecondary }]}>
                  Income/mo
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.searchSection}>
            <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
              <Search size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search neighborhoods, addresses..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.listingToggle}>
            <TouchableOpacity
              style={[
                styles.listingBtn,
                listingType === 'buy' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setListingType('buy')}
            >
              <DollarSign size={16} color={listingType === 'buy' ? '#FFF' : colors.textSecondary} />
              <Text style={[
                styles.listingBtnText,
                { color: listingType === 'buy' ? '#FFF' : colors.text },
              ]}>Buy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.listingBtn,
                listingType === 'rent' && { backgroundColor: colors.success },
              ]}
              onPress={() => setListingType('rent')}
            >
              <Home size={16} color={listingType === 'rent' ? '#FFF' : colors.textSecondary} />
              <Text style={[
                styles.listingBtnText,
                { color: listingType === 'rent' ? '#FFF' : colors.text },
              ]}>Rent</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFilters}
          >
            {QUICK_FILTERS.map((qf) => {
              const isActive = activeFilter === qf.id;
              const Icon = qf.icon;
              return (
                <TouchableOpacity
                  key={qf.id}
                  style={[
                    styles.quickFilterBtn,
                    { backgroundColor: isActive ? colors.primary : colors.surface },
                  ]}
                  onPress={() => handleQuickFilter(qf.id)}
                >
                  <Icon size={14} color={isActive ? '#FFF' : colors.textSecondary} />
                  <Text style={[
                    styles.quickFilterText,
                    { color: isActive ? '#FFF' : colors.text },
                  ]}>{qf.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {featuredProperties.length > 0 && (
            <View style={styles.featuredSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Zap size={18} color="#F59E0B" />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Featured Properties
                  </Text>
                </View>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Top ROI opportunities
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
              >
                {featuredProperties.map((property) => (
                  <FeaturedPropertyCard
                    key={property.propertyId}
                    property={property}
                    colors={colors}
                    onPress={() => handlePropertyPress(property)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.propertiesSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {listingType === 'buy' ? 'Properties For Sale' : 'Properties For Rent'}
              </Text>
              <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                {filteredProperties.length} available
              </Text>
            </View>

            {filteredProperties.length === 0 ? (
              <View style={styles.emptyState}>
                <Building2 size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Properties Found
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Try adjusting your filters
                </Text>
              </View>
            ) : (
              filteredProperties.map((property) => (
                <PropertyListItem
                  key={property.propertyId}
                  property={property}
                  listingType={listingType}
                  colors={colors}
                  inWatchlist={isPropertyInWatchlist(property.propertyId)}
                  onPress={() => handlePropertyPress(property)}
                  onWatchlistToggle={() => handleWatchlistToggle(property)}
                />
              ))
            )}
          </View>
        </Animated.ScrollView>

        <Modal visible={showPropertyDetail && selectedProperty !== null} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.detailModal, { backgroundColor: colors.surface }]}>
              {selectedProperty && (
                <>
                  <TouchableOpacity
                    style={[styles.detailCloseButton, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setShowPropertyDetail(false);
                      setSelectedProperty(null);
                    }}
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>

                  <LinearGradient
                    colors={[getPropertyColor(selectedProperty) + '40', getPropertyColor(selectedProperty) + '15']}
                    style={styles.detailHeaderGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.detailHeaderContent}>
                      <View style={styles.detailHeaderIconWrapper}>
                        {(() => {
                          const TypeIcon = getPropertyIcon(selectedProperty);
                          return <TypeIcon size={48} color={getPropertyColor(selectedProperty)} />;
                        })()}
                      </View>
                      <View style={styles.detailHeaderBadges}>
                        {listingType === 'buy' && (
                          <View style={styles.forSaleBadge}>
                            <DollarSign size={10} color="#FFF" />
                            <Text style={styles.listingBadgeTextSmall}>FOR SALE</Text>
                          </View>
                        )}
                        {listingType === 'rent' && (
                          <View style={styles.forRentBadge}>
                            <Home size={10} color="#FFF" />
                            <Text style={styles.listingBadgeTextSmall}>FOR RENT</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </LinearGradient>

                  <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.ownerInfoSection}>
                      <View style={styles.ownerAvatarWrapper}>
                        <View style={[styles.ownerAvatarPlaceholder, { backgroundColor: (selectedProperty as any).category === 'commercial' ? '#F59E0B' : colors.primary }]}>
                          {(selectedProperty as any).category === 'commercial' ? (
                            <Store size={20} color="#FFF" />
                          ) : (
                            <Building2 size={20} color="#FFF" />
                          )}
                        </View>
                      </View>
                      <View style={styles.ownerInfoContent}>
                        <View style={styles.ownerNameRow}>
                          <Text style={[styles.ownerName, { color: colors.text }]}>
                            {(selectedProperty as any).category === 'commercial' ? 'Administrator' : 'Private Seller'}
                          </Text>
                          {(selectedProperty as any).category === 'commercial' && (
                            <View style={styles.verifiedBadge}>
                              <Check size={10} color="#FFF" />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.ownerSubtitle, { color: colors.textSecondary }]}>
                          {(selectedProperty as any).category === 'commercial' ? 'Official Listing' : 'Individual Owner'}
                        </Text>
                      </View>
                      <Text style={[styles.listingTime, { color: colors.textSecondary }]}>Just listed</Text>
                    </View>

                    <View style={styles.detailBadgeRow}>
                      <View style={[styles.detailTypeBadge, { backgroundColor: getPropertyColor(selectedProperty) + '20' }]}>
                        <Text style={[styles.detailTypeBadgeText, { color: getPropertyColor(selectedProperty) }]}>
                          {getPropertyLabel(selectedProperty)}
                        </Text>
                      </View>
                      {(selectedProperty as any).category === 'commercial' && (
                        <View style={[styles.detailCategoryBadge, { backgroundColor: '#F59E0B20' }]}>
                          <Text style={[styles.detailCategoryBadgeText, { color: '#F59E0B' }]}>Commercial</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.detailPropertyName, { color: colors.text }]}>
                      {(selectedProperty as any).venueName || `${getPropertyLabel(selectedProperty)} in ${selectedProperty.neighborhood}`}
                    </Text>
                    
                    <View style={styles.detailAddressRow}>
                      <MapPin size={14} color={colors.textSecondary} />
                      <Text style={[styles.detailAddress, { color: colors.textSecondary }]}>
                        {selectedProperty.neighborhood}, {selectedProperty.city}
                      </Text>
                    </View>

                    <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>
                      {(selectedProperty as any).category === 'commercial'
                        ? `${(selectedProperty as any).venueName || getPropertyLabel(selectedProperty)} located in the heart of ${selectedProperty.neighborhood}. Perfect investment opportunity with high foot traffic and established clientele.`
                        : `Beautiful ${getPropertyLabel(selectedProperty).toLowerCase()} located in ${selectedProperty.neighborhood}. Features modern amenities and excellent neighborhood connectivity.`
                      }
                    </Text>

                    <View style={[styles.detailSpecsRow, { borderColor: colors.border }]}>
                      {(selectedProperty as any).category === 'commercial' ? (
                        <>
                          {(selectedProperty as any).capacity != null && (selectedProperty as any).capacity > 0 && (
                            <View style={styles.detailSpecItemInline}>
                              <Users size={16} color={colors.textSecondary} />
                              <Text style={[styles.detailSpecTextInline, { color: colors.textSecondary }]}>{(selectedProperty as any).capacity}</Text>
                            </View>
                          )}
                          <View style={styles.detailSpecItemInline}>
                            <Maximize2 size={16} color={colors.textSecondary} />
                            <Text style={[styles.detailSpecTextInline, { color: colors.textSecondary }]}>{selectedProperty.squareFootage.toLocaleString()} sqft</Text>
                          </View>
                        </>
                      ) : selectedProperty.propertyType === 'apartment' ? (
                        <View style={styles.detailSpecItemInline}>
                          <Building2 size={16} color={colors.textSecondary} />
                          <Text style={[styles.detailSpecTextInline, { color: colors.textSecondary }]}>{getApartmentUnits(selectedProperty).toLocaleString()} units</Text>
                        </View>
                      ) : (
                        <>
                          <View style={styles.detailSpecItemInline}>
                            <Bed size={16} color={colors.textSecondary} />
                            <Text style={[styles.detailSpecTextInline, { color: colors.textSecondary }]}>{selectedProperty.bedrooms}</Text>
                          </View>
                          <View style={styles.detailSpecItemInline}>
                            <Bath size={16} color={colors.textSecondary} />
                            <Text style={[styles.detailSpecTextInline, { color: colors.textSecondary }]}>{selectedProperty.bathrooms}</Text>
                          </View>
                          <View style={styles.detailSpecItemInline}>
                            <Maximize2 size={16} color={colors.textSecondary} />
                            <Text style={[styles.detailSpecTextInline, { color: colors.textSecondary }]}>{selectedProperty.squareFootage.toLocaleString()} sqft</Text>
                          </View>
                        </>
                      )}
                    </View>

                    <View style={[styles.listingStatusSection, { backgroundColor: colors.background }]}>
                      <View style={styles.listingStatusItem}>
                        <Text style={[styles.listingStatusLabel, { color: colors.textSecondary }]}>For Sale</Text>
                        <View style={[styles.listingStatusPill, listingType === 'buy' ? styles.listingStatusYes : styles.listingStatusNo]}>
                          <Text style={[styles.listingStatusPillText, listingType === 'buy' ? styles.listingStatusYesText : styles.listingStatusNoText]}>
                            {listingType === 'buy' ? 'Yes' : 'No'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.listingStatusItem}>
                        <Text style={[styles.listingStatusLabel, { color: colors.textSecondary }]}>For Rent</Text>
                        <View style={[styles.listingStatusPill, listingType === 'rent' ? styles.listingStatusYes : styles.listingStatusNo]}>
                          <Text style={[styles.listingStatusPillText, listingType === 'rent' ? styles.listingStatusYesText : styles.listingStatusNoText]}>
                            {listingType === 'rent' ? 'Yes' : 'No'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.financialSection}>
                      <View style={styles.financialHeader}>
                        <View>
                          <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>
                            {listingType === 'buy' ? 'PROPERTY VALUE' : 'MONTHLY RENT'}
                          </Text>
                          <Text style={[styles.financialValue, { color: colors.text }]}>
                            ${listingType === 'buy' 
                              ? selectedProperty.purchasePrice.toLocaleString()
                              : selectedProperty.baseRentPrice.toLocaleString()}
                            {listingType === 'rent' && <Text style={[styles.financialPeriod, { color: colors.textSecondary }]}>/mo</Text>}
                          </Text>
                        </View>
                        {listingType === 'buy' && (
                          <View style={[styles.roiBadgeLarge, { backgroundColor: colors.success + '15' }]}>
                            <TrendingUp size={14} color={colors.success} />
                            <Text style={[styles.roiBadgeText, { color: colors.success }]}>
                              +{(((selectedProperty.baseRentPrice * 12) / selectedProperty.purchasePrice) * 100).toFixed(1)}% ROI
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {listingType === 'buy' && (
                      <View style={[styles.askingPriceSection, { backgroundColor: colors.success + '10' }]}>
                        <Text style={[styles.askingPriceLabel, { color: colors.success }]}>Asking Price:</Text>
                        <Text style={[styles.askingPriceValue, { color: colors.success }]}>
                          ${selectedProperty.purchasePrice.toLocaleString()}
                        </Text>
                      </View>
                    )}

                    {(selectedProperty as any).category === 'commercial' && (selectedProperty as any).operatingHours && (
                      <View style={[styles.operatingHoursCard, { backgroundColor: colors.background }]}>
                        <Clock size={18} color={colors.primary} />
                        <View style={styles.operatingHoursContent}>
                          <Text style={[styles.operatingHoursLabel, { color: colors.textSecondary }]}>Operating Hours</Text>
                          <Text style={[styles.operatingHoursValue, { color: colors.text }]}>{(selectedProperty as any).operatingHours}</Text>
                        </View>
                      </View>
                    )}

                    <View style={[styles.detailPricingCard, { backgroundColor: colors.background }]}>
                      {listingType === 'buy' ? (
                        <>
                          <View style={styles.detailPricingRow}>
                            <Text style={[styles.detailPricingLabel, { color: colors.textSecondary }]}>Purchase Price</Text>
                            <Text style={[styles.detailPricingValue, { color: colors.primary }]}>${selectedProperty.purchasePrice.toLocaleString()}</Text>
                          </View>
                          <View style={styles.detailPricingRow}>
                            <Text style={[styles.detailPricingLabel, { color: colors.textSecondary }]}>Closing Costs (2%)</Text>
                            <Text style={[styles.detailPricingValue, { color: colors.text }]}>${Math.round(selectedProperty.purchasePrice * 0.02).toLocaleString()}</Text>
                          </View>
                          <View style={[styles.detailPricingDivider, { backgroundColor: colors.border }]} />
                          <View style={styles.detailPricingRow}>
                            <Text style={[styles.detailPricingLabel, { color: colors.text, fontWeight: '600' as const }]}>Total Required</Text>
                            <Text style={[styles.detailPricingTotal, { color: colors.primary }]}>${Math.round(selectedProperty.purchasePrice * 1.02).toLocaleString()}</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <View style={styles.detailPricingRow}>
                            <Text style={[styles.detailPricingLabel, { color: colors.textSecondary }]}>Monthly Rent</Text>
                            <Text style={[styles.detailPricingValue, { color: colors.success }]}>${selectedProperty.baseRentPrice.toLocaleString()}</Text>
                          </View>
                          <View style={styles.detailPricingRow}>
                            <Text style={[styles.detailPricingLabel, { color: colors.textSecondary }]}>Security Deposit</Text>
                            <Text style={[styles.detailPricingValue, { color: colors.text }]}>${selectedProperty.baseRentPrice.toLocaleString()}</Text>
                          </View>
                          <View style={[styles.detailPricingDivider, { backgroundColor: colors.border }]} />
                          <View style={styles.detailPricingRow}>
                            <Text style={[styles.detailPricingLabel, { color: colors.text, fontWeight: '600' as const }]}>Move-in Cost</Text>
                            <Text style={[styles.detailPricingTotal, { color: colors.success }]}>${(selectedProperty.baseRentPrice * 2).toLocaleString()}</Text>
                          </View>
                        </>
                      )}
                    </View>

                    {listingType === 'buy' && (
                      <View style={[styles.detailIncomeCard, { backgroundColor: colors.success + '10' }]}>
                        <View style={styles.detailIncomeHeader}>
                          <TrendingUp size={18} color={colors.success} />
                          <Text style={[styles.detailIncomeTitle, { color: colors.success }]}>Investment Returns</Text>
                        </View>
                        <View style={styles.detailIncomeRow}>
                          <Text style={[styles.detailIncomeLabel, { color: colors.textSecondary }]}>Monthly Income</Text>
                          <Text style={[styles.detailIncomeValue, { color: colors.success }]}>${selectedProperty.baseRentPrice.toLocaleString()}</Text>
                        </View>
                        <View style={styles.detailIncomeRow}>
                          <Text style={[styles.detailIncomeLabel, { color: colors.textSecondary }]}>Annual Income</Text>
                          <Text style={[styles.detailIncomeValue, { color: colors.success }]}>${(selectedProperty.baseRentPrice * 12).toLocaleString()}</Text>
                        </View>
                        <View style={styles.detailIncomeRow}>
                          <Text style={[styles.detailIncomeLabel, { color: colors.textSecondary }]}>Annual ROI</Text>
                          <Text style={[styles.detailIncomeValue, { color: colors.success }]}>
                            {(((selectedProperty.baseRentPrice * 12) / selectedProperty.purchasePrice) * 100).toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.qualitySection}>
                      <View style={styles.qualityItem}>
                        <Star size={16} color="#F59E0B" fill="#F59E0B" />
                        <Text style={[styles.qualityText, { color: colors.text }]}>Quality: {selectedProperty.propertyQuality}/10</Text>
                      </View>
                    </View>
                  </ScrollView>

                  <View style={[styles.detailActionsBar, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={styles.detailActionBtn}
                      onPress={() => handleWatchlistToggle(selectedProperty)}
                    >
                      {isPropertyInWatchlist(selectedProperty.propertyId) ? (
                        <Heart size={22} color="#EF4444" fill="#EF4444" />
                      ) : (
                        <Heart size={22} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.detailActionBtn}>
                      <Bookmark size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailFooter}>
                    <TouchableOpacity
                      style={[
                        styles.purchaseButtonLarge,
                        { backgroundColor: listingType === 'buy' 
                          ? (gameState.bankBalance >= selectedProperty.purchasePrice * 1.02 ? colors.primary : colors.textSecondary)
                          : (gameState.bankBalance >= selectedProperty.baseRentPrice * 2 ? colors.success : colors.textSecondary)
                        },
                      ]}
                      onPress={handlePurchasePress}
                      disabled={listingType === 'buy' 
                        ? gameState.bankBalance < selectedProperty.purchasePrice * 1.02
                        : gameState.bankBalance < selectedProperty.baseRentPrice * 2
                      }
                    >
                      {listingType === 'buy' ? <DollarSign size={18} color="#FFF" /> : <Home size={18} color="#FFF" />}
                      <Text style={styles.purchaseButtonText}>
                        {listingType === 'buy' ? 'Purchase Property' : 'Rent Property'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        <Modal visible={showApplicationForm && selectedProperty !== null} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.applicationModal, { backgroundColor: colors.surface }]}>
              {selectedProperty && (
                <>
                  <TouchableOpacity
                    style={[styles.detailCloseButton, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setShowApplicationForm(false);
                      setShowPropertyDetail(true);
                    }}
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>

                  <ScrollView style={styles.applicationContent} contentContainerStyle={styles.applicationScrollContent}>
                    <Text style={[styles.applicationTitle, { color: colors.text }]}>
                      {listingType === 'rent' ? 'Rental Application' : 'Purchase Application'}
                    </Text>

                    <View style={[styles.applicantInfoCard, { backgroundColor: colors.background }]}>
                      <Text style={[styles.applicantInfoTitle, { color: colors.text }]}>Applicant</Text>
                      <View style={styles.applicantInfoRow}>
                        <Text style={[styles.applicantInfoLabel, { color: colors.textSecondary }]}>Name</Text>
                        <Text style={[styles.applicantInfoValue, { color: colors.text }]}>{gameState.playerName}</Text>
                      </View>
                      <View style={styles.applicantInfoRow}>
                        <Text style={[styles.applicantInfoLabel, { color: colors.textSecondary }]}>Balance</Text>
                        <Text style={[styles.applicantInfoValue, { color: colors.primary }]}>${gameState.bankBalance.toLocaleString()}</Text>
                      </View>
                      <View style={styles.applicantInfoRow}>
                        <Text style={[styles.applicantInfoLabel, { color: colors.textSecondary }]}>Credit Score</Text>
                        <Text style={[styles.applicantInfoValue, { color: gameState.creditScores.composite >= 700 ? colors.success : colors.text }]}>
                          {gameState.creditScores.composite}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.termsSection}>
                      <TouchableOpacity style={[styles.termsCheckbox, { backgroundColor: colors.background }]} onPress={() => setAgreedToTerms(!agreedToTerms)}>
                        <View style={[styles.checkbox, { borderColor: agreedToTerms ? colors.primary : colors.border, backgroundColor: agreedToTerms ? colors.primary : 'transparent' }]}>
                          {agreedToTerms && <Check size={12} color="#FFF" />}
                        </View>
                        <Text style={[styles.termsText, { color: colors.text }]}>I agree to the terms and conditions</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.termsCheckbox, { backgroundColor: colors.background }]} onPress={() => setAgreedToLease(!agreedToLease)}>
                        <View style={[styles.checkbox, { borderColor: agreedToLease ? colors.primary : colors.border, backgroundColor: agreedToLease ? colors.primary : 'transparent' }]}>
                          {agreedToLease && <Check size={12} color="#FFF" />}
                        </View>
                        <Text style={[styles.termsText, { color: colors.text }]}>I understand the {listingType === 'rent' ? 'lease' : 'purchase'} agreement</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.termsCheckbox, { backgroundColor: colors.background }]} onPress={() => setAgreedToDisclosure(!agreedToDisclosure)}>
                        <View style={[styles.checkbox, { borderColor: agreedToDisclosure ? colors.primary : colors.border, backgroundColor: agreedToDisclosure ? colors.primary : 'transparent' }]}>
                          {agreedToDisclosure && <Check size={12} color="#FFF" />}
                        </View>
                        <Text style={[styles.termsText, { color: colors.text }]}>I authorize verification of my information</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  <View style={styles.applicationFooter}>
                    <TouchableOpacity
                      style={[styles.confirmCancelButton, { borderColor: colors.border }]}
                      onPress={() => {
                        setShowApplicationForm(false);
                        setShowPropertyDetail(true);
                      }}
                    >
                      <Text style={[styles.confirmCancelText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.submitApplicationButton,
                        { backgroundColor: (agreedToTerms && agreedToLease && agreedToDisclosure) ? colors.primary : colors.textSecondary },
                      ]}
                      onPress={handleApplicationSubmit}
                      disabled={!agreedToTerms || !agreedToLease || !agreedToDisclosure}
                    >
                      <Check size={18} color="#FFF" />
                      <Text style={styles.submitApplicationText}>Submit</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        <Modal visible={showPurchaseConfirm && selectedProperty !== null} transparent animationType="fade">
          <View style={styles.confirmOverlay}>
            <View style={[styles.confirmModal, { backgroundColor: colors.surface }]}>
              {selectedProperty && (
                <>
                  <View style={[styles.confirmHeader, { backgroundColor: listingType === 'rent' ? colors.success + '15' : colors.primary + '15' }]}>
                    <Sparkles size={28} color={listingType === 'rent' ? colors.success : colors.primary} />
                  </View>
                  <Text style={[styles.confirmTitle, { color: colors.text }]}>
                    {listingType === 'rent' ? 'Confirm Rental' : 'Confirm Purchase'}
                  </Text>
                  <Text style={[styles.confirmSubtitle, { color: colors.textSecondary }]}>
                    {formatPropertyType(selectedProperty.propertyType)} in {selectedProperty.neighborhood}
                  </Text>

                  <View style={[styles.confirmPricingCard, { backgroundColor: colors.background }]}>
                    <View style={styles.confirmPricingRow}>
                      <Text style={[styles.confirmPricingLabel, { color: colors.textSecondary }]}>
                        {listingType === 'rent' ? 'Move-in Cost' : 'Total'}
                      </Text>
                      <Text style={[styles.confirmPricingTotal, { color: listingType === 'rent' ? colors.success : colors.primary }]}>
                        ${listingType === 'rent' 
                          ? (selectedProperty.baseRentPrice * 2).toLocaleString()
                          : Math.round(selectedProperty.purchasePrice * 1.02).toLocaleString()
                        }
                      </Text>
                    </View>
                    <View style={styles.confirmPricingRow}>
                      <Text style={[styles.confirmPricingLabel, { color: colors.textSecondary }]}>After Transaction</Text>
                      <Text style={[styles.confirmPricingValue, { color: colors.text }]}>
                        ${Math.round(gameState.bankBalance - (listingType === 'rent' ? selectedProperty.baseRentPrice * 2 : selectedProperty.purchasePrice * 1.02)).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.confirmButtons}>
                    <TouchableOpacity
                      style={[styles.confirmCancelButton, { borderColor: colors.border }]}
                      onPress={() => {
                        setShowPurchaseConfirm(false);
                        setShowPropertyDetail(true);
                      }}
                    >
                      <Text style={[styles.confirmCancelText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmPurchaseButton, { backgroundColor: listingType === 'rent' ? colors.success : colors.primary }]}
                      onPress={handlePurchaseConfirm}
                    >
                      <Check size={18} color="#FFF" />
                      <Text style={styles.confirmPurchaseText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

function getCityGradient(cityName: string): [string, string] {
  switch (cityName) {
    case 'Los Angeles': return ['#F59E0B', '#EA580C'];
    case 'Miami': return ['#06B6D4', '#0891B2'];
    case 'New York': return ['#6366F1', '#4F46E5'];
    case 'Chicago': return ['#10B981', '#059669'];
    case 'Houston': return ['#EC4899', '#DB2777'];
    case 'Phoenix': return ['#F97316', '#EA580C'];
    case 'Atlanta': return ['#8B5CF6', '#7C3AED'];
    case 'Denver': return ['#14B8A6', '#0D9488'];
    default: return ['#6B7280', '#4B5563'];
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mapSection: {
    height: MAP_HEIGHT,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  citySelectorText: {
    fontSize: 14,
    fontWeight: '600' as const,
    maxWidth: 100,
  },
  expandMapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapStats: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  mapStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  mapStatLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  mapStatDivider: {
    width: 1,
    marginVertical: 4,
  },
  mapMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  mapMarkerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  listingToggle: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  listingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  listingBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  quickFilters: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 16,
  },
  quickFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  quickFilterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  featuredSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  resultsCount: {
    fontSize: 13,
    marginTop: 4,
  },
  featuredList: {
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: 150,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
  },
  featuredGradient: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  featuredIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  featuredContent: {
    padding: 12,
  },
  featuredType: {
    fontSize: 10,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  featuredNeighborhood: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  featuredPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  propertiesSection: {
    paddingHorizontal: 16,
  },
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  propertyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  propertyType: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  roiMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roiMiniText: {
    fontSize: 9,
    fontWeight: '600' as const,
  },
  commercialBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  commercialBadgeText: {
    fontSize: 9,
    fontWeight: '600' as const,
  },
  propertyNeighborhood: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  propertyMeta: {},
  propertySpecs: {
    fontSize: 12,
  },
  propertyPricing: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  propertyRent: {
    fontSize: 11,
    marginTop: 1,
  },
  watchlistBtn: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    fontSize: 14,
  },
  citySelectorHeader: {
    padding: 24,
    paddingTop: 16,
  },
  citySelectorTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    marginBottom: 6,
  },
  citySelectorSubtitle: {
    fontSize: 15,
  },
  cityList: {
    flex: 1,
  },
  cityListContent: {
    padding: 16,
    gap: 14,
  },
  cityCard: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cityCardGradient: {
    height: 100,
  },
  cityCardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  cityName: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  cityState: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.85)',
  },
  cityCardContent: {
    padding: 14,
    gap: 6,
  },
  cityStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityStat: {
    fontSize: 13,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  detailCloseButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailHeader: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    padding: 18,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  detailTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  detailTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  detailCategoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  detailCategoryBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  operatingHoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    gap: 12,
  },
  operatingHoursContent: {
    flex: 1,
  },
  operatingHoursLabel: {
    fontSize: 12,
  },
  operatingHoursValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  detailNeighborhood: {
    fontSize: 22,
    fontWeight: '800' as const,
    marginBottom: 4,
  },
  detailAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 18,
  },
  detailAddress: {
    fontSize: 13,
  },
  detailSpecsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  detailSpecItem: {
    width: (SCREEN_WIDTH - 66) / 4,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  detailSpecValue: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  detailSpecLabel: {
    fontSize: 10,
  },
  detailPricingCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  detailPricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailPricingLabel: {
    fontSize: 13,
  },
  detailPricingValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  detailPricingDivider: {
    height: 1,
    marginVertical: 6,
  },
  detailPricingTotal: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  detailIncomeCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  detailIncomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  detailIncomeTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  detailIncomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailIncomeLabel: {
    fontSize: 13,
  },
  detailIncomeValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  detailFooter: {
    flexDirection: 'row',
    padding: 18,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  watchlistButtonLarge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchaseButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  applicationModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  applicationContent: {
    flex: 1,
  },
  applicationScrollContent: {
    padding: 20,
    paddingTop: 50,
  },
  applicationTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    textAlign: 'center',
    marginBottom: 20,
  },
  applicantInfoCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  applicantInfoTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  applicantInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  applicantInfoLabel: {
    fontSize: 13,
  },
  applicantInfoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  termsSection: {
    gap: 10,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  applicationFooter: {
    flexDirection: 'row',
    padding: 18,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  submitApplicationButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  submitApplicationText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModal: {
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
  },
  confirmHeader: {
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    textAlign: 'center',
    marginTop: 14,
  },
  confirmSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 18,
  },
  confirmPricingCard: {
    marginHorizontal: 18,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  confirmPricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  confirmPricingLabel: {
    fontSize: 13,
  },
  confirmPricingValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  confirmPricingTotal: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  confirmButtons: {
    flexDirection: 'row',
    padding: 18,
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  confirmPurchaseButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  confirmPurchaseText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  detailHeaderGradient: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  detailHeaderContent: {
    alignItems: 'center',
    position: 'relative',
  },
  detailHeaderIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  detailHeaderBadges: {
    position: 'absolute',
    top: -8,
    right: -40,
    flexDirection: 'column',
    gap: 4,
  },
  forSaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  forRentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  listingBadgeTextSmall: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  ownerInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ownerAvatarWrapper: {
    position: 'relative',
  },
  ownerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  listingTime: {
    fontSize: 12,
  },
  detailPropertyName: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  detailSpecsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  detailSpecItemInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailSpecTextInline: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  listingStatusSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  listingStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  listingStatusLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  listingStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  listingStatusPillText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  listingStatusYes: {
    backgroundColor: '#10B98120',
  },
  listingStatusNo: {
    backgroundColor: 'rgba(107,114,128,0.15)',
  },
  listingStatusYesText: {
    color: '#10B981',
  },
  listingStatusNoText: {
    color: '#6B7280',
  },
  financialSection: {
    marginBottom: 14,
  },
  financialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  financialLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  financialValue: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  financialPeriod: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  roiBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  roiBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  askingPriceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  askingPriceLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  askingPriceValue: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  qualitySection: {
    marginBottom: 16,
  },
  qualityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qualityText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  detailActionsBar: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 16,
    borderTopWidth: 1,
  },
  detailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
