import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  MapPin, 
  Navigation, 
  Building2, 
  Trees, 
  Car, 
  Camera,
  ChevronRight,
  Star,
  Lock,
  Zap,
  Mountain,
  Waves,
  Building,
  Eye,
  Layers,
  Settings,
  X,
  Info,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { DISTRICT_CONFIGS, getAllLandmarks, getDistrictById } from '../../config/districts';
import { 
  DistrictId, 
  DistrictConfig, 
  LandmarkConfig, 
  LandmarkRarity,
  LOD_DISTANCES 
} from '../../types/city3d';
import { useCity3D, useCurrentDistrict, useLandmarks, usePlayerPosition } from '../../contexts/City3DContext';
import { DISTRICT_BUILDING_COUNTS, DISTRICT_ROAD_LENGTHS } from '../../services/OSMDataService';

const { width, height } = Dimensions.get('window');

// =====================================================
// 3D CITY VIEWER SCREEN
// Displays the procedurally generated LA city
// =====================================================

export default function City3DScreen() {
  const [viewMode, setViewMode] = useState<'map' | 'district' | 'landmark' | 'stats'>('map');
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<LandmarkConfig | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  
  const { 
    loadDistrict, 
    teleportToDistrict, 
    teleportToLandmark,
    discoverLandmark,
    state 
  } = useCity3D();
  
  const landmarks = useLandmarks();
  const currentDistrict = useCurrentDistrict();
  const playerPosition = usePlayerPosition();

  // Get rarity color
  const getRarityColor = (rarity: LandmarkRarity): string => {
    switch (rarity) {
      case 'legendary': return '#FFD700';
      case 'epic': return '#9B59B6';
      case 'rare': return '#3498DB';
      default: return '#95A5A6';
    }
  };

  // Get rarity stars
  const getRarityStars = (rarity: LandmarkRarity): number => {
    switch (rarity) {
      case 'legendary': return 5;
      case 'epic': return 4;
      case 'rare': return 3;
      default: return 2;
    }
  };

  // Handle district selection
  const handleDistrictPress = async (districtId: DistrictId) => {
    setSelectedDistrict(districtId);
    await loadDistrict(districtId);
  };

  // Handle landmark selection
  const handleLandmarkPress = (landmark: LandmarkConfig) => {
    setSelectedLandmark(landmark);
  };

  // Teleport to landmark
  const handleTeleportToLandmark = (landmark: LandmarkConfig) => {
    teleportToLandmark(landmark.id);
    discoverLandmark(landmark.id);
    setSelectedLandmark(null);
    // Navigate to scavenger hunt AR view
    router.push('/game/scavenger-hunt');
  };

  // Render map view
  const renderMapView = () => (
    <View style={styles.mapContainer}>
      {/* Static map background using OpenStreetMap tiles */}
      <View style={styles.mapBackground}>
        <Image
          source={{ 
            uri: `https://tile.openstreetmap.org/12/655/1583.png` 
          }}
          style={styles.mapTile}
          resizeMode="cover"
        />
        
        {/* District overlays */}
        {Object.values(DISTRICT_CONFIGS).map((district, index) => (
          <TouchableOpacity
            key={district.id}
            style={[
              styles.districtOverlay,
              {
                top: `${10 + index * 15}%`,
                left: `${5 + (index % 3) * 30}%`,
                backgroundColor: district.theme.primaryColor + '40',
                borderColor: district.theme.primaryColor,
              }
            ]}
            onPress={() => handleDistrictPress(district.id)}
          >
            <Text style={[styles.districtLabel, { color: district.theme.primaryColor }]}>
              {district.name}
            </Text>
            <Text style={styles.districtSize}>
              {district.sizeKm2} km²
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Landmark markers */}
        {landmarks.map((landmark) => (
          <TouchableOpacity
            key={landmark.id}
            style={[
              styles.landmarkMarker,
              {
                left: `${((landmark.coordinates.longitude + 118.5) / 0.4) * 100}%`,
                top: `${((34.15 - landmark.coordinates.latitude) / 0.25) * 100}%`,
                backgroundColor: getRarityColor(landmark.rarity),
              }
            ]}
            onPress={() => handleLandmarkPress(landmark)}
          >
            <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Map legend */}
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} />
          <Text style={styles.legendText}>Legendary</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#9B59B6' }]} />
          <Text style={styles.legendText}>Epic</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3498DB' }]} />
          <Text style={styles.legendText}>Rare</Text>
        </View>
      </View>
    </View>
  );

  // Render district detail view
  const renderDistrictView = () => {
    if (!selectedDistrict) return null;
    
    const district = DISTRICT_CONFIGS[selectedDistrict];
    const isLoading = state.loadingDistricts.has(selectedDistrict);
    const isLoaded = state.loadedDistricts.has(selectedDistrict);
    const buildings = state.buildings[selectedDistrict] || [];
    
    return (
      <View style={styles.districtDetail}>
        <LinearGradient
          colors={[district.theme.primaryColor + '40', 'transparent']}
          style={styles.districtHeader}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedDistrict(null)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={[styles.districtTitle, { color: district.theme.primaryColor }]}>
            {district.displayName}
          </Text>
          
          <Text style={styles.districtDescription}>
            {district.description}
          </Text>
        </LinearGradient>
        
        <ScrollView style={styles.districtContent} showsVerticalScrollIndicator={false}>
          {/* District Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Building2 size={24} color={district.theme.primaryColor} />
              <Text style={styles.statValue}>
                {DISTRICT_BUILDING_COUNTS[selectedDistrict]?.toLocaleString() || '---'}
              </Text>
              <Text style={styles.statLabel}>Buildings</Text>
            </View>
            
            <View style={styles.statCard}>
              <Car size={24} color={district.theme.primaryColor} />
              <Text style={styles.statValue}>
                {DISTRICT_ROAD_LENGTHS[selectedDistrict]?.toFixed(1) || '---'}
              </Text>
              <Text style={styles.statLabel}>Roads (km)</Text>
            </View>
            
            <View style={styles.statCard}>
              <Mountain size={24} color={district.theme.primaryColor} />
              <Text style={styles.statValue}>
                {district.terrain.avgElevation}
              </Text>
              <Text style={styles.statLabel}>Elevation (m)</Text>
            </View>
            
            <View style={styles.statCard}>
              <Star size={24} color={district.theme.primaryColor} />
              <Text style={styles.statValue}>
                {district.landmarks.length}
              </Text>
              <Text style={styles.statLabel}>Landmarks</Text>
            </View>
          </View>
          
          {/* Terrain Info */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Terrain</Text>
            <View style={styles.terrainInfo}>
              <View style={styles.terrainItem}>
                <Text style={styles.terrainLabel}>Type</Text>
                <Text style={styles.terrainValue}>{district.terrain.type}</Text>
              </View>
              <View style={styles.terrainItem}>
                <Text style={styles.terrainLabel}>Elevation Range</Text>
                <Text style={styles.terrainValue}>
                  {district.terrain.elevationRange[0]}m - {district.terrain.elevationRange[1]}m
                </Text>
              </View>
            </View>
          </View>
          
          {/* Landmarks in District */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Landmarks</Text>
            {district.landmarks.map((landmark) => (
              <TouchableOpacity
                key={landmark.id}
                style={styles.landmarkCard}
                onPress={() => handleLandmarkPress(landmark)}
              >
                <View style={[styles.landmarkIcon, { backgroundColor: getRarityColor(landmark.rarity) }]}>
                  <Star size={20} color="#FFFFFF" fill="#FFFFFF" />
                </View>
                
                <View style={styles.landmarkInfo}>
                  <Text style={styles.landmarkName}>{landmark.displayName}</Text>
                  <Text style={styles.landmarkDescription} numberOfLines={1}>
                    {landmark.description}
                  </Text>
                  <View style={styles.landmarkStars}>
                    {Array.from({ length: getRarityStars(landmark.rarity) }).map((_, i) => (
                      <Star key={i} size={12} color={getRarityColor(landmark.rarity)} fill={getRarityColor(landmark.rarity)} />
                    ))}
                  </View>
                </View>
                
                <ChevronRight size={20} color="#6B7280" />
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Building Styles */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Architecture</Text>
            <View style={styles.styleTags}>
              {district.theme.buildingStyle.map((style) => (
                <View key={style} style={styles.styleTag}>
                  <Text style={styles.styleTagText}>
                    {style.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          
          {/* Load District Button */}
          {!isLoaded && (
            <TouchableOpacity
              style={[styles.loadButton, { backgroundColor: district.theme.primaryColor }]}
              onPress={() => teleportToDistrict(selectedDistrict)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.loadButtonText}>Loading District...</Text>
              ) : (
                <>
                  <Zap size={20} color="#FFFFFF" />
                  <Text style={styles.loadButtonText}>Enter District</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {isLoaded && (
            <View style={styles.loadedInfo}>
              <Text style={styles.loadedText}>
                ✓ District Loaded: {buildings.length} buildings generated
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render landmark detail view
  const renderLandmarkView = () => {
    if (!selectedLandmark) return null;
    
    const rarityColor = getRarityColor(selectedLandmark.rarity);
    
    return (
      <View style={styles.landmarkDetail}>
        <LinearGradient
          colors={[rarityColor + '60', 'transparent']}
          style={styles.landmarkDetailHeader}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedLandmark(null)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.landmarkHeaderContent}>
            <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
              <Star size={16} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.rarityText}>
                {selectedLandmark.rarity.toUpperCase()}
              </Text>
            </View>
            
            <Text style={styles.landmarkDetailTitle}>
              {selectedLandmark.displayName}
            </Text>
            
            <Text style={styles.landmarkDetailDescription}>
              {selectedLandmark.description}
            </Text>
          </View>
        </LinearGradient>
        
        <ScrollView style={styles.landmarkDetailContent}>
          {/* Coordinates */}
          <View style={styles.coordCard}>
            <MapPin size={20} color={rarityColor} />
            <View style={styles.coordInfo}>
              <Text style={styles.coordLabel}>GPS Coordinates</Text>
              <Text style={styles.coordValue}>
                {selectedLandmark.coordinates.latitude.toFixed(4)}°N,{' '}
                {Math.abs(selectedLandmark.coordinates.longitude).toFixed(4)}°W
              </Text>
              {selectedLandmark.coordinates.altitude && (
                <Text style={styles.coordAlt}>
                  Elevation: {selectedLandmark.coordinates.altitude}m
                </Text>
              )}
            </View>
          </View>
          
          {/* Treasure Value */}
          <View style={styles.treasureCard}>
            <Zap size={24} color="#FFD700" />
            <View style={styles.treasureInfo}>
              <Text style={styles.treasureLabel}>Treasure Value</Text>
              <Text style={styles.treasureValue}>
                {selectedLandmark.treasureValue} MUSO Tokens
              </Text>
            </View>
          </View>
          
          {/* Discovery Hint */}
          {selectedLandmark.discovery.riddle && (
            <View style={styles.riddleCard}>
              <Text style={styles.riddleLabel}>Discovery Riddle</Text>
              <Text style={styles.riddleText}>"{selectedLandmark.discovery.riddle}"</Text>
            </View>
          )}
          
          {/* Historical Info */}
          <View style={styles.historyCard}>
            <Text style={styles.historyLabel}>Historical Significance</Text>
            <Text style={styles.historyText}>
              {selectedLandmark.lore.historicalSignificance}
            </Text>
            
            {selectedLandmark.lore.founded && (
              <Text style={styles.foundedText}>
                Founded: {selectedLandmark.lore.founded}
              </Text>
            )}
          </View>
          
          {/* Fun Facts */}
          <View style={styles.factsCard}>
            <Text style={styles.factsLabel}>Fun Facts</Text>
            {selectedLandmark.lore.funFacts.map((fact, index) => (
              <View key={index} style={styles.factItem}>
                <Text style={styles.factBullet}>•</Text>
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ))}
          </View>
          
          {/* 3D Model Info */}
          <View style={styles.modelCard}>
            <Text style={styles.modelLabel}>3D Model Detail</Text>
            <View style={styles.lodInfo}>
              {selectedLandmark.modelConfig.lodLevels.map((lod, index) => (
                <View key={lod.level} style={styles.lodLevel}>
                  <Text style={styles.lodLevelName}>{lod.level.toUpperCase()}</Text>
                  <Text style={styles.lodDistance}>≤{lod.distance}m</Text>
                  <Text style={styles.lodTris}>
                    {(lod.triangleCount / 1000).toFixed(0)}K tris
                  </Text>
                </View>
              ))}
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: rarityColor }]}
              onPress={() => handleTeleportToLandmark(selectedLandmark)}
            >
              <Navigation size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Teleport to Location</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => router.push('/game/scavenger-hunt')}
            >
              <Camera size={20} color={rarityColor} />
              <Text style={[styles.actionButtonTextSecondary, { color: rarityColor }]}>
                Open AR Scanner
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // Render stats view
  const renderStatsView = () => (
    <View style={styles.statsView}>
      <Text style={styles.statsTitle}>City Statistics</Text>
      
      <View style={styles.globalStats}>
        <View style={styles.globalStat}>
          <Text style={styles.globalStatValue}>20</Text>
          <Text style={styles.globalStatLabel}>Total Landmarks</Text>
        </View>
        
        <View style={styles.globalStat}>
          <Text style={styles.globalStatValue}>5</Text>
          <Text style={styles.globalStatLabel}>Districts</Text>
        </View>
        
        <View style={styles.globalStat}>
          <Text style={styles.globalStatValue}>~5</Text>
          <Text style={styles.globalStatLabel}>km² Total Area</Text>
        </View>
        
        <View style={styles.globalStat}>
          <Text style={styles.globalStatValue}>10:1</Text>
          <Text style={styles.globalStatLabel}>Distance Compression</Text>
        </View>
      </View>
      
      <Text style={styles.sectionSubtitle}>District Progress</Text>
      
      {Object.values(DISTRICT_CONFIGS).map((district) => {
        const isLoaded = state.loadedDistricts.has(district.id);
        const buildingsCount = state.buildings[district.id]?.length || 0;
        
        return (
          <View key={district.id} style={styles.progressCard}>
            <View style={[styles.progressColor, { backgroundColor: district.theme.primaryColor }]} />
            <View style={styles.progressContent}>
              <Text style={styles.progressName}>{district.name}</Text>
              <Text style={styles.progressStatus}>
                {isLoaded 
                  ? `${buildingsCount.toLocaleString()} buildings loaded`
                  : 'Not loaded'
                }
              </Text>
            </View>
            <View style={[styles.progressBadge, isLoaded && styles.progressBadgeComplete]}>
              <Text style={styles.progressBadgeText}>
                {isLoaded ? '✓' : '○'}
              </Text>
            </View>
          </View>
        );
      })}
      
      <Text style={styles.sectionSubtitle}>Performance</Text>
      
      <View style={styles.perfStats}>
        <View style={styles.perfStat}>
          <Text style={styles.perfValue}>{state.fps}</Text>
          <Text style={styles.perfLabel}>FPS</Text>
        </View>
        <View style={styles.perfStat}>
          <Text style={styles.perfValue}>{state.drawCalls}</Text>
          <Text style={styles.perfLabel}>Draw Calls</Text>
        </View>
        <View style={styles.perfStat}>
          <Text style={styles.perfValue}>{(state.triangleCount / 1000).toFixed(0)}K</Text>
          <Text style={styles.perfLabel}>Triangles</Text>
        </View>
      </View>
      
      <Text style={styles.sectionSubtitle}>LOD Distances</Text>
      
      <View style={styles.lodDistances}>
        <View style={styles.lodDist}>
          <Text style={styles.lodDistValue}>0-{LOD_DISTANCES.high}m</Text>
          <Text style={styles.lodDistLabel}>High Detail</Text>
        </View>
        <View style={styles.lodDist}>
          <Text style={styles.lodDistValue}>{LOD_DISTANCES.high}-{LOD_DISTANCES.medium}m</Text>
          <Text style={styles.lodDistLabel}>Medium</Text>
        </View>
        <View style={styles.lodDist}>
          <Text style={styles.lodDistValue}>{LOD_DISTANCES.medium}-{LOD_DISTANCES.low}m</Text>
          <Text style={styles.lodDistLabel}>Low</Text>
        </View>
        <View style={styles.lodDist}>
          <Text style={styles.lodDistValue}>{LOD_DISTANCES.billboard}m+</Text>
          <Text style={styles.lodDistLabel}>Billboard</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerBack}
            onPress={() => router.back()}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>3D Los Angeles</Text>
          
          <TouchableOpacity 
            style={styles.headerInfo}
            onPress={() => setShowInfo(!showInfo)}
          >
            <Info size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        
        {/* View Mode Tabs */}
        <View style={styles.viewTabs}>
          {(['map', 'district', 'landmark', 'stats'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.viewTab, viewMode === mode && styles.viewTabActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.viewTabText, viewMode === mode && styles.viewTabTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Content */}
        <View style={styles.content}>
          {viewMode === 'map' && renderMapView()}
          {viewMode === 'district' && (selectedDistrict ? renderDistrictView() : renderDistrictsList())}
          {viewMode === 'landmark' && (selectedLandmark ? renderLandmarkView() : renderLandmarksList())}
          {viewMode === 'stats' && renderStatsView()}
        </View>
        
        {/* Info Modal */}
        {showInfo && (
          <View style={styles.infoModal}>
            <BlurView intensity={80} style={styles.infoBlur}>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>3D City Generation</Text>
                <Text style={styles.infoText}>
                  Using Approach B (OpenStreetMap + Procedural Generation) with the Curated District Hub Model.
                </Text>
                <Text style={styles.infoText}>
                  • 5 districts covering ~5 km²{'\n'}
                  • 20 iconic LA landmarks{'\n'}
                  • 10:1 distance compression{'\n'}
                  • LOD optimization for mobile{'\n'}
                  • Free OSM and USGS data sources
                </Text>
                <TouchableOpacity
                  style={styles.infoClose}
                  onPress={() => setShowInfo(false)}
                >
                  <Text style={styles.infoCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

// Helper component for districts list
function renderDistrictsList() {
  const { loadDistrict, state } = useCity3D();
  
  return (
    <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
      {Object.values(DISTRICT_CONFIGS).map((district) => {
        const isLoaded = state.loadedDistricts.has(district.id);
        const isLoading = state.loadingDistricts.has(district.id);
        
        return (
          <TouchableOpacity
            key={district.id}
            style={styles.districtCard}
            onPress={() => loadDistrict(district.id)}
          >
            <View style={[styles.districtColor, { backgroundColor: district.theme.primaryColor }]} />
            
            <View style={styles.districtCardContent}>
              <Text style={[styles.districtCardTitle, { color: district.theme.primaryColor }]}>
                {district.displayName}
              </Text>
              
              <Text style={styles.districtCardDesc} numberOfLines={2}>
                {district.description}
              </Text>
              
              <View style={styles.districtCardMeta}>
                <View style={styles.metaItem}>
                  <Building size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{district.landmarks.length} landmarks</Text>
                </View>
                <View style={styles.metaItem}>
                  <MapPin size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{district.sizeKm2} km²</Text>
                </View>
              </View>
              
              {isLoaded && (
                <Text style={styles.loadedLabel}>✓ Loaded</Text>
              )}
            </View>
            
            {isLoading ? (
              <Text style={styles.loadingText}>Loading...</Text>
            ) : (
              <ChevronRight size={20} color="#6B7280" />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// Helper component for landmarks list
function renderLandmarksList() {
  const landmarks = useLandmarks();
  const { state } = useCity3D();
  
  const landmarksByRarity = useMemo(() => {
    return {
      legendary: landmarks.filter(l => l.rarity === 'legendary'),
      epic: landmarks.filter(l => l.rarity === 'epic'),
      rare: landmarks.filter(l => l.rarity === 'rare'),
    };
  }, [landmarks]);
  
  return (
    <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
      {(['legendary', 'epic', 'rare'] as const).map((rarity) => (
        <View key={rarity} style={styles.raritySection}>
          <Text style={[styles.raritySectionTitle, { color: getRarityColorStatic(rarity) }]}>
            {rarity.toUpperCase()} ({landmarksByRarity[rarity].length})
          </Text>
          
          {landmarksByRarity[rarity].map((landmark) => {
            const isDiscovered = state.discoveredLandmarks.has(landmark.id);
            
            return (
              <TouchableOpacity
                key={landmark.id}
                style={styles.landmarkListItem}
                onPress={() => {}}
              >
                <View style={[styles.landmarkListIcon, { backgroundColor: getRarityColorStatic(landmark.rarity) }]}>
                  <Star size={16} color="#FFFFFF" fill="#FFFFFF" />
                </View>
                
                <View style={styles.landmarkListInfo}>
                  <Text style={styles.landmarkListName}>{landmark.displayName}</Text>
                  <Text style={styles.landmarkListValue}>{landmark.treasureValue} MUSO</Text>
                </View>
                
                {isDiscovered ? (
                  <Text style={styles.discoveredLabel}>✓</Text>
                ) : (
                  <Lock size={16} color="#6B7280" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

// Static helper for rarity color
function getRarityColorStatic(rarity: LandmarkRarity): string {
  switch (rarity) {
    case 'legendary': return '#FFD700';
    case 'epic': return '#9B59B6';
    case 'rare': return '#3498DB';
    default: return '#95A5A6';
  }
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerBack: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerInfo: {
    padding: 8,
  },
  viewTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  viewTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#1E293B',
  },
  viewTabActive: {
    backgroundColor: '#3B82F6',
  },
  viewTabText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  viewTabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  
  // Map View
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapBackground: {
    flex: 1,
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  mapTile: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  districtOverlay: {
    position: 'absolute',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  districtLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  districtSize: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  landmarkMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLegend: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  
  // District View
  districtDetail: {
    flex: 1,
  },
  districtHeader: {
    padding: 20,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  districtTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  districtDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  districtContent: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statCard: {
    width: (width - 64) / 2,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginRight: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  terrainInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  terrainItem: {
    marginRight: 24,
    marginBottom: 8,
  },
  terrainLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  terrainValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  landmarkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  landmarkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  landmarkInfo: {
    flex: 1,
  },
  landmarkName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  landmarkDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  landmarkStars: {
    flexDirection: 'row',
    marginTop: 4,
  },
  styleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  styleTag: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  styleTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  loadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  loadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadedInfo: {
    backgroundColor: '#059669',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  loadedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Landmark View
  landmarkDetail: {
    flex: 1,
  },
  landmarkDetailHeader: {
    padding: 20,
    paddingBottom: 24,
  },
  landmarkHeaderContent: {
    marginTop: 8,
  },
  rarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  rarityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  landmarkDetailTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  landmarkDetailDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  landmarkDetailContent: {
    flex: 1,
    padding: 16,
  },
  coordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  coordInfo: {
    marginLeft: 12,
    flex: 1,
  },
  coordLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  coordValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  coordAlt: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  treasureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  treasureInfo: {
    marginLeft: 12,
  },
  treasureLabel: {
    fontSize: 12,
    color: '#92400E',
  },
  treasureValue: {
    fontSize: 18,
    color: '#92400E',
    fontWeight: '700',
  },
  riddleCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  riddleLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  riddleText: {
    fontSize: 16,
    color: '#F59E0B',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  historyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  historyText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  foundedText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  factsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  factsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  factItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  factBullet: {
    color: '#3B82F6',
    marginRight: 8,
  },
  factText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  modelCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  modelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  lodInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  lodLevel: {
    width: '50%',
    marginBottom: 8,
  },
  lodLevelName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  lodDistance: {
    fontSize: 11,
    color: '#6B7280',
  },
  lodTris: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionButtons: {
    marginTop: 16,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Stats View
  statsView: {
    flex: 1,
    padding: 16,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  globalStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  globalStat: {
    width: '50%',
    marginBottom: 16,
  },
  globalStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3B82F6',
  },
  globalStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    marginTop: 8,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressColor: {
    width: 4,
    height: '100%',
  },
  progressContent: {
    flex: 1,
    padding: 12,
  },
  progressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  progressBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  progressBadgeComplete: {
    backgroundColor: '#059669',
  },
  progressBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  perfStats: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  perfStat: {
    flex: 1,
    alignItems: 'center',
  },
  perfValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  perfLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  lodDistances: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
  },
  lodDist: {
    flex: 1,
    alignItems: 'center',
  },
  lodDistValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  lodDistLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  
  // List Views
  listContainer: {
    flex: 1,
    padding: 16,
  },
  districtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  districtColor: {
    width: 6,
    height: '100%',
  },
  districtCardContent: {
    flex: 1,
    padding: 16,
  },
  districtCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  districtCardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  districtCardMeta: {
    flexDirection: 'row',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  loadedLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#F59E0B',
    marginRight: 16,
  },
  raritySection: {
    marginBottom: 24,
  },
  raritySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  landmarkListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  landmarkListIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landmarkListInfo: {
    flex: 1,
    marginLeft: 12,
  },
  landmarkListName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  landmarkListValue: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 2,
  },
  discoveredLabel: {
    color: '#059669',
    fontSize: 16,
  },
  
  // Info Modal
  infoModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBlur: {
    width: width - 64,
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoContent: {
    backgroundColor: '#1E293B',
    padding: 24,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 12,
  },
  infoClose: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  infoCloseText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});