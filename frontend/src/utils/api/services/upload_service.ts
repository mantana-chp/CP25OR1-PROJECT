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
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: await fetch(fileUri).then((r) => r.blob()),
    })

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`)
    }
  },
}
