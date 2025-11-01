import { ApiError, get, post } from '../utils/fetchUtils';
import { IReminder } from '../domain/calendar.domain';
import { IAddReminder } from '../domain/add_reminder.domain';

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

export async function addReminder(
  reminderData: IAddReminder
): Promise<IReminder | null> {
  try {
    const newReminder = await post<IReminder>('/v1/reminders', reminderData);

    console.log('Successfully added reminder:', newReminder);
    return newReminder;
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle known API errors (e.g., 400 Bad Request, 401, 500)
      console.error(`API Error ${error.status}: ${error.message}`, error.data);
    } else {
      console.error('Failed to add reminder:', (error as Error).message);
    }

    return null;
  }
}
