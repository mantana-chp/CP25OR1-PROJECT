import { Router } from 'express';
import * as aiChatController from './ai-chat-controller';
import { authGuard } from '../../middlewares/authGuard';

const router = Router();

// Protected route: Only logged-in users can chat
router.post('/', authGuard, aiChatController.chat);

export default router;
