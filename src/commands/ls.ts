import { getDbPath, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";
import type { OutputFormat } from "../format/output.js";
import { formatNoteList } from "../format/output.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";
import { buildWhereClause } from "../search/filter.js";

interface LsOptions {
	type?: string;
	project?: string;
	area?: string;
	status?: string;
	sort?: string;
	recent?: boolean;
	limit?: number;
	output?: string;
}

export function lsCommand(options: LsOptions): void {
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

	const where = buildWhereClause({
		type: options.type,
		project: options.project,
		area: options.area,
		status: options.status,
	});

	let sortField = "n.modified_at";
	if (options.sort === "created") sortField = "n.created_at";
	else if (options.sort === "title") sortField = "n.title";
	else if (options.sort === "path") sortField = "n.path";

	const sortDir = options.recent || !options.sort ? "DESC" : "ASC";
	const limit = options.limit ?? 50;

	const sql = `
		SELECT n.path, n.title, n.type, n.project, n.status, n.modified_at
		FROM notes n
		${where.sql}
		ORDER BY ${sortField} ${sortDir}
		LIMIT ?
	`;

	const rows = db.prepare(sql).all(...where.params, limit) as Array<{
		path: string;
		title: string;
		type: string | null;
		project: string | null;
		status: string | null;
		modified_at: string | null;
	}>;

	db.close();

	const format = (options.output ?? "compact") as OutputFormat;
	console.log(formatNoteList(rows, format));
}
