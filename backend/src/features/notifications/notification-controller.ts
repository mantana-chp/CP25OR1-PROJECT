import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import * as notificationService from './notification-service';
import { sendSuccess } from '../../shared/response';
import { getNotificationsSchema, updateNotificationSchema } from './notification-schema';
import { z } from 'zod'; // Keep z import for req.params validation

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user!;
  const { isRead } = getNotificationsSchema.parse(req).query;

  const notifications = await notificationService.getNotifications(userId, isRead);
  sendSuccess(res, notifications);
});

export const updateNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user!;
  const { id: notificationId } = z.object({ id: z.string().uuid() }).parse(req.params);
  const { read } = updateNotificationSchema.parse(req).body;

  const updatedNotification = await notificationService.markAsRead(notificationId, userId, read);
  sendSuccess(res, updatedNotification);
});
