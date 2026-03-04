import { strict as assert } from "node:assert";
import { test } from "node:test";
import { handleAppKeyboardShortcut } from "../src/hooks/useAppKeyboardShortcuts";

const createStore = () => {
  const calls: Array<"upload" | "edit" | "mapping" | "select" | "preview"> = [];
  const store: {
    currentStep: "upload" | "edit" | "mapping" | "select" | "preview";
    setCurrentStep: (step: "upload" | "edit" | "mapping" | "select" | "preview") => void;
    isReadyForEdit: () => boolean;
    isReadyForMapping: () => boolean;
    isReadyForPreview: () => boolean;
  } = {
    currentStep: "upload",
    setCurrentStep: (step: "upload" | "edit" | "mapping" | "select" | "preview") => {
      calls.push(step);
      store.currentStep = step;
    },
    isReadyForEdit: () => true,
    isReadyForMapping: () => true,
    isReadyForPreview: () => true,
  };
  return { store, calls };
};

test("managed print shortcut routes through managed print action", () => {
  const { store, calls } = createStore();
  let preventDefaultCalls = 0;
  let printRequestCalls = 0;

  handleAppKeyboardShortcut(
    {
      ctrlKey: true,
      metaKey: false,
      shiftKey: true,
      key: "p",
      preventDefault: () => {
        preventDefaultCalls += 1;
      },
    },
    store,
    () => {
      printRequestCalls += 1;
    },
  );

  assert.equal(preventDefaultCalls, 1);
  assert.equal(store.currentStep, "preview");
  assert.deepEqual(calls, ["preview"]);
  assert.equal(printRequestCalls, 1);
});

test("managed print shortcut handles uppercase key value", () => {
  const { store, calls } = createStore();
  let printRequestCalls = 0;

  handleAppKeyboardShortcut(
    {
      ctrlKey: true,
      metaKey: false,
      shiftKey: true,
      key: "P",
      preventDefault: () => {},
    },
    store,
    () => {
      printRequestCalls += 1;
    },
  );

  assert.deepEqual(calls, ["preview"]);
  assert.equal(printRequestCalls, 1);
});

test("managed print shortcut does nothing when preview is not ready", () => {
  const { store, calls } = createStore();
  store.isReadyForPreview = () => false;
  let printRequestCalls = 0;

  handleAppKeyboardShortcut(
    {
      ctrlKey: true,
      metaKey: false,
      shiftKey: true,
      key: "p",
      preventDefault: () => {},
    },
    store,
    () => {
      printRequestCalls += 1;
    },
  );

  assert.deepEqual(calls, []);
  assert.equal(store.currentStep, "upload");
  assert.equal(printRequestCalls, 0);
});
