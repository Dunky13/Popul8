import { strict as assert } from "node:assert";
import { test } from "node:test";
import { resolvePreviousRunSelection } from "../src/hooks/previousRunSelection";

test("uses last-used ids when present", () => {
  const resolved = resolvePreviousRunSelection({
    lastUsed: {
      csvIds: ["csv-last"],
      svgId: "svg-last",
    },
    fallbackCsvIds: ["csv-fallback"],
    fallbackSvgId: "svg-fallback",
  });

  assert.deepEqual(resolved, {
    csvIds: ["csv-last"],
    svgId: "svg-last",
  });
});

test("falls back to current selection when last-used ids are missing", () => {
  const resolved = resolvePreviousRunSelection({
    lastUsed: {
      csvIds: [],
      svgId: null,
    },
    fallbackCsvIds: ["csv-fallback-a", "csv-fallback-b"],
    fallbackSvgId: "svg-fallback",
  });

  assert.deepEqual(resolved, {
    csvIds: ["csv-fallback-a", "csv-fallback-b"],
    svgId: "svg-fallback",
  });
});
