import { colors } from '@/constants/design-system'
import { usePets } from '@/src/context/PetContext'
import { CATEGORY_MAP, IReminder } from '@/src/domain/reminder.domain'
import { healthRecordService } from '@/src/utils/api/services/health_record_service'
import { useApi } from '@/src/utils/api/use_api'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { ClipboardList } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import Header from '../../components/header_component'
import HealthRecordCard from '../components/health_record_card'
import PetInfoCard from '../components/pet_info_card'

// Only medical/health categories
const HEALTH_CATEGORIES = ['Vaccination', 'Checkup', 'Medication', 'Deworming']

type CategoryFilter =
  | 'All'
  | 'Vaccination'
  | 'Checkup'
  | 'Medication'
  | 'Deworming'

const FILTER_TABS: { id: CategoryFilter; label: string; color: string }[] = [
  { id: 'All', label: 'ทั้งหมด', color: colors.primary.DEFAULT },
  { id: 'Vaccination', label: 'วัคซีน', color: '#EC4899' },
  { id: 'Checkup', label: 'ตรวจสุขภาพ', color: '#3B82F6' },
  { id: 'Medication', label: 'ยา/อาหารเสริม', color: '#10B981' },
  { id: 'Deworming', label: 'พยาธิ/เห็บหมัด', color: '#F59E0B' }
]

export default function HealthRecordPage() {
  const router = useRouter()
  const { petId } = useLocalSearchParams<{ petId: string }>()
  const { activePets, deceasedPets } = usePets()
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>('All')

  const allPets = [...activePets, ...deceasedPets]
  const currentPet = petId ? allPets.find((p) => p.id === petId) || null : null
  const isDeceased = currentPet?.status === 'DECEASED'

  const getHealthRecordsApi = useApi(healthRecordService.getHealthRecords, {
    showErrorAlert: false
  })

  useFocusEffect(
    useCallback(() => {
      getHealthRecordsApi.execute({})
    }, [])
  )

  const allHealthRecords: IReminder[] = getHealthRecordsApi.data?.data || []

  const getFilteredRecords = (category: CategoryFilter) =>
    allHealthRecords
      .filter((record) => {
        const isCategoryMatch =
          category === 'All'
            ? HEALTH_CATEGORIES.includes(record.categoryName)
            : record.categoryName === category
        const isDone = record.reminderStatus === 'done'
        const isPetMatch = petId ? record.petId === petId : true
        return isCategoryMatch && isDone && isPetMatch
      })
      .sort((a, b) => {
        const ts = (d: string, t: string) => {
          const date = new Date(d)
          if (t) {
            const [h, m, s] = t.split(':').map(Number)
            date.setHours(h || 0, m || 0, s || 0, 0)
          }
          return date.getTime()
        }
        return (
          ts(b.reminderDate, b.reminderTime) -
          ts(a.reminderDate, a.reminderTime)
        )
      })

  const filteredRecords = getFilteredRecords(selectedCategory)

  const getCategoryCount = (cat: CategoryFilter) =>
    getFilteredRecords(cat).length

  const ListHeader = (
    <>
      {/* Pet Info Card */}
      {currentPet && (
        <View style={styles.petCardWrapper}>
          <PetInfoCard data={currentPet} readOnly isDeceased={isDeceased} />
        </View>
      )}

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>บันทึกสุขภาพ</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>
            {getCategoryCount(selectedCategory)} รายการ
          </Text>
        </View>
      </View>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = selectedCategory === tab.id
          const count = getCategoryCount(tab.id)
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.filterChip,
                isActive && {
                  backgroundColor: tab.color,
                  borderColor: tab.color
                }
              ]}
              onPress={() => setSelectedCategory(tab.id)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive
                ]}
              >
                {tab.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.chipBadge,
                    isActive && { backgroundColor: 'rgba(255,255,255,0.3)' }
                  ]}
                >
                  <Text
                    style={[
                      styles.chipBadgeText,
                      isActive && { color: '#fff' }
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </>
  )

  const EmptyState = getHealthRecordsApi.loading ? (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color={colors.primary.light} />
      <Text style={styles.centerText}>กำลังโหลด...</Text>
    </View>
  ) : (
    <View style={styles.centerState}>
      <ClipboardList size={52} color={colors.gray[300]} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>ยังไม่มีประวัติสุขภาพ</Text>
      <Text style={styles.emptySubtitle}>
        {selectedCategory === 'All'
          ? 'เมื่อทำเครื่องหมายว่าเสร็จสิ้นแล้ว\nรายการจะปรากฏที่นี่'
          : `ยังไม่มีประวัติ${CATEGORY_MAP[selectedCategory]?.label || selectedCategory}`}
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <Header
        title="ประวัติสุขภาพ"
        goBack
        onBackPress={() => router.push('/(tabs)/pet_profile')}
      />

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <HealthRecordCard reminder={item} />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary
  },
  listContent: {
    paddingBottom: 32,
    flexGrow: 1
  },
  petCardWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Prompt_700Bold',
    color: colors.primary.DEFAULT
  },
  totalBadge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20
  },
  totalBadgeText: {
    fontSize: 12,
    fontFamily: 'Prompt_500Medium',
    color: '#fff'
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.primary,
    gap: 6
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: colors.gray[600]
  },
  filterChipTextActive: {
    fontFamily: 'Prompt_500Medium',
    color: '#fff'
  },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  chipBadgeText: {
    fontSize: 10,
    fontFamily: 'Prompt_500Medium',
    color: colors.gray[600]
  },
  cardWrapper: {
    marginHorizontal: 16
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32
  },
  centerText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: colors.primary.DEFAULT
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: colors.gray[500]
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: colors.gray[400],
    textAlign: 'center',
    lineHeight: 20
  }
})
