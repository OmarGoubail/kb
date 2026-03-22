# Configuration

All behavior is driven by `.kb/config.json`, created by `kb init`.

## Key Sections

### `vault`

```json
{
  "vault": {
    "path": "~/Technocore",
    "created": "2026-03-22T00:00:00Z"
  }
}
```

### `naming`

Controls how filenames are generated per note type.

```json
{
  "naming": {
    "default_pattern": "{type}-{slug}.md",
    "slug_transform": "kebab-case",
    "slug_max_length": 50,
    "types": {
      "session": {
        "pattern": "session-{date}-{sequence}-{slug}.md",
        "sequence_digits": 3
      },
      "task": {
        "pattern": "task-{id}-{slug}.md",
        "fallback_pattern": "task-{date}-{slug}.md"
      }
    }
  }
}
```

### `schemas`

Defines required/optional frontmatter fields per note type, with enum validation and defaults.

```json
{
  "schemas": {
    "default": {
      "required": ["type", "status", "created"],
      "enums": {
        "type": ["session", "project", "area", "decision", "task", "MOC"],
        "status": ["active", "done", "archived", "blocked"]
      },
      "defaults": {
        "status": "active"
      }
    },
    "task": {
      "extends": "default",
      "required": ["type", "project", "area", "status", "created", "id", "name", "source"]
    }
  }
}
```

### `templates`

Mustache-style templates for each note type.

**Variables**: `{{type}}`, `{{title}}`, `{{slug}}`, `{{date}}`, `{{sequence}}`, `{{id}}`, `{{project}}`, `{{area}}`, `{{status}}`, `{{created}}`

**Conditionals**: `{{#url}}url: {{url}}{{/url}}` — included only when `url` is provided.

### `search`

FTS5 search configuration (BM25 parameters, boost weights, snippet length). Used by `kb search`.

### `linking`

Wikilink resolution strategy. Resolution order: exact path → title → alias → fuzzy.

### `editor`

Which editor to open for `kb config edit` and `kb template edit`.

## Global Config

Stored at `~/.config/kb/config.json`:

```json
{ "default_kb": "/path/to/your/kb" }
```

Override location with `KB_GLOBAL_CONFIG_DIR` env var.
