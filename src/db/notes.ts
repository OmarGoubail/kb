import type { Database } from "bun:sqlite";

export interface NoteRow {
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
	content_hash: string | null;
}

export function upsertNote(db: Database, note: Omit<NoteRow, "id">): number {
	const stmt = db.prepare(`
		INSERT INTO notes (path, title, content, type, project, area, status, created_at, modified_at, content_hash)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(path) DO UPDATE SET
			title = excluded.title,
			content = excluded.content,
			type = excluded.type,
			project = excluded.project,
			area = excluded.area,
			status = excluded.status,
			created_at = excluded.created_at,
			modified_at = excluded.modified_at,
			content_hash = excluded.content_hash
	`);

	stmt.run(
		note.path,
		note.title,
		note.content,
		note.type,
		note.project,
		note.area,
		note.status,
		note.created_at,
		note.modified_at,
		note.content_hash,
	);

	// Get the id (either new or existing)
	const row = db.prepare("SELECT id FROM notes WHERE path = ?").get(note.path) as {
		id: number;
	} | null;
	return row?.id ?? -1;
}

export function getNoteByPath(db: Database, path: string): NoteRow | null {
	return db.prepare("SELECT * FROM notes WHERE path = ?").get(path) as NoteRow | null;
}

export function getAllNotes(db: Database): NoteRow[] {
	return db.prepare("SELECT * FROM notes ORDER BY modified_at DESC").all() as NoteRow[];
}

export function deleteNote(db: Database, path: string): boolean {
	const result = db.prepare("DELETE FROM notes WHERE path = ?").run(path);
	return result.changes > 0;
}

export function getNoteCount(db: Database): number {
	const row = db.prepare("SELECT COUNT(*) as count FROM notes").get() as { count: number };
	return row.count;
}
