export type PropertyCategory = 'residential' | 'commercial';

export type ResidentialType = 
  | 'apartment'
  | 'house'
  | 'condo'
  | 'townhouse'
  | 'duplex'
  | 'mansion'
  | 'penthouse'
  | 'loft'
  | 'studio';

export type CommercialVenueType =
  | 'bowling_alley'
  | 'movie_theater'
  | 'restaurant'
  | 'nightclub'
  | 'bar'
  | 'billiards_hall'
  | 'bank'
  | 'event_hall'
  | 'grocery_store'
  | 'sports_arena'
  | 'paintball_range'
  | 'golf_country_club'
  | 'gym'
  | 'spa'
  | 'coffee_shop'
  | 'shopping_mall'
  | 'arcade'
  | 'comedy_club'
  | 'art_gallery'
  | 'museum';

export type MapPropertyType = ResidentialType | CommercialVenueType;

export interface MapPropertyOwner {
  id: string;
  name: string;
  avatar: string;
  level: number;
  creditScore: number;
  isVerified: boolean;
  isOnline: boolean;
  totalProperties: number;
  followers: number;
}

export interface MapPropertyDetails {
  bedrooms?: number;
  bathrooms?: number;
  squareFootage: number;
  yearBuilt?: number;
  lotSize?: number;
  parkingSpaces?: number;
  floors?: number;
  capacity?: number;
  operatingHours?: string;
  amenities: string[];
}

export interface MapPropertyFinancials {
  purchasePrice: number;
  currentValue: number;
  monthlyRent?: number;
  isForSale: boolean;
  isForRent: boolean;
  askingPrice?: number;
  monthlyRentPrice?: number;
  appreciationRate?: number;
  monthlyRevenue?: number;
  annualTaxes?: number;
}

export interface MapPropertyStats {
  likes: number;
  visits: number;
  saves: number;
  rating: number;
  reviewCount: number;
  weeklyVisitors: number;
  trending: boolean;
}

export interface MapPropertySocial {
  isLiked: boolean;
  isSaved: boolean;
  isFollowingOwner: boolean;
  hasVisited: boolean;
  lastVisitDate?: number;
  userRating?: number;
}

export interface MapProperty {
  id: string;
  cityId: string;
  category: PropertyCategory;
  propertyType: MapPropertyType;
  title: string;
  description: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  lat: number;
  lng: number;
  coverImage: string;
  images: string[];
  saleStatus: 'available' | 'sold' | 'pending' | 'off_market' | 'rented';
  owner: MapPropertyOwner;
  details: MapPropertyDetails;
  financials: MapPropertyFinancials;
  stats: MapPropertyStats;
  social: MapPropertySocial;
  features: string[];
  isFeatured: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PropertyReview {
  id: string;
  propertyId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  visitDate: number;
  createdAt: number;
  likes: number;
  isLiked: boolean;
}

export const PROPERTY_TYPE_CONFIG: Record<MapPropertyType, {
  icon: string;
  color: string;
  label: string;
  category: PropertyCategory;
}> = {
  apartment: { icon: '🏢', color: '#3B82F6', label: 'Apartment', category: 'residential' },
  house: { icon: '🏠', color: '#10B981', label: 'House', category: 'residential' },
  condo: { icon: '🏙️', color: '#6366F1', label: 'Condo', category: 'residential' },
  townhouse: { icon: '🏘️', color: '#8B5CF6', label: 'Townhouse', category: 'residential' },
  duplex: { icon: '🏚️', color: '#EC4899', label: 'Duplex', category: 'residential' },
  mansion: { icon: '🏰', color: '#F59E0B', label: 'Mansion', category: 'residential' },
  penthouse: { icon: '🌆', color: '#EF4444', label: 'Penthouse', category: 'residential' },
  loft: { icon: '🏗️', color: '#14B8A6', label: 'Loft', category: 'residential' },
  studio: { icon: '🛏️', color: '#64748B', label: 'Studio', category: 'residential' },
  bowling_alley: { icon: '🎳', color: '#F97316', label: 'Bowling Alley', category: 'commercial' },
  movie_theater: { icon: '🎬', color: '#EF4444', label: 'Movie Theater', category: 'commercial' },
  restaurant: { icon: '🍽️', color: '#F59E0B', label: 'Restaurant', category: 'commercial' },
  nightclub: { icon: '🪩', color: '#A855F7', label: 'Nightclub', category: 'commercial' },
  bar: { icon: '🍺', color: '#84CC16', label: 'Bar', category: 'commercial' },
  billiards_hall: { icon: '🎱', color: '#22C55E', label: 'Billiards Hall', category: 'commercial' },
  bank: { icon: '🏦', color: '#0EA5E9', label: 'Bank', category: 'commercial' },
  event_hall: { icon: '🎪', color: '#EC4899', label: 'Event Hall', category: 'commercial' },
  grocery_store: { icon: '🛒', color: '#10B981', label: 'Grocery Store', category: 'commercial' },
  sports_arena: { icon: '🏟️', color: '#3B82F6', label: 'Sports Arena', category: 'commercial' },
  paintball_range: { icon: '🎯', color: '#EF4444', label: 'Paintball Range', category: 'commercial' },
  golf_country_club: { icon: '⛳', color: '#22C55E', label: 'Golf Country Club', category: 'commercial' },
  gym: { icon: '🏋️', color: '#F97316', label: 'Gym', category: 'commercial' },
  spa: { icon: '💆', color: '#EC4899', label: 'Spa', category: 'commercial' },
  coffee_shop: { icon: '☕', color: '#92400E', label: 'Coffee Shop', category: 'commercial' },
  shopping_mall: { icon: '🛍️', color: '#8B5CF6', label: 'Shopping Mall', category: 'commercial' },
  arcade: { icon: '🕹️', color: '#6366F1', label: 'Arcade', category: 'commercial' },
  comedy_club: { icon: '🎤', color: '#F59E0B', label: 'Comedy Club', category: 'commercial' },
  art_gallery: { icon: '🖼️', color: '#A855F7', label: 'Art Gallery', category: 'commercial' },
  museum: { icon: '🏛️', color: '#64748B', label: 'Museum', category: 'commercial' },
};

export function getPropertyTypeConfig(type: MapPropertyType) {
  return PROPERTY_TYPE_CONFIG[type] || { icon: '🏠', color: '#6B7280', label: type, category: 'residential' as PropertyCategory };
}

export function formatPropertyPrice(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function getMarkerColor(property: MapProperty): string {
  if (property.saleStatus === 'sold' || property.saleStatus === 'rented') {
    return '#9CA3AF';
  }
  if (property.saleStatus === 'pending') {
    return '#F59E0B';
  }
  return getPropertyTypeConfig(property.propertyType).color;
}
