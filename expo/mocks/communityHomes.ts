export interface CommunityHomeProfile {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  ownerLevel: number;
  ownerCreditScore: number;
  isVerified: boolean;
  propertyName: string;
  propertyType: 'apartment' | 'house' | 'mansion' | 'beach_house' | 'penthouse' | 'loft';
  city: string;
  neighborhood: string;
  images: string[];
  coverImage: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  purchasePrice: number;
  currentValue: number;
  monthlyRent?: number;
  isRenting: boolean;
  features: string[];
  style: 'modern' | 'classic' | 'minimalist' | 'luxury' | 'bohemian' | 'industrial';
  likes: number;
  visits: number;
  comments: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isFollowing: boolean;
  createdAt: number;
  lastUpdated: number;
  virtualTourAvailable: boolean;
  openForVisits: boolean;
  netWorthGain?: number;
}

export interface HomeComment {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  likes: number;
  isLiked: boolean;
  createdAt: number;
  replies?: HomeComment[];
}

export const communityHomes: CommunityHomeProfile[] = [
  {
    id: 'home1',
    ownerId: 'u1',
    ownerName: 'CreditMaster_Jane',
    ownerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    ownerLevel: 45,
    ownerCreditScore: 780,
    isVerified: true,
    propertyName: 'Skyline Penthouse',
    propertyType: 'penthouse',
    city: 'New York',
    neighborhood: 'Manhattan',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    ],
    coverImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    description: 'My dream penthouse with stunning city views! Took 3 years of building credit to qualify for this mortgage. Worth every point! 🏙️✨',
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 2400,
    purchasePrice: 1850000,
    currentValue: 2100000,
    isRenting: false,
    features: ['City View', 'Rooftop Access', 'Smart Home', 'Gym', 'Concierge'],
    style: 'modern',
    likes: 2341,
    visits: 15420,
    comments: 234,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 2,
    virtualTourAvailable: true,
    openForVisits: true,
    netWorthGain: 250000,
  },
  {
    id: 'home2',
    ownerId: 'u2',
    ownerName: 'FinanceGuru_Mike',
    ownerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    ownerLevel: 62,
    ownerCreditScore: 820,
    isVerified: true,
    propertyName: 'Malibu Beach Estate',
    propertyType: 'beach_house',
    city: 'Los Angeles',
    neighborhood: 'Malibu',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    ],
    coverImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    description: 'Finally achieved my beach house goal! The ocean views are incredible. Started with a 520 credit score - now living the dream at 820! 🏖️🌊',
    bedrooms: 5,
    bathrooms: 4,
    squareFootage: 4200,
    purchasePrice: 3500000,
    currentValue: 4200000,
    isRenting: false,
    features: ['Ocean View', 'Private Beach', 'Pool', 'Wine Cellar', 'Home Theater'],
    style: 'luxury',
    likes: 5621,
    visits: 28934,
    comments: 521,
    isLiked: true,
    isBookmarked: true,
    isFollowing: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 5,
    virtualTourAvailable: true,
    openForVisits: true,
    netWorthGain: 700000,
  },
  {
    id: 'home3',
    ownerId: 'u3',
    ownerName: 'BudgetQueen',
    ownerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    ownerLevel: 38,
    ownerCreditScore: 720,
    isVerified: false,
    propertyName: 'Downtown Loft',
    propertyType: 'loft',
    city: 'Miami',
    neighborhood: 'Brickell',
    images: [
      'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
    ],
    coverImage: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800',
    description: 'My cozy downtown loft! Perfect starter home for building equity. Bought it with just 5% down after improving my credit 💪',
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1200,
    purchasePrice: 450000,
    currentValue: 520000,
    isRenting: false,
    features: ['High Ceilings', 'Exposed Brick', 'City View', 'Rooftop Pool'],
    style: 'industrial',
    likes: 1892,
    visits: 12341,
    comments: 156,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 8,
    virtualTourAvailable: true,
    openForVisits: true,
    netWorthGain: 70000,
  },
  {
    id: 'home4',
    ownerId: 'u4',
    ownerName: 'MoneyMindset_Alex',
    ownerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    ownerLevel: 55,
    ownerCreditScore: 795,
    isVerified: true,
    propertyName: 'Beverly Hills Mansion',
    propertyType: 'mansion',
    city: 'Los Angeles',
    neighborhood: 'Beverly Hills',
    images: [
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800',
    ],
    coverImage: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800',
    description: 'From renting a studio to owning a Beverly Hills mansion! This is what happens when you master credit and invest wisely 🏰👑',
    bedrooms: 7,
    bathrooms: 8,
    squareFootage: 8500,
    purchasePrice: 8500000,
    currentValue: 9200000,
    isRenting: false,
    features: ['Tennis Court', 'Pool', 'Guest House', 'Wine Cellar', 'Home Theater', 'Spa'],
    style: 'luxury',
    likes: 8923,
    visits: 45621,
    comments: 892,
    isLiked: false,
    isBookmarked: true,
    isFollowing: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 12,
    virtualTourAvailable: true,
    openForVisits: false,
    netWorthGain: 700000,
  },
  {
    id: 'home5',
    ownerId: 'u5',
    ownerName: 'WealthBuilder_Sam',
    ownerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    ownerLevel: 71,
    ownerCreditScore: 850,
    isVerified: true,
    propertyName: 'Hamptons Summer Estate',
    propertyType: 'mansion',
    city: 'New York',
    neighborhood: 'Hamptons',
    images: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
      'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    ],
    coverImage: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
    description: 'Perfect 850 credit score finally paid off! This Hamptons estate is my ultimate achievement. From debt to wealth! 💎🏡',
    bedrooms: 6,
    bathrooms: 7,
    squareFootage: 7200,
    purchasePrice: 6500000,
    currentValue: 7800000,
    isRenting: false,
    features: ['Pool', 'Beach Access', 'Tennis Court', 'Gardens', 'Boat Dock'],
    style: 'classic',
    likes: 12432,
    visits: 67234,
    comments: 1523,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 120,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 24,
    virtualTourAvailable: true,
    openForVisits: true,
    netWorthGain: 1300000,
  },
  {
    id: 'home6',
    ownerId: 'u6',
    ownerName: 'CreditCoach_Lisa',
    ownerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    ownerLevel: 48,
    ownerCreditScore: 760,
    isVerified: true,
    propertyName: 'Modern Family Home',
    propertyType: 'house',
    city: 'Miami',
    neighborhood: 'Coral Gables',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
      'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800',
    ],
    coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    description: 'My family home in Coral Gables! Great school district and amazing neighbors. Smart buying decisions = smart living 🏠❤️',
    bedrooms: 4,
    bathrooms: 3,
    squareFootage: 2800,
    purchasePrice: 890000,
    currentValue: 1050000,
    isRenting: false,
    features: ['Pool', 'Garden', 'Smart Home', 'Solar Panels', '2-Car Garage'],
    style: 'modern',
    likes: 3421,
    visits: 21432,
    comments: 312,
    isLiked: true,
    isBookmarked: false,
    isFollowing: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 36,
    virtualTourAvailable: true,
    openForVisits: true,
    netWorthGain: 160000,
  },
  {
    id: 'home7',
    ownerId: 'u7',
    ownerName: 'DebtFree_Dan',
    ownerAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    ownerLevel: 33,
    ownerCreditScore: 680,
    isVerified: false,
    propertyName: 'Cozy Studio Apartment',
    propertyType: 'apartment',
    city: 'New York',
    neighborhood: 'Brooklyn',
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800',
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800',
    ],
    coverImage: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    description: 'My first owned property! Small but mine. Building equity one payment at a time. Everyone starts somewhere! 🌟',
    bedrooms: 1,
    bathrooms: 1,
    squareFootage: 550,
    purchasePrice: 385000,
    currentValue: 420000,
    isRenting: false,
    features: ['City View', 'Laundry', 'Gym Access', 'Doorman'],
    style: 'minimalist',
    likes: 4521,
    visits: 32145,
    comments: 421,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 48,
    virtualTourAvailable: true,
    openForVisits: true,
    netWorthGain: 35000,
  },
  {
    id: 'home8',
    ownerId: 'u8',
    ownerName: 'FinanceFunny',
    ownerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    ownerLevel: 29,
    ownerCreditScore: 650,
    isVerified: false,
    propertyName: 'Trendy Rental Apartment',
    propertyType: 'apartment',
    city: 'Los Angeles',
    neighborhood: 'Downtown',
    images: [
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800',
      'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=800',
      'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=800',
    ],
    coverImage: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800',
    description: 'Renting while saving for my first home! Great location, reasonable rent. Working on that credit score daily! 💪📈',
    bedrooms: 2,
    bathrooms: 1,
    squareFootage: 850,
    purchasePrice: 0,
    currentValue: 0,
    monthlyRent: 2400,
    isRenting: true,
    features: ['City View', 'Balcony', 'Gym', 'Pet Friendly'],
    style: 'bohemian',
    likes: 2341,
    visits: 18923,
    comments: 187,
    isLiked: true,
    isBookmarked: true,
    isFollowing: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 72,
    virtualTourAvailable: false,
    openForVisits: true,
  },
];

