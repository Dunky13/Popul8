import { strict as assert } from "node:assert";
import { test } from "node:test";
import { replacePlaceholderTokens } from "../src/utils/regexUtils";

test("replaces every placeholder token deterministically", () => {
  const input = [
    'id="{{name}}"',
    ">{{ name }}</text>",
    "data-copy='{{name}}'",
  ].join(" ");

  const replaced = replacePlaceholderTokens(input, "name", "display_name");

  assert.equal(replaced.includes("{{name}}"), false);
  assert.equal(replaced.includes("{{display_name}}"), true);
});

test("keeps non-matching text unchanged", () => {
  const input = "<text>{{title}}</text>";
  const replaced = replacePlaceholderTokens(input, "name", "display_name");
  assert.equal(replaced, input);
});
