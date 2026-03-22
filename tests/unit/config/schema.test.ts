import { describe, expect, it } from "bun:test";
import { createDefaultConfig } from "../../../src/config/defaults.js";
import { kbConfigSchema } from "../../../src/config/schema.js";

describe("kbConfigSchema", () => {
	it("validates default config", () => {
		const config = createDefaultConfig("/tmp/test");
		const result = kbConfigSchema.safeParse(config);
		expect(result.success).toBe(true);
	});

	it("rejects config without version", () => {
		const result = kbConfigSchema.safeParse({
			vault: { path: "/tmp", created: "2026-01-01" },
		});
		expect(result.success).toBe(false);
	});

	it("rejects config without vault", () => {
		const result = kbConfigSchema.safeParse({
			version: 1,
		});
		expect(result.success).toBe(false);
	});

	it("applies defaults for optional sections", () => {
		const result = kbConfigSchema.safeParse({
			version: 1,
			vault: { path: "/tmp", created: "2026-01-01" },
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.indexing.auto_index).toBe(true);
			expect(result.data.naming.slug_transform).toBe("kebab-case");
			expect(result.data.search.default_limit).toBe(10);
		}
	});

	it("rejects invalid slug_transform", () => {
		const result = kbConfigSchema.safeParse({
			version: 1,
			vault: { path: "/tmp", created: "2026-01-01" },
			naming: { slug_transform: "INVALID" },
		});
		expect(result.success).toBe(false);
	});
});
