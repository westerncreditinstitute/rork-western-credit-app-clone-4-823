export interface Building3D {
  id: string;
  name: string;
  type: 'residential' | 'commercial' | 'landmark' | 'skyscraper' | 'park' | 'beach';
  height: number;
  width: number;
  depth: number;
  color: string;
  accentColor: string;
  windowColor: string;
  gridX: number;
  gridY: number;
  neighborhood: string;
  propertyValue?: number;
  rentPrice?: number;
  isForSale?: boolean;
  floors: number;
  description: string;
  imageUrl?: string;
}

export interface CityBlock3D {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  buildings: Building3D[];
  streetName: string;
  neighborhood: string;
}

export interface City3DConfig {
  cityId: string;
  cityName: string;
  tagline: string;
  gridSize: number;
  blocks: CityBlock3D[];
  skyColor: [string, string, ...string[]];
  groundColor: string;
  ambientColor: string;
  heroImageUrl: string;
  weatherEmoji: string;
  temperature: string;
  population: string;
  avgRent: string;
  quickFacts: string[];
}

export interface PlayerPosition {
  blockX: number;
  blockY: number;
  facing: 'north' | 'south' | 'east' | 'west';
}

const LA_BLOCKS: CityBlock3D[] = [
  {
    id: 'la_b0_0', name: 'Hollywood & Vine', gridX: 0, gridY: 0,
    streetName: 'Hollywood Blvd', neighborhood: 'Hollywood',
    buildings: [
      { id: 'la_b0_0_1', name: 'Capitol Records Building', type: 'landmark', height: 180, width: 60, depth: 60, color: '#D4C5A9', accentColor: '#8B7355', windowColor: '#87CEEB55', gridX: 0, gridY: 0, neighborhood: 'Hollywood', floors: 13, description: 'Iconic circular tower designed to resemble a stack of records', imageUrl: 'https://images.unsplash.com/photo-1580655653885-65763b2597d0?w=400' },
      { id: 'la_b0_0_2', name: 'Sunset Apartments', type: 'residential', height: 90, width: 50, depth: 40, color: '#E8D5B7', accentColor: '#C4A882', windowColor: '#FFE08855', gridX: 0, gridY: 0, neighborhood: 'Hollywood', propertyValue: 650000, rentPrice: 3200, isForSale: true, floors: 6, description: 'Modern apartments with rooftop pool and city views' },
      { id: 'la_b0_0_3', name: 'Walk of Fame Shops', type: 'commercial', height: 40, width: 70, depth: 35, color: '#C9B99A', accentColor: '#A89070', windowColor: '#FFD70055', gridX: 0, gridY: 0, neighborhood: 'Hollywood', floors: 2, description: 'Tourist shops and souvenir stores along the Walk of Fame' },
    ],
  },
  {
    id: 'la_b1_0', name: 'Beverly Hills Plaza', gridX: 1, gridY: 0,
    streetName: 'Rodeo Drive', neighborhood: 'Beverly Hills',
    buildings: [
      { id: 'la_b1_0_1', name: 'Rodeo Collection', type: 'commercial', height: 50, width: 80, depth: 50, color: '#FAF0E6', accentColor: '#D4AF37', windowColor: '#87CEEB44', gridX: 1, gridY: 0, neighborhood: 'Beverly Hills', floors: 3, description: 'Luxury shopping complex with designer boutiques' },
      { id: 'la_b1_0_2', name: 'Beverly Wilshire', type: 'landmark', height: 140, width: 90, depth: 60, color: '#F5E6CA', accentColor: '#C4A882', windowColor: '#FFE08866', gridX: 1, gridY: 0, neighborhood: 'Beverly Hills', floors: 14, description: 'The legendary hotel from Pretty Woman - Tuscan-Renaissance masterpiece' },
      { id: 'la_b1_0_3', name: 'Palm Drive Mansion', type: 'residential', height: 35, width: 100, depth: 80, color: '#FFFFFF', accentColor: '#E0D5C0', windowColor: '#87CEEB55', gridX: 1, gridY: 0, neighborhood: 'Beverly Hills', propertyValue: 8500000, rentPrice: 25000, isForSale: true, floors: 2, description: 'Mediterranean estate with pool and private gardens' },
    ],
  },
  {
    id: 'la_b2_0', name: 'Venice Beach District', gridX: 2, gridY: 0,
    streetName: 'Venice Boardwalk', neighborhood: 'Venice',
    buildings: [
      { id: 'la_b2_0_1', name: 'Muscle Beach Gym', type: 'landmark', height: 25, width: 60, depth: 40, color: '#FFE4B5', accentColor: '#DAA520', windowColor: '#87CEEB33', gridX: 2, gridY: 0, neighborhood: 'Venice', floors: 1, description: 'The legendary outdoor gym where Arnold once trained' },
      { id: 'la_b2_0_2', name: 'Venice Surf Lofts', type: 'residential', height: 55, width: 45, depth: 35, color: '#87CEEB', accentColor: '#4682B4', windowColor: '#FFFFFF55', gridX: 2, gridY: 0, neighborhood: 'Venice', propertyValue: 1200000, rentPrice: 4500, isForSale: true, floors: 4, description: 'Modern lofts steps from the beach with ocean views' },
      { id: 'la_b2_0_3', name: 'Abbot Kinney Market', type: 'commercial', height: 30, width: 55, depth: 30, color: '#F0E68C', accentColor: '#BDB76B', windowColor: '#FFD70044', gridX: 2, gridY: 0, neighborhood: 'Venice', floors: 2, description: 'Indie boutiques and artisan coffee on LA\'s coolest street' },
    ],
  },
  {
    id: 'la_b0_1', name: 'DTLA Financial', gridX: 0, gridY: 1,
    streetName: 'Figueroa Street', neighborhood: 'Downtown',
    buildings: [
      { id: 'la_b0_1_1', name: 'US Bank Tower', type: 'skyscraper', height: 280, width: 55, depth: 55, color: '#C0C0C0', accentColor: '#808080', windowColor: '#87CEEB66', gridX: 0, gridY: 1, neighborhood: 'Downtown', floors: 73, description: 'The tallest building in Los Angeles - iconic glass tower' },
      { id: 'la_b0_1_2', name: 'The Broad Museum', type: 'landmark', height: 45, width: 70, depth: 50, color: '#FFFFFF', accentColor: '#E0E0E0', windowColor: '#00000022', gridX: 0, gridY: 1, neighborhood: 'Downtown', floors: 3, description: 'Free contemporary art museum with honeycomb exterior' },
      { id: 'la_b0_1_3', name: 'DTLA Luxury Condos', type: 'residential', height: 160, width: 50, depth: 45, color: '#2F4F4F', accentColor: '#1C3333', windowColor: '#FFE08855', gridX: 0, gridY: 1, neighborhood: 'Downtown', propertyValue: 890000, rentPrice: 4200, isForSale: true, floors: 42, description: 'High-rise luxury living with panoramic city views' },
    ],
  },
  {
    id: 'la_b1_1', name: 'Santa Monica Shore', gridX: 1, gridY: 1,
    streetName: 'Ocean Avenue', neighborhood: 'Santa Monica',
    buildings: [
      { id: 'la_b1_1_1', name: 'Pacific Park Pier', type: 'landmark', height: 50, width: 80, depth: 40, color: '#FF6347', accentColor: '#CD5C5C', windowColor: '#FFD70066', gridX: 1, gridY: 1, neighborhood: 'Santa Monica', floors: 1, description: 'Iconic amusement park with the solar-powered Ferris wheel' },
      { id: 'la_b1_1_2', name: 'Ocean View Towers', type: 'residential', height: 120, width: 55, depth: 45, color: '#F5F5F5', accentColor: '#DCDCDC', windowColor: '#87CEEB55', gridX: 1, gridY: 1, neighborhood: 'Santa Monica', propertyValue: 2100000, rentPrice: 8500, isForSale: true, floors: 15, description: 'Luxury beachfront condos with private beach access' },
      { id: 'la_b1_1_3', name: 'Promenade Mall', type: 'commercial', height: 35, width: 90, depth: 45, color: '#DEB887', accentColor: '#D2B48C', windowColor: '#FFE08844', gridX: 1, gridY: 1, neighborhood: 'Santa Monica', floors: 3, description: 'Third Street Promenade outdoor shopping and dining' },
    ],
  },
  {
    id: 'la_b2_1', name: 'Pasadena Heritage', gridX: 2, gridY: 1,
    streetName: 'Colorado Boulevard', neighborhood: 'Pasadena',
    buildings: [
      { id: 'la_b2_1_1', name: 'Rose Bowl Area', type: 'landmark', height: 40, width: 100, depth: 80, color: '#8B4513', accentColor: '#654321', windowColor: '#FFD70033', gridX: 2, gridY: 1, neighborhood: 'Pasadena', floors: 1, description: 'Historic stadium and surrounding parkland' },
      { id: 'la_b2_1_2', name: 'Craftsman Bungalows', type: 'residential', height: 30, width: 60, depth: 50, color: '#D2691E', accentColor: '#8B4513', windowColor: '#FFFFFF55', gridX: 2, gridY: 1, neighborhood: 'Pasadena', propertyValue: 780000, rentPrice: 3100, isForSale: true, floors: 2, description: 'Classic Craftsman homes in historic neighborhood' },
      { id: 'la_b2_1_3', name: 'Old Town Pasadena', type: 'commercial', height: 35, width: 70, depth: 35, color: '#CD853F', accentColor: '#A0522D', windowColor: '#FFE08844', gridX: 2, gridY: 1, neighborhood: 'Pasadena', floors: 2, description: 'Restored historic shopping district with boutiques and cafes' },
    ],
  },
];

