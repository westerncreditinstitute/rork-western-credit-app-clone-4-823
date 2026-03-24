import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import {
  City3DState,
  DistrictId,
  DistrictConfig,
  LandmarkConfig,
  ProceduralBuilding,
  TerrainTile,
  GeoPoint,
  Vector3,
  LA_CENTER,
} from '../types/city3d';
import { DISTRICT_CONFIGS, getAllLandmarks, getLandmarkById } from '../config/districts';
import { OSMDataService } from '../services/OSMDataService';
import { BuildingFootprint } from '../types/city3d';
import { generateSyntheticBuildings, adaptBuildingsToTerrain } from '../services/ProceduralGenerationService';
import { TerrainService, generateDistrictTerrain, createElevationFunction } from '../services/TerrainService';

// =====================================================
// STATE
// =====================================================

interface City3DContextState extends City3DState {
  // District data
  districts: Record<DistrictId, DistrictConfig>;
  
  // Generated buildings per district
  buildings: Record<DistrictId, ProceduralBuilding[]>;
  
  // Terrain data per district
  terrain: Record<DistrictId, TerrainTile>;
  
  // All landmarks
  landmarks: LandmarkConfig[];
  
  // Loading states
  loadingDistricts: Set<DistrictId>;
  
  // Error state
  error: string | null;
}

const initialState: City3DContextState = {
  // Current district
  currentDistrict: null,
  
  // Loaded districts
  loadedDistricts: new Set(),
  
  // Player position
  playerPosition: { x: 0, y: 0, z: 0 },
  playerGeoPosition: LA_CENTER,
  
  // Visible landmarks
  visibleLandmarks: [],
  
  // Discovered landmarks
  discoveredLandmarks: new Set(),
  
  // Loading state
  isLoading: false,
  loadingProgress: 0,
  
  // Performance metrics
  fps: 60,
  drawCalls: 0,
  triangleCount: 0,
  
  // District data
  districts: DISTRICT_CONFIGS,
  
  // Generated buildings
  buildings: {} as Record<DistrictId, ProceduralBuilding[]>,
  
  // Terrain
  terrain: {} as Record<DistrictId, TerrainTile>,
  
  // All landmarks
  landmarks: getAllLandmarks(),
  
  // Loading states
  loadingDistricts: new Set(),
  
  // Error state
  error: null,
};

// =====================================================
// ACTIONS
// =====================================================

