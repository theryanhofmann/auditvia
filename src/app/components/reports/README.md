# Reports Dashboard Components

Enterprise-grade components for the Auditvia Reports dashboard. Built for motion, engagement, and credibility.

## Design Tokens

All components use a unified design system defined in `design-tokens.ts`:

- **Spacing**: 24px base system (xs, sm, md, lg, xl)
- **Colors**: Unified slate gray scale with semantic status colors
- **Motion**: 300ms base timing with cubic-bezier easing
- **Typography**: Consistent font sizes and weights
- **Shadows**: Subtle elevation for depth

## Core Components

### 1. `DeltaBadge`
Shows trend indicators with up/down arrows and contextual colors.

```tsx
<DeltaBadge 
  value={12.5} 
  format="percentage" 
  inverse={false}  // If true, negative is good
  size="md"
  showIcon={true}
/>
```

**Props**:
- `value`: number - The delta value (can be positive/negative)
- `format`: 'percentage' | 'number' | 'currency'
- `inverse`: boolean - Flip color logic (for violations, etc.)
- `size`: 'sm' | 'md' | 'lg'
- `showIcon`: boolean

### 2. `Sparkline`
Inline SVG chart for showing trends in compact spaces.

```tsx
<Sparkline
  data={[10, 15, 12, 18, 22]}
  width={100}
  height={24}
  color="#3b82f6"
  showArea={true}
/>
```

**Props**:
- `data`: number[] - Data points to plot
- `width/height`: number - SVG dimensions
- `color`: string - Line/fill color
- `showArea`: boolean - Show gradient area under line

### 3. `InsightCard`
Rotating AI insight cards with session memory.

```tsx
<InsightCard
  insights={[
    {
      id: 'benchmark_1',
      type: 'benchmark',
      title: 'Industry Leader',
      subtitle: 'Your score is in the top 15% of companies',
      value: '92%',
      delta: 5.2,
      sparklineData: [85, 87, 90, 92],
      action: {
        label: 'View details',
        onClick: () => {}
      }
    }
  ]}
  rotationInterval={8000}
  maxVisible={3}
/>
```

**Insight Types**:
- `benchmark` - Compare to industry
- `risk` - Risk delta/exposure
- `hotspot` - Fastest growing issue
- `forecast` - Projection/prediction

**Session Memory**: Tracks seen insights in `sessionStorage` to avoid repetition within a session.

### 4. `BadgeRibbon`
Achievement badges with celebration animations.

```tsx
<BadgeRibbon
  currentMetrics={{
    score: 92,
    issues_resolved: 50,
    scans: 15,
    github_issues: 3,
    risk_reduced: 12000
  }}
  onBadgeEarned={(badge) => {
    // Trigger analytics, etc.
  }}
/>
```

**Built-in Badges**:
- `90%+ Club` - Score ≥ 90
- `50 Issues Resolved` - Fixed 50+ violations
- `GitHub Pioneer` - Created first issue
- `Vigilant Monitor` - 10+ scans
- `Risk Reducer` - Reduced $10k+ risk

**Storage**: Earned badges persist in `localStorage`.

### 5. `NotificationDrawer`
Slide-up notification feed in bottom-right corner.

```tsx
<NotificationDrawer
  notifications={[
    {
      id: 'notif_1',
      type: 'success',
      title: 'Scan Completed',
      message: 'example.com scan finished with 12 issues',
      timestamp: new Date(),
      dismissible: true,
      action: {
        label: 'View report',
        onClick: () => {}
      }
    }
  ]}
  onDismiss={(id) => {}}
  maxVisible={5}
/>
```

**Notification Types**:
- `success` - Green, CheckCircle2
- `warning` - Amber, AlertTriangle
- `info` - Blue, Info
- `github` - Purple, Github
- `milestone` - Blue, TrendingUp

**Features**:
- Dismissible with session memory
- Rate-limited display
- Keyboard navigable (Escape to close)
- Pulse animation on bell icon

### 6. `ExportMenu`
Dropdown menu for CSV/PDF exports.

```tsx
<ExportMenu
  onExportCSV={async () => {
    // Export logic
  }}
  onExportPDF={async () => {
    // Optional PDF export
  }}
  disabled={false}
  label="Export"
  size="md"
/>
```

**Features**:
- Loading states with toasts
- Closes on outside click or Escape
- Reflects current filter state in footer

### 7. `RightSideDetailDrawer`
Full-height drawer for drill-down details.

