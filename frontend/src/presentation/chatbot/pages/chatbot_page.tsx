import AsyncStorage from '@react-native-async-storage/async-storage'
import _ from 'lodash'
import { PawPrint } from 'lucide-react-native'
import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native'

import { usePets } from '@/src/context/PetContext'
import { IPetProfile } from '@/src/domain/pet.domain'
import { useError } from '@/src/presentation/components/error_context'
import { chatbotService } from '@/src/utils/api/services/chatbot_service'

import Header from '../../components/header_component'
import { DisclaimerModal } from '../components/ai_chatbot_disclaimer_modal'
import ChatBubble from '../components/chat_bubble'
import ChatInput from '../components/chat_input'
import { InfoButton } from '../components/info_button'
import PetDropdown from '../components/pet_dropdown'
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
  const { pets, loading, selectedPetId, setSelectedPetId, getSelectedPet } =
    usePets()
  const { showError } = useError()
  const { height: screenHeight } = useWindowDimensions()

  // Calculate tutorial position based on screen height
  const getTutorialTop = () => {
    const statusBarHeight =
      Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44
    const headerHeight = 50
    return statusBarHeight + headerHeight + 8
  }

  const [disclaimerVisible, setDisclaimerVisible] = useState(true)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const selectedPet = getSelectedPet()
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isError, setIsError] = useState(false)
  const [lastFailedMessage, setLastFailedMessage] = useState<string>('')
  const [toastMessage, setToastMessage] = useState<string>('')
  const [showTutorial, setShowTutorial] = useState(false)
  const toastOpacity = useRef(new Animated.Value(0)).current
  const tutorialOpacity = useRef(new Animated.Value(0)).current
  const scrollViewRef = useRef<ScrollView>(null)

  const TUTORIAL_KEY = 'chatbot_pet_dropdown_tutorial_seen'

  useEffect(() => {
    if (pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id)
    }
  }, [pets, selectedPetId])

  // Show welcome message after disclaimer is accepted
  useEffect(() => {
    if (disclaimerAccepted && messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        text: 'สวัสดีค่ะ! 😊 ยินดีต้อนรับค่ะ ดิฉันพร้อมช่วยเหลือคำถามต่างๆ เกี่ยวกับเลี้ยงสัตว์เลี้ยงของคุณ ไม่ว่าจะเป็นเรื่องการดูแล อาหาร สุขภาพ หรือเรื่องอื่นๆ สามารถถามได้ตลอดเวลาค่ะ 🐾',
        isUser: false
      }
      setMessages([welcomeMessage])

      // Check if tutorial has been seen
      checkTutorialStatus()
    }
  }, [disclaimerAccepted])

  const checkTutorialStatus = async () => {
    try {
      // TODO: Remove this line after testing
      await AsyncStorage.removeItem(TUTORIAL_KEY)

      const seen = await AsyncStorage.getItem(TUTORIAL_KEY)
      if (!seen && pets.length > 0) {
        // Small delay to let the UI settle
        setTimeout(() => {
          setShowTutorial(true)
          Animated.timing(tutorialOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          }).start()
        }, 500)
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error)
    }
  }

  const dismissTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_KEY, 'true')
      Animated.timing(tutorialOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start(() => {
        setShowTutorial(false)
      })
    } catch (error) {
      console.error('Error saving tutorial status:', error)
      setShowTutorial(false)
    }
  }

  const handleDisclaimerClose = () => {
    setDisclaimerVisible(false)
    setDisclaimerAccepted(true)
  }

  const handleSelectPet = (pet: IPetProfile) => {
    setSelectedPetId(pet.id)
    showPetToast(pet.pet_name)
  }

  const showPetToast = (petName: string) => {
    setToastMessage(`กำลังสนทนาเกี่ยวกับ ${petName}`)
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start()
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
      // Call the API with query and optional petId
      const response = await chatbotService.sendMessage(text, selectedPet?.id)

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
        selectedPet?.id
      )

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
        rightChildren={
          <PetDropdown
            pets={pets}
            selectedPet={selectedPet}
            onSelectPet={handleSelectPet}
          />
        }
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

        {/* Pet Selection Toast */}
        <Animated.View
          style={[styles.toast, { opacity: toastOpacity }]}
          pointerEvents="none"
        >
          <PawPrint size={14} color="#5FA7D1" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>

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

      {/* Pet Dropdown Tutorial */}
      {showTutorial && (
        <Modal transparent visible={showTutorial} animationType="none">
          <Animated.View
            style={[styles.tutorialOverlay, { opacity: tutorialOpacity }]}
          >
            <Pressable
              style={styles.tutorialPressable}
              onPress={dismissTutorial}
            >
              {/* Tutorial Content */}
              <View style={[styles.tutorialContent, { top: getTutorialTop() }]}>
                {/* Arrow pointing up-right */}
                <View style={styles.tutorialArrowContainer}>
                  <View style={styles.tutorialArrow} />
                </View>

                <View style={styles.tutorialCard}>
                  <View style={styles.tutorialIconRow}>
                    <PawPrint size={24} color="#5FA7D1" />
                  </View>
                  <Text style={styles.tutorialTitle}>เลือกสัตว์เลี้ยง</Text>
                  <Text style={styles.tutorialText}>
                    กดที่นี่เพื่อเลือกสัตว์เลี้ยงที่คุณต้องการสอบถาม
                    {'\n'}แชทบอทจะตอบคำถามตามข้อมูลของสัตว์เลี้ยงที่เลือก
                  </Text>
                  <Pressable
                    style={styles.tutorialButton}
                    onPress={dismissTutorial}
                  >
                    <Text style={styles.tutorialButtonText}>เข้าใจแล้ว</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </Modal>
      )}
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
  },
  toast: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#225877',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8F4FC'
  },
  toastText: {
    fontSize: 13,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  tutorialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)'
  },
  tutorialPressable: {
    flex: 1
  },
  tutorialContent: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end'
  },
  tutorialArrowContainer: {
    marginRight: 30,
    marginBottom: -1
  },
  tutorialArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF'
  },
  tutorialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8
  },
  tutorialIconRow: {
    alignItems: 'center',
    marginBottom: 12
  },
  tutorialTitle: {
    fontSize: 17,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    textAlign: 'center',
    marginBottom: 8
  },
  tutorialText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16
  },
  tutorialButton: {
    backgroundColor: '#5FA7D1',
    borderRadius: 30,
    paddingVertical: 10,
    alignItems: 'center'
  },
  tutorialButtonText: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#FFFFFF'
  }
})
