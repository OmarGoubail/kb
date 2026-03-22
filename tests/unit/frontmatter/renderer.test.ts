import { describe, expect, it } from "bun:test";
import { renderFrontmatter } from "../../../src/frontmatter/renderer.js";

describe("renderFrontmatter", () => {
	it("renders simple key-value pairs", () => {
		const result = renderFrontmatter({
			type: "task",
			status: "active",
		});
		expect(result).toBe("---\ntype: task\nstatus: active\n---");
	});

	it("skips null and undefined values", () => {
		const result = renderFrontmatter({
			type: "task",
			project: null,
			area: undefined,
		});
		expect(result).toBe("---\ntype: task\n---");
	});

	it("renders arrays", () => {
		const result = renderFrontmatter({
			tags: ["auth", "bug"],
		});
		expect(result).toBe("---\ntags:\n  - auth\n  - bug\n---");
	});

	it("renders empty arrays", () => {
		const result = renderFrontmatter({ tags: [] });
		expect(result).toBe("---\ntags: []\n---");
	});

	it("quotes strings with special characters", () => {
		const result = renderFrontmatter({
			url: "https://example.com/path?q=1",
		});
		expect(result).toContain('"https://example.com/path?q=1"');
	});

	it("quotes strings that look like booleans", () => {
		const result = renderFrontmatter({ value: "true" });
		expect(result).toContain('"true"');
	});

	it("renders numbers and booleans", () => {
		const result = renderFrontmatter({
			count: 5,
			active: true,
		});
		expect(result).toBe("---\ncount: 5\nactive: true\n---");
	});
});
