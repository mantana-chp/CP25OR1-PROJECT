import { z } from 'zod';

const historyItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

export const chatSchema = z.object({
  body: z.object({
    query: z.string().min(1, 'Query is required'),
    resolvedPetId: z.uuid().optional(),
    history: z
      .array(historyItemSchema)
      .max(8)
      .refine(
        (arr) => !arr || arr.every((item, i) => (i % 2 === 0 ? item.role === 'user' : item.role === 'assistant')),
        { message: 'History must alternate starting with user: [user, assistant, user, assistant, ...]' }
      )
      .optional(),
  }),
});

export type ChatRequest = z.infer<typeof chatSchema>;
export type HistoryItem = z.infer<typeof historyItemSchema>;