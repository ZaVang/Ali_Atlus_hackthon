// Contract tests for the non-destructive Atlas offer recheck. These tests
// stub fetch and never call the network. The live provider may only claim
// `verified` when status is numeric 0, routings is an array, and the exact
// routingIdentifier is returned again.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MockAtlasFlightProvider } from "../.test-build/providers/mock-atlas.js";
import { SandboxAtlasFlightProvider } from "../.test-build/providers/sandbox-atlas.js";

const search = { origin: "PVG", destination: "KUL", departDate: "2026-09-10", currency: "USD" };
const atlasOffer = {
  id: "atlas-offer-1",
  source: "atlas-sandbox",
  origin: "PVG",
  destination: "KUL",
  segments: [],
  totalPrice: 100,
  currency: "USD",
  routingIdentifier: "RID-1",
};
const mockOffer = { ...atlasOffer, id: "mock-offer-1", source: "mock", routingIdentifier: undefined };

function response(payload, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => payload };
}

async function withFetch(handler, action) {
  const previous = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    return await action();
  } finally {
    globalThis.fetch = previous;
  }
}

test("matching numeric status=0 routingIdentifier is verified by a fresh search", async () => {
  let requestUrl = "";
  let requestBody = null;
  const result = await withFetch(async (url, init) => {
    requestUrl = url;
    requestBody = JSON.parse(init.body);
    return response({ status: 0, routings: [{ routingIdentifier: "RID-1" }] });
  }, () => new SandboxAtlasFlightProvider().recheckOffer({ offer: atlasOffer, search }));

  assert.equal(result.status, "verified");
  assert.equal(result.source, "atlas-sandbox");
  assert.equal(result.routingIdentifier, "RID-1");
  assert.equal(requestUrl, "/api/atlas/search.do");
  assert.equal(requestBody.fromCity, "PVG");
  assert.equal(requestBody.toCity, "KUL");
  assert.equal(requestBody.fromDate, "20260910");
});

test("a valid search that omits the target is not-found, not verified", async () => {
  const result = await withFetch(async () => response({ status: 0, routings: [{ routingIdentifier: "RID-OTHER" }] }), () =>
    new SandboxAtlasFlightProvider().recheckOffer({ offer: atlasOffer, search }));
  assert.equal(result.status, "not-found");
  assert.equal(result.source, "atlas-sandbox");
});

test("unknown status values cannot be promoted to verified", async () => {
  const result = await withFetch(async () => response({ status: "0", routings: [{ routingIdentifier: "RID-1" }] }), () =>
    new SandboxAtlasFlightProvider().recheckOffer({ offer: atlasOffer, search }));
  assert.equal(result.status, "unavailable");
  assert.equal(result.source, "unavailable");
  assert.notEqual(result.status, "verified");
});

test("malformed routing payloads fail closed", async () => {
  const cases = [
    { status: 0 },
    { status: 0, routings: [{ fid: "missing-routing-id" }] },
    { status: 0, routings: "not-an-array" },
  ];
  for (const payload of cases) {
    const result = await withFetch(async () => response(payload), () =>
      new SandboxAtlasFlightProvider().recheckOffer({ offer: atlasOffer, search }));
    assert.equal(result.status, "unavailable");
    assert.equal(result.source, "unavailable");
  }
});

test("proxy/network failure is unavailable and never a stale Atlas claim", async () => {
  const result = await withFetch(async () => response({ status: "unavailable" }, { ok: false, status: 503 }), () =>
    new SandboxAtlasFlightProvider().recheckOffer({ offer: atlasOffer, search }));
  assert.equal(result.status, "unavailable");
  assert.equal(result.source, "unavailable");
  assert.match(result.message, /HTTP 503/);
});

test("invalid JSON from the proxy is unavailable", async () => {
  const result = await withFetch(async () => ({ ok: true, status: 200, json: async () => { throw new Error("invalid json"); } }), () =>
    new SandboxAtlasFlightProvider().recheckOffer({ offer: atlasOffer, search }));
  assert.equal(result.status, "unavailable");
  assert.equal(result.source, "unavailable");
  assert.match(result.message, /invalid JSON/);
});

test("missing routingIdentifier is unavailable without making a request", async () => {
  let called = false;
  const result = await withFetch(async () => {
    called = true;
    return response({ status: 0, routings: [] });
  }, () => new SandboxAtlasFlightProvider().recheckOffer({ offer: { ...atlasOffer, routingIdentifier: undefined }, search }));
  assert.equal(result.status, "unavailable");
  assert.equal(result.source, "unavailable");
  assert.equal(called, false);
});

test("mock mode reports snapshot provenance and never calls Atlas", async () => {
  let called = false;
  const result = await withFetch(async () => {
    called = true;
    return response({ status: 0, routings: [] });
  }, () => new MockAtlasFlightProvider().recheckOffer({ offer: mockOffer, search }));
  assert.equal(result.status, "snapshot");
  assert.equal(result.source, "mock");
  assert.match(result.message, /snapshot/i);
  assert.equal(called, false);
});
