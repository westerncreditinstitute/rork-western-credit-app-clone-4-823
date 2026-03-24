export type PropertyType = 'apartment' | 'house' | 'mansion' | 'beach_house';
export type CommercialVenueType = 
  | 'bowling_alley' | 'movie_theater' | 'restaurant' | 'nightclub' | 'bar' 
  | 'billiards_hall' | 'bank' | 'event_hall' | 'grocery_store' | 'sports_arena' 
  | 'paintball_range' | 'golf_country_club' | 'gym' | 'spa' | 'coffee_shop' 
  | 'shopping_mall' | 'arcade' | 'comedy_club' | 'art_gallery' | 'museum';
export type PropertyCategory = 'residential' | 'commercial';
export type PropertyStatus = 'available' | 'sold' | 'owned' | 'rented';

export interface PropertyData {
  id: string;
  propertyId: string;
  city: string;
  propertyType: PropertyType;
  address: string;
  latitude: number;
  longitude: number;
  purchasePrice: number;
  baseRentPrice: number;
  currentRentPrice: number;
  propertyQuality: number;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  neighborhood: string;
  ownerId: string | null;
  status: PropertyStatus;
  createdAt: string;
  updatedAt: string;
  totalUnits?: number; // For apartment buildings (250-1000 units)
  // Commercial property fields
  category?: PropertyCategory;
  venueType?: CommercialVenueType;
  venueName?: string;
  capacity?: number;
  operatingHours?: string;
}

export interface PropertyOwner {
  id: string;
  propertyId: string;
  playerId: string;
  purchasePrice: number;
  purchaseDate: string;
  monthlyIncome: number;
  isActive: boolean;
}

export interface RentalIncome {
  id: string;
  propertyId: string;
  playerId: string;
  rentAmount: number;
  month: number;
  year: number;
  occupancyRate: number;
  collectedAmount: number;
  collectionDate: string;
}

export interface NeighborhoodData {
  id: string;
  city: string;
  name: string;
  priceMultiplier: number;
  desirabilityScore: number;
  safetyScore: number;
  description: string;
}

export interface PropertyFilter {
  city?: string;
  propertyType?: PropertyType;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minQuality?: number;
  maxQuality?: number;
  beachfront?: boolean;
  category?: PropertyCategory;
  venueType?: CommercialVenueType;
}

export type PropertySortOption =
  | 'price_low_to_high'
  | 'price_high_to_low'
  | 'rent_low_to_high'
  | 'rent_high_to_low'
  | 'newest_first'
  | 'oldest_first'
  | 'quality_high_to_low'
  | 'quality_low_to_high'
  | 'size_large_to_small'
  | 'size_small_to_large';

export interface PropertySortCriteria {
  sortOption: PropertySortOption;
  ascending: boolean;
}

export interface PropertyPurchaseRequest {
  propertyId: string;
  purchasePrice: number;
  closingCosts: number;
  totalAmount: number;
}

export interface PortfolioSummary {
  totalProperties: number;
  totalValue: number;
  monthlyIncome: number;
  annualIncome: number;
  averageROI: number;
  propertiesByType: Record<PropertyType, number>;
  valueByType: Record<PropertyType, number>;
}

export interface MarketData {
  id: string;
  city: string;
  propertyType: PropertyType;
  date: string;
  avgPrice: number;
  avgRent: number;
  priceChangePercent: number;
  inventoryCount: number;
}

export interface PropertyMarkerData {
  propertyId: string;
  worldPosition: { x: number; y: number; z: number };
  propertyType: PropertyType;
  status: PropertyStatus;
  price: number;
  markerColor: string;
  markerSize: number;
}

export interface PropertyHistory {
  id: string;
  propertyId: string;
  playerId: string | null;
  action: 'purchased' | 'sold' | 'rent_set' | 'rent_collected';
  actionDate: string;
  details: Record<string, unknown>;
}

export interface PropertyWatchlist {
  id: string;
  playerId: string;
  propertyId: string;
  addedAt: string;
  notes: string | null;
}

export function createPropertyPurchaseRequest(
  propertyId: string,
  price: number,
  closingPercent: number = 0.02
): PropertyPurchaseRequest {
  const closingCosts = price * closingPercent;
  return {
    propertyId,
    purchasePrice: price,
    closingCosts,
    totalAmount: price + closingCosts,
  };
}

export function calculateOccupancyRate(currentRent: number, baseRent: number): number {
  if (baseRent === 0) return 100;
  const ratio = currentRent / baseRent;
  if (ratio <= 0.8) return 100;
  if (ratio <= 1.0) return 95;
  if (ratio <= 1.2) return 80;
  if (ratio <= 1.5) return 50;
  return 25;
}

export function calculateMonthlyIncome(currentRent: number, baseRent: number): number {
  return currentRent * (calculateOccupancyRate(currentRent, baseRent) / 100);
}

export function getPropertyTypeColor(type: PropertyType): string {
  switch (type) {
    case 'apartment': return '#3380FF';
    case 'house': return '#33CC4D';
    case 'mansion': return '#FFE633';
    case 'beach_house': return '#00CCE6';
    default: return '#FFFFFF';
  }
}

export function getPropertyMarkerSize(type: PropertyType): number {
  switch (type) {
    case 'apartment': return 1.5;
    case 'house': return 2;
    case 'mansion': return 3;
    case 'beach_house': return 2.5;
    default: return 1;
  }
}

export function createEmptyPortfolioSummary(): PortfolioSummary {
  return {
    totalProperties: 0,
    totalValue: 0,
    monthlyIncome: 0,
    annualIncome: 0,
    averageROI: 0,
    propertiesByType: {
      apartment: 0,
      house: 0,
      mansion: 0,
      beach_house: 0,
    },
    valueByType: {
      apartment: 0,
      house: 0,
      mansion: 0,
      beach_house: 0,
    },
  };
}

export function hasActiveFilters(filter: PropertyFilter): boolean {
  return !!(
    filter.city ||
    filter.propertyType ||
    filter.neighborhood ||
    filter.minPrice !== undefined ||
    filter.maxPrice !== undefined ||
    filter.minBedrooms !== undefined ||
    filter.maxBedrooms !== undefined ||
    filter.minQuality !== undefined ||
    filter.maxQuality !== undefined ||
    filter.beachfront !== undefined
  );
}

export interface PropertyOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: PropertyErrorCode;
}

export type PropertyErrorCode =
  | 'INSUFFICIENT_FUNDS'
  | 'PROPERTY_NOT_AVAILABLE'
  | 'PROPERTY_NOT_FOUND'
  | 'ALREADY_OWNED'
  | 'NOT_OWNER'
  | 'INVALID_RENT_AMOUNT'
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR';

