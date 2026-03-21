import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { usePets } from '@/src/context/PetContext'
import { CATEGORY_MAP, IReminder } from '@/src/domain/reminder.domain'
import { healthRecordService } from '@/src/utils/api/services/health_record_service'
import {
  healthLogService,
  IHealthLog
} from '@/src/utils/api/services/health_log_service'
import { useApi } from '@/src/utils/api/use_api'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { ClipboardList, Plus, Scale } from 'lucide-react-native'
import React, { useCallback, useMemo, useState } from 'react'
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
import Button from '../../components/button'
import PetInfoCard from '../components/pet_info_card'
import HealthRecordCard from '../components/health_record_card'
import HealthLogEntryCard, {
  HealthLogType
} from '../components/health_log_entry_card'
import HealthLogFormModal from '../components/health_log_form_modal'

type HealthTypeFilter = 'ALL' | HealthLogType
type PageMode = 'records' | 'logs'

type CategoryFilter =
  | 'All'
  | 'Vaccination'
  | 'Checkup'
  | 'Medication'
  | 'Deworming'

const HEALTH_CATEGORIES = ['Vaccination', 'Checkup', 'Medication', 'Deworming']

const FILTER_TABS: { id: CategoryFilter; label: string; color: string }[] = [
  { id: 'All', label: 'ทั้งหมด', color: colors.primary.light },
  { id: 'Vaccination', label: 'วัคซีน', color: '#EC4899' },
  { id: 'Checkup', label: 'ตรวจสุขภาพ', color: '#3B82F6' },
  { id: 'Medication', label: 'ยา/อาหารเสริม', color: '#10B981' },
  { id: 'Deworming', label: 'พยาธิ/เห็บหมัด', color: '#F59E0B' }
]

const TYPE_LABEL: Record<HealthTypeFilter, string> = {
  ALL: 'ทั้งหมด',
  WEIGHT: 'น้ำหนัก',
  SYMPTOMS: 'อาการป่วย',
  BEHAVIOR: 'พฤติกรรม'
}

const TYPE_PREFIX_REGEX = /^\[(WEIGHT|SYMPTOMS|BEHAVIOR)\]\s*/i

const parseDescriptionType = (description: string) => {
  const text = description || ''
  const match = text.match(TYPE_PREFIX_REGEX)
  const parsedType = (match?.[1]?.toUpperCase() || 'SYMPTOMS') as HealthLogType

  return {
    type: parsedType,
    cleanDescription: text.replace(TYPE_PREFIX_REGEX, '').trim() || text
  }
}

const encodeDescriptionType = (type: HealthLogType, description: string) => {
  return `[${type}] ${description.trim()}`
}

const parseWeightInput = (raw: string) => {
  const normalized = raw.trim().replace(',', '.')
  const parsed = Number(normalized)
  if (!normalized || Number.isNaN(parsed)) return null
  return parsed
}

