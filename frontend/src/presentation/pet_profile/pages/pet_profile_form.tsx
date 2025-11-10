import { useRouter } from 'expo-router'
import { useFormik } from 'formik'
import React, { useState } from 'react'

import DatePicker from '../../components/date_picker'
import Dropdown from '../../components/dropdown'
import Header from '../../components/header_component'
import InputText from '../../components/text_input'

import {
  IPetProfile,
  petProfileInitValue,
  petProfileValidateSchema
} from '@/src/domain/pet.domain'
import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'

export default function PetProfileForm() {
  // ------------------
  // CONST
  // ------------------
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ------------------
  // FORMIK
  // ------------------
  const formik = useFormik<IPetProfile>({
    initialValues: petProfileInitValue({} as IPetProfile),
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

        Alert.alert('สำเร็จ!', 'บันทึกโปรไฟล์สัตว์เลี้ยงเรียบร้อยแล้ว', [
          {
            text: 'ตกลง',
            onPress: () => {
              formik.resetForm()
              router.push('/(tabs)')
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

  const petTypeOptions = [
    { id: '5e8b3d1f-7c4a-4e8b-9a2d-6f1c0e3b7a5d', name: 'cat' },
    { id: '8a4d2f1e-9b7c-4a6d-8e3f-1c5b0a7e9d2f', name: 'rabbit' },
    { id: 'b6d1e8a9-3c5f-4e7b-9a2d-8f1c0e3b7a4d', name: 'bird' },
    { id: 'c2e1a8d5-3b7f-4c6e-9a1d-8f2b0c5e7a4d', name: 'dog' },
    { id: 'e9f2c1a8-7d4b-4f6e-8a3c-5d1e8b7a0c2f', name: 'hamster' }
  ]

  const breedOptions = [
    { id: '1d9a3e2f-8b4c-4a7d-9e1f-6c0b5e8a3d7f', name: 'Pomeranian' },
    { id: '3f6c8a1e-5d2b-4e9a-8c4f-1b7d0a5e9c3f', name: 'Golden Retriever' },
    { id: '6a8d2f1e-9b7c-4a6d-8e3f-1c5b0a7e9d2f', name: 'Siamese' },
    { id: '8c1f0a3e-7d4b-4f6e-9a2c-5d1e8b7a0c3f', name: 'Holland Lop' },
    { id: 'a2e3b8d5-1c7f-4e9a-8b4d-6f2c0e3b7a5d', name: 'Cockatiel' }
  ]

  const genderOptions = [
    { name: 'ผู้', id: 'male' },
    { name: 'เมีย', id: 'female' }
  ]

  // ------------------
  // RENDER
  // ------------------
  return (
    <ScrollView>
      <Header title="สร้างโปรไฟล์สัตว์เลี้ยง" goBack={true} />
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
              onSelect={(v) => formik.setFieldValue('species_id', v)}
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
        <Pressable
          onPress={() => formik.handleSubmit()}
          disabled={isSubmitting}
          style={{
            alignItems: 'center',
            padding: 12,
            backgroundColor: isSubmitting ? '#A0C4D4' : '#5FA7D1',
            borderRadius: 24,
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          <Text style={styles.saveText}>
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
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
