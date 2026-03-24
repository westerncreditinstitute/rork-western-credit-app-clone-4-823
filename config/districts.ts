import {
  DistrictConfig,
  DistrictId,
  LandmarkConfig,
  LA_CENTER,
  DISTANCE_COMPRESSION,
  LOD_DISTANCES,
} from '../types/city3d';

// =====================================================
// LANDMARK DEFINITIONS (20 Total - 4 per district)
// =====================================================

// District 1: Hollywood & The Hills
const hollywoodSignLandmark: LandmarkConfig = {
  id: 'hollywood_sign',
  name: 'Hollywood Sign',
  displayName: 'Hollywood Sign',
  description: 'Iconic hillside letters, the most recognizable symbol of Los Angeles and the entertainment industry.',
  coordinates: {
    latitude: 34.1341,
    longitude: -118.3215,
    altitude: 488,
  },
  gamePosition: { x: 0, y: 488, z: 0 }, // Calculated from compression
  rarity: 'legendary',
  treasureValue: 500,
  modelConfig: {
    modelId: 'landmark_hollywood_sign',
    scale: 1.0,
    rotationY: 0,
    hasInterior: false,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 50000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 25000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 10000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 5000,
    beaconEffect: true,
    audioCue: 'wind_hills',
    riddle: 'Where giants spell their dreams in white against the green...',
  },
  photoReferences: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Hollywood_Sign.jpg/1280px-Hollywood_Sign.jpg',
  ],
  lore: {
    founded: '1923',
    historicalSignificance: 'Originally "Hollywoodland" real estate advertisement, now a global symbol of entertainment.',
    funFacts: [
      'Each letter is 45 feet tall and 175 feet wide',
      'Originally meant to last only 18 months',
      'Hugh Hefner helped save the sign from decay in 1978',
    ],
  },
};

const griffithObservatoryLandmark: LandmarkConfig = {
  id: 'griffith_observatory',
  name: 'Griffith Observatory',
  displayName: 'Griffith Observatory',
  description: 'Art Deco observatory with panoramic city views, featured in countless films including Rebel Without a Cause.',
  coordinates: {
    latitude: 34.1184,
    longitude: -118.3004,
    altitude: 346,
  },
  gamePosition: { x: 0, y: 346, z: 0 },
  rarity: 'legendary',
  treasureValue: 450,
  modelConfig: {
    modelId: 'landmark_griffith_observatory',
    scale: 1.0,
    rotationY: 45,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 100000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 50000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 20000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 4000,
    beaconEffect: true,
    audioCue: 'observatory_ambient',
    riddle: 'Where the stars come down to meet the Earth, and the city spreads beneath your feet...',
  },
  photoReferences: [],
  lore: {
    founded: '1935',
    historicalSignificance: 'Gift of Griffith J. Griffith, designed to make astronomy accessible to the public.',
    funFacts: [
      'More people have looked through its telescope than any other on Earth',
      'Featured in the climax of La La Land',
      'Free admission since opening',
    ],
  },
};

const tclChineseTheatreLandmark: LandmarkConfig = {
  id: 'tcl_chinese_theatre',
  name: 'TCL Chinese Theatre',
  displayName: 'TCL Chinese Theatre (Grauman\'s)',
  description: 'Famous movie palace known for celebrity hand and footprints in concrete, a Hollywood Blvd landmark.',
  coordinates: {
    latitude: 34.1022,
    longitude: -118.3414,
    altitude: 107,
  },
  gamePosition: { x: 0, y: 107, z: 0 },
  rarity: 'epic',
  treasureValue: 300,
  modelConfig: {
    modelId: 'landmark_chinese_theatre',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 75000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 35000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 15000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 500,
    beaconEffect: true,
    audioCue: 'hollywood_boulevard',
    riddle: 'Where the famous leave their mark in stone, and stars are made of concrete...',
  },
  photoReferences: [],
  lore: {
    founded: '1927',
    historicalSignificance: 'The most famous movie theater in the world, home to Hollywood premieres.',
    funFacts: [
      'Over 200 celebrity hand/footprints in the forecourt',
      'Sid Grauman accidentally stepped in wet concrete, inspiring the tradition',
      'Mickey Mouse was the first cartoon character with prints',
    ],
  },
};

