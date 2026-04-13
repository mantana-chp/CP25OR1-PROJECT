import { z } from 'zod'

export const createPetSchema = z.object({
  body: z.object({
    pet_name: z.string().min(1, 'Pet name is required'),
    avatar_background_color: z.string().optional().nullable(),
    species_id: z.uuid('Invalid species ID'),
    breed_id: z.uuid('Invalid breed ID').optional().nullable(),
    gender: z.enum(['male', 'female', 'unknown']),
    weight: z
      .number()
      .positive('Weight must be a positive number')
      .optional()
      .nullable(),
    birth_date: z.iso
      .datetime({ message: 'Invalid date format' })
      .optional()
      .nullable(),
  }),
})

export const createMultiplePetsSchema = z.object({
  body: z.object({
    pets: z
      .array(
        z.object({
          pet_name: z.string().min(1, 'Pet name is required'),
          avatar_background_color: z.string().optional().nullable(),
          species_id: z.uuid('Invalid species ID'),
          breed_id: z.uuid('Invalid breed ID').optional().nullable(),
          gender: z.enum(['male', 'female', 'unknown']),
          weight: z
            .number()
            .positive('Weight must be a positive number')
            .optional()
            .nullable(),
          birth_date: z.iso
            .datetime({ message: 'Invalid date format' })
            .optional()
            .nullable(),
        }),
      )
      .min(1, 'At least one pet is required')
      .max(30, 'Cannot create more than 30 pets at once'),
  }),
})

export const getPetByIdSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid pet ID format' }),
  }),
})

export const updatePetSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid pet ID format' }),
  }),
  body: z.object({
    pet_name: z.string().min(1, 'Pet name is required').optional().nullable(),
    avatar_background_color: z.string().optional().nullable(),
    species_id: z.uuid('Invalid species ID').optional().nullable(),
    breed_id: z.uuid('Invalid breed ID').optional().nullable(),
    birth_date: z.iso
      .datetime({ message: 'Invalid date format' })
      .optional()
      .nullable(),
    gender: z.enum(['male', 'female', 'unknown']).optional().nullable(),
    weight: z
      .number()
      .positive('Weight must be a positive number')
      .optional()
      .nullable(),
  }),
})

export type PetUpdatePayload = z.infer<typeof updatePetSchema.shape.body>

export const updatePetProfileImageSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid pet ID format' }),
  }),
  body: z.object({
    objectKey: z.string().min(1, 'Object key is required'),
  }),
})

export const deletePetProfileImageSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid pet ID format' }),
  }),
})

export const softDeletePetSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid pet ID format' }),
  }),
  body: z.object({
    reason: z.enum(['JUST_DELETE', 'DECEASED'], {
      message: 'Reason must be either JUST_DELETE or DECEASED',
    }),
    deceased_date: z.iso
      .datetime({ message: 'Invalid date format' })
      .optional()
      .nullable(),
  }),
})

export type SoftDeletePetPayload = z.infer<
  typeof softDeletePetSchema.shape.body
>

export const getPetsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['ACTIVE', 'DECEASED', 'DELETED']).optional(),
  }),
})

export const permanentDeletePetSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid pet ID format' }),
  }),
})

export const restorePetSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid pet ID format' }),
  }),
})
