# Claude Code Integration Guide

## Overview

[Claude Code](https://www.claude.com/product/claude-code) is integrated into the Auditvia project as your AI pair programming assistant. It lives in your terminal and understands the entire codebase.

## Quick Start

### First Time Setup

1. **Authenticate (one-time)**
   ```bash
   npm run claude:setup
   ```
   This creates a long-lived token tied to your Claude subscription.

2. **Start a session**
   ```bash
   npm run claude
   ```

### Common Commands

```bash
# Start interactive session
npm run claude

# Continue your last conversation
npm run claude:continue

# Non-interactive mode (for pipes/scripts)
npx claude --print "your prompt here"

# Get help
npm run claude:help
```

## What Claude Code Knows

The `.clauderc` configuration provides Claude with:

- **Project context**: Auditvia accessibility compliance platform
- **Stack details**: Next.js 15, TypeScript, Supabase, Playwright, axe-core
- **Architecture rules**: No overlays, code-level fixes only, WCAG 2.2 standard
- **Workflow conventions**: Branch naming, commit standards, PR requirements
- **Current known issues**: RLS test failures, migration dependencies

## Example Workflows

### 1. Onboarding / Code Understanding
```bash
npm run claude
> I'm new to this codebase. Can you explain the scan lifecycle?
```

### 2. Fix Issues
```bash
npm run claude
> Can you fix the 4 failing RLS tests in __tests__/team-rls.test.ts?
```

### 3. Refactoring
```bash
npm run claude
> Refactor src/lib/scan-lifecycle-manager.ts to improve error handling
```

### 4. Add Features
```bash
npm run claude
> Add a new API endpoint for batch scan operations
```

### 5. Review Code
```bash
npm run claude
> Review the changes in src/app/api/audit/route.ts and suggest improvements
```

## VS Code Integration

Claude Code integrates with VS Code when installed:

1. Open your project in VS Code
2. Run `npm run claude -- --ide` to auto-connect
3. Claude appears in your sidebar with visual diffs
4. Edit suggestions show inline

## Best Practices

### ✅ Do This

- **Ask specific questions**: "How does authentication work in src/lib/supabase/user.ts?"
- **Request reviews**: "Review my changes and check for WCAG compliance"
- **Explain context**: "I'm working on issue #123 - need to add ARIA labels"
- **Use continue mode**: `npm run claude:continue` to keep context

### ❌ Avoid This

- **Vague prompts**: "Fix everything"
- **No context**: Claude knows the codebase, but explain your goal
- **Skipping reviews**: Always review Claude's suggestions before applying

## Safety & Permissions

- **File modifications**: Claude NEVER modifies files without your explicit approval
- **Tool access**: Limited to allowed tools (Bash, Edit, Read, Write, Search)
- **Directory scope**: Access limited to `src/`, `scripts/`, `supabase/migrations/`, `__tests__/`

## Configuration

Edit `.clauderc` to customize:

```json
{
  "projectName": "Auditvia",
  "allowedTools": [...],
  "additionalDirectories": [...],
  "appendSystemPrompt": "...",
  "settings": {
    "model": "sonnet",  // or "opus" for more complex tasks
    "autoApproveEdits": false  // keep false for safety
  }
}
```

## Troubleshooting

### "Authentication failed"
Run `npm run claude:setup` to generate a new token.

### "Permission denied"
Check `.clauderc` - the directory you're working in must be in `additionalDirectories`.

### "Model overloaded"
Add fallback: `npx claude --fallback-model opus --print "your prompt"`

### Session management
- List sessions: `npx claude --resume` (shows interactive picker)
- Resume specific: `npx claude --resume <session-id>`
- Fork session: `npx claude --resume --fork-session`

## Advanced Usage

### Custom Agents
Define specialized agents for specific tasks:

```bash
npx claude --agents '{
  "reviewer": {
    "description": "WCAG compliance reviewer",
    "prompt": "You review code for WCAG 2.2 compliance violations"
  },
  "tester": {
    "description": "Test writer",
    "prompt": "You write comprehensive Jest tests"
  }
}'
```

### MCP Server Integration
Claude Code supports [Model Context Protocol](https://www.anthropic.com/news/model-context-protocol) for extending capabilities:

```bash
# Configure MCP servers
npx claude mcp

# Use with custom MCP config
npx claude --mcp-config ./mcp-servers.json
```

### Pipe Mode for Automation

```bash
# Generate code and pipe to file
echo "Create a function to validate WCAG contrast ratios" | \
  npx claude --print > src/lib/contrast-validator.ts

# Batch process
for file in src/lib/*.ts; do
  echo "Add JSDoc comments to $file" | npx claude --print
done
```

## Integration with CI/CD

Claude Code can run in CI for code review:

```yaml
# .github/workflows/claude-review.yml
- name: Claude Code Review
  run: |
    echo "Review this PR for accessibility issues" | \
      npx claude --print \
      --allowed-tools "Read Search" \
      --dangerously-skip-permissions
```

## Resources

- [Official Docs](https://docs.anthropic.com/claude/docs/claude-code)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=Anthropic.claude-code)
- [Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)
- [Anthropic API Console](https://console.anthropic.com/)

## Support

- **Issues**: Check `npx claude doctor` for health checks
- **Updates**: `npx claude update` to get latest version
- **Team questions**: Ask in #engineering Slack channel

---

**Pro Tips**:
- Use `--continue` to maintain context across sessions
- Combine with git: `git diff | npx claude --print "review these changes"`
- Set aliases: `alias cc="npm run claude"`
- Enable debug mode: `npx claude --debug` for troubleshooting

