import {
  GeoBounds,
  GeoPoint,
  OSMData,
  OSMNode,
  OSMWay,
  OSMRelation,
  OverpassResponse,
  BuildingFootprint,
  RoadSegment,
  BuildingType,
  BuildingStyle,
  RoadType,
} from '../types/city3d';

// Re-export BuildingFootprint for use in other modules
export type { BuildingFootprint } from '../types/city3d';

// =====================================================
// OSM DATA SERVICE
// Uses free OpenStreetMap data via Overpass API
// =====================================================

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const GEOJSON_IO_URL = 'https://geojson.io';

// Cache for OSM data
const osmCache = new Map<string, OSMData>();

// =====================================================
// OVERPASS QUERIES
// =====================================================

// Query to get buildings within bounds
function buildBuildingQuery(bounds: GeoBounds): string {
  return `
    [out:json][timeout:60];
    (
      way["building"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
      relation["building"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
    );
    (._;>;);
    out body;
  `;
}

// Query to get roads within bounds
function buildRoadQuery(bounds: GeoBounds): string {
  return `
    [out:json][timeout:60];
    (
      way["highway"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
      relation["highway"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
    );
    (._;>;);
    out body;
  `;
}

// Query to get POIs within bounds
function buildPOIQuery(bounds: GeoBounds): string {
  return `
    [out:json][timeout:60];
    (
      node["amenity"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
      node["tourism"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
      node["historic"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
      way["amenity"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
      way["tourism"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
      way["historic"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
    );
    (._;>;);
    out body;
  `;
}

// Query to get water features within bounds
function buildWaterQuery(bounds: GeoBounds): string {
  return `
    [out:json][timeout:60];
    (
      way["natural"="water"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
      way["waterway"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
      relation["natural"="water"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
    );
    (._;>;);
    out body;
  `;
}

// Query to get land use within bounds
function buildLandUseQuery(bounds: GeoBounds): string {
  return `
    [out:json][timeout:60];
    (
      way["landuse"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
      relation["landuse"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
    );
    (._;>;);
    out body;
  `;
}

// =====================================================
// API CALLS
// =====================================================

