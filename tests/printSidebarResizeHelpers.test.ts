import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  removeDraftField,
  removeFieldResizeRules,
} from "../src/components/PrintSidebar/resizeHelpers";
import type { TextResizeRules } from "../src/types/textResize";

test("removeDraftField returns the same object when field is absent", () => {
  const draft = { title: "90" };
  const next = removeDraftField(draft, "name");

  assert.equal(next, draft);
});

test("removeDraftField removes an existing draft value", () => {
  const draft = { title: "90", name: "120" };
  const next = removeDraftField(draft, "name");

  assert.deepEqual(next, { title: "90" });
  assert.equal(next === draft, false);
});

test("removeFieldResizeRules removes global field override", () => {
  const rules: TextResizeRules = {
    allCards: {
      title: { value: 92, unit: "percent" },
      name: { value: 16, unit: "px" },
    },
    perCard: {},
  };

  const next = removeFieldResizeRules({
    rules,
    selectedCardIds: [],
    field: "name",
  });

  assert.deepEqual(next.allCards, {
    title: { value: 92, unit: "percent" },
  });
  assert.deepEqual(next.perCard, {});
});

test("removeFieldResizeRules removes per-card field and prunes empty cards", () => {
  const rules: TextResizeRules = {
    allCards: {},
    perCard: {
      "record-1": {
        name: { value: 110, unit: "percent" },
      },
      "record-2": {
        name: { value: 95, unit: "percent" },
        title: { value: 13, unit: "px" },
      },
    },
  };

  const next = removeFieldResizeRules({
    rules,
    selectedCardIds: ["record-1", "record-2"],
    field: "name",
  });

  assert.deepEqual(next.perCard, {
    "record-2": {
      title: { value: 13, unit: "px" },
    },
  });
});
