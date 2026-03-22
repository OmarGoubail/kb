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
- [x] 50 tests passing, zero lint issues

## Phase 2 — Frontmatter Parsing + Validation

- [ ] `frontmatter/parser.ts` — parse YAML frontmatter from markdown files
- [ ] `frontmatter/validator.ts` — validate against config schemas (required, enums, extends)
- [ ] `naming/parser.ts` — extract type/id/slug from filename (round-trip with generator)
- [ ] `kb validate [path] [--fix]` command
- [ ] Tests: YAML edge cases, validation rules, filename round-trip, e2e validate

## Phase 3 — Database + Indexing

- [ ] `content/tag-extractor.ts` — extract `#inline-tags` + frontmatter tags
- [ ] `content/link-parser.ts` — parse `[[wikilinks]]`
- [ ] DB CRUD: `db/notes.ts`, `db/fts.ts`, `db/tags.ts`, `db/links.ts`
- [ ] Indexer pipeline: scan → hash → parse → upsert (incremental + full)
- [ ] `kb index [--full]`, `kb index status`
- [ ] Auto-index on `kb add`

## Phase 4 — Search + List

- [ ] FTS5 query builder
- [ ] BM25 ranking with configurable boosts (title, tag, recency)
- [ ] Filter builder (type, project, area, status, date range)
- [ ] Snippet extraction
- [ ] Output formatter (compact, JSON, markdown)
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

## Phase 7 — Doctor, Watch, Binary

- [ ] `kb doctor [--fix]` — health checks + auto-repair
- [ ] `kb index --watch` — file watcher for auto-indexing
- [ ] Binary compilation (`bun build --compile`)
- [ ] Agent guide wired to `kb --help`

## Future (Post-v1)

- [ ] Vector embeddings for semantic search
- [ ] Multiple KB support (`--kb` flag)
- [ ] MCP server mode
- [ ] Git integration hooks
- [ ] `kb import` from other formats
- [ ] Auto-archive old notes
- [ ] MOC auto-generation from tag clusters
- [ ] Complex query language (`type:task AND project:jump`)
