import { z } from 'zod';

const historyItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

const severitySubmissionSchema = z.object({
  contextId: z.uuid('Invalid contextId format'),
  level: z.number().int().min(1).max(5),
  label: z.string().min(1).max(120).optional(),
});

export const chatSchema = z.object({
  body: z.object({
    query: z.string().min(1, 'Query is required'),
    resolvedPetId: z.uuid().optional(),
    contextId: z.uuid().optional(),
    severitySubmission: severitySubmissionSchema.optional(),
    history: z
      .array(historyItemSchema)
      .max(8)
      .refine(
        (arr) => !arr || arr.every((item, i) => (i % 2 === 0 ? item.role === 'user' : item.role === 'assistant')),
        { message: 'History must alternate starting with user: [user, assistant, user, assistant, ...]' }
      )
      .optional(),
  }).superRefine((body, ctx) => {
    if (
      body.severitySubmission &&
      body.contextId &&
      body.severitySubmission.contextId !== body.contextId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'severitySubmission.contextId must match contextId when both are provided',
        path: ['severitySubmission', 'contextId'],
      });
    }
  }),
});

export type ChatRequest = z.infer<typeof chatSchema>;
export type HistoryItem = z.infer<typeof historyItemSchema>;
export type SeveritySubmissionInput = z.infer<typeof severitySubmissionSchema>;
