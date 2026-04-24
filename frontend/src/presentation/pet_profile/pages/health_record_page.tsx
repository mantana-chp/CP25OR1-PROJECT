import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography,
} from '@/constants/design-system'
import { useAuth } from '@/src/context/AuthContext'
import { usePets } from '@/src/context/PetContext'
import { CATEGORY_MAP, IReminder } from '@/src/domain/reminder.domain'
import { usePullToRefresh } from '@/src/hooks/usePullToRefresh'
import { healthRecordService } from '@/src/utils/api/services/health_record_service'
import {
  CreateHealthLogData,
  CreateHealthLogPayload,
  healthLogService,
  IHealthLog,
} from '@/src/utils/api/services/health_log_service'
import { WeightChartView } from '@/src/domain/weight-chart.domain'
import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import { useApi } from '@/src/utils/api/use_api'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { ClipboardList, Plus } from 'lucide-react-native'
import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Header from '../../components/header_component'
import Button from '../../components/button'
import PetInfoCard from '../components/pet_info_card'
import HealthRecordCard from '../components/health_record_card'
import HealthLogFormModal from '../components/health_log_form_modal'
import HealthRecordDetailModal from '../components/health_record_detail_modal'
import { HealthLogFormValues, HealthLogType } from '@/src/domain/pet.domain'
import HealthLogEntryCard from '../components/health_log_entry_card'
import WeightTrendChart from '@/src/presentation/pet_profile/components/weight_trend_chart'
import MedicalDocumentsPage from './medical_documents_page'

type HealthTypeFilter = 'ALL' | HealthLogType
type PageMode = 'records' | 'logs' | 'documents'

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
  { id: 'Deworming', label: 'พยาธิ/เห็บหมัด', color: '#F59E0B' },
]

const TYPE_LABEL: Record<HealthTypeFilter, string> = {
  ALL: 'ทั้งหมด',
  WEIGHT: 'น้ำหนัก',
  SYMPTOMS: 'อาการป่วย',
  BEHAVIOR: 'พฤติกรรม',
}

const parseWeightInput = (raw: string) => {
  const normalized = raw.trim().replace(',', '.')
  const parsed = Number(normalized)
  if (!normalized || Number.isNaN(parsed)) return null
  return parsed
}

const parseInitialPageMode = (value?: string): PageMode => {
  if (value === 'logs') return 'logs'
  if (value === 'documents') return 'documents'
  return 'records'
}

const isSpeciesWeightLimitMessage = (message?: string) => {
  return (
    typeof message === 'string' &&
    (message.includes('เกินค่าสูงสุดที่เป็นไปได้') ||
      message.includes('น้ำหนักที่ระบุ'))
  )
}

const showSpeciesWeightLimitAlert = (message?: string) => {
  Alert.alert(
    'ค่าน้ำหนักเกินช่วงที่เป็นไปได้',
    message || 'กรุณาตรวจสอบค่าน้ำหนักให้เหมาะสมกับชนิดสัตว์เลี้ยงอีกครั้ง',
  )
}

