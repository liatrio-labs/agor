# Agor UI Prototype

> UI prototype for Agor's session orchestration interface. Built with React, TypeScript, Ant Design, and Storybook.

**See [context/concepts/](context/concepts/) for architecture, data models, and design principles.**

---

## Overview

This project implements the first UI prototype for Agor, demonstrating the core session tree visualization and management interface. The prototype focuses on visual design and interaction patterns that will inform the full product implementation.

**Tech Stack:** Vite + React + TypeScript + Ant Design + React Flow + Storybook
**Design Principles:** See [context/concepts/design.md](context/concepts/design.md)
**Data Models:** See [context/concepts/models.md](context/concepts/models.md)

---

## Implementation Status

### ✅ Phase 1: Core Components (Completed)

#### Session Components
- **SessionHeader** - Collapsed view for canvas overview
- **SessionCard** - Expanded view with inline task list
  - Shows latest 5 tasks chronologically
  - Prioritizes running tasks in display
  - Clickable header/metadata (opens drawer)
  - Tasks section NOT clickable (prevents conflicts)
- **SessionDrawer** - Full session detail (right drawer)
  - Full conversation with task timeline
  - Dynamic input box with Send/Fork/Subtask actions
- **TaskListItem** - Compact task rows with smart truncation (120 chars)
- **SessionCanvas** - React Flow infinite canvas with snap-to-grid (20x20px)

#### Navigation & Organization
- **Board System** - Organize sessions into boards (like Trello)
  - **Board** type with sessions, color, icon
  - **SessionListDrawer** - Left drawer for browsing sessions by board
  - **AppHeader** - Shows current board (clickable to open drawer)
  - Canvas filters sessions by current board
- **Two-Drawer Pattern**:
  - Left: Session list browser (triggered by menu button or board name)
  - Right: Session detail (triggered by clicking session cards)

#### Session Creation
- **NewSessionButton** - FloatButton overlay (top-right)
- **NewSessionModal** - Agent selection + prompt input + advanced options
- **AgentSelectionCard** - Radio card for agent selection with install flow

#### Data & Types
- **Session/Task/Board/Agent types** - See [models.md](context/concepts/models.md)
- **Mock data** - 18+ realistic user prompts, git dirty state, tool counts
- **4 mock agents** - claude-code, codex (installed), cursor, gemini (not installed)
- **3 mock boards** - Default Board, Experiments, Bug Fixes

### 🚧 Phase 2: Polish & Features (In Progress)

#### Pending Components
1. **SessionDrawer enhancements**
   - Task detail expansion
   - Report preview
2. **Canvas features**
   - Session filtering/search
   - Session deletion/archiving
   - Multi-session operations

#### Future Enhancements
- Concept management UI
- Report generation/viewing
- Git diff visualization
- Multi-agent coordination UI

---

## Quick Start

### Prerequisites
- Node.js 18+
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/mistercrunch/agor.git
cd agor/agor-ui

# Install dependencies
npm install

# Start Storybook (component development)
npm run storybook

# Or start app (full prototype)
npm run dev
```

### Project Structure

```
agor-ui/
├── src/
│   ├── types/          # TypeScript types (Session, Task, Board, Agent)
│   ├── components/     # React components with .stories.tsx
│   ├── mocks/          # Mock data (sessions, tasks, boards, agents)
│   └── App.tsx         # Main orchestration component
├── .storybook/         # Storybook configuration
└── package.json
```

---

## Design Standards

**All UI/UX standards documented in [context/concepts/design.md](context/concepts/design.md):**
- Strict Ant Design token usage (no custom CSS)
- Dark mode by default
- Icon consistency (Ant Design icons only)
- Component architecture (atomic design)
- Two-drawer overlay pattern
- Status indicators (animated Spin for running states)

---

## Canvas Library: React Flow

**Decision:** React Flow for session tree visualization

**Why React Flow?**
- Nodes ARE React components (SessionCard renders directly as node)
- Built-in interactions: drag, zoom, pan, multi-select
- Edge types for fork/spawn relationships (dashed vs solid)
- TypeScript support, active development
- Performance optimizations (`onlyRenderVisibleElements`)

**Key Features:**
- Snap to grid (20x20px) for clean alignment
- MiniMap for navigation
- Custom node types (session-node)
- Custom edge types (fork-edge, spawn-edge)

---

## Roadmap

### V1: Local Desktop GUI (Target: Q2 2025)
- Complete UI prototype components
- Desktop app (Electron/Tauri)
- Multi-agent session management
- Visual session tree canvas
- Concept management UI
- Git/worktree integration
- Report generation
- **Local-only, no cloud**

### V2: Agor Cloud (Target: Q4 2025)
- Real-time multiplayer collaboration
- Cloud-hosted sessions
- Shared environments
- Team concept libraries
- Pattern recommendations
- **Tagline:** *Real-time strategy multiplayer for AI development*

**See [README.md](../README.md) for full product vision.**

---

## Success Criteria

**Phase 1 (Complete):**
- [x] TypeScript types for Session, Task, Board, Agent
- [x] SessionCard with 7+ Storybook stories
- [x] TaskListItem with 8+ Storybook stories
- [x] SessionCanvas with React Flow
- [x] SessionDrawer with input box and actions
- [x] Board system with filtering
- [x] Two-drawer overlay pattern
- [x] Mock data with realistic prompts
- [x] Dark theme with Ant Design
- [x] Task truncation with tooltips

**Phase 2 (In Progress):**
- [ ] Task detail expansion
- [ ] Report preview UI
- [ ] Session filtering/search
- [ ] Multi-session operations

---

## Contributing

1. Components live in `src/components/`
2. Always create Storybook stories (`.stories.tsx`)
3. Use TypeScript interfaces from `src/types/`
4. Follow design standards in [design.md](context/concepts/design.md)
5. Mock data in `src/mocks/`

---

**Philosophy:** Start visual, iterate fast, build reusable. The UI prototypes inform backend implementation.
