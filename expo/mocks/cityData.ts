export interface City {
  id: string;
  name: string;
  state: string;
  imageUrl: string;
  description: string;
  costOfLivingIndex: number;
  averageRent: number;
  jobMarketRating: number;
  population: string;
  highlights: string[];
}

export interface SharedApartment {
  id: string;
  name: string;
  cityId: string;
  address: string;
  buildingNumber: string;
  totalUnits: number;
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
  splitRent: number;
  squareFeet: number;
  amenities: string[];
  imageUrl: string;
  description: string;
}

export interface Roommate {
  id: string;
  name: string;
  age: number;
  occupation: string;
  personality: string;
  avatar: string;
  rentPaidOnTime: boolean;
  cleanliness: number;
  noisiness: number;
}

export interface SharedRentalAssignment {
  apartmentId: string;
  apartmentNumber: string;
  unitNumber: string;
  roommates: Roommate[];
  moveInDate: number;
  monthlyShare: number;
  securityDeposit: number;
}

export const CITIES: City[] = [
  {
    id: 'city_los_angeles',
    name: 'Los Angeles',
    state: 'California',
    imageUrl: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800',
    description: 'The City of Angels - entertainment capital with diverse opportunities',
    costOfLivingIndex: 166,
    averageRent: 2500,
    jobMarketRating: 4.2,
    population: '3.9 million',
    highlights: ['Entertainment Industry', 'Tech Hub', 'Diverse Culture', 'Beach Access'],
  },
  {
    id: 'city_new_york',
    name: 'New York City',
    state: 'New York',
    imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
    description: 'The Big Apple - financial center with endless possibilities',
    costOfLivingIndex: 187,
    averageRent: 3200,
    jobMarketRating: 4.5,
    population: '8.3 million',
    highlights: ['Financial District', 'Cultural Hub', 'Public Transit', 'Diverse Economy'],
  },
  {
    id: 'city_chicago',
    name: 'Chicago',
    state: 'Illinois',
    imageUrl: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800',
    description: 'The Windy City - major business hub with affordable living',
    costOfLivingIndex: 107,
    averageRent: 1800,
    jobMarketRating: 4.0,
    population: '2.7 million',
    highlights: ['Business Hub', 'Architecture', 'Lower Cost', 'Great Food Scene'],
  },
  {
    id: 'city_houston',
    name: 'Houston',
    state: 'Texas',
    imageUrl: 'https://images.unsplash.com/photo-1548532928-b34e3be62fc6?w=800',
    description: 'Space City - energy capital with no state income tax',
    costOfLivingIndex: 96,
    averageRent: 1400,
    jobMarketRating: 4.1,
    population: '2.3 million',
    highlights: ['Energy Industry', 'No State Tax', 'Affordable Housing', 'Medical Center'],
  },
  {
    id: 'city_phoenix',
    name: 'Phoenix',
    state: 'Arizona',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    description: 'Valley of the Sun - fast-growing tech hub with warm weather',
    costOfLivingIndex: 103,
    averageRent: 1500,
    jobMarketRating: 3.8,
    population: '1.7 million',
    highlights: ['Growing Tech Scene', 'Year-Round Sun', 'Affordable', 'Outdoor Living'],
  },
  {
    id: 'city_atlanta',
    name: 'Atlanta',
    state: 'Georgia',
    imageUrl: 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=800',
    description: 'The ATL - entertainment and business hub of the South',
    costOfLivingIndex: 102,
    averageRent: 1600,
    jobMarketRating: 4.0,
    population: '500,000',
    highlights: ['Film Industry', 'Music Scene', 'Fortune 500 HQs', 'Airport Hub'],
  },
  {
    id: 'city_miami',
    name: 'Miami',
    state: 'Florida',
    imageUrl: 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=800',
    description: 'Magic City - international gateway with vibrant culture',
    costOfLivingIndex: 128,
    averageRent: 2200,
    jobMarketRating: 3.7,
    population: '450,000',
    highlights: ['International Business', 'Beach Life', 'No State Tax', 'Latin Culture'],
  },
  {
    id: 'city_denver',
    name: 'Denver',
    state: 'Colorado',
    imageUrl: 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800',
    description: 'Mile High City - outdoor lifestyle meets tech innovation',
    costOfLivingIndex: 128,
    averageRent: 1900,
    jobMarketRating: 4.2,
    population: '730,000',
    highlights: ['Tech Industry', 'Outdoor Recreation', 'Craft Beer', 'Mountains'],
  },
];

