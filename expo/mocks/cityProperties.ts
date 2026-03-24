import {
  MapProperty,
  MapPropertyOwner,
  MapPropertyType,
  ResidentialType,
  CommercialVenueType,
  PropertyCategory,
} from '@/types/mapProperty';

const RESIDENTIAL_TYPES: ResidentialType[] = [
  'apartment', 'house', 'condo', 'townhouse', 'duplex', 'mansion', 'penthouse', 'loft', 'studio'
];

const COMMERCIAL_TYPES: CommercialVenueType[] = [
  'bowling_alley', 'movie_theater', 'restaurant', 'nightclub', 'bar', 'billiards_hall',
  'bank', 'event_hall', 'grocery_store', 'sports_arena', 'paintball_range', 'golf_country_club',
  'gym', 'spa', 'coffee_shop', 'shopping_mall', 'arcade', 'comedy_club', 'art_gallery', 'museum'
];

interface CityConfig {
  id: string;
  name: string;
  state: string;
  centerLat: number;
  centerLng: number;
  neighborhoods: string[];
  streetNames: string[];
  zipCodes: string[];
}

const CITY_CONFIGS: Record<string, CityConfig> = {
  'los-angeles': {
    id: 'los-angeles',
    name: 'Los Angeles',
    state: 'CA',
    centerLat: 34.0522,
    centerLng: -118.2437,
    neighborhoods: ['Hollywood', 'Beverly Hills', 'Santa Monica', 'Downtown LA', 'Venice', 'Westwood', 'Silver Lake', 'Echo Park', 'Koreatown', 'Mid-Wilshire'],
    streetNames: ['Sunset Blvd', 'Hollywood Blvd', 'Wilshire Blvd', 'Santa Monica Blvd', 'Melrose Ave', 'La Brea Ave', 'Fairfax Ave', 'Vermont Ave', 'Western Ave', 'Vine St'],
    zipCodes: ['90028', '90036', '90046', '90048', '90069', '90210', '90024', '90015', '90012', '90038'],
  },
  'new-york': {
    id: 'new-york',
    name: 'New York',
    state: 'NY',
    centerLat: 40.7128,
    centerLng: -74.0060,
    neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'Harlem', 'SoHo', 'Chelsea', 'Upper East Side', 'Upper West Side', 'Tribeca', 'Greenwich Village'],
    streetNames: ['Broadway', '5th Avenue', 'Park Avenue', 'Madison Avenue', 'Lexington Ave', 'Amsterdam Ave', 'Columbus Ave', 'Canal St', 'Houston St', 'Bleecker St'],
    zipCodes: ['10001', '10011', '10012', '10013', '10014', '10016', '10019', '10021', '10022', '10036'],
  },
  'miami': {
    id: 'miami',
    name: 'Miami',
    state: 'FL',
    centerLat: 25.7617,
    centerLng: -80.1918,
    neighborhoods: ['South Beach', 'Brickell', 'Wynwood', 'Coral Gables', 'Coconut Grove', 'Little Havana', 'Design District', 'Midtown', 'Downtown Miami', 'Miami Beach'],
    streetNames: ['Ocean Drive', 'Collins Ave', 'Biscayne Blvd', 'Brickell Ave', 'Calle Ocho', 'Lincoln Rd', 'Washington Ave', 'Alton Rd', 'West Ave', 'Flagler St'],
    zipCodes: ['33139', '33131', '33127', '33134', '33133', '33135', '33137', '33132', '33130', '33140'],
  },
  'chicago': {
    id: 'chicago',
    name: 'Chicago',
    state: 'IL',
    centerLat: 41.8781,
    centerLng: -87.6298,
    neighborhoods: ['The Loop', 'River North', 'Lincoln Park', 'Wicker Park', 'Gold Coast', 'Lakeview', 'Streeterville', 'Old Town', 'Bucktown', 'West Loop'],
    streetNames: ['Michigan Ave', 'State St', 'Clark St', 'LaSalle St', 'Wabash Ave', 'Rush St', 'Halsted St', 'Milwaukee Ave', 'Damen Ave', 'Ashland Ave'],
    zipCodes: ['60601', '60602', '60603', '60610', '60611', '60614', '60622', '60654', '60657', '60661'],
  },
  'houston': {
    id: 'houston',
    name: 'Houston',
    state: 'TX',
    centerLat: 29.7604,
    centerLng: -95.3698,
    neighborhoods: ['Downtown', 'Midtown', 'Montrose', 'The Heights', 'River Oaks', 'Galleria', 'Memorial', 'Museum District', 'Rice Village', 'Upper Kirby'],
    streetNames: ['Westheimer Rd', 'Main St', 'Kirby Dr', 'Montrose Blvd', 'Washington Ave', 'Richmond Ave', 'Shepherd Dr', 'Heights Blvd', 'Post Oak Blvd', 'Fannin St'],
    zipCodes: ['77002', '77004', '77006', '77007', '77008', '77019', '77024', '77027', '77030', '77056'],
  },
  'phoenix': {
    id: 'phoenix',
    name: 'Phoenix',
    state: 'AZ',
    centerLat: 33.4484,
    centerLng: -112.0740,
    neighborhoods: ['Downtown', 'Scottsdale', 'Tempe', 'Arcadia', 'Biltmore', 'Paradise Valley', 'Camelback East', 'Central City', 'Encanto', 'Ahwatukee'],
    streetNames: ['Camelback Rd', 'Indian School Rd', 'Thomas Rd', 'McDowell Rd', 'Van Buren St', 'Central Ave', '7th Ave', '7th St', 'Scottsdale Rd', 'Cave Creek Rd'],
    zipCodes: ['85003', '85004', '85006', '85008', '85012', '85014', '85016', '85018', '85251', '85254'],
  },
  'san-francisco': {
    id: 'san-francisco',
    name: 'San Francisco',
    state: 'CA',
    centerLat: 37.7749,
    centerLng: -122.4194,
    neighborhoods: ['SOMA', 'Mission District', 'Castro', 'Nob Hill', 'Pacific Heights', 'Marina', 'Haight-Ashbury', 'North Beach', 'Financial District', 'Russian Hill'],
    streetNames: ['Market St', 'Mission St', 'Valencia St', 'Castro St', 'Fillmore St', 'Van Ness Ave', 'Polk St', 'Columbus Ave', 'Geary Blvd', 'Divisadero St'],
    zipCodes: ['94102', '94103', '94107', '94109', '94110', '94111', '94114', '94115', '94117', '94133'],
  },
  'atlanta': {
    id: 'atlanta',
    name: 'Atlanta',
    state: 'GA',
    centerLat: 33.7490,
    centerLng: -84.3880,
    neighborhoods: ['Midtown', 'Buckhead', 'Downtown', 'Virginia-Highland', 'Inman Park', 'Little Five Points', 'Old Fourth Ward', 'West Midtown', 'Decatur', 'East Atlanta'],
    streetNames: ['Peachtree St', 'Piedmont Ave', 'Ponce de Leon Ave', 'North Ave', 'Marietta St', 'Spring St', 'West Peachtree St', '10th St', '14th St', 'Monroe Dr'],
    zipCodes: ['30303', '30305', '30306', '30307', '30308', '30309', '30312', '30313', '30318', '30324'],
  },
};

