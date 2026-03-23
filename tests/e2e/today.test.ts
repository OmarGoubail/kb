import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addCommand } from "../../src/commands/add.js";
import { initCommand } from "../../src/commands/init.js";
import { todayCommand } from "../../src/commands/today.js";

describe("kb today", () => {
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

	it("shows today's notes grouped by project", () => {
		addCommand("session", "Morning Work", { project: "acme", area: "auth" });
		addCommand("task", "Fix Bug", { project: "acme", area: "api", id: "ACM-1", source: "linear" });
		addCommand("session", "Design Review", { project: "mobile", area: "ui" });

		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => logs.push(args.join(" "));

		todayCommand();

		console.log = origLog;
		const output = logs.join("\n");

		expect(output).toContain("acme");
		expect(output).toContain("mobile");
		expect(output).toContain("Morning Work");
		expect(output).toContain("Design Review");
	});

	it("shows activity summary", () => {
		addCommand("project", "Acme", {});

		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => logs.push(args.join(" "));

		todayCommand();

		console.log = origLog;
		const output = logs.join("\n");

		expect(output).toContain("Activity");
		expect(output).toContain("created");
	});
});
