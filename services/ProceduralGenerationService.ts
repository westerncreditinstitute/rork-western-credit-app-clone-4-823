import {
  BuildingFootprint,
  ProceduralBuilding,
  DistrictConfig,
  BuildingStyle,
  RoofType,
  WindowPattern,
  GeoPoint,
  Vector3,
  DISTANCE_COMPRESSION,
  LA_CENTER,
} from '../types/city3d';
import { DISTRICT_STYLE_DISTRIBUTION } from './OSMDataService';

// =====================================================
// PROCEDURAL BUILDING GENERATION
// Creates 3D building models from OSM footprints
// =====================================================

// Style-based color palettes
const STYLE_COLORS: Record<BuildingStyle, string[]> = {
  art_deco: ['#2C3E50', '#34495E', '#7F8C8D', '#BDC3C7', '#95A5A6'],
  spanish_revival: ['#F5DEB3', '#DEB887', '#D2B48C', '#E6D5AC', '#FFFDD0'],
  mid_century_modern: ['#E8E8E8', '#FFFFFF', '#87CEEB', '#ADD8E6', '#F0F8FF'],
  glass_tower: ['#4A90D9', '#87CEEB', '#B0C4DE', '#778899', '#4682B4'],
  modernist: ['#F5F5F5', '#DCDCDC', '#A9A9A9', '#D3D3D3', '#E0E0E0'],
  victorian: ['#8B4513', '#A0522D', '#CD853F', '#D2691E', '#BC8F8F'],
  contemporary: ['#404040', '#505050', '#606060', '#707070', '#808080'],
  industrial: ['#4A4A4A', '#5A5A5A', '#6A6A6A', '#7A7A7A', '#8A8A8A'],
};

// Style-based roof types
const STYLE_ROOFS: Record<BuildingStyle, RoofType[]> = {
  art_deco: ['flat', 'stepped'],
  spanish_revival: ['pitched', 'domed'],
  mid_century_modern: ['flat', 'modern_curved'],
  glass_tower: ['flat', 'modern_curved'],
  modernist: ['flat', 'pitched'],
  victorian: ['pitched', 'domed'],
  contemporary: ['flat', 'modern_curved'],
  industrial: ['flat', 'pitched'],
};

// =====================================================
// RANDOM NUMBER GENERATOR (Seeded for reproducibility)
// =====================================================

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  weightedPick<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = this.next() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) return items[i];
    }
    
    return items[items.length - 1];
  }
}

// =====================================================
// BUILDING GENERATION
// =====================================================

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function pickStyleForDistrict(districtId: string, rng: SeededRandom): BuildingStyle {
  const distribution = DISTRICT_STYLE_DISTRIBUTION[districtId];
  if (!distribution) return 'contemporary';

  const styles = Object.keys(distribution) as BuildingStyle[];
  const weights = Object.values(distribution);
  
  return rng.weightedPick(styles, weights);
}

function generateWindowPattern(style: BuildingStyle, floors: number, rng: SeededRandom): WindowPattern {
  // Base window counts on building style and size
  let rows: number;
  let columns: number;
  let windowStyle: WindowPattern['style'];
  let tint: string;

  switch (style) {
    case 'art_deco':
      rows = Math.min(floors, Math.max(2, Math.floor(floors * 0.8)));
      columns = rng.int(3, 8);
      windowStyle = 'arched';
      tint = rng.pick(['#4A90D9', '#6495ED', '#4682B4']);
      break;
    case 'spanish_revival':
      rows = Math.min(floors, Math.max(2, Math.floor(floors * 0.7)));
      columns = rng.int(2, 5);
      windowStyle = 'arched';
      tint = rng.pick(['#8B4513', '#A0522D', '#6B8E23']);
      break;
    case 'glass_tower':
      rows = Math.min(floors, Math.max(4, Math.floor(floors * 0.9)));
      columns = rng.int(8, 20);
      windowStyle = 'horizontal_strip';
      tint = rng.pick(['#87CEEB', '#B0C4DE', '#778899']);
      break;
    case 'mid_century_modern':
      rows = Math.min(floors, Math.max(3, Math.floor(floors * 0.85)));
      columns = rng.int(4, 10);
      windowStyle = 'modern_rectangular';
      tint = rng.pick(['#FFFFFF', '#F0F8FF', '#E0FFFF']);
      break;
    case 'victorian':
      rows = Math.min(floors, Math.max(2, Math.floor(floors * 0.75)));
      columns = rng.int(2, 6);
      windowStyle = 'punched_opening';
      tint = rng.pick(['#8B4513', '#DEB887', '#F5DEB3']);
      break;
    case 'modernist':
      rows = Math.min(floors, Math.max(3, Math.floor(floors * 0.8)));
      columns = rng.int(4, 8);
      windowStyle = 'modern_rectangular';
      tint = rng.pick(['#D3D3D3', '#A9A9A9', '#696969']);
      break;
    default:
      rows = Math.min(floors, Math.max(2, Math.floor(floors * 0.75)));
      columns = rng.int(3, 6);
      windowStyle = 'modern_rectangular';
      tint = '#87CEEB';
  }

  return { rows, columns, style: windowStyle, tint };
}

