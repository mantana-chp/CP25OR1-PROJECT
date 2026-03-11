export enum VaccineLogicType {
  UNTIL_AGE = 'UNTIL_AGE',
  FIXED_COUNT = 'FIXED_COUNT',
}

import { addDays, differenceInDays, format } from 'date-fns'
import prisma from '../../libs/db'
import { ApiError, NotFoundError } from '../../shared/errors'
import { canAccessPet } from '../pet-sharing/pet-sharing-repository'

export interface CalculateScheduleInput {
  petId: string
  vaccineId: number
  startDate?: string
  userId: string
}

export interface Appointment {
  doseNumber: number
  date: string
  type: 'Primary' | 'Booster'
  ageInDays: number
}

export const calculateVaccineSchedule = async (
  input: CalculateScheduleInput,
): Promise<Appointment[]> => {
  const { petId, vaccineId, userId } = input

  const pet = await prisma.pets.findUnique({ where: { id: petId } })
  const vaccine = await prisma.vaccine.findUnique({ where: { id: vaccineId } })

  if (!pet) {
    throw new NotFoundError('Pet not found')
  }
  if (!vaccine) {
    throw new NotFoundError('Vaccine not found')
  }
  // Allow owner or active caregiver to calculate vaccine schedules
  if (!(await canAccessPet(petId, userId))) {
    throw new ApiError('Forbidden: Access to this pet denied.', 403)
  }
  if (!pet.birth_date) {
    throw new ApiError(
      'Pet birth date is required for schedule calculation.',
      400,
    )
  }
  if (pet.species_id !== vaccine.species_id) {
    throw new ApiError("Vaccine is not suitable for this pet's species.", 400)
  }

  const schedule: Appointment[] = []
  let doseCounter = 1
  const birthDate = new Date(pet.birth_date)
  let currentDate = input.startDate ? new Date(input.startDate) : new Date()

  // --- Step 1: Min Age Validation ---
  const ageAtStartDate = differenceInDays(currentDate, birthDate)
  if (ageAtStartDate < vaccine.min_age_days) {
    currentDate = addDays(birthDate, vaccine.min_age_days)
  }

  // --- Step 2: Primary Series ---
  let lastPrimaryDoseDate: Date | null = null

  if (vaccine.primary_series_logic === VaccineLogicType.FIXED_COUNT) {
    for (let i = 0; i < vaccine.primary_target_value; i++) {
      schedule.push({
        doseNumber: doseCounter++,
        date: format(currentDate, 'yyyy-MM-dd'),
        type: 'Primary',
        ageInDays: differenceInDays(currentDate, birthDate),
      })
      lastPrimaryDoseDate = currentDate
      currentDate = addDays(currentDate, vaccine.primary_interval_days)
    }
  } else if (vaccine.primary_series_logic === VaccineLogicType.UNTIL_AGE) {
    const petAgeAtStartDate = differenceInDays(currentDate, birthDate)

    // Adult Case
    if (petAgeAtStartDate >= vaccine.primary_target_value) {
      for (let i = 0; i < vaccine.adult_primary_dose_count; i++) {
        schedule.push({
          doseNumber: doseCounter++,
          date: format(currentDate, 'yyyy-MM-dd'),
          type: 'Primary',
          ageInDays: differenceInDays(currentDate, birthDate),
        })
        lastPrimaryDoseDate = currentDate
        if (vaccine.primary_interval_days > 0) {
          currentDate = addDays(currentDate, vaccine.primary_interval_days)
        }
      }
    }
    // Puppy/Kitten Case
    else {
      while (
        differenceInDays(currentDate, birthDate) < vaccine.primary_target_value
      ) {
        schedule.push({
          doseNumber: doseCounter++,
          date: format(currentDate, 'yyyy-MM-dd'),
          type: 'Primary',
          ageInDays: differenceInDays(currentDate, birthDate),
        })
        lastPrimaryDoseDate = currentDate
        currentDate = addDays(currentDate, vaccine.primary_interval_days)
      }
    }
  }

  // --- Step 3: Boosters ---
  if (lastPrimaryDoseDate) {
    // Booster 1
    const booster1Date = addDays(
      lastPrimaryDoseDate,
      vaccine.booster_1_interval_days,
    )
    schedule.push({
      doseNumber: doseCounter++,
      date: format(booster1Date, 'yyyy-MM-dd'),
      type: 'Booster',
      ageInDays: differenceInDays(booster1Date, birthDate),
    })

    // Next Booster (Looping)
    const nextBoosterDate = addDays(
      booster1Date,
      vaccine.booster_repeat_interval_days,
    )
    schedule.push({
      doseNumber: doseCounter++,
      date: format(nextBoosterDate, 'yyyy-MM-dd'),
      type: 'Booster',
      ageInDays: differenceInDays(nextBoosterDate, birthDate),
    })
  }

  return schedule
}

export const getVaccinesForPet = async (petId: string, userId: string) => {
  const pet = await prisma.pets.findUnique({
    where: { id: petId },
  })

  if (!pet) {
    throw new NotFoundError('Pet not found')
  }

  // Allow owner or active caregiver to view vaccines
  if (!(await canAccessPet(petId, userId))) {
    throw new ApiError('Forbidden: Access to this pet denied.', 403)
  }

  const vaccines = await prisma.vaccine.findMany({
    where: {
      species_id: pet.species_id,
    },
    select: {
      id: true,
      species_id: true,
      vaccine_name: true,
      vaccine_name_th: true,
      primary_series_logic: true,
      primary_target_value: true,
      primary_interval_days: true,
      adult_primary_dose_count: true,
    },
    orderBy: {
      vaccine_name: 'asc',
    },
  })

  return vaccines.map((vaccine) => {
    const primaryDoseCount =
      vaccine.primary_series_logic === VaccineLogicType.FIXED_COUNT
        ? vaccine.primary_target_value
        : Math.max(
          vaccine.primary_interval_days > 0
            ? Math.ceil(
              vaccine.primary_target_value / vaccine.primary_interval_days,
            )
            : vaccine.primary_target_value,
          vaccine.adult_primary_dose_count,
        )

    return {
      id: vaccine.id,
      species_id: vaccine.species_id,
      vaccine_name: vaccine.vaccine_name,
      vaccine_name_th: vaccine.vaccine_name_th,
      maxDoses: primaryDoseCount + 2,
    }
  })
}
