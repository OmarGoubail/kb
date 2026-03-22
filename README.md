# kb

A CLI tool for managing a markdown-based knowledge base. Flat files, SQLite full-text search, git history, Obsidian-compatible. Works from any directory.

## Install

```bash
git clone <repo> && cd kb
bun install
bun run build:install   # compiles binary to ~/.local/bin/kb
```

Verify:

```bash
kb --version
```

## Quick Start

```bash
# Initialize a knowledge base (creates .kb/ config, templates, SQLite DB, git repo)
kb init ~/my-kb

# That's it. All commands now work from anywhere.
kb add project "Acme Backend"
kb add task "Fix Login Flow" --project acme --area auth --id ACM-42 --source linear
kb add session "Morning Standup" --project acme --area api
kb search "authentication"
kb ls --type task --status active
```

## How It Works

`kb init <path>` sets up a knowledge base directory and registers it in `~/.config/kb/config.json`. Every command after that knows where to read/write — no need to `cd` into the KB.

Notes are flat markdown files with YAML frontmatter. Every write is git-committed with the source directory tracked, so you always know what changed a file and from where.

```
~/my-kb/
├── .kb/                    # config, templates, SQLite index
├── project-acme-backend.md
├── task-ACM-42-fix-login-flow.md
├── session-2026-03-23-001-morning-standup.md
├── decision-2026-03-23-use-jwt.md
├── area-authentication.md
└── MOC-active-projects.md
```

## Note Types

| Type | Purpose | Example |
|------|---------|---------|
| `session` | Work logs, daily notes | `session-2026-03-23-001-auth-refactor.md` |
| `task` | Actionable items from Linear, GitHub, etc. | `task-ACM-42-fix-login-flow.md` |
| `project` | Project hub / overview | `project-acme-backend.md` |
| `area` | Knowledge domain | `area-authentication.md` |
| `decision` | Architecture decisions (ADRs) | `decision-2026-03-23-use-jwt.md` |
| `MOC` | Maps of Content (index pages) | `MOC-active-projects.md` |

## Commands

### Creating Notes

```bash
# Session log (auto-incrementing sequence per day)
kb add session "Auth Refactor" --project acme --area auth
# → session-2026-03-23-001-auth-refactor.md

# Task from Linear
kb add task "Fix Login Flow" \
  --project acme --area auth \
  --id ACM-42 --source linear \
  --url "https://linear.app/acme/issue/ACM-42"
# → task-ACM-42-fix-login-flow.md

# Project hub
kb add project "Acme Backend"
# → project-acme-backend.md

# Decision record
kb add decision "Use JWT Instead of Sessions"
# → decision-2026-03-23-use-jwt-instead-of-sessions.md

# Preview without writing
kb add task "Maybe Later" --dry-run

# Include body content
kb add session "Research Notes" --project acme --area api \
  --content "Found that the rate limiter uses a sliding window..."
```

### Searching

```bash
# Full-text search (BM25 ranking, auto-indexes before searching)
kb search "authentication"

# Filter results
kb search "auth" --type task --project acme --status active
kb search "deploy" --tag infrastructure --limit 5

# Output as JSON (great for piping to other tools / agents)
kb search "auth" --output json

# Output as markdown
kb search "deploy" --output markdown
```

### Listing & Browsing

```bash
# List all notes (most recently modified first)
kb ls

# Filter by type, project, status
kb ls --type task --status active
kb ls --project acme --area auth

# Sort options
kb ls --sort title
kb ls --sort created
kb ls --recent          # alias for --sort modified DESC

# List all tags with note counts
kb tags

# Show notes with a specific tag
kb tags authentication
```

### Change History

Every write is tracked with the caller's working directory, so you can see which project triggered each change.

```bash
# Recent changes across all files
kb history

# History for a specific file
kb history task-ACM-42-fix-login-flow.md

# Changes from a specific project directory
kb history --source ~/dev/acme-backend
```

### Link Resolution

Resolve `[[wikilinks]]` to actual files using configurable strategies (exact path, title, alias, fuzzy).

