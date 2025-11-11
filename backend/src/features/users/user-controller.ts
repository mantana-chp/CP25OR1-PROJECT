import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import * as userService from './user-service';
import { sendSuccess } from '../../shared/response';
import { registerPushTokenSchema } from './user-schema';

export const registerPushToken = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user!;
  const { token, provider } = registerPushTokenSchema.parse(req).body;

  await userService.registerPushToken(userId, token, provider);

  sendSuccess(res, { message: 'Push token registered successfully' }, 200);
});
