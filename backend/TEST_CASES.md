# Backend Feature Test Cases

This document outlines test cases for key features in the PetCare backend, covering both normal operations and edge cases to demonstrate reliability and robustness.

---

## 1. Pet Profile Picture

### Normal Cases

#### TC-1.1: Upload Valid Profile Picture
- **Action:** Owner uploads a valid image (JPG/PNG) for their pet
- **Expected Result:**
  - Image successfully stored in MinIO
  - `profile_image_key` saved in database
  - Pet profile returns presigned download URL (1-hour expiry)
  - Image accessible via download URL

#### TC-1.2: Update Existing Profile Picture
- **Action:** Owner uploads new image to replace existing pet profile picture
- **Expected Result:**
  - Old image deleted from MinIO
  - New image stored with new key
  - Pet profile returns new presigned URL
  - Old URL becomes invalid

#### TC-1.3: Delete Profile Picture
- **Action:** Owner deletes pet's profile picture
- **Expected Result:**
  - Image removed from MinIO
  - `profile_image_key` set to null in database
  - Pet profile returns `profile_image_url: null`

### Edge Cases

#### TC-1.4: Download Non-Existent Image
- **Action:** Pet has `profile_image_key` but file missing in MinIO
- **Expected Result:**
  - API gracefully returns `profile_image_url: null`
  - No 500 error thrown
  - Other pet data still returned correctly

#### TC-1.5: Expired Presigned URL
- **Action:** Attempt to access presigned URL after 1 hour
- **Expected Result:**
  - MinIO returns 403 Forbidden
  - Client must re-fetch pet profile to get fresh URL

#### TC-1.6: Caregiver Access to Pet Image
- **Action:** Caregiver views shared pet with profile picture
- **Expected Result:**
  - Caregiver receives valid presigned URL
  - Can download and view image same as owner

---

## 2. AI Pet Name Context Detection

### Normal Cases

#### TC-2.1: Generate Name from Clear Context
- **Action:** Send clear context: "golden retriever, playful, loves swimming"
- **Expected Result:**
  - AI returns 3-5 relevant Thai name suggestions
  - Names match personality and appearance traits
  - Response includes brief reasoning for each name

#### TC-2.2: Generate Name from Minimal Context
- **Action:** Send minimal context: "cat, white"
- **Expected Result:**
  - AI returns appropriate names despite limited info
  - Names suitable for white cats
  - Generic but culturally appropriate suggestions

### Edge Cases

#### TC-2.3: Empty Context String
- **Action:** Send empty or whitespace-only context
- **Expected Result:**
  - Returns 400 Bad Request
  - Error message: "Context is required"

#### TC-2.4: Very Long Context (>1000 characters)
- **Action:** Send extremely detailed context exceeding typical length
- **Expected Result:**
  - AI processes entire context or truncates gracefully
  - Still returns valid name suggestions
  - No timeout or error

#### TC-2.5: Special Characters in Context
- **Action:** Send context with emojis, symbols: "🐕 very 💪 strong!!!"
- **Expected Result:**
  - AI parses meaningful content
  - Returns valid Thai names
  - Ignores or handles special characters gracefully

#### TC-2.6: Mixed Language Context
- **Action:** Send context mixing Thai and English: "สุนัข friendly and ขี้เล่น"
- **Expected Result:**
  - AI understands both languages
  - Returns appropriate Thai names
  - Context from both languages considered

---

## 3. Vaccine Series Validation & Custom Doses

### Normal Cases

#### TC-3.1: Create Standard Vaccine Series
- **Action:** Create vaccine series for 2-month-old puppy (DHPP core vaccine)
- **Expected Result:**
  - Primary series: 3 doses at 8, 12, 16 weeks
  - Booster: First at 1 year, then every 3 years
  - All reminders created with correct intervals
  - Vaccine logic validated (UNTIL_AGE or FIXED_COUNT)

#### TC-3.2: Create Adult Dog Primary Series
- **Action:** Create core vaccine for 2-year-old dog (no puppy history)
- **Expected Result:**
  - Adult primary series: 2 doses 2-4 weeks apart
  - Booster at 1 year after completion
  - Age validation passes (min_age_days)

