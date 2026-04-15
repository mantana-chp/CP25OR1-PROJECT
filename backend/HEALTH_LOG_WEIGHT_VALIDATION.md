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
Change exceeds 5× the species threshold — **not time-scaled** (absolute physiological limit).

```
rejectThreshold = speciesLimit × 5
```

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
- → 10 kg (100%) — > 75% reject limit (15×5) → ❌ 400 rejected

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
| `health-log-types.ts` | Added `upsert?: boolean` to `CreateHealthLogInput`; added `CreateHealthLogResult` discriminated union |
| `health-log-schema.ts` | Added `upsert: z.boolean().optional()` to create schema |
| `health-log-repository.ts` | Added `findWeightLogByDate()`, `findMostRecentPreviousWeight()`, `updateWeightLogWithWeight()` |
| `health-log-service.ts` | Two-tier species-aware validation; discriminated union return type |
| `health-log-controller.ts` | Handles `conflict` kind → 409 directly; spreads `suspiciousChange`/`warningMessage` into response |

### Architecture Pattern
- **Thin Controller**: Reads the result kind, sends the appropriate HTTP response
- **Business Logic in Service**: All validation, conflict detection, upsert logic
- **No ConflictError thrown**: Conflict is returned as `{ kind: 'conflict' }` — controller builds the 409 JSON directly
- **Species thresholds shared**: Reuses `WEIGHT_THRESHOLDS` + `getWeightThreshold()` from `health-insight-types.ts`

### Key Constants
```ts
WEIGHT_REJECTION_MULTIPLIER = 5   // hard reject at 5× species threshold
// warn floor = 10%               // minimum warn threshold regardless of time window
```

## Frontend Handling
1. Send create request without `upsert`
2. On 409: show confirmation dialog (`data.conflict === true`)
3. If user confirms → resend with `upsert: true`
4. On any success (200 or 201): check `data.suspiciousChange` — if true, show `data.warningMessage` as a non-blocking alert
5. On 400: show the error message from `errors[0].message`
