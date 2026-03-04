import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  filterDroppedFilesByAcceptedRules,
  normalizeDropAcceptRules,
} from "../src/hooks/dragDropUtils";

test("normalizeDropAcceptRules flattens and deduplicates entries", () => {
  const normalized = normalizeDropAcceptRules([
    ".csv,.txt",
    "csv",
    "image/*",
    "application/json",
    "image/*",
    ".svg",
  ]);

  assert.deepEqual(normalized, {
    extensions: [".csv", ".txt", ".svg"],
    mimeTypes: ["application/json"],
    wildcardMimePrefixes: ["image/"],
  });
});

test("filterDroppedFilesByAcceptedRules accepts matching extension and mime rules", () => {
  const files = [
    new File(["a"], "one.csv", { type: "text/csv" }),
    new File(["b"], "two.txt", { type: "text/plain" }),
    new File(["c"], "avatar.bin", { type: "image/png" }),
    new File(["d"], "meta.dat", { type: "application/json" }),
    new File(["c"], "three.json", { type: "application/json" }),
  ];

  const filtered = filterDroppedFilesByAcceptedRules(files, {
    extensions: [".csv", ".txt"],
    mimeTypes: ["application/json"],
    wildcardMimePrefixes: ["image/"],
  });

  assert.deepEqual(
    filtered.map((file) => file.name),
    ["one.csv", "two.txt", "avatar.bin", "meta.dat", "three.json"],
  );
});

test("filterDroppedFilesByAcceptedRules returns all files when accept list is empty", () => {
  const files = [
    new File(["a"], "one.csv", { type: "text/csv" }),
    new File(["b"], "two.txt", { type: "text/plain" }),
  ];

  const filtered = filterDroppedFilesByAcceptedRules(files, {
    extensions: [],
    mimeTypes: [],
    wildcardMimePrefixes: [],
  });

  assert.equal(filtered.length, files.length);
});
