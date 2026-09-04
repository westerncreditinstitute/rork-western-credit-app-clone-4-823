/**
 * AgentChatPanel — the live conversation surface embedded in the My Agent tab.
 *
 * Owns presentation only; all delivery, retry and connection state comes from
 * `useAgentChat`.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
  type NativeSyntheticEvent,
  type TextInputSubmitEditingEventData,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  AlertCircle,
  Bot,
  Check,
  Clock,
  Send,
  Sparkles,
  Wrench,
} from "lucide-react-native";

import Colors from "@/constants/colors";
import type {
  AgentChatMessage,
  ConnectionState,
} from "@/hooks/useAgentChat";

// ============================================================
// Constants
// ============================================================

/** The My Agent identity colour, shared with the tab bar. */
const AGENT_VIOLET = "#A78BFA";

const SUGGESTIONS: { label: string; message: string }[] = [
  {
    label: "What disputes are open?",
    message: "What disputes do I currently have open? Show me their status.",
  },
  {
    label: "Write a 609 letter",
    message: "Can you write a 609 dispute letter for me?",
  },
  {
    label: "Analyze my credit report",
    message:
      "Please analyze my credit report and tell me which accounts I should dispute first.",
  },
  {
    label: "How do I raise my score?",
    message: "What are the best credit building tips for me right now?",
  },
  {
    label: "Explain credit scores",
    message: "Explain the five credit score factors and their percentages.",
  },
];

const MAX_MESSAGE_LENGTH = 2000;

// ============================================================
// Props
// ============================================================

export interface AgentChatPanelProps {
  agentName: string;
  agentAvatarUrl?: string | null;
  messages: AgentChatMessage[];
  connection: ConnectionState;
  isAgentTyping: boolean;
  isLoading: boolean;
  loadError: string | null;
  onSend: (text: string) => void;
  onRetry: (clientId: string) => void;
  /** Extra bottom padding so the composer clears the floating tab bar. */
  bottomInset?: number;
}

// ============================================================
// Component
// ============================================================

