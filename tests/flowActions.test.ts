import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getFlowAction } from "../src/utils/flowActions";

test("upload flow action stays disabled until both source files are loaded", () => {
  const missingCsv = getFlowAction({
    currentStep: "upload",
    hasCsvUpload: false,
    hasTemplateUpload: true,
    readyForMapping: false,
    readyForPreview: false,
    selectedCount: 0,
    remainingPlaceholderCount: 0,
    requireCompleteUploadForEdit: true,
  });

  assert.deepEqual(missingCsv, {
    label: "Upload The Remaining Source File",
    shortLabel: "Finish upload",
    helper:
      "Both the CSV dataset and SVG template are required before the editor unlocks.",
    targetStep: "edit",
    enabled: false,
  });

  const ready = getFlowAction({
    currentStep: "upload",
    hasCsvUpload: true,
    hasTemplateUpload: true,
    readyForMapping: false,
    readyForPreview: false,
    selectedCount: 0,
    remainingPlaceholderCount: 0,
    requireCompleteUploadForEdit: true,
  });

  assert.deepEqual(ready, {
    label: "Continue To Template Editing",
    shortLabel: "Continue",
    helper:
      "Both files are loaded. Open the editor to refine placeholder regions.",
    targetStep: "edit",
    enabled: true,
  });
});

test("upload flow action preserves legacy behavior by default", () => {
  const legacyAction = getFlowAction({
    currentStep: "upload",
    hasCsvUpload: false,
    hasTemplateUpload: true,
    readyForMapping: false,
    readyForPreview: false,
    selectedCount: 0,
    remainingPlaceholderCount: 0,
  });

  assert.deepEqual(legacyAction, {
    label: "Continue To Template Editing",
    shortLabel: "Continue",
    helper: "CSV can be uploaded now or right before mapping.",
    targetStep: "edit",
    enabled: true,
  });
});
