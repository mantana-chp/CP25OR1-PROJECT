# Recurring Reminders System

## Overview

The recurring reminders system allows users to create repeating reminders (daily, weekly, monthly, yearly) that generate virtual instances without storing each occurrence in the database. This document explains how the system works, particularly the deletion tracking mechanism.

## Problem Statement

When users delete individual instances of recurring reminders (e.g., "This Reminder Only"), the backend **does not persist the `excluded_dates` array**. This caused deleted reminders to reappear as virtual instances after the app refreshed.

**Logs showed:**

```javascript
[API DELETE Request] {"params": {"deleteScope": "THIS_INSTANCE_ONLY", "excludeDate": "2026-02-15T00:00:00.000Z"}}
// Backend returns 200 success
[Recurring Rules] excluded_dates: undefined  // Not persisted!
```

## Solution: AsyncStorage Workaround

We implemented a **frontend-only workaround** using React Native's `AsyncStorage` to track deleted dates until the backend implements proper `excluded_dates` support.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Deletes Reminder                   │
│                  (This Reminder Only option)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   reminder_list.tsx    │
         │  handleDeleteReminder  │
         └────────┬───────────────┘
                  │
                  ├──────────────────┐
                  ▼                  ▼
      ┌───────────────────┐   ┌──────────────────────┐
      │  Backend API Call │   │  AsyncStorage Write  │
      │  (returns 200)    │   │  addExcludedDate()   │
      └───────────────────┘   └──────────────────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │ AsyncStorage Store  │
                              │ {                   │
                              │   "rule_123": [     │
                              │     "2026-02-15"    │
                              │   ]                 │
                              │ }                   │
                              └─────────────────────┘
                                         │
        ┌────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│  recurring_reminder_generator.ts             │
│  generateVirtualOccurrencesForRule()         │
│                                              │
│  1. Get backend excluded_dates (undefined)   │
│  2. Get AsyncStorage excluded dates          │
│  3. Merge both arrays                        │
│  4. Filter virtual reminders                 │
└──────────────────────────────────────────────┘
```

## Implementation Details

### 1. AsyncStorage Module

**File:** [`src/utils/excluded_dates_storage.ts`](src/utils/excluded_dates_storage.ts)

```typescript
// Store structure: { [ruleId]: ["2026-02-15", "2026-02-22"] }
const STORAGE_KEY = 'reminder_excluded_dates'

// Core functions:
- getExcludedDates(): Get all excluded dates map
- addExcludedDate(ruleId, date): Add a deleted date
- removeRuleExcludedDates(ruleId): Clear all exclusions for a rule
- getRuleExcludedDates(ruleId): Get exclusions for specific rule
```

**Key features:**

- Async operations with `AsyncStorage`
- Error handling with console logging
- Date normalization to `YYYY-MM-DD` format
- Prevents duplicate entries

### 2. Deletion Handler

**File:** [`src/presentation/reminder/components/reminder_list.tsx`](src/presentation/reminder/components/reminder_list.tsx#L138-L178)

When user deletes a reminder:

```typescript
if (deleteScope === 'THIS_INSTANCE_ONLY') {
  // Store in AsyncStorage
  await addExcludedDate(reminder.recurrence.id, excludeDate)

  // Also send to backend (for future implementation)
  await deleteReminderApi.execute(deleteId, deleteScope, excludeDate)
}

if (deleteScope === 'ALL_INSTANCES') {
  // Clear AsyncStorage for this rule
  await removeRuleExcludedDates(reminder.recurrence.id)

  // Delete entire series
  await deleteReminderApi.execute(deleteId, deleteScope)
}
```

### 3. Virtual Reminder Generator

**File:** [`src/utils/recurring_reminder_generator.ts`](src/utils/recurring_reminder_generator.ts#L111-L125)

When generating virtual instances:

```typescript
// Merge backend and AsyncStorage excluded dates
const backendExcludedDates = rule.excluded_dates || []
const localStorageExcludedDates = await getRuleExcludedDates(rule.id)
const allExcludedDates = [...backendExcludedDates, ...localStorageExcludedDates]

