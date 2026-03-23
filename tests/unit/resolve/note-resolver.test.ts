import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCommand } from "../../../src/commands/init.js";
import { createDefaultConfig } from "../../../src/config/defaults.js";
import { getDbPath } from "../../../src/config/loader.js";
import { openDatabase } from "../../../src/db/connection.js";
import { initializeSchema } from "../../../src/db/migrations.js";
import { indexFiles } from "../../../src/indexer/pipeline.js";
import { scanFiles } from "../../../src/indexer/scanner.js";
import { resolveNote } from "../../../src/resolve/note-resolver.js";

describe("resolveNote", () => {
	let tempDir: string;
	let globalConfigDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "kb-test-"));
		globalConfigDir = mkdtempSync(join(tmpdir(), "kb-global-"));
		process.env.KB_GLOBAL_CONFIG_DIR = globalConfigDir;
		initCommand(tempDir);

		writeFileSync(
			join(tempDir, "project-acme.md"),
			"---\ntype: project\nstatus: active\ncreated: 2026-03-22\n---\n\n# Acme Backend\n",
		);
		writeFileSync(
			join(tempDir, "task-ACM-42-fix-login.md"),
			"---\ntype: task\nproject: acme\narea: auth\nstatus: active\ncreated: 2026-03-22\nid: ACM-42\nname: fix-login\nsource: linear\n---\n\n# Fix Login\n",
		);

		const db = openDatabase(getDbPath(tempDir));
		initializeSchema(db);
		const config = createDefaultConfig(tempDir);
		indexFiles(db, scanFiles(tempDir), config);
		db.close();
	});

	afterEach(() => {
		process.env.KB_GLOBAL_CONFIG_DIR = undefined;
		rmSync(tempDir, { recursive: true, force: true });
		rmSync(globalConfigDir, { recursive: true, force: true });
	});

	it("resolves by exact path", () => {
		const db = openDatabase(getDbPath(tempDir));
		const result = resolveNote(db, "project-acme.md");
		expect(result).not.toBeNull();
		expect(result?.path).toBe("project-acme.md");
		db.close();
	});

	it("resolves by path without .md", () => {
		const db = openDatabase(getDbPath(tempDir));
		const result = resolveNote(db, "project-acme");
		expect(result).not.toBeNull();
		expect(result?.path).toBe("project-acme.md");
		db.close();
	});

	it("resolves by task ID pattern", () => {
		const db = openDatabase(getDbPath(tempDir));
		const result = resolveNote(db, "ACM-42");
		expect(result).not.toBeNull();
		expect(result?.path).toBe("task-ACM-42-fix-login.md");
		db.close();
	});

	it("resolves by fuzzy match", () => {
		const db = openDatabase(getDbPath(tempDir));
		const result = resolveNote(db, "fix-login");
		expect(result).not.toBeNull();
		expect(result?.path).toBe("task-ACM-42-fix-login.md");
		db.close();
	});

	it("resolves by title", () => {
		const db = openDatabase(getDbPath(tempDir));
		const result = resolveNote(db, "Acme Backend");
		expect(result).not.toBeNull();
		expect(result?.path).toBe("project-acme.md");
		db.close();
	});

	it("returns null for non-existent note", () => {
		const db = openDatabase(getDbPath(tempDir));
		const result = resolveNote(db, "does-not-exist-anywhere");
		expect(result).toBeNull();
		db.close();
	});
});
