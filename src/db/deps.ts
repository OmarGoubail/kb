import type { Database } from "bun:sqlite";

export interface Dependency {
	source_path: string;
	target_path: string;
	rel_type: "depends_on" | "blocks";
}

/**
 * Sync dependencies for a note. Clears existing and inserts new ones.
 * deps come from frontmatter: depends_on and blocks arrays.
 */
export function syncDeps(
	db: Database,
	notePath: string,
	dependsOn: string[],
	blocks: string[],
): void {
	db.prepare("DELETE FROM deps WHERE source_path = ?").run(notePath);

	const insert = db.prepare(
		"INSERT OR IGNORE INTO deps (source_path, target_path, rel_type) VALUES (?, ?, ?)",
	);

	for (const target of dependsOn) {
		const resolved = resolveDepTarget(db, target);
		insert.run(notePath, resolved, "depends_on");
	}

	for (const target of blocks) {
		const resolved = resolveDepTarget(db, target);
		insert.run(notePath, resolved, "blocks");
	}
}

/**
 * Get what a note depends on.
 */
export function getDependsOn(
	db: Database,
	notePath: string,
): Array<{ target_path: string; target_status: string | null }> {
	return db
		.prepare(
			`SELECT d.target_path, n.status as target_status
			 FROM deps d
			 LEFT JOIN notes n ON d.target_path = n.path
			 WHERE d.source_path = ? AND d.rel_type = 'depends_on'`,
		)
		.all(notePath) as Array<{ target_path: string; target_status: string | null }>;
}

/**
 * Get what this note blocks.
 */
export function getBlocks(
	db: Database,
	notePath: string,
): Array<{ target_path: string; target_status: string | null }> {
	return db
		.prepare(
			`SELECT d.target_path, n.status as target_status
			 FROM deps d
			 LEFT JOIN notes n ON d.target_path = n.path
			 WHERE d.source_path = ? AND d.rel_type = 'blocks'`,
		)
		.all(notePath) as Array<{ target_path: string; target_status: string | null }>;
}

/**
 * Get what's blocking a note (reverse lookup — notes that list this note in their blocks, or this note's depends_on).
 */
export function getBlockedBy(
	db: Database,
	notePath: string,
): Array<{ source_path: string; source_status: string | null }> {
	return db
		.prepare(
			`SELECT d.source_path, n.status as source_status
			 FROM deps d
			 LEFT JOIN notes n ON d.source_path = n.path
			 WHERE d.target_path = ? AND d.rel_type = 'blocks'
			 UNION
			 SELECT d.target_path as source_path, n.status as source_status
			 FROM deps d
			 LEFT JOIN notes n ON d.target_path = n.path
			 WHERE d.source_path = ? AND d.rel_type = 'depends_on'`,
		)
		.all(notePath, notePath) as Array<{ source_path: string; source_status: string | null }>;
}

/**
 * Get all ready notes — active notes (any type) where all depends_on targets are done.
 */
export function getReadyTasks(
	db: Database,
	project?: string,
): Array<{ path: string; title: string; type: string | null; project: string | null }> {
	const projectFilter = project ? "AND n.project = ?" : "";
	const params: unknown[] = project ? [project] : [];

	return db
		.prepare(
			`SELECT n.path, n.title, n.type, n.project
			 FROM notes n
			 WHERE n.status = 'active'
			   ${projectFilter}
			   AND NOT EXISTS (
			     SELECT 1 FROM deps d
			     LEFT JOIN notes dep ON d.target_path = dep.path
			     WHERE d.source_path = n.path
			       AND d.rel_type = 'depends_on'
			       AND (dep.status IS NULL OR dep.status != 'done')
			   )
			 ORDER BY n.type, n.modified_at DESC`,
		)
		.all(...params) as Array<{ path: string; title: string; type: string | null; project: string | null }>;
}

/**
 * Get all blocked tasks — active tasks where at least one depends_on is not done.
 */
export function getBlockedTasks(
	db: Database,
	project?: string,
): Array<{
	path: string;
	title: string;
	project: string | null;
	blockers: Array<{ path: string; status: string | null }>;
}> {
	const projectFilter = project ? "AND n.project = ?" : "";
	const params: unknown[] = project ? [project] : [];

	const tasks = db
		.prepare(
			`SELECT DISTINCT n.path, n.title, n.project
			 FROM notes n
			 JOIN deps d ON d.source_path = n.path AND d.rel_type = 'depends_on'
			 LEFT JOIN notes dep ON d.target_path = dep.path
			 WHERE n.type = 'task'
			   AND n.status IN ('active', 'blocked')
			   ${projectFilter}
			   AND (dep.status IS NULL OR dep.status != 'done')
			 ORDER BY n.modified_at DESC`,
		)
		.all(...params) as Array<{ path: string; title: string; project: string | null }>;

	return tasks.map((task) => {
		const blockers = db
			.prepare(
				`SELECT d.target_path as path, dep.status
				 FROM deps d
				 LEFT JOIN notes dep ON d.target_path = dep.path
				 WHERE d.source_path = ? AND d.rel_type = 'depends_on'
				   AND (dep.status IS NULL OR dep.status != 'done')`,
			)
			.all(task.path) as Array<{ path: string; status: string | null }>;

		return { ...task, blockers };
	});
}

/**
 * Resolve a dependency target — could be a full path, path without .md, or a fuzzy match.
 */
function resolveDepTarget(db: Database, target: string): string {
	// Try exact
	const exact = db.prepare("SELECT path FROM notes WHERE path = ?").get(target) as {
		path: string;
	} | null;
	if (exact) return exact.path;

	// Try with .md
	if (!target.endsWith(".md")) {
		const withExt = db.prepare("SELECT path FROM notes WHERE path = ?").get(`${target}.md`) as {
			path: string;
		} | null;
		if (withExt) return withExt.path;
	}

	// Try fuzzy
	const fuzzy = db
		.prepare("SELECT path FROM notes WHERE LOWER(path) LIKE LOWER(?) ORDER BY LENGTH(path) LIMIT 1")
		.get(`%${target}%`) as { path: string } | null;
	if (fuzzy) return fuzzy.path;

	// Return as-is (dangling reference — doctor will catch it)
	return target.endsWith(".md") ? target : `${target}.md`;
}
