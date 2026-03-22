import type { ScoredResult } from "../search/ranking.js";

export type OutputFormat = "compact" | "json" | "markdown";

/**
 * Formats search results for display.
 */
export function formatResults(results: ScoredResult[], format: OutputFormat): string {
	if (results.length === 0) {
		return "No results found.";
	}

	switch (format) {
		case "json":
			return formatJson(results);
		case "markdown":
			return formatMarkdown(results);
		default:
			return formatCompact(results);
	}
}

function formatCompact(results: ScoredResult[]): string {
	return results
		.map((r) => {
			const tags = r.tags.length > 0 ? ` [${r.tags.join(", ")}]` : "";
			return `${r.score.toFixed(2)} [${r.title}] ${r.path}${tags}\n   ${r.snippet}`;
		})
		.join("\n\n");
}

function formatJson(results: ScoredResult[]): string {
	const output = results.map((r) => ({
		path: r.path,
		title: r.title,
		score: Number.parseFloat(r.score.toFixed(4)),
		snippet: r.snippet,
		type: r.type,
		project: r.project,
		area: r.area,
		status: r.status,
		tags: r.tags,
		modified: r.modified_at,
	}));
	return JSON.stringify(output, null, 2);
}

function formatMarkdown(results: ScoredResult[]): string {
	return results
		.map((r) => {
			const tags = r.tags.map((t) => `#${t}`).join(" ");
			return `## ${r.score.toFixed(2)} - [${r.title}](${r.path})\nTags: ${tags || "none"}\n> ${r.snippet}`;
		})
		.join("\n\n");
}

/**
 * Formats a list of notes (for kb ls).
 */
export function formatNoteList(
	notes: Array<{
		path: string;
		title: string;
		type: string | null;
		project: string | null;
		status: string | null;
		modified_at: string | null;
	}>,
	format: OutputFormat,
): string {
	if (notes.length === 0) {
		return "No notes found.";
	}

	if (format === "json") {
		return JSON.stringify(notes, null, 2);
	}

	return notes
		.map((n) => {
			const meta = [n.type, n.project, n.status].filter(Boolean).join(" / ");
			return `${n.path}  (${meta})`;
		})
		.join("\n");
}
