/**
 * Simple Mustache-style template renderer.
 * Supports:
 *   {{var}}           - variable substitution
 *   {{#var}}...{{/var}} - conditional blocks (included only if var is truthy)
 */
export function renderTemplate(
	template: string,
	vars: Record<string, string | number | undefined>,
): string {
	let result = template;

	// Process conditional blocks: {{#var}}content{{/var}}
	result = result.replace(
		/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
		(_match, key: string, content: string) => {
			const value = vars[key];
			if (value !== undefined && value !== "" && value !== null) {
				// Recursively render the content inside the block
				return renderTemplate(content, vars);
			}
			return "";
		},
	);

	// Process variable substitutions: {{var}}
	result = result.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
		const value = vars[key];
		if (value === undefined || value === null) return "";
		return String(value);
	});

	return result;
}
