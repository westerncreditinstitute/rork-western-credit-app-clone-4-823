// OpenStreetMap Data Service for 3D City Generation
// Uses Overpass API for free map data extraction
// Based on 3D_LA_Open_World_Guide.md - Approach B

import { 
  DistrictId, 
  BuildingFootprint, 
  BuildingStyle, 
  BuildingType,
  OSMData,
  OSMNode,
  OSMWay,
  OSMRelation,
  RoadSegment
} from '../types/city3d';

const OVERPASS_API_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

// District building counts for procedural generation
export const DISTRICT_BUILDING_COUNTS: Record<DistrictId, number> = {
  hollywood: 450,
  westside: 380,
  downtown: 600,
  culture: 320,
  glamour: 280
};

// Building style distribution by district
export const DISTRICT_STYLE_DISTRIBUTION: Record<DistrictId, Record<BuildingStyle, number>> = {
  hollywood: {
    art_deco: 0.25,
    mid_century_modern: 0.20,
    spanish_colonial: 0.15,
    craftsman: 0.10,
    victorian: 0.05,
    beaux_arts: 0.10,
    googie: 0.10,
    contemporary: 0.03,
    brutalist: 0.01,
    industrial: 0.01
  },
  westside: {
    contemporary: 0.30,
    spanish_colonial: 0.25,
    craftsman: 0.15,
    mid_century_modern: 0.15,
    victorian: 0.05,
    art_deco: 0.03,
    beaux_arts: 0.02,
    googie: 0.02,
    brutalist: 0.02,
    industrial: 0.01
  },
  downtown: {
    beaux_arts: 0.25,
    art_deco: 0.25,
    brutalist: 0.20,
    contemporary: 0.15,
    mid_century_modern: 0.05,
    spanish_colonial: 0.03,
    craftsman: 0.02,
    victorian: 0.02,
    googie: 0.02,
    industrial: 0.01
  },
  culture: {
    contemporary: 0.30,
    mid_century_modern: 0.20,
    spanish_colonial: 0.15,
    craftsman: 0.12,
    art_deco: 0.10,
    beaux_arts: 0.05,
    victorian: 0.03,
    brutalist: 0.02,
    googie: 0.02,
    industrial: 0.01
  },
  glamour: {
    spanish_colonial: 0.30,
    contemporary: 0.25,
    mid_century_modern: 0.15,
    victorian: 0.10,
    beaux_arts: 0.05,
    craftsman: 0.05,
    art_deco: 0.05,
    brutalist: 0.02,
    googie: 0.02,
    industrial: 0.01
  }
};

// Building type distribution by district
export const DISTRICT_TYPE_DISTRIBUTION: Record<DistrictId, Record<BuildingType, number>> = {
  hollywood: {
    residential: 0.50,
    commercial: 0.35,
    industrial: 0.05,
    landmark: 0.05,
    mixed_use: 0.05
  },
  westside: {
    residential: 0.55,
    commercial: 0.25,
    industrial: 0.05,
    landmark: 0.05,
    mixed_use: 0.10
  },
  downtown: {
    residential: 0.30,
    commercial: 0.40,
    industrial: 0.05,
    landmark: 0.10,
    mixed_use: 0.15
  },
  culture: {
    residential: 0.40,
    commercial: 0.35,
    industrial: 0.05,
    landmark: 0.15,
    mixed_use: 0.05
  },
  glamour: {
    residential: 0.65,
    commercial: 0.20,
    industrial: 0.02,
    landmark: 0.08,
    mixed_use: 0.05
  }
};

