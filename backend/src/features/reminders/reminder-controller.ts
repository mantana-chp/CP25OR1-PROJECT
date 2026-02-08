import { Request, Response } from 'express';
import * as reminderService from './reminder-service';
import {
  createReminderSchema,
  getReminderByIdSchema,
  deleteReminderSchema,
  CreateReminderPayload,
  updateReminderSchema,
  UpdateReminderPayload,
} from './reminder-schema';
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
  const validatedData: CreateReminderPayload = createReminderSchema.parse(req).body;
  const { id: userId } = req.user!;
  const newReminder = await reminderService.createNewReminder(validatedData, userId);
  sendSuccess(res, newReminder, 201);
});

export const updateReminder = asyncHandler(async (req: Request, res: Response) => {
  const {
    params: { id: reminderId },
    body: validatedData,
  }: { params: { id: string }; body: UpdateReminderPayload } = updateReminderSchema.parse(req);
  const { id: userId } = req.user!;
  const updatedReminder = await reminderService.updateReminder(reminderId, userId, validatedData);
  sendSuccess(res, updatedReminder);
});

export const deleteReminder = asyncHandler(async (req: Request, res: Response) => {
  const {
    params: { id: reminderId },
    query: { deleteScope },
  } = deleteReminderSchema.parse(req);
  const { id: userId } = req.user!;
  await reminderService.deleteReminder(reminderId, userId, deleteScope);
  sendSuccess(res, undefined, 200); // 200 OK not 204 just for consistency
});

export const toggleReminderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id: reminderId } = getReminderByIdSchema.parse(req.params);
  const { id: userId } = req.user!;
  const updatedReminder = await reminderService.toggleReminderStatus(reminderId, userId);
  sendSuccess(res, updatedReminder);
});