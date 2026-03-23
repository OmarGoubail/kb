import { join } from "node:path";
import { getDbPath, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";
import { readFile } from "../fs/reader.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";
import { resolveNote } from "../resolve/note-resolver.js";

export function showCommand(identifier: string): void {
	const configResult = loadConfig();
	if (!configResult.success) {
		console.error(configResult.error);
		process.exit(1);
	}

	const { config, root } = configResult;
	const db = openDatabase(getDbPath(root));
	initializeSchema(db);

	// Auto-index
	const files = scanFiles(root);
	indexFiles(db, files, config);

	const note = resolveNote(db, identifier);
	db.close();

	if (!note) {
		console.error(`Note not found: ${identifier}`);
		process.exit(1);
	}

	const content = readFile(join(root, note.path));
	console.log(content);
}
