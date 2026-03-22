import { join } from "node:path";
import { loadConfig } from "../config/loader.js";
import type { NoteData, NoteType } from "../config/types.js";
import { atomicWriteSync } from "../fs/atomic-write.js";
import { fileExists, listMarkdownFiles } from "../fs/reader.js";
import { gitCommit } from "../git/operations.js";
import { generateFilename, getCurrentDate } from "../naming/generator.js";
import { renderTemplate } from "../template/renderer.js";

interface AddOptions {
	project?: string;
	area?: string;
	status?: string;
	id?: string;
	name?: string;
	source?: string;
	url?: string;
	content?: string;
	dryRun?: boolean;
}

export function addCommand(type: string, title: string, options: AddOptions): void {
	const configResult = loadConfig();
	if (!configResult.success) {
		console.error(configResult.error);
		process.exit(1);
	}

	const { config, root } = configResult;

	// Validate type
	const validTypes = config.schemas.default?.enums?.type;
	if (validTypes && !validTypes.includes(type)) {
		console.error(`Invalid type "${type}". Valid types: ${validTypes.join(", ")}`);
		process.exit(1);
	}

	// Build note data
	const today = getCurrentDate();
	const schemaConfig = config.schemas[type] ?? config.schemas.default;
	const defaults = {
		...config.schemas.default?.defaults,
		...schemaConfig?.defaults,
	};

	const noteData: NoteData = {
		type: type as NoteType,
		title,
		date: today,
		project: options.project ?? defaults.project ?? "",
		area: options.area ?? defaults.area ?? "",
		status: options.status ?? defaults.status ?? "active",
		id: options.id,
		name: options.name ?? title,
		source: options.source ?? defaults.source,
		url: options.url,
		created: today,
	};

	// Replace {{today}} in defaults
	if (noteData.created === "{{today}}") {
		noteData.created = today;
	}

	// Generate filename
	const existingFiles = listMarkdownFiles(root);
	const { filename, vars: generatedVars } = generateFilename(
		noteData,
		config.naming,
		existingFiles,
	);

	// Get template
	const templateConfig = config.templates.types[type] ?? config.templates.types.default;
	if (!templateConfig) {
		console.error(`No template found for type "${type}"`);
		process.exit(1);
	}

	// Build template variables (merge note data with generated vars like sequence)
	const templateVars: Record<string, string | number | undefined> = {
		...noteData,
		...generatedVars,
		created: today,
	};

	// Render content
	let content = renderTemplate(templateConfig.content, templateVars);

	// Append user content if provided
	if (options.content) {
		content = `${content.trimEnd()}\n\n${options.content}\n`;
	}

	const filePath = join(root, filename);

	if (options.dryRun) {
		console.log(`Would create: ${filePath}`);
		console.log("---");
		console.log(content);
		return;
	}

	if (fileExists(filePath)) {
		console.error(`File already exists: ${filePath}`);
		process.exit(1);
	}

	atomicWriteSync(filePath, content);
	gitCommit(root, filename, `kb: add ${type} "${title}"`);
	console.log(`Created: ${filename}`);
}