// Filter out excluded dates
const excludedDatesSet = new Set<string>(allExcludedDates)
if (!excludedDatesSet.has(dateKey)) {
  // Generate virtual reminder
}
```

**Logging:**

```javascript
[Reminder Name] Excluding dates: ["2026-02-15", "2026-02-22"]
(backend: 0, localStorage: 2)
```

### 4. Page Integration

**Files:**

- [`src/presentation/reminder/pages/reminder_page.tsx`](src/presentation/reminder/pages/reminder_page.tsx#L77-L111)
- [`src/hooks/useCalendar.ts`](src/hooks/useCalendar.ts#L29-L59)

Both use `useEffect` to generate virtual reminders asynchronously:

```typescript
useEffect(() => {
  const loadVirtualReminders = async () => {
    const virtuals = await generateAllVirtualReminders(
      recurringRules,
      { monthsForward: 6, monthsBackward: 1, maxOccurrences: 100 },
      reminders
    )
    setVirtualReminders(virtuals)
  }

  if (recurringRules.length > 0) {
    loadVirtualReminders()
  }
}, [recurringRules, reminders])
```

## User Experience

### Deleting Single Instance (This Reminder Only)

1. User swipes or clicks delete on a virtual reminder
2. Action sheet appears: **"This Reminder Only"** or "All Instances"
3. User selects "This Reminder Only"
4. System stores exclusion in AsyncStorage
5. **Reminder disappears immediately and permanently**
6. Calendar dot removed for that date
7. Other instances remain visible

### Deleting All Instances

1. User selects "All Instances"
2. All AsyncStorage exclusions cleared for that rule
3. Entire recurring series deleted from backend
4. All virtual instances disappear

### Persistence

- **AsyncStorage persists across app restarts** ✅
- **Only cleared when:**
  - User deletes all instances of the recurring reminder
  - User clears app data/cache
  - User reinstalls the app

## Data Structure

### AsyncStorage Format

```json
{
  "reminder_excluded_dates": {
    "rule-uuid-123": ["2026-02-15", "2026-02-22", "2026-03-01"],
    "rule-uuid-456": ["2026-02-20"]
  }
}
```

### Date Normalization

All dates are normalized to `YYYY-MM-DD` format:

```typescript
const dateOnly = date.split('T')[0] // "2026-02-15T00:00:00.000Z" → "2026-02-15"
```

## Supported Recurrence Patterns

### Daily

- **Example:** Every 3 days
- **Calculation:** `startDate.add(interval * i, 'day')`

### Weekly

- **Example:** Every 2 weeks on Monday and Friday
- **Uses day bitmap:** 1=Sun, 2=Mon, 4=Tue, 8=Wed, 16=Thu, 32=Fri, 64=Sat
- **Fixed issue:** Weekly intervals now correctly add weeks (not days)
  ```typescript
  // Before: nextDate.add(rule.interval * 7, 'day')  ❌ (off by 1)
  // After:  nextDate.add(rule.interval, 'week')     ✅
  ```

### Monthly

- **Example:** 15th of every month
- **Calculation:** `startDate.add(i, 'month')`
- **Handles:** Different month lengths automatically

### Yearly

- **Example:** Every year on February 15
- **Calculation:** `startDate.add(i, 'year')`

## Debugging

### Check AsyncStorage

```typescript
import { getExcludedDates } from '@/src/utils/excluded_dates_storage'

// View all excluded dates
const allExcluded = await getExcludedDates()
console.log('All excluded dates:', allExcluded)