const hollywoodWalkOfFameLandmark: LandmarkConfig = {
  id: 'hollywood_walk_of_fame',
  name: 'Hollywood Walk of Fame',
  displayName: 'Hollywood Walk of Fame',
  description: '15 blocks of star-embedded sidewalks honoring entertainment industry achievements.',
  coordinates: {
    latitude: 34.1016,
    longitude: -118.3267,
    altitude: 107,
  },
  gamePosition: { x: 0, y: 107, z: 0 },
  rarity: 'rare',
  treasureValue: 200,
  modelConfig: {
    modelId: 'landmark_walk_of_fame',
    scale: 1.0,
    rotationY: 0,
    hasInterior: false,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 30000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 15000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 5000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 200,
    beaconEffect: false,
    audioCue: 'street_ambiance',
    riddle: 'Where the stars walk beneath your feet, and every step tells a story...',
  },
  photoReferences: [],
  lore: {
    founded: '1960',
    historicalSignificance: 'Permanent public monument to entertainment industry achievement.',
    funFacts: [
      'Over 2,700 stars spanning 15 blocks',
      'Stars awarded in 5 categories: Motion Pictures, Television, Recording, Radio, Live Performance',
      'Gene Autry is the only person with stars in all 5 categories',
    ],
  },
};

// District 2: The Westside & Beaches
const santaMonicaPierLandmark: LandmarkConfig = {
  id: 'santa_monica_pier',
  name: 'Santa Monica Pier',
  displayName: 'Santa Monica Pier',
  description: 'Iconic oceanfront pier with amusement park, Ferris wheel, and the end of Route 66.',
  coordinates: {
    latitude: 34.0094,
    longitude: -118.4973,
    altitude: 3,
  },
  gamePosition: { x: 0, y: 3, z: 0 },
  rarity: 'legendary',
  treasureValue: 500,
  modelConfig: {
    modelId: 'landmark_santa_monica_pier',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 150000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 75000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 30000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 3000,
    beaconEffect: true,
    audioCue: 'ocean_waves',
    riddle: 'Where the Mother Road meets the sea, and the wheel turns eternal over the waves...',
  },
  photoReferences: [],
  lore: {
    founded: '1909',
    historicalSignificance: 'The official end of historic Route 66 and a beloved LA landmark.',
    funFacts: [
      'The solar-powered Ferris wheel is the world\'s only solar-powered wheel',
      'Appeared in Forrest Gump, Titanic, and countless other films',
      'Holds the world\'s first solar-powered Ferris wheel',
    ],
  },
};

const veniceBeachLandmark: LandmarkConfig = {
  id: 'venice_beach',
  name: 'Venice Beach Boardwalk',
  displayName: 'Venice Beach Boardwalk',
  description: 'Eclectic beachfront boardwalk known for Muscle Beach, skaters, street performers, and vibrant culture.',
  coordinates: {
    latitude: 33.9850,
    longitude: -118.4695,
    altitude: 5,
  },
  gamePosition: { x: 0, y: 5, z: 0 },
  rarity: 'epic',
  treasureValue: 350,
  modelConfig: {
    modelId: 'landmark_venice_beach',
    scale: 1.0,
    rotationY: 0,
    hasInterior: false,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 80000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 40000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 15000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 1000,
    beaconEffect: true,
    audioCue: 'venice_beach_crowd',
    riddle: 'Where muscles meet the sand, and art covers every wall...',
  },
  photoReferences: [],
  lore: {
    founded: '1905',
    historicalSignificance: 'Founded by tobacco millionaire Abbot Kinney as "Venice of America".',
    funFacts: [
      'Muscle Beach started the fitness craze in the 1930s',
      'The skate park is one of the most famous in the world',
      'Over 10 million visitors per year',
    ],
  },
};

