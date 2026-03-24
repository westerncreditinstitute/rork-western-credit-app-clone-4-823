import { GeoBounds, GeoPoint, TerrainTile, TerrainConfig, DistrictConfig } from '../types/city3d';

// =====================================================
// TERRAIN SERVICE
// Uses free USGS 3DEP elevation data for LA terrain
// =====================================================

// USGS 3DEP API endpoint (free)
const USGS_3DEP_URL = 'https://apps.nationalmap.gov/arcgis/services/3DEPElevation/ImageServer/WMSC';

// OpenTopography API (free tier available)
const OPEN_TOPO_URL = 'https://api.opentopography.org/v1';

// SRTM 30m resolution (free via NASA)
const SRTM_URL = 'https://srtm.csi.cgiar.org/wp-content/uploads/files/srtm_5x5/TIFF/srtm';

// =====================================================
// LA-SPECIFIC TERRAIN CHARACTERISTICS
// =====================================================

// Pre-defined terrain features for LA districts
export const LA_TERRAIN_FEATURES = {
  // Hollywood Hills - significant elevation
  hollywood_hills: {
    type: 'mountainous' as const,
    peakElevation: 500, // meters (Mt. Lee area)
    avgSlope: 15, // degrees
    features: ['ridge', 'valley', 'slope'],
  },
  
  // Santa Monica Mountains
  santa_monica_mtns: {
    type: 'mountainous' as const,
    peakElevation: 450,
    avgSlope: 12,
    features: ['ridge', 'canyon'],
  },
  
  // Coastal bluffs
  venice_coastal: {
    type: 'coastal' as const,
    peakElevation: 30,
    avgSlope: 3,
    features: ['beach', 'bluff'],
  },
  
  // Downtown basin - flat
  downtown_basin: {
    type: 'flat' as const,
    peakElevation: 100,
    avgSlope: 1,
    features: ['basin'],
  },
  
  // Beverly Hills - gentle hills
  beverly_hills: {
    type: 'rolling' as const,
    peakElevation: 150,
    avgSlope: 5,
    features: ['gentle_slope'],
  },
};

// =====================================================
// ELEVATION INTERPOLATION
// =====================================================

// Bilinear interpolation for elevation
function bilinearInterpolate(
  x: number,
  z: number,
  elevations: number[][],
  resolution: number
): number {
  const xIndex = x / resolution;
  const zIndex = z / resolution;
  
  const x0 = Math.floor(xIndex);
  const z0 = Math.floor(zIndex);
  const x1 = Math.min(x0 + 1, elevations[0].length - 1);
  const z1 = Math.min(z0 + 1, elevations.length - 1);
  
  const xFrac = xIndex - x0;
  const zFrac = zIndex - z0;
  
  // Get four corner values
  const e00 = elevations[z0]?.[x0] ?? 0;
  const e10 = elevations[z0]?.[x1] ?? 0;
  const e01 = elevations[z1]?.[x0] ?? 0;
  const e11 = elevations[z1]?.[x1] ?? 0;
  
  // Bilinear interpolation
  const e0 = e00 * (1 - xFrac) + e10 * xFrac;
  const e1 = e01 * (1 - xFrac) + e11 * xFrac;
  
  return e0 * (1 - zFrac) + e1 * zFrac;
}

// =====================================================
// PROCEDURAL TERRAIN GENERATION
// For areas without detailed elevation data
// =====================================================

interface NoiseParams {
  frequency: number;
  amplitude: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
}

// Simple Perlin-like noise (simplified for mobile)
class PerlinNoise {
  private permutation: number[];
  
  constructor(seed: number = 0) {
    this.permutation = this.generatePermutation(seed);
  }
  
  private generatePermutation(seed: number): number[] {
    const perm = Array.from({ length: 256 }, (_, i) => i);
    // Simple shuffle with seed
    const rng = this.seededRandom(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    return [...perm, ...perm];
  }
  
  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }
  
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }
  
  private grad(hash: number, x: number, z: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : z;
    const v = h < 4 ? z : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  }
  
  noise2D(x: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Z = Math.floor(z) & 255;
    
    x -= Math.floor(x);
    z -= Math.floor(z);
    
    const u = this.fade(x);
    const v = this.fade(z);
    
    const A = this.permutation[X] + Z;
    const B = this.permutation[X + 1] + Z;
    
    return this.lerp(
      this.lerp(
        this.grad(this.permutation[A], x, z),
        this.grad(this.permutation[B], x - 1, z),
        u
      ),
      this.lerp(
        this.grad(this.permutation[A + 1], x, z - 1),
        this.grad(this.permutation[B + 1], x - 1, z - 1),
        u
      ),
      v
    );
  }
  
  fbm(x: number, z: number, params: NoiseParams): number {
    let value = 0;
    let amplitude = params.amplitude;
    let frequency = params.frequency;
    
    for (let i = 0; i < params.octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, z * frequency);
      amplitude *= params.persistence;
      frequency *= params.lacunarity;
    }
    
    return value;
  }
}

