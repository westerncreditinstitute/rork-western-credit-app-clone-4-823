import {
  PropertyData,
  PropertyType,
  CityData,
  NeighborhoodData,
  calculateOccupancyRate,
  calculateMonthlyIncome,
  generatePropertyIdString,
  createDefaultPricingConfig,
  DEFAULT_NEW_YORK_NEIGHBORHOODS,
} from '@/types/realEstate';

export interface InitialDataConfig {
  propertiesPerCity: number;
  includeAllCities: boolean;
  randomSeed?: number;
}

const DEFAULT_CONFIG: InitialDataConfig = {
  propertiesPerCity: 50,
  includeAllCities: true,
};

const LOS_ANGELES_NEIGHBORHOODS: NeighborhoodData[] = [
  { id: 'la_1', city: 'Los Angeles', name: 'Hollywood', priceMultiplier: 1.8, desirabilityScore: 9.0, safetyScore: 7.5, description: 'Entertainment district' },
  { id: 'la_2', city: 'Los Angeles', name: 'Beverly Hills', priceMultiplier: 3.0, desirabilityScore: 10.0, safetyScore: 9.5, description: 'Luxury living' },
  { id: 'la_3', city: 'Los Angeles', name: 'Santa Monica', priceMultiplier: 2.2, desirabilityScore: 9.5, safetyScore: 8.5, description: 'Beach lifestyle' },
  { id: 'la_4', city: 'Los Angeles', name: 'Downtown', priceMultiplier: 1.5, desirabilityScore: 8.0, safetyScore: 7.0, description: 'Urban living' },
  { id: 'la_5', city: 'Los Angeles', name: 'Pasadena', priceMultiplier: 1.3, desirabilityScore: 8.5, safetyScore: 8.5, description: 'Suburban charm' },
  { id: 'la_6', city: 'Los Angeles', name: 'Venice', priceMultiplier: 2.0, desirabilityScore: 9.0, safetyScore: 7.0, description: 'Artistic beach community' },
  { id: 'la_7', city: 'Los Angeles', name: 'Malibu', priceMultiplier: 3.5, desirabilityScore: 10.0, safetyScore: 9.0, description: 'Exclusive coastal' },
];

const MIAMI_NEIGHBORHOODS: NeighborhoodData[] = [
  { id: 'mi_1', city: 'Miami', name: 'South Beach', priceMultiplier: 2.5, desirabilityScore: 9.5, safetyScore: 7.5, description: 'Iconic beach living' },
  { id: 'mi_2', city: 'Miami', name: 'Brickell', priceMultiplier: 2.0, desirabilityScore: 9.0, safetyScore: 8.5, description: 'Financial district' },
  { id: 'mi_3', city: 'Miami', name: 'Coral Gables', priceMultiplier: 1.8, desirabilityScore: 9.0, safetyScore: 9.0, description: 'Mediterranean style' },
  { id: 'mi_4', city: 'Miami', name: 'Wynwood', priceMultiplier: 1.4, desirabilityScore: 8.5, safetyScore: 7.0, description: 'Arts district' },
  { id: 'mi_5', city: 'Miami', name: 'Key Biscayne', priceMultiplier: 2.8, desirabilityScore: 9.5, safetyScore: 9.5, description: 'Island paradise' },
  { id: 'mi_6', city: 'Miami', name: 'Coconut Grove', priceMultiplier: 1.6, desirabilityScore: 8.5, safetyScore: 8.0, description: 'Bohemian village' },
];

export const DEFAULT_CITIES: CityData[] = [
  {
    cityCode: 'LA',
    name: 'Los Angeles',
    state: 'CA',
    totalProperties: 150,
    apartments: 60,
    houses: 50,
    mansions: 20,
    beachHouses: 20,
    averagePrice: 850000,
    averageRent: 3500,
    centerCoordinates: { latitude: 34.0522, longitude: -118.2437 },
    mapBounds: { x: -118.5, y: 33.7, width: 0.6, height: 0.6 },
    neighborhoods: LOS_ANGELES_NEIGHBORHOODS,
    apartmentPriceRange: { min: 50000000, max: 350000000 },
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
    averagePrice: 650000,
    averageRent: 2800,
    centerCoordinates: { latitude: 25.7617, longitude: -80.1918 },
    mapBounds: { x: -80.4, y: 25.5, width: 0.5, height: 0.5 },
    neighborhoods: MIAMI_NEIGHBORHOODS,
    apartmentPriceRange: { min: 35000000, max: 220000000 },
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
    averagePrice: 1200000,
    averageRent: 4500,
    centerCoordinates: { latitude: 40.7128, longitude: -74.0060 },
    mapBounds: { x: -74.3, y: 40.5, width: 0.6, height: 0.5 },
    neighborhoods: DEFAULT_NEW_YORK_NEIGHBORHOODS,
    apartmentPriceRange: { min: 75000000, max: 550000000 },
    housePriceRange: { min: 800000, max: 2500000 },
    mansionPriceRange: { min: 5000000, max: 20000000 },
    beachHousePriceRange: { min: 2500000, max: 10000000 },
  },
];

