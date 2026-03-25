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
  Alert,
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
import HealthLogFormModal from '../components/health_log_form_modal'
import HealthRecordDetailModal from '../components/health_record_detail_modal'
import { HealthLogFormValues, HealthLogType } from '@/src/domain/pet.domain'
import HealthLogEntryCard from '../components/health_log_entry_card'

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
  const [showRecordDetailModal, setShowRecordDetailModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<IReminder | null>(null)

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
  const updateHealthLogApi = useApi(healthLogService.updateHealthLog, {
    showErrorAlert: true
  })
  const deleteHealthLogApi = useApi(healthLogService.deleteHealthLog, {
    showErrorAlert: true
  })

  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreLogs, setHasMoreLogs] = useState(true)
  const [editingLog, setEditingLog] = useState<IHealthLog | null>(null)

  const loadHealthLogs = useCallback(
    async (append = false) => {
      if (!petId) return

      const currentLogs = getHealthLogsApi.data?.data?.logs || []
      const offset = append ? currentLogs.length : 0

      if (append) {
        setIsLoadingMore(true)
      }

      const result = await getHealthLogsApi.execute(petId, {
        limit: 50,
        offset
      })

      if (append) {
        setIsLoadingMore(false)
      }

      if (result.data?.data) {
        const { logs, total } = result.data.data
        const newTotal = append ? currentLogs.length + logs.length : logs.length
        setHasMoreLogs(newTotal < total)
      }
    },
    [petId, getHealthLogsApi.execute]
  )

  const loadHealthRecords = useCallback(() => {
    getHealthRecordsApi.execute({})
  }, [getHealthRecordsApi.execute])

  useFocusEffect(
    useCallback(() => {
      loadHealthRecords()
      loadHealthLogs(false)
    }, [loadHealthRecords, loadHealthLogs])
  )

  const allHealthRecords: IReminder[] = getHealthRecordsApi.data?.data || []

  // console.log(allHealthRecords)

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
        return {
          ...log,
          logType: log.category,
          cleanDescription: log.description
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

  const handleCreateLog = async (values: HealthLogFormValues) => {
    if (!petId || !canCreateLog) return

    const isEditing = Boolean(editingLog)
    const apiToUse = isEditing ? updateHealthLogApi : createHealthLogApi

    if (apiToUse.loading) return

    const safeWeight = String(values.weight ?? '')
    const parsedWeight =
      values.type === 'WEIGHT' ? parseWeightInput(safeWeight) : null
    if (values.type === 'WEIGHT' && parsedWeight === null) return

    const normalizedDescription = String(values.description ?? '').trim()
    const descriptionForPayload =
      values.type === 'WEIGHT' && !normalizedDescription
        ? 'บันทึกน้ำหนัก'
        : normalizedDescription

    const payload = {
      category: values.type,
      description: descriptionForPayload,
      weight:
        values.type === 'WEIGHT' ? (parsedWeight ?? undefined) : undefined,
      note: values.note || undefined,
      loggedAt: values.loggedAt || new Date().toISOString()
    }

    let result
    if (isEditing && editingLog) {
      result = await updateHealthLogApi.execute(petId, editingLog.id, payload)
    } else {
      result = await createHealthLogApi.execute(petId, payload)
    }

    if (result.error) return

    setShowCreateModal(false)
    setEditingLog(null)
    await loadHealthLogs(false) // Reload from start to show updated log
    refreshPets()
  }

  const handleEditLog = (log: IHealthLog) => {
    setEditingLog(log)
    setShowCreateModal(true)
  }

  const handleDeleteLog = (log: IHealthLog) => {
    if (!petId || deleteHealthLogApi.loading) return

    Alert.alert(
      'ลบบันทึกสุขภาพ',
      'คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel'
        },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteHealthLogApi.execute(petId, log.id)
            if (result.error) return

            await loadHealthLogs(false) // Reload to reflect deletion
            refreshPets()
          }
        }
      ]
    )
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingLog(null)
  }

  const handleOpenRecordDetail = (record: IReminder) => {
    setSelectedRecord(record)
    setShowRecordDetailModal(true)
  }

  const handleCloseRecordDetail = () => {
    setShowRecordDetailModal(false)
    setSelectedRecord(null)
  }

  const listHeader = (
    <>
      {currentPet && (
        <View style={styles.petCardWrapper}>
          <PetInfoCard data={currentPet} readOnly isDeceased={isDeceased} />
        </View>
      )}

      {/* <View style={styles.summaryRow}>
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
      </View> */}

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
            ประวัติสุขภาพ
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
            บันทึกสุขภาพ
          </Text>
        </TouchableOpacity>
      </View>

      {pageMode === 'records' && (
        <>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {(Object.keys(TYPE_LABEL) as HealthTypeFilter[]).map(
              (filterKey) => {
                const active = selectedFilter === filterKey
                const count = counts[filterKey]
                return (
                  <TouchableOpacity
                    key={filterKey}
                    onPress={() => setSelectedFilter(filterKey)}
                    style={[
                      styles.filterChipLegacy,
                      active && styles.logFilterChipActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipLegacyText,
                        active && styles.filterChipLegacyTextActive
                      ]}
                    >
                      {TYPE_LABEL[filterKey]}
                    </Text>
                    {count > 0 && (
                      <View
                        style={[
                          styles.chipBadge,
                          active && styles.logChipBadgeActive
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipBadgeText,
                            active && styles.logChipBadgeTextActive
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              }
            )}
          </ScrollView>
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

  const listFooter =
    pageMode === 'logs' && hasMoreLogs && !getHealthLogsApi.loading ? (
      <View style={styles.loadMoreContainer}>
        <Button
          title="โหลดเพิ่มเติม"
          variant="ghost"
          onPress={() => loadHealthLogs(true)}
          loading={isLoadingMore}
          disabled={isLoadingMore}
        />
      </View>
    ) : pageMode === 'logs' && isLoadingMore ? (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color={colors.primary.light} />
      </View>
    ) : null

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
            <Button
              title="โหลดใหม่"
              onPress={() => loadHealthLogs(false)}
              variant="ghost"
            />
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
              onPress={
                pageMode === 'logs'
                  ? () => loadHealthLogs(false)
                  : loadHealthRecords
              }
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
        title="ประวัติและบันทึกสุขภาพ"
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
              canEdit={!isDeceased}
              canDelete={!isDeceased}
              onEdit={handleEditLog}
              onDelete={handleDeleteLog}
            />
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HealthRecordCard
              reminder={item}
              onPress={() => handleOpenRecordDetail(item)}
            />
          )}
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
        loading={createHealthLogApi.loading || updateHealthLogApi.loading}
        initialWeight={String(currentPet?.weight ?? '')}
        editingLog={editingLog}
        onClose={handleCloseModal}
        onSubmit={handleCreateLog}
      />

      {selectedRecord && (
        <HealthRecordDetailModal
          visible={showRecordDetailModal}
          reminder={selectedRecord}
          onClose={handleCloseRecordDetail}
        />
      )}
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
  logFilterChipActive: {
    borderColor: colors.primary.light,
    backgroundColor: colors.primary.light
  },
  logChipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  logChipBadgeTextActive: {
    color: '#fff'
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
  },
  loadMoreContainer: {
    paddingVertical: spacing[4],
    alignItems: 'center'
  }
})
