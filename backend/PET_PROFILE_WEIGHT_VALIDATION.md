# Pet Profile Weight Validation & Auto Weight Log

## Overview

This document covers weight-related behaviour that runs through the **pet profile API**, as opposed to the health log API.

Three features are documented here:
1. **Weight Validation on Profile Update** *(implemented)* — blocks impossible weight values in `updatePet`
2. **Weight Validation on Pet Creation** *(implemented)* — same absolute max check in `createPet` and `createMultiplePets`
3. **Auto Weight Log on Profile Update** *(implemented)* — auto-creates/upserts a weight health log when profile weight changes, with same-day conflict detection

---

## Part 1: Weight Validation on Profile Update

### Behaviour

When a user updates a pet's profile and includes a `weight` field, the new value is validated against the **absolute biological maximum** for that species.

- Validation runs **regardless** of whether the pet has a prior recorded weight
- No comparison against the current weight — just checks if the value is physically possible
- This correctly handles the **baby-to-adult growth scenario**: a 1 kg kitten growing to 5 kg (5× ratio) is always allowed

### Hard Rejection (Absolute Max)

Uses `exceedsSpeciesMaxWeight()` from `src/shared/weight-validation.ts`.

```
newWeight > SPECIES_MAX_WEIGHT_KG[species] → 400 Bad Request
```

#### Limits by species

| Species | Max weight (kg) | Example blocked |
|---|---|---|
| CAT | 30 kg | 10 kg cat → tries 31 kg ❌ |
| DOG | 120 kg | 20 kg dog → tries 121 kg ❌ |
| RABBIT | 15 kg | 3 kg rabbit → tries 16 kg ❌ |
| HAMSTER | 1 kg | 0.15 kg hamster → tries 1.1 kg ❌ |
| BIRD | 5 kg | 0.5 kg bird → tries 6 kg ❌ |
| DEFAULT | 100 kg | fallback for unknown species |

#### Baby growth example (always allowed)

| Pet | Previous weight | New weight | Result |
|---|---|---|---|
| Kitten | 1 kg (never updated) | 5 kg (grown up) | ✅ allowed (5 < 30 max) |
| Puppy | 2 kg | 30 kg | ✅ allowed (30 < 120 max) |
| Hamster | 0.05 kg | 0.18 kg | ✅ allowed (0.18 < 1 max) |
| Cat | 10 kg | 100 kg | ❌ blocked (100 > 30 max) |

### Soft Warning (Suspicious Rate of Change)

In addition to the hard block, `updatePet` now runs a **soft warning** using the same two-tier logic as the health log endpoints.

**Baseline selection (in order):**
1. Most recent WEIGHT log **before today** (`startOfToday` cutoff) — used with proper `daysSince` calculation
2. **Fallback**: `existingPet.weight` — used when all weight history is from today, or the pet has no prior logs. `daysSince=0` activates the 10% floor threshold.
3. **Skip**: Both are null — brand new pet with no weight history

```
suspicious change → 200 OK + { suspiciousChange: true, warningMessage }
```

The warning does **not** block the update — it is returned alongside the updated pet for the frontend to display as a non-blocking alert.

### Atomicity

The validation runs **before** any field is written. If weight fails validation, **the entire PATCH request is rejected** — `pet_name`, `gender`, `breed_id`, and all other fields are also not updated.

### API Response

**Success (200)**
```json
{
  "status": { "code": "000", "description": "Success" },
  "data": { "...updated pet profile..." }
}
```

**Weight exceeds species max (400)**
```json
{
  "status": { "code": "888", "description": "Bad Request" },
  "errors": [
    {
      "message": "น้ำหนักที่ระบุ (100.00 kg) เกินค่าสูงสุดที่เป็นไปได้สำหรับ แมว (สูงสุด 30 kg) กรุณาตรวจสอบอีกครั้ง",
      "code": 400
    }
  ]
}
```

