import type { Database } from "bun:sqlite";

export function initializeSchema(db: Database): void {
	db.run("BEGIN TRANSACTION");

	try {
		db.run(`
			CREATE TABLE IF NOT EXISTS notes (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				path TEXT UNIQUE NOT NULL,
				title TEXT NOT NULL,
				content TEXT NOT NULL,
				type TEXT,
				project TEXT,
				area TEXT,
				status TEXT,
				created_at TEXT,
				modified_at TEXT,
				content_hash TEXT
			)
		`);

		db.run(`
			CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
				title,
				content,
				content='notes',
				content_rowid='id',
				tokenize='porter unicode61'
			)
		`);

		// Triggers to keep FTS index in sync
		db.run(`
			CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
				INSERT INTO notes_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
			END
		`);

		db.run(`
			CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
				INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
			END
		`);

		db.run(`
			CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
				INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
				INSERT INTO notes_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
			END
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS tags (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT UNIQUE NOT NULL
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS note_tags (
				note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
				tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
				PRIMARY KEY (note_id, tag_id)
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS links (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				source_note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
				target_title TEXT NOT NULL,
				target_note_id INTEGER REFERENCES notes(id),
				link_text TEXT,
				context TEXT
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS aliases (
				note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
				alias TEXT UNIQUE NOT NULL,
				PRIMARY KEY (note_id, alias)
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS changelog (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				note_path TEXT NOT NULL,
				action TEXT NOT NULL,
				timestamp TEXT NOT NULL,
				source_dir TEXT,
				agent TEXT,
				summary TEXT,
				content_hash TEXT,
				prev_hash TEXT
			)
		`);

		// Indexes
		db.run("CREATE INDEX IF NOT EXISTS idx_notes_path ON notes(path)");
		db.run("CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type)");
		db.run("CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project)");
		db.run("CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status)");
		db.run("CREATE INDEX IF NOT EXISTS idx_notes_modified ON notes(modified_at)");
		db.run("CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_note_id)");
		db.run("CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_note_id)");
		db.run("CREATE INDEX IF NOT EXISTS idx_aliases_alias ON aliases(alias)");
		db.run("CREATE INDEX IF NOT EXISTS idx_changelog_path ON changelog(note_path)");
		db.run("CREATE INDEX IF NOT EXISTS idx_changelog_timestamp ON changelog(timestamp)");
		db.run("CREATE INDEX IF NOT EXISTS idx_changelog_source ON changelog(source_dir)");

		db.run("COMMIT");
	} catch (err) {
		db.run("ROLLBACK");
		throw err;
	}
}
