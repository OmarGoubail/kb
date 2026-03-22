import { join } from "node:path";
import { loadConfig } from "../config/loader.js";
import { parseFrontmatter } from "../frontmatter/parser.js";
import { renderFrontmatter } from "../frontmatter/renderer.js";
import { applyDefaults, validateFrontmatter } from "../frontmatter/validator.js";
import { atomicWriteSync } from "../fs/atomic-write.js";
import { listMarkdownFiles, readFile } from "../fs/reader.js";
import { gitCommitAll } from "../git/operations.js";
import { parseFilename } from "../naming/parser.js";

interface ValidateOptions {
	fix?: boolean;
}

interface FileIssue {
	file: string;
	issues: string[];
	fixable: boolean;
}

export function validateCommand(options: ValidateOptions): void {
	const configResult = loadConfig();
	if (!configResult.success) {
		console.error(configResult.error);
		process.exit(1);
	}

	const { config, root } = configResult;
	const files = listMarkdownFiles(root);

	if (files.length === 0) {
		console.log("No markdown files found.");
		return;
	}

	const allIssues: FileIssue[] = [];
	let fixedCount = 0;

	for (const filename of files) {
		const filePath = join(root, filename);
		const content = readFile(filePath);
		const fileIssues: string[] = [];
		let fixable = false;

		// 1. Check filename matches a known pattern
		const parsed = parseFilename(filename, config.naming);
		if (!parsed) {
			fileIssues.push("Filename does not match any naming pattern");
		}

		// 2. Parse frontmatter
		const fmResult = parseFrontmatter(content);
		if (!fmResult.success) {
			fileIssues.push(`Frontmatter parse error: ${fmResult.error}`);
			allIssues.push({ file: filename, issues: fileIssues, fixable: false });
			continue;
		}

		if (Object.keys(fmResult.data).length === 0) {
			fileIssues.push("No frontmatter found");
			allIssues.push({ file: filename, issues: fileIssues, fixable: false });
			continue;
		}

		// 3. Validate frontmatter
		const type = fmResult.data.type as string | undefined;
		const validation = validateFrontmatter(fmResult.data, config.schemas, type);

		for (const error of validation.errors) {
			fileIssues.push(`${error.field}: ${error.message}`);
		}

		// 4. Check for missing defaults that could be fixed
		if (!validation.valid && options.fix) {
			const fixed = applyDefaults(fmResult.data, config.schemas, type);
			const revalidation = validateFrontmatter(fixed, config.schemas, type);

			// Only fix if applying defaults resolves some errors
			if (revalidation.errors.length < validation.errors.length) {
				const newFrontmatter = renderFrontmatter(fixed);
				const newContent = `${newFrontmatter}\n${fmResult.body}`;
				atomicWriteSync(filePath, newContent);
				fixedCount++;
				fixable = true;
			}
		} else if (!validation.valid) {
			// Check if defaults would help
			const fixed = applyDefaults(fmResult.data, config.schemas, type);
			const revalidation = validateFrontmatter(fixed, config.schemas, type);
			if (revalidation.errors.length < validation.errors.length) {
				fixable = true;
			}
		}

		if (fileIssues.length > 0) {
			allIssues.push({ file: filename, issues: fileIssues, fixable });
		}
	}

	// Print results
	if (allIssues.length === 0) {
		console.log(`Validated ${files.length} files. All good.`);
		return;
	}

	for (const { file, issues, fixable } of allIssues) {
		const fixTag = fixable ? " (fixable)" : "";
		console.log(`\n${file}${fixTag}:`);
		for (const issue of issues) {
			console.log(`  - ${issue}`);
		}
	}

	const issueCount = allIssues.reduce((sum, f) => sum + f.issues.length, 0);
	console.log(
		`\n${issueCount} issue(s) in ${allIssues.length} file(s) out of ${files.length} checked.`,
	);

	if (fixedCount > 0) {
		gitCommitAll(root, `kb: validate --fix (${fixedCount} files)`);
		console.log(`Fixed ${fixedCount} file(s).`);
	} else if (allIssues.some((f) => f.fixable)) {
		console.log("Run with --fix to auto-fix issues where possible.");
	}

	process.exit(1);
}
