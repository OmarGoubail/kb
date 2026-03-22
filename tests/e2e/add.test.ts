import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addCommand } from "../../src/commands/add.js";
import { initCommand } from "../../src/commands/init.js";

describe("kb add", () => {
	let tempDir: string;
	const originalCwd = process.cwd;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "kb-test-"));
		initCommand(tempDir);
		// Override cwd so loadConfig finds the KB
		process.cwd = () => tempDir;
	});

	afterEach(() => {
		process.cwd = originalCwd;
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("creates a project note", () => {
		addCommand("project", "Alpha Platform", {});

		const filePath = join(tempDir, "project-alpha-platform.md");
		expect(existsSync(filePath)).toBe(true);

		const content = readFileSync(filePath, "utf-8");
		expect(content).toContain("type: project");
		expect(content).toContain("# Alpha Platform");
	});

	it("creates a task note with id", () => {
		addCommand("task", "Fix Auth Bug", {
			project: "jump",
			area: "auth",
			id: "JMP-123",
			source: "linear",
			url: "https://linear.app/jump/issue/JMP-123",
		});

		const filePath = join(tempDir, "task-JMP-123-fix-auth-bug.md");
		expect(existsSync(filePath)).toBe(true);

		const content = readFileSync(filePath, "utf-8");
		expect(content).toContain("type: task");
		expect(content).toContain("id: JMP-123");
		expect(content).toContain("source: linear");
		expect(content).toContain("url: https://linear.app/jump/issue/JMP-123");
		expect(content).toContain("# Task: Fix Auth Bug (JMP-123)");
	});

	it("creates session notes with incrementing sequence", () => {
		addCommand("session", "First Session", { project: "alpha", area: "auth" });
		addCommand("session", "Second Session", { project: "alpha", area: "auth" });

		const today = new Date().toISOString().slice(0, 10);
		const first = join(tempDir, `session-${today}-001-first-session.md`);
		const second = join(tempDir, `session-${today}-002-second-session.md`);

		expect(existsSync(first)).toBe(true);
		expect(existsSync(second)).toBe(true);

		const content2 = readFileSync(second, "utf-8");
		expect(content2).toContain("# Session 2: Second Session");
	});

	it("creates MOC note", () => {
		addCommand("MOC", "Active Projects", {});

		const filePath = join(tempDir, "MOC-active-projects.md");
		expect(existsSync(filePath)).toBe(true);

		const content = readFileSync(filePath, "utf-8");
		expect(content).toContain("type: MOC");
		expect(content).toContain("# MOC: Active Projects");
	});

	it("creates decision note", () => {
		addCommand("decision", "Use JWT Not Sessions", {});

		const today = new Date().toISOString().slice(0, 10);
		const filePath = join(tempDir, `decision-${today}-use-jwt-not-sessions.md`);
		expect(existsSync(filePath)).toBe(true);
	});

	it("appends user content", () => {
		addCommand("project", "Beta", { content: "Custom content here" });

		const filePath = join(tempDir, "project-beta.md");
		const content = readFileSync(filePath, "utf-8");
		expect(content).toContain("Custom content here");
	});
});
