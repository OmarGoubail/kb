import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addCommand } from "../../src/commands/add.js";
import { initCommand } from "../../src/commands/init.js";

describe("kb show/update/append", () => {
	let tempDir: string;
	let globalConfigDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "kb-test-"));
		globalConfigDir = mkdtempSync(join(tmpdir(), "kb-global-"));
		process.env.KB_GLOBAL_CONFIG_DIR = globalConfigDir;
		initCommand(tempDir);
		addCommand("task", "Fix Login", {
			project: "acme",
			area: "auth",
			id: "ACM-1",
			source: "linear",
		});
	});

	afterEach(() => {
		process.env.KB_GLOBAL_CONFIG_DIR = undefined;
		rmSync(tempDir, { recursive: true, force: true });
		rmSync(globalConfigDir, { recursive: true, force: true });
	});

	it("show reads note by ID", async () => {
		// Import dynamically to capture output
		const { showCommand } = await import("../../src/commands/show.js");
		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => logs.push(args.join(" "));

		showCommand("ACM-1");

		console.log = origLog;
		const output = logs.join("\n");
		expect(output).toContain("type: task");
		expect(output).toContain("id: ACM-1");
	});

	it("update changes frontmatter status", async () => {
		const { updateCommand } = await import("../../src/commands/update.js");
		updateCommand("ACM-1", { status: "done" });

		const content = readFileSync(join(tempDir, "task-ACM-1-fix-login.md"), "utf-8");
		expect(content).toContain("status: done");
	});

	it("update changes multiple fields", async () => {
		const { updateCommand } = await import("../../src/commands/update.js");
		updateCommand("ACM-1", { status: "blocked", area: "api" });

		const content = readFileSync(join(tempDir, "task-ACM-1-fix-login.md"), "utf-8");
		expect(content).toContain("status: blocked");
		expect(content).toContain("area: api");
	});

	it("append adds content to note", async () => {
		const { appendCommand } = await import("../../src/commands/append.js");
		appendCommand("ACM-1", { content: "## Progress\n\nStarted implementation." });

		const content = readFileSync(join(tempDir, "task-ACM-1-fix-login.md"), "utf-8");
		expect(content).toContain("## Progress");
		expect(content).toContain("Started implementation.");
	});
});
