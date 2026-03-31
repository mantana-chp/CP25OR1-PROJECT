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
  initialWeight?: number | string | null
  petCreatedAt?: string | null
}

export default function WeightTrendChart({
  logs,
  initialWeight,
  petCreatedAt
}: WeightTrendChartProps) {
  const [chartWidth, setChartWidth] = useState(0)

  const latestWeight = useMemo(() => {
    const firstWeighted = logs.find((log) => typeof log.weight === 'number')
    if (firstWeighted?.weight) {
      return firstWeighted.weight
    }
    
    // If no logs with weight, use initial weight from pet profile
    const parsedInitialWeight = typeof initialWeight === 'string' 
      ? parseFloat(initialWeight) 
      : typeof initialWeight === 'number' 
        ? initialWeight 
        : null
    
    return parsedInitialWeight && Number.isFinite(parsedInitialWeight) 
      ? parsedInitialWeight 
      : undefined
  }, [logs, initialWeight])

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

    // Add initial weight from pet profile if available and no logs exist
    const parsedInitialWeight = typeof initialWeight === 'string' 
      ? parseFloat(initialWeight) 
      : typeof initialWeight === 'number' 
        ? initialWeight 
        : null

    if (parsedInitialWeight && Number.isFinite(parsedInitialWeight) && petCreatedAt) {
      const createdDate = new Date(petCreatedAt)
      const hasInitialPoint = points.some(p => 
        Math.abs(p.ts - createdDate.getTime()) < 1000 * 60 * 60 * 24 // Within 1 day
      )
      
      if (!hasInitialPoint) {
        points.push({
          id: 'initial-weight',
          value: parsedInitialWeight,
          label: `${createdDate.getDate()}/${createdDate.getMonth() + 1}`,
          ts: createdDate.getTime()
        })
      }
    }

    const sorted = points.sort((a, b) => a.ts - b.ts)
    return sorted.slice(-8)
  }, [logs, initialWeight, petCreatedAt])

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
