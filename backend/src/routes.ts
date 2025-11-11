import { Router } from 'express';
import reminderRoutes from './features/reminders/reminder-routes';
import authRoutes from './features/auth/auth-routes';
import petRoutes from './features/pets/pet-routes';
import notificationRoutes from './features/notifications/notification-routes';
import userRoutes from './features/users/user-routes';

const v1Router = Router();

// Mount feature-specific routers
v1Router.use('/auth', authRoutes);
v1Router.use('/reminders', reminderRoutes);
v1Router.use('/pets', petRoutes);
v1Router.use('/notifications', notificationRoutes);
v1Router.use('/users', userRoutes);

export default v1Router;

