import { Router } from 'express';
import reminderRoutes from './features/reminders/reminder-routes';
import authRoutes from './features/auth/auth-routes';
import petRoutes from './features/pets/pet-routes';
import notificationRoutes from './features/notifications/notification-routes';
import userRoutes from './features/users/user-routes';
import metaRoutes from './features/meta/meta-routes';
import healthRecordRoutes from './features/health-record/health-record-routes';
import vaccineScheduleRoutes from './features/vaccine-schedule/vaccine-schedule-routes';
import aiChatRoutes from './features/ai-chat/ai-chat-routes';
import uploadRoutes from './features/file-uploads/upload-routes';
import {
    petSharingPetRoutes,
    petSharesRoutes,
    ownerContactsRoutes,
} from './features/pet-sharing/pet-sharing-routes';

const v1Router = Router();

// Mount feature-specific routers
v1Router.use('/auth', authRoutes);
v1Router.use('/reminders', reminderRoutes);
v1Router.use('/pets', petRoutes);
v1Router.use('/pets', petSharingPetRoutes);
v1Router.use('/pet-shares', petSharesRoutes);
v1Router.use('/owner-contacts', ownerContactsRoutes);
v1Router.use('/notifications', notificationRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/meta', metaRoutes);
v1Router.use('/health-records', healthRecordRoutes);
v1Router.use('/vaccines', vaccineScheduleRoutes);
v1Router.use('/ai-chat', aiChatRoutes);
v1Router.use('/uploads', uploadRoutes);

export default v1Router;

