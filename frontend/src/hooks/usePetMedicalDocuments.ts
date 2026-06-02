import { useState, useEffect, useCallback } from 'react'
import { Alert } from 'react-native'
import {
  petMedicalDocumentService,
  IMedicalDocument,
} from '../utils/api/services/pet_medical_document_service'

interface UsePetMedicalDocumentsProps {
  petId: string
  onDocumentsChange?: () => void
}

export interface IPendingDocument {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  uri: string
  isPending: true
  uploadProgress?: 'waiting' | 'uploading' | 'success' | 'failed'
}

export function usePetMedicalDocuments({
  petId,
  onDocumentsChange,
}: UsePetMedicalDocumentsProps) {
  const [documents, setDocuments] = useState<IMedicalDocument[]>([])
  const [pendingDocuments, setPendingDocuments] = useState<IPendingDocument[]>(
    [],
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const fetchDocuments = useCallback(async () => {
    if (!petId) return

    setIsLoading(true)
    try {
      const response = await petMedicalDocumentService.getDocuments(petId)
      setDocuments(response.data.documents || [])
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดเอกสารได้')
      }
    } finally {
      setIsLoading(false)
    }
  }, [petId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const addPendingFiles = (
    files: Array<{
      uri: string
      name: string
      size: number
      mimeType: string
    }>,
  ) => {
    const newPending: IPendingDocument[] = files.map((file) => ({
      id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.mimeType,
      uri: file.uri,
      isPending: true,
      uploadProgress: 'waiting',
    }))

    setPendingDocuments((prev) => [...prev, ...newPending])
    return newPending
  }

  const removePendingFile = (pendingId: string) => {
    setPendingDocuments((prev) => prev.filter((p) => p.id !== pendingId))
  }

  const uploadPendingFiles = async (): Promise<{
    success: IMedicalDocument[]
    failed: Array<{ fileName: string; error: string }>
  }> => {
    if (!petId || pendingDocuments.length === 0) {
      return { success: [], failed: [] }
    }

    setIsUploading(true)
    const successDocs: IMedicalDocument[] = []
    const failedDocs: Array<{ fileName: string; error: string }> = []

    try {

      const urlResponse = await petMedicalDocumentService.requestUploadUrls(
        petId,
        pendingDocuments.map((p) => ({
          fileName: p.fileName,
          fileType: p.fileType,
          fileSize: p.fileSize,
        })),
      )

      const uploadUrls = urlResponse.data.files

      const uploadPromises = pendingDocuments.map(async (pending, index) => {
        const urlInfo = uploadUrls[index]

        setPendingDocuments((prev) =>
          prev.map((p) =>
            p.id === pending.id
              ? { ...p, uploadProgress: 'uploading' as const }
              : p,
          ),
        )

        try {
          await petMedicalDocumentService.uploadFileToMinIO(
            urlInfo.uploadUrl,
            pending.uri,
            pending.fileType,
          )

          setPendingDocuments((prev) =>
            prev.map((p) =>
              p.id === pending.id
                ? { ...p, uploadProgress: 'success' as const }
                : p,
            ),
          )

          return {
            success: true as const,
            pending,
            urlInfo,
          }
        } catch (error: any) {
          setPendingDocuments((prev) =>
            prev.map((p) =>
              p.id === pending.id
                ? { ...p, uploadProgress: 'failed' as const }
                : p,
            ),
          )

          return {
            success: false as const,
            pending,
            error: error.message || 'Upload failed',
          }
        }
      })

      const uploadResults = await Promise.allSettled(uploadPromises)

      const successfulUploads: Array<{
        pending: IPendingDocument
        urlInfo: { objectKey: string; fileName: string }
      }> = []

      uploadResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successfulUploads.push({
            pending: result.value.pending,
            urlInfo: result.value.urlInfo,
          })
        } else if (result.status === 'fulfilled' && !result.value.success) {
          failedDocs.push({
            fileName: result.value.pending.fileName,
            error: result.value.error || 'Upload failed',
          })
        } else if (result.status === 'rejected') {
          failedDocs.push({
            fileName: pendingDocuments[index].fileName,
            error: result.reason?.message || 'Upload failed',
          })
        }
      })

      if (successfulUploads.length > 0) {

        const saveResponse = await petMedicalDocumentService.saveDocuments(
          petId,
          successfulUploads.map(({ pending, urlInfo }) => ({
            objectKey: urlInfo.objectKey,
            fileName: pending.fileName,
            fileType: pending.fileType,
            fileSize: pending.fileSize,
          })),
        )

        successDocs.push(...(saveResponse.data.documents || []))
      }

      setDocuments((prev) => [...prev, ...successDocs])

      const successIds = successfulUploads.map((s) => s.pending.id)
      setPendingDocuments((prev) =>
        prev.filter((p) => !successIds.includes(p.id)),
      )

      onDocumentsChange?.()

      if (successDocs.length > 0 && failedDocs.length === 0) {
        Alert.alert('สำเร็จ', `อัปโหลด ${successDocs.length} ไฟล์เรียบร้อยแล้ว`)
      } else if (successDocs.length > 0 && failedDocs.length > 0) {
        Alert.alert(
          'บางไฟล์ไม่สำเร็จ',
          `อัปโหลดสำเร็จ ${successDocs.length} ไฟล์\nไม่สำเร็จ ${failedDocs.length} ไฟล์`,
        )
      } else if (failedDocs.length > 0) {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถอัปโหลดไฟล์ได้')
      }

      return { success: successDocs, failed: failedDocs }
    } catch (error: any) {

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'ไม่สามารถอัปโหลดไฟล์ได้'

      Alert.alert('เกิดข้อผิดพลาด', errorMessage)

      setPendingDocuments((prev) =>
        prev.map((p) => ({ ...p, uploadProgress: 'failed' as const })),
      )

      return {
        success: [],
        failed: pendingDocuments.map((p) => ({
          fileName: p.fileName,
          error: errorMessage,
        })),
      }
    } finally {
      setIsUploading(false)
    }
  }

  const deleteDocument = async (
    documentId: string,
  ): Promise<{ success: boolean; statusCode?: number }> => {
    if (!petId) return { success: false }

    try {
      await petMedicalDocumentService.deleteDocument(petId, documentId)

      setDocuments((prev) => prev.filter((d) => d.id !== documentId))

      onDocumentsChange?.()

      Alert.alert('สำเร็จ', 'ลบเอกสารเรียบร้อยแล้ว')
      return { success: true }
    } catch (error: any) {

      const statusCode = error?.response?.status

      if (statusCode === 403) {
        return { success: false, statusCode: 403 }
      }

      const errorMessage =
        error?.response?.data?.errors?.[0]?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'ไม่สามารถลบเอกสารได้'

      Alert.alert('เกิดข้อผิดพลาด', errorMessage)
      return { success: false, statusCode }
    }
  }

  const clearPending = () => {
    setPendingDocuments([])
  }

  return {
    documents,
    pendingDocuments,
    isLoading,
    isUploading,
    fetchDocuments,
    addPendingFiles,
    removePendingFile,
    uploadPendingFiles,
    deleteDocument,
    clearPending,
  }
}
