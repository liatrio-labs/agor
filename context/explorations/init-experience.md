# Init Experience & Authentication Flow

**Status:** Planning
**Created:** 2025-10-18
**Priority:** High (launch blocker for good UX)

---

## Problem Statement

Users need a smooth onboarding experience that:

1. Sets up Agor (database, config, etc.)
2. Checks authentication status for all agentic tools
3. Guides users to configure API keys where needed
4. Handles both fresh installs and existing CLI users

**Key Questions:**

- Should `agor init` prompt for API keys?
- How do we detect existing auth from native CLIs?
- How do we handle auth sharing between CLI and SDK?
- What's the UX when a tool isn't authenticated?

---

## Current State

### What `agor init` Does Now

```bash
agor init
# Creates ~/.agor/agor.db
# Creates default board
# That's it - no auth handling
```

### How Auth Works Today

**Claude Code:**

- Native CLI: `~/.claude/config` (JSON with API key)
- SDK: Uses `ANTHROPIC_API_KEY` env var OR native config
- **Shared:** SDK can read native CLI config ✅

**Codex:**

- Native CLI: `~/.codex/config.toml`
- SDK: Uses `OPENAI_API_KEY` env var OR native config
- **Shared:** SDK can read native CLI config ✅

**Gemini:**

- Native CLI: `~/.gemini/config` (needs verification)
- SDK: Uses `GOOGLE_API_KEY` env var OR native config
- **Unknown:** Need to verify SDK can read native config

### Current Config System

```bash
agor config set credentials.ANTHROPIC_API_KEY sk-ant-...
agor config set credentials.OPENAI_API_KEY sk-...
agor config set credentials.GOOGLE_API_KEY ...
```

Stored in: `~/.agor/config.json`

---

## Design Principles

1. **Fast setup** - Get users to "hello world" in under 2 minutes
2. **Informational, not interactive** - Show status and instructions, don't wizard
3. **Don't break existing workflows** - Users with native CLIs already set up should "just work"
4. **Clear next steps** - Obvious path from init to first session
5. **Configure later** - Advanced setup via CLI/UI after initial success
6. **Maintainable** - Simple code, minimal state, easy to debug

---

## Proposed Solution

### 1. AgenticTool Interface Extension

Add `authCheck()` to the ITool interface:

```typescript
interface ITool {
  name: string;
  version: string;

  // NEW: Cheap auth check (no API call, just config check)
  authCheck(): Promise<AuthCheckResult>;

  // Existing methods
  startSession(params: StartSessionParams): Promise<SessionHandle>;
  // ...
}

type AuthCheckResult =
  | { authenticated: true; source: 'native-cli' | 'agor-config' | 'env-var' }
  | { authenticated: false; reason: string; setupInstructions: string };
```

**Implementation Examples:**

```typescript
// ClaudeTool.authCheck()
async authCheck(): Promise<AuthCheckResult> {
  // 1. Check native CLI config
  const nativeConfig = await readClaudeConfig(); // ~/.claude/config
  if (nativeConfig?.apiKey) {
    return { authenticated: true, source: 'native-cli' };
  }

  // 2. Check env var
  if (process.env.ANTHROPIC_API_KEY) {
    return { authenticated: true, source: 'env-var' };
  }

  // 3. Check Agor config
  const agorKey = await getConfigValue('credentials.ANTHROPIC_API_KEY');
  if (agorKey) {
    return { authenticated: true, source: 'agor-config' };
  }

  // 4. Not authenticated
  return {
    authenticated: false,
    reason: 'No API key found',
    setupInstructions: [
      'Option 1: Use native CLI: claude login',
      'Option 2: Set env var: export ANTHROPIC_API_KEY=sk-ant-...',
      'Option 3: Use Agor config: agor config set credentials.ANTHROPIC_API_KEY sk-ant-...'
    ].join('\n')
  };
}
```

**Key Benefits:**

- No API calls (cheap to run)
- Checks all sources in priority order
- Returns actionable setup instructions
- Can run during init, session creation, settings UI

---

### 2. Enhanced `agor init` Flow

**Default Mode (Informational):**

```bash
$ agor init

✓ Created database at ~/.agor/agor.db
✓ Created default board
✓ Created anonymous user

Checking agentic tools...
  Claude Code  ✓ Ready (via ~/.claude/config)
  Codex        ✗ Not configured
  Gemini       ✗ Not configured

To configure missing tools:
  agor config set credentials.OPENAI_API_KEY sk-...
  agor config set credentials.GOOGLE_API_KEY ...

Next Steps:
  1. Start daemon:  cd apps/agor-daemon && pnpm dev
  2. Start UI:      cd apps/agor-ui && pnpm dev
  3. Open browser:  http://localhost:5173
  4. Add repos:     Settings → Repositories

Run 'agor --help' for more commands.
```

