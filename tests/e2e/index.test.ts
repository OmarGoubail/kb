import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addCommand } from "../../src/commands/add.js";
import { indexCommand } from "../../src/commands/index.js";
import { initCommand } from "../../src/commands/init.js";
import { getDbPath } from "../../src/config/loader.js";
import { getFileHistory, getRecentChanges } from "../../src/db/changelog.js";
import { openDatabase } from "../../src/db/connection.js";
import { getNoteByPath, getNoteCount } from "../../src/db/notes.js";
import { getAllTags } from "../../src/db/tags.js";

describe("kb index", () => {
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

	it("indexes notes created by kb add", () => {
		addCommand("project", "Alpha", {});
		addCommand("task", "Fix Bug", {
			project: "alpha",
			area: "auth",
			id: "JMP-1",
			source: "linear",
		});
		indexCommand({});

		const db = openDatabase(getDbPath(tempDir));
		expect(getNoteCount(db)).toBe(2);

		const note = getNoteByPath(db, "project-alpha.md");
		expect(note).not.toBeNull();
		expect(note?.type).toBe("project");
		expect(note?.title).toBe("Alpha");
		db.close();
	});

	it("extracts tags from content", () => {
		writeFileSync(
			join(tempDir, "project-tagged.md"),
			"---\ntype: project\nstatus: active\ncreated: 2026-03-22\ntags:\n  - frontmatter-tag\n---\n\n# Tagged\n\nContent with #inline-tag and #another.\n",
		);
		indexCommand({});

		const db = openDatabase(getDbPath(tempDir));
		const tags = getAllTags(db);
		const tagNames = tags.map((t) => t.name);
		expect(tagNames).toContain("inline-tag");
		expect(tagNames).toContain("another");
		expect(tagNames).toContain("frontmatter-tag");
		db.close();
	});

	it("handles incremental indexing (skips unchanged)", () => {
		addCommand("project", "Alpha", {});
		indexCommand({});

		// Second index should find nothing new
		const db = openDatabase(getDbPath(tempDir));
		const countBefore = getNoteCount(db);
		db.close();

		indexCommand({});

		const db2 = openDatabase(getDbPath(tempDir));
		expect(getNoteCount(db2)).toBe(countBefore);
		db2.close();
	});

	it("detects deleted files", () => {
		addCommand("project", "ToDelete", {});
		indexCommand({});

		// Delete the file
		const { unlinkSync } = require("node:fs");
		unlinkSync(join(tempDir, "project-todelete.md"));

		indexCommand({});

		const db = openDatabase(getDbPath(tempDir));
		expect(getNoteByPath(db, "project-todelete.md")).toBeNull();
		db.close();
	});

	it("logs changes to changelog", () => {
		addCommand("project", "Alpha", {});
		indexCommand({});

		const db = openDatabase(getDbPath(tempDir));
		const changes = getRecentChanges(db, 10);
		expect(changes.length).toBeGreaterThan(0);

		const createEntry = changes.find(
			(c) => c.note_path === "project-alpha.md" && c.action === "create",
		);
		expect(createEntry).not.toBeUndefined();
		expect(createEntry?.source_dir).toBeTruthy();
		db.close();
	});

	it("tracks file history", () => {
		addCommand("project", "Alpha", {});
		indexCommand({});

		// Modify the file
		writeFileSync(
			join(tempDir, "project-alpha.md"),
			"---\ntype: project\nstatus: active\ncreated: 2026-03-22\n---\n\n# Alpha\n\nUpdated content.\n",
		);
		indexCommand({ full: true });

		const db = openDatabase(getDbPath(tempDir));
		const history = getFileHistory(db, "project-alpha.md");
		expect(history.length).toBe(2);
		expect(history[0]?.action).toBe("update");
		expect(history[1]?.action).toBe("create");
		db.close();
	});
});