export default function HealthRecordPage() {
  const router = useRouter()
  const { petId } = useLocalSearchParams<{ petId: string }>()
  const { activePets, deceasedPets, refreshPets } = usePets()

  const [pageMode, setPageMode] = useState<PageMode>('records')
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>('All')
  const [selectedFilter, setSelectedFilter] = useState<HealthTypeFilter>('ALL')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const allPets = [...activePets, ...deceasedPets]
  const currentPet = petId ? allPets.find((p) => p.id === petId) || null : null
  const isDeceased = currentPet?.status === 'DECEASED'
  const canCreateLog = Boolean(petId && currentPet && !isDeceased)

  const getHealthRecordsApi = useApi(healthRecordService.getHealthRecords, {
    showErrorAlert: false
  })
  const getHealthLogsApi = useApi(healthLogService.getHealthLogs, {
    showErrorAlert: false
  })
  const createHealthLogApi = useApi(healthLogService.createHealthLog, {
    showErrorAlert: true
  })

  const loadHealthLogs = useCallback(() => {
    if (!petId) return
    getHealthLogsApi.execute(petId, { limit: 100, offset: 0 })
  }, [petId, getHealthLogsApi.execute])

  const loadHealthRecords = useCallback(() => {
    getHealthRecordsApi.execute({})
  }, [getHealthRecordsApi.execute])

  useFocusEffect(
    useCallback(() => {
      loadHealthRecords()
      loadHealthLogs()
    }, [loadHealthRecords, loadHealthLogs])
  )

  const allHealthRecords: IReminder[] = getHealthRecordsApi.data?.data || []

  const getFilteredRecords = useCallback(
    (category: CategoryFilter) =>
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
        }),
    [allHealthRecords, petId]
  )

  const filteredRecords = useMemo(
    () => getFilteredRecords(selectedCategory),
    [getFilteredRecords, selectedCategory]
  )

  const rawLogs: IHealthLog[] = getHealthLogsApi.data?.data?.logs || []

  const parsedLogs = useMemo(() => {
    return [...rawLogs]
      .map((log) => {
        const parsed = parseDescriptionType(log.description)
        return {
          ...log,
          logType: parsed.type,
          cleanDescription: parsed.cleanDescription
        }
      })
      .sort(
        (a, b) =>
          new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
      )
  }, [rawLogs])

  const filteredLogs = useMemo(() => {
    if (selectedFilter === 'ALL') return parsedLogs
    return parsedLogs.filter((log) => log.logType === selectedFilter)
  }, [parsedLogs, selectedFilter])

  const latestWeight = useMemo(() => {
    const firstWeighted = parsedLogs.find(
      (log) => typeof log.weight === 'number'
    )
    return firstWeighted?.weight
  }, [parsedLogs])

  const counts = useMemo(() => {
    return {
      ALL: parsedLogs.length,
      WEIGHT: parsedLogs.filter((l) => l.logType === 'WEIGHT').length,
      SYMPTOMS: parsedLogs.filter((l) => l.logType === 'SYMPTOMS').length,
      BEHAVIOR: parsedLogs.filter((l) => l.logType === 'BEHAVIOR').length
    }
  }, [parsedLogs])

  const handleCreateLog = async (values: {
    type: HealthLogType
    description: string
    weight: string
    note: string
  }) => {
    if (!petId || !canCreateLog || createHealthLogApi.loading) return

    const parsedWeight =
      values.type === 'WEIGHT' ? parseWeightInput(values.weight) : null
    if (values.type === 'WEIGHT' && parsedWeight === null) return

    const payload = {
      description: encodeDescriptionType(values.type, values.description),
      weight:
        values.type === 'WEIGHT' ? (parsedWeight ?? undefined) : undefined,
      note: values.note || undefined,
      loggedAt: new Date().toISOString()
    }

    const result = await createHealthLogApi.execute(petId, payload)
    if (result.error) return

    setShowCreateModal(false)
    loadHealthLogs()
    refreshPets()
  }

  const listHeader = (
    <>
      {currentPet && (
        <View style={styles.petCardWrapper}>
          <PetInfoCard data={currentPet} readOnly isDeceased={isDeceased} />
        </View>
      )}

      <View style={styles.modeSwitchRow}>
        <TouchableOpacity
          style={[
            styles.modeChip,
            pageMode === 'records' && styles.modeChipActive
          ]}
          onPress={() => setPageMode('records')}
        >
          <Text
            style={[
              styles.modeChipText,
              pageMode === 'records' && styles.modeChipTextActive
            ]}
          >
            ประวัติสุขภาพเดิม
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeChip,
            pageMode === 'logs' && styles.modeChipActive
          ]}
          onPress={() => setPageMode('logs')}
        >
          <Text
            style={[
              styles.modeChipText,
              pageMode === 'logs' && styles.modeChipTextActive
            ]}
          >
            บันทึกสุขภาพใหม่
          </Text>
        </TouchableOpacity>
      </View>

      {pageMode === 'records' && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ประวัติสุขภาพ</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>
                {filteredRecords.length} รายการ
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {FILTER_TABS.map((tab) => {
              const isActive = selectedCategory === tab.id
              const count = getFilteredRecords(tab.id).length

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.filterChipLegacy,
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
                      styles.filterChipLegacyText,
                      isActive && styles.filterChipLegacyTextActive
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
      )}

      {pageMode === 'logs' && (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>บันทึกทั้งหมด</Text>
              <Text style={styles.summaryValue}>{counts.ALL}</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.weightHeaderRow}>
                <Scale size={iconSizes.sm} color={colors.info.dark} />
                <Text style={styles.summaryLabel}>น้ำหนักล่าสุด</Text>
              </View>
              <Text style={styles.summaryValue}>
                {typeof latestWeight === 'number'
                  ? `${latestWeight.toFixed(2)} กก.`
                  : '-'}
              </Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            {(Object.keys(TYPE_LABEL) as HealthTypeFilter[]).map(
              (filterKey) => {
                const active = selectedFilter === filterKey
                return (
                  <TouchableOpacity
                    key={filterKey}
                    onPress={() => setSelectedFilter(filterKey)}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive
                      ]}
                    >
                      {TYPE_LABEL[filterKey]} ({counts[filterKey]})
                    </Text>
                  </TouchableOpacity>
                )
              }
            )}
          </View>
        </>
      )}
    </>
  )

  const listEmpty =
    pageMode === 'records' ? (
      getHealthRecordsApi.loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary.light} />
          <Text style={styles.emptySubtitle}>กำลังโหลดประวัติสุขภาพ...</Text>
        </View>
      ) : (
        <View style={styles.centerState}>
          <ClipboardList size={56} color={colors.gray[300]} strokeWidth={1.6} />
          <Text style={styles.emptyTitle}>ยังไม่มีประวัติสุขภาพ</Text>
          <Text style={styles.emptySubtitle}>
            {selectedCategory === 'All'
              ? 'เมื่อทำเครื่องหมายว่าเสร็จสิ้นแล้ว รายการจากระบบเตือนความจำจะปรากฏที่นี่'
              : `ยังไม่มีประวัติ${CATEGORY_MAP[selectedCategory]?.label || selectedCategory}`}
          </Text>
        </View>
      )
    ) : getHealthLogsApi.loading ? (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary.light} />
        <Text style={styles.emptySubtitle}>กำลังโหลดข้อมูลสุขภาพ...</Text>
      </View>
    ) : (
      <View style={styles.centerState}>
        <ClipboardList size={56} color={colors.gray[300]} strokeWidth={1.6} />
        <Text style={styles.emptyTitle}>ยังไม่มีบันทึกสุขภาพ</Text>
        <Text style={styles.emptySubtitle}>
          เริ่มบันทึกน้ำหนัก อาการ หรือพฤติกรรม
          เพื่อดูแนวโน้มสุขภาพของสัตว์เลี้ยง
        </Text>
      </View>
    )

  if (!petId) {
    return (
      <View style={styles.container}>
        <Header
          title="บันทึกและติดตามสุขภาพ"
          goBack
          onBackPress={() => router.push('/(tabs)/pet_profile')}
        />
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>ไม่พบสัตว์เลี้ยง</Text>
          <Text style={styles.emptySubtitle}>
            กรุณาเลือกสัตว์เลี้ยงจากหน้าโปรไฟล์อีกครั้ง
          </Text>
        </View>
      </View>
    )
  }

  if (!currentPet) {
    return (
      <View style={styles.container}>
        <Header
          title="บันทึกและติดตามสุขภาพ"
          goBack
          onBackPress={() => router.push('/(tabs)/pet_profile')}
        />
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>ไม่พบข้อมูลสัตว์เลี้ยง</Text>
          <Text style={styles.emptySubtitle}>
            ข้อมูลอาจถูกอัปเดต กรุณาลองกลับและเลือกใหม่
          </Text>
          <View style={styles.retryButtonWrap}>
            <Button title="โหลดใหม่" onPress={loadHealthLogs} variant="ghost" />
          </View>
        </View>
      </View>
    )
  }

  if (getHealthLogsApi.error && !getHealthLogsApi.loading) {
    if (pageMode !== 'logs') {
      return (
        <View style={styles.container}>
          <Header
            title="บันทึกและติดตามสุขภาพ"
            goBack
            onBackPress={() => router.push('/(tabs)/pet_profile')}
          />
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>โหลดข้อมูลไม่สำเร็จ</Text>
            <Text style={styles.emptySubtitle}>
              กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง
            </Text>
            <View style={styles.retryButtonWrap}>
              <Button
                title="ลองอีกครั้ง"
                onPress={loadHealthRecords}
                variant="ghost"
              />
            </View>
          </View>
        </View>
      )
    }

    return (
      <View style={styles.container}>
        <Header
          title="บันทึกและติดตามสุขภาพ"
          goBack
          onBackPress={() => router.push('/(tabs)/pet_profile')}
        />
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>โหลดข้อมูลไม่สำเร็จ</Text>
          <Text style={styles.emptySubtitle}>
            กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง
          </Text>
          <View style={styles.retryButtonWrap}>
            <Button
              title="ลองอีกครั้ง"
              onPress={pageMode === 'logs' ? loadHealthLogs : loadHealthRecords}
              variant="ghost"
            />
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header
        title="บันทึกและติดตามสุขภาพ"
        goBack
        onBackPress={() => router.push('/(tabs)/pet_profile')}
      />

      {pageMode === 'logs' ? (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HealthLogEntryCard
              log={item}
              parsed={{
                type: item.logType,
                description: item.cleanDescription
              }}
            />
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <HealthRecordCard reminder={item} />}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {pageMode === 'logs' && (
        <View style={styles.fabContainer}>
          <Button
            title="เพิ่มบันทึกสุขภาพ"
            onPress={() => setShowCreateModal(true)}
            icon={
              <Plus size={iconSizes.md} color={colors.background.secondary} />
            }
            disabled={!canCreateLog}
            style={styles.fabButton}
          />
          {!canCreateLog && (
            <Text style={styles.disabledHintText}>
              {isDeceased
                ? 'สัตว์เลี้ยงที่อยู่ในความทรงจำไม่สามารถเพิ่มบันทึกสุขภาพใหม่ได้'
                : 'ไม่สามารถเพิ่มบันทึกสุขภาพได้ในขณะนี้'}
            </Text>
          )}
        </View>
      )}

      <HealthLogFormModal
        visible={showCreateModal}
        loading={createHealthLogApi.loading}
        initialWeight={currentPet?.weight || ''}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateLog}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: 110,
    flexGrow: 1
  },
  petCardWrapper: {
    marginTop: spacing[4],
    marginBottom: spacing[3],
    backgroundColor: colors.background.secondary
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3]
  },
  modeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    padding: 4,
    marginBottom: spacing[3],
    gap: 4
  },
  modeChip: {
    flex: 1,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8
  },
  modeChipActive: {
    backgroundColor: colors.background.secondary
  },
  modeChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.medium
  },
  modeChipTextActive: {
    color: colors.primary.DEFAULT
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2]
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT
  },
  totalBadge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20
  },
  totalBadgeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.background.secondary
  },
  filterScroll: {
    paddingBottom: spacing[2],
    gap: spacing[1]
  },
  filterChipLegacy: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
    gap: 6
  },
  filterChipLegacyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600]
  },
  filterChipLegacyTextActive: {
    fontFamily: typography.fontFamily.medium,
    color: colors.background.secondary
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
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[600]
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[3],
    gap: spacing[1]
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular
  },
  summaryValue: {
    fontSize: typography.fontSize.xl,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold
  },
  weightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1]
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2]
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.secondary
  },
  filterChipActive: {
    borderColor: colors.primary.light,
    backgroundColor: colors.primary.light
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.medium
  },
  filterChipTextActive: {
    color: colors.background.secondary
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[10]
  },
  emptyTitle: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.lg,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center'
  },
  emptySubtitle: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.normal
  },
  fabContainer: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[4]
  },
  fabButton: {
    borderRadius: borderRadius.full,
    minHeight: 52,
    backgroundColor: colors.primary.light
  },
  disabledHintText: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center'
  },
  retryButtonWrap: {
    marginTop: spacing[3]
  }
})
