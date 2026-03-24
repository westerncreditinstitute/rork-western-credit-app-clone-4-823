// 3D City Types for Los Angeles Scavenger Hunt
// Based on 3D_LA_Open_World_Guide.md - Approach B with Curated District Hub Model

// =====================================================
// CORE GEOMETRY TYPES
// =====================================================

export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitude?: number; // meters above sea level
}

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// =====================================================
// DISTRICT CONFIGURATION
// =====================================================

export type DistrictId = 
  | 'hollywood'
  | 'downtown'
  | 'beverly_hills'
  | 'beach'
  | 'south_la';

export interface DistrictConfig {
  id: DistrictId;
  name: string;
  displayName: string;
  description: string;
  
  // Geographic bounds (real LA coordinates)
  bounds: GeoBounds;
  
  // Center point for district
  center: GeoPoint;
  
  // Size in km² (following Curated District Hub Model)
  sizeKm2: number;
  
  // Distance compression ratio (10:1 as recommended)
  compressionRatio: number;
  
  // Terrain characteristics
  terrain: {
    type: 'flat' | 'hilly' | 'coastal' | 'mixed';
    avgElevation: number; // meters
    elevationRange: [number, number];
  };
  
  // Visual theme
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    buildingStyle: BuildingStyle[];
    vegetationType: VegetationType[];
  };
  
  // Landmarks in this district
  landmarks: LandmarkConfig[];
  
  // Road network style
  roadStyle: {
    primaryRoads: string[];
    gridPattern: 'grid' | 'organic' | 'mixed';
  };
}

export type BuildingStyle = 
  | 'spanish_revival'
  | 'art_deco'
  | 'mid_century_modern'
  | 'glass_tower'
  | 'modernist'
  | 'victorian'
  | 'contemporary'
  | 'industrial';

export type VegetationType = 
  | 'palm_trees'
  | 'oak_trees'
  | 'grass'
  | 'succulents'
  | 'coastal_scrub';

// =====================================================
// LANDMARK CONFIGURATION
// =====================================================

export type LandmarkRarity = 
  | 'legendary' 
  | 'epic' 
  | 'rare';

export interface LandmarkConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  
  // Real-world GPS coordinates
  coordinates: GeoPoint;
  
  // Game-world position (after compression)
  gamePosition: Vector3;
  
  // Scavenger hunt properties
  rarity: LandmarkRarity;
  treasureValue: number; // MUSO tokens
  
  // 3D model reference
  modelConfig: {
    modelId: string;
    scale: number;
    rotationY: number;
    hasInterior: boolean;
    lodLevels: LODConfig[];
  };
  
  // Discovery mechanics
  discovery: {
    visibleFromDistance: number; // meters
    beaconEffect: boolean;
    audioCue?: string;
    riddle?: string;
  };
  
  // Photo reference for modeling
  photoReferences: string[];
  
  // Historical/educational info
  lore: {
    founded?: string;
    historicalSignificance: string;
    funFacts: string[];
  };
}

export interface LODConfig {
  level: 'high' | 'medium' | 'low' | 'billboard';
  distance: number; // meters from player
  triangleCount: number;
  textureResolution: number;
}

// =====================================================
// BUILDING GENERATION
// =====================================================

export interface BuildingFootprint {
  id: string;
  coordinates: GeoPoint[]; // polygon vertices
  height: number; // meters
  levels: number;
  buildingType: BuildingType;
  style: BuildingStyle;
  name?: string;
  osmId?: string;
}

export type BuildingType = 
  | 'commercial'
  | 'residential'
  | 'mixed_use'
  | 'industrial'
  | 'government'
  | 'entertainment'
  | 'landmark';

export interface ProceduralBuilding {
  id: string;
  footprint: GeoPoint[];
  baseHeight: number;
  roofHeight: number;
  roofType: RoofType;
  facadeStyle: BuildingStyle;
  windowPattern: WindowPattern;
  color: string;
  position: Vector3;
  rotation: number;
  scale: Vector3;
}

export type RoofType = 
  | 'flat' 
  | 'pitched' 
  | 'domed' 
  | 'stepped'
  | 'modern_curved';

export interface WindowPattern {
  rows: number;
  columns: number;
  style: 'modern_rectangular' | 'arched' | 'horizontal_strip' | 'punched_opening';
  tint: string;
}

// =====================================================
// ROAD NETWORK
// =====================================================

