import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  ActivityIndicator
} from 'react-native'

import {
  getCategoryInfo,
  IReminder,
  IAttachment
} from '@/src/domain/reminder.domain'
import {
  CalendarDays,
  Clock,
  Download,
  File,
  Repeat,
  X,
  Bone,
  Pill,
  Pipette,
  Scissors,
  Stethoscope,
  Syringe,
  Tag
} from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import AttachmentPreviewModal from '@/src/presentation/reminder/components/attachment_preview_modal'
import {
  convertFromBackendRecurrence,
  formatRecurrenceText
} from '@/src/utils/recurrence.utils'

const ICON_MAP: Record<string, any> = {
  Tag,
  Syringe,
  Stethoscope,
  Pill,
  Pipette,
  Scissors,
  Bone
}

const formatTime = (time: Date) => {
  return time.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const parseApiTime = (timeString: string): Date => {
  if (!timeString) return new Date()

  const [hours, minutes, seconds] = timeString.split(':').map(Number)
  const date = new Date()
  date.setHours(hours || 0, minutes || 0, seconds || 0)
  return date
}

interface HealthRecordDetailModalProps {
  visible: boolean
  reminder: IReminder | null
  loading?: boolean
  onClose: () => void
}

export default function HealthRecordDetailModal({
  visible,
  reminder,
  loading = false,
  onClose
}: HealthRecordDetailModalProps) {
  const [modalLayout, setModalLayout] = useState({ y: 0, height: 0 })
  const [previewAttachment, setPreviewAttachment] =
    useState<IAttachment | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const categoryInfo = reminder?.categoryName
    ? getCategoryInfo(reminder.categoryName)
    : null
  const CategoryIcon = categoryInfo ? ICON_MAP[categoryInfo.icon] : null

  const handleAttachmentPress = (attachment: IAttachment) => {
    setPreviewAttachment(attachment)
    setShowPreview(true)
  }

  if (!visible) return null
  console.log(reminder)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={styles.modalContent}
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout
            setModalLayout({ y, height })
          }}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>รายละเอียดประวัติสุขภาพ</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#5FA7D1" />
                <Text style={styles.loadingText}>กำลังโหลดรายละเอียด...</Text>
              </View>
            ) : !reminder ? (
              <View style={styles.loadingWrap}>
                <Text style={styles.loadingText}>ไม่พบข้อมูลรายการนี้</Text>
              </View>
            ) : (
              <>
                {/* Title with Category */}
                <View style={styles.titleRow}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.reminderTitle}>
                      {reminder?.reminderName || 'ไม่มีชื่อ'}
                    </Text>
                    <View style={styles.metaRow}>
                      <Ionicons
                        name={'paw-outline'}
                        size={14}
                        color={'#6b7280'}
                      />
                      <Text style={styles.petNameText}>
                        {reminder?.pet_name || '-'}
                      </Text>
                      {categoryInfo && (
                        <>
                          <View style={styles.dot} />
                          {CategoryIcon && (
                            <CategoryIcon
                              size={14}
                              color={categoryInfo.color}
                            />
                          )}
                          <Text
                            style={[
                              styles.categoryInlineText,
                              { color: categoryInfo.color }
                            ]}
                          >
                            {categoryInfo.label}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>

                {/* Date & Time - Compact */}
                {reminder?.reminderDate && (
                  <View style={styles.dateTimeCard}>
                    <View style={styles.dateTimeRow}>
                      <CalendarDays size={16} color="#5FA7D1" />
                      <Text style={styles.dateTimeText}>
                        {reminder?.reminderDate
                          ? new Date(reminder.reminderDate).toLocaleDateString(
                              'th-TH',
                              {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              }
                            )
                          : '-'}
                      </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.dateTimeRow}>
                      <Clock size={16} color="#5FA7D1" />
                      <Text style={styles.dateTimeText}>
                        {reminder?.reminderTime
                          ? `${formatTime(parseApiTime(reminder.reminderTime))} น.`
                          : '-'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Recurring Information - Compact */}
                {reminder?.recurrence && (
                  <View style={styles.recurringCard}>
                    <Repeat size={14} color="#5FA7D1" />
                    <Text style={styles.recurringText}>
                      {formatRecurrenceText(
                        convertFromBackendRecurrence(reminder.recurrence)
                      )}
                      {reminder.occurrenceNumber
                        ? ` (ครั้งที่ ${reminder.occurrenceNumber})`
                        : ''}
                    </Text>
                  </View>
                )}

                {/* Description */}
                {reminder?.description && (
                  <View style={styles.descriptionSection}>
                    <Text style={styles.descriptionLabel}>รายละเอียด</Text>
                    <Text style={styles.descriptionText}>
                      {reminder?.description}
                    </Text>
                  </View>
                )}

                {/* Attachments Section */}
                {reminder?.attachments && reminder.attachments.length > 0 && (
                  <View style={styles.attachmentsSection}>
                    <Text style={styles.attachmentsSectionLabel}>
                      ไฟล์แนบ ({reminder.attachments.length})
                    </Text>
                    {reminder.attachments.map((attachment) => (
                      <Pressable
                        key={attachment.id}
                        style={styles.attachmentItem}
                        onPress={() => handleAttachmentPress(attachment)}
                      >
                        <File size={20} color="#5FA7D1" />
                        <View style={styles.attachmentInfo}>
                          <Text
                            style={styles.attachmentFileName}
                            numberOfLines={1}
                          >
                            {attachment.fileName}
                          </Text>
                          <Text style={styles.attachmentFileSize}>
                            {formatFileSize(attachment.fileSize)}
                          </Text>
                        </View>
                        <Download size={18} color="#6b7280" />
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Close Button */}
        {modalLayout.height > 0 && (
          <Pressable
            style={[
              styles.closeButtonOutside,
              { top: modalLayout.y + modalLayout.height + 20 }
            ]}
            onPress={onClose}
          >
            <X color="#FFFFFF" size={28} />
          </Pressable>
        )}

        {/* Attachment Preview Modal */}
        <AttachmentPreviewModal
          visible={showPreview}
          attachment={previewAttachment}
          onClose={() => {
            setShowPreview(false)
            setPreviewAttachment(null)
          }}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  closeButtonOutside: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -22 }],
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
    padding: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#225877',
    fontSize: 17,
    fontFamily: 'Prompt_400Regular',
    textAlign: 'center',
    flex: 1
  },
  formCard: {
    padding: 16,
    gap: 12
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  },
  titleRow: {
    gap: 4
  },
  titleContainer: {
    gap: 6
  },
  reminderTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_700Bold',
    color: '#225877',
    lineHeight: 24
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  petNameText: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  },
  categoryInlineText: {
    fontSize: 12,
    fontFamily: 'Prompt_500Medium'
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#d1d5db'
  },
  dateTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1
  },
  dateTimeText: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    flex: 1
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e7eb'
  },
  descriptionSection: {
    gap: 4,
    paddingTop: 4
  },
  descriptionLabel: {
    fontSize: 11,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#4b5563',
    lineHeight: 20
  },
  recurringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  recurringText: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    flex: 1
  },
  attachmentsSection: {
    gap: 8,
    paddingTop: 4
  },
  attachmentsSectionLabel: {
    fontSize: 11,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  attachmentInfo: {
    flex: 1,
    gap: 2
  },
  attachmentFileName: {
    fontSize: 13,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  attachmentFileSize: {
    fontSize: 11,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  }
})
