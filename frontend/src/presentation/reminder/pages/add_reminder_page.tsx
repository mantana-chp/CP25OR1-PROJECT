import { useFocusEffect, useRouter } from 'expo-router'
import { useFormik } from 'formik'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import {
  IPendingAttachment,
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
import { Plus, Trash2 } from 'lucide-react-native'
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
import AttachmentManager from '../components/attachment_manager'
import { useReminderAttachments } from '@/src/hooks/useReminderAttachments'

type CreateReminderFormSubmitData = {
  reminderName: string
  description: string
  reminderDate: string
  reminderTime: string
  categoryName: string
  petId: string[]
  recurrence?: any
  children?: any[]
}

type CreateReminderFormResult = {
  submitData: CreateReminderFormSubmitData
  pendingAttachments: IPendingAttachment[]
}

type CreateReminderFormHandle = {
  validateAndBuild: () => Promise<CreateReminderFormResult | null>
  isDirty: () => boolean
}

type CreateReminderFormCardProps = {
  index: number
  totalForms: number
  activePets: any[]
  pets: any[]
  existingReminders: IReminder[]
  defaultPetId: string
  isSubmitting: boolean
  showError: (message: string) => void
  onRemove?: () => void
}

const CreateReminderFormCard = React.forwardRef<
  CreateReminderFormHandle,
  CreateReminderFormCardProps
>(
  (
    {
      index,
      totalForms,
      activePets,
      pets,
      existingReminders,
      defaultPetId,
      isSubmitting,
      showError,
      onRemove,
    },
    ref,
  ) => {
    const [doses, setDoses] = useState<IDose[]>([])
    const [customVaccineName, setCustomVaccineName] = useState<string>('')
    const [vaccineResetKey, setVaccineResetKey] = useState<number>(0)
    const [recurrenceRule, setRecurrenceRule] =
      useState<IRecurrenceRule | null>(null)
    const [suggestions, setSuggestions] = useState<IReminder[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedPetIds, setSelectedPetIds] = useState<string[]>(
      defaultPetId ? [defaultPetId] : [],
    )

    const formik = useFormik<IReminder>({
      initialValues: {
        ...reminderInitValue({} as IReminder),
        petId: defaultPetId,
        pendingAttachments: [],
      },
      enableReinitialize: false,
      validationSchema: reminderValidationSchema,
      validateOnBlur: false,
      validateOnChange: false,
      onSubmit: () => undefined,
    })

    useEffect(() => {
      if (!formik.values.petId && defaultPetId) {
        formik.setFieldValue('petId', defaultPetId)
      }
      if (selectedPetIds.length === 0 && defaultPetId) {
        setSelectedPetIds([defaultPetId])
      }
    }, [defaultPetId])

    const currentPet = pets.find((p) => p.id === formik.values.petId)
    const canUseVaccineSchedule =
      currentPet &&
      !currentPet.species?.includes('แฮมสเตอร์') &&
      !!currentPet.age
    const isVaccinationCategory = formik.values.categoryName === 'Vaccination'
    const allDosesHaveDates = doses.length > 0 && doses.every((d) => !!d.date)
    const hasPetSelected = selectedPetIds.length > 0

    const handleReminderNameChange = (value: string) => {
      formik.setFieldValue('reminderName', value)

      if (value.trim().length >= 2) {
        const filtered = existingReminders
          .filter((reminder) =>
            reminder.reminderName.toLowerCase().includes(value.toLowerCase()),
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
      formik.setFieldValue('reminderName', reminder.reminderName)
      formik.setFieldValue('description', reminder.description)
      formik.setFieldValue('categoryName', reminder.categoryName || 'General')
      formik.setFieldValue('reminderTime', reminder.reminderTime || '')
      formik.setFieldValue('reminderDate', reminder.reminderDate || '')

      if (reminder.petId && pets.some((p) => p.id === reminder.petId)) {
        formik.setFieldValue('petId', reminder.petId)
        setSelectedPetIds([reminder.petId])
      }

      if (reminder.recurrence) {
        const convertedRecurrence = convertFromBackendRecurrence(
          reminder.recurrence,
        )
        setRecurrenceRule(convertedRecurrence)
      } else {
        setRecurrenceRule(null)
      }

      if (
        reminder.categoryName === 'Vaccination' &&
        reminder.children &&
        reminder.children.length > 0
      ) {
        setVaccineResetKey((prev) => prev + 1)

        const childrenWithDoseNumbers = reminder.children.map((child: any) => {
          const doseMatch = child.reminderName.match(/เข็มที่\s*(\d+)/)
          const doseNumber = doseMatch ? parseInt(doseMatch[1], 10) : 0
          return { ...child, extractedDoseNumber: doseNumber }
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
        setDoses(childrenDoses)

        const firstChildName = reminder.children[0]?.reminderName || ''
        const nameMatch = firstChildName.match(/(.+?)\s+เข็ม/)
        if (nameMatch) {
          setCustomVaccineName(nameMatch[1])
        }
      }

      setShowSuggestions(false)
      setSuggestions([])
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

    const handleAddAttachment = async (file: {
      uri: string
      name: string
      size: number
      mimeType: string
    }): Promise<void> => {
      const pendingFile: IPendingAttachment = {
        id: `temp-${Date.now()}-${Math.random()}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.mimeType,
        objectKey: '',
        uri: file.uri,
        isPending: true,
      }

      formik.setFieldValue('pendingAttachments', [
        ...(formik.values.pendingAttachments || []),
        pendingFile,
      ])
    }

    const handleDeleteAttachment = async (
      attachmentId: string,
    ): Promise<void> => {
      formik.setFieldValue(
        'pendingAttachments',
        (formik.values.pendingAttachments || []).filter(
          (a) => a.id !== attachmentId,
        ),
      )
    }

    React.useImperativeHandle(
      ref,
      () => ({
        validateAndBuild: async () => {
          const errors = await formik.validateForm()
          if (Object.keys(errors).length > 0) {
            const errorMessages = Object.values(errors).join('\n')
            showError(
              `ฟอร์มที่ ${index + 1}: ${errorMessages || 'กรุณากรอกข้อมูลให้ครบถ้วน'}`,
            )
            return null
          }

          if (!hasPetSelected) {
            showError(`ฟอร์มที่ ${index + 1}: กรุณาเลือกสัตว์เลี้ยง`)
            return null
          }

          if (isVaccinationCategory && canUseVaccineSchedule) {
            if (doses.length === 0 || !doses[0].date) {
              showError(
                `ฟอร์มที่ ${index + 1}: กรุณากรอกข้อมูลวัคซีนให้ครบถ้วน`,
              )
              return null
            }
            if (!allDosesHaveDates) {
              showError(
                `ฟอร์มที่ ${index + 1}: กรุณากรอกวันที่วัคซีนให้ครบทุกเข็ม`,
              )
              return null
            }
          }

          const submitData: CreateReminderFormSubmitData = {
            reminderName: formik.values.reminderName,
            description: formik.values.description,
            reminderDate: formik.values.reminderDate,
            reminderTime: formik.values.reminderTime || '',
            categoryName: formik.values.categoryName || 'General',
            petId: selectedPetIds,
          }

          if (recurrenceRule && recurrenceRule.type !== 'none') {
            const backendRecurrence = convertToBackendRecurrence(recurrenceRule)
            if (backendRecurrence) {
              submitData.recurrence = backendRecurrence
            }
          }

          if (
            formik.values.categoryName === 'Vaccination' &&
            canUseVaccineSchedule &&
            doses.length > 0
          ) {
            const syncedDoses = doses.map((dose) =>
              dose.doseNumber === 1
                ? { ...dose, date: formik.values.reminderDate }
                : dose,
            )

            submitData.children = syncedDoses.map((dose) => ({
              reminderName: customVaccineName
                ? `${customVaccineName} เข็มที่ ${dose.doseNumber}`
                : `วัคซีน เข็มที่ ${dose.doseNumber}`,
              description: formik.values.description,
              reminderDate: dose.date,
              reminderTime: dose.time || '',
              categoryName: 'Vaccination',
            }))
          }

          return {
            submitData,
            pendingAttachments: formik.values.pendingAttachments || [],
          }
        },
        isDirty: () => {
          return (
            formik.dirty ||
            !!customVaccineName ||
            doses.length > 0 ||
            (recurrenceRule?.type || 'none') !== 'none' ||
            (formik.values.pendingAttachments || []).length > 0
          )
        },
      }),
      [
        index,
        formik,
        doses,
        recurrenceRule,
        customVaccineName,
        hasPetSelected,
        canUseVaccineSchedule,
        isVaccinationCategory,
        allDosesHaveDates,
        showError,
      ],
    )

    const doneChildReminderIds = new Set<string>()

    return (
      <>
        {totalForms > 1 && (
          <View style={styles.createFormHeaderRow}>
            <Text style={styles.createFormHeaderText}>
              เตือนความจำที่ {index + 1}
            </Text>
            {onRemove && (
              <Pressable
                onPress={onRemove}
                disabled={isSubmitting}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={18} color='#BF1737' />
              </Pressable>
            )}
          </View>
        )}

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
          pets={activePets}
          selectedPetIds={selectedPetIds}
          onSelectPets={(petIds: string[]) => {
            setSelectedPetIds(petIds)
            if (petIds.length > 0) {
              formik.setFieldValue('petId', petIds[0])
            }
            if (
              petIds.length > 1 &&
              formik.values.categoryName === 'Vaccination'
            ) {
              formik.setFieldValue('categoryName', 'General')
              setDoses([])
              setCustomVaccineName('')
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
              disabled={isSubmitting}
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
          disabled={isSubmitting}
        />

        {formik.values.reminderDate &&
          formik.values.categoryName !== 'Vaccination' && (
            <>
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

              {recurrenceRule && recurrenceRule.type !== 'none' && (
                <EndRepeatSelector
                  recurrenceRule={recurrenceRule}
                  onChange={setRecurrenceRule}
                />
              )}
            </>
          )}

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
          initialVaccineName={customVaccineName ? customVaccineName : undefined}
          isEditMode={false}
          doneChildReminderIds={doneChildReminderIds}
          onCustomDosesGenerated={() => undefined}
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
            <Text style={styles.errorText}>{formik.errors.description}</Text>
          )}
        </View>

        <AttachmentManager
          attachments={[]}
          pendingAttachments={formik.values.pendingAttachments || []}
          onAddAttachment={handleAddAttachment}
          onDeleteAttachment={handleDeleteAttachment}
          onDownloadAttachment={async () => undefined}
          maxFiles={2}
          maxFileSize={10}
          allowedTypes={['application/pdf', 'image/jpeg', 'image/png']}
          disabled={isSubmitting}
          isUploading={false}
        />
      </>
    )
  },
)

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
  const [originalPetSpecies, setOriginalPetSpecies] = useState<string | null>(
    null,
  )
  const [childrenToDelete, setChildrenToDelete] = useState<string[]>([])
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([])
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)
  const apiSuccessRef = useRef(false)
  const createFormIdCounterRef = useRef(1)
  const scrollViewRef = useRef<ScrollView>(null)
  const pendingScrollToFormIdRef = useRef<number | null>(null)
  const createFormRefs = useRef<
    Record<number, CreateReminderFormHandle | null>
  >({})
  const [createFormIds, setCreateFormIds] = useState<number[]>([0])

  const resetCreateModeState = useCallback(() => {
    createFormRefs.current = {}
    const baseFormId = createFormIdCounterRef.current
    createFormIdCounterRef.current += 1
    setCreateFormIds([baseFormId])
    setDuplicateError(null)
    setHasUserStartedCreateMode(false)
    setSelectedPetIds([])
  }, [])

  // Pet selection state (supports single or multiple pets)
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([])

  const doneChildReminderIds = new Set(
    initialChildReminders
      .filter((child) => child.reminderStatus === 'done')
      .map((child) => child.id),
  )

  // Attachment management hook
  const {
    attachments,
    isUploading: isUploadingAttachment,
    deleteAttachment: hookDeleteAttachment,
    downloadAttachment,
    uploadPendingAttachments,
  } = useReminderAttachments({
    reminderId: reminderId || '',
    initialAttachments: initialReminderData?.attachments || [],
    onAttachmentsChange: () => {
      // Optionally refresh data if needed
      console.log('✅ Attachments updated')
    },
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
        isPending: true,
      }
    formik.setFieldValue('pendingAttachments', [
      ...(formik.values.pendingAttachments || []),
      pendingFile,
    ])
  }

  const handleDeleteAttachment = async (
    attachmentId: string,
  ): Promise<void> => {
    // Check if it's a pending attachment (not yet uploaded)
    const isPending = (formik.values.pendingAttachments || []).some(
      (a) => a.id === attachmentId,
    )

    if (isPending) {
      // Remove from pendingAttachments
      formik.setFieldValue(
        'pendingAttachments',
        (formik.values.pendingAttachments || []).filter(
          (a) => a.id !== attachmentId,
        ),
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
    showErrorAlert: false,
  })

  const createReminderApi = useApi(reminderService.createReminder, {
    showErrorAlert: false,
    onSuccess: () => {
      apiSuccessRef.current = true
      setDuplicateError(null)
    },
    onError: (error) => {
      apiSuccessRef.current = false
      if (error.statusCode === 409) {
        setDuplicateError('เตือนความจำนี้ซ้ำกับที่มีอยู่แล้ว')
      } else {
        showError(error.message || 'ไม่สามารถสร้างเตือนความจำได้')
      }
    },
  })

  const createBatchReminderApi = useApi(reminderService.createBatchReminders, {
    showErrorAlert: false,
    onSuccess: () => {
      apiSuccessRef.current = true
      setDuplicateError(null)
    },
    onError: (error) => {
      apiSuccessRef.current = false
      if (error.statusCode === 409) {
        setDuplicateError('มีเตือนความจำซ้ำกับที่มีอยู่แล้ว')
      } else {
        showError(error.message || 'ไม่สามารถสร้างเตือนความจำแบบหลายรายการได้')
      }
    },
  })

  const handleCreateSubmit = async () => {
    const sortedFormIds = [...createFormIds].sort((a, b) => a - b)
    const formResults: CreateReminderFormResult[] = []

    for (const formId of sortedFormIds) {
      const formHandle = createFormRefs.current[formId]
      if (!formHandle) continue
      const result = await formHandle.validateAndBuild()
      if (!result) return
      formResults.push(result)
    }

    if (formResults.length === 0) {
      showError('ไม่พบข้อมูลฟอร์มสำหรับการบันทึก')
      return
    }

    apiSuccessRef.current = false
    setDuplicateError(null)

    if (formResults.length === 1) {
      const submitData = formResults[0].submitData
      const pendingAttachments = formResults[0].pendingAttachments
      const response = await createReminderApi.execute(submitData as any)
      if (response.error) return

      const createdReminderId = (response.data as any)?.data?.[0]?.id
      if (createdReminderId && pendingAttachments.length > 0) {
        await uploadPendingAttachments(createdReminderId, pendingAttachments)
      }

      resetCreateModeState()
      router.replace('/(tabs)')
      return
    }

    const expandedEntries = formResults.flatMap((item) =>
      item.submitData.petId.map((petId) => ({
        payload: {
          ...item.submitData,
          petId,
        },
        pendingAttachments: item.pendingAttachments,
      })),
    )

    const batchPayload = expandedEntries.map((entry) => entry.payload as any)
    const batchResponse = await createBatchReminderApi.execute(batchPayload)
    if (batchResponse.error) return

    const createdReminders =
      (batchResponse.data as any)?.data?.data?.created ||
      (batchResponse.data as any)?.data?.created ||
      []

    const batchErrors =
      (batchResponse.data as any)?.data?.data?.errors ||
      (batchResponse.data as any)?.data?.errors ||
      []

    if (Array.isArray(batchErrors) && batchErrors.length > 0) {
      const firstError = batchErrors[0]
      showError(
        firstError?.error ||
          'บางรายการไม่สามารถสร้างเตือนความจำได้ กรุณาตรวจสอบข้อมูลอีกครั้ง',
      )
    }

    if (Array.isArray(createdReminders)) {
      const failedIndexes = new Set<number>(
        Array.isArray(batchErrors)
          ? batchErrors
              .map((error: any) => error?.index)
              .filter((index: any) => typeof index === 'number')
          : [],
      )

      const successIndexes = expandedEntries
        .map((_, index) => index)
        .filter((index) => !failedIndexes.has(index))

      for (let i = 0; i < createdReminders.length; i++) {
        const createdReminderId = createdReminders[i]?.id
        const sourceIndex = successIndexes[i]
        const pendingAttachments =
          expandedEntries[sourceIndex]?.pendingAttachments || []
        if (createdReminderId && pendingAttachments.length > 0) {
          await uploadPendingAttachments(createdReminderId, pendingAttachments)
        }
      }
    }

    resetCreateModeState()
    router.replace('/(tabs)')
  }

  const updateReminderApi = useApi(reminderService.updateReminder, {
    showErrorAlert: false,
    onSuccess: async (response) => {
      apiSuccessRef.current = true
      setDuplicateError(null)

      // Process attachment deletions
      if (attachmentsToDelete.length > 0 && reminderId) {
        console.log(
          `🗑️ Deleting ${attachmentsToDelete.length} attachment(s)...`,
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
          formik.values.pendingAttachments,
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
          pendingAttachments: [],
          attachments: initialReminderData.attachments || [],
        }
      : {
          ...reminderInitValue({} as IReminder),
          petId: getFirstPetId(),
          pendingAttachments: [],
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
        petId: isEditMode ? values.petId : selectedPetIds,
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
          const calculatedChildrenToDelete = initialChildReminders
            .filter((child) => !currentChildIds.includes(child.id))
            .map((child) => child.id)

          const allChildrenToDelete = [
            ...new Set([...calculatedChildrenToDelete, ...childrenToDelete]),
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
    },
  })

  const isSubmitting =
    createReminderApi.loading ||
    createBatchReminderApi.loading ||
    updateReminderApi.loading

  const loadReminderData = useCallback(async () => {
    if (isEditMode && reminderId) {
      setLoadingReminder(true)
      try {
        const response = await reminderService.getReminderById(reminderId)
        const reminderData = response.data
        if (reminderData) {
          const formattedReminderData = {
            ...reminderData,
            reminderTime: (reminderData.reminderTime || '').substring(0, 5),
          }
          setInitialReminderData(formattedReminderData)

          if (reminderData.recurrence) {
            const convertedRecurrence = convertFromBackendRecurrence(
              reminderData.recurrence,
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
              },
            )

            const sortedChildren = childrenWithDoseNumbers.sort(
              (a, b) => a.extractedDoseNumber - b.extractedDoseNumber,
            )

            const childrenDoses: IDose[] = sortedChildren.map((child: any) => ({
              doseNumber: child.extractedDoseNumber,
              date: child.reminderDate || '',
              time: (child.reminderTime || '').substring(0, 5),
              isAutoCalculated: child.extractedDoseNumber > 1,
              isEdited: child.extractedDoseNumber > 1,
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
                reminderTime: (reminderData.reminderTime || '').substring(0, 5),
              }
              setInitialReminderData(formattedReminderData)

              if (reminderData.petId) {
                const originalPet = pets.find(
                  (p) => p.id === reminderData.petId,
                )
                if (originalPet) {
                  setOriginalPetSpecies(originalPet.species)
                }
              }

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
                    time: (child.reminderTime || '').substring(0, 5),
                    isAutoCalculated: child.extractedDoseNumber > 1,
                    isEdited: child.extractedDoseNumber > 1,
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
    }, []),
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
    currentPet && !currentPet.species?.includes('แฮมสเตอร์') && !!currentPet.age

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
    setDuplicateError(null)

    if (isEditMode) {
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
    } else {
      resetCreateModeState()
    }

    router.back()
  }

  const handleBack = () => {
    const hasCreateDirty = Object.values(createFormRefs.current).some(
      (formRef) => formRef?.isDirty(),
    )

    const hasUnsavedChanges = isEditMode ? formik.dirty : hasCreateDirty

    if (hasUnsavedChanges) {
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
      },
    )

    return () => backHandler.remove()
  }, [formik.dirty, isEditMode])

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
          reminder.reminderName.toLowerCase().includes(value.toLowerCase()),
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
        reminder.recurrence,
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
        (a, b) => a.extractedDoseNumber - b.extractedDoseNumber,
      )

      const childrenDoses: IDose[] = sortedChildren.map((child: any) => ({
        doseNumber: child.extractedDoseNumber,
        date: child.reminderDate || '',
        time: child.reminderTime || '',
        isAutoCalculated: child.extractedDoseNumber > 1,
        isEdited: false,
        childReminderId: undefined, // New reminder, so no existing child IDs
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
            ref={scrollViewRef}
            style={styles.scrollView}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {isEditMode ? (
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
                        (!canSubmit || isSubmitting) && styles.submittingText,
                      ]}
                    >
                      {isSubmitting ? 'กำลังแก้ไข...' : 'แก้ไข'}
                    </Text>
                  </Pressable>
                </View>

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
                  pets={activePets}
                  selectedPetIds={[formik.values.petId]}
                  onSelectPets={undefined}
                  label='สัตว์เลี้ยง'
                  required={true}
                  disabled={true}
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
                      disabled={isDose1Done || isSubmitting}
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

                {formik.values.reminderDate &&
                  formik.values.categoryName !== 'Vaccination' && (
                    <>
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

                      {recurrenceRule && recurrenceRule.type !== 'none' && (
                        <EndRepeatSelector
                          recurrenceRule={recurrenceRule}
                          onChange={setRecurrenceRule}
                        />
                      )}
                    </>
                  )}

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
                    customVaccineName ? customVaccineName : undefined
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

                <AttachmentManager
                  attachments={attachments.filter(
                    (att) => !attachmentsToDelete.includes(att.id),
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
              </View>
            ) : (
              <>
                {createFormIds.map((formId, index) => (
                  <React.Fragment key={formId}>
                    <View
                      style={styles.formCard}
                      onLayout={(event) => {
                        if (pendingScrollToFormIdRef.current === formId) {
                          const y = event.nativeEvent.layout.y
                          scrollViewRef.current?.scrollTo({
                            y: Math.max(y - 8, 0),
                            animated: true,
                          })
                          pendingScrollToFormIdRef.current = null
                        }
                      }}
                    >
                      {index === 0 ? (
                        <View style={styles.cardHeader}>
                          <Pressable
                            onPress={handleBack}
                            disabled={isSubmitting}
                            hitSlop={{
                              top: 10,
                              bottom: 10,
                              left: 10,
                              right: 10,
                            }}
                          >
                            <Text style={styles.cancelText}>ยกเลิก</Text>
                          </Pressable>
                          <Pressable
                            onPress={handleCreateSubmit}
                            disabled={isSubmitting}
                            hitSlop={{
                              top: 10,
                              bottom: 10,
                              left: 10,
                              right: 10,
                            }}
                          >
                            <Text
                              style={[
                                styles.addText,
                                isSubmitting && styles.submittingText,
                              ]}
                            >
                              {isSubmitting
                                ? 'กำลังเพิ่ม...'
                                : createFormIds.length === 1
                                  ? 'เพิ่ม'
                                  : `เพิ่ม (${createFormIds.length})`}
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}

                      {index === 0 && duplicateError && (
                        <View style={styles.duplicateErrorToast}>
                          <Text style={styles.duplicateErrorText}>
                            {duplicateError}
                          </Text>
                          <Pressable onPress={() => setDuplicateError(null)}>
                            <Text style={styles.duplicateErrorDismiss}>✕</Text>
                          </Pressable>
                        </View>
                      )}

                      <CreateReminderFormCard
                        ref={(instance) => {
                          createFormRefs.current[formId] = instance
                        }}
                        index={index}
                        totalForms={createFormIds.length}
                        activePets={activePets}
                        pets={pets}
                        existingReminders={existingReminders}
                        defaultPetId={
                          petIdFromParams || selectedPetId || getFirstPetId()
                        }
                        isSubmitting={isSubmitting}
                        showError={showError}
                        onRemove={
                          index > 0
                            ? () => {
                                setCreateFormIds((prev) =>
                                  prev.filter((id) => id !== formId),
                                )
                                delete createFormRefs.current[formId]
                              }
                            : undefined
                        }
                      />
                    </View>

                    {index === createFormIds.length - 1 && (
                      <View style={styles.addFormContainer}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.addFormButton,
                            pressed && styles.addFormButtonPressed,
                          ]}
                          disabled={isSubmitting}
                          onPress={() => {
                            const nextId = createFormIdCounterRef.current
                            createFormIdCounterRef.current += 1
                            pendingScrollToFormIdRef.current = nextId
                            setCreateFormIds((prev) => [...prev, nextId])
                          }}
                        >
                          {({ pressed }) => (
                            <>
                              <Plus
                                size={18}
                                color={pressed ? '#225877' : '#2E759E'}
                              />
                              <Text
                                style={[
                                  styles.addFormText,
                                  pressed && styles.addFormTextPressed,
                                ]}
                              >
                                เพิ่มเตือนความจำ
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    )}
                  </React.Fragment>
                ))}
              </>
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
  multiFormHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  createFormHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
    marginBottom: 12,
  },
  createFormHeaderText: {
    color: '#2E759E',
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
  },
  deleteFormText: {
    color: '#BF1737',
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
  },
  cancelText: {
    color: '#6b7280',
    fontSize: 18,
    fontFamily: 'Prompt_400Regular',
  },
  addText: {
    color: '#2E759E',
    fontSize: 18,
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
    marginBottom: 12,
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
  addFormContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  addFormButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addFormButtonPressed: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  addFormText: {
    color: '#2E759E',
    fontSize: 15,
    fontFamily: 'Prompt_700Bold',
  },
  addFormTextPressed: {
    color: '#225877',
  },
})
