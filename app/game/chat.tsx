import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  MessageCircle,
  Send,
  Users,
  Globe,
  Shield,
  User,
  ChevronLeft,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { ChatRoom, ChatMessage } from '@/types/multiplayer';

export default function ChatScreen() {
  const { colors } = useTheme();
  const { chatRooms, chatMessages, sendChatMessage, currentPlayer } = useMultiplayer();

  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messageText, setMessageText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedRoom]);

  const getRoomIcon = (type: ChatRoom['type']) => {
    switch (type) {
      case 'global': return Globe;
      case 'guild': return Shield;
      case 'private': return User;
      default: return MessageCircle;
    }
  };

  const getRoomColor = (type: ChatRoom['type']) => {
    switch (type) {
      case 'global': return '#10B981';
      case 'guild': return '#8B5CF6';
      case 'private': return '#3B82F6';
      default: return '#F59E0B';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleSend = () => {
    if (!messageText.trim() || !selectedRoom) return;
    sendChatMessage(selectedRoom.id, messageText.trim());
    setMessageText('');
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderRoomList = () => (
    <Animated.View style={[styles.roomList, { opacity: fadeAnim }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CHAT ROOMS</Text>
      {chatRooms.map(room => {
        const RoomIcon = getRoomIcon(room.type);
        const roomColor = getRoomColor(room.type);
        const messages = chatMessages[room.id] || [];
        const lastMsg = messages[messages.length - 1];

        return (
          <TouchableOpacity
            key={room.id}
            style={[styles.roomItem, { backgroundColor: colors.surface }]}
            onPress={() => setSelectedRoom(room)}
            activeOpacity={0.7}
          >
            <View style={[styles.roomIcon, { backgroundColor: roomColor + '20' }]}>
              <RoomIcon size={22} color={roomColor} />
            </View>
            <View style={styles.roomInfo}>
              <View style={styles.roomHeader}>
                <Text style={[styles.roomName, { color: colors.text }]}>{room.name}</Text>
                {lastMsg && (
                  <Text style={[styles.roomTime, { color: colors.textSecondary }]}>
                    {formatTime(lastMsg.timestamp)}
                  </Text>
                )}
              </View>
              {lastMsg && (
                <Text style={[styles.roomPreview, { color: colors.textSecondary }]} numberOfLines={1}>
                  {lastMsg.type === 'system' ? lastMsg.content : `${lastMsg.senderName}: ${lastMsg.content}`}
                </Text>
              )}
            </View>
            {room.unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.unreadText}>{room.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );

  const renderMessage = (message: ChatMessage, index: number, messages: ChatMessage[]) => {
    const isOwn = message.senderId === currentPlayer?.id;
    const showAvatar = index === 0 || messages[index - 1]?.senderId !== message.senderId;
    const isSystem = message.type === 'system';

    if (isSystem) {
      return (
        <View key={message.id} style={styles.systemMessage}>
          <Text style={[styles.systemMessageText, { color: colors.textSecondary }]}>
            {message.content}
          </Text>
        </View>
      );
    }

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isOwn ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwn && showAvatar && (
          message.senderAvatarUrl ? (
            <Image source={{ uri: message.senderAvatarUrl }} style={styles.messageAvatar} />
          ) : (
            <View style={[styles.messageAvatarPlaceholder, { backgroundColor: colors.primary + '30' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {message.senderName.charAt(0)}
              </Text>
            </View>
          )
        )}
        {!isOwn && !showAvatar && <View style={styles.avatarSpacer} />}
        
        <View style={styles.messageBubbleContainer}>
          {!isOwn && showAvatar && (
            <Text style={[styles.senderName, { color: colors.textSecondary }]}>
              {message.senderName}
            </Text>
          )}
          <View
            style={[
              styles.messageBubble,
              isOwn
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.messageText, { color: isOwn ? '#FFF' : colors.text }]}>
              {message.content}
            </Text>
          </View>
          <Text style={[styles.messageTime, { color: colors.textSecondary, textAlign: isOwn ? 'right' : 'left' }]}>
            {formatTime(message.timestamp)}
          </Text>
          
          {message.reactions.length > 0 && (
            <View style={styles.reactionsContainer}>
              {message.reactions.map((reaction, idx) => (
                <View key={idx} style={[styles.reactionBadge, { backgroundColor: colors.surface }]}>
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  <Text style={[styles.reactionCount, { color: colors.textSecondary }]}>{reaction.count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderChatView = () => {
    if (!selectedRoom) return null;
    const messages = chatMessages[selectedRoom.id] || [];
    const RoomIcon = getRoomIcon(selectedRoom.type);
    const roomColor = getRoomColor(selectedRoom.type);

    return (
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={[styles.chatHeader, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedRoom(null)}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={[styles.chatHeaderIcon, { backgroundColor: roomColor + '20' }]}>
            <RoomIcon size={20} color={roomColor} />
          </View>
          <View style={styles.chatHeaderInfo}>
            <Text style={[styles.chatHeaderTitle, { color: colors.text }]}>{selectedRoom.name}</Text>
            <Text style={[styles.chatHeaderSubtitle, { color: colors.textSecondary }]}>
              {selectedRoom.type === 'global' ? 'Everyone' :
               selectedRoom.type === 'guild' ? 'Guild members' : 'Private chat'}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length > 0 ? (
            messages.map((msg, idx) => renderMessage(msg, idx, messages))
          ) : (
            <View style={styles.emptyChat}>
              <MessageCircle size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyChatText, { color: colors.textSecondary }]}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: messageText.trim() ? colors.primary : colors.border },
            ]}
            onPress={handleSend}
            disabled={!messageText.trim()}
          >
            <Send size={20} color={messageText.trim() ? '#FFF' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: selectedRoom ? selectedRoom.name : 'Chat',
          headerShown: !selectedRoom,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        {selectedRoom ? renderChatView() : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {renderRoomList()}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  roomList: {},
  sectionTitle: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 1, marginBottom: 12 },
  roomItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 10 },
  roomIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  roomInfo: { flex: 1, marginLeft: 12 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roomName: { fontSize: 16, fontWeight: '600' as const },
  roomTime: { fontSize: 11 },
  roomPreview: { fontSize: 13 },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  unreadText: { color: '#FFF', fontSize: 11, fontWeight: '600' as const },
  chatContainer: { flex: 1 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  backButton: { padding: 4, marginRight: 8 },
  chatHeaderIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  chatHeaderInfo: { flex: 1, marginLeft: 10 },
  chatHeaderTitle: { fontSize: 16, fontWeight: '600' as const },
  chatHeaderSubtitle: { fontSize: 12, marginTop: 2 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  messageContainer: { flexDirection: 'row', marginBottom: 12, maxWidth: '85%' },
  ownMessage: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  otherMessage: { alignSelf: 'flex-start' },
  messageAvatar: { width: 32, height: 32, borderRadius: 16 },
  messageAvatarPlaceholder: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '600' as const },
  avatarSpacer: { width: 32 },
  messageBubbleContainer: { marginHorizontal: 8, maxWidth: '100%' },
  senderName: { fontSize: 11, marginBottom: 4, marginLeft: 4 },
  messageBubble: { padding: 12, borderRadius: 16, maxWidth: '100%' },
  messageText: { fontSize: 14, lineHeight: 20 },
  messageTime: { fontSize: 10, marginTop: 4, marginHorizontal: 4 },
  reactionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 4 },
  reactionBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  reactionEmoji: { fontSize: 12 },
  reactionCount: { fontSize: 11 },
  systemMessage: { alignItems: 'center', marginVertical: 12 },
  systemMessageText: { fontSize: 12, textAlign: 'center', paddingHorizontal: 16 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyChatText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
