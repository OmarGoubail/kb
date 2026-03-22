import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { listMarkdownFiles } from "../fs/reader.js";

export interface ScannedFile {
	filename: string;
	path: string;
	content: string;
	contentHash: string;
	modifiedAt: string;
}

/**
 * Scans a directory for markdown files and computes content hashes.
 */
export function scanFiles(kbRoot: string): ScannedFile[] {
	const filenames = listMarkdownFiles(kbRoot);
	const results: ScannedFile[] = [];

	for (const filename of filenames) {
		const fullPath = join(kbRoot, filename);
		const content = readFileSync(fullPath, "utf-8");
		const stat = statSync(fullPath);
		const hasher = new Bun.CryptoHasher("sha256");
		hasher.update(content);
		const contentHash = hasher.digest("hex");

		results.push({
			filename,
			path: filename,
			content,
			contentHash,
			modifiedAt: stat.mtime.toISOString(),
		});
	}

	return results;
}
