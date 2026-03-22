export interface ParsedLink {
	target: string;
	displayText?: string;
	context: string;
}

/**
 * Extracts [[wikilinks]] from markdown content.
 * Supports [[target]] and [[target|display text]].
 */
export function parseLinks(content: string, wikilinkPattern: string): ParsedLink[] {
	const links: ParsedLink[] = [];
	const regex = new RegExp(wikilinkPattern, "g");
	let match = regex.exec(content);

	while (match !== null) {
		const target = match[1];
		if (!target) continue;

		const displayText = match[2] || undefined;
		const context = extractContext(content, match.index, 100);

		links.push({ target: target.trim(), displayText, context });
		match = regex.exec(content);
	}

	return links;
}

/**
 * Extracts surrounding text for context preview.
 */
function extractContext(content: string, position: number, maxLength: number): string {
	const start = Math.max(0, content.lastIndexOf("\n", position - 1) + 1);
	const end = content.indexOf("\n", position);
	const line = content.slice(start, end === -1 ? undefined : end).trim();

	if (line.length <= maxLength) return line;
	return `${line.slice(0, maxLength)}...`;
}
