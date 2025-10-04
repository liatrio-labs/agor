# Core Concepts

Related: [[architecture]], [[design]]

## What Is Agor?

**Agor is an agent orchestrator** - the platform layer that sits above all agentic coding tools, providing one UI to manage all agents.

**Pronunciation:** "AY-gore"

**Tagline:**
> **Agor — Next-gen agent orchestration**
> Manage unlimited agents in hyper-context-aware session trees

## The Vision

Build the orchestration layer for AI-assisted development. Instead of competing with agentic coding tools (Claude Code, Cursor, Codex, Gemini), Agor provides the coordination and visibility layer above them all.

### The Core Insight

> **Context engineering isn't about prompt templates—it's about managing sessions, tasks, and concepts as first-class composable primitives stored in a session tree.**

### Why This Wins

- **Platform play** - Orchestrates all agents, doesn't compete with them
- **Developer-centric** - Git-aware, visual tools, report-driven
- **Open source** - Community-driven, vendor-neutral

## The Five Primitives

Everything in Agor is built from five fundamental primitives:

### 1. Session - The Universal Container

**Everything is a session.** A session represents an active conversation with an agentic coding tool.

```python
Session:
  session_id: str
  agent: str                    # "claude-code", "cursor", "codex", "gemini"
  git_ref: str                  # Git SHA at session start
  worktree_path: str | None     # Optional isolated workspace
  concepts: list[str]           # Loaded context modules
  tasks: list[str]              # Ordered task IDs

  # Genealogy
  forked_from_session_id: str | None    # Divergent path
  parent_session_id: str | None         # Spawned subtask
```

**Two Relationship Types:**

- **Fork** - Divergent exploration, inherits full history
  ```
  Session A: "Try REST API"
  └─ Session B (fork): "Try GraphQL instead"
  ```

- **Spawn** - New context window, delegated subtask
  ```
  Session A: "Build auth system"
  └─ Session C (spawn): "Design DB schema"
  ```

### 2. Task - User Prompts as Checkpoints

**Every user prompt creates a task.** Tasks are contiguous message ranges within a session.

```python
Task:
  task_id: str
  session_id: str
  description: str              # User's prompt/goal
  message_range: [int, int]     # [start, end] indices
  git_sha: str                  # "a4f2e91" or "a4f2e91-dirty"
  model: str                    # Can change mid-session
  report_template: str | None   # Post-task report type
  status: "created" | "running" | "completed" | "failed"
```

**Git State Tracking:**
```
Task 1: "Implement auth"
├─ Start: a4f2e91 (clean)
├─ Agent makes changes → a4f2e91-dirty
└─ Complete: b3e4d12
```

### 3. Report - Structured Learning Capture

**Post-task hooks generate reports.** After each task completes, Agor automatically extracts learnings using customizable templates.

**Example Templates:**
- `task-summary.md` - Generic fallback
- `bug-fix.md` - Root cause analysis
- `feature.yaml` - Structured feature documentation
- `research.md` - Investigation findings

**Generation Process:**
1. Task completes
2. Agor forks session ephemerally
3. Adds report generation prompt with template
4. Agent produces structured report
5. Report saved, ephemeral session discarded

### 4. Worktree - Isolated Git Workspaces

**Agor can manage git worktrees** for session isolation (optional but powerful).

```
Main worktree: ~/my-project (main branch)
Session A → ~/my-project-auth (feature/auth)
Session B → ~/my-project-graphql (feature/graphql)
```

**Benefits:**
- Parallel sessions don't interfere
- Clean separation of experimental work
- Agents work in isolation
- Easy cleanup (delete worktree = delete experiment)

### 5. Concept - Modular Context Nuggets

**Concepts are self-referencing knowledge modules** stored as Markdown files.

```
context/
├── auth.md
├── security.md
├── database.md
├── api-design.md
└── testing.md
```

**Features:**
- Wiki-style cross-references: `[[security]]`, `[[database]]`
- Composable (load only what's needed)
- Version-controlled evolution
- Team-shared knowledge base

**Loading Concepts:**
```bash
# Explicit loading
agor session start --concepts auth,security,api-design

# Recursive loading (follows references)
agor session start --concepts auth --recursive

# Dynamic task-level loading
agor task start --add-concepts database
```

## The Session Tree

**The session tree is Agor's fundamental artifact** - a complete, versioned record of all agentic coding sessions in your project.

### What It Stores

- **All sessions** - Every conversation with every agent
- **Complete genealogy** - Fork and spawn relationships
- **Git integration** - Which sessions produced which code
- **Task history** - Granular checkpoint of every user prompt
- **Reports** - Structured learnings extracted from each task
- **Concepts** - Modular context library used across sessions

### Why It Matters

**Observable:**
- Visualize entire tree of explorations
- See which paths succeeded, which failed
- Understand decision points and branches

**Interactive:**
- Manage multiple sessions in parallel
- Fork any session at any task
- Navigate between related sessions

**Shareable:**
- Push/pull like git (federated)
- Learn from others' successful patterns

**Versioned:**
- Track evolution over time
- Audit trail of AI-assisted development

### Session Tree As Git's Companion

```
Your Project:
├── .git/          # Code repository (git)
│   └── Your code's version history
│
└── .agor/         # Session tree (agor)
    ├── sessions/  # Conversation history
    ├── concepts/  # Context library
    └── Metadata linking sessions ↔ code
```

**Git tracks code. Agor tracks the conversations that produced the code.**

## How The Primitives Compose

### Example: Building Authentication Feature

**Phase 1: Main Session**
```bash
agor session start \
  --agent claude-code \
  --concepts auth,security,api-design \
  --worktree feature-auth
```
- Session A created with context loaded
- Worktree `../my-project-auth` created
- Task 1: Design JWT flow → Report generated
- Task 2: Implement endpoints → Report generated

**Phase 2: Fork for Alternative**
```bash
agor session fork <session-a> --from-task 1
```
- Session B created (forked from design phase)
- Task 3: Implement OAuth instead → Different approach, same context

**Phase 3: Spawn for Subtask**
```bash
agor session spawn <session-a> \
  --agent gemini \
  --concepts database,security
```
- Session C created (child of A)
- Task 4: Design user table → Focused DB work, no API context

**Result: Session Tree**
```
Session A (Claude Code, feature-auth worktree)
│ Concepts: [auth, security, api-design]
│
├─ Task 1: "Design JWT auth" ✓
├─ Task 2: "Implement JWT" ✓
│
├─ Session B (fork from Task 1)
│   └─ Task 3: "Implement OAuth" ✓
│
└─ Session C (spawn from Task 2, Gemini)
    └─ Task 4: "Design user table" ✓
```

## Key Design Principles

1. **Everything Is A Session** - Universal abstraction across all agents
2. **Tasks Are Checkpoints** - Granular, forkable, reportable
3. **Reports Are First-Class** - Automatic knowledge capture
4. **Worktrees Enable Parallelism** - Session isolation, no conflicts
5. **Concepts Are Modular** - Composable context, not monolithic files

## Product Philosophy

**V1: Local-First, Visual, Git-Aware**
- Desktop GUI for session management
- Visual session tree canvas
- Multi-agent support
- Concept management
- Local-only (no cloud)

**V2: Collaborative Vibe Coding**
- Cloud-hosted sessions
- Real-time multi-player
- Shared environments
- Team concept libraries
- Pattern recommendations

---

For deeper dives, see:
- [[architecture]] - System design and storage structure
- [[design]] - UI/UX principles and component patterns
- `primitives/` - Detailed explorations of each primitive (future)
