# AI-Native Accessibility Compliance Engineer - Status

## ✅ What's Been Built

### 1. Foundation (COMPLETE)
- **AI Engineer Component** (`/src/app/components/ai/AiEngineer.tsx`)
  - Floating chat widget with context awareness
  - Founder vs Developer mode toggle
  - Auto-opens for at-risk/non-compliant sites
  - Action buttons for common tasks
  - Analytics tracking built-in

- **Platform Detection System** (`/src/lib/platform-detector.ts`) ✅ NEW
  - Detects: Webflow, WordPress, Framer, React, Next.js, Vue, Custom
  - Confidence scoring
  - Platform capabilities assessment
  - Platform-specific action recommendations

- **AI Chat API** (`/src/app/api/ai/chat/route.ts`) ✅ NEW
  - Context-aware responses
  - Intent detection (fix, GitHub, email, code, explain, priority)
  - Mode-specific responses (Founder vs Developer)
  - Platform-aware guidance
  - Action suggestions

- **Platform-Specific Guides** (Built into platform-detector.ts) ✅ NEW
  - Webflow: Visual editor instructions
  - WordPress: Plugin recommendations + PHP code
  - Framer: Code overrides + canvas tips
  - Detailed guides for: image-alt, button-name, color-contrast, labels

### 2. Integration Points (WORKING)
- **Report View** (`EnterpriseReportClient.tsx`)
  - AI Engineer auto-opens for at-risk/non-compliant scans
  - Passes verdict, categories, top issues as context
  - Respects Founder/Developer mode setting

- **Issue Detail Panel** (`IssueDetailPanel.tsx`)
  - Platform-specific guide buttons (Webflow, WordPress, Framer)
  - "Ask AI Engineer" action
  - Email to Designer flow

- **Scan Flow** (`ScanRunningPage.tsx`)
  - Can trigger AI Engineer from scan completion
  - Pass-through to report with AI context

### 3. Analytics (BUILT-IN)
Current tracking events:
- `ai_opened` (trigger: auto/manual)
- `ai_prompt_sent` (with prompt length)
- `ai_action_clicked` (action type)
- `ai_handoff_requested` (escalation to human)

## 🚧 What's Next (Priority Order)

### Week 1: OpenAI Integration
**File**: `/src/app/api/ai/chat/route.ts`

**TODO**:
```typescript
// Add OpenAI SDK
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Replace mock responses with:
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [
    {
      role: 'system',
      content: buildSystemPrompt(context, mode)
    },
    {
      role: 'user',
      content: message
    }
  ],
  temperature: 0.7,
  max_tokens: 500
})
```

**System Prompts**:
- Founder mode: Non-technical, empathetic, action-oriented
- Developer mode: Technical, precise, code-focused

**Environment Variables**:
```env
OPENAI_API_KEY=sk-...
```

### Week 2: Action Handlers

#### GitHub Integration (Priority: HIGH)
**File**: `/src/lib/action-handlers/github-integration.ts`

**Functions**:
```typescript
export async function createGitHubIssue(params: {
  repoOwner: string
  repoName: string
  issue: AccessibilityIssue
  mode: 'founder' | 'developer'
}): Promise<{ issueUrl: string; issueNumber: number }>

export async function createBulkIssues(params: {
  repoOwner: string
  repoName: string
  issues: AccessibilityIssue[]
  mode: 'founder' | 'developer'
}): Promise<{ created: number; failed: number; urls: string[] }>

export async function createFixPR(params: {
  repoOwner: string
  repoName: string
  issue: AccessibilityIssue
  fix: CodeFix
}): Promise<{ prUrl: string; prNumber: number }>
```

