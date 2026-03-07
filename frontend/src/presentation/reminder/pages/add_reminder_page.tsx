import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'

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
  convertFromBackendRecurrence,
  convertToBackendRecurrence,
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
import { createFormikInstance } from '../utils/formik-helper'
import DatePicker from '../../components/date_picker'
import DiscardChangesModal from '../../components/discard_changes_modal'
import Header from '../../components/header_component'
import PetSelector from '../../components/pet_selector'
import InputText from '../../components/text_input'
import TimePicker from '../../components/time_picker'
import CategorySelector from '../components/category_selector'
import EndRepeatSelector from '../components/recurrence/end_repeat_selector'
import RecurrencePicker from '../components/recurrence/recurrence_picker'
import VaccineScheduleSection from '../components/recurrence/vaccine_schedule_section'
import ReminderSuggestions from '../components/reminder_suggestions'

// Type for individual form state
interface ReminderFormState {
  doses: IDose[]
  customVaccineName: string
  vaccineResetKey: number
  initialReminderData: IReminder | null
  loadingReminder: boolean
  loadedVaccineIsCustom: boolean
  initialChildReminders: any[]
  recurrenceRule: IRecurrenceRule | null
  duplicateError: string | null
  originalPetSpecies: string | null
  childrenToDelete: string[]
  suggestions: IReminder[]
  showSuggestions: boolean
  hasUserStartedCreateMode: boolean
  formValues: IReminder
}

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

  // State for managing multiple reminder forms
  const [reminderForms, setReminderForms] = useState<ReminderFormState[]>([])
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [existingReminders, setExistingReminders] = useState<IReminder[]>([])
  const [formErrors, setFormErrors] = useState<
    Record<number, Record<string, string>>
  >({})
  const apiSuccessRef = useRef(false)
  const formikInstancesRef = useRef<Record<number, any>>({})

  const { pets, activePets, getFirstPetId, selectedPetId, setSelectedPetId } =
    usePets()

  const getRemindersApi = useApi(reminderService.getReminders, {
    showErrorAlert: false,
  })

  const createReminderApi = useApi(reminderService.createReminder, {
    showErrorAlert: false,
    onSuccess: () => {
      apiSuccessRef.current = true
      router.push('/(tabs)')
    },
    onError: (error) => {
      apiSuccessRef.current = false
      if (error.statusCode === 409) {
        showError('เตือนความจำนี้ซ้ำกับที่มีอยู่แล้ว')
      } else {
        showError(error.message || 'ไม่สามารถสร้างเตือนความจำได้')
      }
    },
  })

  const createBatchRemindersApi = useApi(reminderService.createBatchReminders, {
    showErrorAlert: false,
    onSuccess: () => {
      apiSuccessRef.current = true
      router.push('/(tabs)')
    },
    onError: (error) => {
      apiSuccessRef.current = false
      showError(error.message || 'ไม่สามารถสร้างเตือนความจำได้')
    },
  })

  const updateReminderApi = useApi(reminderService.updateReminder, {
    showErrorAlert: false,
    onSuccess: () => {
      apiSuccessRef.current = true
      router.push('/(tabs)')
    },
    onError: (error) => {
      apiSuccessRef.current = false
      if (error.statusCode === 409) {
        showError('เตือนความจำนี้ซ้ำกับที่มีอยู่แล้ว')
      } else {
        showError(error.message || 'ไม่สามารถแก้ไขเตือนความจำได้')
      }
    },
  })

  // Initialize form on mount or edit mode
  useEffect(() => {
    if (isEditMode && reminderId) {
      // Edit mode: load single reminder
      loadReminderForEdit()
    } else {
      // Create mode: initialize with one empty form
      initializeNewForm()
    }
  }, [reminderId, isEditMode])

  // Fetch existing reminders for suggestions
  useFocusEffect(
    useCallback(() => {
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
    }, []),
  )

  // Initialize with one empty form for creation
  const initializeNewForm = () => {
    const initialValues: IReminder = {
      ...reminderInitValue({} as IReminder),
      petId: getFirstPetId(),
    }

    const newForm: ReminderFormState = {
      formValues: initialValues,
      doses: [],
      customVaccineName: '',
      vaccineResetKey: 0,
      initialReminderData: null,
      loadingReminder: false,
      loadedVaccineIsCustom: false,
      initialChildReminders: [],
      recurrenceRule: null,
      duplicateError: null,
      originalPetSpecies: null,
      childrenToDelete: [],
      suggestions: [],
      showSuggestions: false,
      hasUserStartedCreateMode: false,
    }

    setReminderForms([newForm])
  }

  // Load reminder for edit mode
  const loadReminderForEdit = async () => {
    const initialValues: IReminder = {
      ...reminderInitValue({} as IReminder),
      petId: getFirstPetId(),
    }

    const newForm: ReminderFormState = {
      formValues: initialValues,
      doses: [],
      customVaccineName: '',
      vaccineResetKey: 0,
      initialReminderData: null,
      loadingReminder: true,
      loadedVaccineIsCustom: false,
      initialChildReminders: [],
      recurrenceRule: null,
      duplicateError: null,
      originalPetSpecies: null,
      childrenToDelete: [],
      suggestions: [],
      showSuggestions: false,
      hasUserStartedCreateMode: false,
    }

    try {
      const response = await reminderService.getReminderById(reminderId)
      const reminderData = response.data

      if (reminderData) {
        const formattedReminderData = {
          ...reminderData,
          reminderTime: (reminderData.reminderTime || '').substring(0, 5),
        }

        newForm.formValues = formattedReminderData
        newForm.initialReminderData = formattedReminderData

        // Handle recurrence
        if (reminderData.recurrence) {
          const convertedRecurrence = convertFromBackendRecurrence(
            reminderData.recurrence,
          )
          newForm.recurrenceRule = convertedRecurrence
        }

        // Handle vaccine schedule children
        if (
          reminderData.categoryName === 'Vaccination' &&
          reminderData.children &&
          reminderData.children.length > 0
        ) {
          newForm.initialChildReminders = reminderData.children

          const childrenWithDoseNumbers = reminderData.children.map(
            (child: any) => {
              const doseMatch = child.reminderName.match(/เข็มที่\s*(\d+)/)
              return {
                ...child,
                extractedDoseNumber: doseMatch ? parseInt(doseMatch[1], 10) : 1,
              }
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

          newForm.doses = childrenDoses

          const firstChildName = reminderData.children[0]?.reminderName || ''
          const nameMatch = firstChildName.match(/(.+?)\s+เข็ม/)
          if (nameMatch) {
            newForm.customVaccineName = nameMatch[1]
            newForm.loadedVaccineIsCustom = true
          }
        }

        newForm.originalPetSpecies = null
      }
    } catch (error) {
      showError('ไม่สามารถโหลดข้อมูลเตือนความจำได้')
    } finally {
      newForm.loadingReminder = false
      setReminderForms([newForm])
    }
  }

  // Add a new empty form
  const addNewForm = () => {
    const initialValues: IReminder = {
      ...reminderInitValue({} as IReminder),
      petId: selectedPetId || getFirstPetId(),
    }

    const newForm: ReminderFormState = {
      formValues: initialValues,
      doses: [],
      customVaccineName: '',
      vaccineResetKey: 0,
      initialReminderData: null,
      loadingReminder: false,
      loadedVaccineIsCustom: false,
      initialChildReminders: [],
      recurrenceRule: null,
      duplicateError: null,
      originalPetSpecies: null,
      childrenToDelete: [],
      suggestions: [],
      showSuggestions: false,
      hasUserStartedCreateMode: false,
    }

    setReminderForms([...reminderForms, newForm])
  }

  // Validate form values manually
  const validateFormValues = async (
    values: IReminder,
  ): Promise<Record<string, string>> => {
    try {
      await reminderValidationSchema.validate(values, { abortEarly: false })
      return {}
    } catch (error: any) {
      const errors: Record<string, string> = {}
      if (error.inner) {
        for (const err of error.inner) {
          if (err.path) {
            errors[err.path] = err.message
          }
        }
      }
      return errors
    }
  }

  // Delete a form by index
  const deleteForm = (index: number) => {
    const updatedForms = reminderForms.filter((_, i) => i !== index)
    setReminderForms(updatedForms)
  }

  // Update form state
  const updateFormState = (
    index: number,
    updates: Partial<ReminderFormState>,
  ) => {
    const updatedForms = [...reminderForms]
    updatedForms[index] = { ...updatedForms[index], ...updates }
    setReminderForms(updatedForms)
  }

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Validate all forms
      const errors: Record<number, Record<string, string>> = {}
      for (let i = 0; i < reminderForms.length; i++) {
        const formErrors = await validateFormValues(reminderForms[i].formValues)
        if (Object.keys(formErrors).length > 0) {
          errors[i] = formErrors
        }
      }

      setFormErrors(errors)
      if (Object.keys(errors).length > 0) {
        showError('กรุณากรอกข้อมูลให้ครบถ้วน')
        return
      }

      // Prepare submit data for all forms
      const submitDataArray: any[] = []

      for (let i = 0; i < reminderForms.length; i++) {
        const form = reminderForms[i]
        const values = form.formValues

        // Check vaccination validation
        const isVaccinationCategory = values.categoryName === 'Vaccination'
        const currentPet = activePets.find((p) => p.id === values.petId)
        const canUseVaccineSchedule =
          currentPet &&
          (currentPet.species?.includes('สุนัข') ||
            currentPet.species?.includes('แมว')) &&
          !!currentPet.age

        if (isVaccinationCategory && canUseVaccineSchedule) {
          if (form.doses.length === 0 || !form.doses[0].date) {
            showError(`กรุณากรอกข้อมูลวัคซีนให้ครบถ้วน (แบบฟอร์มที่ ${i + 1})`)
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

        // Handle recurrence
        if (form.recurrenceRule && form.recurrenceRule.type !== 'none') {
          const backendRecurrence = convertToBackendRecurrence(
            form.recurrenceRule,
          )
          if (backendRecurrence) {
            submitData.recurrence = backendRecurrence
          }
        }

        // Handle vaccination children
        if (
          isVaccinationCategory &&
          canUseVaccineSchedule &&
          form.doses.length > 0
        ) {
          const doneChildReminderIds = new Set(
            form.initialChildReminders
              .filter((child) => child.reminderStatus === 'done')
              .map((child) => child.id),
          )

          const syncedDoses = form.doses.map((dose) =>
            dose.doseNumber === 1
              ? { ...dose, date: values.reminderDate }
              : dose,
          )

          const children: any[] = syncedDoses
            .filter((dose) => {
              if (
                dose.childReminderId &&
                doneChildReminderIds.has(dose.childReminderId)
              ) {
                return false
              }
              return true
            })
            .map((dose) => {
              const childData: any = {
                reminderName: form.customVaccineName
                  ? `${form.customVaccineName} เข็มที่ ${dose.doseNumber}`
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

          if (isEditMode && form.initialChildReminders.length > 0) {
            const currentChildIds = syncedDoses
              .map((dose) => dose.childReminderId)
              .filter((id) => !!id)
            const calculatedChildrenToDelete = form.initialChildReminders
              .filter((child) => !currentChildIds.includes(child.id))
              .map((child) => child.id)

            const allChildrenToDelete = [
              ...new Set([
                ...calculatedChildrenToDelete,
                ...form.childrenToDelete,
              ]),
            ]

            if (allChildrenToDelete.length > 0) {
              submitData.childrenToDelete = allChildrenToDelete
            }
          } else if (form.childrenToDelete.length > 0) {
            submitData.childrenToDelete = form.childrenToDelete
          }
        } else if (isEditMode && form.childrenToDelete.length > 0) {
          submitData.childrenToDelete = form.childrenToDelete
        }

        submitDataArray.push(submitData)
      }

      apiSuccessRef.current = false

      // Use batch API if multiple forms, single API if one form
      if (submitDataArray.length > 1) {
        await createBatchRemindersApi.execute(submitDataArray)
      } else if (isEditMode && reminderId) {
        await updateReminderApi.execute(reminderId, submitDataArray[0])
      } else {
        await createReminderApi.execute(submitDataArray[0])
      }

      // Reset on success
      if (apiSuccessRef.current) {
        initializeNewForm()
      }
    } catch (error) {
      console.error('Submit error:', error)
      showError('เกิดข้อผิดพลาดในการสร้างเตือนความจำ')
    }
  }

  // Confirm discard changes
  const confirmBack = () => {
    setShowDiscardModal(false)
    setReminderForms([])
    router.back()
  }

  // Handle back navigation with dirty check
  const handleBack = () => {
    const hasChanges = reminderForms.some((form) => {
      // Check if form has actual data
      return (
        form.formValues.reminderName ||
        form.formValues.reminderDate ||
        form.formValues.reminderTime ||
        form.doses.length > 0
      )
    })

    if (hasChanges) {
      setShowDiscardModal(true)
    } else {
      setReminderForms([])
      router.back()
    }
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
  }, [reminderForms])

  // Loading state
  const isLoading =
    isEditMode && reminderForms.length > 0 && reminderForms[0].loadingReminder
  const isSubmitting =
    createReminderApi.loading ||
    updateReminderApi.loading ||
    createBatchRemindersApi.loading

  // Render form template
  const renderFormTemplate = (formIndex: number) => {
    const form = reminderForms[formIndex]
    if (!form) return null

    const values = form.formValues
    const currentPet = activePets.find((p) => p.id === values.petId)

    const isSamePetType = (
      species1: string | null,
      species2: string | null,
    ): boolean => {
      if (!species1 || !species2) return false
      const petTypes = ['สุนัข', 'แมว', 'นก', 'กระต่าย']
      for (const type of petTypes) {
        if (species1.includes(type) && species2.includes(type)) {
          return true
        }
      }
      return false
    }

    const canUseVaccineSchedule =
      currentPet &&
      (currentPet.species?.includes('สุนัข') ||
        currentPet.species?.includes('แมว')) &&
      !!currentPet.age

    const isVaccinationCategory = values.categoryName === 'Vaccination'
    const allDosesHaveDates =
      form.doses.length > 0 && form.doses.every((d) => !!d.date)
    const canSubmit =
      values.reminderName &&
      values.reminderDate &&
      (isVaccinationCategory && canUseVaccineSchedule
        ? allDosesHaveDates
        : true)

    const doneChildReminderIds = new Set(
      form.initialChildReminders
        .filter((child) => child.reminderStatus === 'done')
        .map((child) => child.id),
    )
    const hasDoneChildren = doneChildReminderIds.size > 0

    const isDose1Done = (() => {
      const dose1 = form.doses.find((d) => d.doseNumber === 1)
      return !!(
        dose1?.childReminderId &&
        doneChildReminderIds.has(dose1.childReminderId)
      )
    })()

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
      const updates: Partial<ReminderFormState> = {
        formValues: { ...values, reminderName: value },
      }

      // Clear duplicate error if exists
      if (form.duplicateError) {
        updates.duplicateError = null
      }

      // Update suggestions
      if (value.trim().length >= 2) {
        const filtered = existingReminders
          .filter((reminder) =>
            reminder.reminderName.toLowerCase().includes(value.toLowerCase()),
          )
          .slice(0, 5)

        updates.suggestions = filtered
        updates.showSuggestions = filtered.length > 0
      } else {
        updates.suggestions = []
        updates.showSuggestions = false
      }

      // Single state update
      updateFormState(formIndex, updates)
    }

    const handleSuggestionSelect = (reminder: IReminder) => {
      const updates: Partial<ReminderFormState> = {
        formValues: {
          ...values,
          reminderName: reminder.reminderName,
          description: reminder.description,
          categoryName: reminder.categoryName || 'General',
          reminderTime: reminder.reminderTime || '',
          reminderDate: reminder.reminderDate || '',
          petId:
            reminder.petId && pets.some((p) => p.id === reminder.petId)
              ? reminder.petId
              : values.petId,
        },
      }

      if (reminder.petId && pets.some((p) => p.id === reminder.petId)) {
        setSelectedPetId(reminder.petId)
      }

      // Handle recurrence
      if (reminder.recurrence) {
        const convertedRecurrence = convertFromBackendRecurrence(
          reminder.recurrence,
        )
        updates.recurrenceRule = convertedRecurrence
      } else {
        updates.recurrenceRule = null
      }

      // Hide suggestions
      updates.showSuggestions = false
      updates.suggestions = []

      // Handle vaccination with children
      if (
        reminder.categoryName === 'Vaccination' &&
        reminder.children &&
        reminder.children.length > 0
      ) {
        updates.vaccineResetKey = form.vaccineResetKey + 1

        const childrenWithDoseNumbers = reminder.children.map((child: any) => {
          const doseMatch = child.reminderName.match(/เข็มที่\s*(\d+)/)
          return {
            ...child,
            extractedDoseNumber: doseMatch ? parseInt(doseMatch[1], 10) : 1,
          }
        })

        const sortedChildren = childrenWithDoseNumbers.sort(
          (a, b) => a.extractedDoseNumber - b.extractedDoseNumber,
        )

        const childrenDoses: IDose[] = sortedChildren.map((child: any) => ({
          doseNumber: child.extractedDoseNumber,
          date: child.reminderDate || '',
          time: child.reminderTime || '',
          isAutoCalculated: child.extractedDoseNumber > 1,
          isEdited: false,
          childReminderId: undefined,
        }))

        const firstChildName = reminder.children[0]?.reminderName || ''
        const nameMatch = firstChildName.match(/(.+?)\s+เข็ม/)

        updates.doses = childrenDoses
        updates.customVaccineName = nameMatch ? nameMatch[1] : ''
        updates.hasUserStartedCreateMode = true
      }

      // Single state update with all changes
      updateFormState(formIndex, updates)
    }

    return (
      <View key={`form-${formIndex}`} style={styles.formCard}>
        {/* Header with buttons - only show on first form */}
        {formIndex === 0 && (
          <View style={styles.cardHeader}>
            <Pressable onPress={handleBack} disabled={isSubmitting}>
              <Text style={styles.cancelText}>ยกเลิก</Text>
            </Pressable>
            <Pressable
              onPress={() => handleSubmit()}
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
                    : `เพิ่ม (${reminderForms.length})`}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Duplicate Error Toast */}
        {form.duplicateError && (
          <View style={styles.duplicateErrorToast}>
            <Text style={styles.duplicateErrorText}>{form.duplicateError}</Text>
            <Pressable
              onPress={() =>
                updateFormState(formIndex, { duplicateError: null })
              }
            >
              <Text style={styles.duplicateErrorDismiss}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* Form title for non-first forms */}
        {formIndex > 0 && (
          <View style={styles.formTitleContainer}>
            <Text style={styles.formTitle}>เตือนความจำที่ {formIndex + 1}</Text>
          </View>
        )}

        <InputText
          value={values.reminderName}
          onChangeText={handleReminderNameChange}
          placeholder='หัวข้อเตือนความจำ'
          title='หัวข้อ'
          required={true}
          error={formErrors[formIndex]?.reminderName}
        />

        <ReminderSuggestions
          suggestions={form.suggestions}
          onSelect={handleSuggestionSelect}
          visible={form.showSuggestions}
        />

        <PetSelector
          pets={activePets}
          selectedPetId={values.petId}
          onSelectPet={(petId: string) => {
            const newPet = activePets.find((p) => p.id === petId)
            const oldPetSpecies = form.originalPetSpecies || currentPet?.species
            const newPetSpecies = newPet?.species

            updateFormState(formIndex, {
              formValues: { ...values, petId },
            })
            setSelectedPetId(petId)

            if (
              isEditMode &&
              !isSamePetType(oldPetSpecies || null, newPetSpecies || null)
            ) {
              const currentChildIds = form.initialChildReminders.map(
                (child) => child.id,
              )
              updateFormState(formIndex, {
                childrenToDelete: currentChildIds,
                doses: [],
                customVaccineName: '',
                loadedVaccineIsCustom: false,
                vaccineResetKey: form.vaccineResetKey + 1,
                initialChildReminders: [],
              })
            }
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
                values.reminderDate ? new Date(values.reminderDate) : undefined
              }
              onChange={(v) => {
                const dateString = convertDateToString(v)
                updateFormState(formIndex, {
                  formValues: { ...values, reminderDate: dateString },
                })
              }}
              error={formErrors[formIndex]?.reminderDate}
              required={true}
              disabled={isDose1Done || isSubmitting}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TimePicker
              title='เวลาที่เตือนความจำ'
              placeholder='เลือกเวลา'
              value={values.reminderTime}
              onChange={(v) => {
                updateFormState(formIndex, {
                  formValues: { ...values, reminderTime: v },
                })
              }}
            />
          </View>
        </View>

        <CategorySelector
          value={values.categoryName}
          onChange={(v) => {
            updateFormState(formIndex, {
              formValues: { ...values, categoryName: v },
            })
          }}
          error={formErrors[formIndex]?.categoryName}
          required={true}
          disabled={hasDoneChildren || isSubmitting}
        />

        {values.reminderDate && values.categoryName !== 'Vaccination' && (
          <>
            <RecurrencePicker
              value={
                form.recurrenceRule || {
                  type: 'none',
                  interval: 1,
                  endType: 'never',
                }
              }
              onChange={(rule) =>
                updateFormState(formIndex, { recurrenceRule: rule })
              }
              reminderDate={
                values.reminderDate ? new Date(values.reminderDate) : undefined
              }
            />

            {form.recurrenceRule && form.recurrenceRule.type !== 'none' && (
              <EndRepeatSelector
                recurrenceRule={form.recurrenceRule}
                onChange={(rule) =>
                  updateFormState(formIndex, { recurrenceRule: rule })
                }
              />
            )}
          </>
        )}

        <VaccineScheduleSection
          key={form.vaccineResetKey}
          isVaccinationCategory={isVaccinationCategory}
          canUseVaccineSchedule={canUseVaccineSchedule || false}
          petId={values.petId}
          reminderDate={values.reminderDate}
          doses={form.doses}
          setDoses={(dosesOrFn) => {
            if (typeof dosesOrFn === 'function') {
              updateFormState(formIndex, { doses: dosesOrFn(form.doses) })
            } else {
              updateFormState(formIndex, { doses: dosesOrFn })
            }
          }}
          onDose1DateChange={(dateString) => {
            updateFormState(formIndex, {
              formValues: { ...values, reminderDate: dateString },
            })
          }}
          onDose1TimeChange={(time) => {
            updateFormState(formIndex, {
              formValues: { ...values, reminderTime: time },
            })
          }}
          onCustomVaccineNameChange={(name) => {
            updateFormState(formIndex, {
              customVaccineName: name,
            })
          }}
          initialVaccineId={null}
          initialVaccineName={
            form.customVaccineName ? form.customVaccineName : undefined
          }
          isEditMode={isEditMode}
          initialCustomDoseCount={
            isEditMode && form.doses.length > 0 ? form.doses.length : undefined
          }
          doneChildReminderIds={doneChildReminderIds}
          onCustomDosesGenerated={() =>
            updateFormState(formIndex, { hasUserStartedCreateMode: true })
          }
        />

        <View>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder='รายละเอียดอื่นๆ'
            multiline
            numberOfLines={4}
            value={values.description}
            onChangeText={(text) => {
              updateFormState(formIndex, {
                formValues: { ...values, description: text },
              })
            }}
            editable={!isSubmitting}
          />
          {formErrors[formIndex]?.description && (
            <Text style={styles.errorText}>
              {formErrors[formIndex]?.description}
            </Text>
          )}
        </View>

        {/* Delete button for non-first forms */}
        {formIndex > 0 && (
          <Pressable
            onPress={() => deleteForm(formIndex)}
            disabled={isSubmitting}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>ลบ</Text>
          </Pressable>
        )}
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>กำลังโหลด...</Text>
      </View>
    )
  }

  if (reminderForms.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text>กำลังเตรียม...</Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
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
            {/* Render all forms */}
            {reminderForms.map((_, index) => renderFormTemplate(index))}

            {/* Plus button to add new form (only in create mode) */}
            {!isEditMode && (
              <View style={styles.addFormButtonContainer}>
                <Pressable
                  onPress={addNewForm}
                  disabled={isSubmitting}
                  style={styles.addFormButton}
                >
                  <Text style={styles.addFormButtonText}>
                    + เพิ่มเตือนความจำ
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <DiscardChangesModal
        visible={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onDiscard={confirmBack}
        variant='reminder'
      />
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
    marginBottom: 16,
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
    color: '#BF1737',
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
  duplicateErrorToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  duplicateErrorText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#B91C1C',
    flex: 1,
  },
  duplicateErrorDismiss: {
    fontSize: 16,
    color: '#B91C1C',
    paddingLeft: 8,
  },
  formTitleContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  formTitle: {
    fontSize: 16,
    fontFamily: 'Prompt_600SemiBold',
    color: '#225877',
  },
  deleteButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_600SemiBold',
    color: '#B91C1C',
  },
  addFormButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  addFormButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#90CAF9',
    borderRadius: 8,
    alignItems: 'center',
  },
  addFormButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_600SemiBold',
    color: '#2E759E',
  },
})
