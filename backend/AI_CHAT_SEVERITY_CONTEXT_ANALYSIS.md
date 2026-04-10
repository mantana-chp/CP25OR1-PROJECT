# AI Chat Severity Context Analysis

Last updated: 2026-04-10

## Scope
This note documents:
- Current severity-context behavior in AI chat
- Newly discovered pet-resolution issue during severity testing
- Why it happened
- How to fix it safely before implementing multi-context severity

## Current Severity Behavior (Now)
The backend currently uses a marker-based flow:
1. AI response can include a hidden marker [NEEDS_SEVERITY]
2. Backend strips this marker and returns severityFlag: true
3. Frontend shows severity widget
4. Frontend sends a follow-up user message in this format:
   [SEVERITY: X/5] <original symptom query>

Key files:
- src/features/ai-chat/ai-chat-service.ts
- src/features/ai-chat/ai-chat-schema.ts
- src/features/ai-chat/ai-chat-name-matcher.ts

## New Issue Found During Test
Observed response after first symptom request:
- resolvedPetId returned: 479fb2e0-7cce-40f2-95d9-27e1fa6b8fc9
- resolved pet profile is a cat named "v"
- user query context was about a dog

This indicates a false positive in pet-name detection, not a severity parser issue.

## Why This Happened
Root cause is in pet detection layers (before severity logic):

1. Layer 1 exact substring match is too permissive for very short names
- exactMatch uses query.includes(pet_name)
- pet name "v" matches many normal English symptom messages containing letter "v" (for example: vomit, severe, etc.)
- result: wrong pet gets selected immediately

2. Layer 2 fuzzy matching is also permissive for short names
- name length <= 3 allows edit distance threshold 1
- for 1-character names, many windows can pass threshold
- this increases accidental matches

3. Resolution precedence favors first detected pet
- once detectedPet exists, service trusts it and sets finalResolvedPetId
- severity flow then runs with wrong pet context

## Impact on Severity Context Feature
Severity logic quality depends on correct pet context.
If pet resolution is wrong:
- AI triage may use wrong species/profile context
- severity advice can be less accurate
- multi-context severity implementation will inherit this error and become harder to debug

## Recommended Fix (Before Multi-Context Rollout)

### A) Harden exact matching for short names
- Do not allow naive substring matching for names shorter than 2 characters
- For 1-char names, require strict token/boundary match only
- For Latin names, use word boundaries when possible

### B) Harden fuzzy matching for short names
- Disable fuzzy matching for names shorter than 3 characters
- Keep fuzzy only for realistic lengths (>= 3)

### C) Add confidence and ambiguity guard
- If match confidence is low, do not auto-resolve pet
- Return unresolved state and let AI proceed without pet-specific profile, or ask user to confirm pet

### D) Add species-aware hinting (optional but valuable)
- If query contains explicit species cues (dog/cat/หมา/แมว), down-rank pets of other species
- Requires fetching species data in candidate list

### E) Instrument logs for diagnosis
- Log which layer matched (L1/L2/L3), matched token/window, confidence score
- This allows auditing false positives in production

## Suggested Implementation Order
1. Update matcher rules in src/features/ai-chat/ai-chat-name-matcher.ts
2. Update candidate fetch in src/features/ai-chat/ai-chat-service.ts to include species if using species-aware ranking
3. Add confidence result type from matcher (instead of raw first-match)
4. Add tests for short-name edge cases

## High-Priority Test Cases After Fix
1. Pet name is one character ("v"), query: "น้องหมาอาเจียน"
- Expected: should not auto-resolve to cat "v"

2. Pet name is one character ("v"), query: "my dog vomits"
- Expected: should not auto-resolve from letter "v" in "vomits"

3. Normal Thai exact name query
- Query: "บลูไม่กินข้าว"
- Expected: exact match still works

4. Thai typo fuzzy case
- Query: "บลุป่วยไหม"
- Expected: fuzzy still works for real names length >= 3

## Notes for Multi-Context Severity Design
After pet matching is stabilized, proceed with context-scoped severity:
- request carries contextId
- response echoes contextId
- one severity submission per request
- backend rotates contextId when symptom context changes
- severity is tracked per contextId, not globally per session
