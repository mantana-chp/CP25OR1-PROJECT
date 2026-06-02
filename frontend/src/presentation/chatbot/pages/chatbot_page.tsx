import _ from 'lodash'
import React, { useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View
} from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'

import { useError } from '@/src/presentation/components/error_context'
import {
  ChatResponse,
  PetClarificationOption,
  PetClarificationRequestData,
  SeverityLevel
} from '@/src/domain/chatbot.domain'
import { chatbotService } from '@/src/utils/api/services/chatbot_service'

import Header from '../../components/header_component'
import { DisclaimerModal } from '../components/ai_chatbot_disclaimer_modal'
import ChatBubble from '../components/chat_bubble'
import ChatInput from '../components/chat_input'
import { InfoButton } from '../components/info_button'
import PetClarificationWidget from '../components/pet_clarification_widget'
import TryAgainHandler from '../components/try_again_handler'
import SeverityScaleWidget from '../components/severity_scale_widget'

interface Message {
  id: string
  text: string
  isUser: boolean
  requiresSeverityInput?: boolean
  awaitingSeverity?: boolean
  originalQuery?: string
  severityPrompt?: string
  severityContextId?: string
  requiresPetClarificationInput?: boolean
  awaitingPetClarification?: boolean
  petClarificationPrompt?: string
  petClarificationContextId?: string
  petClarificationOptions?: PetClarificationOption[]
}

function getPetOptions(
  request?: PetClarificationRequestData
): PetClarificationOption[] {
  if (!request) {
    return []
  }

  if (request.ambiguousPets && request.ambiguousPets.length > 0) {
    return request.ambiguousPets
  }

  return request.options ?? []
}

function getPetDisplayName(option: PetClarificationOption): string {
  return option.petName ?? option.pet_name ?? 'สัตว์เลี้ยง'
}

function getPetId(option: PetClarificationOption): string | undefined {
  return option.petId ?? option.id
}

function mapAiMessageFromResponse(
  responseData: ChatResponse,
  fallbackQuery?: string
): Message {
  const requiresSeverity =
    responseData.contextStatus === 'pending_severity' ||
    responseData.severityFlag === true
  const petOptions = getPetOptions(responseData.petClarificationRequest)
  const requiresPetClarification =
    responseData.petContextStatus === 'pending_clarification' &&
    petOptions.length > 0

  return {
    id: (Date.now() + 1).toString(),
    text: responseData.answer,
    isUser: false,
    requiresSeverityInput: requiresSeverity,
    awaitingSeverity: requiresSeverity,
    originalQuery: requiresSeverity ? fallbackQuery : undefined,
    severityPrompt: responseData.severityRequest?.prompt,
    severityContextId:
      responseData.severityRequest?.contextId ?? responseData.contextId,
    requiresPetClarificationInput: requiresPetClarification,
    awaitingPetClarification: requiresPetClarification,
    petClarificationPrompt: responseData.petClarificationRequest?.prompt,
    petClarificationContextId:
      responseData.petClarificationRequest?.contextId ?? responseData.contextId,
    petClarificationOptions: requiresPetClarification ? petOptions : undefined
  }
}

