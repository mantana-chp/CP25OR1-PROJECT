import { Router } from 'express';
import { getSpeciesAndBreedsController } from './meta-controller';

const metaRoutes = Router();

metaRoutes.get('/species-and-breeds', getSpeciesAndBreedsController);

export default metaRoutes;
