import { describe, expect, it } from "bun:test";
import { createDefaultConfig } from "../../../src/config/defaults.js";
import { applyDefaults, validateFrontmatter } from "../../../src/frontmatter/validator.js";

const schemas = createDefaultConfig("/tmp/test").schemas;

describe("validateFrontmatter", () => {
	it("validates correct frontmatter", () => {
		const data = { type: "project", status: "active", created: "2026-03-22" };
		const result = validateFrontmatter(data, schemas);

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("catches missing required fields", () => {
		const data = { type: "project" };
		const result = validateFrontmatter(data, schemas);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === "status")).toBe(true);
		expect(result.errors.some((e) => e.field === "created")).toBe(true);
	});

	it("catches invalid enum values", () => {
		const data = { type: "project", status: "invalid-status", created: "2026-03-22" };
		const result = validateFrontmatter(data, schemas);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === "status")).toBe(true);
	});

	it("validates task-specific fields via extends", () => {
		const data = {
			type: "task",
			project: "alpha",
			area: "auth",
			status: "active",
			created: "2026-03-22",
			id: "JMP-1",
			name: "fix-bug",
			source: "linear",
		};
		const result = validateFrontmatter(data, schemas, "task");

		expect(result.valid).toBe(true);
	});

	it("catches missing task-specific required fields", () => {
		const data = { type: "task", status: "active", created: "2026-03-22" };
		const result = validateFrontmatter(data, schemas, "task");

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === "id")).toBe(true);
		expect(result.errors.some((e) => e.field === "source")).toBe(true);
	});

	it("catches invalid task source enum", () => {
		const data = {
			type: "task",
			project: "alpha",
			area: "auth",
			status: "active",
			created: "2026-03-22",
			id: "JMP-1",
			name: "fix",
			source: "invalid-source",
		};
		const result = validateFrontmatter(data, schemas, "task");

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === "source")).toBe(true);
	});

	it("allows valid types from default schema", () => {
		for (const type of ["session", "project", "area", "decision", "task", "MOC"]) {
			const data = { type, status: "active", created: "2026-03-22" };
			const result = validateFrontmatter(data, schemas);
			const typeError = result.errors.find((e) => e.field === "type");
			expect(typeError).toBeUndefined();
		}
	});
});

describe("applyDefaults", () => {
	it("fills in missing default values", () => {
		const data = { type: "project" };
		const result = applyDefaults(data, schemas);

		expect(result.status).toBe("active");
		expect(result.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it("does not overwrite existing values", () => {
		const data = { type: "project", status: "blocked", created: "2026-01-01" };
		const result = applyDefaults(data, schemas);

		expect(result.status).toBe("blocked");
		expect(result.created).toBe("2026-01-01");
	});

	it("applies task-specific defaults", () => {
		const data = { type: "task" };
		const result = applyDefaults(data, schemas, "task");

		expect(result.source).toBe("personal");
		expect(result.priority).toBe("medium");
	});
});
