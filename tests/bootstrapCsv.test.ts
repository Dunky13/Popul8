import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildBootstrappedCsvFromPlaceholders } from "../src/utils/bootstrapCsv";

test("returns null when placeholders are empty", () => {
  const result = buildBootstrappedCsvFromPlaceholders(["", "   "], "template.svg");
  assert.equal(result, null);
});

test("builds a bootstrapped csv from svg placeholders", async () => {
  const result = buildBootstrappedCsvFromPlaceholders(
    ["name", "title", "name", " title "],
    "cards.svg",
  );

  assert.ok(result);
  assert.deepEqual(result.data.headers, ["name", "title"]);
  assert.deepEqual(result.data.rows, [{ name: "name", title: "title" }]);
  assert.equal(result.data.fileName, "cards.bootstrap.csv");
  assert.equal(result.file.name, "cards.bootstrap.csv");
  assert.equal(await result.file.text(), "name,title\nname,title");
});

test("escapes placeholders when generating csv content", async () => {
  const result = buildBootstrappedCsvFromPlaceholders(
    ['display,name', 'quote"value'],
    "template",
  );

  assert.ok(result);
  assert.equal(result.data.fileName, "template.bootstrap.csv");
  assert.equal(
    await result.file.text(),
    '"display,name","quote""value"\n"display,name","quote""value"',
  );
});
