// Scavenger Hunt Service - MUSO Token Treasure Hunt in Los Angeles
// Uses OpenStreetMap + geospatial anchors for AR treasure discovery

import {
  TreasureLocation,
  TreasureClaim,
  DailyHuntProgress,
  HuntStreak,
  TreasureDistance,
  PlayerLocation,
  RARITY_CONFIG,
  STREAK_BONUSES,
} from '../types/scavengerHunt';

// ═══════════════════════════════════════════════════════════════
// 🏙️ LOS ANGELES TREASURE LOCATIONS
// Real LA landmarks and neighborhoods with geospatial coordinates
// ═══════════════════════════════════════════════════════════════

const LA_TREASURE_LOCATIONS: TreasureLocation[] = [
  // ── HOLLYWOOD & ENTERTAINMENT ──
  {
    id: 'la_hollywood_walk',
    name: 'Walk of Fame Fortune',
    description: 'Hidden among the stars on Hollywood Boulevard, a pile of MUSO tokens glimmers under the California sun.',
    latitude: 34.1016,
    longitude: -118.3267,
    neighborhood: 'Hollywood',
    landmark: 'Hollywood Walk of Fame',
    treasureType: 'coin_pile',
    tokenReward: 30,
    rarity: 'common',
    icon: '⭐',
    hint: 'Look where the stars shine beneath your feet on the boulevard of dreams.',
    radiusMeters: 150,
    modelColor: '#FFD700',
    glowColor: '#FFA500',
    particleEffect: 'sparkle',
  },
  {
    id: 'la_griffith_observatory',
    name: 'Observatory Vault',
    description: 'At the crown of Griffith Park, a crystal vault pulses with cosmic energy, filled with MUSO tokens from the stars.',
    latitude: 34.1184,
    longitude: -118.3004,
    neighborhood: 'Los Feliz',
    landmark: 'Griffith Observatory',
    treasureType: 'crystal_vault',
    tokenReward: 150,
    rarity: 'epic',
    icon: '🔭',
    hint: 'Where Angelenos gaze at the cosmos, riches await among the telescopes.',
    radiusMeters: 200,
    modelColor: '#8B5CF6',
    glowColor: '#A78BFA',
    particleEffect: 'glow',
  },
  {
    id: 'la_chinese_theatre',
    name: 'Theatre Dragon Hoard',
    description: 'Behind the famous handprints, a legendary golden MUSO token radiates ancient Hollywood magic.',
    latitude: 34.1022,
    longitude: -118.3409,
    neighborhood: 'Hollywood',
    landmark: "TCL Chinese Theatre",
    treasureType: 'golden_muso',
    tokenReward: 100,
    rarity: 'rare',
    icon: '🐉',
    hint: 'Place your hands where legends once stood, and discover golden treasure.',
    radiusMeters: 100,
    modelColor: '#EF4444',
    glowColor: '#F87171',
    particleEffect: 'fire',
  },

  // ── DOWNTOWN LA ──
  {
    id: 'la_grand_central_market',
    name: 'Market Token Stash',
    description: 'Tucked between the vibrant food stalls of Grand Central Market, a treasure chest overflows with MUSO tokens.',
    latitude: 34.0510,
    longitude: -118.2488,
    neighborhood: 'Downtown',
    landmark: 'Grand Central Market',
    treasureType: 'treasure_chest',
    tokenReward: 50,
    rarity: 'uncommon',
    icon: '🥘',
    hint: 'Where flavors from around the world converge, so do hidden fortunes.',
    radiusMeters: 120,
    modelColor: '#10B981',
    glowColor: '#34D399',
    particleEffect: 'sparkle',
  },
  {
    id: 'la_walt_disney_hall',
    name: 'Silver Concert Cache',
    description: 'The sweeping metallic curves of the concert hall conceal a legendary token fountain of pure MUSO energy.',
    latitude: 34.0553,
    longitude: -118.2498,
    neighborhood: 'Downtown',
    landmark: 'Walt Disney Concert Hall',
    treasureType: 'token_fountain',
    tokenReward: 200,
    rarity: 'legendary',
    icon: '🎵',
    hint: 'Where music meets architecture, a fountain of tokens plays an eternal symphony.',
    radiusMeters: 180,
    modelColor: '#F59E0B',
    glowColor: '#FBBF24',
    particleEffect: 'rainbow',
  },
  {
    id: 'la_arts_district',
    name: 'Street Art Stash',
    description: 'Among the colorful murals of the Arts District, MUSO coins are painted into reality.',
    latitude: 34.0404,
    longitude: -118.2340,
    neighborhood: 'Arts District',
    landmark: 'Arts District Murals',
    treasureType: 'coin_pile',
    tokenReward: 35,
    rarity: 'common',
    icon: '🎨',
    hint: 'Where walls become canvases, tokens emerge from the painted world.',
    radiusMeters: 200,
    modelColor: '#EC4899',
    glowColor: '#F472B6',
    particleEffect: 'sparkle',
  },

  // ── SANTA MONICA & BEACH ──
  {
    id: 'la_santa_monica_pier',
    name: 'Pier Treasure Chest',
    description: 'At the end of Route 66, where the Pacific meets the boardwalk, a treasure chest rises from the surf.',
    latitude: 34.0094,
    longitude: -118.4973,
    neighborhood: 'Santa Monica',
    landmark: 'Santa Monica Pier',
    treasureType: 'treasure_chest',
    tokenReward: 75,
    rarity: 'rare',
    icon: '🎡',
    hint: 'Where the Mother Road ends and the ocean begins, treasures wash ashore.',
    radiusMeters: 200,
    modelColor: '#06B6D4',
    glowColor: '#22D3EE',
    particleEffect: 'ice',
  },
  {
    id: 'la_venice_beach',
    name: 'Muscle Beach Bounty',
    description: 'On the legendary Venice boardwalk, a golden MUSO token flexes its shimmer near the outdoor gym.',
    latitude: 34.0007,
    longitude: -118.4800,
    neighborhood: 'Venice',
    landmark: 'Venice Beach Boardwalk',
    treasureType: 'golden_muso',
    tokenReward: 100,
    rarity: 'rare',
    icon: '💪',
    hint: 'Where bodybuilders pump iron and skaters roll free, golden tokens shine.',
    radiusMeters: 250,
    modelColor: '#F97316',
    glowColor: '#FB923C',
    particleEffect: 'fire',
  },

  // ── BEVERLY HILLS & WESTSIDE ──
  {
    id: 'la_rodeo_drive',
    name: 'Rodeo Drive Diamonds',
    description: 'On the most glamorous shopping street in the world, a crystal vault holds premium MUSO tokens.',
    latitude: 34.0674,
    longitude: -118.4003,
    neighborhood: 'Beverly Hills',
    landmark: 'Rodeo Drive',
    treasureType: 'crystal_vault',
    tokenReward: 175,
    rarity: 'epic',
    icon: '💎',
    hint: 'Where luxury brands line the streets, the ultimate crypto treasure awaits.',
    radiusMeters: 150,
    modelColor: '#8B5CF6',
    glowColor: '#C4B5FD',
    particleEffect: 'glow',
  },
  {
    id: 'la_the_grove',
    name: 'Fountain of Tokens',
    description: 'At the famous Grove fountain, MUSO tokens dance in the water jets every hour.',
    latitude: 34.0720,
    longitude: -118.3579,
    neighborhood: 'Fairfax',
    landmark: 'The Grove',
    treasureType: 'token_fountain',
    tokenReward: 60,
    rarity: 'uncommon',
    icon: '⛲',
    hint: 'Where shoppers gather and water dances, tokens flow freely.',
    radiusMeters: 130,
    modelColor: '#3B82F6',
    glowColor: '#60A5FA',
    particleEffect: 'sparkle',
  },

  // ── EAST LA & CULTURE ──
  {
    id: 'la_olvera_street',
    name: 'Olvera Heritage Gold',
    description: 'In the birthplace of Los Angeles, ancient MUSO coins honor the city\'s rich history.',
    latitude: 34.0580,
    longitude: -118.2376,
    neighborhood: 'Downtown',
    landmark: 'Olvera Street',
    treasureType: 'coin_pile',
    tokenReward: 40,
    rarity: 'uncommon',
    icon: '🏛️',
    hint: 'Where LA began, tokens carry the weight of centuries.',
    radiusMeters: 100,
    modelColor: '#D97706',
    glowColor: '#FBBF24',
    particleEffect: 'glow',
  },
  {
    id: 'la_echo_park',
    name: 'Lake Echo Treasure',
    description: 'Beneath the lotus flowers of Echo Park Lake, a treasure chest glistens with MUSO tokens.',
    latitude: 34.0781,
    longitude: -118.2606,
    neighborhood: 'Echo Park',
    landmark: 'Echo Park Lake',
    treasureType: 'treasure_chest',
    tokenReward: 55,
    rarity: 'uncommon',
    icon: '🪷',
    hint: 'Where lotus blooms float and paddleboats drift, treasure rests beneath the surface.',
    radiusMeters: 170,
    modelColor: '#EC4899',
    glowColor: '#F9A8D4',
    particleEffect: 'sparkle',
  },

  // ── SOUTH LA & CULTURE ──
  {
    id: 'la_watts_towers',
    name: 'Towers of Fortune',
    description: 'The iconic Watts Towers radiate with an epic crystal vault of MUSO energy.',
    latitude: 33.9388,
    longitude: -118.2413,
    neighborhood: 'Watts',
    landmark: 'Watts Towers',
    treasureType: 'crystal_vault',
    tokenReward: 125,
    rarity: 'epic',
    icon: '🗼',
    hint: 'Where art towers reach for the sky, riches are woven into the very structure.',
    radiusMeters: 120,
    modelColor: '#6366F1',
    glowColor: '#818CF8',
    particleEffect: 'rainbow',
  },

  // ── UNIVERSAL & STUDIO CITY ──
  {
    id: 'la_universal_citywalk',
    name: 'CityWalk Jackpot',
    description: 'Among the neon lights of Universal CityWalk, a legendary golden MUSO token spins like a movie prop.',
    latitude: 34.1370,
    longitude: -118.3535,
    neighborhood: 'Universal City',
    landmark: 'Universal CityWalk',
    treasureType: 'golden_muso',
    tokenReward: 110,
    rarity: 'rare',
    icon: '🎬',
    hint: 'Where movies come to life outside the studio gates, golden tokens await their close-up.',
    radiusMeters: 200,
    modelColor: '#EF4444',
    glowColor: '#FCA5A5',
    particleEffect: 'fire',
  },

  // ── KOREATOWN & MID-CITY ──
  {
    id: 'la_lacma',
    name: 'Urban Light Fortune',
    description: 'Among the 202 street lamps of Chris Burden\'s Urban Light, a token fountain illuminates the night.',
    latitude: 34.0639,
    longitude: -118.3592,
    neighborhood: 'Mid-Wilshire',
    landmark: 'LACMA Urban Light',
    treasureType: 'token_fountain',
    tokenReward: 85,
    rarity: 'rare',
    icon: '💡',
    hint: 'Where hundreds of lamps create a forest of light, tokens glow between the posts.',
    radiusMeters: 100,
    modelColor: '#F59E0B',
    glowColor: '#FDE68A',
    particleEffect: 'glow',
  },

  // ── SAN PEDRO & HARBOR ──
  {
    id: 'la_san_pedro_harbor',
    name: 'Harbor Pirate Cache',
    description: 'Deep in the historic Port of Los Angeles, pirate-era coins merge with modern MUSO tokens.',
    latitude: 33.7397,
    longitude: -118.2792,
    neighborhood: 'San Pedro',
    landmark: 'Port of Los Angeles',
    treasureType: 'treasure_chest',
    tokenReward: 65,
    rarity: 'uncommon',
    icon: '🏴‍☠️',
    hint: 'Where ships dock and cargo moves, a pirate\'s treasure stays anchored in time.',
    radiusMeters: 250,
    modelColor: '#1E293B',
    glowColor: '#64748B',
    particleEffect: 'sparkle',
  },

  // ── PASADENA ──
  {
    id: 'la_rose_bowl',
    name: 'Rose Bowl Riches',
    description: 'In the shadow of the legendary stadium, a coin pile sparkles with championship MUSO tokens.',
    latitude: 34.1613,
    longitude: -118.1676,
    neighborhood: 'Pasadena',
    landmark: 'Rose Bowl Stadium',
    treasureType: 'coin_pile',
    tokenReward: 45,
    rarity: 'uncommon',
    icon: '🌹',
    hint: 'Where champions are crowned and roses bloom, victory tokens await.',
    radiusMeters: 200,
    modelColor: '#DC2626',
    glowColor: '#FCA5A5',
    particleEffect: 'sparkle',
  },

  // ── MALIBU ──
  {
    id: 'la_malibu_point_dume',
    name: 'Clifftop Legendary Cache',
    description: 'At the dramatic cliffs of Point Dume, a legendary token fountain erupts with the power of the Pacific.',
    latitude: 34.0019,
    longitude: -118.8048,
    neighborhood: 'Malibu',
    landmark: 'Point Dume',
    treasureType: 'token_fountain',
    tokenReward: 250,
    rarity: 'legendary',
    icon: '🌊',
    hint: 'Where cliffs meet the crashing waves and whales breach offshore, the ultimate treasure erupts.',
    radiusMeters: 300,
    modelColor: '#0EA5E9',
    glowColor: '#38BDF8',
    particleEffect: 'rainbow',
  },

  // ── SILVER LAKE ──
  {
    id: 'la_silver_lake_reservoir',
    name: 'Silver Lake Shimmer',
    description: 'Around the trendy Silver Lake Reservoir walking path, MUSO coins shimmer in the afternoon light.',
    latitude: 34.0862,
    longitude: -118.2627,
    neighborhood: 'Silver Lake',
    landmark: 'Silver Lake Reservoir',
    treasureType: 'coin_pile',
    tokenReward: 30,
    rarity: 'common',
    icon: '✨',
    hint: 'Circle the hipster lake where joggers and dreamers meet, tokens sparkle in the water.',
    radiusMeters: 200,
    modelColor: '#94A3B8',
    glowColor: '#CBD5E1',
    particleEffect: 'sparkle',
  },
];

