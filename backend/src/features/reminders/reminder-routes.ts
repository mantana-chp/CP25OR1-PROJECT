import { Router } from 'express';
import {
  getReminders,
  createReminder,
  getReminderById,
  deleteReminder,
  toggleReminderStatus,
} from './reminder-controller';
import { authGuard } from '../../middlewares/authGuard';

const router = Router();

router.get('/', authGuard, getReminders);
router.get('/:id', authGuard, getReminderById);
router.post('/', authGuard, createReminder);
router.delete('/:id', authGuard, deleteReminder);
router.patch('/:id/status', authGuard, toggleReminderStatus);

export default router;