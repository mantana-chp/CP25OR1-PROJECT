import { apiClient } from '../api_client'

interface UploadUrlResponse {
  data: {
    uploadUrl: string
    objectKey: string
    expiresIn: number
  }
}

export const uploadService = {
  /**
   * Request a presigned upload URL from backend
   */
  requestUploadUrl: async (params: {
    fileName: string
    fileType: string
    fileSize: number
    category: 'pet-profile' | 'reminder-attachment'
    entityId: string
  }) => {
    return apiClient.post<UploadUrlResponse>('/v1/uploads/request-url', params)
  },

  /**
   * Upload file directly to MinIO using presigned URL
   * NOTE: This does NOT go through your backend — it goes directly to MinIO
   */
  uploadFileToMinIO: async (
    presignedUrl: string,
    fileUri: string,
    contentType: string,
  ): Promise<void> => {
    try {

      const fileResponse = await fetch(fileUri)
      if (!fileResponse.ok) {
        throw new Error(`Failed to read file: ${fileResponse.status}`)
      }
      const blob = await fileResponse.blob()

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: blob,
      })


      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        throw new Error(
          `MinIO upload failed: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText}`,
        )
      }

    } catch (error) {
      throw error
    }
  },

  /**
   * Delete file from MinIO storage
   * @param objectKey - The object key of the file to delete
   */
  deleteFileFromMinIO: async (objectKey: string): Promise<void> => {
    return apiClient.delete<void>('/v1/uploads/delete', {
      data: { objectKey },
    })
  },
}
