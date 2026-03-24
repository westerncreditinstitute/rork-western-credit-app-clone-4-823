/**
 * CharacterCommandInput
 * =====================
 * Text input component for sending commands/messages to the AI character.
 * Includes quick-action buttons for common commands and a text input
 * with send button.
 */

import React, { useState, useRef, memo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Send, Zap } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

// ─────────────────────────────────────────────────────────────
// Quick Actions
// ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: '📊 Status', command: 'Check my financial status' },
  { label: '💡 Advice', command: 'What should I focus on?' },
  { label: '💳 Pay Bills', command: 'Pay my bills' },
  { label: '💰 Save', command: 'Save money' },
  { label: '📈 Invest', command: 'Should I invest?' },
  { label: '🎯 Goals', command: 'What are my goals?' },
  { label: '📋 Plan', command: 'Review my financial plan' },
  { label: '🏠 Property', command: 'Should I buy property?' },
];

// ─────────────────────────────────────────────────────────────
// Quick Action Button
// ─────────────────────────────────────────────────────────────

interface QuickActionProps {
  label: string;
  onPress: () => void;
  colors: any;
}

const QuickAction = memo(({ label, onPress, colors }: QuickActionProps) => (
  <TouchableOpacity
    style={[styles.quickAction, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.quickActionText, { color: colors.primary }]}>{label}</Text>
  </TouchableOpacity>
));

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

interface CharacterCommandInputProps {
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  showQuickActions?: boolean;
}

function CharacterCommandInput({
  onSendMessage,
  isThinking,
  showQuickActions = true,
}: CharacterCommandInputProps) {
  const { colors } = useTheme();
  const [inputText, setInputText] = useState('');
  const [isQuickActionsExpanded, setIsQuickActionsExpanded] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || isThinking) return;

    onSendMessage(trimmed);
    setInputText('');
    Keyboard.dismiss();
  }, [inputText, isThinking, onSendMessage]);

  const handleQuickAction = useCallback((command: string) => {
    if (isThinking) return;
    onSendMessage(command);
    setIsQuickActionsExpanded(false);
  }, [isThinking, onSendMessage]);

  const toggleQuickActions = useCallback(() => {
    setIsQuickActionsExpanded(prev => !prev);
  }, []);

  return (
    <View style={styles.container}>
      {/* Quick Actions */}
      {showQuickActions && (
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={[styles.quickActionsToggle, { borderColor: colors.border }]}
            onPress={toggleQuickActions}
            activeOpacity={0.7}
          >
            <Zap size={14} color={colors.primary} />
            <Text style={[styles.quickActionsToggleText, { color: colors.primary }]}>
              {isQuickActionsExpanded ? 'Hide Quick Actions' : 'Quick Actions'}
            </Text>
          </TouchableOpacity>

          {isQuickActionsExpanded && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickActionsScroll}
              contentContainerStyle={styles.quickActionsContent}
            >
              {QUICK_ACTIONS.map((action) => (
                <QuickAction
                  key={action.command}
                  label={action.label}
                  onPress={() => handleQuickAction(action.command)}
                  colors={colors}
                />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Text Input Row */}
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          ref={inputRef}
          style={[styles.textInput, { color: colors.text }]}
          placeholder="Talk to your AI advisor..."
          placeholderTextColor={colors.textSecondary + '80'}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!isThinking}
          multiline={false}
          maxLength={200}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() && !isThinking
                ? colors.primary
                : colors.primary + '40',
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isThinking}
          activeOpacity={0.7}
        >
          <Send size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  quickActionsContainer: {
    marginBottom: 8,
  },
  quickActionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  quickActionsToggleText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  quickActionsScroll: {
    maxHeight: 36,
  },
  quickActionsContent: {
    paddingRight: 8,
    gap: 6,
    flexDirection: 'row',
  },
  quickAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
    maxHeight: 40,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default memo(CharacterCommandInput);