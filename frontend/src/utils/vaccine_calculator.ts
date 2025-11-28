/**
 * Vaccine utility helpers for date formatting and calculations
 * Backend will handle actual dose date calculations later
 */

import { IDose } from '@/src/domain/vaccine.domain'

/**
 * Format date string to Thai locale format
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatDateThai = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format date for display in schedule
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Formatted date string
 */
export const formatDoseDate = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Get auto-calculated text for dose
 * @param dateString - Date in YYYY-MM-DD format
 * @returns "Auto-calculated: DATE" text
 */
export const getAutoCalculatedText = (dateString: string): string => {
  return `Auto-calculated: ${formatDoseDate(dateString)}`
}

/**
 * Format time to 12-hour format with AM/PM
 * @param time - Time in HH:mm format
 * @returns Formatted time string
 */
export const formatTime12Hour = (time: string): string => {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`
}

/**
 * Check if a dose is completed based on its date
 * @param doseDate - Date of the dose
 * @returns true if dose date is today or in the past
 */
export const isDoseCompleted = (doseDate: string): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(doseDate + 'T00:00:00')
  return date <= today
}

/**
 * Calculate days between two dates
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Number of days between dates
 */
export const getDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format doses for display
 * @param doses - Array of doses
 * @returns Formatted doses data
 */
export const formatDosesForDisplay = (doses: IDose[]) => {
  return doses.map((dose) => ({
    ...dose,
    dateFormatted: formatDateThai(dose.date),
    timeFormatted: formatTime12Hour(dose.time),
    autocalculatedText: dose.autoCalculated
      ? getAutoCalculatedText(dose.date)
      : null,
  }))
}