function getPropertyTypeDistribution(): PropertyType[] {
  return [
    'apartment', 'apartment', 'apartment', 'apartment',
    'house', 'house', 'house',
    'mansion',
    'beach_house', 'beach_house',
  ];
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomAddress(): string {
  const streetNumbers = Math.floor(Math.random() * 9999) + 1;
  const streets = ['Main', 'Oak', 'Maple', 'Palm', 'Ocean', 'Park', 'Sunset', 'Harbor', 'Bay', 'Hill', 'Wilshire', 'Broadway', 'Collins', 'Biscayne'];
  const suffixes = ['St', 'Ave', 'Blvd', 'Dr', 'Way', 'Ln', 'Ct', 'Pl'];
  
  return `${streetNumbers} ${getRandomElement(streets)} ${getRandomElement(suffixes)}`;
}

function getPropertySpecs(type: PropertyType): { sqftRange: [number, number]; bedroomsRange: [number, number] } {
  switch (type) {
    case 'apartment':
      return { sqftRange: [150000, 800000], bedroomsRange: [1, 3] };
    case 'house':
      return { sqftRange: [1200, 3000], bedroomsRange: [2, 5] };
    case 'mansion':
      return { sqftRange: [4000, 10000], bedroomsRange: [4, 8] };
    case 'beach_house':
      return { sqftRange: [1500, 4000], bedroomsRange: [2, 6] };
    default:
      return { sqftRange: [1000, 2000], bedroomsRange: [2, 4] };
  }
}

function getPriceRange(city: CityData, type: PropertyType): { min: number; max: number } {
  switch (type) {
    case 'apartment':
      return city.apartmentPriceRange;
    case 'house':
      return city.housePriceRange;
    case 'mansion':
      return city.mansionPriceRange;
    case 'beach_house':
      return city.beachHousePriceRange;
    default:
      return city.housePriceRange;
  }
}

export function generatePropertyForCity(
  city: CityData,
  type: PropertyType,
  index: number
): PropertyData {
  const neighborhood = getRandomElement(city.neighborhoods);
  const specs = getPropertySpecs(type);
  const priceRange = getPriceRange(city, type);
  
  let purchasePrice: number;
  let baseRent: number;
  let sqft: number;
  let totalUnits: number | undefined;
  
  if (type === 'apartment') {
    totalUnits = Math.floor(Math.random() * 751) + 250;
    const basePrice = priceRange.min + Math.random() * (priceRange.max - priceRange.min);
    purchasePrice = Math.round(basePrice * neighborhood.priceMultiplier);
    
    const avgRentPerUnit = city.averageRent;
    baseRent = Math.round(totalUnits * avgRentPerUnit);
    
    sqft = Math.floor(Math.random() * (specs.sqftRange[1] - specs.sqftRange[0])) + specs.sqftRange[0];
  } else {
    const basePrice = priceRange.min + Math.random() * (priceRange.max - priceRange.min);
    purchasePrice = Math.round(basePrice * neighborhood.priceMultiplier);
    baseRent = Math.round(purchasePrice * 0.005);
    sqft = Math.floor(Math.random() * (specs.sqftRange[1] - specs.sqftRange[0])) + specs.sqftRange[0];
  }
  
  const quality = Math.floor(Math.random() * 5) + 5;
  const bedrooms = Math.floor(Math.random() * (specs.bedroomsRange[1] - specs.bedroomsRange[0] + 1)) + specs.bedroomsRange[0];
  const propertyId = generatePropertyIdString(city.name, type, neighborhood.name, index + 1);
  
  return {
    id: `prop_${city.cityCode}_${index}_${Date.now()}`,
    propertyId,
    city: city.name,
    propertyType: type,
    address: generateRandomAddress(),
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
  };
}

export function generatePropertiesForCity(city: CityData, count: number): PropertyData[] {
  const properties: PropertyData[] = [];
  const typeDistribution = getPropertyTypeDistribution();
  
  for (let i = 0; i < count; i++) {
    const type = getRandomElement(typeDistribution);
    properties.push(generatePropertyForCity(city, type, i));
  }
  
  console.log(`[InitialData] Generated ${properties.length} properties for ${city.name}`);
  return properties;
}

export function generateAllCityProperties(config: InitialDataConfig = DEFAULT_CONFIG): Map<string, PropertyData[]> {
  const allProperties = new Map<string, PropertyData[]>();
  
  for (const city of DEFAULT_CITIES) {
    const properties = generatePropertiesForCity(city, config.propertiesPerCity);
    allProperties.set(city.cityCode, properties);
  }
  
  console.log('[InitialData] All city properties generated');
  return allProperties;
}

export function createInitialRealEstateData(config: InitialDataConfig = DEFAULT_CONFIG) {
  console.log('[InitialData] Creating initial real estate data...');
  
  const cities = [...DEFAULT_CITIES];
  const propertiesByCity = generateAllCityProperties(config);
  
  const totalProperties = Array.from(propertiesByCity.values()).reduce(
    (sum, props) => sum + props.length,
    0
  );
  
  console.log(`[InitialData] Created ${totalProperties} total properties across ${cities.length} cities`);
  
  return {
    cities,
    propertiesByCity,
    totalProperties,
    isDataCreated: true,
    createdAt: new Date().toISOString(),
  };
}

export function getCityByCode(cityCode: string): CityData | undefined {
  return DEFAULT_CITIES.find(c => c.cityCode === cityCode);
}

export function getCityByName(cityName: string): CityData | undefined {
  return DEFAULT_CITIES.find(c => c.name === cityName);
}

export function getNeighborhoodsByCity(cityCode: string): NeighborhoodData[] {
  const city = getCityByCode(cityCode);
  return city?.neighborhoods || [];
}

export function getStarterPropertyRecommendations(
  city: CityData,
  budget: number
): PropertyData[] {
  const properties = generatePropertiesForCity(city, 20);
  
  return properties
    .filter(p => p.purchasePrice * 1.02 <= budget)
    .sort((a, b) => {
      const roiA = (a.baseRentPrice * 12) / a.purchasePrice;
      const roiB = (b.baseRentPrice * 12) / b.purchasePrice;
      return roiB - roiA;
    })
    .slice(0, 5);
}

export const REAL_ESTATE_DATA_VERSION = '1.0.0';
export const REAL_ESTATE_DATA_CREATED_KEY = 'real_estate_data_created';
