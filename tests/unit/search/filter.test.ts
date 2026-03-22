import { describe, expect, it } from "bun:test";
import { buildWhereClause } from "../../../src/search/filter.js";

describe("buildWhereClause", () => {
	it("returns empty for no filters", () => {
		const { sql, params } = buildWhereClause({});
		expect(sql).toBe("");
		expect(params).toEqual([]);
	});

	it("builds single filter", () => {
		const { sql, params } = buildWhereClause({ type: "task" });
		expect(sql).toContain("n.type = ?");
		expect(params).toEqual(["task"]);
	});

	it("builds multiple filters with AND", () => {
		const { sql, params } = buildWhereClause({ type: "task", project: "alpha", status: "active" });
		expect(sql).toContain("AND");
		expect(params).toEqual(["task", "alpha", "active"]);
	});

	it("builds tag filter with subquery", () => {
		const { sql, params } = buildWhereClause({ tag: "auth" });
		expect(sql).toContain("note_tags");
		expect(params).toEqual(["auth"]);
	});

	it("builds date range filters", () => {
		const { sql, params } = buildWhereClause({
			createdAfter: "2026-01-01",
			createdBefore: "2026-12-31",
		});
		expect(sql).toContain("n.created_at >=");
		expect(sql).toContain("n.created_at <=");
		expect(params).toEqual(["2026-01-01", "2026-12-31"]);
	});
});
