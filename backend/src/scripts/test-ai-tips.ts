import { logger } from '../libs/logger';
import prisma from '../libs/db';
import {
  processAndSendTipNotification,
  processAndSendTipNotificationForUser,
} from '../jobs/notification-scheduler';

/**
 * This script manually triggers the AI tip generation and sending process for testing purposes.
 */
const main = async () => {
  logger.info('--- RUNNING AI TIP TEST SCRIPT ---');
  try {
    // --- random user and pet ---
    await processAndSendTipNotification(); //

    // ---  Test with a SPECIFIC user ID ---
    // Replace 'YOUR_USER_ID_HERE' with the actual UUID of the user you want to test.
    // await processAndSendTipNotificationForUser("user-id"); // replace with userid to test


    logger.info('--- AI TIP TEST SCRIPT FINISHED SUCCESSFULLY ---');
  } catch (error) {
    logger.error('--- AI TIP TEST SCRIPT FAILED ---', error as Error);
    process.exit(1);
  } finally {
    // Disconnect Prisma to allow the script to exit
    await prisma.$disconnect();
  }
};

main();
