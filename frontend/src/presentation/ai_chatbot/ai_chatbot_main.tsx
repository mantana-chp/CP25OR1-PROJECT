import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChatMessage } from '@/src/domain/ai_chatbot.domain'
import { ChatBubble } from './ai_chatbot_message'
import { DisclaimerModal } from './ai_chatbot_disclaimer_modal'
import { mockChatMessages } from '@/src/utils/mockData/ai-chat-mock'
import { Info } from 'lucide-react-native'

interface ChatMainProps {
  headerComponent?: React.ReactNode
  inputComponent?: React.ReactNode
  onSendMessage?: (message: string) => void
}

export const ChatMain: React.FC<ChatMainProps> = ({
  headerComponent,
  inputComponent,
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages)
  const [disclaimerVisible, setDisclaimerVisible] = useState(false)
  const flatListRef = useRef<FlatList>(null)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }, [messages])

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    if (onSendMessage) {
      onSendMessage(text)
    }

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'ขอบคุณที่ติดต่อ ฉันกำลังประมวลผลคำถามของคุณ...',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    }, 800)
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top > 0 ? insets.top : 16,
              paddingBottom: 12,
            },
          ]}
        >
          <Pressable
            onPress={() => setDisclaimerVisible(true)}
            style={styles.infoButton}
          >
            <View style={styles.infoBadge}>
              <Info size={24} color='#FFFFFF' strokeWidth={3} />
            </View>
          </Pressable>

          <Text style={styles.headerTitle}>แชท</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <ChatBubble message={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
        />

        <View style={styles.inputContainer}>{inputComponent}</View>
      </KeyboardAvoidingView>

      <DisclaimerModal
        visible={disclaimerVisible}
        onClose={() => setDisclaimerVisible(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F2',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#5FA7D1',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  infoButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Prompt_700Bold',
    marginHorizontal: 8,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  inputContainer: {
    backgroundColor: '#FFF9F2',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
})
