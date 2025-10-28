// import React from 'react';
// import { Platform, StatusBar, Pressable } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useRouter } from 'expo-router';

// import { ThemedView } from '@/components/themed-view';
// import { ThemedText } from '@/components/themed-text';
// import { IconSymbol } from '@/components/ui/icon-symbol';
// import { Box } from '@/components/ui/box';
// import { VStack } from '@/components/ui/vstack';
// import { HStack } from '@/components/ui/hstack';
// import { Input, InputField } from '@/components/ui/input';
// import { Textarea, TextareaInput } from '@/components/ui/textarea';

// export default function AddReminderPage() {
//   const router = useRouter(); // For 'back' and 'cancel' navigation

//   // TODO: Add state for input fields
//   // const [title, setTitle] = React.useState('');
//   // const [details, setDetails] = React.useState('');
//   // const [date, setDate] = React.useState<Date | undefined>();
//   // const [time, setTime] = React.useState<Date | undefined>();

//   // TODO: Add functions to handle add, cancel, and date/time picking
//   const handleAddReminder = () => {
//     // Logic to save the reminder
//     console.log('Adding reminder...');
//     router.back();
//   };

//   const handleOpenDatePicker = () => {
//     // Logic to open date picker modal
//     console.log('Open date picker');
//   };

//   const handleOpenTimePicker = () => {
//     // Logic to open time picker modal
//     console.log('Open time picker');
//   };

//   return (
//     <ThemedView className='flex-1 bg-neutral-200'>
//       <SafeAreaView
//         style={{
//           flex: 1,
//           paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
//         }}
//       >
//         {/* --- Custom Header --- */}
//         <HStack className='bg-sky-500 p-4 items-center space-x-4'>
//           <Pressable onPress={() => router.back()}>
//             <IconSymbol name='chevron.left' color='white' size={24} />
//           </Pressable>
//           <ThemedText className='text-white text-xl font-bold font-prompt'>
//             เพิ่มการเตือนความจำ
//           </ThemedText>
//         </HStack>

//         {/* --- Form Card --- */}
//         <Box className='bg-white m-4 p-4 rounded-2xl shadow-sm'>
//           {/* Cancel / Add Row */}
//           <HStack className='justify-between items-center mb-5'>
//             <Pressable onPress={() => router.back()}>
//               <ThemedText className='text-gray-600 text-base font-prompt'>
//                 ยกเลิก
//               </ThemedText>
//             </Pressable>
//             <Pressable onPress={handleAddReminder}>
//               <ThemedText className='text-sky-600 text-base font-bold font-prompt'>
//                 เพิ่ม
//               </ThemedText>
//             </Pressable>
//           </HStack>

//           {/* Title Input */}
//           <VStack space='xs' className='mb-4'>
//             <ThemedText className='text-gray-500 text-sm font-prompt ml-1'>
//               หัวข้อ
//             </ThemedText>
//             <Input variant='outline' size='lg' className='rounded-lg'>
//               <InputField
//                 placeholder='หัวข้ออะไรดีหนอ'
//                 className='font-prompt text-base'
//                 // value={title}
//                 // onChangeText={setTitle}
//               />
//             </Input>
//           </VStack>

//           {/* Date / Time Row */}
//           <HStack space='md' className='mb-4'>
//             {/* Date Button */}
//             <Pressable
//               onPress={handleOpenDatePicker}
//               className='flex-1 flex-row justify-between items-center border border-gray-300 rounded-lg p-3 h-12'
//             >
//               <ThemedText className='text-base font-prompt text-gray-700'>
//                 วันที่
//               </ThemedText>
//               <IconSymbol name='calendar' size={20} color='#6b7280' />
//             </Pressable>

//             {/* Time Button */}
//             <Pressable
//               onPress={handleOpenTimePicker}
//               className='flex-1 flex-row justify-between items-center border border-gray-300 rounded-lg p-3 h-12'
//             >
//               <ThemedText className='text-base font-prompt text-gray-700'>
//                 เวลา
//               </ThemedText>
//               <IconSymbol name='clock.fill' size={20} color='#6b7280' />
//             </Pressable>
//           </HStack>

//           {/* Details Input */}
//           <VStack space='xs'>
//             <Textarea size='lg' className='border border-gray-300 rounded-lg'>
//               <TextareaInput
//                 placeholder='รายละเอียดอื่นๆ'
//                 className='font-prompt text-base'
//                 style={{ height: 100 }} // Explicit height
//                 // value={details}
//                 // onChangeText={setDetails}
//               />
//             </Textarea>
//           </VStack>
//         </Box>
//       </SafeAreaView>
//     </ThemedView>
//   );
// }

import React from 'react';
import { Platform, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Textarea, TextareaInput } from '@/components/ui/textarea';

export default function AddReminderPage() {
  const router = useRouter();

  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [time, setTime] = React.useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);

  const handleAddReminder = () => {
    // TODO: Logic to save the reminder
    console.log('Adding reminder with:', { date, time });
    router.back();
  };

  // --- NEW HANDLER FUNCTIONS ---
  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // We must hide the picker
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      // 'set' means the user pressed "OK" or selected a date
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    // We must hide the picker
    setShowTimePicker(false);
    if (event.type === 'set' && selectedTime) {
      // 'set' means the user pressed "OK" or selected a time
      setTime(selectedTime);
    }
  };

  // These functions now just show the modal
  const handleOpenDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleOpenTimePicker = () => {
    setShowTimePicker(true);
  };
  // --- END NEW HANDLERS ---

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
              />
            </Input>
          </VStack>

          {/* Date / Time Row */}
          <HStack space='md' className='mb-4'>
            {/* Date Button - UPDATED */}
            <Pressable
              onPress={handleOpenDatePicker}
              className='flex-1 flex-row justify-between items-center border border-gray-300 rounded-lg p-3 h-12'
            >
              <ThemedText className='text-base font-prompt text-gray-700'>
                {date ? date.toLocaleDateString('th-TH') : 'วันที่'}
              </ThemedText>
              <IconSymbol name='calendar' size={20} color='#6b7280' />
            </Pressable>

            {/* Time Button - UPDATED */}
            <Pressable
              onPress={handleOpenTimePicker}
              className='flex-1 flex-row justify-between items-center border border-gray-300 rounded-lg p-3 h-12'
            >
              <ThemedText className='text-base font-prompt text-gray-700'>
                {time
                  ? time.toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'เวลา'}
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
              />
            </Textarea>
          </VStack>
        </Box>

        {/* --- NEW PICKER COMPONENTS --- */}
        {/* These are rendered conditionally */}
        {showDatePicker && (
          <DateTimePicker
            value={date || new Date()} // Use selected date or default to now
            mode='date'
            display='default' // Will be 'spinner' on iOS, 'calendar' on Android
            onChange={onDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={time || new Date()} // Use selected time or default to now
            mode='time'
            display='default'
            onChange={onTimeChange}
          />
        )}
        {/* --- END NEW PICKERS --- */}
      </SafeAreaView>
    </ThemedView>
  );
}
