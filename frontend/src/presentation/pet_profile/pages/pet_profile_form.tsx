import { useFocusEffect, useRouter } from 'expo-router'
import { useFormik } from 'formik'
import React, { useCallback, useEffect, useState } from 'react'

import DatePicker from '../../components/date_picker'
import Dropdown from '../../components/dropdown'
import Header from '../../components/header_component'
import InputText from '../../components/text_input'

import { useAuth } from '@/src/context/AuthContext'
import { usePets } from '@/src/context/PetContext'
import {
  IPetProfileForm,
  ISpecies,
  petProfileInitValue,
  petProfileValidateSchema
} from '@/src/domain/pet.domain'
import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import { useLocalSearchParams } from 'expo-router'
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import PrimaryButton from '../../components/primary_button'

interface PetProfileFormProps {
  isOnboarding?: boolean
}

export default function PetProfileForm({
  isOnboarding = false
}: PetProfileFormProps) {
  // ------------------
  // CONST
  // ------------------
  const router = useRouter()
  const params = useLocalSearchParams()
  const petId = (params?.petId || '') as string
  const isEditMode = !!petId

  const { checkPetProfile, completeOnboarding } = useAuth()
  const { refreshPets } = usePets()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [speciesData, setSpeciesData] = useState<ISpecies[]>([])
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('')
  const [initialPetData, setInitialPetData] = useState<IPetProfileForm | null>(
    null
  )
  const [showBackModal, setShowBackModal] = useState(false)

  // ------------------
  // FETCH
  // ------------------
  useEffect(() => {
    const fetchSpeciesAndBreeds = async () => {
      try {
        const response = await petProfileService.getSpeciesAndBreeds()
        if (response) {
          setSpeciesData(response.data)
        }
      } catch (error) {
        console.error('❌ Error fetching species and breeds:', error)
      }
    }
    fetchSpeciesAndBreeds()
  }, [])

  const loadPetData = useCallback(async () => {
    if (!petId) {
      setInitialPetData(null)
      return
    }

    if (speciesData.length === 0) return

    try {
      setIsLoading(true)
      const response = await petProfileService.getPetProfileById(petId)

      if (response) {
        setInitialPetData(response.data)
        // Set the species ID to populate breed dropdown
        if (response.data.species_id) {
          setSelectedSpeciesId(response.data.species_id)
        }
      }
    } catch (error) {
      console.error('❌ Error loading pet data:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลสัตว์เลี้ยงได้')
    } finally {
      setIsLoading(false)
    }
  }, [petId, speciesData])

  useFocusEffect(
    useCallback(() => {
      if (petId && speciesData.length > 0) {
        loadPetData()
      } else if (!petId) {
        setInitialPetData(null)
        setSelectedSpeciesId('')
      }
    }, [loadPetData, petId, speciesData])
  )

  // ------------------
  // FORMIK
  // ------------------
  const formik = useFormik<IPetProfileForm>({
    initialValues: petProfileInitValue(
      initialPetData || ({} as IPetProfileForm)
    ),
    enableReinitialize: true,
    validationSchema: petProfileValidateSchema,
    validateOnChange: false,
    validateOnBlur: false,
    validateOnMount: false,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true)

        const { id, breed_id, weight, ...petData } = values

        const petDataToSend: any = {
          ...petData
        }

        if (breed_id) petDataToSend.breed_id = breed_id

        if (weight) petDataToSend.weight = Number(weight)

        if (isEditMode) {
          await petProfileService.updatePetProfile(petId, petDataToSend)
        } else {
          await petProfileService.createPetProfile(petDataToSend)
        }

        await checkPetProfile()
        await refreshPets()

        if (isOnboarding) {
          await completeOnboarding()
        }

        formik.resetForm()
        setSelectedSpeciesId('')

        Alert.alert(
          'สำเร็จ!',
          isEditMode
            ? 'แก้ไขโปรไฟล์สัตว์เลี้ยงเรียบร้อยแล้ว'
            : 'บันทึกโปรไฟล์สัตว์เลี้ยงเรียบร้อยแล้ว',
          [
            {
              text: 'ตกลง',
              onPress: () => {
                router.push('/(tabs)/pet_profile')
              }
            }
          ]
        )
      } catch (error: any) {
        console.error('❌ Error creating pet profile:', error)
        Alert.alert(
          'เกิดข้อผิดพลาด',
          error?.message ||
            'ไม่สามารถบันทึกโปรไฟล์สัตว์เลี้ยงได้ กรุณาลองใหม่อีกครั้ง'
        )
      } finally {
        setIsSubmitting(false)
      }
    }
  })

  // ------------------
  // DROPDOWN OPTIONS
  // ------------------
  const petTypeOptions = speciesData.map((species) => ({
    id: species.id,
    name: species.name
  }))

  const breedOptions =
    speciesData
      .find((species) => species.id === selectedSpeciesId)
      ?.breeds.map((breed) => ({
        id: breed.id,
        name: breed.name
      })) || []

  const genderOptions = [
    { name: 'เพศผู้', id: 'male' },
    { name: 'เพศเมีย', id: 'female' }
  ]

  // ------------------
  // HANDLERS
  // ------------------
  const handleSpeciesChange = (speciesId: string) => {
    setSelectedSpeciesId(speciesId)
    formik.setFieldValue('species_id', speciesId)
    formik.setFieldValue('breed_id', '')
  }

  const handleBackPress = () => {
    if (formik.dirty) {
      setShowBackModal(true)
    } else {
      router.push('/(tabs)/pet_profile')
    }
  }

  const handleConfirmBack = () => {
    formik.resetForm()
    setShowBackModal(false)
    router.push('/(tabs)/pet_profile')
  }

  const handleWeightChange = (value: string) => {
    let cleaned = value.replace(/[^\d.]/g, '')

    const parts = cleaned.split('.')
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('')
    }

    if (parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2)
    }

    formik.setFieldValue('weight', cleaned)
  }

  // ------------------
  // RENDER
  // ------------------
  return (
    <>
      <Header
        title={
          isEditMode ? 'แก้ไขโปรไฟล์สัตว์เลี้ยง' : 'สร้างโปรไฟล์สัตว์เลี้ยง'
        }
        goBack={!isOnboarding}
        onBackPress={handleBackPress}
      />

      <ScrollView>
        <View style={styles.formContainer}>
          <Image
            source={require('../../../../assets/images/pet_profile.png')}
            style={{
              width: 100,
              height: 100,
              alignSelf: 'center',
              marginBottom: 16
            }}
          />
          <InputText
            title="ชื่อสัตว์เลี้ยง"
            value={formik.values?.pet_name}
            placeholder="ชื่อสัตว์เลี้ยง เช่น มะลิ, โบ้, Lucky"
            required={true}
            onChangeText={(v) => formik.setFieldValue('pet_name', v)}
            error={formik?.errors?.pet_name}
          />
          <Dropdown
            title="เพศสัตว์เลี้ยง"
            options={genderOptions}
            placeholder="เลือกเพศสัตว์เลี้ยง"
            required={true}
            onSelect={(v) => formik.setFieldValue('gender', v)}
            value={formik.values?.gender}
            error={formik?.errors?.gender}
            disable={isEditMode}
          />

          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Dropdown
                title="ประเภทสัตว์เลี้ยง"
                options={petTypeOptions}
                placeholder="เลือกประเภทสัตว์เลี้ยง"
                required={true}
                onSelect={handleSpeciesChange}
                value={formik.values?.species_id}
                error={formik?.errors?.species_id}
                disable={isEditMode}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Dropdown
                title="สายพันธุ์สัตว์เลี้ยง"
                options={breedOptions}
                placeholder="เลือกสายพันธุ์สัตว์เลี้ยง"
                onSelect={(v) => formik.setFieldValue('breed_id', v)}
                value={formik.values?.breed_id}
                disable={!selectedSpeciesId || breedOptions.length === 0}
              />
            </View>
          </View>

          <DatePicker
            title="วันเกิด"
            placeholder="วัน/เดือน/ปีเกิด"
            value={
              formik.values.birth_date
                ? new Date(formik.values.birth_date)
                : undefined
            }
            onChange={(v) => formik.setFieldValue('birth_date', v)}
            error={formik?.errors?.birth_date}
            required={true}
            maximumDate={new Date()}
          />

          <InputText
            title="น้ำหนักสัตว์เลี้ยง (กก.)"
            value={formik.values?.weight}
            placeholder="น้ำหนักสัตว์เลี้ยง"
            keyboardType="numeric"
            onChangeText={handleWeightChange}
            error={formik?.errors?.weight}
          />

          <PrimaryButton
            onPress={() => formik.handleSubmit()}
            title={isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกโปรไฟล์สัตว์เลี้ยง'}
            disabled={
              isSubmitting || isLoading || (isEditMode && !formik.dirty)
            }
            isLoading={isSubmitting}
            loadingText={
              isEditMode ? 'กำลังบันทึกการแก้ไข...' : 'กำลังบันทึก...'
            }
          />
        </View>
      </ScrollView>

      <Modal
        visible={showBackModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBackModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowBackModal(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
              </Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                คุณต้องการยกเลิกการเปลี่ยนแปลงและย้อนกลับหรือไม่?
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowBackModal(false)}
              >
                <Text style={styles.cancelButtonText}>อยู่ต่อ</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmBack}
              >
                <Text style={styles.confirmButtonText}>ย้อนกลับ</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    margin: 16
  },
  saveText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Prompt_700Bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  modalHeader: {
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    textAlign: 'center'
  },
  modalBody: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 20
  },
  modalMessage: {
    fontSize: 15,
    fontFamily: 'Prompt_400Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB'
  },
  confirmButton: {
    backgroundColor: '#EF4444'
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#374151'
  },
  confirmButtonText: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#fff'
  }
})
