# Health Insights Notification System V2

**Implementation Date:** March 30, 2026
**Version:** 2.0.0
**Status:** ✅ Production Ready

---

## 📋 Overview

Health Insights V2 is a **complete overhaul** of the health notification system, introducing **smart cooldown rules**, **user-based batching**, and **AI cost optimization**.

### What Changed from V1 → V2

| Feature | V1 (Old) | V2 (New) |
|---------|----------|----------|
| **Processing Unit** | Per pet (100 pets = 100 loops) | Per user (60 users = 60 evaluations) |
| **AI Requests** | 1 per insight (~30 requests/day) | Batched 20 users/request (~1-2 requests/day) |
| **Daily Limit** | None (user could get 3+ notifications) | Max 1 insight per user per day |
| **Cooldown** | Only per-pattern (3 days) | Smart multi-level cooldown |
| **Weekly Cap** | None | Max 4 insights per week |
| **Cost** | ~$0.90/month (30 AI calls/day) | ~$0.05/month (1-2 batches/day) |
| **User Experience** | Potential notification fatigue | Balanced, non-intrusive |

---

## 🎯 Core Design Principles

### 1. **User-Centric Approach**
- Process by **users**, not pets
- Each user receives **max 1 health insight per day**
- Multi-pet users get only the **highest priority** insight

### 2. **Smart Cooldown System**
- **Daily**: Skip users who got insight yesterday (with severity exceptions)
- **Weekly**: Max 4 insights per week (but allow urgent ones)
- **Pet-level**: 2-day cooldown per pet (unless escalating severity)

### 3. **Priority Selection**
- When user has multiple pets with patterns, select highest severity
- Priority: CRITICAL > HIGH > MEDIUM > LOW

### 4. **AI Tips Integration**
- If user got AI tip at 12:00 Bangkok, skip LOW severity insights at 19:00
- Still send MEDIUM/HIGH/CRITICAL regardless of AI tips

---

## 🔄 How It Works

### **Daily Job Flow** (Runs at 19:00 Bangkok / 12:00 UTC)

```
1. Get Eligible Users
   ↓
2. For Each User:
   a. Analyze All Their Pets
   b. Detect Patterns
   c. Select Highest Priority Pattern
   d. Check User Eligibility (Yesterday's insight, weekly cap, AI tips)
   e. Check Pet Eligibility (2-day cooldown, severity escalation)
   ↓
3. Batch Processing (20 users per AI request)
   ↓
4. Generate AI Insights
   ↓
5. Save to Database
   ↓
6. Send Notifications (Owner + Caregivers)
```

---

## 📏 Eligibility Rules

### **User-Level Eligibility**

| Condition | Rule | Exception |
|-----------|------|-----------|
| **Got insight today** | ❌ Skip | None |
| **Got insight yesterday** | ❌ Skip if yesterday was HIGH/CRITICAL OR today is LOW/MEDIUM | ✅ Allow if yesterday was LOW/MEDIUM AND today is HIGH/CRITICAL |
| **Weekly cap (4/week)** | ❌ Skip if 4+ insights this week | ✅ Allow HIGH/CRITICAL regardless |
| **Got AI tip today** | ❌ Skip if current pattern is LOW | ✅ Allow MEDIUM/HIGH/CRITICAL |

### **Pet-Level Eligibility**

| Condition | Rule | Exception |
|-----------|------|-----------|
| **Got insight in last 2 days** | ❌ Skip | ✅ Allow if current severity is CRITICAL |
| **Previous was HIGH/CRITICAL** | ❌ Skip | ✅ Allow if current is CRITICAL |
| **Same/lower severity** | ❌ Skip | ✅ Allow if higher severity |

---

## 🎖️ Priority Selection Logic

### **Multi-Pet Scenario**

User "Alice" has 3 pets:

| Pet | Pattern Detected | Severity | Last Insight | Eligible? | Selected? |
|-----|------------------|----------|--------------|-----------|-----------|
| บลู | Weight loss | HIGH | 5 days ago | ✅ Yes | ❌ No |
| มิว | Recurring symptom | MEDIUM | 1 day ago | ❌ No (recent) | ❌ No |
| โมโม | No recent logs | LOW | Never | ✅ Yes | ❌ No |

**Result:** บลู selected (highest severity among eligible pets)

### **Severity Escalation Example**

| Day | Pet | Pattern | Severity | Action |
|-----|-----|---------|----------|--------|
| Monday | บลู | Recurring symptom | MEDIUM | ✅ Send |
| Tuesday | บลู | Weight loss | HIGH | ✅ Send (higher severity) |
| Wednesday | บลู | No recent logs | LOW | ❌ Skip (lower severity) |
| Thursday | บลู | Blood in stool | CRITICAL | ✅ Send (CRITICAL always sends) |

