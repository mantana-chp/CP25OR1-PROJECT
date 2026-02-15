# Cron Job Timezone Configuration

## Overview

The backend uses cron jobs to schedule recurring tasks. All cron schedules are configured to use **UTC timezone** explicitly to ensure consistency across different server environments.

## ⚠️ IMPORTANT: Reminder Time Storage Convention

**Reminder times are stored as Asia/Bangkok local time (GMT+7) in the database.**

### Database Fields:
- `reminder_date`: Date field (timezone-agnostic)
- `reminder_time`: TIME field (timezone-agnostic, stores Bangkok local time)

### How It Works:

**When User Creates Reminder:**
```
User input: 2025-12-12, 17:00 (5 PM Bangkok)
Stored in DB: reminder_date = 2025-12-12, reminder_time = 17:00:00
```

**When Notification Job Reads:**
```typescript
// Code interprets stored time as Bangkok time and converts to UTC
const bangkokTimeMillis = reminder.reminder_time.getTime() - ...;
const utcTimeMillis = bangkokTimeMillis - (7 * 60 * 60 * 1000); // Subtract 7 hours
```

**Result:**
- User sets: 17:00 Bangkok
- Notification sent: 16:30 Bangkok (30 min before)
- All internal comparisons done in UTC

⚠️ **Do NOT change the storage format without updating the notification service conversion logic!**

## Server Configuration

- **Server Timezone**: Asia/Bangkok (GMT+7)
- **Cron Timezone**: UTC (Etc/UTC) - explicitly set
- **Why UTC?** Using UTC prevents confusion when servers are in different timezones

## Scheduled Jobs

### 1. Reminder Notifications
- **Schedule**: `*/15 * * * *` (Every 15 minutes)
- **File**: `src/jobs/notification-scheduler.ts`
- **Description**: Checks for upcoming reminders and sends push notifications
- **Runs at**: Every 15 minutes in UTC

### 2. AI Tips Notifications
- **Schedule**: `0 13 * * *` (Daily at 13:00 UTC)
- **File**: `src/jobs/notification-scheduler.ts`
- **Description**: Generates and sends personalized AI tips to users
- **Runs at**: 
  - **13:00 UTC** 
  - **20:00 Bangkok time (GMT+7)** ← This is what users experience

## Time Conversion Reference

| UTC Time | Bangkok Time (GMT+7) |
|----------|---------------------|
| 06:00    | 13:00 (1:00 PM)    |
| 13:00    | 20:00 (8:00 PM)    |
| 00:00    | 07:00 (7:00 AM)    |

## Testing Cron Jobs

### Test AI Tips (Manual Trigger)
```bash
# Test for all users
npx ts-node src/scripts/test-ai-tips.ts

# Test for specific user
npx ts-node src/scripts/test-ai-tips.ts <USER_ID>
```

### Test Cron Schedule Timing
```bash
npx ts-node src/scripts/test-cron-schedule.ts
```

This script will:
- Show current server time and timezone
- Calculate when the next AI tips job will run
- Run test crons to verify timing is correct

## Debugging Timezone Issues

If notifications are running at the wrong time:

1. **Check server timezone**:
   ```bash
   timedatectl  # Linux
   date         # Shows current time
   echo $TZ     # Check timezone env variable
   ```

2. **Verify deployed code matches repository**:
   ```bash
   grep "cron.schedule" src/jobs/notification-scheduler.ts
   # Should show: 0 13 * * * with timezone: 'Etc/UTC'
   ```

3. **Check application logs** when server starts:
   - Look for "Notification Schedulers Started" message
   - Verify the schedule shows "0 13 * * * (13:00 UTC daily)"
   - Check "Bangkok time: 20:00 (8:00 PM) daily"

4. **Run the diagnostic script**:
   ```bash
   npx ts-node src/scripts/test-cron-schedule.ts
   ```

## Common Issues

### Issue: Job runs at 06:00 UTC instead of 13:00 UTC

**Symptoms**: 
- Notification created at 06:00 UTC (13:00 Bangkok)
- Expected at 13:00 UTC (20:00 Bangkok)

**Possible Causes**:
1. Deployed code has different cron schedule (check with `grep`)
2. Environment variable override
3. Different version of node-cron with different timezone behavior
4. Server using local timezone instead of UTC

**Fix**:
- Ensure `timezone: 'Etc/UTC'` is set in cron.schedule options
- Redeploy the latest code
- Check for environment variables overriding the schedule

### Issue: Notification status stuck as 'pending'

**Symptoms**:
- Notification created but `status = 'pending'`
- `sent_at` is null

**Cause**: 
- AI tips service was not updating notification status after sending

**Fix**: 
- This has been fixed in the latest code
- The service now updates status to 'sent' and sets `sent_at` timestamp

## Code Reference

### Explicit UTC Timezone Setting

```typescript
const aiTipNotificationJob = cron.schedule('0 13 * * *', async () => {
  // Job logic
}, {
  timezone: 'Etc/UTC' // ← Forces UTC regardless of server timezone
});
```

### Logging Current Time

```typescript
const now = new Date();
const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
logger.info(`UTC: ${now.toISOString()}`);
logger.info(`Bangkok: ${bangkokTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
```

## Updates Log

- **2026-02-15**: Added explicit UTC timezone to all cron jobs
- **2026-02-15**: Fixed AI tips notification status not being updated
- **2026-02-15**: Added diagnostic logging and test scripts
