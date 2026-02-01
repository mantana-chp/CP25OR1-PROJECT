import { useRouter } from 'expo-router'
import { useFormik } from 'formik'
import React, { useEffect, useState } from 'react'

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
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native'
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

  // Load existing pet data in edit mode
  useEffect(() => {
    const loadPetData = async () => {
      if (!petId) return

      try {
        setIsLoading(true)
        const response = await petProfileService.getPetProfileById(petId)
        console.log(response.data)

        if (response) {
          setInitialPetData(response.data)
          formik.setValues(petProfileInitValue(response.data))
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
    }

    if (speciesData.length > 0) {
      loadPetData()
    }
  }, [petId, speciesData])

  // ------------------
  // FORMIK
  // ------------------
  const formik = useFormik<IPetProfileForm>({
    initialValues: petProfileInitValue(
      initialPetData || ({} as IPetProfileForm)
    ),
    validationSchema: petProfileValidateSchema,
    validateOnChange: false,
    validateOnBlur: false,
    validateOnMount: false,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true)
        console.log(
          isEditMode ? '📝 Updating pet profile:' : '📝 Creating pet profile:',
          values
        )

        const { id, breed_id, weight, ...petData } = values

        const petDataToSend: any = {
          ...petData
        }

        // Only add breed_id if it has a value
        if (breed_id) {
          petDataToSend.breed_id = breed_id
        }

        // Only add weight if it has a value
        if (weight) {
          petDataToSend.weight = Number(weight)
        }

        if (isEditMode) {
          // Update existing pet
          await petProfileService.updatePetProfile(petId, petDataToSend)
          console.log('✅ Pet profile updated successfully')
        } else {
          // Create new pet
          await petProfileService.createPetProfile(petDataToSend)
          console.log('✅ Pet profile created successfully')
        }

        // Update pet profile status in auth context and refresh PetContext
        await checkPetProfile()
        await refreshPets()

        // If in onboarding mode, complete onboarding now
        if (isOnboarding) {
          await completeOnboarding()
        }

        Alert.alert(
          'สำเร็จ!',
          isEditMode
            ? 'แก้ไขโปรไฟล์สัตว์เลี้ยงเรียบร้อยแล้ว'
            : 'บันทึกโปรไฟล์สัตว์เลี้ยงเรียบร้อยแล้ว',
          [
            {
              text: 'ตกลง',
              onPress: () => {
                formik.resetForm()
                router.back()
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
          />

          <InputText
            title="น้ำหนักสัตว์เลี้ยง (กก.)"
            value={formik.values?.weight}
            placeholder="น้ำหนักสัตว์เลี้ยง"
            keyboardType="numeric"
            onChangeText={(v) => formik.setFieldValue('weight', v)}
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
  }
})
