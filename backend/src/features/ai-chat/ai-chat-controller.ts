import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';
import * as aiChatService from './ai-chat-service';
import { chatSchema } from './ai-chat-schema';

/**
 * Handle AI chat requests
 * POST /v1/ai-chat
 */
export const chat = asyncHandler(async (req: Request, res: Response) => {
  const { query, resolvedPetId, history } = chatSchema.parse(req).body;
  const { id: userId } = req.user!;

  const result = await aiChatService.chatWithAI(query, userId, resolvedPetId, history);

  sendSuccess(res, result);
});