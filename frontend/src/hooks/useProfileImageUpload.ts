import { Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { uploadService } from '../utils/api/services/upload_service'
import { petProfileService } from '../utils/api/services/pet_profile_service'

interface UseProfileImageUploadOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useProfileImageUpload(options?: UseProfileImageUploadOptions) {
  const [isUploading, setIsUploading] = useState(false)

  const pickAndUpload = async (petId: string, source: 'gallery' | 'camera') => {
    try {
      // 1. Pick or take photo
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            })

      if (result.canceled) return

      const asset = result.assets[0]
      const fileUri = asset.uri
      const fileName = asset.fileName || `photo_${Date.now()}.jpg`
      const fileType = asset.mimeType || 'image/jpeg'
      const fileSize = asset.fileSize || 0

      setIsUploading(true)

      // 2. Request presigned upload URL from backend
      const uploadUrlResponse = await uploadService.requestUploadUrl({
        fileName,
        fileType,
        fileSize,
        category: 'pet-profile',
        entityId: petId,
      })

      const { uploadUrl, objectKey } = uploadUrlResponse.data

      // 3. Upload file directly to MinIO
      await uploadService.uploadFileToMinIO(uploadUrl, fileUri, fileType)

      // 4. Save object key to pet profile in backend
      await petProfileService.updateProfileImage(petId, objectKey)

      options?.onSuccess?.()
    } catch (error) {
      console.error('Profile image upload failed:', error)
      Alert.alert('อัพโหลดไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง')
      options?.onError?.(error as Error)
    } finally {
      setIsUploading(false)
    }
  }

  const deleteImage = async (petId: string) => {
    try {
      setIsUploading(true)
      await petProfileService.deleteProfileImage(petId)
      options?.onSuccess?.()
    } catch (error) {
      console.error('Profile image delete failed:', error)
      Alert.alert('ลบรูปไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง')
      options?.onError?.(error as Error)
    } finally {
      setIsUploading(false)
    }
  }

  const showImagePickerModal = (petId: string, hasExistingImage: boolean) => {
    const options = [
      {
        text: 'เลือกจากแกลเลอรี่',
        onPress: async () => {
          await pickAndUpload(petId, 'gallery')
        },
      },
      {
        text: 'ถ่ายรูป',
        onPress: async () => {
          await pickAndUpload(petId, 'camera')
        },
      },
    ]

    if (hasExistingImage) {
      options.push({
        text: 'ลบรูปโปรไฟล์',
        onPress: async () => {
          Alert.alert('ยืนยัน', 'ต้องการลบรูปโปรไฟล์หรือไม่?', [
            { text: 'ยกเลิก', style: 'cancel' },
            {
              text: 'ลบ',
              style: 'destructive',
              onPress: async () => {
                await deleteImage(petId)
              },
            },
          ])
        },
      })
    }

    Alert.alert('รูปโปรไฟล์', 'เลือกวิธีการ', [
      ...options,
      { text: 'ยกเลิก', style: 'cancel' },
    ])
  }

  return {
    isUploading,
    pickAndUpload,
    deleteImage,
    showImagePickerModal,
  }
}
