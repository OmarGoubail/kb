import { getDbPath, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";
import { resolveLink } from "../resolve/link-resolver.js";

export function resolveCommand(target: string): void {
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

	// Strip [[ ]] if present
	const cleaned = target.replace(/^\[\[/, "").replace(/\]\]$/, "");

	const result = resolveLink(cleaned, db, config.linking);
	db.close();

	if (result.resolvedPath) {
		console.log(`${result.target} → ${result.resolvedPath}`);
		console.log(`  Strategy: ${result.strategy}`);
	} else {
		console.log(`${result.target} → (not found)`);
		console.log("  No match found with any resolution strategy.");
		process.exit(1);
	}
}