#### TC-3.3: Add Custom Dose to Series
- **Action:** Add custom vaccine dose outside standard schedule
- **Expected Result:**
  - Custom dose created successfully
  - Does not interfere with existing series
  - Marked as custom/manual entry

### Edge Cases

#### TC-3.4: Pet Too Young for Vaccine
- **Action:** Try to create vaccine for 4-week-old puppy (min_age_days = 42)
- **Expected Result:**
  - Returns 400 Bad Request
  - Error: "Pet is too young for this vaccine"
  - Suggests minimum age requirement

#### TC-3.5: Overlapping Vaccine Doses
- **Action:** Try to create dose that conflicts with existing dose date
- **Expected Result:**
  - System warns about proximity to existing dose
  - Allows creation but flags for review
  - Or suggests rescheduling

#### TC-3.6: Complete Non-Core Vaccine for Indoor Cat
- **Action:** Create optional non-core vaccine series
- **Expected Result:**
  - Series created with appropriate intervals
  - Labeled as non-core (owner discretion)
  - Can be cancelled without affecting core vaccines

#### TC-3.7: Retroactive Vaccine Record
- **Action:** Add historical vaccine dose from 6 months ago
- **Expected Result:**
  - Dose added with past date
  - Affects next booster calculation
  - Series timeline adjusted accordingly

---

## 4. Reminder Attachments

### Normal Cases

#### TC-4.1: Add Single Attachment to Reminder
- **Action:** Upload 1 PDF document to a reminder
- **Expected Result:**
  - File stored in MinIO under `attachments/{userId}/{reminderId}/`
  - Attachment metadata saved to `reminder_attachments` table
  - GET reminder returns attachment with presigned download URL

#### TC-4.2: Add Two Attachments (Maximum)
- **Action:** Upload 2 files (PDF + image) to reminder
- **Expected Result:**
  - Both files stored successfully
  - GET reminder returns array of 2 attachments
  - Each has unique ID and download URL

#### TC-4.3: Delete Attachment
- **Action:** Owner deletes one attachment from reminder
- **Expected Result:**
  - File removed from MinIO
  - Database record deleted
  - Reminder still exists with remaining attachments

### Edge Cases

#### TC-4.4: Exceed Maximum Attachments (2)
- **Action:** Try to upload 3rd attachment to reminder
- **Expected Result:**
  - Returns 400 Bad Request
  - Error: "A reminder can have at most 2 attachments"
  - Existing 2 attachments unchanged

#### TC-4.5: Upload Without Confirmation
- **Action:** Request presigned URL but never upload file, then try to save metadata
- **Expected Result:**
  - Returns 400 Bad Request
  - Error: "Uploaded file not found in storage"
  - No orphaned database record created

#### TC-4.6: Delete Reminder with Attachments
- **Action:** Delete reminder that has attachments
- **Expected Result:**
  - Reminder deleted
  - All attachment files deleted from MinIO (cascade)
  - All attachment records deleted from database (cascade)
  - No orphaned files left in storage

#### TC-4.7: Caregiver Attachment Permissions
- **Action:** Caregiver tries to delete attachment on reminder they didn't create
- **Expected Result:**
  - Returns 403 Forbidden
  - Error: "Caregivers can only modify attachments on reminders they created"
  - Owner can delete any attachment regardless of creator

#### TC-4.8: Attachment on Deleted/Expired Reminder
- **Action:** Try to access attachment for soft-deleted reminder
- **Expected Result:**
  - Returns 404 Not Found
  - Attachment not accessible even if file still in MinIO

---

## 5. AI Symptom Severity Context Request (Interactive Chat UI)

### Normal Cases

#### TC-5.1: Assess Mild Symptoms
- **Action:** Submit symptoms: "pet seems tired, sleeping more than usual"
- **Expected Result:**
  - AI assesses severity: "Mild - Monitor for 24-48 hours"
  - Provides care suggestions (rest, hydration)
  - No urgent action recommended

#### TC-5.2: Assess Moderate Symptoms
- **Action:** Submit: "vomiting twice today, not eating dinner"
- **Expected Result:**
  - AI assesses severity: "Moderate - Contact vet if persists"
  - Suggests monitoring timeline
  - Recommends vet consultation if worsens

