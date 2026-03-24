// PropertyGeneratorService - Generate properties and commercial venues

import { supabase } from '../lib/supabase';
import { MapService } from './MapService';
import { GeocodingService } from './GeocodingService';
import { PropertyTypesService } from './PropertyTypesService';
import {
  City,
  Property,
  PropertyGenerationConfig,
  CommercialArea,
  Location,
} from '../types/map';

export class PropertyGeneratorService {
  // Commercial venue configurations
  private static readonly VENUE_CONFIGS = {
    bowling_alley: {
      typeId: 10,
      minPrice: 50000,
      maxPrice: 200000,
      description: 'A modern bowling alley with arcade games and concessions',
      amenities: ['bowling lanes', 'arcade', 'snack bar', 'party rooms'],
      capacity: { min: 50, max: 200 },
    },
    movie_theater: {
      typeId: 11,
      minPrice: 100000,
      maxPrice: 500000,
      description: 'A state-of-the-art movie theater with multiple screens',
      amenities: ['multiple screens', '3D projection', 'concessions', 'luxury seating'],
      capacity: { min: 200, max: 1000 },
    },
    nightclub: {
      typeId: 12,
      minPrice: 75000,
      maxPrice: 300000,
      description: 'A vibrant nightclub with DJ and dance floor',
      amenities: ['dance floor', 'DJ booth', 'VIP sections', 'full bar'],
      capacity: { min: 100, max: 500 },
    },
    bar: {
      typeId: 13,
      minPrice: 30000,
      maxPrice: 150000,
      description: 'A popular bar with craft cocktails and entertainment',
      amenities: ['full bar', 'tap selection', 'live music', 'outdoor seating'],
      capacity: { min: 30, max: 150 },
    },
    billiards_hall: {
      typeId: 14,
      minPrice: 40000,
      maxPrice: 180000,
      description: 'A billiards hall with multiple tables and games',
      amenities: ['pool tables', 'darts', 'snacks', 'TV screens'],
      capacity: { min: 40, max: 120 },
    },
    restaurant: {
      typeId: 20,
      minPrice: 20000,
      maxPrice: 200000,
      description: 'A dining establishment with various cuisine options',
      amenities: ['dining area', 'kitchen', 'bar', 'patio seating'],
      capacity: { min: 20, max: 200 },
    },
    grocery_store: {
      typeId: 21,
      minPrice: 50000,
      maxPrice: 300000,
      description: 'A full-service grocery store with fresh produce',
      amenities: ['fresh produce', 'bakery', 'deli', 'pharmacy'],
      capacity: { min: 100, max: 500 },
    },
    sports_arena: {
      typeId: 30,
      minPrice: 200000,
      maxPrice: 1000000,
      description: 'A multi-purpose sports arena for events and games',
      amenities: ['seating', 'concessions', 'parking', 'VIP boxes'],
      capacity: { min: 500, max: 10000 },
    },
    paintball_range: {
      typeId: 31,
      minPrice: 30000,
      maxPrice: 120000,
      description: 'An outdoor paintball range with multiple fields',
      amenities: ['paintball fields', 'equipment rental', 'pro shop', 'picnic area'],
      capacity: { min: 20, max: 100 },
    },
    golf_club: {
      typeId: 32,
      minPrice: 150000,
      maxPrice: 800000,
      description: 'A prestigious golf country club with course and clubhouse',
      amenities: ['golf course', 'clubhouse', 'pro shop', 'restaurant'],
      capacity: { min: 100, max: 500 },
    },
    bank: {
      typeId: 40,
      minPrice: 100000,
      maxPrice: 400000,
      description: 'A full-service bank branch with ATMs and services',
      amenities: ['ATMs', 'teller windows', 'safe deposit boxes', 'private offices'],
      capacity: { min: 20, max: 100 },
    },
    event_hall: {
      typeId: 41,
      minPrice: 80000,
      maxPrice: 350000,
      description: 'A versatile event hall for weddings, conferences, and parties',
      amenities: ['event space', 'catering kitchen', 'AV equipment', 'parking'],
      capacity: { min: 100, max: 1000 },
    },
  };

  /**
   * Generate commercial venues for a city
   */
  static async generateCommercialVenues(config: PropertyGenerationConfig): Promise<Property[]> {
    try {
      const city = await MapService.getCity(config.cityId);
      if (!city) {
        throw new Error('City not found');
      }

      const properties: Property[] = [];

      for (const venueType of config.venueTypes) {
        const count = config.venuesPerType[venueType] || 0;
        const venueConfig = this.VENUE_CONFIGS[venueType as keyof typeof this.VENUE_CONFIGS];

        if (venueConfig && count > 0) {
          const venues = await this.generateVenuesForType(
            city,
            venueType,
            venueConfig,
            count
          );
          properties.push(...venues);
        }
      }

      // Bulk create properties
      const createdProperties = await this.bulkCreateProperties(properties);
      console.log(`[PropertyGeneratorService] Generated ${createdProperties.length} properties for ${city.name}`);

      return createdProperties;
    } catch (error) {
      console.error('[PropertyGeneratorService] Error generating commercial venues:', error);
      throw error;
    }
  }