const veniceCanalsLandmark: LandmarkConfig = {
  id: 'venice_canals',
  name: 'Venice Canals',
  displayName: 'Venice Canals',
  description: 'Hidden residential canals with picturesque bridges, a peaceful oasis near the busy boardwalk.',
  coordinates: {
    latitude: 33.9770,
    longitude: -118.4640,
    altitude: 3,
  },
  gamePosition: { x: 0, y: 3, z: 0 },
  rarity: 'rare',
  treasureValue: 150,
  modelConfig: {
    modelId: 'landmark_venice_canals',
    scale: 1.0,
    rotationY: 0,
    hasInterior: false,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 40000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 20000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 8000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 100,
    beaconEffect: false,
    audioCue: 'canal_water',
    riddle: 'Where waterways mirror cottage dreams, and bridges connect hidden worlds...',
  },
  photoReferences: [],
  lore: {
    founded: '1905',
    historicalSignificance: 'Remnant of Abbot Kinney\'s vision to recreate Venice, Italy in California.',
    funFacts: [
      'Originally 16 miles of canals, now only 6 remain',
      'Many canals were filled in to create roads in 1929',
      'Designated a Historic District in 1982',
    ],
  },
};

const gettyCenterLandmark: LandmarkConfig = {
  id: 'getty_center',
  name: 'Getty Center',
  displayName: 'Getty Center',
  description: 'Stunning Richard Meier-designed museum campus with gardens, art collections, and panoramic views.',
  coordinates: {
    latitude: 34.0780,
    longitude: -118.4741,
    altitude: 271,
  },
  gamePosition: { x: 0, y: 271, z: 0 },
  rarity: 'epic',
  treasureValue: 400,
  modelConfig: {
    modelId: 'landmark_getty_center',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 200000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 100000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 40000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 3000,
    beaconEffect: true,
    audioCue: 'museum_ambient',
    riddle: 'Where white travertine catches the light, and art meets the clouds...',
  },
  photoReferences: [],
  lore: {
    founded: '1997',
    historicalSignificance: 'One of the most visited museums in the United States, free admission.',
    funFacts: [
      'Over 1.3 million visitors annually',
      'The tram ride takes 5 minutes up the hill',
      'Architecture cost over $1 billion to construct',
    ],
  },
};

// District 3: Downtown LA
const disneyConcertHallLandmark: LandmarkConfig = {
  id: 'walt_disney_concert_hall',
  name: 'Walt Disney Concert Hall',
  displayName: 'Walt Disney Concert Hall',
  description: 'Frank Gehry\'s iconic stainless steel masterpiece, home to the LA Philharmonic.',
  coordinates: {
    latitude: 34.0553,
    longitude: -118.2498,
    altitude: 105,
  },
  gamePosition: { x: 0, y: 105, z: 0 },
  rarity: 'epic',
  treasureValue: 350,
  modelConfig: {
    modelId: 'landmark_disney_hall',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 300000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 150000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 50000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 1500,
    beaconEffect: true,
    audioCue: 'orchestra_tuning',
    riddle: 'Where silver sails catch no wind, but fill with music instead...',
  },
  photoReferences: [],
  lore: {
    founded: '2003',
    historicalSignificance: 'Acoustically perfect concert hall, considered one of the finest in the world.',
    funFacts: [
      'Designed by Frank Gehry, who was raised in LA',
      'The stainless steel exterior had to be sanded down because it reflected too much heat',
      'Lillian Disney donated $50 million in 1987 to start the project',
    ],
  },
};

const bradburyBuildingLandmark: LandmarkConfig = {
  id: 'bradbury_building',
  name: 'Bradbury Building',
  displayName: 'Bradbury Building',
  description: 'Victorian-era architectural gem with ornate ironwork interior, famous from Blade Runner.',
  coordinates: {
    latitude: 34.0505,
    longitude: -118.2481,
    altitude: 102,
  },
  gamePosition: { x: 0, y: 102, z: 0 },
  rarity: 'rare',
  treasureValue: 180,
  modelConfig: {
    modelId: 'landmark_bradbury',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 50000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 25000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 10000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 200,
    beaconEffect: false,
    audioCue: 'building_interior',
    riddle: 'Where iron birds take flight inside, and light falls through the sky...',
  },
  photoReferences: [],
  lore: {
    founded: '1893',
    historicalSignificance: 'Oldest surviving commercial building in LA, National Historic Landmark.',
    funFacts: [
      'Featured in Blade Runner, 500 Days of Summer, and many other films',
      'Cage elevators are still operated by hand',
      'Named after mining millionaire Lewis Bradbury',
    ],
  },
};

