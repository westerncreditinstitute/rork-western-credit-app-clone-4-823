/**
 * CharacterAIPanel
 * ================
 * The main floating panel that integrates the dialogue box, command input,
 * and emotion display into a collapsible overlay on the game screen.
 * Features:
 *   - Floating action button (FAB) to toggle panel
 *   - Expandable panel with dialogue history
 *   - Emotion indicator bar
 *   - Quick actions and text input
 *   - Smooth animations for open/close
 */

import React, { useRef, useEffect, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  X,
  Brain,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCharacterAI } from '@/contexts/CharacterAIContext';
import CharacterDialogueBox from './CharacterDialogueBox';
import CharacterCommandInput from './CharacterCommandInput';
import type { EmotionType } from '@/types/characterAI';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = Math.min(SCREEN_HEIGHT * 0.55, 480);

// ─────────────────────────────────────────────────────────────
// Emotion Colors
// ─────────────────────────────────────────────────────────────

const EMOTION_COLORS: Record<EmotionType, string> = {
  joy: '#FFD700',
  sadness: '#6495ED',
  anger: '#FF4444',
  fear: '#9370DB',
  surprise: '#FF8C00',
  disgust: '#556B2F',
  trust: '#3CB371',
  anticipation: '#FF69B4',
  stress: '#DC143C',
  confidence: '#4169E1',
};

const EMOTION_EMOJI: Record<EmotionType, string> = {
  joy: '😊',
  sadness: '😢',
  anger: '😠',
  fear: '😰',
  surprise: '😲',
  disgust: '😒',
  trust: '🤝',
  anticipation: '🤔',
  stress: '😫',
  confidence: '💪',
};

// ─────────────────────────────────────────────────────────────
// Emotion Bar Component
// ─────────────────────────────────────────────────────────────

