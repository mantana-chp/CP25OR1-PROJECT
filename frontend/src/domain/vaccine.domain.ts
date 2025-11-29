import * as yup from 'yup'

export interface IVaccine {
  id: number
  species_id: string
  vaccine_name: string
  vaccine_name_th: string
}

export interface IDose {
  doseNumber: number
  date: string
  time: string
  type?: string
  ageInDays?: number
  isAutoCalculated: boolean
  isEdited: boolean
}

export interface ICalculateVaccineRequest {
  petId: string
  vaccineId: number
  startDate: string
}

export interface ICalculatedDose {
  doseNumber: number
  date: string
  type: string
  ageInDays: number
}

// Validation schema for vaccine schedule
export const vaccineScheduleValidationSchema = yup.object().shape({
  vaccineId: yup.string().required('กรุณาเลือกประเภทวัคซีน'),
  doses: yup.array().of(
    yup.object().shape({
      date: yup.string().required('กรุณาเลือกวันที่ เข็มที่ 1'),
    })
  ),
})
