import {
  reminder_status,
  category_name,
  RecurrenceFrequency,
  RecurrenceStatusEnum,
} from '../../generated/prisma/client'

export interface Reminder {
  id: string
  userId: string
  petId: string
  categoryName: category_name
  reminderName?: string
  description?: string
  reminderDate: Date
  reminderTime?: string
  reminderStatus: reminder_status
  statusDoneAt?: Date
  createdAt: Date
  updatedAt: Date
  children?: Reminder[]
}

export interface ReminderWithPetName extends Reminder {
  pet_name: string
  children?: Reminder[] // Children should be of the base Reminder type
}

export interface RecurrenceRule {
  id: string
  // --- Series Metadata (NEW) ---
  reminderName?: string
  description?: string
  categoryName?: category_name
  recurrenceStatus: RecurrenceStatusEnum
  // --- Recurrence Pattern ---
  frequency: RecurrenceFrequency
  interval: number
  daysOfWeek?: number
  dayOfMonth?: number
  reminderTime?: string
  // --- End Condition ---
  endDate?: Date
  endAfterOccurrences?: number
  createdAt: Date
  updatedAt: Date
}

export interface FullReminderDto extends ReminderWithPetName {
  recurrenceId?: string
  recurrence?: RecurrenceRule
  canDelete?: boolean
  created_by?: string
}
