import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View, Alert, Image } from 'react-native'
import { useRouter } from 'expo-router'

import {
  getCategoryInfo,
  IReminder,
  IAttachment
} from '@/src/domain/reminder.domain'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import {
  convertFromBackendRecurrence,
  formatRecurrenceText
} from '@/src/utils/recurrence.utils'
import {
  AlertCircle,
  Bone,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  File,
  Hourglass,
  PawPrint,
  Pill,
  Pipette,
  Repeat,
  Scissors,
  SearchX,
  Stethoscope,
  Syringe,
  Tag,
  X,
  XCircle
} from 'lucide-react-native'
import LoadingComponent from '../../components/loading_component'
import VaccineListSection from '../components/vaccine_list_section'
import AttachmentPreviewModal from '../components/attachment_preview_modal'
import { Ionicons } from '@expo/vector-icons'

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

const THAI_WEEKDAYS = [
  'อาทิตย์',
  'จันทร์',
  'อังคาร',
  'พุธ',
  'พฤหัสบดี',
  'ศุกร์',
  'เสาร์'
]

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.'
]

const formatThaiDate = (dateValue: string): string => {
  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  const weekday = THAI_WEEKDAYS[date.getDay()]
  const day = date.getDate()
  const month = THAI_MONTHS_SHORT[date.getMonth()]
  const buddhistYear = date.getFullYear() + 543

  return `${weekday} ${day} ${month} ${buddhistYear}`
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

const getAttachmentThumbnailUri = (attachment: IAttachment): string | null => {
  if (!attachment.fileType.startsWith('image/')) {
    return null
  }

  return attachment.downloadUrl || null
}

const isSupportedAttachmentType = (attachment: IAttachment): boolean => {
  const mimeType = attachment.fileType.toLowerCase()
  const fileName = attachment.fileName.toLowerCase()

  if (
    mimeType === 'application/pdf' ||
    mimeType === 'image/jpeg' ||
    mimeType === 'image/png'
  ) {
    return true
  }

  return (
    fileName.endsWith('.pdf') ||
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.png')
  )
}

interface ReminderDetailModalProps {
  id: string
  onClose: () => void
  onRefresh?: () => void
  isVirtual?: boolean
  virtualReminderData?: IReminder
}

export default function ReminderDetailModal({
  id,
  onClose,
  onRefresh,
  isVirtual = false,
  virtualReminderData
}: ReminderDetailModalProps) {
  // ------------------
  // STATE & CONST
  // ------------------
  const router = useRouter()
  const [modalLayout, setModalLayout] = useState({ y: 0, height: 0 })
  const [previewAttachment, setPreviewAttachment] =
    useState<IAttachment | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const getReminderApi = useApi(reminderService.getReminderById, {
    showErrorAlert: true
  })

  // Use virtual reminder data if available, otherwise use API data
  const reminder =
    isVirtual && virtualReminderData
      ? virtualReminderData
      : getReminderApi?.data?.data
  const isOverdue = reminder?.reminderStatus === 'overdue'
  const isDone = reminder?.reminderStatus === 'done'
  const categoryInfo = reminder?.categoryName
    ? getCategoryInfo(reminder.categoryName)
    : null
  const CategoryIcon = categoryInfo ? ICON_MAP[categoryInfo.icon] : null

  // Status configuration
  const getStatusConfig = () => {
    if (isDone) {
      return {
        label: 'เสร็จสิ้น',
        color: '#15AD90',
        bgColor: '#E6FFFA',
        icon: CheckCircle2
      }
    }
    if (isOverdue) {
      return {
        label: 'เลยกำหนด',
        color: '#DC2626',
        bgColor: '#FEE2E2',
        icon: XCircle
      }
    }
    return {
      label: 'รอดำเนินการ',
      color: '#FF9531',
      bgColor: '#FFF4E6',
      icon: Hourglass
    }
  }

  const statusConfig = getStatusConfig()

  const handleEdit = () => {
    onClose()
    router.push({
      pathname: '/(tabs)/add_reminder',
      params: { reminderId: id }
    })
  }

  const handleAttachmentPress = (attachment: IAttachment) => {
    if (!isSupportedAttachmentType(attachment)) {
      Alert.alert(
        'ประเภทไฟล์ไม่รองรับ',
        'รองรับเฉพาะไฟล์ PDF, JPG และ PNG เท่านั้น'
      )
      return
    }

    setPreviewAttachment(attachment)
    setShowPreview(true)
  }

  const handleNotFoundClose = () => {
    if (onRefresh) {
      onRefresh()
    }
    onClose()
  }

  // ------------------
  // USE-EFFECTS
  // ------------------
  // USE-EFFECTS
  // ------------------
  useEffect(() => {
    // Only fetch from API if not a virtual reminder
    if (id && !isVirtual) {
      getReminderApi.execute(id)
    }
  }, [id, isVirtual])

  // Show not found message
  if (!id || (!getReminderApi.loading && !reminder && !isVirtual)) {
    return (
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={handleNotFoundClose} />

        <View
          style={styles.notFoundContent}
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout
            setModalLayout({ y, height })
          }}
        >
          <View style={styles.notFoundContainer}>
            <SearchX color={'#225877'} size={64} />
            <Text style={styles.notFoundTitle}>ไม่พบการแจ้งเตือน</Text>
            <Text style={styles.notFoundMessage}>
              {!id
                ? 'ไม่พบรหัสการแจ้งเตือน'
                : 'เตือนความจำนี้อาจถูกลบไปแล้ว หรือไม่มีอยู่ในระบบ'}
            </Text>
          </View>
        </View>

        {/* Close Button - Dynamically positioned below modal */}
        {modalLayout.height > 0 && (
          <Pressable
            style={[
              styles.closeButtonOutside,
              { top: modalLayout.y + modalLayout.height + 20 }
            ]}
            onPress={handleNotFoundClose}
          >
            <X color="#FFFFFF" size={28} />
          </Pressable>
        )}
      </View>
    )
  }

  // ------------------
  // RENDER
  // ------------------
  return (
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
          <Text style={styles.headerTitle}>รายละเอียดเตือนความจำ</Text>
          {!isVirtual && reminder?.reminderStatus !== 'done' && (
            <Pressable onPress={handleEdit} style={styles.editButton}>
              <Edit2 size={18} color="#5FA7D1" />
            </Pressable>
          )}
        </View>

        {/* Form Card */}
        {getReminderApi.loading && !isVirtual ? (
          <LoadingComponent />
        ) : (
          <View style={styles.formCard}>
            {/* Virtual Reminder Alert */}
            {isVirtual && (
              <View style={styles.virtualAlert}>
                <AlertCircle color="#F59E0B" size={16} />
                <View style={styles.virtualAlertTextContainer}>
                  <Text style={styles.virtualAlertTitle}>
                    เตือนความจำคาดการณ์
                  </Text>
                  <Text style={styles.virtualAlertMessage}>
                    นี่คือการแสดงผลล่วงหน้าจากรูปแบบการทำซ้ำ
                  </Text>
                </View>
              </View>
            )}

            {/* Status Badge */}
            {!isVirtual && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusConfig.bgColor }
                ]}
              >
                {React.createElement(statusConfig.icon, {
                  size: 18,
                  color: statusConfig.color
                })}
                <Text
                  style={[styles.statusText, { color: statusConfig.color }]}
                >
                  {statusConfig.label}
                </Text>
              </View>
            )}

            {/* Title with Category */}
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <Text style={styles.reminderTitle}>
                  {reminder?.reminderName || ''}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name={'paw-outline'} size={14} color={'#6b7280'} />
                  <Text style={styles.petNameText}>
                    {reminder?.pet_name || '-'}
                  </Text>
                  {categoryInfo && (
                    <>
                      <View style={styles.dot} />
                      {CategoryIcon && (
                        <CategoryIcon size={14} color={categoryInfo.color} />
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
            {!reminder?.children && (
              <View style={styles.dateTimeCard}>
                <View style={styles.dateTimeRow}>
                  <CalendarDays
                    size={16}
                    color={isOverdue ? '#DC2626' : '#5FA7D1'}
                  />
                  <Text
                    style={[
                      styles.dateTimeText,
                      isOverdue && styles.overdueText
                    ]}
                  >
                    {reminder?.reminderDate
                      ? formatThaiDate(reminder.reminderDate)
                      : '-'}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.dateTimeRow}>
                  <Clock size={16} color={isOverdue ? '#DC2626' : '#5FA7D1'} />
                  <Text
                    style={[
                      styles.dateTimeText,
                      isOverdue && styles.overdueText
                    ]}
                  >
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
                {reminder.attachments.map((attachment) => {
                  const thumbnailUri = getAttachmentThumbnailUri(attachment)

                  return (
                    <Pressable
                      key={attachment.id}
                      style={styles.attachmentItem}
                      onPress={() => handleAttachmentPress(attachment)}
                    >
                      {thumbnailUri ? (
                        <Image
                          source={{ uri: thumbnailUri }}
                          style={styles.attachmentThumbnail}
                          resizeMode="cover"
                        />
                      ) : (
                        <File size={20} color="#5FA7D1" />
                      )}
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
                  )
                })}
              </View>
            )}

            {/* Child Reminders Section */}
            {reminder?.children && reminder.children.length > 0 && (
              <VaccineListSection children={reminder.children} />
            )}
          </View>
        )}
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
  notFoundContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    paddingVertical: 40,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  notFoundContainer: {
    alignItems: 'center',
    gap: 16
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
    flex: 1,
    marginRight: 8
  },
  editButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0
  },
  formCard: {
    padding: 16,
    gap: 12
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'Prompt_500Medium'
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
  overdueText: {
    color: '#DC2626',
    fontFamily: 'Prompt_700Bold'
  },
  notFoundTitle: {
    fontSize: 22,
    color: '#374151',
    fontFamily: 'Prompt_700Bold',
    marginBottom: 4,
    textAlign: 'center'
  },
  notFoundMessage: {
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'Prompt_400Regular',
    textAlign: 'center',
    lineHeight: 24
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
  virtualAlert: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 8,
    gap: 8,
    alignItems: 'center'
  },
  virtualAlertTextContainer: {
    flex: 1,
    gap: 2
  },
  virtualAlertTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontFamily: 'Prompt_700Bold'
  },
  virtualAlertMessage: {
    color: '#92400E',
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    lineHeight: 16
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
  attachmentThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 4
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
