# AI Chat Caregiver-Aware Pet Name Detection Implementation Plan

## 1. Objective

Enhance the AI Chat feature to:
1. Include caregiver (shared) pets in pet name detection - not just owned pets
2. Detect duplicate pet names when a user has multiple pets with the same name (owned + caregiver)
3. Disambiguate via a clarification flow when duplicates are detected
4. Include pet role context (OWNER/CAREGIVER) in AI responses
5. Remember resolved pets per session while supporting dynamic topic switching

## 2. Key Components to Modify

### 2.1 Files to Modify

| File | Changes |
|------|---------|
| `ai-chat-name-matcher.ts` | Add `detectAllPetsInQuery()` to return ALL matching pets (not just first) |
| `ai-chat-service.ts` | Main logic: fetch owned+shared pets, detect duplicates, trigger disambiguation, include role in context |
| `ai-chat-session-manager.ts` | Add `resolvedPetRole` to session tracking |
| `ai-chat-schema.ts` | Add `petClarificationSubmission` input type |
| `ai-chat-runtime-config.json` | Add disambiguation prompt template |

### 2.2 Database Queries Needed

- Fetch owned pets: `prisma.pets.findMany({ where: { user_id, status: 'ACTIVE' } })`
- Fetch shared pets: `prisma.pet_user_access.findMany({ where: { user_id, revoked_at: null }, include: { pet: true } })`

## 3. Implementation Steps

### Step 1: Update `ai-chat-name-matcher.ts`

Add a new function that returns ALL matching pets (for duplicate detection):

```typescript
export type PetMatch = {
  id: string;
  pet_name: string;
  role: 'OWNER' | 'CAREGIVER';
  ownerAlias?: string; // For caregiver pets: the owner's name/alias
};

/**
 * Detect ALL pets matching the query (for duplicate detection).
 * Returns empty array if no matches.
 */
export function detectAllPetsInQuery(
  query: string,
  pets: PetMatch[]
): PetMatch[] {
  const qLower = normalize(query);
  const matches = new Set<string>(); // Track matched pet IDs

  // Layer 1: Exact matches
  for (const pet of rankCandidates(pets)) {
    const nameLower = normalize(pet.pet_name);
    if (!nameLower) continue;
    if (isExactNameMatch(qLower, nameLower)) {
      matches.add(pet.id);
    }
  }

  // Layer 2: Fuzzy matches (only for pets not already matched)
  const unmatchedPets = pets.filter(p => !matches.has(p.id));
  for (const pet of rankCandidates(unmatchedPets)) {
    const name = normalize(pet.pet_name);
    if (!name || name.length < MIN_FUZZY_NAME_LENGTH) continue;

    const threshold = getThreshold(name);
    const windowSize = name.length;
    if (qLower.length < windowSize) continue;

    for (let i = 0; i <= qLower.length - windowSize; i++) {
      const window = qLower.slice(i, i + windowSize);
      if (levenshteinDistance(window, name) <= threshold) {
        matches.add(pet.id);
        break;
      }
    }
  }

  return pets.filter(p => matches.has(p.id));
}
```

**Why**: The existing `detectPetInQuery()` returns only the first match. We need ALL matches to detect duplicates.

---

### Step 2: Update `ai-chat-session-manager.ts`

Add `resolvedPetRole` to track the role of the currently resolved pet:

```typescript
export type SessionEntry = {
  chatSession: Chat;
  createdAt: number;
  lastActivityAt: number;
  turnCount: number;
  resolvedPetId?: string;
  resolvedPetRole?: 'OWNER' | 'CAREGIVER'; // NEW
  lastInjectedPetId?: string;
  lastInjectedPetRole?: 'OWNER' | 'CAREGIVER'; // NEW (for context injection tracking)
  activeContextId: string;
  contextStatus: SeverityContextStatus;
  severityLevel?: number;
  lastSymptomTopics: Set<string>;
  // NEW: Track if we're waiting for pet clarification
  pendingPetClarification?: {
    contextId: string;
    ambiguousPetIds: string[];
  };
};
```

**Why**: Session needs to remember both the resolved pet AND its role for context injection and disambiguation state.

