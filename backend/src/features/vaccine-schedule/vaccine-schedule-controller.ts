import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import * as vaccineScheduleService from './vaccine-schedule-service';
import { calculateScheduleSchema } from './vaccine-schedule-schema';
import { sendSuccess } from '../../shared/response';

export const calculateScheduleController = asyncHandler(async (req: Request, res: Response) => {
  const { petId, vaccineId, startDate } = calculateScheduleSchema.parse(req).body;
  const { id: userId } = req.user!;

  const schedule = await vaccineScheduleService.calculateVaccineSchedule({
    petId,
    vaccineId,
    startDate,
    userId,
  });

  sendSuccess(res, schedule);
});
