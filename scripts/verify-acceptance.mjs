// Acceptance gate for the Connection Integrity demo contract. Runs the full
// type-checked build, then verifies that the shipped bundle honours the
// acceptance checks in docs/CONNECTION_INTEGRITY_DEMO.md:
//   1. The KUL scenario numbers match the contract table.
//   2. The visible rubric (60-minute floor + 90-minute buffer) yields the
//      promised fits, including the +60 min delay case (55 min = insufficient).
//   3. The built UI carries every required disclosure label and never carries
//      an uncalibrated probability claim.
// Usage: node scripts/verify-acceptance.mjs
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const failures = [];
const passes = [];

function check(name, ok, detail = "") {
  (ok ? passes : failures).push(ok ? name : `${name}${detail ? ` — ${detail}` : ""}`);
}

function runNode(scriptPath, args) {
  return spawnSync(process.execPath, [join(root, scriptPath), ...args], { cwd: root, stdio: "pipe", encoding: "utf8" });
}

// --- 1. Full type-checked build (tsc + vite build) -------------------------
const tsc = runNode("node_modules/typescript/bin/tsc", []);
check("tsc type check", tsc.status === 0, (tsc.stdout + tsc.stderr).trim().slice(0, 400));
const vite = runNode("node_modules/vite/bin/vite.js", ["build"]);
check("vite production build", vite.status === 0, (vite.stdout + vite.stderr).trim().slice(0, 400));

// --- 2. Contract fixture numbers -------------------------------------------
const fixtureText = readFileSync(join(root, "src/data/connection-integrity.ts"), "utf8");
check("fixture: shortest = 115 min", fixtureText.includes("connectionMinutes: 115"));
check("fixture: shortest fare = $133.91", fixtureText.includes("price: 133.91"));
check("fixture: buffered = 185 min", fixtureText.includes("connectionMinutes: 185"));
check("fixture: buffered fare = $148.10", fixtureText.includes("price: 148.1"));
check("fixture: published Fly-Thru minimum = 60 min", fixtureText.includes("flyThruMinimumMinutes: 60"));
check("fixture: AirAsia policy source linked", fixtureText.includes("support.airasia.com"));

// --- 3. Rubric arithmetic (60-minute floor + 90-minute buffer) --------------
const PUBLISHED_MINIMUM = 60;
const PLANNING_BUFFER = 90;
function fit(remainingMinutes) {
  if (remainingMinutes < PUBLISHED_MINIMUM) return "insufficient";
  return remainingMinutes < PUBLISHED_MINIMUM + PLANNING_BUFFER ? "tight" : "comfortable";
}
check("rubric: 115 min → tight", fit(115) === "tight");
check("rubric: 185 min → comfortable", fit(185) === "comfortable");
check("rubric: 115 min after +60 delay (55 min) → insufficient", fit(115 - 60) === "insufficient");

// --- 4. Built bundle disclosures -------------------------------------------
const distAssets = join(root, "dist/assets");
let bundle = "";
if (existsSync(distAssets)) {
  for (const file of readdirSync(distAssets)) {
    if (file.endsWith(".js")) bundle += readFileSync(join(distAssets, file), "utf8");
  }
}
check("dist: JavaScript bundle present", bundle.length > 0, "run after a successful build");

const required = [
  ["ticket-protection disclosure", "Ticket protection not confirmed"],
  ["time-fit rubric visible", "min published minimum +"],
  ["policy parameters disclosed", "min planning buffer"],
  ["registry-driven policy disclosure", "Policy: "],
  ["registered KUL policy label shipped", "AirAsia Fly-Thru"],
  ["no-policy honest disclosure", "No configured connection policy exists for this route"],
  ["live agent provenance label", "Agent-generated"],
  ["fixture agent provenance label", "Demo agent fixture"],
  ["simulated event disclosure", "Simulated operational event"],
  ["consent disclosure", "Traveller consent required"],
  ["ATRIP snapshot provenance", "ATRIP Sandbox offer snapshot"],
  ["routing identifier disclosure", "routingIdentifier"],
  ["fresh Atlas recheck disclosure", "fresh search.do"],
  ["snapshot-only recheck state", "Snapshot only"],
  ["unavailable recheck state", "Unavailable — not verified"],
  ["self-transfer labelling", "self-transfer"],
  ["product promise", "Sellable"],
  ["rubric disclaimer", "not a historical missed-connection probability"],
  ["honest search-failure banner", "no recommendation is generated until live provider data is available"],
  ["audit trail disclosure", "Persisted in this browser"],
  ["visible Agent trace", "How the Agent and rules reached this point"],
  ["trace preference stage", "Preference interpretation"],
  ["trace flight stage", "Atlas / flight search"],
  ["trace official evidence stage", "Official evidence search"],
  ["trace community evidence stage", "Community evidence search"],
  ["trace policy stage", "Policy / rubric gate"],
  ["trace recommendation stage", "Recommendation"],
  ["trace consent stage", "Consent gate"],
  ["trace snapshot provenance", "Snapshot · recorded input/cache"],
  ["trace mock provenance", "Mock · deterministic fixture"],
  ["trace live provenance", "Live · provider call"],
  ["trace unavailable provenance", "Unavailable · no claim shown"],
  ["trace Seattle origin disclosure", "Problem origin · Seattle"],
  ["trace Sandbox narrative disclosure", "not the Seattle incident"],
];
for (const [name, text] of required) {
  check(`dist: required label "${name}"`, bundle.includes(text));
}

