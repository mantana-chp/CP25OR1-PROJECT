import { z } from 'zod';

export const registerPushTokenSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Push token is required'),
  }),
});
