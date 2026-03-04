import { strict as assert } from "node:assert";
import { beforeEach, test } from "node:test";
import { useAppStore } from "../src/store/appStore";
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

beforeEach(() => {
  useAppStore.getState().clearAll();
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