---

### Step 3: Update `ai-chat-schema.ts`

Add pet clarification submission type:

```typescript
const petClarificationSubmissionSchema = z.object({
  contextId: z.uuid('Invalid contextId format'),
  selectedPetId: z.uuid('Invalid petId format'),
});

export const chatSchema = z.object({
  body: z.object({
    query: z.string().min(1, 'Query is required'),
    clientChatSessionId: z.uuid('clientChatSessionId must be a valid UUID'),
    resolvedPetId: z.uuid().optional(),
    contextId: z.uuid().optional(),
    severitySubmission: severitySubmissionSchema.optional(),
    petClarificationSubmission: petClarificationSubmissionSchema.optional(), // NEW
  }).superRefine((body, ctx) => {
    // Existing severity validation...
    
    // NEW: Validate pet clarification contextId matches
    if (
      body.petClarificationSubmission &&
      body.contextId &&
      body.petClarificationSubmission.contextId !== body.contextId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'petClarificationSubmission.contextId must match contextId',
        path: ['petClarificationSubmission', 'contextId'],
      });
    }
  }),
});

export type PetClarificationSubmissionInput = z.infer<typeof petClarificationSubmissionSchema>;
```

---

### Step 4: Update `ai-chat-service.ts` - Types

Add new types:

```typescript
type PetContextStatus =
  | 'not_required'
  | 'pending_clarification'
  | 'resolved';

type PetClarificationRequestData = {
  contextId: string;
  prompt: string;
  reason: 'ambiguous_pet_name';
  options: Array<{
    petId: string;
    petName: string;
    role: 'OWNER' | 'CAREGIVER';
    ownerAlias?: string;
  }>;
};

type ChatWithAIResult = {
  answer: string;
  resolvedPetId?: string;
  resolvedPetRole?: 'OWNER' | 'CAREGIVER'; // NEW
  severityFlag?: boolean;
  contextId: string;
  contextChanged?: boolean;
  contextStatus: SeverityContextStatus;
  petContextStatus?: PetContextStatus; // NEW
  petContextChanged?: boolean; // NEW
  severityRequest?: SeverityRequestData;
  clarificationRequest?: ClarificationRequestData;
  petClarificationRequest?: PetClarificationRequestData; // NEW
  severityLevel?: number;
};
```

---

### Step 5: Update `ai-chat-service.ts` - Pet Fetching

Replace the single pet fetch with combined owned + shared pets:

```typescript
// -----------------------------------------------------------------------
// 1. Fetch ALL accessible pets for this user (owned + shared)
// -----------------------------------------------------------------------
const [ownedPets, sharedAccesses] = await Promise.all([
  prisma.pets.findMany({
    where: { user_id: userId, status: 'ACTIVE' },
    select: { 
      id: true, 
      pet_name: true,
      user: { select: { id: true } }, // To identify owner
    },
  }),
  prisma.pet_user_access.findMany({
    where: { 
      user_id: userId, 
      revoked_at: null,
      pet: { status: 'ACTIVE' }
    },
    include: {
      pet: { select: { id: true, pet_name: true } },
      contact: { select: { alias: true } }, // Owner's alias
    },
  }),
]);

// Combine into PetMatch array
const userPets: PetMatch[] = [
  ...ownedPets.map(p => ({
    id: p.id,
    pet_name: p.pet_name,
    role: 'OWNER' as const,
  })),
  ...sharedAccesses.map(access => ({
    id: access.pet.id,
    pet_name: access.pet.pet_name,
    role: 'CAREGIVER' as const,
    ownerAlias: access.contact.alias,
  })),
];

logger.info(`[AI Chat] Loaded ${ownedPets.length} owned + ${sharedAccesses.length} shared pets for user ${userId.slice(0, 8)}…`);
```

---

### Step 6: Update `ai-chat-service.ts` - Duplicate Detection Logic

Add pet disambiguation state derivation (similar to severity context):

