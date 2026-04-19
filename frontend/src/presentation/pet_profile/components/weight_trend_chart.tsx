import {
  borderRadius,
  colors,
  spacing,
  typography
} from '@/constants/design-system'
import {
  WeightChartData,
  WeightChartView
} from '@/src/domain/weight-chart.domain'
import { MoveDown, MoveUp, Scale } from 'lucide-react-native'
import React, { useMemo, useState } from 'react'
import { LineChart } from 'react-native-chart-kit'
import { Pressable, StyleSheet, Text, View } from 'react-native'

interface WeightTrendChartProps {
  chartData?: WeightChartData | null
  selectedView: WeightChartView
  onChangeView: (view: WeightChartView) => void
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  petProfileWeight?: { weight: string; updated_at: string } | null
}

const VIEW_OPTIONS: { id: WeightChartView; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' }
]

const AGGREGATION_STRATEGY_LABEL: Record<WeightChartView, string> = {
  week: 'แสดงค่าน้ำหนักรายวันตามที่บันทึก',
  month: 'แสดงค่าน้ำหนักรายวันตามที่บันทึก',
  year: 'แสดงค่าเฉลี่ยรายเดือนจากข้อมูลที่มี'
}

const getEmptyMessage = (view: WeightChartView) => {
  if (view === 'week') {
    return 'ไม่พบข้อมูลน้ำหนักในช่วง 7 วันที่เลือก'
  }

  if (view === 'month') {
    return 'ไม่พบข้อมูลน้ำหนักในช่วง 30 วันที่เลือก'
  }

  return 'ไม่พบข้อมูลน้ำหนักรายเดือนในช่วง 12 เดือนล่าสุด'
}

