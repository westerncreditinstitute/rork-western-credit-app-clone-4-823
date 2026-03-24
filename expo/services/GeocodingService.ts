// GeocodingService - Convert addresses to coordinates and vice versa

import { GeocodingResult, Location } from '../types/map';

export class GeocodingService {
  private static readonly MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';
  private static readonly BASE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  /**
   * Geocode an address to coordinates
   */
  static async geocodeAddress(address: string): Promise<Location> {
    try {
      const url = `${this.BASE_URL}/${encodeURIComponent(address)}.json?access_token=${this.MAPBOX_ACCESS_TOKEN}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Geocoding failed');
      }

      if (!data.features || data.features.length === 0) {
        throw new Error('No results found for address');
      }

      const feature = data.features[0];
      const [lng, lat] = feature.center;

      return {
        lat,
        lng,
        address: feature.place_name,
      };
    } catch (error) {
      console.error('[GeocodingService] Error geocoding address:', error);
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  static async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
    try {
      const url = `${this.BASE_URL}/${lng},${lat}.json?access_token=${this.MAPBOX_ACCESS_TOKEN}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Reverse geocoding failed');
      }

      if (!data.features || data.features.length === 0) {
        throw new Error('No results found for coordinates');
      }

      const feature = data.features[0];
      const context = feature.context || [];

      const result: GeocodingResult = {
        lat,
        lng,
        formatted_address: feature.place_name,
        street_address: feature.address,
      };

      // Extract city, state, zip from context
      context.forEach((ctx: any) => {
        if (ctx.id.startsWith('place.')) {
          result.city = ctx.text;
        } else if (ctx.id.startsWith('region.')) {
          result.state = ctx.text;
        } else if (ctx.id.startsWith('postcode.')) {
          result.zip_code = ctx.text;
        } else if (ctx.id.startsWith('country.')) {
          result.country = ctx.text;
        }
      });

      return result;
    } catch (error) {
      console.error('[GeocodingService] Error reverse geocoding:', error);
      throw error;
    }
  }

  /**
   * Batch geocode multiple addresses
   */
  static async batchGeocode(addresses: string[]): Promise<Location[]> {
    try {
      // Mapbox doesn't support batch geocoding in free tier, so we'll do parallel requests
      const promises = addresses.map(address => 
        this.geocodeAddress(address).catch(error => {
          console.error(`[GeocodingService] Failed to geocode: ${address}`, error);
          return null;
        })
      );

      const results = await Promise.all(promises);
      return results.filter((result): result is Location => result !== null);
    } catch (error) {
      console.error('[GeocodingService] Error in batch geocoding:', error);
      throw error;
    }
  }

  /**
   * Geocode with fallback to OpenStreetMap (Nominatim)
   */
  static async geocodeWithFallback(address: string): Promise<Location> {
    try {
      // Try Mapbox first
      return await this.geocodeAddress(address);
    } catch (error) {
      console.warn('[GeocodingService] Mapbox failed, trying OpenStreetMap');
      
      // Fallback to OpenStreetMap
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error('No results found');
      }

      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name,
      };
    }
  }

  /**
   * Validate coordinates are within valid ranges
   */
  static validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  /**
   * Convert degrees to radians
   */
  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}