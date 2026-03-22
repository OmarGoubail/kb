import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createDefaultConfig } from "../config/defaults.js";
import { loadConfig } from "../config/loader.js";
import { getKBDir } from "../config/loader.js";
import { atomicWriteSync } from "../fs/atomic-write.js";

export function templateCommand(action?: string, typeName?: string): void {
	if (!action || action === "list") {
		listTemplates();
		return;
	}

	switch (action) {
		case "show":
			if (!typeName) {
				console.error("Usage: kb template show <type>");
				process.exit(1);
			}
			showTemplate(typeName);
			break;
		case "reset":
			if (!typeName) {
				console.error("Usage: kb template reset <type>");
				process.exit(1);
			}
			resetTemplate(typeName);
			break;
		default:
			console.error(`Unknown template action: ${action}`);
			process.exit(1);
	}
}

function listTemplates(): void {
	const result = loadConfig();
	if (!result.success) {
		console.error(result.error);
		process.exit(1);
	}

	const templatesDir = join(getKBDir(result.root), "templates");
	if (!existsSync(templatesDir)) {
		console.log("No templates directory found.");
		return;
	}

	const files = readdirSync(templatesDir).filter((f) => f.endsWith(".md"));
	if (files.length === 0) {
		console.log("No templates found.");
		return;
	}

	console.log("Templates:");
	for (const file of files) {
		const typeName = file.replace(".md", "");
		const isConfigured = typeName in result.config.templates.types;
		const marker = isConfigured ? "" : " (custom)";
		console.log(`  ${typeName}${marker}`);
	}
}

function showTemplate(typeName: string): void {
	const result = loadConfig();
	if (!result.success) {
		console.error(result.error);
		process.exit(1);
	}

	// Check file on disk first
	const templatesDir = join(getKBDir(result.root), "templates");
	const filePath = join(templatesDir, `${typeName}.md`);

	if (existsSync(filePath)) {
		console.log(readFileSync(filePath, "utf-8"));
		return;
	}

	// Fall back to config
	const tmpl = result.config.templates.types[typeName];
	if (tmpl) {
		console.log(tmpl.content);
		return;
	}

	console.error(`No template found for type "${typeName}".`);
	process.exit(1);
}

function resetTemplate(typeName: string): void {
	const result = loadConfig();
	if (!result.success) {
		console.error(result.error);
		process.exit(1);
	}

	const defaults = createDefaultConfig(result.root);
	const defaultTmpl = defaults.templates.types[typeName];
	if (!defaultTmpl) {
		console.error(`No default template for type "${typeName}".`);
		process.exit(1);
	}

	const templatesDir = join(getKBDir(result.root), "templates");
	const filePath = join(templatesDir, defaultTmpl.filename);
	atomicWriteSync(filePath, defaultTmpl.content);
	console.log(`Reset template "${typeName}" to default.`);
}
