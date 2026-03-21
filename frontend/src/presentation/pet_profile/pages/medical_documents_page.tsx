import React, { useCallback, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
  InteractionManager,
  ActionSheetIOS,
  Linking,
  Image,
  FlatList,
  RefreshControl,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import {
  FileText,
  Upload,
  Trash2,
  Download,
  File,
  Plus,
  X,
  Camera,
  Image as ImageIcon,
  FileHeart,
} from 'lucide-react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import {
  usePetMedicalDocuments,
  IPendingDocument,
} from '@/src/hooks/usePetMedicalDocuments'
import { IMedicalDocument } from '@/src/utils/api/services/pet_medical_document_service'
import { colors } from '@/constants/design-system'
import MedicalDocumentPreviewModal from '../components/medical_document_preview_modal'
import AppModal from '../../components/modal'
import Header from '../../components/header_component'
import { usePets } from '@/src/context/PetContext'

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 5

type FileFilter = 'all' | 'pdf' | 'image'

const FILTER_TABS: { id: FileFilter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'pdf', label: 'PDF' },
  { id: 'image', label: 'รูปภาพ' },
]

export default function MedicalDocumentsPage() {
  const router = useRouter()
  const { petId } = useLocalSearchParams<{ petId: string }>()
  const { activePets, deceasedPets } = usePets()

  const allPets = [...activePets, ...deceasedPets]
  const currentPet = petId ? allPets.find((p) => p.id === petId) || null : null
  const isOwner = currentPet?.petRole !== 'CAREGIVER'
  const isDeceased = currentPet?.status === 'DECEASED'

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
  } = usePetMedicalDocuments({ petId: petId || '' })

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const [isPickerOpening, setIsPickerOpening] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<FileFilter>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isPickerActiveRef = useRef(false)
  const pickerRecoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  // Preview modal state
  const [previewDocument, setPreviewDocument] =
    useState<IMedicalDocument | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Delete permission modal state
  const [showDeletePermissionModal, setShowDeletePermissionModal] =
    useState(false)
  const [blockedDocumentName, setBlockedDocumentName] = useState('')

  // Load documents on mount
  useFocusEffect(
    useCallback(() => {
      if (petId) {
        fetchDocuments()
      }
      resetPickerState()
      return () => {
        resetPickerState()
      }
    }, [fetchDocuments, petId]),
  )

  // Pull to refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchDocuments()
    setIsRefreshing(false)
  }

  // Picker state management
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

  // Get thumbnail URI for image files
  const getThumbnailUri = (
    doc: IMedicalDocument | IPendingDocument,
  ): string | null => {
    const isPending = 'isPending' in doc && doc.isPending

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
  const getFileIcon = (fileType: string, size: number = 24) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon size={size} color={colors.primary.DEFAULT} />
    }
    return <FileText size={size} color={colors.primary.DEFAULT} />
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

  // Handle document picker
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
    await uploadPendingFiles()
  }

  // Handle delete document
  const handleDeleteDocument = (
    document: IMedicalDocument | IPendingDocument,
  ) => {
    const isPending = 'isPending' in document && document.isPending

    // For caregivers trying to delete uploaded documents, show permission modal immediately
    if (!isOwner && !isPending) {
      setBlockedDocumentName(document.fileName)
      setShowDeletePermissionModal(true)
      return
    }

    // For owners or pending documents, show normal confirmation
    showDeleteConfirmation(document)
  }

  // Show delete confirmation dialog
  const showDeleteConfirmation = (
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
            } finally {
              setDeletingId(null)
            }
          }
        },
      },
    ])
  }

  // Handle preview document
  const handlePreviewDocument = (document: IMedicalDocument) => {
    setPreviewDocument(document)
    setShowPreview(true)
  }

  // Handle direct download
  const handleDirectDownload = (document: IMedicalDocument) => {
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

  // Filter documents
  const allDocuments: Array<IMedicalDocument | IPendingDocument> = [
    ...pendingDocuments,
    ...documents,
  ]

  const filteredDocuments = allDocuments.filter((doc) => {
    if (selectedFilter === 'all') return true
    if (selectedFilter === 'pdf') return doc.fileType === 'application/pdf'
    if (selectedFilter === 'image') return doc.fileType.startsWith('image/')
    return true
  })

  const getFilterCount = (filter: FileFilter) => {
    if (filter === 'all') return allDocuments.length
    if (filter === 'pdf')
      return allDocuments.filter((d) => d.fileType === 'application/pdf').length
    if (filter === 'image')
      return allDocuments.filter((d) => d.fileType.startsWith('image/')).length
    return 0
  }

  const totalFiles = documents.length + pendingDocuments.length
  const petDisplayName = currentPet?.pet_name || 'สัตว์เลี้ยงของคุณ'

  // Render document card
  const renderDocumentCard = ({
    item: doc,
  }: {
    item: IMedicalDocument | IPendingDocument
  }) => {
    const isPending = 'isPending' in doc && doc.isPending
    const isDeleting = deletingId === doc.id
    const thumbnailUri = getThumbnailUri(doc)

    return (
      <Pressable
        style={styles.documentCard}
        onPress={() => {
          if (!isPending && 'downloadUrl' in doc && doc.downloadUrl) {
            handlePreviewDocument(doc)
          }
        }}
        disabled={isPending}
      >
        {/* Thumbnail / Icon */}
        <View style={styles.cardThumbnail}>
          {thumbnailUri ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.thumbnailImage}
              resizeMode='cover'
            />
          ) : (
            <View style={styles.iconPlaceholder}>
              {getFileIcon(doc.fileType, 32)}
            </View>
          )}
          {isPending && (
            <View style={styles.pendingOverlay}>
              <Text style={styles.pendingText}>รอ</Text>
            </View>
          )}
        </View>

        {/* File Info */}
        <View style={styles.cardContent}>
          <Text style={styles.cardFileName} numberOfLines={2}>
            {doc.fileName}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardFileSize}>
              {formatFileSize(doc.fileSize)}
            </Text>
            {!isPending && 'createdAt' in doc && (
              <>
                <Text style={styles.cardMetaDivider}>•</Text>
                <Text style={styles.cardFileDate}>
                  {formatDate(doc.createdAt)}
                </Text>
              </>
            )}
          </View>
          {isPending && getProgressBadge(doc.uploadProgress)}
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          {!isPending && 'downloadUrl' in doc && doc.downloadUrl && (
            <TouchableOpacity
              style={styles.cardActionButton}
              onPress={() => handleDirectDownload(doc)}
            >
              <Download size={18} color={colors.primary.DEFAULT} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.cardActionButton, styles.deleteButton]}
            onPress={() => handleDeleteDocument(doc)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size='small' color='#BF1737' />
            ) : (
              <Trash2 size={18} color='#BF1737' />
            )}
          </TouchableOpacity>
        </View>
      </Pressable>
    )
  }

  // List Header
  const ListFooter =
    !isLoading && filteredDocuments.length > 0 ? (
      <View style={styles.listFooter}>
        <View style={styles.addButtonContainer}>
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
      </View>
    ) : (
      <View style={styles.listFooterSpacer} />
    )

  const ListHeader = (
    <>
      {/* Pet Context */}
      <View style={styles.petInfoContainer}>
        <Text style={styles.petInfoLabel}>
          กำลังจัดการเอกสารของ{' '}
          <Text style={styles.petInfoName}>{petDisplayName}</Text>
        </Text>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalFiles}</Text>
          <Text style={styles.statLabel}>เอกสาร</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{MAX_FILES - totalFiles}</Text>
          <Text style={styles.statLabel}>เพิ่มได้อีก</Text>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <FileHeart size={20} color={colors.primary.DEFAULT} />
          <Text style={styles.sectionTitle}>เอกสารทั้งหมด</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {FILTER_TABS.map((tab) => {
          const isActive = selectedFilter === tab.id
          const count = getFilterCount(tab.id)
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedFilter(tab.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    isActive && styles.filterBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBadgeText,
                      isActive && styles.filterBadgeTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Pending Upload Banner */}
      {pendingDocuments.length > 0 && (
        <View style={styles.pendingBanner}>
          <View style={styles.pendingBannerContent}>
            <Upload size={20} color='#92400E' />
            <Text style={styles.pendingBannerText}>
              {pendingDocuments.length} ไฟล์รอการอัปโหลด
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.uploadNowButton,
              isUploading && styles.uploadNowButtonDisabled,
            ]}
            onPress={handleUploadPending}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size='small' color='#fff' />
            ) : (
              <Text style={styles.uploadNowButtonText}>อัปโหลดเลย</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </>
  )

  // Empty State
  const EmptyState = isLoading ? (
    <View style={styles.centerState}>
      <ActivityIndicator size='large' color={colors.primary.DEFAULT} />
      <Text style={styles.loadingText}>กำลังโหลด...</Text>
    </View>
  ) : (
    <View style={styles.centerState}>
      <View style={styles.emptyIconWrapper}>
        <File size={64} color={colors.gray[300]} strokeWidth={1} />
      </View>
      <Text style={styles.emptyTitle}>ยังไม่มีเอกสาร</Text>
      <Text style={styles.emptySubtitle}>
        อัปโหลดเอกสารสุขภาพและวัคซีนของสัตว์เลี้ยง{'\n'}
        เช่น ใบรับรองการฉีดวัคซีน ผลตรวจสุขภาพ{'\n'}
        หรือเอกสารจากคลินิก
      </Text>
      <TouchableOpacity
        style={styles.emptyAddButton}
        onPress={handleOpenUploadOptions}
      >
        <Plus size={20} color='#fff' />
        <Text style={styles.emptyAddButtonText}>เพิ่มเอกสาร</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <Header
        title='เอกสารสุขภาพ'
        goBack
        onBackPress={() => router.push('/(tabs)/pet_profile')}
      />

      <FlatList
        data={filteredDocuments}
        keyExtractor={(item) => item.id}
        renderItem={renderDocumentCard}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.DEFAULT]}
            tintColor={colors.primary.DEFAULT}
          />
        }
      />

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
                <Text style={styles.optionDescription}>เลือกจากคลังรูปภาพ</Text>
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
                  เลือกไฟล์ PDF หรือรูปภาพ
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.optionsFooter}>
              <Text style={styles.optionsHint}>
                รองรับ PDF และรูปภาพ (สูงสุด {MAX_FILE_SIZE / (1024 * 1024)} MB
                ต่อไฟล์)
              </Text>
            </View>
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

      {/* Delete Permission Modal */}
      <AppModal
        variant='confirmation'
        visible={showDeletePermissionModal}
        onClose={() => {
          setShowDeletePermissionModal(false)
        }}
        icon='warning'
        title='ไม่สามารถลบเอกสารได้'
        message={`คุณเป็นผู้ดูแลร่วม จึงลบได้เฉพาะเอกสารที่คุณอัปโหลดเอง\n\nไฟล์ "${blockedDocumentName}" อาจถูกอัปโหลดโดยเจ้าของสัตว์เลี้ยง`}
        confirmText='รับทราบ'
        cancelText=''
        showCancelButton={false}
        onConfirm={() => setShowDeletePermissionModal(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  petInfoContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  petInfoLabel: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: colors.gray[500],
  },
  petInfoName: {
    fontSize: 20,
    fontFamily: 'Prompt_600SemiBold',
    color: colors.primary.DEFAULT,
    marginTop: 4,
  },
  petInfoDescription: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: colors.gray[500],
    marginTop: 8,
    lineHeight: 20,
  },
  // Stats Section
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Prompt_600SemiBold',
    color: colors.primary.DEFAULT,
    width: '100%',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: colors.gray[500],
    marginTop: 2,
    width: '100%',
    textAlign: 'center',
  },
  statSubLabel: {
    fontSize: 11,
    fontFamily: 'Prompt_400Regular',
    color: colors.gray[400],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.gray[200],
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Prompt_500Medium',
    color: colors.primary.DEFAULT,
  },
  sectionPetName: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: colors.gray[500],
  },
  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray[200],
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: colors.gray[600],
  },
  filterChipTextActive: {
    fontFamily: 'Prompt_500Medium',
    color: '#fff',
  },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontFamily: 'Prompt_500Medium',
    color: colors.gray[600],
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  // Pending Banner
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  pendingBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBannerText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#92400E',
  },
  uploadNowButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadNowButtonDisabled: {
    opacity: 0.6,
  },
  uploadNowButtonText: {
    fontSize: 13,
    fontFamily: 'Prompt_500Medium',
    color: '#fff',
  },
  // Document Card
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  thumbnailImage: {
    width: 56,
    height: 56,
  },
  iconPlaceholder: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F4F8',
  },
  pendingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 12,
    fontFamily: 'Prompt_500Medium',
    color: '#fff',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardFileName: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: colors.primary.DEFAULT,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardFileSize: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: colors.gray[500],
  },
  cardMetaDivider: {
    fontSize: 12,
    color: colors.gray[300],
  },
  cardFileDate: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: colors.gray[500],
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  cardActionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
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
  // Empty State
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: colors.primary.DEFAULT,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: colors.gray[600],
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyAddButtonText: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#fff',
  },
  // Add Button
  addButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  listFooter: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  listFooterSpacer: {
    height: 16,
  },
  // Modal
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
  optionsFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  optionsHint: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
    textAlign: 'center',
  },
})