**With User Creation:**

```bash
$ agor init --user "Max" --email "max@example.com"

✓ Created database at ~/.agor/agor.db
✓ Created default board
✓ Created user: Max (max@example.com)
[... rest same as above ...]
```

**Silent Mode:**

```bash
$ agor init --silent
# Just creates DB, board, and user - no output
```

---

### 3. New CLI Command: `agor config check`

Shows authentication status for all tools:

```bash
$ agor config check

Agentic Tool Authentication Status:

  Tool          Status              Source
  ────────────  ──────────────────  ───────────────────
  Claude Code   ✓ Authenticated     ~/.claude/config
  Codex         ✓ Authenticated     $OPENAI_API_KEY
  Gemini        ✗ Not configured    -

To configure Gemini:
  1. Use native CLI: gemini auth login
  2. Set env var:    export GOOGLE_API_KEY=...
  3. Use Agor:       agor config set credentials.GOOGLE_API_KEY ...

For more info: agor config --help
```

---

### 4. Runtime Auth Handling (Future - Deferred to v1.1)

**When starting a session:**

```typescript
// In session creation service
async function createSession(params: CreateSessionInput) {
  const tool = getToolByName(params.agenticTool);

  // Check auth BEFORE creating session
  const authResult = await tool.authCheck();

  if (!authResult.authenticated) {
    throw new Error(
      `${tool.name} is not authenticated. Run: agor config set credentials.${tool.credentialKey} <key>`
    );
  }

  // Proceed with session creation
  const session = await tool.startSession(...);
  // ...
}
```

**Future UI Enhancement (v1.1):**

- Show auth status badges in NewSessionModal
- Disable unavailable tools with helpful tooltip
- Settings → Authentication tab for credential management
- "Test Connection" feature to validate keys

---

## Implementation Phases

### Phase 1: Core Infrastructure (2-3 hours)

**Goal:** Get `authCheck()` working for status display

- Add `authCheck()` to ITool interface (`packages/core/src/tools/index.ts`)
- Implement for ClaudeTool, CodexTool, GeminiTool
  - Check native CLI config first (preferred)
  - Check environment variables second
  - Check Agor config third
  - Return status + source + instructions
- Test all three auth sources work correctly

**Deliverable:** All tools can report auth status accurately

### Phase 2: Enhanced Init (1 hour)

**Goal:** Show auth status and clear next steps in `agor init`

- Update `agor init` command (`apps/agor-cli/src/commands/init.ts`)
  - Create anonymous user by default
  - Add `--user` and `--email` flags for named users
  - After DB/board creation, check all tools via `authCheck()`
  - Display status table (tool name, status, source)
  - Show instructions for missing tools
  - Show clear "Next Steps" (daemon, UI, repos)
- Add `--silent` flag for CI/automation
- Update help text and examples

**Deliverable:** Fast, informative init experience

### Phase 3: Optional - CLI Config Command (30 min)

**Goal:** Add `agor config check` for manual status checking

- Create `config/check.ts` command
- Shows same status table as init
- Useful for troubleshooting

**Deliverable:** Standalone auth status checker

### Phase 4+: Deferred to v1.1

**Future enhancements (post-launch):**

- Settings → Authentication tab UI
- NewSessionModal auth status badges
- Test Connection feature
- Interactive auth setup in UI

**Total for Launch:** 3-4 hours

---

## Open Questions

1. **Should we validate API keys during init?**
   - Pro: Catch issues early
   - Con: Makes init slow (API calls)
   - **Recommendation:** No, just check file/env existence

2. **Should we store API keys in Agor config?**
   - Pro: Convenient for users without native CLIs
   - Con: Security (plain text in config.json)
   - **Recommendation:** Yes, but warn users, prefer native CLIs

3. **Should we support multiple API keys per tool?**
   - Use case: Team accounts, rate limit rotation
   - **Recommendation:** Not for v1, add later if needed

4. **Should we auto-detect and import native CLI configs?**
   - Pro: Zero-config for existing CLI users
   - Con: Complexity, permission issues
   - **Recommendation:** Yes via `authCheck()`, read-only

5. **Should "Test Connection" be part of authCheck()?**
   - Pro: Validates key actually works
   - Con: Makes authCheck() slow, requires network
   - **Recommendation:** Separate method `validateAuth()` for UI

---

## Security Considerations

1. **API Key Storage:**
   - Native CLI configs: Managed by native tools (secure)
   - Env vars: Managed by shell (secure)
   - Agor config: Plain text JSON (⚠️ less secure)

