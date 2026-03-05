import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { ParsedData } from "../src/types/template";
import type { StoredFile } from "../src/utils/fileHistory";
import { syncSelectedCsvFiles } from "../src/components/FileUpload/csvSelectionHelpers";

const makeStoredCsv = (id: string, content: string): StoredFile => ({
  id,
  hash: id,
  fileName: `${id}.csv`,
  size: content.length,
  type: "csv",
  uploadedAt: new Date("2025-01-01T00:00:00Z").toISOString(),
  content,
});

test("syncSelectedCsvFiles combines multiple stored CSVs and applies combined data", async () => {
  const storedFiles: StoredFile[] = [
    makeStoredCsv("first", "Name\nA"),
    makeStoredCsv("second", "Name\nB"),
  ];

  const loadingStates: boolean[] = [];
  const errors: string[] = [];
  let lastCombinedRowCount = 0;
  let lastFileCount = 0;
  let lastSelection: number[] | null = null;

  await syncSelectedCsvFiles({
    selectedHistory: storedFiles,
    previousCsvData: null,
    previousSelectedRowIndices: [],
    applyCombinedCsvData: (combinedData, fileCount) => {
      lastCombinedRowCount = combinedData.rows.length;
      lastFileCount = fileCount;
    },
    setLoading: (loading) => {
      loadingStates.push(loading);
    },
    addError: (message) => {
      errors.push(message);
    },
    updateSelection: (indices) => {
      lastSelection = indices;
    },
    deps: {
      parseContent: async (content, fileName) => {
        const [headerLine, ...rows] = content.split("\n");
        const headers = headerLine.split(",");
        const dataRows = rows
          .filter((line) => line.trim().length > 0)
          .map((line) => {
            const values = line.split(",");
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
              row[header] = values[index] ?? "";
            });
            return row;
          });

        return {
          headers,
          rows: dataRows,
          fileName,
        } satisfies ParsedData;
      },
      combineCsv: (csvDataList) => {
        const [first, ...rest] = csvDataList;
        const combinedRows = [first, ...rest].flatMap((item) => item.rows);
        return {
          combinedData: {
            headers: first.headers,
            rows: combinedRows,
            fileName: "Combined",
          },
          recordWarnings: [],
        };
      },
    },
  });

  assert.equal(lastFileCount, 2);
  assert.equal(lastCombinedRowCount, 2);
  assert.deepEqual(loadingStates, [true, false]);
  assert.deepEqual(errors, []);
  // With no previous selection context, helper should not override selection.
  assert.equal(lastSelection, null);
});

test("syncSelectedCsvFiles adds error when CSV combination fails", async () => {
  const storedFiles: StoredFile[] = [
    makeStoredCsv("first", "Name\nA"),
    makeStoredCsv("second", "Title\nB"),
  ];

  const errors: string[] = [];
  let applyCalled = false;
  const loadingStates: boolean[] = [];
  let lastSelection: number[] | null = null;

  await syncSelectedCsvFiles({
    selectedHistory: storedFiles,
    previousCsvData: null,
    previousSelectedRowIndices: [],
    applyCombinedCsvData: () => {
      applyCalled = true;
    },
    setLoading: (loading) => {
      loadingStates.push(loading);
    },
    addError: (message) => {
      errors.push(message);
    },
    updateSelection: (indices) => {
      lastSelection = indices;
    },
    deps: {
      parseContent: async (content, fileName) => {
        const [headerLine] = content.split("\n");
        const headers = headerLine.split(",");
        return {
          headers,
          rows: [],
          fileName,
        } satisfies ParsedData;
      },
      combineCsv: (csvDataList) => {
        const firstHeaders = csvDataList[0]?.headers ?? [];
        const allMatch = csvDataList.every(
          (data) =>
            data.headers.length === firstHeaders.length &&
            data.headers.every((header, index) => header === firstHeaders[index]),
        );
        if (!allMatch) {
          throw new Error("Headers don't match");
        }
        return {
          combinedData: csvDataList[0],
          recordWarnings: [],
        };
      },
    },
  });

  assert.equal(applyCalled, false);
  assert.equal(errors.length, 1);
  assert.ok(
    errors[0].startsWith("File processing failed:"),
    "error message should be prefixed with generic failure text",
  );
  assert.deepEqual(loadingStates, [true, false]);
  assert.equal(lastSelection, null);
});

test("syncSelectedCsvFiles preserves manual deselection when dropping a CSV file", async () => {
  // Previous combined data from two CSV files A and B.
  const previousCsvData: ParsedData = {
    headers: ["Name"],
    rows: [
      { Name: "A1" }, // row 0 (file A)
      { Name: "A2" }, // row 1 (file A)
      { Name: "A3" }, // row 2 (file A)
      { Name: "B1" }, // row 3 (file B)
    ],
    fileName: "Combined (A,B)",
  };

  // User deselected row indices 0 and 1 (A1, A2) and left A3 and B1 selected.
  const previousSelectedRowIndices = [2, 3];

  // Now only file A remains selected in history; new combined data only has A rows.
  const storedFiles: StoredFile[] = [
    makeStoredCsv("a", "Name\nA1\nA2\nA3"),
  ];

  const loadingStates: boolean[] = [];
  const errors: string[] = [];
  let lastSelection: number[] | null = null;
  let lastCombinedRowCount = 0;

  await syncSelectedCsvFiles({
    selectedHistory: storedFiles,
    previousCsvData,
    previousSelectedRowIndices,
    applyCombinedCsvData: (combinedData) => {
      lastCombinedRowCount = combinedData.rows.length;
    },
    setLoading: (loading) => {
      loadingStates.push(loading);
    },
    addError: (message) => {
      errors.push(message);
    },
    updateSelection: (indices) => {
      lastSelection = indices;
    },
    deps: {
      parseContent: async (content, fileName) => {
        const [headerLine, ...rows] = content.split("\n");
        const headers = headerLine.split(",");
        const dataRows = rows
          .filter((line) => line.trim().length > 0)
          .map((line) => {
            const values = line.split(",");
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
              row[header] = values[index] ?? "";
            });
            return row;
          });

        return {
          headers,
          rows: dataRows,
          fileName,
        } satisfies ParsedData;
      },
      combineCsv: (csvDataList) => {
        // In this scenario only file A is selected, so combined data is just its rows.
        return {
          combinedData: csvDataList[0],
          recordWarnings: [],
        };
      },
    },
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(loadingStates, [true, false]);
  assert.equal(lastCombinedRowCount, 3);
  // Expect only A3 (index 2) to remain selected; A1 and A2 stay deselected.
  assert.deepEqual(lastSelection, [2]);
});


