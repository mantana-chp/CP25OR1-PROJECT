# Health Insights Notification System

**Implementation Date:** March 27, 2026
**Status:** ✅ Production Ready
**Feature Version:** 1.0.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Pattern Detection](#pattern-detection)
4. [Notification Triggers](#notification-triggers)
5. [AI Generation](#ai-generation)
6. [Configuration](#configuration)
7. [Database Schema](#database-schema)
8. [API Cost](#api-cost)
9. [Testing Guide](#testing-guide)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Health Insights Notification System provides **personalized, data-driven health alerts** for pet owners and caregivers by analyzing health log patterns and detecting potential health issues automatically.

### Problem Statement

Users log health data but may not recognize patterns that indicate problems:
- Recurring symptoms that persist over days
- Rapid weight changes that signal illness
- Critical symptoms requiring immediate veterinary attention
- Lack of health monitoring consistency

### Solution

A two-tier notification system:
1. **Immediate Alerts** - Real-time critical symptom detection (< 5 seconds)
2. **Daily Analysis** - Pattern detection across all health logs (runs at 19:00 Bangkok daily)

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  HEALTH INSIGHTS SYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │  Immediate Path  │      │   Daily Path     │           │
│  │  (Real-time)     │      │   (Cron Job)     │           │
│  └──────────────────┘      └──────────────────┘           │
│           │                         │                       │
│           └────────┬────────────────┘                       │
│                    │                                        │
│                    ▼                                        │
│         ┌─────────────────────┐                            │
│         │  Pattern Detection  │                            │
│         │  Service            │                            │
│         └─────────────────────┘                            │
│                    │                                        │
│                    ▼                                        │
│         ┌─────────────────────┐                            │
│         │  AI Generation      │                            │
│         │  (Gemini 2.5 Flash) │                            │
│         └─────────────────────┘                            │
│                    │                                        │
│                    ▼                                        │
│         ┌─────────────────────┐                            │
│         │  Notification       │                            │
│         │  Delivery           │                            │
│         └─────────────────────┘                            │
│                    │                                        │
│           ┌────────┴────────┐                              │
│           ▼                 ▼                               │
│       [ Owner ]      [ Caregivers ]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `health-insight-orchestrator.ts` | Main cron job entry point |
| `health-insight-detection-service.ts` | Pattern detection algorithms |
| `health-insight-generation-service.ts` | AI insight generation |
| `health-insight-repository.ts` | Database operations |
| `keyword-loader.ts` | Critical keyword management |
| `health-log-service.ts` | Immediate alerts integration |
| `notification-scheduler.ts` | Cron job scheduler |
| `config/health-alert-keywords.json` | Configurable keywords |

---

## Pattern Detection

### 7 Detection Patterns

#### 1. **Recurring Symptom** (MEDIUM severity)

**Criteria:**
- Same symptom logged 3+ times in last 7 days
- Exact text match (case-insensitive)

**Example:**
```
Day 1: "บลูซึมเซา"
Day 3: "บลูซึมเซา"
Day 5: "บลูซึมเซา"
→ Triggers: "⚠️ บลูมีอาการซึมเซาต่อเนื่อง 3 วัน"
```

**Detection Logic:**
```typescript
// Group symptoms by description
// Check if any group has >= 3 occurrences
if (occurrences.length >= 3) {
  return RECURRING_SYMPTOM pattern
}
```

---

#### 2. **Abnormal Symptom** (CRITICAL severity)

**Criteria:**
- Symptom description contains critical keyword
- Matches keywords in `config/health-alert-keywords.json`
- Sends **immediately** when health log is created

**Critical Keywords (85 total):**
- Blood: เลือด, อาเจียนเป็นเลือด, ถ่ายเลือด
- Neurological: ชัก, หมดสติ, ไม่ตื่น
- Breathing: หายใจลำบาก, หอบ, ลิ้นเขียว
- Poisoning: กินยา, กินสารพิษ, กินช็อกโกแลต
- Trauma: ถูกรถชน, กระดูกหัก
- And 75+ more...

**Example:**
```
User logs: "บลูอาเจียนเป็นเลือด"
→ Immediate alert: "🚨 บลูมีอาการอาเจียนเป็นเลือด ควรพบสัตวแพทย์ทันที"
```

---

#### 3. **Rapid Weight Loss** (MEDIUM/HIGH severity)

**Criteria:**
- Weight dropped by threshold percentage within time window
- Species-specific thresholds

**Thresholds:**

| Species | Loss % | Time Window | Severity |
|---------|--------|-------------|----------|
| Dog | > 10% | 14 days | MEDIUM (15% = HIGH) |
| Cat | > 5% | 14 days | MEDIUM (7.5% = HIGH) |
| Rabbit | > 5% | 7 days | MEDIUM (7.5% = HIGH) |
| Hamster | > 5% | 7 days | MEDIUM (7.5% = HIGH) |
| Bird | > 5% | 7 days | MEDIUM (7.5% = HIGH) |

**Example:**
```
Dog: 15 kg → 13.5 kg in 10 days
Change: -1.5 kg (-10%)
→ Triggers: "⚠️ บลูมีน้ำหนักลด 1.5 kg ใน 10 วัน"
```

**Detection Logic:**
```typescript
const changePercent = Math.abs((changeAmount / previousWeight) * 100)
if (changeAmount < 0 && changePercent >= threshold.lossPercent) {
  return RAPID_WEIGHT_LOSS pattern
}
```

---

#### 4. **Rapid Weight Gain** (MEDIUM/HIGH severity)

**Criteria:**
- Weight increased by threshold percentage within time window
- Uses same species-specific thresholds as weight loss

**Example:**
```
Cat: 4.0 kg → 4.5 kg in 12 days
Change: +0.5 kg (+12.5%)
→ Triggers: "⚠️ มิวมีน้ำหนักเพิ่มขึ้น 0.5 kg ใน 12 วัน"
```

---

#### 5. **Recurring Behavior** (MEDIUM severity)

**Criteria:**
- Same BEHAVIOR log 3+ times in last 7 days
- Works same as recurring symptoms but for BEHAVIOR category

**Example:**
```
"ไม่ยอมกินอาหาร" logged 4 times in 7 days
→ Triggers: "💡 บลูมีพฤติกรรมไม่ยอมกินอาหารซ้ำ 4 ครั้ง"
```

---

#### 6. **No Recent Logs** (LOW severity)

**Criteria:**
- No health logs for 7+ days
- Pet has active reminders (showing user should be logging)
- Won't send more than once per week

**Example:**
```
Last log: 8 days ago
Active reminders: Yes
→ Triggers: "📝 อย่าลืมอัปเดตอาการของบลูวันนี้!"
```

---

#### 7. **Follow-up Reminder** (MEDIUM severity)

**Criteria:**
- An abnormal symptom was detected 2 days ago
- No follow-up logged yet
- Checks if issue was resolved

**Example:**
```
Day 1: User logs "ท้องเสีย" (warning keyword detected)
Day 3: Cron job runs
→ Triggers: "📋 บลูมีอาการท้องเสียเมื่อ 2 วันที่แล้ว อาการดีขึ้นหรือยัง?"
```

---

## Notification Triggers

### Daily Cron Job

**Schedule:**
- **Bangkok Time:** 19:00 (7:00 PM)
- **UTC Time:** 12:00 (noon)
- **Cron Expression:** `0 12 * * *`

**Process Flow:**
```typescript
1. Query all ACTIVE pets (status = 'ACTIVE', deleted_at = null)
2. For each pet:
   a. Run all 7 detection algorithms
   b. Take first detected pattern (priority order)
   c. Generate AI insight with Gemini
   d. Save to health_insights table
   e. Send notification to owner + caregivers
   f. Mark as notified
3. Log summary (pets analyzed, insights generated, notifications sent)
```

**Priority Order:**
1. Weight anomalies (often most critical)
2. Recurring symptoms
3. Recurring behaviors
4. Follow-up reminders
5. No recent logs (lowest priority)

---

### Immediate Alerts

**Trigger Point:**
- `createHealthLog()` API call when `category = 'SYMPTOMS'`

**Process Flow:**
```typescript
// Inside health-log-service.ts
if (input.category === 'SYMPTOMS') {
  setImmediate(async () => {
    // Non-blocking, fire-and-forget
    1. Check description for critical keywords
    2. If critical keyword found:
       a. Generate AI insight
       b. Save to health_insights table
       c. Send notification immediately
       d. Mark as notified
  });
}
// API response returns immediately
```

**Timing:**
- Health log creation: ~200ms
- Alert detection + notification: runs in background
- User receives notification: within 5 seconds

---

## AI Generation

### Model Configuration

```typescript
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: config.google.apiKey,
  temperature: 0.7, // Balanced for medical accuracy + natural tone
});
```

### Prompt Structure

**Input:**
- Pet name (e.g., "บลู")
- Species (e.g., "Dog")
- Breed (e.g., "Golden Retriever")
- Pattern context (e.g., "มีอาการซึมเซา 3 ครั้ง ใน 7 วัน")

**Output:**
```json
{
  "title": "⚠️ บลูมีอาการซึมเซาต่อเนื่อง 3 วัน",
  "description": "Golden Retriever อย่างบลูควรกระตือรือร้น หากซึมเซาต่อเนื่องอาจเป็นสัญญาณของไข้หรือปัญหาอื่น..."
}
```

**Prompt Guidelines:**
- Use Thai language throughout
- Include pet's name in title
- Make tone friendly (เป็นกันเอง) not robotic
- Keep title under 100 characters
- Keep description under 3 sentences
- Provide actionable advice
- For critical: emphasize urgency
- For mild: emphasize monitoring

### Fallback Messages

If AI fails, system uses pre-written templates:

```typescript
// Example fallback for recurring symptom
{
  title: `⚠️ ${petName} มีอาการซ้ำ ๆ ${count} ครั้ง`,
  description: `${petName} มีอาการ "${symptom}" ซ้ำ ๆ ใน 7 วัน แนะนำให้ติดตามอาการ...`
}
```

---

## Configuration

### Keyword Configuration

**File:** `backend/config/health-alert-keywords.json`

**Structure:**
```json
{
  "critical": [
    {
      "keyword": "เลือด",
      "category": "blood",
      "enabled": true,
      "description": "Blood in general"
    },
    ...
  ],
  "warning": [
    {
      "keyword": "ท้องเสีย",
      "category": "digestive",
      "enabled": true,
      "description": "Diarrhea"
    },
    ...
  ]
}
```

**Adding New Keywords:**
1. Edit `config/health-alert-keywords.json`
2. Add to `critical` or `warning` array
3. Restart backend: `docker-compose restart backend`
4. Keywords reload automatically (24-hour cache)

**Cache Behavior:**
- **Duration:** 24 hours
- **Reload:** Automatic after cache expires OR manual restart
- **Performance:** File read only once per day

---

## Database Schema

### `health_insights` Table

```sql
CREATE TABLE health_insights (
  id                UUID PRIMARY KEY,
  pet_id            UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  insight_type      HealthInsightType NOT NULL,
  severity          HealthInsightSeverity NOT NULL DEFAULT 'MEDIUM',
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  context_data      JSONB NOT NULL,  -- Stores pattern details
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at       TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_insights_pet_id ON health_insights(pet_id);
CREATE INDEX idx_health_insights_detected_at ON health_insights(detected_at);
CREATE INDEX idx_health_insights_type ON health_insights(insight_type);
```

### Enums

**HealthInsightType:**
```typescript
enum HealthInsightType {
  RECURRING_SYMPTOM
  ABNORMAL_SYMPTOM
  RAPID_WEIGHT_LOSS
  RAPID_WEIGHT_GAIN
  RECURRING_BEHAVIOR
  NO_RECENT_LOGS
  FOLLOW_UP_REMINDER
}
```

**HealthInsightSeverity:**
```typescript
enum HealthInsightSeverity {
  LOW       // 📌 Informational
  MEDIUM    // 💡 Should monitor
  HIGH      // ⚠️ Concerning
  CRITICAL  // 🚨 Urgent
}
```

### `notifications` Table Updates

**Added Field:**
```sql
ALTER TABLE notifications
ADD COLUMN health_insight_id UUID REFERENCES health_insights(id) ON DELETE CASCADE;
```

**Relationship:**
- One insight → Many notifications (one per recipient)
- Links push notifications to their source insight

---

## API Cost

### Gemini 2.5 Flash Pricing

- **Model:** `gemini-2.5-flash`
- **Cost per 1M tokens:** $0.075 (input), $0.30 (output)
- **Average insight:** ~500 input tokens, ~200 output tokens
- **Cost per insight:** ~$0.0001 USD (~0.003 THB)

### Monthly Estimate

**Daily Cron Job:**
- Active pets: ~100
- Patterns detected: ~20% (20 pets)
- AI calls: 20/day × 30 days = **600 calls/month**

**Immediate Alerts:**
- Critical symptoms: ~10/day
- AI calls: 10/day × 30 days = **300 calls/month**

**Total:**
- **900 API calls/month**
- **Cost: ~0.27 USD or ~9 THB/month** ✅ Very cheap!

**Compared to AI Tips:**
- AI Tips: ~600 calls/month (processes ALL users)
- Health Insights: ~900 calls/month (but only triggered patterns)
- Combined: ~1,500 calls/month (~45 THB/month or $1.35 USD)

---

## Testing Guide

### Test 1: Immediate Alert (Critical Symptom)

**Setup:**
```bash
# Create a health log with critical keyword
curl -X POST http://localhost:3000/v1/pets/{petId}/health-logs \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "SYMPTOMS",
    "description": "บลูอาเจียนเป็นเลือด",
    "note": "Test immediate alert"
  }'
```

**Expected Result:**
- API responds immediately (~200ms)
- Notification appears within 5 seconds
- Title: "🚨 {petName}มีอาการอาเจียนเป็นเลือด..."
- Sent to owner + all caregivers

**Check Logs:**
```bash
docker logs backend-container | grep ImmediateAlert
```

---

### Test 2: Recurring Symptom Pattern

**Setup:**
```bash
# Log same symptom 3 times over 7 days
# Day 1:
POST /v1/pets/{petId}/health-logs
{ "category": "SYMPTOMS", "description": "บลูซึมเซา" }

# Day 3:
POST /v1/pets/{petId}/health-logs
{ "category": "SYMPTOMS", "description": "บลูซึมเซา" }

# Day 5:
POST /v1/pets/{petId}/health-logs
{ "category": "SYMPTOMS", "description": "บลูซึมเซา" }
```

**Trigger Manually:**
```bash
# SSH into server
cd /app/backend
node -e "require('./dist/features/health-insights/health-insight-orchestrator').analyzeAllPetsAndSendInsights()"
```

**Expected Result:**
- Insight created in database
- Notification: "⚠️ {petName}มีอาการซึมเซาต่อเนื่อง 3 วัน"
- Sent at 19:00 Bangkok (or immediately if triggered manually)

---

### Test 3: Weight Anomaly

**Setup:**
```bash
# Log weight 2 weeks ago: 15 kg
POST /v1/pets/{petId}/health-logs
{ "category": "WEIGHT", "weight": 15, "loggedAt": "2026-03-13T10:00:00Z" }

# Log weight today: 13.5 kg
POST /v1/pets/{petId}/health-logs
{ "category": "WEIGHT", "weight": 13.5 }
```

**Trigger Cron:**
```bash
node -e "require('./dist/features/health-insights/health-insight-orchestrator').analyzeAllPetsAndSendInsights()"
```

**Expected Result:**
- Pattern detected: RAPID_WEIGHT_LOSS
- Notification: "⚠️ {petName}มีน้ำหนักลด 1.5 kg ใน 14 วัน..."

---

### Test 4: Manual Cron Trigger

**Via Node REPL:**
```bash
cd backend
node

> const { analyzeAllPetsAndSendInsights } = require('./dist/features/health-insights/health-insight-orchestrator')
> await analyzeAllPetsAndSendInsights()
```

**Check Output:**
```
========================================
🏥 RUNNING HEALTH INSIGHTS JOB
========================================
[HealthInsightsJob] Found 50 active pets to analyze
[HealthInsightsJob] Analyzing pet: บลู (abc-123)
[Detection] Detected pattern: RECURRING_SYMPTOM for pet abc-123
...
[HealthInsightsJob] Summary:
  - Pets analyzed: 50
  - Insights generated: 8
  - Notifications sent: 8
========================================
```

---

## Troubleshooting

### Issue: No Notifications Sent

**Check 1: Cron Job Running?**
```bash
docker logs backend-container | grep "RUNNING HEALTH INSIGHTS JOB"
```
Should appear daily at 12:00 UTC / 19:00 Bangkok.

**Check 2: Patterns Detected?**
```bash
# Query database
SELECT * FROM health_insights
WHERE detected_at >= NOW() - INTERVAL '24 hours'
ORDER BY detected_at DESC;
```

**Check 3: Push Tokens Exist?**
```sql
SELECT u.id, COUNT(pt.id) as token_count
FROM users u
LEFT JOIN push_tokens pt ON u.id = pt.user_id
GROUP BY u.id;
```

---

### Issue: Immediate Alerts Not Working

**Check 1: Category = SYMPTOMS?**
```typescript
// Only SYMPTOMS category triggers immediate alerts
if (input.category === 'SYMPTOMS') { ... }
```

**Check 2: Keyword Match?**
```bash
# Check if keyword is in config
cat config/health-alert-keywords.json | grep "เลือด"
```

**Check 3: Check Logs**
```bash
docker logs backend-container | grep "\[ImmediateAlert\]"
```

---

### Issue: AI Generation Fails

**Check 1: API Key Valid?**
```bash
# Check .env
cat .env | grep GOOGLE_API_KEY
```

**Check 2: Fallback Used?**
```bash
# Search logs for fallback usage
docker logs backend-container | grep "Error generating AI insight"
```
If AI fails, system automatically uses fallback templates.

---

### Issue: Duplicate Notifications

**Check 1: Deduplication Working?**
```sql
-- Should have only 1 insight per type per 3 days
SELECT pet_id, insight_type, COUNT(*)
FROM health_insights
WHERE detected_at >= NOW() - INTERVAL '3 days'
GROUP BY pet_id, insight_type
HAVING COUNT(*) > 1;
```

**Check 2: Multiple Backend Instances?**
```bash
# Check running containers
docker ps | grep backend
```
Only ONE backend instance should be running (single scheduler architecture).

---

### Issue: Wrong Notification Time

**Check 1: Timezone Correct?**
```typescript
// notification-scheduler.ts
cron.schedule('0 12 * * *', ..., { timezone: 'Etc/UTC' })
// 12:00 UTC = 19:00 Bangkok ✅
```

**Check 2: Server Timezone?**
```bash
docker exec backend-container date
# Should show correct UTC time
```

---

## Future Enhancements

### Potential Improvements

1. **User Preferences**
   - Allow users to configure notification frequency
   - Option to disable specific insight types
   - Custom sensitivity thresholds

2. **Multi-language Support**
   - English translations
   - Other SEA languages (Vietnamese, Indonesian)

3. **Machine Learning**
   - Train custom model on pet health data
   - Predict future health issues
   - Breed-specific risk factors

4. **Advanced Analytics**
   - Health trend graphs
   - Comparative analysis (pet vs breed average)
   - Seasonal pattern detection

5. **Integration**
   - Export insights to veterinarians
   - Integration with pet health devices (smart collars, scales)
   - Telemedicine booking when critical detected

---

## Support & Maintenance

### Updating Keywords

**Production Update Process:**
```bash
# 1. Edit keywords file
vim /app/backend/config/health-alert-keywords.json

# 2. Restart backend
docker-compose restart backend

# 3. Verify keywords loaded
docker logs backend-container | grep "KeywordLoader"
# Should show: "Loaded 85 critical and 20 warning keywords"
```

### Monitoring

**Key Metrics to Track:**
- Daily insights generated (target: 5-20% of active pets)
- AI API failures (should be < 1%)
- Notification delivery rate (should be > 95%)
- Average response time for immediate alerts (< 5 seconds)

**Database Queries:**
```sql
-- Daily insights summary
SELECT
  DATE(detected_at) as date,
  insight_type,
  severity,
  COUNT(*) as count
FROM health_insights
WHERE detected_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(detected_at), insight_type, severity
ORDER BY date DESC, count DESC;

-- Notification success rate
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM notifications
WHERE health_insight_id IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY status;
```

---

## Change Log

### Version 1.0.0 - March 27, 2026

**Initial Release**

**Features:**
- ✅ 7 pattern detection algorithms
- ✅ Immediate critical alerts (real-time)
- ✅ Daily cron job analysis (19:00 Bangkok)
- ✅ AI-powered Thai insights (Gemini 2.5 Flash)
- ✅ Configurable keyword system (JSON)
- ✅ Species-specific weight thresholds
- ✅ Owner + caregiver notification fan-out
- ✅ 3-day deduplication
- ✅ Fallback messages when AI fails
- ✅ 24-hour keyword cache

**Performance:**
- Average immediate alert time: < 5 seconds
- Daily cron execution time: ~2-5 minutes (100 pets)
- AI API cost: ~9 THB/month

**Files Created:** 11 new files
**Database Tables:** 1 new table (`health_insights`)
**Configuration Files:** 1 JSON file (90+ keywords)

---

## Contact & Feedback

For issues, improvements, or questions:
- GitHub Issues: [project-repo]/issues
- Technical Lead: [contact]
- Documentation: This file + `NOTIFICATION_JOB_CURRENT_STATE.md`

**Last Updated:** March 27, 2026
