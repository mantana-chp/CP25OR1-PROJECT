import { Request, Response, NextFunction } from 'express';
import * as reminderService from './reminder-service';
import { createReminderSchema } from './reminder-schema';
import { ApiResponse } from '../../shared/types';
import { BadRequestError, ConflictError, formatZodError } from '../../shared/errors';
import { API_RESPONSE_STATUS } from '../../shared/constants';
import { logger } from '../../libs/logger';
import { ZodError } from 'zod';

export const getReminders = (req: Request, res: Response, next: NextFunction) => {
  logger.info('[Reminder Controller] getReminders: Start');
  try {
    const reminders = reminderService.getAllReminders();
    const response: ApiResponse<typeof reminders> = {
      status: {
        code: API_RESPONSE_STATUS.SUCCESS.CODE,
        description: API_RESPONSE_STATUS.SUCCESS.DESCRIPTION,
      },
      data: reminders,
    };
    logger.info('[Reminder Controller] getReminders: Success');
    res.status(200).json(response);
  } catch (error: unknown) {
    logger.error('[Reminder Controller] getReminders: Error', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
};

export const createReminder = (req: Request, res: Response, next: NextFunction) => {
  logger.info('[Reminder Controller] createReminder: Start', { body: req.body });
  try {
    const validatedData = createReminderSchema.parse(req.body);
    const newReminder = reminderService.createNewReminder(validatedData);
    const response: ApiResponse<typeof newReminder> = {
      status: {
        code: API_RESPONSE_STATUS.SUCCESS.CODE,
        description: API_RESPONSE_STATUS.SUCCESS.DESCRIPTION,
      },
      data: newReminder,
    };
    logger.info('[Reminder Controller] createReminder: Success', { reminderId: newReminder.id });
    res.status(201).json(response);
  } catch (error: unknown) {
    logger.error('[Reminder Controller] createReminder: Error', error instanceof Error ? error : new Error(String(error)));
    if (error instanceof ZodError) {
      next(new BadRequestError("Validation failed", formatZodError(error)));
    } else if (error instanceof Error && error.message.includes("Duplicate reminder")) {
      next(new ConflictError("Conflict", [{ code: 409, message: error.message }]));
    } else {
      next(error);
    }
  }
};