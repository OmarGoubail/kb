import type { Database } from "bun:sqlite";
import type { ParsedLink } from "../content/link-parser.js";

/**
 * Syncs links for a note. Clears existing links and inserts new ones.
 */
export function syncLinks(db: Database, noteId: number, links: ParsedLink[]): void {
	db.prepare("DELETE FROM links WHERE source_note_id = ?").run(noteId);

	if (links.length === 0) return;

	const insert = db.prepare(
		"INSERT INTO links (source_note_id, target_title, link_text, context) VALUES (?, ?, ?, ?)",
	);

	for (const link of links) {
		insert.run(noteId, link.target, link.displayText ?? null, link.context);
	}
}

/**
 * Get outgoing links from a note.
 */
export function getOutgoingLinks(
	db: Database,
	noteId: number,
): Array<{ target_title: string; target_note_id: number | null; context: string | null }> {
	return db
		.prepare("SELECT target_title, target_note_id, context FROM links WHERE source_note_id = ?")
		.all(noteId) as Array<{
		target_title: string;
		target_note_id: number | null;
		context: string | null;
	}>;
}

/**
 * Get backlinks (notes that link TO this note).
 */
export function getBacklinks(
	db: Database,
	noteId: number,
): Array<{ path: string; title: string; context: string | null }> {
	return db
		.prepare(
			`SELECT n.path, n.title, l.context
			 FROM links l
			 JOIN notes n ON l.source_note_id = n.id
			 WHERE l.target_note_id = ?
			 ORDER BY n.modified_at DESC`,
		)
		.all(noteId) as Array<{ path: string; title: string; context: string | null }>;
}
