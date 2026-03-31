import {
  borderRadius,
  colors,
  spacing,
  typography
} from '@/constants/design-system'
import { MoveDown, MoveUp, Scale } from 'lucide-react-native'
import React, { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LineChart } from 'react-native-chart-kit'

export interface WeightTrendLog {
  id: string
  weight?: number | null
  loggedAt: string
}

interface WeightTrendChartProps {
  logs: WeightTrendLog[]
  petProfileWeight?: { weight: string; updated_at: string } | null
}

export default function WeightTrendChart({
  logs,
  petProfileWeight
}: WeightTrendChartProps) {
  const [chartWidth, setChartWidth] = useState(0)

  const latestWeight = useMemo(() => {
    // Prioritize pet profile weight as the current/latest value
    if (petProfileWeight?.weight) {
      const parsed = parseFloat(petProfileWeight.weight)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
    
    // Fall back to most recent health log weight
    const firstWeighted = logs.find((log) => typeof log.weight === 'number')
    return firstWeighted?.weight
  }, [logs, petProfileWeight])

  const weightSeries = useMemo(() => {
    const points = logs
      .filter(
        (log) => typeof log.weight === 'number' && Number.isFinite(log.weight)
      )
      .map((log) => {
        const date = new Date(log.loggedAt)
        return {
          id: log.id,
          value: Number(log.weight),
          label: `${date.getDate()}/${date.getMonth() + 1}`,
          ts: date.getTime()
        }
      })

    // Add pet profile weight as the current data point
    if (petProfileWeight?.weight && petProfileWeight?.updated_at) {
      const parsedWeight = parseFloat(petProfileWeight.weight)
      if (Number.isFinite(parsedWeight)) {
        const updatedDate = new Date(petProfileWeight.updated_at)
        
        // Check if there's already a recent point (within 1 hour) to avoid duplicates
        const hasRecentPoint = points.some(p => 
          Math.abs(p.ts - updatedDate.getTime()) < 1000 * 60 * 60
        )
        
        if (!hasRecentPoint) {
          points.push({
            id: 'profile-weight',
            value: parsedWeight,
            label: `${updatedDate.getDate()}/${updatedDate.getMonth() + 1}`,
            ts: updatedDate.getTime()
          })
        }
      }
    }

    const sorted = points.sort((a, b) => a.ts - b.ts)
    return sorted.slice(-8)
  }, [logs, petProfileWeight])

  const chartMeta = useMemo(() => {
    if (!weightSeries.length) {
      return {
        min: 0,
        max: 0,
        latest: null as number | null,
        prev: null as number | null
      }
    }

    const values = weightSeries.map((p) => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const latest = weightSeries[weightSeries.length - 1]?.value ?? null
    const prev =
      weightSeries.length > 1
        ? (weightSeries[weightSeries.length - 2]?.value ?? null)
        : null

    return { min, max, latest, prev }
  }, [weightSeries])

  const chartData = useMemo(
    () => ({
      labels: weightSeries.map((p) => p.label),
      datasets: [{ data: weightSeries.map((p) => p.value) }]
    }),
    [weightSeries]
  )

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

        {weightSeries.length > 0 ? (
          <>
            <View
              style={styles.lineChartWrap}
              onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
            >
              {chartWidth > 0 && (
                <LineChart
                  data={chartData}
                  width={chartWidth}
                  height={180}
                  bezier
                  withShadow={false}
                  withOuterLines={false}
                  withInnerLines
                  withVerticalLabels={false}
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
          <Text style={styles.emptySubtitle}>
            ยังไม่มีข้อมูลน้ำหนักสำหรับแสดงกราฟ
          </Text>
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
  lineChartWrap: {
    marginTop: spacing[2],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.background.secondary
  },
  lineChart: {
    borderRadius: borderRadius.md
  },
  weightStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[1]
  },
  weightStatText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular
  },
  emptySubtitle: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.normal
  }
})
