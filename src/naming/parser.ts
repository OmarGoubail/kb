import type { NamingConfig } from "../config/types.js";

export interface ParsedFilename {
	type: string;
	slug: string;
	date?: string;
	sequence?: number;
	id?: string;
	extension: string;
}

/**
 * Parses a filename into its components based on the naming config.
 * Returns null if the filename doesn't match any known pattern.
 */
export function parseFilename(filename: string, config: NamingConfig): ParsedFilename | null {
	// Try each type's pattern
	for (const [typeName, typeConfig] of Object.entries(config.types)) {
		const result = tryPattern(filename, typeName, typeConfig.pattern);
		if (result) return result;

		// Also try fallback pattern if it exists
		if (typeConfig.fallback_pattern) {
			const fallback = tryPattern(filename, typeName, typeConfig.fallback_pattern);
			if (fallback) return fallback;
		}
	}

	// Try the default pattern
	const defaultResult = tryDefaultPattern(filename, config.default_pattern);
	if (defaultResult) return defaultResult;

	return null;
}

function tryPattern(filename: string, type: string, pattern: string): ParsedFilename | null {
	// Convert pattern to regex
	// e.g., "session-{date}-{sequence}-{slug}.md" → /^session-(.+)-(\d+)-(.+)\.md$/
	let regexStr = "^";
	const fields: string[] = [];

	let remaining = pattern;
	while (remaining.length > 0) {
		const braceStart = remaining.indexOf("{");
		if (braceStart === -1) {
			regexStr += escapeRegex(remaining);
			break;
		}

		// Add literal part before the brace
		regexStr += escapeRegex(remaining.slice(0, braceStart));

		const braceEnd = remaining.indexOf("}", braceStart);
		if (braceEnd === -1) break;

		const field = remaining.slice(braceStart + 1, braceEnd);
		fields.push(field);

		// Use appropriate regex for each field type
		if (field === "date") {
			regexStr += "(\\d{4}-\\d{2}-\\d{2})";
		} else if (field === "sequence") {
			regexStr += "(\\d+)";
		} else if (field === "id") {
			// Match IDs like JMP-123, ABC-45 (letter prefix + digits)
			regexStr += "([A-Za-z]+-\\d+)";
		} else if (field === "slug") {
			regexStr += "(.+?)";
		} else if (field === "type") {
			regexStr += "([a-zA-Z]+)";
		} else {
			regexStr += "(.+?)";
		}

		remaining = remaining.slice(braceEnd + 1);
	}

	regexStr += "$";

	const regex = new RegExp(regexStr);
	const match = filename.match(regex);
	if (!match) return null;

	const result: ParsedFilename = {
		type,
		slug: "",
		extension: ".md",
	};

	for (let i = 0; i < fields.length; i++) {
		const field = fields[i] ?? "";
		const value = match[i + 1] ?? "";

		switch (field) {
			case "slug":
				result.slug = value;
				break;
			case "date":
				result.date = value;
				break;
			case "sequence":
				result.sequence = Number.parseInt(value, 10);
				break;
			case "id":
				result.id = value;
				break;
			case "type":
				result.type = value;
				break;
		}
	}

	return result;
}

function tryDefaultPattern(filename: string, _pattern: string): ParsedFilename | null {
	// For default pattern "{type}-{slug}.md", extract type from the prefix
	const match = filename.match(/^([a-zA-Z]+)-(.+)\.md$/);
	if (!match) return null;

	return {
		type: match[1] ?? "",
		slug: match[2] ?? "",
		extension: ".md",
	};
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
