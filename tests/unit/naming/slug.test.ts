import { describe, expect, it } from "bun:test";
import { toSlug } from "../../../src/naming/slug.js";

describe("toSlug", () => {
	it("converts simple title to kebab-case", () => {
		expect(toSlug("Auth Refactor Work", "kebab-case", 50)).toBe("auth-refactor-work");
	});

	it("removes special characters", () => {
		expect(toSlug("Fix Bug #123 (urgent!)", "kebab-case", 50)).toBe("fix-bug-123-urgent");
	});

	it("handles diacritics", () => {
		expect(toSlug("café résumé", "kebab-case", 50)).toBe("cafe-resume");
	});

	it("collapses multiple spaces/hyphens", () => {
		expect(toSlug("too   many   spaces", "kebab-case", 50)).toBe("too-many-spaces");
	});

	it("trims leading/trailing hyphens", () => {
		expect(toSlug("  hello world  ", "kebab-case", 50)).toBe("hello-world");
	});

	it("converts to snake_case", () => {
		expect(toSlug("Auth Refactor", "snake_case", 50)).toBe("auth_refactor");
	});

	it("truncates at word boundary", () => {
		const slug = toSlug("this is a very long title that should be truncated", "kebab-case", 20);
		expect(slug.length).toBeLessThanOrEqual(20);
		expect(slug).toBe("this-is-a-very-long");
	});

	it("handles single word within limit", () => {
		expect(toSlug("hello", "kebab-case", 50)).toBe("hello");
	});

	it("handles empty string", () => {
		expect(toSlug("", "kebab-case", 50)).toBe("");
	});
});
