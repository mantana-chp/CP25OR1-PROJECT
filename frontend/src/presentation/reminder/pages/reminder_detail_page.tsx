import React from 'react'
import {
  Platform,
  StatusBar,
  Pressable,
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { fetchReminderById } from '../../../data/reminder.api'

// --- Helper Functions ---
const formatDate = (date: Date) => {
  return date.toLocaleDateString('th-TH')
}

const formatTime = (time: Date) => {
  return time.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Parses a "HH:MM:SS" string into a Date object
const parseApiTime = (timeString: string): Date => {
  if (!timeString) return new Date()

  const [hours, minutes, seconds] = timeString.split(':').map(Number)
  const date = new Date()
  date.setHours(hours || 0, minutes || 0, seconds || 0)
  return date
}
// ---

export default function ReminderDetailPage() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  // --- State for form fields ---
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [date, setDate] = React.useState(new Date())
  const [time, setTime] = React.useState(new Date())

  // --- State for loading/error ---
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch data when the component mounts
  React.useEffect(() => {
    // ===================================================================
    // --- HOW TO SWITCH BETWEEN MOCK AND PRODUCTION ---
    // ===================================================================

    // [ 1. MOCK VERSION (Currently Active) ]
    // This uses hardcoded ID as a fallback
    const idToFetch = 'dccccb95-eeb5-434f-9e42-7e8dc0a2c993'

    // [ 2. INTEGRATED VERSION ]
    // When you merge, comment out or remove the line idToFetch ABOVE
    // and uncomment the line idToFetch BELOW.
    //
    // const idToFetch = id;

    // ===================================================================

    if (!idToFetch) {
      setError('No reminder ID provided.')
      setIsLoading(false)
      return
    }

    const loadReminder = async () => {
      try {
        setIsLoading(true)
        const reminderData = await fetchReminderById(idToFetch)

        if (reminderData) {
          // Populate the form state with fetched data
          setTitle(reminderData.reminderName)
          setDescription(reminderData.description)
          setDate(new Date(reminderData.reminderDate))
          setTime(parseApiTime(reminderData.reminderTime))
        } else {
          setError('ไม่พบการแจ้งเตือนนี้')
        }
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล')
      } finally {
        setIsLoading(false)
      }
    }

    loadReminder()
  }, [id])

  // Show loading spinner
  if (isLoading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    )
  }

  // Show error message
  if (error) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.addText}>Go Back</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={styles.safeArea}>
        {/* --- Custom Header --- */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.headerBackIcon}>‹</Text>
          </Pressable>
          {/* Changed Title */}
          <Text style={styles.headerTitle}>รายละเอียดการเตือนความจำ</Text>
        </View>

        {/* --- Form Card (Read-only) --- */}
        <View style={styles.formCard}>
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>หัวข้อ</Text>
            <TextInput
              style={[styles.input, styles.readOnlyInput]}
              value={title}
              editable={false}
            />
          </View>

          {/* Date / Time Row */}
          <View style={styles.row}>
            {/* Date Button */}
            <Pressable
              style={[styles.pickerButton, styles.readOnlyInput]}
              disabled={true}
            >
              <Text style={styles.pickerButtonText}>{formatDate(date)}</Text>
              <Text style={styles.pickerButtonIcon}>📅</Text>
            </Pressable>

            {/* Time Button */}
            <Pressable
              style={[styles.pickerButton, styles.readOnlyInput]}
              disabled={true}
            >
              <Text style={styles.pickerButtonText}>{formatTime(time)}</Text>
              <Text style={styles.pickerButtonIcon}>⏰</Text>
            </Pressable>
          </View>

          {/* Details Input */}
          <View>
            <TextInput
              style={[styles.input, styles.textarea, styles.readOnlyInput]}
              value={description}
              multiline
              numberOfLines={4}
              editable={false}
            />
          </View>
        </View>
        {/* --- Form Card --- */}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#5FA7D1',
    padding: 16,
    alignItems: 'center',
    gap: 16,
  },
  headerBackIcon: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Prompt_700Bold',
  },
  formCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  inputGroup: {
    marginBottom: 16,
    gap: 4,
  },
  inputLabel: {
    color: '#6b7280',
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    minHeight: 48,
    color: '#111827',
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    height: 48,
  },
  pickerButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#111827',
  },
  pickerButtonIcon: {
    fontSize: 20,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    fontFamily: 'Prompt_700Bold',
    marginBottom: 20,
  },
  addText: {
    color: '#0284c7',
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
  },
  readOnlyInput: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
})
