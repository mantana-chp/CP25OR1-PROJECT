# Multi-Pet Reminder: Shared Attachment Strategy

## Problem

When creating a reminder for multiple pets, the backend creates **one `reminders` row per pet**.  
Attachments are stored in MinIO as an object and registered in the `reminder_attachments` table with a `reminder_id` foreign key.

The naïve approach — upload the file once per reminder — wastes storage and bandwidth.  
The goal is to **upload the file to MinIO exactly once** but register it against every reminder that is created.

---

## Core Insight: Object Key vs. Attachment Record

MinIO storage and the `reminder_attachments` DB table are **decoupled**:

| Layer                  | What it holds                                                                     |
| ---------------------- | --------------------------------------------------------------------------------- |
| MinIO                  | The actual file bytes, identified by `objectKey`                                  |
| `reminder_attachments` | Metadata rows: `reminder_id`, `object_key`, `file_name`, `file_type`, `file_size` |

Multiple DB rows **can safely share the same `objectKey`** — they all point to one file in MinIO.  
Deletion must be guarded: only remove the MinIO object when **no other attachment row references the same `objectKey`**.

---

## Proposed Flow

### Step 1 — User Adds Attachment (UI)

Same as today. The file is stored as a `pendingAttachment` in Formik state:

```ts
{
  id: 'temp-xxxx',      // local temp ID
  fileName: 'report.pdf',
  fileSize: 204800,
  fileType: 'application/pdf',
  objectKey: '',        // empty — not uploaded yet
  uri: 'file:///...',   // local device URI
  isPending: true
}
```

The `AttachmentManager` is hidden when `selectedPetIds.length > 1` is false —  
**re-enable it** for multi-pet mode by removing the condition (a single attachment applies to all pets).

---

### Step 2 — Submit Form

```
User taps "เพิ่ม"
   │
   ├─ POST /v1/reminders  { petId: [id1, id2, id3], ...fields }
   │       Backend creates 3 reminder rows, returns:
   │       [ { id: "r1", petId: "id1" },
   │         { id: "r2", petId: "id2" },
   │         { id: "r3", petId: "id3" } ]
   │
   └─ if pendingAttachments.length > 0
         └─ uploadSharedAttachments(reminderIds, pendingAttachments)
```

---

### Step 3 — `uploadSharedAttachments` Logic

```
for each pendingAttachment:
  1. Request presigned PUT URL using the FIRST reminder's ID as entityId
       POST /v1/reminders/:r1/attachments/request-url
       → { uploadUrl, objectKey }

  2. Upload file bytes to MinIO  (ONE HTTP PUT to MinIO)

  3. Register the attachment for EVERY created reminder with the SAME objectKey
       for each reminderId in [r1, r2, r3]:
         POST /v1/reminders/:reminderId/attachments
              { objectKey, fileName, fileType, fileSize }
       → Creates 3 rows in reminder_attachments, all pointing to same MinIO object
```

No additional MinIO uploads. Just 3 metadata DB writes after one upload.

---

### Step 4 — Deletion Guard (Backend Change Required)

Currently `deleteAttachment` immediately calls `minioClient.deleteObject(objectKey)`.  
This must be changed to check reference count first:

```ts
// reminder-attachment-service.ts — updated deleteAttachment
export async function deleteAttachment(reminderId, attachmentId, userId) {
  await assertOwner(reminderId, userId)

  const attachment = await attachmentRepository.findById(attachmentId)
  if (!attachment) throw new NotFoundError('Attachment not found')

  // Delete DB record first
  await attachmentRepository.deleteById(attachmentId)

  // Only delete from MinIO if no other reminder still references this objectKey
  const remainingRefs = await attachmentRepository.countByObjectKey(
    attachment.object_key
  )
  if (remainingRefs === 0) {
    await minioClient.deleteObject(attachment.object_key).catch(() => {})
  }
}
```

A new repository method is needed:

```ts
// reminder-attachment-repository.ts
export const countByObjectKey = (objectKey: string): Promise<number> =>
  prisma.reminder_attachments.count({ where: { object_key: objectKey } })
```

---

## Conditions & Constraints

