export interface VaultConfig {
	path: string;
	created: string;
}

export interface ParserConfig {
	frontmatter_delimiter: string;
	tag_pattern: string;
	wikilink_pattern: string;
}

export interface IndexingConfig {
	excluded_patterns: string[];
	auto_index: boolean;
	watch_mode: boolean;
	hash_algorithm: string;
	parser: ParserConfig;
}

export interface TypeNamingConfig {
	pattern: string;
	date_format?: string;
	sequence_digits?: number;
	sequence_start?: number;
	id_source?: string;
	id_transform?: string;
	fallback_pattern?: string;
	fallback_id_source?: string;
	case?: string;
	slug_transform?: string;
}

export interface NamingConfig {
	default_pattern: string;
	id_separator: string;
	slug_transform: string;
	slug_max_length: number;
	types: Record<string, TypeNamingConfig>;
}

export interface SchemaDefinition {
	extends?: string;
	required: string[];
	optional: string[];
	enums: Record<string, string[]>;
	defaults: Record<string, string>;
	validators?: Record<string, string>;
}

export interface SchemasConfig {
	[type: string]: SchemaDefinition;
}

export interface TemplateTypeConfig {
	filename: string;
	content: string;
}

export interface TemplatesConfig {
	directory: string;
	default: string;
	types: Record<string, TemplateTypeConfig>;
}

export interface BoostsConfig {
	title_exact_match: number;
	title_contains: number;
	tag_match: number;
	recency: number;
}

export interface RankingConfig {
	bm25_k1: number;
	bm25_b: number;
	boosts: BoostsConfig;
}

export interface SearchConfig {
	engine: string;
	tokenize: string;
	default_limit: number;
	snippet_length: number;
	ranking: RankingConfig;
}

export interface LinkingConfig {
	resolution_order: string[];
	case_sensitive: boolean;
	create_missing: boolean;
	extensions: string[];
}

export interface EditorConfig {
	command: string;
	args: string[];
	env: Record<string, string>;
}

export interface OutputFormatConfig {
	template?: string;
	indent?: number;
	include_content?: boolean;
}

export interface OutputConfig {
	formats: Record<string, OutputFormatConfig>;
}

export interface AgentConfig {
	guide_template: string;
	show_guide_on_help: boolean;
}

export interface KBConfig {
	version: number;
	vault: VaultConfig;
	indexing: IndexingConfig;
	naming: NamingConfig;
	schemas: SchemasConfig;
	templates: TemplatesConfig;
	search: SearchConfig;
	linking: LinkingConfig;
	editor: EditorConfig;
	output: OutputConfig;
	agent: AgentConfig;
}

export type NoteType = "session" | "project" | "area" | "decision" | "task" | "MOC";

export interface NoteData {
	title: string;
	type: NoteType;
	slug?: string;
	date?: string;
	sequence?: number;
	id?: string;
	name?: string;
	project?: string;
	area?: string;
	status?: string;
	source?: string;
	url?: string;
	content?: string;
	[key: string]: string | number | undefined;
}

export interface CommandResult<T = unknown> {
	success: boolean;
	data?: T;
	errors?: string[];
}

export interface ValidationError {
	field: string;
	message: string;
	value?: unknown;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}
