# AI Chat Cost Worksheet (Gemini 2.5 Flash)

Last updated: 2026-04-11

## Purpose
Use this worksheet to estimate text-generation cost for each AI chat request using backend logs.

This worksheet is based on paid-tier pricing discussed for Gemini 2.5 Flash:
- Input price: 0.30 USD per 1,000,000 tokens
- Output price (including thinking tokens): 2.50 USD per 1,000,000 tokens

## Which Log Line to Use
Use the per-request summary log from AI chat service:
- [AI Chat][<traceId>] Session usage summary: ... tokens{prompt=<n>, completion=<n>, total=<n>} ...

This already aggregates all text calls in the request path (for example Layer 3 pet extraction + main chat response).

## Worksheet A: Per Request Cost
Fill values from one Session usage summary log line.

1. prompt_tokens = ______
2. completion_tokens = ______
3. total_tokens = ______

4. billed_output_tokens = MAX(total_tokens - prompt_tokens, completion_tokens)
5. input_cost_usd = (prompt_tokens / 1000000) * 0.30
6. output_cost_usd = (billed_output_tokens / 1000000) * 2.50
7. request_cost_usd = input_cost_usd + output_cost_usd

Notes:
- Output price includes thinking tokens.
- Thinking tokens are usually not shown separately, so billed_output_tokens is estimated from totals.

## Worksheet B: Daily and Monthly Projection
1. avg_request_cost_usd = ______
2. requests_per_day = ______

3. daily_cost_usd = avg_request_cost_usd * requests_per_day
4. monthly_cost_usd_30d = daily_cost_usd * 30

## Worksheet C: Scenario With/Without Layer 3
Use this to compare cost impact of pet extraction calls.

### Scenario 1: No Layer 3
- avg_request_cost_usd = ______
- requests_per_day = ______
- daily_cost_usd = ______

### Scenario 2: With Layer 3 Often Triggered
- avg_request_cost_usd = ______
- requests_per_day = ______
- daily_cost_usd = ______

### Difference
- extra_daily_cost_usd = scenario2_daily - scenario1_daily

## Example (Sample Numbers)
Given:
- prompt_tokens = 1800
- completion_tokens = 420
- total_tokens = 2500

Then:
- billed_output_tokens = MAX(2500 - 1800, 420) = 700
- input_cost_usd = 1800 / 1000000 * 0.30 = 0.00054
- output_cost_usd = 700 / 1000000 * 2.50 = 0.00175
- request_cost_usd = 0.00229

If 200 requests/day:
- daily_cost_usd = 0.00229 * 200 = 0.458
- monthly_cost_usd_30d = 13.74

## Optional Google Sheets Formula Snippets
Assume:
- B2 = prompt_tokens
- B3 = completion_tokens
- B4 = total_tokens

Use:
- B5 (billed_output_tokens): =MAX(B4-B2,B3)
- B6 (input_cost_usd): =B2/1000000*0.30
- B7 (output_cost_usd): =B5/1000000*2.50
- B8 (request_cost_usd): =B6+B7

## Important Caveat (Embeddings)
This worksheet estimates text-generation cost only.

Your backend also makes embedding calls for Pinecone retrieval on many requests.
- The summary log includes embedding call count (geminiEmbedding).
- Embedding token usage and embedding price are not included in this worksheet yet.

If you want full end-to-end cost, add a second worksheet for embedding usage once you decide the exact embedding pricing source to apply.
