import { useRouter } from 'expo-router'
import { useFormik } from 'formik'
import React, { useEffect, useState } from 'react'

import {
  IReminder,
  reminderInitValue,
  reminderValidationSchema
} from '@/src/domain/reminder.domain'
import { ICalculatedDose, IDose, IVaccine } from '@/src/domain/vaccine.domain'
import { useError } from '@/src/presentation/components/error_context'
import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { vaccineService } from '@/src/utils/api/services/vaccine_service'
import { useApi } from '@/src/utils/api/use_api'

import { usePets } from '@/src/context/PetContext'
import { useLocalSearchParams } from 'expo-router'
import { Check, ChevronDown, X } from 'lucide-react-native'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import DatePicker from '../../components/date_picker'
import Header from '../../components/header_component'
import InputText from '../../components/text_input'
import TimePicker from '../../components/time_picker'
import CategorySelector from '../components/category_selector'

export default function AddReminderPage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { showError } = useError()
  const petIdFromParams = (params?.petId || '') as string

  // Form states
  const [vaccineList, setVaccineList] = useState<IVaccine[]>([])
  const [selectedVaccineId, setSelectedVaccineId] = useState<number | null>(
    null
  )
  const [showVaccineDropdown, setShowVaccineDropdown] = useState(false)
  const [doses, setDoses] = useState<IDose[]>([])
  const [loadingVaccines, setLoadingVaccines] = useState(false)
  const [loadingCalculate, setLoadingCalculate] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [pets, setPets] = useState<any[]>([])
  const [userEditedTime, setUserEditedTime] = useState(false)
  const [isSyncingDose1, setIsSyncingDose1] = useState(false)

  const getPetsApi = useApi(petProfileService.getMyPets, {
    showErrorAlert: false
  })

  const { getFirstPetId } = usePets()

  const createReminderApi = useApi(reminderService.createReminder, {
    onSuccess: () => {
      router.push('/(tabs)')
    }
  })

  const formik = useFormik<IReminder>({
    initialValues: {
      ...reminderInitValue({} as IReminder),
      petId: getFirstPetId()
    },
    validationSchema: reminderValidationSchema,
    validateOnBlur: false,
    validateOnChange: false,
    onSubmit: async (values) => {
      if (values.categoryName === 'Vaccination') {
        if (!selectedVaccineId || doses.length === 0 || !doses[0].date) {
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
        petId: values.petId
      }

      if (values.categoryName === 'Vaccination' && doses.length > 0) {
        const syncedDoses = doses.map((dose) =>
          dose.doseNumber === 1 ? { ...dose, date: values.reminderDate } : dose
        )
        const children: any[] = syncedDoses.map((dose, index) => ({
          reminderName: `${
            selectedVaccine?.vaccine_name_th || 'วัคซีน'
          } เข็มที่ ${dose.doseNumber}`,
          description: values.description,
          reminderDate: dose.date,
          reminderTime: dose.time || '',
          categoryName: 'Vaccination'
        }))
        submitData.children = children
      }

      await createReminderApi.execute(submitData)
      formik.resetForm()
    }
  })

  const isSubmitting = createReminderApi.loading

  useEffect(() => {
    if (petIdFromParams) {
      formik.setFieldValue('petId', petIdFromParams)
    }
  }, [petIdFromParams])

  useEffect(() => {
    const loadPets = async () => {
      try {
        const response = await petProfileService.getMyPets()
        const petsList = Array.isArray(response)
          ? response
          : response?.data || response
        setPets(petsList)

        if (!petIdFromParams && petsList && petsList.length > 0) {
          const firstPetId = petsList[0].id
          formik.setFieldValue('petId', firstPetId)
        }
      } catch (error) {
        showError('ไม่สามารถโหลดรายชื่อสัตว์ของคุณ')
      }
    }
    loadPets()
  }, [])

  const selectedVaccine =
    vaccineList && Array.isArray(vaccineList)
      ? vaccineList.find((v) => v.id === selectedVaccineId)
      : undefined
  const isVaccinationCategory = formik.values.categoryName === 'Vaccination'
  const hasReminderDate = !!formik.values.reminderDate
  const isVaccineDropdownDisabled = isVaccinationCategory && !hasReminderDate
  const canSubmit = formik.values.reminderName && formik.values.reminderDate

  useEffect(() => {
    if (formik.values.categoryName === 'Vaccination' && formik.values.petId) {
      fetchVaccineList()
    }
  }, [formik.values.categoryName, formik.values.petId])

  useEffect(() => {
    if (
      selectedVaccineId &&
      formik.values.petId &&
      formik.values.reminderDate
    ) {
      calculateVaccineSchedule(formik.values.reminderDate)
    }
  }, [selectedVaccineId, formik.values.petId])

  useEffect(() => {
    if (!isSyncingDose1 && doses.length > 0) {
      const dose1 = doses.find((d) => d.doseNumber === 1)
      if (dose1 && dose1.date !== formik.values.reminderDate) {
        formik.setFieldValue('reminderDate', dose1.date)
      }
    }
  }, [doses])

  useEffect(() => {
    if (doses.length > 0 && formik.values.reminderDate) {
      const dose1 = doses.find((d) => d.doseNumber === 1)
      if (dose1 && dose1.date !== formik.values.reminderDate) {
        setDoses((prev) =>
          prev.map((dose) =>
            dose.doseNumber === 1
              ? { ...dose, date: formik.values.reminderDate }
              : dose
          )
        )
      }
    }
  }, [formik.values.reminderDate])

  const fetchVaccineList = async () => {
    setLoadingVaccines(true)
    try {
      const response = await vaccineService.getVaccineList(formik.values.petId)

      const vaccineArray = Array.isArray(response)
        ? response
        : (response as any)?.data || []

      setVaccineList(vaccineArray)
      if (!vaccineArray || vaccineArray.length === 0) {
        console.log('⚠️ No vaccines found for this pet')
      }
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
      formik.values.reminderDate

    if (!selectedVaccineId || !startDate || !formik.values.petId) {
      return
    }

    setLoadingCalculate(true)
    try {
      const response = await vaccineService.calculateVaccineSchedule({
        petId: formik.values.petId,
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
            isEdited: wasEdited
          }
        }
      )

      setDoses(calculatedDoses)
      setIsSyncingDose1(false)
    } catch (error) {
      showError('ไม่สามารถคำนวณตารางวัคซีน')
      setDoses([])
    } finally {
      setLoadingCalculate(false)
    }
  }

  const handleBack = () => {
    // Clear all state except pet
    // const petId = formik.values.petId
    setDoses([])
    setSelectedVaccineId(null)
    setShowVaccineDropdown(false)
    setVaccineList([])
    setLoadingVaccines(false)
    setLoadingCalculate(false)
    setSelectedTime('')
    setUserEditedTime(false)
    setIsSyncingDose1(false)
    formik.resetForm()
    // Restore petId after reset
    // formik.setFieldValue('petId', petId)
    router.back()
  }

  const handleDateChange = (doseNumber: number, date: Date) => {
    const dateString = convertDateToString(date)

    if (doseNumber === 1) {
      setIsSyncingDose1(true)
      formik.setFieldValue('reminderDate', dateString)

      if (selectedVaccineId && formik.values.petId) {
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
        formik.setFieldValue('reminderTime', time)
      }
    }
  }

  const handleVaccineSelect = (vaccineId: number) => {
    setSelectedVaccineId(vaccineId)
    setShowVaccineDropdown(false)
  }

  const handleDeleteDose = (doseNumber: number) => {
    if (doseNumber === 1) {
      showError('ไม่สามารถลบเข็มที่ 1 ได้')
      return
    }
    setDoses((prev) => prev.filter((dose) => dose.doseNumber !== doseNumber))
  }

  const formatDateForDisplay = (dateString: string): string => {
    try {
      const date = new Date(dateString + 'T00:00:00')
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
    const date = new Date(dateString + 'T00:00:00')
    const formattedDate = date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    return `คำนวนอัตโนมัติ: ${formattedDate}`
  }

  return (
    <View style={styles.screen}>
      <View style={styles.safeArea}>
        <Header
          title="เพิ่มเตือนความจำ"
          goBack={!isSubmitting}
          onBackPress={handleBack}
        />

        <ScrollView style={styles.scrollView} nestedScrollEnabled={true}>
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
                    (!canSubmit || isSubmitting) && styles.submittingText
                  ]}
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
                  onChange={(v) => {
                    const dateString = convertDateToString(v)
                    formik.setFieldValue('reminderDate', dateString)
                    // Sync dose 1 with reminderDate
                    if (isVaccinationCategory) {
                      handleDateChange(1, v)
                    }
                  }}
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

            {/* Vaccine Schedule Section */}
            {isVaccinationCategory && (
              <View style={styles.vaccineSection}>
                {!hasReminderDate && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      กรุณาเลือกวันที่เตือนความจำก่อนเลือกวัคซีน
                    </Text>
                  </View>
                )}

                {/* Vaccine Type Selector */}
                <View style={styles.vaccineSubsection}>
                  <Text style={styles.vaccineLabel}>วัคซีน</Text>

                  <TouchableOpacity
                    style={[
                      styles.vaccineDropdown,
                      isVaccineDropdownDisabled &&
                        styles.vaccineDropdownDisabled
                    ]}
                    onPress={() => {
                      if (!isVaccineDropdownDisabled) {
                        setShowVaccineDropdown(!showVaccineDropdown)
                      } else {
                        console.log('⛔ [Dropdown] Dropdown is disabled')
                      }
                    }}
                    disabled={isVaccineDropdownDisabled}
                  >
                    {loadingVaccines ? (
                      <ActivityIndicator size="small" color="#5FA7D1" />
                    ) : (
                      <>
                        <Text style={styles.vaccineDropdownValue}>
                          {selectedVaccine?.vaccine_name_th || 'เลือกวัคซีน'}
                        </Text>
                        <ChevronDown size={20} color="#6b7280" />
                      </>
                    )}
                  </TouchableOpacity>

                  {showVaccineDropdown && !isVaccineDropdownDisabled && (
                    <View style={styles.vaccineDropdownMenu}>
                      {(() => {
                        return null
                      })()}
                      {Array.isArray(vaccineList) &&
                        vaccineList.length === 0 && (
                          <Text style={styles.vaccineDropdownItemText}>
                            ไม่พบวัคซีน
                          </Text>
                        )}
                      {Array.isArray(vaccineList) &&
                        vaccineList.map((vaccine) => (
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
                    </View>
                  )}
                </View>

                {/* Loading Calculate */}
                {loadingCalculate && (
                  <View style={styles.vaccineSubsection}>
                    <ActivityIndicator size="large" color="#5FA7D1" />
                  </View>
                )}

                {/* Doses */}
                {!loadingCalculate && doses.length > 0 && (
                  <View style={styles.vaccineSubsection}>
                    {doses.map((dose, index) => (
                      <View key={dose.doseNumber}>
                        <View style={styles.doseCard}>
                          {/* Dose Header */}
                          <View style={styles.doseHeader}>
                            <View
                              style={[
                                styles.doseCircle,
                                dose.doseNumber === 1 &&
                                  styles.doseCircleCompleted
                              ]}
                            >
                              {dose.doseNumber === 1 && (
                                <Check size={20} color="#fff" strokeWidth={3} />
                              )}
                            </View>

                            <View style={styles.doseTextBlock}>
                              <Text style={styles.doseNumber}>
                                {selectedVaccine?.vaccine_name_th || 'วัคซีน'}{' '}
                                เข็มที่ {dose.doseNumber}
                              </Text>
                              {dose.isAutoCalculated && (
                                <Text style={styles.autocalculatedText}>
                                  {getAutocalculatedText(dose.date)}
                                </Text>
                              )}
                              {dose.doseNumber === 1 && (
                                <Text style={styles.completedDate}>
                                  {formatDateForDisplay(dose.date)}
                                </Text>
                              )}
                            </View>

                            {/* Delete Button */}
                            {dose.doseNumber > 1 && (
                              <Pressable
                                style={styles.deleteButton}
                                onPress={() =>
                                  handleDeleteDose(dose.doseNumber)
                                }
                              >
                                <X size={18} color="#ef4444" />
                              </Pressable>
                            )}
                          </View>

                          {/* Editable Inputs */}
                          <View style={styles.doseInputsRow}>
                            <View style={{ flex: 1 }}>
                              <View style={styles.doseInputContainer}>
                                <Text style={styles.doseInputLabel}>
                                  วันที่เตือนความจำ{' '}
                                  {dose.doseNumber === 1 && (
                                    <Text style={styles.required}>*</Text>
                                  )}
                                </Text>
                                <DatePicker
                                  title=""
                                  placeholder="วัน/เดือน/ปี"
                                  value={
                                    dose.date
                                      ? parseStringToDate(dose.date)
                                      : formik.values.reminderDate
                                      ? new Date(formik.values.reminderDate)
                                      : undefined
                                  }
                                  onChange={(date) =>
                                    handleDateChange(dose.doseNumber, date)
                                  }
                                  required={false}
                                  small={true}
                                />
                              </View>
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={styles.doseInputContainer}>
                                <Text style={styles.doseInputLabel}>
                                  เวลาที่เตือนความจำ
                                </Text>
                                <TimePicker
                                  title=""
                                  placeholder="เลือกเวลา"
                                  value={dose.time}
                                  onChange={(time) =>
                                    handleTimeChange(dose.doseNumber, time)
                                  }
                                  small={true}
                                />
                              </View>
                            </View>
                          </View>
                        </View>

                        {/* Divider */}
                        {index < doses.length - 1 && (
                          <View style={styles.doseDivider} />
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

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
          </View>
        </ScrollView>
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
  },
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
  doseCard: {
    marginBottom: 12
  },
  doseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12
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
    marginBottom: 4
  },
  autocalculatedText: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  completedDate: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af'
  },
  doseInputsRow: {
    flexDirection: 'row',
    gap: 8
  },
  doseInputContainer: {
    gap: 4
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
    marginVertical: 16
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center'
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
  }
})
