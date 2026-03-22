import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createDefaultConfig } from "../config/defaults.js";
import {
	getConfigPath,
	getDbPath,
	getGlobalConfigPath,
	getKBDir,
	saveGlobalConfig,
} from "../config/loader.js";
import { openDatabase } from "../db/connection.js";
import { initializeSchema } from "../db/migrations.js";
import { gitInit } from "../git/operations.js";

export function initCommand(targetPath?: string): void {
	const kbRoot = resolve(targetPath ?? process.cwd());

	const kbDir = getKBDir(kbRoot);
	const configPath = getConfigPath(kbRoot);
	const dbPath = getDbPath(kbRoot);
	const templatesDir = resolve(kbDir, "templates");

	if (existsSync(configPath)) {
		console.error(`Knowledge base already exists at ${kbRoot}`);
		process.exit(1);
	}

	// Create directories
	mkdirSync(kbDir, { recursive: true });
	mkdirSync(templatesDir, { recursive: true });

	// Write default config
	const config = createDefaultConfig(kbRoot);
	writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

	// Write template files
	for (const [_typeName, tmpl] of Object.entries(config.templates.types)) {
		const templatePath = resolve(templatesDir, tmpl.filename);
		writeFileSync(templatePath, tmpl.content, "utf-8");
	}

	// Initialize database
	const db = openDatabase(dbPath);
	initializeSchema(db);
	db.close();

	// Initialize git repo
	const gitInitialized = gitInit(kbRoot);

	// Register as default KB in global config
	saveGlobalConfig({ default_kb: kbRoot });

	console.log(`Initialized knowledge base at ${kbRoot}`);
	console.log(`  Config: ${configPath}`);
	console.log(`  Database: ${dbPath}`);
	console.log(`  Git: ${gitInitialized ? "initialized" : "skipped"}`);
	console.log(`  Global: ${getGlobalConfigPath()}`);
}
