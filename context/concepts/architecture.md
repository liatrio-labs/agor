# Architecture

Related: [[core]], [[design]]

**Status:** Template / Work in Progress

This document outlines Agor's system architecture, storage structure, and data flow patterns.

## Information Architecture

### Directory Structure

```
my-project/
├── .git/                    # Git repository
├── .agor/                   # Agor metadata
│   ├── config.json          # Agor configuration
│   │
│   ├── sessions/            # Session metadata
│   │   ├── session-abc123/
│   │   │   ├── metadata.json
│   │   │   ├── tasks/
│   │   │   │   ├── task-001.json
│   │   │   │   └── task-002.json
│   │   │   └── reports/
│   │   │       ├── task-001-report.md
│   │   │       └── task-002-report.yaml
│   │   └── session-def456/
│   │       └── ...
│   │
│   └── concepts/            # Concept library
│       ├── auth.md
│       ├── security.md
│       ├── database.md
│       └── ...
│
└── src/                     # Your code
```

## Session Metadata Format

**`.agor/sessions/session-abc123/metadata.json`:**
```json
{
  "session_id": "abc123",
  "agent": "claude-code",
  "agent_version": "1.2.3",
  "created_at": "2025-10-01T10:00:00Z",
  "status": "completed",

  "git_state": {
    "ref": "feature/auth",
    "base_sha": "a4f2e91",
    "current_sha": "b3e4d12"
  },

  "worktree": {
    "path": "../my-project-auth",
    "managed_by_agor": true
  },

  "concepts": ["auth", "security", "api-design"],

  "genealogy": {
    "forked_from_session_id": null,
    "fork_point_task_id": null,
    "parent_session_id": null,
    "spawn_point_task_id": null,
    "children": ["def456"]
  },

  "tasks": ["task-001", "task-002"],
  "message_count": 37,
  "last_updated": "2025-10-01T10:30:00Z",

  "native_session_path": "~/.claude/projects/my-project/abc123.jsonl"
}
```

## Task Metadata Format

**`.agor/sessions/session-abc123/tasks/task-001.json`:**
```json
{
  "task_id": "task-001",
  "session_id": "abc123",
  "description": "Implement JWT authentication",
  "status": "completed",

  "message_range": {
    "start_index": 0,
    "end_index": 15,
    "start_timestamp": "2025-10-01T10:00:00Z",
    "end_timestamp": "2025-10-01T10:15:00Z"
  },

  "git_state": {
    "sha_at_start": "a4f2e91",
    "sha_at_end": "b3e4d12",
    "commit_message": "feat: implement JWT auth"
  },

  "model": "claude-sonnet-4",

  "report": {
    "template": "feature.md",
    "path": ".agor/sessions/abc123/reports/task-001-report.md",
    "generated_at": "2025-10-01T10:15:30Z"
  },

  "created_at": "2025-10-01T10:00:00Z",
  "completed_at": "2025-10-01T10:15:00Z"
}
```

## Data Flow

### Session Creation Flow
TODO: Add sequence diagram

### Fork Operation Flow
TODO: Add sequence diagram

### Spawn Operation Flow
TODO: Add sequence diagram

### Report Generation Flow
TODO: Add sequence diagram

## Agent Integration

### Supported Agents
- Claude Code (via CLI wrapper)
- Cursor (via API)
- Codex (via API)
- Gemini (via API)

### Agent Adapter Pattern
TODO: Document adapter interface

## Storage Layer

### Local Storage
- File-based metadata (JSON)
- Git-based versioning
- Concept files (Markdown)

### Future: Cloud Storage
- Session synchronization
- Shared concept libraries
- Real-time collaboration

## Security Considerations

TODO: Document security model
- Session isolation
- API key management
- Access control

---

**Note:** This document is a work in progress. As Agor's architecture evolves, this file will be updated with detailed implementation patterns, diagrams, and best practices.

See also:
- [[core]] - Core concepts and primitives
- [[design]] - UI/UX architecture
