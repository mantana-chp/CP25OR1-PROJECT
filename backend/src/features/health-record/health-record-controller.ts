import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import * as healthRecordService from './health-record-service';
import { sendSuccess } from '../../shared/response';

export const getHealthRecordsController = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user!;
  const healthRecords = await healthRecordService.getHealthRecords(userId);
  sendSuccess(res, healthRecords);
});

export const getHealthRecordByIdController = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user!;
  const { id } = req.params;
  const healthRecord = await healthRecordService.getHealthRecordById(id, userId);
  sendSuccess(res, healthRecord);
});
