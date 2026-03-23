import { join } from "node:path";
import { getDbPath, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";
import { parseFrontmatter } from "../frontmatter/parser.js";
import { renderFrontmatter } from "../frontmatter/renderer.js";
import { atomicWriteSync } from "../fs/atomic-write.js";
import { readFile } from "../fs/reader.js";
import { gitCommit } from "../git/operations.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";
import { resolveNote } from "../resolve/note-resolver.js";

interface UpdateOptions {
	status?: string;
	project?: string;
	area?: string;
	[key: string]: string | undefined;
}

export function updateCommand(identifier: string, options: UpdateOptions): void {
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
	const content = readFile(filePath);
	const fmResult = parseFrontmatter(content);

	if (!fmResult.success) {
		console.error(`Cannot parse frontmatter: ${fmResult.error}`);
		process.exit(1);
	}

	// Apply updates
	const updates: Record<string, string> = {};
	if (options.status) updates.status = options.status;
	if (options.project) updates.project = options.project;
	if (options.area) updates.area = options.area;

	if (Object.keys(updates).length === 0) {
		console.error("Nothing to update. Use --status, --project, or --area.");
		process.exit(1);
	}

	const newData = { ...fmResult.data, ...updates };
	const newFrontmatter = renderFrontmatter(newData);
	const newContent = `${newFrontmatter}\n${fmResult.body}`;

	atomicWriteSync(filePath, newContent);

	const changedFields = Object.entries(updates)
		.map(([k, v]) => `${k}=${v}`)
		.join(", ");
	gitCommit(root, note.path, `kb: update ${note.path} (${changedFields})`);
	console.log(`Updated ${note.path}: ${changedFields}`);
}