```bash
kb resolve "[[project-acme]]"
# project-acme → project-acme-backend.md
#   Strategy: fuzzy_path

kb resolve "Acme Backend"
# Acme Backend → project-acme-backend.md
#   Strategy: title
```

### Indexing

Search and list auto-index before querying. You can also manage the index explicitly:

```bash
kb index              # incremental (hash-based, skips unchanged)
kb index --full       # full reindex
kb index --status     # show stats
```

### Validation

```bash
# Check all files for frontmatter and naming issues
kb validate

# Auto-fix what's possible (fills in missing defaults)
kb validate --fix
```

### Configuration

All behavior is driven by `.kb/config.json`.

```bash
kb config                              # show full config
kb config get naming.slug_max_length   # dot-notation access
kb config set naming.slug_max_length 40
kb config validate                     # check config syntax
kb config reset                        # reset to defaults
```

### Templates

```bash
kb template list           # show available templates
kb template show session   # print template content
kb template reset task     # reset to default
```

### Diagnostics

```bash
kb doctor        # run health checks
kb doctor --fix  # auto-fix (init git, reindex, clean orphans)
```

## Example Workflows

### Daily Development

```bash
# Morning: start a session log
kb add session "Sprint Work" --project acme --area auth

# Search for prior decisions before implementing
kb search "jwt authentication" --type decision

# Create a task from a ticket
kb add task "Add Refresh Tokens" \
  --project acme --area auth \
  --id ACM-55 --source linear

# End of day: see what you worked on
kb ls --type session --recent
kb history
```

### AI Agent Usage

Agents discover the KB via `kb --help` and operate through CLI commands:

```bash
# Agent reads context before starting work
kb search "rate limiting" --output json --limit 3

# Agent logs its research findings
kb add session "Rate Limiter Research" \
  --project acme --area api \
  --content "Found sliding window implementation in pkg/ratelimit.
Configured at 100 req/min per user. Redis-backed.

See [[task-ACM-42-fix-login-flow]] for related auth work.

#rate-limiting #redis #api"

# Agent checks what changed recently from a project directory
kb history --source ~/dev/acme-backend

# Agent resolves a wikilink to find the right file
kb resolve "[[project-acme-backend]]"
```

### Multi-Project Coordination

When multiple agents work across projects, the changelog tracks everything:

```bash
# From ~/dev/frontend — agent adds a task
kb add task "Coordinate Auth with API" \
  --project frontend --area auth \
  --id FE-88 --source personal

# From ~/dev/backend — different agent updates the same KB
kb add session "Auth Integration Planning" \
  --project backend --area auth

# Later: see all changes, with source directories
kb history
# just now  create  session-2026-03-23-002-auth-integration-planning.md from ~/dev/backend
# 5m ago    create  task-FE-88-coordinate-auth-with-api.md from ~/dev/frontend

# Filter to see what the backend project touched
kb history --source ~/dev/backend
```

### Obsidian Integration

The KB is just a folder of markdown files — open it in Obsidian and everything works:

1. Open your KB folder in Obsidian
2. Edit files freely — use `[[wikilinks]]`, add `#tags`
3. Run `kb index` after editing (or let commands auto-index)
4. Use Obsidian's graph view to visualize connections

## Development

```bash
# Run tests
bun test                # all 117 tests
bun test tests/unit     # unit tests
bun test tests/e2e      # e2e tests

# Lint & format
bun run lint
bun run fmt
bun run check           # fmt + test + lint

# Local dev testing (isolated .tmp/ dir, never touches real KB)
bun run dev:reset                              # create test KB
bun run dev -- add task "Test" --project x     # add to test KB
bun run dev -- search "test"                   # search test KB
bun run dev -- ls-files                        # list test files

# Build
bun run build           # compile binary to ./kb
bun run build:install   # compile + install to ~/.local/bin/kb
```

## Docs

- [Architecture](docs/architecture.md) — module design, data flow, stack
- [Configuration](docs/configuration.md) — all config sections explained
- [Backlog](docs/backlog.md) — phase tracking, planned work
