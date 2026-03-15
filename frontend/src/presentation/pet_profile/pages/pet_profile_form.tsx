import { useFocusEffect, useRouter } from 'expo-router'
import { useFormik } from 'formik'
import React, { useCallback, useEffect, useState } from 'react'

import DatePicker from '../../components/date_picker'
import DiscardChangesModal from '../../components/discard_changes_modal'
import Dropdown from '../../components/dropdown'
import Header from '../../components/header_component'
import InputText from '../../components/text_input'
import ImagePickerButton from '../../components/image_picker_button'

import { useAuth } from '@/src/context/AuthContext'
import { usePets } from '@/src/context/PetContext'
import {
  IPetProfileForm,
  ISpecies,
  petProfileInitValue,
  petProfileValidateSchema,
} from '@/src/domain/pet.domain'
import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import { uploadService } from '@/src/utils/api/services/upload_service'
import { useLocalSearchParams } from 'expo-router'
import {
  Alert,
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
} from 'react-native'
import PrimaryButton from '../../components/primary_button'
import { Trash2 } from 'lucide-react-native'

interface IPetFormState {
  id: string
  values: IPetProfileForm
  selectedSpeciesId: string
  selectedImageUri: string | undefined
  originalImageKey: string | undefined
  isDirty: boolean
}

interface PetProfileFormProps {
  isOnboarding?: boolean
}

