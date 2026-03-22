/**
 * Renders a frontmatter data object to a YAML frontmatter string.
 * Produces output like:
 *   ---
 *   key: value
 *   ---
 */
export function renderFrontmatter(data: Record<string, unknown>): string {
	const lines: string[] = ["---"];

	for (const [key, value] of Object.entries(data)) {
		if (value === undefined || value === null) continue;

		if (Array.isArray(value)) {
			if (value.length === 0) {
				lines.push(`${key}: []`);
			} else {
				lines.push(`${key}:`);
				for (const item of value) {
					lines.push(`  - ${formatValue(item)}`);
				}
			}
		} else {
			lines.push(`${key}: ${formatValue(value)}`);
		}
	}

	lines.push("---");
	return lines.join("\n");
}

function formatValue(value: unknown): string {
	if (typeof value === "string") {
		// Quote strings that contain special YAML characters
		if (needsQuoting(value)) {
			return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
		}
		return value;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return String(value);
}

function needsQuoting(value: string): boolean {
	if (value === "") return true;
	if (value === "true" || value === "false" || value === "null") return true;
	if (/^\d+(\.\d+)?$/.test(value)) return true;
	if (/[:{}\[\],&*?|>!%#@`]/.test(value)) return true;
	if (value.startsWith(" ") || value.endsWith(" ")) return true;
	return false;
}
