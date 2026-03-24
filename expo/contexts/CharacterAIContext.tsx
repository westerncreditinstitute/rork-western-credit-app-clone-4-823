/**
 * CharacterAIContext
 * ==================
 * React Context that wraps the CharacterAIService and connects it
 * to the game state. Provides hooks for UI components to:
 *   - Send player commands to the AI character
 *   - Receive character dialogue, emotions, and actions
 *   - Trigger game event reactions
 *   - Access autonomous character thoughts
 *
 * Uses the same createContextHook pattern as GameContext.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useGame } from '@/contexts/GameContext';
import {
  HybridController,
  CharacterStateManager,
  DEFAULT_CHARACTER_CONFIG,
} from '@/services/CharacterAIService';
import type {
  CharacterConfig,
  CharacterResponse,
  EmotionState,
  CharacterGoal,
  WorldContext,
  GameEventType,
} from '@/types/characterAI';
import { DEFAULT_FUSION_CONFIG } from '@/types/characterAI';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface CharacterMessage {
  id: string;
  type: 'character' | 'player' | 'system' | 'thought';
  text: string;
  timestamp: number;
  emotionState?: EmotionState;
  animationHint?: string;
  action?: CharacterResponse['action'];
}

// ─────────────────────────────────────────────────────────────
// Context Hook
// ─────────────────────────────────────────────────────────────

export const [CharacterAIProvider, useCharacterAI] = createContextHook(() => { // eslint-disable-line rork/general-context-optimization
  const { gameState } = useGame();

  // ─── State ──────────────────────────────────────────────
  const [messages, setMessages] = useState<CharacterMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState<CharacterResponse | null>(null);
  const [emotionState, setEmotionState] = useState<EmotionState | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER_CONFIG);

  // ─── Refs ───────────────────────────────────────────────
  const controllerRef = useRef<HybridController | null>(null);
  const autonomousTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageIdCounter = useRef(0);
  const _prevGameStateRef = useRef<any>(null);

  // ─── Initialize Controller ──────────────────────────────
  useEffect(() => {
    controllerRef.current = new HybridController(characterConfig, DEFAULT_FUSION_CONFIG);

    // Generate initial greeting
    const worldContext = CharacterStateManager.buildWorldContext(gameState);
    const greeting = controllerRef.current.forceAutonomousTick(worldContext);

    const greetingMessage: CharacterMessage = {
      id: `msg-${++messageIdCounter.current}`,
      type: 'character',
      text: greeting.dialogue,
      timestamp: Date.now(),
      emotionState: greeting.emotionState,
      animationHint: greeting.animationHint,
    };

    setMessages([greetingMessage]);
    setCurrentResponse(greeting);
    setEmotionState(greeting.emotionState);

    return () => {
      if (autonomousTimerRef.current) {
        clearInterval(autonomousTimerRef.current);
      }
    };
  }, [characterConfig, gameState]);

  // ─── Autonomous Tick Timer ──────────────────────────────
  useEffect(() => {
    if (autonomousTimerRef.current) {
      clearInterval(autonomousTimerRef.current);
    }

    autonomousTimerRef.current = setInterval(() => {
      if (!controllerRef.current || !isPanelVisible) return;

      const worldContext = CharacterStateManager.buildWorldContext(gameState);
      const response = controllerRef.current.autonomousTick(worldContext);

      if (response) {
        const thoughtMessage: CharacterMessage = {
          id: `msg-${++messageIdCounter.current}`,
          type: 'thought',
          text: response.innerThought,
          timestamp: Date.now(),
          emotionState: response.emotionState,
          animationHint: response.animationHint,
        };

        setMessages(prev => [...prev.slice(-49), thoughtMessage]);
        setEmotionState(response.emotionState);
      }
    }, 30000); // Every 30 seconds

    return () => {
      if (autonomousTimerRef.current) {
        clearInterval(autonomousTimerRef.current);
      }
    };
  }, [gameState, isPanelVisible]);

  // ─── Actions ────────────────────────────────────────────

  /**
   * Send a player command/message to the AI character.
   */
  const sendMessage = useCallback((text: string) => {
    if (!controllerRef.current || !text.trim()) return;

    setIsThinking(true);

    // Add player message
    const playerMessage: CharacterMessage = {
      id: `msg-${++messageIdCounter.current}`,
      type: 'player',
      text: text.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev.slice(-49), playerMessage]);

    // Process through AI (use setTimeout to allow UI to update)
    setTimeout(() => {
      if (!controllerRef.current) return;

      const worldContext = CharacterStateManager.buildWorldContext(gameState);
      const response = controllerRef.current.processInput(text.trim(), worldContext);

      // Add character response
      const characterMessage: CharacterMessage = {
        id: `msg-${++messageIdCounter.current}`,
        type: 'character',
        text: response.dialogue,
        timestamp: Date.now(),
        emotionState: response.emotionState,
        animationHint: response.animationHint,
        action: response.action,
      };

      setMessages(prev => [...prev.slice(-49), characterMessage]);
      setCurrentResponse(response);
      setEmotionState(response.emotionState);
      setIsThinking(false);
    }, 300 + Math.random() * 700); // Simulate thinking delay
  }, [gameState]);

  /**
   * Trigger a game event reaction from the AI character.
   */
  const triggerGameEvent = useCallback((
    eventType: GameEventType,
    eventData: Record<string, any> = {}
  ) => {
    if (!controllerRef.current) return;

    const worldContext = CharacterStateManager.buildWorldContext(gameState);
    const response = controllerRef.current.processGameEventImmediate(
      eventType,
      eventData,
      worldContext
    );

    const eventMessage: CharacterMessage = {
      id: `msg-${++messageIdCounter.current}`,
      type: 'character',
      text: response.dialogue,
      timestamp: Date.now(),
      emotionState: response.emotionState,
      animationHint: response.animationHint,
      action: response.action,
    };

    setMessages(prev => [...prev.slice(-49), eventMessage]);
    setCurrentResponse(response);
    setEmotionState(response.emotionState);
  }, [gameState]);

  /**
   * Toggle the AI panel visibility.
   */
  const togglePanel = useCallback(() => {
    setIsPanelVisible(prev => !prev);
  }, []);

  /**
   * Show the AI panel.
   */
  const showPanel = useCallback(() => {
    setIsPanelVisible(true);
  }, []);

  /**
   * Hide the AI panel.
   */
  const hidePanel = useCallback(() => {
    setIsPanelVisible(false);
  }, []);

  /**
   * Clear message history.
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * Update the character configuration (personality, voice, etc.).
   */
  const updateCharacterConfig = useCallback((newConfig: Partial<CharacterConfig>) => {
    setCharacterConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  /**
   * Get the current character goals.
   */
  const getGoals = useCallback((): CharacterGoal[] => {
    return controllerRef.current?.getActiveGoals() ?? [];
  }, []);

  /**
   * Add a new goal for the character.
   */
  const addGoal = useCallback((goal: CharacterGoal) => {
    controllerRef.current?.addGoal(goal);
  }, []);

  /**
   * Force the character to say something (for game events).
   */
  const forceCharacterResponse = useCallback((worldContext?: WorldContext) => {
    if (!controllerRef.current) return;

    const wc = worldContext ?? CharacterStateManager.buildWorldContext(gameState);
    const response = controllerRef.current.forceAutonomousTick(wc);

    const message: CharacterMessage = {
      id: `msg-${++messageIdCounter.current}`,
      type: 'character',
      text: response.dialogue,
      timestamp: Date.now(),
      emotionState: response.emotionState,
      animationHint: response.animationHint,
      action: response.action,
    };

    setMessages(prev => [...prev.slice(-49), message]);
    setCurrentResponse(response);
    setEmotionState(response.emotionState);
  }, [gameState]);

  // ─── Computed Values ────────────────────────────────────

  const lastCharacterMessage = useMemo(() => {
    const characterMessages = messages.filter(m => m.type === 'character');
    return characterMessages[characterMessages.length - 1] ?? null;
  }, [messages]);

  const dominantEmotion = useMemo(() => {
    return emotionState?.dominantEmotion ?? 'trust';
  }, [emotionState]);

  const moodValence = useMemo(() => {
    return emotionState?.moodValence ?? 0;
  }, [emotionState]);

  // ─── Return ─────────────────────────────────────────────

  return {
    // State
    messages,
    currentResponse,
    emotionState,
    isThinking,
    isPanelVisible,
    characterConfig,
    lastCharacterMessage,
    dominantEmotion,
    moodValence,

    // Actions
    sendMessage,
    triggerGameEvent,
    togglePanel,
    showPanel,
    hidePanel,
    clearMessages,
    updateCharacterConfig,
    getGoals,
    addGoal,
    forceCharacterResponse,
  };
});