export interface CommunityVideo {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  userLevel: number;
  isVerified: boolean;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  views: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isFollowing: boolean;
  createdAt: number;
  duration: number;
  category: 'tips' | 'success' | 'challenge' | 'tutorial' | 'meme' | 'discussion';
  creditScoreGain?: number;
}

export interface VideoComment {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  likes: number;
  isLiked: boolean;
  createdAt: number;
  replies?: VideoComment[];
}

export const communityVideos: CommunityVideo[] = [
  {
    id: 'v1',
    userId: 'u1',
    username: 'CreditMaster_Jane',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    userLevel: 45,
    isVerified: true,
    videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400',
    caption: 'How I raised my credit score from 300 to 750 in just 6 months! 📈🔥 #creditlife #financialtips',
    tags: ['creditlife', 'financialtips', 'creditrepair'],
    likes: 15420,
    comments: 892,
    shares: 2341,
    bookmarks: 4521,
    views: 125000,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    duration: 45,
    category: 'success',
    creditScoreGain: 450,
  },
  {
    id: 'v2',
    userId: 'u2',
    username: 'FinanceGuru_Mike',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    userLevel: 62,
    isVerified: true,
    videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
    caption: 'The 30% rule everyone gets WRONG about credit utilization 💳 Watch this before your next payment!',
    tags: ['creditutilization', 'moneytips', 'debtfree'],
    likes: 28934,
    comments: 1523,
    shares: 5621,
    bookmarks: 8932,
    views: 342000,
    isLiked: true,
    isBookmarked: true,
    isFollowing: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    duration: 60,
    category: 'tutorial',
  },
  {
    id: 'v3',
    userId: 'u3',
    username: 'BudgetQueen',
    userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    userLevel: 38,
    isVerified: false,
    videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400',
    caption: 'POV: You finally paid off all your credit card debt 😭💚 #debtfree #financialfreedom',
    tags: ['debtfree', 'financialfreedom', 'celebration'],
    likes: 45621,
    comments: 2341,
    shares: 8923,
    bookmarks: 12432,
    views: 521000,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    duration: 30,
    category: 'success',
    creditScoreGain: 120,
  },
  {
    id: 'v4',
    userId: 'u4',
    username: 'MoneyMindset_Alex',
    userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    userLevel: 55,
    isVerified: true,
    videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400',
    caption: 'Day 30 of the Budget Challenge! Here are my results... 🎯 #budgetchallenge #savingmoney',
    tags: ['budgetchallenge', 'savingmoney', 'challenge'],
    likes: 12893,
    comments: 743,
    shares: 1892,
    bookmarks: 3421,
    views: 89000,
    isLiked: false,
    isBookmarked: true,
    isFollowing: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    duration: 55,
    category: 'challenge',
  },
  {
    id: 'v5',
    userId: 'u5',
    username: 'WealthBuilder_Sam',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    userLevel: 71,
    isVerified: true,
    videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400',
    caption: '5 side hustles that helped me earn an extra $2000/month while building credit 💰',
    tags: ['sidehustle', 'passiveincome', 'moneytips'],
    likes: 67234,
    comments: 4521,
    shares: 15234,
    bookmarks: 23421,
    views: 892000,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    duration: 90,
    category: 'tips',
  },
  {
    id: 'v6',
    userId: 'u6',
    username: 'CreditCoach_Lisa',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    userLevel: 48,
    isVerified: true,
    videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400',
    caption: 'How to dispute errors on your credit report (step by step guide) 📝✅',
    tags: ['creditreport', 'dispute', 'tutorial'],
    likes: 34521,
    comments: 1892,
    shares: 7621,
    bookmarks: 15234,
    views: 423000,
    isLiked: true,
    isBookmarked: false,
    isFollowing: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 36,
    duration: 120,
    category: 'tutorial',
  },
  {
    id: 'v7',
    userId: 'u7',
    username: 'DebtFree_Dan',
    userAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    userLevel: 33,
    isVerified: false,
    videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400',
    caption: 'When the bank finally approves your mortgage application 🏠🎉 #homeowner #dreamhome',
    tags: ['homeowner', 'dreamhome', 'mortgage'],
    likes: 89234,
    comments: 5621,
    shares: 21432,
    bookmarks: 32145,
    views: 1200000,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    duration: 35,
    category: 'success',
    creditScoreGain: 680,
  },
  {
    id: 'v8',
    userId: 'u8',
    username: 'FinanceFunny',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    userLevel: 29,
    isVerified: false,
    videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=400',
    caption: 'Me checking my credit score every day expecting it to magically go up 😂💀',
    tags: ['creditmeme', 'relatable', 'funny'],
    likes: 124532,
    comments: 8923,
    shares: 45621,
    bookmarks: 21432,
    views: 2100000,
    isLiked: true,
    isBookmarked: true,
    isFollowing: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    duration: 15,
    category: 'meme',
  },
];

export const videoComments: Record<string, VideoComment[]> = {
  v1: [
    {
      id: 'c1',
      userId: 'u10',
      username: 'NewbieSaver',
      userAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
      content: 'This is so inspiring! Starting my journey today 🙌',
      likes: 234,
      isLiked: false,
      createdAt: Date.now() - 1000 * 60 * 30,
    },
    {
      id: 'c2',
      userId: 'u11',
      username: 'CreditNewbie',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      content: 'What was your biggest tip for improving score quickly?',
      likes: 156,
      isLiked: true,
      createdAt: Date.now() - 1000 * 60 * 45,
    },
  ],
  v2: [
    {
      id: 'c3',
      userId: 'u12',
      username: 'DebtDestroyer',
      userAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=150',
      content: 'I had no idea about this! Changing my strategy now',
      likes: 521,
      isLiked: false,
      createdAt: Date.now() - 1000 * 60 * 120,
    },
  ],
};

export const formatVideoViews = (views: number): string => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
};

export const formatVideoTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
};
