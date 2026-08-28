import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMockArtifact, parseShotDurations, REQUIRED_UI_LABELS } from "../scripts/judge-preflight.mjs";
import { readFileSync } from "node:fs";

function completeMockBundle() {
  return [
    ...REQUIRED_UI_LABELS.map(([, label]) => label),
    "Connection Integrity Agent",
    "PVG → KUL → SIN",
    "Check transfer evidence with Agent",
    "Use deterministic itinerary",
    "Airline: intervene after an event",
    "Simulated operational event",
    "Traveller consent required",
  ].join(" | ");
}

const manifest = {
  buildMode: "mock",
  providers: { flight: "mock", agent: "mock" },
  hosting: { kind: "static", api: "not-served" },
  credentials: "not-included",
};

test("judge artifact checker accepts a complete mock fixture", () => {
  const checks = evaluateMockArtifact({
    bundle: completeMockBundle(),
    files: [{ path: "dist/assets/index.js", text: completeMockBundle() }],
    manifest,
  });
  assert.equal(checks.filter((check) => check.status === "FAIL").length, 0);
});

test("judge artifact checker catches an intentionally missing UI disclosure", () => {
  const bundle = completeMockBundle().replaceAll("Ticket protection not confirmed", "");
  const checks = evaluateMockArtifact({
    bundle,
    files: [{ path: "dist/assets/index.js", text: bundle }],
    manifest,
  });
  assert.ok(checks.some((check) => check.status === "FAIL" && check.name.includes("ticket protection disclosure")));
});

test("recording timing parser reads the numbered shot table", () => {
  const shots = parseShotDurations([
    "| 1 | 8s | opening |",
    "| 2 | 7s | promise |",
    "| 3 | 12s | Atlas |",
  ].join("\n"));
  assert.deepEqual(shots, [
    { number: 1, seconds: 8 },
    { number: 2, seconds: 7 },
    { number: 3, seconds: 12 },
  ]);
});

test("judge preflight rejects score/evidence status drift", async () => {
  const { runPreflight } = await import("../scripts/judge-preflight.mjs");
  const checks = await runPreflight({ mode: "judge", skipBuild: true });
  assert.ok(checks.some((check) => check.name === "single score/evidence contract has the official dimensions" && check.status === "PASS"));
  assert.ok(checks.some((check) => check.name === "Qoder external provenance is not promoted by local artifacts" && check.status === "PASS"));
});

test("WAIVED video cannot enter a scored 95-point gap", () => {
  const contract = JSON.parse(readFileSync(new URL("../docs/JUDGE_EVIDENCE.json", import.meta.url), "utf8"));
  const audit = readFileSync(new URL("../scripts/final-audit.mjs", import.meta.url), "utf8");
  const video = contract.gapClosures.find((item) => item.id === "video-recording");
  assert.equal(video.status, "WAIVED");
  assert.equal(video.points, 0);
  assert.match(audit, /item\.status !== "WAIVED"/);
  assert.doesNotMatch(audit, /\+4\s+recorded, replayed three-minute demo/i);
});
