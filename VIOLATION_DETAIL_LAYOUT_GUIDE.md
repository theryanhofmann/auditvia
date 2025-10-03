# Violation Detail Layout Guide

## Visual Flow Diagram

### Collapsed State
```
┌─────────────────────────────────────────────────────────────────┐
│  [🔺] Title Name                [Critical]                    [v]│
│       ├── wcag2aa  ├── wcag412                                   │
│       Quick fix summary appears here...                          │
└─────────────────────────────────────────────────────────────────┘
```

### Expanded State
```
┌─────────────────────────────────────────────────────────────────┐
│  [🔺] Title Name                [Critical]                    [^]│
│       ├── wcag2aa  ├── wcag412                                   │
├─────────────────────────────────────────────────────────────────┤
│  ▎Issue Description                                              │
│    Clear explanation of what's wrong...                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [💡] Fix Color Contrast                     [Blue Gradient]│ │
│  │     Text must have sufficient contrast...                   │ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ STEPS TO FIX                                          │  │ │
│  │  │ ① Use a contrast checker tool...                     │  │ │
│  │  │ ② For normal text, achieve 4.5:1 ratio...            │  │ │
│  │  │ ③ For large text, achieve at least 3:1...            │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  🏷️  WCAG Reference: WCAG 2.1 Level AA - Success Criterion │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [</>] Code Example                        [Terminal Style] │ │
│  │ /* Before */                                                │ │
│  │ color: #999; background: #fff;                              │ │
│  │ /* After */                                                 │ │
│  │ color: #595959; background: #fff;                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [🔀 Generate Fix PR          ] [🔗 WCAG Docs]                  │
│  └─── Purple Gradient ────────┘ └─ Blue Outline ─┘             │
│                                                                   │
│  ▎Technical Details                                              │
│    CSS Selector: .btn-secondary                                  │
│    HTML Snippet: <button class="btn-secondary">...</button>      │
└─────────────────────────────────────────────────────────────────┘
```

## Element Spacing & Hierarchy

### Header Section (Collapsed)
```
┌──────────────────────────────────────────────┐
│ [Icon] ──gap-4── [Content] ──gap── [Chevron] │
│   20px            Flex-1        20px          │
│  mt-0.5          min-w-0                      │
│                                               │
│ Content Layout:                               │
│ ├── Title + Badge (mb-2)                     │
│ ├── WCAG Tags (mb-2, if present)             │
│ └── Quick Fix (text-sm, line-clamp-2)        │
└──────────────────────────────────────────────┘

Padding: px-5 py-4 (20px 16px)
Border: border-gray-200, hover:border-gray-300
Background: bg-white, hover:bg-gray-50
```

### How to Fix Section
```
┌────────────────────────────────────────────────┐
│ Gradient Background (blue-50 → blue-100/50)    │
│ Border: 2px solid blue-200                     │
│ Padding: p-5 (20px)                            │
│ Shadow: shadow-sm                              │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ [Icon Badge] ──gap-3── [Title/Desc]     │  │
│ │   40x40px                  Flex-1        │  │
│ │   Blue-600                               │  │
│ │   rounded-lg                              │  │
│ │   shadow-sm                               │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ Steps Card (bg-white/60, p-4)            │  │
│ │                                           │  │
│ │ ┌─────────┐                              │  │
│ │ │ ① Step │ ──gap-3── Step text...        │  │
│ │ │ 24x24px │           Leading-relaxed    │  │
│ │ │ Blue-600│                              │  │
│ │ │ rounded │                              │  │
│ │ └─────────┘                              │  │
│ │                                           │  │
│ │ [Step 2, 3, 4... with space-y-2.5]       │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ ────────────────────────────────────────────  │
│ 🏷️  WCAG Reference: ...                       │
└────────────────────────────────────────────────┘
```

