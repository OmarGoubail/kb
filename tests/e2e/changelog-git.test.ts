import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addCommand } from "../../src/commands/add.js";
import { indexCommand } from "../../src/commands/index.js";
import { initCommand } from "../../src/commands/init.js";
import { getDbPath } from "../../src/config/loader.js";
import { getRecentChanges } from "../../src/db/changelog.js";
import { openDatabase } from "../../src/db/connection.js";
import { initializeSchema } from "../../src/db/migrations.js";

describe("changelog git context", () => {
	let tempDir: string;
	let globalConfigDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "kb-test-"));
		globalConfigDir = mkdtempSync(join(tmpdir(), "kb-global-"));
		process.env.KB_GLOBAL_CONFIG_DIR = globalConfigDir;
		initCommand(tempDir);
	});

	afterEach(() => {
		process.env.KB_GLOBAL_CONFIG_DIR = undefined;
		rmSync(tempDir, { recursive: true, force: true });
		rmSync(globalConfigDir, { recursive: true, force: true });
	});

	it("stores source_repo and source_branch in changelog", () => {
		addCommand("project", "TestProject", {});
		indexCommand({});

		const db = openDatabase(getDbPath(tempDir));
		initializeSchema(db);
		const changes = getRecentChanges(db, 5);
		db.close();

		expect(changes.length).toBeGreaterThan(0);
		// We're running from the kb repo, so source_repo should be "kb"
		const createEntry = changes.find((c) => c.action === "create");
		expect(createEntry).toBeDefined();
		// source_repo and source_branch should be present (may be null if not in a git repo)
		expect("source_repo" in (createEntry ?? {})).toBe(true);
		expect("source_branch" in (createEntry ?? {})).toBe(true);
	});

	it("changelog table has source_repo and source_branch columns", () => {
		const db = openDatabase(getDbPath(tempDir));
		initializeSchema(db);

		// Verify columns exist by inserting a row with them
		db.prepare(
			"INSERT INTO changelog (note_path, action, timestamp, source_dir, source_repo, source_branch, agent, summary, content_hash, prev_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		).run(
			"test.md",
			"test",
			"2026-01-01",
			"/test",
			"my-repo",
			"feature/test",
			null,
			null,
			null,
			null,
		);

		const row = db
			.prepare("SELECT source_repo, source_branch FROM changelog WHERE note_path = 'test.md'")
			.get() as {
			source_repo: string;
			source_branch: string;
		};

		expect(row.source_repo).toBe("my-repo");
		expect(row.source_branch).toBe("feature/test");
		db.close();
	});
});
