# Launch Checklist

Simple todo list for launch preparation.

## Must-Do for Launch

### Core Features

- [ ] Troubleshoot Claude session edge cases (unclear/incomplete results)

### Documentation

- [ ] Complete getting started guide with screenshots/videos

## Nice-to-Have for Launch

### UX Polish

- [ ] Worktree CLI commands (`agor worktree list/create/delete`)

## Consider for Launch

- [ ] database migrations ready for next release
- [ ] Write/Edit tool with file diffs and syntax highlighting
- [ ] Concepts as first-class primitives (CRUD in UI/CLI)
- [ ] Reports as first-class primitives (CRUD in UI/CLI)
- [ ] `@`-triggered autocomplete for sessions/repos/concepts
- [ ] add system prompt to Codex/Gemini for self-awareness

## Post-Launch (Future)

See [context/explorations/](context/explorations/) for detailed designs:

- **CLI session sync** - Keep local CLI sessions in sync with Agor for seamless solo-to-collab handoff
- enhance around SDK advanced features, try to meet CLI parity as much as possible (support Claude Agents, slash commands, etc)
- Cloud deployment (PostgreSQL, Turso/Supabase, hosted version)
- Terminal persistence across restarts (?)
- Capture context metadata from SDKS
- Emit analytics-events for key actions in-product, wire to Segment
- pin spatial comments onto zones and objects instead of directly on board
