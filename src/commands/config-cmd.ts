import { readFileSync } from "node:fs";
import { createDefaultConfig } from "../config/defaults.js";
import { getConfigPath, loadConfig } from "../config/loader.js";
import { atomicWriteSync } from "../fs/atomic-write.js";

export function configCommand(action?: string, key?: string, value?: string): void {
	if (!action || action === "show") {
		showConfig();
		return;
	}

	switch (action) {
		case "get":
			if (!key) {
				console.error("Usage: kb config get <key>");
				process.exit(1);
			}
			getConfigValue(key);
			break;
		case "set":
			if (!key || value === undefined) {
				console.error("Usage: kb config set <key> <value>");
				process.exit(1);
			}
			setConfigValue(key, value);
			break;
		case "reset":
			resetConfig();
			break;
		case "validate":
			validateConfig();
			break;
		default:
			console.error(`Unknown config action: ${action}`);
			process.exit(1);
	}
}

function showConfig(): void {
	const result = loadConfig();
	if (!result.success) {
		console.error(result.error);
		process.exit(1);
	}
	console.log(JSON.stringify(result.config, null, 2));
}

function getConfigValue(dotPath: string): void {
	const result = loadConfig();
	if (!result.success) {
		console.error(result.error);
		process.exit(1);
	}

	const value = getByDotPath(result.config, dotPath);
	if (value === undefined) {
		console.error(`Key not found: ${dotPath}`);
		process.exit(1);
	}

	if (typeof value === "object") {
		console.log(JSON.stringify(value, null, 2));
	} else {
		console.log(String(value));
	}
}

function setConfigValue(dotPath: string, value: string): void {
	const result = loadConfig();
	if (!result.success) {
		console.error(result.error);
		process.exit(1);
	}

	const configPath = getConfigPath(result.root);
	const raw = JSON.parse(readFileSync(configPath, "utf-8"));

	// Parse value (try JSON, fall back to string)
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		parsed = value;
	}

	setByDotPath(raw, dotPath, parsed);
	atomicWriteSync(configPath, JSON.stringify(raw, null, 2));
	console.log(`Set ${dotPath} = ${JSON.stringify(parsed)}`);
}

function resetConfig(): void {
	const result = loadConfig();
	if (!result.success) {
		console.error(result.error);
		process.exit(1);
	}

	const configPath = getConfigPath(result.root);
	const defaults = createDefaultConfig(result.root);
	atomicWriteSync(configPath, JSON.stringify(defaults, null, 2));
	console.log("Config reset to defaults.");
}

function validateConfig(): void {
	const result = loadConfig();
	if (result.success) {
		console.log("Config is valid.");
	} else {
		console.error(result.error);
		process.exit(1);
	}
}

function getByDotPath(obj: unknown, path: string): unknown {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current === null || current === undefined || typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

function setByDotPath(obj: Record<string, unknown>, path: string, value: unknown): void {
	const parts = path.split(".");
	let current: Record<string, unknown> = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i] ?? "";
		if (!(part in current) || typeof current[part] !== "object") {
			current[part] = {};
		}
		current = current[part] as Record<string, unknown>;
	}
	const lastPart = parts[parts.length - 1] ?? "";
	current[lastPart] = value;
}
