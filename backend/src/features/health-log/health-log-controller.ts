import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';
import * as healthLogService from './health-log-service';
import {
  createHealthLogSchema,
  updateHealthLogSchema,
  petIdParamsSchema,
  healthLogIdParamsSchema,
  getHealthLogsQuerySchema,
} from './health-log-schema';
export const createHealthLog = asyncHandler(async (req: Request, res: Response) => {
  const { body } = createHealthLogSchema.parse(req);
  const { petId } = petIdParamsSchema.parse(req.params);
  const { id: userId } = req.user!;

  const result = await healthLogService.createHealthLog(petId, userId, body);

  if (result.kind === 'conflict') {
    res.status(409).json({
      status: { code: '888', description: 'Conflict' },
      data: { conflict: true, message: 'Weight already logged today' }
    });
    return;
  }

  const { log, statusCode, suspiciousChange, warningMessage } = result;
  sendSuccess(
    res,
    {
      log,
      ...(suspiciousChange && { suspiciousChange: true, warningMessage })
    },
    statusCode
  );
});

export const getHealthLogs = asyncHandler(async (req: Request, res: Response) => {
  const { petId } = petIdParamsSchema.parse(req.params);
  const query = getHealthLogsQuerySchema.parse(req.query);
  const { id: userId } = req.user!;

  const result = await healthLogService.getHealthLogs(
    petId,
    userId,
    query.limit,
    query.offset
  );

  sendSuccess(res, result, 200);
});

export const getHealthLogById = asyncHandler(async (req: Request, res: Response) => {
  const { petId, logId } = healthLogIdParamsSchema.parse(req.params);
  const { id: userId } = req.user!;

  const log = await healthLogService.getHealthLogById(logId, petId, userId);

  sendSuccess(res, { log }, 200);
});

export const updateHealthLog = asyncHandler(async (req: Request, res: Response) => {
  const { petId, logId } = healthLogIdParamsSchema.parse(req.params);
  const { body } = updateHealthLogSchema.parse(req);
  const { id: userId } = req.user!;

  const log = await healthLogService.updateHealthLog(logId, petId, userId, body);

  sendSuccess(res, { log }, 200);
});

export const deleteHealthLog = asyncHandler(async (req: Request, res: Response) => {
  const { petId, logId } = healthLogIdParamsSchema.parse(req.params);
  const { id: userId } = req.user!;

  await healthLogService.deleteHealthLog(logId, petId, userId);

  sendSuccess(res, undefined, 200);
});
