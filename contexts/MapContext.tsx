import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  City,
  Property,
  PropertyFilter,
  MapViewport,
  MapStats,
} from '../types/map';
import {
  MapProperty,
  PropertyCategory,
  MapPropertyType,
} from '../types/mapProperty';
import { MapService } from '../services/MapService';
import { generateCityProperties } from '../mocks/cityProperties';

interface ExtendedPropertyFilter extends PropertyFilter {
  category?: PropertyCategory;
  propertyType?: MapPropertyType;
}

interface MapContextType {
  cities: City[];
  selectedCity: City | null;
  properties: Property[];
  filteredProperties: Property[];
  propertyFilters: PropertyFilter;
  selectedProperty: Property | null;
  mapStats: MapStats;
  favorites: string[];
  
  mapProperties: MapProperty[];
  filteredMapProperties: MapProperty[];
  selectedMapProperty: MapProperty | null;
  extendedFilters: ExtendedPropertyFilter;
  savedProperties: string[];
  likedProperties: string[];
  
  isLoading: boolean;
  isRefreshing: boolean;
  showFilters: boolean;
  showPropertyModal: boolean;
  
  loadCities: () => Promise<void>;
  selectCity: (city: City) => Promise<void>;
  loadProperties: (cityId: string) => Promise<void>;
  updateFilters: (filters: Partial<PropertyFilter>) => void;
  selectProperty: (property: Property | null) => void;
  refreshData: () => Promise<void>;
  toggleFavorite: (propertyId: string) => Promise<void>;
  isFavorite: (propertyId: string) => boolean;
  
  selectMapProperty: (property: MapProperty | null) => void;
  updateExtendedFilters: (filters: Partial<ExtendedPropertyFilter>) => void;
  toggleLikeProperty: (propertyId: string) => void;
  toggleSaveProperty: (propertyId: string) => void;
  isPropertyLiked: (propertyId: string) => boolean;
  isPropertySaved: (propertyId: string) => boolean;
  setShowPropertyModal: (show: boolean) => void;
  
