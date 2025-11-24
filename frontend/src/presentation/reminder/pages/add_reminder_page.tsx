import { useRouter } from 'expo-router'
import { useFormik } from 'formik'
import React from 'react'

import {
  IReminder,
  reminderInitValue,
  reminderValidationSchema
} from '@/src/domain/reminder.domain'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'

import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native'
import DatePicker from '../../components/date_picker'
import Header from '../../components/header_component'
import InputText from '../../components/text_input'
import TimePicker from '../../components/time_picker'
import CategorySelector from '../components/category_selector'

export default function AddReminderPage() {
  const router = useRouter()

  const createReminderApi = useApi(reminderService.createReminder, {
    showErrorAlert: true,
    successMessage: 'เพิ่มเตือนความจำสำเร็จ',
    onSuccess: () => {
      router.back()
    }
  })

  const formik = useFormik<IReminder>({
    initialValues: reminderInitValue({} as IReminder),
    validationSchema: reminderValidationSchema,
    validateOnBlur: false,
    validateOnChange: false,
    onSubmit: async (values) => {
      await createReminderApi.execute(values as IReminder)
    }
  })

  const isSubmitting = createReminderApi.loading

  const handleBack = () => {
    formik.resetForm()
    router.back()
  }

  return (
    <View style={styles.screen}>
      <View style={styles.safeArea}>
        <Header
          title="เพิ่มเตือนความจำ"
          goBack={!isSubmitting}
          onBackPress={handleBack}
        />

        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Pressable onPress={handleBack} disabled={isSubmitting}>
              <Text style={styles.cancelText}>ยกเลิก</Text>
            </Pressable>
            <Pressable
              onPress={() => formik.handleSubmit()}
              disabled={isSubmitting}
            >
              <Text
                style={[styles.addText, isSubmitting && styles.submittingText]}
              >
                {isSubmitting ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
              </Text>
            </Pressable>
          </View>

          <InputText
            value={formik.values.reminderName}
            onChangeText={(v) => formik.setFieldValue('reminderName', v)}
            placeholder="หัวข้อเตือนความจำ"
            title="หัวข้อ"
            required={true}
            error={formik.errors.reminderName}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <DatePicker
                title="วันที่เตือนความจำ"
                placeholder="วัน/เดือน/ปี"
                value={
                  formik.values.reminderDate
                    ? new Date(formik.values.reminderDate)
                    : undefined
                }
                onChange={(v) => formik.setFieldValue('reminderDate', v)}
                error={formik.errors.reminderDate}
                required={true}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TimePicker
                title="เวลาที่เตือนความจำ"
                placeholder="เลือกเวลา"
                value={formik.values.reminderTime}
                onChange={(v) => formik.setFieldValue('reminderTime', v)}
              />
            </View>
          </View>

          <CategorySelector
            value={formik.values.categoryName}
            onChange={(v) => formik.setFieldValue('categoryName', v)}
            error={formik.errors.categoryName}
            required={true}
          />

          <View>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="รายละเอียดอื่นๆ"
              multiline
              numberOfLines={4}
              value={formik.values.description}
              onChangeText={formik.handleChange('description')}
              onBlur={formik.handleBlur('description')}
              editable={!isSubmitting}
            />
            {formik.touched.description && formik.errors.description && (
              <Text style={styles.errorText}>{formik.errors.description}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#e5e7eb'
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  formCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18
  },
  cancelText: {
    color: '#4b5563',
    fontSize: 16,
    fontFamily: 'Prompt_400Regular'
  },
  addText: {
    color: '#2E759E',
    fontSize: 16,
    fontFamily: 'Prompt_700Bold'
  },
  submittingText: {
    color: '#6b7280'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    minHeight: 48
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    marginTop: 4,
    marginLeft: 4
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: 12
  },
  row: {
    flexDirection: 'row',
    gap: 8
  }
})
