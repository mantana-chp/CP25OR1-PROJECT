import { useState, useEffect } from 'react'
import { Alert } from 'react-native'
import { uploadService } from '../utils/api/services/upload_service'
import { reminderService } from '../utils/api/services/reminder_service'
import { IAttachment } from '../domain/reminder.domain'

interface UseReminderAttachmentsProps {
  reminderId?: string // Optional - for create mode
  initialAttachments?: IAttachment[] // Attachments from reminder details API
  onAttachmentsChange?: () => void
}

interface IPendingAttachment extends Omit<
  IAttachment,
  'id' | 'reminderId' | 'createdAt'
> {
  id: string // Temporary local ID
  uri: string // Local file URI
  isPending: true
}

export function useReminderAttachments({
  reminderId,
  initialAttachments = [],
  onAttachmentsChange
}: UseReminderAttachmentsProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [attachments, setAttachments] =
    useState<IAttachment[]>(initialAttachments)
  const [pendingAttachments, setPendingAttachments] = useState<
    IPendingAttachment[]
  >([])
  const [isLoading, setIsLoading] = useState(false)

  const isCreateMode = !reminderId || reminderId === ''

  useEffect(() => {
    if (initialAttachments.length > 0) {
      setAttachments(initialAttachments)
    }
  }, [initialAttachments])

  const addAttachment = async (file: {
    uri: string
    name: string
    size: number
    mimeType: string
  }): Promise<void> => {
    if (isCreateMode) {
      const pendingFile: IPendingAttachment = {
        id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID
        fileName: file.name,
        fileSize: file.size,
        fileType: file.mimeType,
        objectKey: '', // Will be set after upload
        uri: file.uri,
        isPending: true
      }

      setPendingAttachments((prev) => [...prev, pendingFile])
      onAttachmentsChange?.()
      return
    }

    setIsUploading(true)

    try {

      const urlResponse = await uploadService.requestUploadUrl({
        fileName: file.name,
        fileType: file.mimeType,
        fileSize: file.size,
        category: 'reminder-attachment',
        entityId: reminderId!
      })

      const { uploadUrl, objectKey } = urlResponse.data

      await uploadService.uploadFileToMinIO(uploadUrl, file.uri, file.mimeType)

      const attachmentResponse = await reminderService.addAttachment(
        reminderId!,
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.mimeType,
          objectKey
        }
      )


      setAttachments((prev) => [...prev, attachmentResponse.data])

      onAttachmentsChange?.()

      Alert.alert('สำเร็จ', 'เพิ่มไฟล์แนบเรียบร้อยแล้ว')
    } catch (error: any) {

      if (error?.response?.status === 404) {
        Alert.alert('ยังไม่พร้อมใช้งาน', 'ฟีเจอร์แนบไฟล์จะพร้อมใช้งานในอนาคต')
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

  const deleteAttachment = async (attachmentId: string): Promise<void> => {
    if (isCreateMode) {
      setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
      onAttachmentsChange?.()
      return
    }

    try {

      await reminderService.deleteAttachment(reminderId!, attachmentId)


      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))

      onAttachmentsChange?.()

      Alert.alert('สำเร็จ', 'ลบไฟล์แนบเรียบร้อยแล้ว')
    } catch (error: any) {

      if (error?.response?.status === 404) {
        Alert.alert('ยังไม่พร้อมใช้งาน', 'ฟีเจอร์แนบไฟล์จะพร้อมใช้งานในอนาคต')
      } else {
        Alert.alert('เกิดข้อผิดพลาด', error?.message || 'ไม่สามารถลบไฟล์ได้')
      }

      throw error
    }
  }

  const downloadAttachment = async (attachment: IAttachment): Promise<void> => {
    if (isCreateMode || !reminderId) {
      Alert.alert(
        'ไม่สามารถดาวน์โหลดได้',
        'กรุณาบันทึกการเตือนก่อนดาวน์โหลดไฟล์'
      )
      return
    }

    try {

      const response = await reminderService.getAttachmentDownloadUrl(
        reminderId,
        attachment.id
      )

      const downloadUrl = response.data.downloadUrl

      if (downloadUrl) {
        const { Linking } = await import('react-native')
        await Linking.openURL(downloadUrl)
      }
    } catch (error: any) {

      if (error?.response?.status === 404) {
        Alert.alert('ยังไม่พร้อมใช้งาน', 'ฟีเจอร์แนบไฟล์จะพร้อมใช้งานในอนาคต')
      } else {
        Alert.alert(
          'เกิดข้อผิดพลาด',
          error?.message || 'ไม่สามารถดาวน์โหลดไฟล์ได้'
        )
      }

      throw error
    }
  }

  const uploadPendingAttachments = async (
    newReminderId: string,
    attachmentsToUpload?: IPendingAttachment[]
  ): Promise<void> => {
    const attachments = attachmentsToUpload || pendingAttachments

    if (attachments.length === 0) {
      return
    }


    try {
      for (const pending of attachments) {

        const urlResponse = await uploadService.requestUploadUrl({
          fileName: pending.fileName,
          fileType: pending.fileType,
          fileSize: pending.fileSize,
          category: 'reminder-attachment',
          entityId: newReminderId
        })

        const { uploadUrl, objectKey } = urlResponse.data

        await uploadService.uploadFileToMinIO(
          uploadUrl,
          pending.uri,
          pending.fileType
        )

        await reminderService.addAttachment(newReminderId, {
          fileName: pending.fileName,
          fileSize: pending.fileSize,
          fileType: pending.fileType,
          objectKey
        })

      }


      setPendingAttachments([])
    } catch (error: any) {

      Alert.alert(
        'เตือน',
        'บางไฟล์แนบอาจไม่ได้รับการอัปโหลด กรุณาลองเพิ่มใหม่อีกครั้ง'
      )
    }
  }

  return {
    attachments,
    pendingAttachments,
    isLoading,
    isUploading,
    isCreateMode,
    addAttachment,
    deleteAttachment,
    downloadAttachment,
    uploadPendingAttachments
  }
}
