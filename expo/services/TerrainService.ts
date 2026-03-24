// Terrain Service for 3D City Generation
// Uses USGS 3DEP elevation data and procedural generation fallback
// Based on 3D_LA_Open_World_Guide.md - Approach B

import { 
  DistrictId, 
  TerrainTile, 
  VegetationInstance,
  RoadSegment 
} from '../types/city3d';
import { DISTRICTS } from '../config/districts';

// USGS 3DEP API endpoint (free elevation data)
const USGS_3DEP_URL = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer';

// Terrain generation parameters by district
export const TERRAIN_PARAMS: Record<DistrictId, {
  baseElevation: number;
  hilliness: number;
  roughness: number;
  vegetationDensity: number;
  waterLevel: number;
}> = {
  hollywood: {
    baseElevation: 350,  // meters - Hollywood Hills
    hilliness: 0.7,      // High - hilly terrain
    roughness: 0.3,      // Moderate roughness
    vegetationDensity: 0.4,
    waterLevel: 0        // No water
  },
  westside: {
    baseElevation: 30,   // meters - coastal plains
    hilliness: 0.2,      // Low - mostly flat
    roughness: 0.1,      // Smooth
    vegetationDensity: 0.6,
    waterLevel: 0.5      // Ocean level
  },
  downtown: {
    baseElevation: 90,   // meters - LA Basin floor
    hilliness: 0.1,      // Very flat
    roughness: 0.05,     // Very smooth
    vegetationDensity: 0.2,
    waterLevel: 0
  },
  culture: {
    baseElevation: 100,  // meters - gentle slopes
    hilliness: 0.3,      // Moderate
    roughness: 0.2,
    vegetationDensity: 0.7,
    waterLevel: 0
  },
  glamour: {
    baseElevation: 150,  // meters - Beverly Hills
    hilliness: 0.4,      // Moderate hills
    roughness: 0.15,
    vegetationDensity: 0.8,  // Manicured landscaping
    waterLevel: 0
  }
};

// Perlin noise implementation for procedural terrain
class PerlinNoise {
  private permutation: number[] = [];
  private p: number[] = [];

  constructor(seed: number = 0) {
    // Initialize permutation table with seed
    const random = this.seededRandom(seed);
    
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }
    
    // Shuffle permutation
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }
    
    // Double the permutation table
    this.p = [...this.permutation, ...this.permutation];
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const A = this.p[X] + Y;
    const B = this.p[X + 1] + Y;
    
    return this.lerp(
      this.lerp(this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y), u),
      this.lerp(this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1), u),
      v
    );
  }

  // Fractal Brownian Motion for more natural terrain
  fbm(x: number, y: number, octaves: number = 6): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value / maxValue;
  }
}

class TerrainService {
  private noiseGenerator: PerlinNoise;
  private elevationCache: Map<string, number> = new Map();

  constructor() {
    // Initialize with a seed for reproducible terrain
    this.noiseGenerator = new PerlinNoise(42);
  }

  /**
   * Generate terrain tile for a district
   */
  async generateTerrainTile(
    districtId: DistrictId,
    tileX: number,
    tileY: number,
    resolution: number = 64
  ): Promise<TerrainTile> {
    const district = DISTRICTS[districtId];
    const params = TERRAIN_PARAMS[districtId];
    
    // Create elevation grid
    const elevation: number[][] = [];
    
    for (let y = 0; y < resolution; y++) {
      const row: number[] = [];
      for (let x = 0; x < resolution; x++) {
        // Calculate world position
        const worldX = tileX * resolution + x;
        const worldY = tileY * resolution + y;
        
        // Get elevation from multiple sources
        let elevationValue = await this.getElevation(
          district.center.lat + (y / resolution - 0.5) * 0.01,
          district.center.lon + (x / resolution - 0.5) * 0.01,
          params
        );
        
        // Apply procedural variation
        elevationValue += this.noiseGenerator.fbm(worldX * 0.1, worldY * 0.1) * params.hilliness * 50;
        
        row.push(elevationValue);
      }
      elevation.push(row);
    }
    
    // Generate vegetation based on terrain
    const vegetation = this.generateVegetation(
      districtId,
      elevation,
      params.vegetationDensity
    );
    
    return {
      id: `terrain-${districtId}-${tileX}-${tileY}`,
      coordinates: { x: tileX, y: tileY },
      elevation,
      resolution,
      dataSource: 'procedural', // Will be 'usgs_3dep' when API is available
      vegetation,
      roads: []
    };
  }

  /**
   * Get elevation from USGS 3DEP or fallback to procedural
   */
  private async getElevation(
    lat: number,
    lon: number,
    params: typeof TERRAIN_PARAMS[DistrictId]
  ): Promise<number> {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    
    // Check cache first
    if (this.elevationCache.has(cacheKey)) {
      return this.elevationCache.get(cacheKey)!;
    }
    
    // Try USGS 3DEP API
    try {
      const elevation = await this.fetchUSGSElevation(lat, lon);
      if (elevation !== null) {
        this.elevationCache.set(cacheKey, elevation);
        return elevation;
      }
    } catch (error) {
      // Fall back to procedural generation
      console.warn('USGS elevation fetch failed, using procedural fallback');
    }
    
    // Procedural fallback
    const proceduralElevation = this.generateProceduralElevation(lat, lon, params);
    this.elevationCache.set(cacheKey, proceduralElevation);
    return proceduralElevation;
  }

