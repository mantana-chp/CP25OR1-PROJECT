# Shared Attachment Backend Implementation Plan

## 1. Objective

Implement a backend-only enhancement for reminder attachments in multi-pet and batch-create scenarios so that:

- A file is uploaded to storage exactly once.
- The same storage object can be referenced by multiple reminder attachment metadata rows.
- Deletion remains safe (object is removed from storage only when no attachment row references it).

This plan intentionally focuses on backend first and does not include frontend implementation tasks beyond integration notes.

---

## 2. Problem Statement

Current reminder attachment behavior is optimized for one reminder at a time:

1. Client requests a presigned URL.
2. Client uploads bytes to MinIO.
3. Client saves one metadata row (`reminder_attachments`) for one reminder.
4. Delete removes both DB row and MinIO object.

In batch create (many reminders), if the same file is used for each reminder, the naive flow causes repeated uploads and duplicated objects.

### Why this is a problem

- Wasted bandwidth and storage.
- Increased latency and failure probability.
- Harder recovery for partial failures.
- Unnecessary MinIO object churn.

---

## 3. Target Design

## 3.1 Core model

Keep the existing table model:

- One `reminder_attachments` row per reminder attachment relation.
- Multiple rows may share the same `object_key`.

Do not create a new shared file table in this phase.

## 3.2 Lifecycle rules

- Upload: once per file.
- Register: many metadata rows can reference same `object_key`.
- Delete one attachment row: only remove MinIO object if no remaining references.
- Delete reminder(s): apply same reference check before MinIO deletion.

## 3.3 Ownership and authorization

- Existing reminder access and mutation rules remain unchanged.
- Register endpoint should only allow object keys in the caller-owned reminder attachment namespace.
- Register endpoint should verify the object exists in MinIO.

---

## 4. Scope

## In scope (backend)

- New endpoint to register existing object key for a reminder.
- Safe deletion logic with object-key reference counting.
- Bulk deletion safety in reminder deletion flows.
- Validation updates for register payload.
- Tests for shared-reference scenarios.

## Out of scope

- Frontend UI/UX changes.
- Frontend orchestration for upload-once/register-many.
- Cross-user shared attachments.
- File dedup by hash/content.

---

## 5. Current State Summary

Current backend behavior to update:

- `deleteAttachment` deletes MinIO object immediately.
- `deleteAttachmentsForReminders` deletes each object for targeted reminders without checking external references.
- No dedicated register endpoint for reusing an already-uploaded `object_key`.

Frontend status for this enhancement: not implemented yet.

---

## 6. Backend API Design

## 6.1 Existing APIs kept

- `POST /v1/reminders/:id/attachments/request-url`
- `POST /v1/reminders/:id/attachments`
- `DELETE /v1/reminders/:id/attachments/:attachmentId`

## 6.2 New API

- `POST /v1/reminders/:id/attachments/register`

### Request body

```json
{
  "objectKey": "attachments/<userId>/<sourceReminderId>/<generated-file-name>",
  "fileName": "report.pdf",
  "fileType": "application/pdf",
  "fileSize": 123456
}
```

### Response

- `201 Created` with attachment DTO (same format as existing save attachment response).

### Validation

