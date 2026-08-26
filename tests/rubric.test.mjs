// Numeric verification of the disclosed 60 + 90 planning rubric.
// Boundary contract with publishedMinimum = 60:
//   59 → insufficient | 60 → tight | 149 → tight | 150 → comfortable | 151 → comfortable
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateConnectionFit, PLANNING_BUFFER_MINUTES } from "../.test-build/domain/rubric.js";

const MIN = 60; // published Fly-Thru minimum used by the KUL demo

test("rubric planning buffer constant is 90 minutes", () => {
  assert.equal(PLANNING_BUFFER_MINUTES, 90);
});

test("rubric boundary: 59 min (below published minimum) → insufficient", () => {
  assert.equal(evaluateConnectionFit(59, MIN), "insufficient");
});

test("rubric boundary: exactly 60 min (at published minimum) → tight", () => {
  assert.equal(evaluateConnectionFit(60, MIN), "tight");
});

test("rubric boundary: 149 min (minimum + 89) → tight", () => {
  assert.equal(evaluateConnectionFit(149, MIN), "tight");
});

test("rubric boundary: exactly 150 min (minimum + 90) → comfortable", () => {
  assert.equal(evaluateConnectionFit(150, MIN), "comfortable");
});

test("rubric boundary: 151 min (minimum + 91) → comfortable", () => {
  assert.equal(evaluateConnectionFit(151, MIN), "comfortable");
});

test("contract fixture numbers: 115 → tight, 185 → comfortable, 115-60 delay → insufficient", () => {
  assert.equal(evaluateConnectionFit(115, MIN), "tight");
  assert.equal(evaluateConnectionFit(185, MIN), "comfortable");
  assert.equal(evaluateConnectionFit(115 - 60, MIN), "insufficient");
});

test("rubric shifts correctly with a different published minimum", () => {
  // publishedMinimum = 45: 44 insufficient, 45 tight, 134 tight, 135 comfortable
  assert.equal(evaluateConnectionFit(44, 45), "insufficient");
  assert.equal(evaluateConnectionFit(45, 45), "tight");
  assert.equal(evaluateConnectionFit(134, 45), "tight");
  assert.equal(evaluateConnectionFit(135, 45), "comfortable");
});
