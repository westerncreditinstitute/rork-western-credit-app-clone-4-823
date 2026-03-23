import { SocialPost, PostType } from '@/types/socialFeed';

export type AgentGender = 'male' | 'female';

export interface AgentProfile {
  id: string;
  name: string;
  avatar: string;
  city: string;
  occupation: string;
  creditScore: number;
  level: number;
  gender: AgentGender;
  hasPhoto: boolean;
}

interface NameEntry {
  name: string;
  gender: AgentGender;
}

const FIRST_NAMES: NameEntry[] = [
  { name: 'Maya', gender: 'female' }, { name: 'James', gender: 'male' }, { name: 'Sofia', gender: 'female' }, { name: 'Marcus', gender: 'male' },
  { name: 'Lin', gender: 'female' }, { name: 'Derek', gender: 'male' }, { name: 'Priya', gender: 'female' }, { name: 'Carlos', gender: 'male' },
  { name: 'Aisha', gender: 'female' }, { name: 'Ben', gender: 'male' }, { name: 'Nadia', gender: 'female' }, { name: 'Omar', gender: 'male' },
  { name: 'Rachel', gender: 'female' }, { name: 'Kai', gender: 'male' }, { name: 'Elena', gender: 'female' }, { name: 'Tyrone', gender: 'male' },
  { name: 'Mei', gender: 'female' }, { name: 'Andre', gender: 'male' }, { name: 'Fatima', gender: 'female' }, { name: 'Noah', gender: 'male' },
  { name: 'Zara', gender: 'female' }, { name: 'Liam', gender: 'male' }, { name: 'Isla', gender: 'female' }, { name: 'Ethan', gender: 'male' },
  { name: 'Amara', gender: 'female' }, { name: 'Lucas', gender: 'male' }, { name: 'Nia', gender: 'female' }, { name: 'Mason', gender: 'male' },
  { name: 'Layla', gender: 'female' }, { name: 'Jackson', gender: 'male' }, { name: 'Aria', gender: 'female' }, { name: 'Aiden', gender: 'male' },
  { name: 'Chloe', gender: 'female' }, { name: 'Leo', gender: 'male' }, { name: 'Mila', gender: 'female' }, { name: 'Caleb', gender: 'male' },
  { name: 'Luna', gender: 'female' }, { name: 'Owen', gender: 'male' }, { name: 'Aaliyah', gender: 'female' }, { name: 'Wyatt', gender: 'male' },
  { name: 'Jade', gender: 'female' }, { name: 'Dylan', gender: 'male' }, { name: 'Ivy', gender: 'female' }, { name: 'Grayson', gender: 'male' },
  { name: 'Elara', gender: 'female' }, { name: 'Hunter', gender: 'male' }, { name: 'Sage', gender: 'female' }, { name: 'Mateo', gender: 'male' },
  { name: 'Brielle', gender: 'female' }, { name: 'Asher', gender: 'male' }, { name: 'Riley', gender: 'female' }, { name: 'Ezra', gender: 'male' },
  { name: 'Willow', gender: 'female' }, { name: 'Landon', gender: 'male' }, { name: 'Ember', gender: 'female' }, { name: 'Micah', gender: 'male' },
  { name: 'Nova', gender: 'female' }, { name: 'Nolan', gender: 'male' }, { name: 'Violet', gender: 'female' }, { name: 'Theo', gender: 'male' },
  { name: 'Stella', gender: 'female' }, { name: 'Silas', gender: 'male' }, { name: 'Hazel', gender: 'female' }, { name: 'Miles', gender: 'male' },
  { name: 'Aurora', gender: 'female' }, { name: 'Rowan', gender: 'male' }, { name: 'Iris', gender: 'female' }, { name: 'Cole', gender: 'male' },
  { name: 'Ruby', gender: 'female' }, { name: 'Axel', gender: 'male' }, { name: 'Piper', gender: 'female' }, { name: 'Jasper', gender: 'male' },
  { name: 'Dahlia', gender: 'female' }, { name: 'Felix', gender: 'male' }, { name: 'Eden', gender: 'female' }, { name: 'Milo', gender: 'male' },
  { name: 'Wren', gender: 'female' }, { name: 'Beckett', gender: 'male' }, { name: 'Serena', gender: 'female' }, { name: 'Knox', gender: 'male' },
  { name: 'Sasha', gender: 'female' }, { name: 'Rhys', gender: 'male' }, { name: 'Talia', gender: 'female' }, { name: 'Dean', gender: 'male' },
  { name: 'Kira', gender: 'female' }, { name: 'Grant', gender: 'male' }, { name: 'Vera', gender: 'female' }, { name: 'Nash', gender: 'male' },
  { name: 'Elise', gender: 'female' }, { name: 'Quinn', gender: 'male' }, { name: 'Bianca', gender: 'female' }, { name: 'Jace', gender: 'male' },
  { name: 'Thea', gender: 'female' }, { name: 'Reid', gender: 'male' }, { name: 'Skye', gender: 'female' }, { name: 'Troy', gender: 'male' },
  { name: 'Naomi', gender: 'female' }, { name: 'Beau', gender: 'male' }, { name: 'Celeste', gender: 'female' }, { name: 'Zane', gender: 'male' },
  { name: 'Dara', gender: 'female' }, { name: 'Ivan', gender: 'male' }, { name: 'Lena', gender: 'female' }, { name: 'Hank', gender: 'male' },
  { name: 'Rosa', gender: 'female' }, { name: 'Wade', gender: 'male' }, { name: 'Faye', gender: 'female' }, { name: 'Blaine', gender: 'male' },
  { name: 'Tessa', gender: 'female' }, { name: 'Clark', gender: 'male' }, { name: 'Dana', gender: 'female' }, { name: 'Vince', gender: 'male' },
  { name: 'Pearl', gender: 'female' }, { name: 'Drew', gender: 'male' }, { name: 'Opal', gender: 'female' }, { name: 'Shane', gender: 'male' },
  { name: 'Blair', gender: 'female' }, { name: 'Kurt', gender: 'male' }, { name: 'June', gender: 'female' }, { name: 'Lance', gender: 'male' },
  { name: 'Hope', gender: 'female' }, { name: 'Craig', gender: 'male' }, { name: 'Faith', gender: 'female' }, { name: 'Brent', gender: 'male' },
  { name: 'Joy', gender: 'female' }, { name: 'Chad', gender: 'male' }, { name: 'Grace', gender: 'female' }, { name: 'Todd', gender: 'male' },
  { name: 'Ivy', gender: 'female' }, { name: 'Glen', gender: 'male' }, { name: 'Dawn', gender: 'female' }, { name: 'Neil', gender: 'male' },
  { name: 'Fern', gender: 'female' }, { name: 'Ray', gender: 'male' }, { name: 'Gwen', gender: 'female' }, { name: 'Joel', gender: 'male' },
  { name: 'Beth', gender: 'female' }, { name: 'Mark', gender: 'male' }, { name: 'Ann', gender: 'female' }, { name: 'Paul', gender: 'male' },
  { name: 'Jess', gender: 'female' }, { name: 'Dale', gender: 'male' }, { name: 'Kate', gender: 'female' }, { name: 'Hugh', gender: 'male' },
  { name: 'Jane', gender: 'female' }, { name: 'Ross', gender: 'male' }, { name: 'Elle', gender: 'female' }, { name: 'Gene', gender: 'male' },
  { name: 'Lily', gender: 'female' }, { name: 'Rick', gender: 'male' },
];

