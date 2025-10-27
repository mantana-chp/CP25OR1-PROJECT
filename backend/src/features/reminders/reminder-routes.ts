import { Router } from 'express';
import { getReminders, createReminder } from './reminder-controller';

const router = Router();

router.get('/', getReminders);
router.post('/', createReminder);

export default router;