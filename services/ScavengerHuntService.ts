import {
  TreasureLocation,
  TreasureClaim,
  DailyHuntProgress,
  HuntStreak,
  TreasureDistance,

  PlaceType,
  RARITY_CONFIG,
  STREAK_BONUSES,
  MAX_DAILY_TREASURES,
  TREASURE_RADIUS_METERS,
  TreasureRarity,
  TreasureType,
  ParticleEffect,
} from '../types/scavengerHunt';

interface PlaceTemplate {
  namePrefix: string;
  nameSuffix: string[];
  descriptions: string[];
  hints: string[];
  icon: string;
  placeType: PlaceType;
}

const PLACE_TEMPLATES: PlaceTemplate[] = [
  {
    namePrefix: 'Park',
    nameSuffix: ['Haven Cache', 'Trail Treasure', 'Grove Vault', 'Meadow Stash', 'Garden Fortune', 'Pond Riches', 'Willow Bounty', 'Oak Hideout', 'Hilltop Prize', 'Pathway Gems'],
    descriptions: [
      'Hidden beneath the shade of ancient trees, MUSO tokens glimmer in the dappled sunlight.',
      'Along the winding park trail, a treasure cache waits among the wildflowers.',
      'Near the park fountain, coins catch the light as joggers pass by unknowing.',
      'Tucked behind a scenic overlook, a vault of tokens hums with energy.',
      'Where children play and dogs run free, a secret stash of MUSO awaits.',
    ],
    hints: [
      'Where nature meets the neighborhood, treasures hide in plain sight.',
      'Listen for birdsong — the treasure is near the greenest spot.',
      'Follow the walking path to where the shade is deepest.',
      'Near the park bench with the best view, fortune awaits.',
      'Where joggers rest and families picnic, tokens shimmer.',
    ],
    icon: '🌳',
    placeType: 'park',
  },
  {
    namePrefix: 'Station',
    nameSuffix: ['Fuel Fortune', 'Pump Prize', 'Roadside Cache', 'Highway Stash', 'Corner Bounty', 'Pit Stop Vault', 'Tank Treasure', 'Express Gems', 'Quick Stop Gold', 'Drive-In Riches'],
    descriptions: [
      'At this busy fuel stop, a hidden cache of MUSO tokens pulses beneath the pump island.',
      'Between the gas pumps and the convenience store, a treasure glows with digital energy.',
      'Road-weary travelers pass by, never noticing the fortune hidden at this station.',
      'The fluorescent lights of this gas station conceal a surprising MUSO vault.',
      'Among the everyday hustle of fuel and snacks, a treasure anchor awaits discovery.',
    ],
    hints: [
      'Where vehicles refuel, your wallet can too — look near the pumps.',
      'The convenience store holds more than snacks — scan near the entrance.',
      'Between the air pump and the car wash, fortune hides.',
      'At the corner where roads meet and tanks fill, tokens await.',
      'Under the bright canopy lights, a digital treasure glows.',
    ],
    icon: '⛽',
    placeType: 'gas_station',
  },
  {
    namePrefix: 'Dining',
    nameSuffix: ['Feast Fortune', 'Kitchen Cache', 'Table Treasure', 'Bistro Bounty', 'Plate Prize', 'Menu Vault', 'Grill Gems', 'Spice Stash', 'Chef\'s Gold', 'Flavor Riches'],
    descriptions: [
      'Near this popular eatery, the aroma of good food mingles with the glow of hidden MUSO tokens.',
      'Where locals gather to dine, a treasure chest sits disguised among the outdoor seating.',
      'The chef\'s secret ingredient? A cache of MUSO tokens hidden near the kitchen.',
      'Between courses and conversations, a digital treasure waits to be claimed.',
      'This restaurant holds more than great food — a MUSO vault hums beneath the patio.',
    ],
    hints: [
      'Where the food smells amazing, fortune also waits nearby.',
      'Check near the outdoor dining area — tokens love good company.',
      'The best table in the house is near a hidden treasure.',
      'Where reviews are five stars, so is the hidden reward.',
      'Near the entrance where hungry crowds gather, scan for gold.',
    ],
    icon: '🍽️',
    placeType: 'restaurant',
  },
];

const RARITY_WEIGHTS: { rarity: TreasureRarity; weight: number }[] = [
  { rarity: 'common', weight: 35 },
  { rarity: 'uncommon', weight: 28 },
  { rarity: 'rare', weight: 20 },
  { rarity: 'epic', weight: 12 },
  { rarity: 'legendary', weight: 5 },
];

