import type { Database } from "bun:sqlite";

/**
 * Syncs tags for a note. Clears existing tags and inserts new ones.
 */
export function syncTags(db: Database, noteId: number, tags: string[]): void {
	// Clear existing tags for this note
	db.prepare("DELETE FROM note_tags WHERE note_id = ?").run(noteId);

	if (tags.length === 0) return;

	const insertTag = db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
	const getTagId = db.prepare("SELECT id FROM tags WHERE name = ?");
	const insertNoteTag = db.prepare(
		"INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)",
	);

	for (const tag of tags) {
		insertTag.run(tag);
		const row = getTagId.get(tag) as { id: number } | null;
		if (row) {
			insertNoteTag.run(noteId, row.id);
		}
	}
}

/**
 * Get all tags with their note counts.
 */
export function getAllTags(db: Database): Array<{ name: string; count: number }> {
	return db
		.prepare(
			`SELECT t.name, COUNT(nt.note_id) as count
			 FROM tags t
			 JOIN note_tags nt ON t.id = nt.tag_id
			 GROUP BY t.id
			 ORDER BY count DESC, t.name ASC`,
		)
		.all() as Array<{ name: string; count: number }>;
}

/**
 * Get notes that have a specific tag.
 */
export function getNotesByTag(
	db: Database,
	tagName: string,
): Array<{ path: string; title: string; type: string | null }> {
	return db
		.prepare(
			`SELECT n.path, n.title, n.type
			 FROM notes n
			 JOIN note_tags nt ON n.id = nt.note_id
			 JOIN tags t ON nt.tag_id = t.id
			 WHERE t.name = ?
			 ORDER BY n.modified_at DESC`,
		)
		.all(tagName) as Array<{ path: string; title: string; type: string | null }>;
}