export interface PropertySearchResult {
  properties: PropertyData[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface RentCollectionResult {
  propertyId: string;
  rentAmount: number;
  occupancyRate: number;
  collectedAmount: number;
  collectionDate: string;
}

export interface PropertyValuation {
  propertyId: string;
  currentValue: number;
  purchasePrice: number;
  appreciation: number;
  appreciationPercent: number;
  estimatedRent: number;
  capRate: number;
}

export interface PropertyTransaction {
  id: string;
  propertyId: string;
  buyerId: string | null;
  sellerId: string | null;
  transactionType: 'purchase' | 'sale' | 'rent_payment';
  amount: number;
  fees: number;
  totalAmount: number;
  transactionDate: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export interface PropertyManagerState {
  isLoading: boolean;
  isInitialized: boolean;
  currentPlayerId: string | null;
  ownedProperties: PropertyData[];
  watchlist: PropertyWatchlist[];
  portfolio: PortfolioSummary;
  lastSyncTime: string | null;
}

export interface PropertyManagerEvents {
  onPropertyPurchased: (property: PropertyData, owner: PropertyOwner) => void;
  onPropertySold: (property: PropertyData, salePrice: number) => void;
  onRentCollected: (result: RentCollectionResult) => void;
  onRentUpdated: (propertyId: string, newRent: number) => void;
  onWatchlistUpdated: (watchlist: PropertyWatchlist[]) => void;
  onPortfolioUpdated: (portfolio: PortfolioSummary) => void;
  onError: (error: string, errorCode?: PropertyErrorCode) => void;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface MapBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CityData {
  cityCode: string;
  name: string;
  state: string;
  totalProperties: number;
  apartments: number;
  houses: number;
  mansions: number;
  beachHouses: number;
  averagePrice: number;
  averageRent: number;
  centerCoordinates: Coordinates;
  mapBounds: MapBounds;
  neighborhoods: NeighborhoodData[];
  apartmentPriceRange: PriceRange;
  housePriceRange: PriceRange;
  mansionPriceRange: PriceRange;
  beachHousePriceRange: PriceRange;
}

export interface CityFilter {
  state?: string;
  minProperties?: number;
  maxAveragePrice?: number;
  minAveragePrice?: number;
  hasBeachProperties?: boolean;
}

export interface CityManagerState {
  isLoading: boolean;
  isInitialized: boolean;
  cities: CityData[];
  selectedCity: CityData | null;
  selectedNeighborhood: NeighborhoodData | null;
  lastUpdated: string | null;
}

export interface CityManagerEvents {
  onCitySelected: (city: CityData) => void;
  onNeighborhoodSelected: (neighborhood: NeighborhoodData) => void;
  onCitiesLoaded: (cities: CityData[]) => void;
  onError: (error: string) => void;
}

export interface CityManager {
  state: CityManagerState;
  events: Partial<CityManagerEvents>;

  initialize: () => Promise<PropertyOperationResult>;
  dispose: () => void;

  getCities: (filter?: CityFilter) => Promise<PropertyOperationResult<CityData[]>>;
  getCityByCode: (cityCode: string) => Promise<PropertyOperationResult<CityData>>;
  getCityByName: (name: string) => Promise<PropertyOperationResult<CityData>>;

  selectCity: (cityCode: string) => Promise<PropertyOperationResult<CityData>>;
  selectNeighborhood: (neighborhoodName: string) => Promise<PropertyOperationResult<NeighborhoodData>>;
  clearSelection: () => void;

  getNeighborhoodsForCity: (cityCode: string) => Promise<PropertyOperationResult<NeighborhoodData[]>>;
  getNeighborhoodByName: (cityCode: string, name: string) => Promise<PropertyOperationResult<NeighborhoodData>>;

  getPriceRangeForType: (cityCode: string, propertyType: PropertyType) => Promise<PropertyOperationResult<PriceRange>>;
  getCityStatistics: (cityCode: string) => Promise<PropertyOperationResult<CityStatistics>>;

  searchCities: (query: string) => Promise<PropertyOperationResult<CityData[]>>;
  getNearestCity: (coordinates: Coordinates) => Promise<PropertyOperationResult<CityData>>;
}

export interface CityStatistics {
  cityCode: string;
  totalProperties: number;
  availableProperties: number;
  soldProperties: number;
  averagePrice: number;
  medianPrice: number;
  averageRent: number;
  pricePerSqFt: number;
  propertiesByType: Record<PropertyType, number>;
  neighborhoodCount: number;
  topNeighborhoods: NeighborhoodData[];
  marketTrend: 'rising' | 'stable' | 'falling';
  priceChangePercent: number;
}

export function getCityDisplayName(city: CityData): string {
  return `${city.name}, ${city.state}`;
}

export function getCityPropertyCountText(city: CityData): string {
  return `${city.totalProperties.toLocaleString()} properties`;
}

export function getPriceRangeForPropertyType(
  city: CityData,
  propertyType: PropertyType
): PriceRange {
  switch (propertyType) {
    case 'apartment':
      return city.apartmentPriceRange;
    case 'house':
      return city.housePriceRange;
    case 'mansion':
      return city.mansionPriceRange;
    case 'beach_house':
      return city.beachHousePriceRange;
    default:
      return { min: 0, max: 0 };
  }
}

export function createDefaultCityData(cityCode: string, name: string, state: string): CityData {
  return {
    cityCode,
    name,
    state,
    totalProperties: 0,
    apartments: 0,
    houses: 0,
    mansions: 0,
    beachHouses: 0,
    averagePrice: 0,
    averageRent: 0,
    centerCoordinates: { latitude: 0, longitude: 0 },
    mapBounds: { x: 0, y: 0, width: 0, height: 0 },
    neighborhoods: [],
    apartmentPriceRange: { min: 250000, max: 800000 },
    housePriceRange: { min: 500000, max: 1500000 },
    mansionPriceRange: { min: 2000000, max: 10000000 },
    beachHousePriceRange: { min: 1500000, max: 5000000 },
  };
}

export function createEmptyCityManagerState(): CityManagerState {
  return {
    isLoading: false,
    isInitialized: false,
    cities: [],
    selectedCity: null,
    selectedNeighborhood: null,
    lastUpdated: null,
  };
}

export function isCoordinateInBounds(coordinates: Coordinates, bounds: MapBounds): boolean {
  return (
    coordinates.latitude >= bounds.y &&
    coordinates.latitude <= bounds.y + bounds.height &&
    coordinates.longitude >= bounds.x &&
    coordinates.longitude <= bounds.x + bounds.width
  );
}

export function calculateDistanceBetweenCoordinates(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371;
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const DEFAULT_NEW_YORK_NEIGHBORHOODS: NeighborhoodData[] = [
  { id: '1', city: 'New York', name: 'Manhattan', priceMultiplier: 2.5, desirabilityScore: 9.5, safetyScore: 8.0, description: 'Premium urban living' },
  { id: '2', city: 'New York', name: 'Brooklyn', priceMultiplier: 1.8, desirabilityScore: 9.0, safetyScore: 7.5, description: 'Trendy neighborhoods' },
  { id: '3', city: 'New York', name: 'Queens', priceMultiplier: 1.2, desirabilityScore: 8.0, safetyScore: 7.5, description: 'Diverse communities' },
  { id: '4', city: 'New York', name: 'Bronx', priceMultiplier: 0.8, desirabilityScore: 7.0, safetyScore: 6.5, description: 'Urban neighborhoods' },
  { id: '5', city: 'New York', name: 'Staten Island', priceMultiplier: 0.8, desirabilityScore: 7.5, safetyScore: 8.0, description: 'Suburban' },
  { id: '6', city: 'New York', name: 'Hamptons', priceMultiplier: 3.5, desirabilityScore: 10.0, safetyScore: 9.5, description: 'Luxury coastal' },
  { id: '7', city: 'New York', name: 'Hoboken', priceMultiplier: 1.5, desirabilityScore: 8.5, safetyScore: 8.5, description: 'Urban transit' },
  { id: '8', city: 'New York', name: 'Westchester', priceMultiplier: 2.0, desirabilityScore: 9.0, safetyScore: 9.0, description: 'Upscale suburbs' },
];

export interface PropertyManager {
  state: PropertyManagerState;
  events: Partial<PropertyManagerEvents>;

  initialize: (playerId: string) => Promise<PropertyOperationResult>;
  dispose: () => void;

  getProperties: (
    filter?: PropertyFilter,
    sort?: PropertySortCriteria,
    page?: number,
    pageSize?: number
  ) => Promise<PropertyOperationResult<PropertySearchResult>>;

  getPropertyById: (propertyId: string) => Promise<PropertyOperationResult<PropertyData>>;

  getOwnedProperties: (playerId?: string) => Promise<PropertyOperationResult<PropertyData[]>>;

  purchaseProperty: (
    request: PropertyPurchaseRequest
  ) => Promise<PropertyOperationResult<PropertyOwner>>;

  sellProperty: (
    propertyId: string,
    salePrice: number
  ) => Promise<PropertyOperationResult<PropertyTransaction>>;

  setRentPrice: (
    propertyId: string,
    newRentPrice: number
  ) => Promise<PropertyOperationResult<PropertyData>>;

  collectRent: (propertyId: string) => Promise<PropertyOperationResult<RentCollectionResult>>;

  collectAllRent: () => Promise<PropertyOperationResult<RentCollectionResult[]>>;

  getPortfolio: (playerId?: string) => Promise<PropertyOperationResult<PortfolioSummary>>;

  getRentalHistory: (
    propertyId?: string,
    startDate?: string,
    endDate?: string
  ) => Promise<PropertyOperationResult<RentalIncome[]>>;

  getPropertyHistory: (propertyId: string) => Promise<PropertyOperationResult<PropertyHistory[]>>;

  getPropertyValuation: (propertyId: string) => Promise<PropertyOperationResult<PropertyValuation>>;

  addToWatchlist: (
    propertyId: string,
    notes?: string
  ) => Promise<PropertyOperationResult<PropertyWatchlist>>;

  removeFromWatchlist: (propertyId: string) => Promise<PropertyOperationResult>;

  getWatchlist: () => Promise<PropertyOperationResult<PropertyWatchlist[]>>;

  updateWatchlistNotes: (
    propertyId: string,
    notes: string
  ) => Promise<PropertyOperationResult<PropertyWatchlist>>;

  getNeighborhoods: (city?: string) => Promise<PropertyOperationResult<NeighborhoodData[]>>;

  getMarketData: (
    city: string,
    propertyType?: PropertyType
  ) => Promise<PropertyOperationResult<MarketData[]>>;

  searchByLocation: (
    latitude: number,
    longitude: number,
    radiusKm: number,
    filter?: PropertyFilter
  ) => Promise<PropertyOperationResult<PropertySearchResult>>;

  getRecommendedProperties: (
    budget: number,
    preferences?: Partial<PropertyFilter>
  ) => Promise<PropertyOperationResult<PropertyData[]>>;

  calculateROI: (propertyId: string) => Promise<PropertyOperationResult<number>>;

  estimateClosingCosts: (purchasePrice: number) => number;

  syncPortfolio: () => Promise<PropertyOperationResult>;
}

// Property Browser UI Types

export interface PropertyDetailsDisplay {
  title: string;
  propertyId: string;
  price: string;
  address: string;
  neighborhood: string;
  type: string;
  size: string;
  rooms: string;
  quality: string;
  baseRent: string;
  estimatedIncome: string;
}

export interface PropertyBrowserUIState {
  isLoading: boolean;
  currentProperty: PropertyData | null;
  displayedProperties: PropertyData[];
  selectedPropertyId: string | null;
  isDetailsPanelOpen: boolean;
  isPurchaseDialogOpen: boolean;
  isFilterPanelOpen: boolean;
  currentFilter: PropertyFilter;
  currentSort: PropertySortCriteria;
  currentPage: number;
  totalPages: number;
  totalResults: number;
  searchQuery: string;
  viewMode: PropertyViewMode;
  mapCenter: Coordinates | null;
  mapZoom: number;
}

export type PropertyViewMode = 'list' | 'grid' | 'map';

export interface PropertyBrowserUIEvents {
  onPropertySelected: (property: PropertyData) => void;
  onPropertyDeselected: () => void;
  onPurchaseClicked: (property: PropertyData) => void;
  onWatchlistClicked: (property: PropertyData) => void;
  onFilterChanged: (filter: PropertyFilter) => void;
  onSortChanged: (sort: PropertySortCriteria) => void;
  onPageChanged: (page: number) => void;
  onSearchQueryChanged: (query: string) => void;
  onViewModeChanged: (mode: PropertyViewMode) => void;
  onMapCenterChanged: (coordinates: Coordinates) => void;
  onMapZoomChanged: (zoom: number) => void;
  onRefresh: () => void;
  onError: (error: string) => void;
}

export interface PropertyBrowserUI {
  state: PropertyBrowserUIState;
  events: Partial<PropertyBrowserUIEvents>;

  initialize: () => Promise<void>;
  dispose: () => void;

  loadProperties: (filter?: PropertyFilter, sort?: PropertySortCriteria) => Promise<void>;
  loadMoreProperties: () => Promise<void>;
  refreshProperties: () => Promise<void>;

  selectProperty: (propertyId: string) => void;
  deselectProperty: () => void;
  showPropertyDetails: (property: PropertyData) => void;
  hidePropertyDetails: () => void;

  openPurchaseDialog: (property: PropertyData) => void;
  closePurchaseDialog: () => void;

  addToWatchlist: (propertyId: string) => Promise<void>;
  removeFromWatchlist: (propertyId: string) => Promise<void>;

  applyFilter: (filter: PropertyFilter) => void;
  clearFilter: () => void;
  toggleFilterPanel: () => void;

  setSort: (sort: PropertySortCriteria) => void;
  setViewMode: (mode: PropertyViewMode) => void;
  setSearchQuery: (query: string) => void;

  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;

  centerMapOnProperty: (property: PropertyData) => void;
  setMapZoom: (zoom: number) => void;
}

export interface PropertyCardProps {
  property: PropertyData;
  isSelected: boolean;
  isInWatchlist: boolean;
  onPress: () => void;
  onWatchlistPress: () => void;
  showQuickActions: boolean;
}

export interface PropertyDetailsPanelProps {
  property: PropertyData;
  isLoading: boolean;
  isPurchaseEnabled: boolean;
  isInWatchlist: boolean;
  onPurchasePress: () => void;
  onWatchlistPress: () => void;
  onClose: () => void;
}

export interface PropertyPurchaseDialogProps {
  property: PropertyData;
  purchaseRequest: PropertyPurchaseRequest;
  playerBalance: number;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface PropertyPurchaseDialogState {
  isVisible: boolean;
  isProcessing: boolean;
  currentProperty: PropertyData | null;
  purchaseRequest: PropertyPurchaseRequest | null;
  playerBalance: number;
  balanceAfterPurchase: number;
  canAfford: boolean;
  errorMessage: string | null;
}

export interface PropertyPurchaseDialogDisplay {
  propertyName: string;
  propertyId: string;
  purchasePrice: string;
  closingCosts: string;
  totalAmount: string;
  currentBalance: string;
  balanceAfterPurchase: string;
  isAffordable: boolean;
}

export interface PropertyPurchaseDialogEvents {
  onDialogOpened: (property: PropertyData) => void;
  onDialogClosed: () => void;
  onPurchaseConfirmed: (property: PropertyData, request: PropertyPurchaseRequest) => void;
  onPurchaseSuccess: (property: PropertyData, owner: PropertyOwner) => void;
  onPurchaseFailed: (error: string, errorCode?: PropertyErrorCode) => void;
  onBalanceUpdated: (newBalance: number) => void;
}

export interface PropertyPurchaseDialog {
  state: PropertyPurchaseDialogState;
  events: Partial<PropertyPurchaseDialogEvents>;

  showDialog: (property: PropertyData, playerBalance: number) => void;
  closeDialog: () => void;
  confirmPurchase: () => Promise<PropertyOperationResult<PropertyOwner>>;
  updatePlayerBalance: (balance: number) => void;
  getDisplayValues: () => PropertyPurchaseDialogDisplay;
  isConfirmEnabled: () => boolean;
}

export interface PurchaseConfirmationResult {
  success: boolean;
  property: PropertyData | null;
  owner: PropertyOwner | null;
  transaction: PropertyTransaction | null;
  error: string | null;
  errorCode: PropertyErrorCode | null;
}

export type PurchaseDialogStep = 'review' | 'confirming' | 'success' | 'error';

export interface PurchaseDialogStepState {
  currentStep: PurchaseDialogStep;
  property: PropertyData | null;
  purchaseRequest: PropertyPurchaseRequest | null;
  result: PurchaseConfirmationResult | null;
}

export function createEmptyPurchaseDialogState(): PropertyPurchaseDialogState {
  return {
    isVisible: false,
    isProcessing: false,
    currentProperty: null,
    purchaseRequest: null,
    playerBalance: 0,
    balanceAfterPurchase: 0,
    canAfford: false,
    errorMessage: null,
  };
}

export function createPurchaseDialogDisplay(
  property: PropertyData,
  request: PropertyPurchaseRequest,
  playerBalance: number
): PropertyPurchaseDialogDisplay {
  const balanceAfter = playerBalance - request.totalAmount;
  return {
    propertyName: `${formatPropertyType(property.propertyType)} - ${property.neighborhood}`,
    propertyId: property.propertyId,
    purchasePrice: formatCurrency(request.purchasePrice),
    closingCosts: formatCurrency(request.closingCosts),
    totalAmount: formatCurrency(request.totalAmount),
    currentBalance: formatCurrency(playerBalance),
    balanceAfterPurchase: formatCurrency(balanceAfter),
    isAffordable: balanceAfter >= 0,
  };
}

export function canConfirmPurchase(
  state: PropertyPurchaseDialogState
): boolean {
  return (
    state.currentProperty !== null &&
    state.purchaseRequest !== null &&
    state.canAfford &&
    !state.isProcessing &&
    state.errorMessage === null
  );
}

export interface PropertyFilterPanelProps {
  currentFilter: PropertyFilter;
  availableCities: string[];
  availableNeighborhoods: string[];
  priceRange: PriceRange;
  onFilterChange: (filter: PropertyFilter) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}

export interface PropertyMapMarkerProps {
  marker: PropertyMarkerData;
  isSelected: boolean;
  onPress: () => void;
}

export interface PropertyListHeaderProps {
  totalResults: number;
  currentSort: PropertySortCriteria;
  viewMode: PropertyViewMode;
  onSortChange: (sort: PropertySortCriteria) => void;
  onViewModeChange: (mode: PropertyViewMode) => void;
}

export function formatPropertyDetails(property: PropertyData): PropertyDetailsDisplay {
  const monthlyIncome = calculateMonthlyIncome(property.currentRentPrice, property.baseRentPrice);
  
  return {
    title: `${formatPropertyType(property.propertyType)} - ${property.neighborhood}`,
    propertyId: property.propertyId,
    price: formatCurrency(property.purchasePrice),
    address: property.address || 'Address not available',
    neighborhood: property.neighborhood || 'Unknown',
    type: formatPropertyType(property.propertyType),
    size: `${property.squareFootage.toLocaleString()} sqft`,
    rooms: `${property.bedrooms} bedrooms • ${property.bathrooms} bathrooms`,
    quality: `${property.propertyQuality}/10`,
    baseRent: `${formatCurrency(property.baseRentPrice)}/month`,
    estimatedIncome: `${formatCurrency(monthlyIncome)}/month`,
  };
}

export function formatPropertyType(type: PropertyType): string {
  switch (type) {
    case 'apartment': return 'Apartment';
    case 'house': return 'House';
    case 'mansion': return 'Mansion';
    case 'beach_house': return 'Beach House';
    default: return 'Unknown';
  }
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function createEmptyPropertyBrowserUIState(): PropertyBrowserUIState {
  return {
    isLoading: false,
    currentProperty: null,
    displayedProperties: [],
    selectedPropertyId: null,
    isDetailsPanelOpen: false,
    isPurchaseDialogOpen: false,
    isFilterPanelOpen: false,
    currentFilter: {},
    currentSort: { sortOption: 'newest_first', ascending: false },
    currentPage: 1,
    totalPages: 1,
    totalResults: 0,
    searchQuery: '',
    viewMode: 'list',
    mapCenter: null,
    mapZoom: 12,
  };
}

export function isPropertyAffordable(property: PropertyData, playerBalance: number): boolean {
  const totalCost = property.purchasePrice * 1.02; // Including 2% closing costs
  return playerBalance >= totalCost;
}

export function getPropertyStatusLabel(status: PropertyStatus): string {
  switch (status) {
    case 'available': return 'Available';
    case 'sold': return 'Sold';
    case 'owned': return 'Owned';
    case 'rented': return 'Rented';
    default: return 'Unknown';
  }
}

export function getPropertyStatusColor(status: PropertyStatus): string {
  switch (status) {
    case 'available': return '#22C55E';
    case 'sold': return '#EF4444';
    case 'owned': return '#3B82F6';
    case 'rented': return '#F59E0B';
    default: return '#6B7280';
  }
}

// Rental Manager Types

export interface PropertyRentalInfo {
  propertyId: string;
  baseRent: number;
  currentRent: number;
  occupancyRate: number;
  monthlyIncome: number;
}

export interface RentalManagerState {
  isLoading: boolean;
  isInitialized: boolean;
  propertyRentals: Record<string, PropertyRentalInfo>;
  lastCollectionDate: string | null;
  totalMonthlyIncome: number;
}

export interface RentalManagerEvents {
  onRentSet: (propertyId: string, newRent: number, occupancyRate: number) => void;
  onRentCollected: (totalIncome: number, results: RentCollectionResult[]) => void;
  onRentalInfoUpdated: (propertyId: string, info: PropertyRentalInfo) => void;
  onError: (error: string, errorCode?: PropertyErrorCode) => void;
}

export interface RentalManager {
  state: RentalManagerState;
  events: Partial<RentalManagerEvents>;

  initialize: (playerId: string) => Promise<PropertyOperationResult>;
  dispose: () => void;

  setRentPrice: (
    propertyId: string,
    newRentPrice: number
  ) => Promise<PropertyOperationResult<PropertyRentalInfo>>;

  collectMonthlyRent: () => Promise<PropertyOperationResult<RentalCollectionSummaryData>>;

  getPropertyRentalHistory: (
    propertyId: string
  ) => Promise<PropertyOperationResult<RentalIncome[]>>;

  getRentalInfo: (propertyId: string) => PropertyRentalInfo | null;

  calculateOccupancyRate: (setRent: number, baseRent: number) => number;

  getProjectedMonthlyIncome: (
    propertyId: string,
    rentPrice: number,
    baseRent: number
  ) => number;

  validateRentPrice: (
    propertyId: string,
    newRent: number
  ) => Promise<PropertyOperationResult<RentValidationResult>>;

  getAllRentalInfo: () => Promise<PropertyOperationResult<PropertyRentalInfo[]>>;
}

export interface RentValidationResult {
  isValid: boolean;
  minRent: number;
  maxRent: number;
  suggestedRent: number;
  errorMessage: string | null;
}

export function createEmptyRentalManagerState(): RentalManagerState {
  return {
    isLoading: false,
    isInitialized: false,
    propertyRentals: {},
    lastCollectionDate: null,
    totalMonthlyIncome: 0,
  };
}

export function calculateRentBounds(
  baseRent: number,
  minMultiplier: number = 0.5,
  maxMultiplier: number = 2.0
): { minRent: number; maxRent: number } {
  return {
    minRent: baseRent * minMultiplier,
    maxRent: baseRent * maxMultiplier,
  };
}

export function isRentPriceValid(
  rentPrice: number,
  baseRent: number,
  minMultiplier: number = 0.5,
  maxMultiplier: number = 2.0
): boolean {
  const { minRent, maxRent } = calculateRentBounds(baseRent, minMultiplier, maxMultiplier);
  return rentPrice >= minRent && rentPrice <= maxRent;
}

// Set Rent Dialog Types

export interface SetRentDialogState {
  isVisible: boolean;
  isProcessing: boolean;
  currentProperty: PropertyData | null;
  selectedRent: number;
  projectedOccupancy: number;
  projectedIncome: number;
  minRent: number;
  maxRent: number;
  errorMessage: string | null;
}

export interface SetRentDialogDisplay {
  propertyName: string;
  propertyId: string;
  baseRent: string;
  currentRent: string;
  selectedRent: string;
  minRent: string;
  maxRent: string;
  projectedOccupancy: string;
  projectedIncome: string;
  rentDifferencePercent: string;
  isAboveMarket: boolean;
}

export interface SetRentDialogEvents {
  onDialogOpened: (property: PropertyData) => void;
  onDialogClosed: () => void;
  onRentChanged: (newRent: number) => void;
  onRentApplied: (propertyId: string, newRent: number) => void;
  onRentApplySuccess: (propertyId: string, newRent: number, occupancyRate: number) => void;
  onRentApplyFailed: (error: string, errorCode?: PropertyErrorCode) => void;
}

export interface SetRentDialog {
  state: SetRentDialogState;
  events: Partial<SetRentDialogEvents>;

  showDialog: (property: PropertyData) => void;
  closeDialog: () => void;
  setRentPrice: (rentPrice: number) => void;
  applyRentPrice: () => Promise<PropertyOperationResult<PropertyRentalInfo>>;
  getDisplayValues: () => SetRentDialogDisplay;
  isApplyEnabled: () => boolean;
  getOccupancyGraphData: () => OccupancyGraphPoint[];
}

export interface OccupancyGraphPoint {
  rentMultiplier: number;
  occupancyRate: number;
  rentAmount: number;
  projectedIncome: number;
  isSelected: boolean;
}

export function createEmptySetRentDialogState(): SetRentDialogState {
  return {
    isVisible: false,
    isProcessing: false,
    currentProperty: null,
    selectedRent: 0,
    projectedOccupancy: 100,
    projectedIncome: 0,
    minRent: 0,
    maxRent: 0,
    errorMessage: null,
  };
}

export function createSetRentDialogDisplay(
  property: PropertyData,
  selectedRent: number,
  projectedOccupancy: number,
  projectedIncome: number
): SetRentDialogDisplay {
  const { minRent, maxRent } = calculateRentBounds(property.baseRentPrice);
  const rentDiff = ((selectedRent - property.baseRentPrice) / property.baseRentPrice) * 100;

  return {
    propertyName: `${formatPropertyType(property.propertyType)} - ${property.neighborhood}`,
    propertyId: property.propertyId,
    baseRent: formatCurrency(property.baseRentPrice),
    currentRent: formatCurrency(property.currentRentPrice),
    selectedRent: formatCurrency(selectedRent),
    minRent: formatCurrency(minRent),
    maxRent: formatCurrency(maxRent),
    projectedOccupancy: `${projectedOccupancy.toFixed(0)}%`,
    projectedIncome: formatCurrency(projectedIncome),
    rentDifferencePercent: `${rentDiff >= 0 ? '+' : ''}${rentDiff.toFixed(1)}%`,
    isAboveMarket: selectedRent > property.baseRentPrice,
  };
}

export function generateOccupancyGraphData(
  baseRent: number,
  selectedRent: number,
  steps: number = 11
): OccupancyGraphPoint[] {
  const points: OccupancyGraphPoint[] = [];
  const minMultiplier = 0.5;
  const maxMultiplier = 2.0;
  const stepSize = (maxMultiplier - minMultiplier) / (steps - 1);

  for (let i = 0; i < steps; i++) {
    const multiplier = minMultiplier + i * stepSize;
    const rentAmount = baseRent * multiplier;
    const occupancy = calculateOccupancyRate(rentAmount, baseRent);
    const income = rentAmount * (occupancy / 100);

    points.push({
      rentMultiplier: multiplier,
      occupancyRate: occupancy,
      rentAmount,
      projectedIncome: income,
      isSelected: Math.abs(rentAmount - selectedRent) < baseRent * 0.05,
    });
  }

  return points;
}

export function canApplyRent(state: SetRentDialogState): boolean {
  return (
    state.currentProperty !== null &&
    state.selectedRent >= state.minRent &&
    state.selectedRent <= state.maxRent &&
    !state.isProcessing &&
    state.errorMessage === null
  );
}

// Rental Collection Summary Types

export interface RentalCollectionSummaryData {
  totalIncome: number;
  propertiesCount: number;
  averageIncomePerProperty: number;
  collectionDate: string;
  results: RentCollectionResult[];
  highestEarningProperty: RentCollectionResult | null;
  lowestEarningProperty: RentCollectionResult | null;
  totalOccupancyRate: number;
}

export interface RentalCollectionSummaryDisplay {
  totalIncome: string;
  propertiesCount: string;
  averageIncome: string;
  collectionDate: string;
  highestEarner: string | null;
  lowestEarner: string | null;
  averageOccupancy: string;
}

export interface RentalCollectionSummaryState {
  isVisible: boolean;
  summaryData: RentalCollectionSummaryData | null;
}

export interface RentalCollectionSummaryEvents {
  onSummaryShown: (data: RentalCollectionSummaryData) => void;
  onSummaryClosed: () => void;
  onPropertySelected: (propertyId: string) => void;
}

export interface RentalCollectionSummary {
  state: RentalCollectionSummaryState;
  events: Partial<RentalCollectionSummaryEvents>;

  showSummary: (data: RentalCollectionSummaryData) => void;
  closeSummary: () => void;
  getDisplayValues: () => RentalCollectionSummaryDisplay | null;
  getResultsSortedByIncome: (ascending?: boolean) => RentCollectionResult[];
}

export function createEmptyRentalCollectionSummaryState(): RentalCollectionSummaryState {
  return {
    isVisible: false,
    summaryData: null,
  };
}

export function createRentalCollectionSummaryData(
  results: RentCollectionResult[]
): RentalCollectionSummaryData {
  const totalIncome = results.reduce((sum, r) => sum + r.collectedAmount, 0);
  const propertiesCount = results.length;
  const averageIncomePerProperty = propertiesCount > 0 ? totalIncome / propertiesCount : 0;
  const totalOccupancy = results.reduce((sum, r) => sum + r.occupancyRate, 0);
  const avgOccupancy = propertiesCount > 0 ? totalOccupancy / propertiesCount : 0;

  const sortedByIncome = [...results].sort((a, b) => b.collectedAmount - a.collectedAmount);

  return {
    totalIncome,
    propertiesCount,
    averageIncomePerProperty,
    collectionDate: new Date().toISOString(),
    results,
    highestEarningProperty: sortedByIncome[0] || null,
    lowestEarningProperty: sortedByIncome[sortedByIncome.length - 1] || null,
    totalOccupancyRate: avgOccupancy,
  };
}

export function createRentalCollectionSummaryDisplay(
  data: RentalCollectionSummaryData
): RentalCollectionSummaryDisplay {
  return {
    totalIncome: formatCurrency(data.totalIncome),
    propertiesCount: `${data.propertiesCount} properties`,
    averageIncome: `${formatCurrency(data.averageIncomePerProperty)} avg/property`,
    collectionDate: new Date(data.collectionDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    highestEarner: data.highestEarningProperty
      ? `${data.highestEarningProperty.propertyId}: ${formatCurrency(data.highestEarningProperty.collectedAmount)}`
      : null,
    lowestEarner: data.lowestEarningProperty
      ? `${data.lowestEarningProperty.propertyId}: ${formatCurrency(data.lowestEarningProperty.collectedAmount)}`
      : null,
    averageOccupancy: `${data.totalOccupancyRate.toFixed(1)}%`,
  };
}

// Rental Income Period Types

export interface RentalPeriod {
  month: number;
  year: number;
}

export interface RentalIncomeByPeriod {
  period: RentalPeriod;
  periodName: string;
  totalIncome: number;
  propertiesCount: number;
  incomeByProperty: Record<string, RentalIncome>;
}

export function getRentalPeriodName(period: RentalPeriod): string {
  const date = new Date(period.year, period.month - 1, 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

export function getCurrentRentalPeriod(): RentalPeriod {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function groupRentalIncomeByPeriod(
  incomes: RentalIncome[]
): RentalIncomeByPeriod[] {
  const periodMap = new Map<string, RentalIncomeByPeriod>();

  for (const income of incomes) {
    const key = `${income.year}-${income.month}`;
    const period: RentalPeriod = { month: income.month, year: income.year };

    if (!periodMap.has(key)) {
      periodMap.set(key, {
        period,
        periodName: getRentalPeriodName(period),
        totalIncome: 0,
        propertiesCount: 0,
        incomeByProperty: {},
      });
    }

    const periodData = periodMap.get(key)!;
    periodData.totalIncome += income.collectedAmount;
    periodData.propertiesCount += 1;
    periodData.incomeByProperty[income.propertyId] = income;
  }

  return Array.from(periodMap.values()).sort((a, b) => {
    if (a.period.year !== b.period.year) return b.period.year - a.period.year;
    return b.period.month - a.period.month;
  });
}

// Portfolio Manager UI Types

export type PortfolioSortOption = 
  | 'value_high_to_low'
  | 'value_low_to_high'
  | 'income_high_to_low'
  | 'income_low_to_high'
  | 'roi_high_to_low'
  | 'roi_low_to_high'
  | 'newest_first'
  | 'oldest_first';

export interface PortfolioManagerUIState {
  isLoading: boolean;
  isRefreshing: boolean;
  isInitialized: boolean;
  ownedProperties: PropertyData[];
  propertyOwners: Record<string, PropertyOwner>;
  portfolioSummary: PortfolioSummary;
  selectedPropertyId: string | null;
  currentSort: PortfolioSortOption;
  isCollectingRent: boolean;
  isDetailsPanelOpen: boolean;
  isSetRentDialogOpen: boolean;
  lastRefreshTime: string | null;
  errorMessage: string | null;
}

export interface PortfolioManagerUIEvents {
  onPropertySelected: (property: PropertyData) => void;
  onPropertyDeselected: () => void;
  onEditRentClicked: (property: PropertyData) => void;
  onViewPropertyClicked: (property: PropertyData) => void;
  onCollectRentClicked: () => void;
  onRentCollected: (totalIncome: number, summary: RentalCollectionSummaryData) => void;
  onSortChanged: (sort: PortfolioSortOption) => void;
  onRefresh: () => void;
  onPortfolioUpdated: (summary: PortfolioSummary) => void;
  onError: (error: string, errorCode?: PropertyErrorCode) => void;
}

export interface PortfolioManagerUI {
  state: PortfolioManagerUIState;
  events: Partial<PortfolioManagerUIEvents>;

  initialize: (playerId: string) => Promise<PropertyOperationResult>;
  dispose: () => void;

  loadPortfolio: () => Promise<PropertyOperationResult<PortfolioSummary>>;
  refreshPortfolio: () => Promise<PropertyOperationResult<PortfolioSummary>>;

  selectProperty: (propertyId: string) => void;
  deselectProperty: () => void;

  openPropertyDetails: (property: PropertyData) => void;
  closePropertyDetails: () => void;

  openSetRentDialog: (property: PropertyData) => void;
  closeSetRentDialog: () => void;

  collectAllRent: () => Promise<PropertyOperationResult<RentalCollectionSummaryData>>;

  setSort: (sort: PortfolioSortOption) => void;
  getSortedProperties: () => PropertyData[];

  getPropertyOwner: (propertyId: string) => PropertyOwner | null;
  getPropertyROI: (propertyId: string) => number;
  getPropertyMonthlyIncome: (propertyId: string) => number;

  getTypeBreakdown: () => PortfolioTypeBreakdown[];
  getTotalValue: () => number;
  getTotalMonthlyIncome: () => number;
  getAverageROI: () => number;
}

export interface PortfolioPropertyItemData {
  property: PropertyData;
  owner: PropertyOwner;
  monthlyIncome: number;
  annualIncome: number;
  roi: number;
  occupancyRate: number;
  purchaseDateFormatted: string;
  monthsOwned: number;
  totalIncomeCollected: number;
}

export interface PortfolioPropertyItemDisplay {
  propertyName: string;
  propertyId: string;
  address: string;
  purchasePrice: string;
  currentRent: string;
  monthlyIncome: string;
  roi: string;
  purchaseDate: string;
  propertyType: string;
  quality: string;
  occupancyRate: string;
}

export interface PortfolioPropertyItemProps {
  itemData: PortfolioPropertyItemData;
  isSelected: boolean;
  onEditRentPress: () => void;
  onViewPress: () => void;
  onPress: () => void;
}

export interface PortfolioPropertyItemEvents {
  onEditRent: (property: PropertyData) => void;
  onView: (property: PropertyData) => void;
  onClick: (property: PropertyData) => void;
}

export interface PortfolioTypeBreakdown {
  propertyType: PropertyType;
  count: number;
  totalValue: number;
  totalMonthlyIncome: number;
  averageROI: number;
  percentageOfPortfolio: number;
  iconColor: string;
}

export interface PortfolioTypeItemDisplay {
  typeName: string;
  count: string;
  value: string;
  income: string;
  percentage: string;
  iconColor: string;
}

export interface PortfolioTypeItemProps {
  breakdown: PortfolioTypeBreakdown;
  onPress?: () => void;
}

export interface PortfolioSummaryDisplay {
  totalProperties: string;
  totalValue: string;
  monthlyIncome: string;
  annualIncome: string;
  averageROI: string;
  valueChangePercent: string;
  isValueUp: boolean;
}

export interface PortfolioChartData {
  labels: string[];
  values: number[];
  colors: string[];
}

export interface PortfolioIncomeHistory {
  periods: RentalIncomeByPeriod[];
  totalIncome: number;
  averageMonthlyIncome: number;
  incomeGrowthPercent: number;
}

export function createEmptyPortfolioManagerUIState(): PortfolioManagerUIState {
  return {
    isLoading: false,
    isRefreshing: false,
    isInitialized: false,
    ownedProperties: [],
    propertyOwners: {},
    portfolioSummary: createEmptyPortfolioSummary(),
    selectedPropertyId: null,
    currentSort: 'value_high_to_low',
    isCollectingRent: false,
    isDetailsPanelOpen: false,
    isSetRentDialogOpen: false,
    lastRefreshTime: null,
    errorMessage: null,
  };
}

export function createPortfolioPropertyItemData(
  property: PropertyData,
  owner: PropertyOwner
): PortfolioPropertyItemData {
  const monthlyIncome = calculateMonthlyIncome(property.currentRentPrice, property.baseRentPrice);
  const annualIncome = monthlyIncome * 12;
  const roi = owner.purchasePrice > 0 ? (annualIncome / owner.purchasePrice) * 100 : 0;
  const occupancyRate = calculateOccupancyRate(property.currentRentPrice, property.baseRentPrice);
  const purchaseDate = new Date(owner.purchaseDate);
  const now = new Date();
  const monthsOwned = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const totalIncomeCollected = owner.monthlyIncome * monthsOwned;

  return {
    property,
    owner,
    monthlyIncome,
    annualIncome,
    roi,
    occupancyRate,
    purchaseDateFormatted: purchaseDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    monthsOwned,
    totalIncomeCollected,
  };
}

export function createPortfolioPropertyItemDisplay(
  itemData: PortfolioPropertyItemData
): PortfolioPropertyItemDisplay {
  return {
    propertyName: `${formatPropertyType(itemData.property.propertyType)} - ${itemData.property.neighborhood}`,
    propertyId: itemData.property.propertyId,
    address: itemData.property.address || 'Address not available',
    purchasePrice: formatCurrency(itemData.owner.purchasePrice),
    currentRent: formatCurrency(itemData.property.currentRentPrice),
    monthlyIncome: formatCurrency(itemData.monthlyIncome),
    roi: `${itemData.roi.toFixed(2)}%`,
    purchaseDate: itemData.purchaseDateFormatted,
    propertyType: formatPropertyType(itemData.property.propertyType),
    quality: `${itemData.property.propertyQuality}/10`,
    occupancyRate: `${itemData.occupancyRate.toFixed(0)}%`,
  };
}

export function createPortfolioTypeBreakdown(
  propertyType: PropertyType,
  properties: PropertyData[],
  owners: Record<string, PropertyOwner>,
  totalPortfolioValue: number
): PortfolioTypeBreakdown {
  const typeProperties = properties.filter(p => p.propertyType === propertyType);
  const count = typeProperties.length;
  
  let totalValue = 0;
  let totalMonthlyIncome = 0;
  let totalROI = 0;

  for (const property of typeProperties) {
    const owner = owners[property.propertyId];
    if (owner) {
      totalValue += owner.purchasePrice;
      const monthlyIncome = calculateMonthlyIncome(property.currentRentPrice, property.baseRentPrice);
      totalMonthlyIncome += monthlyIncome;
      const annualIncome = monthlyIncome * 12;
      const roi = owner.purchasePrice > 0 ? (annualIncome / owner.purchasePrice) * 100 : 0;
      totalROI += roi;
    }
  }

  const averageROI = count > 0 ? totalROI / count : 0;
  const percentageOfPortfolio = totalPortfolioValue > 0 ? (totalValue / totalPortfolioValue) * 100 : 0;

  return {
    propertyType,
    count,
    totalValue,
    totalMonthlyIncome,
    averageROI,
    percentageOfPortfolio,
    iconColor: getPropertyTypeColor(propertyType),
  };
}

export function createPortfolioTypeItemDisplay(
  breakdown: PortfolioTypeBreakdown
): PortfolioTypeItemDisplay {
  return {
    typeName: formatPropertyType(breakdown.propertyType),
    count: `${breakdown.count}`,
    value: formatCurrency(breakdown.totalValue),
    income: `${formatCurrency(breakdown.totalMonthlyIncome)}/mo`,
    percentage: `${breakdown.percentageOfPortfolio.toFixed(1)}%`,
    iconColor: breakdown.iconColor,
  };
}

export function createPortfolioSummaryDisplay(
  summary: PortfolioSummary,
  previousValue?: number
): PortfolioSummaryDisplay {
  const valueChange = previousValue ? ((summary.totalValue - previousValue) / previousValue) * 100 : 0;

  return {
    totalProperties: `${summary.totalProperties}`,
    totalValue: formatCurrency(summary.totalValue),
    monthlyIncome: formatCurrency(summary.monthlyIncome),
    annualIncome: formatCurrency(summary.annualIncome),
    averageROI: `${summary.averageROI.toFixed(2)}%`,
    valueChangePercent: `${valueChange >= 0 ? '+' : ''}${valueChange.toFixed(1)}%`,
    isValueUp: valueChange >= 0,
  };
}

export function sortPortfolioProperties(
  properties: PropertyData[],
  owners: Record<string, PropertyOwner>,
  sortOption: PortfolioSortOption
): PropertyData[] {
  const getOwner = (p: PropertyData) => owners[p.propertyId];
  const getMonthlyIncome = (p: PropertyData) => calculateMonthlyIncome(p.currentRentPrice, p.baseRentPrice);
  const getROI = (p: PropertyData) => {
    const owner = getOwner(p);
    if (!owner || owner.purchasePrice === 0) return 0;
    const annualIncome = getMonthlyIncome(p) * 12;
    return (annualIncome / owner.purchasePrice) * 100;
  };

  return [...properties].sort((a, b) => {
    const ownerA = getOwner(a);
    const ownerB = getOwner(b);

    switch (sortOption) {
      case 'value_high_to_low':
        return (ownerB?.purchasePrice || 0) - (ownerA?.purchasePrice || 0);
      case 'value_low_to_high':
        return (ownerA?.purchasePrice || 0) - (ownerB?.purchasePrice || 0);
      case 'income_high_to_low':
        return getMonthlyIncome(b) - getMonthlyIncome(a);
      case 'income_low_to_high':
        return getMonthlyIncome(a) - getMonthlyIncome(b);
      case 'roi_high_to_low':
        return getROI(b) - getROI(a);
      case 'roi_low_to_high':
        return getROI(a) - getROI(b);
      case 'newest_first':
        return new Date(ownerB?.purchaseDate || 0).getTime() - new Date(ownerA?.purchaseDate || 0).getTime();
      case 'oldest_first':
        return new Date(ownerA?.purchaseDate || 0).getTime() - new Date(ownerB?.purchaseDate || 0).getTime();
      default:
        return 0;
    }
  });
}

export function createPortfolioChartData(
  summary: PortfolioSummary
): PortfolioChartData {
  const types: PropertyType[] = ['apartment', 'house', 'mansion', 'beach_house'];
  const labels: string[] = [];
  const values: number[] = [];
  const colors: string[] = [];

  for (const type of types) {
    if (summary.propertiesByType[type] > 0) {
      labels.push(formatPropertyType(type));
      values.push(summary.valueByType[type]);
      colors.push(getPropertyTypeColor(type));
    }
  }

  return { labels, values, colors };
}

export function calculatePortfolioMetrics(
  properties: PropertyData[],
  owners: Record<string, PropertyOwner>
): {
  totalValue: number;
  totalMonthlyIncome: number;
  averageROI: number;
  totalAnnualIncome: number;
} {
  let totalValue = 0;
  let totalMonthlyIncome = 0;
  let totalROI = 0;
  let propertyCount = 0;

  for (const property of properties) {
    const owner = owners[property.propertyId];
    if (owner) {
      totalValue += owner.purchasePrice;
      const monthlyIncome = calculateMonthlyIncome(property.currentRentPrice, property.baseRentPrice);
      totalMonthlyIncome += monthlyIncome;
      const annualIncome = monthlyIncome * 12;
      const roi = owner.purchasePrice > 0 ? (annualIncome / owner.purchasePrice) * 100 : 0;
      totalROI += roi;
      propertyCount++;
    }
  }

  return {
    totalValue,
    totalMonthlyIncome,
    averageROI: propertyCount > 0 ? totalROI / propertyCount : 0,
    totalAnnualIncome: totalMonthlyIncome * 12,
  };
}

export function getPortfolioSortOptionLabel(option: PortfolioSortOption): string {
  switch (option) {
    case 'value_high_to_low': return 'Value: High to Low';
    case 'value_low_to_high': return 'Value: Low to High';
    case 'income_high_to_low': return 'Income: High to Low';
    case 'income_low_to_high': return 'Income: Low to High';
    case 'roi_high_to_low': return 'ROI: High to Low';
    case 'roi_low_to_high': return 'ROI: Low to High';
    case 'newest_first': return 'Newest First';
    case 'oldest_first': return 'Oldest First';
    default: return 'Sort';
  }
}

export const PORTFOLIO_SORT_OPTIONS: { value: PortfolioSortOption; label: string }[] = [
  { value: 'value_high_to_low', label: 'Value: High to Low' },
  { value: 'value_low_to_high', label: 'Value: Low to High' },
  { value: 'income_high_to_low', label: 'Income: High to Low' },
  { value: 'income_low_to_high', label: 'Income: Low to High' },
  { value: 'roi_high_to_low', label: 'ROI: High to Low' },
  { value: 'roi_low_to_high', label: 'ROI: Low to High' },
  { value: 'newest_first', label: 'Newest First' },
  { value: 'oldest_first', label: 'Oldest First' },
];

// Property Pricing System Types

export type CityCode = 'LA' | 'MI' | 'NY' | 'XX';
export type PropertyTypeCode = 'APT' | 'HSE' | 'MNS' | 'BCH' | 'UNK';

export interface PropertyIdComponents {
  cityCode: CityCode;
  typeCode: PropertyTypeCode;
  neighborhoodCode: string;
  sequenceNumber: number;
}

export interface PropertyPriceFactors {
  basePrice: number;
  neighborhoodMultiplier: number;
  qualityMultiplier: number;
  sizeMultiplier: number;
  marketConditionMultiplier: number;
  seasonalMultiplier: number;
}

export interface PropertyPriceCalculation {
  propertyId: string;
  basePrice: number;
  factors: PropertyPriceFactors;
  calculatedPrice: number;
  suggestedRent: number;
  pricePerSqFt: number;
  calculatedAt: string;
}

export interface MarketCondition {
  city: string;
  propertyType: PropertyType;
  demandLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  supplyLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  marketMultiplier: number;
  trend: 'declining' | 'stable' | 'rising';
  trendStrength: number;
  lastUpdated: string;
}

export interface SeasonalFactor {
  month: number;
  seasonName: string;
  priceMultiplier: number;
  demandMultiplier: number;
  description: string;
}

export interface PropertyPricingConfig {
  basePrices: Record<PropertyType, PriceRange>;
  qualityMultipliers: Record<number, number>;
  sizeMultipliers: { minSqFt: number; maxSqFt: number; multiplier: number }[];
  seasonalFactors: SeasonalFactor[];
  rentToValueRatio: number;
}

export interface PropertyPricingSystemState {
  isInitialized: boolean;
  config: PropertyPricingConfig | null;
  marketConditions: Record<string, MarketCondition>;
  lastPriceUpdate: string | null;
}

export interface PropertyPricingSystemEvents {
  onPriceCalculated: (calculation: PropertyPriceCalculation) => void;
  onMarketConditionUpdated: (condition: MarketCondition) => void;
  onConfigUpdated: (config: PropertyPricingConfig) => void;
  onError: (error: string) => void;
}

export interface PropertyPricingSystem {
  state: PropertyPricingSystemState;
  events: Partial<PropertyPricingSystemEvents>;

  initialize: (config?: Partial<PropertyPricingConfig>) => Promise<PropertyOperationResult>;
  dispose: () => void;

  generatePropertyId: (
    city: string,
    propertyType: PropertyType,
    neighborhood: string
  ) => string;

  calculatePrice: (
    propertyType: PropertyType,
    city: string,
    neighborhood: string,
    squareFootage: number,
    quality: number
  ) => PropertyPriceCalculation;

  calculateRentPrice: (
    purchasePrice: number,
    propertyType: PropertyType,
    quality: number
  ) => number;

  getMarketCondition: (
    city: string,
    propertyType?: PropertyType
  ) => Promise<PropertyOperationResult<MarketCondition>>;

  updateMarketCondition: (
    condition: MarketCondition
  ) => Promise<PropertyOperationResult>;

  getSeasonalFactor: (month?: number) => SeasonalFactor;

  getPriceHistory: (
    propertyId: string,
    startDate?: string,
    endDate?: string
  ) => Promise<PropertyOperationResult<PropertyPriceHistory[]>>;

  estimateAppreciation: (
    propertyId: string,
    months: number
  ) => Promise<PropertyOperationResult<PropertyAppreciationEstimate>>;

  comparePrices: (
    propertyIds: string[]
  ) => Promise<PropertyOperationResult<PropertyPriceComparison>>;

  getCityCode: (city: string) => CityCode;
  getPropertyTypeCode: (type: PropertyType) => PropertyTypeCode;
  getNeighborhoodCode: (neighborhood: string) => string;
  parsePropertyId: (propertyId: string) => PropertyIdComponents | null;
}

export interface PropertyPriceHistory {
  id: string;
  propertyId: string;
  price: number;
  pricePerSqFt: number;
  recordedAt: string;
  source: 'calculation' | 'sale' | 'appraisal' | 'market_update';
  factors: Partial<PropertyPriceFactors>;
}

export interface PropertyAppreciationEstimate {
  propertyId: string;
  currentValue: number;
  estimatedFutureValue: number;
  appreciationAmount: number;
  appreciationPercent: number;
  monthsProjected: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  factors: string[];
}

export interface PropertyPriceComparison {
  properties: PropertyPriceComparisonItem[];
  averagePrice: number;
  medianPrice: number;
  priceRange: PriceRange;
  averagePricePerSqFt: number;
  bestValue: PropertyPriceComparisonItem | null;
  highestQuality: PropertyPriceComparisonItem | null;
}

export interface PropertyPriceComparisonItem {
  propertyId: string;
  city: string;
  neighborhood: string;
  propertyType: PropertyType;
  price: number;
  pricePerSqFt: number;
  quality: number;
  squareFootage: number;
  valueScore: number;
}

export const CITY_CODES: Record<string, CityCode> = {
  'Los Angeles': 'LA',
  'Miami': 'MI',
  'New York': 'NY',
};

export const PROPERTY_TYPE_CODES: Record<PropertyType, PropertyTypeCode> = {
  'apartment': 'APT',
  'house': 'HSE',
  'mansion': 'MNS',
  'beach_house': 'BCH',
};

export const DEFAULT_QUALITY_MULTIPLIERS: Record<number, number> = {
  1: 0.70,
  2: 0.75,
  3: 0.80,
  4: 0.85,
  5: 0.90,
  6: 0.95,
  7: 1.00,
  8: 1.10,
  9: 1.25,
  10: 1.50,
};

export const DEFAULT_SEASONAL_FACTORS: SeasonalFactor[] = [
  { month: 1, seasonName: 'Winter', priceMultiplier: 0.95, demandMultiplier: 0.85, description: 'Low demand period' },
  { month: 2, seasonName: 'Winter', priceMultiplier: 0.95, demandMultiplier: 0.85, description: 'Low demand period' },
  { month: 3, seasonName: 'Spring', priceMultiplier: 1.00, demandMultiplier: 0.95, description: 'Market warming up' },
  { month: 4, seasonName: 'Spring', priceMultiplier: 1.05, demandMultiplier: 1.05, description: 'Peak buying season starts' },
  { month: 5, seasonName: 'Spring', priceMultiplier: 1.10, demandMultiplier: 1.15, description: 'High demand period' },
  { month: 6, seasonName: 'Summer', priceMultiplier: 1.10, demandMultiplier: 1.20, description: 'Peak season' },
  { month: 7, seasonName: 'Summer', priceMultiplier: 1.08, demandMultiplier: 1.15, description: 'Peak season continues' },
  { month: 8, seasonName: 'Summer', priceMultiplier: 1.05, demandMultiplier: 1.10, description: 'Peak season winding down' },
  { month: 9, seasonName: 'Fall', priceMultiplier: 1.02, demandMultiplier: 1.00, description: 'Market stabilizing' },
  { month: 10, seasonName: 'Fall', priceMultiplier: 1.00, demandMultiplier: 0.95, description: 'Moderate demand' },
  { month: 11, seasonName: 'Fall', priceMultiplier: 0.98, demandMultiplier: 0.90, description: 'Demand decreasing' },
  { month: 12, seasonName: 'Winter', priceMultiplier: 0.95, demandMultiplier: 0.80, description: 'Holiday slowdown' },
];

export const DEFAULT_RENT_TO_VALUE_RATIO = 0.008;

export function getCityCodeFromName(city: string): CityCode {
  return CITY_CODES[city] || 'XX';
}

export function getPropertyTypeCodeFromType(type: PropertyType): PropertyTypeCode {
  return PROPERTY_TYPE_CODES[type] || 'UNK';
}

export function getNeighborhoodCodeFromName(neighborhood: string): string {
  if (!neighborhood) return 'UNKN';
  const cleaned = neighborhood.replace(/\s+/g, '').toUpperCase();
  return cleaned.length >= 4 ? cleaned.substring(0, 4) : cleaned.padEnd(4, 'X');
}

export function generatePropertyIdString(
  city: string,
  propertyType: PropertyType,
  neighborhood: string,
  sequenceNumber?: number
): string {
  const cityCode = getCityCodeFromName(city);
  const typeCode = getPropertyTypeCodeFromType(propertyType);
  const neighborhoodCode = getNeighborhoodCodeFromName(neighborhood);
  const sequence = sequenceNumber ?? Math.floor(Math.random() * 999999) + 1;
  const sequenceStr = sequence.toString().padStart(6, '0');
  
  return `${cityCode}-${typeCode}-${neighborhoodCode}-${sequenceStr}`;
}

export function parsePropertyIdString(propertyId: string): PropertyIdComponents | null {
  const parts = propertyId.split('-');
  if (parts.length !== 4) return null;

  const [cityCode, typeCode, neighborhoodCode, sequenceStr] = parts;
  const sequenceNumber = parseInt(sequenceStr, 10);

  if (isNaN(sequenceNumber)) return null;

  return {
    cityCode: cityCode as CityCode,
    typeCode: typeCode as PropertyTypeCode,
    neighborhoodCode,
    sequenceNumber,
  };
}

export function calculatePropertyPrice(
  propertyType: PropertyType,
  city: string,
  neighborhood: NeighborhoodData | null,
  squareFootage: number,
  quality: number,
  config: PropertyPricingConfig
): PropertyPriceCalculation {
  const priceRange = config.basePrices[propertyType];
  const basePrice = (priceRange.min + priceRange.max) / 2;

  const neighborhoodMultiplier = neighborhood?.priceMultiplier ?? 1.0;
  const qualityMultiplier = config.qualityMultipliers[quality] ?? 1.0;

  let sizeMultiplier = 1.0;
  for (const range of config.sizeMultipliers) {
    if (squareFootage >= range.minSqFt && squareFootage <= range.maxSqFt) {
      sizeMultiplier = range.multiplier;
      break;
    }
  }

  const currentMonth = new Date().getMonth() + 1;
  const seasonalFactor = config.seasonalFactors.find(f => f.month === currentMonth);
  const seasonalMultiplier = seasonalFactor?.priceMultiplier ?? 1.0;

  const marketConditionMultiplier = 1.0;

  const factors: PropertyPriceFactors = {
    basePrice,
    neighborhoodMultiplier,
    qualityMultiplier,
    sizeMultiplier,
    marketConditionMultiplier,
    seasonalMultiplier,
  };

  const calculatedPrice = Math.round(
    basePrice *
    neighborhoodMultiplier *
    qualityMultiplier *
    sizeMultiplier *
    marketConditionMultiplier *
    seasonalMultiplier
  );

  const suggestedRent = Math.round(calculatedPrice * config.rentToValueRatio);
  const pricePerSqFt = squareFootage > 0 ? Math.round(calculatedPrice / squareFootage) : 0;

  return {
    propertyId: generatePropertyIdString(city, propertyType, neighborhood?.name ?? 'Unknown'),
    basePrice,
    factors,
    calculatedPrice,
    suggestedRent,
    pricePerSqFt,
    calculatedAt: new Date().toISOString(),
  };
}

export function calculateRentFromPurchasePrice(
  purchasePrice: number,
  propertyType: PropertyType,
  quality: number,
  rentToValueRatio: number = DEFAULT_RENT_TO_VALUE_RATIO
): number {
  let typeMultiplier = 1.0;
  switch (propertyType) {
    case 'apartment':
      typeMultiplier = 1.1;
      break;
    case 'house':
      typeMultiplier = 1.0;
      break;
    case 'mansion':
      typeMultiplier = 0.8;
      break;
    case 'beach_house':
      typeMultiplier = 1.2;
      break;
  }

  const qualityMultiplier = 0.8 + (quality / 10) * 0.4;

  return Math.round(purchasePrice * rentToValueRatio * typeMultiplier * qualityMultiplier);
}

export function getSeasonalFactorForMonth(month?: number): SeasonalFactor {
  const targetMonth = month ?? new Date().getMonth() + 1;
  return DEFAULT_SEASONAL_FACTORS.find(f => f.month === targetMonth) ?? DEFAULT_SEASONAL_FACTORS[0];
}

export function calculateValueScore(
  price: number,
  pricePerSqFt: number,
  quality: number,
  marketAvgPrice: number,
  marketAvgPricePerSqFt: number
): number {
  const priceScore = marketAvgPrice > 0 ? (1 - (price / marketAvgPrice)) * 30 + 50 : 50;
  const sqFtScore = marketAvgPricePerSqFt > 0 ? (1 - (pricePerSqFt / marketAvgPricePerSqFt)) * 30 + 50 : 50;
  const qualityScore = quality * 10;

  const rawScore = (priceScore * 0.4) + (sqFtScore * 0.3) + (qualityScore * 0.3);
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

export function createDefaultPricingConfig(): PropertyPricingConfig {
  return {
    basePrices: {
      apartment: { min: 250000, max: 800000 },
      house: { min: 500000, max: 1500000 },
      mansion: { min: 2000000, max: 10000000 },
      beach_house: { min: 1500000, max: 5000000 },
    },
    qualityMultipliers: DEFAULT_QUALITY_MULTIPLIERS,
    sizeMultipliers: [
      { minSqFt: 0, maxSqFt: 500, multiplier: 0.7 },
      { minSqFt: 501, maxSqFt: 1000, multiplier: 0.85 },
      { minSqFt: 1001, maxSqFt: 1500, multiplier: 1.0 },
      { minSqFt: 1501, maxSqFt: 2500, multiplier: 1.15 },
      { minSqFt: 2501, maxSqFt: 4000, multiplier: 1.3 },
      { minSqFt: 4001, maxSqFt: 6000, multiplier: 1.5 },
      { minSqFt: 6001, maxSqFt: 10000, multiplier: 1.8 },
      { minSqFt: 10001, maxSqFt: Infinity, multiplier: 2.2 },
    ],
    seasonalFactors: DEFAULT_SEASONAL_FACTORS,
    rentToValueRatio: DEFAULT_RENT_TO_VALUE_RATIO,
  };
}

export function createEmptyPricingSystemState(): PropertyPricingSystemState {
  return {
    isInitialized: false,
    config: null,
    marketConditions: {},
    lastPriceUpdate: null,
  };
}

export function getMarketConditionKey(city: string, propertyType?: PropertyType): string {
  return propertyType ? `${city}-${propertyType}` : city;
}

export function getDemandLevelMultiplier(
  demandLevel: MarketCondition['demandLevel']
): number {
  switch (demandLevel) {
    case 'very_low': return 0.85;
    case 'low': return 0.92;
    case 'moderate': return 1.0;
    case 'high': return 1.08;
    case 'very_high': return 1.18;
    default: return 1.0;
  }
}

export function getSupplyLevelMultiplier(
  supplyLevel: MarketCondition['supplyLevel']
): number {
  switch (supplyLevel) {
    case 'very_low': return 1.15;
    case 'low': return 1.07;
    case 'moderate': return 1.0;
    case 'high': return 0.93;
    case 'very_high': return 0.85;
    default: return 1.0;
  }
}

export function calculateMarketMultiplier(condition: MarketCondition): number {
  const demandMult = getDemandLevelMultiplier(condition.demandLevel);
  const supplyMult = getSupplyLevelMultiplier(condition.supplyLevel);
  const trendMult = condition.trend === 'rising' ? 1 + (condition.trendStrength * 0.1) :
                    condition.trend === 'declining' ? 1 - (condition.trendStrength * 0.1) : 1.0;

  return demandMult * supplyMult * trendMult;
}

export function estimatePropertyAppreciation(
  currentValue: number,
  monthsProjected: number,
  marketCondition: MarketCondition | null,
  annualAppreciationRate: number = 0.03
): PropertyAppreciationEstimate {
  let effectiveRate = annualAppreciationRate;
  const factors: string[] = [];

  if (marketCondition) {
    if (marketCondition.trend === 'rising') {
      effectiveRate += marketCondition.trendStrength * 0.02;
      factors.push('Rising market trend');
    } else if (marketCondition.trend === 'declining') {
      effectiveRate -= marketCondition.trendStrength * 0.02;
      factors.push('Declining market trend');
    }

    if (marketCondition.demandLevel === 'high' || marketCondition.demandLevel === 'very_high') {
      effectiveRate += 0.01;
      factors.push('High demand');
    }

    if (marketCondition.supplyLevel === 'low' || marketCondition.supplyLevel === 'very_low') {
      effectiveRate += 0.01;
      factors.push('Low supply');
    }
  }

  const monthlyRate = effectiveRate / 12;
  const estimatedFutureValue = Math.round(currentValue * Math.pow(1 + monthlyRate, monthsProjected));
  const appreciationAmount = estimatedFutureValue - currentValue;
  const appreciationPercent = (appreciationAmount / currentValue) * 100;

  let confidenceLevel: 'low' | 'medium' | 'high' = 'medium';
  if (monthsProjected <= 12) confidenceLevel = 'high';
  else if (monthsProjected <= 36) confidenceLevel = 'medium';
  else confidenceLevel = 'low';

  return {
    propertyId: '',
    currentValue,
    estimatedFutureValue,
    appreciationAmount,
    appreciationPercent,
    monthsProjected,
    confidenceLevel,
    factors: factors.length > 0 ? factors : ['Base market appreciation'],
  };
}

// Property Map Manager Types

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraState {
  position: Vector3;
  rotation: Vector3;
  target: Vector3;
  zoom: number;
  fov: number;
}

export interface MapCityData {
  cityName: string;
  cityColor: string;
  centerPosition: Vector3;
  bounds: MapBounds;
  terrainType: 'urban' | 'coastal' | 'suburban' | 'mixed';
}

export interface PropertyMapManagerState {
  isLoading: boolean;
  isMapLoaded: boolean;
  isInitialized: boolean;
  currentCity: string | null;
  propertyMarkers: Record<string, PropertyMarkerState>;
  selectedMarkerId: string | null;
  hoveredMarkerId: string | null;
  camera: CameraState;
  mapData: MapCityData | null;
  visiblePropertyCount: number;
  lastUpdateTime: string | null;
  errorMessage: string | null;
}

export interface PropertyMapManagerEvents {
  onMapLoaded: (city: string, propertyCount: number) => void;
  onMapCleared: () => void;
  onMarkerCreated: (markerId: string, marker: PropertyMarkerState) => void;
  onMarkerRemoved: (markerId: string) => void;
  onMarkerSelected: (markerId: string, property: PropertyData) => void;
  onMarkerDeselected: () => void;
  onMarkerHovered: (markerId: string, property: PropertyData) => void;
  onMarkerUnhovered: () => void;
  onCameraChanged: (camera: CameraState) => void;
  onPropertyFocused: (propertyId: string, position: Vector3) => void;
  onError: (error: string) => void;
}

export interface PropertyMapManager {
  state: PropertyMapManagerState;
  events: Partial<PropertyMapManagerEvents>;

  initialize: () => Promise<PropertyOperationResult>;
  dispose: () => void;

  loadCity: (cityName: string) => Promise<PropertyOperationResult<MapCityData>>;
  clearMap: () => void;

  loadPropertyMarkers: (
    properties: PropertyData[]
  ) => Promise<PropertyOperationResult<PropertyMarkerState[]>>;

  addPropertyMarker: (property: PropertyData) => PropertyOperationResult<PropertyMarkerState>;
  removePropertyMarker: (propertyId: string) => PropertyOperationResult;
  updatePropertyMarker: (
    propertyId: string,
    updates: Partial<PropertyMarkerState>
  ) => PropertyOperationResult<PropertyMarkerState>;

  selectMarker: (propertyId: string) => void;
  deselectMarker: () => void;
  hoverMarker: (propertyId: string) => void;
  unhoverMarker: () => void;

  focusOnProperty: (propertyId: string, animationDuration?: number) => void;
  focusOnPosition: (position: Vector3, animationDuration?: number) => void;
  resetCameraView: () => void;

  setCameraPosition: (position: Vector3) => void;
  setCameraTarget: (target: Vector3) => void;
  setCameraZoom: (zoom: number) => void;
  animateCameraTo: (
    position: Vector3,
    target: Vector3,
    duration: number
  ) => Promise<void>;

  getMarkerAtPosition: (screenX: number, screenY: number) => PropertyMarkerState | null;
  getVisibleMarkers: () => PropertyMarkerState[];
  getMarkersByType: (propertyType: PropertyType) => PropertyMarkerState[];
  getMarkersByStatus: (status: PropertyStatus) => PropertyMarkerState[];

  setMarkerVisibility: (propertyId: string, visible: boolean) => void;
  setAllMarkersVisibility: (visible: boolean) => void;
  filterMarkers: (filter: PropertyFilter) => void;
  clearMarkerFilter: () => void;

  worldToScreenPosition: (worldPosition: Vector3) => { x: number; y: number };
  screenToWorldPosition: (screenX: number, screenY: number) => Vector3;
}

export interface PropertyMapConfig {
  defaultCameraPosition: Vector3;
  defaultCameraTarget: Vector3;
  defaultCameraZoom: number;
  markerScaleFactor: number;
  animationDuration: number;
  maxVisibleMarkers: number;
  clusteringEnabled: boolean;
  clusterRadius: number;
  tooltipEnabled: boolean;
  selectionHighlightColor: string;
  hoverHighlightColor: string;
}

export const DEFAULT_MAP_CONFIG: PropertyMapConfig = {
  defaultCameraPosition: { x: 0, y: 100, z: -100 },
  defaultCameraTarget: { x: 0, y: 0, z: 0 },
  defaultCameraZoom: 1,
  markerScaleFactor: 1,
  animationDuration: 1000,
  maxVisibleMarkers: 500,
  clusteringEnabled: true,
  clusterRadius: 50,
  tooltipEnabled: true,
  selectionHighlightColor: '#FFD700',
  hoverHighlightColor: '#FFFFFF',
};

export const CITY_COLORS: Record<string, string> = {
  'Los Angeles': '#E6D9CC',
  'Miami': '#CCE6F2',
  'New York': '#B3B3BF',
};

export function getCityColor(cityName: string): string {
  return CITY_COLORS[cityName] || '#808080';
}

export function createEmptyPropertyMapManagerState(): PropertyMapManagerState {
  return {
    isLoading: false,
    isMapLoaded: false,
    isInitialized: false,
    currentCity: null,
    propertyMarkers: {},
    selectedMarkerId: null,
    hoveredMarkerId: null,
    camera: {
      position: DEFAULT_MAP_CONFIG.defaultCameraPosition,
      rotation: { x: 0, y: 0, z: 0 },
      target: DEFAULT_MAP_CONFIG.defaultCameraTarget,
      zoom: DEFAULT_MAP_CONFIG.defaultCameraZoom,
      fov: 60,
    },
    mapData: null,
    visiblePropertyCount: 0,
    lastUpdateTime: null,
    errorMessage: null,
  };
}

export function calculateCameraPositionForFocus(
  targetPosition: Vector3,
  distance: number = 100,
  angle: number = 45
): Vector3 {
  const radians = (angle * Math.PI) / 180;
  return {
    x: targetPosition.x,
    y: targetPosition.y + distance * Math.sin(radians),
    z: targetPosition.z - distance * Math.cos(radians),
  };
}

export function interpolateVector3(
  from: Vector3,
  to: Vector3,
  t: number
): Vector3 {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    z: from.z + (to.z - from.z) * t,
  };
}

export function distanceBetweenVector3(a: Vector3, b: Vector3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Property Marker Types

export interface PropertyMarkerState {
  propertyId: string;
  property: PropertyData;
  worldPosition: Vector3;
  screenPosition: { x: number; y: number };
  isVisible: boolean;
  isSelected: boolean;
  isHovered: boolean;
  markerColor: string;
  markerSize: number;
  markerScale: number;
  labelText: string;
  labelVisible: boolean;
  animationState: MarkerAnimationState;
}

export type MarkerAnimationState = 'idle' | 'entering' | 'exiting' | 'pulsing' | 'bouncing';

export interface PropertyMarkerEvents {
  onClick: (propertyId: string, property: PropertyData) => void;
  onHoverEnter: (propertyId: string, property: PropertyData) => void;
  onHoverExit: (propertyId: string) => void;
  onSelect: (propertyId: string, property: PropertyData) => void;
  onDeselect: (propertyId: string) => void;
}

export interface PropertyMarker {
  state: PropertyMarkerState;
  events: Partial<PropertyMarkerEvents>;

  initialize: (property: PropertyData, worldPosition: Vector3) => void;
  dispose: () => void;

  setPosition: (worldPosition: Vector3) => void;
  updateScreenPosition: (screenX: number, screenY: number) => void;

  setSelected: (selected: boolean) => void;
  setHovered: (hovered: boolean) => void;
  setVisible: (visible: boolean) => void;

  setColor: (color: string) => void;
  setSize: (size: number) => void;
  setScale: (scale: number) => void;

  setLabelText: (text: string) => void;
  setLabelVisible: (visible: boolean) => void;

  playAnimation: (animation: MarkerAnimationState) => void;
  stopAnimation: () => void;

  getDisplayInfo: () => PropertyMarkerDisplayInfo;
}

export interface PropertyMarkerDisplayInfo {
  propertyId: string;
  propertyType: string;
  price: string;
  address: string;
  neighborhood: string;
  status: string;
  statusColor: string;
  markerColor: string;
  isOwned: boolean;
  isInWatchlist: boolean;
}

export interface PropertyMarkerConfig {
  baseSize: number;
  selectedScale: number;
  hoveredScale: number;
  pulseSpeed: number;
  bounceHeight: number;
  labelOffset: Vector3;
  labelFontSize: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowOpacity: number;
}

export const DEFAULT_MARKER_CONFIG: PropertyMarkerConfig = {
  baseSize: 1,
  selectedScale: 1.5,
  hoveredScale: 1.25,
  pulseSpeed: 1,
  bounceHeight: 5,
  labelOffset: { x: 0, y: 3, z: 0 },
  labelFontSize: 12,
  shadowEnabled: true,
  shadowColor: '#000000',
  shadowOpacity: 0.3,
};

export function createPropertyMarkerState(
  property: PropertyData,
  worldPosition: Vector3
): PropertyMarkerState {
  return {
    propertyId: property.propertyId,
    property,
    worldPosition,
    screenPosition: { x: 0, y: 0 },
    isVisible: true,
    isSelected: false,
    isHovered: false,
    markerColor: getPropertyTypeColor(property.propertyType),
    markerSize: getPropertyMarkerSize(property.propertyType),
    markerScale: 1,
    labelText: `${formatCurrency(property.purchasePrice)}`,
    labelVisible: false,
    animationState: 'idle',
  };
}

export function createPropertyMarkerDisplayInfo(
  marker: PropertyMarkerState,
  isInWatchlist: boolean = false
): PropertyMarkerDisplayInfo {
  return {
    propertyId: marker.propertyId,
    propertyType: formatPropertyType(marker.property.propertyType),
    price: `${formatCurrency(marker.property.purchasePrice)}`,
    address: marker.property.address || 'Address not available',
    neighborhood: marker.property.neighborhood || 'Unknown',
    status: getPropertyStatusLabel(marker.property.status),
    statusColor: getPropertyStatusColor(marker.property.status),
    markerColor: marker.markerColor,
    isOwned: marker.property.status === 'owned',
    isInWatchlist,
  };
}

export function getMarkerScaleForState(
  isSelected: boolean,
  isHovered: boolean,
  config: PropertyMarkerConfig = DEFAULT_MARKER_CONFIG
): number {
  if (isSelected) return config.selectedScale;
  if (isHovered) return config.hoveredScale;
  return 1;
}

// Map Tooltip Types

export interface MapTooltipState {
  isVisible: boolean;
  currentProperty: PropertyData | null;
  targetPosition: Vector3;
  screenPosition: { x: number; y: number };
  offset: { x: number; y: number };
}

export interface MapTooltipDisplay {
  propertyType: string;
  price: string;
  address: string;
  neighborhood: string;
  bedrooms: string;
  bathrooms: string;
  squareFootage: string;
  quality: string;
  status: string;
  statusColor: string;
}

export interface MapTooltipEvents {
  onViewButtonClick: (property: PropertyData) => void;
  onTooltipShown: (property: PropertyData) => void;
  onTooltipHidden: () => void;
}

export interface MapTooltip {
  state: MapTooltipState;
  events: Partial<MapTooltipEvents>;

  showTooltip: (property: PropertyData, worldPosition: Vector3) => void;
  hideTooltip: () => void;
  updatePosition: (screenPosition: { x: number; y: number }) => void;
  getDisplayValues: () => MapTooltipDisplay | null;
  setOffset: (offset: { x: number; y: number }) => void;
}

export interface MapTooltipConfig {
  defaultOffset: { x: number; y: number };
  fadeInDuration: number;
  fadeOutDuration: number;
  maxWidth: number;
  padding: number;
  borderRadius: number;
  backgroundColor: string;
  textColor: string;
  shadowEnabled: boolean;
}

export const DEFAULT_TOOLTIP_CONFIG: MapTooltipConfig = {
  defaultOffset: { x: 0, y: -20 },
  fadeInDuration: 200,
  fadeOutDuration: 150,
  maxWidth: 250,
  padding: 12,
  borderRadius: 8,
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  shadowEnabled: true,
};

export function createEmptyMapTooltipState(): MapTooltipState {
  return {
    isVisible: false,
    currentProperty: null,
    targetPosition: { x: 0, y: 0, z: 0 },
    screenPosition: { x: 0, y: 0 },
    offset: DEFAULT_TOOLTIP_CONFIG.defaultOffset,
  };
}

export function createMapTooltipDisplay(
  property: PropertyData
): MapTooltipDisplay {
  return {
    propertyType: formatPropertyType(property.propertyType),
    price: `${formatCurrency(property.purchasePrice)}`,
    address: property.address || 'Address not available',
    neighborhood: property.neighborhood || 'Unknown',
    bedrooms: `${property.bedrooms} bed`,
    bathrooms: `${property.bathrooms} bath`,
    squareFootage: `${property.squareFootage.toLocaleString()} sqft`,
    quality: `${property.propertyQuality}/10`,
    status: getPropertyStatusLabel(property.status),
    statusColor: getPropertyStatusColor(property.status),
  };
}

// Map Clustering Types

export interface MarkerCluster {
  id: string;
  centerPosition: Vector3;
  screenPosition: { x: number; y: number };
  propertyIds: string[];
  propertyCount: number;
  bounds: { min: Vector3; max: Vector3 };
  averagePrice: number;
  dominantType: PropertyType;
  isExpanded: boolean;
}

export interface MarkerClusterDisplay {
  count: string;
  averagePrice: string;
  dominantType: string;
  color: string;
}

export interface MarkerClusteringState {
  isEnabled: boolean;
  clusters: MarkerCluster[];
  clusterRadius: number;
  minMarkersForCluster: number;
  expandedClusterId: string | null;
}

export interface MarkerClusteringEvents {
  onClusterCreated: (cluster: MarkerCluster) => void;
  onClusterExpanded: (clusterId: string) => void;
  onClusterCollapsed: (clusterId: string) => void;
  onClusterClick: (cluster: MarkerCluster) => void;
}

export interface MarkerClustering {
  state: MarkerClusteringState;
  events: Partial<MarkerClusteringEvents>;

  setEnabled: (enabled: boolean) => void;
  setClusterRadius: (radius: number) => void;
  setMinMarkersForCluster: (min: number) => void;

  calculateClusters: (markers: PropertyMarkerState[]) => MarkerCluster[];
  expandCluster: (clusterId: string) => void;
  collapseCluster: (clusterId: string) => void;
  collapseAllClusters: () => void;

  getClusterAtPosition: (screenX: number, screenY: number) => MarkerCluster | null;
  getMarkersInCluster: (clusterId: string) => PropertyMarkerState[];
  getClusterDisplay: (cluster: MarkerCluster) => MarkerClusterDisplay;
}

export function createEmptyClusteringState(): MarkerClusteringState {
  return {
    isEnabled: true,
    clusters: [],
    clusterRadius: 50,
    minMarkersForCluster: 3,
    expandedClusterId: null,
  };
}

export function createMarkerCluster(
  markers: PropertyMarkerState[]
): MarkerCluster {
  if (markers.length === 0) {
    return {
      id: '',
      centerPosition: { x: 0, y: 0, z: 0 },
      screenPosition: { x: 0, y: 0 },
      propertyIds: [],
      propertyCount: 0,
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
      averagePrice: 0,
      dominantType: 'apartment',
      isExpanded: false,
    };
  }

  const propertyIds = markers.map(m => m.propertyId);
  const totalPrice = markers.reduce((sum, m) => sum + m.property.purchasePrice, 0);
  const averagePrice = totalPrice / markers.length;

  const typeCounts: Record<PropertyType, number> = {
    apartment: 0,
    house: 0,
    mansion: 0,
    beach_house: 0,
  };
  markers.forEach(m => typeCounts[m.property.propertyType]++);
  const dominantType = (Object.entries(typeCounts) as [PropertyType, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const positions = markers.map(m => m.worldPosition);
  const centerX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
  const centerY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
  const centerZ = positions.reduce((sum, p) => sum + p.z, 0) / positions.length;

  const minX = Math.min(...positions.map(p => p.x));
  const minY = Math.min(...positions.map(p => p.y));
  const minZ = Math.min(...positions.map(p => p.z));
  const maxX = Math.max(...positions.map(p => p.x));
  const maxY = Math.max(...positions.map(p => p.y));
  const maxZ = Math.max(...positions.map(p => p.z));

  return {
    id: `cluster-${propertyIds.join('-').substring(0, 20)}`,
    centerPosition: { x: centerX, y: centerY, z: centerZ },
    screenPosition: { x: 0, y: 0 },
    propertyIds,
    propertyCount: markers.length,
    bounds: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    },
    averagePrice,
    dominantType,
    isExpanded: false,
  };
}

export function createMarkerClusterDisplay(
  cluster: MarkerCluster
): MarkerClusterDisplay {
  return {
    count: `${cluster.propertyCount}`,
    averagePrice: `${formatCurrency(cluster.averagePrice)}`,
    dominantType: formatPropertyType(cluster.dominantType),
    color: getPropertyTypeColor(cluster.dominantType),
  };
}

export function shouldClusterMarkers(
  markers: PropertyMarkerState[],
  radius: number,
  minCount: number
): boolean {
  if (markers.length < minCount) return false;

  for (let i = 0; i < markers.length; i++) {
    let nearbyCount = 0;
    for (let j = 0; j < markers.length; j++) {
      if (i !== j) {
        const distance = distanceBetweenVector3(
          markers[i].worldPosition,
          markers[j].worldPosition
        );
        if (distance <= radius) nearbyCount++;
      }
    }
    if (nearbyCount >= minCount - 1) return true;
  }

  return false;
}

// City Selection UI Types

export interface CitySelectionUIState {
  isLoading: boolean;
  isInitialized: boolean;
  availableCities: CityData[];
  selectedCity: CityData | null;
  isConfirmEnabled: boolean;
  isWelcomePanelVisible: boolean;
  errorMessage: string | null;
}

export interface CitySelectionUIEvents {
  onCitySelected: (city: CityData) => void;
  onCityDeselected: () => void;
  onCityConfirmed: (city: CityData) => void;
  onCitiesLoaded: (cities: CityData[]) => void;
  onWelcomePanelShown: () => void;
  onWelcomePanelHidden: () => void;
  onError: (error: string) => void;
}

export interface CitySelectionUI {
  state: CitySelectionUIState;
  events: Partial<CitySelectionUIEvents>;

  initialize: () => Promise<PropertyOperationResult>;
  dispose: () => void;

  loadCities: () => Promise<PropertyOperationResult<CityData[]>>;
  refreshCities: () => Promise<PropertyOperationResult<CityData[]>>;

  selectCity: (city: CityData) => void;
  deselectCity: () => void;
  confirmSelection: () => Promise<PropertyOperationResult<CityData>>;

  showWelcomePanel: () => void;
  hideWelcomePanel: () => void;

  getCityCards: () => CityCardData[];
  getSelectedCityCard: () => CityCardData | null;
  isConfirmButtonEnabled: () => boolean;
}

export interface CityCardData {
  city: CityData;
  displayName: string;
  avgPriceText: string;
  propertyCountText: string;
  cardColor: string;
  isSelected: boolean;
}

export interface CityCardDisplay {
  cityName: string;
  avgPrice: string;
  propertyCount: string;
  cardColor: string;
  isSelected: boolean;
}

export interface CityCardProps {
  city: CityData;
  isSelected: boolean;
  onSelect: (city: CityData) => void;
}

export interface CityCardEvents {
  onSelected: (city: CityData) => void;
}

export interface CityCard {
  cityData: CityData;
  isSelected: boolean;
  events: Partial<CityCardEvents>;

  setup: (city: CityData, callback: (city: CityData) => void) => void;
  setSelected: (selected: boolean) => void;
  getDisplayValues: () => CityCardDisplay;
}

export const CITY_CARD_COLORS: Record<string, string> = {
  'Los Angeles': '#E6B380',
  'Miami': '#80E6E6',
  'New York': '#9999B3',
};

export function getCityCardColor(cityName: string): string {
  return CITY_CARD_COLORS[cityName] || '#808080';
}

export function createEmptyCitySelectionUIState(): CitySelectionUIState {
  return {
    isLoading: false,
    isInitialized: false,
    availableCities: [],
    selectedCity: null,
    isConfirmEnabled: false,
    isWelcomePanelVisible: false,
    errorMessage: null,
  };
}

export function createCityCardData(city: CityData, isSelected: boolean): CityCardData {
  return {
    city,
    displayName: city.name,
    avgPriceText: `Avg: ${city.averagePrice.toLocaleString()}`,
    propertyCountText: getCityPropertyCountText(city),
    cardColor: getCityCardColor(city.name),
    isSelected,
  };
}

export function createCityCardDisplay(cardData: CityCardData): CityCardDisplay {
  return {
    cityName: cardData.displayName,
    avgPrice: cardData.avgPriceText,
    propertyCount: cardData.propertyCountText,
    cardColor: cardData.cardColor,
    isSelected: cardData.isSelected,
  };
}

export function canConfirmCitySelection(state: CitySelectionUIState): boolean {
  return (
    state.selectedCity !== null &&
    !state.isLoading &&
    state.errorMessage === null
  );
}

export interface CitySelectionResult {
  success: boolean;
  city: CityData | null;
  error: string | null;
}

export function createCitySelectionResult(
  city: CityData | null,
  error: string | null = null
): CitySelectionResult {
  return {
    success: city !== null && error === null,
    city,
    error,
  };
}

export interface CitySelectionConfig {
  showPropertyCount: boolean;
  showAveragePrice: boolean;
  showNeighborhoodCount: boolean;
  enableAnimation: boolean;
  selectionFrameColor: string;
  selectionFrameWidth: number;
}

export const DEFAULT_CITY_SELECTION_CONFIG: CitySelectionConfig = {
  showPropertyCount: true,
  showAveragePrice: true,
  showNeighborhoodCount: false,
  enableAnimation: true,
  selectionFrameColor: '#FFD700',
  selectionFrameWidth: 3,
};

export interface WelcomePanelState {
  isVisible: boolean;
  selectedCityName: string | null;
  welcomeMessage: string;
}

export interface WelcomePanelDisplay {
  title: string;
  message: string;
  cityName: string;
}

export function createWelcomePanelDisplay(city: CityData): WelcomePanelDisplay {
  return {
    title: 'Welcome!',
    message: `You've selected ${city.name} as your starting city. Get ready to explore ${city.totalProperties.toLocaleString()} properties across ${city.neighborhoods.length} neighborhoods!`,
    cityName: city.name,
  };
}

export function createWelcomeMessage(city: CityData): string {
  return `Welcome to ${city.name}!`;
}
