/**
 * Utilities for required SVG placeholders and row selection rules
 */

import type { DataMapping, ParsedData, SVGTemplate } from "../types/template";

const REQUIRED_SUFFIX = "!";

export const isRequiredPlaceholder = (placeholder: string): boolean => {
  return placeholder.trim().endsWith(REQUIRED_SUFFIX);
};

export const stripRequiredSuffix = (placeholder: string): string => {
  const trimmed = placeholder.trim();
  if (!trimmed.endsWith(REQUIRED_SUFFIX)) return trimmed;
  return trimmed.slice(0, -1).trim();
};

export const getRequiredPlaceholders = (
  placeholders: string[],
): string[] => placeholders.filter(isRequiredPlaceholder);

export const getUnmappedRequiredPlaceholders = (params: {
  placeholders: string[];
  dataMapping: DataMapping;
}): string[] => {
  const { placeholders, dataMapping } = params;

  return getRequiredPlaceholders(placeholders).filter((placeholder) => {
    const baseKey = stripRequiredSuffix(placeholder);
    return !dataMapping[placeholder] && !dataMapping[baseKey];
  });
};

const normalizeKey = (value: string): string => value.trim().toLowerCase();

const buildHeaderLookup = (headers: string[]): Map<string, string> => {
  const lookup = new Map<string, string>();
  headers.forEach((header) => {
    const normalized = normalizeKey(header);
    if (!lookup.has(normalized)) {
      lookup.set(normalized, header);
    }
  });
  return lookup;
};

const buildMappingLookup = (mapping: DataMapping): Map<string, string> => {
  const lookup = new Map<string, string>();
  Object.entries(mapping).forEach(([key, value]) => {
    const normalizedKey = normalizeKey(key);
    if (!lookup.has(normalizedKey)) {
      lookup.set(normalizedKey, value);
    }
  });
  return lookup;
};

const resolveRequiredColumn = (
  placeholder: string,
  baseKey: string,
  headerLookup: Map<string, string>,
  mappingLookup: Map<string, string>,
  mapping: DataMapping
): string | null => {
  const mapped =
    mapping[placeholder] ||
    mapping[baseKey] ||
    mappingLookup.get(normalizeKey(placeholder)) ||
    mappingLookup.get(normalizeKey(baseKey)) ||
    baseKey ||
    placeholder;
  if (!mapped) return null;
  const normalized = normalizeKey(mapped);
  const resolved = headerLookup.get(normalized);
  if (resolved) return resolved;

  const fallbackKey = baseKey || placeholder;
  if (!fallbackKey) return null;
  const fallbackNormalized = normalizeKey(fallbackKey);
  return headerLookup.get(fallbackNormalized) ?? null;
};

export const getMissingRequiredRowIndices = (params: {
  csvData: ParsedData | null;
  svgTemplate: SVGTemplate | null;
  dataMapping: DataMapping;
}): number[] => {
  const { csvData, svgTemplate, dataMapping } = params;
  if (!csvData || !svgTemplate) return [];

  const requiredPlaceholders = getRequiredPlaceholders(svgTemplate.placeholders);
  if (requiredPlaceholders.length === 0) return [];

  const headerLookup = buildHeaderLookup(csvData.headers);
  const mappingLookup = buildMappingLookup(dataMapping);

  const requiredColumns = requiredPlaceholders
    .map((placeholder) => {
      const baseKey = stripRequiredSuffix(placeholder);
      return resolveRequiredColumn(
        placeholder,
        baseKey,
        headerLookup,
        mappingLookup,
        dataMapping
      );
    })
    .filter((column): column is string => Boolean(column));

  if (requiredColumns.length === 0) return [];

  const missingRows: number[] = [];

  csvData.rows.forEach((row, index) => {
    const isMissing = requiredColumns.some((column) => {
      const value = row[column];
      return !value || value.trim() === "";
    });
    if (isMissing) {
      missingRows.push(index);
    }
  });

  return missingRows;
};

export const applyRequiredSelectionRules = (params: {
  selectedRowIndices: number[];
  missingRequiredRowIndices: number[];
  requiredRowOverrides: number[];
}): number[] => {
  const { selectedRowIndices, missingRequiredRowIndices, requiredRowOverrides } =
    params;

  if (missingRequiredRowIndices.length === 0) {
    return selectedRowIndices;
  }

  const overrideSet = new Set(requiredRowOverrides);
  const blockedSet = new Set(
    missingRequiredRowIndices.filter((index) => !overrideSet.has(index))
  );

  if (blockedSet.size === 0) {
    return selectedRowIndices;
  }

  return selectedRowIndices.filter((index) => !blockedSet.has(index));
};
