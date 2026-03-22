import { describe, expect, it } from "bun:test";
import { parseLinks } from "../../../src/content/link-parser.js";

const pattern = "\\[\\[([^|\\]]+)(?:\\|([^\\]]+))?\\]\\]";

describe("parseLinks", () => {
	it("extracts simple wikilinks", () => {
		const links = parseLinks("See [[project-alpha]] for details.", pattern);
		expect(links).toHaveLength(1);
		expect(links[0]?.target).toBe("project-alpha");
		expect(links[0]?.displayText).toBeUndefined();
	});

	it("extracts aliased wikilinks", () => {
		const links = parseLinks("Check [[project-alpha|Alpha Project]].", pattern);
		expect(links).toHaveLength(1);
		expect(links[0]?.target).toBe("project-alpha");
		expect(links[0]?.displayText).toBe("Alpha Project");
	});

	it("extracts multiple links", () => {
		const links = parseLinks("See [[note-a]] and [[note-b|B]].", pattern);
		expect(links).toHaveLength(2);
		expect(links[0]?.target).toBe("note-a");
		expect(links[1]?.target).toBe("note-b");
		expect(links[1]?.displayText).toBe("B");
	});

	it("returns empty for no links", () => {
		const links = parseLinks("No links here.", pattern);
		expect(links).toHaveLength(0);
	});

	it("includes context from surrounding line", () => {
		const content = "First line\nSee [[project-alpha]] for context\nThird line";
		const links = parseLinks(content, pattern);
		expect(links[0]?.context).toContain("[[project-alpha]]");
	});

	it("trims whitespace from targets", () => {
		const links = parseLinks("[[  spaces  ]]", pattern);
		expect(links[0]?.target).toBe("spaces");
	});
});
