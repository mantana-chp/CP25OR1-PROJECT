import { Router } from 'express';
import reminderRoutes from './features/reminders/reminder-routes';

const v1Router = Router();

// Mount feature-specific routers
v1Router.use('/reminders', reminderRoutes);

export default v1Router;
