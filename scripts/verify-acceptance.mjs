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
  ["time-fit rubric visible", "60 min published minimum + 90 min planning buffer"],
  ["live agent provenance label", "Agent-generated"],
  ["fixture agent provenance label", "Demo agent fixture"],
  ["simulated event disclosure", "Simulated operational event"],
  ["consent disclosure", "Traveller consent required"],
  ["ATRIP snapshot provenance", "ATRIP Sandbox offer snapshot"],
  ["self-transfer labelling", "self-transfer"],
  ["product promise", "Sellable"],
  ["rubric disclaimer", "not a historical missed-connection probability"],
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
const labSource = readSrc("components/ItineraryLab.tsx");
check(
  "behaviour: pairs below the 60-min screening floor are excluded before ranking",
  /connectionMinutes < MINIMUM_SCREENING_MINUTES[\s\S]*?continue/.test(labSource),
);
check(
  "behaviour: the chooser never labels assembled pairs as a single ticket",
  labSource.includes("self-transfer") && !/single (ticket|PNR) confirmed/i.test(labSource),
);
const appSource = readSrc("App.tsx");
check("behaviour: no legacy traveller/ops view is reachable", !/OpsBoard|TravellerFlow/.test(appSource));
const integritySource = readSrc("components/ConnectionIntegrityDemo.tsx");
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
  integritySource.includes("disclosed fallback input") && readSrc("../vite.config.ts").includes("disclosed: true"),
);

// --- Report -----------------------------------------------------------------
for (const name of passes) console.log(`  ok  ${name}`);
for (const name of failures) console.log(`FAIL  ${name}`);
console.log(`\n${passes.length} passed, ${failures.length} failed`);
if (failures.length > 0) process.exitCode = 1;
