# Pet Transfer Owner - Regression Test Plan

Last updated: 2026-04-09

## Objective

Validate the owner transfer feature end to end and ensure no regressions across ownership, reminders, notifications, caregiver access, and audit logs.

This plan is based on:
- API routes under `/v1/pet-transfers`
- Current backend behavior in `pet-transfer-service` and `pet-transfer-repository`
- Existing seeded data in `prisma/seed.ts`

## Scope

In scope:
- Initiate transfer
- Pending list
- Preview transfer
- Accept transfer (including idempotent retry)
- Cancel transfer
- Post-transfer data integrity
- Main negative/error scenarios

Out of scope:
- Frontend QR rendering UX
- Load/performance benchmark

## Prerequisites

1. Install dependencies and ensure env is configured.
2. Database migrated.
3. Seed data loaded.
4. Backend running locally.

Commands:

```bash
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Base URL:

```bash
export BASE_URL="http://localhost:3000/v1"
```

## Test Data (From Current Seed)

Owner user:
- `userId`: `4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28`
- `installationId`: `6f8b1c7a-4a2d-4f1e-8b4c-9a1d3f0e8b2a`
- `platformDeviceId`: `f1e8b2a1-c7d3-4a4d-9f0e-3a4d6b8c0a3d`

Receiver user:
- `userId`: `9c7a4f1e-6d2f-4a8b-9e3d-1a4f0c8e3b2a`
- `installationId`: `9e1f3a4d-6b8c-4f7d-8b2a-1c7d0a3f1e8b`
- `platformDeviceId`: `c7d3a4d6-b8c0-4f0e-8b2a-1c7d3a4d6f0e`

Disabled user (for edge-case validation):
- `userId`: `d3f9e8a1-5b2c-4f8e-8a6d-9c3b1e7f2a4d`

Owner pets to transfer:
- `e6b3c2a1-8d4f-4e6a-9b1d-7f5c0a8e3b2a` (Milo)
- `c9f8a3e1-5b2c-4f8e-8a6d-9c3b1e7f2a4d` (Luna)

## Step 1 - Authenticate Both Users

Generate access tokens using device login.

```bash
# Owner login
OWNER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/device-login" \
  -H "Content-Type: application/json" \
  -d '{
    "installationId":"6f8b1c7a-4a2d-4f1e-8b4c-9a1d3f0e8b2a",
    "platform":"ios",
    "platformDeviceId":"f1e8b2a1-c7d3-4a4d-9f0e-3a4d6b8c0a3d",
    "platformIdSource":"ios_keychain"
  }')

# Receiver login
RECEIVER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/device-login" \
  -H "Content-Type: application/json" \
  -d '{
    "installationId":"9e1f3a4d-6b8c-4f7d-8b2a-1c7d0a3f1e8b",
    "platform":"ios",
    "platformDeviceId":"c7d3a4d6-b8c0-4f0e-8b2a-1c7d3a4d6f0e",
    "platformIdSource":"ios_keychain"
  }')

OWNER_TOKEN=$(echo "$OWNER_LOGIN" | jq -r '.data.accessToken')
RECEIVER_TOKEN=$(echo "$RECEIVER_LOGIN" | jq -r '.data.accessToken')

export OWNER_INSTALLATION_ID="6f8b1c7a-4a2d-4f1e-8b4c-9a1d3f0e8b2a"
export RECEIVER_INSTALLATION_ID="9e1f3a4d-6b8c-4f7d-8b2a-1c7d0a3f1e8b"
```

Expected:
- Both responses return HTTP `200`
- `data.accessToken` is present

## Step 2 - Initiate Transfer (Happy Path)

```bash
INITIATE_RESPONSE=$(curl -s -X POST "$BASE_URL/pet-transfers" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "x-installation-id: $OWNER_INSTALLATION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "petIds": [
      "e6b3c2a1-8d4f-4e6a-9b1d-7f5c0a8e3b2a"
    ]
  }')

