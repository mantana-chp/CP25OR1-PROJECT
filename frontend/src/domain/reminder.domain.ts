import * as yup from 'yup'

export interface IReminder {
  id: string
  userId: string
  petId: string
  pet_name: string
  categoryId: string
  reminderName: string
  description: string
  reminderDate: string
  reminderTime: string
  reminderStatus: string
  statusUpdatedAt: string
  createdAt: string
  updatedAt: string
}

export const reminderInitValue = (v: IReminder): IReminder => {
  return {
    id: v.id || '',
    userId: v.userId || '',
    petId: v.petId || '',
    pet_name: v.pet_name || '',
    categoryId: v.categoryId || '',
    reminderName: v.reminderName || '',
    description: v.description || '',
    reminderDate: v.reminderDate || '',
    reminderTime: v.reminderTime || '',
    reminderStatus: v.reminderStatus || 'to_do',
    statusUpdatedAt: v.statusUpdatedAt || '',
    createdAt: v.createdAt || '',
    updatedAt: v.updatedAt || ''
  }
}

export const reminderValidationSchema = yup.object().shape({
  reminderName: yup
    .string()
    .required('กรุณาใส่หัวข้อการเตือนความจำ')
    .max(100, 'หัวข้อต้องไม่เกิน 100 ตัวอักษร'),
  description: yup.string().max(500, 'รายละเอียดต้องไม่เกิน 500 ตัวอักษร'),
  reminderDate: yup.string().required('กรุณาเลือกวันที่'),
  reminderTime: yup.string()
})
