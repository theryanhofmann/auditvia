# Reports Navigation Structure - User Guide

## 📍 Navigation Clarity

We have **two distinct "Reports" pages** that serve different purposes. Here's how they work:

---

## 🗂️ Two Types of Reports Pages

### **1. Reports Dashboard** (`/dashboard/reports`)
**Access:** Sidebar → "Reports"

**Purpose:** Aggregated analytics and insights across all scans

**Features:**
- KPI cards (total violations, trends, forecasts)
- Compliance trends over time
- Top violation rules (donut chart)
- Top affected pages
- Risk projections
- AI-generated insights
- Filter by time range, site, severity
- Export aggregated reports

**Use Case:**
- "Show me the big picture across all my sites"
- "What are our compliance trends this month?"
- "Which rules are causing the most issues?"
- "How is our risk changing over time?"

**Think of it as:** The **Analytics Dashboard** - bird's eye view

---

### **2. Individual Scan Report** (`/dashboard/reports/[scanId]`)
**Access:** Sites → View Scans → Click a specific scan

**Purpose:** Detailed results of a single accessibility scan

**Features:**
- Verdict banner (Compliant/At-Risk/Non-Compliant)
- Issue breakdown by category
- Individual issue details
- Founder/Developer mode toggle
- Issue detail panel with fix guidance
- AI Engineer assistant
- Platform-specific fix suggestions
- Export single scan report

**Use Case:**
- "Show me exactly what's wrong on this specific scan"
- "I need to fix the issues found on November 15th"
- "What accessibility issues are on my homepage?"
- "How do I fix this specific button label issue?"

**Think of it as:** The **Scan Details Page** - microscope view

---

## 🧭 Navigation Flow

### Typical User Journey:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Sidebar → "Reports"                                   │
│    └→ /dashboard/reports (Analytics Dashboard)          │
│       - See overall trends                               │
│       - Identify problem areas                           │
│       - Filter by time/site                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Want to see details of a specific scan?              │
│    └→ Sidebar → "Sites"                                 │
│       └→ Click a site                                   │
│          └→ "View Scans" tab                            │
│             └→ Click a specific scan                    │
│                └→ /dashboard/reports/[scanId]           │
│                   - Detailed scan results               │
│                   - Fix individual issues               │
│                   - Get AI guidance                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Differences

| Aspect | Reports Dashboard | Individual Scan Report |
|--------|------------------|----------------------|
| **URL** | `/dashboard/reports` | `/dashboard/reports/[scanId]` |
| **Data Scope** | Multiple scans aggregated | Single scan |
| **Time Range** | Filterable (7d, 30d, 90d, custom) | Fixed (scan date) |
| **View** | Charts, trends, forecasts | Issues by category |
| **Purpose** | Strategic overview | Tactical fixing |
| **Actions** | Export aggregate data | Fix specific issues |
| **Filters** | Time, site, severity | Founder/Developer mode |

---

## 🔧 UX Improvements Implemented

### **1. Sidebar Label Changed**
- **Before:** "Detailed Reports" (confusing!)
- **After:** "Reports" (clearer)
- The analytics dashboard is just "Reports"
- Individual scans are accessed through "Sites"

### **2. Breadcrumb Added to Scan Reports**
Individual scan reports now show:
```
Sites / [Site Name] / Scan Report
```
This makes it clear:
- Where you are (Scan Report)
- How to get back (click "Sites" or site name)
- Context (which site this scan belongs to)

### **3. Clear Routing Structure**
```
/dashboard/reports        → Reports Analytics Dashboard
/dashboard/reports/[id]   → Individual Scan Report
```

This follows common patterns:
- `/products` → List of products
- `/products/123` → Individual product

In our case:
- `/reports` → Reports overview/analytics
- `/reports/[scanId]` → Individual report

---

## 📊 When to Use Each Page

### Use **Reports Dashboard** (`/dashboard/reports`) when you want to:
- ✅ See compliance trends over time
- ✅ Compare multiple sites
- ✅ Identify patterns across scans
- ✅ Get AI insights about overall compliance
- ✅ Forecast future compliance
- ✅ Export aggregated data
- ✅ Make strategic decisions

### Use **Individual Scan Report** (`/dashboard/reports/[scanId]`) when you want to:
- ✅ Review a specific scan's results
- ✅ Fix issues from a particular date
- ✅ See detailed issue breakdowns
- ✅ Get fix guidance for specific problems
- ✅ Use platform-specific fix suggestions
- ✅ Chat with AI Engineer about issues
- ✅ Export a single scan's data

---

## 🧩 Mental Model

Think of it like a **file system**:

```
📁 Reports (Analytics Dashboard)
   ├── Overview of all scans
   ├── Trends and insights
   └── Aggregate data
   
📁 Sites
   ├── 📁 Site A
   │   ├── Settings
   │   └── 📄 Scans
   │       ├── Scan Report (Nov 15) ← Individual report
   │       ├── Scan Report (Nov 10) ← Individual report
   │       └── Scan Report (Nov 5)  ← Individual report
   └── 📁 Site B
       └── ...
```

Or like **email**:

- **Reports Dashboard** = Inbox overview (message counts, filters, trends)
- **Individual Scan Report** = Opening a specific email to read and act on it

---

## 🎨 Visual Distinction

### Reports Dashboard (Analytics)
- Charts and graphs prominent
- Multiple site filters
- Time range selectors
- KPI cards at top
- Forecast visualizations

### Individual Scan Report
- Verdict banner (Compliant/At-Risk/Non-Compliant)
- Issue categories (Clickables, Graphics, etc.)
- Issue list with severity dots
- Fix guidance panel
- AI Engineer chat

---

## 🚀 Future Enhancements

To make this even clearer, we could add:

1. **Back Button** on individual scan reports
   - "← Back to Scans" or "← Back to Site"

2. **Related Scans Widget** on individual reports
   - "Other scans for this site"
   - Quick jump between scan dates

3. **Breadcrumb on Analytics Dashboard**
   - "Dashboard / Reports" (though less critical here)

4. **Tab Navigation** on site detail page
   - Overview | Scans | Settings
   - Currently under "View Scans" button

---

## ✅ Summary

**The confusion is resolved by:**

1. ✅ **Renamed sidebar item** from "Detailed Reports" to "Reports"
2. ✅ **Added breadcrumb** to individual scan reports (Sites / Site Name / Scan Report)
3. ✅ **Clear documentation** of the two different pages
4. ✅ **Logical routing structure** (`/reports` vs `/reports/[id]`)

**Key Takeaway:**
- **"Reports"** (sidebar) = Analytics dashboard for all scans
- **Individual scan** = Access through Sites → View Scans → Click scan

The structure now follows industry-standard patterns and provides clear visual cues about where users are in the application!

