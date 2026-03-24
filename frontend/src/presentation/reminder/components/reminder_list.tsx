import dayjs from 'dayjs'
import { Link } from 'expo-router'
import _ from 'lodash'
import React, { useCallback, useEffect, useState } from 'react'

import { IPetProfile } from '@/src/domain/pet.domain'
import { CATEGORY_MAP, IReminder } from '@/src/domain/reminder.domain'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import {
  addExcludedDate,
  removeRuleExcludedDates
} from '@/src/utils/excluded_dates_storage'
import AppModal from '../../components/modal'

import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  Bone,
  LayoutGrid,
  Pill,
  Pipette,
  Plus,
  Scissors,
  Stethoscope,
  Syringe,
  Tag
} from 'lucide-react-native'
import {
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import LoadingComponent from '../../components/loading_component'
import ReminderDetailModal from '../pages/reminder_detail_modal'
import RecurringReminderCard from './recurrence/recurring_reminder_card'
import ReminderCard from './reminder_card'

type TabType = 'to_do' | 'today' | 'done'

const ICON_MAP: Record<string, any> = {
  Tag,
  Syringe,
  Stethoscope,
  Pill,
  Pipette,
  Scissors,
  Bone
}

interface ReminderListProps {
  reminders: any[]
  pets?: IPetProfile[]
  isLoading?: boolean
  onRefresh?: () => void
  initialReminderId?: string | null
  selectedCategory?: string | null
  onSelectedCategoryChange?: (category: string | null) => void
  selectedPetId?: string | null
  onSelectedPetIdChange?: (petId: string | null) => void
  isToday?: boolean
  allReminders?: any[]
}

export default function ReminderList({
  reminders,
  pets = [],
  isLoading,
  onRefresh,
  initialReminderId,
  selectedCategory = null,
  onSelectedCategoryChange,
  selectedPetId = null,
  onSelectedPetIdChange,
  isToday = true,
  allReminders = []
}: ReminderListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('today')
  const [petModalVisible, setPetModalVisible] = useState(false)

  const [tempDoneIds, setTempDoneIds] = useState<string[]>([])
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(
    initialReminderId || null
  )
  const [selectedReminder, setSelectedReminder] = useState<IReminder | null>(
    null
  )
  const [showDeletePermissionModal, setShowDeletePermissionModal] =
    useState(false)
  const [blockedReminderName, setBlockedReminderName] = useState('')
  const [blockedCreatorName, setBlockedCreatorName] = useState('')
  const [showAlreadyDeletedModal, setShowAlreadyDeletedModal] = useState(false)
  const [alreadyDeletedReminderName, setAlreadyDeletedReminderName] =
    useState('')
  const [alreadyDeletedByName, setAlreadyDeletedByName] = useState('')

  const deleteReminderApi = useApi(reminderService.deleteReminder, {
    showErrorAlert: false,
    onSuccess: () => {
      if (onRefresh) {
        onRefresh()
      }
    }
  })

  const updateStatusApi = useApi(reminderService.updateReminderStatus, {
    showErrorAlert: true
  })

  useEffect(() => {
    setTempDoneIds([])
  }, [reminders])

  useEffect(() => {
    if (initialReminderId) {
      setSelectedReminderId(initialReminderId)
      const reminder = reminders.find((r) => r.id === initialReminderId)
      setSelectedReminder(reminder || null)
    }
  }, [initialReminderId, reminders])

  useEffect(() => {
    if (!isToday && activeTab === 'today') {
      setActiveTab('to_do')
    }
  }, [isToday, activeTab])

  const handleReminderDetail = (reminderId: string) => {
    const reminder = reminders.find((r) => r.id === reminderId)
    setSelectedReminderId(reminderId)
    setSelectedReminder(reminder || null)
  }

  const getOtherActorName = (reminder?: IReminder) => {
    if (!reminder?.created_by) return 'เจ้าของสัตว์เลี้ยง'
    if (reminder.created_by === 'เจ้าของสัตว์เลี้ยง')
      return 'เจ้าของสัตว์เลี้ยง'
    if (reminder.created_by === 'คุณ') return 'เจ้าของสัตว์เลี้ยง'
    return reminder.created_by
  }

  const handleDeleteReminder = useCallback(
    async (
      id: string,
      deleteScope?: 'THIS_INSTANCE_ONLY' | 'ALL_INSTANCES'
    ) => {
      try {
        // Find the reminder to check if it's virtual
        const reminder = reminders.find((r) => r.id === id)
        const petRole = pets.find((pet) => pet.id === reminder?.petId)?.petRole

        let deleteId = id
        let excludeDate: string | undefined

        // For recurring reminders (both real and virtual), we need to handle deletion properly
        if (reminder?.recurrence && deleteScope === 'THIS_INSTANCE_ONLY') {
          // Pass the date to add to excluded_dates array
          excludeDate = reminder.reminderDate

          // For virtual reminders, use the rule ID instead of the reminder ID
          if (reminder.isVirtual) {
            deleteId = reminder.recurrence.id
          }

          // Store excluded date in AsyncStorage as a workaround for backend not persisting excluded_dates
          if (excludeDate) {
            await addExcludedDate(reminder.recurrence.id, excludeDate)
            console.log('[AsyncStorage] Added excluded date:', {
              ruleId: reminder.recurrence.id,
              excludeDate
            })
          }
        } else if (reminder?.isVirtual && deleteScope === 'ALL_INSTANCES') {
          // For deleting all instances of virtual reminder, use the rule ID
          deleteId = reminder.recurrence?.id || id
        }

        // Remove all AsyncStorage exclusions when deleting all instances
        if (deleteScope === 'ALL_INSTANCES' && reminder?.recurrence?.id) {
          await removeRuleExcludedDates(reminder.recurrence.id)
          console.log(
            '[AsyncStorage] Removed all excluded dates for rule:',
            reminder.recurrence.id
          )
        }

        const { error } = await deleteReminderApi.execute(
          deleteId,
          deleteScope,
          excludeDate
        )

        if (error) {
          if (error.statusCode === 403 && petRole === 'CAREGIVER') {
            setBlockedReminderName(reminder?.reminderName || 'รายการนี้')
            setBlockedCreatorName(reminder?.created_by || 'เจ้าของสัตว์เลี้ยง')
            setShowDeletePermissionModal(true)
            return
          }
          if (error.statusCode === 404) {
            setAlreadyDeletedReminderName(reminder?.reminderName || 'รายการนี้')
            setAlreadyDeletedByName(getOtherActorName(reminder))
            setShowAlreadyDeletedModal(true)
            return
          }
          console.error('Failed to delete reminder', error)
          return
        }

        // Refresh the reminder list and calendar after successful deletion
        setTimeout(() => {
          if (onRefresh) {
            onRefresh()
          }
        }, 200)
      } catch (error) {
        console.error('Failed to delete reminder', error)
      }
    },
    [deleteReminderApi, onRefresh, reminders, pets]
  )

  const handleToggleStatus = useCallback(
    async (id: string, currentStatus: string) => {
      if (tempDoneIds.includes(id)) return

      if (currentStatus === 'to_do' || currentStatus === 'overdue') {
        setTempDoneIds((prev) => [...prev, id])
      }

      try {
        await updateStatusApi.execute(id)

        setTimeout(() => {
          if (onRefresh) {
            onRefresh()
          }
        }, 200)
      } catch (error) {
        console.error('Failed to update status', error)
        if (currentStatus === 'to_do' || currentStatus === 'overdue') {
          setTempDoneIds((prev) => prev.filter((doneId) => doneId !== id))
        }
      }
    },
    [tempDoneIds, updateStatusApi, onRefresh]
  )

  const filteredReminders = (() => {
    const sourceReminders =
      activeTab === 'today'
        ? Array.isArray(allReminders)
          ? allReminders
          : Array.isArray(reminders)
            ? reminders
            : []
        : Array.isArray(reminders)
          ? reminders
          : []

    return sourceReminders.filter((reminder) => {
      let statusMatch = false
      if (activeTab === 'to_do') {
        statusMatch =
          reminder.reminderStatus === 'to_do' ||
          reminder.reminderStatus === 'overdue'
      } else if (activeTab === 'today') {
        statusMatch =
          (reminder.reminderStatus === 'to_do' ||
            reminder.reminderStatus === 'overdue') &&
          dayjs(reminder.reminderDate).isSame(dayjs(), 'day')
      } else {
        statusMatch = reminder.reminderStatus === 'done'
      }

      const categoryMatch = selectedCategory
        ? reminder.categoryName === selectedCategory
        : true

      const petMatch = selectedPetId ? reminder.petId === selectedPetId : true

      return statusMatch && categoryMatch && petMatch
    })
  })()

  return (
    <View style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabContainer}>
        {isToday && (
          <TouchableOpacity
            onPress={() => setActiveTab('today')}
            style={styles.tabButton}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'today' && styles.activeTabText
              ]}
            >
              วันนี้
            </Text>
            {activeTab === 'today' && <View style={styles.activeUnderline} />}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => setActiveTab('to_do')}
          style={[styles.tabButton, { alignItems: 'center' }]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'to_do' && styles.activeTabText
            ]}
          >
            ทั้งหมด{' '}
            {reminders.filter((r) => r.reminderStatus === 'to_do').length > 0 &&
              `(${reminders.filter((r) => r.reminderStatus === 'to_do').length})`}
          </Text>
          {activeTab === 'to_do' && <View style={styles.activeUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('done')}
          style={styles.tabButton}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'done' && styles.activeTabText
            ]}
          >
            เสร็จสิ้น{' '}
            {reminders.filter((r) => r.reminderStatus === 'done').length > 0 &&
              `(${reminders.filter((r) => r.reminderStatus === 'done').length})`}
          </Text>
          {activeTab === 'done' && <View style={styles.activeUnderline} />}
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilterContainer}
        contentContainerStyle={styles.categoryFilterContent}
      >
        {/* Pet Filter Button */}
        <TouchableOpacity
          onPress={() => setPetModalVisible(true)}
          style={[
            styles.categoryTab,
            selectedPetId && styles.activeCategoryTab
          ]}
        >
          <MaterialCommunityIcons
            name="dog"
            size={18}
            color={selectedPetId ? '#fff' : '#6B7280'}
          />
          <Text
            style={[
              styles.categoryTabText,
              selectedPetId && styles.activeCategoryTabText
            ]}
          >
            {selectedPetId
              ? pets.find((p) => p.id === selectedPetId)?.pet_name ||
                'สัตว์เลี้ยง'
              : 'สัตว์เลี้ยง'}
          </Text>
        </TouchableOpacity>

        {/* Category Filter Tabs */}
        <TouchableOpacity
          onPress={() => onSelectedCategoryChange?.(null)}
          style={[
            styles.categoryTab,
            selectedCategory === null && styles.activeCategoryTab
          ]}
        >
          <LayoutGrid
            size={18}
            color={selectedCategory === null ? '#fff' : '#6B7280'}
          />
          <Text
            style={[
              styles.categoryTabText,
              selectedCategory === null && styles.activeCategoryTabText
            ]}
          >
            ทั้งหมด
          </Text>
        </TouchableOpacity>

        {Object.entries(CATEGORY_MAP).map(([categoryKey, categoryInfo]) => {
          const Icon = ICON_MAP[categoryInfo.icon]
          return (
            <TouchableOpacity
              key={categoryKey}
              onPress={() => onSelectedCategoryChange?.(categoryKey)}
              style={[
                styles.categoryTab,
                selectedCategory === categoryKey && styles.activeCategoryTab
              ]}
            >
              {Icon && (
                <Icon
                  size={18}
                  color={
                    selectedCategory === categoryKey
                      ? '#fff'
                      : categoryInfo.color
                  }
                />
              )}
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === categoryKey &&
                    styles.activeCategoryTabText
                ]}
              >
                {categoryInfo.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Reminder Content */}
      {isLoading ? (
        <LoadingComponent />
      ) : (
        <ScrollView
          style={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {_.size(filteredReminders) === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'to_do' || activeTab === 'today'
                  ? 'ไม่มีเตือนความจำ'
                  : 'ไม่มีรายการที่เสร็จสิ้น'}
              </Text>
            </View>
          ) : (
            <>
              {_.map(filteredReminders, (reminder) =>
                reminder.children && reminder.children.length > 0 ? (
                  <RecurringReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    instances={reminder.children || []}
                    onPress={() => handleReminderDetail(reminder.id)}
                    onDelete={handleDeleteReminder}
                    canDeleteAccess={reminder.canDelete !== false}
                    onDeleteBlocked={() => {
                      setBlockedReminderName(
                        reminder.reminderName || 'รายการนี้'
                      )
                      setBlockedCreatorName(
                        reminder.created_by || 'เจ้าของสัตว์เลี้ยง'
                      )
                      setShowDeletePermissionModal(true)
                    }}
                    onRefresh={onRefresh}
                    canDelete={reminder.reminderStatus !== 'done'}
                  />
                ) : (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onDelete={handleDeleteReminder}
                    canDeleteAccess={reminder.canDelete !== false}
                    onDeleteBlocked={() => {
                      setBlockedReminderName(
                        reminder.reminderName || 'รายการนี้'
                      )
                      setBlockedCreatorName(
                        reminder.created_by || 'เจ้าของสัตว์เลี้ยง'
                      )
                      setShowDeletePermissionModal(true)
                    }}
                    onPress={handleReminderDetail}
                    isDeleting={deleteReminderApi.loading}
                    canDelete={reminder.reminderStatus !== 'done'}
                    onToggleStatus={handleToggleStatus}
                    isTempDone={tempDoneIds.includes(reminder.id)}
                  />
                )
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <Link href="/(tabs)/add_reminder" push asChild>
        <TouchableOpacity style={styles.addReminderButton}>
          <Plus size={32} color="#fff" strokeWidth={3} />
        </TouchableOpacity>
      </Link>

      {/* Pet Selection Modal */}
      <RNModal
        visible={petModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPetModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPetModalVisible(false)}
        >
          <View style={styles.petModalContent}>
            <View style={styles.petModalHeader}>
              <Text style={styles.petModalTitle}>เลือกสัตว์เลี้ยง</Text>
              <TouchableOpacity onPress={() => setPetModalVisible(false)}>
                <Text style={styles.petModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.petModalList}>
              {/* All Pets Option */}
              <TouchableOpacity
                onPress={() => {
                  onSelectedPetIdChange?.(null)
                  setPetModalVisible(false)
                }}
                style={[
                  styles.petModalItem,
                  !selectedPetId && styles.petModalItemActive
                ]}
              >
                <MaterialCommunityIcons
                  name="dog"
                  size={20}
                  color={!selectedPetId ? '#fff' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.petModalItemText,
                    !selectedPetId && styles.petModalItemTextActive
                  ]}
                >
                  สัตว์เลี้ยงทั้งหมด
                </Text>
                {!selectedPetId && <View style={styles.petModalCheckmark} />}
              </TouchableOpacity>

              {/* Individual Pets */}
              {pets.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  onPress={() => {
                    onSelectedPetIdChange?.(pet.id)
                    setPetModalVisible(false)
                  }}
                  style={[
                    styles.petModalItem,
                    selectedPetId === pet.id && styles.petModalItemActive
                  ]}
                >
                  <MaterialCommunityIcons
                    name="dog"
                    size={20}
                    color={selectedPetId === pet.id ? '#fff' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.petModalItemText,
                      selectedPetId === pet.id && styles.petModalItemTextActive
                    ]}
                  >
                    {pet.pet_name}
                  </Text>
                  {selectedPetId === pet.id && (
                    <View style={styles.petModalCheckmark} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </RNModal>

      {/* Reminder Detail Modal */}
      <RNModal
        visible={!!selectedReminderId}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectedReminderId(null)
          setSelectedReminder(null)
        }}
      >
        <ReminderDetailModal
          id={selectedReminderId || ''}
          onClose={() => {
            setSelectedReminderId(null)
            setSelectedReminder(null)
          }}
          isVirtual={selectedReminder?.isVirtual || false}
          virtualReminderData={
            selectedReminder?.isVirtual ? selectedReminder : undefined
          }
        />
      </RNModal>

      <AppModal
        variant="confirmation"
        visible={showDeletePermissionModal}
        onClose={() => setShowDeletePermissionModal(false)}
        icon="warning"
        title="ไม่สามารถลบเตือนความจำได้"
        message={`คุณเป็นผู้ดูแลร่วม จึงลบได้เฉพาะเตือนความจำที่คุณสร้างเอง\n\nรายการ "${blockedReminderName}" ถูกสร้างโดย "${blockedCreatorName}"`}
        confirmText="รับทราบ"
        cancelText="ปิด"
        onConfirm={() => setShowDeletePermissionModal(false)}
        confirmVariant="base"
      />

      <AppModal
        variant="confirmation"
        visible={showAlreadyDeletedModal}
        onClose={() => setShowAlreadyDeletedModal(false)}
        icon="info"
        title="ไม่พบเตือนความจำ"
        message={`รายการ "${alreadyDeletedReminderName}" ถูกลบโดย "${alreadyDeletedByName}" ไปแล้ว`}
        confirmText="รับทราบ"
        cancelText="ปิด"
        onConfirm={() => {
          setShowAlreadyDeletedModal(false)
          if (onRefresh) {
            onRefresh()
          }
        }}
        confirmVariant="base"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff9f1',
    borderRadius: 24
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff9f1'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#225877',
    fontFamily: 'Prompt_400Regular'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff9f1'
  },
  errorText: {
    fontSize: 16,
    color: '#BF1737',
    fontFamily: 'Prompt_400Regular'
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff9f1'
  },
  tabButton: {
    paddingBottom: 4
  },
  tabText: {
    color: '#C4C4C4',
    fontSize: 17,
    fontFamily: 'Prompt_400Regular'
  },
  activeTabText: {
    color: '#225877',
    fontFamily: 'Prompt_700Bold'
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#225877'
  },
  contentContainer: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    color: '#C4C4C4',
    fontSize: 16,
    fontFamily: 'Prompt_400Regular'
  },
  addReminderButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5FA7D1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'visible'
  },
  categoryFilterContainer: {
    backgroundColor: '#fff9f1',
    paddingVertical: 4,
    maxHeight: 50
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    gap: 8
  },
  categoryTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28
  },
  activeCategoryTab: {
    backgroundColor: '#5FA7D1',
    borderColor: '#5FA7D1'
  },
  categoryTabText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Prompt_400Regular',
    textAlign: 'center'
  },
  activeCategoryTabText: {
    color: '#fff',
    fontFamily: 'Prompt_500Medium'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  petModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '80%'
  },
  petModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  petModalTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_600SemiBold',
    color: '#225877'
  },
  petModalClose: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: 'bold'
  },
  petModalList: {
    marginBottom: 10
  },
  petModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
    gap: 12
  },
  petModalItemActive: {
    backgroundColor: '#5FA7D1'
  },
  petModalItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#6B7280'
  },
  petModalItemTextActive: {
    color: '#fff',
    fontFamily: 'Prompt_600SemiBold'
  },
  petModalCheckmark: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff'
  }
})
