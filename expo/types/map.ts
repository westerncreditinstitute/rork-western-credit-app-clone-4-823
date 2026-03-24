// TypeScript type definitions for the Interactive Map System

export interface City {
  id: string;
  name: string;
  state: string;
  country: string;
  center_lat: number;
  center_lng: number;
  bounds_north?: number;
  bounds_south?: number;
  bounds_east?: number;
  bounds_west?: number;
  zoom_level?: number;
  min_zoom?: number;
  max_zoom?: number;
  is_active?: boolean;
  population?: number;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyType {
  id: number;
  name: string;
  category: 'residential' | 'commercial';
  icon: string;
  color: string;
  description?: string;
  priority?: number;
  is_active?: boolean;
  created_at: string;
}

export interface Property {
  id: string;
  city_id: string;
  property_type_id: number;
  title: string;
  description?: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip_code?: string;
  lat: number;
  lng: number;
  image_url?: string;
  thumbnail_url?: string;
  sale_status: 'available' | 'sold' | 'pending' | 'off_market' | 'rented';
  price?: number;
  rent_price?: number;
  property_details?: Record<string, any>;
  amenities?: string[];
  capacity?: number;
  rating?: number;
  is_featured?: boolean;
  visit_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PropertyCluster {
  id: string;
  city_id: string;
  cluster_lat: number;
  cluster_lng: number;
  property_count: number;
  property_ids: string[];
  property_type_ids: number[];
  cluster_level: number;
  created_at: string;
  updated_at: string;
}

export interface PropertyFavorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

export interface PropertyVisit {
  id: string;
  property_id: string;
  user_id: string;
  visit_count: number;
  last_visited_at: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewport {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bounds: MapBounds;
}

export interface PropertyFilter {
  cityId?: string;
  propertyTypeId?: number;
  saleStatus?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  searchQuery?: string;
  featuredOnly?: boolean;
}

export interface PropertySearchResult extends Property {
  distance?: number;
  relevance?: number;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  formatted_address: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

export interface MapMarker {
  id: string;
  coordinate: [number, number];
  type: 'property' | 'cluster';
  data: Property | PropertyCluster;
}

export interface MarkerStyle {
  icon: string;
  size: number;
  color: string;
  anchor: 'center' | 'bottom';
}

export interface MapConfig {
  initialZoom: number;
  minZoom: number;
  maxZoom: number;
  clusterRadius: number;
  maxClusterZoom: number;
  markerSize: number;
  enableClustering: boolean;
  showUserLocation: boolean;
}

export interface PropertyGenerationConfig {
  cityId: string;
  venueTypes: string[];
  venuesPerType: Record<string, number>;
  totalProperties: number;
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface CommercialArea {
  id: string;
  name: string;
  north: number;
  south: number;
  east: number;
  west: number;
  area_type: string;
}

export interface MapStats {
  totalProperties: number;
  availableProperties: number;
  soldProperties: number;
  favoriteProperties: number;
  visitedProperties: number;
}