  /**
   * Generate venues for a specific type
   */
  private static async generateVenuesForType(
    city: City,
    venueType: string,
    config: any,
    count: number
  ): Promise<Property[]> {
    const venues: Property[] = [];

    // Get commercial areas for the city
    const commercialAreas = await this.getCommercialAreas(city);

    for (let i = 0; i < count; i++) {
      const area = commercialAreas[Math.floor(Math.random() * commercialAreas.length)];
      const location = await this.generateLocationInArea(area, city);
      
      if (location) {
        const property = this.createVenueProperty(
          city,
          venueType,
          config,
          location,
          i
        );
        venues.push(property);
      }
    }

    return venues;
  }

  /**
   * Create a venue property object
   */
  private static createVenueProperty(
    city: City,
    venueType: string,
    config: any,
    location: Location,
    index: number
  ): Property {
    const price = this.randomInRange(config.minPrice, config.maxPrice);
    const capacity = this.randomInRange(config.capacity.min, config.capacity.max);

    return {
      id: '', // Will be set by database
      city_id: city.id,
      property_type_id: config.typeId,
      title: this.generateVenueTitle(venueType, index),
      description: config.description,
      address: location.address || `${index + 1} ${venueType.replace('_', ' ').toUpperCase()} St`,
      city: city.name,
      state: city.state,
      lat: location.lat,
      lng: location.lng,
      sale_status: 'available',
      price,
      property_details: {
        venue_type: venueType,
        generated: true,
      },
      amenities: config.amenities,
      capacity,
      rating: this.randomRating(),
      is_featured: index === 0, // First venue is featured
      visit_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Generate a realistic venue title
   */
  private static generateVenueTitle(venueType: string, index: number): string {
    const prefixes = ['Grand', 'Royal', 'Premier', 'Elite', 'Metro', 'Central', 'Star', 'Prime'];
    const suffixes = ['Central', 'Downtown', 'District', 'Plaza', 'Center', 'Complex', 'Hub', 'Venue'];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const venueName = venueType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

    return `${prefix} ${venueName} ${suffix}`;
  }

  /**
   * Generate a location within an area
   */
  private static async generateLocationInArea(
    area: CommercialArea,
    city: City
  ): Promise<Location | null> {
    try {
      // Generate random coordinates within bounds
      const lat = area.south + Math.random() * (area.north - area.south);
      const lng = area.west + Math.random() * (area.east - area.west);

      // Validate coordinates
      if (!GeocodingService.validateCoordinates(lat, lng)) {
        return this.generateLocationInArea(area, city);
      }

      // Try to get address from reverse geocoding
      let address;
      try {
        const geoResult = await GeocodingService.reverseGeocode(lat, lng);
        address = geoResult.formatted_address;
      } catch (error) {
        // Generate a plausible address
        const streetNumbers = Math.floor(Math.random() * 9999) + 1;
        const streetNames = ['Main', 'Broadway', 'Oak', 'Park', 'Maple', 'Cedar', 'Pine', 'Washington'];
        const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
        address = `${streetNumbers} ${streetName} St, ${city.name}, ${city.state}`;
      }

      return { lat, lng, address };
    } catch (error) {
      console.error('[PropertyGeneratorService] Error generating location:', error);
      return null;
    }
  }

  /**
   * Get commercial areas for a city
   */
  private static async getCommercialAreas(city: City): Promise<CommercialArea[]> {
    // If city has explicit bounds, use those
    if (city.bounds_north && city.bounds_south && city.bounds_east && city.bounds_west) {
      return [
        {
          id: `${city.id}-main`,
          name: `${city.name} Downtown`,
          north: city.bounds_north,
          south: city.bounds_south,
          east: city.bounds_east,
          west: city.bounds_west,
          area_type: 'commercial',
        },
      ];
    }

    // Create a default commercial area around city center
    const radius = 0.05; // ~5km radius
    return [
      {
        id: `${city.id}-main`,
        name: `${city.name} Downtown`,
        north: city.center_lat + radius,
        south: city.center_lat - radius,
        east: city.center_lng + radius,
        west: city.center_lng - radius,
        area_type: 'commercial',
      },
    ];
  }

  /**
   * Bulk create properties
   */
  private static async bulkCreateProperties(properties: Property[]): Promise<Property[]> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert(properties.map(p => ({
          city_id: p.city_id,
          property_type_id: p.property_type_id,
          title: p.title,
          description: p.description,
          address: p.address,
          city: p.city,
          state: p.state,
          lat: p.lat,
          lng: p.lng,
          sale_status: p.sale_status,
          price: p.price,
          property_details: p.property_details,
          amenities: p.amenities,
          capacity: p.capacity,
          rating: p.rating,
          is_featured: p.is_featured,
        })))
        .select();

      if (error) {
        console.error('[PropertyGeneratorService] Error bulk creating properties:', error.message);
        throw new Error(`Failed to create properties: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[PropertyGeneratorService] Error in bulkCreateProperties:', error);
      throw error;
    }
  }

  /**
   * Helper: Random number in range
   */
  private static randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Helper: Random rating (3.5 to 5.0)
   */
  private static randomRating(): number {
    return Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
  }
}