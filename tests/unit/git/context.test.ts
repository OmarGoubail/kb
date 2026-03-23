import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectGitContext } from "../../../src/git/context.js";

describe("detectGitContext", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "git-ctx-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("detects repo name from SSH remote", () => {
		execSync("git init", { cwd: tempDir, stdio: "pipe" });
		execSync("git remote add origin git@github.com:acme/payments-api.git", {
			cwd: tempDir,
			stdio: "pipe",
		});

		const ctx = detectGitContext(tempDir);
		expect(ctx.repo).toBe("payments-api");
	});

	it("detects repo name from HTTPS remote", () => {
		execSync("git init", { cwd: tempDir, stdio: "pipe" });
		execSync("git remote add origin https://github.com/acme/my-project.git", {
			cwd: tempDir,
			stdio: "pipe",
		});

		const ctx = detectGitContext(tempDir);
		expect(ctx.repo).toBe("my-project");
	});

	it("detects branch name", () => {
		execSync("git init", { cwd: tempDir, stdio: "pipe" });
		execSync("git commit --allow-empty -m init", { cwd: tempDir, stdio: "pipe" });
		execSync("git checkout -b feature/llm-responses", { cwd: tempDir, stdio: "pipe" });

		const ctx = detectGitContext(tempDir);
		expect(ctx.branch).toBe("feature/llm-responses");
	});

	it("returns nulls for non-git directory", () => {
		const ctx = detectGitContext(tempDir);
		expect(ctx.repo).toBeNull();
		expect(ctx.branch).toBeNull();
		expect(ctx.dir).toBe(tempDir);
	});
});
