# AI Engineer Contextual Enhancements

## 🎯 **What Was Enhanced**

### **1. Rich Scan Context in Every Response**
OpenAI now receives comprehensive context for every reply:

```
Site: **Your Site Name**
URL: https://yoursite.com
Platform: **Webflow**
Verdict: **non-compliant** (❌)
Issues: 23 total (5 critical, 8 serious, 10 moderate)

Top 5 Rules to Fix:
1. [CRITICAL] Buttons must have discernible text
   Rule: button-name
   Selector: .nav-button
   WCAG: 4.1.2

2. [CRITICAL] Images must have alternate text
   Rule: image-alt
   Selector: img.hero-image
   WCAG: 1.1.1
...

3 Concrete Examples:
Example 1: button-name
   Location: https://yoursite.com
   Selector: .nav-button
   Code: <button></button>
```

AI responses now **always reference actual site data**, not generic advice.

---

### **2. Platform-Specific Instructions**

#### **Framer:**
```
When giving instructions, use exact Framer UI paths:
1. Select the element in canvas
2. Right panel → Accessibility section
3. Add "ARIA Label" field with descriptive text
4. Click Publish → Update site
```

#### **Webflow:**
```
When giving instructions, use exact Webflow UI paths:
1. Select element in Designer
2. Settings panel (D key) → Element Settings
3. Add alt text / aria-label / role attribute
4. Publish to [staging/production]
```

#### **WordPress:**
```
When giving instructions, use exact WordPress paths:
1. Edit page in Block Editor / Page Builder
2. Select block/element → Block settings (right sidebar)
3. Advanced → "Additional CSS class" or "HTML attributes"
4. Update/Publish page
```

**If platform uncertain:** AI asks "Do you use Framer/Webflow/WordPress?" then provides exact steps.

---

### **3. Contrast Color Computation**

When discussing contrast issues, AI provides:

**Accessible Palette:**
```
• Body text: #1a1a1a (21:1 ratio) ✅
• Muted text: #4a4a4a (9:1 ratio) ✅
• Primary brand: #0066cc (based on your current #3399ff)
• On-primary text: #ffffff (ensures 4.5:1+) ✅
```

**Options:**
- "Apply to all" - Global color update
- "Per element" - Selective fixes

---

### **4. Mode-Specific Actions**

#### **Founder Mode Actions:**
- ✨ "Fix contrast now"
- 🔗 "Open Webflow steps"
- 📧 "Email to designer"
- 📄 "Download CSV"
- ⚠️ "Show priorities"

#### **Developer Mode Actions:**
- 🐙 "Create 5 GitHub issues" (shows actual count)
- 💻 "Generate fixes for button-name" (shows actual rule)
- 📝 "Show all selectors"
- 🎨 "Generate accessible palette"
- 📊 "View priority matrix"

---

### **5. Enhanced Tone & Format**

**Response Structure:**
```
[Direct answer with specifics]
[Time estimate: ~15min]
[One clear next action]
```

**Style:**
- ✅ Short, confident, zero filler
- ✅ Lead with answer
- ✅ Include time estimates
- ✅ End with ONE action
- ❌ No "I hope this helps"
- ❌ No "Let me know if..."

**Max length:** 250 words

---

## 📊 **Before vs After Examples**

### **Example 1: General Question**

**Before (Generic):**
> "Here's your prioritized action plan. You have critical issues that need attention. I can help you fix them. What would you like to start with?"

**After (Contextual):**
> "**Your Site Name** has 5 critical issues blocking accessibility. Top priority: fix your navigation buttons - they're missing text labels, affecting 15% of users.
>
> In **Webflow**: Select each button → Settings panel (D) → Add aria-label → Publish.
>
> **Time:** ~15min for all 5 buttons
>
> **Next:** Fix button labels first?"

---

### **Example 2: Contrast Question (Founder Mode)**

**User:** "How do I fix the color contrast?"

**Before:**
> "You need to adjust colors to meet WCAG contrast ratios. Use darker text or lighter backgrounds."

**After:**
> "**Your Site Name** has 8 contrast violations. Your current gray text (#999999) only achieves 2.8:1 - needs 4.5:1 minimum.
>
> **Replace with:**
> - Body text: #1a1a1a (21:1 ratio) ✅
> - Muted text: #4a4a4a (9:1 ratio) ✅
>
> In **Webflow**: Style panel → Text color → Paste #1a1a1a
>
> **Time:** ~10min to update all instances
>
> **Actions:**
> - [Fix contrast now]
> - [Get accessible palette]
> - [Open Webflow steps]"

---

