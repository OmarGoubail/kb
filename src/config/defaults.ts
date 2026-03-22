import type { KBConfig } from "./types.js";

export function createDefaultConfig(vaultPath: string): KBConfig {
	const now = new Date().toISOString();
	return {
		version: 1,
		vault: {
			path: vaultPath,
			created: now,
		},
		indexing: {
			excluded_patterns: [".git", "node_modules", "*.attachments", ".kb"],
			auto_index: true,
			watch_mode: false,
			hash_algorithm: "sha256",
			parser: {
				frontmatter_delimiter: "---",
				tag_pattern: "#([a-zA-Z0-9_-]+)",
				wikilink_pattern: "\\[\\[([^|\\]]+)(?:\\|([^\\]]+))?\\]\\]",
			},
		},
		naming: {
			default_pattern: "{type}-{slug}.md",
			id_separator: "-",
			slug_transform: "kebab-case",
			slug_max_length: 50,
			types: {
				session: {
					pattern: "session-{date}-{sequence}-{slug}.md",
					date_format: "YYYY-MM-DD",
					sequence_digits: 3,
					sequence_start: 1,
				},
				task: {
					pattern: "task-{id}-{slug}.md",
					id_source: "frontmatter.id",
					id_transform: "uppercase",
					fallback_pattern: "task-{date}-{slug}.md",
					fallback_id_source: "auto-increment",
				},
				project: {
					pattern: "project-{slug}.md",
				},
				area: {
					pattern: "area-{slug}.md",
				},
				decision: {
					pattern: "decision-{date}-{slug}.md",
					date_format: "YYYY-MM-DD",
				},
				MOC: {
					pattern: "MOC-{slug}.md",
					case: "upper",
					slug_transform: "kebab-case",
				},
			},
		},
		schemas: {
			default: {
				required: ["type", "status", "created"],
				optional: ["project", "area", "tags"],
				enums: {
					type: ["session", "project", "area", "decision", "task", "MOC"],
					status: ["active", "done", "archived", "blocked"],
				},
				defaults: {
					status: "active",
					created: "{{today}}",
				},
			},
			task: {
				extends: "default",
				required: ["type", "project", "area", "status", "created", "id", "name", "source"],
				optional: ["url", "priority", "due_date"],
				enums: {
					source: ["linear", "github", "notion", "personal"],
					priority: ["low", "medium", "high", "urgent"],
				},
				defaults: {
					source: "personal",
					priority: "medium",
				},
			},
			session: {
				extends: "default",
				required: ["type", "project", "area", "status", "created"],
				optional: ["summary", "next_steps"],
				enums: {},
				defaults: {},
			},
		},
		templates: {
			directory: ".kb/templates",
			default: "default.md",
			types: {
				default: {
					filename: "default.md",
					content: [
						"---",
						"type: {{type}}",
						"project: {{project}}",
						"area: {{area}}",
						"status: {{status}}",
						"created: {{created}}",
						"---",
						"",
						"# {{title}}",
						"",
						"",
					].join("\n"),
				},
				task: {
					filename: "task.md",
					content: [
						"---",
						"type: task",
						"project: {{project}}",
						"area: {{area}}",
						"status: {{status}}",
						"created: {{created}}",
						"id: {{id}}",
						"name: {{name}}",
						"source: {{source}}",
						"{{#url}}url: {{url}}",
						"{{/url}}---",
						"",
						"# Task: {{title}} ({{id}})",
						"",
						"## Context",
						"",
						"## Implementation",
						"",
						"## Done Criteria",
						"- [ ] ",
						"",
					].join("\n"),
				},
				session: {
					filename: "session.md",
					content: [
						"---",
						"type: session",
						"project: {{project}}",
						"area: {{area}}",
						"status: {{status}}",
						"created: {{created}}",
						"---",
						"",
						"# Session {{sequence}}: {{title}}",
						"",
						"## Work Done",
						"",
						"## Decisions",
						"",
						"## Links",
						"",
						"",
					].join("\n"),
				},
				MOC: {
					filename: "MOC.md",
					content: [
						"---",
						"type: MOC",
						"status: {{status}}",
						"created: {{created}}",
						"---",
						"",
						"# MOC: {{title}}",
						"",
						"## Index",
						"",
						"",
					].join("\n"),
				},
			},
		},
		search: {
			engine: "fts5",
			tokenize: "porter unicode61",
			default_limit: 10,
			snippet_length: 150,
			ranking: {
				bm25_k1: 1.2,
				bm25_b: 0.75,
				boosts: {
					title_exact_match: 0.3,
					title_contains: 0.15,
					tag_match: 0.1,
					recency: 0.05,
				},
			},
		},
		linking: {
			resolution_order: ["exact_path", "title", "alias", "fuzzy_path"],
			case_sensitive: false,
			create_missing: false,
			extensions: [".md"],
		},
		editor: {
			command: "nvim",
			args: ["+normal G$"],
			env: {},
		},
		output: {
			formats: {
				compact: {
					template: "{score:.2f} [{title}] {path}\n   {snippet}\n",
				},
				json: {
					indent: 2,
					include_content: false,
				},
				markdown: {
					template: "## {score:.2f} - [{title}]({path})\nTags: {tags}\n> {snippet}\n\n",
				},
			},
		},
		agent: {
			guide_template: ".kb/templates/agent-guide.md",
			show_guide_on_help: true,
		},
	};
}