// View for specific rule
const ruleExcluded = await getRuleExcludedDates('rule-uuid-123')
console.log('Excluded for rule:', ruleExcluded)
```

### Clear AsyncStorage (Debugging)

```typescript
import { clearAllExcludedDates } from '@/src/utils/excluded_dates_storage'
await clearAllExcludedDates()
```

### Console Logs

The system logs key operations:

```javascript
// When adding exclusion
[AsyncStorage] Added excluded date: {ruleId: "...", date: "2026-02-15"}

// When generating virtuals
[Reminder Name] Excluding dates: ["2026-02-15"] (backend: 0, localStorage: 1)

// When removing exclusions
[AsyncStorage] Removed all excluded dates for rule: "..."
```

## Visual Indicators

### Virtual Reminders

- **Calendar:** Filled colored dots (same as real reminders)
- **List view:** Light gray background (`#F5F5F5`)
- **Detail modal:** Yellow info banner with AlertCircle icon
  - "เตือนความจำคาดการณ์" (Virtual Reminder)
  - "นี่คือกิจกรรมจากรูปแบบการซ้ำ" (From recurring pattern)

### Interaction Rules

- ✅ **Can:** View details, delete single instance, delete all instances
- ❌ **Cannot:** Edit, toggle status, swipe to delete (click delete only)

## Future Considerations

### When Backend Implements excluded_dates

1. **Migration path:** Keep AsyncStorage as fallback
2. **Merge logic:** Already in place, will combine both sources
3. **No breaking changes:** System will automatically use backend data when available

### Backend Implementation Checklist

```typescript
interface IRecurringRule {
  id: string
  // ... other fields
  excluded_dates?: string[]  // ← Need to implement this
}

// POST /v1/reminders/recurring/:id/exclude
{
  "excludeDate": "2026-02-15"
}

// DELETE /v1/reminders/recurring/:id
// Should also delete excluded_dates in DB
```

## Testing Scenarios

### Test Case 1: Delete Single Instance

1. Create recurring reminder (daily, 3-day interval)
2. Delete first instance with "This Reminder Only"
3. Close and reopen app
4. ✅ Deleted instance should NOT reappear

### Test Case 2: Delete All Instances

1. Create recurring reminder
2. Delete first instance with "This Reminder Only" (stores in AsyncStorage)
3. Delete any instance with "All Instances"
4. ✅ AsyncStorage should be cleared for that rule

### Test Case 3: Multiple Deletions

1. Create recurring reminder (weekly)
2. Delete 3 different instances (all "This Reminder Only")
3. ✅ All 3 should remain deleted
4. ✅ Other instances still visible

### Test Case 4: Calendar Sync

1. Delete virtual reminder instance
2. ✅ Calendar dot should disappear immediately
3. ✅ Reminder count badge should decrease

## Files Modified

| File                              | Purpose             | Key Changes                   |
| --------------------------------- | ------------------- | ----------------------------- |
| `excluded_dates_storage.ts`       | AsyncStorage module | New file - storage operations |
| `reminder_list.tsx`               | Deletion handler    | Added AsyncStorage calls      |
| `recurring_reminder_generator.ts` | Virtual generation  | Merge backend + AsyncStorage  |
| `reminder_page.tsx`               | Page integration    | Async virtual loading         |
| `useCalendar.ts`                  | Calendar hook       | Async virtual loading         |

## Performance Notes

- **AsyncStorage reads:** Only on page load/refresh
- **AsyncStorage writes:** Only on delete operations
- **No impact:** Normal reminder viewing or scrolling
- **Async operations:** Don't block UI rendering

## Known Limitations

1. **AsyncStorage size limit:** ~6MB (unlikely to reach for date arrays)
2. **Cleared on app uninstall:** Expected behavior
3. **No cloud sync:** Per-device storage only
4. **Backend dependency:** Still sends API calls (for future use)

## Related Documentation

- [Push Notifications](PUSH_NOTIFICATIONS.md)
- [Seamless Authentication](SEAMLESS_AUTH_IMPLEMENTATION.md)
