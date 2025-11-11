import { Router } from 'express';
import { getNotifications, updateNotification } from './notification-controller';
import { authGuard } from '../../middlewares/authGuard';
import { validate } from '../../middlewares/validate';
import { getNotificationsSchema, updateNotificationSchema } from './notification-schema';

const notificationRoutes = Router();

notificationRoutes.get('/', authGuard, validate(getNotificationsSchema), getNotifications);
notificationRoutes.patch('/:id', authGuard, validate(updateNotificationSchema), updateNotification);

export default notificationRoutes;
