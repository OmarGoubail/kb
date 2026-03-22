import { describe, expect, it } from "bun:test";
import { extractTags } from "../../../src/content/tag-extractor.js";

const pattern = "#([a-zA-Z0-9_-]+)";

describe("extractTags", () => {
	it("extracts inline tags from body", () => {
		const tags = extractTags("Working on #auth and #security", undefined, pattern);
		expect(tags).toEqual(["auth", "security"]);
	});

	it("deduplicates tags", () => {
		const tags = extractTags("#auth stuff #auth again", undefined, pattern);
		expect(tags).toEqual(["auth"]);
	});

	it("normalizes to lowercase", () => {
		const tags = extractTags("#Auth #SECURITY", undefined, pattern);
		expect(tags).toEqual(["auth", "security"]);
	});

	it("merges frontmatter tags", () => {
		const tags = extractTags("#inline", ["frontmatter-tag"], pattern);
		expect(tags).toEqual(["frontmatter-tag", "inline"]);
	});

	it("deduplicates across sources", () => {
		const tags = extractTags("#auth", ["auth", "bug"], pattern);
		expect(tags).toEqual(["auth", "bug"]);
	});

	it("returns empty array for no tags", () => {
		const tags = extractTags("No tags here", undefined, pattern);
		expect(tags).toEqual([]);
	});

	it("handles tags with hyphens and underscores", () => {
		const tags = extractTags("#my-tag #another_tag", undefined, pattern);
		expect(tags).toEqual(["another_tag", "my-tag"]);
	});

	it("ignores non-array frontmatter tags", () => {
		const tags = extractTags("", "not-an-array", pattern);
		expect(tags).toEqual([]);
	});
});