export default function PetProfileForm({
  isOnboarding = false,
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
  const [showBackModal, setShowBackModal] = useState(false)

  // Multi-pet form state - array of pet forms
  const [petForms, setPetForms] = useState<IPetFormState[]>([])

  // For edit mode - keep single form state
  const [initialPetData, setInitialPetData] = useState<IPetProfileForm | null>(
    null,
  )
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('')
  const [selectedImageUri, setSelectedImageUri] = useState<string | undefined>(
    undefined,
  )
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [originalImageKey, setOriginalImageKey] = useState<string | undefined>(
    undefined,
  )
  const [isDeletingImage, setIsDeletingImage] = useState(false)

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

  // Initialize form when not in edit mode
  useEffect(() => {
    if (!isEditMode && speciesData.length > 0) {
      // Always initialize with empty form when in create mode
      const emptyForm: IPetFormState = {
        id: 'pet_form_0',
        values: petProfileInitValue({} as IPetProfileForm),
        selectedSpeciesId: '',
        selectedImageUri: undefined,
        originalImageKey: undefined,
        isDirty: false,
      }
      setPetForms([emptyForm])
    }
  }, [speciesData, isEditMode])

  // Reset form when focusing on create page (user returning after successful creation)
  useFocusEffect(
    useCallback(() => {
      if (!isEditMode) {
        const emptyForm: IPetFormState = {
          id: 'pet_form_0',
          values: petProfileInitValue({} as IPetProfileForm),
          selectedSpeciesId: '',
          selectedImageUri: undefined,
          originalImageKey: undefined,
          isDirty: false,
        }
        setPetForms([emptyForm])
      }
    }, [isEditMode]),
  )

  // Load pet data for edit mode
  const loadPetData = useCallback(async () => {
    if (!petId) {
      return
    }

    if (speciesData.length === 0) return

    try {
      setIsLoading(true)
      // Clear previous image state immediately to prevent flashing old image
      setSelectedImageUri(undefined)
      setOriginalImageKey(undefined)
      
      const response = await petProfileService.getPetProfileById(petId)

      if (response) {
        setInitialPetData(response.data)
        // Set the species ID to populate breed dropdown
        if (response.data.species_id) {
          setSelectedSpeciesId(response.data.species_id)
        }
        // Load existing profile image in edit mode
        if (response.data.profile_image_url) {
          setSelectedImageUri(response.data.profile_image_url)
          setOriginalImageKey(response.data.profile_image_key || undefined)
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
      if (isEditMode && petId && speciesData.length > 0) {
        loadPetData()
      }
    }, [loadPetData, petId, speciesData, isEditMode]),
  )

  // ------------------
  // HANDLERS - Multi-Pet Form Management
  // ------------------

  const updatePetFormField = (
    formId: string,
    fieldName: string,
    value: any,
  ) => {
    setPetForms((prevForms) =>
      prevForms.map((form) =>
        form.id === formId
          ? {
              ...form,
              values: { ...form.values, [fieldName]: value },
              isDirty: true,
            }
          : form,
      ),
    )
  }

  const updatePetFormSpecies = (formId: string, speciesId: string) => {
    setPetForms((prevForms) =>
      prevForms.map((form) =>
        form.id === formId
          ? {
              ...form,
              selectedSpeciesId: speciesId,
              values: { ...form.values, species_id: speciesId, breed_id: '' },
              isDirty: true,
            }
          : form,
      ),
    )
  }

  const updatePetFormImage = (formId: string, imageUri: string | undefined) => {
    setPetForms((prevForms) =>
      prevForms.map((form) =>
        form.id === formId
          ? {
              ...form,
              selectedImageUri: imageUri,
              values: { ...form.values, profileImage: imageUri },
              isDirty: true,
            }
          : form,
      ),
    )
  }

  const addPetForm = () => {
    const newFormId = `pet_form_${Date.now()}`
    const newForm: IPetFormState = {
      id: newFormId,
      values: petProfileInitValue({} as IPetProfileForm),
      selectedSpeciesId: '',
      selectedImageUri: undefined,
      originalImageKey: undefined,
      isDirty: false,
    }
    setPetForms((prev) => [...prev, newForm])
  }

  const deletePetForm = (formId: string) => {
    if (petForms.length <= 1) {
      Alert.alert('เกิดข้อผิดพลาด', 'ต้องมีอย่างน้อยหนึ่งฟอร์มสัตว์เลี้ยง')
      return
    }
    setPetForms((prev) => prev.filter((form) => form.id !== formId))
  }

  const getIsFormChanged = (form: IPetFormState): boolean => {
    return form.isDirty
  }

  const handleBackPress = () => {
    const hasChanges = petForms.some((form) => getIsFormChanged(form))
    if (hasChanges) {
      setShowBackModal(true)
    } else {
      router.push('/(tabs)/pet_profile')
    }
  }

  const handleConfirmBack = () => {
    setPetForms([
      {
        id: 'pet_form_0',
        values: petProfileInitValue({} as IPetProfileForm),
        selectedSpeciesId: '',
        selectedImageUri: undefined,
        originalImageKey: undefined,
        isDirty: false,
      },
    ])
    setShowBackModal(false)
    router.push('/(tabs)/pet_profile')
  }

  const formik = useFormik<IPetProfileForm>({
    initialValues: petProfileInitValue(
      initialPetData || ({} as IPetProfileForm),
    ),
    enableReinitialize: true,
    validationSchema: petProfileValidateSchema,
    validateOnChange: false,
    validateOnBlur: false,
    validateOnMount: false,
    onSubmit: async (values) => {
      // This is only used in EDIT MODE
      try {
        setIsSubmitting(true)

        const { id, breed_id, weight, profileImage, ...petData } = values

        const petDataToSend: any = {
          ...petData,
        }

        if (breed_id) petDataToSend.breed_id = breed_id

        if (weight) petDataToSend.weight = Number(weight)

        // Update pet profile
        await petProfileService.updatePetProfile(petId, petDataToSend)

        // Handle image upload/change
        const isImageChanged =
          selectedImageUri &&
          selectedImageUri !== initialPetData?.profile_image_url

        if (isImageChanged) {
          console.log('🎬 Starting image upload process...')
          try {
            setIsUploadingImage(true)

            const fileName = `pet_${petId}_${Date.now()}.jpg`
            const fileResponse = await fetch(selectedImageUri)
            const blob = await fileResponse.blob()
            const fileType = 'image/jpeg'
            const fileSize = blob.size

            console.log('📸 Image Upload Debug:', {
              petId: petId,
              fileName,
              fileType,
              fileSize: `${(fileSize / 1024).toFixed(2)} KB`,
            })

            // Request presigned upload URL from backend
            const uploadUrlResponse = await uploadService.requestUploadUrl({
              fileName,
              fileType,
              fileSize,
              category: 'pet-profile',
              entityId: petId,
            })

            console.log('⬆️ Upload URL Response:', uploadUrlResponse)

            const { uploadUrl, objectKey } = uploadUrlResponse.data

            console.log('🔑 Object Key received:', objectKey)

            await uploadService.uploadFileToMinIO(
              uploadUrl,
              selectedImageUri,
              fileType,
            )

            console.log('✅ File uploaded to MinIO successfully')
            console.log('📦 MinIO Upload Details:', {
              bucket: 'dev-pet-attachments',
              objectKey,
              fileSize: `${(fileSize / 1024).toFixed(2)} KB`,
              uploadUrl: uploadUrl.split('?')[0],
            })

            // Save object key to pet profile in backend
            const updateResponse = await petProfileService.updateProfileImage(
              petId,
              objectKey,
            )
            console.log('💾 Pet profile image saved:', updateResponse)

            // Delete old image from storage if image changed
            if (isImageChanged && originalImageKey) {
              console.log(
                '🗑️ Deleting old image from storage:',
                originalImageKey,
              )
              try {
                await uploadService.deleteFileFromMinIO(originalImageKey)
                console.log('📦 Old image deleted from storage successfully')
              } catch (deleteError) {
                console.warn('⚠️ Failed to delete old image:', deleteError)
              }
            }

            // Update originalImageKey to prevent re-deletion
            setOriginalImageKey(objectKey)
          } catch (error) {
            console.error('❌ Image upload failed:', error)
            Alert.alert(
              'บันทึกรูปไม่สำเร็จ',
              'แก้ไขข้อมูลสัตว์เลี้ยง แต่รูปภาพไม่ได้อัปโหลด กรุณาลองอีกครั้ง',
            )
          } finally {
            setIsUploadingImage(false)
          }
        }

        await checkPetProfile()
        await refreshPets()

        console.log('✅ Pet update completed, navigating to pet_profile page')

        if (isOnboarding) {
          await completeOnboarding()
        }

        router.push('/(tabs)/pet_profile')

        Alert.alert('สำเร็จ!', 'แก้ไขโปรไฟล์สัตว์เลี้ยงเรียบร้อยแล้ว', [
          {
            text: 'ตกลง',
            onPress: () => {
              router.push('/(tabs)/pet_profile')
            },
          },
        ])

        formik.resetForm()
        setSelectedSpeciesId('')
        setSelectedImageUri(undefined)
      } catch (error: any) {
        console.error('❌ Error updating pet profile:', error)
        Alert.alert(
          'เกิดข้อผิดพลาด',
          error?.message ||
            'ไม่สามารถบันทึกโปรไฟล์สัตว์เลี้ยงได้ กรุณาลองใหม่อีกครั้ง',
        )
      } finally {
        setIsSubmitting(false)
        setIsUploadingImage(false)
      }
    },
  })

  // Submit handler for multi-pet create mode
  const handleCreateMultiplePets = async () => {
    try {
      setIsSubmitting(true)

      // Validate all forms first
      const validationErrors: { [key: string]: string[] } = {}

      for (const form of petForms) {
        try {
          await petProfileValidateSchema.validate(form.values)
        } catch (error: any) {
          validationErrors[form.id] = [error.message]
        }
      }

      if (Object.keys(validationErrors).length > 0) {
        const errorMessages = Object.values(validationErrors).flat().join('\n')
        Alert.alert('ข้อผิดพลาดในการตรวจสอบ', errorMessages)
        return
      }

      // Prepare pet data for batch create
      const petsToCreate = petForms.map((form) => {
        const { id, breed_id, weight, profileImage, ...petData } = form.values
        const petDataToSend: any = { ...petData }
        if (breed_id) petDataToSend.breed_id = breed_id
        if (weight) petDataToSend.weight = Number(weight)
        return petDataToSend
      })

      // Create pets in batch or single
      let createdPets: any[] = []
      if (petForms.length === 1) {
        // Single pet - use original create endpoint
        const response = await petProfileService.createPetProfile(
          petsToCreate[0],
        )
        createdPets = [response.data]
      } else {
        // Multiple pets - use batch create
        const response =
          await petProfileService.createMultiplePets(petsToCreate)
        createdPets = response.data || []
      }

      console.log(`🆔 Created ${createdPets.length} pets`)

      // Upload images for each created pet
      for (let i = 0; i < petForms.length; i++) {
        const form = petForms[i]
        const createdPet = createdPets[i]

        if (form.selectedImageUri && createdPet?.id) {
          console.log(`🎬 Starting image upload for pet ${i + 1}...`)
          try {
            setIsUploadingImage(true)

            const fileName = `pet_${createdPet.id}_${Date.now()}.jpg`
            const fileResponse = await fetch(form.selectedImageUri)
            const blob = await fileResponse.blob()
            const fileType = 'image/jpeg'
            const fileSize = blob.size

            // Request presigned upload URL
            const uploadUrlResponse = await uploadService.requestUploadUrl({
              fileName,
              fileType,
              fileSize,
              category: 'pet-profile',
              entityId: createdPet.id,
            })

            const { uploadUrl, objectKey } = uploadUrlResponse.data

            // Upload to MinIO
            await uploadService.uploadFileToMinIO(
              uploadUrl,
              form.selectedImageUri,
              fileType,
            )

            // Save object key to pet profile
            await petProfileService.updateProfileImage(createdPet.id, objectKey)

            console.log(`✅ Image uploaded for pet ${i + 1}`)
          } catch (error) {
            console.error(`❌ Image upload failed for pet ${i + 1}:`, error)
            Alert.alert(
              'บันทึกรูปไม่สำเร็จ',
              `สัตว์เลี้ยงที่ ${i + 1} ถูกสร้าง แต่รูปภาพไม่ได้อัปโหลด`,
            )
          } finally {
            setIsUploadingImage(false)
          }
        }
      }

      await checkPetProfile()
      await refreshPets()

      console.log('✅ All pets created successfully')

      if (isOnboarding) {
        await completeOnboarding()
      }

      Alert.alert(
        'สำเร็จ!',
        `บันทึกโปรไฟล์สัตว์เลี้ยง ${createdPets.length} ตัวเรียบร้อยแล้ว`,
        [
          {
            text: 'ตกลง',
            onPress: () => {
              router.push('/(tabs)/pet_profile')
            },
          },
        ],
      )

      router.push('/(tabs)/pet_profile')
    } catch (error: any) {
      console.error('❌ Error creating pets:', error)
      Alert.alert(
        'เกิดข้อผิดพลาด',
        error?.message || 'ไม่สามารถบันทึกโปรไฟล์สัตว์เลี้ยงได้',
      )
    } finally {
      setIsSubmitting(false)
      setIsUploadingImage(false)
    }
  }

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBackPress()
        return true
      },
    )
    return () => backHandler.remove()
  }, [petForms])

  // ------------------
  // DROPDOWN OPTIONS
  // ------------------
  const petTypeOptions = speciesData.map((species) => ({
    id: species.id,
    name: species.name,
  }))

  const getBreedOptions = (speciesId: string) =>
    speciesData
      .find((species) => species.id === speciesId)
      ?.breeds.map((breed) => ({
        id: breed.id,
        name: breed.name,
      })) || []

  const genderOptions = [
    { name: 'เพศผู้', id: 'male' },
    { name: 'เพศเมีย', id: 'female' },
  ]

  // ------------------
  // HANDLERS - Helper Functions
  // ------------------
  const handleSpeciesChange = (speciesId: string) => {
    if (isEditMode) {
      setSelectedSpeciesId(speciesId)
      formik.setFieldValue('species_id', speciesId)
      formik.setFieldValue('breed_id', '')
    }
  }

  const handleImageSelected = (imageUri: string) => {
    if (isEditMode) {
      console.log('🖼️ Image Selected:', imageUri)
      setSelectedImageUri(imageUri)
      formik.setFieldValue('profileImage', imageUri)
    }
  }

  const handleImageDeleted = () => {
    if (isEditMode) {
      // In edit mode, delete from storage immediately with confirmation
      Alert.alert(
        'ลบรูปภาพ',
        'คุณแน่ใจว่าต้องการลบรูปภาพประจำตัวสัตว์เลี้ยงหรือไม่?',
        [
          {
            text: 'ยกเลิก',
            style: 'cancel',
          },
          {
            text: 'ลบ',
            onPress: async () => {
              try {
                setIsDeletingImage(true)
                await petProfileService.deleteProfileImage(petId)
                console.log('✅ Profile image deleted successfully')

                setSelectedImageUri(undefined)
                setOriginalImageKey(undefined)
                formik.setFieldValue('profileImage', null)

                Alert.alert('สำเร็จ', 'ลบรูปภาพเรียบร้อยแล้ว')
              } catch (error) {
                console.error('❌ Error deleting profile image:', error)
                Alert.alert(
                  'เกิดข้อผิดพลาด',
                  'ไม่สามารถลบรูปภาพได้ กรุณาลองใหม่อีกครั้ง',
                )
              } finally {
                setIsDeletingImage(false)
              }
            },
            style: 'destructive',
          },
        ],
      )
    }
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

    if (isEditMode) {
      formik.setFieldValue('weight', cleaned)
    }
  }

  const handleWeightChangeMulti = (formId: string, value: string) => {
    let cleaned = value.replace(/[^\d.]/g, '')

    const parts = cleaned.split('.')
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('')
    }

    if (parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2)
    }

    updatePetFormField(formId, 'weight', cleaned)
  }

  // ------------------
  // RENDER
  // ------------------

  // Helper function to render a single pet form
  const renderPetForm = (form: IPetFormState, index: number) => {
    const breedOptions = getBreedOptions(form.selectedSpeciesId)
    const showDeleteButton = petForms.length > 1
    const showFormHeader = petForms.length > 1

    return (
      <View key={form.id} style={styles.petFormWrapper}>
        {showFormHeader && (
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>สัตว์เลี้ยงที่ {index + 1}</Text>
            {showDeleteButton && (
              <TouchableOpacity
                onPress={() => deletePetForm(form.id)}
                style={styles.deleteFormButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={18} color='#fff' />
              </TouchableOpacity>
            )}
          </View>
        )}

        <ImagePickerButton
          onImageSelected={(uri) => updatePetFormImage(form.id, uri)}
          onImageDeleted={() => updatePetFormImage(form.id, undefined)}
          imageUri={form.selectedImageUri}
          disabled={isSubmitting || isUploadingImage}
          placeholder='เลือกรูปภาพสัตว์เลี้ยง'
        />

        <InputText
          title='ชื่อสัตว์เลี้ยง'
          value={form.values?.pet_name || ''}
          placeholder='ชื่อสัตว์เลี้ยง เช่น มะลิ, โบ้, Lucky'
          required={true}
          onChangeText={(v) => updatePetFormField(form.id, 'pet_name', v)}
          error={undefined}
        />

        <Dropdown
          title='เพศสัตว์เลี้ยง'
          options={genderOptions}
          placeholder='เลือกเพศสัตว์เลี้ยง'
          required={true}
          onSelect={(v) => updatePetFormField(form.id, 'gender', v)}
          value={form.values?.gender || ''}
          error={undefined}
          disable={false}
        />

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Dropdown
              title='ประเภทสัตว์เลี้ยง'
              options={petTypeOptions}
              placeholder='เลือกประเภทสัตว์เลี้ยง'
              required={true}
              onSelect={(speciesId) => updatePetFormSpecies(form.id, speciesId)}
              value={form.values?.species_id || ''}
              error={undefined}
              disable={false}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Dropdown
              title='สายพันธุ์สัตว์เลี้ยง'
              options={breedOptions}
              placeholder='เลือกสายพันธุ์สัตว์เลี้ยง'
              onSelect={(v) => updatePetFormField(form.id, 'breed_id', v)}
              value={form.values?.breed_id || ''}
              disable={!form.selectedSpeciesId || breedOptions.length === 0}
            />
          </View>
        </View>

        <DatePicker
          title='วันเกิด'
          placeholder='วัน/เดือน/ปีเกิด'
          value={
            form.values.birth_date
              ? new Date(form.values.birth_date)
              : undefined
          }
          onChange={(v) => {
            const today = new Date()
            today.setHours(23, 59, 59, 999)
            if (v && v <= today) {
              updatePetFormField(form.id, 'birth_date', v)
            }
          }}
          error={undefined}
          required={true}
          maximumDate={new Date()}
        />

        <InputText
          title='น้ำหนักสัตว์เลี้ยง (กิโลกรัม)'
          value={form.values?.weight || ''}
          placeholder='น้ำหนักสัตว์เลี้ยง'
          keyboardType='numeric'
          onChangeText={(v) => handleWeightChangeMulti(form.id, v)}
          error={undefined}
        />

        {index < petForms.length - 1 && <View style={styles.formDivider} />}
      </View>
    )
  }

  if (isEditMode) {
    // EDIT MODE - Single form
    const breedOptions =
      speciesData
        .find((species) => species.id === selectedSpeciesId)
        ?.breeds.map((breed) => ({
          id: breed.id,
          name: breed.name,
        })) || []

    return (
      <>
        <Header
          title='แก้ไขโปรไฟล์สัตว์เลี้ยง'
          goBack={!isOnboarding}
          onBackPress={handleBackPress}
        />

        <ScrollView>
          <View style={styles.formContainer}>
            <ImagePickerButton
              onImageSelected={handleImageSelected}
              onImageDeleted={handleImageDeleted}
              imageUri={selectedImageUri}
              disabled={isSubmitting || isUploadingImage || isDeletingImage}
              placeholder='เลือกรูปภาพสัตว์เลี้ยง'
            />
            <InputText
              title='ชื่อสัตว์เลี้ยง'
              value={formik.values?.pet_name}
              placeholder='ชื่อสัตว์เลี้ยง เช่น มะลิ, โบ้, Lucky'
              required={true}
              onChangeText={(v) => formik.setFieldValue('pet_name', v)}
              error={formik?.errors?.pet_name}
            />
            <Dropdown
              title='เพศสัตว์เลี้ยง'
              options={genderOptions}
              placeholder='เลือกเพศสัตว์เลี้ยง'
              required={true}
              onSelect={(v) => formik.setFieldValue('gender', v)}
              value={formik.values?.gender}
              error={formik?.errors?.gender}
              disable={isEditMode}
            />

            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Dropdown
                  title='ประเภทสัตว์เลี้ยง'
                  options={petTypeOptions}
                  placeholder='เลือกประเภทสัตว์เลี้ยง'
                  required={true}
                  onSelect={handleSpeciesChange}
                  value={formik.values?.species_id}
                  error={formik?.errors?.species_id}
                  disable={isEditMode}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Dropdown
                  title='สายพันธุ์สัตว์เลี้ยง'
                  options={breedOptions}
                  placeholder='เลือกสายพันธุ์สัตว์เลี้ยง'
                  onSelect={(v) => formik.setFieldValue('breed_id', v)}
                  value={formik.values?.breed_id}
                  disable={!selectedSpeciesId || breedOptions.length === 0}
                />
              </View>
            </View>

            <DatePicker
              title='วันเกิด'
              placeholder='วัน/เดือน/ปีเกิด'
              value={
                formik.values.birth_date
                  ? new Date(formik.values.birth_date)
                  : undefined
              }
              onChange={(v) => {
                const today = new Date()
                today.setHours(23, 59, 59, 999)
                if (v && v <= today) {
                  formik.setFieldValue('birth_date', v)
                }
              }}
              error={formik?.errors?.birth_date}
              required={true}
              maximumDate={new Date()}
            />

            <InputText
              title='น้ำหนักสัตว์เลี้ยง (กิโลกรัม)'
              value={formik.values?.weight}
              placeholder='น้ำหนักสัตว์เลี้ยง'
              keyboardType='numeric'
              onChangeText={handleWeightChange}
              error={formik?.errors?.weight}
            />

            <PrimaryButton
              onPress={() => formik.handleSubmit()}
              title='บันทึกการแก้ไข'
              disabled={
                isSubmitting ||
                isLoading ||
                isUploadingImage ||
                isDeletingImage ||
                (!formik.dirty &&
                  selectedImageUri === initialPetData?.profile_image_url)
              }
              isLoading={isSubmitting || isUploadingImage || isDeletingImage}
              loadingText={
                isDeletingImage
                  ? 'กำลังลบรูปภาพ...'
                  : isUploadingImage
                    ? 'กำลังอัปโหลดรูปภาพ...'
                    : 'กำลังบันทึกการแก้ไข...'
              }
            />
          </View>
        </ScrollView>

        <DiscardChangesModal
          visible={showBackModal}
          onClose={() => setShowBackModal(false)}
          onDiscard={handleConfirmBack}
          variant='petProfile'
        />
      </>
    )
  }

  // CREATE MODE - Multiple forms
  return (
    <>
      <Header
        title='สร้างโปรไฟล์สัตว์เลี้ยง'
        goBack={!isOnboarding}
        onBackPress={handleBackPress}
      />

      <ScrollView>
        <View style={styles.formContainer}>
          {petForms.map((form, index) => renderPetForm(form, index))}

          {/* Save Button */}
          <PrimaryButton
            onPress={handleCreateMultiplePets}
            title={
              petForms.length > 1
                ? `บันทึกโปรไฟล์สัตว์เลี้ยง (${petForms.length})`
                : 'บันทึกโปรไฟล์สัตว์เลี้ยง'
            }
            disabled={isSubmitting || isLoading || isUploadingImage}
            isLoading={isSubmitting || isUploadingImage}
            loadingText={
              isUploadingImage ? 'กำลังอัปโหลดรูปภาพ...' : 'กำลังบันทึก...'
            }
          />

          {/* Add Pet Button */}
          <TouchableOpacity
            onPress={addPetForm}
            style={styles.addPetButton}
            disabled={isSubmitting}
          >
            <Text style={styles.addPetButtonText}>+ เพิ่มสัตว์เลี้ยง</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DiscardChangesModal
        visible={showBackModal}
        onClose={() => setShowBackModal(false)}
        onDiscard={handleConfirmBack}
        variant='petProfile'
      />
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
    margin: 16,
  },
  petFormWrapper: {
    marginBottom: 16,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  formTitle: {
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
    color: '#333',
  },
  deleteFormButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteFormButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Prompt_600SemiBold',
  },
  formDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  addPetButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8f4',
    marginVertical: 16,
    alignItems: 'center',
  },
  addPetButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
  },
})
