import type { Database } from "bun:sqlite";
import type { LinkingConfig } from "../config/types.js";

export interface ResolvedLink {
	target: string;
	resolvedPath: string | null;
	strategy: "exact_path" | "title" | "alias" | "fuzzy_path" | "none";
}

/**
 * Resolves a [[wikilink]] target to a file path using the configured resolution order.
 */
export function resolveLink(target: string, db: Database, config: LinkingConfig): ResolvedLink {
	const normalizedTarget = config.case_sensitive ? target : target.toLowerCase();

	for (const strategy of config.resolution_order) {
		let resolvedPath: string | null = null;

		switch (strategy) {
			case "exact_path":
				resolvedPath = resolveExactPath(normalizedTarget, db, config);
				break;
			case "title":
				resolvedPath = resolveByTitle(normalizedTarget, db, config);
				break;
			case "alias":
				resolvedPath = resolveByAlias(normalizedTarget, db, config);
				break;
			case "fuzzy_path":
				resolvedPath = resolveFuzzyPath(normalizedTarget, db, config);
				break;
		}

		if (resolvedPath) {
			return { target, resolvedPath, strategy: strategy as ResolvedLink["strategy"] };
		}
	}

	return { target, resolvedPath: null, strategy: "none" };
}

function resolveExactPath(target: string, db: Database, config: LinkingConfig): string | null {
	// Try with each configured extension
	for (const ext of config.extensions) {
		const path = target.endsWith(ext) ? target : `${target}${ext}`;
		const query = config.case_sensitive
			? "SELECT path FROM notes WHERE path = ?"
			: "SELECT path FROM notes WHERE LOWER(path) = LOWER(?)";
		const row = db.prepare(query).get(path) as { path: string } | null;
		if (row) return row.path;
	}
	return null;
}

function resolveByTitle(target: string, db: Database, config: LinkingConfig): string | null {
	const query = config.case_sensitive
		? "SELECT path FROM notes WHERE title = ?"
		: "SELECT path FROM notes WHERE LOWER(title) = LOWER(?)";
	const row = db.prepare(query).get(target) as { path: string } | null;
	return row?.path ?? null;
}

function resolveByAlias(target: string, db: Database, config: LinkingConfig): string | null {
	const query = config.case_sensitive
		? "SELECT n.path FROM aliases a JOIN notes n ON a.note_id = n.id WHERE a.alias = ?"
		: "SELECT n.path FROM aliases a JOIN notes n ON a.note_id = n.id WHERE LOWER(a.alias) = LOWER(?)";
	const row = db.prepare(query).get(target) as { path: string } | null;
	return row?.path ?? null;
}

function resolveFuzzyPath(target: string, db: Database, config: LinkingConfig): string | null {
	const query = config.case_sensitive
		? "SELECT path FROM notes WHERE path LIKE ? ORDER BY LENGTH(path) ASC LIMIT 1"
		: "SELECT path FROM notes WHERE LOWER(path) LIKE LOWER(?) ORDER BY LENGTH(path) ASC LIMIT 1";
	const pattern = `%${target}%`;
	const row = db.prepare(query).get(pattern) as { path: string } | null;
	return row?.path ?? null;
}
