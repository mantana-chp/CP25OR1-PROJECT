import { Router } from 'express';
import { createPet } from './pet-controller';
import { authGuard } from '../../middlewares/authGuard';
import { validate } from '../../middlewares/validate';
import { createPetSchema } from './pet-schema';

const petRoutes = Router();

petRoutes.post('/', authGuard, validate(createPetSchema), createPet);

export default petRoutes;
