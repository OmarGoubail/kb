import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCommand } from "../../src/commands/init.js";
import { createDefaultConfig } from "../../src/config/defaults.js";
import { getDbPath } from "../../src/config/loader.js";
import { openDatabase } from "../../src/db/connection.js";
import { getBlockedTasks, getDependsOn, getReadyTasks } from "../../src/db/deps.js";
import { initializeSchema } from "../../src/db/migrations.js";
import { indexFiles } from "../../src/indexer/pipeline.js";
import { scanFiles } from "../../src/indexer/scanner.js";

describe("dependency system", () => {
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

	function indexAll() {
		const db = openDatabase(getDbPath(tempDir));
		initializeSchema(db);
		const config = createDefaultConfig(tempDir);
		indexFiles(db, scanFiles(tempDir), config, { full: true });
		return db;
	}

	it("extracts depends_on from frontmatter", () => {
		writeFileSync(
			join(tempDir, "task-PAY-1-setup.md"),
			"---\ntype: task\nproject: payments\nstatus: done\ncreated: 2026-03-23\nid: PAY-1\nname: setup\nsource: personal\n---\n\n# Setup\n",
		);
		writeFileSync(
			join(tempDir, "task-PAY-2-endpoint.md"),
			"---\ntype: task\nproject: payments\nstatus: active\ncreated: 2026-03-23\nid: PAY-2\nname: endpoint\nsource: personal\ndepends_on:\n  - task-PAY-1-setup.md\n---\n\n# Endpoint\n",
		);

		const db = indexAll();
		const deps = getDependsOn(db, "task-PAY-2-endpoint.md");
		expect(deps).toHaveLength(1);
		expect(deps[0]?.target_path).toBe("task-PAY-1-setup.md");
		expect(deps[0]?.target_status).toBe("done");
		db.close();
	});

	it("ready shows tasks with all deps done", () => {
		writeFileSync(
			join(tempDir, "task-PAY-1-setup.md"),
			"---\ntype: task\nproject: payments\nstatus: done\ncreated: 2026-03-23\nid: PAY-1\nname: setup\nsource: personal\n---\n\n# Setup\n",
		);
		writeFileSync(
			join(tempDir, "task-PAY-2-endpoint.md"),
			"---\ntype: task\nproject: payments\nstatus: active\ncreated: 2026-03-23\nid: PAY-2\nname: endpoint\nsource: personal\ndepends_on:\n  - task-PAY-1-setup.md\n---\n\n# Endpoint\n",
		);

		const db = indexAll();
		const ready = getReadyTasks(db, "payments");
		const readyPaths = ready.map((t) => t.path);
		expect(readyPaths).toContain("task-PAY-2-endpoint.md");
		db.close();
	});

	it("blocked shows tasks with unmet deps", () => {
		writeFileSync(
			join(tempDir, "task-PAY-1-setup.md"),
			"---\ntype: task\nproject: payments\nstatus: active\ncreated: 2026-03-23\nid: PAY-1\nname: setup\nsource: personal\n---\n\n# Setup\n",
		);
		writeFileSync(
			join(tempDir, "task-PAY-2-endpoint.md"),
			"---\ntype: task\nproject: payments\nstatus: active\ncreated: 2026-03-23\nid: PAY-2\nname: endpoint\nsource: personal\ndepends_on:\n  - task-PAY-1-setup.md\n---\n\n# Endpoint\n",
		);

		const db = indexAll();
		const blocked = getBlockedTasks(db, "payments");
		expect(blocked).toHaveLength(1);
		expect(blocked[0]?.path).toBe("task-PAY-2-endpoint.md");
		expect(blocked[0]?.blockers[0]?.path).toBe("task-PAY-1-setup.md");
		db.close();
	});

	it("task with no deps is always ready", () => {
		writeFileSync(
			join(tempDir, "task-PAY-1-setup.md"),
			"---\ntype: task\nproject: payments\nstatus: active\ncreated: 2026-03-23\nid: PAY-1\nname: setup\nsource: personal\n---\n\n# Setup\n",
		);

		const db = indexAll();
		const ready = getReadyTasks(db, "payments");
		expect(ready).toHaveLength(1);
		expect(ready[0]?.path).toBe("task-PAY-1-setup.md");
		db.close();
	});

	it("handles cross-type deps (task depends on decision)", () => {
		writeFileSync(
			join(tempDir, "decision-2026-03-23-use-stripe.md"),
			"---\ntype: decision\nproject: payments\nstatus: active\ncreated: 2026-03-23\n---\n\n# Use Stripe\n",
		);
		writeFileSync(
			join(tempDir, "task-PAY-2-endpoint.md"),
			"---\ntype: task\nproject: payments\nstatus: active\ncreated: 2026-03-23\nid: PAY-2\nname: endpoint\nsource: personal\ndepends_on:\n  - decision-2026-03-23-use-stripe.md\n---\n\n# Endpoint\n",
		);

		const db = indexAll();
		const blocked = getBlockedTasks(db, "payments");
		expect(blocked).toHaveLength(1);
		expect(blocked[0]?.blockers[0]?.path).toBe("decision-2026-03-23-use-stripe.md");

		// Once decision is done, task becomes ready
		writeFileSync(
			join(tempDir, "decision-2026-03-23-use-stripe.md"),
			"---\ntype: decision\nproject: payments\nstatus: done\ncreated: 2026-03-23\n---\n\n# Use Stripe\n",
		);
		indexFiles(db, scanFiles(tempDir), createDefaultConfig(tempDir), { full: true });

		const ready = getReadyTasks(db, "payments");
		const readyPaths = ready.map((t) => t.path);
		expect(readyPaths).toContain("task-PAY-2-endpoint.md");
		db.close();
	});

	it("handles fuzzy dep resolution", () => {
		writeFileSync(
			join(tempDir, "task-PAY-1-setup.md"),
			"---\ntype: task\nproject: payments\nstatus: done\ncreated: 2026-03-23\nid: PAY-1\nname: setup\nsource: personal\n---\n\n# Setup\n",
		);
		// Reference without .md extension
		writeFileSync(
			join(tempDir, "task-PAY-2-endpoint.md"),
			"---\ntype: task\nproject: payments\nstatus: active\ncreated: 2026-03-23\nid: PAY-2\nname: endpoint\nsource: personal\ndepends_on:\n  - task-PAY-1-setup\n---\n\n# Endpoint\n",
		);

		const db = indexAll();
		const deps = getDependsOn(db, "task-PAY-2-endpoint.md");
		expect(deps).toHaveLength(1);
		expect(deps[0]?.target_path).toBe("task-PAY-1-setup.md");
		db.close();
	});
});
