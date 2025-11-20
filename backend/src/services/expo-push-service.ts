import { logger } from '../libs/logger';

export interface PushMessage {
  to: string;
  sound?: 'default';
  title: string;
  body: string;
  data?: object;
}

export interface ExpoPushTicket {
  id: string;
  status: 'ok' | 'error';
  message?: string;
  details?: object;
}

class ExpoPushService {
  private expoApiUrl = 'https://exp.host/--/api/v2/push/send';

  /**
   * Sends one or more push notifications via the Expo Push API.
   * @param messages An array of message objects to send.
   * @returns A Promise that resolves to an array of ExpoPushTicket objects.
   */
  async send(messages: PushMessage[]): Promise<ExpoPushTicket[]> {
    if (messages.length === 0) {
      return [];
    }

    try {
      const response = await fetch(this.expoApiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const responseData = await response.json();

      if (responseData.errors) {
        logger.error('Expo API returned errors:', new Error(JSON.stringify(responseData.errors)));
      }

      // Log the results, checking for errors reported by Expo
      responseData.data.forEach((ticket: ExpoPushTicket, index: number) => {
        if (ticket.status === 'error') {
          logger.error(`Error sending push notification to ${messages[index].to}: ${ticket.message}`, ticket.details ? new Error(JSON.stringify(ticket.details)) : undefined);
        }
      });

      return responseData.data; // Return the array of tickets

    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to send push notifications via Expo API', error);
      } else {
        logger.error('Failed to send push notifications via Expo API', new Error(String(error)));
      }
      return [];
    }
  }
}

export const expoPushService = new ExpoPushService();
