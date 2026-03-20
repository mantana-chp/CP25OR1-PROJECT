import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
  InteractionManager,
  ActionSheetIOS,
  Linking,
  Image,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Eye,
  File,
  Plus,
  X,
  Camera,
  Image as ImageIcon,
} from 'lucide-react-native'
import { useFocusEffect } from 'expo-router'
import {
  usePetMedicalDocuments,
  IPendingDocument,
} from '@/src/hooks/usePetMedicalDocuments'
import { IMedicalDocument } from '@/src/utils/api/services/pet_medical_document_service'
import { colors } from '@/constants/design-system'
import MedicalDocumentPreviewModal from './medical_document_preview_modal'

interface MedicalDocumentsSectionProps {
  petId: string
  isOwner?: boolean // Whether current user is owner (affects delete permission)
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 5

export default function MedicalDocumentsSection({
  petId,
  isOwner = true,
}: MedicalDocumentsSectionProps) {
  const {
    documents,
    pendingDocuments,
    isLoading,
    isUploading,
    fetchDocuments,
    addPendingFiles,
    removePendingFile,
    uploadPendingFiles,
    deleteDocument,
    clearPending,
  } = usePetMedicalDocuments({ petId })

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const [isPickerOpening, setIsPickerOpening] = useState(false)
  const isPickerActiveRef = useRef(false)
  const pickerRecoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  // Preview modal state
  const [previewDocument, setPreviewDocument] =
    useState<IMedicalDocument | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Load documents on mount
  useFocusEffect(
    useCallback(() => {
      fetchDocuments()
      resetPickerState()
      return () => {
        resetPickerState()
      }
    }, [fetchDocuments]),
  )

  // Picker state management (same pattern as AttachmentManager)
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
    pickerRecoveryTimeoutRef.current = setTimeout(() => {
      resetPickerState()
    }, 45000)
  }

