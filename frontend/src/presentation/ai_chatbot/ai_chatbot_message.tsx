import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ChatMessage } from '@/src/domain/ai_chatbot.domain'

interface ChatBubbleProps {
  message: ChatMessage
  isLoading?: boolean
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUserMessage = message.sender === 'user'

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.messageRow,
          isUserMessage ? styles.userRow : styles.aiRow,
        ]}
      >
        {!isUserMessage && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🤖</Text>
            </View>
          </View>
        )}

        <View
          style={[
            styles.contentContainer,
            isUserMessage ? styles.userContent : styles.aiContent,
          ]}
        >
          <View
            style={[
              styles.bubble,
              isUserMessage ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUserMessage ? styles.userText : styles.aiText,
              ]}
            >
              {message.text}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6BAED6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  contentContainer: {
    flex: 0,
    maxWidth: '80%',
  },
  userContent: {
    alignItems: 'flex-end',
  },
  aiContent: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B0D4EA',
  },
  aiBubble: {
    backgroundColor: '#DDEEF9',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    lineHeight: 24,
  },
  userText: {
    color: '#1F2937',
  },
  aiText: {
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 12,
    color: '#A0A0A0',
    marginHorizontal: 8,
  },
  spacer: {
    width: 32,
    marginLeft: 8,
  },
})
