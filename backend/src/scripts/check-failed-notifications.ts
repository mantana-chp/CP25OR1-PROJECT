import { logger } from '../libs/logger';
import prisma from '../libs/db';

/**
 * This script checks for permanently failed notifications
 * (reminders that have reached max retry attempts).
 * 
 * To run:
 * npx ts-node src/scripts/check-failed-notifications.ts
 */

const MAX_RETRY_ATTEMPTS = 5;

const checkFailedNotifications = async () => {
    logger.info('========================================');
    logger.info('🔍 Checking for Permanently Failed Notifications');
    logger.info('========================================');
    logger.info('');

    // Find reminders with multiple failed notification attempts
    const remindersWithFailedNotifications = await prisma.reminders.findMany({
        where: {
            reminder_status: { in: ['to_do', 'overdue'] },
            notifications: {
                some: {
                    status: 'failed',
                },
            },
        },
        include: {
            notifications: {
                where: {
                    status: { in: ['failed', 'pending'] },
                },
                orderBy: {
                    created_at: 'desc',
                },
            },
            pets: true,
            user: {
                include: {
                    push_tokens: true,
                },
            },
        },
    });

    if (remindersWithFailedNotifications.length === 0) {
        logger.info('✅ No failed notifications found. All notifications are healthy!');
        logger.info('========================================');
        return;
    }

    logger.info(`Found ${remindersWithFailedNotifications.length} reminders with failed notifications:\n`);

    const permanentlyFailed: any[] = [];
    const retryable: any[] = [];

    remindersWithFailedNotifications.forEach(reminder => {
        const lastAttempt = reminder.notifications[0]; // Most recent
        const failedCount = lastAttempt?.retry_count || 0;
        const isPermanentlyFailed = failedCount >= MAX_RETRY_ATTEMPTS;
        const hasPushTokens = reminder.user.push_tokens && reminder.user.push_tokens.length > 0;

        const info = {
            reminderId: reminder.id,
            reminderName: reminder.reminder_name,
            petName: reminder.pets?.pet_name || 'N/A',
            dueDate: reminder.reminder_date.toISOString().split('T')[0],
            dueTime: reminder.reminder_time?.toISOString().split('T')[1].slice(0, 5) || 'No time set',
            failedAttempts: failedCount,
            lastAttemptAt: lastAttempt?.created_at,
            hasPushTokens,
            status: isPermanentlyFailed ? 'PERMANENTLY FAILED' : 'Retryable',
        };

        if (isPermanentlyFailed) {
            permanentlyFailed.push(info);
        } else {
            retryable.push(info);
        }
    });

    if (retryable.length > 0) {
        logger.info(`📋 Retryable Notifications (${retryable.length}):`);
        logger.info('These will be retried automatically:\n');
        retryable.forEach((info, idx) => {
            logger.info(`${idx + 1}. Reminder: ${info.reminderName} (Pet: ${info.petName})`);
            logger.info(`   Due: ${info.dueDate} at ${info.dueTime}`);
            logger.info(`   Failed attempts: ${info.failedAttempts}/${MAX_RETRY_ATTEMPTS}`);
            logger.info(`   Has push tokens: ${info.hasPushTokens ? 'Yes' : 'No'}`);
            logger.info(`   Last attempt: ${new Date(info.lastAttemptAt).toLocaleString()}`);
            logger.info('');
        });
    }

    if (permanentlyFailed.length > 0) {
        logger.warn(`\n⚠️ PERMANENTLY FAILED Notifications (${permanentlyFailed.length}):`);
        logger.warn('These have reached max retry attempts and will NOT be retried:\n');
        permanentlyFailed.forEach((info, idx) => {
            logger.warn(`${idx + 1}. Reminder ID: ${info.reminderId}`);
            logger.warn(`   Reminder: ${info.reminderName} (Pet: ${info.petName})`);
            logger.warn(`   Due: ${info.dueDate} at ${info.dueTime}`);
            logger.warn(`   Failed attempts: ${info.failedAttempts}/${MAX_RETRY_ATTEMPTS}`);
            logger.warn(`   Has push tokens: ${info.hasPushTokens ? 'Yes' : 'No'}`);
            logger.warn(`   Last attempt: ${new Date(info.lastAttemptAt).toLocaleString()}`);
            logger.warn('');
        });

        logger.warn('\n📝 Recommended Actions for Permanently Failed Notifications:');
        logger.warn('1. Check if Expo Push Notification service was down during these times');
        logger.warn('2. Verify push tokens are valid for affected users');
        logger.warn('3. Check application logs for specific error messages');
        logger.warn('4. Consider manually notifying affected users');
        logger.warn('5. If issue is resolved, you can delete the old failed notification records');
        logger.warn('   to allow the system to retry (use with caution!)');
    }

    logger.info('\n========================================');
    logger.info(`Summary:`);
    logger.info(`  Total reminders with issues: ${remindersWithFailedNotifications.length}`);
    logger.info(`  Retryable: ${retryable.length}`);
    logger.info(`  Permanently failed: ${permanentlyFailed.length}`);
    logger.info('========================================');
};

const main = async () => {
    try {
        await checkFailedNotifications();
    } catch (error) {
        logger.error('Error checking failed notifications:', error as Error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
};

main();
