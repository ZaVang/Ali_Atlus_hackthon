// Numeric pass/reject verification of the field-by-field brief whitelist
// (isWhitelistedConnectionBrief). The same guard protects live agent
// responses and briefs re-read from browser cache.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isWhitelistedConnectionBrief } from "../.test-build/providers/bailian-agent.js";

function validBrief(overrides = {}) {
  return {
    connectionFit: "tight",
    protectionStatus: "not-confirmed",
    recommendationSummary: "The buffered option adds 70 minutes for $14.19.",
    assessmentConfidence: "medium",
    rationale: "115 minutes exceeds the 60-minute published minimum by less than 90 minutes.",
    keyFactors: ["115-minute connection window"],
    limitations: ["No verified single-PNR evidence"],
    nextAction: "Choose the buffered option if price flexibility allows.",
    ...overrides,
  };
}

test("a fully valid brief passes the whitelist", () => {
  assert.equal(isWhitelistedConnectionBrief(validBrief()), true);
});

test("sources are optional; when present they must match the source shape", () => {
  assert.equal(isWhitelistedConnectionBrief(validBrief({ sources: [] })), true);
  assert.equal(
    isWhitelistedConnectionBrief(validBrief({ sources: [{ tier: "official", title: "Fly-Thru policy", url: "https://support.airasia.com/x", summary: "60 minutes to 18 hours." }] })),
    true,
  );
  assert.equal(isWhitelistedConnectionBrief(validBrief({ sources: [{ tier: "blog", title: "t", url: "u", summary: "s" }] })), false);
  assert.equal(isWhitelistedConnectionBrief(validBrief({ sources: [{ tier: "official", title: 42, url: "u", summary: "s" }] })), false);
  assert.equal(isWhitelistedConnectionBrief(validBrief({ sources: [{ tier: "official", title: "t", url: "javascript:alert(1)", summary: "s" }] })), false);
  assert.equal(isWhitelistedConnectionBrief(validBrief({ sources: "not-an-array" })), false);
});

test("every closed enum rejects out-of-whitelist values", () => {
  assert.equal(isWhitelistedConnectionBrief(validBrief({ connectionFit: "risky" })), false);
  assert.equal(isWhitelistedConnectionBrief(validBrief({ connectionFit: undefined })), false);
  assert.equal(isWhitelistedConnectionBrief(validBrief({ protectionStatus: "maybe" })), false);
  assert.equal(isWhitelistedConnectionBrief(validBrief({ recommendedOption: "both" })), true);
  assert.equal(isWhitelistedConnectionBrief(validBrief({ assessmentConfidence: "very-high" })), false);
});

test("explanation fields must be present strings", () => {
  assert.equal(isWhitelistedConnectionBrief(validBrief({ recommendationSummary: 123 })), false);
  assert.equal(isWhitelistedConnectionBrief(validBrief({ rationale: null })), false);
  assert.equal(isWhitelistedConnectionBrief(validBrief({ nextAction: undefined })), false);
});

test("keyFactors and limitations must be arrays", () => {
  assert.equal(isWhitelistedConnectionBrief(validBrief({ keyFactors: "one factor" })), false);
  assert.equal(isWhitelistedConnectionBrief(validBrief({ limitations: { hidden: true } })), false);
  assert.equal(isWhitelistedConnectionBrief(validBrief({ keyFactors: ["ok", { hidden: true }] })), false);
});

test("non-object inputs are rejected outright", () => {
  assert.equal(isWhitelistedConnectionBrief(null), false);
  assert.equal(isWhitelistedConnectionBrief(undefined), false);
  assert.equal(isWhitelistedConnectionBrief("tight"), false);
  assert.equal(isWhitelistedConnectionBrief(42), false);
});

test("an empty array brief fails because required enums are missing", () => {
  assert.equal(isWhitelistedConnectionBrief([]), false);
});