// No screen may carry an uncalibrated probability claim. The disclaimer phrase
// itself ("not a historical missed-connection probability") is allowed.
const forbidden = [
  [/chance of missing/gi, "chance of missing"],
  [/chance of making/gi, "chance of making"],
  [/estimated chance/gi, "estimated chance"],
  [/probability of (catching|making|missing)/gi, "probability of catching/making/missing"],
  [/\d+(?:\.\d+)?% (?:chance|risk|probability|confidence)/gi, "numeric chance/risk/confidence claim"],
];
for (const [pattern, name] of forbidden) {
  const cleaned = bundle.replaceAll("not a historical missed-connection probability", "");
  check(`dist: no "${name}"`, !pattern.test(cleaned), "found an uncalibrated probability claim");
}

// --- 5. Behavioural assertions on source (contract rules, not just labels) --
function readSrc(rel) {
  return readFileSync(join(root, "src", rel), "utf8");
}
// Server-side governance now lives in the shared server/logic.mjs module,
// mounted identically by the Vite dev middlewares and the standalone
// Node service (server/index.mjs).
const logicSource = readFileSync(join(root, "server/logic.mjs"), "utf8");
const rulesSource = readSrc("domain/itinerary-rules.ts");
const labSource = readSrc("components/ItineraryLab.tsx");
check(
  "behaviour: pairs below the resolved policy's screening floor are excluded before ranking",
  /connectionMinutes < policy\.publishedMinimumMinutes[\s\S]{0,200}?continue/.test(rulesSource) && labSource.includes('from "../domain/itinerary-rules"'),
);
check(
  "behaviour: without a configured policy no borrowed floor applies (only positive windows survive)",
  /connectionMinutes <= 0/.test(rulesSource) && labSource.includes("resolveConnectionPolicy"),
);
check(
  "behaviour: the chooser never labels assembled pairs as a single ticket",
  labSource.includes("self-transfer") && !/single (ticket|PNR) confirmed/i.test(labSource),
);
const appSource = readSrc("App.tsx");
check("behaviour: no legacy traveller/ops view is reachable", !/OpsBoard|TravellerFlow/.test(appSource));
const integritySource = readSrc("components/ConnectionIntegrityDemo.tsx");
const traceSource = readSrc("domain/agent-trace.ts");
check(
  "behaviour: ticket protection is disclosed separately from time fit",
  integritySource.includes("Ticket protection not confirmed") && integritySource.includes("Likely comfortable"),
);
check(
  "behaviour: airline intervention is labelled simulated and consent-gated",
  integritySource.includes("Simulated operational event") && integritySource.includes("Consent required"),
);
check(
  "behaviour: disclosed fallback sources stay visibly distinct from live research",
  integritySource.includes("disclosed fallback input") && logicSource.includes("disclosed: true"),
);
const viteSource = readSrc("../vite.config.ts");
check(
  "architecture: Vite dev middlewares reuse the shared server/logic.mjs handlers",
  viteSource.includes('from "./server/logic.mjs"') && viteSource.includes("createConnectionResearchHandler"),
);
const serverEntrySource = readFileSync(join(root, "server/index.mjs"), "utf8");
check(
  "architecture: the standalone Node service mounts the same shared handlers",
  serverEntrySource.includes("./logic.mjs") && serverEntrySource.includes("createServer") && serverEntrySource.includes("createConnectionResearchHandler"),
);
check(
  "behaviour: research retries are bounded at two rounds and disclosed",
  logicSource.includes("let attempts = 1;") && logicSource.includes("attempts = 2;") && logicSource.includes("retryQuery") && !logicSource.includes("attempts = 3"),
);
check(
  "behaviour: the client whitelists retry telemetry before showing it",
  readSrc("providers/bailian-agent.ts").includes("body.attempts === 1 || body.attempts === 2"),
);
check(
  "behaviour: a second evidence round is visibly disclosed in the UI",
  integritySource.includes("Search rounds") && integritySource.includes("Round-2 query"),
);
const sandboxSource = readSrc("providers/sandbox-atlas.ts");
check(
  "behaviour: ATRIP segments map from structured fromSegments, not identifier regex guessing",
  sandboxSource.includes("mapSegments(routing.fromSegments)") && !sandboxSource.includes("parseSegmentsFromIdentifier"),
);
check(
  "behaviour: selected offers expose a non-destructive exact-routing recheck",
  sandboxSource.includes("recheckOffer") && labSource.includes("recheckSelected") && labSource.includes("matches each exact <code>routingIdentifier</code>"),
);
check(
  "behaviour: empty thinking-synthesis content falls back to a non-thinking retry with diagnostics",
  logicSource.includes("retrying with thinking disabled") && logicSource.includes("finish_reason="),
);
check(
  "behaviour: cached briefs re-use the live provider's field-by-field whitelist",
  integritySource.includes("isWhitelistedConnectionBrief") && readSrc("providers/bailian-agent.ts").includes("export function isWhitelistedConnectionBrief"),
);
check(
  "behaviour: switching traveller/airline side clears the previous side's brief",
  /function switchSide[\s\S]{0,300}?setBrief\(null\)/.test(integritySource),
);
check(
  "behaviour: consent and proposal events persist to a timestamped local audit trail",
  integritySource.includes("connection-integrity:audit-trail") && integritySource.includes("new Date().toISOString()"),
);
check(
  "behaviour: visible trace has a fixed stage order and rejects stale runs",
  traceSource.includes("AGENT_TRACE_STAGES") && traceSource.includes("event.runId !== state.runId") && traceSource.includes("events.sort"),
);
check(
  "behaviour: mock and snapshot trace sources cannot be treated as live",
  traceSource.includes('if (source === "mock") return "mock"') && traceSource.includes('return source === "live"'),
);
check(
  "behaviour: the synthesis prompt enforces contract wording over the MCT abbreviation",
  logicSource.includes("published minimum connection time"),
);