const NAME_SUFFIXES = [
  '_CreditPro', 'TheBuilder', '_Saves', 'Wealth', '_Investor', 'Discipline', '_FinTech',
  '_Grind', '_Goals', 'TheSaver', 'Rises', 'Finance', 'Budgets', '_CreditKing', '_FI',
  '_Hustler', 'MoneyMoves', '_Stacks', 'LevelUp', '_CashFlow', 'ThePlanner', '_DebtFree',
  'CreditUp', '_Prosper', 'WealthPath', '_ScorePro', 'BudgetBoss', '_NetWorth', 'Funded',
  '_Earner', 'Invests', '_Builder', 'CreditWin', '_Rich', 'SmartMoney', '_Saver',
  '_PayDay', 'Gains', '_Capital', 'WealthGen', '_Pioneer', 'CreditRise', '_Summit',
  '_Thrive', 'FinGoals', '_Ascend', 'MoneyWise', '_Prime', 'ScoreMax', '_Peak',
];

const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio',
  'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus',
  'Indianapolis', 'Charlotte', 'San Francisco', 'Seattle', 'Denver', 'Nashville',
  'Oklahoma City', 'El Paso', 'Washington DC', 'Boston', 'Las Vegas', 'Portland',
  'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson',
  'Fresno', 'Sacramento', 'Mesa', 'Kansas City', 'Atlanta', 'Omaha', 'Colorado Springs',
  'Raleigh', 'Miami', 'Virginia Beach', 'Oakland', 'Minneapolis', 'Tampa', 'New Orleans',
  'Arlington', 'Cleveland', 'Bakersfield', 'Aurora', 'Honolulu', 'Anaheim', 'Santa Ana',
  'Riverside', 'Corpus Christi', 'Lexington', 'Pittsburgh', 'Anchorage', 'Stockton', 'Cincinnati',
  'Saint Paul', 'Toledo', 'Newark', 'Greensboro', 'Buffalo', 'Plano', 'Lincoln',
  'Henderson', 'Fort Wayne', 'Jersey City', 'St. Petersburg', 'Chula Vista', 'Norfolk',
  'Orlando', 'Chandler', 'Laredo', 'Madison', 'Winston-Salem', 'Lubbock', 'Baton Rouge',
  'Durham', 'Garland', 'Glendale', 'Reno', 'Hialeah', 'Chesapeake', 'Scottsdale',
  'North Las Vegas', 'Irving', 'Fremont', 'Irvine', 'Birmingham', 'Rochester', 'San Bernardino',
  'Spokane', 'Gilbert', 'Arlington TX', 'Montgomery', 'Boise', 'Richmond', 'Des Moines',
];