```typescript
const derivePetContextState = (
  session: SessionEntry,
  detectedPets: PetMatch[],
  incomingResolvedPetId: string | undefined,
  petClarificationSubmission: PetClarificationSubmissionInput | undefined,
  incomingContextId: string | undefined,
): {
  effectiveContextId: string;
  petContextStatus: PetContextStatus;
  petContextChanged: boolean;
  resolvedPet: PetMatch | undefined;
  ambiguousPets: PetMatch[];
  petClarificationRequest?: PetClarificationRequestData;
} => {
  // If user is submitting a pet clarification selection
  if (petClarificationSubmission) {
    const selectedPet = detectedPets.find(p => p.id === petClarificationSubmission.selectedPetId);
    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      petContextStatus: 'resolved',
      petContextChanged: false,
      resolvedPet: selectedPet,
      ambiguousPets: [],
    };
  }

  // If no pets detected at all
  if (detectedPets.length === 0) {
    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      petContextStatus: 'not_required',
      petContextChanged: false,
      resolvedPet: undefined,
      ambiguousPets: [],
    };
  }

  // If only one pet detected (or user previously resolved this pet)
  if (detectedPets.length === 1) {
    const singlePet = detectedPets[0];
    
    // Check if this is a new pet vs continuing with same pet
    const isSamePet = session.resolvedPetId === singlePet.id;
    
    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      petContextStatus: 'resolved',
      petContextChanged: !isSamePet,
      resolvedPet: singlePet,
      ambiguousPets: [],
    };
  }

  // Multiple pets detected (DUPLICATE NAME SCENARIO)
  // Check if session already resolved one of these ambiguous pets
  const sessionPetStillValid = detectedPets.find(p => p.id === session.resolvedPetId);
  
  if (sessionPetStillValid) {
    // User is continuing to talk about the same ambiguous pet - no need to re-clarify
    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      petContextStatus: 'resolved',
      petContextChanged: false,
      resolvedPet: sessionPetStillValid,
      ambiguousPets: detectedPets, // Still pass for info
    };
  }

  // NEW ambiguous scenario - need clarification
  const newContextId = uuidv4();
  const petName = detectedPets[0].pet_name; // All have same name

  // Build options for the frontend to display
  const options = detectedPets.map((p) => ({
    petId: p.id,
    petName: p.pet_name,
    role: p.role,
  }));

  // Find owned and caregiver options for the prompt
  const ownedOption = options.find((o) => o.role === 'OWNER');
  const caregiverOptions = options.filter((o) => o.role === 'CAREGIVER');

  // Build the disambiguation prompt
  let prompt: string;
  if (ownedOption && caregiverOptions.length === 1) {
    prompt = `คุณหมายถึง ${petName} ที่เป็นสัตว์เลี้ยงของคุณ หรือ ${petName} ที่คุณเป็นผู้ดูแล?`;
  } else {
    prompt = `คุณหมายถึง ${petName} ตัวไหนครับ?`;
  }

  const clarificationRequest: PetClarificationRequestData = {
    contextId: newContextId,
    prompt,
    reason: 'ambiguous_pet_name',
    options,
  };

  return {
    effectiveContextId: newContextId,
    petContextStatus: 'pending_clarification',
    petContextChanged: true,
    resolvedPet: undefined,
    ambiguousPets: detectedPets,
    petClarificationRequest: clarificationRequest,
  };
};
```

---

### Step 6.5: Update `ai-chat-service.ts` - LLM Disambiguation (NEW)

When multiple pets with the same name are detected, try LLM disambiguation before returning clarification prompt:

```typescript
/**
 * Disambiguates between multiple pets with the same name using LLM.
 * Called when L1+L2 detect multiple pets (e.g., owned "Jiggo" and caregiver "Jiggo").
 */
const disambiguatePetWithLLM = async (
  query: string,
  ambiguousPets: PetMatch[],
  sessionHistory: string,
  traceId: string,
  metrics: AIRequestMetrics
): Promise<PetMatch | null> => {
  if (ambiguousPets.length < 2) return ambiguousPets[0] ?? null;

  const petListStr = ambiguousPets
    .map((p) => `- "${p.pet_name}" (${p.role}${p.ownerAlias ? `, owner: ${p.ownerAlias}` : ''})`)
    .join('\n');

  const disambiguationPrompt = `You are analyzing a user message to determine which pet they are referring to.

