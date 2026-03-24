// City 3D Context for Credit Life Simulator
// React context for managing 3D city state and interactions

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { 
  DistrictId, 
  DistrictConfig, 
  LandmarkConfig, 
  ProceduralBuilding,
  TerrainTile,
  GenerationSettings,
  DISTRICT_METADATA
} from '../types/city3d';
import { DISTRICTS, getDistrictById, getAllLandmarks } from '../config/districts';
import { osmDataService } from '../services/OSMDataService';
import { terrainService } from '../services/TerrainService';
import { proceduralGenerationService } from '../services/ProceduralGenerationService';

// State interface
interface City3DState {
  // Current district
  currentDistrict: DistrictId | null;
  districtConfig: DistrictConfig | null;
  
  // Loading states
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  error: string | null;
  
  // District data
  terrain: TerrainTile | null;
  buildings: ProceduralBuilding[];
  landmarks: LandmarkConfig[];
  
  // Player state
  playerPosition: {
    lat: number;
    lon: number;
    altitude: number;
  };
  playerRotation: number;
  
  // Discovery state
  discoveredLandmarks: Set<string>;
  discoveredTreasures: Set<string>;
  totalTreasureValue: number;
  
  // Performance
  currentLOD: 'high' | 'medium' | 'low' | 'billboard';
  visibleBuildings: number;
  renderedPolygons: number;
  
  // Generation settings
  settings: GenerationSettings;
}

// Action types
type City3DAction =
  | { type: 'SET_DISTRICT'; payload: DistrictId }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean; progress?: number; message?: string } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TERRAIN'; payload: TerrainTile | null }
  | { type: 'SET_BUILDINGS'; payload: ProceduralBuilding[] }
  | { type: 'SET_LANDMARKS'; payload: LandmarkConfig[] }
  | { type: 'SET_PLAYER_POSITION'; payload: { lat: number; lon: number; altitude: number } }
  | { type: 'SET_PLAYER_ROTATION'; payload: number }
  | { type: 'DISCOVER_LANDMARK'; payload: string }
  | { type: 'DISCOVER_TREASURE'; payload: { id: string; value: number } }
  | { type: 'SET_LOD'; payload: 'high' | 'medium' | 'low' | 'billboard' }
  | { type: 'UPDATE_PERFORMANCE'; payload: { visibleBuildings: number; renderedPolygons: number } }
  | { type: 'SET_SETTINGS'; payload: GenerationSettings }
  | { type: 'RESET_DISTRICT' };

// Initial state
const initialState: City3DState = {
  currentDistrict: null,
  districtConfig: null,
  isLoading: false,
  loadingProgress: 0,
  loadingMessage: '',
  error: null,
  terrain: null,
  buildings: [],
  landmarks: [],
  playerPosition: { lat: 0, lon: 0, altitude: 0 },
  playerRotation: 0,
  discoveredLandmarks: new Set(),
  discoveredTreasures: new Set(),
  totalTreasureValue: 0,
  currentLOD: 'high',
  visibleBuildings: 0,
  renderedPolygons: 0,
  settings: {
    districtId: 'hollywood',
    radius: 1000,
    detailLevel: 'high',
    includeTerrain: true,
    includeBuildings: true,
    includeRoads: true,
    includeVegetation: true,
    includeLandmarks: true,
    proceduralFallback: true
  }
};

