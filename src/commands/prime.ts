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
	lines.push("```");
	lines.push(
		'kb add <type> <title> [--project X] [--area X] [--content "..."] [--id X] [--source X]',
	);
	lines.push("kb show <id|path>                  # read full note");
	lines.push("kb search <query> [--type X] [--project X] [--output json]");
	lines.push("kb ls [--type X] [--project X] [--status X] [--recent]");
	lines.push("kb update <id|path> --status done  # update frontmatter");
	lines.push('kb append <id|path> --content "..." # add to existing note');
	lines.push("kb tags [tag]                      # browse by tag");
	lines.push("kb history [file]                  # change log");
	lines.push("kb today                           # daily rollup");
	lines.push("kb ready [--project X]             # tasks with no blockers");
	lines.push("kb blocked [--project X]           # blocked tasks + what's blocking");
	lines.push("```");
	lines.push("");

	// Workflow
	lines.push("## Workflow");
	lines.push('1. Search for context first: `kb search "..." --output json`');
	lines.push("2. Read relevant notes: `kb show <id>`");
	lines.push(
		'3. Log work as sessions: `kb add session "..." --project X --area Y --content "..."`',
	);
	lines.push('4. Record decisions: `kb add decision "..." --project X --content "..."`');
	lines.push('5. Track tasks: `kb add task "..." --project X --id TICKET --source linear`');
	lines.push('6. Update: `kb append <id> --content "..."` or `kb update <id> --status done`');
	lines.push("7. Use [[wikilinks]] and #tags to connect notes");

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
