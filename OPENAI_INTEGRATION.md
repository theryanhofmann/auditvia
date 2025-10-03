# OpenAI API Integration for AI Engineer Chat

## ✅ **What Was Done**

### **1. OpenAI API Integration**
- Integrated `openai` package (already installed at v5.9.0)
- API client initializes on module load if `OPENAI_API_KEY` is present
- Falls back to deterministic responses if no key found
- Error handling: Falls back to deterministic if OpenAI API fails

### **2. Clear Debug Logging**
All logs use emojis for easy terminal scanning:

**On Server Start:**
```
✅ [AI Chat] OpenAI API configured and ready
  OR
⚠️  [AI Chat] No OpenAI API key - using deterministic fallback
```

**On Each Request:**
```
🤖 [AI Chat] Using OpenAI API
  OR
⚙️  [AI Chat] Using deterministic fallback (no OpenAI key)
```

**During OpenAI Call:**
```
🔄 [OpenAI] Calling API: { messageCount: 3, mode: 'founder', platform: 'webflow', issueCount: 5 }
✅ [OpenAI] Response received: { tokensUsed: 342, responseLength: 287 }
  OR
❌ [OpenAI] API error: [error details]
⚠️  [AI Chat] Falling back to deterministic due to OpenAI error
```

### **3. Context-Rich System Prompt**
OpenAI receives comprehensive context including:
- User mode (Founder vs Developer)
- Site details (name, URL, platform)
- Scan results (verdict, issue counts by severity)
- Top 5 issues with descriptions and rules
- Mode-specific instructions
- Platform-specific capabilities

### **4. Intelligent Action Detection**
AI responses are analyzed to suggest relevant actions:
- If response mentions "priority" → Suggest "Show prioritized list"
- If response mentions "fix" → Suggest "Fix: [issue]"
- If response mentions "github" → Suggest "Create GitHub issues"
- Fallback to default mode-specific actions

---

## 🔧 **Configuration**

### **Add OpenAI API Key:**

**Option 1: Environment Variable**
```bash
# .env.local
OPENAI_API_KEY=sk-proj-...
```

**Option 2: Vercel/Production**
Add `OPENAI_API_KEY` to your environment variables in deployment settings.

### **Restart Server:**
```bash
npm run dev
```

Look for the startup log:
```
✅ [AI Chat] OpenAI API configured and ready
```

---

## 📊 **How It Works**

### **Request Flow:**

1. **User sends message** → `AiEngineer.tsx`
2. **Component calls** → `/api/ai/chat`
3. **API checks** → Is `OPENAI_API_KEY` set?
   - **Yes** → Call OpenAI with context
   - **No** → Use deterministic responses

4. **OpenAI receives:**
   ```json
   {
     "messages": [
       { "role": "system", "content": "[Context-rich prompt]" },
       { "role": "user", "content": "Show me priorities" }
     ],
     "model": "gpt-4o-mini",
     "temperature": 0.7,
     "max_tokens": 500
   }
   ```

5. **Response processed:**
   - Extract AI response text
   - Detect relevant actions from content
   - Return to client with suggested action buttons

---

## 🧪 **Testing**

### **1. Verify OpenAI is Active:**
```bash
# Check terminal logs after server starts
✅ [AI Chat] OpenAI API configured and ready  # ← Look for this
```

### **2. Test a Conversation:**
1. Open a scan report with violations
2. Click AI Engineer button (bottom right)
3. Send a message: "What should I fix first?"
4. **Check terminal:**
   ```
   🤖 [AI Chat] Using OpenAI API
   🔄 [OpenAI] Calling API: { messageCount: 1, mode: 'founder', ... }
   ✅ [OpenAI] Response received: { tokensUsed: 234, responseLength: 156 }
   ```

### **3. Compare Responses:**

**Without OpenAI (Deterministic):**
```
User: "What should I fix first?"
AI: "Here's your prioritized action plan:

🔴 Fix First (3 critical):
  1. Buttons must have discernible text
  2. Links must have discernible text
  ...
```
*(Structured, rule-based)*