const grandCentralMarketLandmark: LandmarkConfig = {
  id: 'grand_central_market',
  name: 'Grand Central Market',
  displayName: 'Grand Central Market',
  description: 'Historic food market since 1917, a culinary destination with diverse vendors and vibrant atmosphere.',
  coordinates: {
    latitude: 34.0509,
    longitude: -118.2490,
    altitude: 102,
  },
  gamePosition: { x: 0, y: 102, z: 0 },
  rarity: 'rare',
  treasureValue: 150,
  modelConfig: {
    modelId: 'landmark_grand_central',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 40000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 20000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 8000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 100,
    beaconEffect: false,
    audioCue: 'market_ambiance',
    riddle: 'Where flavors from every corner meet, and hunger becomes a journey...',
  },
  photoReferences: [],
  lore: {
    founded: '1917',
    historicalSignificance: 'LA\'s oldest public market, reflecting the city\'s diverse culinary heritage.',
    funFacts: [
      'Started as a way to bring fresh produce to downtown residents',
      'Eggslut made lines wrap around the block',
      'Features over 40 vendors',
    ],
  },
};

const laCityHallLandmark: LandmarkConfig = {
  id: 'la_city_hall',
  name: 'Los Angeles City Hall',
  displayName: 'LA City Hall',
  description: 'Iconic 1928 building with distinctive tower, the center of LA government and a recognizable skyline feature.',
  coordinates: {
    latitude: 34.0537,
    longitude: -118.2428,
    altitude: 101,
  },
  gamePosition: { x: 0, y: 101, z: 0 },
  rarity: 'epic',
  treasureValue: 300,
  modelConfig: {
    modelId: 'landmark_city_hall',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 60000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 30000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 12000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 1500,
    beaconEffect: true,
    audioCue: 'city_ambient',
    riddle: 'Where the city\'s heart beats in marble halls, and decisions shape a million lives...',
  },
  photoReferences: [],
  lore: {
    founded: '1928',
    historicalSignificance: 'Seat of LA city government, iconic silhouette in the skyline.',
    funFacts: [
      'At 454 feet, it was the tallest building in LA until 1964',
      'The tower was designed to resemble a Mausoleum at Halicarnassus',
      'Free observation deck on the 27th floor',
    ],
  },
};

const unionStationLandmark: LandmarkConfig = {
  id: 'union_station',
  name: 'Union Station',
  displayName: 'Union Station',
  description: 'Beautiful Art Deco and Mission Revival transit hub, "Last of the Great Railway Stations".',
  coordinates: {
    latitude: 34.0561,
    longitude: -118.2365,
    altitude: 101,
  },
  gamePosition: { x: 0, y: 101, z: 0 },
  rarity: 'epic',
  treasureValue: 280,
  modelConfig: {
    modelId: 'landmark_union_station',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 80000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 40000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 15000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 800,
    beaconEffect: true,
    audioCue: 'train_station',
    riddle: 'Where journeys begin and end, and history waits for the next departure...',
  },
  photoReferences: [],
  lore: {
    founded: '1939',
    historicalSignificance: 'The last great railroad station built in America, connecting LA to the nation.',
    funFacts: [
      'Combined Art Deco, Mission Revival, and Streamline Moderne styles',
      'Featured in Blade Runner, The Dark Knight Rises, and many more',
      'Over 60,000 passengers daily',
    ],
  },
};

// District 4: Culture & Parks
const lacmaLandmark: LandmarkConfig = {
  id: 'lacma',
  name: 'Los Angeles County Museum of Art',
  displayName: 'LACMA',
  description: 'The largest art museum in the western US, famous for the Urban Light streetlamp installation.',
  coordinates: {
    latitude: 34.0639,
    longitude: -118.3592,
    altitude: 109,
  },
  gamePosition: { x: 0, y: 109, z: 0 },
  rarity: 'legendary',
  treasureValue: 450,
  modelConfig: {
    modelId: 'landmark_lacma',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 120000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 60000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 25000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 1000,
    beaconEffect: true,
    audioCue: 'museum_ambient',
    riddle: 'Where 202 lights illuminate the past, and art spans centuries...',
  },
  photoReferences: [],
  lore: {
    founded: '1961',
    historicalSignificance: 'The encyclopedic museum of LA, with over 150,000 works.',
    funFacts: [
      'Urban Light has 202 restored antique streetlamps',
      'The Rock (Levitated Mass) took 11 nights to transport',
      'Free admission for LA County residents after 3pm',
    ],
  },
};

