import { useRouter } from 'expo-router'
import _ from 'lodash'

import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'

import React, { useEffect, useRef, useState } from 'react'
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
import PetInfoCard from '../components/pet_info_card'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH - 64 // 32px padding on each side
const CARD_SPACING = 4

export default function PetProfilePage() {
  // ------------------
  // CONST
  // ------------------
  const router = useRouter()
  const flatListRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  // ------------------
  // FETCH
  // ------------------
  const getRemindersApi = useApi(reminderService.getReminders, {
    showErrorAlert: false
  })

  const getPetsApi = useApi(petProfileService.getMyPets, {
    showErrorAlert: false
  })

  useEffect(() => {
    getRemindersApi.execute({})
    getPetsApi.execute()
  }, [])

  const reminders = getRemindersApi.data?.data || []
  const pets = getPetsApi.data?.data || []
  const firstPet = pets.length > 0 ? pets[0] : null

  const upcomingReminders = _.filter(reminders, (reminder) => {
    return reminder.reminderStatus === 'to_do'
  })
    .sort((a, b) => {
      const dateA = new Date(a.reminderDate).getTime()
      const dateB = new Date(b.reminderDate).getTime()
      return dateA - dateB
    })
    .slice(0, 5) // Show only 5 upcoming reminders

  // ------------------
  // HANDLERS
  // ------------------
  const handleReminderPress = (id: string) => {
    router.push(`/(tabs)/reminder-details/${id}`)
  }

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0)
    }
  }).current

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current

  const renderReminderCard = ({ item }: { item: any }) => {
    return (
      <View style={styles.cardWrapper}>
        <ReminderCard
          reminder={item}
          onPress={handleReminderPress}
          canDelete={false}
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
    <ScrollView style={styles.container}>
      <Header title="โปรไฟล์สัตว์เลี้ยง" />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>สัตว์เลี้ยงของฉัน</Text>
        {getPetsApi.loading ? (
          <LoadingComponent />
        ) : firstPet ? (
          <PetInfoCard data={firstPet} />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ไม่มีข้อมูลสัตว์เลี้ยง</Text>
          </View>
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
            <Text style={styles.emptyText}>ไม่มีกิจกรรมที่กำลังจะมาถึง</Text>
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F1'
  },
  section: {
    paddingVertical: 20,
    paddingHorizontal: 16
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#225877',
    marginBottom: 16,
    fontFamily: 'Prompt_500Medium'
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
  }
})