const MIAMI_BLOCKS: CityBlock3D[] = [
  {
    id: 'mi_b0_0', name: 'South Beach Strip', gridX: 0, gridY: 0,
    streetName: 'Ocean Drive', neighborhood: 'South Beach',
    buildings: [
      { id: 'mi_b0_0_1', name: 'Art Deco Hotel', type: 'landmark', height: 45, width: 70, depth: 40, color: '#FFB6C1', accentColor: '#FF69B4', windowColor: '#00CED166', gridX: 0, gridY: 0, neighborhood: 'South Beach', floors: 4, description: 'Iconic pink Art Deco building on Ocean Drive with neon lights' },
      { id: 'mi_b0_0_2', name: 'South Beach Condos', type: 'residential', height: 100, width: 55, depth: 45, color: '#FFFFFF', accentColor: '#00CED1', windowColor: '#87CEEB55', gridX: 0, gridY: 0, neighborhood: 'South Beach', propertyValue: 950000, rentPrice: 4800, isForSale: true, floors: 12, description: 'Luxury oceanfront condos with pool deck and beach access' },
      { id: 'mi_b0_0_3', name: 'The Clevelander', type: 'commercial', height: 35, width: 60, depth: 35, color: '#00CED1', accentColor: '#008B8B', windowColor: '#FFD70055', gridX: 0, gridY: 0, neighborhood: 'South Beach', floors: 3, description: 'Iconic poolside bar and nightclub on Ocean Drive' },
    ],
  },
  {
    id: 'mi_b1_0', name: 'Brickell Financial', gridX: 1, gridY: 0,
    streetName: 'Brickell Avenue', neighborhood: 'Brickell',
    buildings: [
      { id: 'mi_b1_0_1', name: 'Brickell City Centre', type: 'commercial', height: 60, width: 90, depth: 60, color: '#F5F5F5', accentColor: '#C0C0C0', windowColor: '#87CEEB66', gridX: 1, gridY: 0, neighborhood: 'Brickell', floors: 5, description: 'Massive luxury open-air shopping center with climate ribbon' },
      { id: 'mi_b1_0_2', name: 'Panorama Tower', type: 'skyscraper', height: 260, width: 50, depth: 50, color: '#4682B4', accentColor: '#36648B', windowColor: '#87CEEB77', gridX: 1, gridY: 0, neighborhood: 'Brickell', propertyValue: 1800000, rentPrice: 7200, isForSale: true, floors: 85, description: 'Miami\'s tallest building - luxury residences with bay views' },
      { id: 'mi_b1_0_3', name: 'Brickell Key Tower', type: 'residential', height: 140, width: 48, depth: 42, color: '#708090', accentColor: '#556B7F', windowColor: '#FFE08855', gridX: 1, gridY: 0, neighborhood: 'Brickell', propertyValue: 1200000, rentPrice: 5500, isForSale: true, floors: 35, description: 'Waterfront condos on the exclusive Brickell Key island' },
    ],
  },
  {
    id: 'mi_b2_0', name: 'Wynwood Arts', gridX: 2, gridY: 0,
    streetName: 'NW 2nd Avenue', neighborhood: 'Wynwood',
    buildings: [
      { id: 'mi_b2_0_1', name: 'Wynwood Walls', type: 'landmark', height: 25, width: 80, depth: 50, color: '#FF6347', accentColor: '#FF4500', windowColor: '#FFD70044', gridX: 2, gridY: 0, neighborhood: 'Wynwood', floors: 1, description: 'Open-air museum of massive murals by world-famous street artists' },
      { id: 'mi_b2_0_2', name: 'Art District Lofts', type: 'residential', height: 50, width: 55, depth: 40, color: '#FFA07A', accentColor: '#FF8C00', windowColor: '#FFFFFF55', gridX: 2, gridY: 0, neighborhood: 'Wynwood', propertyValue: 520000, rentPrice: 2800, isForSale: true, floors: 4, description: 'Converted warehouse lofts in the heart of the arts district' },
      { id: 'mi_b2_0_3', name: 'Wynwood Brewery', type: 'commercial', height: 30, width: 60, depth: 35, color: '#DAA520', accentColor: '#B8860B', windowColor: '#FFD70055', gridX: 2, gridY: 0, neighborhood: 'Wynwood', floors: 1, description: 'Craft brewery in a restored warehouse with live music' },
    ],
  },
  {
    id: 'mi_b0_1', name: 'Coral Gables Estate', gridX: 0, gridY: 1,
    streetName: 'Miracle Mile', neighborhood: 'Coral Gables',
    buildings: [
      { id: 'mi_b0_1_1', name: 'Biltmore Hotel', type: 'landmark', height: 120, width: 80, depth: 60, color: '#F5DEB3', accentColor: '#D2B48C', windowColor: '#FFE08866', gridX: 0, gridY: 1, neighborhood: 'Coral Gables', floors: 15, description: 'The legendary 1926 luxury resort - tower replica of Seville\'s Giralda' },
      { id: 'mi_b0_1_2', name: 'Gables Estates', type: 'residential', height: 30, width: 90, depth: 70, color: '#FFFAF0', accentColor: '#FAEBD7', windowColor: '#87CEEB44', gridX: 0, gridY: 1, neighborhood: 'Coral Gables', propertyValue: 3500000, rentPrice: 12000, isForSale: true, floors: 2, description: 'Mediterranean-style waterfront estate with private dock' },
      { id: 'mi_b0_1_3', name: 'Venetian Pool', type: 'park', height: 10, width: 70, depth: 50, color: '#00CED1', accentColor: '#008B8B', windowColor: '#FFFFFF33', gridX: 0, gridY: 1, neighborhood: 'Coral Gables', floors: 1, description: 'Stunning public pool carved from coral rock in 1924' },
    ],
  },
  {
    id: 'mi_b1_1', name: 'Key Biscayne Island', gridX: 1, gridY: 1,
    streetName: 'Crandon Boulevard', neighborhood: 'Key Biscayne',
    buildings: [
      { id: 'mi_b1_1_1', name: 'Crandon Park', type: 'beach', height: 8, width: 100, depth: 60, color: '#F5DEB3', accentColor: '#DEB887', windowColor: '#00CED144', gridX: 1, gridY: 1, neighborhood: 'Key Biscayne', floors: 1, description: 'One of the top beaches in the US - turquoise water and white sand' },
      { id: 'mi_b1_1_2', name: 'Island Villas', type: 'residential', height: 25, width: 70, depth: 55, color: '#FFFAF0', accentColor: '#FAEBD7', windowColor: '#87CEEB55', gridX: 1, gridY: 1, neighborhood: 'Key Biscayne', propertyValue: 4200000, rentPrice: 15000, isForSale: true, floors: 2, description: 'Exclusive waterfront villas with private beach and boat dock' },
      { id: 'mi_b1_1_3', name: 'Rusty Pelican', type: 'commercial', height: 20, width: 50, depth: 35, color: '#8B4513', accentColor: '#654321', windowColor: '#FFD70055', gridX: 1, gridY: 1, neighborhood: 'Key Biscayne', floors: 1, description: 'Waterfront dining with stunning views of the Miami skyline' },
    ],
  },
  {
    id: 'mi_b2_1', name: 'Downtown Miami', gridX: 2, gridY: 1,
    streetName: 'Flagler Street', neighborhood: 'Downtown',
    buildings: [
      { id: 'mi_b2_1_1', name: 'Freedom Tower', type: 'landmark', height: 170, width: 45, depth: 45, color: '#F5DEB3', accentColor: '#D2B48C', windowColor: '#FFE08866', gridX: 2, gridY: 1, neighborhood: 'Downtown', floors: 17, description: 'Miami\'s Ellis Island - historic tower and cultural landmark' },
      { id: 'mi_b2_1_2', name: 'Downtown Lofts', type: 'residential', height: 85, width: 50, depth: 40, color: '#696969', accentColor: '#555555', windowColor: '#FFE08855', gridX: 2, gridY: 1, neighborhood: 'Downtown', propertyValue: 420000, rentPrice: 2200, isForSale: true, floors: 8, description: 'Modern lofts in the revitalized downtown core' },
      { id: 'mi_b2_1_3', name: 'Bayside Marketplace', type: 'commercial', height: 25, width: 80, depth: 45, color: '#4682B4', accentColor: '#36648B', windowColor: '#FFFFFF55', gridX: 2, gridY: 1, neighborhood: 'Downtown', floors: 2, description: 'Waterfront entertainment and shopping destination' },
    ],
  },
];

