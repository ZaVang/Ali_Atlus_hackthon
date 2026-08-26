// Numeric verification of the Itinerary Lab screening line, the 18-hour
// pairing cap, currency/airport pairing guards, and the three transparent
// ranking rules — all parameterized by the connection policy registry. The
// KUL/AirAsia entry supplies the 60-minute floor and 90-minute buffer; the
// null-policy path keeps pairs by time compatibility only.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  connectionFit,
  localWallClockMinutes,
  makeCombinations,
  compareCombinations,
  GENERIC_MAX_CONNECTION_MINUTES,
} from "../.test-build/domain/itinerary-rules.js";
import { CONNECTION_POLICIES } from "../src/domain/connection-policies.mjs";

const KUL_POLICY = CONNECTION_POLICIES.find((policy) => policy.id === "kul-airasia-flythru");

function segment(depAirport, arrAirport, departureTime, arrivalTime) {
  return { departureAirport: depAirport, arrivalAirport: arrAirport, departureTime, arrivalTime, carrier: "AK", flightNumber: "AK700", durationMinutes: 60 };
}

function offer(id, price, currency, segments) {
  return { id, source: "atlas-sandbox", origin: segments[0].departureAirport, destination: segments[segments.length - 1].arrivalAirport, segments, totalPrice: price, currency };
}

// Inbound arrives KUL at 10:00 local wall clock.
const inbound = offer("in-1", 100, "USD", [segment("PVG", "KUL", "2026-09-10T06:00", "2026-09-10T10:00")]);
const outboundAt = (minutesAfterTen, price = 80, currency = "USD", id = "out-1") => {
  const total = 10 * 60 + minutesAfterTen;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return offer(id, price, currency, [segment("KUL", "SIN", `2026-09-10T${hh}:${mm}`, `2026-09-10T${hh}:${mm}`)]);
};

test("KUL registry entry supplies the screening floor (60) and the 18-hour cap", () => {
  assert.equal(KUL_POLICY.publishedMinimumMinutes, 60);
  assert.equal(KUL_POLICY.planningBufferMinutes, 90);
  assert.equal(KUL_POLICY.maxConnectionMinutes, 18 * 60);
  assert.equal(GENERIC_MAX_CONNECTION_MINUTES, 18 * 60);
});

test("screening line (KUL policy): a 59-minute pair is rejected, a 60-minute pair is eligible", () => {
  assert.equal(makeCombinations([inbound], [outboundAt(59)], KUL_POLICY).length, 0);
  const eligible = makeCombinations([inbound], [outboundAt(60)], KUL_POLICY);
  assert.equal(eligible.length, 1);
  assert.equal(eligible[0].connectionMinutes, 60);
  assert.equal(eligible[0].totalPrice, 180);
});

test("screening line: pairs beyond the 18-hour cap are rejected", () => {
  assert.equal(makeCombinations([inbound], [outboundAt(18 * 60)], KUL_POLICY).length, 1);
  assert.equal(makeCombinations([inbound], [outboundAt(18 * 60 + 1)], KUL_POLICY).length, 0);
});

test("no-policy path: no published floor applies, but non-positive windows are still rejected", () => {
  // A 30-minute window is below the KUL floor but survives without a policy:
  // there is no configured minimum to enforce, only honesty about the gap.
  assert.equal(makeCombinations([inbound], [outboundAt(30)], null).length, 1);
  assert.equal(makeCombinations([inbound], [outboundAt(0)], null).length, 0);
  assert.equal(makeCombinations([inbound], [outboundAt(-5)], null).length, 0);
  // The generic 18-hour pairing cap still bounds the no-policy path.
  assert.equal(makeCombinations([inbound], [outboundAt(18 * 60 + 1)], null).length, 0);
});

test("pairing guards: mismatched airports and currencies are rejected", () => {
  const wrongAirport = offer("out-x", 80, "USD", [segment("CGK", "SIN", "2026-09-10T12:00", "2026-09-10T13:00")]);
  assert.equal(makeCombinations([inbound], [wrongAirport], KUL_POLICY).length, 0);
  assert.equal(makeCombinations([inbound], [outboundAt(120, 80, "MYR")], KUL_POLICY).length, 0);
});

test("connectionFit boundaries under the KUL policy: 59/60/149/150/151", () => {
  assert.equal(connectionFit(59, KUL_POLICY), "insufficient");
  assert.equal(connectionFit(60, KUL_POLICY), "tight");
  assert.equal(connectionFit(149, KUL_POLICY), "tight");
  assert.equal(connectionFit(150, KUL_POLICY), "comfortable");
  assert.equal(connectionFit(151, KUL_POLICY), "comfortable");
});

test("wall-clock parser returns minute offsets and rejects malformed input", () => {
  assert.equal(localWallClockMinutes("2026-09-10T11:00") - localWallClockMinutes("2026-09-10T10:00"), 60);
  assert.equal(localWallClockMinutes("not-a-time"), null);
});

function combo(id, connectionMinutes, totalPrice, finalArrival = "2026-09-10T18:00") {
  return { id, inbound: {}, outbound: {}, connectionAirport: "KUL", connectionMinutes, totalPrice, currency: "USD", finalArrival };
}

test("lowest-cost ranking sorts by price; equal prices prefer the better time fit", () => {
  const cheap = combo("cheap", 120, 120);
  const pricey = combo("pricey", 160, 150);
  const samePriceComfortable = combo("comfort", 160, 120);
  const sorted = [pricey, cheap, samePriceComfortable].sort((a, b) => compareCombinations("lowest-cost", a, b, KUL_POLICY));
  assert.deepEqual(sorted.map((c) => c.id), ["comfort", "cheap", "pricey"]);
});

test("earliest-arrival ranking sorts by final arrival time", () => {
  const late = combo("late", 160, 100, "2026-09-10T22:00");
  const early = combo("early", 90, 140, "2026-09-10T15:00");
  const sorted = [late, early].sort((a, b) => compareCombinations("earliest-arrival", a, b, KUL_POLICY));
  assert.deepEqual(sorted.map((c) => c.id), ["early", "late"]);
});

test("largest-buffer ranking prefers comfortable over tight", () => {
  const tight = combo("tight", 120, 100);
  const comfortable = combo("comfortable", 170, 140);
  const sorted = [tight, comfortable].sort((a, b) => compareCombinations("largest-buffer", a, b, KUL_POLICY));
  assert.equal(sorted[0].id, "comfortable");
});

test("largest-buffer ranking: among comfortable options the one closest to the 150-minute target wins (more waiting is not better)", () => {
  const near = combo("near", 160, 140);
  const longWait = combo("long-wait", 300, 100);
  const exactTarget = combo("exact", 150, 200);
  const sorted = [longWait, near, exactTarget].sort((a, b) => compareCombinations("largest-buffer", a, b, KUL_POLICY));
  assert.deepEqual(sorted.map((c) => c.id), ["exact", "near", "long-wait"]);
});

test("no-policy largest-buffer ranking falls back to arrival order instead of an invented comfort target", () => {
  const early = combo("early", 90, 140, "2026-09-10T15:00");
  const late = combo("late", 300, 100, "2026-09-10T22:00");
  const sorted = [late, early].sort((a, b) => compareCombinations("largest-buffer", a, b, null));
  assert.deepEqual(sorted.map((c) => c.id), ["early", "late"]);
});
