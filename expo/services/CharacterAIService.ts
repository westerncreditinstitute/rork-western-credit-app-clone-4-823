/**
 * CharacterAIService
 * ==================
 * TypeScript port of the hybrid_character_control Python framework.
 * Implements the NVIDIA ACE-inspired character AI system natively
 * for React Native, combining:
 *   - Emotion Engine (stimulus-response with decay)
 *   - Behavior System (utility-based action selection)
 *   - Conversational AI (template-based dialogue generation)
 *   - Player Input Handler (regex-based NLP)
 *   - Hybrid Controller (decision fusion orchestrator)
 *
 * All logic runs client-side — no Python backend required.
 */

import {
  EmotionType,
  EmotionState,
  DEFAULT_EMOTIONS,
  PersonalityTraits,
  CharacterConfig,
  IntentType,
  PlayerIntent,
  ActionType,
  BehaviorAction,
  CharacterGoal,
  Relationship,
  WorldContext,
  CharacterResponse,
  FusionConfig,
  DEFAULT_FUSION_CONFIG,
  GameEventType,
  STIMULUS_MAP,
  DIALOGUE_TEMPLATES,
  ACTION_CATALOG,
  ActionDefinition,
  INTENT_PATTERNS,
  ACTION_KEYWORDS,
  VOICE_MODIFIERS,
} from '@/types/characterAI';

// ─────────────────────────────────────────────────────────────
// Utility Helpers
// ─────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function gaussianNoise(mean = 0, stddev = 0.05): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

// ─────────────────────────────────────────────────────────────
// Emotion Engine
// ─────────────────────────────────────────────────────────────

export class EmotionEngine {
  private emotions: Record<EmotionType, number>;
  private personality: PersonalityTraits;
  private decayRates: Record<EmotionType, number>;
  private history: Array<{ stimulus: string; timestamp: number; impacts: Partial<Record<EmotionType, number>> }>;

  constructor(personality: PersonalityTraits, initialEmotions?: Partial<Record<EmotionType, number>>) {
    this.personality = personality;
    this.emotions = { ...DEFAULT_EMOTIONS, ...initialEmotions };
    this.history = [];

    // Personality-influenced decay rates
    const baseDecay = 0.05;
    this.decayRates = {
      joy: baseDecay * (1 + (personality.optimistic ?? 0.5) * 0.3),
      sadness: baseDecay * (1 - (personality.optimistic ?? 0.5) * 0.2),
      anger: baseDecay * (1 - (personality.stubborn ?? 0.5) * 0.3),
      fear: baseDecay * (1 + (personality.cautious ?? 0.5) * 0.2),
      surprise: baseDecay * 2.0, // surprise decays fast
      disgust: baseDecay * 1.2,
      trust: baseDecay * 0.5, // trust changes slowly
      anticipation: baseDecay * 1.5,
      stress: baseDecay * (1 - (personality.cautious ?? 0.5) * 0.3),
      confidence: baseDecay * 0.4, // confidence is sticky
    };
  }

  /**
   * Apply an emotional stimulus with personality modulation.
   */
  applyStimulus(
    stimulus: string,
    intensity: number = 1.0,
    source: string = 'game',
    customImpacts?: Partial<Record<EmotionType, number>>
  ): void {
    const impacts = customImpacts ?? STIMULUS_MAP[stimulus] ?? {};
    const modulatedImpacts: Partial<Record<EmotionType, number>> = {};

    for (const [emotionKey, delta] of Object.entries(impacts)) {
      const emotion = emotionKey as EmotionType;
      let modulatedDelta = (delta as number) * intensity;

      // Personality modulation
      if (emotion === 'fear') {
        modulatedDelta *= (1 + (this.personality.cautious ?? 0.5) * 0.5);
      }
      if (emotion === 'anger') {
        modulatedDelta *= (1 + (this.personality.stubborn ?? 0.5) * 0.3);
      }
      if (emotion === 'joy') {
        modulatedDelta *= (1 + (this.personality.optimistic ?? 0.5) * 0.4);
      }
      if (emotion === 'stress') {
        modulatedDelta *= (1 - (this.personality.riskTolerant ?? 0.5) * 0.3);
      }
      if (emotion === 'confidence') {
        modulatedDelta *= (1 + (this.personality.ambitious ?? 0.5) * 0.3);
      }

      // Add noise for natural variation
      modulatedDelta += gaussianNoise(0, Math.abs(modulatedDelta) * 0.1);

      this.emotions[emotion] = clamp(
        this.emotions[emotion] + modulatedDelta,
        0,
        1
      );
      modulatedImpacts[emotion] = modulatedDelta;
    }

    this.history.push({
      stimulus,
      timestamp: Date.now(),
      impacts: modulatedImpacts,
    });

    // Keep history manageable
    if (this.history.length > 50) {
      this.history = this.history.slice(-30);
    }
  }

  /**
   * Decay emotions toward baseline over time.
   */
  decayEmotions(deltaTime: number = 1.0): void {
    const baseline = DEFAULT_EMOTIONS;
    for (const emotionKey of Object.keys(this.emotions) as EmotionType[]) {
      const current = this.emotions[emotionKey];
      const target = baseline[emotionKey];
      const rate = this.decayRates[emotionKey];
      const decay = rate * deltaTime;

      if (current > target) {
        this.emotions[emotionKey] = Math.max(target, current - decay);
      } else if (current < target) {
        this.emotions[emotionKey] = Math.min(target, current + decay);
      }
    }
  }

  /**
   * Get the current emotional context for other systems.
   */
  getEmotionalContext(): {
    emotions: Record<EmotionType, number>;
    dominant: EmotionType;
    valence: number;
    arousal: number;
    volatility: number;
  } {
    const state = this.getCurrentState();
    // Calculate arousal from high-energy emotions
    const arousal = clamp(
      (this.emotions.anger + this.emotions.fear + this.emotions.surprise + this.emotions.anticipation) / 4,
      0,
      1
    );
    // Calculate volatility from recent history
    const recentHistory = this.history.filter(h => Date.now() - h.timestamp < 60000);
    const volatility = clamp(recentHistory.length / 10, 0, 1);

    return {
      emotions: { ...this.emotions },
      dominant: state.dominantEmotion,
      valence: state.moodValence,
      arousal,
      volatility,
    };
  }