const laBreaTarPitsLandmark: LandmarkConfig = {
  id: 'la_brea_tar_pits',
  name: 'La Brea Tar Pits',
  displayName: 'La Brea Tar Pits',
  description: 'Active paleontological site with bubbling asphalt pits, preserving Ice Age fossils.',
  coordinates: {
    latitude: 34.0638,
    longitude: -118.3553,
    altitude: 108,
  },
  gamePosition: { x: 0, y: 108, z: 0 },
  rarity: 'rare',
  treasureValue: 200,
  modelConfig: {
    modelId: 'landmark_tar_pits',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 50000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 25000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 10000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 300,
    beaconEffect: false,
    audioCue: 'bubbling_tar',
    riddle: 'Where ancient beasts sleep in black pools, and history bubbles to the surface...',
  },
  photoReferences: [],
  lore: {
    founded: '1913',
    historicalSignificance: 'One of the world\'s most famous fossil sites, right in the middle of LA.',
    funFacts: [
      'Over 3.5 million fossils excavated',
      'Still actively excavating today',
      'Only known urban paleontological dig site',
    ],
  },
};

const coliseumLandmark: LandmarkConfig = {
  id: 'la_coliseum',
  name: 'LA Memorial Coliseum',
  displayName: 'LA Memorial Coliseum',
  description: 'Historic Olympic stadium (1932, 1984, 2028), home to USC football and countless historic events.',
  coordinates: {
    latitude: 34.0141,
    longitude: -118.2879,
    altitude: 92,
  },
  gamePosition: { x: 0, y: 92, z: 0 },
  rarity: 'epic',
  treasureValue: 320,
  modelConfig: {
    modelId: 'landmark_coliseum',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 150000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 75000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 30000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 2000,
    beaconEffect: true,
    audioCue: 'stadium_crowd',
    riddle: 'Where Olympic flames have burned three times, and legends rise in cardinal and gold...',
  },
  photoReferences: [],
  lore: {
    founded: '1923',
    historicalSignificance: 'Only stadium to host the Olympic Games three times.',
    funFacts: [
      'The Olympic Cauldron is lit for every USC home game',
      'John F. Kennedy accepted the Democratic nomination here in 1960',
      'Capacity was once over 100,000',
    ],
  },
};

const dodgerStadiumLandmark: LandmarkConfig = {
  id: 'dodger_stadium',
  name: 'Dodger Stadium',
  displayName: 'Dodger Stadium',
  description: 'The third-oldest ballpark in MLB, nestled in Chavez Ravine with panoramic city views.',
  coordinates: {
    latitude: 34.0739,
    longitude: -118.2400,
    altitude: 157,
  },
  gamePosition: { x: 0, y: 157, z: 0 },
  rarity: 'rare',
  treasureValue: 180,
  modelConfig: {
    modelId: 'landmark_dodger_stadium',
    scale: 1.0,
    rotationY: 45,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 120000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 60000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 25000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 1500,
    beaconEffect: true,
    audioCue: 'baseball_crowd',
    riddle: 'Where Dodger blue meets the sunset, and the crack of the bat echoes through the ravine...',
  },
  photoReferences: [],
  lore: {
    founded: '1962',
    historicalSignificance: 'The largest baseball stadium by seating capacity, a beloved LA landmark.',
    funFacts: [
      'Only MLB stadium built with its own water recycling system',
      'The Dodgers have won 7 World Series here',
      'Vin Scully called games here for 67 years',
    ],
  },
};

// District 5: Glamour & Luxury
const rodeoDriveLandmark: LandmarkConfig = {
  id: 'rodeo_drive',
  name: 'Beverly Hills Sign & Rodeo Drive',
  displayName: 'Rodeo Drive',
  description: 'Iconic luxury shopping street, the epitome of Beverly Hills glamour and wealth.',
  coordinates: {
    latitude: 34.0696,
    longitude: -118.4054,
    altitude: 79,
  },
  gamePosition: { x: 0, y: 79, z: 0 },
  rarity: 'epic',
  treasureValue: 400,
  modelConfig: {
    modelId: 'landmark_rodeo_drive',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 80000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 40000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 15000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 500,
    beaconEffect: true,
    audioCue: 'luxury_shopping',
    riddle: 'Where dreams cost more than gold, and every window tells a story of excess...',
  },
  photoReferences: [],
  lore: {
    founded: '1906',
    historicalSignificance: 'One of the most expensive shopping streets in the world.',
    funFacts: [
      'Stores include Gucci, Prada, Tiffany, and more',
      'The famous Beverly Hills sign is on Santa Monica Boulevard',
      'Pretty Woman\'s shopping scene was filmed here',
    ],
  },
};

