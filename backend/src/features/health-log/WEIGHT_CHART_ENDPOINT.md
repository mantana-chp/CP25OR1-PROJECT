# Weight Chart Endpoint

## Overview
A dedicated endpoint that returns **pre-aggregated, chart-ready weight data** for a pet. The frontend doesn't need to fetch all health logs and aggregate locally — the backend calculates the correct date range, groups data points, and returns Thai-formatted labels ready for rendering.

The existing `GET /pets/{petId}/health-logs` endpoint remains unchanged and is used for the health log list view.

---

## Endpoint

```
GET /pets/{petId}/health-logs/weight-chart
```

### Query Parameters

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `view` | `week` \| `month` \| `year` | No | `month` | Determines the time window and aggregation granularity |
| `date` | ISO date string | No | today | Anchor date — the time window ends on this date |

### View Windows

| View | Range | Granularity | Points |
|---|---|---|---|
| `week` | Last 7 days from `date` | 1 point per day logged | 0–7 |
| `month` | Last 30 days from `date` | 1 point per day logged | 0–30 |
| `year` | Last 12 calendar months from `date`'s month | 1 averaged point per month with data | 0–12 |

---

## Response

**200 OK**
```json
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "view": "month",
    "rangeStart": "2026-03-17",
    "rangeEnd": "2026-04-15",
    "hasData": true,
    "points": [
      { "date": "2026-03-20", "label": "20 มี.ค.", "weight": 5.0, "logId": "uuid-...", "logCount": 1 },
      { "date": "2026-04-01", "label": "1 เม.ย.",  "weight": 5.2, "logId": "uuid-...", "logCount": 1 },
      { "date": "2026-04-15", "label": "15 เม.ย.", "weight": 5.4, "logId": "uuid-...", "logCount": 1 }
    ]
  }
}
```

**200 OK — no data in range**
```json
{
  "status": { "code": "000", "description": "Success" },
  "data": {
    "view": "week",
    "rangeStart": "2026-04-09",
    "rangeEnd": "2026-04-15",
    "hasData": false,
    "points": []
  }
}
```

**Year view (aggregated)**
```json
{
  "data": {
    "view": "year",
    "rangeStart": "2025-05-01",
    "rangeEnd": "2026-04-15",
    "hasData": true,
    "points": [
      { "date": "2025-06-01", "label": "มิ.ย. 2568", "weight": 4.80, "logCount": 3 },
      { "date": "2025-09-01", "label": "ก.ย. 2568", "weight": 5.10, "logCount": 2 },
      { "date": "2026-04-01", "label": "เม.ย. 2569", "weight": 5.25, "logCount": 4 }
    ]
  }
}
```

---

## WeightChartPoint Fields

| Field | Type | Description |
|---|---|---|
| `date` | `string` | ISO date `"YYYY-MM-DD"`. For year view: first day of the month |
| `label` | `string` | Thai-formatted axis label (e.g., `"15 เม.ย."`, `"เม.ย. 2569"`) |
| `weight` | `number` | Exact weight for week/month; **average** across the month for year |
| `logId` | `string?` | Health log ID. Present for week/month (1:1 with log). **Absent for year** (aggregate) |
| `logCount` | `number` | Always `1` for week/month. For year: number of daily logs averaged |

---

## Sparse Data Behavior

Missing days/months simply **produce no point** — gaps are implicit. The frontend plots only the points returned and lets the chart library handle the gap between them.

```
week view, only 2 logs out of 7 days:
→ points = [ { date: "2026-04-12", ... }, { date: "2026-04-15", ... } ]
→ frontend chart shows 2 data points with a gap in between — no crash, no empty point
```

---

## Examples

### Week view anchored to today
```
GET /pets/{petId}/health-logs/weight-chart?view=week
```

### Month view anchored to a past date
```
GET /pets/{petId}/health-logs/weight-chart?view=month&date=2026-03-31
→ returns logs from 2026-03-02 to 2026-03-31
```

### Year view (last 12 months)
```
GET /pets/{petId}/health-logs/weight-chart?view=year
→ returns monthly averages from May 2025 to April 2026
```

---

## Implementation Notes

### Files Changed

| File | Change |
|---|---|
| `health-log-types.ts` | Added `WeightChartView`, `WeightChartPoint`, `WeightChartData` |
| `health-log-schema.ts` | Added `getWeightChartQuerySchema`, `GetWeightChartQuery` |
| `health-log-repository.ts` | Added `findWeightLogsInRange()` — lean `select` (id, logged_at, weight only) |
| `health-log-service.ts` | Added `getChartDateRange()`, `aggregateWeightLogs()`, `getWeightChartData()` |
| `health-log-controller.ts` | Added `getWeightChart` handler |
| `health-log-routes.ts` | Added GET route, registered **before** `/:logId` |

### Route Ordering
`weight-chart` is registered **before** `/:petId/health-logs/:logId` in Express. If it were after, Express would match `"weight-chart"` as a `logId` UUID and hit a 404 every time.

### Year View — Buddhist Era (BE) Years
Labels for year view use Thai Buddhist Era (BE = CE + 543):
`เม.ย. 2569` = April 2026 CE

### Aggregation Logic
- **week / month**: raw logs one-to-one mapped to points (one weight log per day is enforced)
- **year**: grouped by calendar month → simple mean of all daily weights in that month → rounded to 2 decimal places