echo "$INITIATE_RESPONSE"
TRANSFER_ID=$(echo "$INITIATE_RESPONSE" | jq -r '.data.transferId')
```

Expected:
- HTTP `201`
- `data.transferId` UUID returned
- `data.expiresAt` returned

## Step 3 - List Pending Transfers (Owner)

```bash
curl -s "$BASE_URL/pet-transfers/pending" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "x-installation-id: $OWNER_INSTALLATION_ID"
```

Expected:
- HTTP `200`
- `data.pendingTransfers` contains `TRANSFER_ID`

## Step 4 - Preview Transfer (Receiver)

```bash
curl -s "$BASE_URL/pet-transfers/preview/$TRANSFER_ID" \
  -H "Authorization: Bearer $RECEIVER_TOKEN" \
  -H "x-installation-id: $RECEIVER_INSTALLATION_ID"
```

Expected:
- HTTP `200`
- Pet list returned
- `wouldExceedLimit` correctly computed

## Step 5 - Accept Transfer (Receiver)

```bash
ACCEPT_RESPONSE=$(curl -s -X POST "$BASE_URL/pet-transfers/accept/$TRANSFER_ID" \
  -H "Authorization: Bearer $RECEIVER_TOKEN" \
  -H "x-installation-id: $RECEIVER_INSTALLATION_ID" \
  -H "Content-Type: application/json" \
  -d '{"confirmTransfer": true}')

echo "$ACCEPT_RESPONSE"
```

Expected:
- HTTP `200`
- `data.message` is success message
- `data.transferredPets` returned

## Step 6 - Idempotency Check (Accept Again)

```bash
curl -s -X POST "$BASE_URL/pet-transfers/accept/$TRANSFER_ID" \
  -H "Authorization: Bearer $RECEIVER_TOKEN" \
  -H "x-installation-id: $RECEIVER_INSTALLATION_ID" \
  -H "Content-Type: application/json" \
  -d '{"confirmTransfer": true}'
```

Expected:
- HTTP `200`
- Returns idempotent success response for same claimer

## Step 7 - Post-Transfer API Access Checks

```bash
# Old owner should no longer access transferred pet
curl -i -s "$BASE_URL/pets/me/e6b3c2a1-8d4f-4e6a-9b1d-7f5c0a8e3b2a" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "x-installation-id: $OWNER_INSTALLATION_ID"

# Receiver should now access transferred pet
curl -i -s "$BASE_URL/pets/me/e6b3c2a1-8d4f-4e6a-9b1d-7f5c0a8e3b2a" \
  -H "Authorization: Bearer $RECEIVER_TOKEN" \
  -H "x-installation-id: $RECEIVER_INSTALLATION_ID"
```

Expected:
- Old owner: non-200 (404 or 403 depending on resolver path)
- Receiver: HTTP `200`

## Step 8 - Database Integrity Verification

Run these queries in Postgres after successful accept.

```sql
-- 1) Pet owner changed
SELECT id, user_id
FROM pets
WHERE id IN ('e6b3c2a1-8d4f-4e6a-9b1d-7f5c0a8e3b2a');

-- Expect user_id = receiver user id

-- 2) Reminders migrated to new owner
SELECT id, pet_id, user_id
FROM reminders
WHERE pet_id IN ('e6b3c2a1-8d4f-4e6a-9b1d-7f5c0a8e3b2a');

-- Expect user_id = receiver user id

-- 3) Old owner pending notifications cancelled
SELECT id, user_id, status, pet_id, reminder_id
FROM notifications
WHERE user_id = '4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28'
  AND (
    pet_id IN ('e6b3c2a1-8d4f-4e6a-9b1d-7f5c0a8e3b2a')
    OR reminder_id IN (
      SELECT id FROM reminders WHERE pet_id IN ('e6b3c2a1-8d4f-4e6a-9b1d-7f5c0a8e3b2a')
    )
  );

