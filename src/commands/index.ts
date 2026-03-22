import { loadConfig } from "../config/loader.js";
import { getDbPath } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";
import { getNoteCount } from "../db/notes.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";

interface IndexOptions {
	full?: boolean;
	status?: boolean;
}

export function indexCommand(options: IndexOptions): void {
	const configResult = loadConfig();
	if (!configResult.success) {
		console.error(configResult.error);
		process.exit(1);
	}

	const { config, root } = configResult;
	const dbPath = getDbPath(root);
	const db = openDatabase(dbPath);
	initializeSchema(db);

	if (options.status) {
		const count = getNoteCount(db);
		console.log("Index status:");
		console.log(`  Notes indexed: ${count}`);
		console.log(`  Database: ${dbPath}`);
		db.close();
		return;
	}

	const mode = options.full ? "full" : "incremental";
	console.log(`Indexing (${mode})...`);

	const files = scanFiles(root);
	const stats = indexFiles(db, files, config, { full: options.full });
	db.close();

	console.log(
		`Done: ${stats.added} added, ${stats.updated} updated, ${stats.deleted} deleted, ${stats.unchanged} unchanged${stats.errors > 0 ? `, ${stats.errors} errors` : ""}`,
	);
}