const PROPERTY_IMAGES: Record<string, string[]> = {
  apartment: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  ],
  house: [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
  ],
  condo: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
  ],
  mansion: [
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
  ],
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
  ],
  bar: [
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
  ],
  gym: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800',
  ],
  coffee_shop: [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800',
  ],
  movie_theater: [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
  ],
  shopping_mall: [
    'https://images.unsplash.com/photo-1567449303078-57ad995bd329?w=800',
  ],
  default: [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
  ],
};

const OWNER_AVATARS = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
];

const OWNER_NAMES = [
  'Marcus Johnson', 'Sarah Chen', 'David Rodriguez', 'Emily Watson',
  'Michael Brown', 'Jessica Lee', 'Christopher Davis', 'Amanda Wilson',
  'Robert Taylor', 'Michelle Anderson', 'James Thomas', 'Jennifer Martinez',
];

const COMMERCIAL_NAMES: Record<CommercialVenueType, string[]> = {
  bowling_alley: ['Strike Zone Lanes', 'Lucky Strike Bowling', 'Sunset Lanes', 'Pin Masters', 'Bowl-O-Rama'],
  movie_theater: ['Cineplex Grand', 'Star Cinema', 'Metropolitan Pictures', 'Regal Theater', 'AMC Premiere'],
  restaurant: ['The Golden Fork', 'Blue Plate Diner', 'Harvest Kitchen', 'Urban Bites', 'Coastal Cuisine'],
  nightclub: ['Club Velvet', 'Neon Nights', 'The Underground', 'Pulse Lounge', 'Skyline Club'],
  bar: ['The Rusty Anchor', 'Craft & Draft', 'The Speakeasy', 'Hoppy Hour', 'Tap House'],
  billiards_hall: ['Rack & Roll', 'Corner Pocket', 'The Billiard Room', 'Eight Ball Lounge', 'Cue Masters'],
  bank: ['First National Bank', 'Metro Credit Union', 'City Savings', 'Heritage Bank', 'Pacific Trust'],
  event_hall: ['Grand Ballroom', 'The Venue', 'Celebration Hall', 'Crystal Palace', 'The Event Center'],
  grocery_store: ['Fresh Market', 'Urban Grocer', 'Daily Harvest', 'Green Valley Market', 'City Foods'],
  sports_arena: ['Metro Arena', 'Champions Stadium', 'Victory Field', 'Sports Complex', 'The Dome'],
  paintball_range: ['Combat Zone', 'Tactical Paintball', 'Battle Arena', 'Paintball Paradise', 'War Games'],
  golf_country_club: ['Fairway Club', 'Green Hills CC', 'Eagle Ridge', 'The Links', 'Sunset Golf Club'],
  gym: ['Iron Fitness', 'FitLife Gym', 'PowerHouse Athletics', 'The Training Ground', 'Peak Performance'],
  spa: ['Serenity Spa', 'Bliss Wellness', 'The Retreat', 'Harmony Day Spa', 'Oasis Relaxation'],
  coffee_shop: ['Brew House', 'Bean & Leaf', 'Morning Cup', 'The Daily Grind', 'Espresso Express'],
  shopping_mall: ['City Center Mall', 'Metro Plaza', 'Fashion Square', 'The Galleria', 'Riverside Mall'],
  arcade: ['Game Zone', 'Pixel Palace', 'Retro Arcade', 'Digital Fun', 'Player One'],
  comedy_club: ['Laugh Factory', 'The Comedy Store', 'Chuckles Club', 'Stand Up Central', 'Funny Bone'],
  art_gallery: ['Modern Art Space', 'The Gallery', 'Artisan Collective', 'Creative Corner', 'Vision Gallery'],
  museum: ['City Museum', 'Heritage Center', 'Discovery Museum', 'Cultural Institute', 'History Hall'],
};

