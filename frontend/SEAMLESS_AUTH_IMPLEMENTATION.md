# Seamless Authentication with Token Refresh

## Overview

This implementation provides seamless authentication with automatic token refresh on 401 errors. When the access token expires, the system will automatically:

1. Show a loading overlay to the user
2. Attempt to refresh the token using the refresh token
3. Retry the failed request with the new token
4. Queue any other failed requests and retry them after refresh

## Architecture

### 1. Token Refresh Emitter (`token_refresh_emitter.ts`)

- Simple event emitter for communicating refresh state
- Allows API client to notify UI about token refresh status
- Decouples API layer from React component layer

### 2. Token Refresh Context (`TokenRefreshContext.tsx`)

- React context that listens to refresh events
- Displays a global loading modal during token refresh
- Shows "กำลังตรวจสอบสิทธิ์..." (Authenticating...) message
- Prevents user interaction during refresh

### 3. Enhanced API Client (`api_client.ts`)

#### Key Features:

- **Request Queuing**: Failed requests during token refresh are queued and retried
- **Single Refresh Instance**: Only one refresh attempt at a time
- **Automatic Retry**: Original request is automatically retried with new token
- **Fallback**: If refresh fails, user is logged out and shown error

#### Flow:

```
1. API Request → 401 Error
2. Check if already refreshing
   - Yes: Queue the request
   - No: Start refresh process
3. Emit refresh start event (show loading)
4. Call /v1/auth/refresh endpoint
5. Save new tokens
6. Retry original request with new token
7. Process queued requests
8. Emit refresh end event (hide loading)
```

## Files Modified

### 1. `src/utils/api/api_client.ts`

- Added `isRefreshing` flag
- Added `failedQueue` array
- Added `processQueue()` method
- Enhanced 401 error handling with token refresh logic
- Integrated token refresh emitter

### 2. `src/app/_layout.tsx`

- Wrapped app with `TokenRefreshProvider`
- Ensures loading overlay is available globally

## Files Created

### 1. `src/utils/api/token_refresh_emitter.ts`

- Event emitter for token refresh state
- Allows API client to communicate with UI

### 2. `src/context/TokenRefreshContext.tsx`

- React context for displaying loading overlay
- Listens to token refresh events
- Shows modal with loading spinner and Thai messages

## User Experience

### During Token Refresh:

1. **Loading Overlay**: Semi-transparent dark background
2. **Loading Card**: White card with rounded corners
3. **Spinner**: Blue spinner (brand color #5FA7D1)
4. **Message**: "กำลังตรวจสอบสิทธิ์..." (Authenticating...)
5. **Subtext**: "โปรดรอสักครู่" (Please wait a moment)

### On Success:

- Loading disappears
- Original request completes
- User continues seamlessly

### On Failure:

- Loading disappears
- Error message: "เซสชันหมดอายุ โปรดเข้าสู่ระบบอีกครั้ง"
- Tokens cleared
- User needs to re-authenticate

## API Requirements

The backend must support:

```typescript
POST /v1/auth/refresh
Headers:
  - X-Installation-Id: {installationId}
Body:
  {
    "refreshToken": "string"
  }
Response:
  {
    "data": {
      "accessToken": "string",
      "refreshToken": "string"
    }
  }
```

## Testing

### Test Scenarios:

1. **Single expired token**: Make request with expired token
2. **Multiple concurrent requests**: Make several requests simultaneously with expired token
3. **Refresh token expired**: Test with both access and refresh tokens expired
4. **Network failure during refresh**: Simulate network error during refresh

### Expected Behaviors:

1. Loading overlay appears immediately on 401
2. All concurrent requests wait for refresh
3. All requests retry after successful refresh
4. User is logged out if refresh fails
5. No duplicate refresh calls

## Security Considerations

1. **Token Storage**: Tokens stored securely using expo-secure-store (native) or localStorage (web)
2. **Single Refresh**: Prevents race conditions with multiple refresh attempts
3. **Token Cleanup**: Tokens cleared on refresh failure
4. **Request Queuing**: Prevents data loss from failed requests

## Performance

- **Minimal UI Blocking**: Only shows loading during actual refresh (< 1 second typically)
- **Request Batching**: Multiple failed requests handled in single refresh
- **Automatic Cleanup**: Queue cleared after processing

## Future Enhancements

1. **Retry Logic**: Add exponential backoff for failed refresh attempts
2. **Offline Handling**: Better handling of offline scenarios
3. **Token Expiry Prediction**: Refresh token before expiry to prevent 401s
4. **Refresh Token Rotation**: Support for refresh token rotation strategies
5. **Analytics**: Track refresh success/failure rates

## Troubleshooting

### Issue: Loading stays visible

- **Cause**: Error in refresh logic or event emission
- **Solution**: Check console logs for refresh errors

### Issue: 401 errors still occur

- **Cause**: Refresh endpoint not working or refresh token invalid
- **Solution**: Verify backend refresh endpoint and token validity

### Issue: Multiple refresh attempts

- **Cause**: `isRefreshing` flag not working
- **Solution**: Check that flag is properly set/cleared in finally block

## Console Logs

The implementation includes detailed console logging:

- `🔄 Attempting token refresh...` - Refresh started
- `✅ Token refreshed successfully` - Refresh completed
- `❌ Token refresh failed:` - Refresh failed
- `📤 Request:` - All API requests
- `✅ Response:` - All API responses

Monitor these logs during development and testing.