```tsx
<RightSideDetailDrawer
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Color Contrast Violations"
  subtitle="23 instances across 5 pages"
  onExport={() => {}}
  externalLink={{
    label: 'WCAG Guidelines',
    href: 'https://...'
  }}
>
  <YourDetailContent />
</RightSideDetailDrawer>
```

**Features**:
- Spring animation (damping: 30, stiffness: 300)
- Backdrop blur
- Optional export and external link buttons
- Scrollable content with custom scrollbar

## Data Dependencies

### KPI Data Structure
```typescript
interface KPIData {
  total_sites: number
  total_scans_30d: number
  total_violations_30d: number
  avg_score_30d: number
  prev_avg_score?: number  // For delta calculation
}
```

Fetch from: `GET /api/reports/kpis?teamId=...&startDate=...&endDate=...`

### Insights Data
Insights are dynamically generated from:
- KPI data (for benchmarks)
- Violation trends (for hotspots)
- Risk model calculations (for risk delta)
- Historical scans (for forecasts)

Example insight generation:
```typescript
const insights: Insight[] = [
  {
    id: 'benchmark_percentile',
    type: 'benchmark',
    title: `Top ${percentile}% Performer`,
    subtitle: `Your ${score}% score beats ${percentile}% of companies`,
    value: `${score}%`,
    delta: scoreDelta,
    sparklineData: last7DaysScores,
    action: {
      label: 'Compare to industry',
      onClick: () => router.push('/dashboard/reports?view=benchmark')
    }
  }
]
```

### Badge Metrics
Passed via `currentMetrics` prop to `BadgeRibbon`. Calculate from:
- `score`: Latest scan's `compliance_score`
- `issues_resolved`: Count of violations with `status = 'resolved'`
- `scans`: Count of completed scans
- `github_issues`: Count of rows in `github_issues` table
- `risk_reduced`: Sum of `risk_delta` from resolved violations

### Notifications
Generate from:
- Scan completion events
- GitHub issue creation
- Milestone detection (score improvements, thresholds crossed)
- (Optional) External ADA lawsuit feed

## Adding New Insights

1. Define the insight object:
```typescript
{
  id: 'my_new_insight',
  type: 'forecast',
  title: 'Projected Compliance Date',
  subtitle: 'Based on current fix rate',
  value: 'May 15, 2025',
  sparklineData: [...],
  action: { ... }
}
```

2. Add generation logic in the Reports page:
```typescript
const generateInsights = (kpiData, trendData) => {
  const insights = []
  
  // Your logic here
  if (condition) {
    insights.push({ ... })
  }
  
  return insights
}
```

3. Pass to `<InsightCard insights={insights} />`

## Motion & Accessibility

All components use:
- **300ms base duration** with cubic-bezier easing
- **Framer Motion** for smooth animations
- **Focus rings** (2px blue, WCAG compliant)
- **ARIA labels** and roles
- **Keyboard navigation** (Escape, Tab, Enter)
- **Reduced motion** support (via `prefers-reduced-motion`)

### Testing Accessibility
```bash
npm run lint:a11y
```

Check for:
- Focus order (Tab key)
- Screen reader descriptions (VoiceOver, NVDA)
- Color contrast (4.5:1 minimum)
- Keyboard shortcuts (no mouse required)

## Performance

### Optimizations
- **Virtualize large tables** (use `react-window` for >100 rows)
- **Debounce filter changes** (300ms)
- **Memoize chart calculations** (`useMemo`)
- **Lazy load charts** (intersection observer)

### Bundle Size
- Framer Motion: ~50KB gzipped
- Recharts (if used): ~90KB gzipped
- Custom components: ~15KB gzipped

**Total**: ~155KB additional for enhanced reports.

## Troubleshooting

### Insights not rotating
- Check `sessionStorage` for `auditvia_seen_insights`
- Clear storage or use incognito to test
- Ensure `rotationInterval` is set (default 8000ms)

### Badges not appearing
- Check `localStorage` for `auditvia_earned_badges`
- Verify `currentMetrics` prop has correct values
- Ensure thresholds are achievable (e.g., score ≥ 90)

### Drawer not closing
- Check `isOpen` state is controlled externally
- Verify `onClose` callback is firing
- Test Escape key and backdrop click

### Export not working
- Check async function doesn't throw
- Verify toast notifications appear
- Inspect network tab for API errors

## Examples

See `EnhancedReportsClient.tsx` for a complete integration example with:
- Filter state management
- Insight generation
- Badge calculation
- Notification handling
- Export logic

---

**Last Updated**: 2025-09-30  
**Maintainer**: Auditvia Engineering  
**Design System**: v1.0