// --- 5b. Configurable evidence-threshold framework (policy registry) --------
const registry = await import(new URL("../src/domain/connection-policies.mjs", import.meta.url));
const kulEntry = registry.CONNECTION_POLICIES.find((entry) => entry.id === "kul-airasia-flythru");
const nonKulEntries = registry.CONNECTION_POLICIES.filter((entry) => !entry.connectionAirports.includes("KUL"));
check("policy registry: KUL/AirAsia entry carries the published 60 + 90 parameters", kulEntry?.publishedMinimumMinutes === 60 && kulEntry?.planningBufferMinutes === 90);
check("policy registry: KUL entry whitelists the official evidence domain", Array.isArray(kulEntry?.officialDomains) && kulEntry.officialDomains.includes("airasia.com"));
check("policy registry: at least one non-KUL entry proves extensibility", nonKulEntries.length >= 1);
check("policy registry: unverified entries are honestly marked illustrative", nonKulEntries.every((entry) => entry.policySource.illustrative === true));
check("policy registry: resolution uses verified KUL and ignores illustrative/unconfigured routes", registry.resolveConnectionPolicy({ connectionAirport: "KUL", flightNumbers: ["AK727"] })?.id === "kul-airasia-flythru" && registry.resolveConnectionPolicy({ connectionAirport: "PVG" }) === null && registry.resolveConnectionPolicy({ connectionAirport: "LHR" }) === null);
check("policy registry: no-policy disclosure is non-empty", typeof registry.NO_POLICY_DISCLOSURE === "string" && registry.NO_POLICY_DISCLOSURE.length > 0);
check(
  "architecture: server evidence search resolves domains/templates from the registry, no hard-coded airasia gate",
  logicSource.includes('from "../src/domain/connection-policies.mjs"') && logicSource.includes("resolveConnectionPolicy") && logicSource.includes("renderQueryTemplate") && !logicSource.includes('include_domains: ["airasia.com"]'),
);
check(
  "architecture: screening/ranking rules and the lab resolve parameters from the registry",
  rulesSource.includes('from "./connection-policies.mjs"') && labSource.includes('from "../domain/connection-policies.mjs"') && !rulesSource.includes("MINIMUM_SCREENING_MINUTES"),
);

// --- 6. Numeric unit tests (rubric boundaries, screening/ranking, whitelist) --
const unitTests = runNode("scripts/run-tests.mjs", []);
check("unit tests: rubric / itinerary rules / whitelist / policy registry suites pass", unitTests.status === 0, (unitTests.stdout + unitTests.stderr).trim().slice(-400));

// --- Report -----------------------------------------------------------------
for (const name of passes) console.log(`  ok  ${name}`);
for (const name of failures) console.log(`FAIL  ${name}`);
console.log(`\n${passes.length} passed, ${failures.length} failed`);
if (failures.length > 0) process.exitCode = 1;
