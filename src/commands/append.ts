import { join } from "node:path";
import { getDbPath, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";
import { atomicWriteSync } from "../fs/atomic-write.js";
import { readFile } from "../fs/reader.js";
import { gitCommit } from "../git/operations.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";
import { resolveNote } from "../resolve/note-resolver.js";

interface AppendOptions {
	content: string;
}

export function appendCommand(identifier: string, options: AppendOptions): void {
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

	const note = resolveNote(db, identifier);
	db.close();

	if (!note) {
		console.error(`Note not found: ${identifier}`);
		process.exit(1);
	}

	const filePath = join(root, note.path);
	const existing = readFile(filePath);
	const newContent = `${existing.trimEnd()}\n\n${options.content}\n`;

	atomicWriteSync(filePath, newContent);
	gitCommit(root, note.path, `kb: append to ${note.path}`);
	console.log(`Appended to ${note.path}`);
}
