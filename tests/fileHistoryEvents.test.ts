import { strict as assert } from "node:assert";
import { afterEach, beforeEach, test } from "node:test";
import {
  addFilesToHistory,
  clearHistory,
  getLastUsed,
  getSelection,
  hashFiles,
  listHistory,
  setLastUsed,
  setSelection,
} from "../src/utils/fileHistory";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

const originalLocalStorage = globalThis.localStorage;
const originalWindow = (globalThis as { window?: Window }).window;

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: new EventTarget(),
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: originalLocalStorage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
});

test("setSelection emits file-selection-updated only when normalized selection changes", async () => {
  await addFilesToHistory("csv", [
    new File(["Name\nA"], "a.csv", { type: "text/csv" }),
  ]);
  const [first] = listHistory("csv");
  let eventCount = 0;
  window.addEventListener("file-selection-updated", () => {
    eventCount += 1;
  });

  setSelection("csv", [first.id]);
  assert.equal(eventCount, 1);

  setSelection("csv", [first.id]);
  assert.equal(eventCount, 1);

  setSelection("csv", [first.id, first.id]);
  assert.equal(eventCount, 1);
  assert.deepEqual(getSelection("csv"), [first.id]);
});

test("setLastUsed emits file-last-used-updated only when ids change", async () => {
  await addFilesToHistory("csv", [
    new File(["Name\nA"], "a.csv", { type: "text/csv" }),
  ]);
  const [first] = listHistory("csv");
  let lastUsedEventCount = 0;
  let selectionEventCount = 0;
  window.addEventListener("file-last-used-updated", () => {
    lastUsedEventCount += 1;
  });
  window.addEventListener("file-selection-updated", () => {
    selectionEventCount += 1;
  });

  setLastUsed({ csvIds: [first.id] });
  assert.equal(lastUsedEventCount, 1);
  assert.equal(selectionEventCount, 0);

  setLastUsed({ csvIds: [first.id] });
  assert.equal(lastUsedEventCount, 1);
  assert.equal(selectionEventCount, 0);

  setLastUsed({ csvIds: [first.id, first.id] });
  assert.equal(lastUsedEventCount, 1);
  assert.equal(selectionEventCount, 0);
  assert.deepEqual(getLastUsed().csvIds, [first.id]);
});

test("clearing history emits file-selection-updated when selection and last-used are pruned", async () => {
  await addFilesToHistory("csv", [
    new File(["Name\nA"], "a.csv", { type: "text/csv" }),
  ]);
  const [first] = listHistory("csv");
  setSelection("csv", [first.id]);
  setLastUsed({ csvIds: [first.id] });

  let eventCount = 0;
  window.addEventListener("file-selection-updated", () => {
    eventCount += 1;
  });

  clearHistory("csv");

  assert.equal(eventCount, 1);
  assert.deepEqual(getSelection("csv"), []);
  assert.deepEqual(getLastUsed().csvIds, []);
});

test("re-uploading duplicate svg does not move it to top of history ordering", async () => {
  const fileA = new File(["<svg>A</svg>"], "a.svg", { type: "image/svg+xml" });
  const fileB = new File(["<svg>B</svg>"], "b.svg", { type: "image/svg+xml" });
  const [hashA] = await hashFiles([fileA]);

  await addFilesToHistory("svg", [fileA]);
  await addFilesToHistory("svg", [fileB]);
  await addFilesToHistory("svg", [fileA]);

  const svgHistory = listHistory("svg");
  assert.equal(svgHistory[0].fileName, "b.svg");
  assert.ok(svgHistory.some((entry) => entry.id === hashA));
});
