import { z } from 'zod';

export const getNotificationsSchema = z.object({
  query: z.object({
    isRead: z.preprocess(
      (val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      },
      z.boolean().optional()
    ),
  }),
});

export const updateNotificationSchema = z.object({
  body: z.object({
    read: z.boolean(),
  }),
});
