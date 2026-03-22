import type { BoostsConfig } from "../config/types.js";

export interface RawSearchResult {
	id: number;
	path: string;
	title: string;
	content: string;
	type: string | null;
	project: string | null;
	area: string | null;
	status: string | null;
	created_at: string | null;
	modified_at: string | null;
	bm25_score: number;
}

export interface ScoredResult extends RawSearchResult {
	score: number;
	snippet: string;
	tags: string[];
}

/**
 * Applies configurable boosts to raw BM25 search results.
 */
export function applyBoosts(
	results: RawSearchResult[],
	query: string,
	boosts: BoostsConfig,
	noteTags: Map<number, string[]>,
): ScoredResult[] {
	const queryLower = query.toLowerCase();
	const queryTerms = queryLower.split(/\s+/);

	return results.map((result) => {
		let score = Math.abs(result.bm25_score);

		// Title exact match boost
		if (result.title.toLowerCase() === queryLower) {
			score += boosts.title_exact_match;
		}
		// Title contains boost
		else if (result.title.toLowerCase().includes(queryLower)) {
			score += boosts.title_contains;
		}

		// Tag match boost
		const tags = noteTags.get(result.id) ?? [];
		for (const term of queryTerms) {
			if (tags.includes(term)) {
				score += boosts.tag_match;
			}
		}

		// Recency boost (last 7 days)
		if (result.modified_at) {
			const modDate = new Date(result.modified_at);
			const now = new Date();
			const daysSince = (now.getTime() - modDate.getTime()) / (1000 * 60 * 60 * 24);
			if (daysSince < 7) {
				score += boosts.recency * (1 - daysSince / 7);
			}
		}

		const snippet = generateSnippet(result.content, queryTerms, 150);

		return { ...result, score, snippet, tags };
	});
}

/**
 * Extracts a relevant snippet around the first match.
 */
function generateSnippet(content: string, queryTerms: string[], maxLength: number): string {
	const contentLower = content.toLowerCase();

	// Find first occurrence of any query term
	let bestPos = -1;
	for (const term of queryTerms) {
		const pos = contentLower.indexOf(term);
		if (pos !== -1 && (bestPos === -1 || pos < bestPos)) {
			bestPos = pos;
		}
	}

	if (bestPos === -1) {
		// No match found, return beginning of content
		return content.slice(0, maxLength).trim().replace(/\n+/g, " ");
	}

	// Extract window around match
	const start = Math.max(0, bestPos - 40);
	const end = Math.min(content.length, start + maxLength);
	let snippet = content.slice(start, end).trim().replace(/\n+/g, " ");

	if (start > 0) snippet = `...${snippet}`;
	if (end < content.length) snippet = `${snippet}...`;

	return snippet;
}
