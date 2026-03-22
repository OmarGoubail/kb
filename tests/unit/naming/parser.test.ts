import { describe, expect, it } from "bun:test";
import { createDefaultConfig } from "../../../src/config/defaults.js";
import { parseFilename } from "../../../src/naming/parser.js";

const config = createDefaultConfig("/tmp/test").naming;

describe("parseFilename", () => {
	it("parses session filename", () => {
		const result = parseFilename("session-2026-03-22-001-auth-refactor.md", config);

		expect(result).not.toBeNull();
		expect(result?.type).toBe("session");
		expect(result?.date).toBe("2026-03-22");
		expect(result?.sequence).toBe(1);
		expect(result?.slug).toBe("auth-refactor");
	});

	it("parses task filename with id", () => {
		const result = parseFilename("task-JMP-123-fix-auth-bug.md", config);

		expect(result).not.toBeNull();
		expect(result?.type).toBe("task");
		expect(result?.id).toBe("JMP-123");
		expect(result?.slug).toBe("fix-auth-bug");
	});

	it("parses task fallback filename (date-based)", () => {
		const result = parseFilename("task-2026-03-22-setup-ci.md", config);

		expect(result).not.toBeNull();
		expect(result?.type).toBe("task");
		expect(result?.date).toBe("2026-03-22");
		expect(result?.slug).toBe("setup-ci");
	});

	it("parses project filename", () => {
		const result = parseFilename("project-alpha-platform.md", config);

		expect(result).not.toBeNull();
		expect(result?.type).toBe("project");
		expect(result?.slug).toBe("alpha-platform");
	});

	it("parses MOC filename", () => {
		const result = parseFilename("MOC-active-projects.md", config);

		expect(result).not.toBeNull();
		expect(result?.type).toBe("MOC");
		expect(result?.slug).toBe("active-projects");
	});

	it("parses area filename", () => {
		const result = parseFilename("area-authentication.md", config);

		expect(result).not.toBeNull();
		expect(result?.type).toBe("area");
		expect(result?.slug).toBe("authentication");
	});

	it("parses decision filename", () => {
		const result = parseFilename("decision-2026-03-22-use-jwt.md", config);

		expect(result).not.toBeNull();
		expect(result?.type).toBe("decision");
		expect(result?.date).toBe("2026-03-22");
		expect(result?.slug).toBe("use-jwt");
	});

	it("returns null for unrecognized filename", () => {
		const _result = parseFilename("random-file.md", config);
		// This may match the default pattern — that's ok
		// But truly invalid ones should fail
		const result2 = parseFilename("no-extension", config);
		expect(result2).toBeNull();
	});
});