### Actions Row
```
┌────────────────────────────────────────────────┐
│ [Generate Fix PR Button] ──gap-3── [WCAG Docs]│
│        Flex-1, py-3                  py-3      │
│     Purple Gradient                Blue Outline│
│     Shadow on hover             Responsive text│
│                                                │
│ States:                                        │
│ - Normal: from-purple-600 to-purple-700        │
│ - Hover: Darker + shadow-lg + translate-y-0.5  │
│ - Loading: Gray + spinner                      │
│ - Disabled: cursor-not-allowed                 │
└────────────────────────────────────────────────┘
```

## Color Palette Reference

### Impact Colors
| Severity | Icon Color | Badge Background | Badge Text |
|----------|-----------|------------------|------------|
| Critical | red-600   | red-100          | red-800    |
| Serious  | red-600   | orange-100       | orange-800 |
| Moderate | yellow-600| yellow-100       | yellow-800 |
| Minor    | gray-600  | gray-100         | gray-800   |

### WCAG Tags
```css
Background: purple-100 (light), purple-900/20 (dark)
Text: purple-700 (light), purple-300 (dark)
Border: Implicit from background
Padding: px-2 py-0.5
Border-radius: rounded
Font: text-xs font-medium
```

### How to Fix Section
```css
Background: gradient-to-br from-blue-50 to-blue-100/50
Border: 2px border-blue-200
Icon Badge: bg-blue-600 (white icon)
Text: text-blue-900 (title), text-blue-800 (body)
Step Numbers: bg-blue-600 text-white (circular)
WCAG Ref: text-blue-800 (with Tag icon in blue-700)

Dark Mode:
Background: from-blue-900/20 to-blue-900/10
Border: border-blue-800
Icon Badge: bg-blue-500
Text: text-blue-100 (title), text-blue-200 (body)
Step Numbers: bg-blue-500 text-white
```

### Code Example
```css
Background: bg-gray-900 (header: bg-gray-800)
Border: border-gray-700
Text: text-green-400 (code), text-gray-200 (header)
Padding: p-4 (code), px-4 py-2 (header)
Font: font-mono text-xs

Dark Mode:
Background: bg-gray-950 (header: bg-gray-900)
Border: border-gray-800
Text: text-green-300
```

### Generate Fix PR Button
```css
Normal:
  background: from-purple-600 to-purple-700
  text: text-white
  shadow: shadow-sm shadow-purple-500/20
  
Hover:
  background: from-purple-700 to-purple-800
  shadow: shadow-lg shadow-purple-500/30
  transform: -translate-y-0.5
  
Loading:
  background: bg-gray-300 (light), bg-gray-700 (dark)
  text: text-gray-500 (light), text-gray-400 (dark)
  cursor: cursor-not-allowed
```

### WCAG Docs Button
```css
Background: bg-blue-50 hover:bg-blue-100
Border: border-blue-200
Text: text-blue-600 hover:text-blue-700

Dark Mode:
Background: bg-blue-900/20 hover:bg-blue-900/30
Border: border-blue-800
Text: text-blue-400 hover:text-blue-300
```

## Typography Scale

### Headers
| Element | Size | Weight | Color (Light) | Color (Dark) |
|---------|------|--------|---------------|--------------|
| Main Title | base (16px) | semibold (600) | gray-900 | white |
| Impact Badge | xs (12px) | semibold (600) | Varies | Varies |
| Section Header | sm (14px) | semibold (600) | gray-900 | gray-200 |
| How to Fix Title | base (16px) | bold (700) | blue-900 | blue-100 |
| Sub-header | xs (12px) | bold (700) uppercase | blue-900 | blue-100 |

### Body Text
| Element | Size | Weight | Leading | Color |
|---------|------|--------|---------|-------|
| Description | sm (14px) | normal (400) | relaxed | gray-700/300 |
| Steps | sm (14px) | normal (400) | relaxed | blue-900/100 |
| Quick Fix | sm (14px) | normal (400) | normal | gray-600/400 |
| Technical Details | xs (12px) | medium (500) | normal | gray-500/400 |