#### TC-5.3: Detect Emergency Symptoms
- **Action:** Submit: "difficulty breathing, blue gums, collapsed"
- **Expected Result:**
  - AI assesses severity: "EMERGENCY - Seek immediate veterinary care"
  - Bold/highlighted emergency warning
  - Provides nearest emergency clinic info (if available)

### Edge Cases

#### TC-5.4: Vague Symptom Description
- **Action:** Submit: "something wrong with my dog"
- **Expected Result:**
  - AI requests more specific information
  - Asks clarifying questions (appetite? behavior? physical signs?)
  - Provides symptom checklist

#### TC-5.5: Multiple Unrelated Symptoms
- **Action:** Submit: "limping on left leg, also has bad breath"
- **Expected Result:**
  - AI addresses each symptom separately
  - Prioritizes more urgent issue (limping)
  - Provides assessment for both

#### TC-5.6: Non-Medical Query
- **Action:** Submit: "how to train my dog to sit"
- **Expected Result:**
  - AI politely redirects to symptom-related questions
  - Or provides basic answer but reminds user this is health assessment tool

#### TC-5.7: Very Long Symptom Description (>500 words)
- **Action:** Submit extremely detailed symptom history
- **Expected Result:**
  - AI processes entire context or summarizes key points
  - Extracts critical symptoms
  - Provides assessment despite length

---

## 6. Multi-Pet Reminder Creation

### Normal Cases

#### TC-6.1: Create Reminder for 2 Own Pets
- **Action:** Owner creates deworming reminder for 2 of their pets
- **Expected Result:**
  - 2 separate reminders created (same name, date, description)
  - Each linked to different pet_id
  - Both appear in owner's reminder list

