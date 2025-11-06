
import { Router } from 'express';
import AuthController from './auth-controller';
import { validate } from '../../middlewares/validate';
import { deviceLoginSchema, refreshSchema } from './auth-schema';
import { authGuard } from '../../middlewares/authGuard';

const authRoutes = Router();

authRoutes.post('/device-login', validate(deviceLoginSchema), AuthController.deviceLogin);
authRoutes.post('/refresh', validate(refreshSchema), AuthController.refresh);
// authRoutes.post('/logout', validate(logoutSchema), AuthController.logout); 

// For device transfer in other release
// authRoutes.post('/rebind', authGuard, validate(rebindSchema), AuthController.rebind);

export default authRoutes;
