import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import {
  PropertyData,
  PropertyType,
  PropertyStatus,
  PropertyFilter,
  PropertySortCriteria,
  PropertyOwner,
  PropertyWatchlist,
  PortfolioSummary,
  RentalIncome,
  RentCollectionResult,
  CityData,
  NeighborhoodData,
  PropertyRentalInfo,
  PropertyOperationResult,
  PropertyPurchaseRequest,
  RentalCollectionSummaryData,
  createEmptyPortfolioSummary,
  createPropertyPurchaseRequest,
  calculateOccupancyRate,
  calculateMonthlyIncome,
  createRentalCollectionSummaryData,
  DEFAULT_NEW_YORK_NEIGHBORHOODS,
  createDefaultCityData,
  CommercialVenueType,
} from '@/types/realEstate';

const REAL_ESTATE_STORAGE_KEY = 'credit_life_real_estate_';
const SELECTED_CITY_KEY = 'credit_life_selected_city';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface RealEstateNotification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
}

const DEFAULT_CITIES: CityData[] = [
  {
    cityCode: 'LA',
    name: 'Los Angeles',
    state: 'CA',
    totalProperties: 150,
    apartments: 60,
    houses: 50,
    mansions: 20,
    beachHouses: 20,
    averagePrice: 85000000,
    averageRent: 850000,
    centerCoordinates: { latitude: 34.0522, longitude: -118.2437 },
    mapBounds: { x: -118.5, y: 33.7, width: 0.6, height: 0.6 },
    neighborhoods: [
      { id: '1', city: 'Los Angeles', name: 'Hollywood', priceMultiplier: 1.8, desirabilityScore: 9.0, safetyScore: 7.5, description: 'Entertainment district' },
      { id: '2', city: 'Los Angeles', name: 'Beverly Hills', priceMultiplier: 3.0, desirabilityScore: 10.0, safetyScore: 9.5, description: 'Luxury living' },
      { id: '3', city: 'Los Angeles', name: 'Santa Monica', priceMultiplier: 2.2, desirabilityScore: 9.5, safetyScore: 8.5, description: 'Beach lifestyle' },
      { id: '4', city: 'Los Angeles', name: 'Downtown', priceMultiplier: 1.5, desirabilityScore: 8.0, safetyScore: 7.0, description: 'Urban living' },
      { id: '5', city: 'Los Angeles', name: 'Pasadena', priceMultiplier: 1.3, desirabilityScore: 8.5, safetyScore: 8.5, description: 'Suburban charm' },
    ],
    apartmentPriceRange: { min: 45000000, max: 280000000 },
    housePriceRange: { min: 600000, max: 2000000 },
    mansionPriceRange: { min: 3000000, max: 15000000 },
    beachHousePriceRange: { min: 2000000, max: 8000000 },
  },
  {
    cityCode: 'MI',
    name: 'Miami',
    state: 'FL',
    totalProperties: 120,
    apartments: 50,
    houses: 40,
    mansions: 15,
    beachHouses: 15,
    averagePrice: 72000000,
    averageRent: 720000,
    centerCoordinates: { latitude: 25.7617, longitude: -80.1918 },
    mapBounds: { x: -80.4, y: 25.5, width: 0.5, height: 0.5 },
    neighborhoods: [
      { id: '1', city: 'Miami', name: 'South Beach', priceMultiplier: 2.5, desirabilityScore: 9.5, safetyScore: 7.5, description: 'Iconic beach living' },
      { id: '2', city: 'Miami', name: 'Brickell', priceMultiplier: 2.0, desirabilityScore: 9.0, safetyScore: 8.5, description: 'Financial district' },
      { id: '3', city: 'Miami', name: 'Coral Gables', priceMultiplier: 1.8, desirabilityScore: 9.0, safetyScore: 9.0, description: 'Mediterranean style' },
      { id: '4', city: 'Miami', name: 'Wynwood', priceMultiplier: 1.4, desirabilityScore: 8.5, safetyScore: 7.0, description: 'Arts district' },
      { id: '5', city: 'Miami', name: 'Key Biscayne', priceMultiplier: 2.8, desirabilityScore: 9.5, safetyScore: 9.5, description: 'Island paradise' },
    ],
    apartmentPriceRange: { min: 38000000, max: 220000000 },
    housePriceRange: { min: 450000, max: 1500000 },
    mansionPriceRange: { min: 2500000, max: 12000000 },
    beachHousePriceRange: { min: 1800000, max: 6000000 },
  },
  {
    cityCode: 'NY',
    name: 'New York',
    state: 'NY',
    totalProperties: 200,
    apartments: 100,
    houses: 50,
    mansions: 25,
    beachHouses: 25,
    averagePrice: 145000000,
    averageRent: 1450000,
    centerCoordinates: { latitude: 40.7128, longitude: -74.0060 },
    mapBounds: { x: -74.3, y: 40.5, width: 0.6, height: 0.5 },
    neighborhoods: DEFAULT_NEW_YORK_NEIGHBORHOODS,
    apartmentPriceRange: { min: 65000000, max: 450000000 },
    housePriceRange: { min: 800000, max: 2500000 },
    mansionPriceRange: { min: 5000000, max: 20000000 },
    beachHousePriceRange: { min: 2500000, max: 10000000 },
  },
  {
    cityCode: 'CH',
    name: 'Chicago',
    state: 'IL',
    totalProperties: 140,
    apartments: 55,
    houses: 50,
    mansions: 20,
    beachHouses: 15,
    averagePrice: 52000000,
    averageRent: 520000,
    centerCoordinates: { latitude: 41.8781, longitude: -87.6298 },
    mapBounds: { x: -87.9, y: 41.6, width: 0.6, height: 0.6 },
    neighborhoods: [
      { id: '1', city: 'Chicago', name: 'The Loop', priceMultiplier: 2.0, desirabilityScore: 9.0, safetyScore: 7.5, description: 'Downtown business district' },
      { id: '2', city: 'Chicago', name: 'Lincoln Park', priceMultiplier: 2.2, desirabilityScore: 9.5, safetyScore: 8.5, description: 'Upscale residential area' },
      { id: '3', city: 'Chicago', name: 'River North', priceMultiplier: 1.8, desirabilityScore: 8.5, safetyScore: 8.0, description: 'Trendy dining and nightlife' },
      { id: '4', city: 'Chicago', name: 'Wicker Park', priceMultiplier: 1.5, desirabilityScore: 8.5, safetyScore: 7.5, description: 'Artistic neighborhood' },
      { id: '5', city: 'Chicago', name: 'Gold Coast', priceMultiplier: 2.5, desirabilityScore: 9.5, safetyScore: 9.0, description: 'Historic luxury district' },
    ],
    apartmentPriceRange: { min: 28000000, max: 180000000 },
    housePriceRange: { min: 350000, max: 1200000 },
    mansionPriceRange: { min: 1800000, max: 9000000 },
    beachHousePriceRange: { min: 1200000, max: 5000000 },
  },
  {
    cityCode: 'HO',
    name: 'Houston',
    state: 'TX',
    totalProperties: 160,
    apartments: 65,
    houses: 55,
    mansions: 25,
    beachHouses: 15,
    averagePrice: 42000000,
    averageRent: 420000,
    centerCoordinates: { latitude: 29.7604, longitude: -95.3698 },
    mapBounds: { x: -95.6, y: 29.5, width: 0.6, height: 0.6 },
    neighborhoods: [
      { id: '1', city: 'Houston', name: 'River Oaks', priceMultiplier: 2.8, desirabilityScore: 9.5, safetyScore: 9.5, description: 'Exclusive luxury enclave' },
      { id: '2', city: 'Houston', name: 'The Heights', priceMultiplier: 1.8, desirabilityScore: 9.0, safetyScore: 8.5, description: 'Historic charm with modern appeal' },
      { id: '3', city: 'Houston', name: 'Midtown', priceMultiplier: 1.5, desirabilityScore: 8.5, safetyScore: 7.5, description: 'Urban entertainment hub' },
      { id: '4', city: 'Houston', name: 'Memorial', priceMultiplier: 2.0, desirabilityScore: 9.0, safetyScore: 9.0, description: 'Family-friendly suburb' },
      { id: '5', city: 'Houston', name: 'Downtown', priceMultiplier: 1.4, desirabilityScore: 8.0, safetyScore: 7.0, description: 'Business and sports district' },
    ],
    apartmentPriceRange: { min: 22000000, max: 140000000 },
    housePriceRange: { min: 280000, max: 950000 },
    mansionPriceRange: { min: 1500000, max: 7500000 },
    beachHousePriceRange: { min: 900000, max: 4000000 },
  },
  {
    cityCode: 'PH',
    name: 'Phoenix',
    state: 'AZ',
    totalProperties: 130,
    apartments: 50,
    houses: 50,
    mansions: 20,
    beachHouses: 10,
    averagePrice: 45000000,
    averageRent: 450000,
    centerCoordinates: { latitude: 33.4484, longitude: -112.0740 },
    mapBounds: { x: -112.3, y: 33.2, width: 0.6, height: 0.6 },
    neighborhoods: [
      { id: '1', city: 'Phoenix', name: 'Scottsdale', priceMultiplier: 2.5, desirabilityScore: 9.5, safetyScore: 9.0, description: 'Upscale desert living' },
      { id: '2', city: 'Phoenix', name: 'Paradise Valley', priceMultiplier: 3.0, desirabilityScore: 10.0, safetyScore: 9.5, description: 'Luxury mountain estates' },
      { id: '3', city: 'Phoenix', name: 'Arcadia', priceMultiplier: 2.0, desirabilityScore: 9.0, safetyScore: 8.5, description: 'Trendy upscale neighborhood' },
      { id: '4', city: 'Phoenix', name: 'Downtown', priceMultiplier: 1.4, desirabilityScore: 8.0, safetyScore: 7.0, description: 'Urban core revival' },
      { id: '5', city: 'Phoenix', name: 'Tempe', priceMultiplier: 1.3, desirabilityScore: 8.5, safetyScore: 8.0, description: 'College town energy' },
    ],
    apartmentPriceRange: { min: 24000000, max: 150000000 },
    housePriceRange: { min: 300000, max: 1000000 },
    mansionPriceRange: { min: 1600000, max: 8000000 },
    beachHousePriceRange: { min: 1000000, max: 4500000 },
  },
  {
    cityCode: 'AT',
    name: 'Atlanta',
    state: 'GA',
    totalProperties: 135,
    apartments: 55,
    houses: 50,
    mansions: 18,
    beachHouses: 12,
    averagePrice: 48000000,
    averageRent: 480000,
    centerCoordinates: { latitude: 33.7490, longitude: -84.3880 },
    mapBounds: { x: -84.6, y: 33.5, width: 0.6, height: 0.6 },
    neighborhoods: [
      { id: '1', city: 'Atlanta', name: 'Buckhead', priceMultiplier: 2.5, desirabilityScore: 9.5, safetyScore: 8.5, description: 'Uptown luxury district' },
      { id: '2', city: 'Atlanta', name: 'Midtown', priceMultiplier: 1.8, desirabilityScore: 9.0, safetyScore: 8.0, description: 'Arts and culture hub' },
      { id: '3', city: 'Atlanta', name: 'Virginia-Highland', priceMultiplier: 1.6, desirabilityScore: 8.5, safetyScore: 8.5, description: 'Charming historic neighborhood' },
      { id: '4', city: 'Atlanta', name: 'Inman Park', priceMultiplier: 1.7, desirabilityScore: 8.5, safetyScore: 8.0, description: 'Victorian architecture' },
      { id: '5', city: 'Atlanta', name: 'West Midtown', priceMultiplier: 1.5, desirabilityScore: 8.0, safetyScore: 7.5, description: 'Industrial chic revival' },
    ],
    apartmentPriceRange: { min: 26000000, max: 160000000 },
    housePriceRange: { min: 320000, max: 1100000 },
    mansionPriceRange: { min: 1700000, max: 8500000 },
    beachHousePriceRange: { min: 1100000, max: 4800000 },
  },
  {
    cityCode: 'DE',
    name: 'Denver',
    state: 'CO',
    totalProperties: 125,
    apartments: 50,
    houses: 45,
    mansions: 18,
    beachHouses: 12,
    averagePrice: 58000000,
    averageRent: 580000,
    centerCoordinates: { latitude: 39.7392, longitude: -104.9903 },
    mapBounds: { x: -105.2, y: 39.5, width: 0.6, height: 0.6 },
    neighborhoods: [
      { id: '1', city: 'Denver', name: 'Cherry Creek', priceMultiplier: 2.5, desirabilityScore: 9.5, safetyScore: 9.0, description: 'Upscale shopping and dining' },
      { id: '2', city: 'Denver', name: 'LoDo', priceMultiplier: 2.0, desirabilityScore: 9.0, safetyScore: 8.0, description: 'Historic Lower Downtown' },
      { id: '3', city: 'Denver', name: 'Highlands', priceMultiplier: 1.8, desirabilityScore: 9.0, safetyScore: 8.5, description: 'Trendy restaurants and shops' },
      { id: '4', city: 'Denver', name: 'RiNo', priceMultiplier: 1.6, desirabilityScore: 8.5, safetyScore: 7.5, description: 'Arts district' },
      { id: '5', city: 'Denver', name: 'Washington Park', priceMultiplier: 2.2, desirabilityScore: 9.5, safetyScore: 9.0, description: 'Park-side living' },
    ],
    apartmentPriceRange: { min: 32000000, max: 200000000 },
    housePriceRange: { min: 400000, max: 1300000 },
    mansionPriceRange: { min: 2000000, max: 10000000 },
    beachHousePriceRange: { min: 1400000, max: 5500000 },
  },
];

