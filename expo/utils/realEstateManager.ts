import {
  PropertyData,
  PropertyType,
  PropertyStatus,
  PropertyFilter,
  PropertySortCriteria,
  PropertySortOption,
  PropertyOwner,
  PortfolioSummary,
  CityData,
  NeighborhoodData,
  PropertyPurchaseRequest,
  PropertyRentalInfo,
  PropertyOperationResult,
  RentCollectionResult,
  RentalCollectionSummaryData,
  PropertyValuation,
  PropertyPriceCalculation,
  PropertyPricingConfig,
  MarketCondition,
  createPropertyPurchaseRequest,
  calculateOccupancyRate,
  calculateMonthlyIncome,
  createEmptyPortfolioSummary,
  createRentalCollectionSummaryData,
  calculateRentBounds,
  getPropertyTypeColor,
  getPropertyMarkerSize,
  formatPropertyType,
  formatCurrency,
  generatePropertyIdString,
  calculatePropertyPrice,
  createDefaultPricingConfig,
  estimatePropertyAppreciation,
} from '@/types/realEstate';

export interface PropertyManagerConfig {
  playerId: string;
  initialBalance: number;
  pricingConfig?: Partial<PropertyPricingConfig>;
}

export interface PropertyPurchaseResult {
  success: boolean;
  owner?: PropertyOwner;
  property?: PropertyData;
  newBalance?: number;
  error?: string;
}

export interface RentCollectionTotal {
  totalIncome: number;
  propertiesCount: number;
  results: RentCollectionResult[];
}

