import type { Database } from "bun:sqlite";
import type { KBConfig } from "../config/types.js";
import { parseLinks } from "../content/link-parser.js";
import { extractTags } from "../content/tag-extractor.js";
import { logChange } from "../db/changelog.js";
import { syncLinks } from "../db/links.js";
import { deleteNote, getAllNotes, getNoteByPath, upsertNote } from "../db/notes.js";
import { syncTags } from "../db/tags.js";
import { parseFrontmatter } from "../frontmatter/parser.js";
import { detectGitContext } from "../git/context.js";
import type { ScannedFile } from "./scanner.js";

export interface IndexStats {
	added: number;
	updated: number;
	deleted: number;
	unchanged: number;
	errors: number;
}

/**
 * Indexes a set of scanned files into the database.
 * Handles inserts, updates (hash-based), and deletions.
 */
export function indexFiles(
	db: Database,
	files: ScannedFile[],
	config: KBConfig,
	options: { full?: boolean } = {},
): IndexStats {
	const stats: IndexStats = { added: 0, updated: 0, deleted: 0, unchanged: 0, errors: 0 };
	const sourceDir = process.cwd();
	const gitCtx = detectGitContext(sourceDir);
	const now = new Date().toISOString();

	const scannedPaths = new Set(files.map((f) => f.path));

	// Process each scanned file
	for (const file of files) {
		try {
			const existing = getNoteByPath(db, file.path);

			// Skip if hash unchanged (incremental mode)
			if (!options.full && existing?.content_hash === file.contentHash) {
				stats.unchanged++;
				continue;
			}

			// Parse frontmatter
			const fmResult = parseFrontmatter(file.content);
			if (!fmResult.success) {
				stats.errors++;
				continue;
			}

			const fm = fmResult.data;
			const title = extractTitle(fmResult.body, file.filename);

			// Upsert note
			const prevHash = existing?.content_hash ?? null;
			const noteId = upsertNote(db, {
				path: file.path,
				title,
				content: fmResult.body,
				type: (fm.type as string) ?? null,
				project: (fm.project as string) ?? null,
				area: (fm.area as string) ?? null,
				status: (fm.status as string) ?? null,
				created_at: (fm.created as string) ?? null,
				modified_at: file.modifiedAt,
				content_hash: file.contentHash,
			});

			// Extract and sync tags
			const tags = extractTags(fmResult.body, fm.tags, config.indexing.parser.tag_pattern);
			syncTags(db, noteId, tags);

			// Extract and sync links
			const links = parseLinks(fmResult.body, config.indexing.parser.wikilink_pattern);
			syncLinks(db, noteId, links);

			// Log changelog
			const action = existing ? "update" : "create";
			logChange(db, {
				note_path: file.path,
				action,
				timestamp: now,
				source_dir: sourceDir,
				source_repo: gitCtx.repo,
				source_branch: gitCtx.branch,
				agent: process.env.KB_AGENT ?? null,
				summary: existing ? "content changed" : "file created",
				content_hash: file.contentHash,
				prev_hash: prevHash,
			});

			if (existing) {
				stats.updated++;
			} else {
				stats.added++;
			}
		} catch {
			stats.errors++;
		}
	}

	// Delete notes for files that no longer exist on disk
	const allNotes = getAllNotes(db);
	for (const note of allNotes) {
		if (!scannedPaths.has(note.path)) {
			logChange(db, {
				note_path: note.path,
				action: "delete",
				timestamp: now,
				source_dir: sourceDir,
				source_repo: gitCtx.repo,
				source_branch: gitCtx.branch,
				agent: process.env.KB_AGENT ?? null,
				summary: "file deleted",
				content_hash: null,
				prev_hash: note.content_hash,
			});
			deleteNote(db, note.path);
			stats.deleted++;
		}
	}

	return stats;
}

/**
 * Extracts a display title from body content or filename.
 * Looks for the first # heading, falls back to filename.
 */
function extractTitle(body: string, filename: string): string {
	const headingMatch = body.match(/^#\s+(.+)$/m);
	if (headingMatch?.[1]) {
		return headingMatch[1].trim();
	}
	// Strip extension and type prefix
	return filename.replace(/\.md$/, "").replace(/^[a-zA-Z]+-/, "");
}
