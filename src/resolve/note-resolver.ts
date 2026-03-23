import type { Database } from "bun:sqlite";

export interface ResolvedNote {
	id: number;
	path: string;
	title: string;
}

/**
 * Resolves a user-provided identifier to a note.
 * Tries in order: exact path, path with .md, id field match, fuzzy path match.
 */
export function resolveNote(db: Database, identifier: string): ResolvedNote | null {
	// 1. Exact path match
	const exact = db
		.prepare("SELECT id, path, title FROM notes WHERE path = ?")
		.get(identifier) as ResolvedNote | null;
	if (exact) return exact;

	// 2. Path with .md extension
	if (!identifier.endsWith(".md")) {
		const withExt = db
			.prepare("SELECT id, path, title FROM notes WHERE path = ?")
			.get(`${identifier}.md`) as ResolvedNote | null;
		if (withExt) return withExt;
	}

	// 3. Match by external id (e.g., "PAY-1" matches task with id: PAY-1)
	const byContent = db
		.prepare("SELECT id, path, title FROM notes WHERE path LIKE ?")
		.get(`%-${identifier}-%`) as ResolvedNote | null;
	if (byContent) return byContent;

	// 4. Fuzzy path match (contains)
	const fuzzy = db
		.prepare(
			"SELECT id, path, title FROM notes WHERE LOWER(path) LIKE LOWER(?) ORDER BY LENGTH(path) ASC LIMIT 1",
		)
		.get(`%${identifier}%`) as ResolvedNote | null;
	if (fuzzy) return fuzzy;

	// 5. Title match
	const byTitle = db
		.prepare("SELECT id, path, title FROM notes WHERE LOWER(title) = LOWER(?) LIMIT 1")
		.get(identifier) as ResolvedNote | null;
	if (byTitle) return byTitle;

	return null;
}
