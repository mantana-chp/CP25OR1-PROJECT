import { z } from 'zod';

export const createPetSchema = z.object({
  body: z.object({
    pet_name: z.string().min(1, 'Pet name is required'),
    species_id: z.uuid('Invalid species ID'),
    breed_id: z.uuid('Invalid breed ID').optional().nullable(),
    gender: z.enum(['male', 'female', 'unknown']),
    weight: z.number().positive('Weight must be a positive number').optional().nullable(),
    birth_date: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  }),
});

export const getPetByIdSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid pet ID format' }),
  }),
});