export default function AgentChatPanel({
  agentName,
  agentAvatarUrl,
  messages,
  connection,
  isAgentTyping,
  isLoading,
  loadError,
  onSend,
  onRetry,
  bottomInset = 0,
}: AgentChatPanelProps) {
  const [draft, setDraft] = useState<string>("");
  const listRef = useRef<FlatList<AgentChatMessage>>(null);

  const canSend = draft.trim().length > 0;

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDraft("");
    onSend(text);
  }, [draft, onSend]);

  const handleSubmitEditing = useCallback(
    (_e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
      handleSend();
    },
    [handleSend],
  );

  const handleSuggestion = useCallback(
    (message: string) => {
      if (Platform.OS !== "web") {
        void Haptics.selectionAsync();
      }
      onSend(message);
    },
    [onSend],
  );

  // Keep the newest message in view as the conversation grows.
  const scrollToEnd = useCallback((animated: boolean) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToEnd(true);
  }, [messages.length, scrollToEnd]);

  useEffect(() => {
    if (isAgentTyping) scrollToEnd(true);
  }, [isAgentTyping, scrollToEnd]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<AgentChatMessage>) => {
      const next = messages[index + 1];
      const isLastOfGroup = !next || next.role !== item.role;
      return (
        <MessageBubble
          message={item}
          showMeta={isLastOfGroup}
          onRetry={onRetry}
        />
      );
    },
    [messages, onRetry],
  );

  const keyExtractor = useCallback(
    (item: AgentChatMessage) => item.clientId,
    [],
  );

  const listHeader = useMemo(
    () => <WelcomeCard agentName={agentName} />,
    [agentName],
  );

  const listFooter = useMemo(
    () => (
      <View>
        {isAgentTyping ? <TypingBubble agentName={agentName} /> : null}
        {messages.length === 0 && !isLoading ? (
          <SuggestionList onPick={handleSuggestion} />
        ) : null}
      </View>
    ),
    [isAgentTyping, agentName, messages.length, isLoading, handleSuggestion],
  );

  return (
    <View style={styles.container}>
      <ConnectionBanner connection={connection} loadError={loadError} />

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={AGENT_VIOLET} />
          <Text style={styles.loadingText}>Loading your conversation…</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onLayout={() => scrollToEnd(false)}
        />
      )}

      <View style={[styles.composer, { paddingBottom: 10 + bottomInset }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={`Message ${agentName}…`}
          placeholderTextColor={Colors.textLight}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          onSubmitEditing={handleSubmitEditing}
          blurOnSubmit={false}
          accessibilityLabel="Type a message to your agent"
        />
        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Send size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================
// Connection banner
// ============================================================

function ConnectionBanner({
  connection,
  loadError,
}: {
  connection: ConnectionState;
  loadError: string | null;
}) {
  // A healthy live socket needs no chrome — silence is the success state.
  if (connection === "live" && !loadError) return null;

  const config: Record<
    ConnectionState,
    { text: string; color: string; background: string }
  > = {
    connecting: {
      text: "Connecting to your agent…",
      color: Colors.textSecondary,
      background: Colors.surfaceAlt,
    },
    live: {
      text: "Live",
      color: Colors.success,
      background: Colors.successLight,
    },
    polling: {
      text: "Checking for replies every few seconds",
      color: Colors.textSecondary,
      background: Colors.surfaceAlt,
    },
    offline: {
      text: "Can't reach your agent — retrying",
      color: Colors.warning,
      background: Colors.warningLight,
    },
  };

  const state = loadError ? config.offline : config[connection];

  return (
    <View style={[styles.banner, { backgroundColor: state.background }]}>
      <View style={[styles.bannerDot, { backgroundColor: state.color }]} />
      <Text style={[styles.bannerText, { color: state.color }]}>
        {state.text}
      </Text>
    </View>
  );
}

// ============================================================
// Welcome card
// ============================================================

function WelcomeCard({ agentName }: { agentName: string }) {
  return (
    <View style={styles.welcomeCard}>
      <View style={styles.welcomeIcon}>
        <Sparkles size={16} color={AGENT_VIOLET} />
      </View>
      <Text style={styles.welcomeText}>
        <Text style={styles.welcomeName}>{agentName}</Text> is your personal AI
        Credit Repair Agent. Ask about disputes, request a letter, or get a
        strategy for your score — available 24/7.
      </Text>
    </View>
  );
}

// ============================================================
// Message bubble
// ============================================================

function MessageBubble({
  message,
  showMeta,
  onRetry,
}: {
  message: AgentChatMessage;
  showMeta: boolean;
  onRetry: (clientId: string) => void;
}) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  const time = useMemo(() => {
    const date = new Date(message.createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [message.createdAt]);

  if (isTool) {
    return (
      <View style={styles.toolCard}>
        <View style={styles.toolHeader}>
          <Wrench size={13} color={AGENT_VIOLET} />
          <Text style={styles.toolLabel}>
            {message.toolName === "generate_dispute_letter"
              ? "Letter generated"
              : message.toolName === "get_disputes"
                ? "Dispute tracker"
                : "Agent tool"}
          </Text>
        </View>
        <Text style={styles.toolText}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.row, isUser ? styles.rowUser : styles.rowAgent]}
      accessibilityRole="text"
      accessibilityLabel={`${isUser ? "You" : "Your agent"}: ${message.content}`}
    >
      {!isUser && (
        <View style={styles.agentAvatar}>
          <Bot size={14} color={Colors.white} />
        </View>
      )}

      <View style={styles.bubbleColumn}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAgent,
            message.status === "failed" && styles.bubbleFailed,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.bubbleTextUser : styles.bubbleTextAgent,
            ]}
          >
            {message.content}
          </Text>
        </View>

        {showMeta || message.status !== "sent" ? (
          <View style={[styles.meta, isUser && styles.metaUser]}>
            {message.status === "sending" ? (
              <>
                <Clock size={11} color={Colors.textLight} />
                <Text style={styles.metaText}>Sending…</Text>
              </>
            ) : message.status === "failed" ? (
              <TouchableOpacity
                style={styles.retry}
                onPress={() => onRetry(message.clientId)}
                accessibilityRole="button"
                accessibilityLabel="Retry sending this message"
              >
                <AlertCircle size={11} color={Colors.error} />
                <Text style={styles.retryText}>Not delivered — tap to retry</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.metaText}>{time}</Text>
                {isUser ? <Check size={11} color={Colors.textLight} /> : null}
              </>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ============================================================
// Typing indicator
// ============================================================

function TypingBubble({ agentName }: { agentName: string }) {
  const dots = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]).current;

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(dot, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 320,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay((2 - index) * 160),
        ]),
      ),
    );
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dots]);

  return (
    <View style={[styles.row, styles.rowAgent]}>
      <View style={styles.agentAvatar}>
        <Bot size={14} color={Colors.white} />
      </View>
      <View>
        <View style={[styles.bubble, styles.bubbleAgent, styles.typingBubble]}>
          {dots.map((dot, index) => (
            <Animated.View
              key={index}
              style={[styles.typingDot, { opacity: dot }]}
            />
          ))}
        </View>
        <Text style={styles.typingLabel}>{agentName} is typing…</Text>
      </View>
    </View>
  );
}

// ============================================================
// Suggestions
// ============================================================

function SuggestionList({ onPick }: { onPick: (message: string) => void }) {
  return (
    <View style={styles.suggestions}>
      <Text style={styles.suggestionsTitle}>Try asking</Text>
      {SUGGESTIONS.map((suggestion) => (
        <TouchableOpacity
          key={suggestion.label}
          style={styles.suggestionChip}
          onPress={() => onPick(suggestion.message)}
          accessibilityRole="button"
          accessibilityLabel={suggestion.label}
        >
          <Text style={styles.suggestionText}>{suggestion.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  // Welcome
  welcomeCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: AGENT_VIOLET + "12",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  welcomeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AGENT_VIOLET + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  welcomeName: {
    fontWeight: "700",
    color: Colors.text,
  },
  // Rows
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
    gap: 8,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAgent: {
    justifyContent: "flex-start",
  },
  agentAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AGENT_VIOLET,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleColumn: {
    maxWidth: "82%",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 5,
  },
  bubbleAgent: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleFailed: {
    opacity: 0.6,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: Colors.white,
  },
  bubbleTextAgent: {
    color: Colors.text,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  metaUser: {
    justifyContent: "flex-end",
  },
  metaText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  retryText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: "600",
  },
  // Tool card
  toolCard: {
    backgroundColor: AGENT_VIOLET + "10",
    borderWidth: 1,
    borderColor: AGENT_VIOLET + "30",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    marginLeft: 34,
    gap: 8,
  },
  toolHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: AGENT_VIOLET,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  toolText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  // Typing
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 14,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AGENT_VIOLET,
  },
  typingLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  // Suggestions
  suggestions: {
    marginTop: 8,
    gap: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionChip: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  // Composer
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 11 : 8,
    paddingBottom: Platform.OS === "ios" ? 11 : 8,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AGENT_VIOLET,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
});
