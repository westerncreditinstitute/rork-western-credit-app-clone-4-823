import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  ChevronRight,
  Briefcase,
  GraduationCap,
  CreditCard,
  PiggyBank,
  Trophy,
  Coins,
  ShoppingBag,
  Users,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Star,
  Sparkles,
  Play,
  Home,
  Palette,
  Eye,
  Castle,
  Package,
  Vote,
  Crown,
  Bot,
  Skull,
  Joystick,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TutorialSection {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  gradient: [string, string];
  content: TutorialContent[];
}

interface TutorialContent {
  type: 'heading' | 'paragraph' | 'tip' | 'warning' | 'step' | 'highlight';
  text: string;
  icon?: any;
}

const TUTORIAL_SECTIONS: TutorialSection[] = [
  {
    id: 'overview',
    title: 'Welcome to Credit Life',
    subtitle: 'Your journey to financial mastery begins here',
    icon: Sparkles,
    color: '#3B82F6',
    gradient: ['#1E40AF', '#3B82F6'],
    content: [
      { type: 'heading', text: 'What is Credit Life Simulator?' },
      { type: 'paragraph', text: 'Credit Life Simulator is an immersive financial education game that teaches you how to build and maintain excellent credit while managing real-life financial decisions.' },
      { type: 'heading', text: 'Your Goal' },
      { type: 'highlight', text: 'Achieve an 850 credit score, buy a home, own a car, and build wealth while avoiding financial pitfalls.' },
      { type: 'heading', text: 'How It Works' },
      { type: 'step', text: '1. Start with a basic credit profile and small savings' },
      { type: 'step', text: '2. Get a job to earn monthly income' },
      { type: 'step', text: '3. Apply for credit cards and loans to build credit history' },
      { type: 'step', text: '4. Make on-time payments to improve your score' },
      { type: 'step', text: '5. Advance month by month to simulate real life' },
      { type: 'tip', text: 'Each month, random events may occur that affect your finances - just like real life!' },
    ],
  },
  {
    id: 'credit-score',
    title: 'Understanding Credit Scores',
    subtitle: 'The foundation of your financial identity',
    icon: TrendingUp,
    color: '#10B981',
    gradient: ['#047857', '#10B981'],
    content: [
      { type: 'heading', text: 'Credit Score Ranges' },
      { type: 'step', text: '800-850: Exceptional - Best rates, easy approvals' },
      { type: 'step', text: '740-799: Very Good - Great rates available' },
      { type: 'step', text: '670-739: Good - Decent rates, most approvals' },
      { type: 'step', text: '580-669: Fair - Higher rates, some denials' },
      { type: 'step', text: '300-579: Poor - Limited options, high rates' },
      { type: 'heading', text: 'What Affects Your Score' },
      { type: 'highlight', text: 'Payment History (35%): Always pay on time!' },
      { type: 'paragraph', text: 'Credit Utilization (30%): Keep balances below 30% of your limits' },
      { type: 'paragraph', text: 'Credit Age (15%): Older accounts help your score' },
      { type: 'paragraph', text: 'Credit Mix (10%): Having different types of credit is good' },
      { type: 'paragraph', text: 'Hard Inquiries (10%): Too many applications hurt your score' },
      { type: 'warning', text: 'Missing payments can drop your score by 50-100 points instantly!' },
      { type: 'tip', text: 'You have three bureau scores (Experian, Equifax, TransUnion) - they may vary slightly.' },
    ],
  },
  {
    id: 'career',
    title: 'Career & Income',
    subtitle: 'Your job is your financial engine',
    icon: Briefcase,
    color: '#3B82F6',
    gradient: ['#1D4ED8', '#3B82F6'],
    content: [
      { type: 'heading', text: 'Getting Your First Job' },
      { type: 'paragraph', text: 'Start with entry-level positions that have no credit or experience requirements. As you build your profile, better jobs become available.' },
      { type: 'heading', text: 'Job Requirements' },
      { type: 'step', text: 'Credit Score: Some employers check credit for hiring' },
      { type: 'step', text: 'Experience: Measured in months at previous jobs' },
      { type: 'step', text: 'Education: Higher degrees unlock executive positions' },
      { type: 'heading', text: 'Career Tiers' },
      { type: 'paragraph', text: 'Entry Level: $2,000-3,500/month - No requirements' },
      { type: 'paragraph', text: 'Mid Level: $3,500-5,500/month - Experience needed' },
      { type: 'paragraph', text: 'Senior: $5,500-8,000/month - Degree + experience' },
      { type: 'paragraph', text: 'Executive: $8,000-15,000+/month - Advanced degrees' },
      { type: 'tip', text: 'Education provides salary bonuses: Bachelor\'s +20-30%, Master\'s +40-60%, Doctorate +80-120%!' },
      { type: 'warning', text: 'Switching jobs too often may look bad - stay at least 12 months when possible.' },
    ],
  },
  {
    id: 'education',
    title: 'Education System',
    subtitle: 'Invest in yourself for higher earnings',
    icon: GraduationCap,
    color: '#8B5CF6',
    gradient: ['#6D28D9', '#8B5CF6'],
    content: [
      { type: 'heading', text: 'Why Get Educated?' },
      { type: 'highlight', text: 'Education unlocks high-paying careers and provides significant salary bonuses.' },
      { type: 'heading', text: 'Degree Types' },
      { type: 'step', text: 'Certificate: 6-12 months, entry-level boost' },
      { type: 'step', text: 'Associate\'s: 2 years, +10-15% salary' },
      { type: 'step', text: 'Bachelor\'s: 4 years, +20-30% salary' },
      { type: 'step', text: 'Master\'s: 2 years after bachelor\'s, +40-60% salary' },
      { type: 'step', text: 'Doctorate: 4+ years after master\'s, +80-120% salary' },
      { type: 'heading', text: 'Paying for School' },
      { type: 'paragraph', text: 'Tuition varies by school type (community college is cheapest, private universities most expensive).' },
      { type: 'tip', text: 'Apply for financial aid first - grants and scholarships don\'t need to be repaid!' },
      { type: 'paragraph', text: 'Student loans are available but add to your debt. Federal loans have lower interest than private loans.' },
      { type: 'warning', text: 'Dropping out hurts your credit score and you may lose tuition paid!' },
    ],
  },
  {
    id: 'bank',
    title: 'Banking & Credit',
    subtitle: 'Building your credit portfolio',
    icon: CreditCard,
    color: '#EC4899',
    gradient: ['#BE185D', '#EC4899'],
    content: [
      { type: 'heading', text: 'Credit Cards' },
      { type: 'paragraph', text: 'Credit cards are essential for building credit history. Use them responsibly:' },
      { type: 'step', text: 'Apply for cards matching your credit score' },
      { type: 'step', text: 'Keep utilization below 30% of your limit' },
      { type: 'step', text: 'Pay at least the minimum by the due date' },
      { type: 'step', text: 'Pay in full to avoid interest charges' },
      { type: 'heading', text: 'Loans Available' },
      { type: 'paragraph', text: 'Personal Loans: For various purposes, builds credit mix' },
      { type: 'paragraph', text: 'Auto Loans: Finance a car, secured by the vehicle' },
      { type: 'paragraph', text: 'Mortgages: Buy a home, requires good credit (680+)' },
      { type: 'tip', text: 'Each application creates a hard inquiry (-5 to -10 points). Don\'t apply for too many at once!' },
      { type: 'heading', text: 'Interest Rates' },
      { type: 'highlight', text: 'Better credit = lower interest rates = more money saved!' },
      { type: 'warning', text: 'Maxing out credit cards tanks your score quickly!' },
    ],
  },
  {
    id: 'budget',
    title: 'Budget Management',
    subtitle: 'Track income and expenses wisely',
    icon: PiggyBank,
    color: '#6366F1',
    gradient: ['#4338CA', '#6366F1'],
    content: [
      { type: 'heading', text: 'Income vs Expenses' },
      { type: 'paragraph', text: 'Your net income (income minus expenses) determines how fast you can save and pay off debt.' },
      { type: 'heading', text: 'Expense Categories' },
      { type: 'step', text: 'Housing: Rent or mortgage (aim for <30% of income)' },
      { type: 'step', text: 'Utilities: Electric, water, internet, phone' },
      { type: 'step', text: 'Transportation: Car payment, gas, insurance' },
      { type: 'step', text: 'Food: Groceries and dining out' },
      { type: 'step', text: 'Insurance: Health, auto, renters/home' },
      { type: 'step', text: 'Subscriptions: Streaming, gym, etc.' },
      { type: 'heading', text: 'Savings Goals' },
      { type: 'highlight', text: 'Build an emergency fund of 3-6 months of expenses!' },
      { type: 'tip', text: 'Transfer money to savings regularly - treat it like a bill you must pay.' },
      { type: 'paragraph', text: 'Use your savings account for emergencies and your emergency fund for unexpected large expenses.' },
    ],
  },
  {
    id: 'tokens',
    title: 'MUSO Tokens',
    subtitle: 'Your in-game currency and rewards',
    icon: Coins,
    color: '#F59E0B',
    gradient: ['#D97706', '#F59E0B'],
    content: [
      { type: 'heading', text: 'What are MUSO Tokens?' },
      { type: 'paragraph', text: 'MUSO tokens are the in-game currency you can earn through gameplay and use for special features.' },
      { type: 'heading', text: 'How to Earn Tokens' },
      { type: 'step', text: 'Complete achievements and milestones' },
      { type: 'step', text: 'Maintain on-time payment streaks' },
      { type: 'step', text: 'Reach credit score milestones' },
      { type: 'step', text: 'Graduate from educational programs' },
      { type: 'step', text: 'Participate in community activities' },
      { type: 'heading', text: 'Token Uses' },
      { type: 'paragraph', text: 'Purchase items in the Marketplace' },
      { type: 'paragraph', text: 'Unlock special features and bonuses' },
      { type: 'paragraph', text: 'Participate in tournaments and competitions' },
      { type: 'tip', text: 'Check the Token Wallet regularly to see your balance and transaction history!' },
    ],
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    subtitle: 'Spend tokens on valuable items',
    icon: ShoppingBag,
    color: '#06B6D4',
    gradient: ['#0891B2', '#06B6D4'],
    content: [
      { type: 'heading', text: 'What Can You Buy?' },
      { type: 'paragraph', text: 'The marketplace offers various items and boosts to help your financial journey:' },
      { type: 'step', text: 'Credit Boosts: Temporary score improvements' },
      { type: 'step', text: 'Interest Rate Reducers: Lower loan rates' },
      { type: 'step', text: 'Event Protection: Reduce negative event impacts' },
      { type: 'step', text: 'Cosmetics: Customize your profile' },
      { type: 'heading', text: 'Special Offers' },
      { type: 'tip', text: 'Check the marketplace regularly for limited-time deals!' },
      { type: 'paragraph', text: 'Some items are only available during special events or seasons.' },
    ],
  },
  {
    id: 'achievements',
    title: 'Achievements & Goals',
    subtitle: 'Track your progress and earn rewards',
    icon: Trophy,
    color: '#F97316',
    gradient: ['#EA580C', '#F97316'],
    content: [
      { type: 'heading', text: 'Achievement Categories' },
      { type: 'step', text: 'Credit Milestones: Reach score thresholds' },
      { type: 'step', text: 'Payment Streaks: Consecutive on-time payments' },
      { type: 'step', text: 'Wealth Building: Savings and net worth goals' },
      { type: 'step', text: 'Career Progress: Job promotions and education' },
      { type: 'step', text: 'Life Goals: Buy a car, own a home, etc.' },
      { type: 'heading', text: 'Achievement Rewards' },
      { type: 'highlight', text: 'Completing achievements earns MUSO tokens and unlocks badges!' },
      { type: 'heading', text: 'Ultimate Goals' },
      { type: 'paragraph', text: 'The game\'s ultimate goals are:' },
      { type: 'step', text: 'Achieve an 850 credit score' },
      { type: 'step', text: 'Own your own home' },
      { type: 'step', text: 'Own a car (paid off)' },
      { type: 'step', text: 'Reach $100,000+ net worth' },
      { type: 'tip', text: 'Check your achievements screen regularly to see what you\'re close to unlocking!' },
    ],
  },
  {
    id: 'events',
    title: 'Random Events',
    subtitle: 'Life happens - be prepared',
    icon: AlertTriangle,
    color: '#EF4444',
    gradient: ['#DC2626', '#EF4444'],
    content: [
      { type: 'heading', text: 'What Are Random Events?' },
      { type: 'paragraph', text: 'Each month, random life events may occur that test your financial preparedness:' },
      { type: 'heading', text: 'Negative Events' },
      { type: 'step', text: 'Car Repairs: $500-2,000 unexpected expense' },
      { type: 'step', text: 'Medical Bills: $1,000-5,000 healthcare costs' },
      { type: 'step', text: 'Job Loss: Temporary income reduction' },
      { type: 'step', text: 'Home Repairs: $1,000-3,000 for homeowners' },
      { type: 'step', text: 'Identity Theft: Credit score impact' },
      { type: 'heading', text: 'Positive Events' },
      { type: 'step', text: 'Tax Refund: Bonus cash injection' },
      { type: 'step', text: 'Work Bonus: Extra income' },
      { type: 'step', text: 'Inheritance: Unexpected windfall' },
      { type: 'warning', text: 'Without an emergency fund, unexpected expenses may force you to use credit cards!' },
      { type: 'tip', text: 'Keep 3-6 months of expenses in your emergency fund to handle any event.' },
    ],
  },
  {
    id: 'bankruptcy',
    title: 'Bankruptcy Rules',
    subtitle: 'What happens when you go broke',
    icon: Skull,
    color: '#DC2626',
    gradient: ['#991B1B', '#DC2626'],
    content: [
      { type: 'heading', text: 'What is Bankruptcy?' },
      { type: 'paragraph', text: 'Bankruptcy is the ultimate financial failure in Credit Life Simulator. If your total net worth drops to -$150,000 or worse, you are forced into bankruptcy and must start the game over from scratch.' },
      { type: 'heading', text: 'Bankruptcy Threshold' },
      { type: 'highlight', text: 'If your net worth reaches -$150,000 or below, bankruptcy is automatically triggered. There is no way to avoid it once you cross this line.' },
      { type: 'heading', text: 'What Happens During Bankruptcy' },
      { type: 'step', text: 'All your assets are liquidated (properties, vehicles, investments)' },
      { type: 'step', text: 'All credit accounts are closed' },
      { type: 'step', text: 'Your entire game progress is wiped clean' },
      { type: 'step', text: 'You must start over from the beginning with a fresh profile' },
      { type: 'step', text: 'Achievements, tokens, and history are all reset' },
      { type: 'warning', text: 'Bankruptcy is permanent and cannot be undone. Once triggered, all progress is lost instantly.' },
      { type: 'heading', text: 'How Net Worth is Calculated' },
      { type: 'paragraph', text: 'Your net worth = Total Assets - Total Debt. Assets include bank balance, savings, emergency fund, investments, and property values. Debt includes all credit card balances, loans, and mortgages.' },
      { type: 'heading', text: 'Common Causes of Bankruptcy' },
      { type: 'step', text: 'Taking on too much high-interest debt (credit cards, subprime loans)' },
      { type: 'step', text: 'Losing your job without an emergency fund' },
      { type: 'step', text: 'Multiple emergency events draining your finances' },
      { type: 'step', text: 'Overspending on lifestyle beyond your means' },
      { type: 'step', text: 'Not paying bills, causing late fees and penalties to compound' },
      { type: 'heading', text: 'How to Avoid Bankruptcy' },
      { type: 'tip', text: 'Keep a healthy emergency fund of 3-6 months of expenses to absorb unexpected costs.' },
      { type: 'tip', text: 'Monitor your net worth on the dashboard regularly. If it\'s trending negative, cut spending immediately.' },
      { type: 'tip', text: 'Avoid maxing out credit cards - high utilization leads to compounding interest that spirals out of control.' },
      { type: 'tip', text: 'Always have a job. Even a low-paying job provides income to service your debts.' },
      { type: 'step', text: 'Pay at least the minimum on all debts every month' },
      { type: 'step', text: 'Use the 50/30/20 budgeting rule to stay balanced' },
      { type: 'step', text: 'Build savings before making large purchases' },
      { type: 'step', text: 'Get health insurance to avoid catastrophic medical bills' },
      { type: 'heading', text: 'Warning Signs' },
      { type: 'paragraph', text: 'Watch for these red flags that you may be heading toward bankruptcy:' },
      { type: 'step', text: 'Net worth below -$50,000 and falling' },
      { type: 'step', text: 'Monthly expenses exceeding monthly income' },
      { type: 'step', text: 'Multiple accounts in collections or late status' },
      { type: 'step', text: 'Using credit cards to pay for basic living expenses' },
      { type: 'step', text: 'Zero emergency fund with outstanding debts' },
      { type: 'warning', text: 'If your net worth drops below -$100,000, you are dangerously close to the -$150,000 bankruptcy threshold. Take immediate action!' },
    ],
  },
  {
    id: 'community',
    title: 'Community Features',
    subtitle: 'Connect, compete, and share',
    icon: Users,
    color: '#8B5CF6',
    gradient: ['#7C3AED', '#8B5CF6'],
    content: [
      { type: 'heading', text: 'Community Feed' },
      { type: 'paragraph', text: 'The Community section is a paid social feed where players share tips, achievements, and stories with other players.' },
      { type: 'highlight', text: 'Posting to the Community Feed costs MUSO tokens. The price starts at $10 and increases with demand!' },
      { type: 'heading', text: 'How to Post to the Community Feed' },
      { type: 'step', text: '1. Navigate to the Community tab from the main menu' },
      { type: 'step', text: '2. Tap the "Create Post" button at the top of the feed' },
      { type: 'step', text: '3. Write your post content (tips, questions, achievements, etc.)' },
      { type: 'step', text: '4. Optionally add images or videos to your post' },
      { type: 'step', text: '5. Review the current posting fee displayed on screen' },
      { type: 'step', text: '6. Tap "Pay & Post" to publish - the fee is deducted from your bank balance' },
      { type: 'heading', text: 'Dynamic Pricing Algorithm' },
      { type: 'paragraph', text: 'The cost to post is driven by demand. The base price is $10, and it increases as more players post within each pricing window.' },
      { type: 'step', text: 'Base price: $10 per post' },
      { type: 'step', text: 'Each additional post in the window raises the price' },
      { type: 'step', text: 'High-demand periods = higher posting fees' },
      { type: 'step', text: 'Low-demand periods = prices drop back toward the base' },
      { type: 'tip', text: 'Post during off-peak times to get lower fees! Watch the current price before posting.' },
      { type: 'warning', text: 'Make sure you have enough in your bank balance to cover the posting fee before creating a post.' },
      { type: 'heading', text: 'Leaderboards' },
      { type: 'paragraph', text: 'Compete with other players on various metrics:' },
      { type: 'step', text: 'Highest Credit Score' },
      { type: 'step', text: 'Highest Net Worth' },
      { type: 'step', text: 'Longest Payment Streak' },
      { type: 'step', text: 'Most Achievements' },
      { type: 'heading', text: 'Interacting with Posts' },
      { type: 'paragraph', text: 'Like, comment, and share posts from other players. Engaging with the community helps everyone learn and grow.' },
      { type: 'heading', text: 'Guilds' },
      { type: 'paragraph', text: 'Join or create guilds to collaborate with other players and earn group rewards.' },
      { type: 'tip', text: 'Active community participation can earn you bonus MUSO tokens!' },
    ],
  },
  {
    id: 'business',
    title: 'Start A Business',
    subtitle: 'Build your entrepreneurial empire',
    icon: Building2,
    color: '#14B8A6',
    gradient: ['#0D9488', '#14B8A6'],
    content: [
      { type: 'heading', text: 'Business Ownership' },
      { type: 'paragraph', text: 'Once you\'ve built up savings and good credit, you can start your own business!' },
      { type: 'heading', text: 'Business Categories' },
      { type: 'step', text: 'Retail: Stores and consumer goods' },
      { type: 'step', text: 'Service: Professional services' },
      { type: 'step', text: 'Technology: Tech startups' },
      { type: 'step', text: 'Real Estate: Property investment' },
      { type: 'heading', text: 'Business Requirements' },
      { type: 'paragraph', text: 'Each business type has minimum requirements:' },
      { type: 'step', text: 'Credit Score: Higher scores unlock more options' },
      { type: 'step', text: 'Startup Capital: Need enough savings' },
      { type: 'step', text: 'Education: Some require specific degrees' },
      { type: 'heading', text: 'Investment Pools' },
      { type: 'highlight', text: 'Create investment pools to let others fund your business, or invest in others\' ventures!' },
      { type: 'tip', text: 'Start small and reinvest profits to grow your business empire.' },
      { type: 'warning', text: 'Businesses can fail - don\'t invest more than you can afford to lose!' },
    ],
  },
  {
    id: 'tips',
    title: 'Pro Tips & Strategies',
    subtitle: 'Master the game with these insights',
    icon: Star,
    color: '#FFD700',
    gradient: ['#B8860B', '#FFD700'],
    content: [
      { type: 'heading', text: 'Early Game Strategy' },
      { type: 'step', text: '1. Get any job immediately for income' },
      { type: 'step', text: '2. Apply for a secured credit card' },
      { type: 'step', text: '3. Keep utilization under 10% for fastest growth' },
      { type: 'step', text: '4. Build emergency fund before big purchases' },
      { type: 'heading', text: 'Credit Building Tips' },
      { type: 'tip', text: 'Pay credit card balances weekly, not monthly, to keep reported utilization low.' },
      { type: 'tip', text: 'Never close your oldest credit card - it helps your average account age.' },
      { type: 'tip', text: 'Aim for 3-5 different credit accounts for a good credit mix.' },
      { type: 'heading', text: 'Money Management' },
      { type: 'highlight', text: '50/30/20 Rule: 50% needs, 30% wants, 20% savings/debt' },
      { type: 'tip', text: 'Pay off high-interest debt before investing heavily in education.' },
      { type: 'heading', text: 'Advanced Strategies' },
      { type: 'paragraph', text: 'Once your score is 740+, you can qualify for the best rates on mortgages and auto loans.' },
      { type: 'tip', text: 'Time major purchases (car, home) when your score is at its peak.' },
      { type: 'warning', text: 'Avoid lifestyle inflation - just because you earn more doesn\'t mean you should spend more!' },
    ],
  },
  {
    id: 'virtual-home',
    title: 'Virtual Home System',
    subtitle: 'Build and customize your dream home',
    icon: Home,
    color: '#10B981',
    gradient: ['#059669', '#10B981'],
    content: [
      { type: 'heading', text: 'Your Virtual Home' },
      { type: 'paragraph', text: 'Create and customize your own virtual home! Start with a free Starter Studio and upgrade to larger homes as you build wealth.' },
      { type: 'heading', text: 'Home Tiers' },
      { type: 'step', text: 'Starter Studio: Free - 1 room, 20 items, 3 visitors' },
      { type: 'step', text: 'Apartment: $25,000 - 3 rooms, 50 items, 5 visitors' },
      { type: 'step', text: 'House: $100,000 - 5 rooms, 100 items, 8 visitors' },
      { type: 'step', text: 'Mansion: $500,000 - 8 rooms, 200 items, 15 visitors' },
      { type: 'heading', text: 'Room Types' },
      { type: 'paragraph', text: 'Each home tier unlocks different room types: Living Room, Bedroom, Kitchen, Bathroom, Garage, Dining Room, Office, and Game Room.' },
      { type: 'tip', text: 'Start with the free Starter Studio to learn the system, then upgrade when you can afford it!' },
      { type: 'highlight', text: 'Your home is your showcase - decorate it to impress visitors and climb the leaderboards!' },
    ],
  },
  {
    id: 'home-editor',
    title: 'Home Editor',
    subtitle: 'Decorate and personalize your space',
    icon: Palette,
    color: '#8B5CF6',
    gradient: ['#7C3AED', '#8B5CF6'],
    content: [
      { type: 'heading', text: 'Decorating Your Home' },
      { type: 'paragraph', text: 'Use the Home Editor to place furniture, decor, electronics, and more throughout your rooms.' },
      { type: 'heading', text: 'How to Place Items' },
      { type: 'step', text: '1. Select a room from the room selector' },
      { type: 'step', text: '2. Tap "Add Item" to open your inventory' },
      { type: 'step', text: '3. Choose an item category (Furniture, Decor, etc.)' },
      { type: 'step', text: '4. Tap an item to place it in the room' },
      { type: 'heading', text: 'Item Management' },
      { type: 'paragraph', text: 'Tap on any placed item to access options: rotate 90° or remove it from the room.' },
      { type: 'heading', text: 'Editor Tools' },
      { type: 'step', text: 'Undo/Redo: Quickly fix placement mistakes' },
      { type: 'step', text: 'Grid Toggle: Enable grid for precise placement' },
      { type: 'step', text: 'Privacy Lock: Toggle public/private visibility' },
      { type: 'tip', text: 'Each room has a maximum item capacity - check the stats bar to see remaining slots!' },
      { type: 'warning', text: 'Don\'t forget to save your changes before leaving the editor!' },
    ],
  },
  {
    id: 'home-browser',
    title: 'Home Visitation',
    subtitle: 'Explore other players\' homes',
    icon: Eye,
    color: '#3B82F6',
    gradient: ['#2563EB', '#3B82F6'],
    content: [
      { type: 'heading', text: 'Visiting Other Homes' },
      { type: 'paragraph', text: 'Browse and visit public homes created by other players. Get inspiration, socialize, and rate the best designs!' },
      { type: 'heading', text: 'Finding Homes to Visit' },
      { type: 'step', text: 'Use the search bar to find specific players' },
      { type: 'step', text: 'Filter by home tier (Studio, Apartment, House, Mansion)' },
      { type: 'step', text: 'Sort by rating, visitor count, items, or newest' },
      { type: 'heading', text: 'Home Cards Show' },
      { type: 'paragraph', text: 'Each home card displays: Host name, tier badge, star rating, current visitors, total visits, item count, and room count.' },
      { type: 'heading', text: 'Visit History' },
      { type: 'paragraph', text: 'Track your visits in the History tab. See total homes visited, time spent exploring, and revisit your favorites.' },
      { type: 'tip', text: 'Make your home public in the editor to appear in the browser and get visitors!' },
      { type: 'highlight', text: 'Homes at max capacity show "FULL" - try again later when a spot opens up.' },
      { type: 'warning', text: 'Be respectful when visiting - your visit history is tracked!' },
    ],
  },
  {
    id: 'real-estate',
    title: 'Real Estate Investment',
    subtitle: 'Build your property empire',
    icon: Castle,
    color: '#F59E0B',
    gradient: ['#D97706', '#F59E0B'],
    content: [
      { type: 'heading', text: 'Real Estate Marketplace' },
      { type: 'paragraph', text: 'Invest in commercial real estate across three major cities: Los Angeles, Miami, and New York. Build a portfolio and earn rental income!' },
      { type: 'heading', text: 'Property Types' },
      { type: 'step', text: 'Apartments: High-rise buildings with 250-1000 units' },
      { type: 'step', text: 'Houses: Single-family residential properties' },
      { type: 'step', text: 'Mansions: Luxury estates in premium areas' },
      { type: 'step', text: 'Beach Houses: Coastal properties with ocean views' },
      { type: 'heading', text: 'How to Invest' },
      { type: 'step', text: '1. Select a city to browse properties' },
      { type: 'step', text: '2. Use filters to narrow by type, neighborhood, price' },
      { type: 'step', text: '3. Review property details and ROI projections' },
      { type: 'step', text: '4. Purchase with bank balance (includes 2% closing costs)' },
      { type: 'heading', text: 'Rental Income' },
      { type: 'highlight', text: 'Properties generate monthly rental income based on base rent and occupancy rate (typically 95%).' },
      { type: 'paragraph', text: 'Annual ROI is calculated as: (Monthly Rent × 12 × Occupancy) / Purchase Price' },
      { type: 'tip', text: 'Add properties to your watchlist with the heart icon to track favorites!' },
      { type: 'tip', text: 'Better quality properties (higher star rating) command premium rents.' },
      { type: 'warning', text: 'Ensure you have sufficient funds - total cost includes the 2% closing fee!' },
    ],
  },
  {
    id: 'navigation',
    title: 'Home Navigation',
    subtitle: 'Quick access to all home features',
    icon: Package,
    color: '#06B6D4',
    gradient: ['#0891B2', '#06B6D4'],
    content: [
      { type: 'heading', text: 'Home Navigation Bar' },
      { type: 'paragraph', text: 'The Home Navigation bar provides quick access to all home-related features from any home screen.' },
      { type: 'heading', text: 'Navigation Options' },
      { type: 'step', text: 'Create Home: Start building your first virtual home' },
      { type: 'step', text: 'Home Browser: Browse and visit public homes' },
      { type: 'step', text: 'Home Editor: Decorate and customize your home' },
      { type: 'step', text: 'Real Estate: Invest in commercial properties' },
      { type: 'heading', text: 'Quick Tips' },
      { type: 'tip', text: 'The navigation bar highlights your current screen for easy orientation.' },
      { type: 'paragraph', text: 'Access the navigation from any home-related screen - it stays at the top for convenience.' },
      { type: 'highlight', text: 'Use compact mode on smaller screens for a streamlined experience!' },
    ],
  },
  {
    id: 'elections',
    title: 'City Elections',
    subtitle: 'Run for mayor and lead your city',
    icon: Vote,
    color: '#6366F1',
    gradient: ['#4F46E5', '#6366F1'],
    content: [
      { type: 'heading', text: 'Become Mayor' },
      { type: 'paragraph', text: 'You can apply to become Mayor of any city in the Credit Life Simulator. Lead your city and earn a prestigious salary!' },
      { type: 'heading', text: 'Application Process' },
      { type: 'step', text: '1. Pay the $75,000 application fee' },
      { type: 'step', text: '2. Write your campaign platform' },
      { type: 'step', text: '3. Wait for the application period to end' },
      { type: 'step', text: '4. Top 5 candidates by leaderboard rank are selected' },
      { type: 'step', text: '5. City residents vote for their preferred candidate' },
      { type: 'heading', text: 'Mayor Benefits' },
      { type: 'highlight', text: 'Mayors earn a $250,000 annual salary - that\'s over $20,000 per month!' },
      { type: 'paragraph', text: 'Terms last one year, and you can track your approval rating as you serve.' },
      { type: 'tip', text: 'Build your leaderboard ranking to increase your chances of being selected!' },
    ],
  },
  {
    id: 'run-simulator',
    title: 'Run Simulator',
    subtitle: 'Automate your life with an AI Agent',
    icon: Bot,
    color: '#2563EB',
    gradient: ['#1D4ED8', '#2563EB'],
    content: [
      { type: 'heading', text: 'What is the Run Simulator?' },
      { type: 'paragraph', text: 'The Run Simulator lets you assign a dedicated AI Agent to automate tasks in your Credit Life - paying bills, working a job, going to school, and more.' },
      { type: 'heading', text: 'Simulation Limits' },
      { type: 'highlight', text: 'You can simulate a maximum of 1 month per 24 hours. After each simulation run, a cooldown timer begins. You must wait until the cooldown expires before running another simulation.' },
      { type: 'step', text: 'Maximum duration: 1 month per simulation' },
      { type: 'step', text: 'Cooldown period: 24 hours after each run' },
      { type: 'step', text: 'A countdown timer shows when your next simulation is available' },
      { type: 'heading', text: 'How It Works' },
      { type: 'step', text: '1. Open Run Simulator from Quick Actions' },
      { type: 'step', text: '2. Configure your AI Agent\'s goals and priorities' },
      { type: 'step', text: '3. Choose a simulation speed (Slow, Normal, Fast, or Turbo)' },
      { type: 'step', text: '4. Hit "Run Simulator" to start the 1-month automation' },
      { type: 'step', text: '5. Watch the live log as your agent makes decisions' },
      { type: 'step', text: '6. Wait 24 hours before your next simulation run' },
      { type: 'heading', text: 'Agent Goals' },
      { type: 'paragraph', text: 'Set specific goals for your AI Agent to pursue:' },
      { type: 'step', text: 'Maximize Credit Score: Agent prioritizes on-time payments and low utilization' },
      { type: 'step', text: 'Build Wealth: Focus on savings, investments, and income growth' },
      { type: 'step', text: 'Career Advancement: Pursue education and higher-paying jobs' },
      { type: 'step', text: 'Debt Elimination: Aggressively pay down outstanding balances' },
      { type: 'heading', text: 'Agent Priorities' },
      { type: 'highlight', text: 'Customize what your agent focuses on: bill payments, job applications, education enrollment, credit building, and more.' },
      { type: 'heading', text: 'Simulation Controls' },
      { type: 'step', text: 'Play/Pause: Start or pause the simulation at any time' },
      { type: 'step', text: 'Stop: End the simulation and review results' },
      { type: 'step', text: 'Reset: Clear the simulation and reconfigure' },
      { type: 'heading', text: 'Cooldown & Timer' },
      { type: 'paragraph', text: 'After completing a simulation, a 24-hour cooldown begins. The Run Simulator screen displays a live countdown timer showing exactly when you can run your next simulation. The Run button will be disabled until the cooldown expires.' },
      { type: 'heading', text: 'Reviewing Results' },
      { type: 'paragraph', text: 'After a simulation run, review detailed results including credit score changes, income earned, bills paid, and milestones reached.' },
      { type: 'tip', text: 'Plan your simulation carefully - with only 1 run per day, make sure your agent goals and task priorities are set exactly how you want them!' },
      { type: 'warning', text: 'The AI Agent makes decisions based on your configured priorities - unexpected events may still impact your finances!' },
    ],
  },
  {
    id: 'hybrid-character-control',
    title: 'Hybrid Character Control',
    subtitle: 'Manual customization meets game-driven changes',
    icon: Joystick,
    color: '#0EA5E9',
    gradient: ['#0369A1', '#0EA5E9'],
    content: [
      { type: 'heading', text: 'What is Hybrid Character Control?' },
      { type: 'paragraph', text: 'Hybrid Character Control is the system that governs how your avatar looks and evolves throughout the game. It combines two layers of control: manual customization (your direct choices) and reactive automation (game-driven appearance changes based on your life events, career, and financial status).' },
      { type: 'highlight', text: 'Your avatar is a living reflection of your in-game life. Dress for success, and your character will look the part!' },
      { type: 'heading', text: 'Manual Customization Layer' },
      { type: 'paragraph', text: 'You have full control over your avatar\'s base appearance and equipped items:' },
      { type: 'step', text: 'Skin Tone: Choose from a range of natural skin tones' },
      { type: 'step', text: 'Hair Style: Select from short, medium, long, curly, wavy, ponytail, bun, braids, buzz, or bald' },
      { type: 'step', text: 'Hair Color: Pick any hair color you like' },
      { type: 'step', text: 'Eye Color: Customize your eye color' },
      { type: 'step', text: 'Facial Hair: Add a mustache, goatee, beard, full beard, or go clean-shaven' },
      { type: 'step', text: 'Glasses: Equip regular glasses, sunglasses, or go without' },
      { type: 'heading', text: 'Outfit & Equipment System' },
      { type: 'paragraph', text: 'Your avatar\'s outfit is composed of multiple slots that you can mix and match:' },
      { type: 'step', text: 'Top: Shirts, jackets, sweaters, suits' },
      { type: 'step', text: 'Bottom: Pants, skirts, shorts' },
      { type: 'step', text: 'Shoes: Sneakers, dress shoes, boots, heels' },
      { type: 'step', text: 'Hat: Caps, beanies, fedoras, helmets' },
      { type: 'step', text: 'Jewelry: Chains, rings, bracelets' },
      { type: 'step', text: 'Watch: Casual, luxury, smartwatch' },
      { type: 'step', text: 'Bag: Backpack, briefcase, handbag' },
      { type: 'step', text: 'Eyewear: Fashion glasses, sport shades' },
      { type: 'heading', text: 'Reactive Automation Layer' },
      { type: 'paragraph', text: 'Your avatar\'s appearance automatically responds to your game state and life events. This is the "hybrid" part - the game adjusts visual details based on what\'s happening in your financial life.' },
      { type: 'step', text: 'Career Changes: Getting a new job may update your default outfit style (casual for retail, business attire for corporate, scrubs for healthcare)' },
      { type: 'step', text: 'Wealth Level: As your net worth grows, you unlock access to luxury and exclusive items' },
      { type: 'step', text: 'Credit Score Milestones: Reaching score thresholds unlocks premium customization items' },
      { type: 'step', text: 'Education: Graduating may reward you with themed accessories or outfits' },
      { type: 'step', text: 'Life Events: Special events like buying a home or starting a business can trigger avatar rewards' },
      { type: 'heading', text: 'Item Rarity & Condition' },
      { type: 'paragraph', text: 'Every item in your inventory has a rarity tier and a condition status:' },
      { type: 'step', text: 'Rarity Tiers: Common, Uncommon, Rare, Epic, Legendary' },
      { type: 'step', text: 'Condition: New → Good → Fair → Poor → Damaged' },
      { type: 'paragraph', text: 'Items wear down over time as you use them. Higher rarity items degrade slower and provide better visual flair.' },
      { type: 'warning', text: 'Items in "Damaged" condition may stop providing visual bonuses. Repair or replace them!' },
      { type: 'heading', text: 'How to Customize Your Avatar' },
      { type: 'step', text: '1. Open Avatar Customization from the game menu' },
      { type: 'step', text: '2. Select a category tab (Outfit, Hat, Accessory, Shoes, Glasses)' },
      { type: 'step', text: '3. View your currently equipped item at the top' },
      { type: 'step', text: '4. Browse your inventory of owned items below' },
      { type: 'step', text: '5. Tap any unequipped item to equip it instantly' },
      { type: 'step', text: '6. Tap "Unequip" to remove the current item from that slot' },
      { type: 'step', text: '7. Visit the Shop to purchase new items with USD or MUSO tokens' },
      { type: 'heading', text: 'Acquiring New Items' },
      { type: 'paragraph', text: 'There are multiple ways to get new customization items:' },
      { type: 'step', text: 'Business Shops: Buy from in-game clothing businesses at retail prices' },
      { type: 'step', text: 'Player Marketplace: Buy from other players, bid in auctions' },
      { type: 'step', text: 'Achievements: Unlock exclusive items by completing milestones' },
      { type: 'step', text: 'Gifts: Receive items from friends or community events' },
      { type: 'step', text: 'Rewards: Earn items through gameplay streaks and special challenges' },
      { type: 'heading', text: 'Full Body Avatar Rendering' },
      { type: 'paragraph', text: 'Your avatar is rendered as a full-body character with detailed head, torso, arms, legs, and feet. All equipped items appear visually on your character in real time.' },
      { type: 'highlight', text: 'Your full-body avatar is visible on your profile, leaderboard entries, community posts, and when visiting other players\' homes.' },
      { type: 'heading', text: 'Priority & Override Rules' },
      { type: 'paragraph', text: 'When manual customization conflicts with reactive automation:' },
      { type: 'step', text: 'Manual choices always take priority over automated suggestions' },
      { type: 'step', text: 'Automated changes only apply to slots you haven\'t manually customized' },
      { type: 'step', text: 'You can lock any slot to prevent automatic changes' },
      { type: 'step', text: 'Resetting a slot returns it to the automation layer\'s default' },
      { type: 'tip', text: 'Experiment with different outfit combinations! Your avatar is how other players see you in the community, leaderboards, and home visits.' },
      { type: 'tip', text: 'Keep an eye on item condition - well-maintained items look better and last longer.' },
    ],
  },
  {
    id: 'voting',
    title: 'Voting Rights',
    subtitle: 'Understanding voting eligibility',
    icon: Crown,
    color: '#EC4899',
    gradient: ['#DB2777', '#EC4899'],
    content: [
      { type: 'heading', text: 'Who Can Vote?' },
      { type: 'paragraph', text: 'Voting in city elections requires you to be a legitimate resident of that city.' },
      { type: 'heading', text: 'Voting Requirements' },
      { type: 'step', text: 'You must own or rent your own property (not shared)' },
      { type: 'step', text: 'Shared residence holders cannot vote' },
      { type: 'step', text: 'You can only vote in one city per election cycle' },
      { type: 'heading', text: 'Home Residence' },
      { type: 'paragraph', text: 'If you own multiple properties, you must designate one as your "Home Residence" to determine which city you can vote in.' },
      { type: 'step', text: 'Go to Elections screen' },
      { type: 'step', text: 'Tap "Set Home Residence to Vote"' },
      { type: 'step', text: 'Select one of your owned properties' },
      { type: 'step', text: 'Confirm your selection' },
      { type: 'warning', text: 'You can only have ONE Home Residence at a time. Choose wisely!' },
      { type: 'heading', text: 'Election Cycles' },
      { type: 'paragraph', text: 'Each election cycle lasts 30 days. You can only vote once per city during each cycle.' },
      { type: 'tip', text: 'Upgrade from shared housing to your own rental or owned property to gain voting rights!' },
    ],
  },
];

