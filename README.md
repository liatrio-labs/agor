# Agor: Agent Orchestrator

> **Agor — Next-gen agent orchestration**
> Manage unlimited agents in hyper-context-aware session trees

**Pronunciation:** "AY-gore"

**Status:** Design Document v1.0
**Project:** Open Source (Apache 2.0)
**Organization:** Tembo
**Date:** October 2025

---

## What Is Agor?

**Agor is the orchestration layer for AI-assisted development.** Instead of juggling multiple agentic coding tools (Claude Code, Cursor, Codex, Gemini) in isolation, Agor provides one unified interface to coordinate all your agents, visualize session trees, and capture knowledge automatically.

### The Core Insight

> Context engineering isn't about prompt templates—it's about managing sessions, tasks, and concepts as first-class composable primitives stored in a session tree.

### Five Fundamental Primitives

1. **Session** - Everything is a session. Fork, spawn, navigate workflows as trees.
2. **Task** - User prompts are tasks. Checkpoint work, track git state.
3. **Report** - Post-task hooks generate structured learnings automatically.
4. **Worktree** - Git worktrees for session isolation (optional but powerful).
5. **Concept** - Modular context nuggets, compose into session-specific knowledge.

**See [context/concepts/core.md](context/concepts/core.md) for detailed explanations.**

---

## Picture The Experience

**The canvas:** A visual tree of all your coding sessions—past, present, and parallel.

```
┌─ Session A (Claude Code) ──────────────────────┐  RUNNING
│  "Build authentication system"                  │
│  📍 feature/auth @ b3e4d12                      │
│  📦 [auth, security, api-design]                │
│                                                  │
│  ✓ Task 1: Design JWT flow                     │
│  ⚡ Task 2: Implement endpoints (in progress)   │
│                                                  │
│  ├─ Session B (forked @ Task 1) ───────┐        │
│  │  "Try OAuth 2.0 instead"            │  IDLE  │
│  │  📍 feature/oauth @ c5f6e23          │        │
│  │  ✓ Task 3: Implement OAuth           │        │
│  │                                       │        │
│  └─ Session C (spawned @ Task 2) ──────┐        │
│     "Design user database schema"      │  DONE  │
│     Agent: Gemini                       │        │
│     📍 main @ d7g8h34                   │        │
│     📦 [database, security]             │        │
│     ✓ Task 4: Schema design             │        │
└─────────────────────────────────────────┘
```

**One click:** Jump into any session. Resume conversations. Fork at decision points. Spawn focused subtasks.

**One view:** See which sessions succeeded, which stalled. Understand your exploration tree at a glance.

**One library:** All reports, all learnings, searchable. "Show me all OAuth implementations." "What worked for database migrations?"

**One workspace:** Claude Code for backend, Cursor for frontend, Gemini for schemas—all orchestrated, all visible, all tracked.

**This is Agor: One UI to rule them all.**

---

## The Session Tree

**The session tree is Agor's fundamental artifact** - a complete, versioned record of all agentic coding sessions in your project.

### What It Stores

- **All sessions** - Every conversation with every agent
- **Complete genealogy** - Fork and spawn relationships
- **Git integration** - Which sessions produced which code
- **Task history** - Granular checkpoint of every user prompt
- **Reports** - Structured learnings extracted from each task
- **Concepts** - Modular context library

### Why It Matters

- **Observable** - Visualize explorations, see what worked
- **Interactive** - Fork, spawn, navigate between sessions
- **Shareable** - Push/pull like git, collaborate on trees
- **Versioned** - Complete audit trail of AI-assisted development

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

**See [context/concepts/core.md](context/concepts/core.md#the-session-tree) for more details.**

---

## Why Agor?

### For Individual Developers

- **Never lose context** - Full session history, always accessible
- **Explore confidently** - Fork sessions to try alternatives
- **Learn from yourself** - Reports capture what worked, what didn't
- **Work in parallel** - Multiple agents, multiple sessions, zero conflicts

### For Teams

- **Share knowledge** - Session trees are version-controlled and shareable
- **Onboard faster** - Explore past sessions to understand decisions
- **Pattern recognition** - Find similar past work, reuse approaches
- **Audit trail** - Complete provenance of code changes

### Why It Wins

- **Platform play** - Orchestrates all agents, doesn't compete with them
- **Developer-centric** - Git-aware, visual tools, report-driven
- **Open source** - Community-driven, vendor-neutral

---

## Documentation

Agor's knowledge is organized into modular concept files:

### Core Concepts
- **[core.md](context/concepts/core.md)** - The 5 primitives, vision, and how they compose
- **[models.md](context/concepts/models.md)** - Information architecture, data models, and relationships
- **[architecture.md](context/concepts/architecture.md)** - System design and storage structure
- **[design.md](context/concepts/design.md)** - UI/UX principles and component patterns

### Project Documentation
- **[PROJECT.md](PROJECT.md)** - UI prototype implementation, roadmap, and progress

**See [context/README.md](context/README.md) for the complete concept index.**

---

## Quick Start

### Prerequisites

- Git repository
- One or more supported agents installed:
  - Claude Code
  - Cursor
  - Codex
  - Gemini

### Installation

```bash
# Coming soon - V1 in development
git clone https://github.com/mistercrunch/agor
cd agor
npm install
npm start
```

### First Session

```bash
# Start a new session
agor session start \
  --agent claude-code \
  --concepts auth,security

# Fork at decision point
agor session fork <session-id> --from-task <task-id>

# Spawn focused subtask
agor session spawn <session-id> --agent gemini --concepts database
```

---

## Product Roadmap

### V1: Local-First Orchestration

- Desktop GUI (Electron/Tauri)
- Multi-agent session management
- Visual session tree canvas
- Concept management UI
- Git/worktree integration
- Report generation
- Local-only (no cloud)

**Target:** Individual developers and small teams

### V2: Collaborative Orchestration (Agor Cloud)

- Real-time multiplayer collaboration
- Cloud-hosted sessions
- Shared environments
- Team concept libraries
- Pattern recommendations

**Tagline:** *Real-time strategy multiplayer for AI development*

**See [PROJECT.md](PROJECT.md) for detailed roadmap and milestones.**

---

## Contributing

Agor is open source (Apache 2.0). Contributions welcome!

- **Issues:** [github.com/mistercrunch/agor/issues](https://github.com/mistercrunch/agor/issues)
- **Discussions:** [github.com/mistercrunch/agor/discussions](https://github.com/mistercrunch/agor/discussions)

---

## License

Apache License 2.0

---

*Agor - Next-gen agent orchestration. Built by developers, for developers.*
