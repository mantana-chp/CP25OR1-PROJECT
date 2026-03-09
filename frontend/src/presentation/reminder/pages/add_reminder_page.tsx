import { useFocusEffect, useRouter } from 'expo-router'
import { useFormik } from 'formik'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import {
  IRecurrenceRule,
  IReminder,
  reminderInitValue,
  reminderValidationSchema
} from '@/src/domain/reminder.domain'
import { IDose } from '@/src/domain/vaccine.domain'
import { useError } from '@/src/presentation/components/error_context'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import {
  convertFromBackendRecurrence,
  convertToBackendRecurrence
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
  View
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
import AttachmentManager from '../components/attachment_manager'
import { useReminderAttachments } from '@/src/hooks/useReminderAttachments'

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
    null
  )
  const [existingReminders, setExistingReminders] = useState<IReminder[]>([])
  const [suggestions, setSuggestions] = useState<IReminder[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [hasUserStartedCreateMode, setHasUserStartedCreateMode] =
    useState(false)
  const [originalPetSpecies, setOriginalPetSpecies] = useState<string | null>(
    null
  )
  const [childrenToDelete, setChildrenToDelete] = useState<string[]>([])
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([])
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)
  const apiSuccessRef = useRef(false)

  // Pet selection state (supports single or multiple pets)
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([])

  const doneChildReminderIds = new Set(
    initialChildReminders
      .filter((child) => child.reminderStatus === 'done')
      .map((child) => child.id)
  )

  // Attachment management hook
  const {
    attachments,
    pendingAttachments: hookPendingAttachments,
    isLoading: isLoadingAttachments,
    isUploading: isUploadingAttachment,
    isCreateMode,
    addAttachment: hookAddAttachment,
    deleteAttachment: hookDeleteAttachment,
    downloadAttachment,
    uploadPendingAttachments
  } = useReminderAttachments({
    reminderId: reminderId || '',
    initialAttachments: initialReminderData?.attachments || [],
    onAttachmentsChange: () => {
      // Optionally refresh data if needed
      console.log('✅ Attachments updated')
    }
  })

  // Attachment handlers that defer changes until form submission
  const handleAddAttachment = async (file: {
    uri: string
    name: string
    size: number
    mimeType: string
  }): Promise<void> => {
    // Always add to Formik's pendingAttachments (both create and edit mode)
    const pendingFile: import('@/src/domain/reminder.domain').IPendingAttachment =
      {
        id: `temp-${Date.now()}-${Math.random()}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.mimeType,
        objectKey: '',
        uri: file.uri,
        isPending: true
      }
    formik.setFieldValue('pendingAttachments', [
      ...(formik.values.pendingAttachments || []),
      pendingFile
    ])
  }

  const handleDeleteAttachment = async (
    attachmentId: string
  ): Promise<void> => {
    // Check if it's a pending attachment (not yet uploaded)
    const isPending = (formik.values.pendingAttachments || []).some(
      (a) => a.id === attachmentId
    )

    if (isPending) {
      // Remove from pendingAttachments
      formik.setFieldValue(
        'pendingAttachments',
        (formik.values.pendingAttachments || []).filter(
          (a) => a.id !== attachmentId
        )
      )
    } else {
      // It's an existing attachment - mark for deletion on submit
      setAttachmentsToDelete((prev) => [...prev, attachmentId])
    }
  }

  const hasDoneChildren = doneChildReminderIds.size > 0

  const isDose1Done = (() => {
    const dose1 = doses.find((d) => d.doseNumber === 1)
    return !!(
      dose1?.childReminderId && doneChildReminderIds.has(dose1.childReminderId)
    )
  })()

  const { pets, activePets, getFirstPetId, selectedPetId, setSelectedPetId } =
    usePets()

  const getRemindersApi = useApi(reminderService.getReminders, {
    showErrorAlert: false
  })

  const createReminderApi = useApi(reminderService.createReminder, {
    showErrorAlert: false,
    onSuccess: async (response) => {
      apiSuccessRef.current = true
      setDuplicateError(null)

      // Upload pending attachments for single-pet creation
      const createdReminderId = response?.data?.[0]?.id
      if (
        createdReminderId &&
        formik.values.pendingAttachments &&
        formik.values.pendingAttachments.length > 0
      ) {
        await uploadPendingAttachments(
          createdReminderId,
          formik.values.pendingAttachments
        )
      }

      router.push('/(tabs)')
    },
    onError: (error) => {
      apiSuccessRef.current = false
      if (error.statusCode === 409) {
        setDuplicateError('เตือนความจำนี้ซ้ำกับที่มีอยู่แล้ว')
      } else {
        showError(error.message || 'ไม่สามารถสร้างเตือนความจำได้')
      }
    }
  })

  const updateReminderApi = useApi(reminderService.updateReminder, {
    showErrorAlert: false,
    onSuccess: async (response) => {
      apiSuccessRef.current = true
      setDuplicateError(null)

      // Process attachment deletions
      if (attachmentsToDelete.length > 0 && reminderId) {
        console.log(
          `🗑️ Deleting ${attachmentsToDelete.length} attachment(s)...`
        )
        for (const attachmentId of attachmentsToDelete) {
          try {
            await hookDeleteAttachment(attachmentId)
          } catch (error) {
            console.error(`Failed to delete attachment ${attachmentId}:`, error)
          }
        }
      }

      // Upload pending attachments if any
      if (
        formik.values.pendingAttachments &&
        formik.values.pendingAttachments.length > 0 &&
        reminderId
      ) {
        console.log('📤 Uploading pending attachments...')
        await uploadPendingAttachments(
          reminderId,
          formik.values.pendingAttachments
        )
      }

      router.push('/(tabs)')
    },
    onError: (error) => {
      apiSuccessRef.current = false
      if (error.statusCode === 409) {
        setDuplicateError('เตือนความจำนี้ซ้ำกับที่มีอยู่แล้ว')
      } else {
        showError(error.message || 'ไม่สามารถแก้ไขเตือนความจำได้')
      }
    }
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
          pendingAttachments: [],
          attachments: initialReminderData.attachments || []
        }
      : {
          ...reminderInitValue({} as IReminder),
          petId: getFirstPetId(),
          pendingAttachments: []
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

      // Build submit data — petId is an array for create (backend supports multi-pet natively)
      let submitData: any = {
        reminderName: values.reminderName,
        description: values.description,
        reminderDate: values.reminderDate,
        reminderTime: values.reminderTime || '',
        categoryName: values.categoryName || 'General',
        petId: isEditMode ? values.petId : selectedPetIds
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
          dose.doseNumber === 1 ? { ...dose, date: values.reminderDate } : dose
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
          .map((dose, index) => {
            const childData: any = {
              reminderName: customVaccineName
                ? `${customVaccineName} เข็มที่ ${dose.doseNumber}`
                : `วัคซีน เข็มที่ ${dose.doseNumber}`,
              description: values.description,
              reminderDate: dose.date,
              reminderTime: dose.time || '',
              categoryName: 'Vaccination'
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
          const calculatedChildrenToDelete = initialChildReminders
            .filter((child) => !currentChildIds.includes(child.id))
            .map((child) => child.id)

          const allChildrenToDelete = [
            ...new Set([...calculatedChildrenToDelete, ...childrenToDelete])
          ]

          if (allChildrenToDelete.length > 0) {
            submitData.childrenToDelete = allChildrenToDelete
          }
        } else if (childrenToDelete.length > 0) {
          submitData.childrenToDelete = childrenToDelete
        }
      } else if (isEditMode && childrenToDelete.length > 0) {
        submitData.childrenToDelete = childrenToDelete
      }

      apiSuccessRef.current = false
      if (isEditMode && reminderId) {
        await updateReminderApi.execute(reminderId, submitData)
      } else {
        await createReminderApi.execute(submitData)
      }

      // Only reset form state on success
      if (apiSuccessRef.current) {
        setDoses([])
        setCustomVaccineName('')
        setInitialChildReminders([])
        setInitialReminderData(null)
        setLoadedVaccineIsCustom(false)
        setVaccineResetKey((prev) => prev + 1)
        setRecurrenceRule(null)
        setHasUserStartedCreateMode(false)
        setChildrenToDelete([])
        setAttachmentsToDelete([])
        setSelectedPetIds([])
        setOriginalPetSpecies(null)
        if (!isEditMode) {
          formik.resetForm()
        }
      }
    }
  })

  const isSubmitting = createReminderApi.loading || updateReminderApi.loading

  const loadReminderData = useCallback(async () => {
    if (isEditMode && reminderId) {
      setLoadingReminder(true)
      try {
        const response = await reminderService.getReminderById(reminderId)
        const reminderData = response.data
        if (reminderData) {
          const formattedReminderData = {
            ...reminderData,
            reminderTime: (reminderData.reminderTime || '').substring(0, 5)
          }
          setInitialReminderData(formattedReminderData)

          if (reminderData.recurrence) {
            const convertedRecurrence = convertFromBackendRecurrence(
              reminderData.recurrence
            )
            setRecurrenceRule(convertedRecurrence)
          }

          if (reminderData.petId) {
            const originalPet = pets.find((p) => p.id === reminderData.petId)
            if (originalPet) {
              setOriginalPetSpecies(originalPet.species)
            }
          }

          if (reminderData.children && reminderData.children.length > 0) {
            setInitialChildReminders(reminderData.children)

            const childrenWithDoseNumbers = reminderData.children.map(
              (child: any) => {
                const doseMatch = child.reminderName.match(/เข็มที่\s*(\d+)/)
                const doseNumber = doseMatch ? parseInt(doseMatch[1], 10) : 0
                return { ...child, extractedDoseNumber: doseNumber }
              }
            )

            const sortedChildren = childrenWithDoseNumbers.sort(
              (a, b) => a.extractedDoseNumber - b.extractedDoseNumber
            )

            const childrenDoses: IDose[] = sortedChildren.map((child: any) => ({
              doseNumber: child.extractedDoseNumber,
              date: child.reminderDate || '',
              time: (child.reminderTime || '').substring(0, 5),
              isAutoCalculated: child.extractedDoseNumber > 1,
              isEdited: child.extractedDoseNumber > 1,
              childReminderId: child.id
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
      setInitialReminderData(null)
      setLoadingReminder(false)
      setLoadedVaccineIsCustom(false)
      setInitialChildReminders([])
      setDoses([])
      setCustomVaccineName('')
      setRecurrenceRule(null)
      setAttachmentsToDelete([])
    }
  }, [isEditMode, reminderId, showError, hasUserStartedCreateMode])

  useEffect(() => {
    if (isEditMode && reminderId) {
      loadReminderData()
    } else if (!isEditMode && !hasUserStartedCreateMode) {
      setInitialReminderData(null)
      setLoadingReminder(false)
      setLoadedVaccineIsCustom(false)
      setInitialChildReminders([])
      setDoses([])
      setCustomVaccineName('')
      setAttachmentsToDelete([])
      setRecurrenceRule(null)
    }
  }, [reminderId, isEditMode])

  useEffect(() => {
    if (!isEditMode && doses.length > 0) {
      setHasUserStartedCreateMode(true)
    }
  }, [doses, isEditMode])

  useFocusEffect(
    useCallback(() => {
      if (
        isEditMode &&
        reminderId &&
        !initialReminderData &&
        !hasUserStartedCreateMode
      ) {
        setLoadingReminder(true)
        reminderService
          .getReminderById(reminderId)
          .then((response) => {
            const reminderData = response.data
            if (reminderData) {
              const formattedReminderData = {
                ...reminderData,
                reminderTime: (reminderData.reminderTime || '').substring(0, 5)
              }
              setInitialReminderData(formattedReminderData)

              if (reminderData.petId) {
                const originalPet = pets.find(
                  (p) => p.id === reminderData.petId
                )
                if (originalPet) {
                  setOriginalPetSpecies(originalPet.species)
                }
              }

              if (reminderData.recurrence) {
                const convertedRecurrence = convertFromBackendRecurrence(
                  reminderData.recurrence
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
                  }
                )

                const sortedChildren = childrenWithDoseNumbers.sort(
                  (a, b) => a.extractedDoseNumber - b.extractedDoseNumber
                )

                const childrenDoses: IDose[] = sortedChildren.map(
                  (child: any) => ({
                    doseNumber: child.extractedDoseNumber,
                    date: child.reminderDate || '',
                    time: (child.reminderTime || '').substring(0, 5),
                    isAutoCalculated: child.extractedDoseNumber > 1,
                    isEdited: child.extractedDoseNumber > 1,
                    childReminderId: child.id
                  })
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
      hasUserStartedCreateMode
    ])
  )

  // Fetch existing reminders for suggestions - refresh on screen focus
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
    }, [])
  )

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
    } else if (activePets.length > 0) {
      formik.setFieldValue('petId', activePets[0].id)
    }
  }, [petIdFromParams, selectedPetId, activePets])

  // Initialize selectedPetIds for create mode
  useEffect(() => {
    if (!isEditMode && selectedPetIds.length === 0 && formik.values.petId) {
      setSelectedPetIds([formik.values.petId])
    }
  }, [isEditMode, formik.values.petId])

  const currentPet = pets.find((p) => p.id === formik.values.petId)

  const canUseVaccineSchedule =
    currentPet &&
    (currentPet.species?.includes('สุนัข') ||
      currentPet.species?.includes('แมว')) &&
    !!currentPet.age

  const isVaccinationCategory = formik.values.categoryName === 'Vaccination'
  const allDosesHaveDates = doses.length > 0 && doses.every((d) => !!d.date)

  // Validation: Check pet selection (use selectedPetIds for create, petId for edit)
  const hasPetSelected = isEditMode
    ? !!formik.values.petId
    : selectedPetIds.length > 0

  const canSubmit =
    formik.values.reminderName &&
    formik.values.reminderDate &&
    hasPetSelected &&
    (isVaccinationCategory && canUseVaccineSchedule ? allDosesHaveDates : true)

  const confirmBack = () => {
    setShowDiscardModal(false)
    setDoses([])
    setCustomVaccineName('')
    setVaccineResetKey((prev) => prev + 1)
    setRecurrenceRule(null)
    setHasUserStartedCreateMode(false)
    setInitialReminderData(null)
    setInitialChildReminders([])
    setLoadedVaccineIsCustom(false)
    setAttachmentsToDelete([])
    setChildrenToDelete([])
    setOriginalPetSpecies(null)
    setSelectedPetIds([])
    formik.resetForm()
    router.back()
  }

  const handleBack = () => {
    if (formik.dirty) {
      setShowDiscardModal(true)
    } else {
      confirmBack()
    }
  }

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBack()
        return true
      }
    )

    return () => backHandler.remove()
  }, [formik.dirty])

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

    // Clear duplicate error when user changes the name
    if (duplicateError) {
      setDuplicateError(null)
    }

    if (value.trim().length >= 2) {
      const filtered = existingReminders
        .filter((reminder) =>
          reminder.reminderName.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5)

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
    formik.setFieldValue('description', reminder.description)
    formik.setFieldValue('categoryName', reminder.categoryName || 'General')
    formik.setFieldValue('reminderTime', reminder.reminderTime || '')
    formik.setFieldValue('reminderDate', reminder.reminderDate || '')

    // Set pet if exists and is valid
    if (reminder.petId && pets.some((p) => p.id === reminder.petId)) {
      formik.setFieldValue('petId', reminder.petId)
      setSelectedPetId(reminder.petId)
    }

    // Set recurrence if exists
    if (reminder.recurrence) {
      const convertedRecurrence = convertFromBackendRecurrence(
        reminder.recurrence
      )
      setRecurrenceRule(convertedRecurrence)
    } else {
      setRecurrenceRule(null)
    }

    // Handle vaccination category with doses
    if (
      reminder.categoryName === 'Vaccination' &&
      reminder.children &&
      reminder.children.length > 0
    ) {
      // Reset vaccine section to force reinitialize with new data
      setVaccineResetKey((prev) => prev + 1)

      const childrenWithDoseNumbers = reminder.children.map((child: any) => {
        const doseMatch = child.reminderName.match(/เข็มที่\s*(\d+)/)
        const doseNumber = doseMatch ? parseInt(doseMatch[1], 10) : 0
        return { ...child, extractedDoseNumber: doseNumber }
      })

      const sortedChildren = childrenWithDoseNumbers.sort(
        (a, b) => a.extractedDoseNumber - b.extractedDoseNumber
      )

      const childrenDoses: IDose[] = sortedChildren.map((child: any) => ({
        doseNumber: child.extractedDoseNumber,
        date: child.reminderDate || '',
        time: child.reminderTime || '',
        isAutoCalculated: child.extractedDoseNumber > 1,
        isEdited: false,
        childReminderId: undefined // New reminder, so no existing child IDs
      }))
      setDoses(childrenDoses)

      const firstChildName = reminder.children[0]?.reminderName || ''
      const nameMatch = firstChildName.match(/(.+?)\s+เข็ม/)
      if (nameMatch) {
        const vaccineName = nameMatch[1]
        setCustomVaccineName(vaccineName)
      }
      setHasUserStartedCreateMode(true)
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
        <View style={styles.safeArea}>
          <Header
            title={isEditMode ? 'แก้ไขเตือนความจำ' : 'เพิ่มเตือนความจำ'}
            goBack={!isSubmitting}
            onBackPress={handleBack}
          />

          <ScrollView
            style={styles.scrollView}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <Pressable
                  onPress={handleBack}
                  disabled={isSubmitting}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.cancelText}>ยกเลิก</Text>
                </Pressable>
                <Pressable
                  onPress={() => formik.handleSubmit()}
                  disabled={!canSubmit || isSubmitting}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text
                    style={[
                      styles.addText,
                      (!canSubmit || isSubmitting) && styles.submittingText
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

              {/* Duplicate Error Toast */}
              {duplicateError && (
                <View style={styles.duplicateErrorToast}>
                  <Text style={styles.duplicateErrorText}>
                    {duplicateError}
                  </Text>
                  <Pressable onPress={() => setDuplicateError(null)}>
                    <Text style={styles.duplicateErrorDismiss}>✕</Text>
                  </Pressable>
                </View>
              )}

              <InputText
                value={formik.values.reminderName}
                onChangeText={handleReminderNameChange}
                placeholder="หัวข้อเตือนความจำ"
                title="หัวข้อ"
                required={true}
                error={formik.errors.reminderName}
              />

              <ReminderSuggestions
                suggestions={suggestions}
                onSelect={handleSuggestionSelect}
                visible={showSuggestions}
              />

              <PetSelector
                pets={activePets}
                selectedPetIds={
                  isEditMode ? [formik.values.petId] : selectedPetIds
                }
                onSelectPets={
                  isEditMode
                    ? undefined // Disable selection in edit mode
                    : (petIds: string[]) => {
                        setSelectedPetIds(petIds)
                        // Update formik petId to first selected pet for validation
                        if (petIds.length > 0) {
                          formik.setFieldValue('petId', petIds[0])
                        }
                        // Clear vaccine schedules if multiple pets selected
                        if (
                          petIds.length > 1 &&
                          formik.values.categoryName === 'Vaccination'
                        ) {
                          formik.setFieldValue('categoryName', 'General')
                          setDoses([])
                          setCustomVaccineName('')
                        }
                      }
                }
                label="สัตว์เลี้ยง"
                required={true}
                disabled={isEditMode || isSubmitting}
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
                    onChange={(v) => {
                      const dateString = convertDateToString(v)
                      formik.setFieldValue('reminderDate', dateString)
                    }}
                    error={formik.errors.reminderDate}
                    required={true}
                    disabled={isDose1Done || isSubmitting}
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
                disabled={hasDoneChildren || isSubmitting}
              />

              {/* Hide recurrence picker if no date selected or if category is Vaccination */}
              {formik.values.reminderDate &&
                formik.values.categoryName !== 'Vaccination' && (
                  <>
                    <RecurrencePicker
                      value={
                        recurrenceRule || {
                          type: 'none',
                          interval: 1,
                          endType: 'never'
                        }
                      }
                      onChange={setRecurrenceRule}
                      reminderDate={
                        formik.values.reminderDate
                          ? new Date(formik.values.reminderDate)
                          : undefined
                      }
                    />

                    {/* End Repeat Section */}
                    {recurrenceRule && recurrenceRule.type !== 'none' && (
                      <EndRepeatSelector
                        recurrenceRule={recurrenceRule}
                        onChange={setRecurrenceRule}
                      />
                    )}
                  </>
                )}

              {/* Vaccine Schedule Section */}
              <VaccineScheduleSection
                key={vaccineResetKey}
                isVaccinationCategory={isVaccinationCategory}
                canUseVaccineSchedule={
                  (canUseVaccineSchedule || false) && selectedPetIds.length <= 1
                }
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
                  customVaccineName ? customVaccineName : undefined
                }
                isEditMode={isEditMode}
                initialCustomDoseCount={
                  isEditMode && doses.length > 0 ? doses.length : undefined
                }
                doneChildReminderIds={doneChildReminderIds}
                onCustomDosesGenerated={() => setHasUserStartedCreateMode(true)}
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
                  <Text style={styles.errorText}>
                    {formik.errors.description}
                  </Text>
                )}
              </View>

              {/* Attachment Manager — disabled in multi-pet create mode */}
              {/* {(isEditMode || selectedPetIds.length <= 1) && ( */}
              <AttachmentManager
                attachments={attachments.filter(
                  (att) => !attachmentsToDelete.includes(att.id)
                )}
                pendingAttachments={formik.values.pendingAttachments || []}
                onAddAttachment={handleAddAttachment}
                onDeleteAttachment={handleDeleteAttachment}
                onDownloadAttachment={downloadAttachment}
                maxFiles={2}
                maxFileSize={10}
                allowedTypes={['application/pdf', 'image/jpeg', 'image/png']}
                disabled={isSubmitting}
                isUploading={isUploadingAttachment}
              />
              {/* )} */}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <DiscardChangesModal
        visible={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onDiscard={confirmBack}
        variant="reminder"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#e5e7eb'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb'
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  scrollView: {
    flex: 1
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
    color: '#6b7280',
    fontSize: 18,
    fontFamily: 'Prompt_400Regular'
  },
  addText: {
    color: '#2E759E',
    fontSize: 18,
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
    color: '#BF1737',
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    marginTop: 4,
    marginLeft: 4
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: 12,
    marginBottom: 12
  },
  row: {
    flexDirection: 'row',
    gap: 8
  },
  label: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 10
  },
  required: {
    color: '#dc2626'
  },
  petSelector: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 12
  },
  petSelectorText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  petDisplay: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    marginBottom: 12
  },
  petDisplayText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  petDropdownMenu: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
    overflow: 'hidden'
  },
  petDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  petDropdownItemSelected: {
    backgroundColor: '#e3f2fd'
  },
  petDropdownItemText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  petDropdownItemTextSelected: {
    color: '#5FA7D1',
    fontFamily: 'Prompt_500Medium'
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
    marginBottom: 12
  },
  duplicateErrorText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#B91C1C',
    flex: 1
  },
  duplicateErrorDismiss: {
    fontSize: 16,
    color: '#B91C1C',
    paddingLeft: 8
  }
})
