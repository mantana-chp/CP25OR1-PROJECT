# AI Chat Pinecone Enhancement Plan

Last updated: 2026-04-12
Owner: Backend AI Chat
Scope: backend/src/features/ai-chat/ai-chat-service.ts, backend/src/scripts/ingest-vaccines.ts

## 1) Current Pinecone: What It Is Doing Now

Current role in AI chat:
- Pinecone is used as a per-turn RAG retriever.
- It is not chat memory and not severity context state storage.
- Chat memory comes from Gemini chat session plus in-memory session metadata.

Current data source:
- Pinecone vectors are created from vaccine records in the DB.
- Ingestion script builds a vaccine description string and embeds it.
- Metadata saved with each vector includes at least:
- text
- type=vaccine
- species
- vaccine_id

Current runtime flow (non-clarification turns):
1. Build modelQuery from user query (includes severity prefix if submitted).
2. Run similaritySearchWithScore(modelQuery, 3).
3. Filter by threshold (>= 0.5).
4. Convert docs to knowledgeBaseContext text.
5. Inject that text into prompt block: KNOWLEDGE BASE (Reference Only - Ignore if irrelevant to question).
6. Send final prompt into Gemini chat session.

Why it can feel low-value now:
- Corpus is mostly vaccine guidance, but many user turns are symptom triage.
- Retrieval still runs on symptom and severity-submission turns, so vaccine snippets can be unrelated.
- No query-time species filtering is applied yet, even though species metadata exists in vectors.
- Extra retrieval content increases prompt tokens and may add noise.

## 2) More Enhanced Implementation (Easy + Efficient)

Goal:
- Keep Pinecone, but only use it when it is likely useful.
- Reduce noise and token cost quickly with minimal code changes.

### Change A: Add an intent gate before Pinecone retrieval (Highest ROI)

What to do:
- Run Pinecone only when query is normal-care or vaccine-oriented.
- Skip Pinecone on symptom turns and severity-submission turns.
- Reuse existing queryIntent and existing vaccine-like keywords in runtime config.

Minimal rule set:
- shouldUsePinecone = queryIntent === normal AND not isSeveritySubmissionTurn AND query contains vaccine/routine keyword.
- If shouldUsePinecone is false:
- Do not call similaritySearchWithScore.
- Set pineconeRelevantDocs = 0.
- Continue chat normally without KNOWLEDGE BASE section.

Expected impact:
- Fastest response and lowest token reduction improvement.
- Lower chance of irrelevant vaccine context in symptom replies.

Estimated effort:
- About 20-40 minutes.

### Change B: Tighten retrieval knobs (Very easy)

What to do:
- Reduce topK from 3 to 2.
- Increase threshold from 0.5 to around 0.7.

Expected impact:
- Fewer weak matches enter prompt.
- Better precision with almost no architectural change.

Estimated effort:
- About 5-10 minutes.

### Change C: Add species filter using existing metadata (Still simple)

What to do:
- Use resolved pet species (if available) to keep only matching docs.
- If species cannot be resolved, fallback to unfiltered behavior.

Practical filter logic:
- If pet species is cat: keep docs where metadata.species indicates cat.
- If pet species is dog: keep docs where metadata.species indicates dog.
- Keep small fallback when zero docs survive filtering (optional).

Expected impact:
- Prevents cat vaccines in dog answers and vice versa.
- Improves trust and relevance for vaccine recommendations.

Estimated effort:
- About 30-60 minutes.

Recommended execution order (time-limited):
1. Change A (intent gate)
2. Change B (threshold/topK)
3. Change C (species filter)

Definition of done (quick validation):
- Symptom query: no Pinecone retrieval log, no KNOWLEDGE BASE block injected.
- Vaccine query: Pinecone retrieval runs and relevant docs count > 0 when data exists.
- Cat vaccine query: only cat docs appear in context (same for dog).
- Session usage summary shows reduced average prompt tokens on symptom traffic.