### **Example 3: Technical Question (Developer Mode)**

**User:** "Show me how to fix these button issues"

**Before:**
> "You can add aria-label or text content to buttons. Here's an example: `<button aria-label='Submit'>Submit</button>`"

**After:**
> "**Your Site Name** has 5 `button-name` violations across navigation:
>
> **Selectors:**
> `.nav-button` (3 instances)
> `.cta-button` (2 instances)
>
> **Fix:**
> ```jsx
> // Before
> <button className='nav-button'></button>
>
> // After
> <button className='nav-button' aria-label='Open menu'>
>   <MenuIcon />
> </button>
> ```
>
> **WCAG:** 4.1.2 Name, Role, Value
> **Time:** ~20min for all 5
>
> **Actions:**
> - [Create 5 GitHub issues]
> - [Generate fixes for button-name]
> - [Show all selectors]"

---

### **Example 4: Platform Uncertainty**

**User:** "How do I fix this?"

**AI (when platform = 'custom'):**
> "**Your Site Name** needs button labels fixed (5 critical). Before I show exact steps: **Do you use Framer, Webflow, or WordPress?**
>
> Generic fix: Add `aria-label` attribute to each button with descriptive text.
>
> **Time:** ~15min
>
> Tell me your platform for specific instructions."

---

## 🎨 **Contrast Palette Example**

When AI detects contrast issues, it generates an accessible palette:

```
**Accessible Color Palette for Your Site Name:**

Body Text:
  Current: #999999 (2.8:1) ❌
  Compliant: #1a1a1a (21:1) ✅
  
Muted Text:
  Current: #cccccc (1.6:1) ❌
  Compliant: #4a4a4a (9:1) ✅

Primary Brand:
  Current: #3399ff (3.2:1) ⚠️
  Compliant: #0066cc (4.8:1) ✅
  
On-Primary Text:
  Use: #ffffff (ensures 4.5:1+ on all primary colors)

**Implementation Options:**
1. Apply to all (global CSS update)
2. Per element (selective fixes)

Time: ~30min to apply globally in Webflow
```

---

## 🚀 **Testing It**

### **1. Open AI Engineer**
Navigate to any scan report with violations → Click AI button (bottom right)

### **2. Try These Prompts:**

**Founder Mode:**
- "What should I fix first?"
- "How do I fix contrast?"
- "Explain this to me simply"

**Developer Mode:**
- "Show me the button selectors"
- "Create GitHub issues"
- "Generate code fixes"

### **3. Check Response Quality:**

Look for:
- ✅ References your **actual site name**
- ✅ Mentions **specific issue counts**
- ✅ Shows **actual selectors** from your scan
- ✅ Provides **exact platform steps** (Webflow/Framer/WordPress)
- ✅ Includes **time estimates**
- ✅ Ends with **one clear action**
- ✅ Suggests **contextual buttons**

### **4. Check Terminal:**

```
🤖 [AI Chat] Using OpenAI API
🔄 [OpenAI] Calling API: { 
  messageCount: 3, 
  mode: 'founder', 
  platform: 'webflow', 
  issueCount: 23 
}
✅ [OpenAI] Response received: { 
  tokensUsed: 342, 
  responseLength: 287 
}
```

---

## 📝 **What Changed in the Code**

### **Enhanced System Prompt:**
- Added full scan context (site, verdict, counts)
- Top 5 rules with selectors and WCAG
- 3 concrete code examples
- Platform-specific instruction templates
- Tone and format guidelines
- Contrast palette instructions

### **Smarter Action Detection:**
- Detects contrast issues → Suggests palette actions
- Platform mentions → Suggests platform guide
- Mode-specific buttons (Founder vs Developer)
- Shows actual counts (e.g., "Create 5 GitHub issues")
- Deduplicates and limits to 3 most relevant

### **Platform Instructions:**
- Exact UI paths for Framer
- Exact UI paths for Webflow
- Exact UI paths for WordPress
- Fallback: Ask user which platform they use

---

## ✅ **Success Criteria**

- [x] Every response references actual site data
- [x] Platform-specific steps for Webflow/Framer/WordPress
- [x] Contrast issues include color computations
- [x] Mode-specific action buttons
- [x] Short, confident tone with time estimates
- [x] No "guide not available" - asks instead
- [x] Max 250 words per response
- [x] Ends with ONE clear next action

---

## 🎯 **Impact**

**Before:** Generic, vague, requires follow-up questions
**After:** Specific, actionable, references your actual data

The AI Engineer now acts like a **senior accessibility consultant** who's already reviewed your specific scan and knows exactly what to fix and how to fix it in your platform.

