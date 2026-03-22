# Architecture

## Principles

1. **Configuration-driven** — All behavior defined in `.kb/config.json`, no hardcoded defaults in business logic
2. **Pure functions** — Business logic is pure and testable, side effects are isolated
3. **Flat structure** — All notes at root level, organized by naming convention
4. **CLI-only** — No MCP server; agents use commands directly via `--help`

## Module Layout

```
src/
├── cli.ts                  # Commander entry point
├── config/                 # Configuration system
│   ├── types.ts            # TypeScript interfaces (the contract)
│   ├── defaults.ts         # Default config object
│   ├── schema.ts           # Zod validation schemas
│   └── loader.ts           # Load config, resolve KB root, global config
├── naming/                 # Filename generation (pure)
│   ├── slug.ts             # Title → kebab-case slug
│   └── generator.ts        # Pattern interpolation, sequence numbering
├── template/               # Template rendering (pure)
│   └── renderer.ts         # {{var}} substitution, {{#var}}...{{/var}} conditionals
├── frontmatter/            # YAML frontmatter (pure)
│   └── renderer.ts         # Data → YAML string
├── fs/                     # File system (effects)
│   ├── atomic-write.ts     # Write-to-temp-then-rename
│   └── reader.ts           # Read files/directories
├── db/                     # SQLite (effects)
│   ├── connection.ts       # Open DB, WAL mode, foreign keys
│   └── migrations.ts       # Schema creation (notes, FTS5, tags, links, aliases)
└── commands/               # CLI commands (orchestration)
    ├── init.ts             # kb init
    └── add.ts              # kb add
```

## Data Flow

```
CLI args → Config → Pure Functions → Effects → Output
```

Commands are thin orchestrators that:
1. Load config
2. Call pure functions to compute what to do
3. Call effect modules to do it
4. Print results

## Global Config

`~/.config/kb/config.json` stores the path to the active knowledge base:

```json
{ "default_kb": "/Users/you/Technocore" }
```

Resolution order: explicit `--kb` flag (future) → global config → walk up from cwd.

Override with `KB_GLOBAL_CONFIG_DIR` env var (used in tests).

## Database

SQLite with FTS5 for full-text search. Tables:
- `notes` — core note metadata + content
- `notes_fts` — FTS5 virtual table (auto-synced via triggers)
- `tags`, `note_tags` — normalized many-to-many tags
- `links` — wikilink graph
- `aliases` — alternative titles for link resolution

## Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **Database**: bun:sqlite (built-in, FTS5 support)
- **CLI**: Commander
- **Validation**: Zod
- **YAML**: yaml
- **Lint/Format**: Biome
