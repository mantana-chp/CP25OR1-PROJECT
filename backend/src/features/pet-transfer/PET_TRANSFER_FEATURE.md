# Pet Transfer Ownership Feature

**Last Updated:** April 9, 2026  
**Status:** ✅ Implemented — Pending Migration

---

## Overview

This feature allows a pet owner to fully transfer ownership of one or more pets to another user. Unlike **pet-sharing** (which grants caregiver access while the original owner retains ownership), a transfer is a **permanent, irreversible handover** of `pets.user_id`.

Key characteristics:
- Multi-pet: owner can transfer up to 30 of their own pets in a single token
- Token-based: UUID-only token (same pattern as `pet_share_invites`). Frontend generates a QR code from the UUID
- One-time use: token expires in **1 hour** and cannot be reused
- Atomic: the entire migration happens in a single Prisma transaction — if anything fails, everything rolls back
- All-or-nothing: receiver accepts all pets or none
- Audit logged: every successful transfer writes to `pet_transfer_audit_logs`

---

## Database Schema

Three new models and one new enum were added to `prisma/schema.prisma`:

### `transfer_token_status` (enum)
```prisma
enum transfer_token_status {
  PENDING
  COMPLETED
  EXPIRED
  CANCELLED
}
```

### `pet_transfer_tokens`
Stores one transfer request. The UUID `id` is used as the token (shared via QR or direct link).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | The transfer token itself |
| `created_by` | UUID FK → users | Current owner who initiated |
| `status` | enum | PENDING → COMPLETED / EXPIRED / CANCELLED |
| `expires_at` | Timestamptz | `now() + 1 hour` |
| `claimed_by` | UUID FK → users (nullable) | New owner who accepted |
| `claimed_at` | Timestamptz (nullable) | When accepted |
| `created_at` | Timestamptz | Auto |

### `pet_transfer_token_pets` (junction)
Links multiple pets to a single transfer token. Mirrors the `pet_share_invite_pets` pattern.

| Column | Type | Notes |
|--------|------|-------|
| `transfer_id` | UUID FK → pet_transfer_tokens | Composite PK |
| `pet_id` | UUID FK → pets | Composite PK |

### `pet_transfer_audit_logs`
Minimal audit trail. One row per pet per completed transfer.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `transfer_token_id` | UUID FK | |
| `pet_id` | UUID | Which pet was transferred |
| `from_user_id` | UUID | Previous owner |
| `to_user_id` | UUID | New owner |
| `action` | VarChar(50) | e.g. `TRANSFER_COMPLETED` |
| `metadata` | JSON (nullable) | `{ remindersCount, caregiversRevoked }` |
| `created_at` | Timestamptz | Auto |

### Relations added to existing models
```prisma
// pets model
transfer_token_pets   pet_transfer_token_pets[]

// users model
created_transfers     pet_transfer_tokens[]  @relation("TransferCreator")
claimed_transfers     pet_transfer_tokens[]  @relation("TransferClaimer")
```

---

## Migration

To apply the schema changes:
```bash
npx prisma migrate dev --name add_pet_transfer
```

---

## Feature Module

Located at `src/features/pet-transfer/`. Follows the standard layered architecture:

```
src/features/pet-transfer/
├── pet-transfer-types.ts       # DTOs, interfaces, constants (1h expiry, 30 pet limit)
├── pet-transfer-schema.ts      # Zod v4 validation schemas
├── pet-transfer-repository.ts  # Database operations + transaction helpers
├── pet-transfer-mapper.ts      # Pet DB record → TransferPreviewPetDto (with presigned image URLs)
├── pet-transfer-service.ts     # Business logic with atomic transaction
├── pet-transfer-controller.ts  # HTTP layer
└── pet-transfer-routes.ts      # Routes + OpenAPI docs
```

---

## API Endpoints

All routes are mounted under `/v1/pet-transfers`. All require `Authorization: Bearer <token>` and `X-Installation-Id` headers.

---

### 1. Initiate Transfer

```
POST /v1/pet-transfers
```

**Who calls it:** Current owner, from the pet profile screen.

**Request body:**
```json
{
  "petIds": ["uuid-1", "uuid-2"]
}
```

**Validations:**
- All `petIds` must be owned by the requesting user (`pets.user_id === userId`)
- All pets must be `status: ACTIVE` and not soft-deleted
- No pet in `petIds` can already be in a PENDING transfer token
- After transferring these pets, the user must still have ≥ 1 accessible pet (owned + shared counted)
- Max 30 pets per token

**Response (201):**
```json
{
  "transferId": "uuid",
  "expiresAt": "2026-04-09T11:00:00Z",
  "createdAt": "2026-04-09T10:00:00Z",
  "petIds": ["uuid-1", "uuid-2"]
}
```

The frontend encodes `transferId` into a QR code and displays a countdown timer from `expiresAt`.

---

### 2. Preview Transfer

```
GET /v1/pet-transfers/preview/:token
```

**Who calls it:** Receiver, after scanning the QR code or manually entering the UUID. Called before the accept step so the receiver can review what they're getting.

**Validations:**
- Token exists and is `PENDING`
- Token has not expired
- Receiver is not the creator (no self-transfer)

**Response (200):**
```json
{
  "transferId": "uuid",
  "expiresAt": "2026-04-09T11:00:00Z",
  "pets": [
    {
      "id": "uuid",
      "petName": "Mochi",
      "species": "แมว",
      "breed": "สก็อตติชโฟลด์",
      "gender": "female",
      "age": 820,
      "weight": 4.5,
      "profileImageUrl": "https://...",
      "status": "ACTIVE"
    }
  ],
  "receiverCurrentPetCount": 5,
  "incomingPetCount": 2,
  "wouldExceedLimit": false,
  "maxPetLimit": 30
}
```