**Database Schema**:
```sql
-- Store GitHub connection per team
CREATE TABLE github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  installation_id TEXT NOT NULL,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  access_token_enc TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track created issues/PRs
CREATE TABLE ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  scan_id UUID REFERENCES scans(id),
  issue_id UUID REFERENCES issues(id),
  action_type TEXT NOT NULL, -- 'github_issue', 'github_pr', 'email', 'code_gen'
  action_data JSONB,
  result JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Email Designer Report (Priority: MEDIUM)
**File**: `/src/lib/action-handlers/email-designer.ts`

**Functions**:
```typescript
export async function generateDesignerReport(params: {
  scanId: string
  siteUrl: string
  siteName: string
  issues: AccessibilityIssue[]
  recipientEmail: string
}): Promise<{ emailId: string; sent: boolean }>
```

**Template** (React Email):
```tsx
// /emails/designer-accessibility-report.tsx
export function DesignerAccessibilityReport({ issues, siteName }) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading>🎨 Accessibility Fixes for {siteName}</Heading>
          
          {/* Visual before/after examples */}
          {/* Plain-language descriptions */}
          {/* Prioritized action list */}
          {/* Links to detailed guides */}
        </Container>
      </Body>
    </Html>
  )
}
```

#### Code Fix Generator (Priority: HIGH)
**File**: `/src/lib/action-handlers/code-generator.ts`

**Functions**:
```typescript
export async function generateCodeFix(params: {
  issue: AccessibilityIssue
  platform: string
  context: CodeContext
}): Promise<{ 
  language: string
  code: string
  explanation: string
  testingSteps: string[]
}>
```

**Use OpenAI Codex**:
```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    {
      role: 'system',
      content: `You are an accessibility engineer. Generate production-ready code fixes for WCAG violations.
      
Platform: ${platform}
Issue: ${issue.rule}
WCAG: ${issue.wcag}

Return only the fix code with inline comments.`
    },
    {
      role: 'user',
      content: `Fix this violation:\n\nSelector: ${issue.selector}\nHTML: ${issue.html}\nRule: ${issue.description}`
    }
  ]
})
```

### Week 3: Feedback Loop

**Database Schema**:
```sql
-- Track issue resolutions
CREATE TABLE issue_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id),
  scan_id UUID REFERENCES scans(id),
  team_id UUID REFERENCES teams(id),
  
  -- How it was resolved
  resolution_method TEXT, -- 'manual', 'github_pr', 'platform_tool', 'ai_suggestion'
  resolution_details JSONB,
  
  -- Feedback
  was_ai_helpful BOOLEAN,
  ai_suggestion_used BOOLEAN,
  feedback_rating INT CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  
  -- Timing
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  time_to_resolve INTERVAL GENERATED ALWAYS AS (resolved_at - detected_at) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track AI interactions
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  scan_id UUID REFERENCES scans(id),
  user_id UUID REFERENCES users(id),
  
  mode TEXT NOT NULL, -- 'founder', 'developer'
  message_count INT DEFAULT 0,
  actions_taken TEXT[],
  
  -- Quality metrics
  user_satisfaction INT CHECK (user_satisfaction BETWEEN 1 AND 5),
  issues_resolved INT DEFAULT 0,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
```

**UI Components**:
```tsx
// In AI Engineer chat
<div className="feedback-buttons">
  <button onClick={() => trackFeedback('helpful')}>
    👍 This helped
  </button>
  <button onClick={() => trackFeedback('not_helpful')}>
    👎 This didn't help
  </button>
</div>
```

**Analytics Events**:
- `ai_suggestion_helpful` / `ai_suggestion_not_helpful`
- `issue_resolved_via_ai`
- `ai_action_completed`
- `ai_action_failed`

### Week 4: Platform-Specific Actions

#### Webflow API Integration
```typescript
// /src/lib/integrations/webflow.ts
export async function updateWebflowSite(params: {
  siteId: string
  accessToken: string
  fixes: WebflowFix[]
})
```

#### WordPress Plugin Recommendation System
```typescript
// /src/lib/integrations/wordpress.ts
export function recommendWordPressPlugins(issues: AccessibilityIssue[]): {
  plugin: string
  reason: string
  installUrl: string
}[]
```

## 📊 Success Metrics (Track These)

### User Engagement
- **AI open rate**: Target >60% for at-risk/non-compliant scans
- **Messages per session**: Target >3
- **Action completion rate**: Target >40%
- **Positive feedback rate**: Target >70%

### Business Impact
- **Time-to-fix reduction**: Target -30%
- **Issues resolved via AI**: Target >25%
- **GitHub PR acceptance rate**: Target >80%

### Technical Quality
- **Response time**: <2s (p95)
- **API error rate**: <1%
- **Context accuracy**: >90%

## 🎯 Quick Wins (Do These First)

1. **Add OpenAI API key** to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-...
   ```

2. **Improve intent detection** in `/api/ai/chat/route.ts`:
   - Use OpenAI function calling for better intent extraction
   - Add more specific handlers

3. **Add feedback UI** to AI Engineer component:
   - 👍👎 buttons after each response
   - "Was this helpful?" prompt after action completion

4. **Implement GitHub issue creation**:
   - Use existing GitHub setup from `GitHubSetupModal`
   - Create issues with proper formatting
   - Link back to Auditvia scan

5. **Add streaming responses**:
   - Use OpenAI streaming API
   - Show real-time typing effect
   - Better UX for long responses

## 🧪 Testing Checklist

- [ ] AI chat works in both Founder and Developer modes
- [ ] Platform detection is accurate
- [ ] Context is properly passed from report to AI
- [ ] Actions trigger correct backend calls
- [ ] Analytics events are firing
- [ ] Error handling is graceful
- [ ] Rate limiting prevents abuse
- [ ] Responses are accurate and helpful

## 📝 Documentation TODO

- [ ] API docs for `/api/ai/chat`
- [ ] Guide: "How to set up AI Engineer"
- [ ] Guide: "Adding custom platform guides"
- [ ] Guide: "Training the AI on your team's patterns"

## 🚀 Deployment Checklist

- [ ] OpenAI API key configured
- [ ] Rate limiting enabled
- [ ] Error monitoring (Sentry) configured
- [ ] Analytics events verified
- [ ] Cost monitoring alerts set up (OpenAI usage)
- [ ] Database migrations applied (ai_actions, issue_resolutions tables)

---

**Status**: Phase 1 Complete, Phase 2 Ready to Start
**Last Updated**: {{today}}
**Next Action**: Add OpenAI integration to `/api/ai/chat/route.ts`

