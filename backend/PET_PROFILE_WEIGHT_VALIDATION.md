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

### No Suspicious Warning

Pet profile updates produce **no `suspiciousChange` warning**. There is no time context (no `loggedAt`), and no comparison against the previous weight. The absolute max is the only check.

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
  ├─ Same-day check: WEIGHT log exists for today?
  │     NO  → update pets.weight + auto-create health log + return { pet }
  │     YES (no overwriteWeightLog flag):
  │           → non-weight fields update, weight held
  │           → return { pet, conflict: true, message }
  │     YES (overwriteWeightLog: true):
  │           → update pets.weight + upsert today's health log
  │           → return { pet }
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
| `pet-service.ts` | `updatePet` — same-day conflict check, conditional weight update, auto-create/upsert health log |
| `pet-controller.ts` | Routes conflict vs normal return to different response shapes |

---

## Implementation Reference

### Files Changed

| File | Change |
|---|---|
| `src/shared/weight-validation.ts` | New: `SPECIES_MAX_WEIGHT_KG`, `exceedsSpeciesMaxWeight()`, `getSpeciesMaxWeightKg()` |
| `src/features/pets/pet-repository.ts` | Added `species.name` (English) to `petProfileSelect` |
| `src/features/pet-sharing/pet-sharing-repository.ts` | Added `species.name` to sharing repo's `petProfileSelect` (type parity) |
| `src/features/pets/pet-service.ts` | Validation in `createPet`, `createMultiplePets`, and `updatePet` |
| `src/features/health-log/health-log-service.ts` | `checkWeightValidity` uses `exceedsSpeciesMaxWeight()` for impossible; suspicious uses time-scaled % |

### Shared Utility Reference

`src/shared/weight-validation.ts`

```ts
// Absolute biological max per species
export const SPECIES_MAX_WEIGHT_KG: Record<string, number>

// Returns true if weight > species max
export const exceedsSpeciesMaxWeight = (weight: number, speciesName: string): boolean

// Returns the max kg value for use in error messages
export const getSpeciesMaxWeightKg = (speciesName: string): number
```
