# Health Log Weight Validation & Daily Limit

## Overview
Weight logs are validated on every request using a **two-tier, species-aware, time-aware system**. Users can only log one weight entry per pet per day — a same-day conflict returns a 409 asking the user to confirm. If confirmed, the request is resent with `upsert: true`.

---

## Validation Tiers (runs on every WEIGHT request, upsert or not)

Both tiers compare the new weight against the **most recent baseline** available:
- **Same-day existing log** takes priority as the baseline (most relevant for upsert).
- Falls back to the **most recent historical log** (before today) if no same-day log exists.
- If no prior log exists at all (first-ever weight log), all checks are skipped.

### Tier 1 — Soft Warning (`suspiciousChange`)
Change exceeds the species-specific threshold (time-scaled, minimum 10% floor).

```
warnThreshold = max(10%, speciesLimit × min(daysSince / windowDays, 1.0))
```

- Log is **created/upserted as normal**
- Response includes `suspiciousChange: true` and `warningMessage` in `data`

### Tier 2 — Hard Rejection (impossible weight)
Weight exceeds the **absolute biological maximum** for the species — not relative to prior weight, not time-scaled.

```
newWeight > SPECIES_MAX_WEIGHT_KG[species] → 400 Bad Request
```

| Species | Max weight (kg) |
|---------|----------------|
| DOG | 120 |
| CAT | 30 |
| RABBIT | 15 |
| HAMSTER | 1 |
| BIRD | 5 |
| DEFAULT | 100 |

- Returns **400 Bad Request**
- Log is NOT written to DB

### Species Thresholds (from `WEIGHT_THRESHOLDS`)

| Species  | Gain limit | Loss limit | Window |
|----------|------------|------------|--------|
| DOG      | 15%        | 10%        | 14 days |
| CAT      | 10%        | 5%         | 14 days |
| RABBIT   | 8%         | 5%         | 7 days  |
| HAMSTER  | 8%         | 5%         | 7 days  |
| BIRD     | 8%         | 5%         | 7 days  |
| DEFAULT  | 12%        | 8%         | 10 days |

**Example — Dog (5 kg baseline):**
- → 5.5 kg (10%) — exactly at floor, no warning
- → 7 kg (40%) — > 10% floor → ⚠️ `suspiciousChange: true`
- → 125 kg — > 120 kg DOG species max → ❌ 400 rejected

---

## Suspicious Warning (Step 2)
A separate historical check runs **only against the log from before today** (not the same-day log). This reflects whether the long-term weight trend looks suspicious.

