import { Router } from 'express';
import { registerPushToken } from './user-controller';
import { authGuard } from '../../middlewares/authGuard';
import { validate } from '../../middlewares/validate';
import { registerPushTokenSchema } from './user-schema';
import { hasAccessiblePetsController } from '../pet-sharing/pet-sharing-controller';

const userRoutes = Router();

userRoutes.post('/me/push-token', authGuard, validate(registerPushTokenSchema), registerPushToken);

// Startup check: does this user own or have caregiver access to at least 1 pet?
// GET /v1/users/me/has-accessible-pets
userRoutes.get('/me/has-accessible-pets', authGuard, hasAccessiblePetsController);

export default userRoutes;
