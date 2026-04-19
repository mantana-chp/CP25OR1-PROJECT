export type WeightChartView = 'week' | 'month' | 'year'

export interface WeightChartPoint {
  date: string
  label: string
  weight: number
  logId?: string
  logCount: number
}

export interface WeightChartData {
  view: WeightChartView
  rangeStart: string
  rangeEnd: string
  hasData: boolean
  points: WeightChartPoint[]
}

export interface WeightChartStatus {
  code: string
  description: string
}

export interface WeightChartResponse {
  status: WeightChartStatus
  data: WeightChartData
}
