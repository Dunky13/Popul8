import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { ParsedData, SVGTemplate } from "../src/types/template";
import { validateDataMapping } from "../src/utils/validationUtils";

const csvData: ParsedData = {
  headers: ["Name", "Role", "Team"],
  rows: [{ Name: "Aria", Role: "Analyst", Team: "North" }],
  fileName: "records.csv",
};

const template: SVGTemplate = {
  content: "<svg><text>{{name}}</text><text>{{role}}</text><text>{{team}}</text></svg>",
  placeholders: ["name", "role", "team"],
  elementIds: [],
  fileName: "template.svg",
};

test("validateDataMapping reports invalid columns structurally", () => {
  const result = validateDataMapping(template, csvData, {
    name: "Name",
    role: "LegacyRole",
    team: "LegacyRole",
  });

  assert.equal(result.isValid, false);
  assert.deepEqual(result.invalidColumns, ["LegacyRole"]);
});

test("validateDataMapping warns on unused columns when any placeholders remain unresolved", () => {
  const result = validateDataMapping(template, csvData, {
    name: "Name",
    role: "Role",
  });

  assert.equal(result.errors.length, 0);
  assert.ok(
    result.warnings.includes("Unused CSV columns: Team"),
    "expected unused column warning for unresolved optional placeholder",
  );
});
