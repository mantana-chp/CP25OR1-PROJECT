import { Link } from 'expo-router'
import _ from 'lodash'
import React, { useCallback, useEffect, useState } from 'react'

import { CATEGORY_MAP, IReminder } from '@/src/domain/reminder.domain'
import { IPetProfile } from '@/src/domain/pet.domain'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'

import {
  Bone,
  LayoutGrid,
  Pill,
  Pipette,
  Plus,
  Scissors,
  Stethoscope,
  Syringe,
  Tag,
} from 'lucide-react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import LoadingComponent from '../../components/loading_component'
import ReminderDetailModal from '../pages/reminder_detail_modal'
import RecurringReminderCard from './recurring_reminder_card'
import ReminderCard from './reminder_card'

type TabType = 'to_do' | 'done'

const ICON_MAP: Record<string, any> = {
  Tag,
  Syringe,
  Stethoscope,
  Pill,
  Pipette,
  Scissors,
  Bone,
}

interface ReminderListProps {
  reminders: IReminder[]
  pets?: IPetProfile[]
  isLoading?: boolean
  onRefresh?: () => void
  initialReminderId?: string | null
}

export default function ReminderList({
  reminders,
  pets = [],
  isLoading,
  onRefresh,
  initialReminderId,
}: ReminderListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('to_do')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const [petModalVisible, setPetModalVisible] = useState(false)

  const [tempDoneIds, setTempDoneIds] = useState<string[]>([])
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(
    initialReminderId || null,
  )

  const deleteReminderApi = useApi(reminderService.deleteReminder, {
    onSuccess: () => {
      if (onRefresh) {
        onRefresh()
      }
    },
  })

  const updateStatusApi = useApi(reminderService.updateReminderStatus, {
    showErrorAlert: true,
  })

  useEffect(() => {
    setTempDoneIds([])
  }, [reminders])

  useEffect(() => {
    if (initialReminderId) {
      setSelectedReminderId(initialReminderId)
    }
  }, [initialReminderId])

  const handleReminderDetail = (reminderId: string) => {
    setSelectedReminderId(reminderId)
  }

  const handleDeleteReminder = useCallback(
    async (
      id: string,
      deleteScope?: 'THIS_INSTANCE_ONLY' | 'ALL_INSTANCES',
    ) => {
      await deleteReminderApi.execute(id, deleteScope)
    },
    [deleteReminderApi],
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
    [tempDoneIds, updateStatusApi, onRefresh],
  )

  const filteredReminders = (Array.isArray(reminders) ? reminders : []).filter(
    (reminder) => {
      // Filter by status
      const statusMatch =
        activeTab === 'to_do'
          ? reminder.reminderStatus === 'to_do' ||
            reminder.reminderStatus === 'overdue'
          : reminder.reminderStatus === activeTab

      // Filter by category
      const categoryMatch = selectedCategory
        ? reminder.categoryName === selectedCategory
        : true

      // Filter by pet
      const petMatch = selectedPetId ? reminder.petId === selectedPetId : true

      return statusMatch && categoryMatch && petMatch
    },
  )

  return (
    <View style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('to_do')}
          style={[styles.tabButton, { alignItems: 'center' }]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'to_do' && styles.activeTabText,
            ]}
          >
            เตือนความจำ
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
              activeTab === 'done' && styles.activeTabText,
            ]}
          >
            เสร็จสิ้น
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
            selectedPetId && styles.activeCategoryTab,
          ]}
        >
          <MaterialCommunityIcons
            name='dog'
            size={18}
            color={selectedPetId ? '#fff' : '#6B7280'}
          />
          <Text
            style={[
              styles.categoryTabText,
              selectedPetId && styles.activeCategoryTabText,
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
          onPress={() => setSelectedCategory(null)}
          style={[
            styles.categoryTab,
            selectedCategory === null && styles.activeCategoryTab,
          ]}
        >
          <LayoutGrid
            size={18}
            color={selectedCategory === null ? '#fff' : '#6B7280'}
          />
          <Text
            style={[
              styles.categoryTabText,
              selectedCategory === null && styles.activeCategoryTabText,
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
              onPress={() => setSelectedCategory(categoryKey)}
              style={[
                styles.categoryTab,
                selectedCategory === categoryKey && styles.activeCategoryTab,
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
                    styles.activeCategoryTabText,
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
                {activeTab === 'to_do'
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
                    onRefresh={onRefresh}
                    canDelete={reminder.reminderStatus !== 'done'}
                  />
                ) : (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onDelete={handleDeleteReminder}
                    onPress={handleReminderDetail}
                    isDeleting={deleteReminderApi.loading}
                    canDelete={reminder.reminderStatus !== 'done'}
                    onToggleStatus={handleToggleStatus}
                    isTempDone={tempDoneIds.includes(reminder.id)}
                  />
                ),
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <Link href='/(tabs)/add-reminder' push asChild>
        <TouchableOpacity style={styles.addReminderButton}>
          <Plus size={32} color='#fff' strokeWidth={3} />
        </TouchableOpacity>
      </Link>

      {/* Pet Selection Modal */}
      <Modal
        visible={petModalVisible}
        transparent
        animationType='fade'
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
                  setSelectedPetId(null)
                  setPetModalVisible(false)
                }}
                style={[
                  styles.petModalItem,
                  !selectedPetId && styles.petModalItemActive,
                ]}
              >
                <MaterialCommunityIcons
                  name='dog'
                  size={20}
                  color={!selectedPetId ? '#fff' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.petModalItemText,
                    !selectedPetId && styles.petModalItemTextActive,
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
                    setSelectedPetId(pet.id)
                    setPetModalVisible(false)
                  }}
                  style={[
                    styles.petModalItem,
                    selectedPetId === pet.id && styles.petModalItemActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name='dog'
                    size={20}
                    color={selectedPetId === pet.id ? '#fff' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.petModalItemText,
                      selectedPetId === pet.id && styles.petModalItemTextActive,
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
      </Modal>

      {/* Reminder Detail Modal */}
      <Modal
        visible={!!selectedReminderId}
        transparent
        animationType='fade'
        onRequestClose={() => setSelectedReminderId(null)}
      >
        <ReminderDetailModal
          id={selectedReminderId || ''}
          onClose={() => setSelectedReminderId(null)}
        />
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff9f1',
    borderRadius: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff9f1',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#225877',
    fontFamily: 'Prompt_400Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff9f1',
  },
  errorText: {
    fontSize: 16,
    color: '#BF1737',
    fontFamily: 'Prompt_400Regular',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff9f1',
  },
  tabButton: {
    paddingBottom: 8,
  },
  tabText: {
    color: '#C4C4C4',
    fontSize: 20,
    fontFamily: 'Prompt_400Regular',
  },
  activeTabText: {
    color: '#225877',
    fontFamily: 'Prompt_700Bold',
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#225877',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#C4C4C4',
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
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
    overflow: 'visible',
  },
  categoryFilterContainer: {
    backgroundColor: '#fff9f1',
    paddingVertical: 14,
    maxHeight: 50,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
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
    height: 32,
  },
  activeCategoryTab: {
    backgroundColor: '#5FA7D1',
    borderColor: '#5FA7D1',
  },
  categoryTabText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Prompt_400Regular',
    textAlign: 'center',
  },
  activeCategoryTabText: {
    color: '#fff',
    fontFamily: 'Prompt_500Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  petModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  petModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  petModalTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_600SemiBold',
    color: '#225877',
  },
  petModalClose: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  petModalList: {
    marginBottom: 10,
  },
  petModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
    gap: 12,
  },
  petModalItemActive: {
    backgroundColor: '#5FA7D1',
  },
  petModalItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#6B7280',
  },
  petModalItemTextActive: {
    color: '#fff',
    fontFamily: 'Prompt_600SemiBold',
  },
  petModalCheckmark: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
})
