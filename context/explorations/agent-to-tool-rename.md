# Agent → Tool Terminology Rename

**Status:** Planning
**Created:** 2025-01-17
**Priority:** Medium (clarity improvement, not blocking)

## Problem Statement

The term "agent" is overloaded and confusing in the Agor codebase:

1. **Agor's usage**: "agent" refers to the external agentic tool/CLI (Claude Code, Cursor, Codex, Gemini)
2. **SDK's usage**: "agent" refers to the internal AI agent instance within those tools
   - Claude Code SDK: `createAgent()`, `agent.chat()`, agent session IDs
   - Codex SDK: Similar agent abstraction
3. **Result**: Naming like `session.agent_session_id` is doubly confusing ("agent's agent session?")

### Current Confusing Examples

```typescript
// What does "agent" mean here?
session.agent = 'claude-code'; // The tool? Or the AI agent?
session.agent_session_id = '...'; // Which agent's session?
session.agent_version = '1.2.3'; // Tool version or SDK version?

// In conversation with user:
('Create a Claude Code agent'); // Are we creating a tool or an SDK agent?
```

## Proposed Solution

Rename all "agent" references to "tool" to clearly distinguish:

- **Tool**: The external agentic CLI/IDE (Claude Code, Cursor, Codex, Gemini)
- **Agent**: Reserved for the internal SDK concept (each tool's AI agent instance)

### After Rename

```typescript
// Clear distinction
session.tool = 'claude-code'; // Which agentic tool is running this
session.sdk_session_id = '...'; // Internal SDK session ID for conversation continuity
session.tool_version = '1.2.3'; // Tool/CLI version

// OR alternative (preserve some "agent" context):
session.tool = 'claude-code';
session.tool_agent_session_id = '...'; // The tool's internal agent session ID
session.tool_version = '1.2.3';
```

## Scope Analysis

### TypeScript Occurrences

- ~150 occurrences of `\bagent\b` (lowercase) across 32+ TypeScript files
- ~20 occurrences of `\bAgent\b` (capitalized) across 12+ TypeScript files

### Affected Components

#### Core Types (`packages/core/src/types/`)

- **High Priority:**
  - `agent.ts` → `tool.ts`
  - `AgentName` → `ToolName`
  - `Agent` interface → `Tool` interface (UI metadata)
  - `session.ts`: Remove duplicate `AgentName` definition

#### Database Schema (`packages/core/src/db/`)

- **High Priority:**
  - `schema.ts`: `agent` column → `tool` column
  - `agent_version` → `tool_version`
  - `agent_session_id` → `sdk_session_id` (clearest option)
  - Migration script needed

#### Session Type (`packages/core/src/types/session.ts`)

- **High Priority:**

  ```typescript
  export interface Session {
    // Before
    agent: 'claude-code' | 'cursor' | 'codex' | 'gemini';
    agent_version?: string;
    agent_session_id?: string;

    // After
    tool: ToolName;
    tool_version?: string;
    sdk_session_id?: string; // Or tool_agent_session_id
  }
  ```

#### API Layer (`apps/agor-daemon/src/services/`)

- `sessions.ts`: Update service to use new field names
- WebSocket events: Update event payloads
- **Breaking change**: API clients must update

#### UI Components (`apps/agor-ui/src/`)

- **Medium Priority:**
  - `types/agent.ts` → `types/tool.ts`
  - `mocks/agents.ts` → `mocks/tools.ts`
  - `AgentSelectionCard` → `ToolSelectionCard` (component + file rename)
  - `AgentChain` → `ToolChain`
  - `PermissionModeSelector`: Update agent prop → tool prop

#### Tool Implementations (`packages/core/src/tools/`)

- **Low Priority (internal consistency):**
  - Comments/docs using "agent" → "tool" for clarity
  - Variable names: `agentSessionId` → `sdkSessionId`

#### CLI (`apps/agor-cli/src/commands/`)

- **Low Priority:**
  - Mostly internal, minimal user-facing impact

### Not Affected

- MCP servers (no "agent" terminology overlap)
- Git/worktree logic
- Task/message types
- Board/zone types
- Context files

## Migration Strategy

### Phase 1: Type System (Foundational)

**Effort:** ~1 hour

1. Create `packages/core/src/types/tool.ts` with `ToolName` and `Tool` interface
2. Update `session.ts` to use `ToolName` instead of inline union
3. Export from `packages/core/src/types/index.ts`
4. Mark old `agent.ts` types as deprecated (keep for now)
5. Build and verify TypeScript compilation

**Files affected:** 3-5 core type files

### Phase 2: Database Schema (Breaking Change)

**Effort:** ~1 hour

1. Create migration script:
   ```sql
   ALTER TABLE sessions RENAME COLUMN agent TO tool;
   ALTER TABLE sessions RENAME COLUMN agent_version TO tool_version;
   ALTER TABLE sessions RENAME COLUMN agent_session_id TO sdk_session_id;
   ```
2. Update `packages/core/src/db/schema.ts`
3. Update repositories (`sessions.ts`, etc.)
4. Test migration on dev database

**Files affected:** 3-5 DB files + 1 migration

### Phase 3: API Layer (Daemon)

**Effort:** ~30 min

1. Update `apps/agor-daemon/src/services/sessions.ts`
2. Update FeathersJS service hooks
3. Update WebSocket event payloads
4. Test API endpoints

**Files affected:** 2-3 service files

### Phase 4: UI Components (Visual)

**Effort:** ~1-2 hours

1. Rename component files:
   - `AgentSelectionCard` → `ToolSelectionCard`
   - `AgentChain` → `ToolChain`
2. Update imports across UI
3. Update props/interfaces
4. Update Storybook stories
5. Update mock data files

**Files affected:** 15-20 UI files

### Phase 5: Tool Implementations (Polish)

**Effort:** ~30 min

1. Update internal variable names in `claude-tool.ts`, `codex-tool.ts`
2. Update comments/docs
3. No public API changes

**Files affected:** 5-8 tool files

### Phase 6: Cleanup (Final)

**Effort:** ~15 min

1. Remove deprecated `agent.ts` files
2. Update CLAUDE.md and other docs
3. Search for any remaining "agent" references
4. Final build and test

**Files affected:** 3-5 doc files

## Total Effort Estimate

**Conservative:** 4-5 hours
**Optimistic:** 2-3 hours
**Recommended approach:** Dedicated refactor session (not mixed with feature work)

## Decision Points

### Question 1: What to call `agent_session_id`?

**Options:**

1. `sdk_session_id` - Clearest (emphasizes it's the SDK's internal ID)
2. `tool_agent_session_id` - Most explicit (but verbose)
3. `tool_session_id` - Shortest (but could be confused with Agor session ID)

**Recommendation:** `sdk_session_id` (clear and concise)

### Question 2: Gradual or atomic rename?

**Options:**

1. **Gradual:** Keep old fields, add new fields, deprecate over time
   - Pros: No breaking changes, easier rollback
   - Cons: Confusion during transition, more code to maintain

2. **Atomic:** Rename everything in one PR with migration
   - Pros: Clean cut, no dual terminology
   - Cons: Larger PR, requires careful testing

**Recommendation:** Atomic (codebase is small, tests exist, clear rollback via git)

### Question 3: When to do this?

**Options:**

1. **Now:** Highest clarity benefit, before public release
2. **Later:** After Phase 3 features are complete
3. **Never:** Live with the confusion

**Recommendation:** After Phase 3 complete (don't mix with feature development)

## Breaking Changes & Compatibility

### Database Migration

- **Breaking:** Column renames require migration
- **Mitigation:** Migration script handles existing data
- **Rollback:** Keep backup before migration

### API Changes

- **Breaking:** FeathersJS service payloads change
- **Mitigation:** Version API if needed (but pre-1.0, so acceptable)
- **Affected clients:** Only Agor UI (we control both ends)

### UI Components

- **Non-breaking:** Internal refactor only
- **Risk:** Minimal (TypeScript catches all issues)

## Testing Strategy

1. **Unit tests:** Update type assertions
2. **Integration tests:** Verify DB queries work with new column names
3. **E2E tests:** Test session creation flow end-to-end
4. **Manual testing:**
   - Create new session
   - Load existing session
   - Verify agent SDK session continuity works

## Success Criteria

- [ ] All TypeScript compiles without errors
- [ ] All tests pass
- [ ] Database migration successful
- [ ] UI renders sessions correctly
- [ ] SDK session continuity works (Claude Code conversation threads persist)
- [ ] No "agent" references in codebase except SDK-related comments
- [ ] Documentation updated (CLAUDE.md, PROJECT.md, etc.)

## Open Questions

1. Should we rename `ITool` interface to something else since it's the base for tools?
   - Current: `ITool` (interface), `ClaudeTool` (implementation)
   - Possible: Keep as-is (interface vs implementation distinction is clear)

2. Do we need to update context documentation?
   - Yes: `context/concepts/models.md` references "agent" field
   - Yes: `context/concepts/architecture.md` likely mentions it

3. Should `ToolIcon` component be renamed?
   - Current name is actually correct! It shows the tool's icon.
   - Keep as-is.

## Related Work

- **AgentName duplication fix:** Already identified that `AgentName` is defined in both `agent.ts` and `session.ts` (should consolidate first)
- **Permission modes:** Recently fixed per-agent defaults (would become per-tool defaults)

## References

- Type definitions: `packages/core/src/types/agent.ts`, `packages/core/src/types/session.ts`
- Database schema: `packages/core/src/db/schema.ts`
- UI components: `apps/agor-ui/src/components/AgentSelectionCard/`, `apps/agor-ui/src/components/AgentChain/`
