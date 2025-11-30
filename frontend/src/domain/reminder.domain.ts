import * as yup from 'yup'

export interface ICategoryInfo {
  label: string
  color: string
  icon: string
}

export const CATEGORY_MAP: Record<string, ICategoryInfo> = {
  General: { label: 'ทั่วไป', color: '#6B7280', icon: 'Tag' },
  Vaccination: { label: 'วัคซีน', color: '#EC4899', icon: 'Syringe' },
  Checkup: { label: 'ตรวจสุขภาพ', color: '#3B82F6', icon: 'Stethoscope' },
  Medication: { label: 'ยา/อาหารเสริม', color: '#10B981', icon: 'Pill' },
  Deworming: { label: 'พยาธิ/เห็บหมัด', color: '#F59E0B', icon: 'Pipette' },
  Grooming: { label: 'กรูมมิ่ง', color: '#8B5CF6', icon: 'Scissors' },
  Feeding: { label: 'ให้อาหาร', color: '#F97316', icon: 'Bone' },
}

export const getCategoryInfo = (categoryId: string): ICategoryInfo => {
  return (
    CATEGORY_MAP[categoryId] || {
      label: 'ทั่วไป',
      color: '#6B7280',
      icon: 'Tag',
    }
  )
}

export interface IChildReminder {
  id: string
  userId: string
  petId: string
  categoryName: string
  reminderName: string
  description: string
  reminderDate: string
  reminderTime: string
  reminderStatus: string
  statusUpdatedAt: string
  createdAt: string
  updatedAt: string
}

export interface IReminder {
  id: string
  userId: string
  petId: string
  pet_name: string
  categoryName: string
  reminderName: string
  description: string
  reminderDate: string
  reminderTime: string
  reminderStatus: string
  statusUpdatedAt: string
  createdAt: string
  updatedAt: string
  children?: IReminder[]
}

export const reminderInitValue = (v: IReminder): IReminder => {
  return {
    id: v.id || '',
    userId: v.userId || '',
    petId: v.petId || '',
    pet_name: v.pet_name || '',
    categoryName: v.categoryName || '',
    reminderName: v.reminderName || '',
    description: v.description || '',
    reminderDate: v.reminderDate || '',
    reminderTime: v.reminderTime || '',
    reminderStatus: v.reminderStatus || 'to_do',
    statusUpdatedAt: v.statusUpdatedAt || '',
    createdAt: v.createdAt || '',
    updatedAt: v.updatedAt || '',
    children: v.children || [],
  }
}

export const reminderValidationSchema = yup.object().shape({
  reminderName: yup
    .string()
    .required('กรุณาใส่หัวข้อเตือนความจำ')
    .max(100, 'หัวข้อต้องไม่เกิน 100 ตัวอักษร'),
  description: yup.string().max(500, 'รายละเอียดต้องไม่เกิน 500 ตัวอักษร'),
  reminderDate: yup.string().required('กรุณาเลือกวันที่'),
  reminderTime: yup.string()
})
