import { renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Writes content to a file atomically by writing to a temp file first,
 * then renaming. This prevents partial writes on crash.
 */
export function atomicWriteSync(filePath: string, content: string): void {
	const dir = dirname(filePath);
	const tmpPath = join(dir, `.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);

	try {
		writeFileSync(tmpPath, content, "utf-8");
		renameSync(tmpPath, filePath);
	} catch (err) {
		// Clean up temp file on failure
		try {
			unlinkSync(tmpPath);
		} catch {
			// ignore cleanup errors
		}
		throw err;
	}
}
