import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import * as metaService from './meta-service';
import { sendSuccess } from '../../shared/response';

export const getSpeciesAndBreedsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await metaService.getSpeciesAndBreeds();
  sendSuccess(res, data);
});
