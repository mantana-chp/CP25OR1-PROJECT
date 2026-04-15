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