---

## 📊 Batch Processing

### **How Batching Works**

**Before (V1):**
```
Pet 1 → AI request 1 (~500ms)
Pet 2 → AI request 2 (~500ms)
Pet 3 → AI request 3 (~500ms)
...
Total: 30 pets = 30 AI requests = ~15 seconds
```

**After (V2):**
```
[User 1, User 2, ..., User 20] → Single AI request (~2 seconds)
[User 21, User 22, ..., User 40] → Single AI request (~2 seconds)
Total: 30 users = 2 batches = ~4 seconds
```

**Cost Savings:**
- V1: 30 requests/day × 30 days = 900 requests/month = **$0.27/month**
- V2: 2 batches/day × 30 days = 60 requests/month = **$0.02/month**
- **Savings: 93%** 💰

---

## 🚨 Immediate Alerts (Unchanged)

Critical symptoms are still sent **immediately** when logged:

- **Trigger:** User creates health log with SYMPTOMS category containing critical keyword
- **Timing:** Within 5 seconds of log creation
- **Keywords:** Blood (เลือด), seizures (ชัก), breathing issues (หายใจลำบาก), etc.
- **Bypasses all cooldowns:** Always sent regardless of daily/weekly limits

**Example:**
```
12:30 PM - User logs "บลูอาเจียนเป็นเลือด"
12:30 PM - Immediate detection
12:30 PM - AI generates insight
12:30 PM - Notification sent (< 5 seconds)
```

---

## 📅 Weekly Cap Example

**Week 1:**
| Day | Pattern | Severity | Action | Week Count |
|-----|---------|----------|--------|-------------|
| Mon | Weight loss | HIGH | ✅ Send | 1 |
| Tue | Recurring symptom | MEDIUM | ✅ Send | 2 |
| Wed | No logs | LOW | ✅ Send | 3 |
| Thu | Recurring behavior | MEDIUM | ✅ Send | 4 |
| Fri | No logs | LOW | ❌ Skip (cap reached) | 4 |
| Sat | Weight gain | HIGH | ✅ Send (urgent) | 5 |
| Sun | Follow-up | MEDIUM | ❌ Skip (cap + not urgent) | 5 |

**Week 2:**
- Counter resets!
- User can receive up to 4 more insights

---

## 🧪 Testing Scenarios

### **Scenario 1: Smart Cooldown**

```typescript
// User got MEDIUM insight yesterday
// Today: MEDIUM pattern detected

✅ Result: Skipped (smart cooldown)
📝 Reason: "Got MEDIUM insight yesterday, current is MEDIUM"
```

```typescript
// User got LOW insight yesterday
// Today: HIGH pattern detected

✅ Result: Sent (severity escalation)
📝 Reason: "Yesterday was LOW, current is HIGH - allowed"
```

### **Scenario 2: Multi-Pet Priority**

```typescript
// User has 3 pets:
// Pet A: RECURRING_SYMPTOM (MEDIUM) - eligible
// Pet B: WEIGHT_LOSS (HIGH) - eligible
// Pet C: NO_RECENT_LOGS (LOW) - eligible

✅ Result: Pet B selected (highest severity)
📧 Notification: "⚠️ Pet B มีน้ำหนักลด..."
```

### **Scenario 3: AI Tips + Health Insights**

```typescript
// 12:00 - User got AI tip: "รู้ไหมว่าแมวนอนวันละ 15 ชั่วโมง?"
// 19:00 - Health insight detects: NO_RECENT_LOGS (LOW)

✅ Result: Skipped (got AI tip + LOW severity)
📝 Reason: "User got notification today, current is LOW"
```

```typescript
// 12:00 - User got AI tip
// 19:00 - Health insight detects: WEIGHT_LOSS (HIGH)

✅ Result: Sent (HIGH severity overrides)
📧 Notification: "⚠️ มิวมีน้ำหนักลด..."
```

### **Scenario 4: Weekly Cap**

```typescript
// User received 4 insights this week
// Day 5: RECURRING_BEHAVIOR (MEDIUM) detected

✅ Result: Skipped (weekly cap)
📝 Reason: "Weekly cap reached (4/4), current is MEDIUM"
```

```typescript
// User received 4 insights this week
// Day 6: RAPID_WEIGHT_LOSS (HIGH) detected

✅ Result: Sent (urgent pattern)
📧 Notification: "⚠️ บลูมีน้ำหนักลด..."
```

---

## 🔧 Configuration

### **Adjustable Parameters**

Located in: `health-insight-orchestrator.ts`