**Success with suspicious warning (200)**
```json
{
  "status": { "code": "000" },
  "data": {
    "pet": { "weight": 15, ... },
    "suspiciousChange": true,
    "warningMessage": "น้ำหนักเปลี่ยนแปลงค่อนข้างมากจากน้ำหนักล่าสุดของสัตว์เลี้ยง (จาก 10.00 kg เป็น 15.00 kg) กรุณาตรวจสอบความถูกต้องอีกครั้ง"
  }
}
```

---

## Part 2: Weight Validation on Pet Creation

### Single pet (`POST /pets`)

Same absolute max check runs after name uniqueness, before the DB write.
- Fetches species by `species_id` with one extra query
- Throws 400 if weight exceeds max for that species

### Batch creation (`POST /pets/bulk`)

**Reject ALL** if any pet's weight is impossible — consistent with how name conflicts work in the same endpoint.

- Collects all unique `species_id` values in the batch → **one query** for all species names (no N+1)
- Iterates through each pet and validates weight
- First failure throws 400 with a message identifying the offending pet by name and 1-based index
- No pets are created if any weight fails

**Batch error message example:**
```json
{
  "errors": [
    {
      "message": "สัตว์เลี้ยงตัวที่ 2 (\"บัตเตอร์บอล\"): น้ำหนักที่ระบุ (500.00 kg) เกินค่าสูงสุดที่เป็นไปได้สำหรับสัตว์เลี้ยงประเภทนี้ (สูงสุด 30 kg)",
      "code": 400
    }
  ]
}
```

### Auto Weight Log on Pet Creation *(Implemented)*

When a pet is created with a `weight` value, an initial `WEIGHT` health log is automatically created:

- **Single create (`createPet`)**: created after the pet row is inserted
- **Batch create (`createMultiplePets`)**: created in parallel for all pets that had a weight, after the transaction commits
- New pets have no prior logs → **no same-day conflict possible** → always creates directly

| Field | Value |
|---|---|
| `category` | `WEIGHT` |
| `description` | `"บันทึกน้ำหนักเริ่มต้น"` |
| `weight` | weight provided at creation |
| `logged_at` | current server time (now) |
| `created_by_user_id` | user creating the pet |

---

## Part 3: Auto Weight Log on Profile Update *(Implemented)*

### Goal

Keep `pets.weight` and WEIGHT health logs in sync whenever the user changes the pet's weight through the profile form.

### Full Flow

```
PATCH /pets/me/:petId  { weight: 5.5, pet_name: "Misa", ... }

  ├─ Validation: exceedsSpeciesMaxWeight?  → 400 if yes
  │
  ├─ Soft warning check (checkWeightValidity):
  │     most recent log before today → compare with daysSince
  │     no prior log → fallback to existingPet.weight (10% floor)
  │     no weight at all → skip warning
  │
  ├─ Same-day check: WEIGHT log exists for today?
  │     NO  → update pets.weight + auto-create health log
  │           → return { pet } or { pet, suspiciousChange, warningMessage }
  │     YES (no overwriteWeightLog flag):
  │           → non-weight fields update, weight held
  │           → return { pet, conflict: true, message }
  │     YES (overwriteWeightLog: true):
  │           → update pets.weight + upsert today's health log
  │           → return { pet } or { pet, suspiciousChange, warningMessage }
```

### Request

`PATCH /pets/me/:petId`

```json
{
  "pet_name": "Misa",
  "weight": 5.5,
  "overwriteWeightLog": true
}
```

`overwriteWeightLog` is optional (defaults to `false`/absent). Only needed on the **second request** after the user confirms the modal.

### Responses

**No conflict — normal (200)** *(same shape as before, backward-compatible)*
```json
{ "status": { "code": "000" }, "data": { "id": "...", "pet_name": "Misa", ... } }
```

**Same-day conflict (200 with conflict flag)**
```json
{
  "status": { "code": "000" },
  "data": {
    "conflict": true,
    "message": "มีการบันทึกน้ำหนักในวันนี้แล้ว คุณต้องการอัปเดตบันทึกวันนี้ด้วยหรือไม่?",
    "pet": { "id": "...", "pet_name": "Misa", "weight": 5.0, ... }
  }
}
```

