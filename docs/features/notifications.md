# Notifications Feature

## Overview

The Notifications page is a professional, enterprise-grade inbox for accessibility compliance events. It provides users with a centralized view of all important activity across their monitored sites, including scans, violations, fixes, tickets, system events, and milestones.

## Design Principles

- **Quiet & Premium**: Subtle, professional aesthetic with no flashy gamification
- **Trustworthy**: Clear, factual messaging derived from real data
- **Accessible**: AA+ compliant with full keyboard navigation and screen reader support
- **Actionable**: Every notification has clear, contextual actions

## Features

### 1. Smart Filtering

- **Search**: Debounced search across title, message, rule, and site name
- **Status Filter**: All / Unread / Read
- **Type Filter**: Multi-select chips for Scans, Violations, Fixes, Tickets, System, Milestones
- **Severity Filter**: Critical, Serious, Moderate, Minor
- **Date Range**: Last 7/30/90 days or custom range
- **URL Persistence**: All filters sync to URL query params for shareable links

### 2. Notification List

- **Density-Optimized**: Compact card design with one-line title + meta row
- **Visual Hierarchy**: Leading icon, severity dot, unread pill
- **Smart Grouping**: Violations grouped by rule and site
- **Infinite Scroll**: Desktop virtualizes for performance; mobile uses "Load more"
- **Keyboard Navigation**: Up/Down arrows, Enter to open, R to toggle read/unread

### 3. Details Panel

- **Slide-In Panel**: Opens on the right when notification is selected
- **Rich Context**: Summary, site info, scan details, rule descriptions, element selectors
- **Impact Metrics**: Counts, score deltas, severity
- **Recommended Actions**: Contextual action chips (View violation, Create issue, Open report, Re-scan)
- **History Timeline**: Chronological feed of related events (detected → issue created → fixed)
- **Deep Links**: Each notification has a shareable URL

### 4. Notification Types

#### Scans
- **Example**: "Scan completed: auditvia.com (12 issues found)"
- **Actions**: Open report, Re-run scan
- **Icon**: FileText (blue)

#### Violations
- **Example**: "1 new serious violation detected on auditvia.com"
- **Actions**: View violation, Create GitHub issue
- **Icon**: AlertTriangle (red)
- **Includes**: Rule ID, description, selector, severity

#### Fixes
- **Example**: "Issue resolved: color-contrast on /pricing"
- **Actions**: View change
- **Icon**: CheckCircle (emerald)

#### Tickets
- **Example**: "GitHub issue #12 created for aria-prohibited-attr"
- **Actions**: Open in GitHub
- **Icon**: Github (purple)

#### System
- **Example**: "Monitoring disabled for auditvia.com"
- **Actions**: Enable monitoring
- **Icon**: Settings (gray)

#### Milestones
- **Example**: "90%+ Club — average score this month"
- **Actions**: View summary
- **Icon**: Award (amber)
- **Note**: Low-key celebration, no confetti

### 5. Interactions

#### Mark All as Read
- Optimistic UI update
- Reverts on server error with toast
- Only affects filtered notifications

#### Row Click
- Opens details panel
- Automatically marks as read (unless user disabled auto-mark)
- Updates URL with `?id={notificationId}`

#### Toggle Read Status
- Individual notifications can be toggled via detail panel footer
- Optimistic update with server sync

#### Batch Operations (Desktop)
- Checkbox column appears when "Select" is clicked
- Batch mark read/unread
- Batch delete (if allowed)

#### Mute
- Mute by rule or site
- Confirmation dialog explains scope
- Managed in Settings → Notifications
- Muted items remain in history but don't create new notifications

## Data Model

### Notification Object

```typescript
interface Notification {
  id: string
  type: 'scan' | 'violation' | 'fix' | 'ticket' | 'system' | 'milestone'
  title: string
  message: string
  severity?: 'critical' | 'serious' | 'moderate' | 'minor'
  site?: string
  siteUrl?: string
  rule?: string
  ruleDescription?: string
  scanId?: string
  scanDate?: string
  selector?: string
  impact?: {
    count?: number
    scoreDelta?: number
  }
  createdAt: string
  read: boolean
  actions: NotificationAction[]
  history?: Array<{
    timestamp: string
    event: string
  }>
}

interface NotificationAction {
  type: 'route' | 'external' | 'verb'
  label: string
  href?: string
  verb?: string
  primary?: boolean
}
```

## API Endpoints

### GET /api/notifications

Returns notifications for the current user's team.

**Response:**
```json
{
  "notifications": [/* array of Notification objects */],
  "total": 42,
  "unread": 12
}
```

