import * as yup from 'yup'

export interface IDose {
  doseNumber: number
  date: string // YYYY-MM-DD format
  time: string // HH:mm format
  completed: boolean
  autoCalculated: boolean
}

export interface IVaccineType {
  id: string
  name: string // e.g., "5-in-1 Vaccine"
  doseCount: number
}

export interface IVaccineSchedule {
  vaccineTypeId: string
  vaccineName: string
  doses: IDose[]
}

// Mock vaccine types data
export const VACCINE_TYPES: Record<string, IVaccineType> = {
  '5in1': {
    id: '5in1',
    name: '5-in-1 Vaccine',
    doseCount: 3,
  },
  rabies: {
    id: 'rabies',
    name: 'Rabies Vaccine',
    doseCount: 3,
  },
  dhpp: {
    id: 'dhpp',
    name: 'DHPP Vaccine',
    doseCount: 3,
  },
  lepto: {
    id: 'lepto',
    name: 'Leptospirosis Vaccine',
    doseCount: 2,
  },
  bordetella: {
    id: 'bordetella',
    name: 'Bordetella Vaccine',
    doseCount: 1,
  },
}

export const getVaccineInfo = (vaccineId: string): IVaccineType => {
  return (
    VACCINE_TYPES[vaccineId] || {
      id: '5in1',
      name: '5-in-1 Vaccine',
      doseCount: 3,
    }
  )
}

// Validation schema for vaccine schedule
export const vaccineScheduleValidationSchema = yup.object().shape({
  vaccineTypeId: yup.string().required('กรุณาเลือกประเภทวัคซีน'),
  doses: yup.array().of(
    yup.object().shape({
      date: yup.string().required('กรุณาเลือกวันที่'),
      time: yup.string().required('กรุณาเลือกเวลา'),
    })
  ),
})
