import { getDbPath, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";

export function primeCommand(): void {
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

	// Gather stats
	const noteCount = (db.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number }).c;
	const typeStats = db
		.prepare("SELECT type, COUNT(*) as c FROM notes GROUP BY type ORDER BY c DESC")
		.all() as Array<{ type: string; c: number }>;
	const projectStats = db
		.prepare(
			"SELECT project, COUNT(*) as c FROM notes WHERE project IS NOT NULL AND project != '' GROUP BY project ORDER BY c DESC",
		)
		.all() as Array<{ project: string; c: number }>;
	const activeTasks = db
		.prepare(
			"SELECT path, title, project FROM notes WHERE type = 'task' AND status = 'active' ORDER BY modified_at DESC",
		)
		.all() as Array<{ path: string; title: string; project: string | null }>;
	const recentChanges = db
		.prepare(
			"SELECT note_path, action, source_dir, timestamp FROM changelog ORDER BY timestamp DESC LIMIT 5",
		)
		.all() as Array<{
		note_path: string;
		action: string;
		source_dir: string | null;
		timestamp: string;
	}>;
	const todayCount = (
		db.prepare("SELECT COUNT(*) as c FROM notes WHERE created_at = ?").get(today) as { c: number }
	).c;

	db.close();

	// Output
	const lines: string[] = [];

	lines.push("You have access to a knowledge base via the `kb` CLI.");
	lines.push(`Location: ${root}`);
	lines.push("");

	lines.push("## Commands");
	lines.push(
		'- `kb add <type> <title> [--project X] [--area X] [--content "..."]` — create a note',
	);
	lines.push("- `kb search <query> [--type X] [--project X] [--output json]` — full-text search");
	lines.push("- `kb show <id|path>` — read a note's full content");
	lines.push("- `kb ls [--type X] [--project X] [--status X]` — list notes");
	lines.push("- `kb update <id|path> [--status X]` — update frontmatter fields");
	lines.push('- `kb append <id|path> --content "..."` — append to existing note');
	lines.push("- `kb tags [tag]` — list tags or notes by tag");
	lines.push("- `kb history [file]` — change history with source tracking");
	lines.push("- `kb today` — today's activity across all projects");
	lines.push('- `kb resolve "[[target]]"` — resolve wikilinks');
	lines.push("");

	lines.push("## Note Types");
	lines.push("- `session` — work logs, planning sessions, daily notes");
	lines.push("- `task` — actionable items (use --id for ticket IDs, --source for origin)");
	lines.push("- `project` — project hubs/overviews");
	lines.push("- `decision` — architecture decisions (ADRs)");
	lines.push("- `area` — knowledge domains");
	lines.push("- `MOC` — maps of content (index pages)");
	lines.push("");

	lines.push("## Current State");
	lines.push(`- ${noteCount} notes total, ${todayCount} created today`);
	if (typeStats.length > 0) {
		lines.push(`- By type: ${typeStats.map((t) => `${t.type}(${t.c})`).join(", ")}`);
	}
	if (projectStats.length > 0) {
		lines.push(`- Projects: ${projectStats.map((p) => `${p.project}(${p.c})`).join(", ")}`);
	}
	lines.push("");

	if (activeTasks.length > 0) {
		lines.push("## Active Tasks");
		for (const task of activeTasks) {
			const proj = task.project ? ` [${task.project}]` : "";
			lines.push(`- ${task.path}${proj}`);
		}
		lines.push("");
	}

	if (recentChanges.length > 0) {
		lines.push("## Recent Changes");
		for (const change of recentChanges) {
			const source = change.source_dir ? ` from ${change.source_dir}` : "";
			lines.push(`- ${change.action} ${change.note_path}${source}`);
		}
		lines.push("");
	}

	lines.push("## Workflow");
	lines.push(
		'- Log planning/work as sessions: `kb add session "..." --project X --area Y --content "..."`',
	);
	lines.push('- Record decisions: `kb add decision "..." --project X --content "..."`');
	lines.push('- Track tasks: `kb add task "..." --project X --id TICKET --source linear`');
	lines.push('- Search for context before starting work: `kb search "..." --output json`');
	lines.push("- Mark tasks done: `kb update <id> --status done`");
	lines.push('- Append updates to existing notes: `kb append <id> --content "..."`');
	lines.push("- Use [[wikilinks]] and #tags in content to connect notes");

	console.log(lines.join("\n"));
}
