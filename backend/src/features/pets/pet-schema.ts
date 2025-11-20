import { z } from 'zod';

export const createPetSchema = z.object({
  body: z.object({
    pet_name: z.string().min(1, 'Pet name is required'),
    species_id: z.uuid('Invalid species ID'),
    // species_id: z.string(), // pause UUID validation
    breed_id: z.uuid('Invalid breed ID').optional().nullable(),
    // breed_id: z.string().optional().nullable(),
    gender: z.enum(['male', 'female', 'unknown']),
    weight: z.number().positive('Weight must be a positive number').optional().nullable(),
    birth_date: z.iso.datetime({ message: 'Invalid date format' }).optional().nullable(),
  }),
});
