import { apiClient } from '../api_client'

/**
 * Upload URL Response from Backend
 */
interface UploadUrlResponse {
  status: {
    code: string
    description: string
  }
  data: {
    uploadUrl: string
    objectKey: string
    expiresIn: number
  }
}

/**
 * Real image upload service that integrates with MinIO via backend API
 */
export const imageUploadService = {
  /**
   * Request a presigned upload URL from backend
   * @param fileName - Original file name
   * @param fileType - MIME type (image/jpeg, image/png, etc)
   * @param fileSize - File size in bytes
   * @param petId - Pet ID for the profile image
   */
  requestUploadUrl: async (params: {
    fileName: string
    fileType: string
    fileSize: number
    petId: string
  }): Promise<{ uploadUrl: string; objectKey: string; expiresIn: number }> => {
    try {
      const response = await apiClient.post<UploadUrlResponse>(
        '/v1/uploads/request-url',
        {
          fileName: params.fileName,
          fileType: params.fileType,
          fileSize: params.fileSize,
          category: 'pet-profile',
          entityId: params.petId,
        },
      )

      // apiClient.post returns response.data, which is the full backend response
      if (response && response.data) {
        return {
          uploadUrl: response.data.uploadUrl,
          objectKey: response.data.objectKey,
          expiresIn: response.data.expiresIn || 300,
        }
      }

      throw new Error('Invalid response structure from server')
    } catch (error: any) {
      console.error('❌ Error requesting upload URL:', error)
      throw new Error(error?.message || 'Failed to get upload URL from server')
    }
  },

  /**
   * Upload file directly to MinIO using presigned URL
   * This bypasses the backend and goes directly to MinIO for better performance
   * @param presignedUrl - The presigned PUT URL from backend
   * @param fileUri - Local URI of the file to upload
   * @param contentType - MIME type of the file
   */
  uploadFileToMinIO: async (
    presignedUrl: string,
    fileUri: string,
    contentType: string,
  ): Promise<void> => {
    try {
      // Fetch the file as blob
      const response = await fetch(fileUri)
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.statusText}`)
      }

      const blob = await response.blob()

      // Upload directly to MinIO with presigned URL
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: blob,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('MinIO error response:', errorText)
        throw new Error(
          `Upload failed with status ${uploadResponse.status}: ${uploadResponse.statusText}`,
        )
      }

      console.log('✅ File uploaded to MinIO successfully')
    } catch (error: any) {
      console.error('❌ Error uploading file to MinIO:', error)
      throw new Error(error?.message || 'Failed to upload image to storage')
    }
  },
}