  /**
   * Fetch elevation from USGS 3DEP API
   */
  private async fetchUSGSElevation(lat: number, lon: number): Promise<number | null> {
    try {
      const response = await fetch(
        `${USGS_3DEP_URL}/identify?f=json&geometry={"x":${lon},"y":${lat},"spatialReference":{"wkid":4326}}&returnGeometry=false`
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      if (data.value !== undefined) {
        // Convert meters to our units (already in meters)
        return data.value;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate procedural elevation based on district parameters
   */
  private generateProceduralElevation(
    lat: number,
    lon: number,
    params: typeof TERRAIN_PARAMS[DistrictId]
  ): number {
    // Use Perlin noise for natural-looking terrain
    const noiseValue = this.noiseGenerator.fbm(lat * 100, lon * 100, 6);
    
    // Scale by hilliness parameter
    const variation = noiseValue * params.hilliness * 100;
    
    return params.baseElevation + variation;
  }

  /**
   * Generate vegetation instances based on terrain and district
   */
  private generateVegetation(
    districtId: DistrictId,
    elevation: number[][],
    density: number
  ): VegetationInstance[] {
    const vegetation: VegetationInstance[] = [];
    const resolution = elevation.length;
    
    // District-specific vegetation types
    const vegetationTypes = this.getVegetationTypes(districtId);
    
    for (let y = 0; y < resolution; y += 4) {
      for (let x = 0; x < resolution; x += 4) {
        // Random placement based on density
        if (Math.random() > density * 0.3) continue;
        
        const type = vegetationTypes[Math.floor(Math.random() * vegetationTypes.length)];
        const elevationAtPoint = elevation[y][x];
        
        vegetation.push({
          id: `veg-${districtId}-${x}-${y}`,
          type,
          position: [
            x / resolution * 1000,
            elevationAtPoint,
            y / resolution * 1000
          ],
          scale: 0.8 + Math.random() * 0.4,
          rotation: Math.random() * Math.PI * 2,
          lod: [
            { level: 'high', meshComplexity: 500, textureResolution: 512, drawDistance: 50 },
            { level: 'medium', meshComplexity: 100, textureResolution: 256, drawDistance: 200 },
            { level: 'low', meshComplexity: 20, textureResolution: 64, drawDistance: 500 },
            { level: 'billboard', meshComplexity: 2, textureResolution: 32, drawDistance: 2000 }
          ]
        });
      }
    }
    
    return vegetation;
  }

  /**
   * Get vegetation types for a district
   */
  private getVegetationTypes(districtId: DistrictId): VegetationInstance['type'][] {
    switch (districtId) {
      case 'hollywood':
        return ['palm_tree', 'oak_tree', 'shrub'];
      case 'westside':
        return ['palm_tree', 'shrub', 'grass'];
      case 'downtown':
        return ['palm_tree']; // Minimal vegetation
      case 'culture':
        return ['oak_tree', 'palm_tree', 'shrub', 'grass'];
      case 'glamour':
        return ['palm_tree', 'oak_tree', 'shrub'];
      default:
        return ['palm_tree'];
    }
  }

  /**
   * Generate heightmap texture for terrain shader
   */
  generateHeightmap(elevation: number[][]): Uint8Array {
    const resolution = elevation.length;
    const heightmap = new Uint8Array(resolution * resolution);
    
    // Find min/max elevation for normalization
    let minElev = Infinity;
    let maxElev = -Infinity;
    
    for (const row of elevation) {
      for (const val of row) {
        if (val < minElev) minElev = val;
        if (val > maxElev) maxElev = val;
      }
    }
    
    const range = maxElev - minElev || 1;
    
    // Normalize to 0-255
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        heightmap[y * resolution + x] = Math.floor(
          ((elevation[y][x] - minElev) / range) * 255
        );
      }
    }
    
    return heightmap;
  }

  /**
   * Get terrain color based on elevation and district theme
   */
  getTerrainColor(districtId: DistrictId, elevation: number, slope: number): string {
    const district = DISTRICTS[districtId];
    const baseColor = district.theme.terrainColor;
    
    // Adjust color based on slope (green for hills, tan for flat)
    if (slope > 0.3) {
      return this.blendColors(baseColor, '#228B22', slope);
    }
    
    return baseColor;
  }

  /**
   * Blend two hex colors
   */
  private blendColors(color1: string, color2: string, factor: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    
    return this.rgbToHex(r, g, b);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 128, g: 128, b: 128 };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * Clear elevation cache
   */
  clearCache(): void {
    this.elevationCache.clear();
  }
}

// Export singleton instance
export const terrainService = new TerrainService();
export default terrainService;