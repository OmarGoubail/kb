# kb

A CLI tool for managing a markdown-based knowledge base. Designed for personal use, Obsidian compatibility, and AI agent integration.

## Quick Start

```bash
# Install dependencies
bun install

# Initialize a knowledge base
bun run src/cli.ts init ~/Technocore

# Create notes (works from any directory)
bun run src/cli.ts add session "Auth Refactor" --project jump --area auth
bun run src/cli.ts add task "Fix Bug" --project alpha --area api --id JMP-42 --source linear
bun run src/cli.ts add project "Alpha Platform"
bun run src/cli.ts add MOC "Active Projects"

# Preview without writing
bun run src/cli.ts add decision "Use JWT" --dry-run
```

## How It Works

`kb init <path>` creates a knowledge base directory with a `.kb/` folder containing config, templates, and a SQLite database. It also saves the path to `~/.config/kb/config.json` so all subsequent commands know where to operate — no need to `cd` into the KB directory.

Notes are flat markdown files with YAML frontmatter, organized by naming convention:

```
session-2026-03-22-001-auth-refactor.md
task-JMP-123-fix-auth-bug.md
project-alpha-platform.md
MOC-active-projects.md
decision-2026-03-22-use-jwt.md
```

## Note Types

| Type | Purpose | Naming Pattern |
|------|---------|----------------|
| `session` | Work logs | `session-{date}-{seq}-{slug}.md` |
| `task` | Actionable items | `task-{id}-{slug}.md` |
| `project` | Project hubs | `project-{slug}.md` |
| `area` | Knowledge areas | `area-{slug}.md` |
| `decision` | Architecture decisions | `decision-{date}-{slug}.md` |
| `MOC` | Maps of Content | `MOC-{slug}.md` |

## Configuration

All behavior is driven by `.kb/config.json`. See [docs/configuration.md](docs/configuration.md) for details.

## Development

```bash
bun test              # Run all tests
bun test tests/unit   # Unit tests only
bun test tests/e2e    # E2E tests only
bun run lint          # Lint
bun run fmt           # Format
bun run build         # Compile to single binary
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for module design and decisions.

## Roadmap

See [docs/backlog.md](docs/backlog.md) for planned work.