  viewport: MapViewport | null;
  updateViewport: (viewport: MapViewport) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

const STORAGE_KEY = 'map_context_state';
const LIKED_STORAGE_KEY = 'map_liked_properties';
const SAVED_STORAGE_KEY = 'map_saved_properties';


const DEFAULT_CITIES: City[] = [
  {
    id: 'los-angeles',
    name: 'Los Angeles',
    state: 'CA',
    country: 'USA',
    center_lat: 34.0522,
    center_lng: -118.2437,
    bounds_north: 34.3373,
    bounds_south: 33.7037,
    bounds_east: -118.1553,
    bounds_west: -118.6682,
    zoom_level: 11,
    population: 3980000,
    description: 'The City of Angels',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'new-york',
    name: 'New York',
    state: 'NY',
    country: 'USA',
    center_lat: 40.7128,
    center_lng: -74.0060,
    bounds_north: 40.9176,
    bounds_south: 40.4774,
    bounds_east: -73.7004,
    bounds_west: -74.2591,
    zoom_level: 11,
    population: 8336000,
    description: 'The Big Apple',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'miami',
    name: 'Miami',
    state: 'FL',
    country: 'USA',
    center_lat: 25.7617,
    center_lng: -80.1918,
    bounds_north: 25.8560,
    bounds_south: 25.7090,
    bounds_east: -80.1300,
    bounds_west: -80.3200,
    zoom_level: 12,
    population: 467963,
    description: 'The Magic City',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'chicago',
    name: 'Chicago',
    state: 'IL',
    country: 'USA',
    center_lat: 41.8781,
    center_lng: -87.6298,
    bounds_north: 42.0230,
    bounds_south: 41.6445,
    bounds_east: -87.5240,
    bounds_west: -87.9400,
    zoom_level: 11,
    population: 2746388,
    description: 'The Windy City',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'houston',
    name: 'Houston',
    state: 'TX',
    country: 'USA',
    center_lat: 29.7604,
    center_lng: -95.3698,
    bounds_north: 30.1107,
    bounds_south: 29.5237,
    bounds_east: -95.0145,
    bounds_west: -95.7877,
    zoom_level: 10,
    population: 2304580,
    description: 'Space City',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    state: 'AZ',
    country: 'USA',
    center_lat: 33.4484,
    center_lng: -112.0740,
    bounds_north: 33.9200,
    bounds_south: 33.2900,
    bounds_east: -111.9260,
    bounds_west: -112.3240,
    zoom_level: 11,
    population: 1660272,
    description: 'Valley of the Sun',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'san-francisco',
    name: 'San Francisco',
    state: 'CA',
    country: 'USA',
    center_lat: 37.7749,
    center_lng: -122.4194,
    bounds_north: 37.8324,
    bounds_south: 37.6398,
    bounds_east: -122.3280,
    bounds_west: -122.5270,
    zoom_level: 12,
    population: 874961,
    description: 'The Golden Gate City',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'atlanta',
    name: 'Atlanta',
    state: 'GA',
    country: 'USA',
    center_lat: 33.7490,
    center_lng: -84.3880,
    bounds_north: 33.8870,
    bounds_south: 33.6480,
    bounds_east: -84.2890,
    bounds_west: -84.5510,
    zoom_level: 11,
    population: 498715,
    description: 'The ATL',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cities, setCities] = useState<City[]>(DEFAULT_CITIES);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [propertyFilters, setPropertyFilters] = useState<PropertyFilter>({});
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mapStats, setMapStats] = useState<MapStats>({
    totalProperties: 0,
    availableProperties: 0,
    soldProperties: 0,
    favoriteProperties: 0,
    visitedProperties: 0,
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  
  const [mapProperties, setMapProperties] = useState<MapProperty[]>([]);
  const [selectedMapProperty, setSelectedMapProperty] = useState<MapProperty | null>(null);
  const [extendedFilters, setExtendedFilters] = useState<ExtendedPropertyFilter>({});
  const [likedProperties, setLikedProperties] = useState<string[]>([]);
  const [savedProperties, setSavedProperties] = useState<string[]>([]);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [generatedCities, setGeneratedCities] = useState<Set<string>>(new Set());
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters] = useState(false);

  useEffect(() => {
    loadCities();
    loadFavorites();
    loadLikedAndSaved();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [properties, propertyFilters]);

  const filteredMapProperties = useMemo(() => {
    let filtered = [...mapProperties];

    if (extendedFilters.category) {
      filtered = filtered.filter(p => p.category === extendedFilters.category);
    }

    if (extendedFilters.propertyType) {
      filtered = filtered.filter(p => p.propertyType === extendedFilters.propertyType);
    }

    if (extendedFilters.saleStatus) {
      filtered = filtered.filter(p => p.saleStatus === extendedFilters.saleStatus);
    }

    if (extendedFilters.minPrice !== undefined) {
      filtered = filtered.filter(p => p.financials.currentValue >= extendedFilters.minPrice!);
    }

    if (extendedFilters.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.financials.currentValue <= extendedFilters.maxPrice!);
    }

    if (extendedFilters.minRating !== undefined) {
      filtered = filtered.filter(p => p.stats.rating >= extendedFilters.minRating!);
    }

    if (extendedFilters.searchQuery) {
      const query = extendedFilters.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.neighborhood.toLowerCase().includes(query)
      );
    }

    if (extendedFilters.featuredOnly) {
      filtered = filtered.filter(p => p.isFeatured);
    }

    return filtered;
  }, [mapProperties, extendedFilters]);

  const loadLikedAndSaved = async () => {
    try {
      const [likedStr, savedStr] = await Promise.all([
        AsyncStorage.getItem(LIKED_STORAGE_KEY),
        AsyncStorage.getItem(SAVED_STORAGE_KEY),
      ]);
      
      if (likedStr) setLikedProperties(JSON.parse(likedStr));
      if (savedStr) setSavedProperties(JSON.parse(savedStr));
    } catch (error) {
      console.error('[MapContext] Error loading liked/saved:', error);
    }
  };

