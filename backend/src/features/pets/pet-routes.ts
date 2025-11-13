import { Router } from 'express';
import { createPet, getPetProfileController } from './pet-controller';
import { authGuard } from '../../middlewares/authGuard';
import { validate } from '../../middlewares/validate';
import { createPetSchema } from './pet-schema';

const petRoutes = Router();

petRoutes.post('/', authGuard, validate(createPetSchema), createPet);
petRoutes.get('/me', authGuard, getPetProfileController); // get pet profile

export default petRoutes;