  /**
   * Get the full emotion state snapshot.
   */
  getCurrentState(): EmotionState {
    // Find dominant emotion
    let dominant: EmotionType = 'joy';
    let maxVal = -1;
    for (const [key, val] of Object.entries(this.emotions)) {
      if (val > maxVal) {
        maxVal = val;
        dominant = key as EmotionType;
      }
    }

    // Calculate mood valence: positive emotions minus negative
    const positive = this.emotions.joy + this.emotions.trust + this.emotions.confidence + this.emotions.anticipation;
    const negative = this.emotions.sadness + this.emotions.anger + this.emotions.fear + this.emotions.disgust + this.emotions.stress;
    const valence = clamp((positive - negative) / 5, -1, 1);

    // Volatility from recent changes
    const recentHistory = this.history.filter(h => Date.now() - h.timestamp < 60000);
    const volatility = clamp(recentHistory.length / 10, 0, 1);

    return {
      emotions: { ...this.emotions },
      dominantEmotion: dominant,
      moodValence: valence,
      emotionalVolatility: volatility,
    };
  }

  /**
   * Get raw emotion values (for direct access).
   */
  getEmotions(): Record<EmotionType, number> {
    return { ...this.emotions };
  }
}

// ─────────────────────────────────────────────────────────────
// Player Input Handler
// ─────────────────────────────────────────────────────────────

export class PlayerInputHandler {
  /**
   * Parse raw player text input into a structured PlayerIntent.
   */
  static parse(rawInput: string): PlayerIntent {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return {
        rawInput: trimmed,
        intentType: 'unknown',
        target: null,
        action: null,
        parameters: {},
        confidence: 0,
        urgency: 0.5,
      };
    }

    const lower = trimmed.toLowerCase();

    // Match against intent patterns
    let intentType: IntentType = 'unknown';
    let confidence = 0.3;

    for (const { pattern, intentType: matchedType } of INTENT_PATTERNS) {
      if (pattern.test(lower)) {
        intentType = matchedType;
        confidence = 0.8;
        break;
      }
    }

    // Extract action keyword
    let action: string | null = null;
    let actionType: ActionType | null = null;
    const words = lower.split(/\s+/);
    for (const word of words) {
      if (ACTION_KEYWORDS[word]) {
        action = word;
        actionType = ACTION_KEYWORDS[word];
        break;
      }
    }

    // Extract target (look for "the <target>" or proper nouns)
    let target: string | null = null;
    const targetMatch = lower.match(/(?:the|my|a|an)\s+(\w+(?:\s+\w+)?)/);
    if (targetMatch) {
      target = targetMatch[1];
    }

    // Detect urgency from language
    let urgency = 0.5;
    if (/\b(now|immediately|urgent|asap|quick|hurry)\b/i.test(lower)) {
      urgency = 0.9;
    } else if (/\b(maybe|perhaps|sometime|eventually|consider)\b/i.test(lower)) {
      urgency = 0.3;
    }

    // Extract numeric parameters
    const parameters: Record<string, any> = {};
    const amountMatch = lower.match(/\$?([\d,]+(?:\.\d{2})?)/);
    if (amountMatch) {
      parameters.amount = parseFloat(amountMatch[1].replace(',', ''));
    }
    if (actionType) {
      parameters.actionType = actionType;
    }