#### TC-6.2: Create Reminder for Mixed Ownership
- **Action:** Owner creates reminder for 1 own pet + 1 shared pet (where they're caregiver)
- **Expected Result:**
  - Both reminders created
  - `created_by_user_id` = requesting user for both
  - `user_id` = respective pet owners
  - Permission validation passes

### Edge Cases

#### TC-6.3: Include Invalid Pet ID
- **Action:** Try to create reminder for [validPetId1, "invalid-uuid"]
- **Expected Result:**
  - Returns 400 Bad Request
  - Error: "Invalid pet ID format" or "Pet not found"
  - No reminders created (atomic operation)

#### TC-6.4: Include Pet Without Access
- **Action:** Try to create reminder for pet user doesn't own or have caregiver access to
- **Expected Result:**
  - Returns 403 Forbidden
  - Error: "Access denied to one or more pets"
  - No reminders created

#### TC-6.5: Include Deceased Pet
- **Action:** Try to create future reminder for deceased pet
- **Expected Result:**
  - Returns 400 Bad Request
  - Error: "Cannot create reminder for deceased pet"
  - Or allows with warning if retroactive record

#### TC-6.6: Include Deleted Pet
- **Action:** Try to create reminder for soft-deleted pet
- **Expected Result:**
  - Returns 400 Bad Request
  - Error: "Pet not found or deleted"
  - No reminder created

---

## 7. Add Multiple Reminders at Once & Retroactive Reminders

### Normal Cases

#### TC-7.1: Bulk Create Future Reminders
- **Action:** Create 5 medication reminders for next week (Mon-Fri)
- **Expected Result:**
  - All 5 reminders created successfully
  - Dates: sequential weekdays
  - All have status: "to_do"
  - All linked to same pet

#### TC-7.2: Create Retroactive Health Records
- **Action:** Record past 3 vaccination doses (2 months, 1 month, 2 weeks ago)
- **Expected Result:**
  - All 3 reminders created with is_health: true
  - Status automatically set to "done"
  - `status_done_at` = `reminder_date`
  - Appear in health records list

#### TC-7.3: Mix Past and Future Reminders
- **Action:** Create 7 grooming reminders (4 past, 3 future)
- **Expected Result:**
  - Past reminders: status = "done", done_at set
  - Future reminders: status = "to_do"
  - All created successfully

### Edge Cases

#### TC-7.4: Exceed Reasonable Bulk Limit (e.g., 50+ reminders)
- **Action:** Try to create 100 reminders at once
- **Expected Result:**
  - Returns 400 Bad Request
  - Error: "Maximum 50 reminders per bulk operation"
  - Or system processes in batches automatically

#### TC-7.5: Duplicate Dates in Bulk
- **Action:** Create 3 reminders with same date and pet
- **Expected Result:**
  - System allows (different reminders can share date)
  - All 3 created successfully
  - Each has unique ID

#### TC-7.6: Very Old Retroactive Date (5 years ago)
- **Action:** Create health record dated 2020
- **Expected Result:**
  - Reminder created successfully
  - No date validation error
  - Marked as done with historical date

#### TC-7.7: Future Date Beyond Reasonable Range (10 years)
- **Action:** Create reminder for year 2035
- **Expected Result:**
  - System allows (owner's choice)
  - Or warns but permits creation
  - Reminder remains in "to_do" status

---

## 8. Add Multiple Pets (Litter/Bulk Creation)

### Normal Cases

#### TC-8.1: Create Kitten Litter (5 pets)
- **Action:** Create 5 kittens with same birth_date, species, breed
- **Expected Result:**
  - All 5 pets created successfully
  - Each has unique ID
  - All share same birth_date and species
  - Names differentiated (e.g., Kitten A, B, C...)

#### TC-8.2: Create Pets with Partial Different Info
- **Action:** Create 3 dogs (same breed/birthdate, different names/genders)
- **Expected Result:**
  - All 3 created with shared attributes
  - Individual attributes (name, gender) properly set
  - All owned by requesting user

### Edge Cases

#### TC-8.3: Empty Pet Array
- **Action:** Submit bulk create with empty array []
- **Expected Result:**
  - Returns 400 Bad Request
  - Error: "At least one pet required"

#### TC-8.4: Exceed Maximum Bulk Limit (e.g., 20 pets)
- **Action:** Try to create 25 pets at once
- **Expected Result:**
  - Returns 400 Bad Request
  - Error: "Maximum 20 pets per bulk operation"

#### TC-8.5: Duplicate Pet Names in Batch
- **Action:** Create 3 pets all named "Fluffy"
- **Expected Result:**
  - System allows (names don't need to be unique)
  - All 3 created successfully
  - Owner must differentiate themselves

#### TC-8.6: Mixed Valid/Invalid Data
- **Action:** Create 4 pets, 3rd has invalid species_id
- **Expected Result:**
  - Atomic operation: all fail if one fails
  - Returns 400 with specific error about 3rd pet
  - No pets created
  - Or: Partial success with error report for failed pets

#### TC-8.7: Very Long Pet Name (>100 chars)
- **Action:** Include pet with excessively long name in batch
- **Expected Result:**
  - Returns 400 Bad Request
  - Zod validation error: "Name too long"
  - No pets created

---

## 9. Pet Sharing

### Normal Cases

#### TC-9.1: Generate Share Invite for Single Pet
- **Action:** Owner generates QR invite for 1 pet with alias "My Dog Sitter"
- **Expected Result:**
  - Invite created with UUID token
  - Expires in 24 hours
  - Status: PENDING
  - Returns: inviteId, expiresAt, alias, petIds

#### TC-9.2: Preview Invite Before Claiming
- **Action:** Caregiver scans QR, GET /preview/:token
- **Expected Result:**
  - Returns pet list with names and photos
  - Shows which pets caregiver will get access to (toBeAdded)
  - Shows pets already shared (alreadyShared)
  - Shows expiry time

#### TC-9.3: Claim Fresh Invite (All New Access)
- **Action:** Caregiver claims invite for 3 pets they don't have access to
- **Expected Result:**
  - 3 pet_user_access records created
  - owner_caregiver_contacts record created
  - Invite status: ACCEPTED
  - Returns: added=[3 pets], alreadyShared=[]

#### TC-9.4: Owner Revokes Caregiver Access
- **Action:** Owner revokes access for specific caregiver
- **Expected Result:**
  - pet_user_access.revoked_at = now
  - Caregiver loses access immediately
  - Caregiver's reminders for that pet become inaccessible
  - Pet no longer in caregiver's pet list

### Edge Cases

#### TC-9.5: Claim Expired Invite (>24 hours old)
- **Action:** Try to claim invite after expiry
- **Expected Result:**
  - Returns 400 Bad Request
  - Error: "Code expired or already used"
  - No access granted

#### TC-9.6: Owner Scans Own Invite
- **Action:** Owner accidentally scans their own QR code
- **Expected Result:**
  - Preview returns 400: "You are already the owner of one of these pets"
  - Claim attempt also fails with same error
  - No weird self-access created

#### TC-9.7: Claim Partial - Some Pets Already Shared
- **Action:** Claim invite for [Pet A, Pet B, Pet C] but caregiver already has access to Pet B
- **Expected Result:**
  - Returns 200 Success
  - added=[Pet A, Pet C]
  - alreadyShared=[Pet B]
  - Invite still marked as ACCEPTED

#### TC-9.8: Claim All Already Shared
- **Action:** Claim invite for 2 pets, caregiver already has access to both
- **Expected Result:**
  - Returns 200 Success (idempotent)
  - added=[]
  - alreadyShared=[Pet 1, Pet 2]
  - Invite marked as ACCEPTED

#### TC-9.9: Pet Becomes Inactive After Invite Created
- **Action:** Owner creates invite, then marks pet as deceased before caregiver claims
- **Expected Result:**
  - Claim processes active pets only
  - Inactive pet silently skipped
  - Returns: added=[active pets], alreadyShared=[]
  - No error about inactive pet

#### TC-9.10: Re-Invite Previously Revoked Caregiver
- **Action:** Owner revokes access, then sends new invite to same caregiver
- **Expected Result:**
  - Claim restores access (revoked_at = null)
  - Uses existing contact record
  - Caregiver regains access as if new

#### TC-9.11: Caregiver Views Shared Pet's Access List
- **Action:** Caregiver views access list for pet they care for
- **Expected Result:**
  - Returns list of all caregivers (including self)
  - Returns selfAccessId so they can identify themselves
  - Cannot revoke others' access (only owner can)

---

## 10. Pet Health Document

### Normal Cases

#### TC-10.1: Upload Medical PDF
- **Action:** Owner uploads vaccination certificate PDF for their pet
- **Expected Result:**
  - File stored in MinIO
  - pet_medical_documents record created
  - Returns: documentId, fileName, fileSize, createdAt

#### TC-10.2: List Pet's Documents
- **Action:** GET /pets/:petId/medical-documents
- **Expected Result:**
  - Returns array of all documents for that pet
  - Each has presigned download URL (1 hour expiry)
  - Sorted by created_at desc (newest first)

#### TC-10.3: Download Document
- **Action:** Click download URL from document list
- **Expected Result:**
  - Presigned GET URL allows direct download
  - File downloads as original filename
  - Content-Type: application/pdf

#### TC-10.4: Delete Document
- **Action:** Owner deletes outdated medical document
- **Expected Result:**
  - File removed from MinIO
  - Database record deleted
  - Document no longer appears in list

### Edge Cases

#### TC-10.5: Upload Non-PDF File
- **Action:** Try to upload JPEG image as medical document
- **Expected Result:**
  - Returns 400 Bad Request
  - Error: "Only PDF files allowed"
  - Or system accepts but tags file_type

#### TC-10.6: Upload Oversized PDF (>10MB)
- **Action:** Try to upload 50MB PDF
- **Expected Result:**
  - Returns 400 Bad Request
  - Error: "File size exceeds 10MB limit"
  - No file uploaded

#### TC-10.7: Caregiver Upload Permission
- **Action:** Caregiver tries to upload document for shared pet
- **Expected Result:**
  - System allows (caregivers can upload)
  - created_by_user_id = caregiver
  - Document visible to both owner and caregiver

#### TC-10.8: Caregiver Delete Permission
- **Action:** Caregiver tries to delete document they didn't upload
- **Expected Result:**
  - Returns 403 Forbidden (only uploader or owner can delete)
  - Or system allows if caregiver has write permissions

#### TC-10.9: Access Document After Access Revoked
- **Action:** Caregiver's access revoked, tries to access document they uploaded
- **Expected Result:**
  - Returns 403 Forbidden
  - No access to pet's documents after revocation
  - Owner still has access to all documents

#### TC-10.10: Document for Deleted Pet
- **Action:** Pet soft-deleted, try to access documents
- **Expected Result:**
  - Returns 404 Not Found
  - Documents not accessible for deleted pets
  - Or documents cascade deleted with pet

---

## 11. Health Logging

### Normal Cases

#### TC-11.1: Create Weight Log
- **Action:** Log pet's current weight (category: WEIGHT, weight: 5.2kg)
- **Expected Result:**
  - health_logs record created
  - Pet's weight field updated to 5.2kg
  - loggedAt = current timestamp (or custom if provided)
  - Returns: full health log DTO with createdBy label

#### TC-11.2: Create Symptom Log
- **Action:** Log symptoms (category: SYMPTOMS, description: "vomiting twice today")
- **Expected Result:**
  - health_logs record created
  - weight field null/optional
  - Logged with timestamp
  - Available in health logs list

#### TC-11.3: Create Behavior Log
- **Action:** Log behavior (category: BEHAVIOR, description: "more playful than usual")
- **Expected Result:**
  - Log created with BEHAVIOR category
  - Includes optional note field
  - Timestamp recorded

#### TC-11.4: Update Existing Log
- **Action:** Edit weight log to correct value (5.2 → 5.4kg)
- **Expected Result:**
  - Log updated with new weight
  - Pet's current weight also updated
  - updatedAt timestamp changed
  - Maintains original createdAt

#### TC-11.5: Delete Health Log
- **Action:** Owner deletes outdated health log
- **Expected Result:**
  - Log record deleted
  - Pet's current weight unchanged (remains most recent value)
  - Log removed from list

### Edge Cases

#### TC-11.6: Future Date Validation
- **Action:** Try to create log with loggedAt = tomorrow
- **Expected Result:**
  - Returns 400 Bad Request
  - Zod validation error: "Date cannot be in the future"
  - No log created

#### TC-11.7: Negative Weight
- **Action:** Try to log weight: -5.2kg
- **Expected Result:**
  - Returns 400 Bad Request
  - Zod validation error: "Weight must be positive"
  - No log created

#### TC-11.8: Weight Category Without Weight Value
- **Action:** Create WEIGHT log but omit weight field
- **Expected Result:**
  - Returns 400 Bad Request
  - Zod validation error: "Weight is required for WEIGHT category"
  - No log created

#### TC-11.9: Caregiver Creates Log
- **Action:** Caregiver logs weight for shared pet
- **Expected Result:**
  - Log created successfully
  - created_by_user_id = caregiver
  - createdBy label resolved to caregiver's alias
  - Owner sees log with caregiver's name

#### TC-11.10: Caregiver Updates Own Log
- **Action:** Caregiver edits log they created
- **Expected Result:**
  - Update succeeds
  - updatedAt timestamp changed

#### TC-11.11: Caregiver Updates Owner's Log
- **Action:** Caregiver tries to edit log created by owner
- **Expected Result:**
  - Returns 403 Forbidden
  - Error: "Caregivers can only edit logs they created"
  - Owner's log unchanged

#### TC-11.12: Owner Updates Any Log
- **Action:** Owner edits log created by caregiver
- **Expected Result:**
  - Update succeeds
  - Owners have full control over all logs

#### TC-11.13: Very Long Description (5000 chars)
- **Action:** Create log with maximum allowed description length
- **Expected Result:**
  - Log created successfully
  - Full description stored
  - Returns complete log

#### TC-11.14: Description Exceeds Limit (5001 chars)
- **Action:** Try to create log exceeding max length
- **Expected Result:**
  - Returns 400 Bad Request
  - Zod validation error: "Description is too long"
  - No log created

#### TC-11.15: Retroactive Weight Log
- **Action:** Log weight from 2 weeks ago with past loggedAt
- **Expected Result:**
  - Log created with past timestamp
  - Historical data recorded
  - Does not update pet's current weight
  - Or updates if it's the most recent weight record

#### TC-11.16: Pagination for Large Log History
- **Action:** Fetch health logs with limit=10, offset=20
- **Expected Result:**
  - Returns 10 logs starting from 21st
  - Total count included in response
  - Proper pagination for scrolling

---

## 12. Health Insights Notifications

### Normal Cases

#### TC-12.1: Immediate Critical Symptom Alert on Log Create
- **Action:** Create SYMPTOMS log with critical keyword (example: "อาเจียนเป็นเลือด")
- **Expected Result:**
  - Health log API returns success without waiting for insight generation
  - Background task detects abnormal symptom immediately
  - Insight is saved to `health_insights`
  - Notification sent to pet owner and active caregivers within a few seconds

#### TC-12.2: Daily Recurring Symptom Detection (3+ in 7 Days)
- **Action:** Create 3 SYMPTOMS logs with same description in last 7 days, then run daily job
- **Expected Result:**
  - Pattern detected as recurring symptom
  - Insight title/description generated and persisted
  - Notification sent once for that detection cycle

#### TC-12.3: Daily Rapid Weight Loss Detection
- **Action:** For dog, log weight drop >= 10% within 14 days, then run daily job
- **Expected Result:**
  - Pattern detected as rapid weight loss
  - Severity reflects configured threshold (MEDIUM/HIGH)
  - Notification generated and delivered to owner/caregivers

#### TC-12.4: Daily Rapid Weight Gain Detection
- **Action:** For cat, log weight gain above threshold within 14 days, then run daily job
- **Expected Result:**
  - Pattern detected as rapid weight gain
  - Insight includes change amount and time window context
  - Notification delivered successfully

#### TC-12.5: Daily Recurring Behavior Detection
- **Action:** Create 3+ BEHAVIOR logs with identical description in 7 days, then run daily job
- **Expected Result:**
  - Recurring behavior pattern detected
  - AI/fallback message generated in expected format
  - Notification reaches intended recipients

#### TC-12.6: No Recent Logs Reminder with Active Reminder Context
- **Action:** Ensure pet has active reminders but no health logs for >= 7 days, then run daily job
- **Expected Result:**
  - "No recent logs" pattern detected
  - Low-severity reminder insight generated
  - Notification sent once for current weekly window

#### TC-12.7: Follow-up Reminder After Warning Symptom
- **Action:** Log warning symptom (example: "ท้องเสีย"), wait/simulate 2 days with no follow-up, run daily job
- **Expected Result:**
  - Follow-up pattern detected
  - Insight asks whether condition improved/resolved
  - Notification sent to owner and active caregivers

#### TC-12.8: Recipient Fan-out for Shared Pets
- **Action:** Trigger any valid health insight on a pet shared with caregivers
- **Expected Result:**
  - Owner receives notification
  - All active caregivers receive notification
  - Notification records map correctly to recipient users

### Edge Cases

#### TC-12.9: Recurring Symptom Below Threshold (2 in 7 Days)
- **Action:** Create same symptom only 2 times in 7 days, then run daily job
- **Expected Result:**
  - No recurring symptom insight generated
  - No false-positive notification sent

#### TC-12.10: Non-SYMPTOMS Log Does Not Trigger Immediate Abnormal Check
- **Action:** Create BEHAVIOR or WEIGHT log containing critical-like text
- **Expected Result:**
  - Immediate abnormal alert path is not executed
  - Any insight can only come from daily analyzer logic

#### TC-12.11: Disabled Critical Keyword Is Ignored
- **Action:** Disable a keyword in `health-alert-keywords.json`, create SYMPTOMS log containing it
- **Expected Result:**
  - Immediate abnormal detection does not trigger for disabled keyword
  - No abnormal immediate notification sent

#### TC-12.12: Weight Change Exactly at Threshold Boundary
- **Action:** Create logs where change percent equals threshold exactly (example: dog -10%)
- **Expected Result:**
  - Detection still triggers (boundary inclusive)
  - Insight categorized according to configured severity rules

#### TC-12.13: Weight Change Outside Time Window
- **Action:** Create significant weight change but with logs outside species time window
- **Expected Result:**
  - No rapid weight anomaly insight generated
  - Prevents stale-data false positives

#### TC-12.14: Multiple Patterns Present, Highest Priority Selected
- **Action:** Prepare data so pet matches recurring symptom and weight anomaly on same run
- **Expected Result:**
  - Only highest-priority pattern is selected for that cycle
  - Generated insight corresponds to configured priority order

#### TC-12.15: No Recent Logs Without Active Reminders
- **Action:** No health logs for >= 7 days, but pet has no active reminders
- **Expected Result:**
  - "No recent logs" insight is not generated
  - Avoids noise for pets not currently being tracked

#### TC-12.16: No Recent Logs Weekly Rate Limit
- **Action:** Trigger no-recent-logs insight, then run daily job again within 7 days
- **Expected Result:**
  - Second notification is suppressed within same weekly window
  - System sends again only after rate-limit window passes

#### TC-12.17: AI Generation Failure Falls Back to Template
- **Action:** Simulate Gemini/API failure during insight generation for a detected pattern
- **Expected Result:**
  - Fallback title/description template is used
  - Insight still saved and notification still sent
  - System logs AI failure without crashing job

#### TC-12.18: Inactive or Deleted Pets Excluded from Daily Analysis
- **Action:** Mark pet inactive/deleted and run daily health insight cron
- **Expected Result:**
  - Pet is skipped in analysis query
  - No insights or notifications produced for excluded pet

---

## Test Coverage Summary

### Feature Reliability Metrics

| Feature | Normal Cases | Edge Cases | Critical Paths Covered |
|---------|--------------|-----------|----------------------|
| Pet Profile Picture | 3 | 3 | Upload, Update, Delete, Error Handling |
| AI Name Detection | 2 | 4 | Valid Input, Empty, Long, Special Chars |
| Vaccine Validation | 3 | 4 | Standard, Adult, Custom, Age Validation |
| Reminder Attachments | 3 | 5 | Upload, Limit, Delete, Cascade, Permissions |
| AI Symptom Assessment | 3 | 4 | Mild, Moderate, Emergency, Vague Input |
| Multi-Pet Reminders | 2 | 4 | Multiple Pets, Invalid IDs, Access Control |
| Bulk Reminders | 3 | 4 | Future, Retroactive, Limits, Duplicates |
| Bulk Pet Creation | 2 | 5 | Litter, Empty, Limits, Validation |
| Pet Sharing | 4 | 7 | Invite, Claim, Revoke, Partial Access |
| Health Documents | 4 | 6 | Upload, List, Delete, Permissions |
| Health Logging | 5 | 11 | CRUD, Categories, Validation, Permissions |
| Health Insights Notifications | 8 | 10 | Immediate Alerts, Daily Patterns, Priority, Fallback, Rate Limits |

### Key Testing Principles Applied

1. **Atomicity**: Bulk operations fail completely or succeed completely
2. **Authorization**: Owner vs. Caregiver permission boundaries tested
3. **Cascade Operations**: Deletions properly cascade to related data
4. **Idempotency**: Repeated operations produce consistent results
5. **Graceful Degradation**: Missing data (images) doesn't break API
6. **Input Validation**: Zod schemas catch invalid data early
7. **Timestamp Integrity**: Past/future date validation where appropriate
8. **Access Control**: Pet sharing permissions consistently enforced
9. **Data Consistency**: Related tables maintain referential integrity
10. **Resource Limits**: File sizes and bulk operation counts enforced

---

## Recommended Testing Approach

### Manual Testing
- Run through normal cases for each feature
- Verify happy path works end-to-end
- Check UI displays results correctly

### Automated Testing
- Write integration tests for all edge cases
- Use test database with sample data
- Mock external services (MinIO, AI)
- Test error handling and validation

### Load Testing
- Bulk operations with maximum limits
- Concurrent access to shared pets
- Large file uploads/downloads
- High-frequency API calls

### Security Testing
- Authentication bypass attempts
- Authorization escalation tests
- SQL injection in inputs
- XSS in text fields
- CSRF on mutation endpoints

---

*Document Version: 1.0*
*Last Updated: 2026-03-27*
*Coverage: 12 Features, 109 Test Cases*
