// import React from 'react';
// import { Platform, StatusBar, Pressable } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useRouter } from 'expo-router';
// import DateTimePicker, {
//   DateTimePickerEvent,
// } from '@react-native-community/datetimepicker';

// import { ThemedView } from '@/components/themed-view';
// import { ThemedText } from '@/components/themed-text';
// import { IconSymbol } from '@/components/ui/icon-symbol';
// import { Box } from '@/components/ui/box';
// import { VStack } from '@/components/ui/vstack';
// import { HStack } from '@/components/ui/hstack';
// import { Input, InputField } from '@/components/ui/input';
// import { Textarea, TextareaInput } from '@/components/ui/textarea';

// export default function AddReminderPage() {
//   const router = useRouter();

//   const [date, setDate] = React.useState<Date | undefined>(undefined);
//   const [time, setTime] = React.useState<Date | undefined>(undefined);
//   const [showDatePicker, setShowDatePicker] = React.useState(false);
//   const [showTimePicker, setShowTimePicker] = React.useState(false);

//   const handleAddReminder = () => {
//     // TODO: Logic to save the reminder
//     console.log('Adding reminder with:', { date, time });
//     router.back();
//   };

//   const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
//     // hide the picker
//     setShowDatePicker(false);
//     if (event.type === 'set' && selectedDate) {
//       // 'set' means the user pressed "OK" or selected a date
//       setDate(selectedDate);
//     }
//   };

//   const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
//     // hide the picker
//     setShowTimePicker(false);
//     if (event.type === 'set' && selectedTime) {
//       // 'set' means the user pressed "OK" or selected a time
//       setTime(selectedTime);
//     }
//   };

//   const handleOpenDatePicker = () => {
//     setShowDatePicker(true);
//   };

//   const handleOpenTimePicker = () => {
//     setShowTimePicker(true);
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
//                 {date ? date.toLocaleDateString('th-TH') : 'วันที่'}
//               </ThemedText>
//               <IconSymbol name='calendar' size={20} color='#6b7280' />
//             </Pressable>

//             {/* Time Button */}
//             <Pressable
//               onPress={handleOpenTimePicker}
//               className='flex-1 flex-row justify-between items-center border border-gray-300 rounded-lg p-3 h-12'
//             >
//               <ThemedText className='text-base font-prompt text-gray-700'>
//                 {time
//                   ? time.toLocaleTimeString('th-TH', {
//                       hour: '2-digit',
//                       minute: '2-digit',
//                     })
//                   : 'เวลา'}
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
//                 style={{ height: 100 }}
//               />
//             </Textarea>
//           </VStack>
//         </Box>

//         {/* --- PICKER COMPONENTS --- */}
//         {showDatePicker && (
//           <DateTimePicker
//             value={date || new Date()}
//             mode='date'
//             display='default' // Will be 'spinner' on iOS, 'calendar' on Android
//             onChange={onDateChange}
//           />
//         )}

//         {showTimePicker && (
//           <DateTimePicker
//             value={time || new Date()}
//             mode='time'
//             display='default'
//             onChange={onTimeChange}
//           />
//         )}
//         {/* --- END PICKERS --- */}
//       </SafeAreaView>
//     </ThemedView>
//   );
// }

///////////////////////////////////////////////////////

import React from 'react';
import {
  Platform,
  StatusBar,
  Pressable,
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Button,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

// Helper function to format date
const formatDate = (date: Date) => {
  return date.toLocaleDateString('th-TH');
};

// Helper function to format time
const formatTime = (time: Date) => {
  return time.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AddReminderPage() {
  const router = useRouter();

  const [date, setDate] = React.useState(new Date());
  const [time, setTime] = React.useState(new Date());

  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);

  const handleAddReminder = () => {
    console.log('Adding reminder with:', { date, time });
    router.back();
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date;

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' || Platform.OS === 'ios') {
      setDate(currentDate);
    } else {
      setShowDatePicker(false);
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    const currentTime = selectedTime || time;

    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'set' || Platform.OS === 'ios') {
      setTime(currentTime);
    } else {
      setShowTimePicker(false);
    }
  };

  const closeIosPicker = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const handleOpenDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleOpenTimePicker = () => {
    setShowTimePicker(true);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.safeArea}>
        {/* --- Custom Header --- */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.headerBackIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>เพิ่มการเตือนความจำ</Text>
        </View>

        {/* --- Form Card --- */}
        <View style={styles.formCard}>
          {/* Cancel / Add Row */}
          <View style={styles.cardHeader}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.cancelText}>ยกเลิก</Text>
            </Pressable>
            <Pressable onPress={handleAddReminder}>
              <Text style={styles.addText}>เพิ่ม</Text>
            </Pressable>
          </View>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>หัวข้อ</Text>
            <TextInput style={styles.input} placeholder='หัวข้ออะไรดีหนอ' />
          </View>

          {/* Date / Time Row */}
          <View style={styles.row}>
            {/* Date Button */}
            <Pressable
              onPress={handleOpenDatePicker}
              style={styles.pickerButton}
            >
              <Text style={styles.pickerButtonText}>{formatDate(date)}</Text>
              <Text style={styles.pickerButtonIcon}>📅</Text>
            </Pressable>

            {/* Time Button */}
            <Pressable
              onPress={handleOpenTimePicker}
              style={styles.pickerButton}
            >
              <Text style={styles.pickerButtonText}>{formatTime(time)}</Text>
              <Text style={styles.pickerButtonIcon}>⏰</Text>
            </Pressable>
          </View>

          {/* Details Input */}
          <View>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder='รายละเอียดอื่นๆ'
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
        {/* --- END Form Card --- */}
      </View>

      {/* --- PICKER COMPONENTS --- */}

      {/* Android pickers render directly */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={date}
          mode='date'
          display='default'
          onChange={onDateChange}
        />
      )}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={time}
          mode='time'
          display='default'
          onChange={onTimeChange}
        />
      )}

      {/* iOS pickers render inside a Modal */}
      <Modal
        visible={(showDatePicker || showTimePicker) && Platform.OS === 'ios'}
        transparent={true}
        animationType='slide'
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode='date'
                display='inline'
                onChange={onDateChange}
                textColor='#0ea5e9'
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode='time'
                display='spinner'
                onChange={onTimeChange}
                textColor='#0ea5e9'
              />
            )}
            <Button title='Done' onPress={closeIosPicker} />
          </View>
        </View>
      </Modal>
      {/* --- END PICKERS --- */}
    </View>
  );
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
    backgroundColor: '#0ea5e9',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelText: {
    color: '#4b5563',
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
  },
  addText: {
    color: '#0284c7',
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
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
    color: '#374151',
  },
  pickerButtonIcon: {
    fontSize: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});
