import React, { useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native'
import { ChevronDown, X, Check, Calendar, Clock } from 'lucide-react-native'
import DatePicker from '../../components/date_picker'
import TimePicker from '../../components/time_picker'
import {
  IDose,
  IVaccineSchedule,
  VACCINE_TYPES,
} from '@/src/domain/vaccine.domain'

interface VaccineScheduleModalProps {
  visible: boolean
  onClose: () => void
  onSave: (schedule: IVaccineSchedule) => void
}

export default function VaccineScheduleModal({
  visible,
  onClose,
  onSave,
}: VaccineScheduleModalProps) {
  const [selectedVaccineId, setSelectedVaccineId] = useState('5in1')
  const [showVaccineDropdown, setShowVaccineDropdown] = useState(false)
  const [doses, setDoses] = useState<IDose[]>([])

  // Mock data - Initialize doses with fake data when modal opens or vaccine changes
  useEffect(() => {
    if (visible) {
      ///////////// replace the initializeMockDoses() function in the modal with actual API calls.
      initializeMockDoses()
    }
  }, [visible, selectedVaccineId])

  const initializeMockDoses = () => {
    // Mock dose data - backend will calculate these later
    const today = new Date()
    const mockDoses: IDose[] = [
      {
        doseNumber: 1,
        date: today.toISOString().split('T')[0],
        time: '09:00',
        completed: true,
        autoCalculated: false,
      },
      {
        doseNumber: 2,
        date: new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        time: '09:00',
        completed: false,
        autoCalculated: true,
      },
      {
        doseNumber: 3,
        date: new Date(today.getTime() + 56 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        time: '09:00',
        completed: false,
        autoCalculated: true,
      },
    ]
    setDoses(mockDoses)
  }

  const handleVaccineSelect = (vaccineId: string) => {
    setSelectedVaccineId(vaccineId)
    setShowVaccineDropdown(false)
  }

  const handleDateChange = (doseNumber: number, date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    setDoses((prev) =>
      prev.map((dose) =>
        dose.doseNumber === doseNumber ? { ...dose, date: dateString } : dose
      )
    )
  }

  const handleTimeChange = (doseNumber: number, time: string) => {
    setDoses((prev) =>
      prev.map((dose) =>
        dose.doseNumber === doseNumber ? { ...dose, time } : dose
      )
    )
  }

  const handleSave = () => {
    const schedule: IVaccineSchedule = {
      vaccineTypeId: selectedVaccineId,
      vaccineName: VACCINE_TYPES[selectedVaccineId]?.name || '5-in-1 Vaccine',
      doses,
    }
    onSave(schedule)
    onClose()
  }

  const selectedVaccine = VACCINE_TYPES[selectedVaccineId]

  const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getAutocalculatedText = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00')
    return `Auto-calculated: ${date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`
  }

  return (
    <Modal visible={visible} transparent animationType='fade'>
      <Pressable
        style={styles.overlay}
        onPress={() => {
          setShowVaccineDropdown(false)
          onClose()
        }}
      >
        <View style={styles.dragIndicator} />

        <Pressable style={styles.modalContent} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Vaccine Schedule</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color='#6b7280' />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          >
            {/* Vaccine Type Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Select Vaccine Type</Text>

              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowVaccineDropdown(!showVaccineDropdown)}
              >
                <Text style={styles.dropdownValue}>
                  {selectedVaccine?.name}
                </Text>
                <ChevronDown size={20} color='#6b7280' />
              </TouchableOpacity>

              {showVaccineDropdown && (
                <View style={styles.dropdownMenu}>
                  {Object.values(VACCINE_TYPES).map((vaccine) => (
                    <TouchableOpacity
                      key={vaccine.id}
                      style={[
                        styles.dropdownItem,
                        selectedVaccineId === vaccine.id &&
                          styles.dropdownItemSelected,
                      ]}
                      onPress={() => handleVaccineSelect(vaccine.id)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedVaccineId === vaccine.id &&
                            styles.dropdownItemTextSelected,
                        ]}
                      >
                        {vaccine.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Doses Section */}
            <View style={styles.dosesContainer}>
              {doses.map((dose, index) => (
                <View key={dose.doseNumber}>
                  <View style={styles.doseCard}>
                    {/* Dose Header */}
                    <View style={styles.doseHeader}>
                      <View
                        style={[
                          styles.doseCircle,
                          dose.completed && styles.doseCircleCompleted,
                        ]}
                      >
                        {dose.completed && (
                          <Check size={20} color='#fff' strokeWidth={3} />
                        )}
                      </View>

                      <View style={styles.doseTextBlock}>
                        <Text style={styles.doseNumber}>
                          Dose {dose.doseNumber}
                        </Text>
                        {dose.autoCalculated && (
                          <Text style={styles.autocalculatedText}>
                            {getAutocalculatedText(dose.date)}
                          </Text>
                        )}
                        {dose.completed && !dose.autoCalculated && (
                          <Text style={styles.completedDate}>
                            {formatDateForDisplay(dose.date)} (Today)
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Date and Time Inputs */}
                    <View style={styles.doseInputsRow}>
                      <View style={styles.doseInputContainer}>
                        <Pressable style={styles.doseInput}>
                          <Calendar size={16} color='#A6A6A6' />
                          <Text style={styles.doseInputValue}>
                            {formatDateForDisplay(dose.date)}
                          </Text>
                        </Pressable>
                      </View>

                      <View style={styles.doseInputContainer}>
                        <Pressable style={styles.doseInput}>
                          <Clock size={16} color='#A6A6A6' />
                          <Text style={styles.doseInputValue}>{dose.time}</Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Editable Inputs */}
                    <View style={styles.editableInputsRow}>
                      <View style={{ flex: 1 }}>
                        <DatePicker
                          title=''
                          placeholder='วัน/เดือน/ปี'
                          value={new Date(dose.date + 'T00:00:00')}
                          onChange={(date) =>
                            handleDateChange(dose.doseNumber, date)
                          }
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TimePicker
                          title=''
                          placeholder='เลือกเวลา'
                          value={dose.time}
                          onChange={(time) =>
                            handleTimeChange(dose.doseNumber, time)
                          }
                        />
                      </View>
                    </View>
                  </View>

                  {/* Divider */}
                  {index < doses.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save Series</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragIndicator: {
    position: 'absolute',
    top: 20,
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    zIndex: 10,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '85%',
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d1e7f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 10,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownValue: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#fff',
    marginTop: -1,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
  },
  dropdownItemTextSelected: {
    color: '#5FA7D1',
    fontFamily: 'Prompt_500Medium',
  },
  dosesContainer: {
    marginBottom: 16,
  },
  doseCard: {
    marginBottom: 12,
  },
  doseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
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
    marginTop: 2,
  },
  doseCircleCompleted: {
    backgroundColor: '#5FA7D1',
    borderColor: '#5FA7D1',
  },
  doseTextBlock: {
    flex: 1,
  },
  doseNumber: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 4,
  },
  autocalculatedText: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  completedDate: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
  },
  doseInputsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  doseInputContainer: {
    flex: 1,
  },
  doseInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
  },
  doseInputValue: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
  },
  editableInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    backgroundColor: '#5FA7D1',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#fff',
  },
})
