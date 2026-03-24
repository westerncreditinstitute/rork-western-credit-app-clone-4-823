// Procedural Building Generation Service for 3D City
// Creates buildings with LOD variants based on LA architectural styles
// Based on 3D_LA_Open_World_Guide.md - Approach B

import {
  DistrictId,
  BuildingStyle,
  BuildingType,
  ProceduralBuilding,
  BuildingDetail,
  LODVariant,
  BuildingFootprint
} from '../types/city3d';
import { DISTRICT_STYLE_DISTRIBUTION, DISTRICT_TYPE_DISTRIBUTION, DISTRICT_BUILDING_COUNTS } from './OSMDataService';

// Style-specific building parameters
const STYLE_COLORS: Record<BuildingStyle, string[]> = {
  art_deco: ['#2C3E50', '#34495E', '#7F8C8D', '#BDC3C7'],
  mid_century_modern: ['#E8E8E8', '#F5F5F5', '#FFD700', '#FF6B6B'],
  spanish_colonial: ['#F5DEB3', '#DEB887', '#D2B48C', '#CD853F'],
  craftsman: ['#8B4513', '#A0522D', '#CD853F', '#D2691E'],
  victorian: ['#FFB6C1', '#DDA0DD', '#E6E6FA', '#FFF0F5'],
  beaux_arts: ['#F5F5DC', '#FAF0E6', '#FFFAF0', '#F5FFFA'],
  googie: ['#00CED1', '#FF6347', '#FFD700', '#FFFFFF'],
  contemporary: ['#87CEEB', '#B0C4DE', '#778899', '#708090'],
  brutalist: ['#696969', '#808080', '#A9A9A9', '#C0C0C0'],
  industrial: ['#4A4A4A', '#5C5C5C', '#787878', '#8B8B8B']
};

const STYLE_ROOFS: Record<BuildingStyle, ('flat' | 'pitched' | 'domed' | 'stepped')[]> = {
  art_deco: ['stepped', 'flat'],
  mid_century_modern: ['flat', 'pitched'],
  spanish_colonial: ['pitched', 'domed'],
  craftsman: ['pitched', 'flat'],
  victorian: ['pitched', 'domed'],
  beaux_arts: ['flat', 'domed'],
  googie: ['pitched', 'domed'],
  contemporary: ['flat', 'pitched'],
  brutalist: ['flat'],
  industrial: ['flat']
};

const STYLE_WINDOWS: Record<BuildingStyle, ('modern' | 'traditional' | 'industrial' | 'art_deco')[]> = {
  art_deco: ['art_deco', 'traditional'],
  mid_century_modern: ['modern', 'modern'],
  spanish_colonial: ['traditional', 'traditional'],
  craftsman: ['traditional', 'modern'],
  victorian: ['traditional', 'traditional'],
  beaux_arts: ['traditional', 'art_deco'],
  googie: ['modern', 'modern'],
  contemporary: ['modern', 'modern'],
  brutalist: ['modern', 'industrial'],
  industrial: ['industrial', 'industrial']
};

// Building type height ranges (in meters)
const TYPE_HEIGHT_RANGES: Record<BuildingType, { min: number; max: number }> = {
  residential: { min: 8, max: 25 },
  commercial: { min: 15, max: 80 },
  industrial: { min: 10, max: 30 },
  landmark: { min: 20, max: 100 },
  mixed_use: { min: 20, max: 60 }
};

// Seeded random number generator for reproducible generation
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(array: T[]): T {
    return array[this.int(0, array.length - 1)];
  }

  weightedPick<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = this.next() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }
}

class ProceduralGenerationService {
  /**
   * Generate buildings for a district
   */
  generateDistrictBuildings(
    districtId: DistrictId,
    seed: number = 42
  ): ProceduralBuilding[] {
    const buildings: ProceduralBuilding[] = [];
    const styleDistribution = DISTRICT_STYLE_DISTRIBUTION[districtId];
    const typeDistribution = DISTRICT_TYPE_DISTRIBUTION[districtId];
    const buildingCount = DISTRICT_BUILDING_COUNTS[districtId];
    
    const random = new SeededRandom(seed);
    
    for (let i = 0; i < buildingCount; i++) {
      const building = this.generateBuilding(
        districtId,
        i,
        random,
        styleDistribution,
        typeDistribution
      );
      buildings.push(building);
    }
    
    return buildings;
  }

