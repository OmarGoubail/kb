# kb

A CLI tool for managing a markdown-based knowledge base. Flat files, SQLite full-text search, git history, dependency tracking, Obsidian-compatible. Works from any directory. Designed for AI agent workflows.

## Install

```bash
git clone <repo> && cd kb
bun install
bun run build:install   # compiles binary to ~/.local/bin/kb
```

Verify:

```bash
kb --version   # 1.0.0
```

## Quick Start

```bash
# Initialize a knowledge base
kb init ~/my-kb

# All commands now work from anywhere.
kb add project "Acme Backend" --content "Go + PostgreSQL payments service."
kb add task "Fix Login Flow" --project acme --area auth --id ACM-42 --source linear
kb add session "Morning Standup" --project acme --area api --content "Discussed auth timeline."
kb search "authentication"
kb ready                    # what can be worked on now
kb today                    # daily rollup
```

## How It Works

`kb init <path>` sets up a knowledge base and registers it in `~/.config/kb/config.json`. Every command knows where to read/write — no `cd` needed.

Notes are flat markdown files with YAML frontmatter. Every write is git-committed with the source directory, repo, and branch tracked — so you always know what changed, from where.

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
| `session` | Work logs, planning sessions | `session-2026-03-23-001-auth-refactor.md` |
| `task` | Actionable items (Linear, GitHub, etc.) | `task-ACM-42-fix-login-flow.md` |
| `project` | Project hub / overview | `project-acme-backend.md` |
| `decision` | Architecture decisions (ADRs) | `decision-2026-03-23-use-jwt.md` |
| `area` | Knowledge domain | `area-authentication.md` |
| `MOC` | Maps of Content (index pages) | `MOC-active-projects.md` |

## Commands

### Creating Notes

```bash
kb add session "Auth Refactor" --project acme --area auth
kb add task "Fix Login" --project acme --area auth --id ACM-42 --source linear --url "..."
kb add project "Acme Backend" --content "..."
kb add decision "Use JWT" --project acme --content "..."
kb add area "Authentication" --content "..."
kb add MOC "Active Projects" --content "..."

# All options: --project, --area, --status, --id, --name, --source, --url, --content, --stdin, --dry-run
```

### Reading & Searching

```bash
kb show ACM-42                  # read a note (fuzzy: id, path, title)
kb search "authentication"      # full-text search (BM25)
kb search "auth" --type task --project acme --output json
kb ls --type task --status active
kb ls --project acme --recent
kb tags                         # list all tags
kb tags auth                    # notes with this tag
```

### Updating

```bash
kb update ACM-42 --status done
kb update ACM-42 --project acme --area api
kb append ACM-42 --content "## Update\n\nFinished the endpoint."
```

### Dependencies

Track what must be done before something else can start. Works across note types — tasks can depend on decisions, sessions, anything.

```yaml
# In frontmatter:
depends_on:
  - task-ACM-1-setup-sdk.md
  - decision-2026-03-23-use-jwt.md
```

```bash
kb ready                        # notes with all deps met
kb ready --project acme         # scoped to project
kb blocked                      # what's stuck and why
kb blocked --output json
```

### History & Tracking

Every write is git-committed with source directory, repo name, and branch.

```bash
kb history                              # recent changes
kb history task-ACM-42-fix-login.md     # file history
kb history --source ~/dev/acme          # changes from a directory
kb today                                # daily rollup by project
```

### Configuration & Maintenance

```bash
kb config                               # show full config
kb config get naming.slug_max_length    # dot-notation access
kb config set naming.slug_max_length 40
kb validate                             # check frontmatter + naming
kb validate --fix                       # auto-fix defaults
kb doctor                               # health checks
kb doctor --fix                         # auto-repair
kb template list                        # list templates
kb prime                                # context dump for AI agents
```

## AI Agent Integration

### `kb prime`

Run `kb prime` to get a full context block for any AI agent. It's project-aware — detects your repo and branch from the cwd, shows only recent and relevant context.

```bash
$ kb prime
You have access to a knowledge base via the `kb` CLI.
KB: ~/my-kb
repo: acme-backend
branch: feature/auth-flow
project: acme
date: 2026-03-23 (showing last 2 days)

## Ready (no blockers)
- task-ACM-43-refresh-tokens.md

## Blocked
- task-ACM-44-token-rotation.md
  <- task-ACM-43-refresh-tokens.md [active]

## Recent Sessions
- session-2026-03-23-001-auth-planning.md

## Recent Decisions
- decision-2026-03-23-use-jwt.md
...
```

### Agent Workflow

1. `kb prime` — get context (auto-detects project from git remote, even in worktrees)
2. `kb ready` — see what's actionable
3. `kb search "..." --output json` — find relevant notes
4. `kb show <id>` — read full content
5. `kb add session "..." --project X --content "..."` — log work
6. `kb update <id> --status done` — mark complete
7. Use `[[wikilinks]]` and `#tags` in content to connect notes

### Tags

Keep tags meaningful:
- **By project**: `#acme`, `#payments-api`
- **By feature/topic**: `#auth`, `#search`, `#onboarding`
- **By milestone**: `#v1-release`, `#sprint-3`

Avoid tech stack tags (`#typescript`), buzzwords (`#architecture`), or generic terms.

## Example Workflows

### Daily Development

```bash
# Morning: what needs doing?
kb ready --project acme

# Start a session
kb add session "Auth Work" --project acme --area auth

# Search for prior decisions
kb search "jwt" --type decision

# Create a task from a ticket
kb add task "Add Refresh Tokens" \
  --project acme --area auth \
  --id ACM-55 --source linear

# Add dependency
# (edit task-ACM-55 frontmatter: depends_on: [task-ACM-42-fix-login.md])

# End of day
kb today
```

### Multi-Project Coordination

```bash
# From ~/dev/frontend — agent creates a task
kb add task "Coordinate Auth with API" \
  --project frontend --area auth \
  --id FE-88 --source personal

# From ~/dev/backend — different agent logs a session
kb add session "Auth Integration Planning" \
  --project backend --area auth

# See all activity with source tracking
kb history
# just now  create  session-... from ~/dev/backend (backend/main)
# 5m ago    create  task-FE-88-... from ~/dev/frontend (frontend/feature/auth)
```

### Obsidian Integration

The KB is just a folder of markdown files:

1. Open your KB folder in Obsidian
2. Edit files freely — `[[wikilinks]]`, `#tags`
3. Run `kb index` after editing (or let commands auto-index)
4. Use Obsidian's graph view to visualize connections

## Development

```bash
bun test                # 147 tests
bun run lint            # biome check
bun run fmt             # biome format
bun run check           # fmt + test + lint

# Local dev (isolated .tmp/, never touches real KB)
bun run dev:reset
bun run dev -- add task "Test" --project x
bun run dev -- search "test"
bun run dev -- ready

# Build
bun run build           # compile to ./kb
bun run build:install   # compile + install to ~/.local/bin/kb
```

## Docs

- [Architecture](docs/architecture.md) — module design, data flow, stack
- [Configuration](docs/configuration.md) — config sections explained
- [Backlog](docs/backlog.md) — planned work