// =====================================================
// DISTRICT-SPECIFIC TERRAIN GENERATION
// =====================================================

function getTerrainParams(districtId: string): NoiseParams & { baseElevation: number } {
  switch (districtId) {
    case 'hollywood':
      return {
        frequency: 0.005,
        amplitude: 150,
        octaves: 6,
        persistence: 0.5,
        lacunarity: 2.0,
        baseElevation: 200,
      };
    case 'beach':
      return {
        frequency: 0.002,
        amplitude: 10,
        octaves: 3,
        persistence: 0.3,
        lacunarity: 2.0,
        baseElevation: 5,
      };
    case 'downtown':
      return {
        frequency: 0.001,
        amplitude: 5,
        octaves: 2,
        persistence: 0.2,
        lacunarity: 2.0,
        baseElevation: 95,
      };
    case 'beverly_hills':
      return {
        frequency: 0.003,
        amplitude: 30,
        octaves: 4,
        persistence: 0.4,
        lacunarity: 2.0,
        baseElevation: 80,
      };
    case 'south_la':
      return {
        frequency: 0.001,
        amplitude: 8,
        octaves: 2,
        persistence: 0.25,
        lacunarity: 2.0,
        baseElevation: 40,
      };
    default:
      return {
        frequency: 0.002,
        amplitude: 20,
        octaves: 4,
        persistence: 0.4,
        lacunarity: 2.0,
        baseElevation: 50,
      };
  }
}

export function generateDistrictTerrain(
  districtConfig: DistrictConfig,
  resolution: number = 10, // meters per sample
  seed: number = 42
): TerrainTile {
  const noise = new PerlinNoise(seed);
  const params = getTerrainParams(districtConfig.id);
  
  // Calculate grid size based on district bounds
  const bounds = districtConfig.bounds;
  const latRange = (bounds.maxLat - bounds.minLat) * 111000; // meters
  const lonRange = (bounds.maxLon - bounds.minLon) * 111000 * Math.cos(bounds.minLat * Math.PI / 180); // meters
  
  const gridWidth = Math.ceil(lonRange / resolution);
  const gridHeight = Math.ceil(latRange / resolution);
  
  // Generate elevation data
  const elevationData: number[][] = [];
  
  for (let z = 0; z < gridHeight; z++) {
    const row: number[] = [];
    for (let x = 0; x < gridWidth; x++) {
      const worldX = x * resolution;
      const worldZ = z * resolution;
      
      // Base terrain from noise
      let elevation = params.baseElevation + noise.fbm(worldX, worldZ, params);
      
      // Apply vertical exaggeration for visual effect
      elevation *= 1.2;
      
      // Clamp to realistic values
      elevation = Math.max(0, Math.min(elevation, 600));
      
      row.push(elevation);
    }
    elevationData.push(row);
  }
  
  return {
    id: `terrain_${districtConfig.id}`,
    bounds: districtConfig.bounds,
    resolution,
    elevationData,
    textureUrl: undefined, // Will be generated or loaded
  };
}

// =====================================================
// COASTLINE AND WATER BODIES
// =====================================================

export interface WaterBody {
  id: string;
  name: string;
  type: 'ocean' | 'lake' | 'river' | 'canal';
  coordinates: GeoPoint[];
  depth: number;
}

// LA coastline coordinates (simplified)
export const LA_COASTLINE: GeoPoint[] = [
  { latitude: 34.0500, longitude: -118.5200 },
  { latitude: 34.0200, longitude: -118.5100 },
  { latitude: 33.9900, longitude: -118.4950 },
  { latitude: 33.9600, longitude: -118.4800 },
  { latitude: 33.9300, longitude: -118.4600 },
];

// Venice Canals water bodies
export const VENICE_CANALS: WaterBody[] = [
  {
    id: 'venice_canal_1',
    name: 'Grand Canal',
    type: 'canal',
    coordinates: [
      { latitude: 33.9775, longitude: -118.4670 },
      { latitude: 33.9765, longitude: -118.4620 },
    ],
    depth: 2,
  },
  {
    id: 'venice_canal_2',
    name: 'Eastern Canal',
    type: 'canal',
    coordinates: [
      { latitude: 33.9780, longitude: -118.4660 },
      { latitude: 33.9750, longitude: -118.4630 },
    ],
    depth: 2,
  },
];

