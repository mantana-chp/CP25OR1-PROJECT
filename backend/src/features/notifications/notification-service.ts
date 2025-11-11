import * as notificationRepository from './notification-repository';
import { ApiError, NotFoundError } from '../../shared/errors';

export const getNotifications = async (userId: string, isRead?: boolean) => {
  return await notificationRepository.findManyByUserId(userId, isRead);
};

export const markAsRead = async (notificationId: string, userId: string, read: boolean) => {
  const notification = await notificationRepository.findById(notificationId);

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  if (notification.user_id !== userId) {
    throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this notification' }]);
  }

  return await notificationRepository.update(notificationId, {
    read_at: read ? new Date() : null,
  });
};