const NYC_BLOCKS: CityBlock3D[] = [
  {
    id: 'ny_b0_0', name: 'Times Square', gridX: 0, gridY: 0,
    streetName: 'Broadway', neighborhood: 'Manhattan',
    buildings: [
      { id: 'ny_b0_0_1', name: 'One Times Square', type: 'landmark', height: 160, width: 40, depth: 40, color: '#C0C0C0', accentColor: '#808080', windowColor: '#FF000066', gridX: 0, gridY: 0, neighborhood: 'Manhattan', floors: 25, description: 'The ball drop building - massive LED billboards light up the crossroads of the world' },
      { id: 'ny_b0_0_2', name: 'Times Square Tower', type: 'skyscraper', height: 230, width: 50, depth: 48, color: '#4169E1', accentColor: '#27408B', windowColor: '#87CEEB77', gridX: 0, gridY: 0, neighborhood: 'Manhattan', propertyValue: 3200000, rentPrice: 12000, isForSale: true, floors: 47, description: 'Luxury high-rise in the heart of Times Square' },
      { id: 'ny_b0_0_3', name: 'Broadway Theater', type: 'landmark', height: 50, width: 60, depth: 50, color: '#8B0000', accentColor: '#660000', windowColor: '#FFD70077', gridX: 0, gridY: 0, neighborhood: 'Manhattan', floors: 3, description: 'Historic Broadway theater hosting world-class performances' },
    ],
  },
  {
    id: 'ny_b1_0', name: 'Fifth Avenue', gridX: 1, gridY: 0,
    streetName: 'Fifth Avenue', neighborhood: 'Manhattan',
    buildings: [
      { id: 'ny_b1_0_1', name: 'Empire State Building', type: 'skyscraper', height: 320, width: 55, depth: 55, color: '#A9A9A9', accentColor: '#808080', windowColor: '#FFE08877', gridX: 1, gridY: 0, neighborhood: 'Manhattan', floors: 102, description: 'The most famous skyscraper in the world - Art Deco masterpiece' },
      { id: 'ny_b1_0_2', name: 'Tiffany & Co.', type: 'commercial', height: 45, width: 50, depth: 40, color: '#40E0D0', accentColor: '#20B2AA', windowColor: '#FFFFFF55', gridX: 1, gridY: 0, neighborhood: 'Manhattan', floors: 4, description: 'The flagship Tiffany store - Breakfast at Tiffany\'s landmark' },
      { id: 'ny_b1_0_3', name: 'Midtown Penthouses', type: 'residential', height: 200, width: 45, depth: 42, color: '#2F4F4F', accentColor: '#1C3333', windowColor: '#FFE08866', gridX: 1, gridY: 0, neighborhood: 'Manhattan', propertyValue: 5800000, rentPrice: 18000, isForSale: true, floors: 52, description: 'Ultra-luxury penthouses with Central Park views' },
    ],
  },
  {
    id: 'ny_b2_0', name: 'DUMBO District', gridX: 2, gridY: 0,
    streetName: 'Water Street', neighborhood: 'Brooklyn',
    buildings: [
      { id: 'ny_b2_0_1', name: 'Brooklyn Bridge', type: 'landmark', height: 85, width: 100, depth: 30, color: '#8B7355', accentColor: '#6B5B3D', windowColor: '#00000022', gridX: 2, gridY: 0, neighborhood: 'Brooklyn', floors: 1, description: 'The 1883 engineering marvel - walk across for stunning Manhattan views' },
      { id: 'ny_b2_0_2', name: 'DUMBO Warehouse Lofts', type: 'residential', height: 60, width: 70, depth: 50, color: '#8B4513', accentColor: '#654321', windowColor: '#FFE08855', gridX: 2, gridY: 0, neighborhood: 'Brooklyn', propertyValue: 1400000, rentPrice: 5800, isForSale: true, floors: 6, description: 'Converted warehouse lofts with Manhattan Bridge views' },
      { id: 'ny_b2_0_3', name: 'Brooklyn Flea', type: 'commercial', height: 20, width: 60, depth: 40, color: '#CD853F', accentColor: '#A0522D', windowColor: '#FFD70044', gridX: 2, gridY: 0, neighborhood: 'Brooklyn', floors: 1, description: 'Weekend market with vintage finds and incredible street food' },
    ],
  },
  {
    id: 'ny_b0_1', name: 'Central Park South', gridX: 0, gridY: 1,
    streetName: 'Central Park South', neighborhood: 'Manhattan',
    buildings: [
      { id: 'ny_b0_1_1', name: 'The Plaza Hotel', type: 'landmark', height: 130, width: 80, depth: 60, color: '#FFFFF0', accentColor: '#FFFACD', windowColor: '#FFD70055', gridX: 0, gridY: 1, neighborhood: 'Manhattan', floors: 20, description: 'The iconic luxury hotel on Central Park - Home to Eloise' },
      { id: 'ny_b0_1_2', name: 'Central Park', type: 'park', height: 8, width: 100, depth: 80, color: '#228B22', accentColor: '#006400', windowColor: '#FFFFFF22', gridX: 0, gridY: 1, neighborhood: 'Manhattan', floors: 1, description: 'The green heart of Manhattan - 843 acres of urban oasis' },
      { id: 'ny_b0_1_3', name: 'Billionaire\'s Row', type: 'residential', height: 350, width: 35, depth: 35, color: '#F5F5F5', accentColor: '#DCDCDC', windowColor: '#87CEEB88', gridX: 0, gridY: 1, neighborhood: 'Manhattan', propertyValue: 15000000, rentPrice: 45000, isForSale: true, floors: 95, description: 'The tallest residential building in the world - ultra-luxury' },
    ],
  },
  {
    id: 'ny_b1_1', name: 'SoHo Arts', gridX: 1, gridY: 1,
    streetName: 'Spring Street', neighborhood: 'Manhattan',
    buildings: [
      { id: 'ny_b1_1_1', name: 'Cast Iron Gallery', type: 'landmark', height: 40, width: 60, depth: 45, color: '#D3D3D3', accentColor: '#A9A9A9', windowColor: '#FFFFFF55', gridX: 1, gridY: 1, neighborhood: 'Manhattan', floors: 5, description: 'Historic cast-iron building housing world-class art galleries' },
      { id: 'ny_b1_1_2', name: 'SoHo Lofts', type: 'residential', height: 55, width: 50, depth: 45, color: '#8B4513', accentColor: '#654321', windowColor: '#FFE08866', gridX: 1, gridY: 1, neighborhood: 'Manhattan', propertyValue: 2200000, rentPrice: 8500, isForSale: true, floors: 6, description: 'Converted loft apartments in historic cast-iron buildings' },
      { id: 'ny_b1_1_3', name: 'Balthazar', type: 'commercial', height: 25, width: 40, depth: 30, color: '#8B0000', accentColor: '#660000', windowColor: '#FFD70066', gridX: 1, gridY: 1, neighborhood: 'Manhattan', floors: 1, description: 'The quintessential New York brasserie - French bistro charm' },
    ],
  },
  {
    id: 'ny_b2_1', name: 'Financial District', gridX: 2, gridY: 1,
    streetName: 'Wall Street', neighborhood: 'Manhattan',
    buildings: [
      { id: 'ny_b2_1_1', name: 'One World Trade', type: 'skyscraper', height: 380, width: 55, depth: 55, color: '#B0C4DE', accentColor: '#87CEEB', windowColor: '#87CEEB88', gridX: 2, gridY: 1, neighborhood: 'Manhattan', floors: 104, description: 'Freedom Tower - the tallest building in the Western Hemisphere' },
      { id: 'ny_b2_1_2', name: 'Wall Street Exchange', type: 'landmark', height: 35, width: 60, depth: 50, color: '#F5F5DC', accentColor: '#D2B48C', windowColor: '#00000033', gridX: 2, gridY: 1, neighborhood: 'Manhattan', floors: 4, description: 'The New York Stock Exchange - heart of global finance' },
      { id: 'ny_b2_1_3', name: 'FiDi Apartments', type: 'residential', height: 180, width: 45, depth: 40, color: '#696969', accentColor: '#555555', windowColor: '#FFE08866', gridX: 2, gridY: 1, neighborhood: 'Manhattan', propertyValue: 1600000, rentPrice: 6200, isForSale: true, floors: 45, description: 'Modern luxury apartments in the heart of the Financial District' },
    ],
  },
];

