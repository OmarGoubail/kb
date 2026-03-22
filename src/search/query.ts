/**
 * Builds an FTS5 MATCH query from user input.
 * Handles simple terms, quoted phrases, and prefix matching.
 */
export function buildFTSQuery(userQuery: string): string {
	const trimmed = userQuery.trim();
	if (!trimmed) return "";

	// If user already quoted, pass through
	if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
		return trimmed;
	}

	// Split into terms, handle each
	const terms = trimmed.split(/\s+/).filter((t) => t.length > 0);

	// Join with implicit AND (FTS5 default)
	// Add prefix matching with * for the last term (autocomplete feel)
	return terms
		.map((term, i) => {
			// Escape FTS5 special chars
			const clean = term.replace(/['"(){}[\]^~*:]/g, "");
			if (!clean) return "";
			// Add prefix match to last term for partial matching
			if (i === terms.length - 1) {
				return `"${clean}"*`;
			}
			return `"${clean}"`;
		})
		.filter((t) => t.length > 0)
		.join(" ");
}
