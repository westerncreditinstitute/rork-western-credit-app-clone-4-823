/**
 * CharacterDialogueBox
 * ====================
 * Displays the AI character's dialogue, thoughts, and emotional state.
 * Shows a scrollable message history with different styling for
 * character speech, player commands, thoughts, and system messages.
 */

import React, { useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { CharacterMessage } from '@/contexts/CharacterAIContext';
import type { EmotionType } from '@/types/characterAI';

// ─────────────────────────────────────────────────────────────
// Emotion Color Map
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
// Emotion Badge
// ─────────────────────────────────────────────────────────────

const EmotionBadge = memo(({ emotion }: { emotion: EmotionType }) => {
  const color = EMOTION_COLORS[emotion] ?? '#888';
  const emoji = EMOTION_EMOJI[emotion] ?? '🤖';

  return (
    <View style={[styles.emotionBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
      <Text style={styles.emotionEmoji}>{emoji}</Text>
      <Text style={[styles.emotionLabel, { color }]}>
        {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
      </Text>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: CharacterMessage;
  colors: any;
}

const MessageBubble = memo(({ message, colors }: MessageBubbleProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
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
  }, [fadeAnim, slideAnim]);

  const isPlayer = message.type === 'player';
  const isThought = message.type === 'thought';
  const isSystem = message.type === 'system';

  const bubbleStyle = [
    styles.messageBubble,
    isPlayer && [styles.playerBubble, { backgroundColor: colors.primary + '20' }],
    !isPlayer && !isThought && !isSystem && [styles.characterBubble, { backgroundColor: colors.surface }],
    isThought && [styles.thoughtBubble, { backgroundColor: colors.surface + '80', borderColor: colors.border }],
    isSystem && [styles.systemBubble, { backgroundColor: colors.info + '15' }],
  ];

  const textStyle = [
    styles.messageText,
    { color: colors.text },
    isPlayer && styles.playerText,
    isThought && [styles.thoughtText, { color: colors.textSecondary }],
    isSystem && [styles.systemText, { color: colors.info }],
  ];

  const timeStr = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        isPlayer ? styles.playerRow : styles.characterRow,
      ]}
    >
      <View style={bubbleStyle}>
        {isThought && (
          <Text style={[styles.thoughtLabel, { color: colors.textSecondary }]}>
            💭 Inner Thought
          </Text>
        )}
        <Text style={textStyle}>{message.text}</Text>
        <View style={styles.messageFooter}>
          {message.emotionState && !isPlayer && (
            <EmotionBadge emotion={message.emotionState.dominantEmotion} />
          )}
          <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
            {timeStr}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

interface CharacterDialogueBoxProps {
  messages: CharacterMessage[];
  isThinking: boolean;
  maxHeight?: number;
}

function CharacterDialogueBox({
  messages,
  isThinking,
  maxHeight = 300,
}: CharacterDialogueBoxProps) {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const thinkingDots = useRef(new Animated.Value(0)).current;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  // Thinking animation
  useEffect(() => {
    if (isThinking) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(thinkingDots, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(thinkingDots, { toValue: 0, duration: 500, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isThinking, thinkingDots]);

  return (
    <View style={[styles.container, { maxHeight }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Your AI financial advisor is ready to chat! 🤖
            </Text>
          </View>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            colors={colors}
          />
        ))}

        {isThinking && (
          <View style={[styles.characterRow]}>
            <Animated.View
              style={[
                styles.thinkingBubble,
                { backgroundColor: colors.surface, opacity: thinkingDots.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }) },
              ]}
            >
              <Text style={[styles.thinkingText, { color: colors.textSecondary }]}>
                Thinking...
              </Text>
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  characterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
    paddingRight: 40,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
    paddingLeft: 40,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  characterBubble: {
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  playerBubble: {
    borderTopRightRadius: 4,
  },
  thoughtBubble: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderTopLeftRadius: 4,
  },
  systemBubble: {
    alignSelf: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  playerText: {
    fontWeight: '500',
  },
  thoughtText: {
    fontStyle: 'italic',
    fontSize: 13,
  },
  systemText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  thoughtLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timestamp: {
    fontSize: 10,
    marginLeft: 'auto',
  },
  emotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  emotionEmoji: {
    fontSize: 10,
    marginRight: 3,
  },
  emotionLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  thinkingBubble: {
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  thinkingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default memo(CharacterDialogueBox);