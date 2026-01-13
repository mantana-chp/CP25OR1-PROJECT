import { Router } from 'express';
import { getSpeciesAndBreedsController } from './meta-controller';

const metaRoutes = Router();

/**
 * @openapi
 * /meta/species-and-breeds:
 *   get:
 *     summary: Retrieve a list of all species and their breeds
 *     tags:
 *       - Meta
 *     responses:
 *       200:
 *         description: A list of species, each with a nested list of breeds.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SpeciesWithBreeds'
 *       500:
 *         description: Internal server error
 */
metaRoutes.get('/species-and-breeds', getSpeciesAndBreedsController);

export default metaRoutes;