const TREASURE_TYPES: { type: TreasureType; rarities: TreasureRarity[] }[] = [
  { type: 'coin_pile', rarities: ['common', 'uncommon'] },
  { type: 'treasure_chest', rarities: ['uncommon', 'rare'] },
  { type: 'golden_muso', rarities: ['rare', 'epic'] },
  { type: 'crystal_vault', rarities: ['epic', 'legendary'] },
  { type: 'token_fountain', rarities: ['rare', 'epic', 'legendary'] },
];

const PARTICLE_EFFECTS: ParticleEffect[] = ['sparkle', 'glow', 'fire', 'ice', 'rainbow'];

const MODEL_COLORS: Record<TreasureRarity, { model: string; glow: string }> = {
  common: { model: '#9CA3AF', glow: '#D1D5DB' },
  uncommon: { model: '#10B981', glow: '#34D399' },
  rare: { model: '#3B82F6', glow: '#60A5FA' },
  epic: { model: '#8B5CF6', glow: '#A78BFA' },
  legendary: { model: '#F59E0B', glow: '#FBBF24' },
};

export class ScavengerHuntService {
  private static readonly EARTH_RADIUS_M = 6371000;
  private static readonly FIVE_MILES_M = TREASURE_RADIUS_METERS;

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

  static calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = this.toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(this.toRad(lat2));
    const x = Math.cos(this.toRad(lat1)) * Math.sin(this.toRad(lat2)) -
              Math.sin(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.cos(dLon);
    let bearing = Math.atan2(y, x);
    bearing = this.toDeg(bearing);
    return (bearing + 360) % 360;
  }