export function createPropertyManager(config: PropertyManagerConfig) {
  const pricingConfig = {
    ...createDefaultPricingConfig(),
    ...config.pricingConfig,
  };

  const generateProperty = (
    city: CityData,
    propertyType: PropertyType,
    neighborhood: NeighborhoodData
  ): PropertyData => {
    const priceCalc = calculatePropertyPrice(
      propertyType,
      city.name,
      neighborhood,
      getRandomSquareFootage(propertyType),
      Math.floor(Math.random() * 5) + 5,
      pricingConfig
    );

    const bedrooms = getRandomBedrooms(propertyType);
    const bathrooms = Math.max(1, Math.floor(bedrooms * 0.75));

    return {
      id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      propertyId: priceCalc.propertyId,
      city: city.name,
      propertyType,
      address: generateRandomAddress(),
      latitude: city.centerCoordinates.latitude + (Math.random() - 0.5) * 0.2,
      longitude: city.centerCoordinates.longitude + (Math.random() - 0.5) * 0.2,
      purchasePrice: priceCalc.calculatedPrice,
      baseRentPrice: priceCalc.suggestedRent,
      currentRentPrice: priceCalc.suggestedRent,
      propertyQuality: Math.floor(Math.random() * 5) + 5,
      squareFootage: Math.round(priceCalc.calculatedPrice / priceCalc.pricePerSqFt),
      bedrooms,
      bathrooms,
      neighborhood: neighborhood.name,
      ownerId: null,
      status: 'available',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const generatePropertiesForCity = (city: CityData, count: number): PropertyData[] => {
    const properties: PropertyData[] = [];
    const types: PropertyType[] = ['apartment', 'house', 'mansion', 'beach_house'];

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const neighborhood = city.neighborhoods[Math.floor(Math.random() * city.neighborhoods.length)];
      properties.push(generateProperty(city, type, neighborhood));
    }

    return properties;
  };

  const filterProperties = (
    properties: PropertyData[],
    filter: PropertyFilter
  ): PropertyData[] => {
    return properties.filter(property => {
      if (filter.city && property.city !== filter.city) return false;
      if (filter.propertyType && property.propertyType !== filter.propertyType) return false;
      if (filter.neighborhood && property.neighborhood !== filter.neighborhood) return false;
      if (filter.minPrice !== undefined && property.purchasePrice < filter.minPrice) return false;
      if (filter.maxPrice !== undefined && property.purchasePrice > filter.maxPrice) return false;
      if (filter.minBedrooms !== undefined && property.bedrooms < filter.minBedrooms) return false;
      if (filter.maxBedrooms !== undefined && property.bedrooms > filter.maxBedrooms) return false;
      if (filter.minQuality !== undefined && property.propertyQuality < filter.minQuality) return false;
      if (filter.maxQuality !== undefined && property.propertyQuality > filter.maxQuality) return false;
      if (filter.beachfront !== undefined && filter.beachfront && property.propertyType !== 'beach_house') return false;
      return true;
    });
  };

  const sortProperties = (
    properties: PropertyData[],
    sortCriteria: PropertySortCriteria
  ): PropertyData[] => {
    const sorted = [...properties];
    const { sortOption, ascending } = sortCriteria;

    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortOption) {
        case 'price_low_to_high':
        case 'price_high_to_low':
          comparison = a.purchasePrice - b.purchasePrice;
          break;
        case 'rent_low_to_high':
        case 'rent_high_to_low':
          comparison = a.baseRentPrice - b.baseRentPrice;
          break;
        case 'quality_high_to_low':
        case 'quality_low_to_high':
          comparison = a.propertyQuality - b.propertyQuality;
          break;
        case 'size_large_to_small':
        case 'size_small_to_large':
          comparison = a.squareFootage - b.squareFootage;
          break;
        case 'newest_first':
        case 'oldest_first':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          comparison = 0;
      }
      return ascending ? comparison : -comparison;
    });

    return sorted;
  };

  const calculatePurchaseRequest = (property: PropertyData): PropertyPurchaseRequest => {
    return createPropertyPurchaseRequest(property.propertyId, property.purchasePrice, 0.02);
  };

  const validatePurchase = (
    property: PropertyData,
    playerBalance: number
  ): PropertyOperationResult => {
    const request = calculatePurchaseRequest(property);

    if (property.status !== 'available') {
      return { success: false, error: 'Property is not available', errorCode: 'PROPERTY_NOT_AVAILABLE' };
    }

    if (playerBalance < request.totalAmount) {
      return { success: false, error: 'Insufficient funds', errorCode: 'INSUFFICIENT_FUNDS' };
    }

    return { success: true };
  };

  const createPropertyOwner = (
    property: PropertyData,
    purchasePrice: number
  ): PropertyOwner => {
    return {
      id: `owner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      propertyId: property.propertyId,
      playerId: config.playerId,
      purchasePrice,
      purchaseDate: new Date().toISOString(),
      monthlyIncome: calculateMonthlyIncome(property.currentRentPrice, property.baseRentPrice),
      isActive: true,
    };
  };

  const calculateRentalInfo = (property: PropertyData): PropertyRentalInfo => {
    const occupancyRate = calculateOccupancyRate(property.currentRentPrice, property.baseRentPrice);
    return {
      propertyId: property.propertyId,
      baseRent: property.baseRentPrice,
      currentRent: property.currentRentPrice,
      occupancyRate,
      monthlyIncome: property.currentRentPrice * (occupancyRate / 100),
    };
  };

  const collectRentForProperty = (property: PropertyData): RentCollectionResult => {
    const occupancyRate = calculateOccupancyRate(property.currentRentPrice, property.baseRentPrice);
    const collectedAmount = property.currentRentPrice * (occupancyRate / 100);

    return {
      propertyId: property.propertyId,
      rentAmount: property.currentRentPrice,
      occupancyRate,
      collectedAmount,
      collectionDate: new Date().toISOString(),
    };
  };

  const calculatePortfolioSummary = (
    properties: PropertyData[],
    owners: Record<string, PropertyOwner>
  ): PortfolioSummary => {
    if (properties.length === 0) {
      return createEmptyPortfolioSummary();
    }

    let totalValue = 0;
    let monthlyIncome = 0;
    const propertiesByType: Record<PropertyType, number> = { apartment: 0, house: 0, mansion: 0, beach_house: 0 };
    const valueByType: Record<PropertyType, number> = { apartment: 0, house: 0, mansion: 0, beach_house: 0 };

    for (const property of properties) {
      const owner = owners[property.propertyId];
      const value = owner?.purchasePrice || property.purchasePrice;
      const income = calculateMonthlyIncome(property.currentRentPrice, property.baseRentPrice);

      totalValue += value;
      monthlyIncome += income;
      propertiesByType[property.propertyType]++;
      valueByType[property.propertyType] += value;
    }

    const annualIncome = monthlyIncome * 12;
    const averageROI = totalValue > 0 ? (annualIncome / totalValue) * 100 : 0;

    return {
      totalProperties: properties.length,
      totalValue,
      monthlyIncome,
      annualIncome,
      averageROI,
      propertiesByType,
      valueByType,
    };
  };

  const calculatePropertyValuation = (
    property: PropertyData,
    owner: PropertyOwner
  ): PropertyValuation => {
    const currentValue = property.purchasePrice;
    const appreciation = currentValue - owner.purchasePrice;
    const appreciationPercent = owner.purchasePrice > 0 ? (appreciation / owner.purchasePrice) * 100 : 0;
    const estimatedRent = property.currentRentPrice;
    const annualRent = estimatedRent * 12;
    const capRate = currentValue > 0 ? (annualRent / currentValue) * 100 : 0;

    return {
      propertyId: property.propertyId,
      currentValue,
      purchasePrice: owner.purchasePrice,
      appreciation,
      appreciationPercent,
      estimatedRent,
      capRate,
    };
  };

  return {
    generateProperty,
    generatePropertiesForCity,
    filterProperties,
    sortProperties,
    calculatePurchaseRequest,
    validatePurchase,
    createPropertyOwner,
    calculateRentalInfo,
    collectRentForProperty,
    calculatePortfolioSummary,
    calculatePropertyValuation,
    pricingConfig,
  };
}

function getRandomSquareFootage(type: PropertyType): number {
  switch (type) {
    case 'apartment':
      return Math.floor(Math.random() * 700) + 500;
    case 'house':
      return Math.floor(Math.random() * 1800) + 1200;
    case 'mansion':
      return Math.floor(Math.random() * 6000) + 4000;
    case 'beach_house':
      return Math.floor(Math.random() * 2500) + 1500;
    default:
      return 1000;
  }
}

function getRandomBedrooms(type: PropertyType): number {
  switch (type) {
    case 'apartment':
      return Math.floor(Math.random() * 2) + 1;
    case 'house':
      return Math.floor(Math.random() * 3) + 2;
    case 'mansion':
      return Math.floor(Math.random() * 4) + 4;
    case 'beach_house':
      return Math.floor(Math.random() * 4) + 2;
    default:
      return 2;
  }
}

function generateRandomAddress(): string {
  const streetNumbers = Math.floor(Math.random() * 9999) + 1;
  const streets = ['Main', 'Oak', 'Maple', 'Palm', 'Ocean', 'Park', 'Sunset', 'Harbor', 'Bay', 'Hill'];
  const suffixes = ['St', 'Ave', 'Blvd', 'Dr', 'Way', 'Ln', 'Ct', 'Pl'];
  
  return `${streetNumbers} ${streets[Math.floor(Math.random() * streets.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
}

export function formatPropertyPrice(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(2)}M`;
  }
  return `$${(price / 1000).toFixed(0)}K`;
}

export function formatPropertySize(sqft: number): string {
  return `${sqft.toLocaleString()} sqft`;
}

export function getPropertyTypeIcon(type: PropertyType): string {
  switch (type) {
    case 'apartment':
      return 'building';
    case 'house':
      return 'home';
    case 'mansion':
      return 'castle';
    case 'beach_house':
      return 'umbrella';
    default:
      return 'home';
  }
}

export function getPropertyStatusBadgeColor(status: PropertyStatus): string {
  switch (status) {
    case 'available':
      return '#22C55E';
    case 'sold':
      return '#EF4444';
    case 'owned':
      return '#3B82F6';
    case 'rented':
      return '#F59E0B';
    default:
      return '#6B7280';
  }
}

export function calculateROI(purchasePrice: number, monthlyRent: number, occupancyRate: number): number {
  const annualIncome = monthlyRent * 12 * (occupancyRate / 100);
  return purchasePrice > 0 ? (annualIncome / purchasePrice) * 100 : 0;
}

export function getRecommendedRentPrice(baseRent: number): { min: number; optimal: number; max: number } {
  return {
    min: Math.round(baseRent * 0.5),
    optimal: baseRent,
    max: Math.round(baseRent * 2.0),
  };
}

export function estimateTimeToROI(purchasePrice: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0) return Infinity;
  return Math.ceil(purchasePrice / monthlyIncome);
}
