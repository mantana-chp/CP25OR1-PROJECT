import { z } from 'zod';

export const registerPushTokenSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Push token is required'),
    provider: z.enum(['expo', 'fcm', 'apns']).default('expo'),
  }),
});
