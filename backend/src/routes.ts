import { Router } from 'express';
import reminderRoutes from './features/reminders/reminder-routes';
import authRoutes from './features/auth/auth-routes';
import petRoutes from './features/pets/pet-routes';
import notificationRoutes from './features/notifications/notification-routes';
import userRoutes from './features/users/user-routes';
import metaRoutes from './features/meta/meta-routes';
import healthRecordRoutes from './features/health-record/health-record-routes';
import vaccineScheduleRoutes from './features/vaccine-schedule/vaccine-schedule-routes';

const v1Router = Router();

// Mount feature-specific routers
v1Router.use('/auth', authRoutes);
v1Router.use('/reminders', reminderRoutes);
v1Router.use('/pets', petRoutes);
v1Router.use('/notifications', notificationRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/meta', metaRoutes);
v1Router.use('/health-records', healthRecordRoutes);
v1Router.use('/vaccines', vaccineScheduleRoutes);

export default v1Router;

