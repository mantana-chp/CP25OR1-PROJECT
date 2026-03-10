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

// Type for a single reminder form's complete state
interface ReminderFormState {
  id: string // Unique identifier for this form instance
  doses: IDose[]
  customVaccineName: string
  vaccineResetKey: number
  initialReminderData: IReminder | null
  loadingReminder: boolean
  loadedVaccineIsCustom: boolean
  initialChildReminders: any[]
  recurrenceRule: IRecurrenceRule | null
  childrenToDelete: string[]
  duplicateError: string | null
  suggestions: IReminder[]
  showSuggestions: boolean
  originalPetSpecies: string | null
  // Form values stored separately - formik instance stored in ref
  reminderName: string
  description: string
  reminderDate: string
  reminderTime: string
  categoryName: string
  petId: string
  reminderStatus: string
  errors: Record<string, any>
  touched: Record<string, any>
  dirty: boolean
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

  const [reminderForms, setReminderForms] = useState<ReminderFormState[]>([])
  const [existingReminders, setExistingReminders] = useState<IReminder[]>([])
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [hasUserStartedCreateMode, setHasUserStartedCreateMode] =
    useState(false)
  const apiSuccessRef = useRef(false)
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

  const isSubmitting =
    createReminderApi.loading ||
    createBatchRemindersApi.loading ||
    updateReminderApi.loading

  // Initialize form on page focus (create mode) or load reminder (edit mode)
  useFocusEffect(
    useCallback(() => {
      if (isEditMode && reminderId) {
        // Edit mode: load the specific reminder
        const loadReminderData = async () => {
          try {
            const response = await reminderService.getReminderById(reminderId)
            const reminderData = response.data
            if (reminderData) {
              const formattedReminderData = {
                ...reminderData,
                reminderTime: (reminderData.reminderTime || '').substring(0, 5),
              }

              const originalPet = pets.find((p) => p.id === reminderData.petId)
              const originalSpecies = originalPet?.species || null

              let childrenDoses: IDose[] = []
              let vaccineName = ''
              let loadedCustom = false

              if (reminderData.children && reminderData.children.length > 0) {
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

                childrenDoses = sortedChildren.map((child: any) => ({
                  doseNumber: child.extractedDoseNumber,
                  date: child.reminderDate || '',
                  time: (child.reminderTime || '').substring(0, 5),
                  isAutoCalculated: child.extractedDoseNumber > 1,
                  isEdited: child.extractedDoseNumber > 1,
                  childReminderId: child.id,
                }))

                const firstChildName =
                  reminderData.children[0]?.reminderName || ''
                const nameMatch = firstChildName.match(/(.+?)\s+เข็ม/)
                if (nameMatch) {
                  vaccineName = nameMatch[1]
                  loadedCustom = true
                }
              }

              let convertedRecurrence: IRecurrenceRule | null = null
              if (reminderData.recurrence) {
                convertedRecurrence = convertFromBackendRecurrence(
                  reminderData.recurrence,
                )
              }

              // Create a single form with the loaded data
              const editForm: ReminderFormState = {
                id: generateUUID(),
                reminderName: formattedReminderData.reminderName,
                description: formattedReminderData.description,
                reminderDate: formattedReminderData.reminderDate,
                reminderTime: formattedReminderData.reminderTime,
                categoryName: formattedReminderData.categoryName,
                petId: formattedReminderData.petId,
                reminderStatus: formattedReminderData.reminderStatus,
                doses: childrenDoses,
                customVaccineName: vaccineName,
                vaccineResetKey: 0,
                initialReminderData: formattedReminderData,
                loadingReminder: false,
                loadedVaccineIsCustom: loadedCustom,
                initialChildReminders: reminderData.children || [],
                recurrenceRule: convertedRecurrence,
                childrenToDelete: [],
                duplicateError: null,
                suggestions: [],
                showSuggestions: false,
                originalPetSpecies: originalSpecies,
                errors: {},
                touched: {},
                dirty: false,
              }

              setReminderForms([editForm])
            }
          } catch (error) {
            showError('ไม่สามารถโหลดข้อมูลเตือนความจำได้')
          }
        }
        loadReminderData()
      } else {
        const firstForm = createEmptyFormState()
        setReminderForms([firstForm])
      }
    }, [isEditMode, reminderId, pets]),
  )

