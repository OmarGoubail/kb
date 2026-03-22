/**
 * Extracts tags from markdown content and frontmatter.
 * Inline tags: #tag-name in body text
 * Frontmatter tags: tags array in YAML
 */
export function extractTags(body: string, frontmatterTags: unknown, tagPattern: string): string[] {
	const tags = new Set<string>();

	// Extract inline tags from body
	const regex = new RegExp(tagPattern, "g");
	let match = regex.exec(body);
	while (match !== null) {
		const tag = match[1];
		if (tag) {
			tags.add(tag.toLowerCase());
		}
		match = regex.exec(body);
	}

	// Merge frontmatter tags
	if (Array.isArray(frontmatterTags)) {
		for (const tag of frontmatterTags) {
			if (typeof tag === "string") {
				tags.add(tag.toLowerCase());
			}
		}
	}

	return [...tags].sort();
}