  const beginPickerFlow = async (): Promise<boolean> => {
    if (isUploading || isPickerActiveRef.current) {
      return false
    }

    const totalFiles = documents.length + pendingDocuments.length
    if (totalFiles >= MAX_FILES) {
      Alert.alert('ถึงขีดจำกัด', `สามารถมีเอกสารได้สูงสุด ${MAX_FILES} ไฟล์`)
      return false
    }

    isPickerActiveRef.current = true
    setIsPickerOpening(true)
    setShowUploadOptions(false)
    startPickerRecoveryTimeout()

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

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Get thumbnail URI for image files or PDF thumbnails
  const getThumbnailUri = (
    doc: IMedicalDocument | IPendingDocument,
  ): string | null => {
    const isPending = 'isPending' in doc && doc.isPending

    // For images, use the image itself as thumbnail
    if (doc.fileType.startsWith('image/')) {
      if (isPending) {
        return (doc as IPendingDocument).uri
      } else {
        return (doc as IMedicalDocument).downloadUrl || null
      }
    }


    return null
  }

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon size={20} color={colors.primary.DEFAULT} />
    }
    return <FileText size={20} color={colors.primary.DEFAULT} />
  }

  // Validate file
  const validateFile = (file: {
    name: string
    size?: number
    mimeType?: string
  }): boolean => {
    if (!file.size) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถอ่านขนาดไฟล์ได้')
      return false
    }

    if (file.size > MAX_FILE_SIZE) {
      Alert.alert(
        'ไฟล์ใหญ่เกินไป',
        `ขนาดไฟล์ต้องไม่เกิน ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
      )
      return false
    }

    if (file.mimeType && !ALLOWED_TYPES.includes(file.mimeType)) {
      Alert.alert(
        'ประเภทไฟล์ไม่รองรับ',
        'กรุณาเลือกไฟล์ PDF หรือรูปภาพ (JPG, PNG, WebP)',
      )
      return false
    }

    return true
  }

  // Handle upload options button
  const handleOpenUploadOptions = () => {
    const totalFiles = documents.length + pendingDocuments.length
    if (isUploading || totalFiles >= MAX_FILES) {
      return
    }

    if (isPickerActiveRef.current || isPickerOpening) {
      resetPickerState()
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['ยกเลิก', 'ถ่ายรูป', 'เลือกรูปภาพ', 'เลือกเอกสาร'],
          cancelButtonIndex: 0,
          userInterfaceStyle: 'light',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            void handlePickFromCamera()
          } else if (buttonIndex === 2) {
            void handlePickFromGallery()
          } else if (buttonIndex === 3) {
            void handlePickMultipleDocuments()
          }
        },
      )
      return
    }

    setShowUploadOptions(true)
  }

  // Handle camera picker
  const handlePickFromCamera = async () => {
    const canContinue = await beginPickerFlow()
    if (!canContinue) return

    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงกล้องเพื่อถ่ายรูป')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      })

      if (result.canceled) return

      const image = result.assets[0]
      if (
        !validateFile({
          name: `photo_${Date.now()}.jpg`,
          size: image.fileSize,
          mimeType: 'image/jpeg',
        })
      ) {
        return
      }

      addPendingFiles([
        {
          uri: image.uri,
          name: `photo_${Date.now()}.jpg`,
          size: image.fileSize || 0,
          mimeType: 'image/jpeg',
        },
      ])
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถถ่ายรูปได้')
    } finally {
      endPickerFlow()
    }
  }

  // Handle gallery picker
  const handlePickFromGallery = async () => {
    const canContinue = await beginPickerFlow()
    if (!canContinue) return

    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงคลังรูปภาพ')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      })

      if (result.canceled) return

      const validImages: Array<{
        uri: string
        name: string
        size: number
        mimeType: string
      }> = []

      for (const image of result.assets) {
        const fileName = image.uri.split('/').pop() || `image_${Date.now()}.jpg`
        if (
          validateFile({
            name: fileName,
            size: image.fileSize,
            mimeType: image.mimeType || 'image/jpeg',
          })
        ) {
          validImages.push({
            uri: image.uri,
            name: fileName,
            size: image.fileSize || 0,
            mimeType: image.mimeType || 'image/jpeg',
          })
        }
      }

      if (validImages.length > 0) {
        // Check if adding these would exceed limit
        const totalAfterAdd =
          documents.length + pendingDocuments.length + validImages.length
        if (totalAfterAdd > MAX_FILES) {
          const canAdd =
            MAX_FILES - (documents.length + pendingDocuments.length)
          if (canAdd > 0) {
            Alert.alert(
              'ถึงขีดจำกัด',
              `สามารถเพิ่มได้อีก ${canAdd} ไฟล์เท่านั้น`,
              [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                  text: 'เพิ่ม',
                  onPress: () => addPendingFiles(validImages.slice(0, canAdd)),
                },
              ],
            )
          } else {
            Alert.alert(
              'ถึงขีดจำกัด',
              `สามารถมีเอกสารได้สูงสุด ${MAX_FILES} ไฟล์`,
            )
          }
        } else {
          addPendingFiles(validImages)
        }
      }
    } catch (error) {
      console.error('Error picking images:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้')
    } finally {
      endPickerFlow()
    }
  }

  // Handle document picker (supports multiple files)
  const handlePickMultipleDocuments = async () => {
    const canContinue = await beginPickerFlow()
    if (!canContinue) return

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
        multiple: true,
      })

      if (result.canceled) return

      const validFiles: Array<{
        uri: string
        name: string
        size: number
        mimeType: string
      }> = []

      for (const file of result.assets) {
        if (
          validateFile({
            name: file.name,
            size: file.size,
            mimeType: file.mimeType,
          })
        ) {
          validFiles.push({
            uri: file.uri,
            name: file.name,
            size: file.size || 0,
            mimeType: file.mimeType || 'application/octet-stream',
          })
        }
      }

      if (validFiles.length > 0) {
        // Check if adding these would exceed limit
        const totalAfterAdd =
          documents.length + pendingDocuments.length + validFiles.length
        if (totalAfterAdd > MAX_FILES) {
          const canAdd =
            MAX_FILES - (documents.length + pendingDocuments.length)
          if (canAdd > 0) {
            Alert.alert(
              'ถึงขีดจำกัด',
              `สามารถเพิ่มได้อีก ${canAdd} ไฟล์เท่านั้น`,
              [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                  text: 'เพิ่ม',
                  onPress: () => addPendingFiles(validFiles.slice(0, canAdd)),
                },
              ],
            )
          } else {
            Alert.alert(
              'ถึงขีดจำกัด',
              `สามารถมีเอกสารได้สูงสุด ${MAX_FILES} ไฟล์`,
            )
          }
        } else {
          addPendingFiles(validFiles)
        }
      }
    } catch (error) {
      console.error('Error picking documents:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกเอกสารได้')
    } finally {
      endPickerFlow()
    }
  }

  // Handle upload pending files
  const handleUploadPending = async () => {
    if (pendingDocuments.length === 0) return

    const result = await uploadPendingFiles()
    console.log('Upload result:', result)
  }

  // Handle delete document
  const handleDeleteDocument = (
    document: IMedicalDocument | IPendingDocument,
  ) => {
    const isPending = 'isPending' in document && document.isPending

    Alert.alert('ลบเอกสาร', `คุณต้องการลบ "${document.fileName}" หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          if (isPending) {
            removePendingFile(document.id)
          } else {
            try {
              setDeletingId(document.id)
              await deleteDocument(document.id)
            } catch (error) {
              // Error is already handled in hook
            } finally {
              setDeletingId(null)
            }
          }
        },
      },
    ])
  }

  // Handle preview document (opens preview modal)
  const handlePreviewDocument = (document: IMedicalDocument) => {
    setPreviewDocument(document)
    setShowPreview(true)
  }

  // Handle direct download (from card button)
  const handleDirectDownload = (document: IMedicalDocument, event: any) => {
    // Stop event propagation to prevent opening preview
    event?.stopPropagation()

    try {
      if (document.downloadUrl) {
        Linking.openURL(document.downloadUrl).catch(() => {
          Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเปิดไฟล์ได้')
        })
      }
    } catch (error) {
      console.error('Error downloading document:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ได้')
    }
  }

  // Get progress badge for pending documents
  const getProgressBadge = (progress?: IPendingDocument['uploadProgress']) => {
    if (!progress || progress === 'waiting') {
      return null
    }

    const badges = {
      uploading: {
        text: 'กำลังอัปโหลด',
        color: '#FEF3C7',
        textColor: '#92400E',
      },
      success: { text: 'สำเร็จ', color: '#D1FAE5', textColor: '#065F46' },
      failed: { text: 'ล้มเหลว', color: '#FEE2E2', textColor: '#991B1B' },
    }

    const badge = badges[progress]
    return (
      <View style={[styles.progressBadge, { backgroundColor: badge.color }]}>
        <Text style={[styles.progressBadgeText, { color: badge.textColor }]}>
          {badge.text}
        </Text>
      </View>
    )
  }

  const allDocuments: Array<IMedicalDocument | IPendingDocument> = [
    ...pendingDocuments,
    ...documents,
  ]
  const totalFiles = documents.length + pendingDocuments.length

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <FileText size={20} color={colors.primary.DEFAULT} />
          <Text style={styles.title}>เอกสารสุขภาพและวัคซีน</Text>
        </View>
        <Text style={styles.fileCount}>
          {totalFiles}/{MAX_FILES}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='small' color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      ) : allDocuments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <File size={48} color='#d1d5db' strokeWidth={1.5} />
          <Text style={styles.emptyText}>ยังไม่มีเอกสาร</Text>
          <Text style={styles.emptySubtext}>
            อัปโหลดเอกสารสุขภาพและวัคซีนของสัตว์เลี้ยง เช่น ใบรับรองการฉีดวัคซีน
            ผลตรวจสุขภาพ หรือเอกสารจากคลินิก
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.documentList}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {allDocuments.map((doc) => {
            const isPending = 'isPending' in doc && doc.isPending
            const isDeleting = deletingId === doc.id

            return (
              <Pressable
                key={doc.id}
                style={styles.documentItem}
                onPress={() => {
                  // Only open preview for non-pending documents with downloadUrl
                  if (!isPending && 'downloadUrl' in doc && doc.downloadUrl) {
                    handlePreviewDocument(doc)
                  }
                }}
                disabled={isPending}
              >
                <View style={styles.fileInfo}>
                  {(() => {
                    const thumbnailUri = getThumbnailUri(doc)
                    if (thumbnailUri) {
                      // Show actual image/PDF thumbnail
                      return (
                        <View style={styles.thumbnailContainer}>
                          <Image
                            source={{ uri: thumbnailUri }}
                            style={styles.thumbnail}
                            resizeMode='cover'
                          />
                        </View>
                      )
                    }
                    // Default file icon (for PDFs and other files)
                    return (
                      <View style={styles.fileIconContainer}>
                        {getFileIcon(doc.fileType)}
                      </View>
                    )
                  })()}
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {doc.fileName}
                    </Text>
                    <View style={styles.fileMetaRow}>
                      <Text style={styles.fileSize}>
                        {formatFileSize(doc.fileSize)}
                      </Text>
                      {!isPending && 'createdAt' in doc && (
                        <>
                          <Text style={styles.metaDivider}>•</Text>
                          <Text style={styles.fileDate}>
                            {formatDate(doc.createdAt)}
                          </Text>
                        </>
                      )}
                    </View>
                    {isPending && getProgressBadge(doc.uploadProgress)}
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  {!isPending && 'downloadUrl' in doc && doc.downloadUrl && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => handleDirectDownload(doc, e)}
                    >
                      <Download size={16} color={colors.primary.DEFAULT} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteDocument(doc)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size='small' color='#BF1737' />
                    ) : (
                      <Trash2 size={16} color='#BF1737' />
                    )}
                  </TouchableOpacity>
                </View>
              </Pressable>
            )
          })}
        </ScrollView>
      )}

      {/* Upload buttons */}
      <View style={styles.uploadButtonsContainer}>
        {pendingDocuments.length > 0 && (
          <TouchableOpacity
            style={[
              styles.uploadPendingButton,
              isUploading && styles.uploadPendingButtonDisabled,
            ]}
            onPress={handleUploadPending}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size='small' color='#fff' />
                <Text style={styles.uploadPendingButtonText}>
                  กำลังอัปโหลด... ({pendingDocuments.length} ไฟล์)
                </Text>
              </>
            ) : (
              <>
                <Upload size={18} color='#fff' />
                <Text style={styles.uploadPendingButtonText}>
                  อัปโหลดเอกสาร จำนวน {pendingDocuments.length} ไฟล์
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.addButton,
            (isUploading || totalFiles >= MAX_FILES) &&
              styles.addButtonDisabled,
          ]}
          onPress={handleOpenUploadOptions}
          disabled={isUploading || totalFiles >= MAX_FILES}
        >
          <Plus size={20} color={colors.primary.DEFAULT} />
          <Text style={styles.addButtonText}>เพิ่มเอกสาร</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        รองรับไฟล์ PDF และรูปภาพ (สูงสุด {MAX_FILE_SIZE / (1024 * 1024)} MB)
      </Text>

      {/* Upload Options Modal */}
      <Modal
        visible={showUploadOptions}
        transparent
        animationType='fade'
        onRequestClose={() => {
          if (!isPickerOpening) {
            setShowUploadOptions(false)
          }
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!isPickerOpening) {
              setShowUploadOptions(false)
            }
          }}
        >
          <View style={styles.optionsContainer}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>เลือกประเภทไฟล์</Text>
              <TouchableOpacity
                onPress={() => setShowUploadOptions(false)}
                style={styles.closeButton}
                disabled={isPickerOpening}
              >
                <X size={24} color='#6b7280' />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.optionItem,
                isPickerOpening && styles.optionItemDisabled,
              ]}
              onPress={handlePickFromCamera}
              disabled={isPickerOpening}
            >
              <View style={styles.optionIcon}>
                <Camera size={24} color={colors.primary.DEFAULT} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>ถ่ายรูป</Text>
                <Text style={styles.optionDescription}>
                  เปิดกล้องเพื่อถ่ายเอกสาร
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionItem,
                isPickerOpening && styles.optionItemDisabled,
              ]}
              onPress={handlePickFromGallery}
              disabled={isPickerOpening}
            >
              <View style={styles.optionIcon}>
                <ImageIcon size={24} color={colors.primary.DEFAULT} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>เลือกรูปภาพ</Text>
                <Text style={styles.optionDescription}>
                  เลือกจากคลังรูปภาพ (สูงสุด {MAX_FILES} ไฟล์)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionItem,
                isPickerOpening && styles.optionItemDisabled,
              ]}
              onPress={handlePickMultipleDocuments}
              disabled={isPickerOpening}
            >
              <View style={styles.optionIcon}>
                <FileText size={24} color={colors.primary.DEFAULT} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>เลือกเอกสาร</Text>
                <Text style={styles.optionDescription}>
                  เลือกไฟล์ PDF หรือรูปภาพ (สูงสุด {MAX_FILES} ไฟล์)
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Document Preview Modal */}
      <MedicalDocumentPreviewModal
        visible={showPreview}
        document={previewDocument}
        onClose={() => {
          setShowPreview(false)
          setPreviewDocument(null)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Prompt_500Medium',
    color: colors.primary.DEFAULT,
  },
  fileCount: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
  },
  description: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  documentList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  thumbnailContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  thumbnail: {
    width: 40,
    height: 40,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    marginBottom: 4,
  },
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileSize: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
  },
  metaDivider: {
    fontSize: 12,
    color: '#d1d5db',
  },
  fileDate: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
  },
  progressBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  progressBadgeText: {
    fontSize: 11,
    fontFamily: 'Prompt_400Regular',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  uploadButtonsContainer: {
    gap: 8,
  },
  uploadPendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary.DEFAULT,
  },
  uploadPendingButtonDisabled: {
    opacity: 0.6,
  },
  uploadPendingButtonText: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary.DEFAULT,
    backgroundColor: '#ffffff',
  },
  addButtonDisabled: {
    opacity: 0.5,
    borderColor: '#d1d5db',
  },
  addButtonText: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: colors.primary.DEFAULT,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  optionsTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
  },
  closeButton: {
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionItemDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
  },
})
