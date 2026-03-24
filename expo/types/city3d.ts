// 3D City Generation Types for Credit Life Simulator
// Based on 3D_LA_Open_World_Guide.md - Approach B: OpenStreetMap + Procedural Generation

// Core District Types
export type DistrictId = 'hollywood' | 'westside' | 'downtown' | 'culture' | 'glamour';

export interface DistrictConfig {
  id: DistrictId;
  name: string;
  description: string;
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  center: {
    lat: number;
    lon: number;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    terrainColor: string;
    buildingStyle: BuildingStyle[];
  };
  terrain: {
    elevation: number;
    hilliness: number;
    vegetation: number;
    waterFeatures: boolean;
  };
  landmarks: LandmarkConfig[];
  // Curated District Hub Model - ~5 km² per district
  areaKm2: number;
  compressionRatio: number; // 10:1 compression as per guide
}

export interface LandmarkConfig {
  id: string;
  name: string;
  type: 'landmark' | 'hidden_gem' | 'treasure_spot';
  coordinates: {
    lat: number;
    lon: number;
  };
  model3D?: string; // GLTF/GLB file path
  scale: number;
  rotation: number;
  treasureValue?: number;
  riddle?: string;
  historicalLore?: string;
  discovered: boolean;
  photoOp: boolean;
  // LOD settings from guide
  lodDistances: {
    high: number;  // 0-50m
    medium: number; // 50-200m
    low: number;    // 200-500m
    billboard: number; // 500m+
  };
}

export interface BuildingFootprint {
  id: string;
  coordinates: Array<[number, number]>;
  height: number;
  levels: number;
  type: BuildingType;
  style: BuildingStyle;
  address?: string;
  name?: string;
}

export type BuildingType = 'residential' | 'commercial' | 'industrial' | 'landmark' | 'mixed_use';

export type BuildingStyle = 
  | 'art_deco'
  | 'mid_century_modern'
  | 'spanish_colonial'
  | 'craftsman'
  | 'victorian'
  | 'beaux_arts'
  | 'googie'
  | 'contemporary'
  | 'brutalist'
  | 'industrial';

export interface ProceduralBuilding {
  id: string;
  position: [number, number, number];
  rotation: number;
  scale: [number, number, number];
  style: BuildingStyle;
  type: BuildingType;
  footprint: Array<[number, number]>;
  height: number;
  levels: number;
  color: string;
  roofType: 'flat' | 'pitched' | 'domed' | 'stepped';
  windowStyle: 'modern' | 'traditional' | 'industrial' | 'art_deco';
  details: BuildingDetail[];
  lod: LODVariant[];
}

export interface BuildingDetail {
  type: 'awning' | 'balcony' | 'fire_escape' | 'ac_unit' | 'antenna' | 'signage';
  position: [number, number, number];
  scale: [number, number, number];
  rotation: number;
}

export interface LODVariant {
  level: 'high' | 'medium' | 'low' | 'billboard';
  meshComplexity: number; // polygon count
  textureResolution: number;
  drawDistance: number;
}

export interface TerrainTile {
  id: string;
  coordinates: {
    x: number;
    y: number;
  };
  elevation: number[][];
  resolution: number;
  dataSource: 'usgs_3dep' | 'procedural';
  vegetation: VegetationInstance[];
  roads: RoadSegment[];
}

export interface VegetationInstance {
  id: string;
  type: 'palm_tree' | 'oak_tree' | 'shrub' | 'grass';
  position: [number, number, number];
  scale: number;
  rotation: number;
  lod: LODVariant[];
}

export interface RoadSegment {
  id: string;
  type: 'highway' | 'major' | 'minor' | 'residential';
  coordinates: Array<[number, number]>;
  width: number;
  lanes: number;
  surface: 'asphalt' | 'concrete' | 'brick';
}

// OSM Data Types
export interface OSMNode {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OSMWay {
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}

export interface OSMRelation {
  id: number;
  members: Array<{ type: 'node' | 'way' | 'relation'; ref: number; role: string }>;
  tags?: Record<string, string>;
}

export interface OSMData {
  nodes: Map<number, OSMNode>;
  ways: Map<number, OSMWay>;
  relations: Map<number, OSMRelation>;
}

// Generation Settings
export interface GenerationSettings {
  districtId: DistrictId;
  radius: number; // meters
  detailLevel: 'low' | 'medium' | 'high';
  includeTerrain: boolean;
  includeBuildings: boolean;
  includeRoads: boolean;
  includeVegetation: boolean;
  includeLandmarks: boolean;
  proceduralFallback: boolean;
}

// Performance Targets from Guide
export const PERFORMANCE_TARGETS = {
  maxPolygonsPerDistrict: 500000,
  maxDrawCalls: 100,
  targetFPS: 60,
  maxMemoryMB: 512,
  streamingRadiusMeters: 1000,
  lodDistances: {
    high: 50,
    medium: 200,
    low: 500,
    billboard: 2000
  }
} as const;

// LOD Distances from Guide
export const LOD_DISTANCES = {
  HIGH: 50,      // Full detail, all features
  MEDIUM: 200,   // Reduced geometry, baked lighting
  LOW: 500,      // Simple shapes, no small details
  BILLBOARD: 2000 // Impostor sprites for distant views
} as const;

// District Metadata
export const DISTRICT_METADATA: Record<DistrictId, { 
  areaKm2: number; 
  compressionRatio: number;
  landmarkCount: number;
}> = {
  hollywood: { areaKm2: 5.2, compressionRatio: 10, landmarkCount: 4 },
  westside: { areaKm2: 4.8, compressionRatio: 10, landmarkCount: 4 },
  downtown: { areaKm2: 5.0, compressionRatio: 10, landmarkCount: 4 },
  culture: { areaKm2: 4.5, compressionRatio: 10, landmarkCount: 4 },
  glamour: { areaKm2: 5.5, compressionRatio: 10, landmarkCount: 4 }
};