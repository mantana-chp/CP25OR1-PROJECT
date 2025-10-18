import AsyncStorage from '@react-native-async-storage/async-storage'

const REMINDER_KEY = 'reminder_data'

export const saveReminders = async (reminders: any[]) => {
  try {
    const jsonReminders = JSON.stringify(reminders)
    await AsyncStorage.setItem(REMINDER_KEY, jsonReminders)
  } catch (e) {
    console.error('Error saving reminders', e)
  }
}

export const getReminders = async () => {
  try {
    const jsonReminders = await AsyncStorage.getItem(REMINDER_KEY)
    return jsonReminders != null ? JSON.parse(jsonReminders) : []
  } catch (e) {
    console.error('Error retrieving reminders', e)
    return []
  }
}
