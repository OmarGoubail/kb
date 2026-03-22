import { describe, expect, it } from "bun:test";
import { parseFrontmatter } from "../../../src/frontmatter/parser.js";

describe("parseFrontmatter", () => {
	it("parses valid frontmatter", () => {
		const content = "---\ntype: task\nstatus: active\n---\n\n# Hello\n";
		const result = parseFrontmatter(content);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.type).toBe("task");
			expect(result.data.status).toBe("active");
			expect(result.body).toBe("\n# Hello\n");
		}
	});

	it("returns empty data when no frontmatter", () => {
		const result = parseFrontmatter("# Just a heading\n\nSome content.");

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({});
			expect(result.body).toContain("# Just a heading");
		}
	});

	it("handles empty frontmatter", () => {
		const result = parseFrontmatter("---\n---\n\nContent.");

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({});
		}
	});

	it("errors on unclosed frontmatter", () => {
		const result = parseFrontmatter("---\ntype: task\nno closing");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("closing delimiter");
		}
	});

	it("errors on non-mapping YAML", () => {
		const result = parseFrontmatter("---\n- item1\n- item2\n---\n");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("mapping");
		}
	});

	it("handles complex frontmatter values", () => {
		const content = "---\ntype: task\ntags:\n  - auth\n  - bug\ncreated: 2026-03-22\n---\n";
		const result = parseFrontmatter(content);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.tags).toEqual(["auth", "bug"]);
			expect(result.data.created).toBe("2026-03-22");
		}
	});

	it("preserves body content after frontmatter", () => {
		const content = "---\ntype: session\n---\n\n# Session\n\nSome work done.\n\n## Links\n";
		const result = parseFrontmatter(content);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.body).toContain("# Session");
			expect(result.body).toContain("## Links");
		}
	});
});