export const CITY_3D_CONFIGS: Record<string, City3DConfig> = {
  city_los_angeles: {
    cityId: 'city_los_angeles',
    cityName: 'Los Angeles',
    tagline: 'CITY OF ANGELS',
    gridSize: 3,
    blocks: LA_BLOCKS,
    skyColor: ['#FF7B54', '#FFB26B', '#87CEEB'],
    groundColor: '#E8DCC8',
    ambientColor: '#FFE4B5',
    heroImageUrl: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1200',
    weatherEmoji: '☀️',
    temperature: '78°F',
    population: '3.9M',
    avgRent: '$2,762/mo',
    quickFacts: ['Entertainment Capital', '75mi Coastline', 'Tech Hub'],
  },
  city_miami: {
    cityId: 'city_miami',
    cityName: 'Miami',
    tagline: 'MAGIC CITY',
    gridSize: 3,
    blocks: MIAMI_BLOCKS,
    skyColor: ['#00CED1', '#87CEEB', '#E0FFFF'],
    groundColor: '#F5DEB3',
    ambientColor: '#E0FFFF',
    heroImageUrl: 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=1200',
    weatherEmoji: '🌴',
    temperature: '85°F',
    population: '450K',
    avgRent: '$2,939/mo',
    quickFacts: ['Beach Life', 'No State Tax', 'International Hub'],
  },
  city_new_york: {
    cityId: 'city_new_york',
    cityName: 'New York City',
    tagline: 'THE BIG APPLE',
    gridSize: 3,
    blocks: NYC_BLOCKS,
    skyColor: ['#4169E1', '#6495ED', '#B0C4DE'],
    groundColor: '#A9A9A9',
    ambientColor: '#B0C4DE',
    heroImageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200',
    weatherEmoji: '🌆',
    temperature: '62°F',
    population: '8.3M',
    avgRent: '$3,643/mo',
    quickFacts: ['Financial Center', '520mi Coastline', 'Cultural Capital'],
  },
};

