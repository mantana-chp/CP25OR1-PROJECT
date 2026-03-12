import _ from 'lodash'
import React, { useRef, useState } from 'react'
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native'

import LoadingComponent from '../../components/loading_component'
import ReminderCard from '../../reminder/components/reminder_card'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH - 64
const CARD_SPACING = 4

interface UpcomingRemindersSectionProps {
  reminders: any[]
  loading: boolean
  onReminderPress: (id: string) => void
}

export default function UpcomingRemindersSection({
  reminders,
  loading,
  onReminderPress
}: UpcomingRemindersSectionProps) {
  const flatListRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0)
    }
  }).current

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current

  const renderReminderCard = ({ item }: { item: any }) => (
    <View style={styles.cardWrapper}>
      <ReminderCard
        reminder={item}
        onPress={onReminderPress}
        canDelete={false}
        hideToggle={true}
      />
    </View>
  )

  const renderDotIndicators = () => {
    if (reminders.length <= 1) return null

    return (
      <View style={styles.dotContainer}>
        {_.map(reminders, (_, index) => (
          <View
            key={index}
            style={[styles.dot, index === currentIndex && styles.activeDot]}
          />
        ))}
      </View>
    )
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>กิจกรรมที่ใกล้เข้ามา</Text>

      {loading ? (
        <LoadingComponent />
      ) : reminders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>ไม่มีกิจกรรมที่ใกล้เข้ามา</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={reminders}
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
  )
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#225877',
    fontFamily: 'Prompt_500Medium',
    marginBottom: 4
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