  const loadSavedState = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.favorites) setFavorites(state.favorites);
        if (state.lastCityId && cities.length > 0) {
          const lastCity = cities.find(c => c.id === state.lastCityId);
          if (lastCity) await selectCity(lastCity);
        }
      }
    } catch (error) {
      console.error('[MapContext] Error loading saved state:', error);
    }
  };

  const saveState = async () => {
    try {
      const state = {
        favorites,
        lastCityId: selectedCity?.id,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('[MapContext] Error saving state:', error);
    }
  };

  const loadCities = async () => {
    try {
      setIsLoading(true);
      
      try {
        const citiesData = await MapService.getCities();
        if (citiesData && citiesData.length > 0) {
          setCities(citiesData);
        }
      } catch (serviceError) {
        console.log('[MapContext] Using default cities, service error:', serviceError);
      }
      
      await loadSavedState();
    } catch (error) {
      console.error('[MapContext] Error loading cities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePropertiesForCity = useCallback((cityId: string): MapProperty[] => {
    console.log(`[MapContext] Generating properties for city: ${cityId}`);
    const properties = generateCityProperties(cityId, 150);
    console.log(`[MapContext] Generated ${properties.length} properties for ${cityId}`);
    return properties;
  }, []);

  const selectCity = async (city: City) => {
    try {
      setSelectedCity(city);
      setIsLoading(true);
      
      if (!generatedCities.has(city.id)) {
        const newProperties = generatePropertiesForCity(city.id);
        setMapProperties(newProperties);
        setGeneratedCities(prev => new Set(prev).add(city.id));
      } else {
        const cityProperties = mapProperties.filter(p => p.cityId === city.id);
        if (cityProperties.length === 0) {
          const newProperties = generatePropertiesForCity(city.id);
          setMapProperties(newProperties);
        }
      }
      
      try {
        await loadProperties(city.id);
      } catch {
        console.log('[MapContext] Could not load properties from service');
      }
      
      saveState();
    } catch (error) {
      console.error('[MapContext] Error selecting city:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProperties = async (cityId: string) => {
    try {
      const propertiesData = await MapService.getCityProperties(cityId);
      setProperties(propertiesData);
      
      const stats = await MapService.getMapStats(cityId);
      setMapStats(stats);
    } catch (error) {
      console.error('[MapContext] Error loading properties:', error);
      setMapStats({
        totalProperties: mapProperties.length,
        availableProperties: mapProperties.filter(p => p.saleStatus === 'available').length,
        soldProperties: mapProperties.filter(p => p.saleStatus === 'sold').length,
        favoriteProperties: savedProperties.length,
        visitedProperties: 0,
      });
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...properties];

    if (propertyFilters.propertyTypeId) {
      filtered = filtered.filter(p => p.property_type_id === propertyFilters.propertyTypeId);
    }

    if (propertyFilters.saleStatus) {
      filtered = filtered.filter(p => p.sale_status === propertyFilters.saleStatus);
    }

    if (propertyFilters.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price && p.price >= propertyFilters.minPrice!);
    }

    if (propertyFilters.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price && p.price <= propertyFilters.maxPrice!);
    }

    if (propertyFilters.minRating !== undefined) {
      filtered = filtered.filter(p => p.rating && p.rating >= propertyFilters.minRating!);
    }

    if (propertyFilters.searchQuery) {
      const query = propertyFilters.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    if (propertyFilters.featuredOnly) {
      filtered = filtered.filter(p => p.is_featured);
    }

    setFilteredProperties(filtered);
  }, [properties, propertyFilters]);

  const updateFilters = (filters: Partial<PropertyFilter>) => {
    setPropertyFilters(prev => ({ ...prev, ...filters }));
  };

  const updateExtendedFilters = (filters: Partial<ExtendedPropertyFilter>) => {
    setExtendedFilters(prev => ({ ...prev, ...filters }));
  };

  const selectProperty = (property: Property | null) => {
    setSelectedProperty(property);
  };

  const selectMapProperty = useCallback((property: MapProperty | null) => {
    setSelectedMapProperty(property);
    setShowPropertyModal(property !== null);
  }, []);

  const toggleLikeProperty = useCallback(async (propertyId: string) => {
    const newLiked = likedProperties.includes(propertyId)
      ? likedProperties.filter(id => id !== propertyId)
      : [...likedProperties, propertyId];
    
    setLikedProperties(newLiked);
    
    setMapProperties(prev => prev.map(p => {
      if (p.id === propertyId) {
        const wasLiked = likedProperties.includes(propertyId);
        return {
          ...p,
          social: { ...p.social, isLiked: !wasLiked },
          stats: { ...p.stats, likes: p.stats.likes + (wasLiked ? -1 : 1) },
        };
      }
      return p;
    }));

    if (selectedMapProperty?.id === propertyId) {
      setSelectedMapProperty(prev => prev ? {
        ...prev,
        social: { ...prev.social, isLiked: !prev.social.isLiked },
        stats: { ...prev.stats, likes: prev.stats.likes + (prev.social.isLiked ? -1 : 1) },
      } : null);
    }
    
    try {
      await AsyncStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(newLiked));
    } catch (error) {
      console.error('[MapContext] Error saving liked properties:', error);
    }
  }, [likedProperties, selectedMapProperty]);

  const toggleSaveProperty = useCallback(async (propertyId: string) => {
    const newSaved = savedProperties.includes(propertyId)
      ? savedProperties.filter(id => id !== propertyId)
      : [...savedProperties, propertyId];
    
    setSavedProperties(newSaved);
    
    setMapProperties(prev => prev.map(p => {
      if (p.id === propertyId) {
        const wasSaved = savedProperties.includes(propertyId);
        return {
          ...p,
          social: { ...p.social, isSaved: !wasSaved },
          stats: { ...p.stats, saves: p.stats.saves + (wasSaved ? -1 : 1) },
        };
      }
      return p;
    }));

    if (selectedMapProperty?.id === propertyId) {
      setSelectedMapProperty(prev => prev ? {
        ...prev,
        social: { ...prev.social, isSaved: !prev.social.isSaved },
        stats: { ...prev.stats, saves: prev.stats.saves + (prev.social.isSaved ? -1 : 1) },
      } : null);
    }
    
    try {
      await AsyncStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(newSaved));
    } catch (error) {
      console.error('[MapContext] Error saving saved properties:', error);
    }
  }, [savedProperties, selectedMapProperty]);

  const isPropertyLiked = useCallback((propertyId: string): boolean => {
    return likedProperties.includes(propertyId);
  }, [likedProperties]);

  const isPropertySaved = useCallback((propertyId: string): boolean => {
    return savedProperties.includes(propertyId);
  }, [savedProperties]);

  const refreshData = async () => {
    try {
      setIsRefreshing(true);
      if (selectedCity) {
        const newProperties = generatePropertiesForCity(selectedCity.id);
        setMapProperties(newProperties);
        
        try {
          await loadProperties(selectedCity.id);
        } catch {
          console.log('[MapContext] Could not refresh from service');
        }
      }
    } catch (error) {
      console.error('[MapContext] Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('property_favorites');
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[MapContext] Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (propertyId: string) => {
    try {
      let newFavorites: string[];
      
      if (favorites.includes(propertyId)) {
        newFavorites = favorites.filter(id => id !== propertyId);
      } else {
        newFavorites = [...favorites, propertyId];
      }
      
      setFavorites(newFavorites);
      await AsyncStorage.setItem('property_favorites', JSON.stringify(newFavorites));
      
      setMapStats(prev => ({
        ...prev,
        favoriteProperties: newFavorites.length,
      }));
    } catch (error) {
      console.error('[MapContext] Error toggling favorite:', error);
    }
  };

  const isFavorite = (propertyId: string): boolean => {
    return favorites.includes(propertyId);
  };

  const updateViewport = (newViewport: MapViewport) => {
    setViewport(newViewport);
  };

  const value: MapContextType = {
    cities,
    selectedCity,
    properties,
    filteredProperties,
    propertyFilters,
    selectedProperty,
    mapStats,
    favorites,
    
    mapProperties,
    filteredMapProperties,
    selectedMapProperty,
    extendedFilters,
    savedProperties,
    likedProperties,
    
    isLoading,
    isRefreshing,
    showFilters,
    showPropertyModal,
    
    loadCities,
    selectCity,
    loadProperties,
    updateFilters,
    selectProperty,
    refreshData,
    toggleFavorite,
    isFavorite,
    
    selectMapProperty,
    updateExtendedFilters,
    toggleLikeProperty,
    toggleSaveProperty,
    isPropertyLiked,
    isPropertySaved,
    setShowPropertyModal,
    
    viewport,
    updateViewport,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

export const useMap = () => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
};
