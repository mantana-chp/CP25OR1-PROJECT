import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface ChatBubbleProps {
  message: string
  isUser: boolean
  timestamp?: string
}

export default function ChatBubble({
  message,
  isUser
}: ChatBubbleProps) {
  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer
      ]}
    >
      {!isUser && (
        <View style={styles.aiIconContainer}>
          <Ionicons name="paw" size={20} color="#FFFFFF" />
        </View>
      )}
      <View
        style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
      >
        <Text
          style={[styles.messageText, isUser ? styles.userText : styles.aiText]}
        >
          {message}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'flex-start'
  },
  userContainer: {
    justifyContent: 'flex-end'
  },
  aiContainer: {
    justifyContent: 'flex-start'
  },
  aiIconContainer: {
    backgroundColor: '#5FA7D1',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  bubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16
  },
  aiBubble: {
    backgroundColor: '#D7E9F4',
    borderTopLeftRadius: 4
  },
  userBubble: {
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22
  },
  aiText: {
    color: '#225877',
    fontFamily: 'Prompt_400Regular'
  },
  userText: {
    color: '#2D3748',
    fontFamily: 'Prompt_400Regular'
  }
})
