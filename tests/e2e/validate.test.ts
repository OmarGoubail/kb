import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addCommand } from "../../src/commands/add.js";
import { initCommand } from "../../src/commands/init.js";
import { validateCommand } from "../../src/commands/validate.js";

describe("kb validate", () => {
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

	it("passes validation on well-formed notes", () => {
		addCommand("project", "Alpha", {});
		addCommand("MOC", "Index", {});

		// Should not throw or exit
		const originalExit = process.exit;
		let exitCalled = false;
		process.exit = (() => {
			exitCalled = true;
			throw new Error("exit");
		}) as never;

		try {
			validateCommand({ fix: false });
		} catch {
			// might exit
		}

		process.exit = originalExit;
		// If no issues, validate doesn't call process.exit
		// If it did exit, it means issues were found — which shouldn't happen here
		expect(exitCalled).toBe(false);
	});

	it("catches invalid frontmatter", () => {
		// Write a file with bad frontmatter
		writeFileSync(
			join(tempDir, "project-bad.md"),
			"---\ntype: project\nstatus: INVALID\ncreated: 2026-03-22\n---\n\n# Bad\n",
		);

		const originalExit = process.exit;
		let exitCode: number | undefined;
		process.exit = ((code?: number) => {
			exitCode = code;
			throw new Error("exit");
		}) as never;

		try {
			validateCommand({ fix: false });
		} catch {
			// expected
		}

		process.exit = originalExit;
		expect(exitCode).toBe(1);
	});

	it("catches missing frontmatter", () => {
		writeFileSync(join(tempDir, "project-no-fm.md"), "# No frontmatter\n\nJust content.\n");

		const originalExit = process.exit;
		let exitCode: number | undefined;
		process.exit = ((code?: number) => {
			exitCode = code;
			throw new Error("exit");
		}) as never;

		try {
			validateCommand({ fix: false });
		} catch {
			// expected
		}

		process.exit = originalExit;
		expect(exitCode).toBe(1);
	});

	it("fixes missing defaults with --fix", () => {
		// Write file missing status (has a default)
		writeFileSync(
			join(tempDir, "project-fixable.md"),
			"---\ntype: project\ncreated: 2026-03-22\n---\n\n# Fixable\n",
		);

		const originalExit = process.exit;
		process.exit = (() => {
			throw new Error("exit");
		}) as never;

		try {
			validateCommand({ fix: true });
		} catch {
			// may still exit if not all issues fixed
		}

		process.exit = originalExit;

		// Check the file was updated with the default status
		const content = readFileSync(join(tempDir, "project-fixable.md"), "utf-8");
		expect(content).toContain("status: active");
	});
});