```typescript
// Batch size — named constant, easy to adjust
const BATCH_SIZE = 20  // Recommended: 15-25

// The following are inline values (not named constants):
// User-level cooldown      — subDays(new Date(), 1)  → 1 day
// Weekly cap               — weeklyCount >= 4        → 4 insights/week
// Pet-level cooldown       — subDays(new Date(), 2)  → 2 days
```

---

## 📈 Performance Metrics

### **Expected Daily Performance**

**Assumptions:**
- 200 total users
- 150 users have active pets
- 30 users already got insight today
- 120 eligible users to evaluate
- 25 users qualify after all filters

**Results:**
```
Users evaluated: 120
Users qualified: 25
Insights generated: 25
AI batches: 2 (20 + 5)
Notifications sent: 25 (+ caregivers)
Total time: ~8 seconds
Cost: ~$0.001 USD
```

### **Cost Comparison**

| Metric | V1 | V2 | Savings |
|--------|----|----|---------|
| **AI requests/day** | ~30 | ~2 | 93% |
| **Cost/day** | $0.009 | $0.001 | 89% |
| **Cost/month** | $0.27 | $0.03 | 89% |
| **Processing time** | 15s | 8s | 47% |
| **User notifications** | 30+ | 20-30 | Controlled |

---

## 🚀 Migration Notes

### **Breaking Changes**

None! The V2 system is backward compatible with existing data.

### **Database Changes**

No schema changes required. Uses existing `health_insights` table.

### **Old System**

The old per-pet processing is **replaced entirely**. The function `analyzeAllPetsAndSendInsights` has been rewritten.

---

## 💡 Best Practices

### **For Users**
- Users will receive **max 1 health insight per day**
- Urgent issues (HIGH/CRITICAL) bypass weekly caps
- Immediate alerts (blood, seizures) always send instantly

### **For Admins**
- Monitor weekly insight counts per user
- Review logs for eligibility skips
- Adjust `BATCH_SIZE` based on AI response time
- Consider raising `WEEKLY_CAP` if users request more insights

---

## 📝 Logs Example

```
========================================
🏥 RUNNING HEALTH INSIGHTS JOB (V2 - Smart Batching)
========================================
[HealthInsightsJob] Found 120 users with active pets to evaluate
[HealthInsightsJob] Evaluating user abc-123 with 3 pet(s)
[HealthInsightsJob] Detected RECURRING_SYMPTOM (MEDIUM) for บลู
[HealthInsightsJob] Detected NO_RECENT_LOGS (LOW) for มิว
[SelectionLogic] Pet มิว not eligible: Pet got insight recently
[HealthInsightsJob] Selected pattern for user abc-123: RECURRING_SYMPTOM (MEDIUM) for บลู
[HealthInsightsJob] 25 users qualified for insights
[HealthInsightsJob] Processing batch 1/2 (20 users)
[HealthInsightsBatch] Sending batch request to AI for 20 pets.
[HealthInsightsBatch] AI batch response received. Generated 20 insights.
[HealthInsightsJob] Created insight xyz-789 for บลู
[HealthInsightsJob] Notification sent for insight xyz-789
========================================
[HealthInsightsJob] Summary:
  - Users evaluated: 120
  - Users qualified: 25
  - Insights generated: 25
  - Notifications sent: 25
  - AI batches processed: 2
========================================
✅ FINISHED HEALTH INSIGHTS JOB
========================================
```

---

## 🐛 Troubleshooting

### **Issue: No insights generated**

**Check:**
1. Are users eligible? (Check yesterday's insights)
2. Are pets eligible? (Check 2-day cooldown)
3. Are patterns detected? (Check detection service logs)

**Query:**
```sql
-- Check recent insights
SELECT
  u.id as user_id,
  p.pet_name,
  hi.severity,
  hi.detected_at
FROM health_insights hi
JOIN pets p ON hi.pet_id = p.id
JOIN users u ON p.user_id = u.id
WHERE hi.detected_at >= NOW() - INTERVAL '7 days'
ORDER BY hi.detected_at DESC;
```

### **Issue: User getting too many notifications**

**Check:**
1. Are immediate alerts triggering? (CRITICAL keywords)
2. Is weekly cap working? (Check logs)
3. Are multiple pets triggering patterns?

**Solution:**
- Weekly cap is enforced for non-urgent patterns
- Lower `WEEKLY_CAP` in config if needed

### **Issue: Batch processing fails**

**Check:**
1. Gemini API key valid?
2. Network connectivity?
3. Batch size too large?

**Solution:**
- Reduce `BATCH_SIZE` from 20 to 10-15
- Check Gemini API quota
- Review error logs for details

---

## 📞 Support

For issues or questions:
- **GitHub Issues:** [project-repo]/issues
- **Documentation:** This file (V1 has been removed)
- **Technical Lead:** [contact]

**Last Updated:** March 30, 2026
**Version:** 2.0.0
