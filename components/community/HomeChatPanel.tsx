import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  X,
  Send,
  Smile,
  Lock,
  Check,
  CheckCheck,
  AlertCircle,
  ChevronDown,
  Users,
  AtSign,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import {
  HomeChatMessage,
  ChatParticipant,
  EMOJI_CATEGORIES,
  QUICK_REACTIONS,
  formatMessageTime,
  ChatMessageType,
} from '@/types/homeChat';
import { homeChatService } from '@/services/HomeChatService';

const { width, height } = Dimensions.get('window');

interface HomeChatPanelProps {
  homeId: string;
  isVisible: boolean;
  onClose: () => void;
  participants?: ChatParticipant[];
  isHost?: boolean;
  bottomInset?: number;
}

export default function HomeChatPanel({
  homeId,
  isVisible,
  onClose,
  participants = [],
  isHost = false,
  bottomInset = 0,
}: HomeChatPanelProps) {
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState<HomeChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<ChatParticipant | null>(null);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [replyingTo, setReplyingTo] = useState<HomeChatMessage | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start();

      initializeChat();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, homeId]);

  const initializeChat = async () => {
    const history = await homeChatService.getMessageHistory(homeId);
    setMessages(history);

    const unsubMessage = homeChatService.onMessage(homeId, (message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const unsubTyping = homeChatService.onTyping(homeId, (userId, isTyping) => {
      setTypingUsers(prev => {
        if (isTyping && !prev.includes(userId)) {
          return [...prev, userId];
        }
        if (!isTyping) {
          return prev.filter(id => id !== userId);
        }
        return prev;
      });
    });

    return () => {
      unsubMessage();
      unsubTyping();
    };
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const messageType: ChatMessageType = isPrivateMode && selectedRecipient ? 'private' : 'text';

    await homeChatService.sendMessage({
      homeId,
      content: inputText.trim(),
      type: messageType,
      recipientId: isPrivateMode ? selectedRecipient?.id : undefined,
      replyToId: replyingTo?.id,
    });

    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, homeId, isPrivateMode, selectedRecipient, replyingTo]);

  const handleSendEmoji = useCallback(async (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await homeChatService.sendMessage({
      homeId,
      content: emoji,
      type: 'emoji',
    });

    setShowEmojiPicker(false);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [homeId]);

  const handleInputChange = useCallback((text: string) => {
    setInputText(text);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (text.length > 0) {
      homeChatService.sendTypingIndicator(homeId, true);
      
      typingTimeoutRef.current = setTimeout(() => {
        homeChatService.sendTypingIndicator(homeId, false);
      }, 2000);
    } else {
      homeChatService.sendTypingIndicator(homeId, false);
    }
  }, [homeId]);

  const handleSelectPrivateRecipient = useCallback((participant: ChatParticipant) => {
    setSelectedRecipient(participant);
    setIsPrivateMode(true);
    setShowParticipants(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleCancelPrivateMode = useCallback(() => {
    setIsPrivateMode(false);
    setSelectedRecipient(null);
  }, []);

  const renderMessageStatus = (status: HomeChatMessage['status']) => {
    switch (status) {
      case 'sending':
        return <View style={styles.statusDot} />;
      case 'sent':
        return <Check color={colors.textLight} size={12} />;
      case 'delivered':
        return <CheckCheck color={colors.textLight} size={12} />;
      case 'read':
        return <CheckCheck color={colors.primary} size={12} />;
      case 'failed':
        return <AlertCircle color="#EF4444" size={12} />;
      default:
        return null;
    }
  };

  const renderMessage = useCallback(({ item }: { item: HomeChatMessage }) => {
    const isOwnMessage = item.senderId === 'current_user';
    const isSystem = item.type === 'system';
    const isEmoji = item.type === 'emoji';
    const isPrivate = item.type === 'private';

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={styles.systemMessageBubble}>
            <Text style={styles.systemMessageText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    if (isEmoji) {
      return (
        <View style={[styles.messageRow, isOwnMessage && styles.ownMessageRow]}>
          {!isOwnMessage && item.senderAvatar && (
            <Image source={{ uri: item.senderAvatar }} style={styles.messageAvatar} />
          )}
          <View style={[styles.emojiBubble, isOwnMessage && styles.ownEmojiBubble]}>
            {!isOwnMessage && (
              <Text style={styles.senderName}>{item.senderName}</Text>
            )}
            <Text style={styles.emojiContent}>{item.content}</Text>
            <Text style={styles.messageTime}>{formatMessageTime(item.timestamp)}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isOwnMessage && styles.ownMessageRow]}>
        {!isOwnMessage && item.senderAvatar && (
          <Image source={{ uri: item.senderAvatar }} style={styles.messageAvatar} />
        )}
        <View style={[
          styles.messageBubble,
          isOwnMessage && styles.ownMessageBubble,
          isPrivate && styles.privateMessageBubble,
        ]}>
          {!isOwnMessage && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          {isPrivate && (
            <View style={styles.privateIndicator}>
              <Lock color={colors.primary} size={10} />
              <Text style={styles.privateText}>
                {isOwnMessage ? `To ${item.recipientName}` : 'Private message'}
              </Text>
            </View>
          )}
          <Text style={[styles.messageContent, isOwnMessage && styles.ownMessageContent]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
              {formatMessageTime(item.timestamp)}
            </Text>
            {isOwnMessage && (
              <View style={styles.statusIcon}>
                {renderMessageStatus(item.status)}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [colors, styles]);

  const renderEmojiPicker = () => (
    <View style={styles.emojiPickerContainer}>
      <View style={styles.emojiSection}>
        <Text style={styles.emojiSectionTitle}>Quick Reactions</Text>
        <View style={styles.emojiGrid}>
          {QUICK_REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiButton}
              onPress={() => handleSendEmoji(emoji)}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.emojiSection}>
        <Text style={styles.emojiSectionTitle}>Home</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_CATEGORIES.home.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiButton}
              onPress={() => handleSendEmoji(emoji)}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.emojiSection}>
        <Text style={styles.emojiSectionTitle}>Smileys</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_CATEGORIES.smileys.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiButton}
              onPress={() => handleSendEmoji(emoji)}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderParticipantsList = () => (
    <View style={styles.participantsContainer}>
      <Text style={styles.participantsTitle}>Send Private Message</Text>
      {participants.filter(p => p.id !== 'current_user').map((participant) => (
        <TouchableOpacity
          key={participant.id}
          style={styles.participantItem}
          onPress={() => handleSelectPrivateRecipient(participant)}
        >
          {participant.avatar ? (
            <Image source={{ uri: participant.avatar }} style={styles.participantAvatar} />
          ) : (
            <View style={[styles.participantAvatar, styles.participantAvatarPlaceholder]}>
              <Text style={styles.participantInitial}>
                {participant.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.participantInfo}>
            <Text style={styles.participantName}>{participant.name}</Text>
            {participant.isHost && (
              <Text style={styles.hostBadge}>Host</Text>
            )}
          </View>
          <View style={[styles.onlineIndicator, participant.isOnline && styles.online]} />
        </TouchableOpacity>
      ))}
      {participants.filter(p => p.id !== 'current_user').length === 0 && (
        <Text style={styles.noParticipantsText}>No other participants</Text>
      )}
    </View>
  );

  const typingIndicator = useMemo(() => {
    if (typingUsers.length === 0) return null;
    
    const names = typingUsers.slice(0, 2).join(', ');
    const suffix = typingUsers.length > 2 ? ` and ${typingUsers.length - 2} others` : '';
    
    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingDots}>
          <Animated.View style={styles.typingDot} />
          <Animated.View style={[styles.typingDot, { marginLeft: 4 }]} />
          <Animated.View style={[styles.typingDot, { marginLeft: 4 }]} />
        </View>
        <Text style={styles.typingText}>{names}{suffix} typing...</Text>
      </View>
    );
  }, [typingUsers, styles]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Live Chat</Text>
            <View style={styles.participantCount}>
              <Users color={colors.textLight} size={12} />
              <Text style={styles.participantCountText}>{participants.length}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowParticipants(!showParticipants);
                setShowEmojiPicker(false);
              }}
            >
              <AtSign color={colors.text} size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color={colors.text} size={22} />
            </TouchableOpacity>
          </View>
        </View>

        {showParticipants && renderParticipantsList()}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={10}
          initialNumToRender={15}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
        />

        {typingIndicator}

        {showEmojiPicker && renderEmojiPicker()}

        {isPrivateMode && selectedRecipient && (
          <View style={styles.privateModeBanner}>
            <Lock color="#FFFFFF" size={14} />
            <Text style={styles.privateModeText}>
              Private message to {selectedRecipient.name}
            </Text>
            <TouchableOpacity onPress={handleCancelPrivateMode}>
              <X color="#FFFFFF" size={16} />
            </TouchableOpacity>
          </View>
        )}

        {replyingTo && (
          <View style={styles.replyBanner}>
            <View style={styles.replyContent}>
              <Text style={styles.replyLabel}>Replying to {replyingTo.senderName}</Text>
              <Text style={styles.replyPreview} numberOfLines={1}>
                {replyingTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <X color={colors.textLight} size={16} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputContainer, { paddingBottom: bottomInset + 12 }]}>
          <TouchableOpacity
            style={styles.emojiToggle}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowEmojiPicker(!showEmojiPicker);
              setShowParticipants(false);
            }}
          >
            {showEmojiPicker ? (
              <ChevronDown color={colors.primary} size={22} />
            ) : (
              <Smile color={colors.textLight} size={22} />
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder={isPrivateMode ? `Message ${selectedRecipient?.name}...` : "Say something..."}
            placeholderTextColor={colors.textLight}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Send
              color={inputText.trim() ? '#FFFFFF' : colors.textLight}
              size={18}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.55,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
  },
  participantCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  participantCountText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  ownMessageRow: {
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: width * 0.72,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  ownMessageBubble: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  privateMessageBubble: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
  },
  privateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  privateText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.primary,
    marginBottom: 2,
  },
  messageContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  ownMessageContent: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
    color: colors.textLight,
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  statusIcon: {
    marginLeft: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textLight,
  },
  emojiBubble: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  ownEmojiBubble: {
    alignItems: 'flex-end',
  },
  emojiContent: {
    fontSize: 36,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageBubble: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  systemMessageText: {
    fontSize: 12,
    color: colors.primary,
    fontStyle: 'italic' as const,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textLight,
  },
  typingText: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic' as const,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  emojiToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  emojiPickerContainer: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxHeight: 200,
  },
  emojiSection: {
    marginBottom: 12,
  },
  emojiSectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  emojiButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  emoji: {
    fontSize: 24,
  },
  participantsContainer: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 200,
  },
  participantsTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  participantAvatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInitial: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  hostBadge: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500' as const,
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textLight,
  },
  online: {
    backgroundColor: '#22C55E',
  },
  noParticipantsText: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    paddingVertical: 20,
  },
  privateModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  privateModeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  replyPreview: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 4,
  },
});
