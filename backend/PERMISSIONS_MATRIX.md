# Owner vs Caregiver - Permissions Matrix

**Owner vs Caregiver Access Control**

This document outlines the permission system for **OWNER** and **CAREGIVER** roles across all features in the PetCare backend.

---

## 🎭 Role Definitions

### OWNER
- User who **created the pet profile**
- Has **full control** over the pet and all related data
- Can **grant and revoke** caregiver access
- Recorded in `pets.user_id`

### CAREGIVER
- User granted **shared access** to pet by owner
- Has **limited permissions** compared to owner
- Access granted via **QR code invite system**
- Recorded in `pet_user_access` table with `revoked_at` = null

---

## 🛡️ Permission Enforcement Mechanisms

### 1. Middleware Layer
**Location:** `backend/src/middlewares/resolvePetRole.ts`

| Middleware | Purpose | Behavior |
|------------|---------|----------|
| `resolvePetRole` | Determines user's role for pet | Sets `req.petRole` = 'OWNER' or 'CAREGIVER' |
| `requireOwner` | Enforces owner-only operations | Returns 403 if role ≠ 'OWNER' |

### 2. Service Layer
**Location:** `backend/src/features/pet-sharing/pet-sharing-repository.ts`

```typescript
canAccessPet(petId: string, userId: string): Promise<boolean>
```
- Returns `true` if user is OWNER **OR** active CAREGIVER
- Used throughout services for access validation

### 3. Creator-Based Checks
**Pattern:** Used in features with "Owner modifies all, Caregiver modifies own" logic

```typescript
// Common pattern in services
if (pet.user_id !== userId) {  // Not owner
  if (record.created_by_user_id !== userId) {  // Didn't create this record
    throw new ForbiddenError('Caregivers can only modify resources they created')
  }
}
```

Applied in: Reminders, Health Logs, Medical Documents, Reminder Attachments

---

## 📊 Feature-by-Feature Permissions

### 1. 🐾 Pet Profiles

**Feature Path:** `backend/src/features/pets/`

| Operation | OWNER | CAREGIVER | Notes |
|-----------|:-----:|:---------:|-------|
| View pet list | ✅ | ✅ | Shows owned + shared pets with role indicator |
| View pet details | ✅ | ✅ | Both get `petRole` field in response |
| Create new pet | ✅ | ❌ | Only authenticated users can create |
| Update profile (name, breed, etc.) | ✅ | ❌ | Uses `requireOwner` middleware |
| Upload/update profile image | ✅ | ❌ | Uses `requireOwner` middleware |
| Delete profile image | ✅ | ❌ | Uses `requireOwner` middleware |
| Soft delete pet | ✅ | ❌ | Uses `requireOwner` middleware |
| Restore deleted pet | ✅ | ❌ | Owner-only, no sharing on deleted pets |
| Permanent delete pet | ✅ | ❌ | Owner-only, cascades all data |

**Key Restriction:** Caregivers have **read-only access** to pet profiles.

---

### 2. ⏰ Reminders

**Feature Path:** `backend/src/features/reminders/`

| Operation | OWNER | CAREGIVER | Notes |
|-----------|:-----:|:---------:|-------|
| View all reminders | ✅ | ✅ | Both see reminders for accessible pets |
| View reminder details | ✅ | ✅ | Includes `canDelete` permission flag |
| Create reminder | ✅ | ✅ | Both can create for accessible pets |
| Create batch reminders | ✅ | ✅ | Both can bulk create |
| Toggle status (done/undone) | ✅ | ✅ | Both can mark complete/incomplete |
| Update reminder | ✅ | ⚠️ Own only | Caregiver: only reminders they created |
| Delete reminder | ✅ | ⚠️ Own only | Caregiver: only reminders they created |

**Permission Logic:**
```typescript
// reminder-service.ts line 879-897
if (reminder.user_id !== userId) {  // Not pet owner
  if (reminder.created_by_user_id !== userId) {  // Didn't create reminder
    throw new ForbiddenError(
      'Caregivers can only update reminders they created themselves'
    )
  }
}
```

**Response Field:** `canDelete` boolean indicates if current user can delete reminder

---

### 3. 📎 Reminder Attachments

