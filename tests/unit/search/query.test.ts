import { describe, expect, it } from "bun:test";
import { buildFTSQuery } from "../../../src/search/query.js";

describe("buildFTSQuery", () => {
	it("builds query from single term", () => {
		const q = buildFTSQuery("auth");
		expect(q).toBe('"auth"*');
	});

	it("builds query from multiple terms", () => {
		const q = buildFTSQuery("fix auth bug");
		expect(q).toBe('"fix" "auth" "bug"*');
	});

	it("passes through quoted phrases", () => {
		const q = buildFTSQuery('"exact match"');
		expect(q).toBe('"exact match"');
	});

	it("returns empty for empty query", () => {
		expect(buildFTSQuery("")).toBe("");
		expect(buildFTSQuery("   ")).toBe("");
	});

	it("strips special characters", () => {
		const q = buildFTSQuery("auth:bug(test)");
		expect(q).toBe('"authbugtest"*');
	});
});