export interface RoadSegment {
  id: string;
  name: string;
  type: RoadType;
  coordinates: GeoPoint[];
  width: number; // meters
  lanes: number;
  surface: 'asphalt' | 'concrete' | 'brick' | 'mixed';
}

export type RoadType = 
  | 'highway'
  | 'major_arterial'
  | 'minor_arterial'
  | 'collector'
  | 'local'
  | 'pedestrian';

// =====================================================
// TERRAIN & ELEVATION
// =====================================================

export interface TerrainTile {
  id: string;
  bounds: GeoBounds;
  resolution: number; // meters per pixel
  elevationData: number[][]; // 2D height map
  textureUrl?: string;
}

export interface TerrainConfig {
  source: 'usgs_3dep' | 'srtm' | 'custom';
  resolution: number;
  verticalExaggeration: number;
  seaLevel: number;
}

// =====================================================
// OSM DATA STRUCTURES
// =====================================================

export interface OSMNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

export interface OSMWay {
  id: number;
  nodes: number[];
  tags: Record<string, string>;
}

export interface OSMRelation {
  id: number;
  members: Array<{
    type: 'node' | 'way' | 'relation';
    ref: number;
    role: string;
  }>;
  tags: Record<string, string>;
}

export interface OSMData {
  nodes: Map<number, OSMNode>;
  ways: Map<number, OSMWay>;
  relations: Map<number, OSMRelation>;
  bounds: GeoBounds;
}

// =====================================================
// 3D SCENE CONFIGURATION
// =====================================================

export interface Scene3DConfig {
  // Camera settings
  camera: {
    fov: number;
    near: number;
    far: number;
    initialPosition: Vector3;
    initialTarget: Vector3;
  };
  
  // Lighting
  lighting: {
    ambientIntensity: number;
    sunDirection: Vector3;
    sunIntensity: number;
    shadowQuality: 'low' | 'medium' | 'high';
  };
  
  // LOD distances
  lodDistances: {
    high: number;
    medium: number;
    low: number;
    billboard: number;
  };
  
  // Performance
  performance: {
    maxDrawCalls: number;
    maxTriangles: number;
    targetFPS: number;
    enableShadows: boolean;
    enableReflections: boolean;
  };
  
  // Map projection
  projection: {
    origin: GeoPoint; // LA center point
    crs: 'wgs84' | 'web_mercator' | 'utm';
  };
}

// =====================================================
// CITY STATE (for React context)
// =====================================================

export interface City3DState {
  // Current district
  currentDistrict: DistrictId | null;
  
  // Loaded districts
  loadedDistricts: Set<DistrictId>;
  
  // Player position
  playerPosition: Vector3;
  playerGeoPosition: GeoPoint;
  
  // Visible landmarks
  visibleLandmarks: string[];
  
  // Discovered landmarks
  discoveredLandmarks: Set<string>;
  
  // Loading state
  isLoading: boolean;
  loadingProgress: number;
  
  // Performance metrics
  fps: number;
  drawCalls: number;
  triangleCount: number;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: Array<OSMNode | OSMWay | OSMRelation>;
}

export interface ElevationResponse {
  results: Array<{
    location: {
      lat: number;
      lng: number;
    };
    elevation: number;
  }>;
}

// =====================================================
// CONSTANTS
// =====================================================

// LA Center point for coordinate projection
export const LA_CENTER: GeoPoint = {
  latitude: 34.0522,
  longitude: -118.2437,
  altitude: 93, // ~305 feet average
};

// Distance compression ratio (Curated District Hub Model)
export const DISTANCE_COMPRESSION = 10; // 10:1 ratio

// Total playable area
export const TOTAL_PLAYABLE_AREA_KM2 = 5;

// LOD distances (from guide)
export const LOD_DISTANCES = {
  high: 50,      // 0-50m: full detail
  medium: 200,   // 50-200m: simplified
  low: 500,      // 200-500m: extruded boxes
  billboard: 500, // 500m+: 2D sprites
};

// Platform-specific targets (mobile-focused for React Native)
export const PERFORMANCE_TARGETS = {
  mobile: {
    targetFPS: 30,
    maxTriangles: 500000,
    maxDrawCalls: 500,
    textureBudget: 512 * 1024 * 1024, // 512 MB
  },
  highEnd: {
    targetFPS: 60,
    maxTriangles: 2000000,
    maxDrawCalls: 1000,
    textureBudget: 1024 * 1024 * 1024, // 1 GB
  },
};