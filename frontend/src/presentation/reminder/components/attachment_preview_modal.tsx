import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import * as FileSystem from 'expo-file-system/legacy'
import * as MediaLibrary from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import { WebView } from 'react-native-webview'
import { X, Download, FileText, RefreshCw } from 'lucide-react-native'
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
  const insets = useSafeAreaInsets()
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [pdfError, setPdfError] = useState(false)
  const [pdfReloadKey, setPdfReloadKey] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)

  if (!attachment) return null

  const lowerFileName = attachment.fileName.toLowerCase()
  const isPdfByMime = attachment.fileType === 'application/pdf'
  const isImageByMime = attachment.fileType.startsWith('image/')
  const isPdfByName = lowerFileName.endsWith('.pdf')
  const isJpegByName =
    lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg')
  const isPngByName = lowerFileName.endsWith('.png')

  const isPDF = isPdfByMime || isPdfByName
  const isImage = isImageByMime || isJpegByName || isPngByName
  const isSupported = isPDF || isImage

  const sanitizeFileName = (name: string): string => {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
  }

  const stripExtension = (name: string): string => {
    return name.replace(/\.[^/.]+$/, '')
  }

  const getPdfViewerUri = (): string => {
    if (!attachment.downloadUrl) {
      return ''
    }

    // Android WebView often cannot render raw PDF URLs directly.
    // Use PDF.js viewer (not Google Docs) to avoid Google sign-in prompts.
    if (Platform.OS === 'android') {
      return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(
        attachment.downloadUrl
      )}`
    }

    return attachment.downloadUrl
  }

  const getAttachmentDirectory = (): string => {
    return `${FileSystem.documentDirectory}attachments/`
  }

  const ensureAttachmentDirectory = async (): Promise<void> => {
    const directory = getAttachmentDirectory()
    const info = await FileSystem.getInfoAsync(directory)
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true })
    }
  }

  const saveImageToGallery = async (localUri: string): Promise<void> => {
    const permission = await MediaLibrary.requestPermissionsAsync()
    if (!permission.granted) {
      throw new Error('ไม่มีสิทธิ์เข้าถึงคลังรูปภาพ')
    }

    const asset = await MediaLibrary.createAssetAsync(localUri)
    const albumName = 'PetReminders'
    const existingAlbum = await MediaLibrary.getAlbumAsync(albumName)

    if (existingAlbum) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], existingAlbum, false)
    } else {
      await MediaLibrary.createAlbumAsync(albumName, asset, false)
    }
  }

  const saveFileToAndroidDownloads = async (
    localUri: string,
    fileName: string,
    mimeType: string
  ): Promise<void> => {
    const initialDownloadUri =
      FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download')

    const permission =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
        initialDownloadUri
      )

    if (!permission.granted) {
      throw new Error('ผู้ใช้ไม่ได้อนุญาตให้บันทึกไฟล์')
    }

    const base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64
    })

    const safeNameWithoutExt = sanitizeFileName(stripExtension(fileName))
    const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      safeNameWithoutExt || `attachment-${Date.now()}`,
      mimeType
    )

    await FileSystem.StorageAccessFramework.writeAsStringAsync(
      targetUri,
      base64Data,
      { encoding: FileSystem.EncodingType.Base64 }
    )
  }

  const saveFileToFilesApp = async (localUri: string): Promise<void> => {
    const isAvailable = await Sharing.isAvailableAsync()
    if (!isAvailable) {
      throw new Error('อุปกรณ์ไม่รองรับการบันทึกผ่านแอป Files')
    }

    await Sharing.shareAsync(localUri, {
      dialogTitle: 'บันทึกไฟล์ไปยัง Files'
    })
  }

  const handleDownload = async () => {
    if (!attachment.downloadUrl) {
      Alert.alert('ดาวน์โหลดไม่สำเร็จ', 'ไม่พบลิงก์ดาวน์โหลดไฟล์')
      return
    }

    if (!isSupported) {
      Alert.alert(
        'ประเภทไฟล์ไม่รองรับ',
        'รองรับเฉพาะไฟล์ PDF, JPG และ PNG เท่านั้น'
      )
      return
    }

    setIsDownloading(true)

    try {
      await ensureAttachmentDirectory()
      const targetPath = `${getAttachmentDirectory()}${Date.now()}-${sanitizeFileName(attachment.fileName)}`
      const result = await FileSystem.downloadAsync(
        attachment.downloadUrl,
        targetPath
      )

      if (isImage) {
        await saveImageToGallery(result.uri)
        Alert.alert('ดาวน์โหลดสำเร็จ', 'บันทึกรูปภาพลงแกลเลอรีแล้ว')
        return
      }

      if (Platform.OS === 'android') {
        await saveFileToAndroidDownloads(
          result.uri,
          attachment.fileName,
          attachment.fileType || 'application/pdf'
        )
        Alert.alert('ดาวน์โหลดสำเร็จ', 'บันทึกไฟล์ลงโฟลเดอร์ที่เลือกแล้ว')
        return
      }

      await saveFileToFilesApp(result.uri)
      Alert.alert('ดาวน์โหลดสำเร็จ', 'บันทึกไฟล์ไปยังอุปกรณ์ของคุณแล้ว')
    } catch (error) {
      Alert.alert(
        'ดาวน์โหลดไม่สำเร็จ',
        'ไม่สามารถดาวน์โหลดไฟล์ได้ กรุณาลองอีกครั้ง',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ลองใหม่',
            onPress: () => {
              void handleDownload()
            }
          }
        ]
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const resetState = () => {
    setImageLoading(true)
    setImageError(false)
    setPdfError(false)
    setPdfReloadKey(0)
    setIsDownloading(false)
  }

  const handleRetryPreview = () => {
    if (isPDF) {
      setPdfError(false)
      setPdfReloadKey((prev) => prev + 1)
    } else {
      setImageError(false)
      setImageLoading(true)
    }
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const headerTop = Math.max(insets.top + 8, 20)
  const previewTopInset = headerTop + 78

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
        <View style={[styles.headerBar, { top: headerTop }]}>
          <View style={styles.headerInfo}>
            <Text
              style={styles.fileName}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {attachment.fileName}
            </Text>
            <Text style={styles.fileType}>
              {(attachment.fileType.split('/')[1] || 'FILE').toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {isSupported && (
              <Pressable
                onPress={() => {
                  void handleDownload()
                }}
                style={styles.closeButton}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Download size={28} color="#FFFFFF" />
                )}
              </Pressable>
            )}
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={28} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Preview Content */}
        <View
          style={[
            styles.previewContainer,
            {
              paddingTop: previewTopInset
            }
          ]}
        >
          {!isSupported ? (
            <View style={styles.fileIconContainer}>
              <FileText size={80} color="#FFFFFF" />
              <Text style={styles.fileMessage}>
                ไม่รองรับไฟล์ประเภทนี้ (รองรับเฉพาะ PDF, JPG, PNG)
              </Text>
            </View>
          ) : isImage && !imageError ? (
            <>
              {imageLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              )}
              <ScrollView
                style={styles.zoomContainer}
                contentContainerStyle={styles.zoomContent}
                maximumZoomScale={4}
                minimumZoomScale={1}
                pinchGestureEnabled
                centerContent
              >
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
              </ScrollView>
            </>
          ) : isPDF && !pdfError && attachment.downloadUrl ? (
            <View style={styles.pdfContainer}>
              <WebView
                key={pdfReloadKey}
                source={{ uri: getPdfViewerUri() }}
                style={styles.pdfWebView}
                startInLoadingState
                scalesPageToFit
                originWhitelist={['*']}
                javaScriptEnabled
                mixedContentMode="always"
                onError={() => {
                  setPdfError(true)
                }}
                onHttpError={() => {
                  setPdfError(true)
                }}
              />
            </View>
          ) : (
            <View style={styles.fileIconContainer}>
              <FileText size={80} color="#FFFFFF" />
              <Text style={styles.fileMessage}>
                ไม่สามารถแสดงตัวอย่างไฟล์ได้
              </Text>
              <Pressable
                style={styles.retryButton}
                onPress={handleRetryPreview}
              >
                <RefreshCw size={16} color="#FFFFFF" />
                <Text style={styles.retryText}>ลองใหม่</Text>
              </Pressable>
            </View>
          )}
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
    zIndex: 10
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
    gap: 2,
    maxWidth: '82%'
  },
  fileName: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#FFFFFF',
    maxWidth: '100%'
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  previewContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0
  },
  zoomContainer: {
    width: '100%',
    height: '100%'
  },
  zoomContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
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
  pdfContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden'
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: '#111827'
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
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Prompt_500Medium'
  },
  actionBar: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 10
  }
})
