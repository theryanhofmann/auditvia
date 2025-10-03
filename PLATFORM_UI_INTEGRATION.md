# Platform Detection UI Integration

## 🎯 **What Was Fixed**

Platform detection was working during scans and storing data in the database, but the detected platform wasn't being displayed in the UI or passed to the AI. This has now been fully integrated across the entire report experience.

---

## ✅ **Changes Made**

### **1. Database Schema** ✅
- Added columns to `scans` table:
  - `platform` (TEXT) - e.g., 'webflow', 'wordpress', 'framer'
  - `platform_confidence` (FLOAT) - 0.0 to 1.0
  - `platform_detected_from` (TEXT) - 'url', 'meta', 'html', 'script'

### **2. Data Flow** ✅
Updated the entire data pipeline to pass platform info:

```
Scan Detection (runA11yScan.ts)
  ↓ stores platform in DB
Database (scans table)
  ↓ queries platform columns
Server Component (page.tsx)
  ↓ passes to client
EnterpriseReportClient
  ↓ distributes to children
IssueDetailPanel, AiEngineer, ReportTopBanner
```

### **3. Report Page (`page.tsx`)** ✅
- Added `platform`, `platform_confidence`, `platform_detected_from` to database query
- Passed platform data to `EnterpriseReportClient`

### **4. Enterprise Report Client** ✅
- Updated interface to accept platform fields
- Passed platform to:
  - `ReportTopBanner` - displays platform badge
  - `IssueDetailPanel` - shows platform-specific guidance
  - `AiEngineer` - provides platform-aware responses

### **5. Report Top Banner** ✅
- Added platform badge next to site URL
- Shows platform name with confidence indicator
- Example: `🟦 Framer ✓` (if confidence >= 80%)

### **6. Issue Detail Panel** ✅
**Before:**
```
Fix This in Your Builder:
[ Webflow ]
[ WordPress ]  
[ Framer ]
```

**After (when platform = 'framer'):**
```
Fix This in Framer:
[ Framer ]  ← Only shows detected platform
```

**Platform-Specific Sections:**
- "Try This in Your Builder" → "Fix This in Framer" (when detected)
- Shows only the detected platform's guide
- "Get Help for Your Platform" → "Get Framer Help"
- Single button instead of 3 buttons

### **7. AI Engineer** ✅
- Receives `platform` and `platformConfidence` props
- Sends to API in context object
- AI knows the platform from the scan (no guessing!)

**Before:**
```json
{
  "context": {
    "siteUrl": "https://example.com",
    "siteName": "Example"
  }
}
```

**After:**
```json
{
  "context": {
    "siteUrl": "https://example.com",
    "siteName": "Example",
    "platform": "framer",
    "platformConfidence": 0.95
  }
}
```

---

## 🎨 **UI Changes You'll See**

### **1. Report Top Banner**
```
[Site Name]
[Site URL] 🟦 Framer ✓
          ↑ Platform badge (blue, with confidence checkmark)
```

### **2. Issue Detail Panel (Founder Mode)**
```
Fix This in Framer
──────────────────
🔷 Framer
Select button → Settings → add Label

Get Framer Help
───────────────
[🌟 Framer]  ← Single button
```

### **3. AI Engineer**
**Console Output:**
```
🔍 [AI Chat] Platform info: {
  platform: 'framer',
  confidence: 0.95,
  source: 'stored-from-scan'
}
```

**AI Response:**
```
Your Framer site has 5 button-name violations.

In Framer:
1. Select button → Component panel
2. Properties → Add "aria-label"
3. Publish changes

Time: ~15min
```

---

## 📊 **Detection Accuracy**

### **High Confidence (80%+):**
- ✅ Webflow sites (URL + generator meta + classes)
- ✅ WordPress sites (generator meta + wp-content paths)
- ✅ Framer sites (URL + data-framer attributes)
- ✅ Next.js sites (\_next scripts + NEXT_DATA)

### **Medium Confidence (50-79%):**
- ⚠️ React sites (react-root, data-reactroot)
- ⚠️ Vue sites (data-v- attributes)

### **Low Confidence (<50%):**
- ❓ Custom sites (no clear platform signals)
- Falls back to "Custom" platform

---

## 🔍 **How to Verify It's Working**

### **1. Run a New Scan**
```bash
# Visit: http://localhost:3000/dashboard
# Click "Scan Now" on any site

# Watch terminal:
🔍 Detecting platform...
✅ Platform detected: { platform: 'framer', confidence: 0.95, detected_from: 'url' }
🧵 [job] ✅ Platform detected: framer (95% confidence)
```

