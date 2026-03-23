import { getDbPath, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";

interface TodayNote {
	path: string;
	title: string;
	type: string | null;
	project: string | null;
	status: string | null;
}

interface TodayChange {
	note_path: string;
	action: string;
	source_dir: string | null;
	timestamp: string;
}

export function todayCommand(): void {
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

	// Get notes created today
	const createdToday = db
		.prepare(
			"SELECT path, title, type, project, status FROM notes WHERE created_at = ? ORDER BY type, project",
		)
		.all(today) as TodayNote[];

	// Get all changelog entries from today
	const changes = db
		.prepare(
			"SELECT note_path, action, source_dir, timestamp FROM changelog WHERE timestamp >= ? ORDER BY timestamp DESC",
		)
		.all(`${today}T00:00:00`) as TodayChange[];

	db.close();

	// Group by project
	const byProject = new Map<string, TodayNote[]>();
	for (const note of createdToday) {
		const project = note.project || "(no project)";
		const existing = byProject.get(project) ?? [];
		existing.push(note);
		byProject.set(project, existing);
	}

	console.log(`# Today: ${today}\n`);

	if (byProject.size === 0 && changes.length === 0) {
		console.log("No activity today.");
		return;
	}

	// Print notes grouped by project
	if (byProject.size > 0) {
		for (const [project, notes] of byProject) {
			console.log(`## ${project}`);
			for (const note of notes) {
				const status = note.status ? ` [${note.status}]` : "";
				console.log(`  ${typeIcon(note.type)} ${note.title}${status}`);
				console.log(`    ${note.path}`);
			}
			console.log();
		}
	}

	// Print change summary
	if (changes.length > 0) {
		const creates = changes.filter((c) => c.action === "create").length;
		const updates = changes.filter((c) => c.action === "update").length;
		const deletes = changes.filter((c) => c.action === "delete").length;

		const sources = new Set(changes.map((c) => c.source_dir).filter(Boolean));

		console.log("## Activity");
		console.log(`  ${creates} created, ${updates} updated, ${deletes} deleted`);
		if (sources.size > 0) {
			console.log(`  Sources: ${[...sources].join(", ")}`);
		}
	}
}

function typeIcon(type: string | null): string {
	switch (type) {
		case "session":
			return "S";
		case "task":
			return "T";
		case "project":
			return "P";
		case "decision":
			return "D";
		case "area":
			return "A";
		case "MOC":
			return "M";
		default:
			return "-";
	}
}
