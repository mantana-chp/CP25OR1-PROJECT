import { apiClient } from '../api_client'

// Types for medical document feature
export interface IMedicalDocument {
  id: string
  petId: string
  createdByUserId: string
  fileName: string
  fileType: string
  fileSize: number
  objectKey: string
  downloadUrl: string
  createdAt: string
}

export interface RequestUploadFileInput {
  fileName: string
  fileType: string
  fileSize: number
}

export interface SaveMedicalDocumentInput {
  objectKey: string
  fileName: string
  fileType: string
  fileSize: number
}

export interface UploadUrlResult {
  fileName: string
  objectKey: string
  uploadUrl: string
  expiresIn: number
}

export const petMedicalDocumentService = {
  /**
   * Request presigned upload URLs for 1-5 files
   */
  requestUploadUrls: async (
    petId: string,
    files: RequestUploadFileInput[]
  ): Promise<{ data: { files: UploadUrlResult[] } }> => {
    return apiClient.post(`/v1/pets/${petId}/medical-documents/request-urls`, files)
  },

  /**
   * Save document metadata after successful upload
   */
  saveDocuments: async (
    petId: string,
    documents: SaveMedicalDocumentInput[]
  ): Promise<{ data: { documents: IMedicalDocument[] } }> => {
    return apiClient.post(`/v1/pets/${petId}/medical-documents/save`, documents)
  },

  /**
   * Get all medical documents for a pet
   */
  getDocuments: async (
    petId: string
  ): Promise<{ data: { documents: IMedicalDocument[] } }> => {
    return apiClient.get(`/v1/pets/${petId}/medical-documents`)
  },

  /**
   * Delete a medical document
   */
  deleteDocument: async (
    petId: string,
    documentId: string
  ): Promise<void> => {
    return apiClient.delete(`/v1/pets/${petId}/medical-documents/${documentId}`)
  },

  /**
   * Upload a file directly to MinIO using presigned URL
   */
  uploadFileToMinIO: async (
    presignedUrl: string,
    fileUri: string,
    contentType: string
  ): Promise<void> => {
    console.log('🚀 Starting MinIO upload for medical document...')
    console.log('📍 Upload URL:', presignedUrl.split('?')[0])

    // Fetch the file from URI
    const fileResponse = await fetch(fileUri)
    if (!fileResponse.ok) {
      throw new Error(`Failed to read file: ${fileResponse.status}`)
    }
    const blob = await fileResponse.blob()
    console.log(`📦 File blob created: ${(blob.size / 1024).toFixed(2)} KB`)

    // Upload to MinIO
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType
      },
      body: blob
    })

    console.log(
      `📤 MinIO response status: ${uploadResponse.status} ${uploadResponse.statusText}`
    )

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('❌ MinIO error response:', errorText)
      throw new Error(
        `MinIO upload failed: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText}`
      )
    }

    console.log('✅ File successfully uploaded to MinIO')
  }
}