  static bearingToDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    const miles = meters / 1609.34;
    if (miles < 10) {
      return `${miles.toFixed(1)} mi`;
    }
    return `${Math.round(miles)} mi`;
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private static toDeg(rad: number): number {
    return rad * (180 / Math.PI);
  }

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private static seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  private static generatePointInRadius(
    centerLat: number,
    centerLon: number,
    minMeters: number,
    maxMeters: number,
    random: () => number
  ): { latitude: number; longitude: number } {
    const distance = minMeters + random() * (maxMeters - minMeters);
    const bearing = random() * 360;

    const angularDistance = distance / this.EARTH_RADIUS_M;
    const bearingRad = this.toRad(bearing);
    const lat1 = this.toRad(centerLat);
    const lon1 = this.toRad(centerLon);

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
    );
    const lon2 = lon1 + Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
      latitude: this.toDeg(lat2),
      longitude: this.toDeg(lon2),
    };
  }

  private static pickRarity(random: () => number): TreasureRarity {
    const totalWeight = RARITY_WEIGHTS.reduce((s, w) => s + w.weight, 0);
    let roll = random() * totalWeight;
    for (const entry of RARITY_WEIGHTS) {
      roll -= entry.weight;
      if (roll <= 0) return entry.rarity;
    }
    return 'common';
  }

  private static pickTreasureType(rarity: TreasureRarity, random: () => number): TreasureType {
    const matching = TREASURE_TYPES.filter(t => t.rarities.includes(rarity));
    if (matching.length === 0) return 'coin_pile';
    return matching[Math.floor(random() * matching.length)].type;
  }

  private static pickParticle(random: () => number): ParticleEffect {
    return PARTICLE_EFFECTS[Math.floor(random() * PARTICLE_EFFECTS.length)];
  }

  private static getBaseReward(rarity: TreasureRarity): number {
    const rewards: Record<TreasureRarity, number> = {
      common: 25,
      uncommon: 50,
      rare: 100,
      epic: 150,
      legendary: 250,
    };
    return rewards[rarity];
  }

  static generateTreasuresAroundPlayer(
    playerLat: number,
    playerLon: number,
    dayKey?: string
  ): TreasureLocation[] {
    const today = dayKey || this.getTodayKey();
    const gridLat = Math.round(playerLat * 100) / 100;
    const gridLon = Math.round(playerLon * 100) / 100;
    const seedStr = `${today}_${gridLat}_${gridLon}`;
    const seed = this.hashString(seedStr);
    const random = this.seededRandom(seed);

    const treasures: TreasureLocation[] = [];
    const priorityDistribution: PlaceType[] = [
      'park', 'park', 'park',
      'gas_station', 'gas_station', 'gas_station',
      'restaurant', 'restaurant', 'restaurant',
      'park',
    ];

    for (let i = 0; i < MAX_DAILY_TREASURES; i++) {
      const placeType = priorityDistribution[i];
      const template = PLACE_TEMPLATES.find(t => t.placeType === placeType) || PLACE_TEMPLATES[0];

      const minDist = 200 + (i * 150);
      const maxDist = Math.min(minDist + 2500, this.FIVE_MILES_M);
      const point = this.generatePointInRadius(playerLat, playerLon, minDist, maxDist, random);

      const rarity = this.pickRarity(random);
      const treasureType = this.pickTreasureType(rarity, random);
      const particle = this.pickParticle(random);
      const colors = MODEL_COLORS[rarity];

      const suffixIndex = Math.floor(random() * template.nameSuffix.length);
      const descIndex = Math.floor(random() * template.descriptions.length);
      const hintIndex = Math.floor(random() * template.hints.length);

      const baseReward = this.getBaseReward(rarity);
      const rewardVariation = Math.round(baseReward * (0.85 + random() * 0.3));

      const distFromPlayer = this.calculateDistance(
        playerLat, playerLon,
        point.latitude, point.longitude
      );

      const directionNames = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
      const bearing = this.calculateBearing(playerLat, playerLon, point.latitude, point.longitude);
      const dirIndex = Math.round(bearing / 45) % 8;
      const directionName = directionNames[dirIndex];
      const distMiles = (distFromPlayer / 1609.34).toFixed(1);

      treasures.push({
        id: `treasure_${today}_${i}_${this.hashString(seedStr + i)}`,
        name: `${template.icon} ${template.nameSuffix[suffixIndex]}`,
        description: template.descriptions[descIndex],
        latitude: point.latitude,
        longitude: point.longitude,
        neighborhood: `${distMiles} mi ${directionName}`,
        landmark: `${template.namePrefix} Location #${i + 1}`,
        treasureType,
        placeType,
        tokenReward: rewardVariation,
        rarity,
        icon: template.icon,
        hint: template.hints[hintIndex],
        radiusMeters: 100 + Math.floor(random() * 150),
        distanceFromPlayer: distFromPlayer,
        modelColor: colors.model,
        glowColor: colors.glow,
        particleEffect: particle,
      });
    }

    return treasures.sort((a, b) => (a.distanceFromPlayer || 0) - (b.distanceFromPlayer || 0));
  }

  static getTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  static getTodaysTreasures(): TreasureLocation[] {
    return this.generateTreasuresAroundPlayer(34.0522, -118.2437);
  }

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

  static isTreasureClaimedToday(treasureId: string, claims: TreasureClaim[]): boolean {
    const todayKey = this.getTodayKey();
    return claims.some(c => c.treasureId === treasureId && c.dayKey === todayKey);
  }

  static getTodayClaimCount(claims: TreasureClaim[]): number {
    const todayKey = this.getTodayKey();
    return claims.filter(c => c.dayKey === todayKey).length;
  }

  static canClaimMore(claims: TreasureClaim[]): boolean {
    return this.getTodayClaimCount(claims) < MAX_DAILY_TREASURES;
  }

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

  static getStreakBonusLabel(streakCount: number): string | null {
    const thresholds = Object.keys(STREAK_BONUSES).map(Number).sort((a, b) => b - a);
    for (const threshold of thresholds) {
      if (streakCount >= threshold) {
        return STREAK_BONUSES[threshold].label;
      }
    }
    return null;
  }

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

  static getOSMTileUrl(_zoom: number = 13): string {
    return `https://tile.openstreetmap.org/{z}/{x}/{y}.png`;
  }

  static getStaticMapUrl(lat: number, lon: number, zoom: number = 15, width: number = 400, height: number = 200): string {
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=${zoom}&size=${width}x${height}&maptype=mapnik&markers=${lat},${lon},red-pushpin`;
  }

  static getHuntStats(claims: TreasureClaim[], streak: HuntStreak) {
    const todayKey = this.getTodayKey();
    const todayClaims = claims.filter(c => c.dayKey === todayKey);
    const totalTokens = claims.reduce((sum, c) => sum + c.tokensAwarded, 0);
    const todayTokens = todayClaims.reduce((sum, c) => sum + c.tokensAwarded, 0);

    const rarityCounts: Record<string, number> = {};

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
      totalLocations: MAX_DAILY_TREASURES,
      remainingToday: MAX_DAILY_TREASURES - todayClaims.length,
    };
  }
}
