import { useRouter } from 'expo-router'
import { useFormik } from 'formik'
import React, { useEffect, useState } from 'react'

import DatePicker from '../../components/date_picker'
import Dropdown from '../../components/dropdown'
import Header from '../../components/header_component'
import InputText from '../../components/text_input'

import { useAuth } from '@/src/context/AuthContext'
import {
  IPetProfileForm,
  ISpecies,
  petProfileInitValue,
  petProfileValidateSchema
} from '@/src/domain/pet.domain'
import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native'
import PrimaryButton from '../../components/primary_button'

export default function PetProfileForm() {
  // ------------------
  // CONST
  // ------------------
  const router = useRouter()
  const { checkPetProfile, hasPetProfile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [speciesData, setSpeciesData] = useState<ISpecies[]>([])
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('')

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

  // ------------------
  // FORMIK
  // ------------------
  const formik = useFormik<IPetProfileForm>({
    initialValues: petProfileInitValue({} as IPetProfileForm),
    validationSchema: petProfileValidateSchema,
    validateOnChange: false,
    validateOnBlur: false,
    validateOnMount: false,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true)
        console.log('📝 Creating pet profile:', values)

        const { id, ...petData } = values

        const petDataToSend = {
          ...petData,
          weight: petData.weight ? Number(petData.weight) : 0
        } as any

        const response = await petProfileService.createPetProfile(petDataToSend)
        console.log('✅ Pet profile created successfully:', response)

        // Update pet profile status in auth context
        await checkPetProfile()

        Alert.alert('สำเร็จ!', 'บันทึกโปรไฟล์สัตว์เลี้ยงเรียบร้อยแล้ว', [
          {
            text: 'ตกลง',
            onPress: () => {
              formik.resetForm()
              router.replace('/(tabs)')
            }
          }
        ])
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
    { name: 'ผู้', id: 'male' },
    { name: 'เมีย', id: 'female' }
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
      <Header title="สร้างโปรไฟล์สัตว์เลี้ยง" goBack={hasPetProfile} />

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

          <InputText
            title="น้ำหนักสัตว์เลี้ยง (กก.)"
            value={formik.values?.weight}
            placeholder="น้ำหนักสัตว์เลี้ยง"
            keyboardType="numeric"
            onChangeText={(v) => formik.setFieldValue('weight', v)}
            error={formik?.errors?.weight}
          />
          <DatePicker
            title="วันเกิด"
            placeholder="วัน/เดือน/ปีเกิด"
            value={
              formik.values.birth_date
                ? new Date(formik.values.birth_date)
                : undefined
            }
            onChange={(v) => formik.setFieldValue('birth_date', v)}
          />
          <PrimaryButton
            onPress={() => formik.handleSubmit()}
            title="บันทึกโปรไฟล์"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            loadingText="กำลังบันทึก..."
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
    gap: 16,
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