export const [RealEstateProvider, useRealEstate] = createContextHook(() => {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  
  const [cities, setCities] = useState<CityData[]>(DEFAULT_CITIES);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<NeighborhoodData | null>(null);
  
  const [availableProperties, setAvailableProperties] = useState<PropertyData[]>([]);
  const [ownedProperties, setOwnedProperties] = useState<PropertyData[]>([]);
  const [propertyOwners, setPropertyOwners] = useState<Record<string, PropertyOwner>>({});
  const [watchlist, setWatchlist] = useState<PropertyWatchlist[]>([]);
  const [rentalHistory, setRentalHistory] = useState<RentalIncome[]>([]);
  const [propertyRentals, setPropertyRentals] = useState<Record<string, PropertyRentalInfo>>({});
  
  const [notifications, setNotifications] = useState<RealEstateNotification[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const getStorageKey = useCallback((key: string) => {
    return `${REAL_ESTATE_STORAGE_KEY}${currentPlayerId || 'anonymous'}_${key}`;
  }, [currentPlayerId]);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const notification: RealEstateNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
    };
    setNotifications(prev => [...prev.slice(-9), notification]);
    console.log(`[RealEstate] ${type.toUpperCase()}: ${message}`);
    return notification;
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const saveState = useCallback(async () => {
    try {
      const stateToSave = {
        selectedCity,
        ownedProperties,
        propertyOwners,
        watchlist,
        rentalHistory,
        propertyRentals,
        lastSyncTime: new Date().toISOString(),
      };
      await AsyncStorage.setItem(getStorageKey('state'), JSON.stringify(stateToSave));
      if (selectedCity) {
        await AsyncStorage.setItem(SELECTED_CITY_KEY, selectedCity.cityCode);
      }
      console.log('[RealEstate] State saved successfully');
    } catch (error) {
      console.error('[RealEstate] Error saving state:', error);
    }
  }, [selectedCity, ownedProperties, propertyOwners, watchlist, rentalHistory, propertyRentals, getStorageKey]);

  const loadState = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedState = await AsyncStorage.getItem(getStorageKey('state'));
      const savedCityCode = await AsyncStorage.getItem(SELECTED_CITY_KEY);
      
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.selectedCity) setSelectedCity(parsed.selectedCity);
        if (parsed.ownedProperties) setOwnedProperties(parsed.ownedProperties);
        if (parsed.propertyOwners) setPropertyOwners(parsed.propertyOwners);
        if (parsed.watchlist) setWatchlist(parsed.watchlist);
        if (parsed.rentalHistory) setRentalHistory(parsed.rentalHistory);
        if (parsed.propertyRentals) setPropertyRentals(parsed.propertyRentals);
        if (parsed.lastSyncTime) setLastSyncTime(parsed.lastSyncTime);
        console.log('[RealEstate] State loaded from storage');
      } else if (savedCityCode) {
        const city = DEFAULT_CITIES.find(c => c.cityCode === savedCityCode);
        if (city) setSelectedCity(city);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('[RealEstate] Error loading state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getStorageKey]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (isInitialized) {
      saveState();
    }
  }, [isInitialized, selectedCity, ownedProperties, propertyOwners, watchlist, rentalHistory, propertyRentals, saveState]);

  const initialize = useCallback(async (playerId: string): Promise<PropertyOperationResult> => {
    try {
      console.log('[RealEstate] Initializing for player:', playerId);
      setCurrentPlayerId(playerId);
      await loadState();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }, [loadState]);

  const selectCity = useCallback(async (cityCode: string): Promise<PropertyOperationResult<CityData>> => {
    const city = cities.find(c => c.cityCode === cityCode);
    if (!city) {
      return { success: false, error: 'City not found', errorCode: 'PROPERTY_NOT_FOUND' };
    }
    setSelectedCity(city);
    setSelectedNeighborhood(null);
    setAvailableProperties([]);
    showNotification(`Welcome to ${city.name}!`, 'success');
    console.log('[RealEstate] City selected:', city.name);
    return { success: true, data: city };
  }, [cities, showNotification]);

  const selectNeighborhood = useCallback((neighborhoodName: string): PropertyOperationResult<NeighborhoodData> => {
    if (!selectedCity) {
      return { success: false, error: 'No city selected', errorCode: 'VALIDATION_ERROR' };
    }
    const neighborhood = selectedCity.neighborhoods.find(n => n.name === neighborhoodName);
    if (!neighborhood) {
      return { success: false, error: 'Neighborhood not found', errorCode: 'PROPERTY_NOT_FOUND' };
    }
    setSelectedNeighborhood(neighborhood);
    console.log('[RealEstate] Neighborhood selected:', neighborhood.name);
    return { success: true, data: neighborhood };
  }, [selectedCity]);

  const generateProperties = useCallback((city: CityData, count: number = 50): PropertyData[] => {
    const properties: PropertyData[] = [];
    const residentialTypes: PropertyType[] = ['apartment', 'house', 'mansion', 'beach_house'];
    const commercialTypes: CommercialVenueType[] = [
      'bowling_alley', 'movie_theater', 'restaurant', 'nightclub', 'bar',
      'billiards_hall', 'bank', 'event_hall', 'grocery_store', 'sports_arena',
      'paintball_range', 'golf_country_club', 'gym', 'spa', 'coffee_shop',
      'shopping_mall', 'arcade', 'comedy_club', 'art_gallery', 'museum'
    ];
    
    const commercialNames: Record<CommercialVenueType, string[]> = {
      bowling_alley: ['Strike Zone Lanes', 'Lucky Strike Bowling', 'Sunset Lanes', 'Pin Masters', 'Bowl-O-Rama'],
      movie_theater: ['Cineplex Grand', 'Star Cinema', 'Metropolitan Pictures', 'Regal Theater', 'AMC Premiere'],
      restaurant: ['The Golden Fork', 'Blue Plate Diner', 'Harvest Kitchen', 'Urban Bites', 'Coastal Cuisine'],
      nightclub: ['Club Velvet', 'Neon Nights', 'The Underground', 'Pulse Lounge', 'Skyline Club'],
      bar: ['The Rusty Anchor', 'Craft & Draft', 'The Speakeasy', 'Hoppy Hour', 'Tap House'],
      billiards_hall: ['Rack & Roll', 'Corner Pocket', 'The Billiard Room', 'Eight Ball Lounge', 'Cue Masters'],
      bank: ['First National Bank', 'Metro Credit Union', 'City Savings', 'Heritage Bank', 'Pacific Trust'],
      event_hall: ['Grand Ballroom', 'The Venue', 'Celebration Hall', 'Crystal Palace', 'The Event Center'],
      grocery_store: ['Fresh Market', 'Urban Grocer', 'Daily Harvest', 'Green Valley Market', 'City Foods'],
      sports_arena: ['Metro Arena', 'Champions Stadium', 'Victory Field', 'Sports Complex', 'The Dome'],
      paintball_range: ['Combat Zone', 'Tactical Paintball', 'Battle Arena', 'Paintball Paradise', 'War Games'],
      golf_country_club: ['Fairway Club', 'Green Hills CC', 'Eagle Ridge', 'The Links', 'Sunset Golf Club'],
      gym: ['Iron Fitness', 'FitLife Gym', 'PowerHouse Athletics', 'The Training Ground', 'Peak Performance'],
      spa: ['Serenity Spa', 'Bliss Wellness', 'The Retreat', 'Harmony Day Spa', 'Oasis Relaxation'],
      coffee_shop: ['Brew House', 'Bean & Leaf', 'Morning Cup', 'The Daily Grind', 'Espresso Express'],
      shopping_mall: ['City Center Mall', 'Metro Plaza', 'Fashion Square', 'The Galleria', 'Riverside Mall'],
      arcade: ['Game Zone', 'Pixel Palace', 'Retro Arcade', 'Digital Fun', 'Player One'],
      comedy_club: ['Laugh Factory', 'The Comedy Store', 'Chuckles Club', 'Stand Up Central', 'Funny Bone'],
      art_gallery: ['Modern Art Space', 'The Gallery', 'Artisan Collective', 'Creative Corner', 'Vision Gallery'],
      museum: ['City Museum', 'Heritage Center', 'Discovery Museum', 'Cultural Institute', 'History Hall'],
    };
    
    const getApartmentRentPerUnit = (cityCode: string): number => {
      switch (cityCode) {
        case 'LA': return 2650;
        case 'MI': return 2400;
        case 'NY': return 3800;
        case 'CH': return 2100;
        case 'HO': return 1600;
        case 'PH': return 1700;
        case 'AT': return 1800;
        case 'DE': return 2200;
        default: return 2000;
      }
    };
    
    const residentialCount = Math.floor(count * 0.6);
    const commercialCount = count - residentialCount;
    
    // Generate residential properties
    for (let i = 0; i < residentialCount; i++) {
      const type = residentialTypes[Math.floor(Math.random() * residentialTypes.length)];
      const neighborhood = city.neighborhoods[Math.floor(Math.random() * city.neighborhoods.length)];
      
      let priceRange = city.apartmentPriceRange;
      let bedroomsRange = [1, 3];
      let sqftRange = [500, 1200];
      let totalUnits: number | undefined = undefined;
      
      switch (type) {
        case 'apartment':
          totalUnits = 250 + Math.floor(Math.random() * 751);
          sqftRange = [totalUnits * 800, totalUnits * 1100];
          break;
        case 'house':
          priceRange = city.housePriceRange;
          bedroomsRange = [2, 5];
          sqftRange = [1200, 3000];
          break;
        case 'mansion':
          priceRange = city.mansionPriceRange;
          bedroomsRange = [4, 8];
          sqftRange = [4000, 10000];
          break;
        case 'beach_house':
          priceRange = city.beachHousePriceRange;
          bedroomsRange = [2, 6];
          sqftRange = [1500, 4000];
          break;
      }
      
      const basePrice = priceRange.min + Math.random() * (priceRange.max - priceRange.min);
      const purchasePrice = Math.round(basePrice * neighborhood.priceMultiplier);
      const quality = Math.floor(Math.random() * 5) + 5;
      const bedrooms = Math.floor(Math.random() * (bedroomsRange[1] - bedroomsRange[0] + 1)) + bedroomsRange[0];
      const sqft = Math.floor(Math.random() * (sqftRange[1] - sqftRange[0])) + sqftRange[0];
      
      let baseRent: number;
      if (type === 'apartment' && totalUnits) {
        const rentPerUnit = getApartmentRentPerUnit(city.cityCode);
        const occupancyAdjustment = 0.92 + Math.random() * 0.06;
        baseRent = Math.round(totalUnits * rentPerUnit * occupancyAdjustment);
      } else {
        baseRent = Math.round(purchasePrice * 0.005);
      }
      
      const property: PropertyData = {
        id: `prop_${city.cityCode}_res_${i}_${Date.now()}`,
        propertyId: `${city.cityCode}-${type.substring(0, 3).toUpperCase()}-${neighborhood.name.substring(0, 4).toUpperCase()}-${String(i + 1).padStart(6, '0')}`,
        city: city.name,
        propertyType: type,
        address: `${Math.floor(Math.random() * 9999) + 1} ${['Main', 'Oak', 'Maple', 'Palm', 'Ocean', 'Park'][Math.floor(Math.random() * 6)]} ${['St', 'Ave', 'Blvd', 'Dr', 'Way'][Math.floor(Math.random() * 5)]}`,
        latitude: city.centerCoordinates.latitude + (Math.random() - 0.5) * 0.2,
        longitude: city.centerCoordinates.longitude + (Math.random() - 0.5) * 0.2,
        purchasePrice,
        baseRentPrice: baseRent,
        currentRentPrice: baseRent,
        propertyQuality: quality,
        squareFootage: sqft,
        bedrooms,
        bathrooms: Math.max(1, Math.floor(bedrooms * 0.75)),
        neighborhood: neighborhood.name,
        ownerId: null,
        status: 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalUnits,
        category: 'residential',
      };
      
      properties.push(property);
    }
    
    // Generate commercial properties
    const commercialPrices: Record<CommercialVenueType, [number, number]> = {
      bowling_alley: [500000, 2000000],
      movie_theater: [1000000, 5000000],
      restaurant: [200000, 1500000],
      nightclub: [500000, 3000000],
      bar: [150000, 800000],
      billiards_hall: [200000, 800000],
      bank: [1000000, 10000000],
      event_hall: [500000, 3000000],
      grocery_store: [500000, 5000000],
      sports_arena: [5000000, 50000000],
      paintball_range: [300000, 1500000],
      golf_country_club: [2000000, 20000000],
      gym: [300000, 2000000],
      spa: [200000, 1500000],
      coffee_shop: [100000, 500000],
      shopping_mall: [5000000, 100000000],
      arcade: [200000, 1000000],
      comedy_club: [300000, 1500000],
      art_gallery: [200000, 2000000],
      museum: [1000000, 20000000],
    };
    
    const commercialSqft: Record<CommercialVenueType, [number, number]> = {
      bowling_alley: [15000, 40000],
      movie_theater: [20000, 60000],
      restaurant: [2000, 8000],
      nightclub: [5000, 20000],
      bar: [1500, 5000],
      billiards_hall: [3000, 10000],
      bank: [5000, 20000],
      event_hall: [10000, 40000],
      grocery_store: [20000, 80000],
      sports_arena: [50000, 200000],
      paintball_range: [10000, 50000],
      golf_country_club: [5000, 20000],
      gym: [5000, 30000],
      spa: [3000, 15000],
      coffee_shop: [1000, 3000],
      shopping_mall: [100000, 500000],
      arcade: [5000, 20000],
      comedy_club: [3000, 10000],
      art_gallery: [2000, 15000],
      museum: [20000, 100000],
    };
    
    const commercialCapacity: Record<CommercialVenueType, [number, number]> = {
      bowling_alley: [100, 300],
      movie_theater: [200, 1000],
      restaurant: [50, 200],
      nightclub: [200, 1000],
      bar: [50, 150],
      billiards_hall: [30, 100],
      bank: [20, 100],
      event_hall: [200, 1000],
      grocery_store: [100, 500],
      sports_arena: [5000, 50000],
      paintball_range: [50, 200],
      golf_country_club: [50, 200],
      gym: [100, 500],
      spa: [20, 100],
      coffee_shop: [20, 60],
      shopping_mall: [1000, 10000],
      arcade: [50, 200],
      comedy_club: [100, 400],
      art_gallery: [50, 200],
      museum: [200, 2000],
    };
    
    for (let i = 0; i < commercialCount; i++) {
      const venueType = commercialTypes[Math.floor(Math.random() * commercialTypes.length)];
      const neighborhood = city.neighborhoods[Math.floor(Math.random() * city.neighborhoods.length)];
      
      const [minPrice, maxPrice] = commercialPrices[venueType];
      const [minSqft, maxSqft] = commercialSqft[venueType];
      const [minCap, maxCap] = commercialCapacity[venueType];
      
      const purchasePrice = Math.round((minPrice + Math.random() * (maxPrice - minPrice)) * neighborhood.priceMultiplier);
      const quality = Math.floor(Math.random() * 5) + 5;
      const sqft = Math.floor(Math.random() * (maxSqft - minSqft)) + minSqft;
      const capacity = Math.floor(Math.random() * (maxCap - minCap)) + minCap;
      const baseRent = Math.round(purchasePrice * 0.008);
      
      const venueNames = commercialNames[venueType];
      const venueName = venueNames[Math.floor(Math.random() * venueNames.length)];
      
      const property: PropertyData = {
        id: `prop_${city.cityCode}_com_${i}_${Date.now()}`,
        propertyId: `${city.cityCode}-COM-${venueType.substring(0, 4).toUpperCase()}-${String(i + 1).padStart(6, '0')}`,
        city: city.name,
        propertyType: 'house' as PropertyType, // Use house as base type for commercial
        address: `${Math.floor(Math.random() * 9999) + 1} ${['Commerce', 'Business', 'Market', 'Trade', 'Central', 'Main'][Math.floor(Math.random() * 6)]} ${['St', 'Ave', 'Blvd', 'Plaza', 'Way'][Math.floor(Math.random() * 5)]}`,
        latitude: city.centerCoordinates.latitude + (Math.random() - 0.5) * 0.2,
        longitude: city.centerCoordinates.longitude + (Math.random() - 0.5) * 0.2,
        purchasePrice,
        baseRentPrice: baseRent,
        currentRentPrice: baseRent,
        propertyQuality: quality,
        squareFootage: sqft,
        bedrooms: 0,
        bathrooms: Math.max(2, Math.floor(sqft / 2000)),
        neighborhood: neighborhood.name,
        ownerId: 'administrator',
        status: 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: 'commercial',
        venueType: venueType,
        venueName: venueName,
        capacity: capacity,
        operatingHours: '9:00 AM - 11:00 PM',
      };
      
      properties.push(property);
    }
    
    console.log(`[RealEstate] Generated ${properties.length} properties (${residentialCount} residential, ${commercialCount} commercial) for ${city.name}`);
    return properties;
  }, []);

  const loadProperties = useCallback(async (filter?: PropertyFilter, forceRegenerate: boolean = false): Promise<PropertyOperationResult<PropertyData[]>> => {
    try {
      setIsLoading(true);
      
      if (!selectedCity) {
        return { success: false, error: 'No city selected', errorCode: 'VALIDATION_ERROR' };
      }
      
      let properties = availableProperties;
      const hasCommercialProperties = properties.some(p => p.category === 'commercial');
      
      if (properties.length === 0 || forceRegenerate || !hasCommercialProperties) {
        properties = generateProperties(selectedCity, 50);
        setAvailableProperties(properties);
        console.log('[RealEstate] Properties regenerated with commercial venues');
      }
      
      if (filter) {
        if (filter.category) {
          properties = properties.filter(p => p.category === filter.category);
        }
        if (filter.propertyType) {
          properties = properties.filter(p => p.propertyType === filter.propertyType);
        }
        if (filter.venueType) {
          properties = properties.filter(p => p.venueType === filter.venueType);
        }
        if (filter.neighborhood) {
          properties = properties.filter(p => p.neighborhood === filter.neighborhood);
        }
        if (filter.minPrice !== undefined) {
          properties = properties.filter(p => p.purchasePrice >= filter.minPrice!);
        }
        if (filter.maxPrice !== undefined) {
          properties = properties.filter(p => p.purchasePrice <= filter.maxPrice!);
        }
        if (filter.minBedrooms !== undefined) {
          properties = properties.filter(p => p.bedrooms >= filter.minBedrooms!);
        }
      }
      
      return { success: true, data: properties };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message, errorCode: 'NETWORK_ERROR' };
    } finally {
      setIsLoading(false);
    }
  }, [selectedCity, availableProperties, generateProperties]);

  const purchaseProperty = useCallback(async (
    request: PropertyPurchaseRequest,
    playerBalance: number
  ): Promise<PropertyOperationResult<PropertyOwner>> => {
    try {
      if (playerBalance < request.totalAmount) {
        showNotification('Insufficient funds for purchase', 'error');
        return { success: false, error: 'Insufficient funds', errorCode: 'INSUFFICIENT_FUNDS' };
      }
      
      const property = availableProperties.find(p => p.propertyId === request.propertyId);
      if (!property) {
        return { success: false, error: 'Property not found', errorCode: 'PROPERTY_NOT_FOUND' };
      }
      
      if (property.status !== 'available') {
        return { success: false, error: 'Property not available', errorCode: 'PROPERTY_NOT_AVAILABLE' };
      }
      
      const owner: PropertyOwner = {
        id: `owner_${Date.now()}`,
        propertyId: property.propertyId,
        playerId: currentPlayerId || 'anonymous',
        purchasePrice: request.purchasePrice,
        purchaseDate: new Date().toISOString(),
        monthlyIncome: calculateMonthlyIncome(property.currentRentPrice, property.baseRentPrice),
        isActive: true,
      };
      
      const updatedProperty: PropertyData = {
        ...property,
        status: 'owned',
        ownerId: currentPlayerId,
        updatedAt: new Date().toISOString(),
      };
      
      setAvailableProperties(prev => prev.filter(p => p.propertyId !== property.propertyId));
      setOwnedProperties(prev => [...prev, updatedProperty]);
      setPropertyOwners(prev => ({ ...prev, [property.propertyId]: owner }));
      
      const rentalInfo: PropertyRentalInfo = {
        propertyId: property.propertyId,
        baseRent: property.baseRentPrice,
        currentRent: property.currentRentPrice,
        occupancyRate: calculateOccupancyRate(property.currentRentPrice, property.baseRentPrice),
        monthlyIncome: owner.monthlyIncome,
      };
      setPropertyRentals(prev => ({ ...prev, [property.propertyId]: rentalInfo }));
      
      showNotification(`Purchased ${property.neighborhood} property for $${request.totalAmount.toLocaleString()}!`, 'success');
      console.log('[RealEstate] Property purchased:', property.propertyId);
      
      return { success: true, data: owner };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showNotification('Failed to purchase property', 'error');
      return { success: false, error: message, errorCode: 'NETWORK_ERROR' };
    }
  }, [availableProperties, currentPlayerId, showNotification]);

  const setRentPrice = useCallback(async (
    propertyId: string,
    newRentPrice: number
  ): Promise<PropertyOperationResult<PropertyRentalInfo>> => {
    const property = ownedProperties.find(p => p.propertyId === propertyId);
    if (!property) {
      showNotification('Property not found', 'error');
      return { success: false, error: 'Property not found', errorCode: 'PROPERTY_NOT_FOUND' };
    }
    
    const minRent = property.baseRentPrice * 0.5;
    const maxRent = property.baseRentPrice * 2.0;
    
    if (newRentPrice < minRent || newRentPrice > maxRent) {
      showNotification(`Rent must be between $${minRent.toLocaleString()} and $${maxRent.toLocaleString()}`, 'error');
      return { success: false, error: 'Invalid rent amount', errorCode: 'INVALID_RENT_AMOUNT' };
    }
    
    const occupancyRate = calculateOccupancyRate(newRentPrice, property.baseRentPrice);
    const monthlyIncome = newRentPrice * (occupancyRate / 100);
    
    const rentalInfo: PropertyRentalInfo = {
      propertyId,
      baseRent: property.baseRentPrice,
      currentRent: newRentPrice,
      occupancyRate,
      monthlyIncome,
    };
    
    setOwnedProperties(prev => prev.map(p => 
      p.propertyId === propertyId 
        ? { ...p, currentRentPrice: newRentPrice, updatedAt: new Date().toISOString() }
        : p
    ));
    setPropertyRentals(prev => ({ ...prev, [propertyId]: rentalInfo }));
    
    showNotification(`Rent updated to $${newRentPrice.toLocaleString()}/month`, 'success');
    console.log('[RealEstate] Rent price set:', propertyId, newRentPrice);
    
    return { success: true, data: rentalInfo };
  }, [ownedProperties, showNotification]);

  const collectMonthlyRent = useCallback(async (): Promise<PropertyOperationResult<RentalCollectionSummaryData>> => {
    if (ownedProperties.length === 0) {
      showNotification('No properties to collect rent from', 'info');
      return { success: false, error: 'No owned properties', errorCode: 'VALIDATION_ERROR' };
    }
    
    const results: RentCollectionResult[] = [];
    const now = new Date();
    
    for (const property of ownedProperties) {
      const rentalInfo = propertyRentals[property.propertyId];
      const occupancyRate = rentalInfo?.occupancyRate ?? calculateOccupancyRate(property.currentRentPrice, property.baseRentPrice);
      const collectedAmount = property.currentRentPrice * (occupancyRate / 100);
      
      const result: RentCollectionResult = {
        propertyId: property.propertyId,
        rentAmount: property.currentRentPrice,
        occupancyRate,
        collectedAmount,
        collectionDate: now.toISOString(),
      };
      results.push(result);
      
      const income: RentalIncome = {
        id: `rent_${property.propertyId}_${now.getTime()}`,
        propertyId: property.propertyId,
        playerId: currentPlayerId || 'anonymous',
        rentAmount: property.currentRentPrice,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        occupancyRate,
        collectedAmount,
        collectionDate: now.toISOString(),
      };
      setRentalHistory(prev => [...prev, income]);
    }
    
    const summary = createRentalCollectionSummaryData(results);
    showNotification(`Collected $${summary.totalIncome.toLocaleString()} in rent from ${summary.propertiesCount} properties!`, 'success');
    console.log('[RealEstate] Monthly rent collected:', summary.totalIncome);
    
    return { success: true, data: summary };
  }, [ownedProperties, propertyRentals, currentPlayerId, showNotification]);

  const addToWatchlist = useCallback(async (propertyId: string, notes?: string): Promise<PropertyOperationResult<PropertyWatchlist>> => {
    if (watchlist.find(w => w.propertyId === propertyId)) {
      return { success: false, error: 'Property already in watchlist', errorCode: 'VALIDATION_ERROR' };
    }
    
    const entry: PropertyWatchlist = {
      id: `watch_${Date.now()}`,
      playerId: currentPlayerId || 'anonymous',
      propertyId,
      addedAt: new Date().toISOString(),
      notes: notes || null,
    };
    
    setWatchlist(prev => [...prev, entry]);
    showNotification('Added to watchlist', 'success');
    return { success: true, data: entry };
  }, [watchlist, currentPlayerId, showNotification]);

  const removeFromWatchlist = useCallback(async (propertyId: string): Promise<PropertyOperationResult> => {
    setWatchlist(prev => prev.filter(w => w.propertyId !== propertyId));
    showNotification('Removed from watchlist', 'info');
    return { success: true };
  }, [showNotification]);

  const portfolio = useMemo((): PortfolioSummary => {
    if (ownedProperties.length === 0) {
      return createEmptyPortfolioSummary();
    }
    
    let totalValue = 0;
    let monthlyIncome = 0;
    const propertiesByType: Record<PropertyType, number> = { apartment: 0, house: 0, mansion: 0, beach_house: 0 };
    const valueByType: Record<PropertyType, number> = { apartment: 0, house: 0, mansion: 0, beach_house: 0 };
    
    for (const property of ownedProperties) {
      const owner = propertyOwners[property.propertyId];
      const value = owner?.purchasePrice || property.purchasePrice;
      const income = propertyRentals[property.propertyId]?.monthlyIncome || calculateMonthlyIncome(property.currentRentPrice, property.baseRentPrice);
      
      totalValue += value;
      monthlyIncome += income;
      propertiesByType[property.propertyType]++;
      valueByType[property.propertyType] += value;
    }
    
    const annualIncome = monthlyIncome * 12;
    const averageROI = totalValue > 0 ? (annualIncome / totalValue) * 100 : 0;
    
    return {
      totalProperties: ownedProperties.length,
      totalValue,
      monthlyIncome,
      annualIncome,
      averageROI,
      propertiesByType,
      valueByType,
    };
  }, [ownedProperties, propertyOwners, propertyRentals]);

  const isPropertyInWatchlist = useCallback((propertyId: string): boolean => {
    return watchlist.some(w => w.propertyId === propertyId);
  }, [watchlist]);

  const getPropertyById = useCallback((propertyId: string): PropertyData | null => {
    return availableProperties.find(p => p.propertyId === propertyId) || 
           ownedProperties.find(p => p.propertyId === propertyId) || 
           null;
  }, [availableProperties, ownedProperties]);

  const hasSelectedCity = useMemo(() => selectedCity !== null, [selectedCity]);

  return {
    isLoading,
    isInitialized,
    currentPlayerId,
    
    cities,
    selectedCity,
    selectedNeighborhood,
    
    availableProperties,
    ownedProperties,
    propertyOwners,
    watchlist,
    rentalHistory,
    propertyRentals,
    portfolio,
    
    notifications,
    lastSyncTime,
    hasSelectedCity,
    
    initialize,
    selectCity,
    selectNeighborhood,
    loadProperties,
    purchaseProperty,
    setRentPrice,
    collectMonthlyRent,
    addToWatchlist,
    removeFromWatchlist,
    isPropertyInWatchlist,
    getPropertyById,
    showNotification,
    dismissNotification,
    generateProperties,
  };
});
