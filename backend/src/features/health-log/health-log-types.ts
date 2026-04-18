export type HealthLogCategory = 'WEIGHT' | 'SYMPTOMS' | 'BEHAVIOR';

export interface HealthLogDto {
  id: string
  petId: string
  createdByUserId: string
  createdBy: string
  category: HealthLogCategory
  description: string
  weight?: number
  note?: string
  loggedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateHealthLogInput {
  category: HealthLogCategory
  description: string
  weight?: number
  note?: string
  loggedAt?: Date
  upsert?: boolean
}

// ─── Create Result Types ─────────────────────────────────────────────────────

export type CreateHealthLogResult =
  | {
      kind: 'created'
      log: HealthLogDto
      statusCode: 200 | 201
      suspiciousChange?: boolean
      warningMessage?: string
    }
  | {
      kind: 'conflict'
    }

// ─── Weight Chart Types ───────────────────────────────────────────────────────

export type WeightChartView = 'week' | 'month' | 'year'

export interface WeightChartPoint {
  /** ISO date string "2026-04-15" (first day of the month for year-view aggregates) */
  date: string
  /** Thai-formatted display label for the chart axis */
  label: string
  /** Weight value — exact for week/month, averaged across the month for year */
  weight: number
  /** Log ID — present for week/month (1:1 log), absent for year aggregates */
  logId?: string
  /** Number of logs averaged into this point (always 1 for week/month) */
  logCount: number
}

export interface WeightChartData {
  view: WeightChartView
  /** ISO date string for the start of the queried range */
  rangeStart: string
  /** ISO date string for the end of the queried range */
  rangeEnd: string
  points: WeightChartPoint[]
  hasData: boolean
}

