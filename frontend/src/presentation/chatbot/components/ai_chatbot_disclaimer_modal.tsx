import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

interface DisclaimerModalProps {
  visible: boolean
  onClose: () => void
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  visible,
  onClose
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} style={styles.backdrop}>
        <View
          onStartShouldSetResponder={() => true}
          onTouchEndCapture={(e) => e.stopPropagation()}
          style={styles.modalContent}
        >
          <Text style={styles.iconEmoji}>💡</Text>

          <Text style={styles.titleText}>รู้ไว้ก่อนคุยกับผู้ช่วย AI</Text>

          <View style={styles.bodyTextContainer}>
            <Text style={styles.bodyText}>
              ผู้ช่วย AI ของเราช่วยให้คำแนะนำ
              <Text style={styles.bodyTextBold}>เบื้องต้นเท่านั้น{'\n'}</Text>
              เพื่อช่วยคุณดูแลน้อง ๆ ได้ดีขึ้น{'\n'}
              คำแนะนำเหล่านี้{' '}
              <Text style={styles.bodyTextBold}>
                ไม่ใช่การวินิจฉัยโรค{'\n'}
                หรือการรักษา
              </Text>
              {'\n'}
              หากน้องมีอาการผิดปกติ หรือคุณรู้สึกกังวล{'\n'}
              แนะนำให้พาไปพบสัตวแพทย์ 🐾
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed
            ]}
          >
            <Text style={styles.closeButtonText}>เข้าใจแล้ว</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8
  },
  iconEmoji: {
    fontSize: 28,
    marginBottom: 8
  },
  titleText: {
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
    color: '#225877',
    marginBottom: 16,
    textAlign: 'center'
  },
  bodyTextContainer: {
    width: '100%'
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 24,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    textAlign: 'center',
    marginBottom: 20
  },
  bodyTextBold: {
    fontFamily: 'Prompt_500Medium',
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  mediumWeight: {
    fontWeight: '600'
  },
  emphasis: {
    fontWeight: '600',
    color: '#1C3E5E'
  },
  closeButton: {
    backgroundColor: '#5FA7D1',
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 80,
    alignSelf: 'center'
  },
  closeButtonPressed: {
    backgroundColor: '#4A8AB0'
  },
  closeButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Prompt_500Medium'
  }
})