type City3DAction =
  | { type: 'SET_CURRENT_DISTRICT'; payload: DistrictId }
  | { type: 'SET_PLAYER_POSITION'; payload: { position: Vector3; geoPosition: GeoPoint } }
  | { type: 'ADD_DISCOVERED_LANDMARK'; payload: string }
  | { type: 'SET_VISIBLE_LANDMARKS'; payload: string[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_PROGRESS'; payload: number }
  | { type: 'SET_PERFORMANCE_METRICS'; payload: { fps: number; drawCalls: number; triangleCount: number } }
  | { type: 'LOAD_DISTRICT_START'; payload: DistrictId }
  | { type: 'LOAD_DISTRICT_SUCCESS'; payload: { districtId: DistrictId; buildings: ProceduralBuilding[]; terrain: TerrainTile } }
  | { type: 'LOAD_DISTRICT_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

// =====================================================
// REDUCER
// =====================================================

function city3DReducer(state: City3DContextState, action: City3DAction): City3DContextState {
  switch (action.type) {
    case 'SET_CURRENT_DISTRICT':
      return {
        ...state,
        currentDistrict: action.payload,
      };
    
    case 'SET_PLAYER_POSITION':
      return {
        ...state,
        playerPosition: action.payload.position,
        playerGeoPosition: action.payload.geoPosition,
      };
    
    case 'ADD_DISCOVERED_LANDMARK':
      return {
        ...state,
        discoveredLandmarks: new Set([...state.discoveredLandmarks, action.payload]),
      };
    
    case 'SET_VISIBLE_LANDMARKS':
      return {
        ...state,
        visibleLandmarks: action.payload,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case 'SET_LOADING_PROGRESS':
      return {
        ...state,
        loadingProgress: action.payload,
      };
    
    case 'SET_PERFORMANCE_METRICS':
      return {
        ...state,
        fps: action.payload.fps,
        drawCalls: action.payload.drawCalls,
        triangleCount: action.payload.triangleCount,
      };
    
    case 'LOAD_DISTRICT_START':
      return {
        ...state,
        loadingDistricts: new Set([...state.loadingDistricts, action.payload]),
        isLoading: true,
      };
    
    case 'LOAD_DISTRICT_SUCCESS': {
      const { districtId, buildings, terrain } = action.payload;
      const newLoadedDistricts = new Set(state.loadedDistricts);
      newLoadedDistricts.add(districtId);
      
      const newLoadingDistricts = new Set(state.loadingDistricts);
      newLoadingDistricts.delete(districtId);
      
      return {
        ...state,
        buildings: {
          ...state.buildings,
          [districtId]: buildings,
        },
        terrain: {
          ...state.terrain,
          [districtId]: terrain,
        },
        loadedDistricts: newLoadedDistricts,
        loadingDistricts: newLoadingDistricts,
        isLoading: newLoadingDistricts.size > 0,
      };
    }
    
    case 'LOAD_DISTRICT_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    default:
      return state;
  }
}

// =====================================================
// CONTEXT
// =====================================================

interface City3DContextValue {
  state: City3DContextState;
  
  // District management
  loadDistrict: (districtId: DistrictId) => Promise<void>;
  setCurrentDistrict: (districtId: DistrictId) => void;
  
  // Player navigation
  setPlayerPosition: (position: Vector3, geoPosition: GeoPoint) => void;
  teleportToLandmark: (landmarkId: string) => void;
  teleportToDistrict: (districtId: DistrictId) => void;
  
  // Discovery
  discoverLandmark: (landmarkId: string) => void;
  getNearbyLandmarks: (radius: number) => LandmarkConfig[];
  
  // Performance
  updatePerformanceMetrics: (fps: number, drawCalls: number, triangleCount: number) => void;
  
  // Queries
  getDistrictBuildings: (districtId: DistrictId) => ProceduralBuilding[];
  getDistrictTerrain: (districtId: DistrictId) => TerrainTile | null;
  getLandmark: (id: string) => LandmarkConfig | undefined;
}

const City3DContext = createContext<City3DContextValue | null>(null);

// =====================================================
// PROVIDER
// =====================================================

interface City3DProviderProps {
  children: ReactNode;
}

export function City3DProvider({ children }: City3DProviderProps) {
  const [state, dispatch] = useReducer(city3DReducer, initialState);
  
  // Load a district's buildings and terrain
  const loadDistrict = useCallback(async (districtId: DistrictId) => {
    // Skip if already loaded or loading
    if (state.loadedDistricts.has(districtId) || state.loadingDistricts.has(districtId)) {
      return;
    }
    
    dispatch({ type: 'LOAD_DISTRICT_START', payload: districtId });
    
    try {
      const district = DISTRICT_CONFIGS[districtId];
      
      // Generate terrain
      const terrain = generateDistrictTerrain(district);
      
      // Generate buildings (procedural for now)
      const buildings = generateSyntheticBuildings(district, 0.65);
      
      // Adapt buildings to terrain
      const elevationFn = createElevationFunction(terrain);
      const adaptedBuildings = adaptBuildingsToTerrain(buildings, elevationFn);
      
      dispatch({
        type: 'LOAD_DISTRICT_SUCCESS',
        payload: {
          districtId,
          buildings: adaptedBuildings,
          terrain,
        },
      });
    } catch (error) {
      dispatch({
        type: 'LOAD_DISTRICT_ERROR',
        payload: `Failed to load district ${districtId}: ${error}`,
      });
    }
  }, [state.loadedDistricts, state.loadingDistricts]);
  
  // Set current district
  const setCurrentDistrict = useCallback((districtId: DistrictId) => {
    dispatch({ type: 'SET_CURRENT_DISTRICT', payload: districtId });
    
    // Auto-load district if not loaded
    if (!state.loadedDistricts.has(districtId)) {
      loadDistrict(districtId);
    }
  }, [state.loadedDistricts, loadDistrict]);
  
  // Set player position
  const setPlayerPosition = useCallback((position: Vector3, geoPosition: GeoPoint) => {
    dispatch({
      type: 'SET_PLAYER_POSITION',
      payload: { position, geoPosition },
    });
    
    // Check for nearby landmarks
    const nearbyLandmarks = state.landmarks.filter(landmark => {
      const dx = position.x - landmark.gamePosition.x;
      const dz = position.z - landmark.gamePosition.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      return distance < 100; // 100m discovery radius
    });
    
    // Update visible landmarks
    dispatch({
      type: 'SET_VISIBLE_LANDMARKS',
      payload: nearbyLandmarks.map(l => l.id),
    });
  }, [state.landmarks]);
  
  // Teleport to landmark
  const teleportToLandmark = useCallback((landmarkId: string) => {
    const landmark = getLandmarkById(landmarkId);
    if (landmark) {
      setPlayerPosition(landmark.gamePosition, landmark.coordinates);
      
      // Find district for this landmark
      for (const [districtId, district] of Object.entries(DISTRICT_CONFIGS)) {
        if (district.landmarks.some(l => l.id === landmarkId)) {
          dispatch({ type: 'SET_CURRENT_DISTRICT', payload: districtId as DistrictId });
          break;
        }
      }
    }
  }, [setPlayerPosition]);
  
  // Teleport to district center
  const teleportToDistrict = useCallback((districtId: DistrictId) => {
    const district = DISTRICT_CONFIGS[districtId];
    if (district) {
      setPlayerPosition(
        { x: 0, y: district.terrain.avgElevation, z: 0 },
        district.center
      );
      dispatch({ type: 'SET_CURRENT_DISTRICT', payload: districtId });
    }
  }, [setPlayerPosition]);
  
  // Discover landmark
  const discoverLandmark = useCallback((landmarkId: string) => {
    dispatch({ type: 'ADD_DISCOVERED_LANDMARK', payload: landmarkId });
  }, []);
  
  // Get nearby landmarks
  const getNearbyLandmarks = useCallback((radius: number): LandmarkConfig[] => {
    return state.landmarks.filter(landmark => {
      const dx = state.playerPosition.x - landmark.gamePosition.x;
      const dz = state.playerPosition.z - landmark.gamePosition.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      return distance < radius;
    });
  }, [state.playerPosition, state.landmarks]);
  
  // Update performance metrics
  const updatePerformanceMetrics = useCallback((fps: number, drawCalls: number, triangleCount: number) => {
    dispatch({
      type: 'SET_PERFORMANCE_METRICS',
      payload: { fps, drawCalls, triangleCount },
    });
  }, []);
  
  // Get district buildings
  const getDistrictBuildings = useCallback((districtId: DistrictId): ProceduralBuilding[] => {
    return state.buildings[districtId] || [];
  }, [state.buildings]);
  
  // Get district terrain
  const getDistrictTerrain = useCallback((districtId: DistrictId): TerrainTile | null => {
    return state.terrain[districtId] || null;
  }, [state.terrain]);
  
  // Get landmark by ID
  const getLandmark = useCallback((id: string): LandmarkConfig | undefined => {
    return getLandmarkById(id);
  }, []);
  
  const value: City3DContextValue = {
    state,
    loadDistrict,
    setCurrentDistrict,
    setPlayerPosition,
    teleportToLandmark,
    teleportToDistrict,
    discoverLandmark,
    getNearbyLandmarks,
    updatePerformanceMetrics,
    getDistrictBuildings,
    getDistrictTerrain,
    getLandmark,
  };
  
  return (
    <City3DContext.Provider value={value}>
      {children}
    </City3DContext.Provider>
  );
}

// =====================================================
// HOOKS
// =====================================================

export function useCity3D() {
  const context = useContext(City3DContext);
  if (!context) {
    throw new Error('useCity3D must be used within a City3DProvider');
  }
  return context;
}

export function useCurrentDistrict() {
  const { state } = useCity3D();
  return state.currentDistrict ? state.districts[state.currentDistrict] : null;
}

export function useLandmarks() {
  const { state } = useCity3D();
  return state.landmarks;
}

export function useDiscoveredLandmarks() {
  const { state } = useCity3D();
  return state.discoveredLandmarks;
}

export function usePlayerPosition() {
  const { state } = useCity3D();
  return {
    position: state.playerPosition,
    geoPosition: state.playerGeoPosition,
  };
}

export default City3DContext;