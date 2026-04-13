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
  const { query, clientChatSessionId, resolvedPetId, contextId, severitySubmission, petClarificationSubmission } =
    chatSchema.parse(req).body;

  const { id: userId } = req.user!;
  // installationId is validated by authGuard (JWT must match X-Installation-Id header)
  const installationId = req.headers['x-installation-id'] as string;

  const result = await aiChatService.chatWithAI({
    query,
    userId,
    installationId,
    clientChatSessionId,
    resolvedPetId,
    contextId,
    severitySubmission,
    petClarificationSubmission,
  });

  sendSuccess(res, result);
});