const EmotionBar = memo(({
  emotionState,
  colors,
}: {
  emotionState: any;
  colors: any;
}) => {
  if (!emotionState) return null;

  const dominant = emotionState.dominantEmotion as EmotionType;
  const valence = emotionState.moodValence ?? 0;
  const emotionColor = EMOTION_COLORS[dominant] ?? '#888';
  const emoji = EMOTION_EMOJI[dominant] ?? '🤖';

  // Get top 3 emotions
  const sortedEmotions = Object.entries(emotionState.emotions ?? {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3);

  return (
    <View style={[styles.emotionBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.emotionMain}>
        <Text style={styles.emotionMainEmoji}>{emoji}</Text>
        <View style={styles.emotionMainInfo}>
          <Text style={[styles.emotionMainLabel, { color: emotionColor }]}>
            {dominant.charAt(0).toUpperCase() + dominant.slice(1)}
          </Text>
          <Text style={[styles.moodText, { color: colors.textSecondary }]}>
            Mood: {valence > 0.3 ? '😄 Positive' : valence < -0.3 ? '😟 Negative' : '😐 Neutral'}
          </Text>
        </View>
      </View>
      <View style={styles.emotionMiniBar}>
        {sortedEmotions.map(([emotion, value]) => (
          <View key={emotion} style={styles.emotionMiniItem}>
            <View
              style={[
                styles.emotionMiniDot,
                {
                  backgroundColor: EMOTION_COLORS[emotion as EmotionType] ?? '#888',
                  opacity: 0.3 + (value as number) * 0.7,
                },
              ]}
            />
            <Text style={[styles.emotionMiniLabel, { color: colors.textSecondary }]}>
              {(emotion as string).slice(0, 3)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────
// Floating Action Button
// ─────────────────────────────────────────────────────────────

const FloatingButton = memo(({
  onPress,
  hasNewMessage,
  dominantEmotion,
  colors,
}: {
  onPress: () => void;
  hasNewMessage: boolean;
  dominantEmotion: EmotionType;
  colors: any;
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasNewMessage) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [hasNewMessage, pulseAnim]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [glowAnim]);

  const emotionColor = EMOTION_COLORS[dominantEmotion] ?? colors.primary;
  const emoji = EMOTION_EMOJI[dominantEmotion] ?? '🤖';

  return (
    <Animated.View style={[styles.fabContainer, { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: emotionColor, shadowColor: emotionColor }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.fabEmoji}>{emoji}</Text>
        {hasNewMessage && (
          <View style={styles.fabBadge}>
            <Sparkles size={10} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────
// Main Panel Component
// ─────────────────────────────────────────────────────────────

function CharacterAIPanel() {
  const { colors } = useTheme();
  const {
    messages,
    emotionState,
    isThinking,
    isPanelVisible,
    characterConfig,
    dominantEmotion,
    lastCharacterMessage,
    sendMessage,
    togglePanel,
    hidePanel,
  } = useCharacterAI();

  const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const hasNewMessageRef = useRef(false);

  // Track new messages for FAB notification
  useEffect(() => {
    if (lastCharacterMessage && !isPanelVisible) {
      hasNewMessageRef.current = true;
    }
  }, [lastCharacterMessage, isPanelVisible]);

  // Animate panel open/close
  useEffect(() => {
    if (isPanelVisible) {
      hasNewMessageRef.current = false;
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: PANEL_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isPanelVisible, slideAnim, backdropAnim]);

  const handleSendMessage = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  return (
    <>
      {/* Floating Action Button */}
      {!isPanelVisible && (
        <FloatingButton
          onPress={togglePanel}
          hasNewMessage={hasNewMessageRef.current}
          dominantEmotion={dominantEmotion as EmotionType}
          colors={colors}
        />
      )}

      {/* Backdrop */}
      {isPanelVisible && (
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }) },
          ]}
          pointerEvents={isPanelVisible ? 'auto' : 'none'}
        >
          <TouchableOpacity style={styles.backdropTouch} onPress={hidePanel} activeOpacity={1} />
        </Animated.View>
      )}

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            transform: [{ translateY: slideAnim }],
            height: PANEL_HEIGHT,
          },
        ]}
        pointerEvents={isPanelVisible ? 'auto' : 'none'}
      >
        <KeyboardAvoidingView
          style={styles.panelInner}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={100}
        >
          {/* Header */}
          <View style={[styles.panelHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.panelHeaderLeft}>
              <Brain size={20} color={colors.primary} />
              <View style={styles.panelHeaderInfo}>
                <Text style={[styles.panelTitle, { color: colors.text }]}>
                  {characterConfig.name} — AI Advisor
                </Text>
                <Text style={[styles.panelSubtitle, { color: colors.textSecondary }]}>
                  {characterConfig.voiceStyle} • {isThinking ? 'Thinking...' : 'Online'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.surface }]}
              onPress={hidePanel}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Emotion Bar */}
          <EmotionBar emotionState={emotionState} colors={colors} />

          {/* Dialogue Box */}
          <View style={styles.dialogueContainer}>
            <CharacterDialogueBox
              messages={messages}
              isThinking={isThinking}
              maxHeight={PANEL_HEIGHT - 200}
            />
          </View>

          {/* Command Input */}
          <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
            <CharacterCommandInput
              onSendMessage={handleSendMessage}
              isThinking={isThinking}
              showQuickActions={true}
            />
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabEmoji: {
    fontSize: 24,
  },
  fabBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 998,
  },
  backdropTouch: {
    flex: 1,
  },

  // Panel
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    overflow: 'hidden',
  },
  panelInner: {
    flex: 1,
  },

  // Header
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  panelHeaderInfo: {
    marginLeft: 10,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  panelSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Emotion Bar
  emotionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  emotionMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emotionMainEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  emotionMainInfo: {},
  emotionMainLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  moodText: {
    fontSize: 11,
    marginTop: 1,
  },
  emotionMiniBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emotionMiniItem: {
    alignItems: 'center',
  },
  emotionMiniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  emotionMiniLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },

  // Dialogue
  dialogueContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },

  // Input
  inputContainer: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
});

export default memo(CharacterAIPanel);