export default function TutorialScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [currentSection, setCurrentSection] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const section = TUTORIAL_SECTIONS[currentSection];

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentSection, fadeAnim, slideAnim]);

  const goToSection = (index: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentSection(index);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const goNext = () => {
    if (currentSection < TUTORIAL_SECTIONS.length - 1) {
      goToSection(currentSection + 1);
    }
  };

  const goPrev = () => {
    if (currentSection > 0) {
      goToSection(currentSection - 1);
    }
  };

  const renderContent = (item: TutorialContent, index: number) => {
    switch (item.type) {
      case 'heading':
        return (
          <Text key={index} style={[styles.contentHeading, { color: colors.text }]}>
            {item.text}
          </Text>
        );
      case 'paragraph':
        return (
          <Text key={index} style={[styles.contentParagraph, { color: colors.textSecondary }]}>
            {item.text}
          </Text>
        );
      case 'step':
        return (
          <View key={index} style={styles.stepContainer}>
            <View style={[styles.stepDot, { backgroundColor: section.color }]} />
            <Text style={[styles.stepText, { color: colors.text }]}>{item.text}</Text>
          </View>
        );
      case 'tip':
        return (
          <View key={index} style={[styles.tipContainer, { backgroundColor: '#10B98115' }]}>
            <Sparkles size={16} color="#10B981" />
            <Text style={[styles.tipText, { color: '#10B981' }]}>{item.text}</Text>
          </View>
        );
      case 'warning':
        return (
          <View key={index} style={[styles.warningContainer, { backgroundColor: '#EF444415' }]}>
            <AlertTriangle size={16} color="#EF4444" />
            <Text style={[styles.warningText, { color: '#EF4444' }]}>{item.text}</Text>
          </View>
        );
      case 'highlight':
        return (
          <View key={index} style={[styles.highlightContainer, { backgroundColor: section.color + '15' }]}>
            <Star size={16} color={section.color} />
            <Text style={[styles.highlightText, { color: section.color }]}>{item.text}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Tutorial',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ChevronLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <LinearGradient
            colors={section.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerCard}
          >
            <View style={styles.headerIconContainer}>
              <section.icon size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>{section.title}</Text>
            <Text style={styles.headerSubtitle}>{section.subtitle}</Text>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {currentSection + 1} of {TUTORIAL_SECTIONS.length}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((currentSection + 1) / TUTORIAL_SECTIONS.length) * 100}%` },
                  ]}
                />
              </View>
            </View>
          </LinearGradient>

          <View style={styles.navigationTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TUTORIAL_SECTIONS.map((sec, index) => (
                <TouchableOpacity
                  key={sec.id}
                  style={[
                    styles.navTab,
                    { backgroundColor: colors.surface },
                    currentSection === index && { backgroundColor: sec.color + '20', borderColor: sec.color },
                  ]}
                  onPress={() => goToSection(index)}
                >
                  <sec.icon size={16} color={currentSection === index ? sec.color : colors.textSecondary} />
                  <Text
                    style={[
                      styles.navTabText,
                      { color: currentSection === index ? sec.color : colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {sec.title.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Animated.View
            style={[
              styles.contentContainer,
              { backgroundColor: colors.surface, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {section.content.map((item, index) => renderContent(item, index))}
          </Animated.View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[
                styles.navButton,
                { backgroundColor: colors.surface },
                currentSection === 0 && styles.navButtonDisabled,
              ]}
              onPress={goPrev}
              disabled={currentSection === 0}
            >
              <ChevronLeft size={20} color={currentSection === 0 ? colors.textLight : colors.primary} />
              <Text
                style={[
                  styles.navButtonText,
                  { color: currentSection === 0 ? colors.textLight : colors.primary },
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            {currentSection < TUTORIAL_SECTIONS.length - 1 ? (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary, { backgroundColor: section.color }]}
                onPress={goNext}
              >
                <Text style={styles.navButtonTextPrimary}>Next</Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary, { backgroundColor: '#10B981' }]}
                onPress={() => router.back()}
              >
                <Play size={18} color="#FFFFFF" />
                <Text style={styles.navButtonTextPrimary}>Start Playing!</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.quickJumpSection}>
            <Text style={[styles.quickJumpTitle, { color: colors.text }]}>Quick Jump</Text>
            <View style={styles.quickJumpGrid}>
              {TUTORIAL_SECTIONS.map((sec, index) => (
                <TouchableOpacity
                  key={sec.id}
                  style={[
                    styles.quickJumpItem,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    currentSection === index && { borderColor: sec.color, backgroundColor: sec.color + '10' },
                  ]}
                  onPress={() => goToSection(index)}
                >
                  <View
                    style={[
                      styles.quickJumpIcon,
                      { backgroundColor: sec.color + '20' },
                    ]}
                  >
                    <sec.icon size={18} color={sec.color} />
                  </View>
                  <Text
                    style={[
                      styles.quickJumpText,
                      { color: colors.text },
                      currentSection === index && { color: sec.color, fontWeight: '600' as const },
                    ]}
                    numberOfLines={2}
                  >
                    {sec.title}
                  </Text>
                  {currentSection === index && (
                    <View style={[styles.currentBadge, { backgroundColor: sec.color }]}>
                      <CheckCircle size={10} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerButton: {
    padding: 8,
  },
  headerCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  navigationTabs: {
    marginBottom: 16,
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  contentContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  contentHeading: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 16,
    marginBottom: 12,
  },
  contentParagraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 4,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginVertical: 8,
    gap: 10,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    fontWeight: '500' as const,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginVertical: 8,
    gap: 10,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    fontWeight: '500' as const,
  },
  highlightContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginVertical: 8,
    gap: 10,
  },
  highlightText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    fontWeight: '600' as const,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 6,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonPrimary: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  navButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  quickJumpSection: {
    marginBottom: 20,
  },
  quickJumpTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  quickJumpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickJumpItem: {
    width: (SCREEN_WIDTH - 52) / 3,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative' as const,
  },
  quickJumpIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickJumpText: {
    fontSize: 11,
    textAlign: 'center' as const,
    lineHeight: 14,
  },
  currentBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