class OSMDataService {
  private cache: Map<string, OSMData> = new Map();
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  /**
   * Fetch OSM data for a district using Overpass API
   */
  async fetchDistrictData(districtId: DistrictId, bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }): Promise<OSMData> {
    const cacheKey = `${districtId}-${bounds.minLat}-${bounds.maxLat}-${bounds.minLon}-${bounds.maxLon}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Build Overpass query
    const query = this.buildOverpassQuery(bounds);
    
    try {
      const response = await this.executeOverpassQuery(query);
      const osmData = this.parseOSMResponse(response);
      
      // Cache the result
      this.cache.set(cacheKey, osmData);
      
      return osmData;
    } catch (error) {
      console.error('OSM data fetch failed:', error);
      throw error;
    }
  }

  /**
   * Build Overpass QL query for building and road data
   */
  private buildOverpassQuery(bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }): string {
    const { minLat, maxLat, minLon, maxLon } = bounds;
    
    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;
    const clampedMinLat = minLat + latRange * 0.25;
    const clampedMaxLat = maxLat - latRange * 0.25;
    const clampedMinLon = minLon + lonRange * 0.25;
    const clampedMaxLon = maxLon - lonRange * 0.25;

    return `
      [out:json][timeout:90][maxsize:10485760];
      (
        way["building"](${clampedMinLat},${clampedMinLon},${clampedMaxLat},${clampedMaxLon});
        way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential)$"](${clampedMinLat},${clampedMinLon},${clampedMaxLat},${clampedMaxLon});
        node["amenity"~"^(theatre|cinema|restaurant|cafe|bar|hospital|school|university)$"](${clampedMinLat},${clampedMinLon},${clampedMaxLat},${clampedMaxLon});
        node["tourism"](${clampedMinLat},${clampedMinLon},${clampedMaxLat},${clampedMaxLon});
      );
      out body;
      >;
      out skel qt;
    `;
  }

  /**
   * Execute Overpass API query with rate limiting
   */
  private async executeOverpassQuery(query: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        let lastError: Error | null = null;

        for (let urlIndex = 0; urlIndex < OVERPASS_API_URLS.length; urlIndex++) {
          const apiUrl = OVERPASS_API_URLS[urlIndex];

          for (let retry = 0; retry <= MAX_RETRIES; retry++) {
            try {
              if (retry > 0) {
                console.log(`[OSMDataService] Retry ${retry}/${MAX_RETRIES} for ${apiUrl}`);
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS * retry));
              }

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 90000);

              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `data=${encodeURIComponent(query)}`,
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (response.status === 429 || response.status === 504 || response.status === 503) {
                console.warn(`[OSMDataService] ${apiUrl} returned ${response.status}, trying next...`);
                lastError = new Error(`Overpass API error: ${response.status}`);
                break;
              }

              if (!response.ok) {
                lastError = new Error(`Overpass API error: ${response.status}`);
                continue;
              }

              const data = await response.json();
              console.log(`[OSMDataService] Successfully fetched from ${apiUrl}`);
              resolve(data);
              return;
            } catch (error: any) {
              console.warn(`[OSMDataService] Request failed for ${apiUrl}:`, error?.message);
              lastError = error instanceof Error ? error : new Error(String(error));
            }
          }
        }

        reject(lastError ?? new Error('All Overpass API endpoints failed'));
      });

      void this.processQueue();
    });
  }

  /**
   * Process request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await request();
        // Wait 1 second between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Parse OSM API response into structured data
   */
  private parseOSMResponse(response: any): OSMData {
    const nodes = new Map<number, OSMNode>();
    const ways = new Map<number, OSMWay>();
    const relations = new Map<number, OSMRelation>();

    for (const element of response.elements) {
      switch (element.type) {
        case 'node':
          nodes.set(element.id, {
            id: element.id,
            lat: element.lat,
            lon: element.lon,
            tags: element.tags
          });
          break;
        case 'way':
          ways.set(element.id, {
            id: element.id,
            nodes: element.nodes || [],
            tags: element.tags
          });
          break;
        case 'relation':
          relations.set(element.id, {
            id: element.id,
            members: element.members || [],
            tags: element.tags
          });
          break;
      }
    }

    return { nodes, ways, relations };
  }

  /**
   * Extract building footprints from OSM data
   */
  extractBuildingFootprints(osmData: OSMData): BuildingFootprint[] {
    const footprints: BuildingFootprint[] = [];
    const { nodes, ways } = osmData;

    for (const [id, way] of ways) {
      if (!way.tags?.building) continue;

      // Get coordinates for all nodes in the way
      const coordinates: Array<[number, number]> = [];
      for (const nodeId of way.nodes) {
        const node = nodes.get(nodeId);
        if (node) {
          coordinates.push([node.lon, node.lat]);
        }
      }

      // Close the polygon if not already closed
      if (coordinates.length > 0 && 
          (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
           coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
        coordinates.push(coordinates[0]);
      }

      // Parse building properties
      const height = this.parseHeight(way.tags);
      const levels = this.parseLevels(way.tags);
      const type = this.determineBuildingType(way.tags);
      const style = this.determineBuildingStyle(way.tags);

      footprints.push({
        id: `building-${id}`,
        coordinates,
        height,
        levels,
        type,
        style,
        address: way.tags?.['addr:street'] 
          ? `${way.tags['addr:housenumber'] || ''} ${way.tags['addr:street']}`.trim()
          : undefined,
        name: way.tags?.name
      });
    }

    return footprints;
  }

  /**
   * Extract road segments from OSM data
   */
  extractRoadSegments(osmData: OSMData): RoadSegment[] {
    const roads: RoadSegment[] = [];
    const { nodes, ways } = osmData;

    for (const [id, way] of ways) {
      if (!way.tags?.highway) continue;

      const coordinates: Array<[number, number]> = [];
      for (const nodeId of way.nodes) {
        const node = nodes.get(nodeId);
        if (node) {
          coordinates.push([node.lon, node.lat]);
        }
      }

      roads.push({
        id: `road-${id}`,
        type: this.determineRoadType(way.tags.highway),
        coordinates,
        width: this.determineRoadWidth(way.tags),
        lanes: parseInt(way.tags?.lanes || '2'),
        surface: this.determineRoadSurface(way.tags)
      });
    }

    return roads;
  }

  /**
   * Parse building height from OSM tags
   */
  private parseHeight(tags: Record<string, string> = {}): number {
    if (tags.height) {
      // Parse height string (e.g., "50m", "150ft")
      const match = tags.height.match(/^(\d+\.?\d*)\s*(m|ft)?$/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2]?.toLowerCase();
        return unit === 'ft' ? value * 0.3048 : value;
      }
    }
    
    // Estimate from levels if height not specified
    const levels = this.parseLevels(tags);
    return levels * 3.5; // Average 3.5m per level
  }

  /**
   * Parse building levels from OSM tags
   */
  private parseLevels(tags: Record<string, string> = {}): number {
    if (tags['building:levels']) {
      return parseInt(tags['building:levels']) || 3;
    }
    return 3; // Default
  }

  /**
   * Determine building type from OSM tags
   */
  private determineBuildingType(tags: Record<string, string> = {}): BuildingType {
    if (tags.building === 'residential' || tags.building === 'apartments' || tags.building === 'house') {
      return 'residential';
    }
    if (tags.building === 'commercial' || tags.building === 'retail' || tags.building === 'office') {
      return 'commercial';
    }
    if (tags.building === 'industrial' || tags.building === 'warehouse') {
      return 'industrial';
    }
    if (tags.tourism || tags.amenity === 'theatre' || tags.historic) {
      return 'landmark';
    }
    if (tags.building === 'mixed_use') {
      return 'mixed_use';
    }
    
    // Guess from other tags
    if (tags.shop || tags.office) return 'commercial';
    if (tags.residential) return 'residential';
    
    return 'commercial'; // Default for downtown areas
  }

  /**
   * Determine building architectural style from OSM tags
   */
  private determineBuildingStyle(tags: Record<string, string> = {}): BuildingStyle {
    const archTags = [
      tags['architectural:style'],
      tags.architecture,
      tags['building:architecture']
    ].filter(Boolean);

    for (const tag of archTags) {
      const archLower = tag.toLowerCase();
      
      if (archLower.includes('art deco') || archLower.includes('art_deco')) {
        return 'art_deco';
      }
      if (archLower.includes('mid-century') || archLower.includes('modern')) {
        return 'mid_century_modern';
      }
      if (archLower.includes('spanish') || archLower.includes('mediterranean')) {
        return 'spanish_colonial';
      }
      if (archLower.includes('craftsman') || archLower.includes('bungalow')) {
        return 'craftsman';
      }
      if (archLower.includes('victorian')) {
        return 'victorian';
      }
      if (archLower.includes('beaux') || archLower.includes('beaux-arts')) {
        return 'beaux_arts';
      }
      if (archLower.includes('googie')) {
        return 'googie';
      }
      if (archLower.includes('contemporary') || archLower.includes('glass')) {
        return 'contemporary';
      }
      if (archLower.includes('brutalist') || archLower.includes('concrete')) {
        return 'brutalist';
      }
      if (archLower.includes('industrial')) {
        return 'industrial';
      }
    }

    // Default based on building type
    return 'contemporary';
  }

  /**
   * Determine road type from OSM highway tag
   */
  private determineRoadType(highway: string): RoadSegment['type'] {
    switch (highway) {
      case 'motorway':
      case 'trunk':
        return 'highway';
      case 'primary':
      case 'secondary':
      case 'tertiary':
        return 'major';
      case 'residential':
      case 'living_street':
      case 'service':
        return 'residential';
      default:
        return 'minor';
    }
  }

  /**
   * Determine road width from OSM tags
   */
  private determineRoadWidth(tags: Record<string, string> = {}): number {
    if (tags.width) {
      return parseFloat(tags.width) || 10;
    }
    
    // Estimate from highway type and lanes
    const lanes = parseInt(tags.lanes || '2');
    return lanes * 3.5; // 3.5m per lane
  }

  /**
   * Determine road surface from OSM tags
   */
  private determineRoadSurface(tags: Record<string, string> = {}): RoadSegment['surface'] {
    const surface = tags.surface?.toLowerCase();
    
    if (surface === 'asphalt' || surface === 'paved') return 'asphalt';
    if (surface === 'concrete') return 'concrete';
    if (surface === 'brick' || surface === 'paving_stones') return 'brick';
    
    return 'asphalt'; // Default
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const osmDataService = new OSMDataService();
export default osmDataService;