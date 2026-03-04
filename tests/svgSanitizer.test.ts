import { strict as assert } from "node:assert";
import { test } from "node:test";
import { sanitizeSvgMarkup } from "../src/utils/svgSanitizer";

test("removes unsafe SVG nodes and attributes", () => {
  const input = `
    <svg xmlns="http://www.w3.org/2000/svg" onload="alert('x')">
      <script>alert("x")</script>
      <image href="javascript:alert('x')" x="0" y="0" width="10" height="10" />
      <text style="fill: red; background-image: url(javascript:alert('x'))">
        Hello
      </text>
      <a xlink:href="https://example.com">Unsafe</a>
      <a xlink:href="#local">Safe</a>
    </svg>
  `;

  const sanitized = sanitizeSvgMarkup(input);

  assert.equal(sanitized.includes("<script"), false);
  assert.equal(sanitized.includes("onload="), false);
  assert.equal(sanitized.includes("javascript:"), false);
  assert.equal(sanitized.includes("background-image"), false);
  assert.equal(sanitized.includes('xlink:href="#local"'), true);
});

test("removes unsafe URL attributes on root element", () => {
  const input =
    '<svg xmlns="http://www.w3.org/2000/svg" href="javascript:alert(1)"><text>Hello</text></svg>';

  const sanitized = sanitizeSvgMarkup(input);

  assert.equal(sanitized.includes('href="javascript:'), false);
});
