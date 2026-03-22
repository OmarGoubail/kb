import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { kbConfigSchema } from "./schema.js";
import type { KBConfig } from "./types.js";

const KB_DIR = ".kb";
const CONFIG_FILE = "config.json";

export function resolveKBRoot(startPath?: string): string | null {
	let current = resolve(startPath ?? process.cwd());
	const root = dirname(current);

	while (current !== root) {
		if (existsSync(join(current, KB_DIR, CONFIG_FILE))) {
			return current;
		}
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}

	// Check root as well
	if (existsSync(join(current, KB_DIR, CONFIG_FILE))) {
		return current;
	}

	return null;
}

export function getConfigPath(kbRoot: string): string {
	return join(kbRoot, KB_DIR, CONFIG_FILE);
}

export function getDbPath(kbRoot: string): string {
	return join(kbRoot, KB_DIR, "index.db");
}

export function getKBDir(kbRoot: string): string {
	return join(kbRoot, KB_DIR);
}

export interface LoadConfigResult {
	success: true;
	config: KBConfig;
	root: string;
}

export interface LoadConfigError {
	success: false;
	error: string;
}

export function loadConfigFromPath(configPath: string): LoadConfigResult | LoadConfigError {
	try {
		if (!existsSync(configPath)) {
			return { success: false, error: `Config file not found: ${configPath}` };
		}

		const { readFileSync } = require("node:fs");
		const text = readFileSync(configPath, "utf-8") as string;
		const json = JSON.parse(text);
		const result = kbConfigSchema.safeParse(json);

		if (!result.success) {
			const errors = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
			return {
				success: false,
				error: `Invalid config:\n${errors.join("\n")}`,
			};
		}

		return {
			success: true,
			config: result.data as KBConfig,
			root: dirname(dirname(configPath)),
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { success: false, error: `Failed to load config: ${message}` };
	}
}

export function loadConfig(startPath?: string): LoadConfigResult | LoadConfigError {
	const kbRoot = resolveKBRoot(startPath);
	if (!kbRoot) {
		return {
			success: false,
			error: "Not inside a knowledge base. Run `kb init` first.",
		};
	}

	return loadConfigFromPath(getConfigPath(kbRoot));
}