### Code
```css
Font: font-mono
Size: text-xs (12px)
Color: text-green-400 (light), text-green-300 (dark)
Whitespace: whitespace-pre-wrap
```

## Responsive Breakpoints

### Desktop (lg+)
- Full layout with all elements visible
- Side-by-side action buttons
- Full button text: "Generate Fix PR" + "WCAG Docs"
- Optimal padding and spacing

### Tablet (md)
- Maintained layout
- Buttons may shrink slightly
- All functionality intact

### Mobile (sm)
- Abbreviated button text
  - "Generate Fix PR" stays
  - "WCAG Docs" → "Docs"
- Buttons remain side-by-side (flex with gap)
- Reduced padding if needed
- Code examples scroll horizontally

## Interaction States

### Accordion Button
```
Default:
  cursor: pointer
  background: white
  border: gray-200
  
Hover:
  background: gray-50
  border: gray-300
  
Expanded:
  chevron: rotate-180
  aria-expanded: true
```

### Generate Fix PR Button
```
Default:
  cursor: pointer
  Purple gradient
  Shadow: shadow-sm
  
Hover:
  Darker purple
  Shadow: shadow-lg
  Transform: -translate-y-0.5
  
Active (Click):
  isGeneratingPR: true
  Disabled
  Shows spinner
  Gray background
  
Success:
  Alert: "PR generation feature coming soon!"
  isGeneratingPR: false
  Returns to default state
```

## Accessibility Annotations

### ARIA Attributes
```html
<button aria-expanded={isExpanded}>
  <!-- Header content -->
</button>
```

### Keyboard Navigation
1. Tab to accordion header
2. Enter/Space to expand/collapse
3. Tab to "Generate Fix PR" button
4. Enter/Space to trigger PR generation
5. Tab to "WCAG Docs" link
6. Enter to open in new tab

### Focus States
- All interactive elements have visible focus rings
- Focus ring color: ring-blue-500
- Focus ring width: ring-2
- Focus ring offset: ring-offset-2

## Animation Specs

### Chevron Rotation
```css
transition: transform
transform: rotate-180deg (when expanded)
```

### Button Hover
```css
transition: all
transform: -translate-y-0.5
shadow: shadow-lg
```

### Loading Spinner
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

animation: spin 1s linear infinite
border-top: transparent (for spinner effect)
```

## Content Guidelines

### Issue Description
- Clear, concise explanation of the problem
- Written in plain English (no jargon)
- Explains user impact

### How to Fix Title
- Action-oriented verb (e.g., "Fix", "Add", "Update")
- Specific to the issue type
- Examples:
  - "Fix Color Contrast"
  - "Add Alt Text to Images"
  - "Add Accessible Button Name"

### Steps to Fix
- Numbered list (1, 2, 3...)
- Each step is actionable
- Includes specific values/examples
- References tools where helpful
- Ends with verification step

### Code Examples
- Shows "Before" and "After"
- Uses comments to label sections
- Highlights key changes
- Realistic, copy-paste ready code

### WCAG Reference
- Format: "WCAG [version] Level [A/AA/AAA] - Success Criterion [number]"
- Example: "WCAG 2.1 Level AA - Success Criterion 1.4.3"

## Summary

This layout provides:
- ✨ **Clear Visual Hierarchy**: Icon → Title → Impact → WCAG → Actions
- 🎯 **Actionable Design**: Prominent "Generate Fix PR" button
- 📚 **Educational**: Step-by-step guidance with WCAG references
- 🎨 **Professional**: Gradient cards, terminal-style code, smooth animations
- ♿ **Accessible**: ARIA labels, keyboard navigation, high contrast
- 📱 **Responsive**: Adapts to all screen sizes

The design guides users from problem identification → understanding → action → resolution! 🚀