  // Helper function to create a new empty form state (without formik)
  const createEmptyFormState = (petId?: string): ReminderFormState => {
    return {
      id: generateUUID(),
      doses: [],
      customVaccineName: '',
      vaccineResetKey: 0,
      initialReminderData: null,
      loadingReminder: false,
      loadedVaccineIsCustom: false,
      initialChildReminders: [],
      recurrenceRule: null,
      childrenToDelete: [],
      duplicateError: null,
      suggestions: [],
      showSuggestions: false,
      originalPetSpecies: null,
      reminderName: '',
      description: '',
      reminderDate: '',
      reminderTime: '',
      categoryName: 'General',
      petId: petId || getFirstPetId(),
      reminderStatus: 'to_do',
      errors: {},
      touched: {},
      dirty: false,
    }
  }

  // Validate form data using Yup schema directly
  const validateFormData = async (formData: any) => {
    try {
      await reminderValidationSchema.validate(formData, { abortEarly: false })
      return {}
    } catch (error: any) {
      const errors: Record<string, string> = {}
      if (error.inner && Array.isArray(error.inner)) {
        error.inner.forEach((err: any) => {
          if (err.path) {
            errors[err.path] = err.message
          }
        })
      }
      return errors
    }
  }

  // Generate unique ID for form instances
  const generateUUID = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Update a specific form's state
  const updateFormState = (
    formId: string,
    updateFn: (form: ReminderFormState) => ReminderFormState,
  ) => {
    setReminderForms((prev) =>
      prev.map((form) => (form.id === formId ? updateFn(form) : form)),
    )
  }

  // Add a new form
  const addNewReminderForm = () => {
    const newForm = createEmptyFormState()
    setReminderForms((prev) => [...prev, newForm])
  }

  // Delete a specific form
  const deleteReminderForm = (formId: string) => {
    setReminderForms((prev) => prev.filter((form) => form.id !== formId))
  }

  // Helper function for handling back
  const handleBack = () => {
    const hasAnyDirtyForm = reminderForms.some((form) => form.dirty)
    if (hasAnyDirtyForm) {
      setShowDiscardModal(true)
    } else {
      confirmBack()
    }
  }

  const confirmBack = () => {
    setShowDiscardModal(false)
    setReminderForms([])
    setExistingReminders([])
    setHasUserStartedCreateMode(false)
    router.back()
  }

  // Helper function to get helper values for a specific form
  const getFormHelpers = (form: ReminderFormState) => {
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

    const currentPet = pets.find((p) => p.id === form.petId)

    const canUseVaccineSchedule =
      currentPet &&
      (currentPet.species?.includes('สุนัข') ||
        currentPet.species?.includes('แมว')) &&
      !!currentPet.age

    const isVaccinationCategory = form.categoryName === 'Vaccination'
    const allDosesHaveDates =
      form.doses.length > 0 && form.doses.every((d) => !!d.date)
    const canSubmitForm =
      form.reminderName &&
      form.reminderDate &&
      (isVaccinationCategory && canUseVaccineSchedule
        ? allDosesHaveDates
        : true)

    return {
      doneChildReminderIds,
      hasDoneChildren,
      isDose1Done,
      currentPet,
      canUseVaccineSchedule,
      isVaccinationCategory,
      allDosesHaveDates,
      canSubmitForm,
    }
  }

  // Handle reminder name change for a specific form
  const handleReminderNameChange = (formId: string, value: string) => {
    updateFormState(formId, (form) => {
      if (value.trim().length >= 2) {
        const filtered = existingReminders
          .filter((reminder) =>
            reminder.reminderName.toLowerCase().includes(value.toLowerCase()),
          )
          .slice(0, 5)

        return {
          ...form,
          reminderName: value,
          suggestions: filtered,
          showSuggestions: filtered.length > 0,
          duplicateError: null,
        }
      } else {
        return {
          ...form,
          reminderName: value,
          suggestions: [],
          showSuggestions: false,
        }
      }
    })
  }