- Only produces `suspiciousChange: true` — never rejects
- Runs even when upserting (compares new weight vs previous day's weight)

---

## Flow

### 1. Create Weight Log (first ever, or normal case)
```http
POST /pets/{petId}/health-logs
{
  "category": "WEIGHT",
  "weight": 5.2,
  "description": "Morning weigh-in"
}
```

**Response: 201 Created**
```json
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "log": { "...": "..." }
  }
}
```

**Response: 201 Created (with suspicious warning)**
```json
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "log": { "...": "..." },
    "suspiciousChange": true,
    "warningMessage": "น้ำหนักเปลี่ยนแปลงค่อนข้างมากจากครั้งก่อน (...) กรุณาตรวจสอบความถูกต้องอีกครั้ง"
  }
}
```

---

### 2. Same-Day Conflict (no `upsert` flag)
When a weight log already exists for the same pet on the same day:

**Response: 409 Conflict**
```json
{
  "status": { "code": "888", "description": "Conflict" },
  "data": {
    "conflict": true,
    "message": "Weight already logged today"
  }
}
```

> No suspicious check is run at this stage. The user hasn't confirmed yet.

---

### 3. Confirm Upsert
Frontend prompts user. If confirmed, resend with `upsert: true`:

```http
POST /pets/{petId}/health-logs
{
  "category": "WEIGHT",
  "weight": 5.2,
  "description": "Morning weigh-in",
  "upsert": true
}
```

Validation still runs (impossible check + historical suspicious check).

**Response: 200 OK**
```json
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "log": { "...": "..." }
  }
}
```

**Response: 200 OK (with suspicious warning)**
```json
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "log": { "...": "..." },
    "suspiciousChange": true,
    "warningMessage": "น้ำหนักเปลี่ยนแปลงค่อนข้างมากจากครั้งก่อน (...) กรุณาตรวจสอบความถูกต้องอีกครั้ง"
  }
}
```

---

### 4. Impossible Weight (Hard Rejection)
```http
POST /pets/{petId}/health-logs
{
  "category": "WEIGHT",
  "weight": 100
}
```

**Response: 400 Bad Request**
```json
{
  "status": { "code": "888", "description": "Bad Request" },
  "errors": [
    {
      "message": "น้ำหนักที่บันทึก (100.00 kg) เพิ่มขึ้นจากครั้งก่อน (5.00 kg) มากผิดปกติ (1900.0%) กรุณาตรวจสอบค่าน้ำหนักที่บันทึกอีกครั้ง",
      "code": 400
    }
  ]
}
```

---

## Scenario Matrix

| Scenario | Result |
|---|---|
| First-ever weight log | ✅ 201, no checks |
| Normal log, no prior history | ✅ 201, no checks |
| Normal log, small change | ✅ 201, no warning |
| Normal log, suspicious change | ✅ 201 + `suspiciousChange: true` |
| Normal log, impossible change | ❌ 400 Bad Request |
| Same-day (no upsert) | ⚠️ 409 Conflict |
| Same-day + upsert, reasonable | ✅ 200, log updated |
| Same-day + upsert, suspicious | ✅ 200 + `suspiciousChange: true` |
| Same-day + upsert, impossible | ❌ 400 Bad Request |

---

## Implementation

### Files Modified

| File | Change |
|---|---|
| `shared/weight-validation.ts` | Added `checkWeightValidity()` and `formatWeightWarningMessage()` as shared exports; thresholds inlined |
| `health-log-types.ts` | Added `upsert?: boolean` to `CreateHealthLogInput`; added `CreateHealthLogResult` discriminated union |
| `health-log-schema.ts` | Added `upsert: z.boolean().optional()` to create schema |
| `health-log-repository.ts` | Added `findWeightLogByDate()`, `findMostRecentPreviousWeight()`, `updateWeightLogWithWeight()` |
| `health-log-service.ts` | Two-tier species-aware validation; imports shared helpers from `weight-validation.ts`; discriminated union return type |
| `health-log-controller.ts` | Handles `conflict` kind → 409 directly; spreads `suspiciousChange`/`warningMessage` into response |

### Architecture Pattern
- **Thin Controller**: Reads the result kind, sends the appropriate HTTP response
- **Business Logic in Service**: All validation, conflict detection, upsert logic
- **No ConflictError thrown**: Conflict is returned as `{ kind: 'conflict' }` — controller builds the 409 JSON directly
- **Shared weight helpers**: `checkWeightValidity` + `formatWeightWarningMessage` live in `src/shared/weight-validation.ts` and are used by both `health-log-service.ts` and `pet-service.ts`
- **Species thresholds**: `WEIGHT_THRESHOLDS` are inlined in `weight-validation.ts` to avoid coupling a shared utility to the `health-insights` feature

### Key Constants
```ts
// warn floor = 10%   // minimum warn threshold regardless of time window
// hard block         // weight > SPECIES_MAX_WEIGHT_KG[species] → 400 Bad Request
//   (defined in src/shared/weight-validation.ts)
```

## Frontend Handling
1. Send create request without `upsert`
2. On 409: show confirmation dialog (`data.conflict === true`)
3. If user confirms → resend with `upsert: true`
4. On any success (200 or 201): check `data.suspiciousChange` — if true, show `data.warningMessage` as a non-blocking alert
5. On 400: show the error message from `errors[0].message`

---

## Edit Weight Log Validation

### `loggedAt` is Immutable

The `loggedAt` timestamp of a health log is set at **creation time** and **cannot be changed**.
- Removed from the update schema (`updateHealthLogSchema`)
- The DB field `logged_at` is never written during an update
- This ensures the log's position in the pet's weight history is stable and trustworthy as a comparison baseline

### Validation on Edit (`PATCH /pets/:petId/health-logs/:logId`)

Runs when `weight` is provided and the final category is `WEIGHT`:

**Tier 1 — Hard block (impossible)**
Same as create: if `newWeight > SPECIES_MAX_WEIGHT_KG[species]` → **400 Bad Request**, log not saved.

**Tier 2 — Soft warning (suspicious rate of change)**
Compares the new weight against the **most recent WEIGHT log before this log's `logged_at`**.
Since `logged_at` is immutable, this baseline is always the correct historical context for the edited log.

```
daysSince = (log.logged_at − prevLog.logged_at) in days
→ same time-scaled threshold as create
→ 200 OK with suspiciousChange: true + warningMessage if suspicious
```

- If no previous log exists → use `pets.weight` as fallback baseline (set when log was first created); `daysSince=0` activates the 10% floor threshold
- If both previous log and `pets.weight` are null → skip soft warning (brand new pet, no weight history at all)
- Non-WEIGHT edits (description, note, category change) → skip all weight checks

### Response (edit)

**Normal (200):**
```json
{ "status": { "code": "000" }, "data": { "log": { ... } } }
```

**With suspicious warning (200):**
```json
{
  "status": { "code": "000" },
  "data": {
    "log": { ... },
    "suspiciousChange": true,
    "warningMessage": "น้ำหนักเปลี่ยนแปลงค่อนข้างมากจากครั้งก่อน ..."
  }
}
```

**Impossible weight (400):**
```json
{
  "status": { "code": "888" },
  "errors": [{ "message": "น้ำหนักที่ระบุ (X kg) เกินค่าสูงสุด...", "code": 400 }]
}
```

### Implementation

| File | Change |
|---|---|
| `health-log-types.ts` | Added `UpdateHealthLogResult` type |
| `health-log-schema.ts` | Removed `loggedAt` from `updateHealthLogSchema` |
| `health-log-service.ts` | Hard-block + soft-warning in `updateHealthLog`; imports `checkWeightValidity`/`formatWeightWarningMessage` from `weight-validation.ts`; return `UpdateHealthLogResult` |
| `health-log-controller.ts` | Spreads `suspiciousChange`/`warningMessage` into response |
| `shared/weight-validation.ts` | Source of `checkWeightValidity` + `formatWeightWarningMessage` (shared with `pet-service.ts`) |

### Scenario Matrix (edit)

| Scenario | Result |
|---|---|
| Edit description/note only | ✅ 200, no weight checks |
| Edit weight, no prior log, `pets.weight` set | ✅ 200, compare vs `pets.weight` (10% floor) |
| Edit weight, no prior log, no `pets.weight` | ✅ 200, no warning (brand new pet) |
| Edit weight, small change | ✅ 200, no warning |
| Edit weight, suspicious rate vs prev log | ✅ 200 + `suspiciousChange: true` |
| Edit weight, suspicious jump vs `pets.weight` | ✅ 200 + `suspiciousChange: true` |
| Edit weight, impossible value | ❌ 400 Bad Request |
