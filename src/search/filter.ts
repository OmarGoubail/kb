export interface SearchFilters {
	type?: string;
	project?: string;
	area?: string;
	status?: string;
	tag?: string;
	createdAfter?: string;
	createdBefore?: string;
}

export interface WhereClause {
	sql: string;
	params: unknown[];
}

/**
 * Builds SQL WHERE conditions for filtering notes.
 */
export function buildWhereClause(filters: SearchFilters): WhereClause {
	const conditions: string[] = [];
	const params: unknown[] = [];

	if (filters.type) {
		conditions.push("n.type = ?");
		params.push(filters.type);
	}

	if (filters.project) {
		conditions.push("n.project = ?");
		params.push(filters.project);
	}

	if (filters.area) {
		conditions.push("n.area = ?");
		params.push(filters.area);
	}

	if (filters.status) {
		conditions.push("n.status = ?");
		params.push(filters.status);
	}

	if (filters.createdAfter) {
		conditions.push("n.created_at >= ?");
		params.push(filters.createdAfter);
	}

	if (filters.createdBefore) {
		conditions.push("n.created_at <= ?");
		params.push(filters.createdBefore);
	}

	if (filters.tag) {
		conditions.push(
			"n.id IN (SELECT nt.note_id FROM note_tags nt JOIN tags t ON nt.tag_id = t.id WHERE t.name = ?)",
		);
		params.push(filters.tag);
	}

	const sql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
	return { sql, params };
}
