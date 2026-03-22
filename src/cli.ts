#!/usr/bin/env bun
import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { initCommand } from "./commands/init.js";
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

program.parse();