**Feature Path:** `backend/src/features/reminders/` (attachment services)

| Operation | OWNER | CAREGIVER | Notes |
|-----------|:-----:|:---------:|-------|
| View attachments | ✅ | ✅ | Returned with reminder details |
| Request upload URL | ✅ | ⚠️ Own reminders | Must own the reminder |
| Save attachment | ✅ | ⚠️ Own reminders | Must own the reminder |
| Delete attachment | ✅ | ⚠️ Own reminders | Must own the reminder |

**Permission Logic:**
```typescript
// reminder-attachment-service.ts line 58-76
async function assertCanMutateAttachments(reminderId, userId) {
  const reminder = await findById(reminderId)
  const isPetOwner = reminder.user_id === userId

  if (!isPetOwner) {  // If caregiver
    if (reminder.created_by_user_id !== userId) {  // Didn't create reminder
      throw new ForbiddenError(
        'Caregivers can only modify attachments on reminders they created'
      )
    }
  }
}
```

**Key Restriction:** Attachment permissions **follow reminder ownership**, not attachment creation.

---

### 4. 📋 Health Records

**Feature Path:** `backend/src/features/health-record/`

| Operation | OWNER | CAREGIVER | Notes |
|-----------|:-----:|:---------:|-------|
| View all health records | ✅ | ✅ | Filtered reminders where `is_health = true` |
| View record details | ✅ | ✅ | Same as reminder view permissions |

**Note:** Health records are **read-only wrappers** around reminders. Create/update/delete operations go through the **Reminders** feature, which enforces creator-based permissions.

---

### 5. 📝 Health Logs

**Feature Path:** `backend/src/features/health-log/`

| Operation | OWNER | CAREGIVER | Notes |
|-----------|:-----:|:---------:|-------|
| View all logs | ✅ | ✅ | Both see all logs for pet |
| View log details | ✅ | ✅ | Includes `createdBy` label |
| Create log | ✅ | ✅ | Both can log weight, symptoms, behavior |
| Update log | ✅ | ⚠️ Own only | Caregiver: only logs they created |
| Delete log | ✅ | ⚠️ Own only | Caregiver: only logs they created |

**Permission Logic:**
```typescript
// health-log-service.ts line 344-355 (update)
const isPetOwner = pet.user_id === userId
if (!isPetOwner) {
  if (log.created_by_user_id !== userId) {
    throw new ForbiddenError(
      'Caregivers can only update health logs they created themselves'
    )
  }
}
```

**Response Field:** `createdBy` shows creator label:
- `"คุณ"` if created by current user
- `"เจ้าของสัตว์เลี้ยง"` if created by owner (when caregiver views)
- Caregiver's alias if caregiver created (when owner views)

---

### 6. 🏥 Pet Medical Documents

**Feature Path:** `backend/src/features/pet-medical-documents/`

| Operation | OWNER | CAREGIVER | Notes |
|-----------|:-----:|:---------:|-------|
| View all documents | ✅ | ✅ | Both see all uploaded documents |
| Request upload URLs | ✅ | ✅ | Both can upload documents |
| Save documents | ✅ | ✅ | Both can confirm uploads |
| Delete document | ✅ | ⚠️ Own only | Caregiver: only documents they uploaded |

**Permission Logic:**
```typescript
// pet-medical-document-service.ts line 184-193
const isPetOwner = pet.user_id === userId
if (!isPetOwner) {
  if (document.created_by_user_id !== userId) {
    throw new ForbiddenError(
      'Caregivers can only delete medical documents they uploaded themselves'
    )
  }
}
```

**Key Restriction:** Unlike attachments, document deletion is based on **document creator**, not pet owner.

---

### 7. 💉 Vaccine Schedule

**Feature Path:** `backend/src/features/vaccine-schedule/`

| Operation | OWNER | CAREGIVER | Notes |
|-----------|:-----:|:---------:|-------|
| Calculate vaccine schedule | ✅ | ✅ | Both can calculate for accessible pets |
| View vaccine schedule | ✅ | ✅ | Both can view schedules |

**Key Restriction:** This is a **read-only/calculation feature** with no create/delete operations. No permission differences between roles.

---

### 8. 🔔 Notifications

