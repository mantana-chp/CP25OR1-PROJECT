# AI Chat Severity Context Analysis

Last updated: 2026-04-10

## Scope
This note documents the backend status after implementing context-aware severity behavior:
- Context ID lifecycle for AI chat severity
- Structured severity submission support
- Context rotation when symptom context changes
- Backward compatibility with legacy severity format
- Pet name detection hardening and AI usage logging

## Implemented Changes

### 1) Context-aware severity contract (implemented)
Request now supports:
- contextId (optional UUID)
- severitySubmission (optional)
   - contextId (UUID)
   - level (1-5)
   - label (optional)

Response now returns:
- contextId (always returned)
- contextChanged (true when backend rotates context)
- contextStatus: not_required | pending_clarification | pending_severity | resolved
- severityRequest (when pending severity)
   - contextId
   - prompt
   - reason: symptom_needs_assessment | new_symptom_context
- clarificationRequest (when pending clarification)
   - contextId
   - prompt
   - reason: ambiguous_health_query
   - options
- severityFlag (kept for backward compatibility)

Files:
- src/features/ai-chat/ai-chat-schema.ts
- src/features/ai-chat/ai-chat-controller.ts
- src/features/ai-chat/ai-chat-service.ts

### 2) Context rotation logic (implemented)
When a new symptom topic is detected and does not overlap with the latest symptom topic in history, backend rotates to a new contextId and sets contextChanged=true.

### 3) Legacy compatibility (implemented)
The existing format is still supported:
- [SEVERITY: X/5] <query>

Structured severitySubmission and legacy severity prefix both resolve contextStatus=resolved for that turn.

### 4) Pet matcher hardening (implemented)
False positives from short names were addressed:
- No exact auto-match for very short names
- No fuzzy match for very short names
- Safer boundary matching for Latin names
- Candidate ranking prefers longer names first

File:
- src/features/ai-chat/ai-chat-name-matcher.ts

### 5) AI usage observability (implemented)
Backend now logs:
- Per-request traceId
- Gemini text call count
- Pinecone + embedding call count
- Gemini token usage per call (prompt/completion/total when metadata is available)
- Per-request summary totals

File:
- src/features/ai-chat/ai-chat-service.ts

### 6) Query intent routing to protect normal chat (implemented)
Backend now classifies query intent before severity actions:
- symptom
- ambiguous_health
- normal

Behavior:
- normal -> contextStatus=not_required (no severity prompt)
- ambiguous_health -> contextStatus=pending_clarification (asks one short clarification prompt first)
- symptom -> severity flow continues (pending_severity/resolved)

This prevents forcing severity for normal care questions.

### 7) Backend-owned severity gate (implemented)
Severity prompting is now strictly backend state-driven:
- severityFlag is set from backend state only (pending_severity)
- if model emits [NEEDS_SEVERITY] unexpectedly in non-severity states, marker is stripped and ignored

### 8) Runtime-config externalization (implemented)
AI chat runtime behavior is now loaded from JSON (same pattern as health-alert keyword loader):
- config file: config/ai-chat-runtime-config.json
- loader: src/features/ai-chat/ai-chat-config-loader.ts

Externalized items:
- system_instruction_lines (LLM system prompt)
- symptom_topic_groups
- normal_care_keywords
- health_ambiguous_hint_keywords
- clarification_prompt
- clarification_options

This allows production tuning without editing ai-chat-service.ts.

## Current Behavior After Implementation

1. Client sends query (+ optional contextId/history/resolvedPetId).
2. Backend normalizes query and parses legacy severity prefix if present.
3. Backend resolves active contextId:
- Reuses incoming contextId when valid
- Creates a new contextId if missing
- Rotates to a new contextId when symptom context shift is detected
4. Backend determines contextStatus:
- not_required: non-symptom turn
- pending_clarification: health-like but unclear symptom context
- pending_severity: symptom turn without resolved severity for active context
- resolved: severity submission provided this turn (structured or legacy)
5. Backend builds AI prompt with a SEVERITY CONTEXT block that tells the model whether it must append [NEEDS_SEVERITY].
6. Response includes context metadata and backward-compatible severityFlag.

## Notes and Limitations

1. The system is still stateless on backend request boundaries.
2. Context-shift detection is heuristic (keyword/topic overlap), not semantic clustering.
3. severityFlag remains in response for existing frontend behavior while context-aware fields are available for migration.
4. Symptom and ambiguous-health detection currently relies on curated keyword rules in code.
5. Runtime config is cached in memory for performance and reloaded from disk after cache expiration or explicit reload.

## Suggested API Test Sequence

1. Start symptom (no contextId)
- Expect: new contextId, contextStatus=pending_severity, severityRequest present

2. Submit severity for same context
- Send severitySubmission with same contextId and level
- Expect: contextStatus=resolved, no severityRequest

3. Ask different symptom in same session with previous contextId
- Expect: contextChanged=true and new contextId
- Expect: contextStatus=pending_severity for new context

4. Ask ambiguous health query with no direct symptom keyword
- Example: "น้องดูไม่ปกติ"
- Expect: contextStatus=pending_clarification
- Expect: clarificationRequest present

5. Ask normal care query
- Example: "ควรให้อาหารวันละกี่มื้อ"
- Expect: contextStatus=not_required and no severity request

## Next Recommended Step

Migrate frontend severity widget flow to use severityRequest/contextId/severitySubmission directly (instead of relying only on severityFlag + legacy [SEVERITY] text messages).
