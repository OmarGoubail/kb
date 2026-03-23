import type { Database } from "bun:sqlite";

export interface ChangelogEntry {
	id: number;
	note_path: string;
	action: string;
	timestamp: string;
	source_dir: string | null;
	source_repo: string | null;
	source_branch: string | null;
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
		`INSERT INTO changelog (note_path, action, timestamp, source_dir, source_repo, source_branch, agent, summary, content_hash, prev_hash)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	).run(
		entry.note_path,
		entry.action,
		entry.timestamp,
		entry.source_dir,
		entry.source_repo,
		entry.source_branch,
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
 * Get changelog filtered by source repo.
 */
export function getHistoryByRepo(db: Database, repo: string): ChangelogEntry[] {
	return db
		.prepare("SELECT * FROM changelog WHERE source_repo = ? ORDER BY timestamp DESC")
		.all(repo) as ChangelogEntry[];
}

/**
 * Get changelog filtered by branch.
 */
export function getHistoryByBranch(db: Database, branch: string): ChangelogEntry[] {
	return db
		.prepare("SELECT * FROM changelog WHERE source_branch = ? ORDER BY timestamp DESC")
		.all(branch) as ChangelogEntry[];
}

/**
 * Get recent changelog entries.
 */
export function getRecentChanges(db: Database, limit: number): ChangelogEntry[] {
	return db
		.prepare("SELECT * FROM changelog ORDER BY timestamp DESC LIMIT ?")
		.all(limit) as ChangelogEntry[];
}