> `weight` in the pet object reflects the **old value** (not updated yet). The frontend shows a modal, and if the user confirms, resends with `overwriteWeightLog: true`.

### Frontend Flow

1. Submit form → PATCH request (no flag)
2. If `data.conflict === true` → show modal: *"มีการบันทึกน้ำหนักในวันนี้แล้ว ต้องการอัปเดตบันทึกด้วยหรือไม่?"*
3. User **YES** → PATCH again with `{ weight: 5.5, overwriteWeightLog: true }` → both sync'd
4. User **NO** → done. Other profile fields already saved; weight stays unchanged
5. On any success: check `data.suspiciousChange` — if true, show `data.warningMessage` as non-blocking alert

### Auto-created Log Fields

| Field | Value |
|---|---|
| `category` | `WEIGHT` |
| `description` | `"อัปเดตน้ำหนักจากโปรไฟล์"` |
| `weight` | new weight value |
| `logged_at` | current server time (now) |
| `created_by_user_id` | user performing the update |

### Implementation

| File | Change |
|---|---|
| `pet-schema.ts` | Added `overwriteWeightLog?: boolean` to `updatePetSchema` |
| `health-log-repository.ts` | Added `updateWeightInLog(logId, weight)` |
| `pet-service.ts` | `updatePet` — hard block, soft warning (with `existingPet.weight` fallback), same-day conflict, auto-create/upsert |
| `pet-controller.ts` | Routes conflict vs normal; spreads `suspiciousChange`/`warningMessage` in non-conflict response |

---

## Implementation Reference

### Files Changed

| File | Change |
|---|---|
| `src/shared/weight-validation.ts` | Added `SPECIES_MAX_WEIGHT_KG`, `exceedsSpeciesMaxWeight()`, `getSpeciesMaxWeightKg()`, `checkWeightValidity()`, `formatWeightWarningMessage()` |
| `src/features/pets/pet-repository.ts` | Added `species.name` (English) to `petProfileSelect` |
| `src/features/pet-sharing/pet-sharing-repository.ts` | Added `species.name` to sharing repo's `petProfileSelect` (type parity) |
| `src/features/pets/pet-service.ts` | Hard block + soft warning + conflict + auto-log in `createPet`, `createMultiplePets`, `updatePet` |
| `src/features/health-log/health-log-service.ts` | Imports `checkWeightValidity`/`formatWeightWarningMessage` from shared utility |

### Shared Utility Reference

`src/shared/weight-validation.ts`

```ts
// Absolute biological max per species
export const SPECIES_MAX_WEIGHT_KG: Record<string, number>

// Returns true if weight > species max
export const exceedsSpeciesMaxWeight = (weight: number, speciesName: string): boolean

// Returns the max kg value for use in error messages
export const getSpeciesMaxWeightKg = (speciesName: string): number

// Two-tier validity check: returns { suspicious, impossible, changePercent }
export const checkWeightValidity = (newWeight, previousWeight, daysSince, speciesName): ...

// Formats Thai-language soft-warning message with previous date and weight
export const formatWeightWarningMessage = (previousWeight, previousDate, newWeight): string
```

### Scenario Matrix (profile update)

| Scenario | Result |
|---|---|
| New weight exceeds species max | ❌ 400 Bad Request |
| No prior log, no `existingPet.weight` | ✅ 200, no warning |
| Prior-to-today log exists, small change | ✅ 200, no warning |
| Prior-to-today log exists, suspicious rate | ✅ 200 + `suspiciousChange: true` |
| No prior log, `existingPet.weight` set, suspicious | ✅ 200 + `suspiciousChange: true` |
| Same-day log, no overwrite flag | ⚠️ 200 `conflict: true` (weight held) |
| Same-day log, `overwriteWeightLog: true` | ✅ 200, weight overwritten (+ optional warning) |
