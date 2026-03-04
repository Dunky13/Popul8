import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  applyRequiredSelectionRules,
  getMissingRequiredRowIndices,
} from "../src/utils/requiredFields";
import type { ParsedData, SVGTemplate } from "../src/types/template";

const csvData: ParsedData = {
  headers: ["Name", "Role"],
  rows: [
    { Name: "Aria", Role: "Analyst" },
    { Name: "", Role: "Operator" },
    { Name: "Bram", Role: "Coordinator" },
  ],
  fileName: "records.csv",
};

const svgTemplate: SVGTemplate = {
  content: "<svg viewBox='0 0 100 100'><text>{{name!}}</text></svg>",
  placeholders: ["name!"],
  elementIds: [],
  fileName: "template.svg",
};

test("finds rows missing required mapped values", () => {
  const missing = getMissingRequiredRowIndices({
    csvData,
    svgTemplate,
    dataMapping: { "name!": "Name" },
  });

  assert.deepEqual(missing, [1]);
});

test("removes blocked rows and keeps explicit overrides", () => {
  const selected = [0, 1, 2];

  const filtered = applyRequiredSelectionRules({
    selectedRowIndices: selected,
    missingRequiredRowIndices: [1],
    requiredRowOverrides: [],
  });
  assert.deepEqual(filtered, [0, 2]);

  const overridden = applyRequiredSelectionRules({
    selectedRowIndices: selected,
    missingRequiredRowIndices: [1],
    requiredRowOverrides: [1],
  });
  assert.deepEqual(overridden, [0, 1, 2]);
});
