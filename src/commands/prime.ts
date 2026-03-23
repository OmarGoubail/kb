import { getDbPath, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { getBlockedTasks, getReadyTasks } from "../db/deps.js";
import { initializeSchema } from "../db/migrations.js";
import { detectGitContext } from "../git/context.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";

interface PrimeOptions {
	days?: number;
}

export function primeCommand(options: PrimeOptions = {}): void {
	const configResult = loadConfig();
	if (!configResult.success) {
		console.error(configResult.error);
		process.exit(1);
	}

	const { config, root } = configResult;
	const db = openDatabase(getDbPath(root));
	initializeSchema(db);

	const files = scanFiles(root);
	indexFiles(db, files, config);

	const today = new Date().toISOString().slice(0, 10);
	const cwd = process.cwd();
	const gitCtx = detectGitContext(cwd);
	const days = options.days ?? 2;
	const sinceDate = daysAgo(days);

	// Detect project: git remote repo name → dir name fallback
	const detectedProject = detectProject(gitCtx.repo, cwd, db);

	// Gather global stats
	const noteCount = (db.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number }).c;
	const projectStats = db
		.prepare(
			"SELECT project, COUNT(*) as c FROM notes WHERE project IS NOT NULL AND project != '' GROUP BY project ORDER BY c DESC",
		)
		.all() as Array<{ project: string; c: number }>;

	const validEnums = config.schemas.default?.enums ?? {};
	const taskEnums = config.schemas.task?.enums ?? {};

	// Check if detected project has a project note
	let missingProjectNote = false;
	if (detectedProject) {
		const projectNote = db
			.prepare("SELECT id FROM notes WHERE type = 'project' AND project = ? LIMIT 1")
			.get(detectedProject) as { id: number } | null;
		if (!projectNote) {
			// Also check by path pattern
			const byPath = db
				.prepare("SELECT id FROM notes WHERE type = 'project' AND LOWER(path) LIKE ?")
				.get(`%${detectedProject.toLowerCase()}%`) as { id: number } | null;
			if (!byPath) missingProjectNote = true;
		}
	}

	// Recent notes for this project (time-bounded)
	let recentSessions: Array<{ path: string; title: string; created_at: string | null }> = [];
	let recentDecisions: Array<{ path: string; title: string }> = [];
	let activeTasks: Array<{ path: string; title: string; status: string | null }> = [];
	let branchNotes: Array<{ note_path: string; action: string; timestamp: string }> = [];

	if (detectedProject) {
		recentSessions = db
			.prepare(
				"SELECT path, title, created_at FROM notes WHERE type = 'session' AND project = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 10",
			)
			.all(detectedProject, sinceDate) as Array<{
			path: string;
			title: string;
			created_at: string | null;
		}>;

		recentDecisions = db
			.prepare(
				"SELECT path, title FROM notes WHERE type = 'decision' AND project = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 5",
			)
			.all(detectedProject, sinceDate) as Array<{ path: string; title: string }>;

		activeTasks = db
			.prepare(
				"SELECT path, title, status FROM notes WHERE type = 'task' AND project = ? AND status IN ('active', 'blocked') ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'blocked' THEN 1 END, modified_at DESC LIMIT 15",
			)
			.all(detectedProject) as Array<{ path: string; title: string; status: string | null }>;
	}

	// Branch-specific notes (from changelog)
	if (gitCtx.branch && gitCtx.branch !== "main" && gitCtx.branch !== "master") {
		branchNotes = db
			.prepare(
				"SELECT DISTINCT note_path, action, timestamp FROM changelog WHERE source_branch = ? ORDER BY timestamp DESC LIMIT 10",
			)
			.all(gitCtx.branch) as Array<{
			note_path: string;
			action: string;
			timestamp: string;
		}>;
	}

	// Global fallback (no project detected)
	let globalActiveTasks: Array<{ path: string; title: string; project: string | null }> = [];
	let globalRecentChanges: Array<{
		note_path: string;
		action: string;
		source_repo: string | null;
		source_branch: string | null;
	}> = [];

	if (!detectedProject) {
		globalActiveTasks = db
			.prepare(
				"SELECT path, title, project FROM notes WHERE type = 'task' AND status = 'active' ORDER BY modified_at DESC LIMIT 10",
			)
			.all() as Array<{ path: string; title: string; project: string | null }>;

		globalRecentChanges = db
			.prepare(
				"SELECT note_path, action, source_repo, source_branch FROM changelog WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT 10",
			)
			.all(`${sinceDate}T00:00:00`) as Array<{
			note_path: string;
			action: string;
			source_repo: string | null;
			source_branch: string | null;
		}>;
	}

	// Dependency-aware task queries
	const readyTasks = getReadyTasks(db, detectedProject ?? undefined);
	const blockedTasks = getBlockedTasks(db, detectedProject ?? undefined);

	db.close();

	// Build output
	const lines: string[] = [];

	lines.push("You have access to a knowledge base via the `kb` CLI.");
	lines.push(`KB: ${root}`);
	lines.push(`cwd: ${cwd}`);
	if (gitCtx.repo) lines.push(`repo: ${gitCtx.repo}`);
	if (gitCtx.branch) lines.push(`branch: ${gitCtx.branch}`);
	if (detectedProject) lines.push(`project: ${detectedProject}`);
	lines.push(`date: ${today} (showing last ${days} days)`);
	lines.push("");

	// Warnings
	if (missingProjectNote) {
		lines.push(`> WARNING: Project "${detectedProject}" has no project note.`);
		lines.push(`> Create one: kb add project "${detectedProject}" --content "Project overview..."`);
		lines.push("");
	}

	// Project-specific context
	if (detectedProject) {
		if (readyTasks.length > 0) {
			lines.push("## Ready (no blockers)");
			for (const t of readyTasks) {
				lines.push(`- ${t.path}`);
			}
			lines.push("");
		}

		if (blockedTasks.length > 0) {
			lines.push("## Blocked");
			for (const t of blockedTasks) {
				lines.push(`- ${t.path}`);
				for (const b of t.blockers) {
					lines.push(`  <- ${b.path} [${b.status ?? "not found"}]`);
				}
			}
			lines.push("");
		}

		if (activeTasks.length > 0 && readyTasks.length === 0 && blockedTasks.length === 0) {
			lines.push("## Tasks");
			for (const t of activeTasks) {
				lines.push(`- [${t.status}] ${t.path}`);
			}
			lines.push("");
		}

		if (branchNotes.length > 0) {
			lines.push(`## Branch: ${gitCtx.branch}`);
			lines.push("Notes created/modified on this branch:");
			for (const n of branchNotes) {
				lines.push(`- ${n.note_path}`);
			}
			lines.push("");
		}

		if (recentDecisions.length > 0) {
			lines.push("## Recent Decisions");
			for (const d of recentDecisions) {
				lines.push(`- ${d.path}`);
			}
			lines.push("");
		}

		if (recentSessions.length > 0) {
			lines.push("## Recent Sessions");
			for (const s of recentSessions) {
				lines.push(`- ${s.path}`);
			}
			lines.push("");
		}

		if (
			activeTasks.length === 0 &&
			readyTasks.length === 0 &&
			blockedTasks.length === 0 &&
			branchNotes.length === 0 &&
			recentSessions.length === 0 &&
			recentDecisions.length === 0
		) {
			lines.push("## No recent activity for this project.");
			lines.push(`Search for older context: \`kb search "..." --project ${detectedProject}\``);
			lines.push("");
		}
	} else {
		// Global view
		lines.push(`## Overview: ${noteCount} notes, ${projectStats.length} projects`);
		if (projectStats.length > 0) {
			lines.push(projectStats.map((p) => `${p.project}(${p.c})`).join(", "));
		}
		lines.push("");

		if (readyTasks.length > 0) {
			lines.push("## Ready (no blockers)");
			for (const t of readyTasks) {
				const proj = t.project ? ` [${t.project}]` : "";
				lines.push(`- ${t.path}${proj}`);
			}
			lines.push("");
		}

		if (blockedTasks.length > 0) {
			lines.push("## Blocked");
			for (const t of blockedTasks) {
				const proj = t.project ? ` [${t.project}]` : "";
				lines.push(`- ${t.path}${proj}`);
				for (const b of t.blockers) {
					lines.push(`  <- ${b.path} [${b.status ?? "not found"}]`);
				}
			}
			lines.push("");
		}

		if (globalActiveTasks.length > 0 && readyTasks.length === 0 && blockedTasks.length === 0) {
			lines.push("## Active Tasks");
			for (const t of globalActiveTasks) {
				const proj = t.project ? ` [${t.project}]` : "";
				lines.push(`- ${t.path}${proj}`);
			}
			lines.push("");
		}

		if (globalRecentChanges.length > 0) {
			lines.push(`## Recent Changes (last ${days} days)`);
			for (const c of globalRecentChanges) {
				const ctx = [c.source_repo, c.source_branch].filter(Boolean).join("/");
				const ctxStr = ctx ? ` (${ctx})` : "";
				lines.push(`- ${c.action} ${c.note_path}${ctxStr}`);
			}
			lines.push("");
		}
	}

	// Schema
	lines.push("## Valid Values");
	if (validEnums.type) lines.push(`type: ${validEnums.type.join(", ")}`);
	if (validEnums.status) lines.push(`status: ${validEnums.status.join(", ")}`);
	if (projectStats.length > 0) {
		lines.push(`projects: ${projectStats.map((p) => p.project).join(", ")}`);
	}
	if (validEnums.area) lines.push(`area: ${validEnums.area.join(", ")}`);
	if (taskEnums.source) lines.push(`source: ${taskEnums.source.join(", ")}`);
	lines.push("");

	// Commands
	lines.push("## Commands");
	lines.push("");
	lines.push("### Creating notes");
	lines.push("```");
	lines.push('kb add session "Title" --project X --area Y --content "..."');
	lines.push('kb add task "Title" --project X --area Y --id TICKET-1 --source linear --url "..."');
	lines.push('kb add project "Title" --content "..."');
	lines.push('kb add decision "Title" --project X --content "..."');
	lines.push('kb add area "Title" --content "..."');
	lines.push('kb add MOC "Title" --content "..."');
	lines.push("```");
	lines.push(
		"All `kb add` options: --project, --area, --status, --id, --name, --source, --url, --content, --dry-run, --stdin",
	);
	lines.push("");
	lines.push("### Reading & searching");
	lines.push("```");
	lines.push(
		"kb show <id|path>                   # read a note (fuzzy match: PAY-1, fix-login, etc.)",
	);
	lines.push("kb search <query> [--type X] [--project X] [--output json] [--limit N]");
	lines.push("kb ls [--type X] [--project X] [--status X] [--recent]");
	lines.push("kb tags [tag]                       # list tags or notes by tag");
	lines.push("```");
	lines.push("");
	lines.push("### Updating");
	lines.push("```");
	lines.push("kb update <id|path> --status done   # change frontmatter fields");
	lines.push('kb append <id|path> --content "..."  # add to an existing note');
	lines.push("```");
	lines.push("");
	lines.push("### Dependencies & workflow");
	lines.push("```");
	lines.push("kb ready [--project X]              # what can be worked on now");
	lines.push("kb blocked [--project X]            # what's stuck and why");
	lines.push("kb today                            # daily rollup by project");
	lines.push("kb history [file] [--source dir]    # change log");
	lines.push("```");
	lines.push("");

	// Workflow
	lines.push("## Workflow");
	lines.push("1. `kb ready` — check what's actionable");
	lines.push('2. `kb search "..." --output json` — find existing context');
	lines.push("3. `kb show <id>` — read relevant notes");
	lines.push('4. `kb add session "..." --project X --area Y --content "..."` — log work');
	lines.push('5. `kb add decision "..." --project X --content "..."` — record decisions');
	lines.push("6. `kb update <id> --status done` — mark work complete");
	lines.push('7. `kb append <id> --content "..."` — add updates to existing notes');
	lines.push("");
	lines.push("## Dependencies");
	lines.push("Add `depends_on` in frontmatter to track what must be done first:");
	lines.push("```yaml");
	lines.push("depends_on:");
	lines.push("  - task-PAY-1-setup.md");
	lines.push("  - decision-2026-03-23-use-stripe.md");
	lines.push("```");
	lines.push("- `kb ready` shows notes where all deps are done");
	lines.push("- `kb blocked` shows what's stuck and why");
	lines.push("- Works across types (tasks can depend on decisions, etc.)");
	lines.push("");
	lines.push("## Tags");
	lines.push("Use #tags in note content to categorize. Keep tags:");
	lines.push("- **By project**: #kb-cli, #payments-api");
	lines.push("- **By feature/topic**: #auth, #search, #onboarding");
	lines.push("- **By milestone**: #v1-release, #sprint-3");
	lines.push(
		"Do NOT tag with tech stack (#typescript), buzzwords (#architecture), or generic terms.",
	);

	console.log(lines.join("\n"));
}

function daysAgo(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString().slice(0, 10);
}

/**
 * Detect project from git repo name, then fall back to dir name.
 */
function detectProject(
	repoName: string | null,
	cwd: string,
	db: import("bun:sqlite").Database,
): string | null {
	// 1. Try git repo name
	if (repoName) {
		const normalized = repoName.toLowerCase().replace(/[_\s]/g, "-");
		const match = db
			.prepare(
				"SELECT DISTINCT project FROM notes WHERE LOWER(REPLACE(project, '_', '-')) = ? LIMIT 1",
			)
			.get(normalized) as { project: string } | null;
		if (match) return match.project;
	}

	// 2. Try dir name segments
	const segments = cwd.split("/").filter(Boolean);
	const candidates = segments.slice(-3).reverse();

	for (const segment of candidates) {
		const normalized = segment.toLowerCase().replace(/[_\s]/g, "-");
		const match = db
			.prepare(
				"SELECT DISTINCT project FROM notes WHERE LOWER(REPLACE(project, '_', '-')) = ? LIMIT 1",
			)
			.get(normalized) as { project: string } | null;
		if (match) return match.project;
	}

	return null;
}
