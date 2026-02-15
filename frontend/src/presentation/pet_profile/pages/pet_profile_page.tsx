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
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'

import Header from '../../components/header_component'
import LoadingComponent from '../../components/loading_component'
import ReminderCard from '../../reminder/components/reminder_card'
import HealthRecordCard from '../components/health_record_card'
import PetInfoCard from '../components/pet_info_card'
import PetSelector from '../components/pet_selector'


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
    selectedPetId,
    setSelectedPetId,
    refreshPets
  } = usePets()

  // Find the selected pet index
  const selectedPetIndex = contextPets.findIndex((p) => p.id === selectedPetId)
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
    getPetsApi.execute()
  }, [])

  const loadReminders = useCallback(() => {
    getRemindersApi.execute({})
  }, [])

  const loadHealthRecords = useCallback(() => {
    getHealthRecordsApi.execute({})
  }, [])

  const loadPets = useCallback(async () => {
    await getPetsApi.execute()
    await refreshPets()
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadReminders()
      loadHealthRecords()
      loadPets()
    }, [loadReminders, loadHealthRecords, loadPets])
  )

  const reminders = getRemindersApi.data?.data?.reminders || []
  const recurringRules = getRemindersApi.data?.data?.recurringRules || []
  const pets = getPetsApi.data?.data || []

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

  const displayPets = contextPets.length > 0 ? contextPets : pets
  const currentPet =
    displayPets.length > 0 ? displayPets[currentPetIndex] : null
  const healthRecords = getHealthRecordsApi.data?.data || []

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
          <Text style={styles.sectionTitle}>สัตว์เลี้ยงของฉัน</Text>
          {getPetsApi.loading ? (
            <LoadingComponent />
          ) : displayPets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ไม่มีข้อมูลสัตว์เลี้ยง</Text>
            </View>
          ) : (
            <>
              <PetSelector
                pets={displayPets}
                selectedIndex={currentPetIndex}
                onSelect={handlePetSelect}
                maxPets={11}
              />

              {/* Selected Pet Info */}
              {currentPet && <PetInfoCard data={currentPet} />}
            </>
          )}
        </View>

        {/* Appointments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>กิจกรรมที่ใกล้เข้ามา</Text>

          {/* Reminder Content */}
          {getRemindersApi.loading ? (
            <LoadingComponent />
          ) : upcomingReminders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ไม่มีกิจกรรมที่ใกล้เข้ามา</Text>
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

        {/* Health History Section*/}
        <View style={styles.section}>
          <View style={styles.healthSectionContainer}>
            <Text style={styles.sectionTitle}>ประวัติสุขภาพ</Text>

            {getHealthRecordsApi.loading ? (
              <LoadingComponent />
            ) : healthHistoryList.length > 0 ? (
              <View style={styles.healthListContainer}>
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={true}
                >
                  {_.map(healthHistoryList, (item) => (
                    <HealthRecordCard key={item.id} reminder={item} />
                  ))}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>ไม่มีประวัติสุขภาพ</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.versionText}>v.{version}</Text>
      </ScrollView>
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#225877',
    marginBottom: 8,
    fontFamily: 'Prompt_500Medium'
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
