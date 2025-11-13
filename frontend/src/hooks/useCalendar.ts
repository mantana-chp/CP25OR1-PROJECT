import { IReminder } from '@/src/domain/reminder.domain'
import { useState } from 'react'
import { LayoutAnimation } from 'react-native'

interface DayInfo {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  hasEvents?: boolean
  reminderCount?: number
  date: Date
}

export const useCalendar = (reminders: IReminder[] = []) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const today = new Date()

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, 1).getDay()
  }

  const hasReminders = (date: Date) => {
    return reminders.some((reminder) => {
      const reminderDate = new Date(reminder.reminderDate)
      return (
        reminderDate.getDate() === date.getDate() &&
        reminderDate.getMonth() === date.getMonth() &&
        reminderDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const getReminderCount = (date: Date) => {
    return reminders.filter((reminder) => {
      const reminderDate = new Date(reminder.reminderDate)
      return (
        reminderDate.getDate() === date.getDate() &&
        reminderDate.getMonth() === date.getMonth() &&
        reminderDate.getFullYear() === date.getFullYear()
      )
    }).length
  }

  const renderCalendar = (): DayInfo[] => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days: DayInfo[] = []

    // Previous month's days
    const prevMonthDays = getDaysInMonth(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    )
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: false,
        date: new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - 1,
          prevMonthDays - i
        )
      })
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      )
      const isToday =
        day === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear()

      days.push({
        day,
        isCurrentMonth: true,
        isToday,
        hasEvents: hasReminders(date),
        reminderCount: getReminderCount(date),
        date
      })
    }

    return days
  }

  const getCurrentWeekDays = (): DayInfo[] => {
    const allDays = renderCalendar()
    const todayIndex = allDays.findIndex((d) => d.isToday)

    if (todayIndex === -1) {
      return allDays.slice(0, 7)
    }

    const rowIndex = Math.floor(todayIndex / 7)
    const startIndex = rowIndex * 7

    return allDays.slice(startIndex, startIndex + 7)
  }

  const previousMonth = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    )
  }

  const nextMonth = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    )
  }

  const goToToday = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCurrentDate(new Date())
  }

  const isCurrentMonth =
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear()

  return {
    currentDate,
    today,
    isCurrentMonth,
    renderCalendar,
    getCurrentWeekDays,
    previousMonth,
    nextMonth,
    goToToday
  }
}
