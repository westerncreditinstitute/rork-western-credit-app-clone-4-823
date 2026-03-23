/**
 * Character AI Types
 * ==================
 * TypeScript port of the hybrid_character_control Python framework types.
 * These types enable the NVIDIA ACE-inspired character AI system to run
 * natively in the React Native game without a Python backend.
 */

// ─────────────────────────────────────────────────────────────
// Emotion System
// ─────────────────────────────────────────────────────────────

export type EmotionType =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'surprise'
  | 'disgust'
  | 'trust'
  | 'anticipation'
  | 'stress'
  | 'confidence';

export interface EmotionState {
  emotions: Record<EmotionType, number>;
  dominantEmotion: EmotionType;
  moodValence: number; // -1.0 to 1.0
  emotionalVolatility: number;
}

export const DEFAULT_EMOTIONS: Record<EmotionType, number> = {
  joy: 0.3,
  sadness: 0.0,
  anger: 0.0,
  fear: 0.0,
  surprise: 0.0,
  disgust: 0.0,
  trust: 0.5,
  anticipation: 0.3,
  stress: 0.1,
  confidence: 0.5,
};

// ─────────────────────────────────────────────────────────────
// Character Configuration
// ─────────────────────────────────────────────────────────────

export interface PersonalityTraits {
  ambitious: number;
  cautious: number;
  honest: number;
  social: number;
  impulsive: number;
  optimistic: number;
  frugal: number;
  riskTolerant: number;
  stubborn?: number;
  proactive?: number;
  [key: string]: number | undefined;
}

export interface CharacterConfig {
  name: string;
  personalityTraits: PersonalityTraits;
  backstory: string;
  initialCreditScore: number;
  voiceStyle: 'formal' | 'casual' | 'street' | 'professional';
}

// ─────────────────────────────────────────────────────────────
// Player Intent (parsed from commands)
// ─────────────────────────────────────────────────────────────

export type IntentType =
  | 'command_action'
  | 'command_speak'
  | 'command_move'
  | 'set_goal'
  | 'set_priority'
  | 'set_behavior'
  | 'query_status'
  | 'query_advice'
  | 'interact_npc'
  | 'build_relationship'
  | 'unknown';

export interface PlayerIntent {
  rawInput: string;
  intentType: IntentType;
  target: string | null;
  action: string | null;
  parameters: Record<string, any>;
  confidence: number;
  urgency: number;
}

// ─────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────

export type ActionType =
  | 'apply_credit'
  | 'make_payment'
  | 'invest'
  | 'save'
  | 'purchase'
  | 'negotiate'
  | 'work'
  | 'job_search'
  | 'skill_up'
  | 'start_business'
  | 'speak'
  | 'visit'
  | 'network'
  | 'help_other'
  | 'study'
  | 'plan'
  | 'reflect'
  | 'rest';

export interface BehaviorAction {
  actionType: ActionType;
  description: string;
  confidence: number;
  urgency: number;
  target: string | null;
  parameters: Record<string, any>;
  emotionalImpact: Partial<Record<EmotionType, number>>;
}

// ─────────────────────────────────────────────────────────────
// Character Goals & Relationships
// ─────────────────────────────────────────────────────────────

export interface CharacterGoal {
  type: string;
  description: string;
  priority: number;
  progress: number;
  status: 'active' | 'completed' | 'abandoned';
  targetValue?: number;
}

export interface Relationship {
  npcId: string;
  trust: number;
  respect: number;
  familiarity: number;
  history: string[];
}

// ─────────────────────────────────────────────────────────────
// World Context (bridges game state to AI)
// ─────────────────────────────────────────────────────────────

export interface WorldContext {
  creditScore: number;
  bankBalance: number;
  savingsBalance: number;
  monthlyIncome: number;
  totalDebt: number;
  totalExpenses: number;
  debtToIncomeRatio: number;
  financialHealth: number;
  monthsPlayed: number;
  currentDate: number;
  recentEvents: string[];
  activeAccounts: number;
  ownedProperties: number;
}

// ─────────────────────────────────────────────────────────────
// Character Response (final output)
// ─────────────────────────────────────────────────────────────

