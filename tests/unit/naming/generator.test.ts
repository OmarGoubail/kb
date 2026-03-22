import { describe, expect, it } from "bun:test";
import { createDefaultConfig } from "../../../src/config/defaults.js";
import type { NoteData } from "../../../src/config/types.js";
import { generateFilename } from "../../../src/naming/generator.js";

const config = createDefaultConfig("/tmp/test").naming;

function makeData(overrides: Partial<NoteData> = {}): NoteData {
	return {
		type: "project",
		title: "Test Project",
		date: "2026-03-22",
		...overrides,
	};
}

describe("generateFilename", () => {
	it("generates project filename", () => {
		const result = generateFilename(makeData(), config);
		expect(result.filename).toBe("project-test-project.md");
	});

	it("generates session filename with date and sequence", () => {
		const result = generateFilename(makeData({ type: "session", title: "Auth Refactor" }), config);
		expect(result.filename).toBe("session-2026-03-22-001-auth-refactor.md");
		expect(result.vars.sequence).toBe(1);
	});

	it("increments session sequence based on existing files", () => {
		const existing = ["session-2026-03-22-001-first.md", "session-2026-03-22-002-second.md"];
		const result = generateFilename(
			makeData({ type: "session", title: "Third" }),
			config,
			existing,
		);
		expect(result.filename).toBe("session-2026-03-22-003-third.md");
	});

	it("generates task filename with id", () => {
		const result = generateFilename(
			makeData({ type: "task", title: "Fix Auth Bug", id: "JMP-123" }),
			config,
		);
		expect(result.filename).toBe("task-JMP-123-fix-auth-bug.md");
	});

	it("uses fallback pattern for task without id", () => {
		const result = generateFilename(makeData({ type: "task", title: "Setup CI" }), config);
		expect(result.filename).toBe("task-2026-03-22-setup-ci.md");
	});

	it("generates decision filename", () => {
		const result = generateFilename(
			makeData({ type: "decision", title: "Use JWT Not Sessions" }),
			config,
		);
		expect(result.filename).toBe("decision-2026-03-22-use-jwt-not-sessions.md");
	});

	it("generates MOC filename", () => {
		const result = generateFilename(makeData({ type: "MOC", title: "Active Projects" }), config);
		expect(result.filename).toBe("MOC-active-projects.md");
	});

	it("generates area filename", () => {
		const result = generateFilename(makeData({ type: "area", title: "Authentication" }), config);
		expect(result.filename).toBe("area-authentication.md");
	});

	it("truncates long slugs", () => {
		const result = generateFilename(
			makeData({
				title:
					"This is an extremely long title that should definitely be truncated at a word boundary",
			}),
			config,
		);
		const slug = result.filename.replace("project-", "").replace(".md", "");
		expect(slug.length).toBeLessThanOrEqual(50);
	});
});
