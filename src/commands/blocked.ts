import { getDbPath, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { getBlockedTasks } from "../db/deps.js";
import { initializeSchema } from "../db/migrations.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";

interface BlockedOptions {
	project?: string;
	output?: string;
}

export function blockedCommand(options: BlockedOptions): void {
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

	const blocked = getBlockedTasks(db, options.project);

	db.close();

	if (options.output === "json") {
		console.log(JSON.stringify(blocked, null, 2));
		return;
	}

	if (blocked.length === 0) {
		console.log("Nothing is blocked.");
		return;
	}

	for (const item of blocked) {
		const meta = [item.type, item.project].filter(Boolean).join(" / ");
		console.log(`${item.path}  (${meta})`);
		for (const blocker of item.blockers) {
			const status = blocker.status ?? "not found";
			console.log(`  <- ${blocker.path} [${status}]`);
		}
	}
}