export interface CharacterResponse {
  dialogue: string;
  innerThought: string;
  animationHint: string;
  action: BehaviorAction;
  emotionState: EmotionState;
  fusionResult: {
    playerWeight: number;
    aiWeight: number;
    complianceScore: number;
    fusionMode: 'player_led' | 'ai_led' | 'collaborative' | 'ai_override';
    reason: string;
  };
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────
// Fusion Config
// ─────────────────────────────────────────────────────────────

export interface FusionConfig {
  playerAuthorityBase: number;
  aiAutonomyBase: number;
  emotionalOverrideThreshold: number;
  enableInnerThoughts: boolean;
  enableActionHistory: boolean;
  autonomousActionCooldownMs: number;
}

export const DEFAULT_FUSION_CONFIG: FusionConfig = {
  playerAuthorityBase: 0.65,
  aiAutonomyBase: 0.35,
  emotionalOverrideThreshold: 0.7,
  enableInnerThoughts: true,
  enableActionHistory: true,
  autonomousActionCooldownMs: 10000,
};

// ─────────────────────────────────────────────────────────────
// Game Event Types (triggers emotional reactions)
// ─────────────────────────────────────────────────────────────

export type GameEventType =
  | 'credit_score_increased'
  | 'credit_score_decreased'
  | 'credit_score_change'
  | 'loan_approved'
  | 'loan_denied'
  | 'salary_received'
  | 'missed_payment'
  | 'on_time_payment'
  | 'payment_made'
  | 'payment_missed'
  | 'job_promotion'
  | 'job_loss'
  | 'investment_gain'
  | 'investment_loss'
  | 'property_purchased'
  | 'emergency_expense'
  | 'savings_milestone'
  | 'debt_paid_off'
  | 'business_started'
  | 'month_advanced';

// ─────────────────────────────────────────────────────────────
// Stimulus Map (event → emotional impact)
// ─────────────────────────────────────────────────────────────

export const STIMULUS_MAP: Record<string, Partial<Record<EmotionType, number>>> = {
  credit_score_increased: { joy: 0.4, confidence: 0.5, trust: 0.2 },
  credit_score_decreased: { sadness: 0.3, stress: 0.4, fear: 0.2 },
  loan_approved: { joy: 0.6, confidence: 0.4, trust: 0.3, anticipation: 0.3 },
  loan_denied: { sadness: 0.5, anger: 0.2, stress: 0.3, fear: 0.2 },
  salary_received: { joy: 0.3, confidence: 0.2, trust: 0.1 },
  missed_payment: { stress: 0.5, fear: 0.3, sadness: 0.3, anger: 0.1 },
  on_time_payment: { joy: 0.2, confidence: 0.3, trust: 0.2 },
  job_promotion: { joy: 0.7, confidence: 0.6, anticipation: 0.4 },
  job_loss: { fear: 0.6, sadness: 0.5, stress: 0.7, anger: 0.3 },
  investment_gain: { joy: 0.4, confidence: 0.3, anticipation: 0.2 },
  investment_loss: { sadness: 0.3, stress: 0.4, fear: 0.3 },
  property_purchased: { joy: 0.6, confidence: 0.4, anticipation: 0.5 },
  emergency_expense: { stress: 0.6, fear: 0.4, anger: 0.2 },
  savings_milestone: { joy: 0.5, confidence: 0.4, trust: 0.3 },
  debt_paid_off: { joy: 0.7, confidence: 0.5, trust: 0.3 },
  business_started: { joy: 0.5, anticipation: 0.6, confidence: 0.3, fear: 0.2 },
  month_advanced: { anticipation: 0.1 },
  positive_interaction: { joy: 0.15, trust: 0.1 },
  goal_set: { anticipation: 0.2, confidence: 0.1 },
  mild_stress: { stress: 0.1 },
  // Controller-generated stimuli
  player_command_comply: { trust: 0.1, joy: 0.05 },
  player_command_refuse: { anger: 0.1, stress: 0.1 },
  credit_score_up: { joy: 0.4, confidence: 0.5, trust: 0.2 },
  credit_score_down: { sadness: 0.3, stress: 0.4, fear: 0.2 },
};

// ─────────────────────────────────────────────────────────────
// Dialogue Templates
// ─────────────────────────────────────────────────────────────

export const DIALOGUE_TEMPLATES: Record<string, string[]> = {
  credit_score_increased: [
    "Yes! My credit score went up! All that discipline is paying off.",
    "Score's climbing! I knew staying on top of payments would work.",
    "Another step closer to that 800 club. Let's keep this momentum going!",
    "That credit score bump feels good. Hard work pays off.",
  ],
  credit_score_decreased: [
    "My score dropped... I need to figure out what went wrong.",
    "That's not good. My credit took a hit. Time to reassess.",
    "Ouch, score went down. I need to be more careful with my finances.",
    "A setback, but not the end. I'll bounce back from this.",
  ],
  loan_approved: [
    "They approved my loan! Time to put this money to good use.",
    "Loan approved! My credit history is finally working for me.",
    "Got the green light on the loan. Now the real work begins.",
    "Approved! I knew building that credit score would pay off.",
  ],
  loan_denied: [
    "Denied... They said my credit wasn't good enough. Back to the drawing board.",
    "Loan rejected. I need to work on my score before trying again.",
    "That stings. But I'll improve my profile and come back stronger.",
    "Not approved this time. Let me focus on what I can control.",
  ],
  salary_received: [
    "Payday! Time to budget wisely and stay on track.",
    "Got paid. Bills first, then savings, then maybe a small treat.",
    "Money's in. Let me make sure everything's allocated properly.",
    "Another paycheck, another chance to build my financial future.",
  ],
  missed_payment: [
    "I missed a payment... That's going to hurt my score.",
    "Forgot to pay that bill. I need to set up auto-pay.",
    "A missed payment. Can't let that happen again.",
    "That late payment is going to cost me. Need to be more organized.",
  ],
  on_time_payment: [
    "Payment made on time. Keeping that streak alive!",
    "Another bill paid on schedule. Consistency is key.",
    "On-time payment logged. My credit history thanks me.",
    "Paid and done. Building that positive payment history.",
  ],
  job_promotion: [
    "I got promoted! More income means more financial flexibility.",
    "Moving up! This raise is going to help my financial goals.",
    "Promotion secured! Time to increase my savings rate.",
    "New title, better pay. Let's not let lifestyle creep eat it up.",
  ],
  emergency_expense: [
    "An emergency expense hit. Good thing I've been building that fund.",
    "Unexpected cost... This is exactly why emergency savings matter.",
    "That was expensive. Need to rebuild my emergency fund now.",
    "Life threw a curveball. At least I had some savings to cushion it.",
  ],
  property_purchased: [
    "I'm a homeowner now! This is a huge milestone.",
    "Bought my first property! The mortgage is worth it for building equity.",
    "Property acquired. Real estate is a long game, but I'm in it.",
    "Keys in hand! Time to make this investment work for me.",
  ],
  debt_paid_off: [
    "Debt free on that account! One less thing to worry about.",
    "Paid it off completely! That feels incredible.",
    "Another debt eliminated. The snowball method works!",
    "Zero balance! Now I can redirect those payments to savings.",
  ],
  business_started: [
    "My own business! Scary but exciting. Let's make it work.",
    "Entrepreneur life begins now. Time to hustle smart.",
    "Business is officially launched! Revenue goals, here I come.",
    "Started my business. The financial risk is real, but so is the potential.",
  ],
  month_advanced: [
    "Another month in the books. Let me review how things went.",
    "New month, new opportunities. What should I focus on?",
    "Time flies. Let me check my progress on those goals.",
    "Month's over. Time to plan the next one strategically.",
  ],
  status_report: [
    "Let me check where things stand financially...",
    "Here's the rundown on my current situation.",
    "Time for a financial health check.",
    "Let me pull up the numbers and see where we're at.",
  ],
  giving_advice: [
    "Let me think about what would be the best move here...",
    "Based on my situation, I think we should consider...",
    "Here's what I'm thinking we should focus on...",
    "Looking at the big picture, my advice would be...",
  ],
  idle: [
    "Just thinking about my next financial move...",
    "Wondering if I should check my credit report...",
    "Maybe I should look into some investment options.",
    "I should probably review my budget soon.",
  ],
  // Command responses
  comply: [
    "On it! Let me {action} right away.",
    "Got it, I'll {action}. Wish me luck!",
    "Understood. {action} - here I go.",
    "Alright, let's {action}!",
  ],
  question: [
    "Are you sure about that? It seems a bit risky.",
    "I'll do it if you insist, but my gut says we should think this through.",
    "Hmm, that's a bold move. Want me to go ahead anyway?",
    "I have some concerns about that. Should we reconsider?",
  ],
  refuse: [
    "I don't think that's a good idea right now. Let me suggest something else.",
    "Sorry, but I can't do that in good conscience. Here's what I'd do instead.",
    "That goes against my better judgment. How about we try a different approach?",
    "I'm going to have to pass on that one. My financial instincts say no.",
  ],
};

// ─────────────────────────────────────────────────────────────
// Action Catalog
// ─────────────────────────────────────────────────────────────

export interface ActionDefinition {
  actionType: ActionType;
  description: string;
  baseScore: number;
  riskLevel: number;
  successProbability: number;
  personalityWeights: Partial<Record<string, number>>;
  emotionWeights: Partial<Record<EmotionType, number>>;
  emotionalImpact: Partial<Record<EmotionType, number>>;
}

export const ACTION_CATALOG: ActionDefinition[] = [
  {
    actionType: 'apply_credit',
    description: 'Apply for a new credit account',
    baseScore: 0.5,
    riskLevel: 0.4,
    successProbability: 0.7,
    personalityWeights: { ambitious: 0.3, riskTolerant: 0.2 },
    emotionWeights: { confidence: 0.3, anticipation: 0.2 },
    emotionalImpact: { anticipation: 0.3, stress: 0.1 },
  },
  {
    actionType: 'make_payment',
    description: 'Make a bill or debt payment',
    baseScore: 0.7,
    riskLevel: 0.0,
    successProbability: 0.95,
    personalityWeights: { honest: 0.3, cautious: 0.2 },
    emotionWeights: { stress: -0.2, trust: 0.2 },
    emotionalImpact: { confidence: 0.2, stress: -0.1 },
  },
  {
    actionType: 'save',
    description: 'Put money into savings',
    baseScore: 0.6,
    riskLevel: 0.0,
    successProbability: 0.95,
    personalityWeights: { frugal: 0.4, cautious: 0.3 },
    emotionWeights: { fear: 0.1, trust: 0.2 },
    emotionalImpact: { confidence: 0.2, trust: 0.1 },
  },
  {
    actionType: 'invest',
    description: 'Make an investment',
    baseScore: 0.4,
    riskLevel: 0.5,
    successProbability: 0.6,
    personalityWeights: { ambitious: 0.3, riskTolerant: 0.4 },
    emotionWeights: { confidence: 0.3, anticipation: 0.3 },
    emotionalImpact: { anticipation: 0.3, stress: 0.1 },
  },
  {
    actionType: 'study',
    description: 'Study financial literacy',
    baseScore: 0.5,
    riskLevel: 0.0,
    successProbability: 0.9,
    personalityWeights: { cautious: 0.2, ambitious: 0.2 },
    emotionWeights: { confidence: 0.1, anticipation: 0.1 },
    emotionalImpact: { confidence: 0.2, anticipation: 0.1 },
  },
  {
    actionType: 'job_search',
    description: 'Look for a better job',
    baseScore: 0.4,
    riskLevel: 0.2,
    successProbability: 0.5,
    personalityWeights: { ambitious: 0.4, proactive: 0.3 },
    emotionWeights: { stress: 0.1, anticipation: 0.2 },
    emotionalImpact: { anticipation: 0.3, stress: 0.1 },
  },
  {
    actionType: 'plan',
    description: 'Create or review financial plan',
    baseScore: 0.5,
    riskLevel: 0.0,
    successProbability: 0.95,
    personalityWeights: { cautious: 0.3, honest: 0.2 },
    emotionWeights: { stress: -0.1, confidence: 0.1 },
    emotionalImpact: { confidence: 0.2, stress: -0.1 },
  },
  {
    actionType: 'rest',
    description: 'Take a break and recharge',
    baseScore: 0.3,
    riskLevel: 0.0,
    successProbability: 1.0,
    personalityWeights: {},
    emotionWeights: { stress: 0.3 },
    emotionalImpact: { stress: -0.3, joy: 0.1 },
  },
  {
    actionType: 'negotiate',
    description: 'Negotiate better terms or rates',
    baseScore: 0.4,
    riskLevel: 0.2,
    successProbability: 0.5,
    personalityWeights: { ambitious: 0.2, social: 0.3 },
    emotionWeights: { confidence: 0.3 },
    emotionalImpact: { confidence: 0.2, stress: 0.1 },
  },
  {
    actionType: 'reflect',
    description: 'Think about the current situation',
    baseScore: 0.3,
    riskLevel: 0.0,
    successProbability: 1.0,
    personalityWeights: { cautious: 0.2 },
    emotionWeights: { stress: 0.1 },
    emotionalImpact: { confidence: 0.1 },
  },
];

// ─────────────────────────────────────────────────────────────
// Intent Patterns (for command parsing)
// ─────────────────────────────────────────────────────────────

export const INTENT_PATTERNS: { pattern: RegExp; intentType: IntentType }[] = [
  { pattern: /\b(apply|get|open|sign up)\b.*\b(credit|card|loan|account|mortgage)\b/i, intentType: 'command_action' },
  { pattern: /\b(pay|payment|settle|clear)\b.*\b(bill|debt|loan|balance|card)\b/i, intentType: 'command_action' },
  { pattern: /\b(save|deposit|put|transfer)\b.*\b(money|savings|bank|fund)\b/i, intentType: 'command_action' },
  { pattern: /\b(invest|buy|purchase)\b.*\b(stock|bond|property|crypto|fund)\b/i, intentType: 'command_action' },
  { pattern: /\b(check|look|view|show|what)\b.*\b(score|credit|status|balance|report)\b/i, intentType: 'query_status' },
  { pattern: /\b(how|what should|advice|suggest|recommend)\b/i, intentType: 'query_advice' },
  { pattern: /\b(set|create|add)\b.*\b(goal|target|objective)\b/i, intentType: 'set_goal' },
  { pattern: /\b(focus|prioritize|priority)\b/i, intentType: 'set_priority' },
  { pattern: /\b(go|visit|travel|move|head)\b/i, intentType: 'command_move' },
  { pattern: /\b(talk|speak|say|tell|ask)\b/i, intentType: 'command_speak' },
  { pattern: /\b(negotiate|bargain|haggle)\b/i, intentType: 'command_action' },
  { pattern: /\b(work|job|career|search|find.*job)\b/i, intentType: 'command_action' },
  { pattern: /\b(study|learn|educate|course)\b/i, intentType: 'command_action' },
  { pattern: /\b(budget|plan|review)\b.*\b(finance|money|spending)\b/i, intentType: 'command_action' },
  { pattern: /\b(start|launch|open)\b.*\b(business|company|shop)\b/i, intentType: 'command_action' },
];

export const ACTION_KEYWORDS: Record<string, ActionType> = {
  apply: 'apply_credit',
  credit: 'apply_credit',
  loan: 'apply_credit',
  mortgage: 'apply_credit',
  pay: 'make_payment',
  payment: 'make_payment',
  bill: 'make_payment',
  settle: 'make_payment',
  save: 'save',
  savings: 'save',
  deposit: 'save',
  invest: 'invest',
  stock: 'invest',
  bond: 'invest',
  job: 'job_search',
  career: 'job_search',
  work: 'work',
  study: 'study',
  learn: 'study',
  course: 'study',
  plan: 'plan',
  budget: 'plan',
  review: 'plan',
  negotiate: 'negotiate',
  business: 'start_business',
  rest: 'rest',
  relax: 'rest',
  break: 'rest',
};

// ─────────────────────────────────────────────────────────────
// Voice Style Modifiers
// ─────────────────────────────────────────────────────────────

export const VOICE_MODIFIERS: Record<string, { prefixes: string[]; fillers: string[] }> = {
  formal: {
    prefixes: ['Indeed,', 'Certainly,', 'I believe', 'It appears,', 'Understood.'],
    fillers: ['perhaps', 'certainly', 'indeed', 'quite'],
  },
  casual: {
    prefixes: ['Hey,', 'So,', 'Well,', 'Alright,', 'Cool,'],
    fillers: ['like', 'you know', 'honestly', 'basically'],
  },
  street: {
    prefixes: ['Yo,', 'Aight,', 'Look,', 'Real talk,', 'Bet,'],
    fillers: ['fr', 'no cap', 'straight up', 'lowkey'],
  },
  professional: {
    prefixes: ['Based on my analysis,', 'Strategically speaking,', 'From a financial perspective,', 'Let me assess this.'],
    fillers: ['strategically', 'fundamentally', 'essentially', 'optimally'],
  },
};