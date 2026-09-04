import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { X, Send, Bot, User as UserIcon } from "lucide-react-native";
import Colors from "@/constants/colors";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/contexts/UserContext";

// ============================================================
// Types
// ============================================================

export interface ChatMessage {
  id?: number;
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  createdAt?: string;
}

export interface AgentChatModalProps {
  visible: boolean;
  onClose: () => void;
  agentId: number;
  agentName: string;
  agentAvatar?: string;
  /** Callback when the AI triggers the dispute letter modal */
  onTriggerCreditRepair?: (data: {
    letterType?: string;
    creditorName?: string;
    accountNumber?: string;
  }) => void;
  /** Callback when the AI triggers the dispute tracker modal */
  onTriggerDisputeTracker?: () => void;
  /** Refresh dispute data after a tool creates/updates a dispute */
  onDisputeDataChanged?: () => void;
}

// ============================================================
// Component
// ============================================================

export default function AgentChatModal({
  visible,
  onClose,
  agentId,
  agentName,
  agentAvatar,
  onTriggerCreditRepair,
  onTriggerDisputeTracker,
  onDisputeDataChanged,
}: AgentChatModalProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const userId = user?.id || "";

  // ============================================================
  // Load chat history when modal opens
  // ============================================================

  const chatHistoryQuery = trpc.aiAgents.getChatHistory.useQuery(
    { userId, limit: 50 },
    {
      enabled: visible && !!userId,
      staleTime: 0,
      refetchOnMount: true,
    }
  );

  useEffect(() => {
    if (chatHistoryQuery.data) {
      const mapped: ChatMessage[] = chatHistoryQuery.data.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolName: m.tool_name || undefined,
        createdAt: m.created_at,
      }));
      setMessages(mapped);
    } else if (!chatHistoryQuery.isLoading) {
      // No history — show a welcome message
      setMessages([
        {
          role: "assistant",
          content: `Hi! I'm ${agentName}, your personal AI Credit Repair Agent. I can help you check your dispute status, generate dispute letters, and provide credit building strategies. What would you like to work on today?`,
        },
      ]);
    }
  }, [chatHistoryQuery.data, chatHistoryQuery.isLoading, agentName]);

  // ============================================================
  // Send message mutation
  // ============================================================

  const chatMutation = trpc.aiAgents.chat.useMutation({
    onSuccess: (data: any) => {
      // The backend returns the response + executed tool calls
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
      setIsSending(false);

      // Check if any tool calls should trigger modals
      if (data.toolCalls && data.toolCalls.length > 0) {
        let disputesChanged = false;

        for (const tc of data.toolCalls) {
          if (tc.name === "generate_dispute_letter") {
            disputesChanged = true;
            // If the letter was generated, we can optionally open the
            // credit repair modal for the user to review/edit.
            if (onTriggerCreditRepair && tc.result) {
              onTriggerCreditRepair({
                letterType: tc.result.letterType,
                creditorName: tc.result.creditorName,
                accountNumber: tc.result.accountNumber,
              });
            }
          }
          if (tc.name === "get_disputes") {
            // Surface dispute data — optionally open the tracker
            if (onTriggerDisputeTracker) {
              // Don't auto-open; the user can review in chat first.
              // The agent's response already contains the summary.
            }
          }
        }

        if (disputesChanged && onDisputeDataChanged) {
          onDisputeDataChanged();
        }
      }
    },
    onError: (error: any) => {
      setIsSending(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I encountered an error: ${error.message}. Please try again.`,
        },
      ]);
    },
  });

  // ============================================================
  // Send a message
  // ============================================================

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isSending || !userId) return;

    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInputText("");
    setIsSending(true);

    // Build history from current messages (last 10 for context)
    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    chatMutation.mutate({
      userId,
      agentId,
      message: text,
      history,
    });
  }, [inputText, isSending, userId, agentId, messages, chatMutation]);

  // ============================================================
  // Quick action buttons
  // ============================================================

  const quickActions = [
    {
      label: "What disputes are open?",
      message: "What disputes do I currently have open? Show me their status.",
    },
    {
      label: "Write a 609 letter",
      message: "Can you write a 609 dispute letter for me?",
    },
    {
      label: "Credit tips",
      message: "What are the best credit building tips for me right now?",
    },
    {
      label: "Explain credit scores",
      message: "Explain the five credit score factors and their percentages.",
    },
  ];

  // ============================================================
  // Render
  // ============================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`Chat with ${agentName}`}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {agentAvatar ? (
              <View style={styles.headerAvatar}>
                {Platform.OS === "web" ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <img src={agentAvatar} style={styles.avatarImg} />
                ) : null}
              </View>
            ) : (
              <View style={styles.headerAvatar}>
                <Bot color={Colors.surface} size={20} />
              </View>
            )}
            <View>
              <Text style={styles.headerTitle}>{agentName}</Text>
              <Text style={styles.headerSubtitle}>AI Credit Repair Agent</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close chat"
          >
            <X color={Colors.text} size={24} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, index) => (
            <MessageBubble key={msg.id || index} message={msg} />
          ))}

          {isSending && (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>{agentName} is thinking...</Text>
            </View>
          )}

          {/* Quick actions (show when few messages) */}
          {messages.length <= 1 && !isSending && (
            <View style={styles.quickActions}>
              <Text style={styles.quickActionsTitle}>Try asking:</Text>
              {quickActions.map((qa, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickActionButton}
                  onPress={() => {
                    setInputText(qa.message);
                    // Auto-send after a brief delay
                    setTimeout(() => {
                      const text = qa.message;
                      setMessages((prev) => [
                        ...prev,
                        { role: "user", content: text },
                      ]);
                      setInputText("");
                      setIsSending(true);
                      chatMutation.mutate({
                        userId,
                        agentId,
                        message: text,
                        history: [],
                      });
                    }, 50);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={qa.label}
                >
                  <Text style={styles.quickActionText}>{qa.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask your agent about disputes, credit tips, or letter generation..."
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={2000}
            editable={!isSending}
            accessibilityLabel="Type your message"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Send color={Colors.surface} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================
// Message Bubble Sub-component
// ============================================================

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  if (isTool) {
    // Tool messages are displayed as special cards within the chat
    return (
      <View style={styles.toolMessage}>
        <Text style={styles.toolContent}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAgent,
      ]}
    >
      {!isUser && (
        <View style={styles.messageAvatar}>
          <Bot color={Colors.surface} size={16} />
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.bubbleUser : styles.bubbleAgent,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.messageTextUser : styles.messageTextAgent,
          ]}
        >
          {message.content}
        </Text>
      </View>
      {isUser && (
        <View style={[styles.messageAvatar, styles.messageAvatarUser]}>
          <UserIcon color={Colors.surface} size={16} />
        </View>
      )}
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
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      web: { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    }),
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    overflow: "hidden" as const,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
  },
  closeButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row" as const,
    marginBottom: 12,
    maxWidth: "100%",
    alignItems: "flex-end" as const,
  },
  messageRowUser: {
    justifyContent: "flex-end" as const,
  },
  messageRowAgent: {
    justifyContent: "flex-start" as const,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: 8,
  },
  messageAvatarUser: {
    backgroundColor: Colors.textLight,
    marginLeft: 8,
    marginRight: 0,
  },
  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextUser: {
    color: Colors.surface,
  },
  messageTextAgent: {
    color: Colors.text,
  },
  toolMessage: {
    backgroundColor: (Colors.accent || "#6366f1") + "15",
    borderWidth: 1,
    borderColor: (Colors.accent || "#6366f1") + "30",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    marginLeft: 36,
  },
  toolContent: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  typingIndicator: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: "italic" as const,
  },
  quickActions: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  quickActionsTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textLight,
    marginBottom: 10,
  },
  quickActionButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  inputContainer: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
