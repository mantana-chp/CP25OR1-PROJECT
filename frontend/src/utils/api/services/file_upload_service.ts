import { apiClient } from '../api_client'

// In your service
interface ATTACHMENT {
  id: string
  url: string
  filename: string
  contentType: string
  size: number
}

// EXAMPLE File upload service
export const fileUploadService = {
  uploadFile: async (file: File) => {
    const formData = new FormData()
    formData.append('attachment', file)

    return apiClient.post<ATTACHMENT>('/attachment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}