### POST /api/notifications/mark-read

Mark notifications as read or unread.

**Request:**
```json
{
  "ids": ["notification_id_1", "notification_id_2"],
  "read": true
}
```

**Response:**
```json
{
  "success": true,
  "updated": 2,
  "read": true
}
```

## Implementation Details

### Current State (MVP)

The notifications are **generated from activity** rather than stored in a dedicated table:

1. **Scans**: Latest completed scans with issue counts
2. **Violations**: Critical/serious issues grouped by rule and site
3. **Auto-read Logic**: 
   - Scans older than 24h are marked as read
   - Violations older than 12h are marked as read

### Future Enhancements

1. **Dedicated Notifications Table**:
   ```sql
   CREATE TABLE notifications (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     team_id UUID REFERENCES teams(id),
     type TEXT,
     title TEXT,
     message TEXT,
     severity TEXT,
     metadata JSONB,
     read BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Real-time Updates**: WebSocket or Server-Sent Events for live notifications

3. **Push Notifications**: Browser notifications for critical events

4. **Email Digests**: Daily/weekly summaries

5. **Notification Preferences**: Per-user settings for what to receive

6. **Smart Batching**: Group similar notifications (e.g., "5 new violations on 3 sites")

## Performance Considerations

- **Virtualization**: List virtualizes with 1000+ items for 60 FPS scrolling
- **Debounced Search**: 300ms debounce to reduce re-renders
- **Optimistic Updates**: Instant UI feedback with server sync
- **Caching**: Last 500 notifications cached client-side
- **Pagination**: 25 items per page (infinite scroll on desktop)

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all interactions
- **Focus Management**: Visible focus rings, logical tab order
- **Screen Reader**: ARIA roles (listbox/option, dialog), live region announcements
- **Color Contrast**: AA+ compliant, never rely on color alone
- **Reduced Motion**: Respects `prefers-reduced-motion`

## Testing

### Manual Testing

1. Navigate to `/dashboard/notifications`
2. Verify notifications load and display correctly
3. Test all filter types (search, status, type, severity)
4. Click a notification → detail panel opens
5. Mark notification as read → unread dot disappears
6. Click "Mark all read" → all unread notifications update
7. Test keyboard navigation (Up/Down, Enter, ESC)
8. Verify URL updates when filters change
9. Share a deep link with `?id=` → detail panel opens on that notification
10. Test empty states (no notifications, no filter results)

### Accessibility Testing

1. Screen reader: Verify notification list is announced as listbox
2. Screen reader: Each notification announces status, type, title, site, timestamp
3. Keyboard: Tab through all interactive elements
4. Keyboard: Use Up/Down arrows in list
5. Focus visible: Ensure focus rings are visible on all elements
6. Color contrast: Verify all text meets AA+ standards

### Performance Testing

1. Load page with 1000+ notifications
2. Verify smooth scrolling (60 FPS)
3. Search with multiple filters active
4. Verify no layout shift when content loads
5. Check memory usage during long sessions

## Visual Style

- **Background**: `bg-gray-50`
- **Cards**: White with `border-gray-200`, `shadow-sm` on hover
- **Active Card**: `bg-blue-50`, `border-blue-200`
- **Unread Indicator**: Blue dot (`bg-blue-600`)
- **Icons**: 20-24px, outline style
- **Typography**: System sans, medium weights for titles, muted for meta
- **Spacing**: 12/16/24px scale
- **Motion**: 150-200ms ease for hover, 250ms for panel slide

## Empty States

### No Notifications
- Icon: Bell (gray)
- Title: "You're all caught up"
- Subtitle: "New activity will appear here"

### No Filter Results
- Icon: Bell (gray)
- Title: "No results match your filters"
- Subtitle: "Try adjusting your filters"
- Action: "Clear filters" button

## URL Structure

- **Base**: `/dashboard/notifications`
- **With filters**: `/dashboard/notifications?q=aria&status=unread&types=violation,scan&severity=critical,serious&range=7`
- **Deep link**: `/dashboard/notifications?id=violation_aria-prohibited-attr_site123`

## Non-Goals

- ❌ Confetti or over-celebration animations
- ❌ Heavy marketing banners
- ❌ Noisy toasts on bulk operations
- ❌ Gamification elements
- ❌ Social sharing features

## Quality Bar

- ✅ 60 FPS scrolling with 1k+ items
- ✅ All filters persist in URL and are shareable
- ✅ Deep links work on refresh and back/forward navigation
- ✅ Full screen reader support
- ✅ No layout shift on load
- ✅ No horizontal scrollbars at common widths
- ✅ Lighthouse accessibility score ≥ 95