export function getCity3DConfig(cityId: string): City3DConfig | null {
  return CITY_3D_CONFIGS[cityId] || null;
}

export function getCityIdMapping(gameCity: string): string {
  const mapping: Record<string, string> = {
    'city_los_angeles': 'city_los_angeles',
    'city_new_york': 'city_new_york',
    'city_miami': 'city_miami',
    'city_chicago': 'city_los_angeles',
    'city_houston': 'city_miami',
    'city_phoenix': 'city_los_angeles',
    'city_atlanta': 'city_new_york',
    'city_denver': 'city_los_angeles',
  };
  return mapping[gameCity] || 'city_los_angeles';
}

export function getBlockAt(city: City3DConfig, x: number, y: number): CityBlock3D | null {
  return city.blocks.find(b => b.gridX === x && b.gridY === y) || null;
}

export function getAdjacentBlocks(city: City3DConfig, x: number, y: number): {
  north: CityBlock3D | null;
  south: CityBlock3D | null;
  east: CityBlock3D | null;
  west: CityBlock3D | null;
} {
  return {
    north: getBlockAt(city, x, y - 1),
    south: getBlockAt(city, x, y + 1),
    east: getBlockAt(city, x + 1, y),
    west: getBlockAt(city, x - 1, y),
  };
}

