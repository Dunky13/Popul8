import type { ParsedData } from "../types/template";

export interface BootstrappedCsv {
  file: File;
  data: ParsedData;
}

const normalizePlaceholders = (placeholders: string[]) => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  placeholders.forEach((placeholder) => {
    const trimmed = placeholder.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    normalized.push(trimmed);
  });

  return normalized;
};

const escapeCsvValue = (value: string) => {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
};

const toBootstrapFileName = (svgFileName?: string) => {
  const baseName = (svgFileName ?? "").trim();
  if (!baseName) return "template.bootstrap.csv";

  const dotIndex = baseName.lastIndexOf(".");
  const hasStem = dotIndex > 0;
  const stem = hasStem ? baseName.slice(0, dotIndex) : baseName;
  return `${stem}.bootstrap.csv`;
};

export const buildBootstrappedCsvFromPlaceholders = (
  placeholders: string[],
  svgFileName?: string,
): BootstrappedCsv | null => {
  const headers = normalizePlaceholders(placeholders);
  if (headers.length === 0) return null;

  const seedRow = headers.reduce<Record<string, string>>((row, header) => {
    row[header] = header;
    return row;
  }, {});

  const csvContent = [
    headers.map((header) => escapeCsvValue(header)).join(","),
    headers.map((header) => escapeCsvValue(seedRow[header] ?? "")).join(","),
  ].join("\n");

  const data: ParsedData = {
    headers,
    rows: [seedRow],
    fileName: toBootstrapFileName(svgFileName),
  };

  const file = new File([csvContent], data.fileName ?? "template.bootstrap.csv", {
    type: "text/csv",
  });

  return { file, data };
};
