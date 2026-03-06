# Reminder Attachments — Frontend Implementation Guide

## Overview

Each reminder can have up to **2 attachments**. Supported file types are JPEG, PNG, WebP (images), and PDF. Maximum file size per attachment is **10 MB**.

Attachments are **only returned when fetching a single reminder by ID** (`GET /v1/reminders/:id`), not in the reminder list.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/reminders/:id/attachments/request-url` | Get a presigned PUT URL to upload a file directly to storage |
| `POST` | `/v1/reminders/:id/attachments` | Save the attachment metadata after a successful upload |
| `DELETE` | `/v1/reminders/:id/attachments/:attachmentId` | Delete a specific attachment |

All endpoints require the `Authorization: Bearer <token>` header.

---

## Upload Flow

Uploading an attachment is a **two-step process**, the same pattern used for pet profile images.

**Step 1 — Request a presigned URL**

Call `POST /v1/reminders/:id/attachments/request-url` with a JSON body containing:
- `fileName` — the original file name (e.g. `report.pdf`)
- `fileType` — the MIME type (e.g. `application/pdf`, `image/jpeg`)
- `fileSize` — the file size in bytes as a number

The response returns:
- `uploadUrl` — the presigned PUT URL to upload the file to directly
- `objectKey` — the storage key, keep this for step 2
- `expiresIn` — how many seconds the URL is valid (300 seconds / 5 minutes)

If the reminder already has 2 attachments, this endpoint returns `400 Bad Request`. Show an error message to the user and do not proceed.

**Step 2 — Upload the file directly to the presigned URL**

Make an HTTP `PUT` request directly to the `uploadUrl` from step 1 with the raw file as the request body. Set the `Content-Type` header to the file's MIME type. Do **not** send this through the app's API client — it goes directly to the storage server.

**Step 3 — Save the metadata**

After the PUT upload succeeds, call `POST /v1/reminders/:id/attachments` with a JSON body containing:
- `objectKey` — from step 1 response
- `fileName` — the original file name
- `fileType` — the MIME type
- `fileSize` — the file size in bytes

The response returns the saved attachment object including its `id`, `downloadUrl`, `fileName`, `fileType`, `fileSize`, and `createdAt`.

---

## Displaying Attachments

When the user opens a reminder detail screen, the `GET /v1/reminders/:id` response now includes an `attachments` array. Each item contains:
- `id` — use this for delete operations
- `fileName` — display as the attachment label
- `fileType` — use to decide whether to show an image preview or a PDF icon
- `fileSize` — display in a human-readable format (e.g. `1.2 MB`)
- `downloadUrl` — a presigned URL valid for 1 hour, use this to render the image or open the PDF

Since `downloadUrl` expires after 1 hour, avoid caching the reminder detail response for long periods. Re-fetch when the screen is focused.

---

## Deleting an Attachment

Call `DELETE /v1/reminders/:id/attachments/:attachmentId`. On success, remove the item from the local state immediately (optimistic update or refetch).

The flow from the user's perspective: the attachment list shows each file with a delete button. The user taps delete on the specific file they want to remove, then they can upload a new one. There is no "replace" operation — it is always delete then upload.

---

## File Picker Considerations

Use `expo-document-picker` for PDF files and `expo-image-picker` for images, or use `expo-document-picker` alone with `type` set to accept both images and PDFs.

Before calling the request-url endpoint, validate on the client side:
- File size does not exceed 10 MB
- File type is one of the four accepted types

This avoids an unnecessary network round-trip for obviously invalid files.

When picking images on Android, the device may return a `.webp` file. This is supported — treat it the same as JPEG or PNG.

---

## Error Handling

| Scenario | Expected Response | Suggested UI Behavior |
|----------|------------------|-----------------------|
| Reminder already has 2 attachments | `400 Bad Request` from request-url or save | Show a message: "This reminder already has the maximum of 2 attachments. Delete one to add a new file." |
| Reminder not found | `404 Not Found` | Show generic error, navigate back |
| Reminder belongs to another user | `403 Forbidden` | Show generic error |
| File upload to storage fails (network) | Error on the PUT request itself | Show retry option, the presigned URL is valid for 5 minutes |
| Attachment not found on delete | `404 Not Found` | Remove item from local list and show a notice |

---

## State Management Notes

- After a successful upload (step 3), append the returned attachment object to the local reminder detail state without a full refetch.
- After a successful delete, remove the item from local state by `id` without a full refetch.
- Re-fetch the full reminder detail (including fresh `downloadUrl` values) whenever the screen comes back into focus, since presigned URLs expire.
