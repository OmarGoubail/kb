import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addCommand } from "../../src/commands/add.js";
import { initCommand } from "../../src/commands/init.js";
import { primeCommand } from "../../src/commands/prime.js";

describe("kb prime", () => {
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

	it("outputs commands section", () => {
		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => logs.push(args.join(" "));

		primeCommand();

		console.log = origLog;
		const output = logs.join("\n");

		expect(output).toContain("## Commands");
		expect(output).toContain("kb add");
		expect(output).toContain("kb show");
		expect(output).toContain("kb search");
	});

	it("outputs valid values from config", () => {
		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => logs.push(args.join(" "));

		primeCommand();

		console.log = origLog;
		const output = logs.join("\n");

		expect(output).toContain("## Valid Values");
		expect(output).toContain("session");
		expect(output).toContain("active");
	});

	it("outputs workflow steps", () => {
		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => logs.push(args.join(" "));

		primeCommand();

		console.log = origLog;
		const output = logs.join("\n");

		expect(output).toContain("## Workflow");
		expect(output).toContain("Search for context");
		expect(output).toContain("wikilinks");
	});

	it("shows ready tasks in global view", () => {
		addCommand("task", "Fix Bug", { project: "acme", area: "auth", id: "ACM-1", source: "linear" });

		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => logs.push(args.join(" "));

		primeCommand();

		console.log = origLog;
		const output = logs.join("\n");

		// Task with no deps shows under "Ready"
		expect(output).toContain("Ready");
		expect(output).toContain("task-ACM-1-fix-bug.md");
	});

	it("includes project stats", () => {
		addCommand("project", "Acme", {});
		addCommand("task", "Fix Bug", { project: "acme", area: "auth", id: "ACM-1", source: "linear" });

		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => logs.push(args.join(" "));

		primeCommand();

		console.log = origLog;
		const output = logs.join("\n");

		expect(output).toContain("acme");
	});

	it("respects --days flag", () => {
		addCommand("session", "Old Session", { project: "acme", area: "auth" });

		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => logs.push(args.join(" "));

		primeCommand({ days: 0 });

		console.log = origLog;
		const output = logs.join("\n");

		// With days=0, should still show the date range info
		expect(output).toContain("showing last 0 days");
	});
});
