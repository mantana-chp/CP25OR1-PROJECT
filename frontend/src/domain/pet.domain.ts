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
    updated_at: v.updated_at || ''
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
  birth_date: yup.date().required('กรุณากรอกวันเกิดสัตว์เลี้ยง')
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

export interface IPetProfile {
  id: string
  name: string
  gender: string
  species: string
  breed: string
  age: number
  weight: string
}