// ═══════════════════════════════════════════════════════════════
// 📐 GEO MATH UTILITIES
// ═══════════════════════════════════════════════════════════════

export class ScavengerHuntService {
  private static readonly EARTH_RADIUS_M = 6371000;

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_M * c;
  }

  /**
   * Calculate bearing between two coordinates
   */
  static calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = this.toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(this.toRad(lat2));
    const x = Math.cos(this.toRad(lat1)) * Math.sin(this.toRad(lat2)) -
              Math.sin(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.cos(dLon);
    let bearing = Math.atan2(y, x);
    bearing = this.toDeg(bearing);
    return (bearing + 360) % 360;
  }

  /**
   * Get compass direction from bearing
   */
  static bearingToDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  /**
   * Format distance for display
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private static toDeg(rad: number): number {
    return rad * (180 / Math.PI);
  }

  // ═══════════════════════════════════════════════════════════════
  // 🗺️ LOCATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get today's date key
   */
  static getTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Get all treasure locations for today
   * Locations rotate daily based on date seed for variety
   */
  static getTodaysTreasures(): TreasureLocation[] {
    const dayKey = this.getTodayKey();
    const seed = this.hashString(dayKey);
    
    // Shuffle locations deterministically based on date
    const shuffled = [...LA_TREASURE_LOCATIONS].sort((a, b) => {
      const hashA = this.hashString(a.id + dayKey);
      const hashB = this.hashString(b.id + dayKey);
      return hashA - hashB;
    });

    // Select 10 treasures per day (from 20 total)
    const dailyCount = 10;
    const selected = shuffled.slice(0, dailyCount);

    // Adjust rewards slightly based on day seed for variety
    return selected.map(treasure => ({
      ...treasure,
      tokenReward: Math.round(treasure.tokenReward * (0.9 + (this.hashString(treasure.id + dayKey + 'reward') % 30) / 100)),
    }));
  }

  /**
   * Simple string hash function for deterministic daily rotation
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // ═══════════════════════════════════════════════════════════════
  // 📍 PROXIMITY & DISTANCE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate distances and sort by proximity to player
   */
  static getTreasureDistances(
    playerLat: number,
    playerLon: number,
    treasures: TreasureLocation[]
  ): TreasureDistance[] {
    return treasures.map(treasure => {
      const distanceMeters = this.calculateDistance(
        playerLat, playerLon,
        treasure.latitude, treasure.longitude
      );
      const bearing = this.calculateBearing(
        playerLat, playerLon,
        treasure.latitude, treasure.longitude
      );
      return {
        treasure,
        distanceMeters,
        isInRange: distanceMeters <= treasure.radiusMeters,
        bearing,
        direction: this.bearingToDirection(bearing),
      };
    }).sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  /**
   * Find treasures within range of player
   */
  static findNearbyTreasures(
    playerLat: number,
    playerLon: number,
    treasures: TreasureLocation[],
    maxRangeMeters: number = 500
  ): TreasureLocation[] {
    return treasures.filter(t => {
      const dist = this.calculateDistance(playerLat, playerLon, t.latitude, t.longitude);
      return dist <= maxRangeMeters;
    });
  }

  /**
   * Check if player is within claim range of a treasure
   */
  static isInClaimRange(
    playerLat: number,
    playerLon: number,
    treasure: TreasureLocation
  ): boolean {
    const distance = this.calculateDistance(
      playerLat, playerLon,
      treasure.latitude, treasure.longitude
    );
    return distance <= treasure.radiusMeters;
  }

  // ═══════════════════════════════════════════════════════════════
  // 🎁 CLAIM & REWARD LOGIC
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if a treasure has already been claimed today
   */
  static isTreasureClaimedToday(treasureId: string, claims: TreasureClaim[]): boolean {
    const todayKey = this.getTodayKey();
    return claims.some(c => c.treasureId === treasureId && c.dayKey === todayKey);
  }

  /**
   * Calculate the streak bonus multiplier
   */
  static getStreakMultiplier(streakCount: number): number {
    let multiplier = 1.0;
    const thresholds = Object.keys(STREAK_BONUSES).map(Number).sort((a, b) => b - a);
    for (const threshold of thresholds) {
      if (streakCount >= threshold) {
        multiplier = STREAK_BONUSES[threshold].multiplier;
        break;
      }
    }
    return multiplier;
  }

  /**
   * Get the current streak bonus label
   */
  static getStreakBonusLabel(streakCount: number): string | null {
    const thresholds = Object.keys(STREAK_BONUSES).map(Number).sort((a, b) => b - a);
    for (const threshold of thresholds) {
      if (streakCount >= threshold) {
        return STREAK_BONUSES[threshold].label;
      }
    }
    return null;
  }

  /**
   * Calculate total reward for claiming a treasure
   */
  static calculateReward(
    treasure: TreasureLocation,
    streakCount: number
  ): { baseReward: number; streakMultiplier: number; rarityMultiplier: number; totalReward: number } {
    const baseReward = treasure.tokenReward;
    const streakMultiplier = this.getStreakMultiplier(streakCount);
    const rarityMultiplier = RARITY_CONFIG[treasure.rarity].multiplier;
    const totalReward = Math.round(baseReward * streakMultiplier);

    return {
      baseReward,
      streakMultiplier,
      rarityMultiplier,
      totalReward,
    };
  }

  /**
   * Create a new claim record
   */
  static createClaim(
    treasureId: string,
    playerId: string,
    tokensAwarded: number,
    streakDay: number,
    bonusMultiplier: number
  ): TreasureClaim {
    return {
      id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      treasureId,
      playerId,
      claimedAt: Date.now(),
      tokensAwarded,
      dayKey: this.getTodayKey(),
      bonusMultiplier,
      streakDay,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 DAILY PROGRESS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create initial daily progress
   */
  static createDailyProgress(treasureCount: number): DailyHuntProgress {
    return {
      dayKey: this.getTodayKey(),
      totalTreasures: treasureCount,
      claimedTreasures: 0,
      totalTokensEarned: 0,
      claimedIds: [],
      streakCount: 0,
      bonusTokensEarned: 0,
      completedAt: null,
    };
  }

  /**
   * Update streak based on consecutive days
   */
  static updateStreak(currentStreak: HuntStreak, didClaimToday: boolean): HuntStreak {
    const todayKey = this.getTodayKey();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

    if (!didClaimToday) return currentStreak;

    let newCurrentStreak = 1;
    if (currentStreak.lastHuntDate === yesterdayKey) {
      newCurrentStreak = currentStreak.currentStreak + 1;
    } else if (currentStreak.lastHuntDate === todayKey) {
      newCurrentStreak = currentStreak.currentStreak;
    }

    return {
      currentStreak: newCurrentStreak,
      longestStreak: Math.max(currentStreak.longestStreak, newCurrentStreak),
      lastHuntDate: todayKey,
      totalDaysHunted: currentStreak.lastHuntDate === todayKey
        ? currentStreak.totalDaysHunted
        : currentStreak.totalDaysHunted + 1,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 🗺️ OSM TILE URL
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get OpenStreetMap tile URL for a location
   */
  static getOSMTileUrl(zoom: number = 13): string {
    return `https://tile.openstreetmap.org/{z}/{x}/{y}.png`;
  }

  /**
   * Get static map image URL for a treasure location (using OSM)
   */
  static getStaticMapUrl(lat: number, lon: number, zoom: number = 15, width: number = 400, height: number = 200): string {
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=${zoom}&size=${width}x${height}&maptype=mapnik&markers=${lat},${lon},red-pushpin`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 STATS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get hunt statistics summary
   */
  static getHuntStats(claims: TreasureClaim[], streak: HuntStreak) {
    const todayKey = this.getTodayKey();
    const todayClaims = claims.filter(c => c.dayKey === todayKey);
    const totalTokens = claims.reduce((sum, c) => sum + c.tokensAwarded, 0);
    const todayTokens = todayClaims.reduce((sum, c) => sum + c.tokensAwarded, 0);

    const rarityCounts: Record<string, number> = {};
    const treasureMap = new Map(LA_TREASURE_LOCATIONS.map(t => [t.id, t]));
    claims.forEach(c => {
      const t = treasureMap.get(c.treasureId);
      if (t) {
        rarityCounts[t.rarity] = (rarityCounts[t.rarity] || 0) + 1;
      }
    });

    return {
      totalClaims: claims.length,
      todayClaims: todayClaims.length,
      totalTokens,
      todayTokens,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalDaysHunted: streak.totalDaysHunted,
      rarityCounts,
      uniqueLocations: new Set(claims.map(c => c.treasureId)).size,
      totalLocations: LA_TREASURE_LOCATIONS.length,
    };
  }
}