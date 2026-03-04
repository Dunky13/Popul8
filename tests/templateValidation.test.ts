import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  TEMPLATE_WARNING_PREFIX,
  handleTemplateValidationMessages,
  isTemplateValidationWarning,
} from "../src/utils/templateValidation";

test("isTemplateValidationWarning only matches prefix warnings", () => {
  assert.equal(isTemplateValidationWarning(`${TEMPLATE_WARNING_PREFIX} Hello`), true);
  assert.equal(isTemplateValidationWarning("Some Warning: not prefixed"), false);
});

test("handleTemplateValidationMessages reports warnings without throwing", () => {
  const warnings: string[] = [];
  handleTemplateValidationMessages(
    [`${TEMPLATE_WARNING_PREFIX} Missing placeholder`],
    (message) => warnings.push(message),
  );

  assert.deepEqual(warnings, [`${TEMPLATE_WARNING_PREFIX} Missing placeholder`]);
});

test("handleTemplateValidationMessages throws on first non-warning error", () => {
  assert.throws(
    () =>
      handleTemplateValidationMessages([
        `${TEMPLATE_WARNING_PREFIX} Missing placeholder`,
        "Template exceeds max size",
      ]),
    /Template exceeds max size/,
  );
});
