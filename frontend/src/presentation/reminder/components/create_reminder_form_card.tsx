import { useFormik } from 'formik'
import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import {
  IPendingAttachment,
  IRecurrenceRule,
  IReminder,
  reminderInitValue,
  reminderValidationSchema
} from '@/src/domain/reminder.domain'
import { IDose } from '@/src/domain/vaccine.domain'
import {
  convertFromBackendRecurrence,
  convertToBackendRecurrence
} from '@/src/utils/recurrence.utils'
import { Trash2 } from 'lucide-react-native'
import DatePicker from '../../components/date_picker'
import InputText from '../../components/text_input'
import TimePicker from '../../components/time_picker'
import AttachmentManager from './attachment_manager'
import CategorySelector from './category_selector'
import EndRepeatSelector from './recurrence/end_repeat_selector'
import RecurrencePicker from './recurrence/recurrence_picker'
import VaccineScheduleSection from './recurrence/vaccine_schedule_section'
import ReminderSuggestions from './reminder_suggestions'
import PetSelector from '../../components/pet_selector'

export type CreateReminderFormSubmitData = {
  reminderName: string
  description: string
  reminderDate: string
  reminderTime: string
  categoryName: string
  petId: string[]
  recurrence?: any
  children?: any[]
}

export type CreateReminderFormResult = {
  submitData: CreateReminderFormSubmitData
  pendingAttachments: IPendingAttachment[]
}

export type CreateReminderFormHandle = {
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

const parseDateStringToLocalDate = (dateValue?: string): Date | undefined => {
  if (!dateValue) return undefined

  const normalized = String(dateValue).trim()
  const ymdMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (ymdMatch) {
    const year = Number(ymdMatch[1])
    const monthIndex = Number(ymdMatch[2]) - 1
    const day = Number(ymdMatch[3])
    const localDate = new Date(year, monthIndex, day)

    if (
      localDate.getFullYear() === year &&
      localDate.getMonth() === monthIndex &&
      localDate.getDate() === day
    ) {
      return localDate
    }

    return undefined
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
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
      onRemove
    },
    ref
  ) => {
    const [doses, setDoses] = useState<IDose[]>([])
    const [customVaccineName, setCustomVaccineName] = useState<string>('')
    const [vaccineResetKey, setVaccineResetKey] = useState<number>(0)
    const [recurrenceRule, setRecurrenceRule] =
      useState<IRecurrenceRule | null>(null)
    const [suggestions, setSuggestions] = useState<IReminder[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedPetIds, setSelectedPetIds] = useState<string[]>(
      defaultPetId ? [defaultPetId] : []
    )

    const formik = useFormik<IReminder>({
      initialValues: {
        ...reminderInitValue({} as IReminder),
        petId: defaultPetId,
        pendingAttachments: []
      },
      enableReinitialize: false,
      validationSchema: reminderValidationSchema,
      validateOnBlur: false,
      validateOnChange: false,
      onSubmit: () => undefined
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
          reminder.recurrence
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
          (a, b) => a.extractedDoseNumber - b.extractedDoseNumber
        )

        const childrenDoses: IDose[] = sortedChildren.map((child: any) => ({
          doseNumber: child.extractedDoseNumber,
          date: child.reminderDate || '',
          time: child.reminderTime || '',
          isAutoCalculated: child.extractedDoseNumber > 1,
          isEdited: false,
          childReminderId: undefined
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
      formik.setFieldValue(
        'pendingAttachments',
        (formik.values.pendingAttachments || []).filter(
          (a) => a.id !== attachmentId
        )
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
              `ฟอร์มที่ ${index + 1}: ${errorMessages || 'กรุณากรอกข้อมูลให้ครบถ้วน'}`
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
                `ฟอร์มที่ ${index + 1}: กรุณากรอกข้อมูลวัคซีนให้ครบถ้วน`
              )
              return null
            }
            if (!allDosesHaveDates) {
              showError(
                `ฟอร์มที่ ${index + 1}: กรุณากรอกวันที่วัคซีนให้ครบทุกเข็ม`
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
            petId: selectedPetIds
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
                : dose
            )

            submitData.children = syncedDoses.map((dose) => ({
              reminderName: customVaccineName
                ? `${customVaccineName} เข็มที่ ${dose.doseNumber}`
                : `วัคซีน เข็มที่ ${dose.doseNumber}`,
              description: formik.values.description,
              reminderDate: dose.date,
              reminderTime: dose.time || '',
              categoryName: 'Vaccination'
            }))
          }

          return {
            submitData,
            pendingAttachments: formik.values.pendingAttachments || []
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
        }
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
        showError
      ]
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
                <Trash2 size={18} color="#BF1737" />
              </Pressable>
            )}
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
          label="สัตว์เลี้ยง"
          required={true}
          disabled={isSubmitting}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <DatePicker
              title="วันที่เตือนความจำ"
              placeholder="วัน/เดือน/ปี"
              value={
                formik.values.reminderDate
                  ? parseDateStringToLocalDate(formik.values.reminderDate)
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
                    endType: 'never'
                  }
                }
                onChange={setRecurrenceRule}
                reminderDate={
                  formik.values.reminderDate
                    ? parseDateStringToLocalDate(formik.values.reminderDate)
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
  }
)

CreateReminderFormCard.displayName = 'CreateReminderFormCard'

export default CreateReminderFormCard

const styles = StyleSheet.create({
  createFormHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
    marginBottom: 12
  },
  createFormHeaderText: {
    color: '#2E759E',
    fontSize: 16,
    fontFamily: 'Prompt_700Bold'
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
  }
})
