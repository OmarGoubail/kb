# Backlog

## Current Phase: 1 — Foundation (DONE)

- [x] Project scaffolding (package.json, tsconfig, biome)
- [x] Config system (types, defaults, Zod schema, loader)
- [x] Global config (`~/.config/kb/config.json`) for KB path resolution
- [x] Naming module (slug generation, filename patterns for all 6 types)
- [x] Template renderer (Mustache-style `{{var}}` + `{{#var}}...{{/var}}`)
- [x] Frontmatter renderer (data → YAML string)
- [x] FS module (atomic write, file reader)
- [x] DB module (SQLite connection, schema migrations with FTS5)
- [x] `kb init [path]` command
- [x] `kb add <type> <title> [options]` command
- [x] Build + install scripts (`bun run build:install` → `~/.local/bin/kb`)
- [x] Local dev environment (`.tmp/` with isolated config)
- [x] SQLite busy_timeout for concurrent access
- [x] 50 tests passing, zero lint issues

## Phase 2 — Frontmatter Parsing + Validation + Git (DONE)

- [x] `frontmatter/parser.ts` — parse YAML frontmatter from markdown files
- [x] `frontmatter/validator.ts` — validate against config schemas (required, enums, extends)
- [x] `naming/parser.ts` — extract type/id/slug from filename (round-trip with generator)
- [x] `kb validate [--fix]` command
- [x] `git init` on `kb init`, auto-commit on `kb add` (with source dir in commit msg)
- [x] `git/operations.ts` — gitInit, gitCommit, gitCommitAll
- [x] 79 tests passing, zero lint issues

## Phase 3 — Database, Indexing + Changelog

- [ ] `changelog` table — track every change with timestamp, source_dir (cwd), action, hashes
- [ ] `content/tag-extractor.ts` — extract `#inline-tags` + frontmatter tags
- [ ] `content/link-parser.ts` — parse `[[wikilinks]]`
- [ ] DB CRUD: `db/notes.ts`, `db/fts.ts`, `db/tags.ts`, `db/links.ts`, `db/changelog.ts`
- [ ] Indexer pipeline: scan → hash → parse → upsert → log changelog (incremental + full)
- [ ] `kb index [--full]`, `kb index status`
- [ ] `kb history <file>` — show changelog for a file
- [ ] `kb history --source <dir>` — show changes from a specific project directory
- [ ] Auto-index on `kb add`

## Phase 4 — Search + List

- [ ] FTS5 query builder
- [ ] BM25 ranking with configurable boosts (title, tag, recency)
- [ ] Filter builder (type, project, area, status, date range)
- [ ] Snippet extraction
- [ ] Output formatter (compact, JSON, markdown)
- [ ] Include changelog metadata in search results (last modified, source)
- [ ] `kb search <query> [options]`
- [ ] `kb ls [options]`
- [ ] `kb tags [tag-name]`

## Phase 5 — Link Resolution

- [ ] `resolve/link-resolver.ts` — exact path → title → alias → fuzzy
- [ ] `kb resolve "[[target]]"`
- [ ] Link resolution pass in indexer (populate `target_note_id`)

## Phase 6 — Config + Template Management

- [ ] `kb config [get|set|edit|reset|validate]`
- [ ] `kb template [list|show|edit|reset]`
- [ ] Editor spawning (`process/editor.ts`)

## Phase 7 — Doctor, Watch, Polish

- [ ] `kb doctor [--fix]` — health checks + auto-repair
- [ ] `kb index --watch` — file watcher for auto-indexing
- [ ] Agent guide wired to `kb --help`

## Future (Post-v1)

- [ ] Vector embeddings for semantic search
- [ ] Multiple KB support (`--kb` flag)
- [ ] MCP server mode
- [ ] `kb import` from other formats
- [ ] Auto-archive old notes
- [ ] MOC auto-generation from tag clusters
- [ ] Complex query language (`type:task AND project:jump`)