// Check if a point is over water
export function isOverWater(lat: number, lon: number): boolean {
  // Simple check for Pacific Ocean (west of coastline)
  // In reality, would use proper polygon containment
  return lon < -118.4500;
}

// =====================================================
// TERRAIN MODIFICATION
// =====================================================

// Create flat areas for building foundations
export function flattenForBuildings(
  terrain: TerrainTile,
  buildingPositions: Array<{ x: number; z: number; width: number; depth: number }>,
  flattenRadius: number = 2 // meters of smoothing around building
): TerrainTile {
  const modifiedData = terrain.elevationData.map(row => [...row]);
  
  for (const building of buildingPositions) {
    const startX = Math.floor((building.x - building.width / 2 - flattenRadius) / terrain.resolution);
    const endX = Math.ceil((building.x + building.width / 2 + flattenRadius) / terrain.resolution);
    const startZ = Math.floor((building.z - building.depth / 2 - flattenRadius) / terrain.resolution);
    const endZ = Math.ceil((building.z + building.depth / 2 + flattenRadius) / terrain.resolution);
    
    // Calculate average elevation in building area
    let sum = 0;
    let count = 0;
    for (let z = startZ; z < endZ && z < modifiedData.length; z++) {
      for (let x = startX; x < endX && x < modifiedData[z].length; x++) {
        if (z >= 0 && x >= 0) {
          sum += modifiedData[z][x];
          count++;
        }
      }
    }
    const avgElevation = count > 0 ? sum / count : 0;
    
    // Flatten to average
    for (let z = startZ; z < endZ && z < modifiedData.length; z++) {
      for (let x = startX; x < endX && x < modifiedData[z].length; x++) {
        if (z >= 0 && x >= 0) {
          modifiedData[z][x] = avgElevation;
        }
      }
    }
  }
  
  return { ...terrain, elevationData: modifiedData };
}

// =====================================================
// ELEVATION QUERY FUNCTIONS
// =====================================================

export function createElevationFunction(terrain: TerrainTile): (x: number, z: number) => number {
  return (x: number, z: number) => {
    const xIndex = Math.floor(x / terrain.resolution);
    const zIndex = Math.floor(z / terrain.resolution);
    
    if (
      zIndex >= 0 &&
      zIndex < terrain.elevationData.length &&
      xIndex >= 0 &&
      xIndex < terrain.elevationData[0].length
    ) {
      return terrain.elevationData[zIndex][xIndex];
    }
    
    return 0; // Default sea level
  };
}

// Get elevation at real-world coordinates
export function getElevationAtGeo(
  lat: number,
  lon: number,
  terrain: TerrainTile
): number {
  // Convert geo to terrain grid coordinates
  const bounds = terrain.bounds;
  const xRatio = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon);
  const zRatio = (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
  
  const xIndex = Math.floor(xRatio * (terrain.elevationData[0]?.length || 1));
  const zIndex = Math.floor(zRatio * (terrain.elevationData.length || 1));
  
  if (
    zIndex >= 0 &&
    zIndex < terrain.elevationData.length &&
    xIndex >= 0 &&
    xIndex < terrain.elevationData[0].length
  ) {
    return terrain.elevationData[zIndex][xIndex];
  }
  
  return 0;
}

// =====================================================
// TERRAIN SERVICE CLASS
// =====================================================

export class TerrainService {
  private static instance: TerrainService;
  private terrainCache = new Map<string, TerrainTile>();
  
  private constructor() {}
  
  static getInstance(): TerrainService {
    if (!TerrainService.instance) {
      TerrainService.instance = new TerrainService();
    }
    return TerrainService.instance;
  }
  
  async loadDistrictTerrain(districtConfig: DistrictConfig): Promise<TerrainTile> {
    // Check cache first
    const cacheKey = districtConfig.id;
    if (this.terrainCache.has(cacheKey)) {
      return this.terrainCache.get(cacheKey)!;
    }
    
    // Generate procedural terrain (in production, would load from USGS)
    const terrain = generateDistrictTerrain(districtConfig);
    
    // Cache the result
    this.terrainCache.set(cacheKey, terrain);
    
    return terrain;
  }
  
  getElevationFunction(districtId: string): ((x: number, z: number) => number) | null {
    const terrain = this.terrainCache.get(districtId);
    if (!terrain) return null;
    
    return createElevationFunction(terrain);
  }
  
  clearCache(): void {
    this.terrainCache.clear();
  }
}

export default TerrainService;