const OCCUPATIONS = [
  'Financial Analyst', 'Software Engineer', 'Small Business Owner', 'Real Estate Agent',
  'Teacher', 'Marketing Manager', 'Data Scientist', 'Nurse', 'Entrepreneur', 'Accountant',
  'Graphic Designer', 'Sales Rep', 'Pharmacist', 'Electrician', 'Lawyer', 'Doctor',
  'Dentist', 'Architect', 'Chef', 'Mechanic', 'Plumber', 'Pilot', 'Firefighter',
  'Police Officer', 'Paramedic', 'Veterinarian', 'Physical Therapist', 'Social Worker',
  'Journalist', 'Photographer', 'Web Developer', 'UX Designer', 'Product Manager',
  'HR Manager', 'Operations Manager', 'Project Manager', 'Business Analyst', 'Consultant',
  'Investment Banker', 'Insurance Agent', 'Mortgage Broker', 'Tax Preparer', 'Auditor',
  'Bank Teller', 'Loan Officer', 'Financial Planner', 'Stockbroker', 'Actuary',
  'Construction Worker', 'Carpenter', 'Welder', 'HVAC Technician', 'Truck Driver',
  'Delivery Driver', 'Warehouse Manager', 'Logistics Coordinator', 'Supply Chain Analyst',
  'Retail Manager', 'Store Associate', 'Customer Service Rep', 'Call Center Agent',
  'Barista', 'Server', 'Bartender', 'Hotel Manager', 'Event Planner', 'Travel Agent',
  'Fitness Trainer', 'Yoga Instructor', 'Personal Coach', 'Tutor', 'Professor',
  'Librarian', 'Research Scientist', 'Lab Technician', 'Biotech Researcher', 'Chemist',
  'Environmental Scientist', 'Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer',
  'Aerospace Engineer', 'Chemical Engineer', 'Industrial Engineer', 'Systems Administrator',
  'Network Engineer', 'Cybersecurity Analyst', 'Database Administrator', 'DevOps Engineer',
  'Mobile Developer', 'Game Developer', 'AI Engineer', 'Machine Learning Engineer',
  'Cloud Architect', 'IT Support', 'Technical Writer', 'Content Creator', 'Influencer',
  'Musician', 'Artist', 'Actor', 'Film Editor', 'Sound Engineer',
];

const FEMALE_AVATAR_PHOTOS = [
  'photo-1494790108377-be9c29b29330', 'photo-1438761681033-6461ffad8d80',
  'photo-1534528741775-53994a69daeb', 'photo-1544005313-94ddf0286df2',
  'photo-1517841905240-472988babdf9', 'photo-1487412720507-e7ab37603c6f',
  'photo-1524504388940-b1c1722653e1', 'photo-1580489944761-15a19d654956',
  'photo-1573496359142-b8d87734a5a2', 'photo-1546961342-ea5f71b193f3',
  'photo-1548142813-c348350df52b', 'photo-1546539782-6fc531453083',
  'photo-1508214751196-bcfd4ca60f91', 'photo-1488426862026-3ee34a7d66df',
  'photo-1509868918274-064b4485a328', 'photo-1543871595-e11129e271cc',
  'photo-1506863530036-1efeddceb993',
];