-- Expect any previously pending rows to be status = 'failed'

-- 4) Caregiver access revoked
SELECT id, pet_id, user_id, revoked_at
FROM pet_user_access
WHERE pet_id IN ('e6b3c2a1-8d4f-4e6a-9b1d-7f5c0a8e3b2a')
  AND revoked_at IS NULL;

-- Expect 0 rows

-- 5) Audit logs written
SELECT transfer_token_id, pet_id, from_user_id, to_user_id, action, metadata, created_at
FROM pet_transfer_audit_logs
WHERE transfer_token_id = '<TRANSFER_ID>';

-- Expect >= 1 row, action = TRANSFER_COMPLETED

-- 6) Token marked completed
SELECT id, status, claimed_by, claimed_at
FROM pet_transfer_tokens
WHERE id = '<TRANSFER_ID>';

-- Expect status = COMPLETED, claimed_by = receiver user id
```

## Negative Regression Matrix

Run each case independently from a clean state (or recreate token each case).

| Case | API | Input | Expected |
|---|---|---|---|
| Invalid token UUID format | `GET /pet-transfers/preview/:token` | `token=abc` | `400 Validation failed` |
| Unknown token | preview/accept | random UUID | `404 Invalid transfer token.` |
| Self transfer blocked | preview/accept | owner tries own token | `400 You cannot accept your own transfer.` |
| confirmTransfer missing/false | accept | `{}` or `{"confirmTransfer": false}` | `400 Validation failed` |
| Cancel by non-owner | `DELETE /pet-transfers/:id` | receiver token | `404 Transfer not found or does not belong to you.` |
| Accept cancelled token | cancel then accept | valid token | `400 Transfer token has been cancelled.` |
| Overlapping transfer | initiate twice for same pet while pending | same pet ID | `409 conflict` |
| Last accessible pet guard | transfer all accessible pets | owner would have 0 left | `400 Cannot transfer your last accessible pet...` |
| Receiver pet limit exceeded | accept where receiver total + incoming > 30 | valid token | `409 Cannot accept transfer...` |
| Missing x-installation-id | any protected endpoint | omit header | `401 X-Installation-Id header missing` |
| Token/header installation mismatch | protected endpoint | mismatched token and header | `401 Invalid token for this installation` |

## Requirement Conformance Check (Active Parties)

Business requirement notes say both parties should be active.

Test this explicitly:
1. Disabled user initiates transfer.
2. Disabled user accepts transfer.

Expected by requirement:
- Should be blocked.

Current implementation observation:
- Transfer flow currently validates ownership/access and token rules, but does not explicitly check `users.status` in transfer service.
- If test passes for disabled users, raise as a defect.

## Optional Cancellation Flow (Standalone)

1. Owner initiates token.
2. Owner calls `DELETE /v1/pet-transfers/:transferId`.
3. Verify token status = `CANCELLED`.
4. Verify receiver cannot preview/accept anymore.

## Execution Checklist

- [ ] Environment ready
- [ ] Tokens generated for owner and receiver
- [ ] Happy path passed
- [ ] DB assertions passed
- [ ] Idempotency check passed
- [ ] Negative matrix completed
- [ ] Active-party requirement tested
- [ ] Defects logged with request/response evidence

## Reporting Template

Use this template for each run:

```md
Run Date:
Environment:
Backend Commit:

Happy Path:
- Status:
- Transfer ID:

DB Integrity:
- pets.user_id migrated: PASS/FAIL
- reminders.user_id migrated: PASS/FAIL
- notifications pending->failed: PASS/FAIL
- caregiver revoke: PASS/FAIL
- audit log created: PASS/FAIL

Negative Cases:
- [case name]: PASS/FAIL

Active-Party Requirement:
- disabled initiator blocked: PASS/FAIL
- disabled receiver blocked: PASS/FAIL

Defects:
- ID / Summary / Severity
```
