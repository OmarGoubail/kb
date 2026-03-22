import { describe, expect, it } from "bun:test";
import { renderTemplate } from "../../../src/template/renderer.js";

describe("renderTemplate", () => {
	it("replaces simple variables", () => {
		const result = renderTemplate("Hello {{name}}!", { name: "World" });
		expect(result).toBe("Hello World!");
	});

	it("replaces multiple occurrences", () => {
		const result = renderTemplate("{{x}} and {{x}}", { x: "a" });
		expect(result).toBe("a and a");
	});

	it("removes undefined variables", () => {
		const result = renderTemplate("Hello {{name}}!", {});
		expect(result).toBe("Hello !");
	});

	it("handles number values", () => {
		const result = renderTemplate("Session {{sequence}}", { sequence: 1 });
		expect(result).toBe("Session 1");
	});

	it("includes conditional block when var is truthy", () => {
		const result = renderTemplate("{{#url}}url: {{url}}\n{{/url}}done", {
			url: "https://example.com",
		});
		expect(result).toBe("url: https://example.com\ndone");
	});

	it("excludes conditional block when var is missing", () => {
		const result = renderTemplate("{{#url}}url: {{url}}\n{{/url}}done", {});
		expect(result).toBe("done");
	});

	it("excludes conditional block when var is empty string", () => {
		const result = renderTemplate("{{#url}}url: {{url}}\n{{/url}}done", {
			url: "",
		});
		expect(result).toBe("done");
	});

	it("handles nested variables in conditional blocks", () => {
		const result = renderTemplate("{{#project}}Project: {{project}} ({{area}}){{/project}}", {
			project: "alpha",
			area: "auth",
		});
		expect(result).toBe("Project: alpha (auth)");
	});

	it("handles full template rendering", () => {
		const template = [
			"---",
			"type: {{type}}",
			"project: {{project}}",
			"{{#url}}url: {{url}}",
			"{{/url}}---",
			"",
			"# {{title}}",
		].join("\n");

		const result = renderTemplate(template, {
			type: "task",
			project: "alpha",
			title: "Fix Bug",
			url: "https://example.com",
		});

		expect(result).toContain("type: task");
		expect(result).toContain("project: alpha");
		expect(result).toContain("url: https://example.com");
		expect(result).toContain("# Fix Bug");
	});
});
