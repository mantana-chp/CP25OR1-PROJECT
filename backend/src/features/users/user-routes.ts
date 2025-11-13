import { Router } from 'express';
import { registerPushToken } from './user-controller';
import { authGuard } from '../../middlewares/authGuard';
import { validate } from '../../middlewares/validate';
import { registerPushTokenSchema } from './user-schema';

const userRoutes = Router();

userRoutes.post('/me/push-token', authGuard, validate(registerPushTokenSchema), registerPushToken);

export default userRoutes;
