import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCommand } from "../../src/commands/init.js";

describe("kb init", () => {
	let tempDir: string;
	let globalConfigDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "kb-test-"));
		globalConfigDir = mkdtempSync(join(tmpdir(), "kb-global-"));
		process.env.KB_GLOBAL_CONFIG_DIR = globalConfigDir;
	});

	afterEach(() => {
		process.env.KB_GLOBAL_CONFIG_DIR = undefined;
		rmSync(tempDir, { recursive: true, force: true });
		rmSync(globalConfigDir, { recursive: true, force: true });
	});

	it("creates .kb directory structure", () => {
		initCommand(tempDir);

		expect(existsSync(join(tempDir, ".kb"))).toBe(true);
		expect(existsSync(join(tempDir, ".kb", "config.json"))).toBe(true);
		expect(existsSync(join(tempDir, ".kb", "index.db"))).toBe(true);
		expect(existsSync(join(tempDir, ".kb", "templates"))).toBe(true);
	});

	it("writes valid config.json", () => {
		initCommand(tempDir);

		const raw = readFileSync(join(tempDir, ".kb", "config.json"), "utf-8");
		const config = JSON.parse(raw);

		expect(config.version).toBe(1);
		expect(config.vault.path).toBe(tempDir);
		expect(config.naming.slug_transform).toBe("kebab-case");
	});

	it("creates template files", () => {
		initCommand(tempDir);

		const templatesDir = join(tempDir, ".kb", "templates");
		expect(existsSync(join(templatesDir, "default.md"))).toBe(true);
		expect(existsSync(join(templatesDir, "task.md"))).toBe(true);
		expect(existsSync(join(templatesDir, "session.md"))).toBe(true);
		expect(existsSync(join(templatesDir, "MOC.md"))).toBe(true);
	});

	it("saves global config pointing to KB", () => {
		initCommand(tempDir);

		const globalConfig = JSON.parse(readFileSync(join(globalConfigDir, "config.json"), "utf-8"));
		expect(globalConfig.default_kb).toBe(tempDir);
	});

	it("refuses to init if already initialized", () => {
		initCommand(tempDir);

		let exitCode: number | undefined;
		const originalExit = process.exit;
		process.exit = ((code?: number) => {
			exitCode = code;
			throw new Error("process.exit called");
		}) as never;

		try {
			initCommand(tempDir);
		} catch {
			// expected
		}

		process.exit = originalExit;
		expect(exitCode).toBe(1);
	});
});