**With OpenAI (Dynamic):**
```
User: "What should I fix first?"
AI: "Let's tackle the most impactful issues first. You have 3 critical 
accessibility problems that need immediate attention. The biggest one is 
that some of your buttons don't have text labels, making them invisible 
to screen readers. This affects about 15% of users and poses legal risk.

I'd recommend starting with the button labels since they're quick to fix 
and have immediate user impact. Would you like me to show you exactly 
how to fix them in Webflow?"
```
*(Natural, conversational, context-aware)*

---

## 🔍 **Debugging**

### **Check if OpenAI is Being Used:**
```bash
# In your terminal, look for:
🤖 [AI Chat] Using OpenAI API  # ← OpenAI is active
⚙️  [AI Chat] Using deterministic fallback  # ← Using fallback
```

### **If OpenAI Isn't Working:**

1. **Check API Key:**
   ```bash
   # .env.local
   OPENAI_API_KEY=sk-proj-...  # Must start with sk-
   ```

2. **Restart Server:**
   ```bash
   # Kill and restart
   npm run dev
   ```

3. **Check Logs:**
   ```
   ✅ [AI Chat] OpenAI API configured and ready  # Should see this
   ```

4. **Test API Key:**
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

### **If Getting Errors:**
Check terminal for:
```
❌ [OpenAI] API error: [details]
⚠️  [AI Chat] Falling back to deterministic due to OpenAI error
```

Common issues:
- Invalid API key
- Rate limit exceeded
- Network connectivity
- API quota exhausted

---

## 📦 **Technical Details**

### **Model Used:**
- **`gpt-4o-mini`** - Fast, cost-effective, great for chat
- Alternative: `gpt-4-turbo` (more capable, higher cost)

### **Parameters:**
```typescript
{
  model: 'gpt-4o-mini',
  temperature: 0.7,  // Balance creativity/consistency
  max_tokens: 500,   // ~300-400 words response
}
```

### **Cost Estimate:**
- **gpt-4o-mini**: ~$0.00015 per message (input + output)
- **gpt-4-turbo**: ~$0.01 per message
- Average conversation (10 messages): ~$0.0015 (mini) or ~$0.10 (turbo)

### **Fallback Logic:**
1. **No API Key** → Deterministic from start
2. **API Error** → Try deterministic
3. **Network Timeout** → Try deterministic
4. **Rate Limit** → Try deterministic

---

## 🎯 **Success Criteria**

- [x] OpenAI client initializes with API key
- [x] Clear logs show which path is used
- [x] Context-rich system prompt
- [x] Conversation history maintained
- [x] Action buttons suggested intelligently
- [x] Graceful fallback on errors
- [x] No breaking changes to existing UI

---

## 🚀 **Next Steps (Optional)**

### **Streaming Responses:**
To enable real-time streaming:
```typescript
const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages,
  stream: true,
})

for await (const chunk of stream) {
  // Send chunk to client
}
```
*(Requires client-side streaming support)*

### **Function Calling:**
Let OpenAI trigger actions directly:
```typescript
{
  tools: [
    {
      type: 'function',
      function: {
        name: 'create_github_issue',
        description: 'Create a GitHub issue for an accessibility violation',
        parameters: { /* ... */ }
      }
    }
  ]
}
```

### **Advanced Prompting:**
- Few-shot examples for better responses
- RAG (Retrieval Augmented Generation) for WCAG documentation
- Fine-tuning on accessibility-specific data

---

## ✅ **Summary**

**Before:**
- Static, rule-based responses
- No real AI understanding
- Limited context awareness

**After:**
- ✅ Real OpenAI API integration
- ✅ Context-aware conversations
- ✅ Natural language responses
- ✅ Clear debug logging
- ✅ Graceful fallback
- ✅ Clean, minimal implementation

**Log What You'll See:**
```
✅ [AI Chat] OpenAI API configured and ready
🤖 [AI Chat] Using OpenAI API
🔄 [OpenAI] Calling API: { ... }
✅ [OpenAI] Response received: { tokensUsed: 234 }
```

