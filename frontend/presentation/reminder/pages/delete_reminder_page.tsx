import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog'
import { Box } from '@/components/ui/box'
import { Button, ButtonGroup, ButtonText } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { HStack } from '@/components/ui/hstack'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { ThemedView } from '@/components/themed-view'
import React, { useState } from 'react'
import { FlatList, Platform, Pressable, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { IconSymbol } from '@/components/ui/icon-symbol' 

// --- Mock Data and Types ---
type Reminder = {
  id: string
  title: string
  type: string
  dateTime: string
  icon: string
}

const MOCK_REMINDERS: Reminder[] = [
  {
    id: '1',
    title: 'พาไปว่ายน้ำ',
    type: 'ร็อตไวเลอร์',
    dateTime: '17/09/2568, 13.30 น.',
    icon: 'clock.fill',
  },
  {
    id: '2',
    title: 'อาบน้ำตัดขน',
    type: 'ร็อตไวเลอร์',
    dateTime: '24/09/2568, 09.30 น.',
    icon: 'clock.fill',
  },
]

// --- Main Page Component ---
export default function ReminderListPage() {
  const [reminders, setReminders] = useState(MOCK_REMINDERS)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)

  // --- Handlers ---
  const handleDeletePress = (reminder: Reminder) => {
    setSelectedReminder(reminder)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    if (selectedReminder) {
      setReminders((prevReminders) =>
        prevReminders.filter((r) => r.id !== selectedReminder.id)
      )
    }
    setShowDeleteModal(false)
    setSelectedReminder(null)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setSelectedReminder(null)
  }

  // --- Render Functions ---
  const renderReminderItem = ({ item }: { item: Reminder }) => {
    // Mocking the "swiped" state for the first item as per the UI
    const isSwiped = item.id === '1' && reminders.some(r => r.id === '1');

    return (
      <HStack className="mb-3">
        {/* Main reminder content card */}
        <Pressable className="flex-1">
          <HStack className="bg-white p-4 rounded-xl shadow-sm justify-between items-center">
            <HStack className="items-center space-x-3">
              <IconSymbol
                name={item.icon}
                size={20}
                color="#007AFF" // Blue icon
              />
              <VStack>
                <Text className="text-base font-bold text-gray-800">
                  {item.title}
                </Text>
                <Text className="text-sm text-gray-500">{item.type}</Text>
                <Text className="text-sm text-gray-500">{item.dateTime}</Text>
              </VStack>
            </HStack>
            <IconSymbol name="info.circle" size={20} color="#007AFF" />
          </HStack>
        </Pressable>

        {/* Mocked Delete Button (shown if "swiped") */}
        {isSwiped && (
          <Button
            className="bg-red-600 w-16 ml-2 justify-center items-center rounded-xl"
            onPress={() => handleDeletePress(item)}
          >
            <ButtonText className="text-white">ลบ</ButtonText>
          </Button>
        )}
      </HStack>
    )
  }

  return (
    <ThemedView className="flex-1 bg-white">
      {/* 1. Blue Header */}
      <Box
        className="bg-blue-400"
        style={{
          paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 50,
          paddingBottom: 20,
        }}
      >
        <Heading className="text-white text-center text-2xl font-bold">
          ปฏิทิน
        </Heading>
      </Box>

      {/* This SafeAreaView ensures content avoids notches, but header is outside */}
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
        {/* 2. Calendar Mock (as seen in UI) */}
        <Box className="bg-white p-4 shadow-sm">
          <HStack className="justify-between items-center mb-4">
            <IconSymbol name="chevron.left" size={20} color="black" />
            <Text className="text-lg font-semibold">สิงหาคม 2025</Text>
            <IconSymbol name="chevron.right" size={20} color="black" />
          </HStack>
          {/* Mock Calendar Days */}
          <HStack className="justify-around">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
              <Text key={day} className="text-gray-400 font-medium">
                {day}
              </Text>
            ))}
          </HStack>
          <HStack className="justify-around mt-2">
            {[17, 18, 19, 20, 21, 22, 23].map((date) => (
              <Box
                key={date}
                className={`w-8 h-8 rounded-full justify-center items-center ${
                  date === 18 ? 'bg-orange-500' : ''
                }`}
              >
                <Text
                  className={`${
                    date === 18 ? 'text-white' : 'text-black'
                  } font-medium`}
                >
                  {date}
                </Text>
              </Box>
            ))}
          </HStack>
        </Box>

        {/* 3. Reminder List Section */}
        <VStack className="flex-1 p-4 bg-neutral-50 rounded-t-3xl -mt-3">
          {/* Tabs */}
          <HStack className="mb-4 space-x-2">
            <Button className="bg-blue-100 rounded-full px-4 py-2">
              <ButtonText className="text-blue-600 font-semibold">
                นัดหมาย
              </ButtonText>
            </Button>
            <Button className="bg-gray-200 rounded-full px-4 py-2">
              <ButtonText className="text-gray-600 font-semibold">
                เสร็จสิ้น
              </ButtonText>
            </Button>
          </HStack>

          {/* List */}
          <FlatList
            data={reminders}
            renderItem={renderReminderItem}
            keyExtractor={(item) => item.id}
            contentContainerClassName="flex-grow"
            ListFooterComponent={
              <Button
                variant="outline"
                action="primary"
                className="mt-4 bg-white border-blue-500"
              >
                <ButtonText className="text-blue-500">+ เพิ่มนัดหมาย</ButtonText>
              </Button>
            }
          />
        </VStack>
      </SafeAreaView>

      {/* 4. Delete Confirmation Modal */}
      <AlertDialog isOpen={showDeleteModal} onClose={closeDeleteModal}>
        <AlertDialogBackdrop />
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <Heading className="text-center text-xl">เตือนความจำ?</Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-center text-base">
              การเตือนความจำ '{selectedReminder?.title}' ของ ร็อตไวเลอร์
              จะถูกลบออกอย่างถาวร
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <ButtonGroup className="w-full space-x-3">
              <Button
                variant="outline"
                action="secondary"
                onPress={closeDeleteModal}
                className="flex-1"
              >
                <ButtonText>ยกเลิก</ButtonText>
              </Button>
              <Button
                action="primary"
                onPress={confirmDelete}
                className="flex-1 bg-blue-500"
              >
                <ButtonText>ตกลง</ButtonText>
              </Button>
            </ButtonGroup>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ThemedView>
  )
}