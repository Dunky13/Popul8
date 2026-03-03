import { strict as assert } from "node:assert";
import { afterEach, beforeEach, test } from "node:test";
import { useAppStore } from "../src/store/appStore";
import {
  ADVANCED_EVER_ENABLED_STORAGE_KEY,
  ADVANCED_STORAGE_KEY,
} from "../src/utils/editorPreferences";
import type { ParsedData, SVGTemplate } from "../src/types/template";

const csvData: ParsedData = {
  headers: ["Name", "Role"],
  rows: [
    { Name: "Aria", Role: "Analyst" },
    { Name: "", Role: "Operator" },
  ],
  fileName: "records.csv",
};

const previewTemplate: SVGTemplate = {
  content: "<svg viewBox='0 0 100 100'><text>{{name}}</text></svg>",
  placeholders: ["name"],
  elementIds: [],
  fileName: "preview.svg",
};

const requiredTemplate: SVGTemplate = {
  content: "<svg viewBox='0 0 100 100'><text>{{name!}}</text></svg>",
  placeholders: ["name!"],
  elementIds: [],
  fileName: "required.svg",
};

const missingFontTemplate: SVGTemplate = {
  content:
    "<svg viewBox='0 0 100 100'><style>.title { font-family: 'Eagle Lake'; }</style><text>{{name}}</text></svg>",
  placeholders: ["name"],
  elementIds: [],
  fileName: "missing-font.svg",
};

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

beforeEach(() => {
  useAppStore.getState().clearAll();
});

afterEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: originalLocalStorage,
  });
});

test("workflow reaches preview when template and mapping are complete", () => {
  const store = useAppStore.getState();

  store.setCsvData(csvData);
  store.setSvgTemplate(previewTemplate);
  store.setSelectedRowIndices([0]);
  store.setDataMapping({ name: "Name" });

  assert.equal(store.isReadyForMapping(), true);
  assert.equal(store.isReadyForPreview(), true);
});

test("required placeholder rules remove blocked rows in selection", () => {
  const store = useAppStore.getState();

  store.setCsvData(csvData);
  store.setSvgTemplate(requiredTemplate);
  store.setSelectedRowIndices([0, 1]);
  store.setDataMapping({ "name!": "Name" });

  assert.deepEqual(useAppStore.getState().selectedRowIndices, [0]);

  store.setRequiredRowOverrides([1]);
  store.setSelectedRowIndices([0, 1]);
  store.setDataMapping({ "name!": "Name" });

  assert.deepEqual(useAppStore.getState().selectedRowIndices, [0, 1]);
});

test("edit readiness does not block on missing fonts in non-advanced mode", () => {
  const store = useAppStore.getState();
  store.setSvgTemplate(missingFontTemplate);

  assert.equal(store.isEditComplete(), true);
});

test("edit readiness does not block on missing fonts when advanced auto-load is enabled", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
  localStorage.setItem(ADVANCED_STORAGE_KEY, "true");
  localStorage.setItem(ADVANCED_EVER_ENABLED_STORAGE_KEY, "true");

  const store = useAppStore.getState();
  store.setSvgTemplate(missingFontTemplate);

  assert.equal(store.isEditComplete(), true);
});
