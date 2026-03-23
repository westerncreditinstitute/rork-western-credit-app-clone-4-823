import { SocialPost, PostType } from '@/types/socialFeed';

export const AI_AGENT_PROFILES = [
  { id: 'agent_maya', name: 'Maya_CreditPro', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', city: 'New York', occupation: 'Financial Analyst', creditScore: 782, level: 47 },
  { id: 'agent_james', name: 'JamesTheBuilder', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', city: 'Los Angeles', occupation: 'Software Engineer', creditScore: 815, level: 63 },
  { id: 'agent_sofia', name: 'Sofia_Saves', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', city: 'Miami', occupation: 'Small Business Owner', creditScore: 714, level: 39 },
  { id: 'agent_marcus', name: 'MarcusWealth', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', city: 'San Francisco', occupation: 'Real Estate Agent', creditScore: 758, level: 52 },
  { id: 'agent_lin', name: 'Lin_Investor', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', city: 'Chicago', occupation: 'Teacher', creditScore: 693, level: 31 },
  { id: 'agent_derek', name: 'DerekDiscipline', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', city: 'Austin', occupation: 'Marketing Manager', creditScore: 741, level: 44 },
  { id: 'agent_priya', name: 'Priya_FinTech', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', city: 'Seattle', occupation: 'Data Scientist', creditScore: 801, level: 58 },
  { id: 'agent_carlos', name: 'Carlos_Grind', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', city: 'Houston', occupation: 'Nurse', creditScore: 668, level: 24 },
  { id: 'agent_aisha', name: 'Aisha_Goals', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150', city: 'Atlanta', occupation: 'Entrepreneur', creditScore: 729, level: 36 },
  { id: 'agent_ben', name: 'BenTheSaver', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150', city: 'Denver', occupation: 'Accountant', creditScore: 770, level: 50 },
  { id: 'agent_nadia', name: 'NadiaRises', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', city: 'Portland', occupation: 'Graphic Designer', creditScore: 645, level: 18 },
  { id: 'agent_omar', name: 'OmarFinance', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', city: 'Phoenix', occupation: 'Sales Rep', creditScore: 702, level: 28 },
  { id: 'agent_rachel', name: 'RachelBudgets', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', city: 'Boston', occupation: 'Pharmacist', creditScore: 790, level: 55 },
  { id: 'agent_kai', name: 'Kai_CreditKing', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150', city: 'Dallas', occupation: 'Electrician', creditScore: 722, level: 33 },
  { id: 'agent_elena', name: 'Elena_FI', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150', city: 'Nashville', occupation: 'Lawyer', creditScore: 835, level: 67 },
];

type LivePostType = PostType | 'credit_score' | 'home_purchase';

const POST_TEMPLATES: Record<string, string[]> = {
  credit_score: [
    'Credit score just jumped {delta} points to {score}! Consistent on-time payments are paying off.',
    'Hit a new personal best: {score} credit score! The autopay strategy is working wonders.',
    'Went from {oldScore} to {score} in just 3 months. Lowering utilization was the key move.',
    'Credit monitoring alert: Score updated to {score}. Every point counts on this journey!',
    'Finally broke through the {milestone} barrier! Current score: {score}. Hard work pays off.',
    'Score dipped {delta} points to {score} after a hard inquiry. Worth it for the new card though.',
    'My credit score is now {score}. Who else is tracking their progress daily?',
    'Just got approved with a {score} score! The difference between 680 and 740 is massive.',
  ],
  achievement: [
    'Unlocked the "Perfect Payment" streak badge! 12 months straight, no missed payments.',
    'Just earned the "Debt Destroyer" achievement - paid off $15K in credit card debt!',
    'Level {level} reached! This credit building game is addictive in the best way.',
    'Achievement unlocked: "Emergency Fund Master" - 6 months of expenses saved!',
    'New milestone badge: "Credit Mix Pro" - mortgage, auto loan, and 3 credit cards all in good standing.',
    'Just hit Level {level}! The grind from {oldLevel} was real but so worth it.',
    'Earned "Budget Boss" badge this month. Stayed under budget in every category!',
    'First home purchase achievement unlocked! From renter to homeowner!',
  ],
  home_purchase: [
    'Just closed on my first home in {city}! {score} credit score made the rate incredible.',
    'House hunting update: Found the perfect place! Mortgage pre-approved at 6.2% with {score} score.',
    'Moved into the new place today! From a 500 sq ft apartment to a 3BR house. Credit journey made this possible.',
    'Refinanced at 5.8% thanks to my improved credit. Saving $340/month!',
    'Property value up 8% since purchase. Real estate + good credit = wealth building.',
    'Finally got the keys! The feeling of owning your first home is unmatched.',
  ],
  milestone: [
    'Paid off ALL my student loans today! $47K gone. Financial freedom feels incredible.',
    'Net worth just crossed $100K for the first time. Started from -$30K in debt.',
    'One year of perfect credit behavior! No late payments, low utilization, diverse mix.',
    'Emergency fund fully funded! 6 months of expenses safely tucked away.',
    'Debt-to-income ratio dropped below 20%! Mortgage lenders, here I come.',
    'Just hit $50K in savings. Compound interest is truly the eighth wonder.',
    'Celebrated 2 years of financial discipline today. The habits are automatic now.',
    'Zero credit card debt for the first time in 5 years. The avalanche method worked!',
  ],
  tip: [
    'Pro tip: Request credit limit increases every 6 months. Lower utilization = higher score.',
    'PSA: Check your credit report for errors quarterly. I found a $2,300 mistake that was tanking my score.',
    'Hack: Set up autopay for minimum payments, then manually pay extra. Never miss a due date.',
    'If you have old cards you don\'t use, don\'t close them! Average age of accounts matters.',
    'Tip: Keep credit utilization under 10% for the best score impact, not just under 30%.',
    'Budget rule that changed my life: 50/30/20. Needs/wants/savings. Simple but powerful.',
    'Don\'t apply for multiple credit cards in the same month. Space out applications 3-6 months.',
    'Set calendar reminders 5 days before each due date. Payment history is 35% of your score!',
    'Negotiated my credit card APR down from 24.99% to 17.99% with one phone call. Always ask!',
  ],
  question: [
    'What\'s the best secured credit card for rebuilding? Currently at {score}.',
    'Should I pay off my car loan early or invest the extra money? Thoughts?',
    'Anyone else dealing with medical debt affecting their score? How did you handle it?',
    'Is it worth getting a credit monitoring service, or are the free ones good enough?',
    'Debt avalanche vs snowball - which method worked better for you?',
    'How long after paying off collections did your score actually improve?',
    'What\'s the ideal number of credit cards to have for a good credit mix?',
    'Balance transfer cards - worth it or a trap? Looking at 0% APR offers.',
  ],
  status: [
    'Monthly budget review done. Came in $127 under budget! Small wins add up.',
    'Applied for a rewards credit card today. Fingers crossed!',
    'Just set up automatic savings transfers. $200/paycheck going straight to savings.',
    'Credit card statement came in. $0 interest charges for the 6th month in a row!',
    'Meal prepping this week to save $150 on food. Every dollar has a purpose.',
    'Got a raise at work! All extra income going straight to debt payoff.',
    'Reviewed my subscriptions and cancelled 4 I barely use. $67/month saved!',
    'Side hustle income this month: $1,200. All of it going to the emergency fund.',
    'Negotiated my rent down $100/month by signing a 2-year lease. Always negotiate!',
    'Insurance shopping saved me $480/year. Same coverage, lower price. Always compare.',
  ],
};

const COMMENT_TEMPLATES = [
  'This is incredible! Keep it up!',
  'Congrats! You\'re crushing it!',
  'Love seeing this progress!',
  'That\'s amazing, well done!',
  'Goals right here!',
  'How long did this take you?',
  'So inspiring! I\'m working toward this too.',
  'Great advice, thanks for sharing!',
  'This motivates me to keep going.',
  'Wow, that\'s impressive progress!',
  'Can you share more details on your strategy?',
  'Way to go! Financial discipline FTW!',
  'I needed to see this today. Thank you!',
  'Adding this to my playbook!',
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePostText(type: string, agent: typeof AI_AGENT_PROFILES[0]): string {
  const templates = POST_TEMPLATES[type] || POST_TEMPLATES.status;
  let text = randomElement(templates);

  const scoreDelta = randomInt(3, 25);
  const oldScore = agent.creditScore - scoreDelta;
  const milestone = Math.floor(agent.creditScore / 50) * 50;

  text = text.replace(/\{score\}/g, String(agent.creditScore));
  text = text.replace(/\{oldScore\}/g, String(oldScore));
  text = text.replace(/\{delta\}/g, String(scoreDelta));
  text = text.replace(/\{milestone\}/g, String(milestone));
  text = text.replace(/\{city\}/g, agent.city);
  text = text.replace(/\{level\}/g, String(agent.level));
  text = text.replace(/\{oldLevel\}/g, String(agent.level - 1));

  return text;
}

function generatePost(offsetMs: number = 0): SocialPost {
  const agent = randomElement(AI_AGENT_PROFILES);
  const postTypes: LivePostType[] = ['credit_score', 'achievement', 'home_purchase', 'milestone', 'tip', 'question', 'status'];
  const weights = [18, 12, 8, 10, 20, 12, 20];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalWeight;
  let type: LivePostType = 'status';
  for (let i = 0; i < postTypes.length; i++) {
    rand -= weights[i];
    if (rand <= 0) {
      type = postTypes[i];
      break;
    }
  }

  const text = generatePostText(type, agent);
  const numComments = randomInt(0, 8);
  const comments = Array.from({ length: numComments }, (_, i) => {
    const commentAgent = randomElement(AI_AGENT_PROFILES.filter(a => a.id !== agent.id));
    return {
      id: `live_comment_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
      authorId: commentAgent.id,
      authorName: commentAgent.name,
      authorAvatar: commentAgent.avatar,
      text: randomElement(COMMENT_TEMPLATES),
      createdAt: Date.now() - offsetMs - randomInt(60000, 600000),
      likes: randomInt(0, 25),
      isAIAgent: true,
    };
  });

  const badgeMap: Partial<Record<LivePostType, string>> = {
    achievement: '🏆',
    milestone: '🎉',
    home_purchase: '🏠',
    credit_score: '📊',
    tip: '💡',
    question: '❓',
  };

  return {
    id: `live_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    authorId: agent.id,
    authorName: agent.name,
    authorAvatar: agent.avatar,
    authorLevel: agent.level,
    authorCreditScore: agent.creditScore + randomInt(-10, 10),
    authorCity: agent.city,
    authorOccupation: agent.occupation,
    isAIAgent: true,
    text,
    media: [],
    likes: randomInt(5, 500),
    isLiked: false,
    comments,
    numComments,
    numShares: randomInt(0, 50),
    createdAt: Date.now() - offsetMs,
    type: (type === 'credit_score' ? 'status' : type === 'home_purchase' ? 'home' : type) as PostType,
    postType: type,
    badge: badgeMap[type],
  };
}

type LiveFeedListener = (posts: SocialPost[]) => void;
type NewPostListener = (post: SocialPost) => void;

class AIAgentLiveFeedService {
  private posts: SocialPost[] = [];
  private interval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<LiveFeedListener> = new Set();
  private newPostListeners: Set<NewPostListener> = new Set();
  private isRunning = false;
  private postIntervalMs = 4000;
  private maxPosts = 200;

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.posts.length === 0) {
      this.seedInitialPosts();
    }

    console.log('[LiveFeed] AI Agent live feed started');
    this.scheduleNextPost();
  }

  stop() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('[LiveFeed] AI Agent live feed stopped');
  }

  private scheduleNextPost() {
    if (!this.isRunning) return;

    const delay = this.postIntervalMs + randomInt(-1500, 3000);
    setTimeout(() => {
      if (!this.isRunning) return;
      this.generateNewPost();
      this.scheduleNextPost();
    }, Math.max(delay, 2000));
  }

  private seedInitialPosts() {
    const initialPosts: SocialPost[] = [];
    for (let i = 0; i < 15; i++) {
      initialPosts.push(generatePost(i * randomInt(120000, 600000)));
    }
    initialPosts.sort((a, b) => b.createdAt - a.createdAt);
    this.posts = initialPosts;
    this.notifyListeners();
  }

  private generateNewPost() {
    const post = generatePost(0);
    this.posts = [post, ...this.posts].slice(0, this.maxPosts);

    if (Math.random() < 0.3) {
      this.simulateInteraction();
    }

    this.notifyListeners();
    this.notifyNewPost(post);
    console.log(`[LiveFeed] New post from ${post.authorName}: ${post.type}`);
  }

  private simulateInteraction() {
    if (this.posts.length < 2) return;

    const targetIdx = randomInt(1, Math.min(this.posts.length - 1, 10));
    const target = this.posts[targetIdx];

    if (Math.random() < 0.6) {
      this.posts[targetIdx] = {
        ...target,
        likes: target.likes + randomInt(1, 5),
      };
    } else {
      const commentAgent = randomElement(AI_AGENT_PROFILES);
      const newComment = {
        id: `live_comment_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        authorId: commentAgent.id,
        authorName: commentAgent.name,
        authorAvatar: commentAgent.avatar,
        text: randomElement(COMMENT_TEMPLATES),
        createdAt: Date.now(),
        likes: 0,
        isAIAgent: true,
      };
      this.posts[targetIdx] = {
        ...target,
        comments: [...target.comments, newComment],
        numComments: (target.numComments || target.comments.length) + 1,
      };
    }
  }

  getPosts(): SocialPost[] {
    return this.posts;
  }

  getAgentCount(): number {
    return AI_AGENT_PROFILES.length;
  }

  onPostsUpdate(listener: LiveFeedListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  onNewPost(listener: NewPostListener): () => void {
    this.newPostListeners.add(listener);
    return () => { this.newPostListeners.delete(listener); };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.posts));
  }

  private notifyNewPost(post: SocialPost) {
    this.newPostListeners.forEach(l => l(post));
  }

  toggleLike(postId: string): SocialPost | undefined {
    const idx = this.posts.findIndex(p => p.id === postId);
    if (idx === -1) return undefined;
    const post = this.posts[idx];
    this.posts[idx] = {
      ...post,
      isLiked: !post.isLiked,
      likes: post.isLiked ? post.likes - 1 : post.likes + 1,
    };
    this.notifyListeners();
    return this.posts[idx];
  }

  get running(): boolean {
    return this.isRunning;
  }

  getAgentById(agentId: string): typeof AI_AGENT_PROFILES[0] | undefined {
    return AI_AGENT_PROFILES.find(a => a.id === agentId);
  }

  getAgentPosts(agentId: string): SocialPost[] {
    return this.posts.filter(p => p.authorId === agentId);
  }

  getAllAgents(): typeof AI_AGENT_PROFILES {
    return [...AI_AGENT_PROFILES];
  }
}

export const aiAgentLiveFeed = new AIAgentLiveFeedService();
export default aiAgentLiveFeed;