export default function HealthRecordPage() {
  const router = useRouter()
  const { petId, mode, subTab } = useLocalSearchParams<{
    petId: string
    mode?: string
    subTab?: string
  }>()
  const { userId } = useAuth()
  const { activePets, deceasedPets, refreshPets } = usePets()

  const [pageMode, setPageMode] = useState<PageMode>(() =>
    parseInitialPageMode(mode || subTab),
  )
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
    showErrorAlert: false,
  })
  const getHealthRecordByIdApi = useApi(
    healthRecordService.getHealthRecordById,
    {
      showErrorAlert: true,
    },
  )
  const getHealthLogsApi = useApi(healthLogService.getHealthLogs, {
    showErrorAlert: false,
  })
  const createHealthLogApi = useApi(healthLogService.createHealthLog, {
    showErrorAlert: false,
  })
  const updateHealthLogApi = useApi(healthLogService.updateHealthLog, {
    showErrorAlert: false,
  })
  const deleteHealthLogApi = useApi(healthLogService.deleteHealthLog, {
    showErrorAlert: true,
  })
  const getWeightChartApi = useApi(healthLogService.getWeightChart, {
    showErrorAlert: false,
  })

  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreLogs, setHasMoreLogs] = useState(true)
  const [editingLog, setEditingLog] = useState<IHealthLog | null>(null)
  const [selectedWeightChartView, setSelectedWeightChartView] =
    useState<WeightChartView>('month')
  const [petProfileWithTimestamp, setPetProfileWithTimestamp] = useState<{
    weight: string
    updated_at: string
  } | null>(null)

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
        offset,
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
    [petId, getHealthLogsApi.execute],
  )

  const loadHealthRecords = useCallback(async () => {
    await getHealthRecordsApi.execute({})
  }, [getHealthRecordsApi.execute])

  const loadPetProfileTimestamp = useCallback(async () => {
    if (!petId) return
    try {
      const response = await petProfileService.getPetProfileById(petId)
      if (response?.data) {
        setPetProfileWithTimestamp({
          weight: response.data.weight,
          updated_at: response.data.updated_at,
        })
      }
    } catch (error) {
      console.error('Failed to load pet profile timestamp:', error)
    }
  }, [petId])

  const loadWeightChart = useCallback(async () => {
    if (!petId) return

    await getWeightChartApi.execute(petId, {
      view: selectedWeightChartView,
    })
  }, [petId, selectedWeightChartView, getWeightChartApi.execute])

  const { isRefreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([
      loadHealthRecords(),
      loadHealthLogs(false),
      loadPetProfileTimestamp(),
      loadWeightChart(),
    ])
  })

  useFocusEffect(
    useCallback(() => {
      loadHealthRecords()
      loadHealthLogs(false)
      loadPetProfileTimestamp()
      loadWeightChart()
    }, [
      loadHealthRecords,
      loadHealthLogs,
      loadPetProfileTimestamp,
      loadWeightChart,
    ]),
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
    [allHealthRecords, petId],
  )

  const filteredRecords = useMemo(
    () => getFilteredRecords(selectedCategory),
    [getFilteredRecords, selectedCategory],
  )

  const rawLogs: IHealthLog[] = getHealthLogsApi.data?.data?.logs || []

  const parsedLogs = useMemo(() => {
    return [...rawLogs]
      .map((log) => {
        return {
          ...log,
          logType: log.category,
          cleanDescription: log.description,
        }
      })
      .sort(
        (a, b) =>
          new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
      )
  }, [rawLogs])

  const filteredLogs = useMemo(() => {
    if (selectedFilter === 'ALL') return parsedLogs
    return parsedLogs.filter((log) => log.logType === selectedFilter)
  }, [parsedLogs, selectedFilter])

  const counts = useMemo(() => {
    return {
      ALL: parsedLogs.length,
      WEIGHT: parsedLogs.filter((l) => l.logType === 'WEIGHT').length,
      SYMPTOMS: parsedLogs.filter((l) => l.logType === 'SYMPTOMS').length,
      BEHAVIOR: parsedLogs.filter((l) => l.logType === 'BEHAVIOR').length,
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

    const payload: CreateHealthLogPayload = {
      category: values.type,
      description: descriptionForPayload,
      weight:
        values.type === 'WEIGHT' ? (parsedWeight ?? undefined) : undefined,
      note: values.note || undefined,
      loggedAt: values.loggedAt || new Date().toISOString(),
    }

    const completeSaveFlow = async (createData?: CreateHealthLogData) => {
      setShowCreateModal(false)
      setEditingLog(null)
      await loadHealthLogs(false)
      refreshPets()

      if (createData?.suspiciousChange && createData.warningMessage) {
        Alert.alert('โปรดตรวจสอบค่าน้ำหนัก', createData.warningMessage)
      }
    }

    const executeCreate = async (upsert = false) => {
      return createHealthLogApi.execute(petId, {
        ...payload,
        ...(upsert ? { upsert: true } : {}),
      })
    }

    let result
    if (isEditing && editingLog) {
      result = await updateHealthLogApi.execute(petId, editingLog.id, payload)
    } else {
      result = await executeCreate(false)
    }

    if (result.error) {
      const createErrorDetails = (result.error.errors || {}) as {
        conflict?: boolean
      }
      const shouldConfirmWeightUpsert =
        !isEditing &&
        values.type === 'WEIGHT' &&
        result.error.statusCode === 409 &&
        createErrorDetails.conflict === true

      if (shouldConfirmWeightUpsert) {
        Alert.alert(
          'มีบันทึกน้ำหนักวันนี้แล้ว',
          'วันนี้บันทึกน้ำหนักไปแล้ว ต้องการอัปเดตเป็นค่าใหม่ไหม?',
          [
            {
              text: 'ยกเลิก',
              style: 'cancel',
            },
            {
              text: 'อัปเดตค่าใหม่',
              onPress: async () => {
                const upsertResult = await executeCreate(true)
                if (upsertResult.error) {
                  if (isSpeciesWeightLimitMessage(upsertResult.error.message)) {
                    showSpeciesWeightLimitAlert(upsertResult.error.message)
                    return
                  }

                  Alert.alert(
                    'ไม่สามารถบันทึกข้อมูล',
                    upsertResult.error.message,
                  )
                  return
                }

                await completeSaveFlow(upsertResult.data?.data)
              },
            },
          ],
        )
        return
      }

      if (isSpeciesWeightLimitMessage(result.error.message)) {
        showSpeciesWeightLimitAlert(result.error.message)
        return
      }

      Alert.alert('ไม่สามารถบันทึกข้อมูล', result.error.message)
      return
    }

    if (isEditing) {
      await completeSaveFlow(result.data?.data)
      return
    }

    await completeSaveFlow(result.data?.data)
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
          style: 'cancel',
        },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteHealthLogApi.execute(petId, log.id)
            if (result.error) return

            await loadHealthLogs(false) // Reload to reflect deletion
            await loadWeightChart()
            refreshPets()
          },
        },
      ],
    )
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingLog(null)
  }

  const handleOpenRecordDetail = async (record: IReminder) => {
    setSelectedRecord(null)
    setShowRecordDetailModal(true)

    const result = await getHealthRecordByIdApi.execute(record.id)
    if (result.data?.data) {
      setSelectedRecord(result.data.data)
    }
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

      <WeightTrendChart
        chartData={getWeightChartApi.data?.data}
        selectedView={selectedWeightChartView}
        onChangeView={setSelectedWeightChartView}
        loading={getWeightChartApi.loading}
        error={!!getWeightChartApi.error}
        onRetry={loadWeightChart}
        petProfileWeight={petProfileWithTimestamp}
      />

      <View style={styles.modeSwitchRow}>
        <TouchableOpacity
          style={[
            styles.modeChip,
            pageMode === 'records' && styles.modeChipActive,
          ]}
          onPress={() => setPageMode('records')}
        >
          <Text
            style={[
              styles.modeChipText,
              pageMode === 'records' && styles.modeChipTextActive,
            ]}
          >
            ประวัติสุขภาพ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeChip,
            pageMode === 'logs' && styles.modeChipActive,
          ]}
          onPress={() => setPageMode('logs')}
        >
          <Text
            style={[
              styles.modeChipText,
              pageMode === 'logs' && styles.modeChipTextActive,
            ]}
          >
            บันทึกสุขภาพ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeChip,
            pageMode === 'documents' && styles.modeChipActive,
          ]}
          onPress={() => setPageMode('documents')}
        >
          <Text
            style={[
              styles.modeChipText,
              pageMode === 'documents' && styles.modeChipTextActive,
            ]}
          >
            เอกสารสุขภาพ
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
                      borderColor: tab.color,
                    },
                  ]}
                  onPress={() => setSelectedCategory(tab.id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.filterChipLegacyText,
                      isActive && styles.filterChipLegacyTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.chipBadge,
                        isActive && {
                          backgroundColor: 'rgba(255,255,255,0.3)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipBadgeText,
                          isActive && { color: '#fff' },
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
                      active && styles.logFilterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipLegacyText,
                        active && styles.filterChipLegacyTextActive,
                      ]}
                    >
                      {TYPE_LABEL[filterKey]}
                    </Text>
                    {count > 0 && (
                      <View
                        style={[
                          styles.chipBadge,
                          active && styles.logChipBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipBadgeText,
                            active && styles.logChipBadgeTextActive,
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              },
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
          <ActivityIndicator size='large' color={colors.primary.light} />
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
        <ActivityIndicator size='large' color={colors.primary.light} />
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
          title='โหลดเพิ่มเติม'
          variant='ghost'
          onPress={() => loadHealthLogs(true)}
          loading={isLoadingMore}
          disabled={isLoadingMore}
        />
      </View>
    ) : pageMode === 'logs' && isLoadingMore ? (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size='small' color={colors.primary.light} />
      </View>
    ) : null

  if (!petId) {
    return (
      <View style={styles.container}>
        <Header
          title='บันทึกและติดตามสุขภาพ'
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
          title='บันทึกและติดตามสุขภาพ'
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
              title='โหลดใหม่'
              onPress={() => loadHealthLogs(false)}
              variant='ghost'
            />
          </View>
        </View>
      </View>
    )
  }

  if (
    pageMode === 'logs' &&
    getHealthLogsApi.error &&
    !getHealthLogsApi.loading
  ) {
    return (
      <View style={styles.container}>
        <Header
          title='บันทึกและติดตามสุขภาพ'
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
              title='ลองอีกครั้ง'
              onPress={() => loadHealthLogs(false)}
              variant='ghost'
            />
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header
        title='ประวัติและบันทึกสุขภาพ'
        goBack
        onBackPress={() => router.push('/(tabs)/pet_profile')}
      />

      {pageMode === 'documents' ? (
        <MedicalDocumentsPage
          petIdOverride={petId}
          isEmbedded
          headerContent={listHeader}
        />
      ) : pageMode === 'logs' ? (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isOwner = currentPet?.petRole === 'OWNER'
            const isCreator = item.createdByUserId === userId
            const canModify = !isDeceased && (isOwner || isCreator)

            return (
              <HealthLogEntryCard
                log={item}
                parsed={{
                  type: item.logType,
                  description: item.cleanDescription,
                }}
                canEdit={canModify}
                canDelete={canModify}
                onEdit={handleEditLog}
                onDelete={handleDeleteLog}
              />
            )
          }}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary.light]}
              tintColor={colors.primary.light}
            />
          }
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
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary.light]}
              tintColor={colors.primary.light}
            />
          }
        />
      )}

      {pageMode === 'logs' && (
        <View style={styles.fabContainer}>
          <Button
            title='เพิ่มบันทึกสุขภาพ'
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

      <HealthRecordDetailModal
        visible={showRecordDetailModal}
        reminder={selectedRecord}
        loading={getHealthRecordByIdApi.loading}
        onClose={handleCloseRecordDetail}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: 90,
    flexGrow: 1,
  },
  petCardWrapper: {
    marginTop: spacing[4],
    marginBottom: spacing[3],
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing[3],
  },
  modeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    padding: 4,
    marginBottom: spacing[3],
    gap: 4,
  },
  modeChip: {
    flex: 1,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  modeChipActive: {
    backgroundColor: colors.background.secondary,
  },
  modeChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.medium,
  },
  modeChipTextActive: {
    color: colors.primary.DEFAULT,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT,
  },
  totalBadge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  totalBadgeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.background.secondary,
  },
  filterScroll: {
    paddingBottom: spacing[2],
    gap: spacing[1],
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
    gap: 6,
  },
  filterChipLegacyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
  },
  filterChipLegacyTextActive: {
    fontFamily: typography.fontFamily.medium,
    color: colors.background.secondary,
  },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chipBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[600],
  },
  logFilterChipActive: {
    borderColor: colors.primary.light,
    backgroundColor: colors.primary.light,
  },
  logChipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  logChipBadgeTextActive: {
    color: '#fff',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[10],
  },
  emptyTitle: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.lg,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.normal,
  },
  fabContainer: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[8],
  },
  fabButton: {
    borderRadius: borderRadius.full,
    minHeight: 52,
    backgroundColor: colors.primary.light,
  },
  disabledHintText: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
  retryButtonWrap: {
    marginTop: spacing[3],
  },
  loadMoreContainer: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
})
