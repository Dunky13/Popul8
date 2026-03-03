import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  buildDefaultMapping,
  buildMappingContextKey,
  canReuseMappingInContext,
} from "../src/utils/mappingDefaults";

test("buildMappingContextKey is stable for reordered input", () => {
  const keyA = buildMappingContextKey(["Role", "Name", "Name"], ["role", "name"]);
  const keyB = buildMappingContextKey(["Name", "Role"], ["name", "role"]);

  assert.equal(keyA, keyB);
});

test("canReuseMappingInContext returns true only for valid mappings in context", () => {
  assert.equal(
    canReuseMappingInContext({
      dataMapping: { name: "Name" },
      headers: ["Name", "Role"],
      placeholders: ["name", "role"],
    }),
    true,
  );

  assert.equal(
    canReuseMappingInContext({
      dataMapping: { name: "LegacyName" },
      headers: ["Name", "Role"],
      placeholders: ["name", "role"],
    }),
    false,
  );

  assert.equal(
    canReuseMappingInContext({
      dataMapping: {},
      headers: ["Name", "Role"],
      placeholders: ["name", "role"],
    }),
    false,
  );
});

test("buildDefaultMapping maps obvious placeholder-header pairs", () => {
  const mapping = buildDefaultMapping({
    headers: ["Name", "Role"],
    placeholders: ["name", "role"],
  });

  assert.deepEqual(mapping, { name: "Name", role: "Role" });
});
