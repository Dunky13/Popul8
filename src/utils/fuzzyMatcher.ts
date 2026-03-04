import leven, { closestMatch } from "leven";

export const findBestMatches = (
  placeholders: string[],
  headers: string[],
  threshold: number = 0.6
): Array<{ placeholder: string; column: string; confidence: number }> => {
  const matches: Array<{
    placeholder: string;
    column: string;
    confidence: number;
  }> = [];

  const csvHeaders = headers.reduce((acc, header) => {
    return { ...acc, [header.toLowerCase()]: header };
  }, {} as Record<string, string>);
  placeholders.forEach((placeholder) => {
    const maxDistance = Math.ceil(placeholder.length * (1 - threshold));
    const bestHeader = closestMatch(placeholder, Object.keys(csvHeaders), {
      maxDistance,
    });

    if (bestHeader) {
      const distance = leven(
        placeholder.toLowerCase(),
        bestHeader.toLowerCase()
      );
      const confidence =
        1 - distance / Math.max(placeholder.length, bestHeader.length, 1);

      matches.push({
        placeholder,
        column: csvHeaders[bestHeader],
        confidence,
      });
    }
  });

  // Resolve conflicts - prefer higher confidence matches
  const usedColumns = new Set<string>();
  const finalMatches: Array<{
    placeholder: string;
    column: string;
    confidence: number;
  }> = [];

  matches.sort((a, b) => b.confidence - a.confidence);

  for (const match of matches) {
    if (!usedColumns.has(match.column)) {
      finalMatches.push(match);
      usedColumns.add(match.column);
    }
  }

  return finalMatches.sort((a, b) => b.confidence - a.confidence);
};

export const extractFieldParts = (
  value: string,
  partIndex: number = 0
): string => {
  if (!value || typeof value !== "string") return "";

  const parts = value
    .split(/[/\\|–—]/)
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0);
  return parts[partIndex] || "";
};

export const generateMappedRecord = (
  recordSource: Record<string, unknown>,
  mapping: Record<string, string>
): Record<string, string> => {
  const record: Record<string, string> = {};
  const uniqueColumns = [...new Set(Object.values(mapping))];

  uniqueColumns.forEach((csvColumn) => {
    const rawValue = recordSource[csvColumn];
    const value =
      rawValue === null || rawValue === undefined ? "" : String(rawValue);

    const placeholdersForColumn = Object.entries(mapping)
      .filter(([, col]) => col === csvColumn)
      .map(([placeholder]) => placeholder);

    placeholdersForColumn.forEach((placeholder) => {
      record[placeholder] = value;
    });

    record[csvColumn] = value;
  });

  return record;
};