// Reducer
function city3DReducer(state: City3DState, action: City3DAction): City3DState {
  switch (action.type) {
    case 'SET_DISTRICT':
      return {
        ...state,
        currentDistrict: action.payload,
        districtConfig: DISTRICTS[action.payload],
        landmarks: DISTRICTS[action.payload].landmarks
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
        loadingProgress: action.payload.progress ?? state.loadingProgress,
        loadingMessage: action.payload.message ?? state.loadingMessage
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    case 'SET_TERRAIN':
      return {
        ...state,
        terrain: action.payload
      };
    
    case 'SET_BUILDINGS':
      return {
        ...state,
        buildings: action.payload
      };
    
    case 'SET_LANDMARKS':
      return {
        ...state,
        landmarks: action.payload
      };
    
    case 'SET_PLAYER_POSITION':
      return {
        ...state,
        playerPosition: action.payload
      };
    
    case 'SET_PLAYER_ROTATION':
      return {
        ...state,
        playerRotation: action.payload
      };
    
    case 'DISCOVER_LANDMARK': {
      const newDiscovered = new Set(state.discoveredLandmarks);
      newDiscovered.add(action.payload);
      return {
        ...state,
        discoveredLandmarks: newDiscovered
      };
    }
    
    case 'DISCOVER_TREASURE': {
      const newTreasures = new Set(state.discoveredTreasures);
      newTreasures.add(action.payload.id);
      return {
        ...state,
        discoveredTreasures: newTreasures,
        totalTreasureValue: state.totalTreasureValue + action.payload.value
      };
    }
    
    case 'SET_LOD':
      return {
        ...state,
        currentLOD: action.payload
      };
    
    case 'UPDATE_PERFORMANCE':
      return {
        ...state,
        visibleBuildings: action.payload.visibleBuildings,
        renderedPolygons: action.payload.renderedPolygons
      };
    
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: action.payload
      };
    
    case 'RESET_DISTRICT':
      return {
        ...state,
        currentDistrict: null,
        districtConfig: null,
        terrain: null,
        buildings: [],
        landmarks: [],
        isLoading: false,
        loadingProgress: 0,
        loadingMessage: '',
        error: null
      };
    
    default:
      return state;
  }
}

// Context type
interface City3DContextType {
  state: City3DState;
  // District actions
  loadDistrict: (districtId: DistrictId) => Promise<void>;
  resetDistrict: () => void;
  // Player actions
  updatePlayerPosition: (lat: number, lon: number, altitude: number) => void;
  updatePlayerRotation: (rotation: number) => void;
  // Discovery actions
  discoverLandmark: (landmarkId: string) => void;
  discoverTreasure: (treasureId: string, value: number) => void;
  checkLandmarkProximity: () => LandmarkConfig | null;
  // Settings
  updateSettings: (settings: Partial<GenerationSettings>) => void;
  // Performance
  updatePerformance: (visibleBuildings: number, renderedPolygons: number) => void;
  setLOD: (lod: 'high' | 'medium' | 'low' | 'billboard') => void;
  // Helpers
  getDistrictMetadata: () => typeof DISTRICT_METADATA[DistrictId] | null;
  getAllLandmarks: () => LandmarkConfig[];
}

// Create context
const City3DContext = createContext<City3DContextType | undefined>(undefined);

// Provider component
interface City3DProviderProps {
  children: ReactNode;
}