const RESIDENTIAL_FEATURES: Record<ResidentialType, string[]> = {
  apartment: ['Central A/C', 'In-unit Laundry', 'Balcony', 'Gym Access', 'Rooftop Deck', 'Doorman', 'Pet Friendly'],
  house: ['Backyard', 'Garage', 'Central A/C', 'Fireplace', 'Hardwood Floors', 'Updated Kitchen', 'Pool'],
  condo: ['Concierge', 'Gym', 'Pool', 'Parking', 'Balcony', 'Storage Unit', 'Security'],
  townhouse: ['Private Entrance', 'Patio', 'Garage', 'Multiple Floors', 'Modern Kitchen', 'Washer/Dryer'],
  duplex: ['Separate Entrance', 'Backyard', 'Parking', 'Updated Kitchen', 'Pet Friendly'],
  mansion: ['Pool', 'Tennis Court', 'Wine Cellar', 'Home Theater', 'Guest House', 'Smart Home', 'Security System'],
  penthouse: ['Panoramic Views', 'Private Elevator', 'Rooftop Terrace', 'Smart Home', 'Wine Room', 'Spa'],
  loft: ['High Ceilings', 'Exposed Brick', 'Open Floor Plan', 'Large Windows', 'Industrial Design'],
  studio: ['Efficient Layout', 'Modern Kitchen', 'Natural Light', 'Built-in Storage', 'Gym Access'],
};

