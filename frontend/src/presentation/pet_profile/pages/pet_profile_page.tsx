import { useFocusEffect, useRouter } from 'expo-router'
import _ from 'lodash'
import { version } from '../../../../package.json'

import { usePets } from '@/src/context/PetContext'
import { healthRecordService } from '@/src/utils/api/services/health_record_service'
import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'

import { Trash2 } from 'lucide-react-native'
import Header from '../../components/header_component'
import LoadingComponent from '../../components/loading_component'
import ReminderCard from '../../reminder/components/reminder_card'
import DeceasedPetModal from '../components/deceased_pet_modal'
import DeletePetModal from '../components/delete_pet_modal'
import HealthRecordCard from '../components/health_record_card'
import PetInfoCard from '../components/pet_info_card'
import PetSelector from '../components/pet_selector'
import RecentlyDeletedModal from '../components/recently_deleted_modal'
import SubMenuSection from '../components/sub_menu_section'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH - 64 // 32px padding on each side
const CARD_SPACING = 4

const HEALTH_CATEGORIES = ['Vaccination', 'Checkup', 'Medication', 'Deworming']

export default function PetProfilePage() {
  // ------------------
  // CONST
  // ------------------
  const router = useRouter()
  const flatListRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const {
    pets: contextPets,
    activePets,
    deceasedPets: contextDeceasedPets,
    deletedPets,
    selectedPetId,
    setSelectedPetId,
    refreshPets,
    softDeletePet,
    hardDeletePet,
    restorePet,
    markPetDeceased
  } = usePets()

  // Tab state: 'active' or 'past'
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active')

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showRecentlyDeletedModal, setShowRecentlyDeletedModal] =
    useState(false)
  const [showDeceasedModal, setShowDeceasedModal] = useState(false)
  const [petToDelete, setPetToDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [petToMarkDeceased, setPetToMarkDeceased] = useState<{
    id: string
    name: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isMarkingDeceased, setIsMarkingDeceased] = useState(false)

  // Find the selected pet index based on current tab
  // Note: tabPets will be recalculated after data loads
  const tabPets = activeTab === 'active' ? activePets : contextDeceasedPets

  const selectedPetIndex = tabPets.findIndex((p) => p.id === selectedPetId)
  const currentPetIndex = selectedPetIndex >= 0 ? selectedPetIndex : 0

  // ------------------
  // FETCH
  // ------------------
  const getRemindersApi = useApi(reminderService.getReminders, {
    showErrorAlert: false
  })

  const getPetsApi = useApi(petProfileService.getMyPets, {
    showErrorAlert: false
  })

  const getHealthRecordsApi = useApi(healthRecordService.getHealthRecords, {
    showErrorAlert: false
  })

  useEffect(() => {
    console.log('📡 Initial mount - Loading pets on component mount')
    getPetsApi.execute()
  }, [])

  const loadReminders = useCallback(() => {
    getRemindersApi.execute({})
  }, [])

  const loadHealthRecords = useCallback(() => {
    getHealthRecordsApi.execute({})
  }, [])

  const loadPets = useCallback(async () => {
    console.log('📡 Loading pets from API...')
    await getPetsApi.execute()
    await refreshPets()
  }, [])

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Pet Profile Page Focused - Reloading data')
      loadReminders()
      loadHealthRecords()
      loadPets()
    }, [loadReminders, loadHealthRecords, loadPets])
  )

  const reminders = getRemindersApi.data?.data?.reminders || []
  const recurringRules = getRemindersApi.data?.data?.recurringRules || []

  const safeReminders = Array.isArray(reminders) ? reminders : []

  const remindersWithRecurrence = safeReminders.map((reminder) => {
    const recurringRule = Array.isArray(recurringRules)
      ? recurringRules.find((rule: any) => rule.reminder_id === reminder.id)
      : null

    if (recurringRule) {
      return {
        ...reminder,
        recurrence: recurringRule
      }
    }

    return reminder
  })

  const pets = getPetsApi.data?.data || []

  // Debug: Log pet data to check if profile_image_url is being returned
  useEffect(() => {
    if (pets && pets.length > 0) {
      console.log(
        '🐕 Pets loaded from API:',
        pets.map((p: any) => ({
          id: p.id,
          name: p.pet_name,
          profile_image_url: p.profile_image_url
        }))
      )
    } else {
      console.log('⚠️ No pets in array - pets:', pets)
    }
  }, [pets])
  const displayPets =
    tabPets.length > 0
      ? tabPets
      : activeTab === 'active'
        ? pets.filter((p) => p.status !== 'DECEASED')
        : pets.filter((p) => p.status === 'DECEASED')
  const currentPet =
    displayPets.length > 0 ? displayPets[currentPetIndex] : null
  const healthRecords = getHealthRecordsApi.data?.data || []
  const isViewingDeceased = activeTab === 'past'

  const petReminders = currentPet
    ? _.filter(
        remindersWithRecurrence,
        (reminder) => reminder.petId === currentPet.id
      )
    : remindersWithRecurrence

  const upcomingReminders = _.filter(petReminders, (reminder) => {
    return reminder.reminderStatus === 'to_do'
  })
    .sort((a, b) => {
      const dateA = new Date(a.reminderDate).getTime()
      const dateB = new Date(b.reminderDate).getTime()
      return dateA - dateB
    })
    .slice(0, 5)

  const healthHistoryList = _.filter(healthRecords, (record) => {
    const isCategoryMatch = HEALTH_CATEGORIES.includes(record.categoryName)
    const isDone = record.reminderStatus === 'done'
    const isPetMatch = currentPet ? record.petId === currentPet.id : true
    return isCategoryMatch && isDone && isPetMatch
  }).sort((a, b) => {
    const getTimestamp = (dateStr: string, timeStr: string) => {
      const d = new Date(dateStr)
      if (timeStr) {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number)
        d.setHours(hours || 0, minutes || 0, seconds || 0, 0)
      }
      return d.getTime()
    }

    return (
      getTimestamp(b.reminderDate, b.reminderTime) -
      getTimestamp(a.reminderDate, a.reminderTime)
    )
  })

  // ------------------
  // HANDLERS
  // ------------------
  const handleReminderPress = (id: string) => {
    router.push({ pathname: '/(tabs)', params: { reminderId: id } })
  }

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0)
    }
  }).current

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current

  const handlePetSelect = (index: number) => {
    const pet = displayPets[index]
    if (pet) {
      setSelectedPetId(pet.id)
    }
  }

  const handleDeletePress = useCallback(() => {
    if (!currentPet) return

    setPetToDelete({
      id: currentPet.id,
      name: currentPet.pet_name
    })
    setShowDeleteModal(true)
  }, [currentPet])

  const handleDeleteConfirm = useCallback(async () => {
    if (!petToDelete) return

    setIsDeleting(true)
    try {
      // Always use soft delete API - backend handles everything
      await softDeletePet(petToDelete.id)
      Alert.alert(
        'สำเร็จ',
        `"${petToDelete.name}" ถูกย้ายไปยังเพิ่งลบล่าสุด\n\nสามารถกู้คืนได้ภายใน 30 วัน`
      )
      setShowDeleteModal(false)
      setPetToDelete(null)
    } catch (error: any) {
      console.error('Error deleting pet:', error)
      // Check if it's the last active pet error
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'ไม่สามารถลบสัตว์เลี้ยงได้'
      Alert.alert('เกิดข้อผิดพลาด', errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }, [petToDelete, softDeletePet])

  const handleEditPetFromSelector = useCallback(
    (petId: string) => {
      router.push(`/(tabs)/add_pet_form?petId=${petId}`)
    },
    [router]
  )

  const handleDeletePetFromSelector = useCallback(
    (petId: string) => {
      const pet = tabPets.find((p) => p.id === petId)
      if (!pet) return

      setPetToDelete({
        id: pet.id,
        name: pet.pet_name
      })
      setShowDeleteModal(true)
    },
    [tabPets]
  )

  const handleRestorePet = useCallback(
    async (petId: string) => {
      try {
        await restorePet(petId)
        Alert.alert('สำเร็จ', 'กู้คืนสัตว์เลี้ยงเรียบร้อยแล้ว')
      } catch (error) {
        console.error('Error restoring pet:', error)
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถกู้คืนสัตว์เลี้ยงได้')
      }
    },
    [restorePet]
  )

  const handlePermanentDeletePet = useCallback(
    async (petId: string) => {
      try {
        await hardDeletePet(petId)
      } catch (error) {
        console.error('Error permanently deleting pet:', error)
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบสัตว์เลี้ยงถาวรได้')
      }
    },
    [hardDeletePet]
  )

  const openDeceasedModalFromCard = useCallback(() => {
    if (!currentPet) return
    setPetToMarkDeceased({
      id: currentPet.id,
      name: currentPet.pet_name
    })
    setShowDeceasedModal(true)
  }, [currentPet])

  const handleConfirmMarkDeceased = useCallback(async () => {
    if (!petToMarkDeceased) return
    setIsMarkingDeceased(true)
    try {
      await markPetDeceased(petToMarkDeceased.id)
      Alert.alert(
        'สำเร็จ',
        `"${petToMarkDeceased.name}" ถูกย้ายไปยังสัตว์เลี้ยงในความทรงจำ`
      )
      setShowDeceasedModal(false)
      setPetToMarkDeceased(null)
      // Switch to past tab to show deceased pets
      setActiveTab('past')
      setPetToDelete(null)
    } catch (error) {
      console.error('Error marking pet as deceased:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถทำเครื่องหมายได้')
    } finally {
      setIsMarkingDeceased(false)
    }
  }, [petToMarkDeceased, markPetDeceased])

  // Can delete only if more than 1 active pet
  const canDeletePet = activePets.length > 1

  const renderReminderCard = ({ item }: { item: any }) => {
    return (
      <View style={styles.cardWrapper}>
        <ReminderCard
          reminder={item}
          onPress={handleReminderPress}
          canDelete={false}
          hideToggle={true}
        />
      </View>
    )
  }

  const renderDotIndicators = () => {
    if (upcomingReminders.length <= 1) return null

    return (
      <View style={styles.dotContainer}>
        {_.map(upcomingReminders, (_, index) => (
          <View
            key={index}
            style={[styles.dot, index === currentIndex && styles.activeDot]}
          />
        ))}
      </View>
    )
  }

  // ------------------
  // REDER
  // ------------------
  return (
    <View style={styles.container}>
      <Header title="โปรไฟล์สัตว์เลี้ยง" />

      <ScrollView>
        <View style={styles.section}>
          {/* Pet List */}
          {getPetsApi.loading ? (
            <LoadingComponent />
          ) : displayPets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {isViewingDeceased
                  ? 'ไม่มีสัตว์เลี้ยงในความทรงจำ'
                  : 'ไม่มีข้อมูลสัตว์เลี้ยง'}
              </Text>
            </View>
          ) : (
            <>
              {/* Selected Pet Info */}
              {currentPet && (
                <PetInfoCard
                  data={currentPet}
                  canDelete={!isViewingDeceased && canDeletePet}
                  onDelete={!isViewingDeceased ? handleDeletePress : undefined}
                  onMarkDeceased={
                    !isViewingDeceased ? openDeceasedModalFromCard : undefined
                  }
                  isDeceased={isViewingDeceased}
                />
              )}

              <View style={styles.sectionHeader}>
                <View style={styles.tabContainer}>
                  <Pressable
                    style={[
                      styles.tab,
                      activeTab === 'active' && styles.activeTab
                    ]}
                    onPress={() => setActiveTab('active')}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === 'active' && styles.activeTabText
                      ]}
                    >
                      สัตว์เลี้ยงของฉัน
                    </Text>
                    {activePets.length > 0 && (
                      <View
                        style={[
                          styles.tabBadge,
                          activeTab === 'active' && styles.activeTabBadge
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabBadgeText,
                            activeTab === 'active' && styles.activeTabBadgeText
                          ]}
                        >
                          {activePets.length}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.tab, activeTab === 'past' && styles.pastTab]}
                    onPress={() => setActiveTab('past')}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === 'past' && styles.pastTabText
                      ]}
                    >
                      🕊️ ในความทรงจำ
                    </Text>
                    {contextDeceasedPets.length > 0 && (
                      <View
                        style={[
                          styles.tabBadge,
                          activeTab === 'past' && styles.pastTabBadge
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabBadgeText,
                            activeTab === 'past' && styles.pastTabBadgeText
                          ]}
                        >
                          {contextDeceasedPets.length}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </View>
                {deletedPets.length > 0 && (
                  <Pressable
                    style={styles.recentlyDeletedButton}
                    onPress={() => setShowRecentlyDeletedModal(true)}
                  >
                    <Trash2 size={14} color="#BF1737" />
                    <View style={styles.deletedBadge}>
                      <Text style={styles.deletedBadgeText}>
                        {deletedPets.length}
                      </Text>
                    </View>
                  </Pressable>
                )}
              </View>
              <PetSelector
                pets={displayPets}
                selectedIndex={currentPetIndex}
                onSelect={handlePetSelect}
                maxPets={30}
                onEditPet={
                  !isViewingDeceased ? handleEditPetFromSelector : undefined
                }
                onDeletePet={
                  !isViewingDeceased ? handleDeletePetFromSelector : undefined
                }
                isViewingDeceased={isViewingDeceased}
              />
            </>
          )}
        </View>

        <SubMenuSection petId={currentPet?.id} />

        {/* Appointments Section & Health History - Only for active pets */}
        {!isViewingDeceased && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>กิจกรรมที่ใกล้เข้ามา</Text>

              {/* Reminder Content */}
              {getRemindersApi.loading ? (
                <LoadingComponent />
              ) : upcomingReminders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    ไม่มีกิจกรรมที่ใกล้เข้ามา
                  </Text>
                </View>
              ) : (
                <>
                  <FlatList
                    ref={flatListRef}
                    data={upcomingReminders}
                    renderItem={renderReminderCard}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_WIDTH + CARD_SPACING}
                    snapToAlignment="center"
                    decelerationRate="fast"
                    contentContainerStyle={styles.flatListContent}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                  />
                  {renderDotIndicators()}
                </>
              )}
            </View>
          </>
        )}

        <Text style={styles.versionText}>v.{version}</Text>
      </ScrollView>

      {/* Delete Pet Modal */}
      <DeletePetModal
        visible={showDeleteModal}
        petName={petToDelete?.name || ''}
        onClose={() => {
          setShowDeleteModal(false)
          setPetToDelete(null)
        }}
        onDelete={handleDeleteConfirm}
        isLoading={isDeleting}
      />

      {/* Deceased Pet Modal */}
      <DeceasedPetModal
        visible={showDeceasedModal}
        petName={petToMarkDeceased?.name || ''}
        onClose={() => {
          setShowDeceasedModal(false)
          setPetToMarkDeceased(null)
        }}
        onConfirm={handleConfirmMarkDeceased}
        isLoading={isMarkingDeceased}
      />

      {/* Recently Deleted Modal */}
      <RecentlyDeletedModal
        visible={showRecentlyDeletedModal}
        deletedPets={deletedPets}
        onClose={() => setShowRecentlyDeletedModal(false)}
        onRestore={handleRestorePet}
        onPermanentDelete={handlePermanentDeletePet}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F1'
  },
  section: {
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 16
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#225877',
    fontFamily: 'Prompt_500Medium',
    marginBottom: 4
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    marginRight: 8
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 4
  },
  activeTab: {
    backgroundColor: '#E8F4F8',
    borderWidth: 1,
    borderColor: '#5FA7D1'
  },
  pastTab: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#9ca3af'
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af'
  },
  activeTabText: {
    color: '#225877',
    fontFamily: 'Prompt_500Medium'
  },
  pastTabText: {
    color: '#4b5563',
    fontFamily: 'Prompt_500Medium'
  },
  tabBadge: {
    backgroundColor: '#d1d5db',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  activeTabBadge: {
    backgroundColor: '#5FA7D1'
  },
  pastTabBadge: {
    backgroundColor: '#9ca3af'
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: 'Prompt_600SemiBold',
    color: '#fff'
  },
  activeTabBadgeText: {
    color: '#fff'
  },
  pastTabBadgeText: {
    color: '#fff'
  },
  recentlyDeletedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  deletedBadge: {
    backgroundColor: '#BF1737',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  deletedBadgeText: {
    fontSize: 10,
    fontFamily: 'Prompt_600SemiBold',
    color: '#fff'
  },
  healthSectionContainer: {
    backgroundColor: '#FDF0DD',
    borderRadius: 16,
    padding: 16,
    paddingBottom: 8
  },
  healthListContainer: {
    maxHeight: 300 // Approx 3 items
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_SPACING / 2,
    paddingHorizontal: 16
  },
  flatListContent: {
    paddingHorizontal: 16
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    fontFamily: 'Prompt_400Regular',
    textAlign: 'center'
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D9D9D9'
  },
  activeDot: {
    backgroundColor: '#5FA7D1',
    width: 24
  },
  versionText: {
    color: '#C4C4C4',
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    textAlign: 'center',
    marginBottom: 4
  }
})
