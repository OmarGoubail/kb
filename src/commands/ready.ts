import { getDbPath, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { getBlockedTasks, getReadyTasks } from "../db/deps.js";
import { initializeSchema } from "../db/migrations.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";

interface ReadyOptions {
	project?: string;
	output?: string;
}

export function readyCommand(options: ReadyOptions): void {
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

	const ready = getReadyTasks(db, options.project);
	const blocked = getBlockedTasks(db, options.project);

	db.close();

	if (options.output === "json") {
		console.log(JSON.stringify({ ready, blocked }, null, 2));
		return;
	}

	if (ready.length > 0) {
		console.log("Ready:");
		for (const task of ready) {
			const proj = task.project ? ` [${task.project}]` : "";
			console.log(`  ${task.path}${proj}`);
		}
	} else {
		console.log("Ready: (none)");
	}

	if (blocked.length > 0) {
		console.log("\nBlocked:");
		for (const task of blocked) {
			const proj = task.project ? ` [${task.project}]` : "";
			console.log(`  ${task.path}${proj}`);
			for (const blocker of task.blockers) {
				const status = blocker.status ?? "unknown";
				console.log(`    <- ${blocker.path} [${status}]`);
			}
		}
	}
}
