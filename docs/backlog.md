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

## Phase 3 — Database, Indexing + Changelog (DONE)

- [x] `changelog` table — track every change with timestamp, source_dir (cwd), action, hashes
- [x] `content/tag-extractor.ts` — extract `#inline-tags` + frontmatter tags
- [x] `content/link-parser.ts` — parse `[[wikilinks]]`
- [x] DB CRUD: `db/notes.ts`, `db/tags.ts`, `db/links.ts`, `db/changelog.ts`
- [x] Indexer pipeline: scan → hash → parse → upsert → log changelog (incremental + full)
- [x] `kb index [--full]`, `kb index --status`
- [x] `kb history [file]` — show changelog for a file
- [x] `kb history --source <dir>` — filter by source directory
- [x] SQLite busy_timeout (5s) for concurrent writers
- [x] FTS5 auto-sync via triggers (insert/update/delete)
- [x] 99 tests passing, zero lint issues

## Phase 4 — Search + List (DONE)

- [x] FTS5 query builder (prefix matching, quoted phrases)
- [x] BM25 ranking with configurable boosts (title, tag, recency)
- [x] Filter builder (type, project, area, status, tag, date range)
- [x] Snippet extraction around match
- [x] Output formatter (compact, JSON, markdown)
- [x] Changelog metadata in search results (last change, source dir)
- [x] `kb search <query> [options]` — full-text search with filters
- [x] `kb ls [options]` — list notes with filters + sorting
- [x] `kb tags [tag-name]` — list tags or notes by tag
- [x] Auto-index on search/ls/tags (always fresh results)
- [x] 112 tests passing, zero lint issues

## Phase 5 — Link Resolution (DONE)

- [x] `resolve/link-resolver.ts` — exact path → title → alias → fuzzy path
- [x] `kb resolve "[[target]]"` — test resolution with strategy output
- [x] Case-insensitive resolution by default
- [x] 117 tests passing, zero lint issues

## Phase 6 — Config + Template Management (DONE)

- [x] `kb config [show|get|set|reset|validate]` — dot-notation get/set
- [x] `kb template [list|show|reset]`
- [x] 117 tests passing, zero lint issues

## Phase 7 — Doctor, Watch, Polish (DONE)

- [x] `kb doctor [--fix]` — 8 health checks (dir, config, db, git, files, frontmatter, naming, index sync)
- [x] `kb doctor --fix` — auto-init git, reindex orphaned entries
- [x] 117 tests passing, zero lint issues
- [ ] `kb index --watch` — file watcher (deferred to post-v1)
- [ ] Agent guide on `kb --help` (deferred to post-v1)

## Core Workflow Gaps (DONE)

- [x] `kb show <file|id>` — resolve by path, id, fuzzy match, or title
- [x] `kb update <file|id> [--status X] [--project X] [--area X]` — update frontmatter fields
- [x] `kb append <file|id> --content "..."` — append content to existing note
- [x] `kb today` — daily rollup grouped by project (sessions, tasks, decisions, activity summary)
- [x] `kb prime` — dynamic context block for AI agents (commands, state, active tasks, recent changes, workflow)
- [x] `kb add --stdin` — read content from stdin for large documents
- [x] `resolve/note-resolver.ts` — shared resolution by path, .md ext, id pattern, fuzzy, title
- [x] 117 tests passing, zero lint issues

## Git Context + Smart Prime (DONE)

- [x] `git/context.ts` — detect repo name (from git remote) and branch from any cwd, works with worktrees
- [x] Changelog now stores `source_repo` and `source_branch` on every entry
- [x] DB migration adds columns safely to existing DBs
- [x] `kb index` commits untracked/modified files (catches Obsidian/manual edits)
- [x] `kb prime` — project detection via git remote URL (not just dir name)
- [x] `kb prime` — time-bounded recency (default 2 days, `--days` flag)
- [x] `kb prime` — branch-aware: shows notes from current branch
- [x] `kb prime` — warns if project has no project note
- [x] `kb prime` — falls back to global view when no project detected

## Future (Post-v1)

- [ ] `kb upgrade` / `kb doctor --fix` migrations for existing KBs (add git, new tables, config fields)
- [ ] `kb index --watch` — file watcher for auto-indexing
- [ ] Agent guide on `kb --help`
- [ ] Vector embeddings for semantic search
- [ ] Multiple KB support (`--kb` flag)
- [ ] MCP server mode
- [ ] `kb import` from other formats
- [ ] Auto-archive old notes
- [ ] MOC auto-generation from tag clusters
- [ ] Complex query language (`type:task AND project:alpha`)