### **2. Check the Report**
- **Top banner** should show platform badge: `🟦 Framer ✓`
- Click any issue → **Issue Detail Panel**:
  - Should say "Fix This in Framer" (not "Try This in Your Builder")
  - Should show only Framer guide (not all 3)
  - Button should say "Get Framer Help" (not generic)

### **3. Test AI Engineer**
```
1. Open AI Engineer chat
2. Terminal should show:
   🔍 [AI Chat] Platform info: { platform: 'framer', source: 'stored-from-scan' }

3. Ask: "How do I fix this?"
4. AI should respond with Framer-specific steps:
   "Your Framer site needs button labels fixed.
    In Framer:
    1. Select button → Properties
    2. Add aria-label
    3. Publish"

NOT generic: "How do I fix these in Webflow?"
```

---

## 🐛 **Troubleshooting**

### **Issue: Platform badge not showing**
**Check:**
1. Database has platform data:
   ```sql
   SELECT id, platform, platform_confidence FROM scans ORDER BY created_at DESC LIMIT 5;
   ```
2. Browser console for errors
3. Run a new scan (old scans won't have platform data)

### **Issue: AI still guessing wrong platform**
**Check:**
1. Terminal logs for `🔍 [AI Chat] Platform info:`
2. Should show `source: 'stored-from-scan'`
3. If `source: 'fallback-detection'`, the scan didn't detect a platform

### **Issue: Issue detail still shows all builders**
**Check:**
1. `IssueDetailPanel` received `platform` prop
2. Console log in `IssueDetailPanel.tsx` line 49
3. Platform should be lowercase ('framer', not 'Framer')

---

## 📝 **Files Modified**

### **Database:**
- ✅ `supabase/migrations/0063_add_platform_detection.sql`

### **Detection:**
- ✅ `src/lib/platform-detector.ts` (already had `detectPlatformFromPage`)
- ✅ `scripts/runA11yScan.ts` (already calling detection)
- ✅ `src/app/api/audit/route.ts` (already saving to DB)

### **Data Flow:**
- ✅ `src/app/dashboard/reports/[scanId]/page.tsx`
  - Query platform columns from database
  - Pass to EnterpriseReportClient

- ✅ `src/app/dashboard/reports/[scanId]/EnterpriseReportClient.tsx`
  - Accept platform in interface
  - Distribute to child components

### **UI Components:**
- ✅ `src/app/components/report/ReportTopBanner.tsx`
  - Display platform badge

- ✅ `src/app/components/report/IssueDetailPanel.tsx`
  - Platform-specific "Fix This in [Platform]"
  - Single platform guide instead of all 3
  - Platform-specific help button

- ✅ `src/app/components/ai/AiEngineer.tsx`
  - Accept platform props
  - Send to API in context

---

## 🎯 **Success Criteria**

✅ **Database:** Platform columns exist and populated on new scans  
✅ **UI:** Platform badge visible in report top banner  
✅ **Issue Detail:** Only shows detected platform (not all 3)  
✅ **AI Engineer:** Uses stored platform (not guessing)  
✅ **Terminal:** Shows platform detection logs during scan  
✅ **Console:** Shows platform info in AI chat logs  

---

## 🚀 **What's Next**

### **Phase 2: Enhanced Platform Guides**
- Add Squarespace, Wix, Shopify detection
- More detailed platform-specific instructions
- Video tutorials per platform

### **Phase 3: Platform API Integration**
- Webflow: Auto-apply fixes via API
- WordPress: Generate plugin with fixes
- Framer: Export component code

---

## 📊 **Before vs. After**

### **Before:**
```
User scans Framer site
  ↓
Report shows generic "Fix this in your builder"
  ↓
Shows Webflow, WordPress, Framer guides (all 3)
  ↓
AI asks: "How do I fix these in Webflow?" (WRONG!)
  ↓
User has to correct the AI
```

### **After:**
```
User scans Framer site
  ↓
Platform detected: Framer (95% confidence)
  ↓
Report shows: "Fix This in Framer" 🟦 ✓
  ↓
Shows only Framer guide
  ↓
AI says: "Your Framer site needs button labels. In Framer: 1. Select button..."
  ↓
User gets accurate, platform-specific help immediately
```

---

## ✅ **Summary**

Platform detection is now **fully integrated** into the UI:

1. ✅ **Detected during scan** - Playwright analyzes page
2. ✅ **Stored in database** - Platform, confidence, source
3. ✅ **Displayed in reports** - Badge in top banner
4. ✅ **Filtered issue guidance** - Only shows relevant platform
5. ✅ **AI knows platform** - No more guessing
6. ✅ **Founder-friendly** - "Fix This in Framer" vs generic
7. ✅ **Developer-aware** - Platform-specific code examples

**The platform is now auto-detected, stored, and used throughout the entire product!** 🎉