const COMMERCIAL_FEATURES: Record<CommercialVenueType, string[]> = {
  bowling_alley: ['Pro Shop', 'Cosmic Bowling', 'Arcade', 'Full Bar', 'Party Rooms', 'League Nights'],
  movie_theater: ['IMAX Screen', 'Dolby Atmos', 'Recliner Seats', 'Full Bar', 'VIP Seating', 'Dine-in Service'],
  restaurant: ['Private Dining', 'Full Bar', 'Outdoor Seating', 'Catering', 'Live Music', 'Chef\'s Table'],
  nightclub: ['VIP Booths', 'DJ Booth', 'Multiple Bars', 'Dance Floor', 'Bottle Service', 'Security'],
  bar: ['Craft Cocktails', 'Local Beers', 'Happy Hour', 'Live Music', 'Pool Tables', 'Outdoor Patio'],
  billiards_hall: ['Tournament Tables', 'Full Bar', 'League Play', 'Private Tables', 'Snacks'],
  bank: ['ATM', 'Safe Deposit', 'Drive-Through', 'Investment Services', 'Online Banking'],
  event_hall: ['Catering Kitchen', 'Audio/Visual', 'Flexible Seating', 'Bridal Suite', 'Parking'],
  grocery_store: ['Organic Section', 'Deli Counter', 'Bakery', 'Pharmacy', 'Delivery Service'],
  sports_arena: ['VIP Suites', 'Concessions', 'Parking', 'Team Store', 'Club Level'],
  paintball_range: ['Equipment Rental', 'Multiple Fields', 'Pro Shop', 'Birthday Packages', 'Training'],
  golf_country_club: ['18 Holes', 'Pro Shop', 'Driving Range', 'Restaurant', 'Locker Rooms', 'Golf Lessons'],
  gym: ['Personal Training', 'Group Classes', 'Pool', 'Sauna', '24/7 Access', 'Childcare'],
  spa: ['Massage', 'Facials', 'Sauna', 'Steam Room', 'Nail Services', 'Relaxation Lounge'],
  coffee_shop: ['Free WiFi', 'Outdoor Seating', 'Pastries', 'Local Roasts', 'Loyalty Program'],
  shopping_mall: ['Food Court', 'Parking', 'Movie Theater', 'Kids Play Area', 'Valet'],
  arcade: ['Classic Games', 'VR Experiences', 'Prize Counter', 'Birthday Parties', 'Tournaments'],
  comedy_club: ['Full Bar', 'Dinner Shows', 'VIP Seating', 'Open Mic Nights', 'Meet & Greet'],
  art_gallery: ['Rotating Exhibits', 'Artist Talks', 'Gift Shop', 'Private Events', 'Art Classes'],
  museum: ['Guided Tours', 'Interactive Exhibits', 'Gift Shop', 'Cafe', 'Educational Programs'],
};

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomCoordinate(center: number, spread: number): number {
  return center + (Math.random() - 0.5) * spread * 2;
}