There are ${ambiguousPets.length} pets with the same name "${ambiguousPets[0].pet_name}":
${petListStr}

User message: "${query}"

Recent conversation context:
${sessionHistory || '(No previous context)'}

Analyze the user's message carefully. Look for:
1. Explicit role mentions (e.g., "ที่ฉันดูแล", "ของฉัน", "ผู้ดูแล", "เจ้าของ")
2. Implicit context from conversation history
3. Ownership indicators or caregiving references

Which pet is the user referring to? Reply with ONLY the role (OWNER or CAREGIVER) that best matches the user's intent.

If you cannot determine or it's ambiguous, reply with "UNKNOWN".

Reply with exactly one word: OWNER, CAREGIVER, or UNKNOWN.`;

  try {
    metrics.geminiTextCalls += 1;
    logger.info(`[AI Chat][${traceId}] Gemini text call #${metrics.geminiTextCalls} (pet disambiguation) started.`);

    const response = await llm.invoke(disambiguationPrompt);
    const usage = extractGeminiUsage(response);
    addUsageToMetrics(metrics, usage);

    const raw = (response.content as string).trim().toUpperCase();

    if (raw === 'UNKNOWN' || !raw) {
      logger.info(`[AI Chat][${traceId}] LLM disambiguation: ambiguous, returning null`);
      return null;
    }

    const matchedPet = ambiguousPets.find((p) => p.role === raw);

    if (matchedPet) {
      logger.info(`[AI Chat][${traceId}] LLM disambiguation: resolved to ${raw} pet "${matchedPet.pet_name}"`);
      return matchedPet;
    }

    return null;
  } catch (error) {
    logger.error(`[AI Chat][${traceId}] LLM disambiguation failed:`, error as Error);
    return null;
  }
};
```

**Integration in main flow:**

```typescript
// After derivePetContextState returns pending_clarification
if (petContextStatus === 'pending_clarification' && ambiguousPets.length >= 2) {
  const disambiguatedPet = await disambiguatePetWithLLM(
    normalizedQuery,
    ambiguousPets,
    session.turnCount > 0 ? 'Session has previous conversation context' : '',
    traceId,
    metrics
  );

  if (disambiguatedPet) {
    // LLM resolved it - skip clarification prompt
    finalResolvedPet = disambiguatedPet;
    finalPetContextStatus = 'resolved';
    finalPetContextChanged = session.resolvedPetId !== disambiguatedPet.id;
  } else {
    // Still ambiguous - return clarification prompt
    return { answer: petClarificationRequest.prompt, ... };
  }
}
```

---

### Step 7: Update `ai-chat-service.ts` - Build Pet Context with Role

Enhance `buildPetContext()` to include role information:

```typescript
const buildPetContext = async (
  petId: string, 
  role: 'OWNER' | 'CAREGIVER',
  ownerAlias?: string
): Promise<string> => {
  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    include: {
      species: true,
      breeds: true,
      reminders: {
        where: { reminder_status: 'done', is_health: true },
        orderBy: { status_done_at: 'desc' },
        take: 10,
      },
    },
  });

  if (!pet) return '';

  const formattedAge = formatBirthDateToYearsMonths(pet.birth_date);
  const healthHistory = pet.reminders
    .map((r) => `- ${r.reminder_name} (Date: ${r.status_done_at?.toISOString().split('T')[0]})`)
    .join('\n');

  // Build role context string
  let roleContext: string;
  if (role === 'OWNER') {
    roleContext = 'Role: OWNER (คุณเป็นเจ้าของสัตว์เลี้ยงตัวนี้)';
  } else {
    roleContext = `Role: CAREGIVER (คุณเป็นผู้ดูแลสัตว์เลี้ยงตัวนี้ให้กับ ${ownerAlias || 'เจ้าของ'})`;
  }

  return `
--- CURRENT PET PROFILE ---
Name: ${pet.pet_name}
${roleContext}
Species: ${pet.species.name}
Breed: ${pet.breeds?.name || 'Unknown'}
Gender: ${pet.gender}
Age: ${formattedAge}
Weight: ${pet.weight || 'Unknown'} kg

Recent Health History (Vaccines/Checkups):
${healthHistory || 'No recent health records.'}
---------------------------
  `.trim();
};
```

**Why**: AI needs to know the user's relationship to the pet to give appropriate advice (e.g., "please inform the owner" vs direct recommendations).

---

### Step 8: Update `ai-chat-service.ts` - Main Chat Flow Integration

Integrate pet disambiguation into the main `chatWithAI()` flow:

```typescript
export const chatWithAI = async (
  input: ChatWithAIInput
): Promise<ChatWithAIResult> => {
  const {
    query,
    userId,
    installationId,
    clientChatSessionId,
    resolvedPetId: incomingResolvedPetId,
    contextId,
    severitySubmission,
    petClarificationSubmission, // NEW
  } = input;

  // ... existing setup code ...

  // -----------------------------------------------------------------------
  // 2. Detect ALL matching pets (not just first match)
  // -----------------------------------------------------------------------
  const detectedPets = detectAllPetsInQuery(normalizedQuery, userPets);
  
  logger.info(`[AI Chat] Pet detection: ${detectedPets.length} matches found`);
  detectedPets.forEach(p => {
    logger.info(`[AI Chat]   - "${p.pet_name}" (${p.role}${p.ownerAlias ? ` for ${p.ownerAlias}` : ''})`);
  });

  // -----------------------------------------------------------------------
  // 3. Derive pet context state (disambiguation logic)
  // -----------------------------------------------------------------------
  const {
    effectiveContextId,
    petContextStatus,
    petContextChanged,
    resolvedPet,
    ambiguousPets,
    petClarificationRequest,
  } = derivePetContextState(
    session,
    detectedPets,
    incomingResolvedPetId,
    petClarificationSubmission,
    incomingContextId,
  );

  // If we need clarification, return early (similar to severity clarification)
  if (petContextStatus === 'pending_clarification' && petClarificationRequest) {
    // Update session to track pending clarification
    session.pendingPetClarification = {
      contextId: effectiveContextId,
      ambiguousPetIds: ambiguousPets.map(p => p.id),
    };
    session.activeContextId = effectiveContextId;

    logger.info(`[AI Chat][${traceId}] Ambiguous pet detected. Returning clarification prompt.`);

    return {
      answer: petClarificationRequest.prompt,
      contextId: effectiveContextId,
      contextStatus: 'not_required', // Severity not relevant yet
      petContextStatus,
      petContextChanged: true,
      petClarificationRequest,
    };
  }

  // -----------------------------------------------------------------------
  // 4. Build pet context with role (if resolved)
  // -----------------------------------------------------------------------
  let petContext = '';
  let hasPetProfileContext = false;
  let petProfileSkipped = false;

  if (resolvedPet) {
    const isNewPetForSession = 
      resolvedPet.id !== session.lastInjectedPetId || 
      resolvedPet.role !== session.lastInjectedPetRole;

    if (isNewPetForSession) {
      petContext = await buildPetContext(resolvedPet.id, resolvedPet.role, resolvedPet.ownerAlias);
      hasPetProfileContext = petContext.length > 0;
      logger.info(`[AI Chat][${traceId}] Pet profile injected: ${resolvedPet.pet_name} (${resolvedPet.role})`);
    } else {
      petProfileSkipped = true;
      logger.info(`[AI Chat][${traceId}] Pet profile skipped - same pet continues`);
    }
  }

  // ... rest of the flow (RAG, Gemini call, etc.) ...

  // -----------------------------------------------------------------------
  // 5. Update session with resolved pet (for future turns)
  // -----------------------------------------------------------------------
  if (resolvedPet) {
    session.resolvedPetId = resolvedPet.id;
    session.resolvedPetRole = resolvedPet.role;
    if (hasPetProfileContext) {
      session.lastInjectedPetId = resolvedPet.id;
      session.lastInjectedPetRole = resolvedPet.role;
    }
  }
  
  // Clear pending clarification if resolved
  if (petContextStatus === 'resolved') {
    session.pendingPetClarification = undefined;
  }

  // ... return result ...
};
```

---

### Step 9: Update `ai-chat-runtime-config.json`

Add disambiguation prompt to the config file:

```json
{
  "system_instruction_lines": [
    // ... existing instructions ...
    "",
    "Pet Role Context:",
    "- When a CURRENT PET PROFILE includes 'Role: OWNER', the user is the pet's owner.",
    "- When it includes 'Role: CAREGIVER', the user is caring for someone else's pet.",
    "- For caregivers: acknowledge their role and suggest informing the owner when relevant.",
    "- Do not tell caregivers to make final decisions that should come from the owner."
  ],
  // ... existing symptom_topic_groups, normal_care_keywords, etc. ...
  "pet_disambiguation_prompt": "คุณหมายถึง {petName} (สัตว์เลี้ยงของคุณ) หรือ {petName} (สัตว์เลี้ยงที่คุณเป็นผู้ดูแล)?",
  "pet_disambiguation_options_template": [
    "{petName} (ของฉัน)",
    "{petName} (ที่ฉันดูแล)"
  ]
}
```

---

## 4. API Contract Changes

### Request Body (POST /v1/ai-chat)

```typescript
{
  query: string;
  clientChatSessionId: string;
  resolvedPetId?: string;        // Used if user selects from clarification
  contextId?: string;
  severitySubmission?: {
    contextId: string;
    level: number;
    label?: string;
  };
  petClarificationSubmission?: {  // NEW
    contextId: string;
    selectedPetId: string;
  };
}
```

### Response Body

```typescript
{
  answer: string;
  resolvedPetId?: string;
  resolvedPetRole?: 'OWNER' | 'CAREGIVER';  // NEW
  severityFlag?: boolean;
  contextId: string;
  contextChanged?: boolean;
  contextStatus: 'not_required' | 'pending_clarification' | 'pending_severity' | 'resolved';
  petContextStatus?: 'not_required' | 'pending_clarification' | 'resolved';  // NEW
  petContextChanged?: boolean;  // NEW
  severityRequest?: {
    contextId: string;
    prompt: string;
    reason: string;
  };
  clarificationRequest?: {
    contextId: string;
    prompt: string;
    reason: string;
    options: string[];
  };
  petClarificationRequest?: {  // NEW
    contextId: string;
    prompt: string;
    reason: 'ambiguous_pet_name';
    options: Array<{
      petId: string;
      petName: string;
      role: 'OWNER' | 'CAREGIVER';
      ownerAlias?: string;
    }>;
  };
  severityLevel?: number;
}
```

---

## 5. Example Flows

### Flow 1: Single Pet (No Disambiguation Needed)

```
User: "Snow กินอะไรดี"
↓
Detected: [Snow (OWNER)]
↓
AI Response: "สำหรับ Snow สุนัขพันธุ์..." (with pet profile context)
```

### Flow 2: Duplicate Names - First Mention

```
User: "Snow เป็นไงบ้าง"  (User has Snow(OWNER) + Snow(CAREGIVER for John))
↓
Detected: [Snow (OWNER), Snow (CAREGIVER)]
↓
Response: {
  answer: "คุณหมายถึง Snow (สัตว์เลี้ยงของคุณ) หรือ Snow (สัตว์เลี้ยงที่คุณเป็นผู้ดูแล)?",
  petContextStatus: 'pending_clarification',
  petClarificationRequest: {
    options: [
      { petId: 'uuid1', petName: 'Snow', role: 'OWNER' },
      { petId: 'uuid2', petName: 'Snow', role: 'CAREGIVER', ownerAlias: 'John' }
    ]
  }
}
↓
User selects: uuid2 (caregiver Snow)
↓
Request: { petClarificationSubmission: { contextId: '...', selectedPetId: 'uuid2' } }
↓
AI Response: "Snow ที่คุณดูแลให้ John..." (with CAREGIVER role context)
```

### Flow 3: Duplicate Names - Follow-up (Same Pet)

```
User: "Snow เป็นไงบ้าง"  → Clarification → Selects caregiver Snow
↓
(Continuing same session)
User: "Snow กินอาหารเม็ดยี่ห้อไหนดี"
↓
Detected: [Snow (OWNER), Snow (CAREGIVER)]
↓
Session has resolvedPetId = uuid2 (caregiver)
↓
AI continues with caregiver Snow (no re-clarification needed)
```

### Flow 4: Topic Switch to Same-Name Pet (LLM Disambiguation)

```
(After talking about owned Jiggo)
User: "แล้วจิ๊กโก๋ที่ฉันดูแลล่ะ กินอาหารเหมือนกันไหม"
↓
Detected: [Jiggo (OWNER), Jiggo (CAREGIVER)]
↓
Session has resolvedPetId = owned Jiggo, but query mentions "ที่ฉันดูแล"
↓
LLM Disambiguation: Analyzes "ที่ฉันดูแล" → returns CAREGIVER
↓
AI continues with caregiver Jiggo (no clarification prompt!)
↓
AI Response: "สำหรับจิ๊กโก๋ที่คุณดูแล..." (with CAREGIVER role context)
```

### Flow 5: Topic Switch (Different Name Pet)

```
(After talking about caregiver Snow)
User: "Buddy เป็นไงบ้าง"  (User has Buddy(OWNER) only)
↓
Detected: [Buddy (OWNER)]
↓
Different pet detected → Switch context
↓
AI Response: "Buddy สัตว์เลี้ยงของคุณ..." (with OWNER role context)
```

---

## 6. Edge Cases Handled

| Edge Case | Behavior |
|-----------|----------|
| No pets match | No pet context injected (same as current behavior) |
| Single owned pet | Normal flow, role = OWNER |
| Single caregiver pet | Normal flow, role = CAREGIVER |
| Duplicate names, first mention | **LLM disambiguation** → if ambiguous, then clarification prompt |
| Duplicate names, explicit role hint | LLM detects role (e.g., "ที่ฉันดูแล" → CAREGIVER), no prompt |
| Duplicate names, follow-up | Session remembers, no re-prompt |
| User switches to different pet | Detects as new pet, switches context |
| User mentions BOTH pets in same query | Returns disambiguation for first ambiguous match |
| Caregiver access revoked mid-session | Next query will detect remaining accessible pets only |
| LLM disambiguation fails | Falls back to clarification prompt (graceful degradation) |

---

## 7. Testing Checklist

- [ ] Fetch pets includes both owned and shared pets
- [ ] `detectAllPetsInQuery()` returns multiple matches for duplicate names
- [ ] **LLM disambiguation** resolves ambiguous pet when user mentions role hint (e.g., "ที่ฉันดูแล")
- [ ] Disambiguation prompt shown only when LLM cannot resolve ambiguity
- [ ] Pet clarification submission resolves ambiguity
- [ ] Session remembers resolved pet (no re-clarification on follow-up)
- [ ] Topic switch to different pet works correctly
- [ ] Topic switch to same-name pet (via LLM disambiguation) works correctly
- [ ] Pet context includes role information
- [ ] AI responses acknowledge caregiver role appropriately
- [ ] Layer 3 LLM extraction works with enhanced PetMatch type
- [ ] Concurrent severity + pet clarification handled correctly
- [ ] LLM disambiguation graceful fallback when LLM fails

---

## 8. Migration Notes

- No database migration required
- Config file update: Add `pet_disambiguation_prompt` to `ai-chat-runtime-config.json`
- Session cache will naturally clear on deployment (in-memory)
- Backward compatible: Frontend can ignore new `petClarificationRequest` field

---

## Summary

This implementation:
1. **Reuses existing patterns** (severity clarification flow)
2. **Maintains flexibility** (session remembers, supports topic switching)
3. **Enhances AI context** (role-aware responses)
4. **Handles duplicates gracefully** (LLM disambiguation first, explicit clarification as fallback)
5. **Intelligent disambiguation** (LLM analyzes role hints like "ที่ฉันดูแล" or "ของฉัน")
6. **No breaking changes** (additive API changes only)

**Key Technical Addition:**
- `disambiguatePetWithLLM()`: Uses Gemini to analyze user queries for role indicators before returning a clarification prompt. This reduces user friction for the common case where users explicitly mention which pet they mean (e.g., "จิ๊กโก๋ที่ฉันดูแล").