**Feature Path:** `backend/src/features/notifications/`

| Operation | OWNER | CAREGIVER | Notes |
|-----------|:-----:|:---------:|-------|
| Receive notifications | ✅ | ✅ | Both receive pet-related notifications |
| View notifications | ✅ | ✅ | Each sees their own notification list |
| Mark as read/unread | ✅ | ✅ | Users modify their own notifications |

**Special Behavior:**

#### Notification Fan-out Rules:
**Location:** `notification-service.ts`

1. **Reminder Status Changes** (line 398-510)
   - Sent to: Owner + All active caregivers **EXCEPT** the user who made the change
   - Example: If caregiver marks reminder done, owner + other caregivers are notified

2. **Health Insights** (line 521-616)
   - Sent to: Owner + All active caregivers
   - Example: Weight loss detection alerts everyone

3. **Pet Tips** (line 178-299)
   - Sent to: Owner + All active caregivers
   - Example: Breed-specific care tips sent to all

**Key Pattern:** Notifications are **user-scoped**, not role-scoped. Both roles receive the same notifications for shared pets.

---

### 9. 🔗 Pet Sharing (Access Management)

**Feature Path:** `backend/src/features/pet-sharing/`

| Operation | OWNER | CAREGIVER | Notes |
|-----------|:-----:|:---------:|-------|
| Generate invite (QR code) | ✅ | ❌ | Owner creates 24-hour invite |
| Preview invite | ✅ | ✅ | Anyone with link can preview |
| Claim invite | ❌ | ✅ | Owner cannot claim own pets |
| List caregivers | ✅ | ❌ | Uses `requireOwner` middleware |
| View access list | ✅ | ✅ | Caregiver sees `selfAccessId` |
| Revoke caregiver access | ✅ | ❌ | Uses `requireOwner` middleware |
| Update caregiver alias | ✅ | ❌ | Owner can rename caregivers |
| List pending invites | ✅ | ❌ | Owner sees their sent invites |
| Cancel invite | ✅ | ❌ | Owner can revoke unused invites |
| Leave shared pet | ❌ | ✅ | Caregiver can self-revoke via access list |

**Special Access List Behavior:**
```typescript
// Both roles get access list, but with different info:
{
  accesses: [
    { accessId: "uuid1", userName: "Owner Name", role: "OWNER" },
    { accessId: "uuid2", userName: "Caregiver Alias", role: "CAREGIVER" }
  ],
  selfAccessId: "uuid2"  // Only present for caregivers to identify themselves
}
```

**Key Restrictions:**
1. Owner **cannot scan own invite** (self-sharing prevention)
2. Expired invites (>24 hours) **cannot be claimed**
3. Revoking caregiver **soft-deletes** access (`revoked_at` timestamp)
4. Re-inviting revoked caregiver **restores access** (sets `revoked_at = null`)

---

## 🎯 Permission Patterns Summary

### Pattern 1: Owner Full Control, Caregiver Read-Only
**Used in:** Pet Profiles

```
✅ OWNER: CRUD (Create, Read, Update, Delete)
✅ CAREGIVER: R (Read only)
```

### Pattern 2: Both Create & View, Owner Modifies All, Caregiver Modifies Own
**Used in:** Reminders, Health Logs, Medical Documents

```
✅ OWNER: Create, Read, Update ANY, Delete ANY
✅ CAREGIVER: Create, Read, Update OWN, Delete OWN
```

**Implementation:** Logic compares `created_by_user_id` with current `userId` when user is not owner.

### Pattern 3: Owner-Only Management
**Used in:** Pet Sharing (access management)

```
✅ OWNER: Generate invites, Revoke access, Manage aliases
✅ CAREGIVER: View access list only (can self-revoke indirectly)
```

---

## 🔐 Security Features

### 1. Cascade Revocation
When caregiver access is revoked (`revoked_at` set):
- ✅ Loses access to pet profile immediately
- ✅ Cannot view/modify pet's data
- ✅ Cannot access documents they uploaded
- ✅ Cannot modify reminders/logs they created
- ❌ Data they created remains (audit trail)
- ❌ Owner retains full access to caregiver's contributions

