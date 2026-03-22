import { z } from "zod";

const parserConfigSchema = z.object({
	frontmatter_delimiter: z.string().default("---"),
	tag_pattern: z.string().default("#([a-zA-Z0-9_-]+)"),
	wikilink_pattern: z.string().default("\\[\\[([^|\\]]+)(?:\\|([^\\]]+))?\\]\\]"),
});

const indexingConfigSchema = z.object({
	excluded_patterns: z.array(z.string()).default([".git", "node_modules", ".kb"]),
	auto_index: z.boolean().default(true),
	watch_mode: z.boolean().default(false),
	hash_algorithm: z.string().default("sha256"),
	parser: parserConfigSchema.default({}),
});

const typeNamingConfigSchema = z.object({
	pattern: z.string(),
	date_format: z.string().optional(),
	sequence_digits: z.number().int().positive().optional(),
	sequence_start: z.number().int().nonnegative().optional(),
	id_source: z.string().optional(),
	id_transform: z.string().optional(),
	fallback_pattern: z.string().optional(),
	fallback_id_source: z.string().optional(),
	case: z.string().optional(),
	slug_transform: z.string().optional(),
});

const namingConfigSchema = z.object({
	default_pattern: z.string().default("{type}-{slug}.md"),
	id_separator: z.string().default("-"),
	slug_transform: z.enum(["kebab-case", "snake_case", "camelCase"]).default("kebab-case"),
	slug_max_length: z.number().int().positive().default(50),
	types: z.record(z.string(), typeNamingConfigSchema).default({}),
});

const schemaDefinitionSchema = z.object({
	extends: z.string().optional(),
	required: z.array(z.string()).default([]),
	optional: z.array(z.string()).default([]),
	enums: z.record(z.string(), z.array(z.string())).default({}),
	defaults: z.record(z.string(), z.string()).default({}),
	validators: z.record(z.string(), z.string()).optional(),
});

const templateTypeConfigSchema = z.object({
	filename: z.string(),
	content: z.string(),
});

const templatesConfigSchema = z.object({
	directory: z.string().default(".kb/templates"),
	default: z.string().default("default.md"),
	types: z.record(z.string(), templateTypeConfigSchema).default({}),
});

const boostsConfigSchema = z.object({
	title_exact_match: z.number().default(0.3),
	title_contains: z.number().default(0.15),
	tag_match: z.number().default(0.1),
	recency: z.number().default(0.05),
});

const rankingConfigSchema = z.object({
	bm25_k1: z.number().default(1.2),
	bm25_b: z.number().default(0.75),
	boosts: boostsConfigSchema.default({}),
});

const searchConfigSchema = z.object({
	engine: z.string().default("fts5"),
	tokenize: z.string().default("porter unicode61"),
	default_limit: z.number().int().positive().default(10),
	snippet_length: z.number().int().positive().default(150),
	ranking: rankingConfigSchema.default({}),
});

const linkingConfigSchema = z.object({
	resolution_order: z
		.array(z.enum(["exact_path", "title", "alias", "fuzzy_path"]))
		.default(["exact_path", "title", "alias", "fuzzy_path"]),
	case_sensitive: z.boolean().default(false),
	create_missing: z.boolean().default(false),
	extensions: z.array(z.string()).default([".md"]),
});

const editorConfigSchema = z.object({
	command: z.string().default("nvim"),
	args: z.array(z.string()).default([]),
	env: z.record(z.string(), z.string()).default({}),
});

const outputFormatConfigSchema = z.object({
	template: z.string().optional(),
	indent: z.number().int().optional(),
	include_content: z.boolean().optional(),
});

const outputConfigSchema = z.object({
	formats: z.record(z.string(), outputFormatConfigSchema).default({}),
});

const agentConfigSchema = z.object({
	guide_template: z.string().default(".kb/templates/agent-guide.md"),
	show_guide_on_help: z.boolean().default(true),
});

export const kbConfigSchema = z.object({
	version: z.number().int().positive(),
	vault: z.object({
		path: z.string(),
		created: z.string(),
	}),
	indexing: indexingConfigSchema.default({}),
	naming: namingConfigSchema.default({}),
	schemas: z.record(z.string(), schemaDefinitionSchema).default({}),
	templates: templatesConfigSchema.default({}),
	search: searchConfigSchema.default({}),
	linking: linkingConfigSchema.default({}),
	editor: editorConfigSchema.default({}),
	output: outputConfigSchema.default({}),
	agent: agentConfigSchema.default({}),
});

export type KBConfigInput = z.input<typeof kbConfigSchema>;
