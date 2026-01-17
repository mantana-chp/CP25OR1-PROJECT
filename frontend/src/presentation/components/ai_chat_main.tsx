import React, { useState } from 'react'
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Info } from 'lucide-react-native'
import { DisclaimerModal } from '../ai_chatbot/ai_chatbot_disclaimer_modal'

interface ChatMainProps {
  headerComponent?: React.ReactNode
}

export const ChatMain: React.FC<ChatMainProps> = ({}) => {
  const [disclaimerVisible, setDisclaimerVisible] = useState(false)
  const insets = useSafeAreaInsets()

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
})
