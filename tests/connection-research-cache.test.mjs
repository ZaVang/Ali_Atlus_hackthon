import test from "node:test";
import assert from "node:assert/strict";
import {
  CONNECTION_RESEARCH_CACHE_PREFIX,
  CONNECTION_RESEARCH_LEGACY_V5_PREFIX,
  CONNECTION_RESEARCH_SEMANTICS_VERSION,
  readCurrentResearchCache,
  writeCurrentResearchCache,
} from "../.test-build/domain/connection-research-cache.js";

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key), values };
}

test("unexpired v5 evidence is hard-invalidated instead of migrating free text", () => {
  const local = storage();
  local.setItem(`${CONNECTION_RESEARCH_LEGACY_V5_PREFIX}baseline`, JSON.stringify({ expiresAt: 2_000, brief: { old: "Agent chooses AK707" } }));
  assert.equal(readCurrentResearchCache(local, "baseline", 1_000, () => true), null);
  assert.equal(local.getItem(`${CONNECTION_RESEARCH_LEGACY_V5_PREFIX}baseline`), null);
});

test("current semantic cache retains TTL and validation boundaries", () => {
  const local = storage();
  writeCurrentResearchCache(local, "baseline", { safe: true }, 1_000);
  const raw = JSON.parse(local.getItem(`${CONNECTION_RESEARCH_CACHE_PREFIX}baseline`));
  assert.equal(raw.semanticsVersion, CONNECTION_RESEARCH_SEMANTICS_VERSION);
  assert.deepEqual(readCurrentResearchCache(local, "baseline", 1_001, (brief) => brief.safe === true), { safe: true });
  assert.equal(readCurrentResearchCache(local, "baseline", raw.expiresAt, () => true), null);
});