export const SHARED_APARTMENTS: SharedApartment[] = [
  {
    id: 'apt_la_downtown',
    name: 'Downtown LA Lofts',
    cityId: 'city_los_angeles',
    address: '456 Grand Ave',
    buildingNumber: 'Building A',
    totalUnits: 48,
    bedrooms: 3,
    bathrooms: 2,
    monthlyRent: 3600,
    splitRent: 900,
    squareFeet: 1200,
    amenities: ['Rooftop Pool', 'Gym', 'Parking', 'Doorman'],
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    description: 'Modern loft-style apartments in the heart of downtown LA',
  },
  {
    id: 'apt_la_koreatown',
    name: 'Koreatown Commons',
    cityId: 'city_los_angeles',
    address: '789 Wilshire Blvd',
    buildingNumber: 'Tower 1',
    totalUnits: 72,
    bedrooms: 3,
    bathrooms: 2,
    monthlyRent: 2800,
    splitRent: 700,
    squareFeet: 1100,
    amenities: ['Pool', 'Laundry', 'BBQ Area', 'Parking'],
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    description: 'Comfortable living in vibrant Koreatown',
  },
  {
    id: 'apt_nyc_brooklyn',
    name: 'Brooklyn Heights Residence',
    cityId: 'city_new_york',
    address: '123 Court St',
    buildingNumber: 'Building B',
    totalUnits: 36,
    bedrooms: 3,
    bathrooms: 1,
    monthlyRent: 4200,
    splitRent: 1050,
    squareFeet: 950,
    amenities: ['Laundry Room', 'Bike Storage', 'Roof Access'],
    imageUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
    description: 'Classic Brooklyn brownstone living with Manhattan views',
  },
  {
    id: 'apt_nyc_queens',
    name: 'Astoria Gardens',
    cityId: 'city_new_york',
    address: '456 Steinway St',
    buildingNumber: 'Building C',
    totalUnits: 60,
    bedrooms: 3,
    bathrooms: 2,
    monthlyRent: 3400,
    splitRent: 850,
    squareFeet: 1000,
    amenities: ['Courtyard', 'Laundry', 'Storage'],
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    description: 'Spacious apartments in diverse Astoria',
  },
  {
    id: 'apt_chicago_loop',
    name: 'Loop Living',
    cityId: 'city_chicago',
    address: '200 N State St',
    buildingNumber: 'North Tower',
    totalUnits: 80,
    bedrooms: 3,
    bathrooms: 2,
    monthlyRent: 2600,
    splitRent: 650,
    squareFeet: 1150,
    amenities: ['Gym', 'Rooftop Deck', 'Doorman', 'Package Room'],
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    description: 'Downtown living in the iconic Chicago Loop',
  },
  {
    id: 'apt_chicago_wicker',
    name: 'Wicker Park Flats',
    cityId: 'city_chicago',
    address: '1500 N Milwaukee Ave',
    buildingNumber: 'Building 1',
    totalUnits: 24,
    bedrooms: 3,
    bathrooms: 2,
    monthlyRent: 2200,
    splitRent: 550,
    squareFeet: 1200,
    amenities: ['Patio', 'In-Unit Laundry', 'Parking'],
    imageUrl: 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800',
    description: 'Trendy living in artistic Wicker Park',
  },
  {
    id: 'apt_houston_midtown',
    name: 'Midtown Moderne',
    cityId: 'city_houston',
    address: '3000 Main St',
    buildingNumber: 'Building M',
    totalUnits: 96,
    bedrooms: 3,
    bathrooms: 2,
    monthlyRent: 2000,
    splitRent: 500,
    squareFeet: 1300,
    amenities: ['Pool', 'Gym', 'Clubhouse', 'Dog Park', 'Parking'],
    imageUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800',
    description: 'Modern amenities in walkable Midtown',
  },
  {
    id: 'apt_houston_heights',
    name: 'Heights Heritage',
    cityId: 'city_houston',
    address: '500 Heights Blvd',
    buildingNumber: 'Historic Wing',
    totalUnits: 32,
    bedrooms: 3,
    bathrooms: 2,
    monthlyRent: 1800,
    splitRent: 450,
    squareFeet: 1250,
    amenities: ['Garden', 'Laundry', 'Parking', 'Pet Friendly'],
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    description: 'Charming apartments in historic Houston Heights',
  },
  {
    id: 'apt_phoenix_downtown',
    name: 'Phoenix Rising',
    cityId: 'city_phoenix',
    address: '100 W Washington St',
    buildingNumber: 'Tower A',
    totalUnits: 64,
    bedrooms: 3,
    bathrooms: 2,
    monthlyRent: 2100,
    splitRent: 525,
    squareFeet: 1350,
    amenities: ['Pool', 'Gym', 'Concierge', 'Parking'],
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    description: 'Urban living in downtown Phoenix',
  },
  {
    id: 'apt_atlanta_midtown',
    name: 'Midtown Atlanta Living',
    cityId: 'city_atlanta',
    address: '1000 Peachtree St',
    buildingNumber: 'Peachtree Tower',
    totalUnits: 72,
    bedrooms: 3,
    bathrooms: 2,
    monthlyRent: 2300,
    splitRent: 575,
    squareFeet: 1200,
    amenities: ['Pool', 'Gym', 'Business Center', 'Parking'],
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    description: 'Premier living in Midtown Atlanta',
  },
  {
    id: 'apt_miami_brickell',
    name: 'Brickell Bay',
    cityId: 'city_miami',
    address: '800 Brickell Ave',
    buildingNumber: 'Bay Tower',
    totalUnits: 48,
    bedrooms: 3,
    bathrooms: 2,
    monthlyRent: 3200,
    splitRent: 800,
    squareFeet: 1100,
    amenities: ['Pool', 'Gym', 'Spa', 'Valet Parking', 'Bay Views'],
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    description: 'Luxury waterfront living in Brickell',
  },
  {
    id: 'apt_denver_lodo',
    name: 'LoDo Lofts',
    cityId: 'city_denver',
    address: '1600 Market St',
    buildingNumber: 'Warehouse District',
    totalUnits: 40,
    bedrooms: 3,
    bathrooms: 2,
    monthlyRent: 2700,
    splitRent: 675,
    squareFeet: 1300,
    amenities: ['Rooftop', 'Gym', 'Dog Wash', 'Bike Storage', 'Parking'],
    imageUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
    description: 'Industrial chic in historic Lower Downtown',
  },
];

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn',
  'Dakota', 'Skyler', 'Reese', 'Parker', 'Sage', 'Drew', 'Charlie', 'Jamie',
  'Kendall', 'Finley', 'Emerson', 'Hayden', 'Blair', 'Cameron', 'Devon', 'Ellis',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
];

