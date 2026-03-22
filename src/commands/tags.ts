import { getDbPath, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";
import { getAllTags, getNotesByTag } from "../db/tags.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";

export function tagsCommand(tagName?: string): void {
	const configResult = loadConfig();
	if (!configResult.success) {
		console.error(configResult.error);
		process.exit(1);
	}

	const { config, root } = configResult;
	const dbPath = getDbPath(root);
	const db = openDatabase(dbPath);
	initializeSchema(db);

	// Auto-index
	const files = scanFiles(root);
	indexFiles(db, files, config);

	if (tagName) {
		// Show notes with this tag
		const notes = getNotesByTag(db, tagName.toLowerCase());
		db.close();

		if (notes.length === 0) {
			console.log(`No notes tagged with "${tagName}".`);
			return;
		}

		console.log(`Notes tagged #${tagName}:`);
		for (const note of notes) {
			const type = note.type ? `[${note.type}]` : "";
			console.log(`  ${note.path} ${type}`);
		}
	} else {
		// List all tags
		const tags = getAllTags(db);
		db.close();

		if (tags.length === 0) {
			console.log("No tags found.");
			return;
		}

		for (const tag of tags) {
			console.log(`#${tag.name} (${tag.count})`);
		}
	}
}