export function getDirectionLabel(facing: PlayerPosition['facing']): string {
  switch (facing) {
    case 'north': return 'N';
    case 'south': return 'S';
    case 'east': return 'E';
    case 'west': return 'W';
  }
}

export function getDirectionDegrees(facing: PlayerPosition['facing']): number {
  switch (facing) {
    case 'north': return 0;
    case 'east': return 90;
    case 'south': return 180;
    case 'west': return 270;
  }
}

export function turnLeft(facing: PlayerPosition['facing']): PlayerPosition['facing'] {
  switch (facing) {
    case 'north': return 'west';
    case 'west': return 'south';
    case 'south': return 'east';
    case 'east': return 'north';
  }
}

export function turnRight(facing: PlayerPosition['facing']): PlayerPosition['facing'] {
  switch (facing) {
    case 'north': return 'east';
    case 'east': return 'south';
    case 'south': return 'west';
    case 'west': return 'north';
  }
}

export function moveForward(pos: PlayerPosition, gridSize: number): PlayerPosition {
  let newX = pos.blockX;
  let newY = pos.blockY;
  switch (pos.facing) {
    case 'north': newY = Math.max(0, pos.blockY - 1); break;
    case 'south': newY = Math.min(gridSize - 1, pos.blockY + 1); break;
    case 'east': newX = Math.min(gridSize - 1, pos.blockX + 1); break;
    case 'west': newX = Math.max(0, pos.blockX - 1); break;
  }
  return { ...pos, blockX: newX, blockY: newY };
}

export function moveBackward(pos: PlayerPosition, gridSize: number): PlayerPosition {
  let newX = pos.blockX;
  let newY = pos.blockY;
  switch (pos.facing) {
    case 'north': newY = Math.min(gridSize - 1, pos.blockY + 1); break;
    case 'south': newY = Math.max(0, pos.blockY - 1); break;
    case 'east': newX = Math.max(0, pos.blockX - 1); break;
    case 'west': newX = Math.min(gridSize - 1, pos.blockX + 1); break;
  }
  return { ...pos, blockX: newX, blockY: newY };
}