- `objectKey` non-empty string.
- `fileType` in allowed set (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`).
- `fileSize` positive int and <= 10 MB.
- `objectKey` must start with caller namespace prefix (`attachments/<userId>/`).
- MinIO object must exist.
- Reminder attachment count must remain within per-reminder max.

---

## 7. Data Layer Plan

### Schema Migration (Required)

Add index on `object_key` to support efficient reference counting:

```sql
CREATE INDEX idx_reminder_attachments_object_key ON reminder_attachments(object_key);
```

Without this index, `countByObjectKey` queries will be slow as attachment volume grows.

### Repository Helpers

1. `countByObjectKey(objectKey: string): Promise<number>`
2. `countByObjectKeyExcludingReminderIds(objectKey: string, reminderIds: string[]): Promise<number>`

Purpose:

- Decide when MinIO object can be safely deleted.
- Avoid removing shared object during single or batch reminder deletion.

---

## 8. Service Layer Plan

## 8.0 Prerequisite Fix: Object Key Validation

The current `assertReminderAttachmentObjectKey()` enforces `attachments/{userId}/{reminderId}/` prefix, which prevents cross-reminder sharing. For the register endpoint, we need a relaxed validation that only checks `attachments/{userId}/` namespace.

**Action**: Add `assertUserNamespaceOnly(objectKey, userId)` helper for register flow.

## 8.1 New service method

Add `saveAttachmentByObjectKey(reminderId, userId, payload)`:

1. Authorize mutation access for reminder.
2. **Validate user namespace for `objectKey` (NOT reminder-specific prefix).**
3. Confirm object exists in MinIO.
4. Enforce max attachments for target reminder.
5. Create `reminder_attachments` row with existing `object_key`.
6. Return attachment DTO.

## 8.2 Update single-delete flow

In `deleteAttachment(reminderId, attachmentId, userId)`:

1. Authorize + verify attachment belongs to reminder.
2. **Delete DB row first** (changed order for safety).
3. Count remaining rows by `object_key`.
4. Delete MinIO object only when remaining refs = 0.

**CRITICAL**: Previous order (MinIO delete first) risks data loss if another reminder references the same object.

## 8.3 Update bulk-delete flow

In `deleteAttachmentsForReminders(reminderIds)`:

1. Load rows for target reminders.
2. Build unique set of `object_key` values.
3. For each key, count references outside the targeted reminder IDs.
4. Delete MinIO object only if external refs = 0.

Keep DB cascade behavior from reminder deletion unchanged.

---

## 9. Controller and Routing Plan

## Controller updates

Add `registerAttachment` handler:

- Parse request via new schema.
- Call `saveAttachmentByObjectKey`.
- Return `201` via standard success envelope.

## Route updates

Add route under reminder attachment section:

- `POST /:id/attachments/register` -> `registerAttachment`

---

## 10. Error Contract

Map errors to consistent API responses:

- `400`: invalid payload, bad object key namespace, missing object in storage, max attachments exceeded.
- `403`: access denied for reminder mutation.
- `404`: reminder or attachment not found.
- `500`: unexpected storage/database errors.

Best effort logging remains for MinIO deletion failures.

---

## 11. Concurrency and Consistency

Potential race conditions and mitigations:

1. Two delete operations on same object key concurrently.
- Mitigation: deletion is idempotent; count check may race but object delete should tolerate missing object.

2. Register while another process deletes last reference.
- Mitigation: check MinIO object existence at register time; if missing return `400` and require re-upload.

3. Attachment count limit race.
- Mitigation: keep current service-level check; optional future hardening with transaction or DB constraint strategy.

---

## 12. Security Considerations

- Do not allow arbitrary object key registration from foreign user namespaces.
- Keep reminder-level mutation authorization unchanged.
- Validate MIME type and size from metadata as currently done.
- Never expose internal storage credentials.

---

## 13. Testing Plan

## 13.1 Unit tests

Repository:

- count by key.
- count excluding reminder ids.

Service:

- register success path.
- register fails when object missing.
- register fails for invalid namespace.
- deleteAttachment keeps object when refs remain.
- deleteAttachment removes object at last ref.
- bulk delete removes only fully unreferenced objects.

## 13.2 Integration tests

1. Create two reminders.
2. Upload once and save to first reminder.
3. Register same key to second reminder.
4. Delete first attachment -> object still exists.
5. Delete second attachment -> object removed.

Batch deletion case:

- Shared object across targeted and non-targeted reminders should not be deleted.

## 13.3 Regression tests

- Existing single-reminder upload/save/delete still works.
- Existing attachment limit still enforced.
- Caregiver authorization rules unaffected.

---

## 14. Rollout Strategy

## Phase 1 (backend release)

- Ship backend endpoint + reference-safe deletion.
- Keep frontend behavior unchanged.

## Phase 2 (frontend integration)

- Frontend calls upload once + register for each created reminder.

## Phase 3 (observability)

- Add metrics/dashboard:
  - shared registration count
  - MinIO delete attempts/skips due to refs
  - attachment save/register failure rates

---

## 15. Implementation Checklist

## Backend changes

- [ ] Add repository count helpers by `object_key`.
- [ ] Add register payload schema.
- [ ] Add controller method `registerAttachment`.
- [ ] Add route `POST /:id/attachments/register`.
- [ ] Add service method `saveAttachmentByObjectKey`.
- [ ] Update `deleteAttachment` to reference-safe object deletion.
- [ ] Update `deleteAttachmentsForReminders` to reference-safe object deletion.
- [ ] Add/update OpenAPI docs.
- [ ] Add unit/integration/regression tests.

## Verification gates

- [ ] Typecheck/build passes.
- [ ] Test suite for reminder attachments passes.
- [ ] Manual API smoke test in local environment.

---

## 16. Decisions (Answered)

1. **Should register endpoint require `sourceReminderId`?**
   - **Decision**: No for phase 1. User namespace + MinIO existence check is sufficient. Can add audit logging later if needed.

2. **Should repeated register of same `objectKey` on same reminder be prevented?**
   - **Decision**: Yes, prevent duplicates. Query for existing attachment with same `(reminder_id, object_key)` and return `409 Conflict` with existing attachment DTO.

3. **Background orphan-cleanup job for legacy objects?**
   - **Decision**: No for phase 1. Out of scope. If needed later, implement as separate cron job that scans MinIO for unreferenced objects.

---

## 17. Implementation Recommendation (Time-Constrained Assessment)

### Should You Implement This?

**Recommendation: SKIP for now if time is critical.**

**Why:**
- This requires touching 4+ files with interdependent changes (validation, delete order, repository, controller, routes, tests)
- Current system works for single-reminder flows; shared attachments are an optimization, not a blocker
- Frontend doesn't exist yet for batch-create-with-attachments, so backend changes have no immediate consumer
- Risk of introducing bugs in attachment deletion logic close to deadline

**If you have 2-3 days to spare:**
- Implementation is ~4-6 hours of focused work + testing
- The plan is solid after the fixes above
- Can be done incrementally (backend first, frontend later)

**If time is very tight:**
- Keep current single-reminder-per-upload behavior for batch create
- Each reminder gets its own copy of the file (wasteful but works)
- Revisit shared attachments post-launch as performance optimization

### Estimated Effort

| Task | Time |
|------|------|
| Schema migration (index) | 10 min |
| Repository helpers + tests | 1-2 hrs |
| Service method + validation fix | 2-3 hrs |
| Controller + route + schema | 1 hr |
| Integration tests | 2-3 hrs |
| Manual testing | 1 hr |
| **Total** | **~7-10 hrs** |

### Risk Mitigation if Proceeding

1. **Keep existing tests passing** - regression tests in checklist are mandatory
2. **Test delete flows extensively** - this is where the bugs will hide
3. **Consider feature flag** - only enable register endpoint when frontend ready

## 18. Final Notes

- Backend is not fully implemented yet for shared-object attachment enhancement.
- Frontend is also not implemented for upload-once/register-many orchestration.
- This plan intentionally sequences backend first to make frontend integration safe.
- **Last updated**: Incorporated critical fixes for object key validation, delete order, and database index.
