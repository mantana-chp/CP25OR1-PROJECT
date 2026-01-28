import { logger } from '../libs/logger';
import prisma from '../libs/db';
import {
  generateAndSendAITips,
  generateAndSendTipForSingleUser,
} from '../services/ai-tip-generation-service';

/**
 * This script manually triggers the AI tip generation for testing.
 *
 * To run:
 * - For the full job (all eligible users): `npx ts-node src/scripts/test-ai-tips.ts`
 * - For a specific user: `npx ts-node src/scripts/test-ai-tips.ts <USER_ID>`
 */
const main = async () => {
  logger.info('--- RUNNING AI TIP TEST SCRIPT ---');

  // Check for a command-line argument for the user ID
  const userId = process.argv[2];

  try {
    if (userId) {
      // --- Test with a SPECIFIC user ID ---
      logger.info(`Testing for specific user ID: ${userId}`);
      await generateAndSendTipForSingleUser(userId);
    } else {
      // --- Test the full job for all eligible users ---
      logger.info('Testing the full job for all eligible users...');
      await generateAndSendAITips();
    }

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