export default function ChatbotPage() {
  const { showError } = useError()
  const clientChatSessionId = useRef(uuidv4()).current

  const [disclaimerVisible, setDisclaimerVisible] = useState(true)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [resolvedPetId, setResolvedPetId] = useState<string | undefined>(
    undefined
  )
  const [activeContextId, setActiveContextId] = useState<string | undefined>()
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isError, setIsError] = useState(false)
  const [lastFailedMessage, setLastFailedMessage] = useState<string>('')
  const scrollViewRef = useRef<ScrollView>(null)

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
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true
    }

    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)
    setIsError(false)

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      const response = await chatbotService.sendMessage(
        text,
        clientChatSessionId,
        {
          resolvedPetId,
          contextId: activeContextId
        }
      )

      setResolvedPetId(response.data.resolvedPetId)
      setActiveContextId(response.data.contextId)

      const aiMessage = mapAiMessageFromResponse(response.data, text)
      setMessages((prev) => [...prev, aiMessage])

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error: any) {
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
    const targetMessage = messages.find((msg) => msg.id === messageId)
    const originalQuery = targetMessage?.originalQuery || 'ช่วยประเมินอาการนี้'
    const targetContextId = targetMessage?.severityContextId ?? activeContextId

    if (!targetContextId) {
      showError('ไม่พบข้อมูลบริบทของอาการ กรุณาลองส่งคำถามใหม่อีกครั้ง')
      return
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, awaitingSeverity: false } : msg
      )
    )

    const userSeverityMessage: Message = {
      id: Date.now().toString(),
      text: `เลือกระดับความรุนแรง: ${label} (${level}/5)`,
      isUser: true
    }
    setMessages((prev) => [...prev, userSeverityMessage])

    setIsTyping(true)

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      const response = await chatbotService.sendMessage(
        originalQuery,
        clientChatSessionId,
        {
          resolvedPetId,
          contextId: targetContextId,
          severitySubmission: {
            contextId: targetContextId,
            level,
            label
          }
        }
      )

      setResolvedPetId(response.data.resolvedPetId)
      setActiveContextId(response.data.contextId)
      const aiMessage = mapAiMessageFromResponse(response.data, originalQuery)
      setMessages((prev) => [...prev, aiMessage])

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error: any) {
      showError('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsTyping(false)
    }
  }

  const handlePetClarificationSelect = async (
    messageId: string,
    selectedPetId: string
  ) => {
    const targetMessage = messages.find((msg) => msg.id === messageId)
    const targetContextId =
      targetMessage?.petClarificationContextId ?? activeContextId
    const originalQuery =
      targetMessage?.originalQuery || 'ช่วยวิเคราะห์อาการนี้'

    if (!targetContextId) {
      showError('ไม่พบข้อมูลบริบทของการเลือกสัตว์เลี้ยง กรุณาลองใหม่อีกครั้ง')
      return
    }

    const selectedPet = targetMessage?.petClarificationOptions?.find(
      (option) => getPetId(option) === selectedPetId
    )

    const selectedPetName = selectedPet
      ? getPetDisplayName(selectedPet)
      : 'สัตว์เลี้ยงที่เลือก'

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, awaitingPetClarification: false } : msg
      )
    )

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: `เลือกสัตว์เลี้ยง: ${selectedPetName}`,
        isUser: true
      }
    ])

    setIsTyping(true)

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      const response = await chatbotService.sendMessage(
        originalQuery,
        clientChatSessionId,
        {
          resolvedPetId: selectedPetId,
          contextId: targetContextId,
          petClarificationSubmission: {
            contextId: targetContextId,
            selectedPetId
          }
        }
      )

      setResolvedPetId(response.data.resolvedPetId)
      setActiveContextId(response.data.contextId)
      const aiMessage = mapAiMessageFromResponse(response.data, originalQuery)
      setMessages((prev) => [...prev, aiMessage])

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error: any) {
      showError('เกิดข้อผิดพลาดในการยืนยันสัตว์เลี้ยง กรุณาลองใหม่อีกครั้ง')
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
              <ChatBubble message={message.text} isUser={message.isUser} />

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

              {message.requiresPetClarificationInput &&
                message.awaitingPetClarification &&
                message.petClarificationOptions &&
                message.petClarificationOptions.length > 0 && (
                  <PetClarificationWidget
                    prompt={
                      message.petClarificationPrompt ||
                      'กรุณาเลือกสัตว์เลี้ยงที่คุณกำลังถามถึง'
                    }
                    options={message.petClarificationOptions}
                    onSelect={(petId) =>
                      handlePetClarificationSelect(message.id, petId)
                    }
                    disabled={isTyping}
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
