export function toSlug(title: string, transform: string, maxLength: number): string {
	let slug = title
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "") // strip diacritics
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric
		.replace(/\s+/g, "-") // spaces to hyphens
		.replace(/-+/g, "-") // collapse multiple hyphens
		.replace(/^-|-$/g, ""); // trim leading/trailing hyphens

	if (transform === "snake_case") {
		slug = slug.replace(/-/g, "_");
	}

	if (slug.length > maxLength) {
		slug = truncateAtWordBoundary(slug, maxLength);
	}

	return slug;
}

function truncateAtWordBoundary(slug: string, maxLength: number): string {
	if (slug.length <= maxLength) return slug;

	const separator = slug.includes("_") ? "_" : "-";
	const truncated = slug.slice(0, maxLength);
	const lastSep = truncated.lastIndexOf(separator);

	if (lastSep > 0) {
		return truncated.slice(0, lastSep);
	}

	return truncated;
}
