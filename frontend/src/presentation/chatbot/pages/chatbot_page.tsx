import _ from 'lodash'
import React, { useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native'

import { useError } from '@/src/presentation/components/error_context'
import { chatbotService } from '@/src/utils/api/services/chatbot_service'

import Header from '../../components/header_component'
import { DisclaimerModal } from '../components/ai_chatbot_disclaimer_modal'
import ChatBubble from '../components/chat_bubble'
import ChatInput from '../components/chat_input'
import { InfoButton } from '../components/info_button'
import TryAgainHandler from '../components/try_again_handler'
import SeverityScaleWidget from '../components/severity_scale_widget'
import { SeverityLevel } from '@/src/domain/chatbot.domain'

interface Message {
  id: string
  text: string
  isUser: boolean
  requiresSeverityInput?: boolean
  severityPrompt?: string
  awaitingSeverity?: boolean
}

export default function ChatbotPage() {
  const { showError } = useError()

  const [disclaimerVisible, setDisclaimerVisible] = useState(true)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [resolvedPetId, setResolvedPetId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isError, setIsError] = useState(false)
  const [lastFailedMessage, setLastFailedMessage] = useState<string>('')
  const scrollViewRef = useRef<ScrollView>(null)

  // Show welcome message after disclaimer is accepted
  useEffect(() => {
    if (disclaimerAccepted && messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        text: 'สวัสดีค่ะ! 😊 ยินดีต้อนรับค่ะ ดิฉันพร้อมช่วยเหลือคำถามต่างๆ เกี่ยวกับเลี้ยงสัตว์เลี้ยงของคุณ ไม่ว่าจะเป็นเรื่องการดูแล อาหาร สุขภาพ หรือเรื่องอื่นๆ สามารถถามได้ตลอดเวลาค่ะ 🐾',
        isUser: false
      }
      setMessages([welcomeMessage])
    }
  }, [disclaimerAccepted])

  const handleDisclaimerClose = () => {
    setDisclaimerVisible(false)
    setDisclaimerAccepted(true)
  }

  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true
    }

    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)
    setIsError(false)

    // Scroll to bottom after user message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      // Call the API with query and optional resolvedPetId
      const response = await chatbotService.sendMessage(text, resolvedPetId)

      // Always update resolvedPetId with what server returns
      // - New pet detected → server returns new uuid → state updates
      // - Same pet continuing → server echoes same uuid → no change
      // - No pet in query → server returns undefined → state resets to undefined
      setResolvedPetId(response.data.resolvedPetId)

      // Check if AI requires severity input
      const requiresSeverity = 
        response.data.requires_user_input === true && 
        response.data.input_type === 'severity_scale'

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.answer,
        isUser: false,
        requiresSeverityInput: requiresSeverity,
        severityPrompt: response.data.metadata?.prompt,
        awaitingSeverity: requiresSeverity
      }
      setMessages((prev) => [...prev, aiMessage])

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error: any) {
      console.error('Chat error:', error)
      setLastFailedMessage(text)
      setIsError(true)
      showError(
        error.message || 'เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง'
      )
    } finally {
      setIsTyping(false)
    }
  }

  const handleSeveritySelect = async (
    messageId: string,
    level: SeverityLevel,
    label: string
  ) => {
    // Mark the message as no longer awaiting severity
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, awaitingSeverity: false } : msg
      )
    )

    // Send severity context as a hidden message to AI
    const severityText = `[ระดับความรุนแรงของอาการ: ${level}/5 - ${label}]`
    
    // Show the severity selection as user message
    const userSeverityMessage: Message = {
      id: Date.now().toString(),
      text: `เลือกระดับความรุนแรง: ${label} (${level}/5)`,
      isUser: true
    }
    setMessages((prev) => [...prev, userSeverityMessage])

    setIsTyping(true)

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      // Send the severity context back to AI
      const response = await chatbotService.sendMessage(
        severityText,
        resolvedPetId
      )

      // Update resolvedPetId from response
      setResolvedPetId(response.data.resolvedPetId)

      // Add AI's follow-up response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.answer,
        isUser: false
      }
      setMessages((prev) => [...prev, aiMessage])

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error: any) {
      console.error('Error sending severity context:', error)
      showError('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsTyping(false)
    }
  }
  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage)
    }
  }

  return (
    <View style={styles.container}>
      <Header
        title="แชทบอท"
        leftChildren={<InfoButton onPress={() => setDisclaimerVisible(true)} />}
      />

      <KeyboardAvoidingView
        style={styles.chatContainer}
        keyboardVerticalOffset={0}
        behavior="padding"
      >
        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {_.map(messages, (message) => (
            <React.Fragment key={message.id}>
              <ChatBubble
                message={message.text}
                isUser={message.isUser}
              />
              
              {/* Show severity scale widget if needed */}
              {message.requiresSeverityInput && message.awaitingSeverity && (
                <SeverityScaleWidget
                  onSelect={(level, label) =>
                    handleSeveritySelect(message.id, level, label)
                  }
                  disabled={isTyping}
                  prompt={message.severityPrompt}
                />
              )}
            </React.Fragment>
          ))}

          {isTyping && <ChatBubble message="" isUser={false} isTyping={true} />}
        </ScrollView>

        {isError && (
          <TryAgainHandler
            onRetry={handleRetry}
            message="เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง"
          />
        )}

        {/* Chat Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isTyping || !disclaimerAccepted}
        />
      </KeyboardAvoidingView>

      {/* Disclaimer Modal */}
      <DisclaimerModal
        visible={disclaimerVisible}
        onClose={handleDisclaimerClose}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F1'
  },
  chatContainer: {
    flex: 1
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#FFF9F1'
  },
  messagesContent: {
    paddingVertical: 16,
    flexGrow: 1
  }
})
