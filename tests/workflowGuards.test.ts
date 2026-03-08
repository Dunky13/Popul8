import { strict as assert } from "node:assert";
import { test } from "node:test";
import { shouldRedirectToUploadForMissingSvg } from "../src/utils/workflowGuards";

test("missing svg redirects non-upload steps back to upload", () => {
  assert.equal(
    shouldRedirectToUploadForMissingSvg({
      currentStep: "edit",
      hasSvgTemplate: false,
    }),
    true,
  );

  assert.equal(
    shouldRedirectToUploadForMissingSvg({
      currentStep: "preview",
      hasSvgTemplate: false,
    }),
    true,
  );
});

test("upload step does not redirect and loaded svg keeps current step", () => {
  assert.equal(
    shouldRedirectToUploadForMissingSvg({
      currentStep: "upload",
      hasSvgTemplate: false,
    }),
    false,
  );

  assert.equal(
    shouldRedirectToUploadForMissingSvg({
      currentStep: "edit",
      hasSvgTemplate: true,
    }),
    false,
  );
});
