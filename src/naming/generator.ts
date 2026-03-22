import type { NamingConfig, NoteData } from "../config/types.js";
import { toSlug } from "./slug.js";

export interface GenerateResult {
	filename: string;
	vars: Record<string, string | number>;
}

export function generateFilename(
	data: NoteData,
	config: NamingConfig,
	existingFiles?: string[],
): GenerateResult {
	const typeConfig = config.types[data.type];
	let pattern = typeConfig?.pattern ?? config.default_pattern;

	// If type requires an id but none provided, use fallback pattern
	if (pattern.includes("{id}") && !data.id && typeConfig?.fallback_pattern) {
		pattern = typeConfig.fallback_pattern;
	}

	const slugTransform = typeConfig?.slug_transform ?? config.slug_transform;
	const slug = data.slug ?? toSlug(data.title, slugTransform, config.slug_max_length);

	const today = data.date ?? formatDate(new Date());
	const sequence = data.sequence ?? computeSequence(data, today, config, existingFiles ?? []);

	const vars: Record<string, string | number> = {
		type: data.type,
		slug,
		date: today,
		sequence,
		id: data.id ?? "",
		name: data.name ?? slug,
		title: data.title,
	};

	const filenameVars: Record<string, string> = {
		...vars,
		sequence: padSequence(sequence, typeConfig?.sequence_digits ?? 3),
	} as Record<string, string>;

	let filename = pattern;
	for (const [key, value] of Object.entries(filenameVars)) {
		filename = filename.replace(new RegExp(`\\{${key}\\}`, "g"), value);
	}

	return { filename, vars };
}

function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function padSequence(seq: number, digits: number): string {
	return String(seq).padStart(digits, "0");
}

function computeSequence(
	data: NoteData,
	date: string,
	config: NamingConfig,
	existingFiles: string[],
): number {
	const typeConfig = config.types[data.type];
	const start = typeConfig?.sequence_start ?? 1;

	// Find existing files matching the type and date pattern
	const prefix = `${data.type}-${date}-`;
	const matching = existingFiles.filter((f) => f.startsWith(prefix));

	if (matching.length === 0) return start;

	// Extract sequence numbers from matching files
	const sequences = matching
		.map((f) => {
			const afterPrefix = f.slice(prefix.length);
			const seqMatch = afterPrefix.match(/^(\d+)/);
			return seqMatch ? Number.parseInt(seqMatch[1], 10) : 0;
		})
		.filter((n) => !Number.isNaN(n));

	if (sequences.length === 0) return start;

	return Math.max(...sequences) + 1;
}

export function getCurrentDate(): string {
	return formatDate(new Date());
}
