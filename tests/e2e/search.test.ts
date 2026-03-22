import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCommand } from "../../src/commands/init.js";
import { createDefaultConfig } from "../../src/config/defaults.js";
import { getDbPath } from "../../src/config/loader.js";
import { openDatabase } from "../../src/db/connection.js";
import { initializeSchema } from "../../src/db/migrations.js";
import { getNoteCount } from "../../src/db/notes.js";
import { getAllTags } from "../../src/db/tags.js";
import { indexFiles } from "../../src/indexer/pipeline.js";
import { scanFiles } from "../../src/indexer/scanner.js";

describe("search e2e", () => {
	let tempDir: string;
	let globalConfigDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "kb-test-"));
		globalConfigDir = mkdtempSync(join(tmpdir(), "kb-global-"));
		process.env.KB_GLOBAL_CONFIG_DIR = globalConfigDir;
		initCommand(tempDir);

		// Write test files
		writeFileSync(
			join(tempDir, "project-alpha.md"),
			"---\ntype: project\nstatus: active\ncreated: 2026-03-22\ntags:\n  - backend\n---\n\n# Alpha Project\n\nThe alpha project handles #authentication.\n",
		);
		writeFileSync(
			join(tempDir, "task-JMP-1-fix-bug.md"),
			"---\ntype: task\nproject: alpha\narea: auth\nstatus: active\ncreated: 2026-03-22\nid: JMP-1\nname: fix-bug\nsource: linear\n---\n\n# Fix Auth Bug\n\nWorking on #authentication and #security.\nSee [[project-alpha]].\n",
		);
	});

	afterEach(() => {
		process.env.KB_GLOBAL_CONFIG_DIR = undefined;
		rmSync(tempDir, { recursive: true, force: true });
		rmSync(globalConfigDir, { recursive: true, force: true });
	});

	it("indexes and finds notes via FTS", () => {
		const db = openDatabase(getDbPath(tempDir));
		initializeSchema(db);
		const config = createDefaultConfig(tempDir);
		const files = scanFiles(tempDir);
		indexFiles(db, files, config);

		expect(getNoteCount(db)).toBe(2);

		// Search via FTS
		const results = db
			.prepare(
				"SELECT n.path, rank FROM notes_fts fts JOIN notes n ON fts.rowid = n.id WHERE notes_fts MATCH '\"authentication\"*' ORDER BY rank LIMIT 5",
			)
			.all() as Array<{ path: string; rank: number }>;

		expect(results.length).toBeGreaterThan(0);
		db.close();
	});

	it("extracts and indexes tags", () => {
		const db = openDatabase(getDbPath(tempDir));
		initializeSchema(db);
		const config = createDefaultConfig(tempDir);
		const files = scanFiles(tempDir);
		indexFiles(db, files, config);

		const tags = getAllTags(db);
		const tagNames = tags.map((t) => t.name);

		expect(tagNames).toContain("authentication");
		expect(tagNames).toContain("security");
		expect(tagNames).toContain("backend");
		db.close();
	});

	it("filters by type", () => {
		const db = openDatabase(getDbPath(tempDir));
		initializeSchema(db);
		const config = createDefaultConfig(tempDir);
		const files = scanFiles(tempDir);
		indexFiles(db, files, config);

		const tasks = db.prepare("SELECT * FROM notes WHERE type = ?").all("task") as Array<{
			path: string;
		}>;
		expect(tasks).toHaveLength(1);
		expect(tasks[0]?.path).toBe("task-JMP-1-fix-bug.md");
		db.close();
	});
});