function generateRoofDetails(
  style: BuildingStyle,
  baseHeight: number,
  rng: SeededRandom
): { roofHeight: number; roofType: RoofType } {
  const possibleRoofs = STYLE_ROOFS[style] || ['flat'];
  const roofType = rng.pick(possibleRoofs);

  let roofHeight: number;
  switch (roofType) {
    case 'pitched':
      roofHeight = baseHeight * rng.range(0.15, 0.3);
      break;
    case 'domed':
      roofHeight = baseHeight * rng.range(0.1, 0.2);
      break;
    case 'stepped':
      roofHeight = baseHeight * rng.range(0.05, 0.15);
      break;
    case 'modern_curved':
      roofHeight = baseHeight * rng.range(0.02, 0.08);
      break;
    default:
      roofHeight = baseHeight * 0.02;
  }

  return { roofHeight, roofType };
}

export function generateProceduralBuilding(
  footprint: BuildingFootprint,
  districtId: string
): ProceduralBuilding {
  // Create seeded RNG from building ID for reproducibility
  const seed = hashString(footprint.id);
  const rng = new SeededRandom(seed);

  // Determine building style
  const style = footprint.style || pickStyleForDistrict(districtId, rng);

  // Get color
  const colors = STYLE_COLORS[style] || STYLE_COLORS.contemporary;
  const color = rng.pick(colors);

  // Base height from footprint or generate
  const baseHeight = footprint.height || rng.range(8, 40);

  // Generate roof
  const { roofHeight, roofType } = generateRoofDetails(style, baseHeight, rng);

  // Generate window pattern
  const windowPattern = generateWindowPattern(style, footprint.levels, rng);

  // Calculate position from footprint center
  const centerLat = footprint.coordinates.reduce((sum, c) => sum + c.latitude, 0) / footprint.coordinates.length;
  const centerLon = footprint.coordinates.reduce((sum, c) => sum + c.longitude, 0) / footprint.coordinates.length;

  // Convert to game coordinates with compression
  const gameX = (centerLon - LA_CENTER.longitude) * 111000 * Math.cos(LA_CENTER.latitude * Math.PI / 180) / DISTANCE_COMPRESSION;
  const gameZ = (centerLat - LA_CENTER.latitude) * 111000 / DISTANCE_COMPRESSION;

  // Calculate footprint scale
  const bounds = getFootprintBounds(footprint.coordinates);
  const scaleX = (bounds.maxLon - bounds.minLon) * 111000 * Math.cos(centerLat * Math.PI / 180) / DISTANCE_COMPRESSION;
  const scaleZ = (bounds.maxLat - bounds.minLat) * 111000 / DISTANCE_COMPRESSION;

  // Calculate rotation (simplified - most buildings align with streets)
  const rotation = rng.range(0, 360);

  return {
    id: footprint.id,
    footprint: footprint.coordinates,
    baseHeight,
    roofHeight,
    roofType,
    facadeStyle: style,
    windowPattern,
    color,
    position: {
      x: gameX,
      y: 0, // Will be set based on terrain
      z: gameZ,
    },
    rotation,
    scale: {
      x: Math.max(scaleX, 5),
      y: baseHeight + roofHeight,
      z: Math.max(scaleZ, 5),
    },
  };
}

function getFootprintBounds(coordinates: GeoPoint[]): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  return {
    minLat: Math.min(...coordinates.map(c => c.latitude)),
    maxLat: Math.max(...coordinates.map(c => c.latitude)),
    minLon: Math.min(...coordinates.map(c => c.longitude)),
    maxLon: Math.max(...coordinates.map(c => c.longitude)),
  };
}

// =====================================================
// BATCH GENERATION
// =====================================================

export function generateDistrictBuildings(
  footprints: BuildingFootprint[],
  districtId: string
): ProceduralBuilding[] {
  return footprints.map(fp => generateProceduralBuilding(fp, districtId));
}

// =====================================================
// SYNTHETIC BUILDING GENERATION
// For areas without OSM data, generate plausible buildings
// =====================================================

interface GridCell {
  x: number;
  z: number;
  size: number;
}

