import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { kbConfigSchema } from "./schema.js";
import type { KBConfig } from "./types.js";

const KB_DIR = ".kb";
const CONFIG_FILE = "config.json";

function getGlobalConfigDir(): string {
	return process.env.KB_GLOBAL_CONFIG_DIR ?? join(homedir(), ".config", "kb");
}

function getGlobalConfigFile(): string {
	return join(getGlobalConfigDir(), "config.json");
}

interface GlobalConfig {
	default_kb: string;
}

// --- Global config (stores which KB to use) ---

export function getGlobalConfigPath(): string {
	return getGlobalConfigFile();
}

export function loadGlobalConfig(): GlobalConfig | null {
	if (!existsSync(getGlobalConfigFile())) return null;
	try {
		const text = readFileSync(getGlobalConfigFile(), "utf-8");
		return JSON.parse(text) as GlobalConfig;
	} catch {
		return null;
	}
}

export function saveGlobalConfig(config: GlobalConfig): void {
	mkdirSync(getGlobalConfigDir(), { recursive: true });
	writeFileSync(getGlobalConfigFile(), JSON.stringify(config, null, 2), "utf-8");
}

// --- KB root resolution ---

/**
 * Resolves the KB root directory. Priority:
 * 1. Explicit path argument
 * 2. Global config (~/.config/kb/config.json → default_kb)
 * 3. Walk up from cwd looking for .kb/config.json
 */
export function resolveKBRoot(explicitPath?: string): string | null {
	// 1. Explicit path
	if (explicitPath) {
		const resolved = resolve(explicitPath);
		if (existsSync(join(resolved, KB_DIR, CONFIG_FILE))) {
			return resolved;
		}
		return null;
	}

	// 2. Global config
	const global = loadGlobalConfig();
	if (global?.default_kb) {
		const resolved = resolve(global.default_kb);
		if (existsSync(join(resolved, KB_DIR, CONFIG_FILE))) {
			return resolved;
		}
	}

	// 3. Walk up from cwd
	let current = resolve(process.cwd());
	while (true) {
		if (existsSync(join(current, KB_DIR, CONFIG_FILE))) {
			return current;
		}
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}

	return null;
}

// --- KB path helpers ---

export function getConfigPath(kbRoot: string): string {
	return join(kbRoot, KB_DIR, CONFIG_FILE);
}

export function getDbPath(kbRoot: string): string {
	return join(kbRoot, KB_DIR, "index.db");
}

export function getKBDir(kbRoot: string): string {
	return join(kbRoot, KB_DIR);
}

// --- Config loading ---

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

		const text = readFileSync(configPath, "utf-8");
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
			error: "No knowledge base found. Run `kb init <path>` first.",
		};
	}

	return loadConfigFromPath(getConfigPath(kbRoot));
}
