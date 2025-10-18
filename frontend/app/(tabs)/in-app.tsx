import { getReminders, saveReminders } from '@/context/ReminderStorage'
import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Button, Modal, PaperProvider, Portal, Text } from 'react-native-paper'

export default function App() {
  const [modalVisible, setModalVisible] = useState(false)
  const [todaysReminders, setTodaysReminders] = useState([])

  useEffect(() => {
    const checkReminders = async () => {
      const allReminders = await getReminders()
      const today = new Date().toDateString()

      const dueReminders = allReminders.filter(
        (reminder: { date: string }) =>
          new Date(reminder.date).toDateString() === today
      )

      if (dueReminders.length > 0) {
        setTodaysReminders(dueReminders)
        setModalVisible(true)
      }
    }

    // This function sets up a test reminder for today.
    // You would replace this with real user reminder creation.
    const setupInitialReminder = async () => {
      await saveReminders([
        { id: 1, text: 'Take out the trash', date: new Date().toISOString() },
        { id: 2, text: 'Call a friend', date: '2025-10-18T10:00:00Z' }
      ])
      checkReminders()
    }

    setupInitialReminder()
  }, [])

  const hideModal = () => setModalVisible(false)

  // Define a style for the modal content, replacing the manual StyleSheet.
  const containerStyle = {
    backgroundColor: 'white',
    padding: 30,
    margin: 20,
    borderRadius: 10
  }

  return (
    <PaperProvider>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text variant="headlineMedium">Reminder App</Text>
        <Text variant="bodyMedium">
          Your daily tasks and reminders will appear here.
        </Text>

        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={hideModal}
            contentContainerStyle={containerStyle}
          >
            <Text variant="titleLarge" style={{ marginBottom: 15 }}>
              You have reminders today!
            </Text>
            {todaysReminders.map((item) => (
              <Text
                key={(item as any).id}
                variant="bodyMedium"
                style={{ marginBottom: 10 }}
              >
                • {(item as any).text}
              </Text>
            ))}
            <Button
              mode="contained"
              onPress={hideModal}
              style={{ marginTop: 20 }}
            >
              Got it!
            </Button>
          </Modal>
        </Portal>
      </View>
    </PaperProvider>
  )
}
