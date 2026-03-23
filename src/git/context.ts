import { execSync } from "node:child_process";

export interface GitContext {
	repo: string | null;
	branch: string | null;
	dir: string;
}

/**
 * Detects git context from a directory.
 * Works with regular checkouts and worktrees.
 */
export function detectGitContext(dir: string): GitContext {
	return {
		repo: detectRepo(dir),
		branch: detectBranch(dir),
		dir,
	};
}

/**
 * Extracts the repo name from git remote URL.
 * e.g., "git@github.com:org/jump.git" → "jump"
 *        "https://github.com/org/jump.git" → "jump"
 */
function detectRepo(dir: string): string | null {
	try {
		const url = execSync("git remote get-url origin", {
			cwd: dir,
			stdio: "pipe",
			encoding: "utf-8",
		}).trim();

		if (!url) return null;

		// Strip .git suffix and extract last path segment
		const cleaned = url.replace(/\.git$/, "");

		// Handle SSH: git@github.com:org/repo
		if (cleaned.includes(":") && !cleaned.includes("://")) {
			const afterColon = cleaned.split(":").pop() ?? "";
			return afterColon.split("/").pop() ?? null;
		}

		// Handle HTTPS: https://github.com/org/repo
		return cleaned.split("/").pop() ?? null;
	} catch {
		return null;
	}
}

/**
 * Detects the current git branch.
 * Works with worktrees (uses HEAD, not just branch name).
 */
function detectBranch(dir: string): string | null {
	try {
		return execSync("git rev-parse --abbrev-ref HEAD", {
			cwd: dir,
			stdio: "pipe",
			encoding: "utf-8",
		}).trim();
	} catch {
		return null;
	}
}