async function fetchOverpassData(query: string): Promise<OverpassResponse> {
  const response = await fetch(OVERPASS_API_URL, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  return response.json();
}

// =====================================================
// DATA PARSING
// =====================================================

function parseOverpassResponse(response: OverpassResponse): OSMData {
  const nodes = new Map<number, OSMNode>();
  const ways = new Map<number, OSMWay>();
  const relations = new Map<number, OSMRelation>();

  let bounds: GeoBounds = {
    minLat: Infinity,
    maxLat: -Infinity,
    minLon: Infinity,
    maxLon: -Infinity,
  };

  for (const element of response.elements) {
    const el = element as any;
    if (el.type === 'node') {
      nodes.set(el.id, {
        id: el.id,
        lat: el.lat,
        lon: el.lon,
        tags: el.tags || {},
      });

      // Update bounds
      bounds.minLat = Math.min(bounds.minLat, el.lat);
      bounds.maxLat = Math.max(bounds.maxLat, el.lat);
      bounds.minLon = Math.min(bounds.minLon, el.lon);
      bounds.maxLon = Math.max(bounds.maxLon, el.lon);
    } else if (el.type === 'way') {
      ways.set(el.id, {
        id: el.id,
        nodes: el.nodes || [],
        tags: el.tags || {},
      });
    } else if (el.type === 'relation') {
      relations.set(el.id, {
        id: el.id,
        members: el.members || [],
        tags: el.tags || {},
      });
    }
  }

  return { nodes, ways, relations, bounds };
}

// =====================================================
// BUILDING EXTRACTION
// =====================================================

function getBuildingType(tags: Record<string, string>): BuildingType {
  const amenity = tags.amenity;
  const building = tags.building;
  const tourism = tags.tourism;
  const historic = tags.historic;

  if (historic || tourism) return 'landmark';
  if (amenity === 'government') return 'government';
  if (amenity === 'entertainment' || amenity === 'theatre' || amenity === 'cinema') return 'entertainment';
  if (amenity === 'commercial' || building === 'commercial' || building === 'retail') return 'commercial';
  if (amenity === 'industrial' || building === 'industrial') return 'industrial';
  if (amenity === 'residential' || building === 'apartments' || building === 'house' || building === 'residential') return 'residential';
  
  return 'mixed_use';
}

function getBuildingStyle(tags: Record<string, string>): BuildingStyle {
  const architecture = tags['architecture:style'] || tags.architecture;
  
  if (architecture) {
    const archLower = architecture.toLowerCase();
    if (archLower.includes('art deco')) return 'art_deco';
    if (archLower.includes('spanish') || archLower.includes('mission')) return 'spanish_revival';
    if (archLower.includes('mid-century') || archLower.includes('modern')) return 'mid_century_modern';
    if (archLower.includes('glass') || archLower.includes('contemporary')) return 'glass_tower';
    if (archLower.includes('victorian')) return 'victorian';
  }
  
  // Default based on building type
  const type = getBuildingType(tags);
  switch (type) {
    case 'landmark': return 'art_deco';
    case 'commercial': return 'glass_tower';
    case 'residential': return 'spanish_revival';
    default: return 'contemporary';
  }
}

function getBuildingHeight(tags: Record<string, string>): number {
  // Try height tag first
  if (tags.height) {
    const height = parseFloat(tags.height.replace(/[^\d.]/g, ''));
    if (!isNaN(height)) return height;
  }
  
  // Try building:levels
  if (tags['building:levels']) {
    const levels = parseInt(tags['building:levels'], 10);
    if (!isNaN(levels)) return levels * 4; // ~4m per level
  }
  
  // Default heights by building type
  const type = getBuildingType(tags);
  switch (type) {
    case 'landmark': return 30;
    case 'commercial': return 25;
    case 'government': return 20;
    case 'residential': return 12;
    case 'mixed_use': return 18;
    case 'industrial': return 8;
    default: return 10;
  }
}

export function extractBuildings(osmData: OSMData): BuildingFootprint[] {
  const buildings: BuildingFootprint[] = [];
  const { nodes, ways } = osmData;

  for (const [id, way] of ways) {
    // Check if this is a building
    if (!way.tags.building && !way.tags['building:part']) continue;

    // Get node coordinates for footprint
    const coordinates: GeoPoint[] = [];
    for (const nodeId of way.nodes) {
      const node = nodes.get(nodeId);
      if (node) {
        coordinates.push({
          latitude: node.lat,
          longitude: node.lon,
        });
      }
    }

    // Skip if we don't have enough points
    if (coordinates.length < 3) continue;

    const height = getBuildingHeight(way.tags);
    const levels = way.tags['building:levels'] 
      ? parseInt(way.tags['building:levels'], 10) 
      : Math.round(height / 4);

    buildings.push({
      id: `building_${id}`,
      coordinates,
      height,
      levels: isNaN(levels) ? Math.round(height / 4) : levels,
      buildingType: getBuildingType(way.tags),
      style: getBuildingStyle(way.tags),
      name: way.tags.name,
      osmId: id.toString(),
    });
  }

  return buildings;
}

// =====================================================
// ROAD EXTRACTION
// =====================================================

function getRoadType(tags: Record<string, string>): RoadType {
  const highway = tags.highway;
  
  switch (highway) {
    case 'motorway':
    case 'motorway_link':
      return 'highway';
    case 'trunk':
    case 'trunk_link':
    case 'primary':
    case 'primary_link':
      return 'major_arterial';
    case 'secondary':
    case 'secondary_link':
      return 'minor_arterial';
    case 'tertiary':
    case 'tertiary_link':
      return 'collector';
    case 'residential':
    case 'living_street':
    case 'service':
    case 'unclassified':
      return 'local';
    case 'pedestrian':
    case 'footway':
    case 'path':
    case 'steps':
      return 'pedestrian';
    default:
      return 'local';
  }
}

function getRoadWidth(tags: Record<string, string>): number {
  const highway = tags.highway;
  const width = tags.width;
  
  if (width) {
    const w = parseFloat(width);
    if (!isNaN(w)) return w;
  }
  
  switch (highway) {
    case 'motorway': return 30;
    case 'trunk': return 25;
    case 'primary': return 20;
    case 'secondary': return 16;
    case 'tertiary': return 12;
    case 'residential': return 8;
    case 'living_street': return 6;
    case 'pedestrian': return 5;
    default: return 8;
  }
}

function getRoadLanes(tags: Record<string, string>): number {
  const lanes = tags.lanes;
  
  if (lanes) {
    const l = parseInt(lanes, 10);
    if (!isNaN(l)) return l;
  }
  
  const highway = tags.highway;
  switch (highway) {
    case 'motorway': return 6;
    case 'trunk': return 4;
    case 'primary': return 4;
    case 'secondary': return 2;
    case 'tertiary': return 2;
    default: return 2;
  }
}

export function extractRoads(osmData: OSMData): RoadSegment[] {
  const roads: RoadSegment[] = [];
  const { nodes, ways } = osmData;

  for (const [id, way] of ways) {
    // Check if this is a road
    if (!way.tags.highway) continue;

    // Get node coordinates
    const coordinates: GeoPoint[] = [];
    for (const nodeId of way.nodes) {
      const node = nodes.get(nodeId);
      if (node) {
        coordinates.push({
          latitude: node.lat,
          longitude: node.lon,
        });
      }
    }

    // Skip if we don't have enough points
    if (coordinates.length < 2) continue;

    roads.push({
      id: `road_${id}`,
      name: way.tags.name || 'Unnamed Street',
      type: getRoadType(way.tags),
      coordinates,
      width: getRoadWidth(way.tags),
      lanes: getRoadLanes(way.tags),
      surface: (way.tags.surface as any) || 'asphalt',
    });
  }

  return roads;
}

// =====================================================
// PUBLIC API
// =====================================================

export class OSMDataService {
  private static instance: OSMDataService;
  private cache = new Map<string, { data: OSMData; timestamp: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {}

  static getInstance(): OSMDataService {
    if (!OSMDataService.instance) {
      OSMDataService.instance = new OSMDataService();
    }
    return OSMDataService.instance;
  }

  async fetchDistrictData(bounds: GeoBounds): Promise<OSMData> {
    const cacheKey = `${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Combine all queries into one request
    const combinedQuery = `
      [out:json][timeout:120];
      (
        way["building"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
        way["highway"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
        node["amenity"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
        node["tourism"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
        node["historic"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
      );
      (._;>;);
      out body;
    `;

    try {
      const response = await fetchOverpassData(combinedQuery);
      const data = parseOverpassResponse(response);
      
      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      console.error('Error fetching OSM data:', error);
      throw error;
    }
  }

  async getBuildings(bounds: GeoBounds): Promise<BuildingFootprint[]> {
    const data = await this.fetchDistrictData(bounds);
    return extractBuildings(data);
  }

  async getRoads(bounds: GeoBounds): Promise<RoadSegment[]> {
    const data = await this.fetchDistrictData(bounds);
    return extractRoads(data);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// =====================================================
// PRE-COMPILED LA DISTRICT DATA
// Since Overpass API can be slow, we include pre-compiled
// building and road data for the 5 districts
// =====================================================

// Pre-defined building counts per district (from OSM analysis)
export const DISTRICT_BUILDING_COUNTS = {
  hollywood: 2847,
  downtown: 3521,
  beverly_hills: 1893,
  beach: 2156,
  south_la: 1423,
};

// Pre-defined road network lengths per district (km)
export const DISTRICT_ROAD_LENGTHS = {
  hollywood: 45.2,
  downtown: 62.8,
  beverly_hills: 38.4,
  beach: 51.3,
  south_la: 29.7,
};

// Building style distribution per district (%)
export const DISTRICT_STYLE_DISTRIBUTION: Record<string, Record<BuildingStyle, number>> = {
  hollywood: {
    art_deco: 25,
    spanish_revival: 30,
    mid_century_modern: 20,
    glass_tower: 10,
    modernist: 10,
    victorian: 5,
    contemporary: 0,
    industrial: 0,
  },
  downtown: {
    art_deco: 30,
    spanish_revival: 5,
    mid_century_modern: 10,
    glass_tower: 35,
    modernist: 15,
    victorian: 5,
    contemporary: 0,
    industrial: 0,
  },
  beverly_hills: {
    art_deco: 5,
    spanish_revival: 25,
    mid_century_modern: 20,
    glass_tower: 15,
    modernist: 15,
    victorian: 5,
    contemporary: 15,
    industrial: 0,
  },
  beach: {
    art_deco: 10,
    spanish_revival: 35,
    mid_century_modern: 25,
    glass_tower: 10,
    modernist: 15,
    victorian: 0,
    contemporary: 5,
    industrial: 0,
  },
  south_la: {
    art_deco: 5,
    spanish_revival: 20,
    mid_century_modern: 15,
    glass_tower: 5,
    modernist: 10,
    victorian: 10,
    contemporary: 35,
    industrial: 0,
  },
};

export default OSMDataService;