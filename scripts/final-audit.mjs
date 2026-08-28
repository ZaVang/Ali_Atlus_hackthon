// Offline judge/production audit.
//
// The command runs only local gates and static source checks. It never reads
// or prints secret values, never calls Atlas/Tavily/LLM, and never treats a
// README claim as proof that a live capability exists. External or human
// acceptance items remain explicitly BLOCKED/HUMAN in the report.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const failures = [];
const evidenceContract = JSON.parse(readFileSync(join(root, "docs/JUDGE_EVIDENCE.json"), "utf8"));

export function scoredGapClosures(contract) {
  return (Array.isArray(contract.gapClosures) ? contract.gapClosures : []).filter((item) => item.status !== "WAIVED" && Number.isInteger(item.points) && item.points > 0);
}

function runGate(name, args) {
  const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : npm;
  const commandArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", `${npm} run ${args.join(" ")}`]
    : ["run", ...args];
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    timeout: 180_000,
    windowsHide: true,
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  const ok = result.status === 0;
  if (!ok) failures.push(name);
  const lines = output.split(/\r?\n/).filter(Boolean);
  const detail = lines.at(-1) ?? (result.error ? String(result.error.message ?? result.error) : `exit=${result.status}`);
  console.log(`  ${ok ? "PASS" : "FAIL"} [automated] ${name}${ok ? "" : ` — ${detail.slice(0, 240)}`}`);
  return ok;
}

function read(rel) {
  try { return readFileSync(join(root, rel), "utf8"); } catch { return ""; }
}

function localFiles(relDir) {
  const dir = join(root, relDir);
  if (!existsSync(dir)) return [];
  const files = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
      const path = join(current, entry.name);
      if (entry.isDirectory()) visit(path);
      else files.push(relative(root, path));
    }
  };
  visit(dir);
  return files;
}

function evidenceCheck(name, ok, status, detail) {
  console.log(`  ${status} ${name} — ${detail}`);
  if (!ok && status === "TRACKED_REPRODUCIBLE") failures.push(name);
}

console.log("Final audit (offline; no provider calls)\n");
const gates = {
  mockBuild: runGate("npm run build:mock", ["build:mock"]),
  tests: runGate("npm test", ["test"]),
  build: runGate("npm run build", ["build"]),
  verify: runGate("npm run verify", ["verify"]),
  serverSmoke: runGate("npm run smoke:server", ["smoke:server"]),
  judgePreflight: runGate("npm run judge-preflight", ["judge-preflight"]),
  recordingPreflight: runGate("npm run recording-preflight", ["recording-preflight"]),
};

const app = read("src/App.tsx");
const integrity = read("src/components/ConnectionIntegrityDemo.tsx");
const lab = read("src/components/ItineraryLab.tsx");
const provider = read("src/providers/bailian-agent.ts");
const sandbox = read("src/providers/sandbox-atlas.ts");
const mockAtlas = read("src/providers/mock-atlas.ts");
const mockAgent = read("src/providers/mock-agent.ts");
const rules = read("src/domain/itinerary-rules.ts");
const registry = read("src/domain/connection-policies.mjs");
const server = read("server/logic.mjs");
const videoScript = read("docs/DEMO_VIDEO_SCRIPT.md");
const readme = read("README.md");
const liveEvidence = read("docs/LIVE_SMOKE_EVIDENCE.md");
const currentScreenshots = localFiles("verify-screenshots/current").filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file));
const requiredSubmissionVisuals = [
  "verify-screenshots/current/current-11-final-desktop-main.png",
  "verify-screenshots/current/current-12-resilience-receipt-mobile.png",
  "verify-screenshots/current/current-13-airline-replay-mobile.png",
  "verify-screenshots/current/current-14-itinerary-policy-mobile.png",
  "verify-screenshots/current/figma-product-audit-board.png",
  "verify-screenshots/current/README.md",
];
const hasTrackedSubmissionVisuals = requiredSubmissionVisuals.every((file) => existsSync(join(root, file)));
const videoFiles = localFiles(".").filter((file) => /\.(mp4|mov|webm|mkv)$/i.test(file));
const hasStableHostingManifest = existsSync(join(root, ".openai/hosting.json"));
const hasServicingCode = /fetch\([^)]*\/(?:verify|order|pay|void)\.do/i.test(`${sandbox}\n${provider}\n${server}`);
const hasRecordedLiveSmoke = /ATRIP Sandbox `search\.do` \| PASS[\s\S]*HTTP 200[\s\S]*status: 0/i.test(liveEvidence)
  && /Vite connection research \| PASS[\s\S]*HTTP 200/i.test(liveEvidence)
  && /Standalone Node service \| PASS/.test(liveEvidence);

