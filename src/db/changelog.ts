import type { Database } from "bun:sqlite";

export interface ChangelogEntry {
	id: number;
	note_path: string;
	action: string;
	timestamp: string;
	source_dir: string | null;
	agent: string | null;
	summary: string | null;
	content_hash: string | null;
	prev_hash: string | null;
}

/**
 * Log a change to the changelog.
 */
export function logChange(db: Database, entry: Omit<ChangelogEntry, "id">): void {
	db.prepare(
		`INSERT INTO changelog (note_path, action, timestamp, source_dir, agent, summary, content_hash, prev_hash)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
	).run(
		entry.note_path,
		entry.action,
		entry.timestamp,
		entry.source_dir,
		entry.agent,
		entry.summary,
		entry.content_hash,
		entry.prev_hash,
	);
}

/**
 * Get changelog for a specific file.
 */
export function getFileHistory(db: Database, notePath: string): ChangelogEntry[] {
	return db
		.prepare("SELECT * FROM changelog WHERE note_path = ? ORDER BY timestamp DESC")
		.all(notePath) as ChangelogEntry[];
}

/**
 * Get changelog filtered by source directory.
 */
export function getHistoryBySource(db: Database, sourceDir: string): ChangelogEntry[] {
	return db
		.prepare("SELECT * FROM changelog WHERE source_dir = ? ORDER BY timestamp DESC")
		.all(sourceDir) as ChangelogEntry[];
}

/**
 * Get recent changelog entries.
 */
export function getRecentChanges(db: Database, limit: number): ChangelogEntry[] {
	return db
		.prepare("SELECT * FROM changelog ORDER BY timestamp DESC LIMIT ?")
		.all(limit) as ChangelogEntry[];
}