export const homeComments: Record<string, HomeComment[]> = {
  home1: [
    {
      id: 'hc1',
      userId: 'u10',
      username: 'NewbieSaver',
      userAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
      content: 'This penthouse is absolutely stunning! What was your credit score when you got approved?',
      likes: 89,
      isLiked: false,
      createdAt: Date.now() - 1000 * 60 * 30,
    },
    {
      id: 'hc2',
      userId: 'u11',
      username: 'CreditNewbie',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      content: 'Goals! 🔥 How long did it take you to save for the down payment?',
      likes: 56,
      isLiked: true,
      createdAt: Date.now() - 1000 * 60 * 45,
    },
  ],
  home2: [
    {
      id: 'hc3',
      userId: 'u12',
      username: 'BeachDreamer',
      userAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=150',
      content: 'Living the dream! That ocean view is incredible. Definitely my motivation!',
      likes: 234,
      isLiked: false,
      createdAt: Date.now() - 1000 * 60 * 120,
    },
  ],
};

export const formatHomeValue = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
};

export const formatHomeViews = (views: number): string => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
};

export const getHomeTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
};

export const getPropertyTypeIcon = (type: CommunityHomeProfile['propertyType']): string => {
  switch (type) {
    case 'apartment': return '🏢';
    case 'house': return '🏠';
    case 'mansion': return '🏰';
    case 'beach_house': return '🏖️';
    case 'penthouse': return '🌆';
    case 'loft': return '🏙️';
    default: return '🏠';
  }
};

export const getStyleColor = (style: CommunityHomeProfile['style']): string => {
  switch (style) {
    case 'modern': return '#3B82F6';
    case 'classic': return '#8B5CF6';
    case 'minimalist': return '#6B7280';
    case 'luxury': return '#F59E0B';
    case 'bohemian': return '#EC4899';
    case 'industrial': return '#78716C';
    default: return '#6B7280';
  }
};