console.log("\nLocal evidence classification");
evidenceCheck(
  "two-sided product contract is present in executable surfaces",
  /Connection Integrity|Traveller: choose|Airline: intervene/.test(`${app}\n${integrity}`),
  "TRACKED_REPRODUCIBLE",
  "App and ConnectionIntegrityDemo expose the traveller/airline flow",
);
evidenceCheck(
  "deterministic rules, whitelist, source gate and consent audit regressions pass",
  gates.tests && /MAX_REQUEST_BODY_BYTES|ALLOWED_ATLAS_ENDPOINTS|hostMatchesDomain|validateResearchBrief/.test(server) && /isWhitelistedConnectionBrief/.test(provider),
  "TRACKED_REPRODUCIBLE",
  "npm test includes server-audit.test.mjs and the shared fail-closed guards",
);
evidenceCheck(
  "mock mode is runnable without credentials",
  gates.mockBuild && existsSync(join(root, "scripts/build-mock.mjs")) && /source[^=]*=\s*\"mock\"/.test(mockAtlas) && /model:\s*\"mock-agent\"/.test(mockAgent),
  "TRACKED_REPRODUCIBLE",
  "build:mock, mock providers and zero-credential gates pass",
);
evidenceCheck(
  "policy thresholds are registry-driven and unrelated carriers do not borrow KUL/AirAsia parameters",
  gates.tests && /flightPrefixes/.test(registry) && /routeFlights/.test(lab) && /policy\.publishedMinimumMinutes/.test(rules),
  "TRACKED_REPRODUCIBLE",
  "policy registry, Itinerary Lab resolution and numerical tests agree",
);
evidenceCheck(
  "the built/local service is deployable and fail-closed",
  gates.build && gates.verify && gates.serverSmoke && /only search\.do/i.test(server) && /Request body exceeds/.test(server),
  "TRACKED_REPRODUCIBLE",
  "build, verify and offline standalone-server smoke pass",
);
evidenceCheck(
  "current submission visual asset bundle is present",
  hasTrackedSubmissionVisuals,
  "TRACKED_REPRODUCIBLE",
  `${currentScreenshots.length} image assets plus the curated README and editable Figma link index`,
);

console.log("\nExternal and human acceptance (not fabricated as PASS)");
evidenceCheck(
  "fresh Atlas Sandbox search evidence",
  hasRecordedLiveSmoke,
  hasRecordedLiveSmoke ? "TRACKED_REPRODUCIBLE" : "HUMAN_EXTERNAL",
  hasRecordedLiveSmoke ? "secret-free live smoke ledger records Atlas search, research, and standalone-service success" : "adapter exists, but this offline audit does not claim a fresh credentialed live run",
);
evidenceCheck(
  "real flight status plus Atlas verify/book/payment/servicing",
  false,
  "HUMAN_EXTERNAL",
  hasServicingCode ? "unexpected servicing marker requires manual review" : "no such implementation is present; requires Atlas permission and an authorized status source",
);
evidenceCheck(
  "stable Alibaba Cloud/public deployment with a health check",
  false,
  "WAIVED",
  "deployment is outside the requested local-demo scope; no public URL is claimed",
);
evidenceCheck(
  "Qoder session/Quest/Canvas provenance",
  false,
  "HUMAN_EXTERNAL",
  "tracked product screenshots demonstrate the product, but do not establish Qoder session/Quest/Canvas provenance",
);
evidenceCheck(
  "formal three-minute recording is captured and replayed by a human",
  false,
  "WAIVED",
  "video is explicitly excluded from this sprint; any local artifact is not scored here",
);

const score = Object.fromEntries(Object.entries(evidenceContract.rubric).map(([criterion, item]) => [criterion, criterion === "Feasibility" && !hasRecordedLiveSmoke ? item.trackedPoints - 1 : item.trackedPoints]));
const total = Object.values(score).reduce((sum, value) => sum + value, 0);
const target = 95;

console.log("\nConservative judge score (derived from docs/JUDGE_EVIDENCE.json; not an official judge decision)");
for (const [criterion, points] of Object.entries(score)) console.log(`  ${criterion.padEnd(14)} ${String(points).padStart(2)} / ${evidenceContract.rubric[criterion].max}`);
console.log(`  ${"TOTAL".padEnd(14)} ${String(total).padStart(2)} / 100`);
console.log(`  95-point target gap: ${target - total}`);
console.log("\n95-point gap closure");
const scoredGaps = scoredGapClosures(evidenceContract);
for (const gap of scoredGaps) console.log(`  +${gap.points}  ${gap.label} (${gap.status.toLowerCase()})`);
const waivedGaps = (evidenceContract.gapClosures ?? []).filter((item) => item.status === "WAIVED");
for (const gap of waivedGaps) console.log(`  WAIVED  ${gap.label}`);
const scoredGapTotal = scoredGaps.reduce((sum, gap) => sum + gap.points, 0);
if (scoredGapTotal !== target - total) {
  failures.push("score/evidence gap total");
  console.log(`  FAIL  scored gap total ${scoredGapTotal} does not match target gap ${target - total}`);
}

if (failures.length > 0) {
  console.log(`\nFinal audit FAILED: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("\nFinal audit local gates: PASS; external/human items remain explicitly open.");
}
