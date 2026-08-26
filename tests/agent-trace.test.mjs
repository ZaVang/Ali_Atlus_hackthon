// Regression coverage for the visible trace state machine. These tests stay
// pure: no browser, network, provider, or UI rendering is involved.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AGENT_TRACE_STAGES,
  applyAgentTraceEvent,
  createAgentTraceState,
  isLiveTraceSource,
  traceSourceForProvider,
} from "../.test-build/domain/agent-trace.js";

function event(stage, overrides = {}) {
  return {
    stage,
    status: "complete",
    source: "deterministic",
    summary: `done: ${stage}`,
    ...overrides,
  };
}

test("trace starts with the canonical seven stages in stable order", () => {
  const state = createAgentTraceState(4);
  assert.deepEqual(state.events.map((item) => item.stage), [...AGENT_TRACE_STAGES]);
  assert.ok(state.events.every((item) => item.runId === 4 && item.status === "pending"));
});

test("events applied out of order are rendered in canonical order", () => {
  let state = createAgentTraceState(1);
  state = applyAgentTraceEvent(state, { ...event("community-evidence-search"), runId: 1 });
  state = applyAgentTraceEvent(state, { ...event("flight-search"), runId: 1 });
  assert.deepEqual(state.events.map((item) => item.stage), [...AGENT_TRACE_STAGES]);
  assert.equal(state.events.find((item) => item.stage === "community-evidence-search")?.status, "complete");
});

test("stale run events cannot overwrite a newer run", () => {
  let state = createAgentTraceState(8);
  state = applyAgentTraceEvent(state, { ...event("recommendation", { summary: "new run" }), runId: 8 });
  const next = applyAgentTraceEvent(state, { ...event("recommendation", { summary: "old run" }), runId: 7 });
  assert.strictEqual(next, state);
  assert.equal(next.events.find((item) => item.stage === "recommendation")?.summary, "new run");
});

test("a terminal stage cannot regress when a late active event arrives", () => {
  let state = createAgentTraceState(2);
  state = applyAgentTraceEvent(state, { ...event("official-evidence-search"), runId: 2 });
  const next = applyAgentTraceEvent(state, {
    stage: "official-evidence-search",
    status: "active",
    source: "live",
    summary: "late response",
    runId: 2,
  });
  assert.strictEqual(next, state);
});

test("provider and fixture provenance never relabel mock as live", () => {
  assert.equal(traceSourceForProvider("mock"), "mock");
  assert.equal(traceSourceForProvider("atlas-sandbox"), "live");
  assert.equal(traceSourceForProvider("bailian"), "live");
  assert.equal(traceSourceForProvider("unknown-provider"), "unavailable");
  assert.equal(isLiveTraceSource("mock"), false);
  assert.equal(isLiveTraceSource("snapshot"), false);
  assert.equal(isLiveTraceSource("live"), true);
});

