## Implementation Prompt: QR-Based Pet Sharing (Caregiver Access)

### Context

I'm building a React Native (Expo) + Node/Express/TypeScript mobile app for pet care. The app uses a fully anonymous, device-based auth system — no usernames or emails. Users are identified by `installationId`. JWT access tokens are short-lived; refresh tokens are stored in a `sessions` table. Every protected route requires `Authorization: Bearer <token>` and `X-Installation-Id` headers validated by `authGuard` middleware.

Current pet ownership: `pets.user_id` → `users.id` (hard FK, one owner only). No sharing model exists yet.

---

### Feature: QR-Based Pet Sharing (Caregiver Access)

---

### Database Migrations

**`owner_caregiver_contacts`** — global alias an owner assigns to a caregiver, shared across all pets
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
owner_user_id     UUID NOT NULL REFERENCES users(id)
caregiver_user_id UUID NOT NULL REFERENCES users(id)
alias             VARCHAR(100) NOT NULL
created_at        TIMESTAMPTZ DEFAULT now()
updated_at        TIMESTAMPTZ DEFAULT now()
UNIQUE(owner_user_id, caregiver_user_id)
```

**`pet_share_invites`** — one-time QR tokens
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE
created_by      UUID NOT NULL REFERENCES users(id)
caregiver_alias VARCHAR(100) NOT NULL     -- alias set by owner before QR is generated, snapshotted here
expires_at      TIMESTAMPTZ NOT NULL      -- now() + 24h
status          TEXT NOT NULL DEFAULT 'PENDING'  -- PENDING | ACCEPTED | EXPIRED
claimed_by      UUID REFERENCES users(id)
claimed_at      TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT now()
```

**`pet_user_access`** — ongoing caregiver relationship after invite is accepted
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
pet_id            UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE
user_id           UUID NOT NULL REFERENCES users(id)
role              TEXT NOT NULL DEFAULT 'CAREGIVER'
contact_id        UUID NOT NULL REFERENCES owner_caregiver_contacts(id)
granted_by        UUID NOT NULL REFERENCES users(id)
granted_at        TIMESTAMPTZ DEFAULT now()
revoked_at        TIMESTAMPTZ
invite_id         UUID REFERENCES pet_share_invites(id)
installation_id   TEXT          -- snapshot of X-Installation-Id at claim time
UNIQUE(pet_id, user_id)
```

---

### Backend — API Endpoints

**1. Generate invite**
`POST /v1/pets/:petId/invite`
- Auth required, Owner only — validate `pets.user_id === req.userId`
- Request body: `{ alias: string }` — required, non-empty, max 100 chars
- Run cleanup before inserting: `UPDATE pet_share_invites SET status = 'EXPIRED' WHERE status = 'PENDING' AND expires_at < now()`
- Create `pet_share_invites` row with `caregiver_alias = alias`, `expires_at = now() + 24h`, `status = PENDING`
- Do NOT cancel existing PENDING invites for this pet when a new one is generated
- Return: `{ inviteId, expiresAt, alias }`
- The QR code on mobile encodes just the raw `inviteId` UUID string

**2. Claim invite**
`POST /v1/pet-shares/claim/:token`
- Auth required
- Look up `pet_share_invites` by token UUID
- Reject with specific error messages if:
  - Not found → `"Invalid code"`
  - `status !== PENDING` or `expires_at < now()` → `"Code expired or already used"`
  - `pets.user_id === req.userId` → `"You are already the owner of this pet"`
  - Active (non-revoked) `pet_user_access` row already exists for `(pet_id, req.userId)` → `"You already have access to this pet"`
- On success, run in a transaction:
  - Upsert `owner_caregiver_contacts(owner_user_id = invite.created_by, caregiver_user_id = req.userId, alias = invite.caregiver_alias)` — if the row already exists (same owner-caregiver pair from a previous pet), do NOT overwrite the alias: use `ON CONFLICT DO NOTHING`
  - Insert `pet_user_access` row with `contact_id` pointing to the upserted contact, `installation_id` from `X-Installation-Id` header
  - Mark invite: `status = ACCEPTED`, `claimed_by = req.userId`, `claimed_at = now()`
  - Return full pet object so frontend can immediately add it to the caregiver's pet list

**3. List caregivers for a pet**
`GET /v1/pets/:petId/caregivers`
- Owner only
- Join `pet_user_access` → `owner_caregiver_contacts` for alias
- Exclude revoked rows (`revoked_at IS NOT NULL`)
- Return per caregiver: `{ accessId, alias, grantedAt }`

**4. Update caregiver alias**
`PATCH /v1/owner-contacts/:contactId`
- Owner only — validate `owner_caregiver_contacts.owner_user_id === req.userId`
- Body: `{ alias: string }`
- Update `owner_caregiver_contacts.alias` and `updated_at = now()`
- Single update reflects across all pets automatically since all `pet_user_access` rows join to this contact

**5. Revoke caregiver from a pet**
`DELETE /v1/pets/:petId/caregivers/:accessId`
- Owner only
- Soft delete: set `revoked_at = now()` on the `pet_user_access` row
- Do NOT delete the `owner_caregiver_contacts` row — alias should be preserved if the owner re-invites them later

**6. List pending invites for a pet**
`GET /v1/pets/:petId/invites`
- Owner only
- Return PENDING invites where `expires_at > now()`: `{ inviteId, alias, expiresAt, createdAt }`

**7. Cancel a pending invite**
`DELETE /v1/pets/:petId/invites/:inviteId`
- Owner only — validate `pet_share_invites.created_by === req.userId`
- Set `status = EXPIRED`

---

### Permission Middleware — `resolvePetRole`

Create a reusable middleware that attaches `req.petRole` to every pet-related request:
```
1. If pets.user_id === req.userId → role = 'OWNER'
2. Else if active pet_user_access row exists (revoked_at IS NULL) for (petId, userId) → role = 'CAREGIVER'
3. Otherwise → 403
```

Permission matrix:

| Action                  | OWNER | CAREGIVER |
|-------------------------|-------|-----------|
| View pet info           | ✅    | ✅        |
| Edit pet info           | ✅    | ❌        |
| Delete pet              | ✅    | ❌        |
| Generate invite         | ✅    | ❌        |
| Manage caregivers       | ✅    | ❌        |
| Add/edit reminders      | ✅    | ✅        |
| View health docs        | ✅    | ✅        |

Apply `resolvePetRole` to all existing pet routes.

---

### App Entry Logic Update

Change startup check from "user owns at least 1 pet" to "user has at least 1 accessible pet":
```
Accessible = owns a pet (pets.user_id = userId)
          OR has an active pet_user_access row (revoked_at IS NULL)