  // Handle suggestion selection for a specific form
  const handleSuggestionSelect = (formId: string, reminder: IReminder) => {
    updateFormState(formId, (form) => {
      if (reminder.petId && pets.some((p) => p.id === reminder.petId)) {
        setSelectedPetId(reminder.petId)
      }

      let convertedRecurrence: IRecurrenceRule | null = null
      if (reminder.recurrence) {
        convertedRecurrence = convertFromBackendRecurrence(reminder.recurrence)
      }

      let childrenDoses: IDose[] = []
      let vaccineName = ''

      if (
        reminder.categoryName === 'Vaccination' &&
        reminder.children &&
        reminder.children.length > 0
      ) {
        const childrenWithDoseNumbers = reminder.children.map((child: any) => {
          const doseMatch = child.reminderName.match(/เข็มที่\s*(\d+)/)
          const doseNumber = doseMatch ? parseInt(doseMatch[1], 10) : 0
          return { ...child, extractedDoseNumber: doseNumber }
        })

        const sortedChildren = childrenWithDoseNumbers.sort(
          (a, b) => a.extractedDoseNumber - b.extractedDoseNumber,
        )

        childrenDoses = sortedChildren.map((child: any) => ({
          doseNumber: child.extractedDoseNumber,
          date: child.reminderDate || '',
          time: child.reminderTime || '',
          isAutoCalculated: child.extractedDoseNumber > 1,
          isEdited: false,
          childReminderId: undefined,
        }))

        const firstChildName = reminder.children[0]?.reminderName || ''
        const nameMatch = firstChildName.match(/(.+?)\s+เข็ม/)
        if (nameMatch) {
          vaccineName = nameMatch[1]
        }
      }

      return {
        ...form,
        reminderName: reminder.reminderName,
        description: reminder.description,
        categoryName: reminder.categoryName || 'General',
        reminderTime: reminder.reminderTime || '',
        reminderDate: reminder.reminderDate || '',
        petId: reminder.petId || form.petId,
        suggestions: [],
        showSuggestions: false,
        recurrenceRule: convertedRecurrence,
        doses: childrenDoses,
        customVaccineName: vaccineName,
        vaccineResetKey: form.vaccineResetKey + 1,
      }
    })
  }

  // Handle pet selection for a specific form
  const handlePetSelect = (formId: string, petId: string) => {
    const form = reminderForms.find((f) => f.id === formId)
    if (!form) return

    const newPet = activePets.find((p) => p.id === petId)
    const oldPetSpecies = form.originalPetSpecies || form.petId

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

    updateFormState(formId, (f) => {
      if (
        isEditMode &&
        !isSamePetType(oldPetSpecies || null, newPet?.species || null)
      ) {
        return {
          ...f,
          petId,
          childrenToDelete: f.initialChildReminders.map((child) => child.id),
          doses: [],
          customVaccineName: '',
          loadedVaccineIsCustom: false,
          vaccineResetKey: f.vaccineResetKey + 1,
          initialChildReminders: [],
        }
      }
      return {
        ...f,
        petId,
      }
    })

    setSelectedPetId(petId)
  }

  // Prepare form data for submission
  const prepareFormDataForSubmission = async (
    form: ReminderFormState,
    formIndex: number,
  ): Promise<any> => {
    const formDataToValidate = {
      reminderName: form.reminderName,
      description: form.description,
      reminderDate: form.reminderDate,
      reminderTime: form.reminderTime || '',
      categoryName: form.categoryName || 'General',
      petId: form.petId,
    }

    const errors = await validateFormData(formDataToValidate)

    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.entries(errors)
        .map(([field, error]) => error)
        .join('\n')
      throw new Error(errorMessages || 'กรุณากรอกข้อมูลให้ครบถ้วน')
    }

    const helpers = getFormHelpers(form)

    if (form.categoryName === 'Vaccination' && helpers.canUseVaccineSchedule) {
      if (form.doses.length === 0 || !form.doses[0].date) {
        throw new Error('กรุณากรอกข้อมูลวัคซีนให้ครบถ้วน')
      }
    }

    let submitData: any = {
      reminderName: form.reminderName,
      description: form.description,
      reminderDate: form.reminderDate,
      reminderTime: form.reminderTime || '',
      categoryName: form.categoryName || 'General',
      petId: form.petId,
    }

    if (form.recurrenceRule && form.recurrenceRule.type !== 'none') {
      const backendRecurrence = convertToBackendRecurrence(form.recurrenceRule)
      if (backendRecurrence) {
        submitData.recurrence = backendRecurrence
      }
    } else if (isEditMode && form.initialReminderData?.recurrence) {
      submitData.recurrence = null
    }

