import * as yup from 'yup'

export interface IPetProfileForm {
  id: string
  species_id: string
  breed_id: string
  pet_name: string
  gender: string
  birth_date: Date | null
  weight: string
  created_at: string
  updated_at: string
  profileImage?: string | null
  profile_image_url?: string | null
  profile_image_key?: string | null
}

export interface IProfileImageUploadResponse {
  imageUrl: string
  imagePath?: string
}

export const petProfileInitValue = (v: IPetProfileForm): IPetProfileForm => {
  return {
    id: v.id || '',
    pet_name: v.pet_name || '',
    species_id: v.species_id || '',
    breed_id: v.breed_id || '',
    gender: v.gender || '',
    birth_date: v?.birth_date ? parseDate(v.birth_date) : null,
    weight: v.weight || '',
    created_at: v.created_at || '',
    updated_at: v.updated_at || '',
    profileImage: v?.profileImage || null
  }
}

export const petProfileValidateSchema = yup.object().shape({
  pet_name: yup.string().required('กรุณากรอกชื่อสัตว์เลี้ยง'),
  species_id: yup.string().required('กรุณากรอกประเภทสัตว์เลี้ยง'),
  gender: yup.string().required('กรุณากรอกเพศสัตว์เลี้ยง'),
  breed_id: yup.string(),
  weight: yup
    .number()
    .typeError('กรุณากรอกน้ำหนักเป็นตัวเลข')
    .min(0, 'กรุณากรอกน้ำหนักสัตว์เลี้ยงให้ถูกต้อง'),
  birth_date: yup
    .date()
    .required('กรุณากรอกวันเกิดสัตว์เลี้ยง')
    .max(new Date(), 'วันเกิดต้องไม่เกินวันปัจจุบัน')
})

const parseDate = (dateValue: any): Date => {
  if (!dateValue) return new Date()
  if (dateValue instanceof Date) return dateValue
  try {
    const parsed = new Date(dateValue)
    return isNaN(parsed.getTime()) ? new Date() : parsed
  } catch {
    return new Date()
  }
}

export interface IBreed {
  id: string
  name: string
  name_th: string
}

export interface ISpecies {
  id: string
  name: string
  name_th: string
  breeds: IBreed[]
}

export interface ISpeciesAndBreeds {
  data: ISpecies[]
}

export type TPetStatus = 'ACTIVE' | 'DECEASED' | 'DELETED'
export type TDeletionReason = 'JUST_DELETE' | 'DECEASED'

export interface IPetProfile {
  id: string
  pet_name: string
  gender: string
  species: string
  species_id: string
  breed: string
  breed_id: string
  age: number
  weight: string
  imageUrl?: string
  profile_image_url?: string | null
  profile_image_key?: string | null
  status: TPetStatus
  deceased_date: string | null
  deleted_at: string | null
  deletion_reason: TDeletionReason | null
}

export interface IDeletedPet extends IPetProfile {
  deleted_at: string
  status: 'DELETED'
}

export interface DeletePetRequest {
  reason: TDeletionReason
  deceased_date?: string
}

export interface DeletePetResponse {
  message: string
  status: TPetStatus
}
