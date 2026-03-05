import type { StoredFile } from "../../utils/fileHistory";
import type { ParsedData } from "../../types/template";

type ResolveCsvIdsForAppendInput = {
  lastUsedCsvIds: string[];
  fallbackSelectedIds: string[];
  appendedIds: string[];
};

export const mergeUniqueCsvIds = (
  baseIds: string[],
  appendedIds: string[],
): string[] => {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const id of [...baseIds, ...appendedIds]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }

  return merged;
};

export const resolveCsvIdsForAppend = ({
  lastUsedCsvIds,
  fallbackSelectedIds,
  appendedIds,
}: ResolveCsvIdsForAppendInput): string[] => {
  const baseIds =
    lastUsedCsvIds.length > 0 ? lastUsedCsvIds : fallbackSelectedIds;
  return mergeUniqueCsvIds(baseIds, appendedIds);
};

type SyncSelectedCsvFilesArgs = {
  selectedHistory: StoredFile[];
  previousCsvData: ParsedData | null;
  previousSelectedRowIndices: number[];
  applyCombinedCsvData: (combinedData: ParsedData, fileCount: number) => void;
  setLoading: (loading: boolean) => void;
  addError: (message: string) => void;
  updateSelection: (indices: number[]) => void;
  deps: {
    parseContent: (content: string, fileName?: string) => Promise<ParsedData>;
    combineCsv: (
      csvDataList: ParsedData[],
    ) => { combinedData: ParsedData; recordWarnings: string[] };
    logWarnings?: (warnings: string[]) => void;
  };
};

export const syncSelectedCsvFiles = async ({
  selectedHistory,
  previousCsvData,
  previousSelectedRowIndices,
  applyCombinedCsvData,
  setLoading,
  addError,
  updateSelection,
  deps,
}: SyncSelectedCsvFilesArgs): Promise<void> => {
  if (selectedHistory.length === 0) return;

  try {
    setLoading(true);
    const parsedCsv = await Promise.all(
      selectedHistory.map((item) =>
        deps.parseContent(item.content, item.fileName),
      ),
    );

    const { combinedData, recordWarnings } = deps.combineCsv(parsedCsv);

    if (recordWarnings.length > 0 && deps.logWarnings) {
      deps.logWarnings(recordWarnings);
    }

    applyCombinedCsvData(combinedData, selectedHistory.length);

    // Preserve row selection across CSV history changes by matching rows
    // using a simple content-based signature.
    if (previousCsvData) {
      const allPrevRowsCount = previousCsvData.rows.length;

      // If there were rows and the previous selection was empty, treat that as an
      // explicit "deselect all" and keep the new selection empty.
      if (allPrevRowsCount > 0 && previousSelectedRowIndices.length === 0) {
        updateSelection([]);
        return;
      }

      if (previousSelectedRowIndices.length > 0) {
        const buildSignature = (
          row: Record<string, string>,
          headers: string[],
        ) =>
          headers
            .map((header) => `${header}=${row[header] ?? ""}`)
            .join("|");

        const prevHeaders = previousCsvData.headers;
        const prevRows = previousCsvData.rows;
        const selectedSignatures = new Set<string>();

        previousSelectedRowIndices.forEach((index) => {
          const row = prevRows[index];
          if (!row) return;
          selectedSignatures.add(buildSignature(row, prevHeaders));
        });

        const nextHeaders = combinedData.headers;
        const nextRows = combinedData.rows;
        const nextSelected: number[] = [];

        nextRows.forEach((row, index) => {
          const sig = buildSignature(row, nextHeaders);
          if (selectedSignatures.has(sig)) {
            nextSelected.push(index);
          }
        });

        updateSelection(nextSelected);
      }
    }
  } catch (error) {
    addError(
      `File processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  } finally {
    setLoading(false);
  }
};
