import _ from 'lodash'
import { ChevronDown, X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'

import { ICalculatedDose, IDose, IVaccine } from '@/src/domain/vaccine.domain'
import { useError } from '@/src/presentation/components/error_context'
import { vaccineService } from '@/src/utils/api/services/vaccine_service'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import DatePicker from '../../../components/date_picker'
import TimePicker from '../../../components/time_picker'

interface VaccineScheduleSectionProps {
  isVaccinationCategory: boolean
  canUseVaccineSchedule: boolean
  petId: string
  reminderDate: string
  doses: IDose[]
  setDoses: React.Dispatch<React.SetStateAction<IDose[]>>
  onDose1DateChange: (dateString: string) => void
  onDose1TimeChange: (time: string) => void
  onCustomVaccineNameChange?: (name: string) => void
  onCustomDosesGenerated?: () => void
  initialVaccineId?: number | null
  initialVaccineName?: string
  isEditMode?: boolean
  initialCustomDoseCount?: number
  doneChildReminderIds?: Set<string>
}

export default function VaccineScheduleSection({
  isVaccinationCategory,
  canUseVaccineSchedule,
  petId,
  reminderDate,
  doses,
  setDoses,
  onDose1DateChange,
  onDose1TimeChange,
  onCustomVaccineNameChange,
  onCustomDosesGenerated,
  initialVaccineId,
  initialVaccineName,
  isEditMode,
  initialCustomDoseCount,
  doneChildReminderIds = new Set()
}: VaccineScheduleSectionProps) {
  const { showError, showSuccess } = useError()
  const [vaccineList, setVaccineList] = useState<IVaccine[]>([])
  const [selectedVaccineId, setSelectedVaccineId] = useState<number | null>(
    initialVaccineId || null
  )
  const [showVaccineDropdown, setShowVaccineDropdown] = useState(false)
  const [loadingVaccines, setLoadingVaccines] = useState(false)
  const [loadingCalculate, setLoadingCalculate] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [userEditedTime, setUserEditedTime] = useState(false)
  const [isSyncingDose1, setIsSyncingDose1] = useState(false)
  const [isCustomVaccine, setIsCustomVaccine] = useState<boolean>(
    !initialVaccineId && initialVaccineName ? true : false
  )
  const [customVaccineName, setCustomVaccineName] = useState<string>(
    initialVaccineName || ''
  )
  // const [isCustomVaccine, setIsCustomVaccine] = useState(false)
  // const [customVaccineName, setCustomVaccineName] = useState<string>('')
  const [customDoseCount, setCustomDoseCount] = useState<number | null>(null)
  const [showCustomDoseInput, setShowCustomDoseInput] = useState(false)
  const [customDoseInputValue, setCustomDoseInputValue] = useState<string>('')
  const [isCustomDoseInputMode, setIsCustomDoseInputMode] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isGeneratingCustomDoses, setIsGeneratingCustomDoses] = useState(false)

  const selectedVaccine = vaccineList.find((v) => v.id === selectedVaccineId)
  const hasReminderDate = !!reminderDate
  const isVaccineDropdownDisabled = isVaccinationCategory && !hasReminderDate

  const formatDateForDisplay = (dateString: string): string => {
    try {
      if (!dateString) {
        return 'Invalid Date'
      }
      let date: Date
      // Handle ISO format with T
      if (dateString.includes('T')) {
        date = new Date(dateString)
      } else {
        // Handle YYYY-MM-DD format
        date = new Date(dateString + 'T00:00')
      }
      if (isNaN(date.getTime())) {
        return 'Invalid Date'
      }
      return date.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch (e) {
      return 'Invalid Date'
    }
  }

  const parseStringToDate = (dateString: string): Date => {
    try {
      if (!dateString) {
        return new Date()
      }
      // Handle both YYYY-MM-DD format and ISO date strings
      if (dateString.includes('T')) {
        // ISO format
        return new Date(dateString.split('T')[0] + 'T00:00')
      }
      // YYYY-MM-DD format
      const [year, month, day] = dateString.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date
    } catch (e) {
      return new Date()
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

  const getAutocalculatedText = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00')
    const formattedDate = date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    return `คำนวนอัตโนมัติ: ${formattedDate}`
  }

  useEffect(() => {
    if (isVaccinationCategory && petId && canUseVaccineSchedule) {
      fetchVaccineList()
    } else if (isVaccinationCategory && !canUseVaccineSchedule) {
      setVaccineList([])
      setSelectedVaccineId(null)
      setDoses([])
      setIsInitialized(false)
    }
  }, [isVaccinationCategory, petId, canUseVaccineSchedule])

  useEffect(() => {
    // Only initialize once when edit mode data is loaded and not already initialized
    if (
      isEditMode &&
      doses.length > 0 &&
      !selectedVaccineId &&
      vaccineList.length > 0 &&
      !isInitialized
    ) {
      // Try to match initialVaccineName with vaccines in the list
      if (initialVaccineName) {
        const matchedVaccine = vaccineList.find(
          (vaccine) =>
            vaccine.vaccine_name_th === initialVaccineName ||
            vaccine.vaccine_name === initialVaccineName,
        )

        if (matchedVaccine) {
          // It's a standard vaccine from the list
          setSelectedVaccineId(matchedVaccine.id)
          setIsCustomVaccine(false)
          setCustomVaccineName(initialVaccineName)
          onCustomVaccineNameChange?.(initialVaccineName)
        } else {
          // It's a custom vaccine
          setIsCustomVaccine(true)
          setCustomVaccineName(initialVaccineName)
          onCustomVaccineNameChange?.(initialVaccineName)
        }
      }

      // Initialize custom dose count from initial data
      if (initialCustomDoseCount) {
        setCustomDoseCount(initialCustomDoseCount)
        // If dose count > 6, activate custom input mode
        if (initialCustomDoseCount > 6) {
          setIsCustomDoseInputMode(true)
          setCustomDoseInputValue(String(initialCustomDoseCount))
          setShowCustomDoseInput(false)
        } else {
          setIsCustomDoseInputMode(false)
          setShowCustomDoseInput(false)
        }
      }

      setIsInitialized(true)
    }
  }, [
    isEditMode,
    selectedVaccineId,
    initialVaccineName,
<<<<<<< HEAD:frontend/src/presentation/reminder/components/vaccine_schedule_section.tsx
    initialCustomDoseCount,
    vaccineList,
    isInitialized,
=======
    initialCustomDoseCount
>>>>>>> 7d0b63422686bf58e327a7b4a501164b71f49783:frontend/src/presentation/reminder/components/recurrence/vaccine_schedule_section.tsx
  ])

  // Reset initialization flag when edit mode changes
  useEffect(() => {
    if (!isEditMode) {
      setIsInitialized(false)
    }
  }, [isEditMode])

  useEffect(() => {
    if (selectedVaccineId && petId && reminderDate) {
      calculateVaccineSchedule(reminderDate)
    }
  }, [selectedVaccineId, petId])

  // Sync dose 1 with reminderDate
  useEffect(() => {
    if (doses.length > 0 && reminderDate) {
      const dose1 = doses.find((d) => d.doseNumber === 1)
      if (dose1 && dose1.date !== reminderDate) {
        setDoses((prev) =>
          prev.map((dose) =>
            dose.doseNumber === 1 ? { ...dose, date: reminderDate } : dose
          )
        )
      }
    }
  }, [reminderDate])

  const fetchVaccineList = async () => {
    setLoadingVaccines(true)
    try {
      const response = await vaccineService.getVaccineList(petId)
      const vaccineArray = Array.isArray(response)
        ? response
        : (response as any)?.data || []
      setVaccineList(vaccineArray)
    } catch (error) {
      showError('ไม่สามารถโหลดข้อมูลวัคซีน')
      setVaccineList([])
    } finally {
      setLoadingVaccines(false)
    }
  }

  const calculateVaccineSchedule = async (customStartDate?: string) => {
    const startDate =
      customStartDate ||
      doses.find((d) => d.doseNumber === 1)?.date ||
      reminderDate

    if (!selectedVaccineId || !startDate || !petId) {
      return
    }

    setLoadingCalculate(true)
    try {
      const response = await vaccineService.calculateVaccineSchedule({
        petId: petId,
        vaccineId: selectedVaccineId,
        startDate: startDate
      })

      const doseArray = Array.isArray(response)
        ? response
        : (response as any)?.data || (response as any)?.doses || []

      const calculatedDoses: IDose[] = (doseArray || []).map(
        (calculatedDose: ICalculatedDose, index: number) => {
          const existingDose = doses.find(
            (d) => d.doseNumber === calculatedDose.doseNumber
          )
          const wasEdited = existingDose?.isEdited || false

          const doseDate =
            calculatedDose.doseNumber === 1
              ? startDate
              : wasEdited && existingDose
                ? existingDose.date
                : calculatedDose.date

          return {
            doseNumber: calculatedDose.doseNumber,
            date: doseDate,
            time: selectedTime || '',
            type: calculatedDose.type,
            ageInDays: calculatedDose.ageInDays,
            isAutoCalculated: index > 0,
            isEdited: wasEdited,
            childReminderId: existingDose?.childReminderId
          }
        }
      )

      setDoses(calculatedDoses)
      setIsSyncingDose1(false)
    } catch (error) {
      showError('ไม่สามารถคำนวณตารางวัคซีนได้ เนื่องจากมีข้อผิดพลาด')
      setDoses([])
    } finally {
      setLoadingCalculate(false)
    }
  }

  const handleVaccineSelect = (vaccineId: number) => {
    setSelectedVaccineId(vaccineId)
    setShowVaccineDropdown(false)
    setIsCustomVaccine(false)

    const vaccine = vaccineList.find((v) => v.id === vaccineId)
    const vaccineName = vaccine?.vaccine_name_th || vaccine?.vaccine_name || ''
    setCustomVaccineName(vaccineName)
    onCustomVaccineNameChange?.(vaccineName)

    setCustomDoseCount(null)
    setShowCustomDoseInput(false)
    setIsCustomDoseInputMode(false)
    setCustomDoseInputValue('')
    setDoses([])
  }

  const handleSelectCustomVaccine = () => {
    setIsCustomVaccine(true)
    setSelectedVaccineId(null)
    setShowVaccineDropdown(false)
    setDoses([])
    setCustomVaccineName('')
    setCustomDoseCount(null)
    setShowCustomDoseInput(false)
    setIsCustomDoseInputMode(false)
    setCustomDoseInputValue('')
    onCustomVaccineNameChange?.('')
  }

  const handleGenerateCustomDoses = () => {
    const doseCountToUse = customDoseCount

    if (!doseCountToUse || !reminderDate || !customVaccineName) {
      return
    }

    setIsGeneratingCustomDoses(true)

    const generatedDoses: IDose[] = []
    for (let i = 1; i <= doseCountToUse; i++) {
      const doseDate = i === 1 ? reminderDate : ''

      generatedDoses.push({
        doseNumber: i,
        date: doseDate,
        time: selectedTime || '',
        type: 'custom',
        ageInDays: 0,
        isAutoCalculated: false,
        isEdited: false
      })
    }

    setDoses(generatedDoses)
    onCustomDosesGenerated?.()
    showSuccess(`สร้างตารางวัคซีน ${customVaccineName} สำเร็จ !`)

    setTimeout(() => {
      setIsGeneratingCustomDoses(false)
    }, 100)
  }

  const handleDateChange = (doseNumber: number, date: Date) => {
    const dateString = convertDateToString(date)

    if (doseNumber === 1) {
      setIsSyncingDose1(true)
      onDose1DateChange(dateString)

      if (selectedVaccineId && petId) {
        calculateVaccineSchedule(dateString)
      }
      return
    } else {
      setDoses((prev) =>
        prev.map((dose) =>
          dose.doseNumber === doseNumber
            ? { ...dose, date: dateString, isEdited: true }
            : dose
        )
      )
    }
  }

  const handleTimeChange = (doseNumber: number, time: string) => {
    if (userEditedTime) {
      setDoses((prev) =>
        prev.map((dose) =>
          dose.doseNumber === doseNumber ? { ...dose, time: time } : dose
        )
      )
      return
    }

    if (selectedTime !== time) {
      setSelectedTime(time)
      setDoses((prev) =>
        prev.map((dose) => ({
          ...dose,
          time: time
        }))
      )
      setUserEditedTime(true)

      if (doseNumber === 1) {
        onDose1TimeChange(time)
      }
    }
  }

  const handleDeleteDose = (doseNumber: number) => {
    setDoses((prev) => prev.filter((dose) => dose.doseNumber !== doseNumber))
  }

  if (!isVaccinationCategory || !canUseVaccineSchedule) {
    return null
  }

  return (
    <View style={styles.vaccineSection}>
      {/* Warning Box */}
      {!hasReminderDate && canUseVaccineSchedule && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            กรุณาเลือกวันที่เตือนความจำก่อนเลือกวัคซีน
          </Text>
        </View>
      )}

      {/* Vaccine Type Selector */}
      {canUseVaccineSchedule && (
        <View style={styles.vaccineSubsection}>
          <Text style={styles.vaccineLabel}>วัคซีน</Text>

          <TouchableOpacity
            style={[
              styles.vaccineDropdown,
              isVaccineDropdownDisabled && styles.vaccineDropdownDisabled
            ]}
            onPress={() => {
              if (!isVaccineDropdownDisabled) {
                setShowVaccineDropdown(!showVaccineDropdown)
              }
            }}
            disabled={isVaccineDropdownDisabled}
          >
            {loadingVaccines ? (
              <ActivityIndicator size="small" color="#5FA7D1" />
            ) : (
              <>
                <Text style={styles.vaccineDropdownValue}>
                  {isCustomVaccine
                    ? 'อื่น ๆ'
                    : selectedVaccine?.vaccine_name_th || 'เลือกวัคซีน'}
                </Text>
                <ChevronDown size={20} color="#6b7280" />
              </>
            )}
          </TouchableOpacity>

          {showVaccineDropdown && !isVaccineDropdownDisabled && (
            <View style={styles.vaccineDropdownMenu}>
              {Array.isArray(vaccineList) && vaccineList.length === 0 && (
                <Text style={styles.vaccineDropdownItemText}>ไม่พบวัคซีน</Text>
              )}
              {Array.isArray(vaccineList) &&
                _.map(vaccineList, (vaccine) => (
                  <Pressable
                    key={vaccine.id}
                    style={[
                      styles.vaccineDropdownItem,
                      selectedVaccineId === vaccine.id &&
                        styles.vaccineDropdownItemSelected
                    ]}
                    onPress={() => handleVaccineSelect(vaccine.id)}
                  >
                    <Text
                      style={[
                        styles.vaccineDropdownItemText,
                        selectedVaccineId === vaccine.id &&
                          styles.vaccineDropdownItemTextSelected
                      ]}
                    >
                      {vaccine.vaccine_name_th || vaccine.vaccine_name}
                    </Text>
                  </Pressable>
                ))}

              {/* Custom Vaccine Option */}
              <Pressable
                style={[
                  styles.vaccineDropdownItem,
                  isCustomVaccine && styles.vaccineDropdownItemSelected,
                  styles.vaccineDropdownItemOther
                ]}
                onPress={() => handleSelectCustomVaccine()}
              >
                <Text
                  style={[
                    styles.vaccineDropdownItemTextOther,
                    isCustomVaccine && styles.vaccineDropdownItemTextSelected
                  ]}
                >
                  อื่น ๆ
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Custom Vaccine Name Input */}
      {isCustomVaccine && (
        <View style={styles.vaccineSubsection}>
          <Text style={styles.inputLabel}>
            ชื่อวัคซีน <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="กรุณากรอกชื่อวัคซีน"
            value={customVaccineName}
            onChangeText={(text) => {
              setCustomVaccineName(text)
              onCustomVaccineNameChange?.(text)
            }}
          />
        </View>
      )}

      {/* Custom Dose Count Selector */}
      {isCustomVaccine && (
        <View style={styles.vaccineSubsection}>
          <Text style={styles.vaccineLabel}>
            จำนวนเข็ม <Text style={styles.required}>*</Text>
          </Text>

          {!isCustomDoseInputMode ? (
            <>
              <TouchableOpacity
                style={styles.doseDropdown}
                onPress={() => setShowCustomDoseInput(!showCustomDoseInput)}
              >
                <Text style={styles.doseDropdownValue}>
                  {customDoseCount
                    ? `${customDoseCount} เข็ม`
                    : 'เลือกจำนวนเข็ม'}
                </Text>
                <ChevronDown size={20} color="#6b7280" />
              </TouchableOpacity>

              {showCustomDoseInput && (
                <View style={styles.doseOptionsMenu}>
                  {[1, 2, 3, 4, 5, 6].map((dose) => (
                    <Pressable
                      key={dose}
                      style={[
                        styles.doseOption,
                        customDoseCount === dose && styles.doseOptionSelected
                      ]}
                      onPress={() => {
                        setCustomDoseCount(dose)
                        setShowCustomDoseInput(false)
                        setIsCustomDoseInputMode(false)
                        setCustomDoseInputValue('')
                      }}
                    >
                      <Text
                        style={[
                          styles.doseOptionText,
                          customDoseCount === dose &&
                            styles.doseOptionTextSelected
                        ]}
                      >
                        {dose} เข็ม
                      </Text>
                    </Pressable>
                  ))}

                  {/* More than 6 option */}
                  <Pressable
                    style={styles.doseOption}
                    onPress={() => {
                      setShowCustomDoseInput(false)
                      setIsCustomDoseInputMode(true)
                      setCustomDoseCount(null)
                      setCustomDoseInputValue('')
                    }}
                  >
                    <Text style={styles.doseOptionText}>
                      มากกว่า 6 เข็ม (กรุณาระบุ)
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : null}

          {/* Custom dose input for more than 6 */}
          {isCustomDoseInputMode && (
            <>
              <TouchableOpacity
                style={styles.doseDropdown}
                onPress={() => {
                  setShowCustomDoseInput(!showCustomDoseInput)
                }}
              >
                <Text style={styles.doseDropdownValue}>
                  มากกว่า 6 เข็ม (กรุณาระบุ)
                </Text>
                <ChevronDown size={20} color="#6b7280" />
              </TouchableOpacity>

              {showCustomDoseInput && (
                <View style={styles.doseOptionsMenu}>
                  {[1, 2, 3, 4, 5, 6].map((dose) => (
                    <Pressable
                      key={dose}
                      style={[
                        styles.doseOption,
                        customDoseCount === dose && styles.doseOptionSelected
                      ]}
                      onPress={() => {
                        setCustomDoseCount(dose)
                        setShowCustomDoseInput(false)
                        setIsCustomDoseInputMode(false)
                        setCustomDoseInputValue('')
                      }}
                    >
                      <Text
                        style={[
                          styles.doseOptionText,
                          customDoseCount === dose &&
                            styles.doseOptionTextSelected
                        ]}
                      >
                        {dose} เข็ม
                      </Text>
                    </Pressable>
                  ))}

                  {/* More than 6 option */}
                  <Pressable
                    style={styles.doseOption}
                    onPress={() => {
                      setShowCustomDoseInput(false)
                    }}
                  >
                    <Text style={styles.doseOptionText}>
                      มากกว่า 6 เข็ม (กรุณาระบุ)
                    </Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.customDoseInputContainer}>
                <TextInput
                  style={[styles.textInput, { flex: 1, marginTop: 8 }]}
                  placeholder="จำนวนเข็ม"
                  keyboardType="number-pad"
                  value={customDoseInputValue}
                  onChangeText={setCustomDoseInputValue}
                />
              </View>
            </>
          )}

          {/* Generate Doses button */}
          {isCustomVaccine ? (
            <Pressable
              style={({ pressed }) => [
                styles.generateButton,
                pressed && styles.generateButtonPressed,
                (!customVaccineName.trim() ||
                  (customDoseCount === null && !customDoseInputValue)) &&
                  styles.generateButtonDisabled
              ]}
              onPress={() => {
                if (isCustomDoseInputMode && customDoseInputValue) {
                  const doseCount = parseInt(customDoseInputValue, 10)
                  if (doseCount > 0) {
                    setCustomDoseCount(doseCount)
                  } else {
                    return
                  }
                }
                handleGenerateCustomDoses()
              }}
              disabled={
                !customVaccineName.trim() ||
                (customDoseCount === null && !customDoseInputValue)
              }
            >
              <Text style={styles.generateButtonText}>สร้างตารางวัคซีน</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Loading Calculate */}
      {canUseVaccineSchedule && loadingCalculate && (
        <View style={styles.vaccineSubsection}>
          <ActivityIndicator size="large" color="#5FA7D1" />
        </View>
      )}

      {/* Doses */}
      {canUseVaccineSchedule && !loadingCalculate && doses.length > 0 && (
        <View style={styles.vaccineSubsection}>
          {doses.map((dose, index) => {
            const isDoseDone = !!(
              dose.childReminderId &&
              doneChildReminderIds.has(dose.childReminderId)
            )

            return (
              <View key={dose.doseNumber}>
                <View style={styles.doseCard}>
                  <View style={styles.doseHeader}>
                    <View style={styles.doseTextBlock}>
                      <Text style={styles.doseNumber}>
                        {isCustomVaccine
                          ? customVaccineName
                          : selectedVaccine?.vaccine_name_th || 'วัคซีน'}{' '}
                        เข็มที่ {dose.doseNumber}
                      </Text>
                      {dose.isAutoCalculated && !isCustomVaccine && (
                        <Text style={styles.autocalculatedText}>
                          {getAutocalculatedText(dose.date)}
                        </Text>
                      )}
                      {dose.doseNumber === 1 && !isCustomVaccine && (
                        <Text style={styles.completedDate}>
                          {formatDateForDisplay(dose.date)}
                        </Text>
                      )}
                      {isDoseDone && (
                        <Text style={styles.doneText}>(ทำสำเร็จแล้ว)</Text>
                      )}
                    </View>

                    {/* Delete Button */}
                    {dose.doseNumber > 1 && (
                      <Pressable
                        style={[
                          styles.deleteButton,
                          isDoseDone && styles.deleteButtonDisabled
                        ]}
                        onPress={() =>
                          !isDoseDone && handleDeleteDose(dose.doseNumber)
                        }
                        disabled={isDoseDone}
                      >
                        <X
                          size={18}
                          color={isDoseDone ? '#d1d5db' : '#ef4444'}
                        />
                      </Pressable>
                    )}
                  </View>

                  {/* Editable Inputs */}
                  <View style={styles.doseInputsRow}>
                    <View style={{ flex: 1 }}>
                      <DatePicker
                        title="วันที่เตือนความจำ"
                        placeholder="วัน/เดือน/ปี"
                        value={
                          dose.date
                            ? parseStringToDate(dose.date)
                            : isCustomVaccine
                              ? undefined
                              : reminderDate
                                ? new Date(reminderDate)
                                : undefined
                        }
                        onChange={(date) =>
                          handleDateChange(dose.doseNumber, date)
                        }
                        required={true}
                        small={true}
                        disabled={isDoseDone}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TimePicker
                        title="เวลาที่เตือนความจำ"
                        placeholder="เลือกเวลา"
                        value={dose.time}
                        onChange={(time) =>
                          handleTimeChange(dose.doseNumber, time)
                        }
                        small={true}
                        disabled={isDoseDone}
                      />
                    </View>
                  </View>
                </View>

                {/* Divider */}
                {index < doses.length - 1 && (
                  <View style={styles.doseDivider} />
                )}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  vaccineSection: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    backgroundColor: '#f9fafb'
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  warningText: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#92400e'
  },
  vaccineSubsection: {
    marginBottom: 16
  },
  vaccineLabel: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 10
  },
  vaccineDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff'
  },
  vaccineDropdownDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    opacity: 0.6
  },
  vaccineDropdownValue: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  vaccineDropdownMenu: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#fff',
    marginTop: -1,
    overflow: 'hidden',
    zIndex: 10
  },
  vaccineDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  vaccineDropdownItemSelected: {
    backgroundColor: '#e3f2fd'
  },
  vaccineDropdownItemText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  },
  vaccineDropdownItemTextSelected: {
    color: '#5FA7D1',
    fontFamily: 'Prompt_500Medium'
  },
  vaccineDropdownItemOther: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  vaccineDropdownItemTextOther: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  },
  customVaccineContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  changeVaccineButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5FA7D1'
  },
  changeVaccineButtonText: {
    fontSize: 13,
    fontFamily: 'Prompt_500Medium',
    color: '#5FA7D1'
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 8
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    minHeight: 44,
    backgroundColor: '#fff'
  },
  doseDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff'
  },
  doseDropdownValue: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  doseOptionsMenu: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#fff',
    marginTop: -1,
    overflow: 'hidden',
    zIndex: 10
  },
  doseOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  doseOptionSelected: {
    backgroundColor: '#e3f2fd'
  },
  doseOptionText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  },
  doseOptionTextSelected: {
    color: '#5FA7D1',
    fontFamily: 'Prompt_500Medium'
  },
  customDoseInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end'
  },
  confirmButton: {
    backgroundColor: '#5FA7D1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#fff'
  },
  generateButton: {
    backgroundColor: '#5FA7D1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12
  },
  generateButtonPressed: {
    backgroundColor: '#4a90b8',
    opacity: 0.8,
    transform: [{ scale: 0.98 }]
  },
  generateButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#fff'
  },
  generateButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6
  },
  required: {
    color: '#BF1737'
  },
  doseCard: {
    marginBottom: 4
  },
  doseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  doseCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2
  },
  doseCircleCompleted: {
    backgroundColor: '#5FA7D1',
    borderColor: '#5FA7D1'
  },
  doseTextBlock: {
    flex: 1
  },
  doseNumber: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 4,
    marginLeft: 4
  },
  autocalculatedText: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
    fontStyle: 'italic',
    marginLeft: 4
  },
  completedDate: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
    marginLeft: 4
  },
  doneText: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#ef4444',
    marginLeft: 4,
    fontWeight: '600'
  },
  doseInputsRow: {
    flexDirection: 'row',
    gap: 8
  },
  doseInputLabel: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    marginLeft: 4
  },
  doseDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteButtonDisabled: {
    opacity: 0.5
  }
})
