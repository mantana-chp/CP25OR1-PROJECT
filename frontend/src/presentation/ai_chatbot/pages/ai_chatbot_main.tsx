import React, { useState } from 'react'
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DisclaimerModal } from '../components/ai_chatbot_disclaimer_modal'
import { InfoButton } from '../components/info_button'

interface ChatMainProps {
  headerComponent?: React.ReactNode
}

export const ChatMain: React.FC<ChatMainProps> = () => {
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
          <InfoButton onPress={() => setDisclaimerVisible(true)} />

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