const wattsTowersLandmark: LandmarkConfig = {
  id: 'watts_towers',
  name: 'Watts Towers',
  displayName: 'Watts Towers',
  description: '17 interconnected folk art towers built by Simon Rodia, a unique architectural marvel.',
  coordinates: {
    latitude: 33.9389,
    longitude: -118.2414,
    altitude: 44,
  },
  gamePosition: { x: 0, y: 44, z: 0 },
  rarity: 'rare',
  treasureValue: 200,
  modelConfig: {
    modelId: 'landmark_watts_towers',
    scale: 1.0,
    rotationY: 0,
    hasInterior: false,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 100000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 50000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 20000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 500,
    beaconEffect: true,
    audioCue: 'urban_neighborhood',
    riddle: 'Where one man\'s hands built mountains of steel and shell, reaching for the sky...',
  },
  photoReferences: [],
  lore: {
    founded: '1921',
    historicalSignificance: 'National Historic Landmark, built single-handedly by Italian immigrant Simon Rodia.',
    funFacts: [
      'Took 33 years to complete (1921-1954)',
      'Tallest tower is 99.5 feet',
      'Decorated with found objects: seashells, glass, pottery',
    ],
  },
};

const laxThemeBuildingLandmark: LandmarkConfig = {
  id: 'lax_theme_building',
  name: 'LAX Theme Building',
  displayName: 'LAX Theme Building',
  description: 'Iconic Space Age architecture, the spider-like white structure that defines LA\'s airport.',
  coordinates: {
    latitude: 33.9416,
    longitude: -118.4085,
    altitude: 39,
  },
  gamePosition: { x: 0, y: 39, z: 0 },
  rarity: 'epic',
  treasureValue: 300,
  modelConfig: {
    modelId: 'landmark_lax_theme',
    scale: 1.0,
    rotationY: 0,
    hasInterior: true,
    lodLevels: [
      { level: 'high', distance: LOD_DISTANCES.high, triangleCount: 70000, textureResolution: 2048 },
      { level: 'medium', distance: LOD_DISTANCES.medium, triangleCount: 35000, textureResolution: 1024 },
      { level: 'low', distance: LOD_DISTANCES.low, triangleCount: 14000, textureResolution: 512 },
      { level: 'billboard', distance: LOD_DISTANCES.billboard, triangleCount: 2, textureResolution: 256 },
    ],
  },
  discovery: {
    visibleFromDistance: 2000,
    beaconEffect: true,
    audioCue: 'airport_ambient',
    riddle: 'Where the space age never ended, and journeys to everywhere begin...',
  },
  photoReferences: [],
  lore: {
    founded: '1961',
    historicalSignificance: 'A landmark of Googie architecture, symbol of mid-century futuristic design.',
    funFacts: [
      'Originally had a restaurant that rotated',
      'Appeared in countless films and TV shows',
      'Part of the LAX renovation that cost $50,000 in 1959',
    ],
  },
};

// =====================================================
// DISTRICT CONFIGURATIONS (5 Districts)
// =====================================================

