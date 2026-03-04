/**
 * Dynamic record data structure that can handle any CSV fields.
 */
export interface DataRecord extends Record<string, unknown> {
  id: string;
  [key: string]: unknown;
}

/**
 * Get list of non-empty fields matching a pattern.
 */
export const getFieldsByPattern = (
  record: DataRecord,
  pattern: string,
): string[] => {
  const fields: string[] = [];

  Object.entries(record).forEach(([key, value]) => {
    if (
      key.toLowerCase().includes(pattern.toLowerCase()) &&
      value !== null &&
      value !== undefined &&
      typeof value === "string" &&
      value.trim()
    ) {
      fields.push(value.trim());
    }
  });

  return fields;
};

/**
 * Convert a CSV row to a generic data record.
 */
export const csvRowToRecord = (
  row: Record<string, string>,
  index: number,
): DataRecord => {
  return {
    id: `record-${index}`,
    ...row,
  };
};

/**
 * Record validation is intentionally permissive.
 */
export const validateRecord = (): string[] => {
  return [];
};
