# Notification Job Current State

Last updated: March 27, 2026 (Added Health Insights Notification System)

This document is the current source of truth for notification-related cron jobs and runtime behavior.

## Scheduler Startup

Schedulers are started from application bootstrap:
- src/index.ts
  - startReminderScheduler()
  - startNotificationScheduler()
  - startPetCleanupScheduler()

## Cron Jobs

### 1) Overdue Reminder Updater

File: src/jobs/reminder-scheduler.ts

- Cron: */15 * * * *
- Timezone: Etc/UTC
- Purpose: Mark reminders as overdue when they pass due date/time.
- Service called: updateOverdueReminders()

### 2) Reminder Notification Dispatcher

File: src/jobs/notification-scheduler.ts

- Cron: */15 * * * *
- Timezone: Etc/UTC
- Purpose: Find due reminders and send reminder notifications.
- Service called: processAndSendNotifications()

### 3) AI Tips Notification Job

File: src/jobs/notification-scheduler.ts

- Cron: 0 5 * * *
- Timezone: Etc/UTC
- Effective local time in Bangkok: 12:00 daily (noon)
- Purpose: Generate and send personalized AI tips.
- Service called: generateAndSendAITips()

### 4) Health Insights Notification Job

File: src/jobs/notification-scheduler.ts

- Cron: 0 12 * * *
- Timezone: Etc/UTC
- Effective local time in Bangkok: 19:00 daily (7:00 PM)
- Purpose: Analyze health logs and send personalized health insights.
- Service called: analyzeAllPetsAndSendInsights()
- Details: See HEALTH_INSIGHTS_NOTIFICATION.md for full documentation

## Current Reminder Notification Behavior

File: src/features/notifications/notification-service.ts

### Recipient Fan-out

For each due reminder:
- Sends to pet owner
- Sends to all active caregivers for that pet (pet_user_access where revoked_at is null and role is CAREGIVER)

### Retry Scope (Important)

Retry is tracked per reminder per recipient:
- Isolation key behavior: reminder_id + user_id
- A failure for one recipient does not affect another recipient
- Maximum retry attempts: 5
- Retry interval: at least 15 minutes between attempts
- Grace period: up to 60 minutes after reminder time

### Delivery State

- Notification rows are created/updated as pending, sent, or failed
- If push tokens are missing, in-app notification is still kept
- If required reminder data is missing, notification is marked failed

## Status Change Notification Behavior

Trigger point:
- Called after successful toggleReminderStatus() completion
- Invocation is fire-and-forget from reminder-service.ts

Function:
- sendStatusChangeNotification(actorUserId, reminderId, petId, reminderName, newStatus)

Recipient rules:
- Actor is excluded
- If owner toggles: notify active caregivers
- If caregiver toggles: notify owner and other active caregivers

Message format:
- [reminderName] status changed to [status] by [actor label]

Actor label rules:
- owner to caregiver: by owner
- caregiver to owner: by owner-defined alias from owner_caregiver_contacts
- caregiver to other caregiver: by another caregiver

Reliability:
- Wrapped in top-level try/catch
- Errors are logged and do not break the toggle API response

## Health Insights Notification Behavior

Trigger points:
1. Daily cron job at 19:00 Bangkok (analyzes all pets)
2. Immediate alerts when critical symptoms are logged (real-time)

Function:
- sendHealthInsightNotification(petId, insightId, title, description)

Recipient rules:
- Sends to pet owner AND all active caregivers
- Uses same fan-out logic as reminder notifications

Pattern detection (daily cron):
1. Recurring symptoms (3+ times in 7 days)
2. Rapid weight loss/gain (species-specific thresholds)
3. Recurring behaviors (3+ times in 7 days)
4. No recent logs reminder (7+ days without logging)
5. Follow-up reminders (2 days after critical symptom)

Immediate alerts (real-time):
- Triggered when user creates SYMPTOMS health log
- Checks for critical keywords (blood, seizures, breathing issues, etc.)
- Sends notification within seconds if critical keyword detected
- Fire-and-forget pattern (non-blocking, won't break health log API)

AI Generation:
- Uses Gemini 2.5 Flash for personalized Thai insights
- Temperature: 0.7 (balanced for medical content)
- Fallback messages if AI fails
- Cost: ~900 API calls/month (~135 THB/month)

Deduplication:
- Same insight type won't send again within 3 days
- Prevents notification spam

See HEALTH_INSIGHTS_NOTIFICATION.md for complete documentation.

## Notes About Deployment

Current architecture runs scheduler inside backend process.
- Safe for single-instance deployment (single VM process)
- Risk of duplicate jobs if multiple backend instances are started

If scaling later, move schedulers to a dedicated worker service or use external scheduler.

## Related Files

- src/index.ts
- src/jobs/reminder-scheduler.ts
- src/jobs/notification-scheduler.ts
- src/features/notifications/notification-service.ts
- src/features/reminders/reminder-service.ts
- src/features/ai-tips-generation/ai-tips-generation-service.ts
- src/features/health-insights/health-insight-orchestrator.ts
- src/features/health-insights/health-insight-detection-service.ts
- src/features/health-insights/health-insight-generation-service.ts
- src/features/health-insights/keyword-loader.ts
- src/features/health-log/health-log-service.ts
- config/health-alert-keywords.json

## Historical Docs

Older references still exist and may contain previous assumptions:
- CRON_TIMEZONE_SETUP.md
- DEVELOPMENT_SUMMARY.md
- HEALTH_INSIGHTS_NOTIFICATION.md (current health insights documentation)

Use this file as the current operational snapshot.
