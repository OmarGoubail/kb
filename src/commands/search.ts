import type { Database } from "bun:sqlite";
import { getDbPath, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";
import type { OutputFormat } from "../format/output.js";
import { formatResults } from "../format/output.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";
import { buildWhereClause } from "../search/filter.js";
import { buildFTSQuery } from "../search/query.js";
import type { RawSearchResult } from "../search/ranking.js";
import { applyBoosts } from "../search/ranking.js";

interface SearchOptions {
	type?: string;
	project?: string;
	area?: string;
	status?: string;
	tag?: string;
	createdAfter?: string;
	createdBefore?: string;
	limit?: number;
	output?: string;
}

export function searchCommand(query: string, options: SearchOptions): void {
	const configResult = loadConfig();
	if (!configResult.success) {
		console.error(configResult.error);
		process.exit(1);
	}

	const { config, root } = configResult;
	const dbPath = getDbPath(root);
	const db = openDatabase(dbPath);
	initializeSchema(db);

	// Auto-index before searching
	const files = scanFiles(root);
	indexFiles(db, files, config);

	const ftsQuery = buildFTSQuery(query);
	if (!ftsQuery) {
		console.error("Empty query.");
		db.close();
		process.exit(1);
	}

	const limit = options.limit ?? config.search.default_limit;
	const where = buildWhereClause({
		type: options.type,
		project: options.project,
		area: options.area,
		status: options.status,
		tag: options.tag,
		createdAfter: options.createdAfter,
		createdBefore: options.createdBefore,
	});

	// Execute FTS5 search with filters
	const sql = `
		SELECT n.id, n.path, n.title, n.content, n.type, n.project, n.area, n.status,
			   n.created_at, n.modified_at, rank AS bm25_score
		FROM notes_fts fts
		JOIN notes n ON fts.rowid = n.id
		${where.sql}
		${where.sql ? "AND" : "WHERE"} notes_fts MATCH ?
		ORDER BY rank
		LIMIT ?
	`;

	const params = [...where.params, ftsQuery, limit];
	const rawResults = db.prepare(sql).all(...params) as RawSearchResult[];

	// Get tags for results
	const noteTags = loadNoteTags(
		db,
		rawResults.map((r) => r.id),
	);

	// Apply boosts
	const scored = applyBoosts(rawResults, query, config.search.ranking.boosts, noteTags);
	scored.sort((a, b) => b.score - a.score);

	// Include changelog metadata
	const changelogMeta = loadLastChange(
		db,
		scored.map((r) => r.path),
	);

	db.close();

	const format = (options.output ?? "compact") as OutputFormat;
	let output = formatResults(scored, format);

	// Append changelog info in compact mode
	if (format === "compact" && changelogMeta.size > 0) {
		const lines = output.split("\n\n");
		output = lines
			.map((block) => {
				for (const [path, meta] of changelogMeta) {
					if (block.includes(path)) {
						return `${block}\n   Last: ${meta}`;
					}
				}
				return block;
			})
			.join("\n\n");
	}

	console.log(output);
}

function loadNoteTags(db: Database, noteIds: number[]): Map<number, string[]> {
	const result = new Map<number, string[]>();
	if (noteIds.length === 0) return result;

	const placeholders = noteIds.map(() => "?").join(",");
	const rows = db
		.prepare(
			`SELECT nt.note_id, t.name
			 FROM note_tags nt JOIN tags t ON nt.tag_id = t.id
			 WHERE nt.note_id IN (${placeholders})`,
		)
		.all(...noteIds) as Array<{ note_id: number; name: string }>;

	for (const row of rows) {
		const existing = result.get(row.note_id) ?? [];
		existing.push(row.name);
		result.set(row.note_id, existing);
	}

	return result;
}

function loadLastChange(db: Database, paths: string[]): Map<string, string> {
	const result = new Map<string, string>();
	if (paths.length === 0) return result;

	for (const path of paths) {
		const row = db
			.prepare(
				"SELECT action, timestamp, source_dir FROM changelog WHERE note_path = ? ORDER BY timestamp DESC LIMIT 1",
			)
			.get(path) as { action: string; timestamp: string; source_dir: string | null } | null;

		if (row) {
			const source = row.source_dir ? ` from ${row.source_dir}` : "";
			result.set(path, `${row.action}${source}`);
		}
	}

	return result;
}
