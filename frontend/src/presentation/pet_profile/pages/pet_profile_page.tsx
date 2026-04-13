import { useFocusEffect, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import _ from 'lodash'
import { version } from '../../../../package.json'

import { usePets } from '@/src/context/PetContext'
import { healthRecordService } from '@/src/utils/api/services/health_record_service'
import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'

import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import {
  ArrowRightLeft,
  ScanQrCode,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react-native'
import Header from '../../components/header_component'
import LoadingComponent from '../../components/loading_component'
import DeceasedPetModal from '../components/deceased_pet_modal'
import UpcomingRemindersSection from '../components/upcoming_reminders_section'
import DeletePetModal from '../components/delete_pet_modal'
import PetInfoCard from '../components/pet_info_card'
import PetSelector from '../components/pet_selector'
import RecentlyDeletedModal from '../components/recently_deleted_modal'
import SubMenuSection from '../components/sub_menu_section'
import { colors } from '@/constants/design-system'
import { getDefaultAvatarBackgroundColorBySpecies } from '@/src/utils/pet_avatar'

const PET_AVATAR_COLORS_STORAGE_KEY = 'pet-avatar-colors'

export default function PetProfilePage() {
  // ------------------
  // CONST
  // ------------------
  const router = useRouter()

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
    markPetDeceased,
  } = usePets()

  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active')
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
  const [avatarColorsByPetId, setAvatarColorsByPetId] = useState<
    Record<string, string>
  >({})

  const tabPets = activeTab === 'active' ? activePets : contextDeceasedPets

  const selectedPetIndex = tabPets.findIndex((p) => p.id === selectedPetId)
  const currentPetIndex = selectedPetIndex >= 0 ? selectedPetIndex : 0

  // ------------------
  // FETCH
  // ------------------
  const getRemindersApi = useApi(reminderService.getReminders, {
    showErrorAlert: false,
  })

  const getPetsApi = useApi(petProfileService.getMyPets, {
    showErrorAlert: false,
  })

  const getHealthRecordsApi = useApi(healthRecordService.getHealthRecords, {
    showErrorAlert: false,
  })

  const loadStoredAvatarColors = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(PET_AVATAR_COLORS_STORAGE_KEY)
      if (stored) {
        setAvatarColorsByPetId(JSON.parse(stored))
      } else {
        setAvatarColorsByPetId({})
      }
    } catch (error) {
      console.error('Failed to load avatar colors from storage:', error)
    }
  }, [])

  useEffect(() => {
    getPetsApi.execute()
  }, [])

  useEffect(() => {
    loadStoredAvatarColors()
  }, [loadStoredAvatarColors])

  const loadReminders = useCallback(() => {
    getRemindersApi.execute({})
  }, [])

  const loadPets = useCallback(async () => {
    console.log('📡 Loading pets from API...')
    // await refreshPets()
    await getPetsApi.execute()
    await refreshPets()
  }, [])

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Pet Profile Page Focused - Reloading data')
      loadStoredAvatarColors()
      loadReminders()
      loadPets()
    }, [loadStoredAvatarColors, loadReminders, loadPets]),
  )

  useEffect(() => {
    if (activeTab === 'past') {
      loadPets()
    }
  }, [activeTab, loadPets])

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
        recurrence: recurringRule,
      }
    }

    return reminder
  })

  const pets = getPetsApi.data?.data || []

  const displayPets =
    tabPets.length > 0
      ? tabPets
      : activeTab === 'active'
        ? pets.filter((p) => p.status !== 'DECEASED')
        : pets.filter((p) => p.status === 'DECEASED')
  const hasAnyPets = contextPets.length > 0 || pets.length > 0
  const currentPet =
    displayPets.length > 0 ? displayPets[currentPetIndex] : null
  const isCaregiverPet = currentPet?.petRole === 'CAREGIVER'
  const isViewingDeceased = activeTab === 'past'

  const petReminders = currentPet
    ? _.filter(
        remindersWithRecurrence,
        (reminder) => reminder.petId === currentPet.id,
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

  // ------------------
  // HANDLERS
  // ------------------
  const handleReminderPress = (id: string) => {
    router.push({ pathname: '/(tabs)', params: { reminderId: id } })
  }

  const handlePetSelect = (index: number) => {
    const pet = displayPets[index]
    if (pet) {
      setSelectedPetId(pet.id)
    }
  }

  const getPetAvatarBackgroundColor = useCallback(
    (pet: { id: string; species?: string | null }) => {
      return (
        avatarColorsByPetId[pet.id] ||
        getDefaultAvatarBackgroundColorBySpecies(pet.species)
      )
    },
    [avatarColorsByPetId],
  )

  const handleAvatarBackgroundColorChange = useCallback(
    async (color: string) => {
      if (!currentPet) return

      try {
        const nextColors = {
          ...avatarColorsByPetId,
          [currentPet.id]: color,
        }

        setAvatarColorsByPetId(nextColors)
        await AsyncStorage.setItem(
          PET_AVATAR_COLORS_STORAGE_KEY,
          JSON.stringify(nextColors),
        )
      } catch (error) {
        console.error('Failed to save avatar color:', error)
      }
    },
    [avatarColorsByPetId, currentPet],
  )

  const handleDeletePress = useCallback(() => {
    if (!currentPet) return
    if (currentPet.petRole === 'CAREGIVER') {
      Alert.alert(
        'ไม่มีสิทธิ์',
        'เฉพาะเจ้าของสัตว์เลี้ยงเท่านั้นที่สามารถลบได้',
      )
      return
    }

    setPetToDelete({
      id: currentPet.id,
      name: currentPet.pet_name,
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
        `"${petToDelete.name}" ถูกย้ายไปยังเพิ่งลบล่าสุด\n\nสามารถกู้คืนได้ภายใน 30 วัน`,
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
      const targetPet = displayPets.find((pet) => pet.id === petId)
      if (targetPet?.petRole === 'CAREGIVER') {
        Alert.alert(
          'ไม่มีสิทธิ์',
          'เฉพาะเจ้าของสัตว์เลี้ยงเท่านั้นที่สามารถแก้ไขข้อมูลได้',
        )
        return
      }

      router.push(`/(tabs)/add_pet_form?petId=${petId}`)
    },
    [router, displayPets],
  )

  const handleDeletePetFromSelector = useCallback(
    (petId: string) => {
      const pet = tabPets.find((p) => p.id === petId)
      if (!pet) return
      if (pet.petRole === 'CAREGIVER') {
        Alert.alert(
          'ไม่มีสิทธิ์',
          'เฉพาะเจ้าของสัตว์เลี้ยงเท่านั้นที่สามารถลบได้',
        )
        return
      }

      setPetToDelete({
        id: pet.id,
        name: pet.pet_name,
      })
      setShowDeleteModal(true)
    },
    [tabPets],
  )

  const handleRestorePet = useCallback(
    async (petId: string) => {
      try {
        await restorePet(petId)
        Alert.alert('สำเร็จ', 'กู้คืนสัตว์เลี้ยงเรียบร้อยแล้ว')
      } catch (error) {
        console.error('Error restoring pet:', error)
        Alert.alert(
          'เกิดข้อผิดพลาด',
          'ไม่สามารถกู้คืนสัตว์เลี้ยงได้ เนื่องจากสัตว์เลี้ยงของคุณมีจำนวนสูงสุดแล้ว',
        )
      }
    },
    [restorePet],
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
    [hardDeletePet],
  )

  const openDeceasedModalFromCard = useCallback(() => {
    if (!currentPet) return
    if (currentPet.petRole === 'CAREGIVER') {
      Alert.alert(
        'ไม่มีสิทธิ์',
        'เฉพาะเจ้าของสัตว์เลี้ยงเท่านั้นที่สามารถทำเครื่องหมายการเสียชีวิตได้',
      )
      return
    }

    setPetToMarkDeceased({
      id: currentPet.id,
      name: currentPet.pet_name,
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
        `"${petToMarkDeceased.name}" ถูกย้ายไปยังสัตว์เลี้ยงในความทรงจำ`,
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

  // ------------------
  // REDER
  // ------------------
  return (
    <View style={styles.container}>
      <Header title='โปรไฟล์สัตว์เลี้ยง' />

      <ScrollView>
        <View style={styles.section}>
          {/* Pet List */}
          {getPetsApi.loading ? (
            <LoadingComponent />
          ) : !hasAnyPets ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ไม่มีข้อมูลสัตว์เลี้ยง</Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: '#fff',
                paddingHorizontal: 16,
                paddingBottom: 8,
              }}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.tabContainer}>
                  <Pressable
                    style={[
                      styles.tab,
                      activeTab === 'active' && styles.activeTab,
                    ]}
                    onPress={() => setActiveTab('active')}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === 'active' && styles.activeTabText,
                      ]}
                    >
                      สัตว์เลี้ยง
                    </Text>
                    {activePets.length > 0 && (
                      <View
                        style={[
                          styles.tabBadge,
                          activeTab === 'active' && styles.activeTabBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabBadgeText,
                            activeTab === 'active' && styles.activeTabBadgeText,
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
                        activeTab === 'past' && styles.pastTabText,
                      ]}
                    >
                      ในความทรงจำ
                    </Text>
                    {contextDeceasedPets.length > 0 && (
                      <View
                        style={[
                          styles.tabBadge,
                          activeTab === 'past' && styles.pastTabBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabBadgeText,
                            activeTab === 'past' && styles.pastTabBadgeText,
                          ]}
                        >
                          {contextDeceasedPets.length}
                        </Text>
                      </View>
                    )}
                  </Pressable>

                  {deletedPets.length > 0 && (
                    <Pressable
                      style={styles.recentlyDeletedButton}
                      onPress={() => setShowRecentlyDeletedModal(true)}
                    >
                      <Trash2 size={14} color='#BF1737' />
                      <View style={styles.deletedBadge}>
                        <Text style={styles.deletedBadgeText}>
                          {deletedPets.length}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                </View>

                <Pressable
                  onPress={() => {
                    router.push('/(tabs)/pet_sharing')
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <UserPlus size={20} color={colors.primary.light} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    router.push('/(tabs)/pet_transfer')
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ArrowRightLeft size={20} color={colors.primary.light} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    router.push('./scan_pet_share')
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ScanQrCode size={20} color={colors.primary.light} />
                </Pressable>
              </View>

              <PetSelector
                pets={displayPets}
                selectedIndex={currentPetIndex}
                onSelect={handlePetSelect}
                maxPets={30}
                avatarColorsByPetId={avatarColorsByPetId}
                onEditPet={
                  !isViewingDeceased ? handleEditPetFromSelector : undefined
                }
                onDeletePet={
                  !isViewingDeceased ? handleDeletePetFromSelector : undefined
                }
                isViewingDeceased={isViewingDeceased}
              />
              {isViewingDeceased && displayPets.length === 0 && (
                <View style={styles.memoryTabEmptySelectorContainer}>
                  <Text style={styles.memoryTabEmptySelectorText}>
                    ไม่มีข้อมูลสัตว์เลี้ยงในความทรงจำ
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Selected Pet Info */}
        {currentPet && (
          <View
            style={{
              backgroundColor: colors.background.secondary,
              paddingHorizontal: 20,
              paddingVertical: 16,
              gap: 2,
            }}
          >
            <PetInfoCard
              data={currentPet}
              avatarBackgroundColor={getPetAvatarBackgroundColor(currentPet)}
              onAvatarBackgroundColorChange={
                !isViewingDeceased && !isCaregiverPet
                  ? handleAvatarBackgroundColorChange
                  : undefined
              }
              canDelete={!isViewingDeceased && canDeletePet && !isCaregiverPet}
              onDelete={
                !isViewingDeceased && !isCaregiverPet
                  ? handleDeletePress
                  : undefined
              }
              onMarkDeceased={
                !isViewingDeceased && !isCaregiverPet
                  ? openDeceasedModalFromCard
                  : undefined
              }
              isDeceased={isViewingDeceased}
              readOnly={isCaregiverPet}
            />

            {displayPets.length > 0 && (
              <SubMenuSection
                petId={currentPet?.id}
                isViewingDeceased={isViewingDeceased}
              />
            )}
          </View>
        )}

        {/* Appointments Section & Health History - Only for active pets */}
        {!isViewingDeceased && (
          <UpcomingRemindersSection
            reminders={upcomingReminders}
            loading={getRemindersApi.loading}
            onReminderPress={handleReminderPress}
          />
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
    backgroundColor: colors.background.primary,
  },
  section: {
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    gap: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 4,
  },
  activeTab: {
    backgroundColor: '#E8F4F8',
    borderWidth: 1,
    borderColor: '#5FA7D1',
  },
  pastTab: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#9ca3af',
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
  },
  activeTabText: {
    color: '#225877',
    fontFamily: 'Prompt_500Medium',
  },
  pastTabText: {
    color: '#4b5563',
    fontFamily: 'Prompt_500Medium',
  },
  tabBadge: {
    backgroundColor: '#d1d5db',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  activeTabBadge: {
    backgroundColor: '#5FA7D1',
  },
  pastTabBadge: {
    backgroundColor: '#9ca3af',
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: 'Prompt_600SemiBold',
    color: '#fff',
  },
  activeTabBadgeText: {
    color: '#fff',
  },
  pastTabBadgeText: {
    color: '#fff',
  },
  recentlyDeletedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  deletedBadge: {
    backgroundColor: '#BF1737',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  deletedBadgeText: {
    fontSize: 10,
    fontFamily: 'Prompt_600SemiBold',
    color: '#fff',
  },
  healthSectionContainer: {
    backgroundColor: '#FDF0DD',
    borderRadius: 16,
    padding: 16,
    paddingBottom: 8,
  },
  healthListContainer: {
    maxHeight: 300, // Approx 3 items
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    fontFamily: 'Prompt_400Regular',
    textAlign: 'center',
  },
  memoryTabEmptySelectorContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  memoryTabEmptySelectorText: {
    fontSize: 14,
    color: '#9ca3af',
    fontFamily: 'Prompt_400Regular',
    textAlign: 'center',
    paddingVertical: 72,
  },
  versionText: {
    color: '#C4C4C4',
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    textAlign: 'center',
    marginVertical: 4,
  },
})