  /**
   * Generate a single building
   */
  private generateBuilding(
    districtId: DistrictId,
    index: number,
    random: SeededRandom,
    styleDistribution: Record<BuildingStyle, number>,
    typeDistribution: Record<BuildingType, number>
  ): ProceduralBuilding {
    // Select style and type based on weighted distribution
    const styles = Object.keys(styleDistribution) as BuildingStyle[];
    const styleWeights = Object.values(styleDistribution);
    const style = random.weightedPick(styles, styleWeights);
    
    const types = Object.keys(typeDistribution) as BuildingType[];
    const typeWeights = Object.values(typeDistribution);
    const type = random.weightedPick(types, typeWeights);
    
    // Generate building properties
    const heightRange = TYPE_HEIGHT_RANGES[type];
    const height = random.range(heightRange.min, heightRange.max);
    const levels = Math.ceil(height / 3.5);
    
    // Generate footprint
    const footprint = this.generateFootprint(random, type);
    
    // Generate position (will be updated by district grid placement)
    const position: [number, number, number] = [
      random.range(-500, 500),
      0, // Ground level
      random.range(-500, 500)
    ];
    
    // Generate scale
    const scale: [number, number, number] = [
      footprint.length > 0 ? footprint[0][0] - (footprint[2]?.[0] || 0) : random.range(10, 30),
      height,
      footprint.length > 0 ? footprint[0][1] - (footprint[2]?.[1] || 0) : random.range(10, 30)
    ];
    
    // Select colors
    const colors = STYLE_COLORS[style];
    const color = random.pick(colors);
    
    // Select roof and window styles
    const roofType = random.pick(STYLE_ROOFS[style]);
    const windowStyle = random.pick(STYLE_WINDOWS[style]);
    
    // Generate details
    const details = this.generateBuildingDetails(random, style, type, levels);
    
    // Generate LOD variants
    const lod = this.generateLODVariants(random);
    
    return {
      id: `building-${districtId}-${index}`,
      position,
      rotation: random.next() * Math.PI * 2,
      scale,
      style,
      type,
      footprint,
      height,
      levels,
      color,
      roofType,
      windowStyle,
      details,
      lod
    };
  }

  /**
   * Generate building footprint polygon
   */
  private generateFootprint(
    random: SeededRandom,
    type: BuildingType
  ): Array<[number, number]> {
    const baseWidth = random.range(15, 40);
    const baseDepth = random.range(15, 40);
    
    switch (type) {
      case 'landmark':
        // More varied shapes for landmarks
        if (random.next() > 0.5) {
          // Rectangular
          return [
            [0, 0],
            [baseWidth, 0],
            [baseWidth, baseDepth],
            [0, baseDepth],
            [0, 0]
          ];
        } else {
          // L-shaped
          const lWidth = baseWidth * 0.6;
          return [
            [0, 0],
            [baseWidth, 0],
            [baseWidth, lWidth],
            [lWidth, lWidth],
            [lWidth, baseDepth],
            [0, baseDepth],
            [0, 0]
          ];
        }
      
      case 'commercial':
        // Larger footprints for commercial
        return [
          [0, 0],
          [baseWidth * 1.2, 0],
          [baseWidth * 1.2, baseDepth * 1.2],
          [0, baseDepth * 1.2],
          [0, 0]
        ];
      
      case 'industrial':
        // Large rectangular warehouses
        return [
          [0, 0],
          [baseWidth * 1.5, 0],
          [baseWidth * 1.5, baseDepth * 1.5],
          [0, baseDepth * 1.5],
          [0, 0]
        ];
      
      case 'residential':
      default:
        // Standard rectangular footprint
        return [
          [0, 0],
          [baseWidth, 0],
          [baseWidth, baseDepth],
          [0, baseDepth],
          [0, 0]
        ];
    }
  }

  /**
   * Generate building details based on style
   */
  private generateBuildingDetails(
    random: SeededRandom,
    style: BuildingStyle,
    type: BuildingType,
    levels: number
  ): BuildingDetail[] {
    const details: BuildingDetail[] = [];
    
    // Add style-specific details
    switch (style) {
      case 'art_deco':
        // Vertical setbacks
        if (levels > 10 && random.next() > 0.5) {
          details.push({
            type: 'signage',
            position: [0, levels * 2, 0],
            scale: [5, 3, 0.5],
            rotation: 0
          });
        }
        break;
      
      case 'spanish_colonial':
        // Balconies on residential
        if (type === 'residential') {
          for (let floor = 1; floor < Math.min(levels, 4); floor++) {
            if (random.next() > 0.3) {
              details.push({
                type: 'balcony',
                position: [random.range(-10, 10), floor * 3.5, 0],
                scale: [4, 0.5, 2],
                rotation: 0
              });
            }
          }
        }
        break;
      
      case 'craftsman':
        // Porches
        details.push({
          type: 'awning',
          position: [0, 3, 0],
          scale: [8, 0.3, 4],
          rotation: 0
        });
        break;
      
      case 'googie':
        // Rooftop elements
        details.push({
          type: 'signage',
          position: [0, levels * 3.5 + 5, 0],
          scale: [6, 4, 0.3],
          rotation: random.range(-0.2, 0.2)
        });
        break;
      
      case 'contemporary':
        // Modern additions
        if (random.next() > 0.5) {
          details.push({
            type: 'ac_unit',
            position: [random.range(-5, 5), levels * 3.5, random.range(-5, 5)],
            scale: [2, 2, 2],
            rotation: 0
          });
        }
        break;
      
      case 'brutalist':
        // Minimal details, maybe some texture elements
        break;
      
      default:
        // Random details
        if (type === 'commercial' && random.next() > 0.7) {
          details.push({
            type: 'awning',
            position: [0, 4, 0],
            scale: [6, 0.5, 3],
            rotation: 0
          });
        }
    }
    
    // Fire escapes for tall residential buildings
    if (type === 'residential' && levels > 3 && random.next() > 0.5) {
      details.push({
        type: 'fire_escape',
        position: [random.range(-10, 10), levels * 1.75, 0],
        scale: [3, levels * 2.5, 1],
        rotation: 0
      });
    }
    
    return details;
  }

