import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCommand } from "../../src/commands/init.js";
import { createDefaultConfig } from "../../src/config/defaults.js";
import { getDbPath } from "../../src/config/loader.js";
import { openDatabase } from "../../src/db/connection.js";
import { initializeSchema } from "../../src/db/migrations.js";
import { indexFiles } from "../../src/indexer/pipeline.js";
import { scanFiles } from "../../src/indexer/scanner.js";
import { resolveLink } from "../../src/resolve/link-resolver.js";

describe("link resolution", () => {
	let tempDir: string;
	let globalConfigDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "kb-test-"));
		globalConfigDir = mkdtempSync(join(tmpdir(), "kb-global-"));
		process.env.KB_GLOBAL_CONFIG_DIR = globalConfigDir;
		initCommand(tempDir);

		writeFileSync(
			join(tempDir, "project-alpha.md"),
			"---\ntype: project\nstatus: active\ncreated: 2026-03-22\n---\n\n# Alpha Project\n",
		);
		writeFileSync(
			join(tempDir, "task-JMP-1-fix-bug.md"),
			"---\ntype: task\nproject: alpha\narea: auth\nstatus: active\ncreated: 2026-03-22\nid: JMP-1\nname: fix-bug\nsource: linear\n---\n\n# Fix Auth Bug\n",
		);
	});

	afterEach(() => {
		process.env.KB_GLOBAL_CONFIG_DIR = undefined;
		rmSync(tempDir, { recursive: true, force: true });
		rmSync(globalConfigDir, { recursive: true, force: true });
	});

	function setupDb() {
		const db = openDatabase(getDbPath(tempDir));
		initializeSchema(db);
		const config = createDefaultConfig(tempDir);
		const files = scanFiles(tempDir);
		indexFiles(db, files, config);
		return { db, config };
	}

	it("resolves by exact path", () => {
		const { db, config } = setupDb();
		const result = resolveLink("project-alpha", db, config.linking);
		expect(result.resolvedPath).toBe("project-alpha.md");
		expect(result.strategy).toBe("exact_path");
		db.close();
	});

	it("resolves by title", () => {
		const { db, config } = setupDb();
		const result = resolveLink("Alpha Project", db, config.linking);
		expect(result.resolvedPath).toBe("project-alpha.md");
		expect(result.strategy).toBe("title");
		db.close();
	});

	it("resolves by fuzzy path", () => {
		const { db, config } = setupDb();
		const result = resolveLink("JMP-1", db, config.linking);
		expect(result.resolvedPath).toBe("task-JMP-1-fix-bug.md");
		expect(result.strategy).toBe("fuzzy_path");
		db.close();
	});

	it("resolves case-insensitively", () => {
		const { db, config } = setupDb();
		const result = resolveLink("ALPHA PROJECT", db, config.linking);
		expect(result.resolvedPath).toBe("project-alpha.md");
		db.close();
	});

	it("returns none for non-existent target", () => {
		const { db, config } = setupDb();
		const result = resolveLink("nonexistent-thing", db, config.linking);
		expect(result.resolvedPath).toBeNull();
		expect(result.strategy).toBe("none");
		db.close();
	});
});
