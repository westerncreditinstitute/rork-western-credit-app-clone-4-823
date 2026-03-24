// 3D LA City Viewer for Credit Life Simulator
// Main screen for exploring the 3D Los Angeles city

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCity3D } from '../../contexts/City3DContext';
import { DistrictId, DistrictConfig, LandmarkConfig } from '../../types/city3d';
import { DISTRICTS } from '../../config/districts';

const { width } = Dimensions.get('window');

// District card component
function DistrictCard({ 
  district, 
  onPress, 
  isSelected 
}: { 
  district: DistrictConfig; 
  onPress: () => void;
  isSelected: boolean;
}) {
  const landmarkCount = district.landmarks.length;
  const totalTreasure = district.landmarks.reduce((sum: number, l) => sum + (l.treasureValue || 0), 0);
  
  return (
    <TouchableOpacity
      style={[styles.districtCard, isSelected && styles.districtCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.districtColorBar, { backgroundColor: district.theme.primaryColor }]} />
      <View style={styles.districtContent}>
        <Text style={styles.districtName}>{district.name}</Text>
        <Text style={styles.districtDescription} numberOfLines={2}>
          {district.description}
        </Text>
        <View style={styles.districtStats}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🏛️</Text>
            <Text style={styles.statText}>{landmarkCount} landmarks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statText}>{totalTreasure} treasure</Text>
          </View>
        </View>
      </View>
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Landmark item component
function LandmarkItem({ 
  landmark, 
  isDiscovered,
  onPress 
}: { 
  landmark: LandmarkConfig; 
  isDiscovered: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.landmarkItem, isDiscovered && styles.landmarkDiscovered]}
      onPress={onPress}
    >
      <View style={styles.landmarkIcon}>
        <Text style={styles.landmarkIconText}>
          {landmark.type === 'landmark' ? '🏛️' : landmark.type === 'hidden_gem' ? '💎' : '🎁'}
        </Text>
      </View>
      <View style={styles.landmarkInfo}>
        <Text style={styles.landmarkName}>
          {isDiscovered ? landmark.name : '???'}
        </Text>
        <Text style={styles.landmarkType}>
          {landmark.type.replace('_', ' ').toUpperCase()}
        </Text>
        {isDiscovered && landmark.treasureValue && (
          <Text style={styles.landmarkTreasure}>
            💰 {landmark.treasureValue} treasure value
          </Text>
        )}
      </View>
      {isDiscovered && (
        <View style={styles.discoveredBadge}>
          <Text style={styles.discoveredBadgeText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Map view placeholder (would integrate with actual 3D map)
function MapView() {
  const { state } = useCity3D();
  
  if (!state.districtConfig) return null;
  
  const district = state.districtConfig;
  
  return (
    <View style={styles.mapContainer}>
      <LinearGradient
        colors={[district.theme.primaryColor + '40', district.theme.secondaryColor + '40']}
        style={styles.mapGradient}
      >
        {/* District overview visualization */}
        <View style={styles.mapOverlay}>
          <Text style={styles.mapDistrictName}>{district.name}</Text>
          <Text style={styles.mapCoordinates}>
            {district.center.lat.toFixed(4)}°N, {Math.abs(district.center.lon).toFixed(4)}°W
          </Text>
          
          {/* Landmark markers */}
          {state.landmarks.map((landmark, _index) => {
            const isDiscovered = state.discoveredLandmarks.has(landmark.id);
            // Calculate position based on coordinates relative to district center
            const offsetX = ((landmark.coordinates.lon - district.center.lon) / 0.01) * 100;
            const offsetY = ((landmark.coordinates.lat - district.center.lat) / 0.01) * 100;
            
            return (
              <View
                key={landmark.id}
                style={[
                  styles.landmarkMarker,
                  { 
                    left: `${50 + offsetX}%`,
                    top: `${50 + offsetY}%`,
                    backgroundColor: isDiscovered ? district.theme.accentColor : '#666'
                  }
                ]}
              >
                <Text style={styles.markerIcon}>
                  {isDiscovered ? '📍' : '❓'}
                </Text>
              </View>
            );
          })}
          
          {/* Player marker */}
          {state.playerPosition.lat !== 0 && (
            <View
              style={[
                styles.playerMarker,
                {
                  left: '50%',
                  top: '50%'
                }
              ]}
            >
              <Text style={styles.playerIcon}>👤</Text>
            </View>
          )}
        </View>
      </LinearGradient>
      
      {/* Map controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.mapControlButton}>
          <Text style={styles.mapControlText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapControlButton}>
          <Text style={styles.mapControlText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapControlButton}>
          <Text style={styles.mapControlText}>🧭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Stats panel component
function StatsPanel() {
  const { state } = useCity3D();
  
  return (
    <View style={styles.statsPanel}>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Buildings:</Text>
        <Text style={styles.statValue}>{state.buildings.length}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Discovered:</Text>
        <Text style={styles.statValue}>
          {state.discoveredLandmarks.size}/{state.landmarks.length}
        </Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Treasure:</Text>
        <Text style={styles.statValue}>💰 {state.totalTreasureValue}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>LOD:</Text>
        <Text style={styles.statValue}>{state.currentLOD.toUpperCase()}</Text>
      </View>
    </View>
  );
}

// Loading overlay component
function LoadingOverlay() {
  const { state } = useCity3D();
  
  if (!state.isLoading) return null;
  
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#FFD700" />
      <Text style={styles.loadingText}>{state.loadingMessage}</Text>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${state.loadingProgress}%` }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>{state.loadingProgress}%</Text>
    </View>
  );
}

// Main component
export default function City3DScreen() {
  const params = useLocalSearchParams<{ district?: DistrictId }>();
  const { 
    state, 
    loadDistrict, 
    discoverLandmark,
    checkLandmarkProximity 
  } = useCity3D();
  
  const [selectedView, setSelectedView] = useState<'map' | 'district' | 'landmarks'>('map');
  const [_selectedLandmark, setSelectedLandmark] = useState<LandmarkConfig | null>(null);
  
  // Load district from params or default to hollywood
  useEffect(() => {
    const targetDistrict = params.district || 'hollywood';
    if (targetDistrict !== state.currentDistrict) {
      console.log('[City3D] Loading district:', targetDistrict);
      void loadDistrict(targetDistrict as DistrictId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.district]);
  
  // Handle landmark discovery
  const handleLandmarkPress = useCallback((landmark: LandmarkConfig) => {
    if (state.discoveredLandmarks.has(landmark.id)) {
      // Show landmark details
      setSelectedLandmark(landmark);
    } else {
      // Check if player is close enough
      const nearbyLandmark = checkLandmarkProximity();
      if (nearbyLandmark?.id === landmark.id) {
        // Discover the landmark
        discoverLandmark(landmark.id);
        Alert.alert(
          '🎉 Landmark Discovered!',
          `You found ${landmark.name}!\n\n${landmark.historicalLore}`,
          [{ text: 'Awesome!', style: 'default' }]
        );
      } else {
        Alert.alert(
          '🔍 Not Yet Discovered',
          `Visit this location in the 3D city to discover it!\n\nRiddle: ${landmark.riddle}`,
          [{ text: 'OK', style: 'default' }]
        );
      }
    }
  }, [state.discoveredLandmarks, checkLandmarkProximity, discoverLandmark]);
  
  // Handle district selection
  const handleDistrictSelect = useCallback((districtId: DistrictId) => {
    void loadDistrict(districtId);
    setSelectedView('map');
  }, [loadDistrict]);
  
  // Render map view
  const renderMapView = () => (
    <View style={styles.viewContainer}>
      <MapView />
      <StatsPanel />
      
      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setSelectedView('district')}
        >
          <Text style={styles.actionButtonIcon}>🏙️</Text>
          <Text style={styles.actionButtonText}>Switch District</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setSelectedView('landmarks')}
        >
          <Text style={styles.actionButtonIcon}>🗺️</Text>
          <Text style={styles.actionButtonText}>View Landmarks</Text>
        </TouchableOpacity>
      </View>
      
      {/* Start exploration button */}
      <TouchableOpacity 
        style={[styles.startButton, !state.currentDistrict && styles.startButtonDisabled]}
        onPress={() => {
          if (state.currentDistrict) {
            console.log('[City3D] Navigating to scavenger hunt with district:', state.currentDistrict);
            router.push(`/game/scavenger-hunt?district=${state.currentDistrict}`);
          } else {
            console.log('[City3D] No district loaded, loading default...');
            void loadDistrict('hollywood' as DistrictId);
            Alert.alert(
              'Loading District',
              'Please wait for the district to load, then tap Start Exploration again.',
              [{ text: 'OK' }]
            );
          }
        }}
      >
        <LinearGradient
          colors={state.currentDistrict ? ['#FFD700', '#FFA500'] : ['#888', '#666']}
          style={styles.startButtonGradient}
        >
          <Text style={styles.startButtonText}>
            {state.isLoading ? '⏳ Loading District...' : '🚀 Start Exploration'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
  
  // Render district selection
  const renderDistrictView = () => (
    <View style={styles.viewContainer}>
      <Text style={styles.sectionTitle}>Select a District</Text>
      <Text style={styles.sectionSubtitle}>
        Each district offers unique landmarks and treasure hunting opportunities
      </Text>
      
      <ScrollView 
        style={styles.districtList}
        showsVerticalScrollIndicator={false}
      >
        {(Object.values(DISTRICTS) as DistrictConfig[]).map((district) => (
          <DistrictCard
            key={district.id}
            district={district}
            isSelected={state.currentDistrict === district.id}
            onPress={() => handleDistrictSelect(district.id)}
          />
        ))}
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => setSelectedView('map')}
      >
        <Text style={styles.backButtonText}>← Back to Map</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Render landmarks list
  const renderLandmarksView = () => (
    <View style={styles.viewContainer}>
      <Text style={styles.sectionTitle}>
        {state.districtConfig?.name || 'All Landmarks'}
      </Text>
      <Text style={styles.sectionSubtitle}>
        {state.discoveredLandmarks.size} of {state.landmarks.length} discovered
      </Text>
      
      <ScrollView 
        style={styles.landmarkList}
        showsVerticalScrollIndicator={false}
      >
        {state.landmarks.map((landmark) => (
          <LandmarkItem
            key={landmark.id}
            landmark={landmark}
            isDiscovered={state.discoveredLandmarks.has(landmark.id)}
            onPress={() => handleLandmarkPress(landmark)}
          />
        ))}
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => setSelectedView('map')}
      >
        <Text style={styles.backButtonText}>← Back to Map</Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBack}
          onPress={() => router.back()}
        >
          <Text style={styles.headerBackText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>3D LA City</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerTreasure}>💰 {state.totalTreasureValue}</Text>
        </View>
      </View>
      
      {/* Content based on selected view */}
      {selectedView === 'map' && renderMapView()}
      {selectedView === 'district' && renderDistrictView()}
      {selectedView === 'landmarks' && renderLandmarksView()}
      
      {/* Loading overlay */}
      <LoadingOverlay />
      
      {/* Error display */}
      {state.error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>⚠️ {state.error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => state.currentDistrict && loadDistrict(state.currentDistrict)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerBack: {
    padding: 8,
  },
  headerBackText: {
    color: '#FFD700',
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    padding: 8,
  },
  headerTreasure: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewContainer: {
    flex: 1,
    padding: 16,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapGradient: {
    flex: 1,
    position: 'relative',
  },
  mapOverlay: {
    flex: 1,
    padding: 20,
    position: 'relative',
  },
  mapDistrictName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  mapCoordinates: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  landmarkMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -15,
    marginTop: -15,
  },
  markerIcon: {
    fontSize: 16,
  },
  playerMarker: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -20,
    marginTop: -20,
  },
  playerIcon: {
    fontSize: 24,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -60 }],
    gap: 8,
  },
  mapControlButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapControlText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  statsPanel: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  startButtonDisabled: {
    opacity: 0.7,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  districtList: {
    flex: 1,
  },
  districtCard: {
    flexDirection: 'row',
    backgroundColor: '#252540',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  districtCardSelected: {
    borderColor: '#FFD700',
  },
  districtColorBar: {
    width: 8,
  },
  districtContent: {
    flex: 1,
    padding: 16,
  },
  districtName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  districtDescription: {
    color: '#888',
    fontSize: 13,
    marginBottom: 12,
  },
  districtStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 14,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
  },
  selectedBadgeText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  landmarkList: {
    flex: 1,
  },
  landmarkItem: {
    flexDirection: 'row',
    backgroundColor: '#252540',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  landmarkDiscovered: {
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  landmarkIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  landmarkIconText: {
    fontSize: 24,
  },
  landmarkInfo: {
    flex: 1,
  },
  landmarkName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  landmarkType: {
    color: '#888',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  landmarkTreasure: {
    color: '#FFD700',
    fontSize: 12,
    marginTop: 4,
  },
  discoveredBadge: {
    width: 20,
    height: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discoveredBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFD700',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  progressBar: {
    width: width * 0.6,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressText: {
    color: '#FFD700',
    fontSize: 14,
    marginTop: 8,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    zIndex: 100,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
});