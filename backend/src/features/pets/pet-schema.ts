import { z } from 'zod';

export const createPetSchema = z.object({
  body: z.object({
    pet_name: z.string().min(1, 'Pet name is required'),
    species_id: z.uuid('Invalid species ID'),
    breed_id: z.uuid('Invalid breed ID').optional().nullable(),
    gender: z.enum(['male', 'female', 'unknown']),
    weight: z.number().positive('Weight must be a positive number').optional().nullable(),
    birth_date: z.iso.datetime({ message: 'Invalid date format' }).optional().nullable(),
  }),
});

export const getPetByIdSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid pet ID format' }),
  }),
});

export const updatePetSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid pet ID format' }),
  }),
  body: z.object({
    pet_name: z.string().min(1, 'Pet name is required').optional().nullable(),
    species_id: z.uuid('Invalid species ID').optional().nullable(),
    breed_id: z.uuid('Invalid breed ID').optional().nullable(),
    birth_date: z.iso.datetime({ message: 'Invalid date format' }).optional().nullable(),
    gender: z.enum(['male', 'female', 'unknown']).optional().nullable(),
    weight: z.number().positive('Weight must be a positive number').optional().nullable(),
  }),
});

export type PetUpdatePayload = z.infer<typeof updatePetSchema.shape.body>;