  /**
   * Generate LOD variants for a building
   */
  private generateLODVariants(random: SeededRandom): LODVariant[] {
    return [
      {
        level: 'high',
        meshComplexity: random.int(500, 2000),
        textureResolution: 1024,
        drawDistance: 50
      },
      {
        level: 'medium',
        meshComplexity: random.int(100, 500),
        textureResolution: 512,
        drawDistance: 200
      },
      {
        level: 'low',
        meshComplexity: random.int(20, 100),
        textureResolution: 256,
        drawDistance: 500
      },
      {
        level: 'billboard',
        meshComplexity: 2,
        textureResolution: 64,
        drawDistance: 2000
      }
    ];
  }

  /**
   * Convert OSM building footprint to procedural building
   */
  osmToProceduralBuilding(
    footprint: BuildingFootprint,
    districtId: DistrictId,
    index: number
  ): ProceduralBuilding {
    const random = new SeededRandom(footprint.id.charCodeAt(footprint.id.length - 1));
    
    // Calculate position from footprint center
    let centerX = 0;
    let centerY = 0;
    for (const [x, y] of footprint.coordinates) {
      centerX += x;
      centerY += y;
    }
    centerX /= footprint.coordinates.length;
    centerY /= footprint.coordinates.length;
    
    // Calculate scale from footprint bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const [x, y] of footprint.coordinates) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    
    const width = maxX - minX;
    const depth = maxY - minY;
    
    return {
      id: footprint.id,
      position: [centerX * 1000, 0, centerY * 1000], // Convert to meters
      rotation: 0,
      scale: [width * 1000, footprint.height, depth * 1000],
      style: footprint.style,
      type: footprint.type,
      footprint: footprint.coordinates.map(([lon, lat]) => [lon * 1000, lat * 1000] as [number, number]),
      height: footprint.height,
      levels: footprint.levels,
      color: random.pick(STYLE_COLORS[footprint.style]),
      roofType: random.pick(STYLE_ROOFS[footprint.style]),
      windowStyle: random.pick(STYLE_WINDOWS[footprint.style]),
      details: this.generateBuildingDetails(random, footprint.style, footprint.type, footprint.levels),
      lod: this.generateLODVariants(random)
    };
  }

  /**
   * Generate building grid for district
   */
  generateDistrictGrid(
    districtId: DistrictId,
    buildings: ProceduralBuilding[],
    gridSize: number = 1000 // 1km grid
  ): Map<string, ProceduralBuilding[]> {
    const grid = new Map<string, ProceduralBuilding[]>();
    
    for (const building of buildings) {
      const gridX = Math.floor((building.position[0] + gridSize / 2) / gridSize);
      const gridZ = Math.floor((building.position[2] + gridSize / 2) / gridSize);
      const key = `${gridX},${gridZ}`;
      
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(building);
    }
    
    return grid;
  }

  /**
   * Calculate building statistics for a district
   */
  getBuildingStats(buildings: ProceduralBuilding[]): {
    totalBuildings: number;
    byStyle: Record<BuildingStyle, number>;
    byType: Record<BuildingType, number>;
    averageHeight: number;
    totalPolygons: number;
  } {
    const stats = {
      totalBuildings: buildings.length,
      byStyle: {} as Record<BuildingStyle, number>,
      byType: {} as Record<BuildingType, number>,
      averageHeight: 0,
      totalPolygons: 0
    };
    
    // Initialize counters
    const styles: BuildingStyle[] = ['art_deco', 'mid_century_modern', 'spanish_colonial', 'craftsman', 'victorian', 'beaux_arts', 'googie', 'contemporary', 'brutalist', 'industrial'];
    const types: BuildingType[] = ['residential', 'commercial', 'industrial', 'landmark', 'mixed_use'];
    
    for (const style of styles) {
      stats.byStyle[style] = 0;
    }
    for (const type of types) {
      stats.byType[type] = 0;
    }
    
    // Calculate stats
    let totalHeight = 0;
    for (const building of buildings) {
      stats.byStyle[building.style]++;
      stats.byType[building.type]++;
      totalHeight += building.height;
      stats.totalPolygons += building.lod[0].meshComplexity;
    }
    
    stats.averageHeight = totalHeight / buildings.length || 0;
    
    return stats;
  }
}

// Export singleton instance
export const proceduralGenerationService = new ProceduralGenerationService();
export default proceduralGenerationService;