const formatRangeDate = (isoDate?: string) => {
  if (!isoDate) return '-'
  const date = new Date(isoDate)
  if (!Number.isFinite(date.getTime())) return isoDate
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

export default function WeightTrendChart({
  chartData,
  selectedView,
  onChangeView,
  loading = false,
  error = false,
  onRetry,
  petProfileWeight
}: WeightTrendChartProps) {
  const [chartWidth, setChartWidth] = useState(0)

  const normalizedPoints = useMemo(() => {
    const rawPoints = chartData?.points || []

    return rawPoints
      .filter((point) => Number.isFinite(point.weight) && point.label)
      .map((point) => {
        const ts = new Date(point.date).getTime()
        return {
          ...point,
          ts: Number.isFinite(ts) ? ts : 0
        }
      })
      .sort((a, b) => a.ts - b.ts)
  }, [chartData])

  const latestWeight = useMemo(() => {
    const latestPoint = normalizedPoints[normalizedPoints.length - 1]
    if (latestPoint) {
      return latestPoint.weight
    }

    if (petProfileWeight?.weight) {
      const parsed = parseFloat(petProfileWeight.weight)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }

    return undefined
  }, [normalizedPoints, petProfileWeight])

  const chartMeta = useMemo(() => {
    if (!normalizedPoints.length) {
      return {
        min: 0,
        max: 0,
        latest: null as number | null,
        prev: null as number | null
      }
    }

    const values = normalizedPoints.map((p) => p.weight)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const latest = normalizedPoints[normalizedPoints.length - 1]?.weight ?? null
    const prev =
      normalizedPoints.length > 1
        ? (normalizedPoints[normalizedPoints.length - 2]?.weight ?? null)
        : null

    return { min, max, latest, prev }
  }, [normalizedPoints])

  const chartDataSet = useMemo(() => {
    const labels = normalizedPoints.map((p) => p.label)

    if (selectedView === 'month' && labels.length > 10) {
      const step = labels.length > 20 ? 4 : 3
      return {
        labels: labels.map((label, index) =>
          index % step === 0 || index === labels.length - 1 ? label : ''
        ),
        datasets: [{ data: normalizedPoints.map((p) => p.weight) }]
      }
    }

    return {
      labels,
      datasets: [{ data: normalizedPoints.map((p) => p.weight) }]
    }
  }, [normalizedPoints, selectedView])

  const hasData = normalizedPoints.length > 0
  const rangeLabel = useMemo(() => {
    return `${formatRangeDate(chartData?.rangeStart)} - ${formatRangeDate(chartData?.rangeEnd)}`
  }, [chartData?.rangeStart, chartData?.rangeEnd])

  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryCard}>
        <View style={styles.weightHeaderRow}>
          <Text style={styles.summaryLabel}>แนวโน้มน้ำหนัก</Text>
          <Text style={styles.summaryValueSmall}>
            {typeof latestWeight === 'number'
              ? `${latestWeight.toFixed(2)} กก.`
              : '-'}
          </Text>
        </View>

        <View style={styles.viewSwitchRow}>
          {VIEW_OPTIONS.map((option) => {
            const isActive = option.id === selectedView
            return (
              <Pressable
                key={option.id}
                style={[styles.viewChip, isActive && styles.viewChipActive]}
                onPress={() => onChangeView(option.id)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.viewChipText,
                    isActive && styles.viewChipTextActive
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Text style={styles.strategyText}>
          {AGGREGATION_STRATEGY_LABEL[selectedView]}
        </Text>
        <Text style={styles.rangeText}>ช่วงวันที่: {rangeLabel}</Text>
        <Text style={styles.scopeText}>แสดงข้อมูลเฉพาะสัตว์เลี้ยงที่เลือก</Text>

        {loading ? (
          <View style={styles.emptyStateWrap}>
            <Text style={styles.emptyTitle}>กำลังโหลดกราฟน้ำหนัก...</Text>
            <Text style={styles.emptySubtitle}>กรุณารอสักครู่</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyStateWrap}>
            <Text style={styles.emptyTitle}>โหลดข้อมูลกราฟไม่สำเร็จ</Text>
            <Text style={styles.emptySubtitle}>
              กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่
            </Text>
            {onRetry ? (
              <Pressable style={styles.retryButton} onPress={onRetry}>
                <Text style={styles.retryButtonText}>ลองอีกครั้ง</Text>
              </Pressable>
            ) : null}
          </View>
        ) : hasData ? (
          <>
            <View
              style={styles.lineChartWrap}
              onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
            >
              {chartWidth > 0 && (
                <LineChart
                  data={chartDataSet}
                  width={chartWidth}
                  height={200}
                  bezier
                  withShadow={false}
                  withOuterLines={false}
                  withInnerLines
                  withHorizontalLabels
                  withVerticalLabels
                  xLabelsOffset={6}
                  yLabelsOffset={8}
                  verticalLabelRotation={0}
                  fromZero={false}
                  chartConfig={{
                    backgroundGradientFrom: colors.background.secondary,
                    backgroundGradientTo: colors.background.secondary,
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(15, 163, 177, ${opacity})`,
                    labelColor: (opacity = 1) =>
                      `rgba(107, 114, 128, ${opacity})`,
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: colors.primary.light,
                      fill: colors.background.secondary
                    },
                    propsForBackgroundLines: {
                      stroke: colors.gray[200],
                      strokeDasharray: ''
                    }
                  }}
                  style={styles.lineChart}
                />
              )}
            </View>

            <View style={styles.weightStatsRow}>
              <Text style={styles.weightStatText}>
                <MoveDown size={12} color={colors.danger.DEFAULT} /> ต่ำสุด:{' '}
                {chartMeta.min.toFixed(2)} กก.
              </Text>
              <Text style={styles.weightStatText}>
                <MoveUp size={12} color={colors.success.DEFAULT} /> สูงสุด:{' '}
                {chartMeta.max.toFixed(2)} กก.
              </Text>
              <Text style={styles.weightStatText}>
                <Scale size={12} color={colors.info.DEFAULT} /> ความต่างล่าสุด:{' '}
                {chartMeta.latest !== null && chartMeta.prev !== null
                  ? `${(chartMeta.latest - chartMeta.prev).toFixed(2)} กก.`
                  : '-'}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyStateWrap}>
            <Text style={styles.emptyTitle}>ไม่มีข้อมูลสำหรับแสดงกราฟ</Text>
            <Text style={styles.emptySubtitle}>
              {getEmptyMessage(selectedView)}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3]
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
  summaryValueSmall: {
    fontSize: typography.fontSize.base,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.medium
  },
  weightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[1]
  },
  viewSwitchRow: {
    marginTop: spacing[2],
    flexDirection: 'row',
    gap: spacing[1],
    flexWrap: 'wrap'
  },
  viewChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary
  },
  viewChipActive: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.light
  },
  viewChipText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.medium
  },
  viewChipTextActive: {
    color: colors.background.secondary
  },
  strategyText: {
    marginTop: spacing[1],
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular
  },
  scopeText: {
    marginTop: spacing[1],
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular
  },
  rangeText: {
    marginTop: spacing[1],
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.medium
  },
  lineChartWrap: {
    marginTop: spacing[2],
    borderRadius: borderRadius.md,
    overflow: 'visible',
    backgroundColor: colors.background.secondary
  },
  lineChart: {
    borderRadius: borderRadius.md
  },
  weightStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[1],
    gap: spacing[2],
    flexWrap: 'wrap'
  },
  weightStatText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular
  },
  emptyStateWrap: {
    marginTop: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.gray[50]
  },
  emptyTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center'
  },
  emptySubtitle: {
    marginTop: spacing[1],
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.normal
  },
  retryButton: {
    marginTop: spacing[2],
    alignSelf: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary.light,
    backgroundColor: colors.background.secondary
  },
  retryButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary.DEFAULT
  }
})
