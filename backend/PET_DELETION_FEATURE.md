# Pet Deletion & Deceased Feature

## สิ่งที่เปลี่ยนแปลงในฝั่ง Backend

### 1. Prisma Schema (Database)

เพิ่ม enum และ field ใหม่ในตาราง `pets`:

| สิ่งที่เพิ่ม | รายละเอียด |
|---|---|
| `pet_status` enum | ค่า: `ACTIVE`, `DECEASED`, `DELETED` — ใช้แยกสถานะของสัตว์เลี้ยง |
| `deletion_reason` enum | ค่า: `JUST_DELETE`, `DECEASED` — ใช้เก็บเหตุผลที่ลบ |
| `status` field | สถานะของสัตว์เลี้ยง (ค่าเริ่มต้น `ACTIVE`) |
| `deceased_date` field | วันที่สัตว์เลี้ยงเสียชีวิต (nullable) |
| `deleted_at` field | Timestamp ที่ทำการ soft delete (ใช้คำนวณ 30 วัน) |
| `deletion_reason` field | เหตุผลที่ลบ (`JUST_DELETE` หรือ `DECEASED`) |
| `reminder_status` enum | เพิ่มค่า `cancelled` — ใช้สำหรับ reminder ที่ถูกยกเลิกเมื่อลบ/เสียชีวิต |

### 2. API Endpoints ใหม่

| Method | Path | ใช้ทำอะไร |
|---|---|---|
| `DELETE` | `/pets/me/:id` | ลบ Pet (Soft Delete) หรือทำเครื่องหมายว่าเสียชีวิต |
| `GET` | `/pets/me/past` | ดึงรายชื่อ Pet ที่เสียชีวิตแล้ว (Past Pets) |
| `GET` | `/pets/me/recently-deleted` | ดึงรายชื่อ Pet ที่ถูกลบภายใน 30 วัน |

#### ตัวอย่าง Request สำหรับลบ Pet

```json
DELETE /pets/me/{petId}

// กรณีแค่ต้องการลบ
{
  "reason": "JUST_DELETE"
}

// กรณีน้องเสียชีวิต
{
  "reason": "DECEASED",
  "deceased_date": "2026-02-25T00:00:00.000Z"  // optional
}
```

### 3. API เดิมที่เปลี่ยนแปลง

| Endpoint | สิ่งที่เปลี่ยน |
|---|---|
| `GET /pets/me` | ตอนนี้ return เฉพาะ pet ที่ `status = ACTIVE` เป็นค่าเริ่มต้น สามารถส่ง `?status=ACTIVE\|DECEASED\|DELETED` ได้ |
| `PATCH /pets/me/:id` | ถ้า pet มีสถานะ `DELETED` หรือ `DECEASED` จะไม่สามารถแก้ไขได้ (return 400) |
| Pet Profile Response | เพิ่ม field ใหม่: `status`, `deceased_date`, `deleted_at`, `deletion_reason` ในทุก response |

### 4. Business Rules ที่สำคัญ

| กฎ | รายละเอียด |
|---|---|
| **ลบ Pet ตัวสุดท้ายไม่ได้** | ถ้า user มี Active Pet เหลือแค่ 1 ตัว จะไม่สามารถเลือก "แค่ต้องการลบ" ได้ (return 400) |
| **ทำเครื่องหมายเสียชีวิตได้เสมอ** | แม้จะเป็น Pet ตัวสุดท้าย ก็สามารถทำเครื่องหมายว่าเสียชีวิตได้ (เพราะเป็นเหตุการณ์จริง) |
| **เฉพาะ Active Pet เท่านั้น** | ลบหรือทำเครื่องหมายเสียชีวิตได้เฉพาะ Pet ที่ `status = ACTIVE` |
| **นับ Pet Limit เฉพาะ Active** | การนับจำนวน Pet (สูงสุด 10 ตัว) จะนับเฉพาะ `ACTIVE` ไม่นับ `DECEASED` หรือ `DELETED` |

### 5. สิ่งที่เกิดขึ้นเมื่อลบหรือทำเครื่องหมายเสียชีวิต

เมื่อ Pet ถูกลบหรือเสียชีวิต ระบบจะทำสิ่งต่อไปนี้ทั้งหมดใน Transaction เดียว:

