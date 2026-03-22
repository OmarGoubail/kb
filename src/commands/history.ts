import { loadConfig } from "../config/loader.js";
import { getDbPath } from "../config/loader.js";
import { getFileHistory, getHistoryBySource, getRecentChanges } from "../db/changelog.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";

interface HistoryOptions {
	source?: string;
	limit?: number;
}

export function historyCommand(file: string | undefined, options: HistoryOptions): void {
	const configResult = loadConfig();
	if (!configResult.success) {
		console.error(configResult.error);
		process.exit(1);
	}

	const { root } = configResult;
	const dbPath = getDbPath(root);
	const db = openDatabase(dbPath);
	initializeSchema(db);

	const limit = options.limit ?? 20;

	let entries: import("../db/changelog.js").ChangelogEntry[];
	if (file) {
		entries = getFileHistory(db, file);
	} else if (options.source) {
		entries = getHistoryBySource(db, options.source);
	} else {
		entries = getRecentChanges(db, limit);
	}

	db.close();

	if (entries.length === 0) {
		console.log("No history found.");
		return;
	}

	for (const entry of entries) {
		const time = formatTimestamp(entry.timestamp);
		const source = entry.source_dir ? ` from ${entry.source_dir}` : "";
		const agent = entry.agent ? ` (${entry.agent})` : "";
		console.log(`${time}  ${entry.action.padEnd(7)} ${entry.note_path}${source}${agent}`);
		if (entry.summary) {
			console.log(`          ${entry.summary}`);
		}
	}
}

function formatTimestamp(iso: string): string {
	const date = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toISOString().slice(0, 10);
}