const MALE_AVATAR_PHOTOS = [
  'photo-1507003211169-0a1dd7228f2d', 'photo-1500648767791-00dcc994a43e',
  'photo-1472099645785-5658abf4ff4e', 'photo-1506794778202-cad84cf45f1d',
  'photo-1531123897727-8f129e1688ce', 'photo-1519345182560-3f2917c472ef',
  'photo-1560250097-0b93528c311a', 'photo-1463453091185-61582044d556',
  'photo-1539571696357-5a69c17a67c6', 'photo-1507591064344-4c6ce005b128',
  'photo-1522075469751-3a6694fb2f61', 'photo-1552058544-f2b08422138a',
  'photo-1535295972055-1c762f4483e5', 'photo-1504257432389-52343af06ae3',
  'photo-1551836022-d5d88e9218df', 'photo-1564564321837-a57b7070ac4f',
  'photo-1499996860823-5214fcc65f8f', 'photo-1557862921-37829c790f19',
  'photo-1528892952291-009c663ce843', 'photo-1529626455594-4ff0802cfb7e',
];

const PHOTO_ASSIGNMENT_RATE = 0.18;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateAllAgents(): AgentProfile[] {
  const agents: AgentProfile[] = [];
  const totalAgents = 10000;
  const usedPhotoKeys = new Set<string>();

  for (let i = 0; i < totalAgents; i++) {
    const rng = seededRandom(i * 7919 + 104729);

    const firstIdx = Math.floor(rng() * FIRST_NAMES.length);
    const suffixIdx = Math.floor(rng() * NAME_SUFFIXES.length);
    const cityIdx = Math.floor(rng() * CITIES.length);
    const occIdx = Math.floor(rng() * OCCUPATIONS.length);

    const nameEntry = FIRST_NAMES[firstIdx];
    const gender = nameEntry.gender;

    const baseScore = Math.floor(rng() * 500) + 350;
    const creditScore = Math.min(850, Math.max(350, baseScore));
    const level = Math.max(1, Math.min(100, Math.floor(rng() * 100) + 1));

    const uniqueNum = i + 1;
    const name = `${nameEntry.name}${NAME_SUFFIXES[suffixIdx]}${uniqueNum > 150 ? uniqueNum : ''}`;

    const shouldHavePhoto = rng() < PHOTO_ASSIGNMENT_RATE;
    let avatar = '';
    let hasPhoto = false;

    if (shouldHavePhoto) {
      const photoPool = gender === 'female' ? FEMALE_AVATAR_PHOTOS : MALE_AVATAR_PHOTOS;
      const photoIdx = Math.floor(rng() * photoPool.length);
      const photoKey = `${photoPool[photoIdx]}_${uniqueNum}`;
      if (!usedPhotoKeys.has(photoKey)) {
        usedPhotoKeys.add(photoKey);
        avatar = `https://images.unsplash.com/${photoPool[photoIdx]}?w=150&sig=${uniqueNum}`;
        hasPhoto = true;
      }
    }

    agents.push({
      id: `agent_${uniqueNum}`,
      name,
      avatar,
      city: CITIES[cityIdx],
      occupation: OCCUPATIONS[occIdx],
      creditScore,
      level,
      gender,
      hasPhoto,
    });
  }

  console.log(`[LiveFeed] Generated ${totalAgents} agents. ${agents.filter(a => a.hasPhoto).length} with photos, ${agents.filter(a => !a.hasPhoto).length} with default avatars`);
  return agents;
}

export const AI_AGENT_PROFILES: AgentProfile[] = generateAllAgents();

