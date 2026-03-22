import type {
	SchemaDefinition,
	SchemasConfig,
	ValidationError,
	ValidationResult,
} from "../config/types.js";

/**
 * Validates frontmatter data against the config schema definitions.
 * Resolves `extends` chains and checks required fields, enums, and types.
 */
export function validateFrontmatter(
	data: Record<string, unknown>,
	schemas: SchemasConfig,
	type?: string,
): ValidationResult {
	const errors: ValidationError[] = [];

	// Resolve the schema to use
	const schema = resolveSchema(type ?? (data.type as string | undefined), schemas);
	if (!schema) {
		return { valid: true, errors: [] };
	}

	// Check required fields
	for (const field of schema.required) {
		const value = data[field];
		if (value === undefined || value === null || value === "") {
			errors.push({
				field,
				message: `Required field "${field}" is missing`,
			});
		}
	}

	// Check enum values
	for (const [field, allowedValues] of Object.entries(schema.enums)) {
		const value = data[field];
		if (value !== undefined && value !== null && value !== "") {
			if (!allowedValues.includes(String(value))) {
				errors.push({
					field,
					message: `Invalid value "${value}" for "${field}". Allowed: ${allowedValues.join(", ")}`,
					value,
				});
			}
		}
	}

	// Check date fields
	if (schema.validators) {
		for (const [field, validatorType] of Object.entries(schema.validators)) {
			const value = data[field];
			if (value === undefined || value === null) continue;

			if (validatorType === "date" && typeof value === "string") {
				if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
					errors.push({
						field,
						message: `Invalid date format for "${field}": expected YYYY-MM-DD`,
						value,
					});
				}
			}

			if (validatorType === "array-of-strings") {
				if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
					errors.push({
						field,
						message: `"${field}" must be an array of strings`,
						value,
					});
				}
			}
		}
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Resolves a schema by type, following `extends` chains.
 * Merges parent required/optional/enums/defaults into child.
 */
function resolveSchema(type: string | undefined, schemas: SchemasConfig): SchemaDefinition | null {
	if (!type) {
		return schemas.default ?? null;
	}

	const typeSchema = schemas[type];
	const defaultSchema = schemas.default;

	if (!typeSchema && !defaultSchema) return null;
	if (!typeSchema) return defaultSchema ?? null;

	// If the schema extends another, merge them
	if (typeSchema.extends) {
		const parent = schemas[typeSchema.extends];
		if (parent) {
			return {
				required: typeSchema.required.length > 0 ? typeSchema.required : parent.required,
				optional: [...new Set([...parent.optional, ...typeSchema.optional])],
				enums: { ...parent.enums, ...typeSchema.enums },
				defaults: { ...parent.defaults, ...typeSchema.defaults },
				validators: { ...parent.validators, ...typeSchema.validators },
			};
		}
	}

	return typeSchema;
}

/**
 * Applies schema defaults to frontmatter data.
 * Only fills in fields that are missing or empty.
 */
export function applyDefaults(
	data: Record<string, unknown>,
	schemas: SchemasConfig,
	type?: string,
): Record<string, unknown> {
	const schema = resolveSchema(type ?? (data.type as string | undefined), schemas);
	if (!schema?.defaults) return data;

	const result = { ...data };
	const today = new Date().toISOString().slice(0, 10);

	for (const [field, defaultValue] of Object.entries(schema.defaults)) {
		if (result[field] === undefined || result[field] === null || result[field] === "") {
			result[field] = defaultValue === "{{today}}" ? today : defaultValue;
		}
	}

	return result;
}