> **Frontend note:** If `wouldExceedLimit` is `true`, disable the confirm button and show an appropriate message.

> **Age field:** `age` is returned as number of days (matches the `formatAgeFromBirthDate` utility). Frontend converts to human-readable format.

---

### 3. Accept Transfer (2-step Confirmation)

```
POST /v1/pet-transfers/accept/:token
```

**Who calls it:** Receiver, after reviewing the preview. Requires explicit confirmation in the body.

**Request body:**
```json
{
  "confirmTransfer": true
}
```

**Validations (before transaction):**
- Token exists, is `PENDING`, not expired
- Receiver is not the creator
- `confirmTransfer === true` (explicit 2nd-layer confirmation)
- Receiver's total pet count + incoming pets ≤ 30

**Idempotency:** If the token is already `COMPLETED` and `claimed_by === userId`, returns the same success response instead of an error (safe for network retries / double-taps).

**Atomic Transaction (single `prisma.$transaction`):**

For each pet in the token:
1. `pets.user_id` → new owner
2. `reminders.user_id` → new owner (all reminders, regardless of status)
3. Cancel `pending` notifications for the old owner on this pet (both direct pet notifications and reminder-linked notifications)
4. Revoke all `pet_user_access` rows for this pet (`revoked_at = now()`)
5. Remove pet from any pending share invite links (`pet_share_invite_pets`)
6. Write `pet_transfer_audit_logs` entry with migration metadata

After all pets:
7. Mark token as `COMPLETED`, set `claimed_by` and `claimed_at`

**If any step fails → full rollback.**

**Response (200):**
```json
{
  "message": "Transfer completed successfully.",
  "transferredPets": [
    { "id": "...", "petName": "Mochi", ... }
  ]
}
```

---

### 4. Cancel Transfer

```
DELETE /v1/pet-transfers/:transferId
```

**Who calls it:** Current owner, to cancel a pending transfer they initiated.

**Validations:**
- Token exists and was created by the requesting user
- Token status is `PENDING`

**Response (200):**
```json
{ "message": "Transfer cancelled." }
```

---

### 5. List Pending Transfers

```
GET /v1/pet-transfers/pending
```

**Who calls it:** Current owner, to see active transfer tokens they have created.

**Response (200):**
```json
{
  "pendingTransfers": [
    {
      "transferId": "uuid",
      "expiresAt": "2026-04-09T11:00:00Z",
      "createdAt": "2026-04-09T10:00:00Z",
      "pets": [
        { "id": "uuid-1", "petName": "Mochi" }
      ]
    }
  ]
}
```

---

## Business Rules Summary

| Rule | Behavior |
|------|----------|
| Last-pet guard | Cannot transfer if user would have 0 accessible pets after (owned + shared counted) |
| Overlapping transfer | Cannot create a 2nd PENDING token for a pet that already has one |
| Receiver limit | Cannot accept if total pets + incoming > 30 |
| Self-transfer | Owner cannot accept their own token (blocked at preview and accept) |
| Caregiver reset | All caregivers are revoked when ownership transfers |
| Token expiry | 1 hour. Expired tokens return a clear error message |
| Idempotency | Double-accepting the same token by the same user returns success (safe retries) |
| Race condition | Token status is re-validated inside the transaction to prevent concurrent acceptance |
| Caregiver → Owner | A current caregiver can accept a transfer; their caregiver access row is removed in the same transaction |
| Deceased/deleted pet in token | Skipped with a warning log (does not fail the whole transfer) |
| Data migration | Health logs, medical documents, vaccine records stay with the pet — new owner has full access |
| Old owner notifications | Historical notifications are preserved (read-only history) |
| Future notifications | Cron job auto-routes to new owner since `reminders.user_id` and `pets.user_id` are updated |

---

## What Happens After Transfer

| Concern | Result |
|---------|--------|
| `pets.user_id` | → New owner |
| `reminders.user_id` | → New owner (all reminders migrated) |
| Future reminder notifications | Cron reads `reminders.user_id` → naturally goes to new owner |
| Old owner's pending notifications | Cancelled (`status = 'failed'`) |
| Caregiver access | All revoked. New owner must re-invite any caregivers they want |
| Health logs, medical docs | Unchanged — they're tied to `pet_id`, not `user_id` |
| Old owner's past notifications | Left in place as historical data |
| Old owner's access to pet endpoints | Returns 404/403 immediately after transfer |

---

## Error Reference

| HTTP | Scenario | Message |
|------|----------|---------|
| 400 | Pet not owned by user or not active | "One or more pets not found, do not belong to you, or are not active." |
| 400 | Would leave user with 0 pets | "Cannot transfer your last accessible pet. You must have at least one active pet remaining." |
| 400 | Token expired | "Transfer token has expired." |
| 400 | Token already used | "Transfer token has already been used." |
| 400 | Token cancelled | "Transfer token has been cancelled." |
| 400 | Self-transfer | "You cannot accept your own transfer." |
| 400 | Token no longer valid (race) | "Transfer token is no longer valid. It may have expired or been used." |
| 400 | Only pending can be cancelled | "Only pending transfers can be cancelled." |
| 404 | Token not found | "Invalid transfer token." |
| 404 | Transfer not found (cancel) | "Transfer not found or does not belong to you." |
| 409 | Overlapping transfer for pet | "One or more pets already have a pending transfer: ..." |
| 409 | Receiver over 30-pet limit | "Cannot accept transfer. You currently have X pets and this transfer includes Y pets, which would exceed the maximum limit of 30." |