export function City3DProvider({ children }: City3DProviderProps) {
  const [state, dispatch] = useReducer(city3DReducer, initialState);

  // Load district data
  const loadDistrict = useCallback(async (districtId: DistrictId) => {
    dispatch({ type: 'SET_DISTRICT', payload: districtId });
    dispatch({ 
      type: 'SET_LOADING', 
      payload: { isLoading: true, progress: 0, message: 'Initializing district...' }
    });

    try {
      const district = DISTRICTS[districtId];
      
      // Step 1: Fetch OSM data (buildings and roads)
      dispatch({ 
        type: 'SET_LOADING', 
        payload: { isLoading: true, progress: 20, message: 'Fetching map data from OpenStreetMap...' }
      });
      
      let buildings: ProceduralBuilding[] = [];
      
      try {
        const osmData = await osmDataService.fetchDistrictData(districtId, district.bounds);
        const footprints = osmDataService.extractBuildingFootprints(osmData);
        
        // Convert OSM footprints to procedural buildings
        buildings = footprints.map((fp, index) => 
          proceduralGenerationService.osmToProceduralBuilding(fp, districtId, index)
        );
      } catch (osmError) {
        console.warn('OSM data fetch failed, using procedural generation:', osmError);
      }
      
      // Step 2: Generate terrain
      dispatch({ 
        type: 'SET_LOADING', 
        payload: { isLoading: true, progress: 40, message: 'Generating terrain...' }
      });
      
      const terrain = await terrainService.generateTerrainTile(districtId, 0, 0, 64);
      dispatch({ type: 'SET_TERRAIN', payload: terrain });
      
      // Step 3: Procedurally generate remaining buildings
      dispatch({ 
        type: 'SET_LOADING', 
        payload: { isLoading: true, progress: 60, message: 'Generating buildings...' }
      });
      
      if (buildings.length < DISTRICT_METADATA[districtId].landmarkCount * 10) {
        // Need more buildings, generate procedurally
        const proceduralBuildings = proceduralGenerationService.generateDistrictBuildings(
          districtId,
          Date.now()
        );
        buildings = [...buildings, ...proceduralBuildings];
      }
      
      dispatch({ type: 'SET_BUILDINGS', payload: buildings });
      
      // Step 4: Set landmarks
      dispatch({ 
        type: 'SET_LOADING', 
        payload: { isLoading: true, progress: 80, message: 'Loading landmarks...' }
      });
      
      dispatch({ type: 'SET_LANDMARKS', payload: district.landmarks });
      
      // Step 5: Complete
      dispatch({ 
        type: 'SET_LOADING', 
        payload: { isLoading: true, progress: 100, message: 'District loaded!' }
      });
      
      // Set initial player position to district center
      dispatch({
        type: 'SET_PLAYER_POSITION',
        payload: {
          lat: district.center.lat,
          lon: district.center.lon,
          altitude: 100
        }
      });
      
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
      
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to load district' 
      });
    }
  }, []);

  // Reset district
  const resetDistrict = useCallback(() => {
    dispatch({ type: 'RESET_DISTRICT' });
  }, []);

  // Update player position
  const updatePlayerPosition = useCallback((lat: number, lon: number, altitude: number) => {
    dispatch({ type: 'SET_PLAYER_POSITION', payload: { lat, lon, altitude } });
  }, []);

  // Update player rotation
  const updatePlayerRotation = useCallback((rotation: number) => {
    dispatch({ type: 'SET_PLAYER_ROTATION', payload: rotation });
  }, []);

  // Discover a landmark
  const discoverLandmark = useCallback((landmarkId: string) => {
    dispatch({ type: 'DISCOVER_LANDMARK', payload: landmarkId });
  }, []);

  // Discover a treasure
  const discoverTreasure = useCallback((treasureId: string, value: number) => {
    dispatch({ type: 'DISCOVER_TREASURE', payload: { id: treasureId, value } });
  }, []);

  // Check if player is near any landmark
  const checkLandmarkProximity = useCallback((): LandmarkConfig | null => {
    if (!state.landmarks.length || !state.playerPosition.lat) return null;
    
    const PROXIMITY_THRESHOLD = 0.0005; // About 50 meters
    
    for (const landmark of state.landmarks) {
      if (state.discoveredLandmarks.has(landmark.id)) continue;
      
      const distance = Math.sqrt(
        Math.pow(state.playerPosition.lat - landmark.coordinates.lat, 2) +
        Math.pow(state.playerPosition.lon - landmark.coordinates.lon, 2)
      );
      
      if (distance < PROXIMITY_THRESHOLD) {
        return landmark;
      }
    }
    
    return null;
  }, [state.landmarks, state.playerPosition, state.discoveredLandmarks]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<GenerationSettings>) => {
    dispatch({ 
      type: 'SET_SETTINGS', 
      payload: { ...state.settings, ...newSettings } 
    });
  }, [state.settings]);

  // Update performance metrics
  const updatePerformance = useCallback((visibleBuildings: number, renderedPolygons: number) => {
    dispatch({ type: 'UPDATE_PERFORMANCE', payload: { visibleBuildings, renderedPolygons } });
  }, []);

  // Set LOD level
  const setLOD = useCallback((lod: 'high' | 'medium' | 'low' | 'billboard') => {
    dispatch({ type: 'SET_LOD', payload: lod });
  }, []);

  // Get district metadata
  const getDistrictMetadata = useCallback(() => {
    if (!state.currentDistrict) return null;
    return DISTRICT_METADATA[state.currentDistrict];
  }, [state.currentDistrict]);

  // Get all landmarks
  const getAllLandmarksList = useCallback(() => {
    return getAllLandmarks();
  }, []);

  const value: City3DContextType = {
    state,
    loadDistrict,
    resetDistrict,
    updatePlayerPosition,
    updatePlayerRotation,
    discoverLandmark,
    discoverTreasure,
    checkLandmarkProximity,
    updateSettings,
    updatePerformance,
    setLOD,
    getDistrictMetadata,
    getAllLandmarks: getAllLandmarksList
  };

  return (
    <City3DContext.Provider value={value}>
      {children}
    </City3DContext.Provider>
  );
}

// Custom hook to use the context
export function useCity3D() {
  const context = useContext(City3DContext);
  if (context === undefined) {
    throw new Error('useCity3D must be used within a City3DProvider');
  }
  return context;
}

export { City3DContext };