function generateCityGrid(
  districtConfig: DistrictConfig,
  cellSize: number = 50 // meters
): GridCell[] {
  const cells: GridCell[] = [];
  
  const bounds = districtConfig.bounds;
  const latRange = (bounds.maxLat - bounds.minLat) * 111000 / DISTANCE_COMPRESSION;
  const lonRange = (bounds.maxLon - bounds.minLon) * 111000 * Math.cos(bounds.minLat * Math.PI / 180) / DISTANCE_COMPRESSION;

  const cellsX = Math.ceil(lonRange / cellSize);
  const cellsZ = Math.ceil(latRange / cellSize);

  for (let x = 0; x < cellsX; x++) {
    for (let z = 0; z < cellsZ; z++) {
      cells.push({
        x: x * cellSize - lonRange / 2,
        z: z * cellSize - latRange / 2,
        size: cellSize,
      });
    }
  }

  return cells;
}

export function generateSyntheticBuildings(
  districtConfig: DistrictConfig,
  density: number = 0.7 // 70% of cells have buildings
): ProceduralBuilding[] {
  const buildings: ProceduralBuilding[] = [];
  const seed = hashString(districtConfig.id);
  const rng = new SeededRandom(seed);

  const grid = generateCityGrid(districtConfig);

  for (const cell of grid) {
    // Skip some cells for open spaces, parks, roads
    if (rng.next() > density) continue;

    // Skip cells near district edges (roads)
    const edgeMargin = 0.1;
    if (rng.next() < edgeMargin) continue;

    // Generate building
    const style = pickStyleForDistrict(districtConfig.id, rng);
    const colors = STYLE_COLORS[style];
    const color = rng.pick(colors);

    const floors = rng.int(2, 30);
    const baseHeight = floors * 4;
    const { roofHeight, roofType } = generateRoofDetails(style, baseHeight, rng);
    const windowPattern = generateWindowPattern(style, floors, rng);

    // Building footprint (simplified rectangle)
    const footprintWidth = cell.size * rng.range(0.4, 0.8);
    const footprintDepth = cell.size * rng.range(0.4, 0.8);

    const buildingId = `synth_${districtConfig.id}_${cell.x}_${cell.z}`;

    buildings.push({
      id: buildingId,
      footprint: [],
      baseHeight,
      roofHeight,
      roofType,
      facadeStyle: style,
      windowPattern,
      color,
      position: {
        x: cell.x + (cell.size - footprintWidth) / 2,
        y: 0,
        z: cell.z + (cell.size - footprintDepth) / 2,
      },
      rotation: rng.range(0, 360),
      scale: {
        x: footprintWidth,
        y: baseHeight + roofHeight,
        z: footprintDepth,
      },
    });
  }

  return buildings;
}

// =====================================================
// LOD GENERATION
// =====================================================

export function generateLODVariants(building: ProceduralBuilding): {
  high: ProceduralBuilding;
  medium: ProceduralBuilding;
  low: ProceduralBuilding;
  billboard: ProceduralBuilding;
} {
  return {
    // High LOD: Full detail with windows
    high: {
      ...building,
      windowPattern: building.windowPattern,
    },
    
    // Medium LOD: Simplified windows
    medium: {
      ...building,
      windowPattern: {
        rows: Math.max(2, Math.floor(building.windowPattern.rows / 2)),
        columns: Math.max(2, Math.floor(building.windowPattern.columns / 2)),
        style: building.windowPattern.style,
        tint: building.windowPattern.tint,
      },
    },
    
    // Low LOD: No windows, just shape and color
    low: {
      ...building,
      windowPattern: { rows: 0, columns: 0, style: 'modern_rectangular', tint: building.color },
    },
    
    // Billboard: 2D representation
    billboard: {
      ...building,
      baseHeight: building.baseHeight + building.roofHeight,
      roofHeight: 0,
      roofType: 'flat',
      windowPattern: { rows: 0, columns: 0, style: 'modern_rectangular', tint: building.color },
      scale: { x: building.scale.x * 1.1, y: building.scale.y, z: 0.1 },
    },
  };
}

// =====================================================
// TERRAIN ADAPTATION
// =====================================================

export function adaptBuildingsToTerrain(
  buildings: ProceduralBuilding[],
  elevationData: (x: number, z: number) => number
): ProceduralBuilding[] {
  return buildings.map(building => ({
    ...building,
    position: {
      ...building.position,
      y: elevationData(building.position.x, building.position.z),
    },
  }));
}

// =====================================================
// EXPORT
// =====================================================

export default {
  generateProceduralBuilding,
  generateDistrictBuildings,
  generateSyntheticBuildings,
  generateLODVariants,
  adaptBuildingsToTerrain,
};