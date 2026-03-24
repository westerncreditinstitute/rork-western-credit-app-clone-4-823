// District and Landmark Configurations for 3D LA City
// Based on 3D_LA_Open_World_Guide.md - Curated District Hub Model

import { DistrictConfig, DistrictId, LandmarkConfig } from '../types/city3d';

// Hollywood & The Hills District
const hollywoodLandmarks: LandmarkConfig[] = [
  {
    id: 'hollywood-sign',
    name: 'Hollywood Sign',
    type: 'landmark',
    coordinates: { lat: 34.1341, lon: -118.3215 },
    model3D: 'hollywood_sign.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 500,
    riddle: 'I stand tall on a hill of fame, nine letters spell out a city\'s name. What am I?',
    historicalLore: 'Originally erected in 1923 as "Hollywoodland" to advertise a real estate development. The "land" was removed in 1949.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'griffith-observatory',
    name: 'Griffith Observatory',
    type: 'landmark',
    coordinates: { lat: 34.1184, lon: -118.3004 },
    model3D: 'griffith_observatory.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 400,
    riddle: 'Where the stars touch the earth, and the heavens seem near, I\'ve watched over LA for many a year.',
    historicalLore: 'Opened in 1935, it was featured in "Rebel Without a Cause" and offers the best views of the Hollywood Sign.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'tcl-chinese-theatre',
    name: 'TCL Chinese Theatre',
    type: 'landmark',
    coordinates: { lat: 34.1020, lon: -118.3409 },
    model3D: 'chinese_theatre.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 350,
    riddle: 'Walk where legends walked, their hands and feet in concrete locked.',
    historicalLore: 'Opened in 1927, the forecourt contains handprints and footprints of over 200 celebrities.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'dolby-theatre',
    name: 'Dolby Theatre',
    type: 'landmark',
    coordinates: { lat: 34.1029, lon: -118.3419 },
    model3D: 'dolby_theatre.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 300,
    riddle: 'Where golden statues find their home, once a year the world does roam.',
    historicalLore: 'Home of the Academy Awards since 2001, with seating for 3,400 guests.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  }
];

// The Westside & Beaches District
const westsideLandmarks: LandmarkConfig[] = [
  {
    id: 'santa-monica-pier',
    name: 'Santa Monica Pier',
    type: 'landmark',
    coordinates: { lat: 34.0095, lon: -118.4973 },
    model3D: 'santa_monica_pier.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 450,
    riddle: 'Where the road ends and fun begins, a wheel of fortune forever spins.',
    historicalLore: 'The pier opened in 1909 and the iconic Ferris wheel is solar-powered.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'venice-beach',
    name: 'Venice Beach Boardwalk',
    type: 'landmark',
    coordinates: { lat: 33.9850, lon: -118.4695 },
    model3D: 'venice_beach.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 350,
    riddle: 'Muscle men and artists too, skate and surf the day right through.',
    historicalLore: 'Founded by tobacco magnate Abbot Kinney in 1905 as a Venetian-inspired resort.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'getty-center',
    name: 'The Getty Center',
    type: 'landmark',
    coordinates: { lat: 34.0760, lon: -118.4747 },
    model3D: 'getty_center.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 400,
    riddle: 'White towers on a hill so high, art and architecture catch every eye.',
    historicalLore: 'Designed by Richard Meier, opened in 1997, cost over $1 billion to build.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'ucla-campus',
    name: 'UCLA Campus',
    type: 'landmark',
    coordinates: { lat: 34.0689, lon: -118.4452 },
    model3D: 'ucla_campus.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 300,
    riddle: 'Bruins roam these halls of learning, where minds grow and dreams keep burning.',
    historicalLore: 'Founded in 1919, UCLA has produced 24 Nobel laureates and countless industry leaders.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  }
];

// Downtown LA District
const downtownLandmarks: LandmarkConfig[] = [
  {
    id: 'walt-disney-concert-hall',
    name: 'Walt Disney Concert Hall',
    type: 'landmark',
    coordinates: { lat: 34.0553, lon: -118.2500 },
    model3D: 'disney_hall.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 450,
    riddle: 'Steel sails catch no wind, but music flows from deep within.',
    historicalLore: 'Designed by Frank Gehry, opened in 2003. The stainless steel exterior required special sanding to reduce glare.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'union-station',
    name: 'Union Station',
    type: 'landmark',
    coordinates: { lat: 34.0558, lon: -118.2365 },
    model3D: 'union_station.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 350,
    riddle: 'Where tracks converge and travelers meet, Mission style can\'t be beat.',
    historicalLore: 'Opened in 1939, it was the last great railway station built in America.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'the-broad',
    name: 'The Broad Museum',
    type: 'landmark',
    coordinates: { lat: 34.0542, lon: -118.2506 },
    model3D: 'the_broad.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 400,
    riddle: 'A veil of white hides art inside, contemporary wonders in which to hide.',
    historicalLore: 'Opened in 2015, designed by Diller Scofidio + Renfro, houses 2,000 works of art.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'la-city-hall',
    name: 'Los Angeles City Hall',
    type: 'landmark',
    coordinates: { lat: 34.0530, lon: -118.2429 },
    model3D: 'city_hall.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 300,
    riddle: 'The city\'s heart beats here each day, where laws are made and officials play.',
    historicalLore: 'Completed in 1928, it was the tallest building in LA until the 1960s. The distinctive tower was inspired by the Mausoleum at Halicarnassus.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  }
];

// Culture & Parks District
const cultureLandmarks: LandmarkConfig[] = [
  {
    id: 'lacma',
    name: 'LACMA (Los Angeles County Museum of Art)',
    type: 'landmark',
    coordinates: { lat: 34.0621, lon: -118.3585 },
    model3D: 'lacma.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 450,
    riddle: 'Lamps light up the path to art, 200 strong they play their part.',
    historicalLore: 'The iconic "Urban Light" installation features 202 restored antique street lamps from the 1920s and 1930s.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'la-brea-tar-pits',
    name: 'La Brea Tar Pits',
    type: 'landmark',
    coordinates: { lat: 34.0638, lon: -118.3556 },
    model3D: 'tar_pits.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 400,
    riddle: 'Prehistoric beasts stuck in time, their bones tell tales of ancient climes.',
    historicalLore: 'The tar pits have yielded over 3.5 million fossils, including saber-toothed cats and mammoths.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'the-grove',
    name: 'The Grove',
    type: 'landmark',
    coordinates: { lat: 34.0737, lon: -118.3589 },
    model3D: 'the_grove.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 300,
    riddle: 'A trolley rides through shops galore, outdoor fun you can\'t ignore.',
    historicalLore: 'Opened in 2002, this outdoor shopping destination was built on the historic site of the Gilmore Drive-in.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'farmers-market',
    name: 'Original Farmers Market',
    type: 'landmark',
    coordinates: { lat: 34.0727, lon: -118.3598 },
    model3D: 'farmers_market.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 350,
    riddle: 'Since 1934, the best eats in town, where locals gather and visitors flock down.',
    historicalLore: 'Started during the Great Depression when farmers sold produce from their trucks.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  }
];

// Glamour & Luxury District
const glamourLandmarks: LandmarkConfig[] = [
  {
    id: 'beverly-hills-sign',
    name: 'Beverly Hills Sign',
    type: 'landmark',
    coordinates: { lat: 34.0736, lon: -118.4004 },
    model3D: 'beverly_hills_sign.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 400,
    riddle: 'Where the wealthy roam and palm trees line, enter the city of the famous sign.',
    historicalLore: 'The iconic "Beverly Hills" sign in the Lily Pond has been a photo spot since the 1920s.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'rodeo-drive',
    name: 'Rodeo Drive',
    type: 'landmark',
    coordinates: { lat: 34.0697, lon: -118.4012 },
    model3D: 'rodeo_drive.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 500,
    riddle: 'Designer stores line the street, where stars shop on elite feet.',
    historicalLore: 'The three-block stretch is home to some of the world\'s most expensive retail real estate.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'greystone-mansion',
    name: 'Greystone Mansion',
    type: 'landmark',
    coordinates: { lat: 34.0843, lon: -118.4015 },
    model3D: 'greystone_mansion.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 450,
    riddle: 'Oil money built this stone estate, where secrets hide behind the gate.',
    historicalLore: 'Built in 1928 for Edward Doheny Jr., the mansion has appeared in over 50 films including "The Big Lebowski".',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  },
  {
    id: 'ucla-royce-hall',
    name: 'UCLA Royce Hall',
    type: 'landmark',
    coordinates: { lat: 34.0700, lon: -118.4431 },
    model3D: 'royce_hall.glb',
    scale: 1.0,
    rotation: 0,
    treasureValue: 350,
    riddle: 'Brick towers echo with symphonies grand, on UCLA\'s historic land.',
    historicalLore: 'Built in 1929, Royce Hall\'s architecture was inspired by Milan\'s San Abbondio basilica.',
    discovered: false,
    photoOp: true,
    lodDistances: { high: 50, medium: 200, low: 500, billboard: 2000 }
  }
];

// Complete District Configurations
export const DISTRICTS: Record<DistrictId, DistrictConfig> = {
  hollywood: {
    id: 'hollywood',
    name: 'Hollywood & The Hills',
    description: 'The entertainment capital of the world, featuring iconic landmarks and stunning hillside views.',
    bounds: {
      minLat: 34.0900,
      maxLat: 34.1500,
      minLon: -118.3700,
      maxLon: -118.2900
    },
    center: { lat: 34.1200, lon: -118.3300 },
    theme: {
      primaryColor: '#FFD700',      // Gold for fame
      secondaryColor: '#8B0000',    // Dark red for theater curtains
      accentColor: '#FFFFFF',       // White for stars
      terrainColor: '#8B7355',      // Brown for hills
      buildingStyle: ['art_deco', 'googie', 'mid_century_modern']
    },
    terrain: {
      elevation: 350,  // meters - hilly terrain
      hilliness: 0.7,
      vegetation: 0.4,
      waterFeatures: false
    },
    landmarks: hollywoodLandmarks,
    areaKm2: 5.2,
    compressionRatio: 10
  },
  westside: {
    id: 'westside',
    name: 'The Westside & Beaches',
    description: 'Sun-kissed beaches, world-class museums, and laid-back coastal vibes.',
    bounds: {
      minLat: 33.9700,
      maxLat: 34.1000,
      minLon: -118.5100,
      maxLon: -118.4200
    },
    center: { lat: 34.0300, lon: -118.4700 },
    theme: {
      primaryColor: '#00CED1',      // Ocean teal
      secondaryColor: '#FFA500',    // Sunset orange
      accentColor: '#F5DEB3',       // Sandy beige
      terrainColor: '#C2B280',      // Beach sand
      buildingStyle: ['contemporary', 'spanish_colonial', 'craftsman']
    },
    terrain: {
      elevation: 30,   // meters - mostly flat coastal
      hilliness: 0.2,
      vegetation: 0.6,
      waterFeatures: true
    },
    landmarks: westsideLandmarks,
    areaKm2: 4.8,
    compressionRatio: 10
  },
  downtown: {
    id: 'downtown',
    name: 'Downtown LA',
    description: 'The urban heart of Los Angeles with stunning architecture and cultural landmarks.',
    bounds: {
      minLat: 34.0400,
      maxLat: 34.0700,
      minLon: -118.2600,
      maxLon: -118.2300
    },
    center: { lat: 34.0522, lon: -118.2437 },
    theme: {
      primaryColor: '#4A90D9',      // Metropolitan blue
      secondaryColor: '#2C3E50',    // Dark slate
      accentColor: '#E74C3C',       // Vibrant red
      terrainColor: '#808080',      // Urban gray
      buildingStyle: ['beaux_arts', 'art_deco', 'brutalist', 'contemporary']
    },
    terrain: {
      elevation: 90,   // meters - basin floor
      hilliness: 0.1,
      vegetation: 0.2,
      waterFeatures: false
    },
    landmarks: downtownLandmarks,
    areaKm2: 5.0,
    compressionRatio: 10
  },
  culture: {
    id: 'culture',
    name: 'Culture & Parks',
    description: 'Museums, tar pits, and world-famous markets define this cultural hub.',
    bounds: {
      minLat: 34.0500,
      maxLat: 34.0900,
      minLon: -118.3700,
      maxLon: -118.3400
    },
    center: { lat: 34.0678, lon: -118.3565 },
    theme: {
      primaryColor: '#9B59B6',      // Creative purple
      secondaryColor: '#27AE60',    // Park green
      accentColor: '#F39C12',       // Golden amber
      terrainColor: '#228B22',      // Forest green
      buildingStyle: ['contemporary', 'mid_century_modern', 'spanish_colonial']
    },
    terrain: {
      elevation: 100,  // meters - gentle slopes
      hilliness: 0.3,
      vegetation: 0.7,
      waterFeatures: false
    },
    landmarks: cultureLandmarks,
    areaKm2: 4.5,
    compressionRatio: 10
  },
  glamour: {
    id: 'glamour',
    name: 'Glamour & Luxury',
    description: 'Beverly Hills and the epitome of Los Angeles luxury lifestyle.',
    bounds: {
      minLat: 34.0500,
      maxLat: 34.1100,
      minLon: -118.4200,
      maxLon: -118.3800
    },
    center: { lat: 34.0736, lon: -118.4004 },
    theme: {
      primaryColor: '#C0C0C0',      // Silver
      secondaryColor: '#FFD700',    // Gold
      accentColor: '#E5E4E2',       // Platinum
      terrainColor: '#90EE90',      // Light green (manicured lawns)
      buildingStyle: ['spanish_colonial', 'contemporary', 'victorian', 'beaux_arts']
    },
    terrain: {
      elevation: 150,  // meters - gentle hills
      hilliness: 0.4,
      vegetation: 0.8,  // Manicured landscaping
      waterFeatures: true
    },
    landmarks: glamourLandmarks,
    areaKm2: 5.5,
    compressionRatio: 10
  }
};

// Helper function to get district by ID
export function getDistrictById(id: DistrictId): DistrictConfig {
  return DISTRICTS[id];
}

// Helper function to get all landmarks
export function getAllLandmarks(): LandmarkConfig[] {
  return [
    ...hollywoodLandmarks,
    ...westsideLandmarks,
    ...downtownLandmarks,
    ...cultureLandmarks,
    ...glamourLandmarks
  ];
}

// Helper function to get landmarks by district
export function getLandmarksByDistrict(districtId: DistrictId): LandmarkConfig[] {
  return DISTRICTS[districtId].landmarks;
}

// Export individual landmark arrays for direct access
export {
  hollywoodLandmarks,
  westsideLandmarks,
  downtownLandmarks,
  cultureLandmarks,
  glamourLandmarks
};