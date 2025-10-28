import React from 'react';
import { Platform, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// --- CORRECTED IMPORTS BASED ON YOUR SCREENSHOTS ---
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
// --- END OF CORRECTIONS ---

export default function AddReminderPage() {
  const router = useRouter(); // For 'back' and 'cancel' navigation

  // TODO: Add state for input fields
  // const [title, setTitle] = React.useState('');
  // const [details, setDetails] = React.useState('');
  // const [date, setDate] = React.useState<Date | undefined>();
  // const [time, setTime] = React.useState<Date | undefined>();

  // TODO: Add functions to handle add, cancel, and date/time picking
  const handleAddReminder = () => {
    // Logic to save the reminder
    console.log('Adding reminder...');
    router.back();
  };

  const handleOpenDatePicker = () => {
    // Logic to open date picker modal
    console.log('Open date picker');
  };

  const handleOpenTimePicker = () => {
    // Logic to open time picker modal
    console.log('Open time picker');
  };

  return (
    <ThemedView className='flex-1 bg-neutral-200'>
      <SafeAreaView
        style={{
          flex: 1,
          paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        }}
      >
        {/* --- Custom Header --- */}
        <HStack className='bg-sky-500 p-4 items-center space-x-4'>
          <Pressable onPress={() => router.back()}>
            <IconSymbol name='chevron.left' color='white' size={24} />
          </Pressable>
          <ThemedText className='text-white text-xl font-bold font-prompt'>
            เพิ่มการเตือนความจำ
          </ThemedText>
        </HStack>

        {/* --- Form Card --- */}
        <Box className='bg-white m-4 p-4 rounded-2xl shadow-sm'>
          {/* Cancel / Add Row */}
          <HStack className='justify-between items-center mb-5'>
            <Pressable onPress={() => router.back()}>
              <ThemedText className='text-gray-600 text-base font-prompt'>
                ยกเลิก
              </ThemedText>
            </Pressable>
            <Pressable onPress={handleAddReminder}>
              <ThemedText className='text-sky-600 text-base font-bold font-prompt'>
                เพิ่ม
              </ThemedText>
            </Pressable>
          </HStack>

          {/* Title Input */}
          <VStack space='xs' className='mb-4'>
            <ThemedText className='text-gray-500 text-sm font-prompt ml-1'>
              หัวข้อ
            </ThemedText>
            <Input variant='outline' size='lg' className='rounded-lg'>
              <InputField
                placeholder='หัวข้ออะไรดีหนอ'
                className='font-prompt text-base'
                // value={title}
                // onChangeText={setTitle}
              />
            </Input>
          </VStack>

          {/* Date / Time Row */}
          <HStack space='md' className='mb-4'>
            {/* Date Button */}
            <Pressable
              onPress={handleOpenDatePicker}
              className='flex-1 flex-row justify-between items-center border border-gray-300 rounded-lg p-3 h-12'
            >
              <ThemedText className='text-base font-prompt text-gray-700'>
                วันที่
              </ThemedText>
              <IconSymbol name='calendar' size={20} color='#6b7280' />
            </Pressable>

            {/* Time Button */}
            <Pressable
              onPress={handleOpenTimePicker}
              className='flex-1 flex-row justify-between items-center border border-gray-300 rounded-lg p-3 h-12'
            >
              <ThemedText className='text-base font-prompt text-gray-700'>
                เวลา
              </ThemedText>
              <IconSymbol name='clock.fill' size={20} color='#6b7280' />
            </Pressable>
          </HStack>

          {/* Details Input */}
          <VStack space='xs'>
            <Textarea size='lg' className='border border-gray-300 rounded-lg'>
              <TextareaInput
                placeholder='รายละเอียดอื่นๆ'
                className='font-prompt text-base'
                style={{ height: 100 }} // Explicit height
                // value={details}
                // onChangeText={setDetails}
              />
            </Textarea>
          </VStack>
        </Box>
      </SafeAreaView>
    </ThemedView>
  );
}
