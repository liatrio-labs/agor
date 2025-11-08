# Agent Session Persistence Fix

## Problem

Agent conversations (Claude Code, Codex, Gemini CLI) were being lost after Railway container restarts/redeploys because their session data was stored in the ephemeral container filesystem instead of the persistent volume.

**Error symptoms:**
```
Claude SDK error after 0 messages: Claude Code process exited with code 1
No conversation found with session ID: 6a08a761-aa35-4330-b708-2dc8d130a317
```

## Root Cause

Each agent CLI stores session data in standard locations:
- Claude Code: `~/.claude/`
- Codex: `~/.codex/`
- Gemini CLI: `~/.gemini/`

These directories were in `/home/agor/` which is part of the container filesystem, NOT the Railway persistent volume at `/home/agor/.agor`.

When Railway restarts or redeploys containers, everything outside the mounted volume is reset, causing agents to lose all conversation history.

## Solution

### Symlink Agent Directories to Persistent Volume

The fix creates symlinks from the standard CLI locations to directories within the persistent volume:

```bash
~/.claude  -> /home/agor/.agor/.claude   # Claude Code sessions
~/.codex   -> /home/agor/.agor/.codex    # Codex sessions
~/.gemini  -> /home/agor/.agor/.gemini   # Gemini CLI sessions
```

### Changes Made

**1. Dockerfile** (lines 112-117)
```dockerfile
# Create agent data directories in persistent volume
# These will be symlinked from home directory to ensure persistence
RUN mkdir -p /home/agor/.agor/.claude \
             /home/agor/.agor/.codex \
             /home/agor/.agor/.gemini && \
    chown -R agor:agor /home/agor/.agor
```

**2. docker-entrypoint-prod.sh** (lines 134-160)
```bash
# Create agent session directories in persistent volume
echo "📁 Setting up agent session storage..."
mkdir -p /home/agor/.agor/.claude \
         /home/agor/.agor/.codex \
         /home/agor/.agor/.gemini
chown -R agor:agor /home/agor/.agor

# Create symlinks from home directory to persistent volume
# This ensures CLIs store data in the persistent volume
if [ ! -L /home/agor/.claude ]; then
  rm -rf /home/agor/.claude
  ln -s /home/agor/.agor/.claude /home/agor/.claude
fi

if [ ! -L /home/agor/.codex ]; then
  rm -rf /home/agor/.codex
  ln -s /home/agor/.agor/.codex /home/agor/.codex
fi

if [ ! -L /home/agor/.gemini ]; then
  rm -rf /home/agor/.gemini
  ln -s /home/agor/.agor/.gemini /home/agor/.gemini
fi

chown -h agor:agor /home/agor/.claude /home/agor/.codex /home/agor/.gemini
echo "✅ Agent session directories configured (symlinked to persistent volume)"
```

**3. DEPLOYMENT_RAILWAY.md** (new section)
- Added "Agent Session Persistence" section
- Updated production checklist
- Added verification commands

## What's Persisted Now

✅ **Claude Code:**
- Conversation history
- SDK session IDs
- Resume state

✅ **Codex:**
- Thread state
- File tracking
- Context history

✅ **Gemini CLI:**
- Chat sessions
- Conversation records
- Working directory context

## Deployment

```bash
# Commit the changes
git add Dockerfile DEPLOYMENT_RAILWAY.md AGENT_PERSISTENCE_FIX.md
git commit -m "fix: persist agent session data across container restarts

- Symlink agent directories to persistent volume
- Prevents 'No conversation found' errors on redeploy
- Claude Code, Codex, and Gemini sessions now survive restarts"

# Push to Railway (auto-deploys)
git push
```

## Verification

After deployment, verify the symlinks are correctly set up:

```bash
# SSH into Railway container
railway run bash

# Check symlinks
ls -la ~/ | grep -E '\.(claude|codex|gemini)'

# Expected output:
# lrwxrwxrwx 1 agor agor   28 Nov  8 20:00 .claude -> /home/agor/.agor/.claude
# lrwxrwxrwx 1 agor agor   27 Nov  8 20:00 .codex -> /home/agor/.agor/.codex
# lrwxrwxrwx 1 agor agor   28 Nov  8 20:00 .gemini -> /home/agor/.agor/.gemini

# Verify the directories exist in persistent volume
ls -la /home/agor/.agor/

# Expected output should include:
# drwxr-xr-x 2 agor agor 4096 Nov  8 20:00 .claude
# drwxr-xr-x 2 agor agor 4096 Nov  8 20:00 .codex
# drwxr-xr-x 2 agor agor 4096 Nov  8 20:00 .gemini
```

## Testing

1. **Start a Claude Code session**
   - Create a task in Agor UI
   - Send a message to Claude Code
   - Note the SDK session ID in logs

2. **Trigger a container restart**
   - In Railway dashboard, manually restart the service
   - Or push a new commit to trigger redeploy

3. **Resume the session**
   - Go back to the same task
   - Send another message
   - Should NOT see "No conversation found" error
   - Claude should remember previous context

## Why Symlinks Instead of Environment Variables?

The agent CLIs use Node.js's `os.homedir()` and `process.env.HOME` to determine where to store data. They don't respect custom environment variables like `CLAUDE_HOME`.

Symlinks are transparent to the CLIs:
- CLIs write to `~/.claude`
- Symlink redirects to `/home/agor/.agor/.claude`
- Data ends up in persistent volume
- Works across container restarts

## Rollback

If this causes issues, remove the symlinks in the entrypoint:

```bash
# Remove symlink creation section from docker-entrypoint-prod.sh
# Lines 142-160
```

The agents will go back to using ephemeral storage (conversations lost on restart).

---

**Status:** ✅ Ready for deployment
**Impact:** Fixes agent session persistence issue
**Risk:** Low - only affects agent session storage paths

