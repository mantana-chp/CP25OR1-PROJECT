import { IReminder } from '../domain/calendar.domain';
import { ApiError, get } from '../utils/fetchUtils';

export async function fetchReminders(): Promise<IReminder[] | null> {
  try {
    const reminders = await get<IReminder[]>('/reminders');

    console.log('Successfully fetched reminders:', reminders);
    return reminders;
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle known API errors (e.g., 404, 500, 401)
      console.error(`API Error ${error.status}: ${error.message}`, error.data);
    } else {
      console.error('Failed to fetch reminders:', (error as Error).message);
    }

    return null;
  }
}
