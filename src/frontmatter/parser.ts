import { parse as parseYaml } from "yaml";

export interface ParsedFrontmatter {
	data: Record<string, unknown>;
	body: string;
	raw: string;
}

export interface FrontmatterParseError {
	success: false;
	error: string;
}

export type FrontmatterParseResult =
	| ({ success: true } & ParsedFrontmatter)
	| FrontmatterParseError;

/**
 * Parses YAML frontmatter from a markdown string.
 * Expects content starting with --- delimiter.
 */
export function parseFrontmatter(content: string): FrontmatterParseResult {
	const trimmed = content.trimStart();

	if (!trimmed.startsWith("---")) {
		return {
			success: true,
			data: {},
			body: content,
			raw: "",
		};
	}

	// Find the closing --- delimiter
	const endIndex = trimmed.indexOf("\n---", 3);
	if (endIndex === -1) {
		return {
			success: false,
			error: "Frontmatter opening delimiter found but no closing delimiter",
		};
	}

	const raw = trimmed.slice(4, endIndex).trim();
	const body = trimmed.slice(endIndex + 4).replace(/^\n/, "");

	try {
		const data = parseYaml(raw);
		if (data === null || data === undefined) {
			return { success: true, data: {}, body, raw };
		}
		if (typeof data !== "object" || Array.isArray(data)) {
			return {
				success: false,
				error: "Frontmatter must be a YAML mapping, not a scalar or array",
			};
		}
		return {
			success: true,
			data: data as Record<string, unknown>,
			body,
			raw,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { success: false, error: `Invalid YAML: ${message}` };
	}
}
