# Conversation UI Design

**Status:** Phase 1 Implemented
**Related:** [frontend-guidelines.md](frontend-guidelines.md), [models.md](models.md), [tool-blocks.md](tool-blocks.md), [llm-enrichment.md](llm-enrichment.md)

## Overview

Task-centric conversation display with progressive disclosure. Tasks group related messages, tools, and thinking into collapsible sections.

**Core Principle:** Tasks ARE the conversation structure. Every user prompt creates a task boundary.

---

## Data Model

### Message Structure

```typescript
interface Message {
  message_id: MessageID;
  session_id: SessionID;
  role: 'user' | 'assistant' | 'system';
  type: 'user' | 'assistant' | 'system' | 'file-history-snapshot';
  index: number;
  timestamp: string;
  content: string | ContentBlock[];
  content_preview: string;
  task_id?: TaskID;
  tool_uses?: ToolUse[];
  metadata?: MessageMetadata;
}
```

### Content Blocks (Anthropic API Format)

```typescript
type ContentBlock = TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock;

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string; // Read, Edit, Bash, etc.
  input: Record<string, unknown>;
}

interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ContentBlock[];
  is_error?: boolean;
}
```

### Task Structure

```typescript
interface Task {
  task_id: TaskID;
  session_id: SessionID;
  status: 'pending' | 'running' | 'completed' | 'failed';
  description: string; // User prompt summary (120 chars)
  full_prompt: string; // Complete user request
  message_range: {
    start_index: number;
    end_index: number;
    start_timestamp: string;
    end_timestamp: string;
  };
  tool_use_count: number;
  git_state?: GitState;
}
```

---

## Visual Hierarchy

```
┌─ SessionDrawer ─────────────────────────────────────────┐
│  Session: "Build authentication system"                  │
│  📍 feature/auth @ b3e4d12 | 🤖 Claude Code | ⏱️ 2h 15m │
│                                                           │
│  ┌─ Task 1: Design JWT flow ────────────────────────┐   │
│  │ ✓ Completed | 💬 12 messages | 🔧 8 tools | 5m   │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Task 2: Implement endpoints ─────────────────────┐   │
│  │ ⚡ Running | 💬 24 messages | 🔧 15 tools          │ ▼ │
│  │                                                     │   │
│  │  👤 USER (10:23 AM)                                │   │
│  │  "Add POST /auth/login endpoint with JWT"         │   │
│  │                                                     │   │
│  │  🤖 ASSISTANT (10:23 AM)                           │   │
│  │  💭 Thinking: Need to create auth routes...       │   │
│  │                                                     │   │
│  │  🔧 TOOL: Edit                                     │   │
│  │  📄 src/routes/auth.ts:15-32                       │   │
│  │  [Show diff ▼]                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### TaskBlock (Collapsible Container)

**Collapsed state:**

```tsx
<TaskHeader>
  <StatusIcon status={task.status} />
  <TaskTitle>{task.description}</TaskTitle>
  <TaskMeta>
    <Badge>💬 {messageCount}</Badge>
    <Badge>🔧 {toolCount}</Badge>
    <Duration>{duration}</Duration>
  </TaskMeta>
</TaskHeader>
```

**Expanded state:**

```tsx
<TaskSection expanded>
  <TaskHeader />
  <MessageList>
    {messages.map(msg => (
      <MessageBlock key={msg.message_id} message={msg} />
    ))}
  </MessageList>
</TaskSection>
```

### MessageBlock Rendering

**User message:**

```tsx
<Bubble role="user" timestamp={message.timestamp}>
  <MarkdownContent>{message.content}</MarkdownContent>
</Bubble>
```

**Assistant message with tools:**

```tsx
<Bubble role="assistant" timestamp={message.timestamp}>
  {message.content.map(block => {
    if (block.type === 'text') {
      return <MarkdownContent>{block.text}</MarkdownContent>;
    }
    if (block.type === 'tool_use') {
      return <ToolUseRenderer tool={block} />;
    }
  })}
</Bubble>
```

### ToolUseRenderer (Basic)

```tsx
<ToolUseBlock>
  <ToolHeader>
    <ToolIcon name={tool.name} />
    <ToolName>{tool.name}</ToolName>
  </ToolHeader>
  <Collapsible label="Input">
    <CodeBlock language="json">{JSON.stringify(tool.input, null, 2)}</CodeBlock>
  </Collapsible>
  {tool.output && (
    <Collapsible label="Output">
      <ToolOutput>{renderOutput(tool.output)}</ToolOutput>
    </Collapsible>
  )}
</ToolUseBlock>
```

---

## Design Principles

1. **Progressive Disclosure**
   - Default: Task summary only
   - One click: Messages + basic tools
   - Two clicks: Full tool inputs/outputs

2. **Scannable at a Glance**
   - Status indicators on task headers
   - Message type icons (👤 user, 🤖 AI)
   - Visual hierarchy via size, color, spacing

3. **Handle Large Content**
   - Collapsible tool blocks
   - Truncated previews with "Show more"
   - Latest task expanded by default

4. **Real-Time Updates**
   - Progressive message streaming
   - Task status transitions (pending → running → completed)
   - WebSocket subscriptions with `flushSync()`

---

## Implementation Status

**✅ Phase 1: Basic Task-Message Hierarchy (COMPLETE)**

- [x] Task sections with collapse/expand
- [x] Basic message bubbles (user/assistant)
- [x] Task metadata badges (status, message count, tool count)
- [x] Markdown rendering with Typography
- [x] Progressive message streaming
- [x] Tool use rendering with collapsible input/output

**Files:**

- `apps/agor-ui/src/components/ConversationView/ConversationView.tsx`
- `apps/agor-ui/src/components/TaskBlock/TaskBlock.tsx`
- `apps/agor-ui/src/components/MessageBlock/MessageBlock.tsx`
- `apps/agor-ui/src/components/ToolUseRenderer/ToolUseRenderer.tsx`
- `apps/agor-ui/src/components/MarkdownRenderer/MarkdownRenderer.tsx`

**📋 Phase 2: Advanced Tool Visualization**

See [tool-blocks.md](tool-blocks.md) for:

- Tool grouping (search, file changes, test runs, git ops)
- Semantic block rendering
- File impact graphs
- Test result matrices

**📋 Phase 3: LLM-Powered Enrichment**

See [llm-enrichment.md](llm-enrichment.md) for:

- Task summaries (AI-generated descriptions)
- Session summaries (key changes, complexity)
- Pattern detection (reusable approaches)
- Quality insights (test status, type errors)

---

## Related Documents

- [tool-blocks.md](tool-blocks.md) - Advanced tool visualization patterns
- [llm-enrichment.md](llm-enrichment.md) - AI-powered session analysis
- [models.md](models.md) - Data model definitions
- [frontend-guidelines.md](frontend-guidelines.md) - React patterns
- [websockets.md](websockets.md) - Real-time communication

---

## References

- Ant Design X Components: `@ant-design/x`
- Implementation: `apps/agor-ui/src/components/`
