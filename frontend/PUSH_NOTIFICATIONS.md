# Push Notification Implementation

## Overview

This app uses Expo Push Notifications to send reminders and updates to users.

## Implementation Details

### 1. **User Service** (`src/utils/api/services/user_service.ts`)

- `registerPushToken()` - Sends the Expo push token to the backend
- Endpoint: `POST /v1/users/me/push-token`
- Payload: `{ token: string, provider: 'expo' }`

### 2. **Push Token Registration** (`src/context/AuthContext.tsx`)

- Automatically registers push token after successful authentication
- Flow:
  1. User authenticates (device login or existing token)
  2. App requests notification permissions
  3. Gets Expo push token
  4. Sends token to backend API
  5. Backend stores token for the user

### 3. **Notification Listener** (`src/hooks/usePushNotifications.ts`)

- Listens for incoming notifications
- Handles notification tap events
- Configured in root layout (`_layout.tsx`)

### 4. **Notification Handler** (`src/app/_layout.tsx`)

- Configures how notifications are displayed
- Settings:
  - `shouldShowAlert`: true - Show alert in foreground
  - `shouldPlaySound`: false - No sound
  - `shouldSetBadge`: false - No badge
  - `shouldShowBanner`: true - Show banner
  - `shouldShowList`: true - Show in notification list

## Testing

### Testing on Physical Device (Recommended)

1. Build the app with EAS Build or run on physical device
2. Make sure the device has internet connection
3. Check console logs for push token: `📱 Expo Push Token: ExponentPushToken[...]`
4. The token is automatically sent to the backend

### Testing Push Notifications

You can test sending notifications using:

- Expo's Push Notification Tool: https://expo.dev/notifications
- Your backend API (once implemented)

### Console Logs to Look For:

- `🔔 Registering push notifications...` - Starting registration
- `📱 Expo Push Token: ExponentPushToken[...]` - Token obtained
- `📤 Sending push token to backend...` - Sending to API
- `✅ Push token registered successfully` - Success
- `⚠️ Push notification registration failed:` - Error (won't block auth)

## Backend Integration

The backend should:

1. Receive the push token from `POST /v1/users/me/push-token`
2. Store it in the database linked to the user
3. Use Expo's Push Notification API to send notifications:
   - Endpoint: `https://exp.host/--/api/v2/push/send`
   - Payload:
     ```json
     {
       "to": "ExponentPushToken[...]",
       "title": "Reminder Title",
       "body": "Reminder description",
       "data": { "reminderId": "123" }
     }
     ```

## Notification Data Structure

When sending notifications from backend, include data for navigation:

```json
{
  "to": "ExponentPushToken[...]",
  "title": "🔔 Reminder: Dog Vaccination",
  "body": "It's time for your dog's vaccination appointment",
  "data": {
    "reminderId": "abc123",
    "type": "reminder",
    "screen": "reminder-details"
  },
  "sound": "default",
  "badge": 1
}
```

## Permissions

The app automatically requests notification permissions on:

- iOS: First time opening app after installation
- Android: Automatically granted

If user denies permission:

- App continues to work normally
- Push notifications won't be received
- Error is logged but doesn't block authentication

## Troubleshooting

### Token Not Registered

- Check if running on physical device (required)
- Check internet connection
- Check console logs for errors
- Verify backend API is accessible

### Notifications Not Received

- Verify token is sent to backend successfully
- Check device notification settings
- Verify backend is sending to correct token
- Check Expo push notification status

### Testing on Simulator/Emulator

- iOS Simulator: Not supported
- Android Emulator: Not supported
- Must use physical device for push notifications

## Files Modified/Created

1. ✅ `src/utils/api/services/user_service.ts` - New service
2. ✅ `src/context/AuthContext.tsx` - Added push token registration
3. ✅ `src/hooks/usePushNotifications.ts` - New hook for listening
4. ✅ `src/app/_layout.tsx` - Added notification listener
5. ✅ `src/utils/registerForPushNotificationsAsync.ts` - Existing utility

## Next Steps

To handle notification taps and navigate to specific screens:

1. Update `usePushNotifications.ts` response listener
2. Use expo-router to navigate based on notification data
3. Example:

   ```typescript
   const router = useRouter()

   if (data.reminderId) {
     router.push(`/(tabs)/reminder-details/${data.reminderId}`)
   }
   ```
