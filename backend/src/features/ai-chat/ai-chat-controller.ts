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
  // Validate request body
  const { query, petId } = chatSchema.parse(req).body;

  // Call the service with optional petId
  const answer = await aiChatService.chatWithAI(query, petId);

  // Send success response
  sendSuccess(res, { answer });
});