### 2. Invite Expiration
- QR code invites expire after **24 hours**
- Expired invites return: `"Code expired or already used"` (400 error)
- Prevents indefinite access windows

### 3. Self-Sharing Prevention
- Owner cannot claim their own invite
- Returns: `"You are already the owner of one of these pets"` (400 error)

### 4. Inactive Pet Filtering
- Deceased/deleted pets excluded from new shares
- Claiming invite **skips inactive pets** without error
- Graceful handling of stale invites

### 5. Permission Flags in Responses
Many endpoints return permission indicators:
- `petRole`: "OWNER" or "CAREGIVER"
- `canDelete`: Boolean for delete permission
- `createdBy`: Label showing who created record
- `selfAccessId`: Helps caregiver identify themselves in access list

---

## 📋 Validation Examples for Presentation

### Example 1: Caregiver Tries to Delete Owner's Reminder
```http
DELETE /v1/reminders/abc-123-xyz
Authorization: Bearer <caregiver-token>
```

**Response:**
```json
{
  "status": "error",
  "statusCode": 403,
  "errors": [
    {
      "message": "Caregivers can only delete reminders they created themselves"
    }
  ]
}
```

---

### Example 2: Owner Scans Own Invite QR Code
```http
POST /v1/pet-shares/claim/abc-invite-token
Authorization: Bearer <owner-token>
```

**Response:**
```json
{
  "status": "error",
  "statusCode": 400,
  "errors": [
    {
      "message": "You are already the owner of one of these pets"
    }
  ]
}
```

---

### Example 3: Caregiver Views Shared Pet
```http
GET /v1/pets/me/pet-uuid-123
Authorization: Bearer <caregiver-token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "pet-uuid-123",
    "pet_name": "Max",
    "petRole": "CAREGIVER",
    "species": "สุนัข",
    "...": "..."
  }
}
```

Notice `petRole: "CAREGIVER"` indicates limited permissions.

---

### Example 4: Both Roles Receive Health Insight Notification
```
// When pet shows rapid weight loss:

Owner receives:
{
  "type": "HEALTH_INSIGHT",
  "title": "ตรวจพบการลดน้ำหนักอย่างรวดเร็ว",
  "message": "Max ลดน้ำหนัก 12% ใน 14 วัน",
  "...": "..."
}

Caregiver receives:
{
  "type": "HEALTH_INSIGHT",
  "title": "ตรวจพบการลดน้ำหนักอย่างรวดเร็ว",
  "message": "Max ลดน้ำหนัก 12% ใน 14 วัน",
  "...": "..."
}
```

Both receive **identical notifications** for shared pet health issues.

---

## 🎓 Design Principles

### 1. **Granular Creator-Based Control**
Rather than blanket "caregivers can't modify anything", the system allows caregivers to manage their own contributions while protecting owner's data.

**Benefit:** Encourages caregiver participation without risk to existing records.

---

### 2. **Symmetric Notification Distribution**
Owners and caregivers receive the same notifications for shared pets, ensuring everyone stays informed.

**Benefit:** Collaborative care with equal awareness of pet health.

---

### 3. **Soft Delete for Access Control**
Revoked access uses `revoked_at` timestamp rather than hard delete.

**Benefit:**
- Audit trail for who had access and when
- Easy to restore access (just set `revoked_at = null`)
- Historical data integrity

---

### 4. **Read Permission Inheritance**
If user can access pet, they can view ALL related data (reminders, logs, documents) regardless of creator.

**Benefit:** Complete context for caregiver to provide informed care.

---

### 5. **Write Permission per Resource Type**
Modification permissions checked per-record based on creator.

**Benefit:** Fine-grained control prevents accidental damage to others' contributions.

---

## 📚 Related Documentation

- **Implementation Guide:** `backend/BACKEND_CONTEXT.md` - Section on Pet Sharing & Access Control
- **Test Cases:** `backend/TEST_CASES.md` - Section 9 (Pet Sharing Edge Cases)
- **Schema:** `backend/prisma/schema.prisma` - Tables: `pet_user_access`, `pet_share_invites`, `owner_caregiver_contacts`

---

**Document Version:** 1.0
**Last Updated:** 2026-03-29
**Coverage:** 9 Features, 2 Roles, 60+ Operations
