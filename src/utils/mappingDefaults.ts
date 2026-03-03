import type { DataMapping } from "../types/template";
import { findBestMatches } from "./fuzzyMatcher";

const DEFAULT_MAPPING_THRESHOLD = 0.5;

export const buildMappingContextKey = (
  headers: string[],
  placeholders: string[],
) => {
  const normalizedHeaders = Array.from(new Set(headers)).sort();
  const normalizedPlaceholders = Array.from(new Set(placeholders)).sort();
  return `${normalizedHeaders.join("|")}::${normalizedPlaceholders.join("|")}`;
};

export const canReuseMappingInContext = ({
  dataMapping,
  headers,
  placeholders,
}: {
  dataMapping: DataMapping;
  headers: string[];
  placeholders: string[];
}) => {
  const mappings = Object.entries(dataMapping).filter(([, column]) =>
    Boolean(column),
  );
  if (mappings.length === 0) {
    return false;
  }

  const headerSet = new Set(headers);
  const placeholderSet = new Set(placeholders);

  return mappings.every(
    ([placeholder, column]) =>
      placeholderSet.has(placeholder) && headerSet.has(column),
  );
};

export const buildDefaultMapping = ({
  headers,
  placeholders,
}: {
  headers: string[];
  placeholders: string[];
}): DataMapping => {
  const matches = findBestMatches(placeholders, headers, DEFAULT_MAPPING_THRESHOLD);
  const defaultMapping: DataMapping = {};

  for (const match of matches) {
    defaultMapping[match.placeholder] = match.column;
  }

  return defaultMapping;
};
