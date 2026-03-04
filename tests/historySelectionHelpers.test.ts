import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  resolveTodayHistorySelection,
  toggleCsvHistorySelection,
} from "../src/components/FileUpload/historySelectionHelpers";

test("toggleCsvHistorySelection toggles multiple ids when multiple is true", () => {
  let selected = new Set<string>();

  selected = toggleCsvHistorySelection({
    currentIds: selected,
    id: "csv-a",
    multiple: true,
  });
  assert.deepEqual(Array.from(selected), ["csv-a"]);

  selected = toggleCsvHistorySelection({
    currentIds: selected,
    id: "csv-b",
    multiple: true,
  });
  assert.deepEqual(Array.from(selected), ["csv-a", "csv-b"]);

  selected = toggleCsvHistorySelection({
    currentIds: selected,
    id: "csv-a",
    multiple: true,
  });
  assert.deepEqual(Array.from(selected), ["csv-b"]);
});

test("toggleCsvHistorySelection enforces single selection when multiple is false", () => {
  let selected = new Set<string>(["csv-a"]);

  selected = toggleCsvHistorySelection({
    currentIds: selected,
    id: "csv-b",
    multiple: false,
  });
  assert.deepEqual(Array.from(selected), ["csv-b"]);

  selected = toggleCsvHistorySelection({
    currentIds: selected,
    id: "csv-b",
    multiple: false,
  });
  assert.deepEqual(Array.from(selected), []);
});

test("resolveTodayHistorySelection returns first id only in single mode", () => {
  const single = resolveTodayHistorySelection({
    todaysIds: ["csv-a", "csv-b", "csv-c"],
    multiple: false,
  });
  assert.deepEqual(single, ["csv-a"]);

  const multi = resolveTodayHistorySelection({
    todaysIds: ["csv-a", "csv-b", "csv-c"],
    multiple: true,
  });
  assert.deepEqual(multi, ["csv-a", "csv-b", "csv-c"]);
});
