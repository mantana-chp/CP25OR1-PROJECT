import { Request, Response } from 'express';
import * as reminderService from './reminder-service';
import { createReminderSchema, getReminderByIdSchema } from './reminder-schema';
import { CreateReminderInput } from './reminder-types';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';

export const getReminders = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user!;
  const reminders = await reminderService.getAllReminders(userId);
  sendSuccess(res, reminders);
});

export const getReminderById = asyncHandler(async (req: Request, res: Response) => {
  const { id: reminderId } = getReminderByIdSchema.parse(req.params);
  const { id: userId } = req.user!;
  const reminder = await reminderService.getReminderById(reminderId, userId);
  sendSuccess(res, reminder);
});

export const createReminder = asyncHandler(async (req: Request, res: Response) => {
  const validatedData: CreateReminderInput = createReminderSchema.parse(req.body);
  const { id: userId } = req.user!;
  const newReminder = await reminderService.createNewReminder(validatedData, userId);
  sendSuccess(res, newReminder, 201);
});

export const deleteReminder = asyncHandler(async (req: Request, res: Response) => {
  const { id: reminderId } = getReminderByIdSchema.parse(req.params);
  const { id: userId } = req.user!;
  await reminderService.deleteReminder(reminderId, userId);
  sendSuccess(res, undefined, 200); // 200 OK not 204 just for consistency
});

export const toggleReminderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id: reminderId } = getReminderByIdSchema.parse(req.params);
  const { id: userId } = req.user!;
  const updatedReminder = await reminderService.toggleReminderStatus(reminderId, userId);
  sendSuccess(res, updatedReminder);
});