const OCCUPATIONS = [
  'Software Developer', 'Graphic Designer', 'Marketing Coordinator', 'Data Analyst',
  'Sales Representative', 'Accountant', 'Teacher', 'Nurse', 'Project Manager',
  'Customer Service Rep', 'Freelance Writer', 'Real Estate Agent', 'Chef',
  'Physical Therapist', 'Social Media Manager', 'Event Coordinator', 'Barista',
  'Fitness Instructor', 'Graduate Student', 'Paralegal', 'HR Specialist',
];

const PERSONALITIES = [
  'Friendly and outgoing', 'Quiet and studious', 'Social butterfly', 'Night owl',
  'Early riser', 'Laid-back', 'Organized and tidy', 'Creative and artistic',
  'Fitness enthusiast', 'Foodie who loves cooking', 'Gamer', 'Music lover',
  'Book worm', 'Plant parent', 'Pet lover', 'Work-from-home professional',
];

const AVATAR_IMAGES = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
];

export function generateRandomRoommates(count: number = 3): Roommate[] {
  const roommates: Roommate[] = [];
  const usedNames = new Set<string>();
  const usedAvatars = new Set<number>();

  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      name = `${firstName} ${lastName}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    let avatarIndex: number;
    do {
      avatarIndex = Math.floor(Math.random() * AVATAR_IMAGES.length);
    } while (usedAvatars.has(avatarIndex) && usedAvatars.size < AVATAR_IMAGES.length);
    usedAvatars.add(avatarIndex);

    roommates.push({
      id: `roommate_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      age: 22 + Math.floor(Math.random() * 13),
      occupation: OCCUPATIONS[Math.floor(Math.random() * OCCUPATIONS.length)],
      personality: PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)],
      avatar: AVATAR_IMAGES[avatarIndex],
      rentPaidOnTime: Math.random() > 0.15,
      cleanliness: 3 + Math.floor(Math.random() * 8),
      noisiness: 1 + Math.floor(Math.random() * 10),
    });
  }

  return roommates;
}

export function generateApartmentNumber(): string {
  const floor = 1 + Math.floor(Math.random() * 12);
  const unit = 1 + Math.floor(Math.random() * 8);
  return `${floor}${unit.toString().padStart(2, '0')}`;
}

export function assignSharedApartment(cityId: string): SharedRentalAssignment {
  const cityApartments = SHARED_APARTMENTS.filter(apt => apt.cityId === cityId);
  const apartment = cityApartments[Math.floor(Math.random() * cityApartments.length)];
  
  const apartmentNumber = generateApartmentNumber();
  const roommates = generateRandomRoommates(3);
  
  return {
    apartmentId: apartment.id,
    apartmentNumber: `${apartment.buildingNumber} #${apartmentNumber}`,
    unitNumber: apartmentNumber,
    roommates,
    moveInDate: Date.now(),
    monthlyShare: apartment.splitRent,
    securityDeposit: apartment.splitRent,
  };
}

export function getCityById(cityId: string): City | undefined {
  return CITIES.find(city => city.id === cityId);
}

export function getApartmentById(apartmentId: string): SharedApartment | undefined {
  return SHARED_APARTMENTS.find(apt => apt.id === apartmentId);
}

export function getApartmentsByCity(cityId: string): SharedApartment[] {
  return SHARED_APARTMENTS.filter(apt => apt.cityId === cityId);
}
