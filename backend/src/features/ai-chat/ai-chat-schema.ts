import { z } from 'zod';

export const chatSchema = z.object({
  body: z.object({
    query: z.string().min(1, 'Query is required'),
    resolvedPetId: z.uuid().optional(),
  }),
});

export type ChatRequest = z.infer<typeof chatSchema>;