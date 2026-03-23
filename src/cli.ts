#!/usr/bin/env bun
import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { appendCommand } from "./commands/append.js";
import { configCommand } from "./commands/config-cmd.js";
import { doctorCommand } from "./commands/doctor.js";
import { historyCommand } from "./commands/history.js";
import { indexCommand } from "./commands/index.js";
import { initCommand } from "./commands/init.js";
import { lsCommand } from "./commands/ls.js";
import { primeCommand } from "./commands/prime.js";
import { resolveCommand } from "./commands/resolve.js";
import { searchCommand } from "./commands/search.js";
import { showCommand } from "./commands/show.js";
import { tagsCommand } from "./commands/tags.js";
import { templateCommand } from "./commands/template.js";
import { todayCommand } from "./commands/today.js";
import { updateCommand } from "./commands/update.js";
import { validateCommand } from "./commands/validate.js";

const program = new Command();

program.name("kb").description("Knowledge base CLI for managing markdown notes").version("0.1.0");

program
	.command("init")
	.description("Initialize a new knowledge base")
	.argument("[path]", "Target directory (defaults to current directory)")
	.action((path?: string) => {
		initCommand(path);
	});

program
	.command("add")
	.description("Create a new note from template")
	.argument("<type>", "Note type (session, project, area, decision, task, MOC)")
	.argument("<title>", "Note title")
	.option("--project <name>", "Project context")
	.option("--area <name>", "Knowledge area")
	.option("--status <status>", "Override default status")
	.option("--id <id>", "External ID (for tasks)")
	.option("--name <name>", "Short task name")
	.option("--source <source>", "Source system (linear|github|notion|personal)")
	.option("--url <url>", "External URL")
	.option("--content <text>", "Body content")
	.option("--stdin", "Read content from stdin")
	.option("--dry-run", "Preview without writing")
	.action((type: string, title: string, options) => {
		addCommand(type, title, {
			project: options.project,
			area: options.area,
			status: options.status,
			id: options.id,
			name: options.name,
			source: options.source,
			url: options.url,
			content: options.content,
			stdin: options.stdin,
			dryRun: options.dryRun,
		});
	});

program
	.command("validate")
	.description("Validate file naming and frontmatter")
	.option("--fix", "Auto-fix issues where possible")
	.action((options) => {
		validateCommand({ fix: options.fix });
	});

program
	.command("index")
	.description("Index markdown files into the search database")
	.option("--full", "Full reindex (ignore hashes)")
	.option("--status", "Show index statistics")
	.action((options) => {
		indexCommand({ full: options.full, status: options.status });
	});

program
	.command("history")
	.description("Show change history")
	.argument("[file]", "Show history for a specific file")
	.option("--source <dir>", "Filter by source directory")
	.option("--limit <n>", "Max entries to show", "20")
	.action((file: string | undefined, options) => {
		historyCommand(file, {
			source: options.source,
			limit: Number.parseInt(options.limit, 10),
		});
	});

program
	.command("search")
	.description("Search the knowledge base")
	.argument("<query>", "Search query")
	.option("--type <type>", "Filter by note type")
	.option("--project <name>", "Filter by project")
	.option("--area <name>", "Filter by area")
	.option("--status <status>", "Filter by status")
	.option("--tag <tag>", "Filter by tag")
	.option("--created-after <date>", "Filter by creation date")
	.option("--created-before <date>", "Filter by creation date")
	.option("--limit <n>", "Max results")
	.option("--output <format>", "Output format (compact|json|markdown)", "compact")
	.action((query: string, options) => {
		searchCommand(query, {
			type: options.type,
			project: options.project,
			area: options.area,
			status: options.status,
			tag: options.tag,
			createdAfter: options.createdAfter,
			createdBefore: options.createdBefore,
			limit: options.limit ? Number.parseInt(options.limit, 10) : undefined,
			output: options.output,
		});
	});

program
	.command("ls")
	.description("List notes")
	.option("--type <type>", "Filter by note type")
	.option("--project <name>", "Filter by project")
	.option("--area <name>", "Filter by area")
	.option("--status <status>", "Filter by status")
	.option("--sort <field>", "Sort by (created|modified|title|path)")
	.option("--recent", "Sort by most recently modified")
	.option("--limit <n>", "Max results")
	.option("--output <format>", "Output format (compact|json)", "compact")
	.action((options) => {
		lsCommand({
			type: options.type,
			project: options.project,
			area: options.area,
			status: options.status,
			sort: options.sort,
			recent: options.recent,
			limit: options.limit ? Number.parseInt(options.limit, 10) : undefined,
			output: options.output,
		});
	});

program
	.command("tags")
	.description("List tags or show notes with a tag")
	.argument("[tag]", "Show notes with this tag")
	.action((tag?: string) => {
		tagsCommand(tag);
	});

program
	.command("resolve")
	.description("Resolve a [[wikilink]] to a file path")
	.argument("<target>", 'Link target (e.g., "project-alpha" or "[[project-alpha]]")')
	.action((target: string) => {
		resolveCommand(target);
	});

program
	.command("config")
	.description("View or edit configuration")
	.argument("[action]", "Action: show, get, set, reset, validate")
	.argument("[key]", "Config key (dot notation)")
	.argument("[value]", "Value to set")
	.action((action?: string, key?: string, value?: string) => {
		configCommand(action, key, value);
	});

program
	.command("template")
	.description("Manage note templates")
	.argument("[action]", "Action: list, show, reset")
	.argument("[type]", "Template type name")
	.action((action?: string, type?: string) => {
		templateCommand(action, type);
	});

program
	.command("doctor")
	.description("Run diagnostics on the knowledge base")
	.option("--fix", "Auto-fix issues where possible")
	.action((options) => {
		doctorCommand({ fix: options.fix });
	});

program
	.command("prime")
	.description("Output context for AI agents")
	.action(() => {
		primeCommand();
	});

program
	.command("today")
	.description("Show today's activity across all projects")
	.action(() => {
		todayCommand();
	});

program
	.command("show")
	.description("Show a note's full content")
	.argument("<identifier>", "File path, note ID, or search term")
	.action((identifier: string) => {
		showCommand(identifier);
	});

program
	.command("update")
	.description("Update a note's frontmatter fields")
	.argument("<identifier>", "File path, note ID, or search term")
	.option("--status <status>", "Set status")
	.option("--project <name>", "Set project")
	.option("--area <name>", "Set area")
	.action((identifier: string, options) => {
		updateCommand(identifier, {
			status: options.status,
			project: options.project,
			area: options.area,
		});
	});

program
	.command("append")
	.description("Append content to an existing note")
	.argument("<identifier>", "File path, note ID, or search term")
	.option("--content <text>", "Content to append")
	.action((identifier: string, options) => {
		if (!options.content) {
			console.error("--content is required.");
			process.exit(1);
		}
		appendCommand(identifier, { content: options.content });
	});

program.parse();
