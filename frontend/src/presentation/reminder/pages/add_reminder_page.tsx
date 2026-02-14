import { useRouter, useFocusEffect } from 'expo-router'
import { useFormik } from 'formik'
import React, { useEffect, useState, useCallback } from 'react'

import {
  IRecurrenceRule,
  IReminder,
  reminderInitValue,
  reminderValidationSchema,
} from '@/src/domain/reminder.domain'
import { IDose } from '@/src/domain/vaccine.domain'
import { useError } from '@/src/presentation/components/error_context'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import {
  convertToBackendRecurrence,
  convertFromBackendRecurrence,
} from '@/src/utils/recurrence.utils'

import { usePets } from '@/src/context/PetContext'
import { useLocalSearchParams } from 'expo-router'
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import DatePicker from '../../components/date_picker'
import Header from '../../components/header_component'
import LoadingComponent from '../../components/loading_component'
import PetSelector from '../../components/pet_selector'
import InputText from '../../components/text_input'
import TimePicker from '../../components/time_picker'
import CategorySelector from '../components/category_selector'
import RecurrencePicker from '../components/recurrence_picker'
import ReminderSuggestions from '../components/reminder_suggestions'
import VaccineScheduleSection from '../components/vaccine_schedule_section'

export default function AddReminderPage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { showError } = useError()
  const petIdFromParams = (params?.petId || '') as string
  const reminderId =
    typeof params?.reminderId === 'string'
      ? params.reminderId
      : Array.isArray(params?.reminderId)
        ? params.reminderId[0]
        : ''
  const isEditMode = !!reminderId

  const [doses, setDoses] = useState<IDose[]>([])
  const [customVaccineName, setCustomVaccineName] = useState<string>('')
  const [vaccineResetKey, setVaccineResetKey] = useState<number>(0)
  const [initialReminderData, setInitialReminderData] =
    useState<IReminder | null>(null)
  const [loadingReminder, setLoadingReminder] = useState(isEditMode)
  const [loadedVaccineIsCustom, setLoadedVaccineIsCustom] =
    useState<boolean>(false)
  const [initialChildReminders, setInitialChildReminders] = useState<any[]>([])
  const [recurrenceRule, setRecurrenceRule] = useState<IRecurrenceRule | null>(
    null,
  )
  const [existingReminders, setExistingReminders] = useState<IReminder[]>([])
  const [suggestions, setSuggestions] = useState<IReminder[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [hasUserStartedCreateMode, setHasUserStartedCreateMode] =
    useState(false)

  const doneChildReminderIds = new Set(
    initialChildReminders
      .filter((child) => child.reminderStatus === 'done')
      .map((child) => child.id),
  )
  const hasDoneChildren = doneChildReminderIds.size > 0

  const { pets, getFirstPetId, selectedPetId, setSelectedPetId } = usePets()

  const getRemindersApi = useApi(reminderService.getReminders, {
    showErrorAlert: false,
  })

  const createReminderApi = useApi(reminderService.createReminder, {
    onSuccess: () => {
      router.push('/(tabs)')
    },
  })

  const updateReminderApi = useApi(reminderService.updateReminder, {
    onSuccess: () => {
      router.push('/(tabs)')
    },
  })

  const formik = useFormik<IReminder>({
    initialValues: initialReminderData
      ? {
          id: initialReminderData.id || '',
          userId: initialReminderData.userId || '',
          petId: initialReminderData.petId || getFirstPetId(),
          pet_name: initialReminderData.pet_name || '',
          categoryName: initialReminderData.categoryName || 'General',
          reminderName: initialReminderData.reminderName || '',
          description: initialReminderData.description || '',
          reminderDate: initialReminderData.reminderDate || '',
          reminderTime: initialReminderData.reminderTime || '',
          reminderStatus: initialReminderData.reminderStatus || 'to_do',
          statusUpdatedAt: initialReminderData.statusUpdatedAt || '',
          createdAt: initialReminderData.createdAt || '',
          updatedAt: initialReminderData.updatedAt || '',
          children: initialReminderData.children || [],
        }
      : {
          ...reminderInitValue({} as IReminder),
          petId: getFirstPetId(),
        },
    enableReinitialize: true,
    validationSchema: reminderValidationSchema,
    validateOnBlur: false,
    validateOnChange: false,
    onSubmit: async (values) => {
      const errors = await formik.validateForm()

      if (Object.keys(errors).length > 0) {
        const errorMessages = Object.entries(errors)
          .map(([field, error]) => error)
          .join('\n')
        showError(errorMessages || 'กรุณากรอกข้อมูลให้ครบถ้วน')
        return
      }

      if (values.categoryName === 'Vaccination' && canUseVaccineSchedule) {
        if (doses.length === 0 || !doses[0].date) {
          showError('กรุณากรอกข้อมูลวัคซีนให้ครบถ้วน')
          return
        }
      }

      let submitData: any = {
        reminderName: values.reminderName,
        description: values.description,
        reminderDate: values.reminderDate,
        reminderTime: values.reminderTime || '',
        categoryName: values.categoryName || 'General',
        petId: values.petId,
      }

      if (recurrenceRule && recurrenceRule.type !== 'none') {
        const backendRecurrence = convertToBackendRecurrence(recurrenceRule)
        if (backendRecurrence) {
          submitData.recurrence = backendRecurrence
        }
      } else if (isEditMode && initialReminderData?.recurrence) {
        submitData.recurrence = null
      }

      if (
        values.categoryName === 'Vaccination' &&
        canUseVaccineSchedule &&
        doses.length > 0
      ) {
        const syncedDoses = doses.map((dose) =>
          dose.doseNumber === 1 ? { ...dose, date: values.reminderDate } : dose,
        )
        const children: any[] = syncedDoses.map((dose, index) => {
          const childData: any = {
            reminderName: customVaccineName
              ? `${customVaccineName} เข็มที่ ${dose.doseNumber}`
              : `วัคซีน เข็มที่ ${dose.doseNumber}`,
            description: values.description,
            reminderDate: dose.date,
            reminderTime: dose.time || '',
            categoryName: 'Vaccination',
          }
          if (dose.childReminderId) {
            childData.id = dose.childReminderId
          }
          return childData
        })
        submitData.children = children

        if (isEditMode && initialChildReminders.length > 0) {
          const currentChildIds = syncedDoses
            .map((dose) => dose.childReminderId)
            .filter((id) => !!id)
          const childrenToDelete = initialChildReminders
            .filter((child) => !currentChildIds.includes(child.id))
            .map((child) => child.id)

          if (childrenToDelete.length > 0) {
            submitData.childrenToDelete = childrenToDelete
          }
        }
      }

      if (isEditMode && reminderId) {
        await updateReminderApi.execute(reminderId, submitData)
      } else {
        await createReminderApi.execute(submitData)
      }

      setDoses([])
      setCustomVaccineName('')
      setInitialChildReminders([])
      setInitialReminderData(null)
      setLoadedVaccineIsCustom(false)
      setVaccineResetKey((prev) => prev + 1)
      setRecurrenceRule(null)
      setHasUserStartedCreateMode(false)
      if (!isEditMode) {
        formik.resetForm()
      }
    },
  })

  const isSubmitting = createReminderApi.loading || updateReminderApi.loading

  const loadReminderData = useCallback(async () => {
    if (isEditMode && reminderId) {
      setLoadingReminder(true)
      try {
        const response = await reminderService.getReminderById(reminderId)
        const reminderData = response.data
        if (reminderData) {
          setInitialReminderData(reminderData)

          if (reminderData.recurrence) {
            const convertedRecurrence = convertFromBackendRecurrence(
              reminderData.recurrence,
            )
            setRecurrenceRule(convertedRecurrence)
          }

          if (reminderData.children && reminderData.children.length > 0) {
            setInitialChildReminders(reminderData.children)

            const childrenWithDoseNumbers = reminderData.children.map(
              (child: any) => {
                const doseMatch = child.reminderName.match(/เข็มที่\s*(\d+)/)
                const doseNumber = doseMatch ? parseInt(doseMatch[1], 10) : 0
                return { ...child, extractedDoseNumber: doseNumber }
              },
            )

            const sortedChildren = childrenWithDoseNumbers.sort(
              (a, b) => a.extractedDoseNumber - b.extractedDoseNumber,
            )

            const childrenDoses: IDose[] = sortedChildren.map((child: any) => ({
              doseNumber: child.extractedDoseNumber,
              date: child.reminderDate || '',
              time: child.reminderTime || '',
              isAutoCalculated: child.extractedDoseNumber > 1,
              isEdited: false,
              childReminderId: child.id,
            }))
            setDoses(childrenDoses)
            const firstChildName = reminderData.children[0]?.reminderName || ''
            const nameMatch = firstChildName.match(/(.+?)\s+เข็ม/)
            if (nameMatch) {
              const vaccineName = nameMatch[1]
              setCustomVaccineName(vaccineName)
              setLoadedVaccineIsCustom(true)
            }
          }
        }
      } catch (error) {
        showError('ไม่สามารถโหลดข้อมูลเตือนความจำได้')
      } finally {
        setLoadingReminder(false)
      }
    } else if (!hasUserStartedCreateMode) {
      // Only clear data on initial mount in create mode, not on every re-render
      setInitialReminderData(null)
      setLoadingReminder(false)
      setLoadedVaccineIsCustom(false)
      setInitialChildReminders([])
      setDoses([])
      setCustomVaccineName('')
      setRecurrenceRule(null)
    }
  }, [isEditMode, reminderId, showError, hasUserStartedCreateMode])

  // Initial load effect - only depends on reminderId and isEditMode to avoid re-triggering
  useEffect(() => {
    if (isEditMode && reminderId) {
      loadReminderData()
    } else if (!isEditMode && !hasUserStartedCreateMode) {
      // Clear data on initial mount in create mode
      setInitialReminderData(null)
      setLoadingReminder(false)
      setLoadedVaccineIsCustom(false)
      setInitialChildReminders([])
      setDoses([])
      setCustomVaccineName('')
      setRecurrenceRule(null)
    }
  }, [reminderId, isEditMode])

  // Track when user starts creating doses in create mode
  useEffect(() => {
    if (!isEditMode && doses.length > 0) {
      setHasUserStartedCreateMode(true)
    }
  }, [doses, isEditMode])

  useFocusEffect(
    useCallback(() => {
      // Only reload data on focus if we haven't already loaded it and user hasn't started modifying
      if (
        isEditMode &&
        reminderId &&
        !initialReminderData &&
        !hasUserStartedCreateMode
      ) {
        // Reload data when user focuses back on the screen
        setLoadingReminder(true)
        reminderService
          .getReminderById(reminderId)
          .then((response) => {
            const reminderData = response.data
            if (reminderData) {
              setInitialReminderData(reminderData)

              if (reminderData.recurrence) {
                const convertedRecurrence = convertFromBackendRecurrence(
                  reminderData.recurrence,
                )
                setRecurrenceRule(convertedRecurrence)
              }

              if (reminderData.children && reminderData.children.length > 0) {
                setInitialChildReminders(reminderData.children)

                const childrenWithDoseNumbers = reminderData.children.map(
                  (child: any) => {
                    const doseMatch =
                      child.reminderName.match(/เข็มที่\s*(\d+)/)
                    const doseNumber = doseMatch
                      ? parseInt(doseMatch[1], 10)
                      : 0
                    return { ...child, extractedDoseNumber: doseNumber }
                  },
                )

                const sortedChildren = childrenWithDoseNumbers.sort(
                  (a, b) => a.extractedDoseNumber - b.extractedDoseNumber,
                )

                const childrenDoses: IDose[] = sortedChildren.map(
                  (child: any) => ({
                    doseNumber: child.extractedDoseNumber,
                    date: child.reminderDate || '',
                    time: child.reminderTime || '',
                    isAutoCalculated: child.extractedDoseNumber > 1,
                    isEdited: false,
                    childReminderId: child.id,
                  }),
                )
                setDoses(childrenDoses)
                const firstChildName =
                  reminderData.children[0]?.reminderName || ''
                const nameMatch = firstChildName.match(/(.+?)\s+เข็ม/)
                if (nameMatch) {
                  const vaccineName = nameMatch[1]
                  setCustomVaccineName(vaccineName)
                  setLoadedVaccineIsCustom(true)
                }
              }
            }
          })
          .catch((error) => {
            showError('ไม่สามารถโหลดข้อมูลเตือนความจำได้')
          })
          .finally(() => {
            setLoadingReminder(false)
          })
      }
    }, [
      isEditMode,
      reminderId,
      showError,
      initialReminderData,
      hasUserStartedCreateMode,
    ]),
  )

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const response = await getRemindersApi.execute({})
        const reminders = response?.data?.data?.reminders || []
        setExistingReminders(Array.isArray(reminders) ? reminders : [])
      } catch (error) {
        console.error('Error fetching reminders:', error)
      }
    }
    fetchReminders()
  }, [])

  useEffect(() => {
    if (petIdFromParams) {
      formik.setFieldValue('petId', petIdFromParams)
    }
  }, [petIdFromParams])

  useEffect(() => {
    if (petIdFromParams) {
      formik.setFieldValue('petId', petIdFromParams)
    } else if (selectedPetId) {
      formik.setFieldValue('petId', selectedPetId)
    } else if (pets.length > 0) {
      formik.setFieldValue('petId', pets[0].id)
    }
  }, [petIdFromParams, selectedPetId, pets])

  const currentPet = pets.find((p) => p.id === formik.values.petId)

  const canUseVaccineSchedule =
    currentPet &&
    (currentPet.species?.includes('สุนัข') ||
      currentPet.species?.includes('แมว')) &&
    !!currentPet.age

  const isVaccinationCategory = formik.values.categoryName === 'Vaccination'
  const allDosesHaveDates = doses.length > 0 && doses.every((d) => !!d.date)
  const canSubmit =
    formik.values.reminderName &&
    formik.values.reminderDate &&
    (isVaccinationCategory && canUseVaccineSchedule ? allDosesHaveDates : true)

  const handleBack = () => {
    setDoses([])
    setCustomVaccineName('')
    setVaccineResetKey((prev) => prev + 1)
    setRecurrenceRule(null)
    setHasUserStartedCreateMode(false)
    setInitialReminderData(null)
    setInitialChildReminders([])
    setLoadedVaccineIsCustom(false)
    formik.resetForm()
    router.back()
  }

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBack()
        return true
      },
    )

    return () => backHandler.remove()
  }, [])

  const convertDateToString = (date: Date): string => {
    try {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch (e) {
      return new Date().toISOString().split('T')[0]
    }
  }

  const handleReminderNameChange = (value: string) => {
    formik.setFieldValue('reminderName', value)

    if (value.trim().length >= 2) {
      const filtered = existingReminders
        .filter((reminder) =>
          reminder.reminderName.toLowerCase().includes(value.toLowerCase()),
        )
        .slice(0, 5) // Limit to 5 suggestions

      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSuggestionSelect = (reminder: IReminder) => {
    // Auto-fill all form fields from selected reminder
    formik.setFieldValue('reminderName', reminder.reminderName)
    formik.setFieldValue('description', reminder.description || '')
    formik.setFieldValue('categoryName', reminder.categoryName || 'General')
    formik.setFieldValue('reminderTime', reminder.reminderTime || '')

    // Set recurrence if exists
    if (reminder.recurrence) {
      // Note: recurrence will be handled by RecurrencePicker if needed
      // For now just clear it as we're creating a new reminder
      setRecurrenceRule(null)
    }

    // Close suggestions
    setShowSuggestions(false)
    setSuggestions([])
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loadingReminder ? (
          <View style={styles.loadingContainer}>
            <LoadingComponent />
          </View>
        ) : (
          <View style={styles.safeArea}>
            <Header
              title={isEditMode ? 'แก้ไขเตือนความจำ' : 'เพิ่มเตือนความจำ'}
              goBack={!isSubmitting}
              onBackPress={handleBack}
            />

            <ScrollView
              style={styles.scrollView}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps='handled'
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <View style={styles.formCard}>
                <View style={styles.cardHeader}>
                  <Pressable onPress={handleBack} disabled={isSubmitting}>
                    <Text style={styles.cancelText}>ยกเลิก</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => formik.handleSubmit()}
                    disabled={!canSubmit || isSubmitting}
                  >
                    <Text
                      style={[
                        styles.addText,
                        (!canSubmit || isSubmitting) && styles.submittingText,
                      ]}
                    >
                      {isSubmitting
                        ? isEditMode
                          ? 'กำลังแก้ไข...'
                          : 'กำลังเพิ่ม...'
                        : isEditMode
                          ? 'แก้ไข'
                          : 'เพิ่ม'}
                    </Text>
                  </Pressable>
                </View>

                <InputText
                  value={formik.values.reminderName}
                  onChangeText={handleReminderNameChange}
                  placeholder='หัวข้อเตือนความจำ'
                  title='หัวข้อ'
                  required={true}
                  error={formik.errors.reminderName}
                />

                <ReminderSuggestions
                  suggestions={suggestions}
                  onSelect={handleSuggestionSelect}
                  visible={showSuggestions}
                />

                <PetSelector
                  pets={pets}
                  selectedPetId={formik.values.petId}
                  onSelectPet={(petId: string) => {
                    formik.setFieldValue('petId', petId)
                    setSelectedPetId(petId)
                  }}
                  label='สัตว์เลี้ยง'
                  required={true}
                  disabled={isSubmitting}
                />

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <DatePicker
                      title='วันที่เตือนความจำ'
                      placeholder='วัน/เดือน/ปี'
                      value={
                        formik.values.reminderDate
                          ? new Date(formik.values.reminderDate)
                          : undefined
                      }
                      onChange={(v) => {
                        const dateString = convertDateToString(v)
                        formik.setFieldValue('reminderDate', dateString)
                      }}
                      error={formik.errors.reminderDate}
                      required={true}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TimePicker
                      title='เวลาที่เตือนความจำ'
                      placeholder='เลือกเวลา'
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
                  disabled={hasDoneChildren || isSubmitting}
                />

                {/* Hide recurrence picker if no date selected or if category is Vaccination */}
                {formik.values.reminderDate &&
                  formik.values.categoryName !== 'Vaccination' && (
                    <RecurrencePicker
                      value={
                        recurrenceRule || {
                          type: 'none',
                          interval: 1,
                          endType: 'never',
                        }
                      }
                      onChange={setRecurrenceRule}
                      reminderDate={
                        formik.values.reminderDate
                          ? new Date(formik.values.reminderDate)
                          : undefined
                      }
                    />
                  )}

                {/* Vaccine Schedule Section */}
                <VaccineScheduleSection
                  key={vaccineResetKey}
                  isVaccinationCategory={isVaccinationCategory}
                  canUseVaccineSchedule={canUseVaccineSchedule || false}
                  petId={formik.values.petId}
                  reminderDate={formik.values.reminderDate}
                  doses={doses}
                  setDoses={setDoses}
                  onDose1DateChange={(dateString) => {
                    formik.setFieldValue('reminderDate', dateString)
                  }}
                  onDose1TimeChange={(time) => {
                    formik.setFieldValue('reminderTime', time)
                  }}
                  onCustomVaccineNameChange={setCustomVaccineName}
                  initialVaccineId={null}
                  initialVaccineName={
                    isEditMode && customVaccineName
                      ? customVaccineName
                      : undefined
                  }
                  isEditMode={isEditMode}
                  initialCustomDoseCount={
                    isEditMode && doses.length > 0 ? doses.length : undefined
                  }
                  doneChildReminderIds={doneChildReminderIds}
                  onCustomDosesGenerated={() =>
                    setHasUserStartedCreateMode(true)
                  }
                />

                <View>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder='รายละเอียดอื่นๆ'
                    multiline
                    numberOfLines={4}
                    value={formik.values.description}
                    onChangeText={formik.handleChange('description')}
                    onBlur={formik.handleBlur('description')}
                    editable={!isSubmitting}
                  />
                  {formik.touched.description && formik.errors.description && (
                    <Text style={styles.errorText}>
                      {formik.errors.description}
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
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
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  cancelText: {
    color: '#4b5563',
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
  },
  addText: {
    color: '#2E759E',
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
  },
  submittingText: {
    color: '#6b7280',
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
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    marginTop: 4,
    marginLeft: 4,
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 10,
  },
  required: {
    color: '#dc2626',
  },
  petSelector: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  petSelectorText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
  },
  petDisplay: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    marginBottom: 12,
  },
  petDisplayText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
  },
  petDropdownMenu: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
    overflow: 'hidden',
  },
  petDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  petDropdownItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  petDropdownItemText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
  },
  petDropdownItemTextSelected: {
    color: '#5FA7D1',
    fontFamily: 'Prompt_500Medium',
  },
})
