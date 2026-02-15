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
- **2026-02-15**: Fixed notification service to correctly interpret reminder times as Bangkok local time
- **2026-02-15**: Implemented retry logic for failed notifications with max retry limit
- **2026-02-15**: Added `retry_count` field to notifications table for efficient retry tracking (replaces array-counting approach)

---

## Database Schema Changes

### Notifications Table - `retry_count` Field

**Migration:** `add_retry_count_to_notifications`

Added field to track retry attempts without creating multiple notification records:

```sql
ALTER TABLE notifications ADD COLUMN retry_count INTEGER DEFAULT 0 NOT NULL;
```

**Purpose:**
- Tracks how many times a notification has been attempted
- Prevents database bloat from multiple notification records
- Allows for cleaner audit trail

**Usage:**
- Initial attempt: `retry_count = 0`
- Each retry: `retry_count` incremented by 1
- Max retries reached when: `retry_count >= 5`

---

## Notification Retry Logic

### Overview

The notification service automatically retries failed notifications to handle temporary issues like:
- Expo Push Notification service downtime
- Network connectivity issues
- Temporary server issues

### Configuration

```typescript
MAX_RETRY_ATTEMPTS = 5;      // Maximum times to retry a failed notification
RETRY_INTERVAL_MS = 15 min;  // Minimum wait time between retry attempts
GRACE_PERIOD_MS = 60 min;    // Time window after reminder time to allow retries
```

### How It Works

**First Attempt:**
1. Cron job finds reminder due at 17:00 Bangkok
2. Creates notification record with `retry_count = 0`
3. Sends notification at 16:30 Bangkok (30 min before)
4. If Expo service is down → marks notification as `failed`

**Retry Attempts:**
1. Next cron run (15 min later): Detects failed notification
2. Checks retry count (< 5) and retry interval (> 15 min passed)
3. **Reuses same notification record**, increments `retry_count`
4. Updates status to `pending` and retries sending
5. Repeats until either:
   - ✅ Successfully sent (status: `sent`)
   - ❌ Max retries reached (retry_count ≥ 5)
   - ⏰ Grace period expired (60 min after reminder time)

**Permanently Failed:**
- After 5 failed attempts OR grace period expires
- Notification will NOT be retried again
- Admin should investigate using diagnostic script

**Important:** Only **one notification record** is created per reminder. The `retry_count` field tracks how many attempts have been made.

### Retry Timeline Example

```
16:30 - Attempt #1: Create notification (retry_count: 0) → Failed (Expo down)
        Updates: status = 'failed', retry_count = 0
        
16:45 - Attempt #2: Reuse same notification → increment retry_count to 1 → Failed
        Updates: status = 'failed', retry_count = 1
        
17:00 - Reminder time passes
        
17:00 - Attempt #3: Reuse same notification → increment retry_count to 2 → Failed
        Updates: status = 'failed', retry_count = 2
        
17:15 - Attempt #4: Reuse same notification → increment retry_count to 3 → Failed
        Updates: status = 'failed', retry_count = 3
        
17:30 - Attempt #5: Reuse same notification → increment retry_count to 4 → Failed
        Updates: status = 'failed', retry_count = 4
        (LAST ATTEMPT - within grace period)
        
17:45 - Attempt #6 skipped: retry_count (4) + 1 would be 5 (>= MAX_RETRY_ATTEMPTS)
        Grace period still active but max retries reached
        
18:00 - Grace period expires, no more retries possible

Database shows: 1 notification record with retry_count = 4, status = 'failed'
```

### Monitoring Failed Notifications

**Check for permanently failed notifications:**
```bash
npx ts-node src/scripts/check-failed-notifications.ts
```

This script will show:
- Reminders with failed notification attempts
- Current `retry_count` for each failed notification
- Which reminders have reached max retries
- User push token status

**Sample Output:**
```
⚠️ PERMANENTLY FAILED Notifications (2):
1. Reminder ID: abc-123
   Reminder: Monthly Vaccination (Pet: Fluffy)
   Due: 2026-02-15 at 17:00
   Failed attempts: 5/5
   Has push tokens: Yes
   Last attempt: 2/15/2026, 5:30:00 PM
   
📋 Retryable Notifications (1):
1. Reminder: Vet Appointment (Pet: Max)
   Due: 2026-02-15 at 16:00
   Failed attempts: 2/5
   Has push tokens: Yes
   Last attempt: 2/15/2026, 3:45:00 PM
```

**Database Schema:**
```sql
SELECT id, status, retry_count, sent_at, created_at 
FROM notifications 
WHERE reminder_id = 'abc-123';

-- Result: Single notification record showing retry history
| id      | status | retry_count | sent_at | created_at           |
|---------|--------|-------------|---------|---------------------|
| noti-1  | failed | 5           | NULL    | 2026-02-15 16:30:00 |
```

### What to Do When Notifications Permanently Fail

1. **Investigate the root cause:**
   - Check application logs for error messages
   - Verify Expo Push Notification service status
   - Check if user's push tokens are valid

2. **Manual intervention:**
   - Contact affected users via other channels
   - Ask users to check in-app notifications
   - Re-register push tokens if needed

3. **Clean up (if issue resolved):**
   ```sql
   -- CAUTION: Only do this if you've fixed the underlying issue
   -- This will allow the system to retry the notification
   DELETE FROM notifications 
   WHERE reminder_id = 'abc-123' 
   AND status = 'failed';
   ```

4. **Prevent future failures:**
   - Set up monitoring for Expo service health
   - Add alerting for high failure rates
   - Consider implementing a dead letter queue

### Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Missing pet name/reminder name | Creates failed notification (retry_count: 0) immediately, prevents retries |
| User has no push tokens | Marks as `sent` (in-app only), no retries needed |
| Expo service down temporarily | Retries up to 5 times (increments retry_count), 15 min apart, reusing same notification record |
| Reminder time passed | Only retries within 60-min grace period |
| Already successfully sent | Skips, never creates duplicate |
| Database connection failure | Caught by cron error handler, job retries next run |
| Max retries reached | Notification with retry_count ≥ 5 is permanently skipped |

---

## Quick Reference

### Database Query Examples

**Check retry status for a reminder:**
```sql
SELECT 
  n.id, 
  n.status, 
  n.retry_count,
  n.created_at,
  n.sent_at,
  r.reminder_name,
  p.pet_name
FROM notifications n
JOIN reminders r ON n.reminder_id = r.id
LEFT JOIN pets p ON n.pet_id = p.id
WHERE r.id = 'YOUR_REMINDER_ID'
ORDER BY n.created_at DESC;
```

**Find all notifications approaching max retries:**
```sql
SELECT 
  n.id,
  n.retry_count,
  r.reminder_name,
  p.pet_name,
  u.email
FROM notifications n
JOIN reminders r ON n.reminder_id = r.id
LEFT JOIN pets p ON n.pet_id = p.id
JOIN users u ON n.user_id = u.id
WHERE n.status = 'failed' 
  AND n.retry_count >= 3
ORDER BY n.retry_count DESC;
```

**Clean up permanently failed notifications (CAUTION):**
```sql
-- Only use this if you've fixed the underlying issue and want to allow retries
DELETE FROM notifications 
WHERE status = 'failed' 
  AND retry_count >= 5
  AND reminder_id = 'SPECIFIC_REMINDER_ID';
```