1. **Reminder ที่ยังไม่เสร็จ** (`to_do`, `overdue`) → เปลี่ยนสถานะเป็น `cancelled`
2. **Reminder ที่เสร็จแล้ว** (`done`) → **ไม่เปลี่ยน** (เก็บเป็นประวัติ)
3. **Recurrence Template ที่ Active** → เปลี่ยนสถานะเป็น `CANCELLED` (หยุดสร้าง reminder ใหม่)
4. **Notification ที่ pending** → เปลี่ยนสถานะเป็น `failed` (ไม่ส่งแจ้งเตือน)
5. **Notification ที่ส่งแล้ว** (`sent`) → **ไม่เปลี่ยน**

### 6. Background Job ใหม่ — Pet Cleanup

| รายละเอียด | ค่า |
|---|---|
| ไฟล์ | `src/jobs/pet-cleanup-scheduler.ts` |
| กำหนดการ | ทุกวันเวลาเที่ยงคืน UTC (07:00 น. เวลาไทย) |
| ทำอะไร | ค้นหา Pet ที่ `status = DELETED` และ `deleted_at` เกิน 30 วัน แล้วลบถาวร (Hard Delete) |
| Cascade | เมื่อ Hard Delete → Reminder และ Notification ที่เกี่ยวข้องจะถูกลบตามโดยอัตโนมัติ (DB Cascade) |
| รูปภาพ | ลบรูป Profile จาก MinIO ก่อน Hard Delete |

### 7. สรุปไฟล์ที่เปลี่ยนแปลง

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `prisma/schema.prisma` | เพิ่ม enum `pet_status`, `deletion_reason`, field ใหม่, `cancelled` ใน `reminder_status` |
| `features/pets/pet-repository.ts` | เพิ่ม query ใหม่ (soft delete, deceased, cleanup) |
| `features/pets/pet-schema.ts` | เพิ่ม validation schema สำหรับ soft delete |
| `features/pets/pet-service.ts` | เพิ่ม logic ลบ/เสียชีวิต/ยกเลิก reminders |
| `features/pets/pet-controller.ts` | เพิ่ม controller ใหม่ 3 ตัว |
| `features/pets/pet-routes.ts` | เพิ่ม route ใหม่ 3 เส้น |
| `jobs/pet-cleanup-scheduler.ts` | **ไฟล์ใหม่** — background job ลบถาวร |
| `index.ts` | ลงทะเบียน pet cleanup scheduler |

---

## Frontend Implementation Guide

### New API Endpoints to Integrate

#### 1. `DELETE /pets/me/:id` — Delete Pet / Mark as Deceased

**Request body:**
```typescript
{
  reason: 'JUST_DELETE' | 'DECEASED';
  deceased_date?: string; // ISO datetime, only for DECEASED
}
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Pet has been deleted. It will be permanently removed after 30 days.",
    "status": "DELETED"
  }
}
// or for DECEASED:
{
  "success": true,
  "data": {
    "message": "Pet has been marked as deceased.",
    "status": "DECEASED"
  }
}
```

**Error responses:**
- `400` — `"Cannot delete your last active pet."` (only for JUST_DELETE)
- `400` — `"Only active pets can be deleted or marked as deceased."`
- `404` — `"Pet not found or does not belong to this user."`

#### 2. `GET /pets/me/past` — Get Deceased Pets

Returns an array of pet profiles with `status: "DECEASED"`.

#### 3. `GET /pets/me/recently-deleted` — Get Recently Deleted Pets

Returns an array of pet profiles with `status: "DELETED"` that were deleted within the last 30 days.

#### 4. `GET /pets/me` — Updated (Active Pets Only by Default)

Now returns only `ACTIVE` pets by default. Optionally pass `?status=ACTIVE|DECEASED|DELETED`.

### Pet Profile Response — New Fields

Every pet profile response now includes these additional fields:

```typescript
{
  id: string;
  pet_name: string;
  // ... existing fields ...
  status: 'ACTIVE' | 'DECEASED' | 'DELETED';      // NEW
  deceased_date: string | null;                     // NEW
  deleted_at: string | null;                        // NEW
  deletion_reason: 'JUST_DELETE' | 'DECEASED' | null; // NEW
}
```

### UI Implementation Plan

#### A. Pet Profile Screen — Delete Button

