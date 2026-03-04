import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  extractElementIds,
  extractPlaceholders,
} from "../src/utils/svgTemplateParsing";

test("extracts placeholders from renderable nodes and scoped attributes", () => {
  const placeholders = extractPlaceholders(`
    <svg xmlns="http://www.w3.org/2000/svg">
      <style>.label::after { content: "{{ignore_style}}"; }</style>
      <script>const x = "{{ignore_script}}";</script>
      <text>{{name}}</text>
      <image href="{{avatar}}" />
      <g data-label="{{nickname}}">
        <title>Card</title>
      </g>
    </svg>
  `);

  assert.deepEqual(placeholders, ["avatar", "name", "nickname"]);
});

test("extracts IDs for single and double quoted attributes", () => {
  const ids = extractElementIds(`
    <svg xmlns="http://www.w3.org/2000/svg" id='root'>
      <g id="groupA">
        <text id='nameField'>{{name}}</text>
      </g>
    </svg>
  `);

  assert.deepEqual(ids, ["groupA", "nameField", "root"]);
});
