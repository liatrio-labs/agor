<img src="https://github.com/mistercrunch/agor/releases/download/v0.3.15/logo_circle.png" alt="Agor Logo" width="320" />

# Agor

Orchestrate Claude Code, Codex, and Gemini sessions on a multiplayer canvas. Manage git worktrees, track AI conversations, and visualize your team's agentic work in real-time.

**[Docs](https://mistercrunch.github.io/agor/)** | **[Discussions](https://github.com/mistercrunch/agor/discussions)**

---

## Installation

```bash
npm install -g agor-live
```

## Quick Start

```bash
# 1. Initialize (creates ~/.agor/ and database)
agor init

# 2. Start the daemon
agor daemon start

# 3. Open the UI
agor open
```

**Try in Codespaces:**

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/mistercrunch/agor?quickstart=1&devcontainer_path=.devcontainer%2Fplayground%2Fdevcontainer.json)

---

## See It In Action

<div align="center">
  <table>
    <tr>
      <td width="50%">
        <img src="https://github.com/mistercrunch/agor/releases/download/v0.3.15/Area.gif" alt="Spatial 2D Canvas"/>
        <p align="center"><em>Spatial canvas with worktrees and zones</em></p>
      </td>
      <td width="50%">
        <img src="https://github.com/mistercrunch/agor/releases/download/v0.3.15/Convo.gif" alt="AI Conversation in Action"/>
        <p align="center"><em>Rich web UI for AI conversations</em></p>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <img src="https://github.com/mistercrunch/agor/releases/download/v0.3.15/Settings.gif" alt="Settings and Configuration"/>
        <p align="center"><em>MCP servers and worktree management</em></p>
      </td>
      <td width="50%">
        <img src="https://github.com/mistercrunch/agor/releases/download/v0.3.15/Social.gif" alt="Real-time Multiplayer"/>
        <p align="center"><em>Live collaboration with cursors and comments</em></p>
      </td>
    </tr>
  </table>
</div>

**[→ Watch unscripted demo on YouTube](https://www.youtube.com/watch?v=qiYHw20zjzE)** (13 minutes)

---

## What It Does

- **Agent orchestration** - Run Claude Code, Codex, Gemini from one interface
- **Git worktree management** - Isolated workspaces per session, no branch conflicts
- **Real-time board** - Drag sessions around, organize by project/phase/zone
- **Session tracking** - Every AI conversation is stored, searchable, forkable
- **MCP integration** - Configure MCP servers once, use across all agents
- **Multiplayer** - See teammates' sessions, share environments, async handoffs

---

## Core Concepts

**Sessions** - Container for agent interactions with git state, tasks, genealogy
**Worktrees** - Git worktrees managed by Agor, isolated per session
**Boards** - Spatial canvas for organizing sessions (like Trello for AI work)
**Zones** - Areas on board that trigger templated prompts when sessions dropped
**Tasks** - User prompts tracked as first-class work units

---

## Architecture

```
Frontend (React + Ant Design)
    ↓ WebSocket
Daemon (FeathersJS)
    ↓
Database (LibSQL) + Git Worktrees
    ↓
Agent SDKs (Claude, Codex, Gemini)
```

**Stack:** FeathersJS, Drizzle ORM, LibSQL, React Flow, Ant Design

See [Architecture Guide](https://mistercrunch.github.io/agor/guide/architecture) for details.

---

## Key Features

### 🧩 Agent Orchestration Layer

- **Claude Code**, **Codex**, and **Gemini** support via extensible SDK — more coming soon.
- Centralized **MCP configuration** — connect once, use across all tools.
- Swap or parallelize agents with one command; easily hand off work when one model stalls.

### 🌐 Multiplayer Spatial Canvas

- Real-time collaboration with **cursor broadcasting** and **facepiles**.
- Sessions live on a **dynamic board** — cluster by project, phase, or purpose.
- **Threaded comments** directly on the board with spatial pins (Figma-style).
- **Emoji reactions** for quick feedback; resolve threads when decisions are made.

### 🌲 Session Trees — Fork, Spawn, Coordinate

- **Fork sessions** to explore alternatives without losing the original path.
- **Spawn subsessions** for focused subtasks that report back to the parent.
- Visualize the full genealogy — see how work branched, merged, and evolved.
- Track outcomes across the tree to understand what approaches worked.

### ⚙️ Zone Triggers — Workflows Made Spatial

- Define **zones** on your board that trigger templated prompts when sessions are dropped.
- Build **kanban-style flows** or custom pipelines: analyze → develop → review → deploy.
- Combine with context templates to automate arbitrarily complex workflows.

### 🌳 Shared, Persisted Dev Environments

- **No more local environment juggling** — managed **git worktrees** with shared, persistent dev environments.
- Sessions map to worktrees with running apps, auto-managed ports, and health monitoring.
- **One-click control** — configure start/stop commands once, everyone on the team can use it.
- Works with any stack: `docker compose up`, `npm run dev`, `./manage.py runserver`.

### 🕹️ Real-Time Strategy for AI Teams

- Coordinate agentic work like a multiplayer RTS.
- Watch teammates or agents move across tasks live.
- Cluster sessions, delegate, pivot, and iterate together.

---

## Development

```bash
# Terminal 1: Daemon
cd apps/agor-daemon && pnpm dev  # :3030

# Terminal 2: UI
cd apps/agor-ui && pnpm dev      # :5173
```

See [CLAUDE.md](CLAUDE.md) for dev workflow and [PROJECT.md](PROJECT.md) for roadmap.

---

## Roadmap

- Match CLI-native features as SDKs evolve
- Bring Your Own IDE (VSCode/Cursor remote connection)
- Session forking UI with genealogy visualization
- Automated reports after task completion
- Context management system (modular markdown files)
