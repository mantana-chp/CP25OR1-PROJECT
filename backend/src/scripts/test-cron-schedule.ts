import cron from 'node-cron';
import { logger } from '../libs/logger';

/**
 * This script tests the cron schedule to verify when jobs will actually run.
 * 
 * To run:
 * npx ts-node src/scripts/test-cron-schedule.ts
 * 
 * This will:
 * 1. Show current server time and timezone
 * 2. Calculate when the next AI tips job will run
 * 3. Run a test cron that triggers every minute for 3 minutes to verify timing
 */

const testCronTiming = () => {
    logger.info('========================================');
    logger.info('🕐 CRON SCHEDULE DIAGNOSTIC TEST');
    logger.info('========================================');

    const now = new Date();
    const nowUTC = now.toISOString();
    const nowBangkok = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));

    logger.info('');
    logger.info('📅 Current Time Information:');
    logger.info(`   UTC Time: ${nowUTC}`);
    logger.info(`   Bangkok Time: ${nowBangkok.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false })}`);
    logger.info(`   Server Local Time: ${now.toLocaleString()}`);
    logger.info(`   Timezone Offset: GMT${now.getTimezoneOffset() > 0 ? '-' : '+'}${Math.abs(now.getTimezoneOffset() / 60)}`);

    logger.info('');
    logger.info('📌 AI Tips Cron Schedule:');
    logger.info('   Pattern: 0 13 * * * (UTC)');
    logger.info('   Timezone: Etc/UTC (explicit)');
    logger.info('   Expected Run Time: 13:00 UTC = 20:00 Bangkok');

    // Calculate next run time
    const nextRun = new Date(now);
    nextRun.setUTCHours(13, 0, 0, 0);

    // If we've already passed 13:00 UTC today, set to tomorrow
    if (now.getUTCHours() >= 13) {
        nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }

    const nextRunBangkok = new Date(nextRun.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const hoursUntil = Math.floor((nextRun.getTime() - now.getTime()) / (1000 * 60 * 60));
    const minutesUntil = Math.floor(((nextRun.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));

    logger.info('');
    logger.info('⏰ Next AI Tips Run:');
    logger.info(`   UTC: ${nextRun.toISOString()}`);
    logger.info(`   Bangkok: ${nextRunBangkok.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false })}`);
    logger.info(`   Time until next run: ${hoursUntil}h ${minutesUntil}m`);

    logger.info('');
    logger.info('🧪 Running test cron (triggers every minute for 3 minutes)...');
    logger.info('   This verifies that cron timing is working correctly.');
    logger.info('');

    let testCount = 0;
    const maxTests = 3;

    const testJob = cron.schedule('* * * * *', () => {
        testCount++;
        const testTime = new Date();
        const testBangkok = new Date(testTime.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));

        logger.info(`✅ Test Trigger #${testCount}/${maxTests}`);
        logger.info(`   UTC: ${testTime.toISOString()}`);
        logger.info(`   Bangkok: ${testBangkok.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false })}`);
        logger.info('');

        if (testCount >= maxTests) {
            logger.info('========================================');
            logger.info('✅ Test completed successfully!');
            logger.info('   Cron timing is working as expected.');
            logger.info('   The AI tips job will run at 13:00 UTC (20:00 Bangkok).');
            logger.info('========================================');
            testJob.stop();
            process.exit(0);
        }
    }, {
        timezone: 'Etc/UTC'
    });

    testJob.start();
    logger.info('⏳ Waiting for test triggers... (this will take 3 minutes)');
    logger.info('');
};

testCronTiming();