function generateOwner(): MapPropertyOwner {
  return {
    id: `owner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: randomFromArray(OWNER_NAMES),
    avatar: randomFromArray(OWNER_AVATARS),
    level: randomInRange(5, 50),
    creditScore: randomInRange(580, 850),
    isVerified: Math.random() > 0.6,
    isOnline: Math.random() > 0.7,
    totalProperties: randomInRange(1, 15),
    followers: randomInRange(50, 5000),
  };
}

function getPropertyImages(type: MapPropertyType): string[] {
  const typeKey = type as keyof typeof PROPERTY_IMAGES;
  const images = PROPERTY_IMAGES[typeKey] || PROPERTY_IMAGES.default;
  return [...images];
}

function generateResidentialProperty(
  cityConfig: CityConfig,
  type: ResidentialType,
  index: number
): MapProperty {
  const neighborhood = randomFromArray(cityConfig.neighborhoods);
  const streetName = randomFromArray(cityConfig.streetNames);
  const streetNumber = randomInRange(100, 9999);
  const zipCode = randomFromArray(cityConfig.zipCodes);
  
  const basePrice = {
    studio: randomInRange(150000, 400000),
    apartment: randomInRange(200000, 800000),
    condo: randomInRange(300000, 1200000),
    loft: randomInRange(350000, 900000),
    townhouse: randomInRange(400000, 1500000),
    duplex: randomInRange(500000, 1800000),
    house: randomInRange(400000, 2000000),
    penthouse: randomInRange(1000000, 5000000),
    mansion: randomInRange(2000000, 15000000),
  };

  const sqft = {
    studio: randomInRange(400, 600),
    apartment: randomInRange(600, 1500),
    condo: randomInRange(800, 2000),
    loft: randomInRange(1000, 2500),
    townhouse: randomInRange(1200, 3000),
    duplex: randomInRange(1500, 3500),
    house: randomInRange(1500, 4000),
    penthouse: randomInRange(2000, 5000),
    mansion: randomInRange(5000, 20000),
  };

  const bedrooms = {
    studio: 0,
    apartment: randomInRange(1, 3),
    condo: randomInRange(1, 3),
    loft: randomInRange(1, 2),
    townhouse: randomInRange(2, 4),
    duplex: randomInRange(2, 4),
    house: randomInRange(3, 6),
    penthouse: randomInRange(2, 4),
    mansion: randomInRange(5, 12),
  };

  const purchasePrice = basePrice[type];
  const appreciationRate = randomInRange(2, 15);
  const currentValue = Math.round(purchasePrice * (1 + appreciationRate / 100));
  const monthlyRent = Math.round(purchasePrice * 0.005);

  const images = getPropertyImages(type);
  const saleStatuses: MapProperty['saleStatus'][] = ['available', 'available', 'available', 'sold', 'pending', 'rented'];

  return {
    id: `prop-${cityConfig.id}-res-${index}-${Date.now()}`,
    cityId: cityConfig.id,
    category: 'residential',
    propertyType: type,
    title: `${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')} in ${neighborhood}`,
    description: `Beautiful ${type.replace('_', ' ')} located in the heart of ${neighborhood}. This property features modern amenities and is perfect for those seeking a comfortable lifestyle in ${cityConfig.name}.`,
    address: `${streetNumber} ${streetName}`,
    neighborhood,
    city: cityConfig.name,
    state: cityConfig.state,
    zipCode,
    lat: generateRandomCoordinate(cityConfig.centerLat, 0.08),
    lng: generateRandomCoordinate(cityConfig.centerLng, 0.08),
    coverImage: images[0],
    images,
    saleStatus: randomFromArray(saleStatuses),
    owner: generateOwner(),
    details: {
      bedrooms: bedrooms[type],
      bathrooms: Math.max(1, Math.floor(bedrooms[type] / 2) + 1),
      squareFootage: sqft[type],
      yearBuilt: randomInRange(1950, 2024),
      parkingSpaces: randomInRange(0, 3),
      floors: type === 'townhouse' ? randomInRange(2, 4) : 1,
      amenities: RESIDENTIAL_FEATURES[type].slice(0, randomInRange(3, 6)),
    },
    financials: {
      purchasePrice,
      currentValue,
      monthlyRent,
      isForSale: Math.random() > 0.4,
      isForRent: Math.random() > 0.5,
      askingPrice: currentValue,
      monthlyRentPrice: monthlyRent,
      appreciationRate,
    },
    stats: {
      likes: randomInRange(10, 500),
      visits: randomInRange(50, 2000),
      saves: randomInRange(5, 200),
      rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      reviewCount: randomInRange(5, 100),
      weeklyVisitors: randomInRange(10, 200),
      trending: Math.random() > 0.8,
    },
    social: {
      isLiked: false,
      isSaved: false,
      isFollowingOwner: false,
      hasVisited: false,
    },
    features: RESIDENTIAL_FEATURES[type].slice(0, randomInRange(4, 7)),
    isFeatured: Math.random() > 0.85,
    createdAt: Date.now() - randomInRange(0, 365 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now() - randomInRange(0, 30 * 24 * 60 * 60 * 1000),
  };
}

function generateCommercialProperty(
  cityConfig: CityConfig,
  type: CommercialVenueType,
  index: number
): MapProperty {
  const neighborhood = randomFromArray(cityConfig.neighborhoods);
  const streetName = randomFromArray(cityConfig.streetNames);
  const streetNumber = randomInRange(100, 9999);
  const zipCode = randomFromArray(cityConfig.zipCodes);
  
  const basePrices: Record<CommercialVenueType, [number, number]> = {
    bowling_alley: [500000, 2000000],
    movie_theater: [1000000, 5000000],
    restaurant: [200000, 1500000],
    nightclub: [500000, 3000000],
    bar: [150000, 800000],
    billiards_hall: [200000, 800000],
    bank: [1000000, 10000000],
    event_hall: [500000, 3000000],
    grocery_store: [500000, 5000000],
    sports_arena: [5000000, 50000000],
    paintball_range: [300000, 1500000],
    golf_country_club: [2000000, 20000000],
    gym: [300000, 2000000],
    spa: [200000, 1500000],
    coffee_shop: [100000, 500000],
    shopping_mall: [5000000, 100000000],
    arcade: [200000, 1000000],
    comedy_club: [300000, 1500000],
    art_gallery: [200000, 2000000],
    museum: [1000000, 20000000],
  };

  const sqftRanges: Record<CommercialVenueType, [number, number]> = {
    bowling_alley: [15000, 40000],
    movie_theater: [20000, 60000],
    restaurant: [2000, 8000],
    nightclub: [5000, 20000],
    bar: [1500, 5000],
    billiards_hall: [3000, 10000],
    bank: [5000, 20000],
    event_hall: [10000, 40000],
    grocery_store: [20000, 80000],
    sports_arena: [50000, 200000],
    paintball_range: [10000, 50000],
    golf_country_club: [5000, 20000],
    gym: [5000, 30000],
    spa: [3000, 15000],
    coffee_shop: [1000, 3000],
    shopping_mall: [100000, 500000],
    arcade: [5000, 20000],
    comedy_club: [3000, 10000],
    art_gallery: [2000, 15000],
    museum: [20000, 100000],
  };

  const capacities: Record<CommercialVenueType, [number, number]> = {
    bowling_alley: [100, 300],
    movie_theater: [200, 1000],
    restaurant: [50, 200],
    nightclub: [200, 1000],
    bar: [50, 150],
    billiards_hall: [30, 100],
    bank: [20, 100],
    event_hall: [200, 1000],
    grocery_store: [100, 500],
    sports_arena: [5000, 50000],
    paintball_range: [50, 200],
    golf_country_club: [50, 200],
    gym: [100, 500],
    spa: [20, 100],
    coffee_shop: [20, 60],
    shopping_mall: [1000, 10000],
    arcade: [50, 200],
    comedy_club: [100, 400],
    art_gallery: [50, 200],
    museum: [200, 2000],
  };

  const [minPrice, maxPrice] = basePrices[type];
  const purchasePrice = randomInRange(minPrice, maxPrice);
  const appreciationRate = randomInRange(1, 10);
  const currentValue = Math.round(purchasePrice * (1 + appreciationRate / 100));
  const monthlyRevenue = Math.round(purchasePrice * randomInRange(5, 15) / 1000);

  const [minSqft, maxSqft] = sqftRanges[type];
  const [minCap, maxCap] = capacities[type];

  const venueName = randomFromArray(COMMERCIAL_NAMES[type]);
  const images = getPropertyImages(type);
  const saleStatuses: MapProperty['saleStatus'][] = ['available', 'available', 'sold', 'off_market'];

  return {
    id: `prop-${cityConfig.id}-com-${index}-${Date.now()}`,
    cityId: cityConfig.id,
    category: 'commercial',
    propertyType: type,
    title: venueName,
    description: `Premier ${type.replace('_', ' ')} establishment in ${neighborhood}. ${venueName} offers an exceptional experience for visitors and presents a great investment opportunity in ${cityConfig.name}.`,
    address: `${streetNumber} ${streetName}`,
    neighborhood,
    city: cityConfig.name,
    state: cityConfig.state,
    zipCode,
    lat: generateRandomCoordinate(cityConfig.centerLat, 0.08),
    lng: generateRandomCoordinate(cityConfig.centerLng, 0.08),
    coverImage: images[0],
    images,
    saleStatus: randomFromArray(saleStatuses),
    owner: generateOwner(),
    details: {
      squareFootage: randomInRange(minSqft, maxSqft),
      yearBuilt: randomInRange(1970, 2024),
      parkingSpaces: randomInRange(20, 200),
      capacity: randomInRange(minCap, maxCap),
      operatingHours: '9:00 AM - 11:00 PM',
      amenities: COMMERCIAL_FEATURES[type].slice(0, randomInRange(3, 6)),
    },
    financials: {
      purchasePrice,
      currentValue,
      isForSale: Math.random() > 0.5,
      isForRent: Math.random() > 0.6,
      askingPrice: currentValue,
      monthlyRentPrice: Math.round(purchasePrice * 0.008),
      appreciationRate,
      monthlyRevenue,
      annualTaxes: Math.round(currentValue * 0.015),
    },
    stats: {
      likes: randomInRange(50, 1000),
      visits: randomInRange(100, 5000),
      saves: randomInRange(20, 400),
      rating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10,
      reviewCount: randomInRange(20, 500),
      weeklyVisitors: randomInRange(100, 2000),
      trending: Math.random() > 0.75,
    },
    social: {
      isLiked: false,
      isSaved: false,
      isFollowingOwner: false,
      hasVisited: false,
    },
    features: COMMERCIAL_FEATURES[type].slice(0, randomInRange(4, 6)),
    isFeatured: Math.random() > 0.8,
    createdAt: Date.now() - randomInRange(0, 365 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now() - randomInRange(0, 30 * 24 * 60 * 60 * 1000),
  };
}

export function generateCityProperties(cityId: string, count: number = 100): MapProperty[] {
  const cityConfig = CITY_CONFIGS[cityId];
  if (!cityConfig) {
    console.log(`[CityProperties] Unknown city: ${cityId}, using default config`);
    return [];
  }

  const properties: MapProperty[] = [];
  const residentialCount = Math.floor(count * 0.6);
  const commercialCount = count - residentialCount;

  for (let i = 0; i < residentialCount; i++) {
    const type = randomFromArray(RESIDENTIAL_TYPES);
    properties.push(generateResidentialProperty(cityConfig, type, i));
  }

  for (let i = 0; i < commercialCount; i++) {
    const type = randomFromArray(COMMERCIAL_TYPES);
    properties.push(generateCommercialProperty(cityConfig, type, i));
  }

  return properties;
}

export function getCityConfig(cityId: string): CityConfig | undefined {
  return CITY_CONFIGS[cityId];
}

export function getAllCityConfigs(): CityConfig[] {
  return Object.values(CITY_CONFIGS);
}

export { CITY_CONFIGS };
