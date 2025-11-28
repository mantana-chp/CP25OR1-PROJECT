import { z } from 'zod';

export const calculateScheduleSchema = z.object({
  body: z.object({
    petId: z.uuid(),
    vaccineId: z.number().int().positive(),
    startDate: z.string().optional(),
  }),
});