1. Add a **"ลบ Pet"** button (e.g., in settings/options menu on pet profile)
2. On tap → show **Confirmation Modal** with a dropdown asking the reason:
   - **"แค่ต้องการลบ"** (`JUST_DELETE`)
   - **"น้องเสียชีวิตแล้ว"** (`DECEASED`)
3. If `DECEASED` is selected → optionally show a date picker for `deceased_date`
4. On confirm → call `DELETE /pets/me/:id` with the selected reason
5. Handle the `400` error for last-active-pet case — show an alert like:
   > "ไม่สามารถลบสัตว์เลี้ยงตัวสุดท้ายได้ คุณต้องมีสัตว์เลี้ยงอย่างน้อย 1 ตัว"

**Disable/hide logic:**
- If the user only has 1 active pet, you may want to either:
  - Hide the "แค่ต้องการลบ" option (but still show "น้องเสียชีวิต")
  - Or let the backend return the error and display it

#### B. Pet List Screen — Tabs/Sections

Split the pet list into sections/tabs:

| Tab / Section | Data Source | Shows |
|---|---|---|
| **Active Pets** | `GET /pets/me` (default) | Pets with `status: ACTIVE` |
| **Past Pets** | `GET /pets/me/past` | Pets with `status: DECEASED` |
| **Recently Deleted** | `GET /pets/me/recently-deleted` | Pets deleted within 30 days |

#### C. Past Pets (Deceased) — View Restrictions

For pets with `status: DECEASED`:

| Allowed | Blocked |
|---|---|
| View profile | Edit pet info (`PATCH` returns 400) |
| View medical/health history | Add new vaccine |
| View vaccine history | Add new appointment/reminder |
| View reminders (historical) | Create new reminders |

**Implementation approach:**
- Check `pet.status` in the frontend before showing edit/add buttons
- Hide or disable "Add Vaccine", "Add Reminder", "Edit Profile" buttons when `status !== 'ACTIVE'`

#### D. Recently Deleted — View

For pets with `status: DELETED`:
- Show in a "Recently Deleted" section with a note like: *"จะถูกลบถาวรใน X วัน"*
- Calculate remaining days: `30 - daysSince(deleted_at)`
- Read-only — no actions available
- After 30 days, the pet disappears automatically (handled by backend cleanup job)

#### E. Empty State — No Active Pets

If the user marks their last pet as deceased (0 active pets):
- Show an empty state on the Active Pets tab
- Provide a **"เพิ่มสัตว์เลี้ยงใหม่"** (Add New Pet) CTA button
- Past Pets tab still shows the deceased pet

### TypeScript Types (Suggested)

```typescript
type PetStatus = 'ACTIVE' | 'DECEASED' | 'DELETED';
type DeletionReason = 'JUST_DELETE' | 'DECEASED';

interface PetProfile {
  id: string;
  pet_name: string;
  gender: 'male' | 'female' | 'unknown';
  birth_date: string | null;
  weight: number | null;
  species_id: string;
  species: string | null;
  breed_id: string | null;
  breed: string | null;
  age: string | null;
  profile_image_url: string | null;
  status: PetStatus;
  deceased_date: string | null;
  deleted_at: string | null;
  deletion_reason: DeletionReason | null;
}

interface DeletePetRequest {
  reason: DeletionReason;
  deceased_date?: string;
}

interface DeletePetResponse {
  message: string;
  status: PetStatus;
}
```

### Suggested Hooks

```typescript
// Delete/mark deceased
const useDeletePet = () => useMutation(
  (data: { petId: string; body: DeletePetRequest }) =>
    api.delete(`/pets/me/${data.petId}`, { data: data.body })
);

// Fetch past pets
const usePastPets = () => useQuery(['pets', 'past'], () =>
  api.get('/pets/me/past')
);

// Fetch recently deleted pets
const useRecentlyDeletedPets = () => useQuery(['pets', 'recently-deleted'], () =>
  api.get('/pets/me/recently-deleted')
);
```

### Cache Invalidation

After a successful delete/deceased action, invalidate:
- `['pets']` or `['pets', 'active']` — refresh active pet list
- `['pets', 'past']` — refresh past pets (if reason is DECEASED)
- `['pets', 'recently-deleted']` — refresh deleted list (if reason is JUST_DELETE)
- `['reminders']` — reminders list changed (cancelled)
- `['notifications']` — notifications may have changed