export const DISTRICT_CONFIGS: Record<DistrictId, DistrictConfig> = {
  // District 1: Hollywood & The Hills
  hollywood: {
    id: 'hollywood',
    name: 'Hollywood & The Hills',
    displayName: 'Hollywood & The Hills District',
    description: 'The entertainment heart of LA, featuring iconic landmarks, rolling hills, and the world-famous Hollywood Sign.',
    bounds: {
      minLat: 34.0900,
      maxLat: 34.1500,
      minLon: -118.3700,
      maxLon: -118.2800,
    },
    center: {
      latitude: 34.1189,
      longitude: -118.3206,
      altitude: 250,
    },
    sizeKm2: 1.0,
    compressionRatio: DISTANCE_COMPRESSION,
    terrain: {
      type: 'hilly',
      avgElevation: 250,
      elevationRange: [100, 500],
    },
    theme: {
      primaryColor: '#FFD700', // Gold
      secondaryColor: '#1A1A2E', // Dark blue
      accentColor: '#E94560', // Red
      buildingStyle: ['art_deco', 'spanish_revival', 'mid_century_modern'],
      vegetationType: ['palm_trees', 'grass', 'oak_trees'],
    },
    roadStyle: {
      primaryRoads: ['Hollywood Blvd', 'Sunset Blvd', 'Vine St', 'Highland Ave'],
      gridPattern: 'organic',
    },
    landmarks: [
      hollywoodSignLandmark,
      griffithObservatoryLandmark,
      tclChineseTheatreLandmark,
      hollywoodWalkOfFameLandmark,
    ],
  },

  // District 2: The Westside & Beaches
  beach: {
    id: 'beach',
    name: 'The Westside & Beaches',
    displayName: 'Westside Beach District',
    description: 'Sun, sand, and surf - the quintessential LA beach lifestyle from Santa Monica to Venice.',
    bounds: {
      minLat: 33.9600,
      maxLat: 34.0400,
      minLon: -118.5100,
      maxLon: -118.4400,
    },
    center: {
      latitude: 33.9922,
      longitude: -118.4764,
      altitude: 5,
    },
    sizeKm2: 1.5,
    compressionRatio: DISTANCE_COMPRESSION,
    terrain: {
      type: 'coastal',
      avgElevation: 5,
      elevationRange: [0, 50],
    },
    theme: {
      primaryColor: '#00CED1', // Dark Turquoise
      secondaryColor: '#F5DEB3', // Wheat/Sand
      accentColor: '#FF6347', // Tomato
      buildingStyle: ['spanish_revival', 'contemporary', 'mid_century_modern'],
      vegetationType: ['palm_trees', 'grass', 'succulents'],
    },
    roadStyle: {
      primaryRoads: ['Ocean Ave', 'Pacific Coast Highway', 'Venice Blvd', 'Santa Monica Blvd'],
      gridPattern: 'grid',
    },
    landmarks: [
      santaMonicaPierLandmark,
      veniceBeachLandmark,
      veniceCanalsLandmark,
      gettyCenterLandmark,
    ],
  },

  // District 3: Downtown LA
  downtown: {
    id: 'downtown',
    name: 'Downtown LA',
    displayName: 'Downtown Los Angeles',
    description: 'The urban core - skyscrapers, cultural institutions, historic architecture, and the heart of city life.',
    bounds: {
      minLat: 34.0400,
      maxLat: 34.0700,
      minLon: -118.2600,
      maxLon: -118.2300,
    },
    center: {
      latitude: 34.0522,
      longitude: -118.2437,
      altitude: 100,
    },
    sizeKm2: 1.2,
    compressionRatio: DISTANCE_COMPRESSION,
    terrain: {
      type: 'flat',
      avgElevation: 100,
      elevationRange: [90, 120],
    },
    theme: {
      primaryColor: '#4A90D9', // Steel Blue
      secondaryColor: '#2C3E50', // Dark Slate
      accentColor: '#F39C12', // Orange
      buildingStyle: ['art_deco', 'glass_tower', 'modernist', 'victorian'],
      vegetationType: ['palm_trees', 'grass'],
    },
    roadStyle: {
      primaryRoads: ['Main St', 'Broadway', 'Spring St', 'Hill St', '1st St'],
      gridPattern: 'grid',
    },
    landmarks: [
      disneyConcertHallLandmark,
      bradburyBuildingLandmark,
      grandCentralMarketLandmark,
      laCityHallLandmark,
      unionStationLandmark,
    ],
  },

  // District 4: Culture & Parks
  beverly_hills: {
    id: 'beverly_hills',
    name: 'Culture & Parks',
    displayName: 'Miracle Mile & Beverly Hills',
    description: 'Museums, culture, and luxury - from the wonders of LACMA to the glamour of Rodeo Drive.',
    bounds: {
      minLat: 34.0500,
      maxLat: 34.0900,
      minLon: -118.3800,
      maxLon: -118.3400,
    },
    center: {
      latitude: 34.0675,
      longitude: -118.3592,
      altitude: 90,
    },
    sizeKm2: 0.8,
    compressionRatio: DISTANCE_COMPRESSION,
    terrain: {
      type: 'mixed',
      avgElevation: 90,
      elevationRange: [70, 120],
    },
    theme: {
      primaryColor: '#9B59B6', // Amethyst
      secondaryColor: '#ECF0F1', // Cloud White
      accentColor: '#E74C3C', // Red
      buildingStyle: ['contemporary', 'modernist', 'spanish_revival'],
      vegetationType: ['palm_trees', 'grass', 'oak_trees'],
    },
    roadStyle: {
      primaryRoads: ['Wilshire Blvd', 'Olympic Blvd', 'Rodeo Dr', 'Canon Dr'],
      gridPattern: 'grid',
    },
    landmarks: [
      lacmaLandmark,
      laBreaTarPitsLandmark,
      coliseumLandmark,
      dodgerStadiumLandmark,
    ],
  },

  // District 5: South LA / Connector
  south_la: {
    id: 'south_la',
    name: 'Glamour & Luxury',
    displayName: 'South LA & Gateway',
    description: 'A diverse district connecting the city, featuring the iconic Watts Towers and the gateway of LAX.',
    bounds: {
      minLat: 33.9200,
      maxLat: 34.0200,
      minLon: -118.4200,
      maxLon: -118.2300,
    },
    center: {
      latitude: 33.9453,
      longitude: -118.3249,
      altitude: 40,
    },
    sizeKm2: 0.5,
    compressionRatio: DISTANCE_COMPRESSION,
    terrain: {
      type: 'flat',
      avgElevation: 40,
      elevationRange: [20, 60],
    },
    theme: {
      primaryColor: '#27AE60', // Green
      secondaryColor: '#34495E', // Wet Asphalt
      accentColor: '#F1C40F', // Yellow
      buildingStyle: ['contemporary', 'spanish_revival', 'industrial'],
      vegetationType: ['palm_trees', 'grass'],
    },
    roadStyle: {
      primaryRoads: ['Central Ave', 'Florence Ave', 'Century Blvd', 'Imperial Hwy'],
      gridPattern: 'grid',
    },
    landmarks: [
      rodeoDriveLandmark,
      wattsTowersLandmark,
      laxThemeBuildingLandmark,
    ],
  },
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getDistrictById(id: DistrictId): DistrictConfig {
  return DISTRICT_CONFIGS[id];
}

export function getAllLandmarks(): LandmarkConfig[] {
  return Object.values(DISTRICT_CONFIGS).flatMap(d => d.landmarks);
}

export function getLandmarkById(id: string): LandmarkConfig | undefined {
  return getAllLandmarks().find(l => l.id === id);
}

export function getLandmarkByCoordinates(lat: number, lon: number): LandmarkConfig | undefined {
  // Find nearest landmark within 100 meters
  const landmarks = getAllLandmarks();
  let nearest: LandmarkConfig | undefined;
  let minDistance = Infinity;

  for (const landmark of landmarks) {
    const distance = haversineDistance(
      lat, lon,
      landmark.coordinates.latitude, landmark.coordinates.longitude
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = landmark;
    }
  }

  return minDistance < 0.1 ? nearest : undefined; // Within 100m
}

// Haversine distance formula (returns km)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Convert real coordinates to game world position
export function geoToGamePosition(lat: number, lon: number, origin: typeof LA_CENTER): { x: number; z: number } {
  // Simple Mercator-style projection with distance compression
  const latOffset = (lat - origin.latitude) * 111000; // meters per degree latitude
  const lonOffset = (lon - origin.longitude) * 111000 * Math.cos(origin.latitude * Math.PI / 180);
  
  // Apply compression ratio
  const compressedX = lonOffset / DISTANCE_COMPRESSION;
  const compressedZ = latOffset / DISTANCE_COMPRESSION;
  
  return { x: compressedX, z: compressedZ };
}

// Calculate game world positions for all landmarks
export function calculateGamePositions(): void {
  for (const district of Object.values(DISTRICT_CONFIGS)) {
    for (const landmark of district.landmarks) {
      const gamePos = geoToGamePosition(
        landmark.coordinates.latitude,
        landmark.coordinates.longitude,
        LA_CENTER
      );
      landmark.gamePosition.x = gamePos.x;
      landmark.gamePosition.z = gamePos.z;
      landmark.gamePosition.y = landmark.coordinates.altitude || 0;
    }
  }
}

// Initialize game positions on load
calculateGamePositions();

export default DISTRICT_CONFIGS;