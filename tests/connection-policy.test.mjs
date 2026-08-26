// Numeric verification of the connection policy registry: policy resolution
// (KUL hit, illustrative PVG exclusion, honest no-match path) and template
// rendering. The KUL rendering assertions pin the rendered queries to the
// exact strings the research handler used before parameterization, so the
// KUL scenario's evidence-search behaviour cannot silently change.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONNECTION_POLICIES,
  GENERIC_QUERY_TEMPLATES,
  NO_POLICY_DISCLOSURE,
  resolveConnectionPolicy,
  renderQueryTemplate,
} from "../src/domain/connection-policies.mjs";

const KUL_POLICY = CONNECTION_POLICIES.find((policy) => policy.id === "kul-airasia-flythru");
const PVG_POLICY = CONNECTION_POLICIES.find((policy) => policy.id === "pvg-illustrative-template");

test("registry holds the KUL/AirAsia entry with the published 60 + 90 parameters", () => {
  assert.ok(KUL_POLICY, "kul-airasia-flythru entry must exist");
  assert.equal(KUL_POLICY.publishedMinimumMinutes, 60);
  assert.equal(KUL_POLICY.planningBufferMinutes, 90);
  assert.deepEqual(KUL_POLICY.connectionAirports, ["KUL"]);
  assert.deepEqual(KUL_POLICY.officialDomains, ["airasia.com"]);
  assert.ok(KUL_POLICY.policySource.url, "policy source must cite a URL");
  assert.ok(!KUL_POLICY.policySource.illustrative, "KUL entry is a sourced policy, not illustrative");
  assert.ok(KUL_POLICY.disclosedFallback, "KUL entry carries a disclosed fallback input");
});

test("registry holds at least one non-KUL entry, honestly labelled illustrative", () => {
  assert.ok(PVG_POLICY, "pvg-illustrative-template entry must exist");
  assert.deepEqual(PVG_POLICY.connectionAirports, ["PVG"]);
  assert.equal(PVG_POLICY.policySource.illustrative, true);
  assert.equal(PVG_POLICY.disclosedFallback, null, "an unverified entry must not ship a disclosed policy input");
});

test("resolution hits the KUL policy by connection airport", () => {
  const resolved = resolveConnectionPolicy({ connectionAirport: "KUL", flightNumbers: ["AK701", "D7323"] });
  assert.equal(resolved?.id, "kul-airasia-flythru");
  // Airport matching is case-insensitive and does not need flight numbers.
  assert.equal(resolveConnectionPolicy({ connectionAirport: "kul" })?.id, "kul-airasia-flythru");
});

test("resolution ignores the illustrative PVG entry and takes the no-policy path", () => {
  assert.equal(resolveConnectionPolicy({ connectionAirport: "PVG", flightNumbers: ["MU545"] }), null);
});

test("resolution returns null for unconfigured routes (explicit no-policy path)", () => {
  assert.equal(resolveConnectionPolicy({ connectionAirport: "LHR", flightNumbers: ["BA2490"] }), null);
  assert.equal(resolveConnectionPolicy({}), null);
  assert.ok(NO_POLICY_DISCLOSURE.length > 0, "the no-policy disclosure must be non-empty");
});

test("KUL query templates render exactly the pre-parameterization query strings", () => {
  const vars = { airport: "KUL", flights: ["AK701", "D7323"] };
  assert.equal(
    renderQueryTemplate(KUL_POLICY.queryTemplates.official, vars),
    "AirAsia Fly-Thru KUL Terminal 2 AK701 D7323 minimum connection time",
  );
  assert.equal(
    renderQueryTemplate(KUL_POLICY.queryTemplates.community, vars),
    "KUL Terminal 2 AirAsia international transfer time Fly-Thru passenger experience",
  );
  assert.equal(
    renderQueryTemplate(KUL_POLICY.queryTemplates.retry, vars),
    "AirAsia KUL Fly-Thru connecting flight policy transit transfer minimum time support",
  );
});

test("the no-policy path uses generic templates without airport-airline assumptions", () => {
  const rendered = renderQueryTemplate(GENERIC_QUERY_TEMPLATES.official, { airport: "LHR", flights: ["BA2490"] });
  assert.equal(rendered, "LHR airport official minimum connection time transfer policy BA2490");
  assert.ok(!/airasia|fly-?thru/i.test(rendered), "generic templates must not carry KUL/AirAsia assumptions");
  assert.ok(typeof GENERIC_QUERY_TEMPLATES.community === "string" && typeof GENERIC_QUERY_TEMPLATES.retry === "string");
});
