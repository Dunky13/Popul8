import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  parseAcceptedFileRules,
  parseAcceptedExtensions,
  validateFileInput,
} from "../src/utils/fileValidation";

test("parseAcceptedExtensions normalizes comma-separated values", () => {
  const extensions = parseAcceptedExtensions(".csv, txt, .svg ");
  assert.deepEqual(extensions, [".csv", ".txt", ".svg"]);
});

test("parseAcceptedFileRules supports extension, exact mime, and wildcard mime entries", () => {
  const rules = parseAcceptedFileRules(".csv,application/json,image/*, csv");

  assert.deepEqual(rules, {
    extensions: [".csv"],
    mimeTypes: ["application/json"],
    wildcardMimePrefixes: ["image/"],
  });
});

test("validateFileInput checks accepted extensions consistently", () => {
  const error = validateFileInput({
    file: new File(["x"], "sheet.json", { type: "application/json" }),
    accept: ".csv, .txt",
    acceptedExtensions: parseAcceptedExtensions(".csv, .txt"),
  });

  assert.equal(error, "Please upload only .csv, .txt files");
});

test("validateFileInput formats rule label when accept string is omitted", () => {
  const error = validateFileInput({
    file: new File(["x"], "sheet.json", { type: "application/json" }),
    acceptedRules: {
      extensions: [".csv"],
      mimeTypes: ["application/json"],
      wildcardMimePrefixes: ["image/"],
    },
  });

  assert.equal(error, null);

  const disallowedError = validateFileInput({
    file: new File(["x"], "sheet.txt", { type: "text/plain" }),
    acceptedRules: {
      extensions: [".csv"],
      mimeTypes: ["application/json"],
      wildcardMimePrefixes: ["image/"],
    },
  });

  assert.equal(
    disallowedError,
    "Please upload only .csv, application/json, image/* files",
  );
});

test("validateFileInput accepts wildcard and exact mime type rules", () => {
  const pngError = validateFileInput({
    file: new File(["x"], "sheet.bin", { type: "image/png" }),
    accept: "image/*,application/json",
  });
  const jsonError = validateFileInput({
    file: new File(["x"], "sheet.bin", { type: "application/json" }),
    accept: "image/*,application/json",
  });

  assert.equal(pngError, null);
  assert.equal(jsonError, null);
});

test("validateFileInput enforces max size", () => {
  const error = validateFileInput({
    file: new File(["12345"], "sheet.csv", { type: "text/csv" }),
    maxSize: 4,
  });

  assert.equal(error, "File size exceeds maximum limit of 0MB");
});

test("validateFileInput delegates to custom validator", () => {
  const error = validateFileInput({
    file: new File(["x"], "sheet.csv", { type: "text/csv" }),
    validator: () => "Custom validation error",
  });

  assert.equal(error, "Custom validation error");
});

test("validateFileInput returns null when all checks pass", () => {
  const error = validateFileInput({
    file: new File(["x"], "sheet.csv", { type: "text/csv" }),
    accept: ".csv",
    acceptedExtensions: [".csv"],
    maxSize: 1024,
  });

  assert.equal(error, null);
});
