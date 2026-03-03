import { useState } from 'react'
import { Alert } from 'react-native'
import { uploadService } from '../utils/api/services/upload_service'
import { reminderService } from '../utils/api/services/reminder_service'
import { IAttachment } from '../domain/reminder.domain'

interface UseReminderAttachmentsProps {
  reminderId?: string // Optional - for create mode
  onAttachmentsChange?: () => void
}

// Temporary attachment type for files pending upload (during reminder creation)
interface IPendingAttachment extends Omit<IAttachment, 'id' | 'reminderId' | 'createdAt'> {
  id: string // Temporary local ID
  uri: string // Local file URI
  isPending: true
}

export function useReminderAttachments({
  reminderId,
  onAttachmentsChange,
}: UseReminderAttachmentsProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [attachments, setAttachments] = useState<IAttachment[]>([])
  const [pendingAttachments, setPendingAttachments] = useState<IPendingAttachment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Mode: create or edit
  const isCreateMode = !reminderId || reminderId === ''

  // Load attachments for a reminder
  const loadAttachments = async () => {
    if (!reminderId) return

    try {
      setIsLoading(true)
      const response = await reminderService.getAttachments(reminderId)
      setAttachments(response.data || [])
    } catch (error) {
      console.error('Error loading attachments:', error)
      // Don't show error alert - fail silently for now since API might not exist yet
      setAttachments([])
    } finally {
      setIsLoading(false)
    }
  }

  // Add a new attachment
  const addAttachment = async (file: {
    uri: string
    name: string
    size: number
    mimeType: string
  }): Promise<void> => {
    // In create mode: store locally as pending attachment
    if (isCreateMode) {
      const pendingFile: IPendingAttachment = {
        id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID
        fileName: file.name,
        fileSize: file.size,
        fileType: file.mimeType,
        objectKey: '', // Will be set after upload
        uri: file.uri,
        isPending: true,
      }
      
      setPendingAttachments((prev) => [...prev, pendingFile])
      onAttachmentsChange?.()
      return
    }

    // In edit mode: upload immediately to backend
    setIsUploading(true)

    try {
      console.log('🚀 Starting attachment upload process...')
      console.log('📄 File details:', {
        name: file.name,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        type: file.mimeType,
      })

      // Step 1: Request presigned upload URL from backend
      const urlResponse = await uploadService.requestUploadUrl({
        fileName: file.name,
        fileType: file.mimeType,
        fileSize: file.size,
        category: 'reminder-attachment',
        entityId: reminderId!,
      })

      const { uploadUrl, objectKey } = urlResponse.data
      console.log('✅ Received upload URL')
      console.log('🔑 Object key:', objectKey)

      // Step 2: Upload file directly to MinIO
      await uploadService.uploadFileToMinIO(uploadUrl, file.uri, file.mimeType)
      console.log('✅ File uploaded to storage')

      // Step 3: Save attachment metadata to backend
      const attachmentResponse = await reminderService.addAttachment(
        reminderId!,
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.mimeType,
          objectKey,
        }
      )

      console.log('✅ Attachment metadata saved')

      // Update local state
      setAttachments((prev) => [...prev, attachmentResponse.data])

      // Notify parent component
      onAttachmentsChange?.()

      Alert.alert('สำเร็จ', 'เพิ่มไฟล์แนบเรียบร้อยแล้ว')
    } catch (error: any) {
      console.error('❌ Error uploading attachment:', error)
      
      // Check if this is because API doesn't exist yet
      if (error?.response?.status === 404) {
        Alert.alert(
          'ยังไม่พร้อมใช้งาน',
          'ฟีเจอร์แนบไฟล์จะพร้อมใช้งานในอนาคต'
        )
      } else {
        Alert.alert(
          'เกิดข้อผิดพลาด',
          error?.message || 'ไม่สามารถอัปโหลดไฟล์ได้'
        )
      }
      
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  // Delete an attachment
  const deleteAttachment = async (attachmentId: string): Promise<void> => {
    // In create mode: remove from pending attachments
    if (isCreateMode) {
      setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
      onAttachmentsChange?.()
      return
    }

    // In edit mode: delete from backend
    try {
      console.log('🗑️ Deleting attachment:', attachmentId)

      // Call backend to delete attachment (will also delete from storage)
      await reminderService.deleteAttachment(reminderId!, attachmentId)

      console.log('✅ Attachment deleted')

      // Update local state
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))

      // Notify parent component
      onAttachmentsChange?.()

      Alert.alert('สำเร็จ', 'ลบไฟล์แนบเรียบร้อยแล้ว')
    } catch (error: any) {
      console.error('❌ Error deleting attachment:', error)
      
      // Check if this is because API doesn't exist yet
      if (error?.response?.status === 404) {
        Alert.alert(
          'ยังไม่พร้อมใช้งาน',
          'ฟีเจอร์แนบไฟล์จะพร้อมใช้งานในอนาคต'
        )
      } else {
        Alert.alert(
          'เกิดข้อผิดพลาด',
          error?.message || 'ไม่สามารถลบไฟล์ได้'
        )
      }
      
      throw error
    }
  }

  // Download/view an attachment
  const downloadAttachment = async (attachment: IAttachment): Promise<void> => {
    // Can only download in edit mode with reminderId
    if (isCreateMode || !reminderId) {
      Alert.alert('ไม่สามารถดาวน์โหลดได้', 'กรุณาบันทึกการเตือนก่อนดาวน์โหลดไฟล์')
      return
    }

    try {
      console.log('📥 Requesting download URL for:', attachment.fileName)

      // Get temporary download URL from backend
      const response = await reminderService.getAttachmentDownloadUrl(
        reminderId,
        attachment.id
      )

      const downloadUrl = response.data.downloadUrl

      // Open in browser/external viewer
      // Note: In a real app, you might want to download and open locally
      if (downloadUrl) {
        const { Linking } = await import('react-native')
        await Linking.openURL(downloadUrl)
      }
    } catch (error: any) {
      console.error('❌ Error downloading attachment:', error)
      
      // Check if this is because API doesn't exist yet
      if (error?.response?.status === 404) {
        Alert.alert(
          'ยังไม่พร้อมใช้งาน',
          'ฟีเจอร์แนบไฟล์จะพร้อมใช้งานในอนาคต'
        )
      } else {
        Alert.alert(
          'เกิดข้อผิดพลาด',
          error?.message || 'ไม่สามารถดาวน์โหลดไฟล์ได้'
        )
      }
      
      throw error
    }
  }

  return {
    attachments,
    pendingAttachments,
    isLoading,
    isUploading,
    isCreateMode,
    loadAttachments,
    addAttachment,
    deleteAttachment,
    downloadAttachment,
  }
}