    return {
      rawInput: trimmed,
      intentType,
      target,
      action,
      parameters,
      confidence,
      urgency,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Behavior System
// ─────────────────────────────────────────────────────────────

export class BehaviorSystem {
  private personality: PersonalityTraits;
  private recentActions: BehaviorAction[];

  constructor(personality: PersonalityTraits) {
    this.personality = personality;
    this.recentActions = [];
  }

  /**
   * Select the best autonomous action using utility scoring.
   */
  selectAction(
    emotionContext: ReturnType<EmotionEngine['getEmotionalContext']>,
    worldContext: WorldContext,
    activeGoals: CharacterGoal[],
    playerIntent?: PlayerIntent | null
  ): BehaviorAction {
    const scoredActions: Array<{ action: ActionDefinition; score: number }> = [];

    for (const actionDef of ACTION_CATALOG) {
      let score = actionDef.baseScore;

      // Personality weighting
      for (const [trait, weight] of Object.entries(actionDef.personalityWeights)) {
        const traitValue = this.personality[trait] ?? 0.5;
        score += (traitValue as number) * (weight as number);
      }

      // Emotion weighting
      for (const [emotion, weight] of Object.entries(actionDef.emotionWeights)) {
        const emotionValue = emotionContext.emotions[emotion as EmotionType] ?? 0;
        score += emotionValue * (weight as number);
      }

      // World context adjustments
      score = this.applyWorldContextModifiers(score, actionDef, worldContext);

      // Goal alignment bonus
      for (const goal of activeGoals) {
        if (this.actionAlignedWithGoal(actionDef.actionType, goal)) {
          score += 0.2 * goal.priority;
        }
      }

      // Player intent alignment
      if (playerIntent?.parameters?.actionType === actionDef.actionType) {
        score += 0.3;
      }

      // Variety penalty (avoid repeating same action)
      const recentSameAction = this.recentActions.filter(
        a => a.actionType === actionDef.actionType
      ).length;
      score -= recentSameAction * 0.15;

      // Risk adjustment
      if (this.personality.riskTolerant !== undefined) {
        if (actionDef.riskLevel > 0.3 && this.personality.riskTolerant < 0.4) {
          score -= 0.2;
        } else if (actionDef.riskLevel > 0.3 && this.personality.riskTolerant > 0.6) {
          score += 0.1;
        }
      }

      scoredActions.push({ action: actionDef, score });
    }

    // Sort by score descending
    scoredActions.sort((a, b) => b.score - a.score);

    // Pick from top 3 with weighted randomness
    const topActions = scoredActions.slice(0, 3);
    const totalScore = topActions.reduce((sum, a) => sum + Math.max(a.score, 0.01), 0);
    let rand = Math.random() * totalScore;
    let selected = topActions[0];
    for (const candidate of topActions) {
      rand -= Math.max(candidate.score, 0.01);
      if (rand <= 0) {
        selected = candidate;
        break;
      }
    }

    const behaviorAction: BehaviorAction = {
      actionType: selected.action.actionType,
      description: selected.action.description,
      confidence: clamp(selected.score, 0, 1),
      urgency: this.calculateUrgency(selected.action, worldContext),
      target: playerIntent?.target ?? null,
      parameters: { ...playerIntent?.parameters },
      emotionalImpact: selected.action.emotionalImpact,
    };

    // Track recent actions
    this.recentActions.push(behaviorAction);
    if (this.recentActions.length > 10) {
      this.recentActions = this.recentActions.slice(-5);
    }

    return behaviorAction;
  }

  /**
   * Evaluate whether the character will comply with a player command.
   * Returns [willComply, complianceScore, reason].
   */
  evaluatePlayerCommandCompliance(
    playerIntent: PlayerIntent,
    emotionContext: ReturnType<EmotionEngine['getEmotionalContext']>,
    worldContext: WorldContext
  ): [boolean, number, string] {
    let complianceScore = 0.5;
    let reason = '';

    // Base compliance from personality
    const obedience = 1 - (this.personality.stubborn ?? 0.5);
    complianceScore += obedience * 0.3;

    // Trust affects compliance
    complianceScore += emotionContext.emotions.trust * 0.2;

    // Anger reduces compliance
    complianceScore -= emotionContext.emotions.anger * 0.3;

    // Fear can increase compliance (intimidation) or decrease (flight)
    if (emotionContext.emotions.fear > 0.5) {
      complianceScore -= 0.1;
    }

    // Confidence affects willingness to push back
    if (emotionContext.emotions.confidence > 0.7) {
      complianceScore -= 0.1; // More confident = more likely to disagree
    }

    // Check if action is financially dangerous
    const actionType = playerIntent.parameters?.actionType as ActionType | undefined;
    if (actionType) {
      const actionDef = ACTION_CATALOG.find(a => a.actionType === actionType);
      if (actionDef && actionDef.riskLevel > 0.5) {
        if (this.personality.cautious > 0.6) {
          complianceScore -= 0.2;
          reason = 'This seems too risky for my comfort level.';
        }
        if (worldContext.financialHealth < 0.3) {
          complianceScore -= 0.3;
          reason = "We can't afford to take risks right now.";
        }
      }
    }

    // Stress reduces willingness to take on more
    if (emotionContext.emotions.stress > 0.7) {
      complianceScore -= 0.15;
      reason = reason || "I'm too stressed to take that on right now.";
    }

    complianceScore = clamp(complianceScore, 0, 1);

    // Determine compliance threshold
    const willComply = complianceScore >= 0.45;

    if (willComply && !reason) {
      reason = 'Sounds like a plan!';
    } else if (!willComply && !reason) {
      reason = "I don't think that's the best move right now.";
    }

    return [willComply, complianceScore, reason];
  }

  private applyWorldContextModifiers(
    score: number,
    actionDef: ActionDefinition,
    worldContext: WorldContext
  ): number {
    let modified = score;

    // Financial health influences
    if (worldContext.financialHealth < 0.3) {
      // In financial trouble
      if (actionDef.actionType === 'make_payment') modified += 0.3;
      if (actionDef.actionType === 'save') modified -= 0.1;
      if (actionDef.actionType === 'invest') modified -= 0.3;
      if (actionDef.actionType === 'job_search') modified += 0.2;
      if (actionDef.actionType === 'rest') modified -= 0.2;
    } else if (worldContext.financialHealth > 0.7) {
      // Financially healthy
      if (actionDef.actionType === 'invest') modified += 0.2;
      if (actionDef.actionType === 'save') modified += 0.1;
      if (actionDef.actionType === 'apply_credit') modified += 0.1;
    }

    // Credit score influences
    if (worldContext.creditScore < 580) {
      if (actionDef.actionType === 'apply_credit') modified -= 0.3;
      if (actionDef.actionType === 'plan') modified += 0.2;
      if (actionDef.actionType === 'study') modified += 0.2;
    } else if (worldContext.creditScore > 740) {
      if (actionDef.actionType === 'apply_credit') modified += 0.2;
      if (actionDef.actionType === 'negotiate') modified += 0.15;
    }

    // Debt ratio influences
    if (worldContext.debtToIncomeRatio > 0.5) {
      if (actionDef.actionType === 'make_payment') modified += 0.3;
      if (actionDef.actionType === 'apply_credit') modified -= 0.2;
    }

    return modified;
  }

  private actionAlignedWithGoal(actionType: ActionType, goal: CharacterGoal): boolean {
    const alignmentMap: Record<string, ActionType[]> = {
      improve_credit: ['make_payment', 'plan', 'study'],
      save_money: ['save', 'plan'],
      get_promoted: ['study', 'job_search'],
      buy_property: ['save', 'apply_credit', 'plan'],
      start_business: ['start_business', 'save', 'study'],
      reduce_debt: ['make_payment', 'negotiate', 'plan'],
      build_emergency_fund: ['save'],
      invest: ['invest', 'study'],
    };

    const aligned = alignmentMap[goal.type] ?? [];
    return aligned.includes(actionType);
  }

  private calculateUrgency(actionDef: ActionDefinition, worldContext: WorldContext): number {
    let urgency = 0.5;

    if (actionDef.actionType === 'make_payment' && worldContext.debtToIncomeRatio > 0.5) {
      urgency = 0.9;
    }
    if (actionDef.actionType === 'job_search' && worldContext.financialHealth < 0.2) {
      urgency = 0.85;
    }
    if (actionDef.actionType === 'rest' && worldContext.financialHealth > 0.5) {
      urgency = 0.3;
    }

    return clamp(urgency, 0, 1);
  }
}

// ─────────────────────────────────────────────────────────────
// Conversational AI
// ─────────────────────────────────────────────────────────────

export class ConversationalAI {
  private voiceStyle: 'formal' | 'casual' | 'street' | 'professional';
  private personality: PersonalityTraits;
  private characterName: string;

  constructor(config: CharacterConfig) {
    this.voiceStyle = config.voiceStyle;
    this.personality = config.personalityTraits;
    this.characterName = config.name;
  }

  /**
   * Generate a contextual dialogue response.
   */
  generateResponse(
    situation: string,
    emotionContext: ReturnType<EmotionEngine['getEmotionalContext']>,
    worldContext: WorldContext,
    _playerIntent?: PlayerIntent | null,
    _additionalContext?: Record<string, any>
  ): { dialogue: string; innerThought: string; animationHint: string } {
    // Select template based on situation
    const templates = DIALOGUE_TEMPLATES[situation] ?? DIALOGUE_TEMPLATES['idle'];
    let dialogue = pickRandom(templates);

    // Apply voice style
    dialogue = this.applyVoiceStyle(dialogue);

    // Apply emotional modulation
    dialogue = this.applyEmotionalModulation(dialogue, emotionContext);

    // Generate inner thought
    const innerThought = this.generateInnerThought(situation, emotionContext, worldContext);

    // Determine animation hint
    const animationHint = this.getAnimationHint(situation, emotionContext);

    return { dialogue, innerThought, animationHint };
  }

  /**
   * Generate a response to a player command (comply/question/refuse).
   */
  generateCommandResponse(
    playerIntent: PlayerIntent,
    emotionContext: ReturnType<EmotionEngine['getEmotionalContext']>,
    willComply: boolean,
    _worldContext: WorldContext
  ): { dialogue: string; innerThought: string; animationHint: string } {
    let responseType: string;
    if (willComply) {
      responseType = 'comply';
    } else if (emotionContext.emotions.trust > 0.4) {
      responseType = 'question';
    } else {
      responseType = 'refuse';
    }

    const templates = DIALOGUE_TEMPLATES[responseType] ?? DIALOGUE_TEMPLATES['idle'];
    let dialogue = pickRandom(templates);

    // Replace {action} placeholder
    if (playerIntent.action) {
      dialogue = dialogue.replace('{action}', playerIntent.action);
    } else {
      dialogue = dialogue.replace('{action}', 'handle that');
    }

    dialogue = this.applyVoiceStyle(dialogue);
    dialogue = this.applyEmotionalModulation(dialogue, emotionContext);

    const innerThought = this.generateCommandInnerThought(
      playerIntent,
      willComply,
      emotionContext
    );

    const animationHint = willComply ? 'nod' : emotionContext.emotions.anger > 0.5 ? 'shake_head' : 'think';

    return { dialogue, innerThought, animationHint };
  }

  private applyVoiceStyle(dialogue: string): string {
    const modifiers = VOICE_MODIFIERS[this.voiceStyle];
    if (!modifiers) return dialogue;

    // 30% chance to add a prefix
    if (Math.random() < 0.3) {
      const prefix = pickRandom(modifiers.prefixes);
      dialogue = `${prefix} ${dialogue.charAt(0).toLowerCase()}${dialogue.slice(1)}`;
    }

    // 20% chance to insert a filler word
    if (Math.random() < 0.2) {
      const filler = pickRandom(modifiers.fillers);
      const words = dialogue.split(' ');
      const insertPos = Math.floor(words.length / 3) + 1;
      if (insertPos < words.length) {
        words.splice(insertPos, 0, filler);
        dialogue = words.join(' ');
      }
    }

    return dialogue;
  }

  private applyEmotionalModulation(
    dialogue: string,
    emotionContext: ReturnType<EmotionEngine['getEmotionalContext']>
  ): string {
    // Add emotional punctuation
    if (emotionContext.emotions.joy > 0.7) {
      if (!dialogue.endsWith('!')) {
        dialogue = dialogue.replace(/\.$/, '!');
      }
    }
    if (emotionContext.emotions.sadness > 0.6) {
      dialogue = dialogue.replace(/!$/, '...');
    }
    if (emotionContext.emotions.stress > 0.7) {
      // Add hesitation
      if (Math.random() < 0.3) {
        dialogue = `*sighs* ${dialogue}`;
      }
    }
    if (emotionContext.emotions.confidence > 0.8) {
      if (Math.random() < 0.3) {
        dialogue = `${dialogue} I've got this.`;
      }
    }

    return dialogue;
  }

  private generateInnerThought(
    situation: string,
    emotionContext: ReturnType<EmotionEngine['getEmotionalContext']>,
    worldContext: WorldContext
  ): string {
    const dominant = emotionContext.dominant;
    const health = worldContext.financialHealth;

    const thoughts: string[] = [];

    if (dominant === 'stress' && health < 0.3) {
      thoughts.push('I need to get my finances under control...');
    } else if (dominant === 'joy' && health > 0.7) {
      thoughts.push('Things are really looking up financially!');
    } else if (dominant === 'fear') {
      thoughts.push("What if things don't work out?");
    } else if (dominant === 'confidence') {
      thoughts.push("I'm on the right track. Keep going.");
    } else if (dominant === 'anger') {
      thoughts.push("This isn't fair, but I'll push through.");
    }

    // Situation-specific thoughts
    if (situation === 'missed_payment') {
      thoughts.push('I really need to set up reminders...');
    } else if (situation === 'loan_approved') {
      thoughts.push('My hard work on credit is paying off!');
    } else if (situation === 'emergency_expense') {
      thoughts.push('This is why emergency funds matter.');
    }

    if (thoughts.length === 0) {
      thoughts.push('Just taking things one step at a time.');
    }

    return pickRandom(thoughts);
  }

  private generateCommandInnerThought(
    playerIntent: PlayerIntent,
    willComply: boolean,
    emotionContext: ReturnType<EmotionEngine['getEmotionalContext']>
  ): string {
    if (willComply) {
      if (emotionContext.emotions.trust > 0.6) {
        return "The player knows what they're doing. Let's go with it.";
      }
      return "I'll follow along, but I'll keep an eye on things.";
    } else {
      if (emotionContext.emotions.anger > 0.5) {
        return "No way. That's a terrible idea and I won't do it.";
      }
      return "I don't think that's wise. I should suggest an alternative.";
    }
  }

  private getAnimationHint(
    situation: string,
    _emotionContext: ReturnType<EmotionEngine['getEmotionalContext']>
  ): string {
    const animationMap: Record<string, string> = {
      credit_score_increased: 'celebrate',
      credit_score_decreased: 'disappointed',
      credit_score_up: 'celebrate',
      credit_score_down: 'disappointed',
      loan_approved: 'celebrate',
      loan_denied: 'disappointed',
      salary_received: 'happy',
      missed_payment: 'worried',
      on_time_payment: 'satisfied',
      job_promotion: 'celebrate',
      emergency_expense: 'shocked',
      property_purchased: 'celebrate',
      debt_paid_off: 'celebrate',
      business_started: 'excited',
      month_advanced: 'neutral',
      status_report: 'thinking',
      giving_advice: 'thinking',
      idle: 'idle',
    };

    return animationMap[situation] ?? 'neutral';
  }
}

// ─────────────────────────────────────────────────────────────
// Character State Manager
// ─────────────────────────────────────────────────────────────

export class CharacterStateManager {
  private goals: CharacterGoal[];
  private relationships: Record<string, Relationship>;
  private config: CharacterConfig;

  constructor(config: CharacterConfig) {
    this.config = config;
    this.goals = this.createDefaultGoals();
    this.relationships = {};
  }

  getActiveGoals(): CharacterGoal[] {
    return this.goals
      .filter(g => g.status === 'active')
      .sort((a, b) => b.priority - a.priority);
  }

  addGoal(goal: CharacterGoal): void {
    // Replace if same type exists
    this.goals = this.goals.filter(g => g.type !== goal.type);
    this.goals.push(goal);
  }

  updateGoalProgress(goalType: string, progress: number): void {
    const goal = this.goals.find(g => g.type === goalType);
    if (goal) {
      goal.progress = clamp(progress, 0, 1);
      if (goal.progress >= 1) {
        goal.status = 'completed';
      }
    }
  }

  getRelationship(npcId: string): Relationship | undefined {
    return this.relationships[npcId];
  }

  updateRelationship(npcId: string, trustDelta: number, respectDelta: number): void {
    if (!this.relationships[npcId]) {
      this.relationships[npcId] = {
        npcId,
        trust: 0.5,
        respect: 0.5,
        familiarity: 0,
        history: [],
      };
    }
    const rel = this.relationships[npcId];
    rel.trust = clamp(rel.trust + trustDelta, 0, 1);
    rel.respect = clamp(rel.respect + respectDelta, 0, 1);
    rel.familiarity = clamp(rel.familiarity + 0.05, 0, 1);
  }

  /**
   * Build a WorldContext from the current GameState.
   */
  static buildWorldContext(gameState: any): WorldContext {
    const bankBalance = gameState.bankBalance ?? 0;
    const savingsBalance = gameState.savingsBalance ?? 0;
    const emergencyFund = gameState.emergencyFund ?? 0;
    const _investments = gameState.investments ?? 0;
    const monthlyIncome = gameState.monthlyIncome ?? 0;
    const creditScore = gameState.creditScores?.composite ?? 650;

    // Calculate total debt
    const totalDebt = (gameState.creditAccounts ?? []).reduce(
      (sum: number, acc: any) => sum + (acc.balance ?? 0),
      0
    );

    // Calculate total monthly expenses
    const totalExpenses = (gameState.expenses ?? []).reduce(
      (sum: number, exp: any) => sum + (exp.amount ?? 0),
      0
    );

    // Debt-to-income ratio
    const debtToIncomeRatio = monthlyIncome > 0 ? totalDebt / (monthlyIncome * 12) : 1;

    // Financial health score (0-1)
    let financialHealth = 0.5;
    // Credit score contribution (0-0.25)
    financialHealth += ((creditScore - 300) / 550) * 0.25;
    // Savings contribution (0-0.25)
    const savingsRatio = monthlyIncome > 0 ? (savingsBalance + emergencyFund) / (monthlyIncome * 6) : 0;
    financialHealth += Math.min(savingsRatio, 1) * 0.25;
    // Debt penalty (0-0.25)
    financialHealth -= Math.min(debtToIncomeRatio, 1) * 0.25;
    // Income stability (0-0.25)
    financialHealth += monthlyIncome > 0 ? 0.15 : 0;
    financialHealth = clamp(financialHealth, 0, 1);

    return {
      creditScore,
      bankBalance,
      savingsBalance,
      monthlyIncome,
      totalDebt,
      totalExpenses,
      debtToIncomeRatio,
      financialHealth,
      monthsPlayed: gameState.monthsPlayed ?? 0,
      currentDate: gameState.currentDate ?? Date.now(),
      recentEvents: (gameState.activityLog ?? []).slice(-5).map((entry: any) => entry.description ?? ''),
      activeAccounts: (gameState.creditAccounts ?? []).length,
      ownedProperties: (gameState.ownedProperties ?? []).length,
    };
  }

  private createDefaultGoals(): CharacterGoal[] {
    return [
      {
        type: 'improve_credit',
        description: 'Improve credit score to 700+',
        priority: 0.8,
        progress: 0,
        status: 'active',
        targetValue: 700,
      },
      {
        type: 'build_emergency_fund',
        description: 'Build 3-month emergency fund',
        priority: 0.7,
        progress: 0,
        status: 'active',
      },
      {
        type: 'reduce_debt',
        description: 'Reduce total debt by 50%',
        priority: 0.6,
        progress: 0,
        status: 'active',
      },
    ];
  }
}

// ─────────────────────────────────────────────────────────────
// Hybrid Controller (Decision Fusion Orchestrator)
// ─────────────────────────────────────────────────────────────

export interface FusionResult {
  playerWeight: number;
  aiWeight: number;
  complianceScore: number;
  fusionMode: 'player_led' | 'ai_led' | 'collaborative' | 'ai_override';
  reason: string;
}

export interface CharacterEvent {
  type: GameEventType;
  data: Record<string, any>;
  timestamp: number;
}

export class HybridController {
  private emotionEngine: EmotionEngine;
  private behaviorSystem: BehaviorSystem;
  private conversationalAI: ConversationalAI;
  private stateManager: CharacterStateManager;
  private config: CharacterConfig;
  private fusionConfig: FusionConfig;
  private eventQueue: CharacterEvent[];
  private lastTickTime: number;
  private tickInterval: number; // ms between autonomous ticks

  constructor(
    config: CharacterConfig,
    fusionConfig: FusionConfig = DEFAULT_FUSION_CONFIG
  ) {
    this.config = config;
    this.fusionConfig = fusionConfig;
    this.emotionEngine = new EmotionEngine(config.personalityTraits);
    this.behaviorSystem = new BehaviorSystem(config.personalityTraits);
    this.conversationalAI = new ConversationalAI(config);
    this.stateManager = new CharacterStateManager(config);
    this.eventQueue = [];
    this.lastTickTime = Date.now();
    this.tickInterval = 30000; // 30 seconds between autonomous thoughts
  }

  /**
   * Process player text input and generate a full character response.
   * This is the main entry point for player interaction.
   */
  processInput(playerInput: string, worldContext: WorldContext): CharacterResponse {
    // 1. Parse player input
    const intent = PlayerInputHandler.parse(playerInput);

    // 2. Get current emotional context
    const emotionContext = this.emotionEngine.getEmotionalContext();

    // 3. Decision fusion - determine player vs AI authority
    const fusion = this.calculateFusion(intent, emotionContext, worldContext);

    // 4. Evaluate compliance for commands
    let willComply = true;
    let complianceScore = 1.0;
    let _complianceReason = '';

    if (intent.intentType === 'command_action' || intent.intentType === 'command_move') {
      [willComply, complianceScore, _complianceReason] = this.behaviorSystem.evaluatePlayerCommandCompliance(
        intent,
        emotionContext,
        worldContext
      );
    }

    // 5. Select AI action
    const aiAction = this.behaviorSystem.selectAction(
      emotionContext,
      worldContext,
      this.stateManager.getActiveGoals(),
      intent
    );

    // 6. Generate dialogue
    let dialogueResult: { dialogue: string; innerThought: string; animationHint: string };

    if (intent.intentType === 'query_status') {
      dialogueResult = this.conversationalAI.generateResponse(
        'status_report',
        emotionContext,
        worldContext,
        intent
      );
      // Enrich with actual data
      dialogueResult.dialogue = this.enrichStatusDialogue(dialogueResult.dialogue, worldContext);
    } else if (intent.intentType === 'query_advice') {
      dialogueResult = this.conversationalAI.generateResponse(
        'giving_advice',
        emotionContext,
        worldContext,
        intent
      );
      dialogueResult.dialogue = this.enrichAdviceDialogue(dialogueResult.dialogue, worldContext);
    } else if (intent.intentType === 'command_action' || intent.intentType === 'command_move') {
      dialogueResult = this.conversationalAI.generateCommandResponse(
        intent,
        emotionContext,
        willComply,
        worldContext
      );
    } else {
      dialogueResult = this.conversationalAI.generateResponse(
        'idle',
        emotionContext,
        worldContext,
        intent
      );
    }

    // 7. Apply emotional impact from the interaction
    if (willComply && intent.intentType === 'command_action') {
      this.emotionEngine.applyStimulus('player_command_comply', 0.3);
    } else if (!willComply) {
      this.emotionEngine.applyStimulus('player_command_refuse', 0.4);
    }

    // 8. Build the response
    const response: CharacterResponse = {
      dialogue: dialogueResult.dialogue,
      innerThought: dialogueResult.innerThought,
      animationHint: dialogueResult.animationHint,
      action: willComply ? aiAction : this.getAlternativeAction(worldContext),
      emotionState: this.emotionEngine.getCurrentState(),
      fusionResult: {
        playerWeight: fusion.playerWeight,
        aiWeight: fusion.aiWeight,
        complianceScore,
        fusionMode: fusion.fusionMode,
        reason: fusion.reason,
      },
      timestamp: Date.now(),
    };

    return response;
  }

  /**
   * Autonomous tick - generates character thoughts/actions without player input.
   * Call this periodically (e.g., every 30s or on game events).
   */
  autonomousTick(worldContext: WorldContext): CharacterResponse | null {
    const now = Date.now();
    if (now - this.lastTickTime < this.tickInterval) {
      return null; // Not time yet
    }
    this.lastTickTime = now;

    // Decay emotions over time
    this.emotionEngine.decayEmotions(1.0);

    // Process any queued events
    const event = this.eventQueue.shift();
    if (event) {
      return this.processGameEvent(event, worldContext);
    }

    // Generate autonomous thought/action
    const emotionContext = this.emotionEngine.getEmotionalContext();
    const aiAction = this.behaviorSystem.selectAction(
      emotionContext,
      worldContext,
      this.stateManager.getActiveGoals()
    );

    const dialogueResult = this.conversationalAI.generateResponse(
      'idle',
      emotionContext,
      worldContext
    );

    return {
      dialogue: dialogueResult.dialogue,
      innerThought: dialogueResult.innerThought,
      animationHint: dialogueResult.animationHint,
      action: aiAction,
      emotionState: this.emotionEngine.getCurrentState(),
      fusionResult: {
        playerWeight: 0,
        aiWeight: 1,
        complianceScore: 1,
        fusionMode: 'ai_led',
        reason: 'Autonomous thought',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Apply a game event to the character AI system.
   * This triggers emotional responses and dialogue.
   */
  applyGameEvent(
    eventType: GameEventType,
    eventData: Record<string, any> = {}
  ): void {
    this.eventQueue.push({
      type: eventType,
      data: eventData,
      timestamp: Date.now(),
    });
  }

  /**
   * Process a game event immediately and return a response.
   */
  processGameEventImmediate(
    eventType: GameEventType,
    eventData: Record<string, any>,
    worldContext: WorldContext
  ): CharacterResponse {
    const event: CharacterEvent = {
      type: eventType,
      data: eventData,
      timestamp: Date.now(),
    };
    return this.processGameEvent(event, worldContext);
  }

  /**
   * Get the current emotion state (for UI display).
   */
  getEmotionState(): EmotionState {
    return this.emotionEngine.getCurrentState();
  }

  /**
   * Get active character goals.
   */
  getActiveGoals(): CharacterGoal[] {
    return this.stateManager.getActiveGoals();
  }

  /**
   * Add a new character goal.
   */
  addGoal(goal: CharacterGoal): void {
    this.stateManager.addGoal(goal);
  }

  /**
   * Update goal progress based on game state changes.
   */
  updateGoalsFromGameState(gameState: any): void {
    const creditScore = gameState.creditScores?.composite ?? 650;
    const savingsBalance = gameState.savingsBalance ?? 0;
    const emergencyFund = gameState.emergencyFund ?? 0;
    const monthlyIncome = gameState.monthlyIncome ?? 0;
    const totalDebt = (gameState.creditAccounts ?? []).reduce(
      (sum: number, acc: any) => sum + (acc.balance ?? 0),
      0
    );

    // Update credit goal
    const creditGoal = this.stateManager.getActiveGoals().find(g => g.type === 'improve_credit');
    if (creditGoal && creditGoal.targetValue) {
      this.stateManager.updateGoalProgress(
        'improve_credit',
        Math.min(creditScore / creditGoal.targetValue, 1)
      );
    }

    // Update emergency fund goal
    const targetEmergencyFund = monthlyIncome * 3;
    if (targetEmergencyFund > 0) {
      this.stateManager.updateGoalProgress(
        'build_emergency_fund',
        Math.min((savingsBalance + emergencyFund) / targetEmergencyFund, 1)
      );
    }

    // Update debt reduction goal
    // (progress is inverse of debt - less debt = more progress)
    if (totalDebt > 0 && monthlyIncome > 0) {
      const debtRatio = totalDebt / (monthlyIncome * 12);
      this.stateManager.updateGoalProgress(
        'reduce_debt',
        clamp(1 - debtRatio, 0, 1)
      );
    }
  }

  /**
   * Force an immediate autonomous tick (bypass timer).
   */
  forceAutonomousTick(worldContext: WorldContext): CharacterResponse {
    this.lastTickTime = 0; // Reset timer
    return this.autonomousTick(worldContext) ?? {
      dialogue: "Just thinking...",
      innerThought: "Nothing particular on my mind.",
      animationHint: 'idle',
      action: {
        actionType: 'reflect',
        description: 'Reflecting on the current situation',
        confidence: 0.5,
        urgency: 0.3,
        target: null,
        parameters: {},
        emotionalImpact: {},
      },
      emotionState: this.emotionEngine.getCurrentState(),
      fusionResult: {
        playerWeight: 0,
        aiWeight: 1,
        complianceScore: 1,
        fusionMode: 'ai_led',
        reason: 'Forced autonomous tick',
      },
      timestamp: Date.now(),
    };
  }

  // ─── Private Methods ────────────────────────────────────────

  private calculateFusion(
    intent: PlayerIntent,
    emotionContext: ReturnType<EmotionEngine['getEmotionalContext']>,
    worldContext: WorldContext
  ): FusionResult {
    let playerWeight = this.fusionConfig.playerAuthorityBase;
    let aiWeight = this.fusionConfig.aiAutonomyBase;

    // Adjust based on intent confidence
    if (intent.confidence > 0.7) {
      playerWeight += 0.1;
    } else if (intent.confidence < 0.4) {
      aiWeight += 0.15;
    }

    // Strong emotions increase AI autonomy
    if (emotionContext.arousal > 0.7) {
      aiWeight += this.fusionConfig.emotionalOverrideThreshold * 0.2;
    }

    // Financial danger increases AI autonomy
    if (worldContext.financialHealth < 0.2) {
      aiWeight += 0.15;
    }

    // High trust increases player authority
    if (emotionContext.emotions.trust > 0.7) {
      playerWeight += 0.1;
    }

    // Normalize weights
    const total = playerWeight + aiWeight;
    playerWeight /= total;
    aiWeight /= total;

    // Determine fusion mode
    let fusionMode: FusionResult['fusionMode'];
    let reason: string;

    if (playerWeight > 0.65) {
      fusionMode = 'player_led';
      reason = 'Player has strong authority in this situation.';
    } else if (aiWeight > 0.65) {
      fusionMode = 'ai_led';
      reason = 'AI is taking the lead based on emotional/financial state.';
    } else if (worldContext.financialHealth < 0.15) {
      fusionMode = 'ai_override';
      reason = 'Financial emergency - AI overriding for safety.';
    } else {
      fusionMode = 'collaborative';
      reason = 'Balanced collaboration between player and AI.';
    }

    return {
      playerWeight,
      aiWeight,
      complianceScore: 0.5,
      fusionMode,
      reason,
    };
  }

  private processGameEvent(event: CharacterEvent, worldContext: WorldContext): CharacterResponse {
    // Map event type to stimulus and situation
    const stimulusMap: Record<string, { stimulus: string; situation: string; intensity: number }> = {
      credit_score_change: {
        stimulus: (event.data.change ?? 0) > 0 ? 'credit_score_up' : 'credit_score_down',
        situation: (event.data.change ?? 0) > 0 ? 'credit_score_increased' : 'credit_score_decreased',
        intensity: Math.min(Math.abs(event.data.change ?? 0) / 50, 1),
      },
      payment_made: {
        stimulus: 'on_time_payment',
        situation: 'on_time_payment',
        intensity: 0.5,
      },
      payment_missed: {
        stimulus: 'missed_payment',
        situation: 'missed_payment',
        intensity: 0.8,
      },
      loan_approved: {
        stimulus: 'loan_approved',
        situation: 'loan_approved',
        intensity: 0.7,
      },
      loan_denied: {
        stimulus: 'loan_denied',
        situation: 'loan_denied',
        intensity: 0.6,
      },
      salary_received: {
        stimulus: 'salary_received',
        situation: 'salary_received',
        intensity: 0.5,
      },
      month_advanced: {
        stimulus: 'month_advanced',
        situation: 'month_advanced',
        intensity: 0.3,
      },
      emergency_expense: {
        stimulus: 'emergency_expense',
        situation: 'emergency_expense',
        intensity: 0.8,
      },
      property_purchased: {
        stimulus: 'property_purchased',
        situation: 'property_purchased',
        intensity: 0.9,
      },
      job_promotion: {
        stimulus: 'job_promotion',
        situation: 'job_promotion',
        intensity: 0.7,
      },
      debt_paid_off: {
        stimulus: 'debt_paid_off',
        situation: 'debt_paid_off',
        intensity: 0.8,
      },
      business_started: {
        stimulus: 'business_started',
        situation: 'business_started',
        intensity: 0.7,
      },
    };

    const mapping = stimulusMap[event.type] ?? {
      stimulus: 'month_advanced',
      situation: 'idle',
      intensity: 0.3,
    };

    // Apply emotional stimulus
    this.emotionEngine.applyStimulus(mapping.stimulus, mapping.intensity, 'game_event');

    // Get updated emotional context
    const emotionContext = this.emotionEngine.getEmotionalContext();

    // Generate dialogue for the event
    const dialogueResult = this.conversationalAI.generateResponse(
      mapping.situation,
      emotionContext,
      worldContext
    );

    // Select an action in response
    const aiAction = this.behaviorSystem.selectAction(
      emotionContext,
      worldContext,
      this.stateManager.getActiveGoals()
    );

    return {
      dialogue: dialogueResult.dialogue,
      innerThought: dialogueResult.innerThought,
      animationHint: dialogueResult.animationHint,
      action: aiAction,
      emotionState: this.emotionEngine.getCurrentState(),
      fusionResult: {
        playerWeight: 0,
        aiWeight: 1,
        complianceScore: 1,
        fusionMode: 'ai_led',
        reason: `Responding to game event: ${event.type}`,
      },
      timestamp: Date.now(),
    };
  }

  private getAlternativeAction(worldContext: WorldContext): BehaviorAction {
    // When refusing a player command, suggest a safer alternative
    const emotionContext = this.emotionEngine.getEmotionalContext();
    return this.behaviorSystem.selectAction(
      emotionContext,
      worldContext,
      this.stateManager.getActiveGoals()
    );
  }

  private enrichStatusDialogue(dialogue: string, worldContext: WorldContext): string {
    const creditTier =
      worldContext.creditScore >= 740 ? 'excellent' :
      worldContext.creditScore >= 670 ? 'good' :
      worldContext.creditScore >= 580 ? 'fair' : 'needs work';

    const healthDesc =
      worldContext.financialHealth >= 0.7 ? 'looking strong' :
      worldContext.financialHealth >= 0.4 ? 'doing okay' : 'needs attention';

    return `${dialogue} Credit score is ${worldContext.creditScore} (${creditTier}). ` +
      `Bank balance: $${worldContext.bankBalance.toLocaleString()}. ` +
      `Overall financial health is ${healthDesc}.`;
  }

  private enrichAdviceDialogue(dialogue: string, worldContext: WorldContext): string {
    const tips: string[] = [];

    if (worldContext.creditScore < 670) {
      tips.push('Focus on making all payments on time to boost that credit score.');
    }
    if (worldContext.debtToIncomeRatio > 0.4) {
      tips.push('Consider paying down some debt to improve your debt-to-income ratio.');
    }
    if (worldContext.savingsBalance < worldContext.monthlyIncome * 3) {
      tips.push("Building up that emergency fund should be a priority.");
    }
    if (worldContext.financialHealth > 0.7 && worldContext.creditScore > 700) {
      tips.push("You're in a great position to consider investing or applying for better credit products.");
    }

    if (tips.length > 0) {
      return `${dialogue} ${pickRandom(tips)}`;
    }
    return dialogue;
  }
}

// ─────────────────────────────────────────────────────────────
// Default Character Configuration
// ─────────────────────────────────────────────────────────────

export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  name: 'Alex',
  personalityTraits: {
    ambitious: 0.7,
    cautious: 0.6,
    honest: 0.8,
    social: 0.5,
    impulsive: 0.3,
    optimistic: 0.6,
    frugal: 0.5,
    riskTolerant: 0.4,
    stubborn: 0.4,
    proactive: 0.7,
  },
  backstory: 'A young professional learning to navigate the world of credit and personal finance.',
  initialCreditScore: 650,
  voiceStyle: 'casual',
};