2. **Display in UI:**
   - Always obscure keys (show as `●●●●●●●●`)
   - Only show last 4 characters for verification
   - Use `type="password"` in input fields

3. **Logging:**
   - Never log API keys
   - Redact keys in error messages
   - Only log source (native-cli, env-var, agor-config)

4. **File Permissions:**
   - Set `~/.agor/config.json` to 0600 (user read/write only)
   - Warn if permissions are too open

---

## User Stories

### Story 1: Fresh Install with Native CLIs

**Persona:** Developer who already uses Claude Code CLI

**Flow:**

1. `pnpm install && agor init`
2. Init detects `~/.claude/config` exists
3. Shows "Claude Code ✓ Ready"
4. User creates session, works immediately
5. **Result:** Zero additional setup ✅

### Story 2: Fresh Install, No CLIs

**Persona:** New user, no native CLIs installed

**Flow:**

1. `pnpm install && agor init`
2. Init shows all tools as "Not configured"
3. Shows clear instructions: `agor config set credentials.ANTHROPIC_API_KEY ...`
4. User runs config commands to add keys
5. Starts daemon and UI
6. Creates session successfully
7. **Result:** Clear path to success ✅

### Story 3: Adding Second Tool Later

**Persona:** User starts with Claude, adds Gemini later

**Flow:**

1. Already using Agor with Claude
2. Runs `agor config check` to see status
3. Sees Gemini not configured
4. Runs `agor config set credentials.GOOGLE_API_KEY ...`
5. Creates Gemini session in UI
6. **Result:** Self-service tool addition ✅

### Story 4: Troubleshooting Auth

**Persona:** User's API key stopped working

**Flow:**

1. Session creation fails with auth error
2. Runs `agor config check` to diagnose
3. Sees which tools are ready vs not
4. Updates key via `agor config set`
5. Creates session successfully
6. **Result:** Easy troubleshooting ✅

---

## Alternative Approaches Considered

### Approach A: Require Native CLIs (Rejected)

**Idea:** Only support native CLI auth, don't store keys in Agor

**Pros:**

- Simpler implementation
- More secure (no key storage)
- Leverages existing tooling

**Cons:**

- Friction for new users
- Doesn't work if native CLI unavailable
- Limits Agor to CLI users only

**Verdict:** ❌ Too restrictive

### Approach B: OAuth-Style Flow (Rejected for v1)

**Idea:** Redirect to Anthropic/OpenAI/Google for auth, get tokens

**Pros:**

- Most secure
- Standard pattern
- No key storage

**Cons:**

- Requires Agor backend/auth server
- Complex implementation
- Doesn't work for self-hosted

**Verdict:** ❌ Save for federated/cloud version

### Approach C: Per-Session API Keys (Rejected)

**Idea:** Let users enter API keys per session

**Pros:**

- Maximum flexibility
- Easy A/B testing with different accounts

**Cons:**

- Terrible UX (enter key every time)
- Security (keys in session records)
- Doesn't solve onboarding

**Verdict:** ❌ Solves wrong problem

---

## Success Metrics

**Good onboarding experience if:**

- ✅ Users with native CLIs work immediately (0 additional setup)
- ✅ New users can configure all tools in <2 minutes
- ✅ Auth errors show actionable instructions
- ✅ Settings UI makes auth status transparent
- ✅ API key rotation is self-service

**Measure:**

- Time from `agor init` to first successful session
- % of sessions that fail due to auth issues
- Support requests about API key setup

---

## Future Enhancements

**Post-Launch (v1.1+):**

1. **Team Key Management**
   - Shared API keys across team
   - Usage tracking per user
   - Rate limit pooling

2. **Key Validation**
   - Background checks for expired keys
   - Proactive warnings before expiration
   - Auto-refresh for rotated keys

3. **Multi-Account Support**
   - Multiple API keys per tool
   - Switch accounts per session
   - Organization/personal separation

4. **Secret Management Integration**
   - 1Password integration
   - Vault/HashiCorp support
   - Encrypted key storage

5. **OAuth Flow**
   - Native OAuth for cloud version
   - Federated identity
   - SSO support

---

## References

- [Claude Code CLI Config](https://docs.anthropic.com/en/docs/claude-code)
- [Codex SDK Auth](https://developers.openai.com/docs/codex)
- [Gemini CLI Docs](https://ai.google.dev/gemini-api/docs/cli)
- [Auth UX Best Practices](https://www.nngroup.com/articles/authentication-patterns/)

---

## Related Explorations

- [[native-cli-feature-gaps]] - Understanding native CLI capabilities
- [[single-package]] - Distribution affects auth setup UX
- [[async-jobs]] - Background auth validation jobs
