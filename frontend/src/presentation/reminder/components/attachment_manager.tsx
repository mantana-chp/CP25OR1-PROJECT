import { useFocusEffect } from 'expo-router'
import React, { useCallback, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  InteractionManager,
  Linking,
  Modal,
  Platform,
  Pressable
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import {
  File,
  Plus,
  Trash2,
  Download,
  X,
  Camera,
  Image as ImageIcon,
  FileText
} from 'lucide-react-native'
import { IAttachment } from '@/src/domain/reminder.domain'

// Type for pending attachments in create mode
export interface IPendingAttachment extends Omit<
  IAttachment,
  'id' | 'reminderId' | 'createdAt'
> {
  id: string
  uri: string
  isPending: true
}

// Combined type for display
type DisplayAttachment = IAttachment | IPendingAttachment

interface AttachmentManagerProps {
  attachments: IAttachment[]
  pendingAttachments?: IPendingAttachment[]
  onAddAttachment: (file: {
    uri: string
    name: string
    size: number
    mimeType: string
  }) => Promise<void>
  onDeleteAttachment: (attachmentId: string) => Promise<void>
  onDownloadAttachment?: (attachment: IAttachment) => Promise<void>
  maxFiles?: number
  maxFileSize?: number // in MB
  allowedTypes?: string[]
  disabled?: boolean
  isUploading?: boolean
}

export default function AttachmentManager({
  attachments,
  pendingAttachments = [],
  onAddAttachment,
  onDeleteAttachment,
  onDownloadAttachment,
  maxFiles = 5,
  maxFileSize = 10,
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'],
  disabled = false,
  isUploading = false
}: AttachmentManagerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false)
  const [isPickerOpening, setIsPickerOpening] = useState(false)
  const isPickerActiveRef = useRef(false)
  const pickerRecoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  // Merge attachments and pending attachments for display
  const allAttachments: DisplayAttachment[] = [
    ...attachments,
    ...pendingAttachments
  ]

  const clearPickerRecoveryTimeout = () => {
    if (pickerRecoveryTimeoutRef.current) {
      clearTimeout(pickerRecoveryTimeoutRef.current)
      pickerRecoveryTimeoutRef.current = null
    }
  }

  const resetPickerState = () => {
    clearPickerRecoveryTimeout()
    isPickerActiveRef.current = false
    setIsPickerOpening(false)
  }

  const startPickerRecoveryTimeout = () => {
    clearPickerRecoveryTimeout()
    // Guard against native picker promises that never resolve on iOS.
    pickerRecoveryTimeoutRef.current = setTimeout(() => {
      resetPickerState()
    }, 45000)
  }

  const beginPickerFlow = async (): Promise<boolean> => {
    if (disabled || isUploading || isPickerActiveRef.current) {
      return false
    }

    if (allAttachments.length >= maxFiles) {
      Alert.alert('ถึงขีดจำกัด', `สามารถแนบไฟล์ได้สูงสุด ${maxFiles} ไฟล์`)
      return false
    }

    isPickerActiveRef.current = true
    setIsPickerOpening(true)
    setShowAttachmentOptions(false)
    startPickerRecoveryTimeout()

    // iOS needs a moment to dismiss this modal before presenting a native picker.
    if (Platform.OS === 'ios') {
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(resolve, 150)
        })
      })
    }

    return true
  }

  const endPickerFlow = () => {
    resetPickerState()
  }

  const handleOpenAttachmentOptions = () => {
    if (disabled || isUploading || allAttachments.length >= maxFiles) {
      return
    }

    // Recover from stale lock when returning from prior picker/navigation flow.
    if (isPickerActiveRef.current || isPickerOpening) {
      resetPickerState()
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['ยกเลิก', 'ถ่ายรูป', 'เลือกรูปภาพ', 'เลือกเอกสาร'],
          cancelButtonIndex: 0,
          userInterfaceStyle: 'light'
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            void handlePickFromCamera()
          } else if (buttonIndex === 2) {
            void handlePickFromGallery()
          } else if (buttonIndex === 3) {
            void handlePickDocument()
          }
        }
      )
      return
    }

    setShowAttachmentOptions(true)
  }

  useFocusEffect(
    useCallback(() => {
      resetPickerState()
      setShowAttachmentOptions(false)

      return () => {
        resetPickerState()
        setShowAttachmentOptions(false)
      }
    }, [])
  )

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <File size={20} color="#5FA7D1" />
    }
    return <File size={20} color="#5FA7D1" />
  }

  const handlePickFromCamera = async () => {
    const canContinue = await beginPickerFlow()
    if (!canContinue) {
      return
    }

    try {
      // Request camera permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync()

      if (!permissionResult.granted) {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงกล้องเพื่อถ่ายรูป')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8
      })

      if (result.canceled) return

      const image = result.assets[0]

      // Validate file size
      if (!image.fileSize) {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถได้รับขนาดไฟล์ได้')
        return
      }

      const fileSizeInMB = image.fileSize / (1024 * 1024)
      if (fileSizeInMB > maxFileSize) {
        Alert.alert('ไฟล์ใหญ่เกินไป', `ขนาดไฟล์ต้องไม่เกิน ${maxFileSize} MB`)
        return
      }

      await onAddAttachment({
        uri: image.uri,
        name: `photo_${Date.now()}.jpg`,
        size: image.fileSize,
        mimeType: 'image/jpeg'
      })
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถถ่ายรูปได้')
    } finally {
      endPickerFlow()
    }
  }

  const handlePickFromGallery = async () => {
    const canContinue = await beginPickerFlow()
    if (!canContinue) {
      return
    }

    try {
      // Request media library permissions
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permissionResult.granted) {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงคลังรูปภาพ')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8
      })

      if (result.canceled) return

      const image = result.assets[0]

      // Validate file size
      if (!image.fileSize) {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถได้รับขนาดไฟล์ได้')
        return
      }

      const fileSizeInMB = image.fileSize / (1024 * 1024)
      if (fileSizeInMB > maxFileSize) {
        Alert.alert('ไฟล์ใหญ่เกินไป', `ขนาดไฟล์ต้องไม่เกิน ${maxFileSize} MB`)
        return
      }

      // Get filename from uri or create one
      const fileName = image.uri.split('/').pop() || `image_${Date.now()}.jpg`

      await onAddAttachment({
        uri: image.uri,
        name: fileName,
        size: image.fileSize,
        mimeType: image.mimeType || 'image/jpeg'
      })
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้')
    } finally {
      endPickerFlow()
    }
  }

  const handlePickDocument = async () => {
    const canContinue = await beginPickerFlow()
    if (!canContinue) {
      return
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type:
          Platform.OS === 'ios'
            ? ['public.image', 'com.adobe.pdf']
            : allowedTypes,
        copyToCacheDirectory: true
      })

      if (result.canceled) return

      const file = result.assets[0]

      // Validate file size
      if (!file.size) {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถได้รับขนาดไฟล์ได้')
        return
      }

      const fileSizeInMB = file.size / (1024 * 1024)
      if (fileSizeInMB > maxFileSize) {
        Alert.alert('ไฟล์ใหญ่เกินไป', `ขนาดไฟล์ต้องไม่เกิน ${maxFileSize} MB`)
        return
      }

      // Validate file type
      if (!allowedTypes.includes(file.mimeType || '')) {
        Alert.alert(
          'ประเภทไฟล์ไม่รองรับ',
          'กรุณาเลือกไฟล์ PDF หรือรูปภาพ (JPG, PNG)'
        )
        return
      }

      await onAddAttachment({
        uri: file.uri,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType || 'application/octet-stream'
      })
    } catch (error) {
      console.error('Error picking document:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกไฟล์ได้')
    } finally {
      endPickerFlow()
    }
  }

  const handleDeleteAttachment = (attachment: DisplayAttachment) => {
    Alert.alert('ลบไฟล์แนบ', `คุณต้องการลบ "${attachment.fileName}" หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(attachment.id)
            await onDeleteAttachment(attachment.id)
          } catch (error) {
            console.error('Error deleting attachment:', error)
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบไฟล์ได้')
          } finally {
            setDeletingId(null)
          }
        }
      }
    ])
  }

  const handleDownloadAttachment = async (attachment: IAttachment) => {
    if (onDownloadAttachment) {
      try {
        await onDownloadAttachment(attachment)
      } catch (error) {
        console.error('Error downloading attachment:', error)
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ได้')
      }
    } else if (attachment.downloadUrl) {
      // Fallback: open in browser
      await Linking.openURL(attachment.downloadUrl)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>ไฟล์แนบ</Text>
        <Text style={styles.fileCount}>
          {allAttachments.length}/{maxFiles}
        </Text>
      </View>

      {allAttachments.length > 0 && (
        <ScrollView
          style={styles.attachmentList}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {allAttachments.map((attachment) => {
            const isPending = 'isPending' in attachment && attachment.isPending

            return (
              <View key={attachment.id} style={styles.attachmentItem}>
                <View style={styles.fileInfo}>
                  <View style={styles.fileIcon}>
                    {getFileIcon(attachment.fileType)}
                  </View>
                  <View style={styles.fileDetails}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Text style={styles.fileName} numberOfLines={1}>
                        {attachment.fileName}
                      </Text>
                    </View>
                    <Text style={styles.fileSize}>
                      {formatFileSize(attachment.fileSize)}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  {!isPending &&
                    'downloadUrl' in attachment &&
                    attachment.downloadUrl && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() =>
                          handleDownloadAttachment(attachment as IAttachment)
                        }
                        disabled={disabled}
                      >
                        <Download size={16} color="#5FA7D1" />
                      </TouchableOpacity>
                    )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteAttachment(attachment)}
                    disabled={disabled || deletingId === attachment.id}
                  >
                    {deletingId === attachment.id ? (
                      <ActivityIndicator size="small" color="#BF1737" />
                    ) : (
                      <Trash2 size={16} color="#BF1737" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[
          styles.addButton,
          (disabled ||
            isUploading ||
            allAttachments.length >= maxFiles) &&
            styles.addButtonDisabled
        ]}
        onPress={handleOpenAttachmentOptions}
        disabled={
          disabled ||
          isUploading ||
          allAttachments.length >= maxFiles
        }
      >
        {isUploading ? (
          <>
            <ActivityIndicator size="small" color="#5FA7D1" />
            <Text style={styles.addButtonText}>กำลังอัปโหลด...</Text>
          </>
        ) : (
          <>
            <Plus size={20} color="#5FA7D1" />
            <Text style={styles.addButtonText}>เพิ่มไฟล์แนบ</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>
        รองรับไฟล์ PDF และรูปภาพ (สูงสุด {maxFileSize} MB)
      </Text>

      {/* Attachment Options Modal */}
      <Modal
        visible={showAttachmentOptions}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isPickerOpening) {
            setShowAttachmentOptions(false)
          }
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!isPickerOpening) {
              setShowAttachmentOptions(false)
            }
          }}
        >
          <View style={styles.optionsContainer}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>เลือกประเภทไฟล์</Text>
              <TouchableOpacity
                onPress={() => setShowAttachmentOptions(false)}
                style={styles.closeButton}
                disabled={isPickerOpening}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.optionItem, isPickerOpening && styles.optionItemDisabled]}
              onPress={handlePickFromCamera}
              disabled={isPickerOpening}
            >
              <View style={styles.optionIcon}>
                <Camera size={24} color="#5FA7D1" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>ถ่ายรูป</Text>
                <Text style={styles.optionDescription}>
                  เปิดกล้องเพื่อถ่ายรูป
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, isPickerOpening && styles.optionItemDisabled]}
              onPress={handlePickFromGallery}
              disabled={isPickerOpening}
            >
              <View style={styles.optionIcon}>
                <ImageIcon size={24} color="#5FA7D1" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>เลือกรูปภาพ</Text>
                <Text style={styles.optionDescription}>เลือกจากคลังรูปภาพ</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, isPickerOpening && styles.optionItemDisabled]}
              onPress={handlePickDocument}
              disabled={isPickerOpening}
            >
              <View style={styles.optionIcon}>
                <FileText size={24} color="#5FA7D1" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>เลือกเอกสาร</Text>
                <Text style={styles.optionDescription}>
                  เลือกไฟล์ PDF หรือรูปภาพ
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  label: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  fileCount: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  },
  attachmentList: {
    maxHeight: 200,
    marginBottom: 12
  },
  attachmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  fileDetails: {
    flex: 1
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    marginBottom: 2
  },
  fileSize: {
    fontSize: 11,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#5FA7D1',
    borderStyle: 'dashed',
    backgroundColor: '#ffffff'
  },
  addButtonDisabled: {
    opacity: 0.5,
    borderColor: '#d1d5db'
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#5FA7D1'
  },
  hint: {
    fontSize: 11,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center'
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  pendingText: {
    fontSize: 10,
    fontFamily: 'Prompt_400Regular',
    color: '#92400E'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  optionsContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  optionsTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_600SemiBold',
    color: '#225877'
  },
  closeButton: {
    padding: 4
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  optionItemDisabled: {
    opacity: 0.5
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  optionContent: {
    flex: 1
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 2
  },
  optionDescription: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  }
})