```

If no accessible pets → show Setup Screen with two CTAs:
- **"Add a Pet"** → existing create flow
- **"Join via QR Code"** → open scanner

---

### React Native — Owner Flow

1. Pet Profile screen shows a **"Share Pet"** button — only rendered if `userRole === 'OWNER'`
2. Tap → bottom sheet opens with a single text input: **"Who are you sharing with?"** (this becomes the alias)
3. Confirm → call `POST /v1/pets/:petId/invite` with the alias
4. Transition to QR screen:
   - Render the returned `inviteId` UUID as a QR code using `react-native-qrcode-svg`
   - Display alias label e.g. "Sharing with: Mom"
   - Show a live countdown timer based on `expiresAt`
5. Pet Profile has a **"Caregivers"** section below pet info:
   - List active caregivers as rows showing `alias` and `grantedAt`
   - Each row has an edit alias button → calls `PATCH /v1/owner-contacts/:contactId`
   - Each row has a revoke button → calls `DELETE /v1/pets/:petId/caregivers/:accessId`

---

### React Native — Caregiver Flow

1. Entry points:
   - Setup Screen "Join via QR Code" button (for new users with no pets)
   - A menu option for existing users who already have pets
2. Open `expo-camera` with barcode scanning enabled
3. On scan: extract raw UUID string from QR data
4. Call `POST /v1/pet-shares/claim/:token`
5. On success:
   - Append returned pet to local pet list
   - If this is the user's first accessible pet, set it as default pet and navigate to Dashboard
6. On error: display the exact message from the server — `"Invalid code"`, `"Code expired or already used"`, `"You already have access to this pet"`, etc.

---

### Caregiver Access After Pet is Deceased or Soft Deleted

- If Owner marks the pet as `DECEASED`: Caregiver can still see the pet under a "Past Pets" section. Caregiver can view data but cannot edit anything.
- If Owner soft deletes the pet: the `pets` record is hidden. Caregiver will no longer see the pet at all since all queries should filter out soft-deleted pets.