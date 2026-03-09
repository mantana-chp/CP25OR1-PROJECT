import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  Platform
} from 'react-native'
import { Image } from 'expo-image'
import { X, Download, FileText } from 'lucide-react-native'
import { IAttachment } from '@/src/domain/reminder.domain'

interface AttachmentPreviewModalProps {
  visible: boolean
  attachment: IAttachment | null
  onClose: () => void
}

export default function AttachmentPreviewModal({
  visible,
  attachment,
  onClose
}: AttachmentPreviewModalProps) {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  if (!attachment) return null

  const isImage = attachment.fileType.startsWith('image/')
  const isPDF = attachment.fileType === 'application/pdf'

  const handleDownload = () => {
    if (attachment.downloadUrl) {
      Linking.openURL(attachment.downloadUrl).catch(() => {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเปิดไฟล์ได้')
      })
    }
  }

  const resetState = () => {
    setImageLoading(true)
    setImageError(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        {/* Header with filename and close button */}
        <View style={styles.headerBar}>
          <View style={styles.headerInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {attachment.fileName}
            </Text>
            <Text style={styles.fileType}>
              {attachment.fileType.split('/')[1].toUpperCase()}
            </Text>
          </View>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Preview Content */}
        <View style={styles.previewContainer}>
          {isImage && !imageError ? (
            <>
              {imageLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              )}
              <Image
                source={{ uri: attachment.downloadUrl }}
                style={styles.image}
                contentFit="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false)
                  setImageError(true)
                }}
              />
            </>
          ) : (
            <View style={styles.fileIconContainer}>
              <FileText size={80} color="#FFFFFF" />
              <Text style={styles.fileMessage}>
                {isPDF
                  ? 'แตะดาวน์โหลดเพื่อเปิดไฟล์ PDF'
                  : 'ไม่สามารถแสดงตัวอย่างได้'}
              </Text>
            </View>
          )}
        </View>

        {/* Download Button - Icon Only */}
        <View style={styles.actionBar}>
          <Pressable style={styles.downloadButton} onPress={handleDownload}>
            <Download size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  headerBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 16
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
    gap: 2
  },
  fileName: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#FFFFFF'
  },
  fileType: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  closeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  previewContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  },
  image: {
    width: '100%',
    height: '100%'
  },
  fileIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    padding: 32
  },
  fileMessage: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  actionBar: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 16
  },
  downloadButton: {
    backgroundColor: 'rgba(95, 167, 209, 0.9)',
    borderRadius: 50,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  }
})