| Condition                                       | Behaviour                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| Single pet, create mode                         | Existing flow unchanged — upload per reminder                                        |
| Multiple pets, create mode                      | Upload file once → register for all created reminder IDs                             |
| Multi-pet + multiple pending attachments        | Each file uploaded once, each registered for all reminders                           |
| Edit mode (always single reminder)              | Existing flow unchanged                                                              |
| User deletes attachment on one reminder         | Only removes that reminder's DB row; MinIO object stays if others still reference it |
| All reminders referencing an object are deleted | MinIO object is finally removed (handled in `deleteAttachmentsForReminders`)         |
| Max attachments (2 per reminder)                | Each individual reminder still enforced at ≤ 2                                       |

---

## Changes Required

### Backend

| File                                | Change                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `reminder-attachment-repository.ts` | Add `countByObjectKey(objectKey)`                                                                                                      |
| `reminder-attachment-service.ts`    | Update `deleteAttachment` to check `countByObjectKey` before deleting from MinIO                                                       |
| `reminder-attachment-service.ts`    | Add `saveAttachmentByObjectKey(reminderId, userId, payload)` — skips presigned URL, just creates DB row for an already-uploaded object |
| `reminder-attachment-schema.ts`     | Add schema for the new "register existing object" endpoint                                                                             |
| `reminder-routes.ts`                | Add `POST /v1/reminders/:id/attachments/register` route                                                                                |
| `deleteAttachmentsForReminders`     | Apply same ref-count guard when bulk-deleting                                                                                          |

### Frontend

| File                        | Change                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `add_reminder_page.tsx`     | Remove `selectedPetIds.length <= 1` guard around `<AttachmentManager>`                                                           |
| `add_reminder_page.tsx`     | After multi-pet create, call `uploadSharedAttachments(createdReminderIds, pendingAttachments)` instead of single-reminder upload |
| `useReminderAttachments.ts` | Add `uploadSharedAttachments(reminderIds, pending[])` function                                                                   |
| `reminder_service.ts`       | Add `registerAttachment(reminderId, {objectKey, fileName, fileType, fileSize})` calling the new `/register` endpoint             |

---

## Sequence Diagram

```
User          Frontend                 Backend                MinIO
 │                │                       │                     │
 │  tap เพิ่ม     │                       │                     │
 │───────────────>│                       │                     │
 │                │  POST /v1/reminders   │                     │
 │                │  petId:[A,B,C]        │                     │
 │                │──────────────────────>│                     │
 │                │                       │ INSERT reminders x3 │
 │                │  [{id:r1},{id:r2},{id:r3}]                  │
 │                │<──────────────────────│                     │
 │                │                       │                     │
 │                │  POST .../r1/attachments/request-url        │
 │                │──────────────────────>│                     │
 │                │  {uploadUrl, objectKey}                     │
 │                │<──────────────────────│                     │
 │                │                       │                     │
 │                │  PUT {file bytes}                           │
 │                │────────────────────────────────────────────>│
 │                │  200 OK                                     │
 │                │<────────────────────────────────────────────│
 │                │                       │                     │
 │                │  POST .../r1/attachments/register {objectKey}
 │                │──────────────────────>│                     │
 │                │  POST .../r2/attachments/register {objectKey}
 │                │──────────────────────>│                     │
 │                │  POST .../r3/attachments/register {objectKey}
 │                │──────────────────────>│                     │
 │                │  3 × 201 Created      │                     │
 │                │<──────────────────────│                     │
 │                │                       │                     │
 │  navigate /(tabs)                      │                     │
```

---

## Why Not Re-upload Per Reminder?

- **Bandwidth**: If 5 pets are selected with 2 attachments each → 10 identical file uploads.
- **Storage**: 10 identical objects in MinIO instead of 1-2.
- **Presigned URL expiry**: Each upload request generates a short-lived (5 min) PUT URL — chaining uploads sequentially for many pets risks timeout for large files on slow connections.
- **Consistency**: If any upload fails mid-loop, some reminders have attachments and others don't (partial state is hard to recover).

The "upload once, register many" approach avoids all of these.
