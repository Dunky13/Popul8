import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  mergeUniqueCsvIds,
  resolveCsvIdsForAppend,
} from "../src/components/FileUpload/csvSelectionHelpers";

test("mergeUniqueCsvIds preserves base order and appends unseen ids", () => {
  const merged = mergeUniqueCsvIds(
    ["csv-a", "csv-b", "csv-c"],
    ["csv-b", "csv-d", "csv-c", "csv-e"],
  );

  assert.deepEqual(merged, ["csv-a", "csv-b", "csv-c", "csv-d", "csv-e"]);
});

test("resolveCsvIdsForAppend prefers last used ids when available", () => {
  const merged = resolveCsvIdsForAppend({
    lastUsedCsvIds: ["active-a"],
    fallbackSelectedIds: ["checkbox-only-id"],
    appendedIds: ["new-b"],
  });

  assert.deepEqual(merged, ["active-a", "new-b"]);
});

test("resolveCsvIdsForAppend falls back to selected ids when last used is empty", () => {
  const merged = resolveCsvIdsForAppend({
    lastUsedCsvIds: [],
    fallbackSelectedIds: ["selected-a"],
    appendedIds: ["selected-a", "new-b"],
  });

  assert.deepEqual(merged, ["selected-a", "new-b"]);
});
