import React, { useCallback, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  InteractionManager,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import {
  Camera,
  Download,
  File,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  Trash2,
  X
} from 'lucide-react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'

import { usePets } from '@/src/context/PetContext'
import {
  usePetMedicalDocuments,
  IPendingDocument
} from '@/src/hooks/usePetMedicalDocuments'
import { IMedicalDocument } from '@/src/utils/api/services/pet_medical_document_service'
import Header from '@/src/presentation/components/header_component'
import LoadingComponent from '@/src/presentation/components/loading_component'
import { colors, typography, borderRadius, spacing } from '@/constants/design-system'

const MAX_FILES = 5
const MAX_FILE_SIZE_MB = 10
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

type DocumentItem = IMedicalDocument | IPendingDocument

export default function MedicalDocumentsPage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const petIdFromParams = (params?.petId || '') as string

  const { pets, selectedPetId } = usePets()
  const petId = petIdFromParams || selectedPetId || ''

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
    clearPending
  } = usePetMedicalDocuments({
    petId,
    onDocumentsChange: () => {
      console.log('📄 Documents changed')
    }
  })

  const [showPickerModal, setShowPickerModal] = useState(false)
  const [isPickerOpening, setIsPickerOpening] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const isPickerActiveRef = useRef(false)
  const pickerRecoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentPet = pets.find((p) => p.id === petId)

  // All items (documents + pending)
  const allItems: DocumentItem[] = [...documents, ...pendingDocuments]

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchDocuments()
      resetPickerState()
      setShowPickerModal(false)

      return () => {
        resetPickerState()
        setShowPickerModal(false)
      }
    }, [petId])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchDocuments()
    setRefreshing(false)
  }

  // --- File picker helpers ---
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

    // Check total files limit
    if (allItems.length >= MAX_FILES) {
      Alert.alert('ถึงขีดจำกัด', `สามารถอัปโหลดเอกสารได้สูงสุด ${MAX_FILES} ไฟล์`)
      return false
    }

    isPickerActiveRef.current = true
    setIsPickerOpening(true)
    setShowPickerModal(false)
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

  // --- File picker actions ---
  const handleOpenPicker = () => {
    if (isUploading || allItems.length >= MAX_FILES) return

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
          if (buttonIndex === 1) handlePickFromCamera()
          else if (buttonIndex === 2) handlePickFromGallery()
          else if (buttonIndex === 3) handlePickDocument()
        }
      )
      return
    }

    setShowPickerModal(true)
  }

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
        quality: 0.8
      })

      if (result.canceled) return

      const image = result.assets[0]
      if (!image.fileSize) {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถรับขนาดไฟล์ได้')
        return
      }

      const fileSizeInMB = image.fileSize / (1024 * 1024)
      if (fileSizeInMB > MAX_FILE_SIZE_MB) {
        Alert.alert('ไฟล์ใหญ่เกินไป', `ขนาดไฟล์ต้องไม่เกิน ${MAX_FILE_SIZE_MB} MB`)
        return
      }

      addPendingFiles([
        {
          uri: image.uri,
          name: `photo_${Date.now()}.jpg`,
          size: image.fileSize,
          mimeType: 'image/jpeg'
        }
      ])
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถถ่ายรูปได้')
    } finally {
      endPickerFlow()
    }
  }

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

      // Allow multiple selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_FILES - allItems.length,
        quality: 0.8
      })

      if (result.canceled) return

      const validFiles: Array<{
        uri: string
        name: string
        size: number
        mimeType: string
      }> = []

      for (const asset of result.assets) {
        if (!asset.fileSize) continue

        const fileSizeInMB = asset.fileSize / (1024 * 1024)
        if (fileSizeInMB > MAX_FILE_SIZE_MB) {
          Alert.alert('ไฟล์ใหญ่เกินไป', `${asset.fileName || 'รูปภาพ'} มีขนาดเกิน ${MAX_FILE_SIZE_MB} MB`)
          continue
        }

        const fileName = asset.uri.split('/').pop() || `image_${Date.now()}.jpg`
        validFiles.push({
          uri: asset.uri,
          name: fileName,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg'
        })
      }

      if (validFiles.length > 0) {
        addPendingFiles(validFiles)
      }
    } catch (error) {
      console.error('Error picking images:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้')
    } finally {
      endPickerFlow()
    }
  }

  const handlePickDocument = async () => {
    const canContinue = await beginPickerFlow()
    if (!canContinue) return

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
        multiple: true
      })

      if (result.canceled) return

      const validFiles: Array<{
        uri: string
        name: string
        size: number
        mimeType: string
      }> = []

      for (const file of result.assets.slice(0, MAX_FILES - allItems.length)) {
        if (!file.size) {
          continue
        }

        const fileSizeInMB = file.size / (1024 * 1024)
        if (fileSizeInMB > MAX_FILE_SIZE_MB) {
          Alert.alert('ไฟล์ใหญ่เกินไป', `${file.name} มีขนาดเกิน ${MAX_FILE_SIZE_MB} MB`)
          continue
        }

        if (!ALLOWED_TYPES.includes(file.mimeType || '')) {
          Alert.alert('ประเภทไฟล์ไม่รองรับ', `${file.name} ไม่ใช่ไฟล์ที่รองรับ`)
          continue
        }

        validFiles.push({
          uri: file.uri,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType || 'application/octet-stream'
        })
      }

      if (validFiles.length > 0) {
        addPendingFiles(validFiles)
      }
    } catch (error) {
      console.error('Error picking document:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกไฟล์ได้')
    } finally {
      endPickerFlow()
    }
  }

  // --- Upload/Delete handlers ---
  const handleUploadAll = async () => {
    if (pendingDocuments.length === 0) return
    await uploadPendingFiles()
  }

  const handleDelete = (item: DocumentItem) => {
    const isPending = 'isPending' in item && item.isPending

    Alert.alert('ลบเอกสาร', `คุณต้องการลบ "${item.fileName}" หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          if (isPending) {
            removePendingFile(item.id)
          } else {
            try {
              setDeletingId(item.id)
              await deleteDocument(item.id)
            } finally {
              setDeletingId(null)
            }
          }
        }
      }
    ])
  }

  const handleDownload = async (doc: IMedicalDocument) => {
    if (doc.downloadUrl) {
      try {
        await Linking.openURL(doc.downloadUrl)
      } catch (error) {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเปิดไฟล์ได้')
      }
    }
  }

  // --- Utilities ---
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon size={24} color={colors.primary.light} />
    }
    return <FileText size={24} color={colors.primary.light} />
  }

  const getUploadStatusColor = (status?: string) => {
    switch (status) {
      case 'uploading':
        return colors.info.DEFAULT
      case 'success':
        return colors.success.DEFAULT
      case 'failed':
        return colors.danger.DEFAULT
      default:
        return colors.gray[400]
    }
  }

  // --- Render ---
  if (!petId) {
    return (
      <View style={styles.container}>
        <Header title="เอกสารสุขภาพ" goBack />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>กรุณาเลือกสัตว์เลี้ยง</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header
        title={currentPet ? `เอกสารสุขภาพ - ${currentPet.pet_name}` : 'เอกสารสุขภาพ'}
        goBack
      />

      {isLoading && !refreshing ? (
        <LoadingComponent />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Info Section */}
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              อัปโหลดเอกสารสุขภาพและวัคซีนของสัตว์เลี้ยง เช่น ใบรับรองการฉีดวัคซีน
              ผลตรวจสุขภาพ หรือเอกสารจากคลินิก
            </Text>
            <Text style={styles.hintText}>
              รองรับไฟล์ PDF และรูปภาพ (JPG, PNG) สูงสุด {MAX_FILE_SIZE_MB} MB ต่อไฟล์
            </Text>
          </View>

          {/* Pending uploads section */}
          {pendingDocuments.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>รอการอัปโหลด</Text>
                <Text style={styles.countBadge}>{pendingDocuments.length}</Text>
              </View>

              {pendingDocuments.map((item) => (
                <View key={item.id} style={styles.documentItem}>
                  <View style={styles.iconContainer}>
                    {getFileIcon(item.fileType)}
                    {item.uploadProgress === 'uploading' && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={styles.documentInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {item.fileName}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.fileSize}>
                        {formatFileSize(item.fileSize)}
                      </Text>
                      {item.uploadProgress && item.uploadProgress !== 'waiting' && (
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getUploadStatusColor(item.uploadProgress) + '20' }
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: getUploadStatusColor(item.uploadProgress) }
                            ]}
                          >
                            {item.uploadProgress === 'uploading'
                              ? 'กำลังอัปโหลด'
                              : item.uploadProgress === 'success'
                                ? 'สำเร็จ'
                                : 'ไม่สำเร็จ'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(item)}
                    disabled={isUploading}
                  >
                    <X size={18} color={colors.gray[400]} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  isUploading && styles.uploadButtonDisabled
                ]}
                onPress={handleUploadAll}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.uploadButtonText}>กำลังอัปโหลด...</Text>
                  </>
                ) : (
                  <Text style={styles.uploadButtonText}>
                    อัปโหลด {pendingDocuments.length} ไฟล์
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Uploaded documents section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>เอกสารทั้งหมด</Text>
              <Text style={styles.countBadge}>{documents.length}</Text>
            </View>

            {documents.length === 0 ? (
              <View style={styles.emptyDocuments}>
                <FolderOpen size={48} color={colors.gray[300]} />
                <Text style={styles.emptyDocumentsText}>
                  ยังไม่มีเอกสารสุขภาพ
                </Text>
                <Text style={styles.emptyDocumentsHint}>
                  เพิ่มเอกสารโดยกดปุ่มด้านล่าง
                </Text>
              </View>
            ) : (
              documents.map((doc) => (
                <View key={doc.id} style={styles.documentItem}>
                  <View style={styles.iconContainer}>
                    {getFileIcon(doc.fileType)}
                  </View>
                  <View style={styles.documentInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {doc.fileName}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.fileSize}>
                        {formatFileSize(doc.fileSize)}
                      </Text>
                      <Text style={styles.dateText}>
                        {formatDate(doc.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.documentActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDownload(doc)}
                    >
                      <Download size={18} color={colors.primary.light} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                    >
                      {deletingId === doc.id ? (
                        <ActivityIndicator size="small" color={colors.danger.DEFAULT} />
                      ) : (
                        <Trash2 size={18} color={colors.danger.DEFAULT} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Add button */}
      <TouchableOpacity
        style={[
          styles.floatingButton,
          (isUploading || allItems.length >= MAX_FILES) && styles.floatingButtonDisabled
        ]}
        onPress={handleOpenPicker}
        disabled={isUploading || allItems.length >= MAX_FILES}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      {/* Picker Modal (Android) */}
      <Modal
        visible={showPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isPickerOpening) setShowPickerModal(false)
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!isPickerOpening) setShowPickerModal(false)
          }}
        >
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>เลือกประเภทไฟล์</Text>
              <TouchableOpacity
                onPress={() => setShowPickerModal(false)}
                disabled={isPickerOpening}
              >
                <X size={24} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.pickerOption, isPickerOpening && styles.pickerOptionDisabled]}
              onPress={handlePickFromCamera}
              disabled={isPickerOpening}
            >
              <View style={styles.pickerIconBox}>
                <Camera size={24} color={colors.primary.light} />
              </View>
              <View style={styles.pickerOptionContent}>
                <Text style={styles.pickerOptionTitle}>ถ่ายรูป</Text>
                <Text style={styles.pickerOptionDesc}>เปิดกล้องเพื่อถ่ายรูป</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pickerOption, isPickerOpening && styles.pickerOptionDisabled]}
              onPress={handlePickFromGallery}
              disabled={isPickerOpening}
            >
              <View style={styles.pickerIconBox}>
                <ImageIcon size={24} color={colors.primary.light} />
              </View>
              <View style={styles.pickerOptionContent}>
                <Text style={styles.pickerOptionTitle}>เลือกรูปภาพ</Text>
                <Text style={styles.pickerOptionDesc}>เลือกจากคลังรูปภาพ (หลายรูป)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pickerOption, isPickerOpening && styles.pickerOptionDisabled]}
              onPress={handlePickDocument}
              disabled={isPickerOpening}
            >
              <View style={styles.pickerIconBox}>
                <FileText size={24} color={colors.primary.light} />
              </View>
              <View style={styles.pickerOptionContent}>
                <Text style={styles.pickerOptionTitle}>เลือกเอกสาร</Text>
                <Text style={styles.pickerOptionDesc}>
                  เลือกไฟล์ PDF หรือรูปภาพ (หลายไฟล์)
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
    flex: 1,
    backgroundColor: colors.background.primary
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: 100
  },
  infoCard: {
    backgroundColor: colors.info.light,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4]
  },
  infoText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.regular,
    color: colors.primary.DEFAULT,
    marginBottom: spacing[2]
  },
  hintText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[500]
  },
  section: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4]
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3]
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary.DEFAULT
  },
  countBadge: {
    marginLeft: spacing[2],
    backgroundColor: colors.primary.light,
    color: '#fff',
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    minWidth: 24,
    textAlign: 'center'
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.light
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3]
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center'
  },
  documentInfo: {
    flex: 1,
    marginRight: spacing[2]
  },
  fileName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary.DEFAULT,
    marginBottom: 2
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2]
  },
  fileSize: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[500]
  },
  dateText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[400]
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium
  },
  documentActions: {
    flexDirection: 'row',
    gap: spacing[1]
  },
  actionButton: {
    padding: spacing[2],
    borderRadius: borderRadius.md
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    marginTop: spacing[2]
  },
  uploadButtonDisabled: {
    opacity: 0.6
  },
  uploadButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: '#fff'
  },
  emptyDocuments: {
    alignItems: 'center',
    paddingVertical: spacing[8]
  },
  emptyDocumentsText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[500],
    marginTop: spacing[3]
  },
  emptyDocumentsHint: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[400],
    marginTop: spacing[1]
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8
  },
  floatingButtonDisabled: {
    backgroundColor: colors.gray[400]
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[500]
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingBottom: 32,
    paddingTop: spacing[2]
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light
  },
  pickerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.medium,
    color: colors.primary.DEFAULT
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100]
  },
  pickerOptionDisabled: {
    opacity: 0.5
  },
  pickerIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4]
  },
  pickerOptionContent: {
    flex: 1
  },
  pickerOptionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary.DEFAULT,
    marginBottom: 2
  },
  pickerOptionDesc: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[500]
  }
})
