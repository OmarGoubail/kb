import { existsSync } from "node:fs";
import { join } from "node:path";
import { getConfigPath, getDbPath, getKBDir, loadConfig } from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";
import { getAllNotes } from "../db/notes.js";
import { parseFrontmatter } from "../frontmatter/parser.js";
import { validateFrontmatter } from "../frontmatter/validator.js";
import { listMarkdownFiles, readFile } from "../fs/reader.js";
import { gitInit } from "../git/operations.js";
import { indexFiles } from "../indexer/pipeline.js";
import { scanFiles } from "../indexer/scanner.js";
import { parseFilename } from "../naming/parser.js";

interface DoctorOptions {
	fix?: boolean;
}

interface Check {
	name: string;
	status: "pass" | "fail" | "warn";
	message: string;
}

export function doctorCommand(options: DoctorOptions): void {
	const configResult = loadConfig();
	if (!configResult.success) {
		console.error(configResult.error);
		process.exit(1);
	}

	const { config, root } = configResult;
	const checks: Check[] = [];

	// 1. Check .kb directory
	const kbDir = getKBDir(root);
	checks.push({
		name: ".kb directory",
		status: existsSync(kbDir) ? "pass" : "fail",
		message: existsSync(kbDir) ? "exists" : "missing",
	});

	// 2. Check config
	checks.push({
		name: "config.json",
		status: existsSync(getConfigPath(root)) ? "pass" : "fail",
		message: "valid",
	});

	// 3. Check database
	const dbPath = getDbPath(root);
	const dbExists = existsSync(dbPath);
	checks.push({
		name: "index.db",
		status: dbExists ? "pass" : "warn",
		message: dbExists ? "exists" : "missing (will create on next index)",
	});

	// 4. Check git
	const hasGit = existsSync(join(root, ".git"));
	if (!hasGit && options.fix) {
		gitInit(root);
		checks.push({ name: "git repo", status: "pass", message: "initialized (fixed)" });
	} else {
		checks.push({
			name: "git repo",
			status: hasGit ? "pass" : "warn",
			message: hasGit ? "initialized" : "not initialized",
		});
	}

	// 5. Check files
	const files = listMarkdownFiles(root);
	checks.push({
		name: "markdown files",
		status: "pass",
		message: `${files.length} found`,
	});

	// 6. Validate frontmatter
	let fmErrors = 0;
	let namingErrors = 0;
	for (const filename of files) {
		const content = readFile(join(root, filename));
		const fm = parseFrontmatter(content);
		if (fm.success && Object.keys(fm.data).length > 0) {
			const validation = validateFrontmatter(fm.data, config.schemas);
			if (!validation.valid) fmErrors++;
		}

		const parsed = parseFilename(filename, config.naming);
		if (!parsed) namingErrors++;
	}

	checks.push({
		name: "frontmatter",
		status: fmErrors === 0 ? "pass" : "warn",
		message: fmErrors === 0 ? "all valid" : `${fmErrors} file(s) with issues`,
	});

	checks.push({
		name: "naming conventions",
		status: namingErrors === 0 ? "pass" : "warn",
		message: namingErrors === 0 ? "all valid" : `${namingErrors} file(s) don't match patterns`,
	});

	// 7. Check index sync
	if (dbExists) {
		const db = openDatabase(dbPath);
		initializeSchema(db);
		const dbNotes = getAllNotes(db);
		const orphaned = dbNotes.filter((n) => !files.includes(n.path));

		if (orphaned.length > 0 && options.fix) {
			const scanned = scanFiles(root);
			indexFiles(db, scanned, config, { full: true });
			checks.push({
				name: "index sync",
				status: "pass",
				message: `reindexed (${orphaned.length} orphaned entries cleaned)`,
			});
		} else {
			checks.push({
				name: "index sync",
				status: orphaned.length === 0 ? "pass" : "warn",
				message:
					orphaned.length === 0
						? "in sync"
						: `${orphaned.length} orphaned entries (run --fix to clean)`,
			});
		}
		db.close();
	}

	// Print results
	const maxName = Math.max(...checks.map((c) => c.name.length));
	for (const check of checks) {
		const icon = check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "✗";
		const pad = check.name.padEnd(maxName + 2);
		console.log(`  ${icon} ${pad}${check.message}`);
	}

	const failed = checks.filter((c) => c.status === "fail");
	const warned = checks.filter((c) => c.status === "warn");

	if (failed.length > 0) {
		console.log(`\n${failed.length} check(s) failed.`);
		process.exit(1);
	}
	if (warned.length > 0 && !options.fix) {
		console.log(`\n${warned.length} warning(s). Run with --fix to resolve.`);
	} else {
		console.log("\nAll checks passed.");
	}
}
