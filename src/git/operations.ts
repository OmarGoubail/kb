import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Initialize a git repo in the KB directory.
 * Creates .gitignore for .kb/ internal files.
 */
export function gitInit(kbRoot: string): boolean {
	if (existsSync(join(kbRoot, ".git"))) {
		return false; // already a git repo
	}

	try {
		exec("git init", kbRoot);
		// Gitignore the SQLite DB and internal state (config + templates are fine to track)
		const gitignore = [
			"# kb internal state",
			".kb/index.db",
			".kb/index.db-wal",
			".kb/index.db-shm",
			"",
		].join("\n");
		require("node:fs").writeFileSync(join(kbRoot, ".gitignore"), gitignore, "utf-8");
		exec("git add -A", kbRoot);
		exec('git commit -m "kb: initialize knowledge base"', kbRoot);
		return true;
	} catch {
		// Git not available or failed — non-fatal
		return false;
	}
}

/**
 * Commit a file change with source tracking.
 * The commit message includes the caller's cwd for audit trail.
 */
export function gitCommit(kbRoot: string, filePath: string, message: string): boolean {
	if (!existsSync(join(kbRoot, ".git"))) {
		return false;
	}

	try {
		exec(`git add "${filePath}"`, kbRoot);
		const sourceDir = process.cwd();
		const fullMessage = `${message}\n\nSource: ${sourceDir}`;
		exec(`git commit -m "${escapeShell(fullMessage)}"`, kbRoot);
		return true;
	} catch {
		return false;
	}
}

/**
 * Stage and commit all changes (used by indexer, validate --fix, etc.)
 */
export function gitCommitAll(kbRoot: string, message: string): boolean {
	if (!existsSync(join(kbRoot, ".git"))) {
		return false;
	}

	try {
		exec("git add -A", kbRoot);
		// Check if there's anything to commit
		try {
			exec("git diff --cached --quiet", kbRoot);
			return false; // nothing staged
		} catch {
			// diff --quiet exits non-zero when there are changes — that's what we want
		}
		const sourceDir = process.cwd();
		const fullMessage = `${message}\n\nSource: ${sourceDir}`;
		exec(`git commit -m "${escapeShell(fullMessage)}"`, kbRoot);
		return true;
	} catch {
		return false;
	}
}

function exec(cmd: string, cwd: string): string {
	return execSync(cmd, { cwd, stdio: "pipe", encoding: "utf-8" }).trim();
}

function escapeShell(str: string): string {
	return str.replace(/"/g, '\\"');
}