const agentLookup = new Map<string, AgentProfile>();
AI_AGENT_PROFILES.forEach(a => agentLookup.set(a.id, a));

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
    'Pulled my report today — {score}. Feels good to see the progress after months of grinding.',
    'Score update: {score}! That authorized user strategy really accelerated things.',
    'From {oldScore} to {score}. Patience and discipline are everything in this game.',
    'New month, new score: {score}. Keeping utilization under 10% is the cheat code.',
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
    'Just unlocked "Side Hustle Hero" — $10K earned outside my day job this year!',
    'Achievement: "Zero Balance Champion" — all revolving accounts paid in full!',
    'Level {level} and counting. The XP from financial challenges is stacking up.',
    'Unlocked "Credit Veteran" badge — 5 years of responsible credit management!',
  ],
  home_purchase: [
    'Just closed on my first home in {city}! {score} credit score made the rate incredible.',
    'House hunting update: Found the perfect place! Mortgage pre-approved at 6.2% with {score} score.',
    'Moved into the new place today! From a 500 sq ft apartment to a 3BR house. Credit journey made this possible.',
    'Refinanced at 5.8% thanks to my improved credit. Saving $340/month!',
    'Property value up 8% since purchase. Real estate + good credit = wealth building.',
    'Finally got the keys! The feeling of owning your first home is unmatched.',
    'Closed on investment property #2 in {city}. Building generational wealth one door at a time.',
    'Mortgage rate locked at 5.9%! A {score} score opens doors — literally.',
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
    'Crossed $250K net worth today. Five years ago I was $60K in debt.',
    'First $1,000 month of passive income! The portfolio is finally working for me.',
    'Paid off my car loan 2 years early. That freed up $450/month for investing.',
    'Hit 100 consecutive days of tracking every expense. Data is power.',
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
    'Freeze your credit when not applying for anything. Protects against fraud with zero downside.',
    'Use a high-yield savings account. Regular savings at 0.01% is basically losing money to inflation.',
    'Track your net worth monthly. What gets measured gets managed.',
    'Pay your credit card balance BEFORE the statement closes for the lowest reported utilization.',
    'If you\'re denied credit, always call reconsideration. It works more often than you think.',
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
    'When did you start seeing real returns from investing? Feeling impatient at month 6.',
    'Roth IRA vs Traditional — which are you doing and why?',
    'How do you stay motivated when your score barely moves for months?',
    'Any tips for negotiating salary? Want to accelerate my debt payoff.',
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
    'Finally automated everything. Bills, savings, investments — all on autopilot.',
    'Switched to a no-fee bank account. Why was I paying $12/month for nothing?',
    'Tracked every single expense this month. Eye-opening how the small stuff adds up.',
    'Just meal prepped 5 days of lunches for $28. Used to spend $15/day eating out.',
    'Returned an impulse purchase. Old me would\'ve kept it. Growth!',
    'Cashback rewards this quarter: $87. Free money for spending I was already doing.',
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
  'Saving this post for later. Gold!',
  'This community is the best. So much real talk.',
  'You just inspired me to check my score today.',
  'Same boat here — nice to know we\'re not alone.',
  'Proof that consistency wins. Respect!',
  'Bookmarked. This is the content I come here for.',
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomAgent(): AgentProfile {
  const idx = Math.floor(Math.random() * AI_AGENT_PROFILES.length);
  return AI_AGENT_PROFILES[idx];
}

function getRandomCommentAgent(excludeId: string): AgentProfile {
  let agent = getRandomAgent();
  let attempts = 0;
  while (agent.id === excludeId && attempts < 5) {
    agent = getRandomAgent();
    attempts++;
  }
  return agent;
}

function generatePostText(type: string, agent: AgentProfile): string {
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
  const agent = getRandomAgent();
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
    const commentAgent = getRandomCommentAgent(agent.id);
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
    authorGender: agent.gender,
    authorHasPhoto: agent.hasPhoto,
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
  private postIntervalMs = 3000;
  private maxPosts = 500;

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.posts.length === 0) {
      this.seedInitialPosts();
    }

    console.log('[LiveFeed] AI Agent live feed started with 10,000 agents');
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

    const delay = this.postIntervalMs + randomInt(-1000, 2000);
    setTimeout(() => {
      if (!this.isRunning) return;
      const batchSize = randomInt(1, 3);
      for (let i = 0; i < batchSize; i++) {
        this.generateNewPost();
      }
      this.scheduleNextPost();
    }, Math.max(delay, 1500));
  }

  private seedInitialPosts() {
    const initialPosts: SocialPost[] = [];
    for (let i = 0; i < 30; i++) {
      initialPosts.push(generatePost(i * randomInt(60000, 300000)));
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
    console.log(`[LiveFeed] New post from ${post.authorName} (${post.authorCity}): ${post.postType}`);
  }

  private simulateInteraction() {
    if (this.posts.length < 2) return;

    const targetIdx = randomInt(1, Math.min(this.posts.length - 1, 20));
    const target = this.posts[targetIdx];

    if (Math.random() < 0.6) {
      this.posts[targetIdx] = {
        ...target,
        likes: target.likes + randomInt(1, 10),
      };
    } else {
      const commentAgent = getRandomAgent();
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

  getAgentById(agentId: string): AgentProfile | undefined {
    return agentLookup.get(agentId);
  }

  getAgentPosts(agentId: string): SocialPost[] {
    return this.posts.filter(p => p.authorId === agentId);
  }

  getAllAgents(): AgentProfile[] {
    return AI_AGENT_PROFILES;
  }
}

export const aiAgentLiveFeed = new AIAgentLiveFeedService();
export default aiAgentLiveFeed;