    if (
      form.categoryName === 'Vaccination' &&
      helpers.canUseVaccineSchedule &&
      form.doses.length > 0
    ) {
      const syncedDoses = form.doses.map((dose) =>
        dose.doseNumber === 1 ? { ...dose, date: form.reminderDate } : dose,
      )
      const children: any[] = syncedDoses
        .filter((dose) => {
          if (
            dose.childReminderId &&
            helpers.doneChildReminderIds.has(dose.childReminderId)
          ) {
            return false
          }
          return true
        })
        .map((dose, index) => {
          const childData: any = {
            reminderName: form.customVaccineName
              ? `${form.customVaccineName} เข็มที่ ${dose.doseNumber}`
              : `วัคซีน เข็มที่ ${dose.doseNumber}`,
            description: form.description,
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
          ...new Set([...calculatedChildrenToDelete, ...form.childrenToDelete]),
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

    return submitData
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (isEditMode && reminderId && reminderForms.length > 0) {
      // Edit mode - update single reminder
      const form = reminderForms[0]
      try {
        const submitData = await prepareFormDataForSubmission(form, 0)
        apiSuccessRef.current = false
        await updateReminderApi.execute(reminderId, submitData)
      } catch (error: any) {
        showError(error.message || 'เกิดข้อผิดพลาด')
      }
    } else if (reminderForms.length === 1) {
      // Create single reminder
      const form = reminderForms[0]
      try {
        const submitData = await prepareFormDataForSubmission(form, 0)
        apiSuccessRef.current = false
        await createReminderApi.execute(submitData)
      } catch (error: any) {
        showError(error.message || 'เกิดข้อผิดพลาด')
      }
    } else {
      // Create multiple reminders using batch API
      try {
        const submitDataArray = await Promise.all(
          reminderForms.map((form, index) =>
            prepareFormDataForSubmission(form, index),
          ),
        )
        apiSuccessRef.current = false
        await createBatchRemindersApi.execute(submitDataArray)
      } catch (error: any) {
        showError(error.message || 'เกิดข้อผิดพลาด')
      }
    }
  }

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

  // Render a single form
  const renderReminderForm = (form: ReminderFormState, index: number) => {
    const helpers = getFormHelpers(form)
    const isFirstForm = index === 0
    const isLastForm = index === reminderForms.length - 1

    return (
      <View key={form.id} style={styles.formCard}>
        {isFirstForm && (
          <View style={styles.cardHeader}>
            <Pressable onPress={handleBack} disabled={isSubmitting}>
              <Text style={styles.cancelText}>ยกเลิก</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!helpers.canSubmitForm || isSubmitting}
            >
              <Text
                style={[
                  styles.addText,
                  (!helpers.canSubmitForm || isSubmitting) &&
                    styles.submittingText,
                ]}
              >
                {isSubmitting
                  ? isEditMode
                    ? 'กำลังแก้ไข...'
                    : 'กำลังเพิ่ม...'
                  : isEditMode
                    ? 'บันทึก'
                    : `เพิ่ม (${reminderForms.length})`}
              </Text>
            </Pressable>
          </View>
        )}

        {form.duplicateError && (
          <View style={styles.duplicateErrorToast}>
            <Text style={styles.duplicateErrorText}>{form.duplicateError}</Text>
            <Pressable
              onPress={() =>
                updateFormState(form.id, (f) => ({
                  ...f,
                  duplicateError: null,
                }))
              }
            >
              <Text style={styles.duplicateErrorDismiss}>✕</Text>
            </Pressable>
          </View>
        )}

        <InputText
          value={form.reminderName}
          onChangeText={(value) => handleReminderNameChange(form.id, value)}
          placeholder='หัวข้อเตือนความจำ'
          title='หัวข้อ'
          required={true}
          error={form.errors?.reminderName}
        />

        <ReminderSuggestions
          suggestions={form.suggestions}
          onSelect={(reminder) => handleSuggestionSelect(form.id, reminder)}
          visible={form.showSuggestions}
        />

        <PetSelector
          pets={activePets}
          selectedPetId={form.petId}
          onSelectPet={(petId: string) => handlePetSelect(form.id, petId)}
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
                form.reminderDate ? new Date(form.reminderDate) : undefined
              }
              onChange={(v) => {
                const dateString = convertDateToString(v)
                updateFormState(form.id, (f) => ({
                  ...f,
                  reminderDate: dateString,
                }))
              }}
              error={form.errors?.reminderDate}
              required={true}
              disabled={helpers.isDose1Done || isSubmitting}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TimePicker
              title='เวลาที่เตือนความจำ'
              placeholder='เลือกเวลา'
              value={form.reminderTime}
              onChange={(v) =>
                updateFormState(form.id, (f) => ({
                  ...f,
                  reminderTime: v,
                }))
              }
            />
          </View>
        </View>

        <CategorySelector
          value={form.categoryName}
          onChange={(v) =>
            updateFormState(form.id, (f) => ({
              ...f,
              categoryName: v,
            }))
          }
          error={form.errors?.categoryName}
          required={true}
          disabled={helpers.hasDoneChildren || isSubmitting}
        />

        {form.reminderDate && form.categoryName !== 'Vaccination' && (
          <View>
            <RecurrencePicker
              value={
                form.recurrenceRule || {
                  type: 'none',
                  interval: 1,
                  endType: 'never',
                }
              }
              onChange={(rule) =>
                updateFormState(form.id, (f) => ({
                  ...f,
                  recurrenceRule: rule,
                }))
              }
            />
            {form.recurrenceRule && form.recurrenceRule.type !== 'none' && (
              <EndRepeatSelector
                recurrenceRule={form.recurrenceRule}
                onChange={(updatedRule: IRecurrenceRule) =>
                  updateFormState(form.id, (f) => ({
                    ...f,
                    recurrenceRule: updatedRule,
                  }))
                }
              />
            )}
          </View>
        )}

        <VaccineScheduleSection
          key={form.vaccineResetKey}
          isVaccinationCategory={helpers.isVaccinationCategory}
          canUseVaccineSchedule={helpers.canUseVaccineSchedule || false}
          petId={form.petId}
          reminderDate={form.reminderDate}
          doses={form.doses}
          setDoses={(newDoses) => {
            if (typeof newDoses === 'function') {
              updateFormState(form.id, (f) => ({
                ...f,
                doses: newDoses(f.doses),
              }))
            } else {
              updateFormState(form.id, (f) => ({
                ...f,
                doses: newDoses,
              }))
            }
          }}
          onDose1DateChange={(dateString) => {
            updateFormState(form.id, (f) => ({
              ...f,
              reminderDate: dateString,
            }))
          }}
          onDose1TimeChange={(time) => {
            updateFormState(form.id, (f) => ({
              ...f,
              reminderTime: time,
            }))
          }}
          onCustomVaccineNameChange={(name) =>
            updateFormState(form.id, (f) => ({
              ...f,
              customVaccineName: name,
            }))
          }
          initialVaccineId={null}
          initialVaccineName={
            form.customVaccineName ? form.customVaccineName : undefined
          }
          isEditMode={isEditMode}
          initialCustomDoseCount={
            isEditMode && form.doses.length > 0 ? form.doses.length : undefined
          }
          doneChildReminderIds={helpers.doneChildReminderIds}
          onCustomDosesGenerated={() => setHasUserStartedCreateMode(true)}
        />

        <View>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder='รายละเอียดอื่นๆ'
            multiline
            numberOfLines={4}
            value={form.description}
            onChangeText={(value) =>
              updateFormState(form.id, (f) => ({
                ...f,
                description: value,
              }))
            }
            editable={!isSubmitting}
          />
        </View>

        {!isFirstForm && (
          <Pressable
            style={styles.deleteFormButton}
            onPress={() => deleteReminderForm(form.id)}
            disabled={isSubmitting}
          >
            <Text style={styles.deleteFormButtonText}>ลบ</Text>
          </Pressable>
        )}
      </View>
    )
  }

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

  // Set pet from params (create mode only)
  useEffect(() => {
    if (!isEditMode && petIdFromParams && reminderForms.length > 0) {
      const firstForm = reminderForms[0]
      updateFormState(firstForm.id, (form) => ({
        ...form,
        petId: petIdFromParams,
      }))
    }
  }, [petIdFromParams, isEditMode])

  // Set pet from selected or active (create mode only)
  useEffect(() => {
    if (!isEditMode && reminderForms.length > 0) {
      const firstForm = reminderForms[0]
      let petIdToSet = firstForm.petId

      if (petIdFromParams) {
        petIdToSet = petIdFromParams
      } else if (selectedPetId) {
        petIdToSet = selectedPetId
      } else if (activePets.length > 0) {
        petIdToSet = activePets[0].id
      }

      if (petIdToSet !== firstForm.petId) {
        updateFormState(firstForm.id, (form) => ({
          ...form,
          petId: petIdToSet,
        }))
      }
    }
  }, [petIdFromParams, selectedPetId, activePets, isEditMode])

  // Handle form dirty state for back button
  useEffect(() => {
    const hasAnyDirtyForm = reminderForms.some((form) => form.dirty)
    const handleBackPress = () => {
      if (hasAnyDirtyForm) {
        setShowDiscardModal(true)
      } else {
        handleBack()
      }
      return true
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    )

    return () => backHandler.remove()
  }, [reminderForms])

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
            {reminderForms.map((form, index) =>
              renderReminderForm(form, index),
            )}

            {!isEditMode && (
              <Pressable
                style={styles.addFormButton}
                onPress={addNewReminderForm}
                disabled={isSubmitting}
              >
                <Text style={styles.addFormButtonText}>
                  + เพิ่มเตือนความจำรายการอื่น
                </Text>
              </Pressable>
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
  addFormButton: {
    margin: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#E3F2FD',
    borderWidth: 1.5,
    borderColor: '#2E759E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFormButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#2E759E',
  },
  deleteFormButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteFormButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#DC2626',
  },
})
