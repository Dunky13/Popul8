import { strict as assert } from "node:assert";
import { test } from "node:test";
import { replacePlaceholders } from "../src/utils/svgManipulator";

test("preserves explicit empty mapped values during replacement", () => {
  const svg = "<svg><text>{{name}}</text></svg>";
  const mapping = { name: "Name" };
  const record = {
    name: "",
    Name: "Fallback",
  };

  const output = replacePlaceholders(svg, record, mapping, ["name"]);

  assert.equal(output.includes("Fallback"), false);
  assert.equal(output.includes("{{name}}"), false);
});

test("falls back to mapped CSV column when template key is missing", () => {
  const svg = "<svg><text>{{name}}</text></svg>";
  const mapping = { name: "Name" };
  const record = {
    Name: "Aria",
  };

  const output = replacePlaceholders(svg, record, mapping, ["name"]);

  assert.equal(output.includes("Aria"), true);
  assert.equal(output.includes("{{name}}"), false);
});
