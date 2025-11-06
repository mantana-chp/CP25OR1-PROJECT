import { useFormik } from 'formik'
import React from 'react'
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'

import {
  IPetProfile,
  // IPetProfileForm,
  petProfileInitValue,
  petProfileValidateSchema
} from '@/src/domain/pet.domain'
import { useRouter } from 'expo-router'
import DatePicker from '../../components/date_picker'
import Dropdown from '../../components/dropdown'
import Header from '../../components/header_component'
import InputText from '../../components/text_input'

export default function PetProfileForm() {
  const router = useRouter()

  // ------------------
  // FORMIK
  // ------------------
  const formik = useFormik<IPetProfile>({
    initialValues: petProfileInitValue({} as IPetProfile),
    validationSchema: petProfileValidateSchema,
    validateOnChange: false,
    validateOnBlur: false,
    validateOnMount: false,
    onSubmit: (values) => {
      console.log(values)
      formik.resetForm()
      router.back()
    }
  })
  console.log(formik?.errors)

  const petTypeOptions = [
    { label: 'สุนัข', value: 'dog' },
    { label: 'แมว', value: 'cat' },
    { label: 'นก', value: 'bird' },
    { label: 'ปลา', value: 'fish' }
  ]

  const breedOptions = [
    { label: 'พันธุ์ไทย', value: 'thai' },
    { label: 'พันธุ์ผสม', value: 'mixed' },
    { label: 'พันธุ์ต่างประเทศ', value: 'foreign' }
  ]

  const genderOptions = [
    { label: 'ผู้', value: 'male' },
    { label: 'เมีย', value: 'female' }
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
          <Dropdown
            title="ประเภทสัตว์เลี้ยง"
            options={petTypeOptions}
            placeholder="เลือกประเภทสัตว์เลี้ยง"
            required={true}
            onSelect={(v) => formik.setFieldValue('species_id', v)}
            value={formik.values?.species_id}
            error={formik?.errors?.species_id}
          />
          <Dropdown
            title="สายพันธุ์สัตว์เลี้ยง"
            options={breedOptions}
            placeholder="เลือกสายพันธุ์สัตว์เลี้ยง"
            onSelect={(v) => formik.setFieldValue('breed_id', v)}
            value={formik.values?.breed_id}
          />
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
          style={{
            alignItems: 'center',
            padding: 12,
            backgroundColor: '#5FA7D1',
            borderRadius: 24
          }}
        >
          <Text style={styles.saveText}>บันทึกโปรไฟล์</Text>
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
