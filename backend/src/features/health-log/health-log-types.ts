export interface HealthLogDto {
  id: string
  petId: string
  createdByUserId: string
  createdBy: string
  description: string
  weight?: number
  note?: string
  loggedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateHealthLogInput {
  description: string
  weight?: number
  note?: string
  loggedAt?: Date
}
