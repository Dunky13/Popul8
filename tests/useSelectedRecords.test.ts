import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildSelectedRecords } from "../src/hooks/useSelectedRecords";
import type { ParsedData } from "../src/types/template";

const csvData: ParsedData = {
  headers: ["Name"],
  rows: [{ Name: "A" }, { Name: "B" }, { Name: "C" }],
  fileName: "records.csv",
};

test("keeps record ids anchored to original csv row indices", () => {
  const selected = buildSelectedRecords({
    csvData,
    selectedRowIndices: [2, 0],
  });

  assert.deepEqual(
    selected.map((record) => record.id),
    ["record-2", "record-0"],
  );
});

test("ignores out-of-range selection indices", () => {
  const selected = buildSelectedRecords({
    csvData,
    selectedRowIndices: [1, 99, 0],
  });

  assert.deepEqual(
    selected.map((record) => record.id),
    ["record-1", "record-0"],
  );
});
